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
    maxRetries = 2,
    retryDelay = 500,
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
    
    // Set timeout (10 minutes for slower mobile connections)
    xhr.timeout = 600000; // 10 minutes for mobile
    
    xhr.addEventListener('timeout', () => {
      console.error('[UploadService] XHR timeout');
      resolve({ success: false, error: 'Upload timed out. Please check your connection and try again.' });
    });
    
    // Set headers - CRITICAL: Let browser set Content-Type automatically for mobile compatibility
    // Mobile browsers (especially iOS Safari) need to set the Content-Type themselves
    // to include proper boundary parameters for multipart uploads
    if (file.type && file.type.startsWith('video/')) {
      xhr.setRequestHeader('Content-Type', file.type);
    }
    // DO NOT set Authorization header - presigned URL already has auth in query params
    
    console.log('[UploadService] Sending file via XHR PUT...', {
      url: signedUrl.substring(0, 100) + '...',
      size: file.size,
      type: file.type,
      isMobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    });
    
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

/**
 * Download video from URL and convert to File
 */
export async function downloadVideoFromUrl(
  url: string,
  onProgress?: (progress: number) => void
): Promise<File> {
  console.log('[UploadService] Downloading video from URL:', url);

  try {
    // Validate URL
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Invalid URL protocol. Only HTTP and HTTPS are supported.');
    }

    // Fetch with progress tracking
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    // Get content type and size
    const contentType = response.headers.get('content-type') || 'video/mp4';
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);

    // Validate content type
    if (!contentType.startsWith('video/')) {
      throw new Error('URL does not point to a video file.');
    }

    // Read response with progress
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Unable to read response body');
    }

    const chunks: Uint8Array[] = [];
    let receivedLength = 0;

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      if (contentLength > 0 && onProgress) {
        onProgress((receivedLength / contentLength) * 100);
      }
    }

    // Combine chunks into single Uint8Array
    const allChunks = new Uint8Array(receivedLength);
    let position = 0;
    for (const chunk of chunks) {
      allChunks.set(chunk, position);
      position += chunk.length;
    }

    // Convert to Blob then File
    const blob = new Blob([allChunks], { type: contentType });
    const fileName = `url_video_${Date.now()}${getExtensionFromContentType(contentType)}`;
    const file = new File([blob], fileName, { type: contentType });

    console.log('[UploadService] Video downloaded successfully:', {
      fileName,
      size: file.size,
      type: file.type
    });

    return file;

  } catch (error: any) {
    console.error('[UploadService] Failed to download video from URL:', error);
    throw new Error(`Failed to download video: ${error.message}`);
  }
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
  const extensionMap: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-msvideo': '.avi',
    'video/x-matroska': '.mkv',
    'video/mpeg': '.mpeg'
  };
  return extensionMap[contentType] || '.mp4';
}
