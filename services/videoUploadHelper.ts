/**
 * TikTok-Style Video Upload Helper
 * Handles validation, compression, and preprocessing for video uploads
 */

export interface VideoMetadata {
  width: number;
  height: number;
  duration: number;
  fileSize: number;
  mimeType: string;
  aspectRatio: number;
}

export interface VideoValidationResult {
  isValid: boolean;
  error?: string;
  metadata?: VideoMetadata;
  needsCompression?: boolean;
}

// TikTok-like constraints
export const VIDEO_CONSTRAINTS = {
  MAX_DURATION: 180, // 3 minutes
  MIN_DURATION: 1, // 1 second
  MAX_FILE_SIZE: 287 * 1024 * 1024, // 287MB (TikTok's limit)
  RECOMMENDED_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_RESOLUTION: 1920,
  MIN_RESOLUTION: 360,
  SUPPORTED_FORMATS: ['video/mp4', 'video/quicktime', 'video/webm', 'video/avi', 'video/x-msvideo'],
  RECOMMENDED_ASPECT_RATIOS: [9/16, 16/9, 1/1], // Vertical, Horizontal, Square
};

/**
 * Validate video file before upload (TikTok-style validation)
 */
export async function validateVideo(file: File): Promise<VideoValidationResult> {
  try {
    // Check file type
    const fileType = file.type || getFileTypeFromExtension(file.name);
    if (!VIDEO_CONSTRAINTS.SUPPORTED_FORMATS.includes(fileType)) {
      return {
        isValid: false,
        error: `Unsupported video format. Please use MP4, MOV, or WebM.`
      };
    }

    // Check file size
    if (file.size > VIDEO_CONSTRAINTS.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `Video file too large. Maximum size is ${Math.round(VIDEO_CONSTRAINTS.MAX_FILE_SIZE / (1024 * 1024))}MB.`
      };
    }

    // Extract video metadata
    const metadata = await extractVideoMetadata(file);

    // Validate duration
    if (metadata.duration < VIDEO_CONSTRAINTS.MIN_DURATION) {
      return {
        isValid: false,
        error: `Video too short. Minimum duration is ${VIDEO_CONSTRAINTS.MIN_DURATION} second.`
      };
    }

    if (metadata.duration > VIDEO_CONSTRAINTS.MAX_DURATION) {
      return {
        isValid: false,
        error: `Video too long. Maximum duration is ${Math.floor(VIDEO_CONSTRAINTS.MAX_DURATION / 60)} minutes.`
      };
    }

    // Validate resolution
    if (metadata.width < VIDEO_CONSTRAINTS.MIN_RESOLUTION || 
        metadata.height < VIDEO_CONSTRAINTS.MIN_RESOLUTION) {
      return {
        isValid: false,
        error: `Video resolution too low. Minimum is ${VIDEO_CONSTRAINTS.MIN_RESOLUTION}p.`
      };
    }

    // Check if compression is needed
    const needsCompression = file.size > VIDEO_CONSTRAINTS.RECOMMENDED_FILE_SIZE || 
                            metadata.width > VIDEO_CONSTRAINTS.MAX_RESOLUTION ||
                            metadata.height > VIDEO_CONSTRAINTS.MAX_RESOLUTION;

    return {
      isValid: true,
      metadata,
      needsCompression
    };
  } catch (error: any) {
    console.error('[VideoValidation] Error:', error);
    return {
      isValid: false,
      error: `Failed to validate video: ${error.message}`
    };
  }
}

/**
 * Extract video metadata (duration, resolution, etc.)
 */
export function extractVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    
    const url = URL.createObjectURL(file);
    let resolved = false;

    const cleanup = () => {
      URL.revokeObjectURL(url);
      video.src = '';
    };

    const resolveMetadata = () => {
      if (resolved) return;
      resolved = true;

      const metadata: VideoMetadata = {
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
        fileSize: file.size,
        mimeType: file.type,
        aspectRatio: video.videoWidth / video.videoHeight
      };

      cleanup();
      resolve(metadata);
    };

    video.onloadedmetadata = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
        resolveMetadata();
      } else {
        // Fallback: seek to get duration (mobile Safari fix)
        video.currentTime = Number.MAX_SAFE_INTEGER;
      }
    };

    video.ontimeupdate = () => {
      if (video.duration && !isNaN(video.duration) && isFinite(video.duration)) {
        resolveMetadata();
      }
    };

    video.onerror = (error) => {
      cleanup();
      reject(new Error('Failed to load video metadata'));
    };

    // Timeout fallback
    setTimeout(() => {
      if (!resolved) {
        cleanup();
        reject(new Error('Video metadata extraction timeout'));
      }
    }, 10000);

    video.src = url;
  });
}

/**
 * Compress video using canvas (TikTok uses server-side compression, but this is client-side fallback)
 */
export async function compressVideo(file: File, targetQuality: number = 0.8): Promise<File> {
  console.log('[VideoCompression] Starting compression...');
  
  // For now, return original file - proper compression requires FFmpeg.wasm
  // In production, implement with FFmpeg.wasm or server-side compression
  console.warn('[VideoCompression] Client-side compression not yet implemented. Uploading original file.');
  return file;
}

/**
 * Generate video thumbnail at specific time
 */
export async function generateThumbnail(
  file: File, 
  seekTime: number = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const url = URL.createObjectURL(file);
    
    video.preload = 'metadata';
    video.playsInline = true;
    video.muted = true;
    video.crossOrigin = 'anonymous';
    
    video.onloadedmetadata = () => {
      const seekToTime = Math.min(seekTime * video.duration, video.duration - 0.1);
      video.currentTime = seekToTime;
    };
    
    video.onseeked = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.85);
        
        URL.revokeObjectURL(url);
        video.src = '';
        resolve(thumbnail);
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to generate thumbnail'));
    };
    
    video.src = url;
  });
}

/**
 * Get file type from extension (fallback)
 */
function getFileTypeFromExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const typeMap: Record<string, string> = {
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'webm': 'video/webm',
    'avi': 'video/x-msvideo',
    'mkv': 'video/x-matroska'
  };
  return typeMap[ext || ''] || '';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
}
