// ============================================
// PERFORMANCE CACHE SERVICE FOR 5M+ USERS
// ============================================
// Client-side caching layer to reduce database load

interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class PerformanceCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 200; // Limit memory usage

  /**
   * Get item from cache if not expired
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) return null;
    
    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data as T;
  }

  /**
   * Set item in cache with TTL
   */
  set<T>(key: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Invalidate specific cache key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache keys matching pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      keys: Array.from(this.cache.keys())
    };
  }
}

// Singleton instance
export const performanceCache = new PerformanceCache();

// ============================================
// REQUEST DEDUPLICATION
// ============================================
// Prevent duplicate requests for the same data

class RequestDeduplicator {
  private pending: Map<string, Promise<any>> = new Map();

  /**
   * Execute request or return existing promise if in flight
   */
  async dedupe<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // If request is already in flight, return that promise
    if (this.pending.has(key)) {
      console.log(`[RequestDedup] Reusing existing request: ${key}`);
      return this.pending.get(key) as Promise<T>;
    }

    // Execute new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after request completes
        this.pending.delete(key);
      });

    this.pending.set(key, promise);
    return promise;
  }

  /**
   * Clear specific pending request
   */
  clear(key: string): void {
    this.pending.delete(key);
  }

  /**
   * Clear all pending requests
   */
  clearAll(): void {
    this.pending.clear();
  }
}

export const requestDeduplicator = new RequestDeduplicator();

// ============================================
// LAZY LOADING HELPER
// ============================================

export class LazyLoader {
  private observer: IntersectionObserver | null = null;
  private callbacks: Map<Element, () => void> = new Map();

  constructor() {
    if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const callback = this.callbacks.get(entry.target);
              if (callback) {
                callback();
                this.unobserve(entry.target);
              }
            }
          });
        },
        {
          rootMargin: '50px', // Load 50px before element is visible
          threshold: 0.01
        }
      );
    }
  }

  /**
   * Observe element and trigger callback when visible
   */
  observe(element: Element, callback: () => void): void {
    if (!this.observer) return;
    
    this.callbacks.set(element, callback);
    this.observer.observe(element);
  }

  /**
   * Stop observing element
   */
  unobserve(element: Element): void {
    if (!this.observer) return;
    
    this.observer.unobserve(element);
    this.callbacks.delete(element);
  }

  /**
   * Cleanup
   */
  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.callbacks.clear();
    }
  }
}

// ============================================
// BATCH REQUEST HELPER
// ============================================
// Batch multiple requests into one for better performance

export class BatchRequestManager {
  private batches: Map<string, { ids: any[], resolver: (data: any) => void }[]> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private readonly BATCH_DELAY = 50; // ms

  /**
   * Add request to batch and execute after delay
   */
  async batchRequest<T>(
    batchKey: string,
    id: any,
    executeBatch: (ids: any[]) => Promise<T[]>
  ): Promise<T> {
    return new Promise((resolve) => {
      // Get or create batch
      if (!this.batches.has(batchKey)) {
        this.batches.set(batchKey, []);
      }

      const batch = this.batches.get(batchKey)!;
      batch.push({ ids: [id], resolver: resolve });

      // Clear existing timer
      if (this.timers.has(batchKey)) {
        clearTimeout(this.timers.get(batchKey)!);
      }

      // Set new timer to execute batch
      const timer = setTimeout(async () => {
        const currentBatch = this.batches.get(batchKey) || [];
        this.batches.delete(batchKey);
        this.timers.delete(batchKey);

        if (currentBatch.length === 0) return;

        // Collect all IDs
        const allIds = currentBatch.flatMap(b => b.ids);
        
        console.log(`[BatchRequest] Executing batch for ${batchKey}: ${allIds.length} items`);

        try {
          // Execute batch request
          const results = await executeBatch(allIds);

          // Resolve individual promises
          currentBatch.forEach((item, index) => {
            item.resolver(results[index]);
          });
        } catch (error) {
          console.error(`[BatchRequest] Error executing batch ${batchKey}:`, error);
          currentBatch.forEach(item => item.resolver(null));
        }
      }, this.BATCH_DELAY);

      this.timers.set(batchKey, timer);
    });
  }

  /**
   * Clear all batches
   */
  clear(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    this.batches.clear();
  }
}

export const batchRequestManager = new BatchRequestManager();

// ============================================
// USAGE EXAMPLES
// ============================================

/*
// 1. Use cache in API calls
import { performanceCache, requestDeduplicator } from './performanceCache';

async function getUserProfile(userId: string) {
  // Check cache first
  const cached = performanceCache.get<Profile>(`profile:${userId}`);
  if (cached) return cached;
  
  // Deduplicate requests
  return requestDeduplicator.dedupe(
    `profile:${userId}`,
    async () => {
      const profile = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      // Cache for 5 minutes
      performanceCache.set(`profile:${userId}`, profile.data, 5 * 60 * 1000);
      return profile.data;
    }
  );
}

// 2. Lazy load images
import { LazyLoader } from './performanceCache';

const lazyLoader = new LazyLoader();

function setupLazyImage(img: HTMLImageElement) {
  lazyLoader.observe(img, () => {
    img.src = img.dataset.src!;
  });
}

// 3. Batch requests
import { batchRequestManager } from './performanceCache';

async function getVideoLikeCounts(videoId: string) {
  return batchRequestManager.batchRequest(
    'video-likes',
    videoId,
    async (videoIds) => {
      const results = await supabase
        .from('likes')
        .select('video_id, count')
        .in('video_id', videoIds);
      return results.data || [];
    }
  );
}

// 4. Invalidate cache on mutations
function likeVideo(videoId: string) {
  // Perform like
  await supabase.from('likes').insert({ video_id: videoId });
  
  // Invalidate cache
  performanceCache.invalidate(`video:${videoId}`);
  performanceCache.invalidatePattern(`feed:.*`);
}
*/
