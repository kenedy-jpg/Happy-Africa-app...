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
  try {
    console.log('[PostUpload] Starting complete upload flow...');
    const { userId, description, category, visibility, onProgress } = params;

    // Step 1: Get presigned upload URL from our API
    console.log('[PostUpload] Step 1: Getting presigned URL...');
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
    console.log('[PostUpload] Got presigned URL, path:', videoPath);

    // Step 2: Upload video directly to presigned URL
    console.log('[PostUpload] Step 2: Uploading video...');
    onProgress?.(10);

    await uploadFileToPresignedUrl(uploadUrl, file, token, (progress) => {
      // Map upload progress to 10-80%
      onProgress?.(10 + (progress * 0.7));
    });

    console.log('[PostUpload] Video uploaded successfully!');
    onProgress?.(85);

    // Step 3: Create post record via API
    console.log('[PostUpload] Step 3: Creating post record...');
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
    console.log('[PostUpload] Post created successfully, ID:', post.id);
    
    onProgress?.(100);

    return {
      success: true,
      videoPath,
      postId: post.id
    };

  } catch (error: any) {
    console.error('[PostUpload] Upload flow failed:', error);
    return {
      success: false,
      error: error.message || 'Upload failed'
    };
  }
}

/**
 * Upload file to presigned URL with progress tracking
 */
async function uploadFileToPresignedUrl(
  signedUrl: string,
  file: File,
  token: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed with status ${xhr.status}: ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error during upload'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload cancelled'));
    });

    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'video/mp4');
    xhr.timeout = 600000; // 10 minutes
    
    xhr.addEventListener('timeout', () => {
      reject(new Error('Upload timed out'));
    });

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
