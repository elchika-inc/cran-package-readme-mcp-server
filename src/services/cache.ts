import { logger } from '../utils/logger.js';
import type { CacheEntry, CacheOptions } from '../types/index.js';

export class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTtl: number;
  private readonly maxSize: number;
  private readonly cleanupInterval: NodeJS.Timeout;
  private currentMemoryUsage = 0;
  private hitCount = 0;
  private missCount = 0;

  constructor(options: CacheOptions = {}) {
    this.defaultTtl = options.ttl || 3600 * 1000; // 1 hour default in milliseconds
    this.maxSize = options.maxSize || 104857600; // 100MB default
    
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  set<T>(key: string, value: T, ttl?: number): void {
    const actualTtl = ttl || this.defaultTtl;
    const timestamp = Date.now();
    
    const entry: CacheEntry<T> = {
      data: value,
      timestamp,
      ttl: actualTtl,
    };

    const entrySize = this.estimateEntrySize(key, entry);
    
    // Remove existing entry if updating
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!;
      const oldSize = this.estimateEntrySize(key, oldEntry);
      this.currentMemoryUsage -= oldSize;
    }

    // Check if adding this entry would exceed max size
    while (this.currentMemoryUsage + entrySize > this.maxSize && this.cache.size > 0) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, entry);
    this.currentMemoryUsage += entrySize;
    logger.debug(`Cache set: ${key} (TTL: ${actualTtl}ms, Size: ${entrySize} bytes)`);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    
    if (!entry) {
      this.missCount++;
      logger.debug(`Cache miss: ${key}`);
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      const entrySize = this.estimateEntrySize(key, entry);
      this.cache.delete(key);
      this.currentMemoryUsage -= entrySize;
      this.missCount++;
      logger.debug(`Cache expired: ${key}`);
      return null;
    }

    // Update timestamp for LRU
    entry.timestamp = now;
    this.hitCount++;
    logger.debug(`Cache hit: ${key}`);
    return entry.data;
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      const entrySize = this.estimateEntrySize(key, entry);
      this.currentMemoryUsage -= entrySize;
    }
    
    const deleted = this.cache.delete(key);
    if (deleted) {
      logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.currentMemoryUsage = 0;
    this.hitCount = 0;
    this.missCount = 0;
    logger.info('Cache cleared');
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      const entrySize = this.estimateEntrySize(key, entry);
      this.cache.delete(key);
      this.currentMemoryUsage -= entrySize;
      return false;
    }

    return true;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; memoryUsage: number; hitRate: number } {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? this.hitCount / totalRequests : 0;
    
    return {
      size: this.cache.size,
      memoryUsage: this.currentMemoryUsage,
      hitRate,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    let expiredCount = 0;
    let freedMemory = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        const entrySize = this.estimateEntrySize(key, entry);
        this.cache.delete(key);
        this.currentMemoryUsage -= entrySize;
        freedMemory += entrySize;
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      logger.debug(`Cache cleanup: removed ${expiredCount} expired entries, freed ${freedMemory} bytes`);
    }
  }

  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      const entrySize = this.estimateEntrySize(oldestKey, entry);
      this.cache.delete(oldestKey);
      this.currentMemoryUsage -= entrySize;
      logger.debug(`Cache LRU eviction: ${oldestKey}, freed ${entrySize} bytes`);
    }
  }

  private estimateMemoryUsage(): number {
    // Return tracked memory usage instead of recalculating
    return this.currentMemoryUsage;
  }

  private estimateEntrySize<T>(key: string, entry: CacheEntry<T>): number {
    // Rough estimation: key + JSON serialized data + metadata
    const keySize = key.length * 2; // UTF-16
    let dataSize: number;
    
    try {
      dataSize = JSON.stringify(entry.data).length * 2;
    } catch (error) {
      // Handle circular references or other serialization errors
      // Use a conservative estimate based on the object structure
      dataSize = this.estimateSizeRecursively(entry.data, new Set()) * 2;
    }
    
    const metadataSize = 24; // timestamp + ttl + object overhead
    
    return keySize + dataSize + metadataSize;
  }

  private estimateSizeRecursively<T>(obj: T, visited: Set<any>): number {
    if (obj === null || obj === undefined) {
      return 4; // 'null' or 'undefined'
    }

    if (visited.has(obj)) {
      return 20; // Conservative estimate for circular reference
    }

    const type = typeof obj;
    
    switch (type) {
      case 'boolean':
        return 5; // 'true' or 'false'
      case 'number':
        return String(obj).length;
      case 'string':
        return (obj as string).length;
      case 'object':
        if (Array.isArray(obj)) {
          visited.add(obj);
          const arraySize = obj.reduce((sum, item) => sum + this.estimateSizeRecursively(item, visited), 2); // 2 for []
          visited.delete(obj);
          return arraySize;
        } else {
          visited.add(obj);
          const objectSize = Object.entries(obj as Record<string, any>).reduce((sum, [key, value]) => {
            return sum + key.length + 3 + this.estimateSizeRecursively(value, visited); // 3 for ":"
          }, 2); // 2 for {}
          visited.delete(obj);
          return objectSize;
        }
      default:
        return 50; // Conservative estimate for unknown types
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    logger.info('Cache destroyed');
  }
}

// Create cache key helpers
export const createCacheKey = {
  packageInfo: (packageName: string): string => 
    `pkg_info:${packageName}`,
  
  packageReadme: (packageName: string, version = 'latest'): string => 
    `pkg_readme:${packageName}:${version}`,
  
  searchResults: (query: string, limit: number): string => {
    const queryHash = Buffer.from(query).toString('base64');
    return `search:${queryHash}:${limit}`;
  },
  
  packageList: (): string => 
    'pkg_list:all',
};

// Global cache instance
export const cache = new MemoryCache();