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
 * Complete upload flow:
 * 1. Get presigned URL from API
 * 2. Upload video directly to storage
 * 3. Create post record in database
 * 4. Return post info
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
    console.log('[PostUpload] ⚡ Fast upload starting...', {
      size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      type: file.type
    });
    const { userId, description, category, visibility, onProgress } = params;

    // Step 1: Get presigned upload URL from our API (optimized - no wait)
    onProgress?.(5);
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
      throw new Error(`Failed to get upload URL: ${error.error || uploadUrlResponse.statusText}`);
    }

    const { uploadUrl, path: videoPath, token } = await uploadUrlResponse.json();
    console.log('[PostUpload] ✓ Presigned URL ready');

    // Step 2: Upload video directly to storage (FAST - direct to S3/Supabase)
    onProgress?.(10);
    console.log('[PostUpload] ⏫ Starting direct upload...');

    await uploadFileToPresignedUrl(uploadUrl, file, token, (progress) => {
      // Map upload progress to 10-90% (upload is the longest step)
      onProgress?.(10 + (progress * 0.8));
    });

    const uploadTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[PostUpload] ✓ Video uploaded in ${uploadTime}s`);
    onProgress?.(92);

    // Step 3: Create post record (very fast - just database insert)
    console.log('[PostUpload] 💾 Saving to database...');
    const createPostResponse = await fetch('/api/create-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoPath,
        userId,
        description: description || '',
        category: category || 'comedy',
        visibility: visibility || 'public'
      })
    });

    if (!createPostResponse.ok) {
      const error = await createPostResponse.json();
      throw new Error(`Failed to create post: ${error.error || createPostResponse.statusText}`);
    }

    const { post } = await createPostResponse.json();
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[PostUpload] ✅ Complete in ${totalTime}s! Post ID:`, post.id);
    
    onProgress?.(100);

    return {
      success: true,
      videoPath,
      postId: post.id
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
  const MAX_RETRIES = 3;
  const TIMEOUT_MS = 120000; // 2 minutes - faster failure detection
  
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
        console.log(`[Upload] Complete! Took ${duration}s`);
        resolve();
      } else {
        // Retry on server errors (5xx)
        if (xhr.status >= 500 && retryCount < MAX_RETRIES) {
          console.warn(`[Upload] Server error ${xhr.status}, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
          setTimeout(() => {
            uploadFileToPresignedUrl(signedUrl, file, token, onProgress, retryCount + 1)
              .then(resolve)
              .catch(reject);
          }, 1000 * (retryCount + 1)); // Exponential backoff
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
        }
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
        }, 1000 * (retryCount + 1)); // Exponential backoff
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
        console.warn(`[Upload] Timeout, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        setTimeout(() => {
          uploadFileToPresignedUrl(signedUrl, file, token, onProgress, retryCount + 1)
            .then(resolve)
            .catch(reject);
        }, 1000 * (retryCount + 1));
      } else {
        reject(new Error('Upload timed out after retries'));
      }
    });

    // Open and configure XHR for optimal performance
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
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
      .from('posts')
      .select(`
        *,
        profiles:user_id (
          id,
          username,
          avatar_url,
          display_name
        )
      `)
      .eq('visibility', 'public')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[PostUpload] Error fetching posts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('[PostUpload] Failed to fetch posts:', error);
    return [];
  }
}

/**
 * Get public URL for a video path
 */
export function getVideoPublicUrl(videoPath: string): string {
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
    .channel('posts_channel')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'posts'
      },
      async (payload) => {
        console.log('[PostUpload] New post received:', payload.new);
        
        // Fetch full post with user info
        const { data } = await supabase
          .from('posts')
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
      .from('posts')
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
