/**
 * Robust Video Upload Service
 * Uses presigned URLs with retry logic and chunking for reliability
 */

import { supabase } from './supabaseClient';

export interface UploadProgress {
  progress: number; // 0-100
  loaded: number; // bytes uploaded
  total: number; // total bytes
  speed: number; // bytes per second
  timeRemaining: number; // estimated seconds remaining
}

export interface UploadOptions {
  maxRetries?: number;
  retryDelay?: number;
  chunkSize?: number; // for chunked uploads (future enhancement)
  onProgress?: (progress: UploadProgress) => void;
  signal?: AbortSignal; // for cancellation
}

/**
 * Upload video using direct presigned URL with retry logic
 * This bypasses the Supabase API proxy for more reliability
 */
export async function uploadVideoWithPresignedUrl(
  file: File,
  fileName: string,
  options: UploadOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onProgress,
    signal
  } = options;

  console.log('[UploadService] Starting upload:', {
    fileName,
    size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
    type: file.type,
    maxRetries
  });

  let lastError: any = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = retryDelay * Math.pow(2, attempt - 1); // exponential backoff
        console.log(`[UploadService] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }

      // Check if cancelled
      if (signal?.aborted) {
        throw new Error('Upload cancelled');
      }

      // Step 1: Create presigned upload URL
      console.log('[UploadService] Creating presigned URL...');
      const { data: signedData, error: signError } = await supabase.storage
        .from('videos')
        .createSignedUploadUrl(fileName);

      if (signError || !signedData) {
        console.error('[UploadService] Failed to create signed URL:', signError);
        throw new Error(`Failed to create upload URL: ${signError?.message || 'Unknown error'}`);
      }

      const { signedUrl, token, path } = signedData;
      console.log('[UploadService] Got presigned URL, uploading file...');

      // Report initial progress
      onProgress?.({
        progress: 0,
        loaded: 0,
        total: file.size,
        speed: 0,
        timeRemaining: 0
      });

      // Step 2: Upload directly to presigned URL using fetch with progress tracking
      const uploadResult = await uploadWithProgress(signedUrl, file, token, {
        onProgress,
        signal
      });

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload failed');
      }

      console.log('[UploadService] Upload successful!');
      return { success: true };

    } catch (error: any) {
      lastError = error;
      console.error(`[UploadService] Upload attempt ${attempt + 1} failed:`, error.message);

      // Don't retry on certain errors
      if (error.message.includes('cancelled') || signal?.aborted) {
        return { success: false, error: 'Upload cancelled' };
      }

      // Don't retry on auth errors
      if (error.message.includes('Authentication') || error.message.includes('Unauthorized')) {
        return { success: false, error: error.message };
      }

      // If this was the last attempt, fail
      if (attempt === maxRetries - 1) {
        console.error('[UploadService] All retry attempts exhausted');
        return { 
          success: false, 
          error: `Upload failed after ${maxRetries} attempts: ${error.message}` 
        };
      }
    }
  }

  return { 
    success: false, 
    error: lastError?.message || 'Upload failed' 
  };
}

/**
 * Upload file to presigned URL with progress tracking
 */
async function uploadWithProgress(
  signedUrl: string,
  file: File,
  token: string,
  options: {
    onProgress?: (progress: UploadProgress) => void;
    signal?: AbortSignal;
  }
): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve, reject) => {
    console.log('[UploadService] Starting XHR upload to presigned URL');
    
    const xhr = new XMLHttpRequest();
    const startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = startTime;

    // Track progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && options.onProgress) {
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000; // seconds
        const loadedDiff = event.loaded - lastLoaded;
        const speed = timeDiff > 0 ? loadedDiff / timeDiff : 0;
        const timeRemaining = speed > 0 ? (event.total - event.loaded) / speed : 0;

        lastLoaded = event.loaded;
        lastTime = now;

        options.onProgress({
          progress: (event.loaded / event.total) * 100,
          loaded: event.loaded,
          total: event.total,
          speed,
          timeRemaining
        });
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ success: true });
      } else {
        console.error('[UploadService] XHR upload failed:', {
          status: xhr.status,
          statusText: xhr.statusText,
          response: xhr.responseText
        });
        resolve({ 
          success: false, 
          error: `Upload failed with status ${xhr.status}: ${xhr.statusText}` 
        });
      }
    });

    xhr.addEventListener('error', () => {
      console.error('[UploadService] XHR network error');
      resolve({ success: false, error: 'Network error during upload' });
    });

    xhr.addEventListener('abort', () => {
      resolve({ success: false, error: 'Upload cancelled' });
    });

    // Handle cancellation
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        xhr.abort();
      });
    }

    // Open and send request
    xhr.open('PUT', signedUrl);
    
    // Set timeout (10 minutes for large files)
    xhr.timeout = 600000; // 10 minutes
    
    xhr.addEventListener('timeout', () => {
      console.error('[UploadService] XHR timeout');
      resolve({ success: false, error: 'Upload timed out after 10 minutes' });
    });
    
    // Set headers - CRITICAL: Only set Content-Type, don't add Authorization
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    
    console.log('[UploadService] Sending file via XHR PUT...', {
      url: signedUrl.substring(0, 100) + '...',
      size: file.size,
      type: file.type
    });
    
    // Note: Some Supabase configurations may require the token in x-upsert header
    // Uncomment if your setup requires it:
    // xhr.setRequestHeader('x-upsert', 'true');
    
    xhr.send(file);
  });
}

/**
 * Fallback: Upload using standard Supabase method with retry
 * Use only if presigned URL method fails
 */
export async function uploadVideoStandard(
  file: File,
  fileName: string,
  options: UploadOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const { maxRetries = 2, retryDelay = 1000, onProgress } = options;

  console.log('[UploadService] Using standard upload method (fallback)');

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        const delay = retryDelay * Math.pow(2, attempt - 1);
        console.log(`[UploadService] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
        await sleep(delay);
      }

      // Report initial progress
      onProgress?.({
        progress: 10,
        loaded: 0,
        total: file.size,
        speed: 0,
        timeRemaining: 0
      });

      const { error } = await supabase.storage
        .from('videos')
        .upload(fileName, file, {
          contentType: file.type || 'video/mp4',
          upsert: true
        });

      if (error) {
        throw error;
      }

      // Report completion
      onProgress?.({
        progress: 100,
        loaded: file.size,
        total: file.size,
        speed: 0,
        timeRemaining: 0
      });

      console.log('[UploadService] Standard upload successful');
      return { success: true };

    } catch (error: any) {
      console.error(`[UploadService] Standard upload attempt ${attempt + 1} failed:`, error);

      if (attempt === maxRetries - 1) {
        return { 
          success: false, 
          error: `Upload failed: ${error.message}` 
        };
      }
    }
  }

  return { success: false, error: 'Upload failed' };
}

/**
 * Main upload function - tries presigned URL first, falls back to standard
 */
export async function uploadVideo(
  file: File,
  fileName: string,
  options: UploadOptions = {}
): Promise<void> {
  console.log('[UploadService] Starting video upload...');

  // Try presigned URL method first (more reliable)
  const presignedResult = await uploadVideoWithPresignedUrl(file, fileName, options);

  if (presignedResult.success) {
    console.log('[UploadService] Upload completed successfully via presigned URL');
    return;
  }

  console.warn('[UploadService] Presigned upload failed, trying standard method...', presignedResult.error);

  // Fallback to standard upload method
  const standardResult = await uploadVideoStandard(file, fileName, {
    ...options,
    maxRetries: 2 // Use fewer retries for fallback
  });

  if (standardResult.success) {
    console.log('[UploadService] Upload completed successfully via standard method');
    return;
  }

  // Both methods failed
  console.error('[UploadService] All upload methods failed');
  throw new Error(
    standardResult.error || 
    presignedResult.error || 
    'Upload failed - please check your connection and try again'
  );
}

/**
 * Utility: Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format upload speed for display
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond.toFixed(0)} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`;
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`;
}

/**
 * Format time remaining for display
 */
export function formatTimeRemaining(seconds: number): string {
  if (seconds < 60) return `${Math.ceil(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.ceil(seconds % 60);
  return `${minutes}m ${secs}s`;
}
