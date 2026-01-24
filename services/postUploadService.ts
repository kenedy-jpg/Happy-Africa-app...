/**
 * Complete Presigned URL Upload + Posts Service
 * Handles video upload via presigned URLs and creates post records
 */

import { supabase } from './supabaseClient';

export interface VideoUploadResult {
  success: boolean;
  videoPath?: string;
  postId?: string;
  error?: string;
}

export interface CreatePostParams {
  videoPath: string;
  userId: string;
  description?: string;
  category?: string;
  visibility?: 'public' | 'private' | 'friends';
}

/**
 * INSTANT UPLOAD FLOW - Videos appear in feed IMMEDIATELY:
 * 1. CREATE video record in database FIRST (instant) ✅ VIDEO IN FEED NOW
 * 2. Get presigned URL from API
 * 3. Upload video file to storage in background
 * 4. Update video record with file path
 * 
 * This way users see their video in the feed while it's still uploading!
 */
export async function uploadVideoAndCreatePost(
  file: File,
  params: {
    userId: string;
    description?: string;
    category?: string;
    visibility?: 'public' | 'private' | 'friends';
    onProgress?: (progress: number) => void;
  }
): Promise<VideoUploadResult> {
  const startTime = Date.now();
  
  try {
    console.log('[PostUpload] ⚡ INSTANT UPLOAD: Creating record immediately...', {
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type
    });
    const { userId, description, category, visibility, onProgress } = params;

    // 🚀 STEP 1: CREATE VIDEO RECORD IMMEDIATELY (INSTANT - appears in feed NOW)
    onProgress?.(2);
    console.log('[PostUpload] 🚀 Creating video record in database...');
    
    const createRecordResponse = await fetch('/api/create-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoPath: '', // Will update this after upload
        userId,
        description: description || '',
        category: category || 'comedy',
        visibility: visibility || 'public',
        isPlaceholder: true // Flag that this is a placeholder without file yet
      })
    });

    if (!createRecordResponse.ok) {
      const error = await createRecordResponse.json();
      throw new Error(`Failed to create video record: ${error.error || createRecordResponse.statusText}`);
    }

    const { post } = await createRecordResponse.json();
    const postId = post.id;
    console.log('[PostUpload] ✅ VIDEO RECORD CREATED! Video now in feed. Post ID:', postId);
    onProgress?.(5);

    // 📤 STEP 2: Get presigned upload URL
    onProgress?.(8);
    const uploadUrlResponse = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: sanitizeFileName(file.name),
        contentType: file.type || 'video/mp4'
      })
    });

    if (!uploadUrlResponse.ok) {
      const error = await uploadUrlResponse.json();
      console.error('[PostUpload] Failed to get upload URL:', error);
      throw new Error(`Failed to get upload URL: ${error.error || uploadUrlResponse.statusText}`);
    }

    const { uploadUrl, path: videoPath, token } = await uploadUrlResponse.json();
    console.log('[PostUpload] ✓ Presigned URL ready:', videoPath);
    onProgress?.(10);

    // 📹 STEP 3: Upload video file to storage (BACKGROUND)
    console.log('[PostUpload] 📹 Uploading file to storage...');

    await uploadFileToPresignedUrl(uploadUrl, file, token, (progress) => {
      // Map upload progress to 15-95% (upload is the longest step)
      onProgress?.(10 + (progress * 0.85));
    });

    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[PostUpload] ✓ File uploaded in ${uploadTime}s`);
    onProgress?.(98);

    // 🔗 STEP 4: Update video record with file path
    console.log('[PostUpload] 🔗 Updating record with file path...');
    const updateResponse = await fetch('/api/create-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoPath,
        userId,
        postId, // Update existing record
        description: description || '',
        category: category || 'comedy',
        visibility: visibility || 'public'
      })
    });

    if (!updateResponse.ok) {
      const error = await updateResponse.json();
      console.error('[PostUpload] Failed to update record:', error);
      // Don't throw - file is already uploaded, record exists, just missing path
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[PostUpload] ✅ COMPLETE in ${totalTime}s! Post ID:`, postId);
    
    onProgress?.(100);

    return {
      success: true,
      videoPath,
      postId
    };

  } catch (error: any) {
    const failTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.error(`[PostUpload] ❌ Upload failed after ${failTime}s:`, error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}

/**
 * Upload file to presigned URL with progress tracking and retry logic
 * Optimized for fast uploads on both desktop and mobile
 */
async function uploadFileToPresignedUrl(
  signedUrl: string,
  file: File,
  token: string,
  onProgress?: (progress: number) => void,
  retryCount: number = 0
): Promise<void> {
  const MAX_RETRIES = 2; // Reduced from 3
  const TIMEOUT_MS = 90000; // 90 seconds - fast timeout for better UX
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    let startTime = Date.now();
    let lastLoaded = 0;
    let lastTime = Date.now();

    // Track progress with speed calculation
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
        
        // Calculate upload speed for monitoring
        const now = Date.now();
        const timeDiff = (now - lastTime) / 1000; // seconds
        const bytesDiff = event.loaded - lastLoaded;
        if (timeDiff > 0) {
          const speedMBps = (bytesDiff / timeDiff) / (1024 * 1024);
          console.log(`[Upload] Speed: ${speedMBps.toFixed(2)} MB/s, Progress: ${progress.toFixed(1)}%`);
        }
        lastLoaded = event.loaded;
        lastTime = now;
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`[Upload] ✅ Complete! Took ${duration}s`);
        resolve();
      } else if (xhr.status >= 500 && retryCount < MAX_RETRIES) {
        // Retry on server errors (5xx)
        console.warn(`[Upload] Server error ${xhr.status}, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          uploadFileToPresignedUrl(signedUrl, file, token, onProgress, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, 500 * (retryCount + 1)); // Faster backoff
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      // Retry on network errors
      if (retryCount < MAX_RETRIES) {
        console.warn(`[Upload] Network error, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          uploadFileToPresignedUrl(signedUrl, file, token, onProgress, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, 500 * (retryCount + 1)); // Faster backoff
      } else {
        reject(new Error('Network error during upload after retries'));
      }
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.addEventListener('timeout', () => {
      // Retry on timeout
      if (retryCount < MAX_RETRIES) {
        console.warn(`[Upload] Timeout (>${TIMEOUT_MS / 1000}s), retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          uploadFileToPresignedUrl(signedUrl, file, token, onProgress, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, 500 * (retryCount + 1)); // Faster backoff
      } else {
        reject(new Error(`Upload timed out after ${TIMEOUT_MS / 1000}s`));
      }
    });

    // Open and configure XHR for optimal performance
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = TIMEOUT_MS;
    
    // Mobile optimization: disable buffering for faster uploads
    if ('mozBackgroundRequest' in xhr) {
      (xhr as any).mozBackgroundRequest = false;
    }

    console.log(`[Upload] Starting upload (${(file.size / (1024 * 1024)).toFixed(2)} MB)...`);
    xhr.send(file);
  });
}

/**
 * Fetch all posts from database with user information
 */
export async function fetchAllPosts(limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('videos')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url,
          display_name
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[PostUpload] Error fetching posts:', error);
      return [];
    }

    return (data || []).filter((v: any) => !v.visibility || v.visibility === 'public');
  } catch (error) {
    console.error('[PostUpload] Failed to fetch posts:', error);
    return [];
  }
}

/**
 * Get public URL for a video path
 */
export function getVideoPublicUrl(videoPath: string): string {
  if (!videoPath) return '';
  if (videoPath.startsWith('http')) return videoPath;
  const { data } = supabase.storage
    .from('videos')
    .getPublicUrl(videoPath);
  
  return data.publicUrl;
}

/**
 * Subscribe to real-time post inserts
 */
export function subscribeToNewPosts(
  onNewPost: (post: any) => void
): () => void {
  console.log('[PostUpload] Subscribing to real-time posts...');

  const subscription = supabase
    .channel('videos_channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'videos',
        filter: 'is_published=eq.true'
      },
      async (payload) => {
        console.log('[PostUpload] New post received:', payload.new);
        
        // Fetch full post with user info
        const { data } = await supabase
          .from('videos')
          .select(`
            *,
            profiles:user_id (
              id,
              username,
              avatar_url,
              display_name
            )
          `)
          .eq('id', payload.new.id)
          .single();

        if (data) {
          onNewPost(data);
        }
      }
    )
    .subscribe();

  // Return unsubscribe function
  return () => {
    console.log('[PostUpload] Unsubscribing from posts...');
    supabase.removeChannel(subscription);
  };
}

/**
 * Sanitize file name for safe storage
 */
function sanitizeFileName(fileName: string): string {
  // Remove special characters and spaces
  const sanitized = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
  
  // Add timestamp to ensure uniqueness
  const ext = sanitized.substring(sanitized.lastIndexOf('.'));
  const name = sanitized.substring(0, sanitized.lastIndexOf('.'));
  
  return `${name}_${Date.now()}${ext}`;
}

/**
 * Delete a post and its video
 */
export async function deletePost(postId: string, videoPath: string): Promise<boolean> {
  try {
    // Delete video from storage
    const { error: storageError } = await supabase.storage
      .from('videos')
      .remove([videoPath]);

    if (storageError) {
      console.error('[PostUpload] Error deleting video:', storageError);
    }

    // Delete post record
    const { error: dbError } = await supabase
      .from('videos')
      .delete()
      .eq('id', postId);

    if (dbError) {
      console.error('[PostUpload] Error deleting post:', dbError);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[PostUpload] Failed to delete post:', error);
    return false;
  }
}
