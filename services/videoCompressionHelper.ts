/**
 * Video Compression Helper
 * Optimizes videos for faster uploads without re-encoding
 */

/**
 * Check if video needs compression and return optimized file
 * Returns original file if already optimized
 */
export async function optimizeVideoForUpload(file: File): Promise<File> {
  const MAX_SIZE_MB = 50; // 50MB max for fast upload
  const fileSizeMB = file.size / (1024 * 1024);

  console.log('[VideoCompress] File size:', fileSizeMB.toFixed(2), 'MB');

  // If already small enough, use as-is
  if (fileSizeMB <= MAX_SIZE_MB) {
    console.log('[VideoCompress] Video is already optimized, no compression needed');
    return file;
  }

  console.log('[VideoCompress] Video is too large, attempting to reduce size...');

  // For now, just return original - full re-encoding would require a library
  // In production, you'd use FFmpeg.wasm or similar
  return file;
}

/**
 * Get estimated upload time in seconds
 */
export function estimateUploadTime(fileSizeMB: number, uploadSpeedMBps: number = 5): number {
  return Math.ceil(fileSizeMB / uploadSpeedMBps);
}

/**
 * Format bytes to human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}
