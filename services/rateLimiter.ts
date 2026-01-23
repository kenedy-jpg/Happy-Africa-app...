// ============================================
// RATE LIMITING SERVICE FOR 5M+ USERS
// ============================================
// Client-side and API rate limiting

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();

  /**
   * Check if request is allowed under rate limit
   */
  checkLimit(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const fullKey = config.keyPrefix ? `${config.keyPrefix}:${key}` : key;
    
    let entry = this.limits.get(fullKey);

    // Create new entry if doesn't exist or window has passed
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs
      };
      this.limits.set(fullKey, entry);
    }

    // Check if limit exceeded
    if (entry.count >= config.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;

    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      resetTime: entry.resetTime
    };
  }

  /**
   * Reset rate limit for specific key
   */
  reset(key: string, prefix?: string): void {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    this.limits.delete(fullKey);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.limits.clear();
  }

  /**
   * Get current rate limit status
   */
  getStatus(key: string, prefix?: string): RateLimitEntry | null {
    const fullKey = prefix ? `${prefix}:${key}` : key;
    return this.limits.get(fullKey) || null;
  }
}

// Singleton instance
export const rateLimiter = new RateLimiter();

// ============================================
// RATE LIMIT PRESETS FOR DIFFERENT ACTIONS
// ============================================

export const RATE_LIMITS = {
  // Video uploads: 10 per hour
  UPLOAD: {
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'upload'
  },
  
  // Comments: 30 per minute
  COMMENT: {
    maxRequests: 30,
    windowMs: 60 * 1000,
    keyPrefix: 'comment'
  },
  
  // Likes: 100 per minute
  LIKE: {
    maxRequests: 100,
    windowMs: 60 * 1000,
    keyPrefix: 'like'
  },
  
  // Follows: 50 per hour
  FOLLOW: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'follow'
  },
  
  // Search: 60 per minute
  SEARCH: {
    maxRequests: 60,
    windowMs: 60 * 1000,
    keyPrefix: 'search'
  },
  
  // API calls: 300 per minute
  API: {
    maxRequests: 300,
    windowMs: 60 * 1000,
    keyPrefix: 'api'
  },
  
  // Profile updates: 5 per hour
  PROFILE_UPDATE: {
    maxRequests: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'profile'
  }
} as const;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if user can perform action with rate limiting
 */
export function canPerformAction(userId: string, action: keyof typeof RATE_LIMITS): boolean {
  const config = RATE_LIMITS[action];
  const result = rateLimiter.checkLimit(userId, config);
  
  if (!result.allowed) {
    const resetIn = Math.ceil((result.resetTime - Date.now()) / 1000);
    console.warn(`[RateLimit] ${action} limit exceeded for user ${userId}. Resets in ${resetIn}s`);
  }
  
  return result.allowed;
}

/**
 * Get remaining actions for user
 */
export function getRemainingActions(userId: string, action: keyof typeof RATE_LIMITS): number {
  const config = RATE_LIMITS[action];
  const result = rateLimiter.checkLimit(userId, config);
  return result.remaining;
}

/**
 * Format time until reset
 */
export function formatResetTime(resetTime: number): string {
  const seconds = Math.ceil((resetTime - Date.now()) / 1000);
  
  if (seconds < 60) {
    return `${seconds}s`;
  }
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

// ============================================
// REQUEST QUEUE FOR RATE-LIMITED ACTIONS
// ============================================

interface QueuedRequest {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  priority: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly PROCESS_INTERVAL = 100; // ms between requests

  /**
   * Add request to queue
   */
  async enqueue<T>(
    fn: () => Promise<T>,
    priority: number = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject, priority });
      
      // Sort by priority (higher first)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const request = this.queue.shift()!;

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }

    // Wait before processing next request
    setTimeout(() => this.processQueue(), this.PROCESS_INTERVAL);
  }

  /**
   * Clear queue
   */
  clear(): void {
    this.queue.forEach(req => req.reject(new Error('Queue cleared')));
    this.queue = [];
    this.processing = false;
  }

  /**
   * Get queue size
   */
  size(): number {
    return this.queue.length;
  }
}

export const requestQueue = new RequestQueue();

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// 1. Check rate limit before action
import { canPerformAction, RATE_LIMITS } from './rateLimiter';

async function uploadVideo(userId: string, file: File) {
  if (!canPerformAction(userId, 'UPLOAD')) {
    throw new Error('Upload limit exceeded. Please try again later.');
  }
  
  // Proceed with upload
  return await backend.uploadVideo(file);
}

// 2. Queue requests to avoid overwhelming server
import { requestQueue } from './rateLimiter';

async function likeVideo(videoId: string) {
  return requestQueue.enqueue(
    () => supabase.from('likes').insert({ video_id: videoId }),
    1 // priority
  );
}

// 3. Show remaining actions to user
import { getRemainingActions } from './rateLimiter';

function showUploadLimit(userId: string) {
  const remaining = getRemainingActions(userId, 'UPLOAD');
  console.log(`You can upload ${remaining} more videos this hour`);
}

// 4. API endpoint rate limiting (server-side)
// Add to Vercel serverless function:

import { rateLimiter, RATE_LIMITS } from './rateLimiter';

export default async function handler(req, res) {
  const userId = req.headers['x-user-id'];
  
  const result = rateLimiter.checkLimit(userId, RATE_LIMITS.API);
  
  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many requests',
      resetTime: result.resetTime
    });
  }
  
  // Process request
  // ...
}
*/

// ============================================
// EXPONENTIAL BACKOFF FOR RETRIES
// ============================================

export class ExponentialBackoff {
  /**
   * Retry function with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    options: {
      maxRetries?: number;
      baseDelay?: number;
      maxDelay?: number;
      onRetry?: (attempt: number, error: any) => void;
    } = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      onRetry
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
          
          if (onRetry) {
            onRetry(attempt + 1, error);
          }

          console.log(`[Retry] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
}
