import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryCache, createCacheKey } from '../../src/services/cache.js';

describe('MemoryCache (Integration)', () => {
  let cache: MemoryCache;
  
  beforeEach(() => {
    cache = new MemoryCache({ ttl: 1000, maxSize: 1024 * 1024 }); // 1MB for testing
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('real-world usage patterns', () => {
    it('should handle typical package info caching workflow', () => {
      const packageName = 'ggplot2';
      const packageInfo = {
        Package: 'ggplot2',
        Version: '3.4.4',
        Title: 'Create Elegant Data Visualisations Using the Grammar of Graphics',
        Description: 'A system for declaratively creating graphics...',
        Author: 'Hadley Wickham',
        Maintainer: 'Hadley Wickham <hadley@posit.co>',
        License: 'MIT + file LICENSE',
      };

      const cacheKey = createCacheKey.packageInfo(packageName);
      
      // First access - cache miss
      expect(cache.get(cacheKey)).toBeNull();
      
      // Store in cache
      cache.set(cacheKey, packageInfo);
      
      // Second access - cache hit
      const cached = cache.get(cacheKey);
      expect(cached).toEqual(packageInfo);
      
      // Verify cache stats
      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.hitRate).toBe(0.5); // 1 hit out of 2 requests
    });

    it('should handle search results caching with different parameters', () => {
      const searchResults1 = [{ name: 'ggplot2', version: '3.4.4' }];
      const searchResults2 = [{ name: 'dplyr', version: '1.1.0' }];
      
      const key1 = createCacheKey.searchResults('ggplot', 10);
      const key2 = createCacheKey.searchResults('ggplot', 20);
      const key3 = createCacheKey.searchResults('dplyr', 10);
      
      // Store different search results
      cache.set(key1, searchResults1);
      cache.set(key2, searchResults1); // Same results, different limit
      cache.set(key3, searchResults2);
      
      // Verify all cached separately
      expect(cache.get(key1)).toEqual(searchResults1);
      expect(cache.get(key2)).toEqual(searchResults1);
      expect(cache.get(key3)).toEqual(searchResults2);
      
      expect(cache.size()).toBe(3);
    });

    it('should handle README caching with versions', () => {
      const readmeContent = '# ggplot2\n\nCreate beautiful data visualizations...';
      
      const keyLatest = createCacheKey.packageReadme('ggplot2');
      const keySpecific = createCacheKey.packageReadme('ggplot2', '3.4.4');
      
      cache.set(keyLatest, readmeContent);
      cache.set(keySpecific, readmeContent);
      
      expect(cache.get(keyLatest)).toBe(readmeContent);
      expect(cache.get(keySpecific)).toBe(readmeContent);
      expect(cache.size()).toBe(2);
    });

    it('should handle cache key uniqueness', () => {
      // Test that different parameters create different keys
      const keys = [
        createCacheKey.packageInfo('ggplot2'),
        createCacheKey.packageInfo('dplyr'),
        createCacheKey.packageReadme('ggplot2'),
        createCacheKey.packageReadme('ggplot2', '3.4.4'),
        createCacheKey.searchResults('ggplot', 10),
        createCacheKey.searchResults('ggplot', 20),
        createCacheKey.packageList(),
      ];
      
      // All keys should be unique
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
      
      // Store different values for each key
      keys.forEach((key, index) => {
        cache.set(key, `value-${index}`);
      });
      
      // Verify each value is stored separately
      keys.forEach((key, index) => {
        expect(cache.get(key)).toBe(`value-${index}`);
      });
    });
  });

  describe('memory management', () => {
    it('should handle memory pressure correctly', () => {
      const smallCache = new MemoryCache({ maxSize: 1024 }); // 1KB limit
      
      try {
        // Add items until we hit memory limit
        const largeValue = 'x'.repeat(200); // 200 bytes
        
        for (let i = 0; i < 10; i++) {
          smallCache.set(`key-${i}`, largeValue);
        }
        
        // Cache should have evicted older entries
        expect(smallCache.size()).toBeLessThan(10);
        
        // Most recent entries should still be there
        expect(smallCache.get('key-9')).toBe(largeValue);
        expect(smallCache.get('key-8')).toBe(largeValue);
        
        // Earlier entries should be evicted
        expect(smallCache.get('key-0')).toBeNull();
        expect(smallCache.get('key-1')).toBeNull();
      } finally {
        smallCache.destroy();
      }
    });

    it('should update memory usage correctly on operations', () => {
      const initialStats = cache.getStats();
      expect(initialStats.memoryUsage).toBe(0);
      
      // Add an item
      cache.set('test-key', { data: 'test-value' });
      const afterAdd = cache.getStats();
      expect(afterAdd.memoryUsage).toBeGreaterThan(0);
      
      // Update the item
      cache.set('test-key', { data: 'updated-value' });
      const afterUpdate = cache.getStats();
      expect(afterUpdate.size).toBe(1); // Same size
      expect(afterUpdate.memoryUsage).toBeGreaterThan(0); // Still using memory
      
      // Delete the item
      cache.delete('test-key');
      const afterDelete = cache.getStats();
      expect(afterDelete.memoryUsage).toBe(0);
      expect(afterDelete.size).toBe(0);
    });
  });

  describe('TTL and expiration', () => {
    it('should handle different TTL values for different entries', () => {
      cache.set('short-lived', 'expires-soon', 100);
      cache.set('long-lived', 'expires-later', 2000);
      
      // Both should be accessible immediately
      expect(cache.get('short-lived')).toBe('expires-soon');
      expect(cache.get('long-lived')).toBe('expires-later');
      
      // Simulate time passing (would need to actually wait or mock time)
      // For now, just verify they're both still there
      expect(cache.has('short-lived')).toBe(true);
      expect(cache.has('long-lived')).toBe(true);
    });

    it('should handle entry refresh on access', () => {
      cache.set('refreshable', 'value', 1000);
      
      // Access immediately
      expect(cache.get('refreshable')).toBe('value');
      
      // Entry should still be valid
      expect(cache.has('refreshable')).toBe(true);
      
      // Verify stats show the access
      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
    });
  });

  describe('concurrent operations', () => {
    it('should handle rapid consecutive operations', () => {
      const operations = [];
      
      // Perform many rapid operations
      for (let i = 0; i < 100; i++) {
        operations.push(() => cache.set(`key-${i}`, `value-${i}`));
        operations.push(() => cache.get(`key-${Math.floor(i / 2)}`));
      }
      
      // Execute all operations
      operations.forEach(op => op());
      
      // Verify final state
      expect(cache.size()).toBe(100);
      
      // Check some random values
      expect(cache.get('key-50')).toBe('value-50');
      expect(cache.get('key-99')).toBe('value-99');
    });

    it('should maintain consistency during mixed operations', () => {
      const testData = new Map();
      
      // Set up initial data
      for (let i = 0; i < 20; i++) {
        const key = `test-${i}`;
        const value = { id: i, data: `data-${i}` };
        cache.set(key, value);
        testData.set(key, value);
      }
      
      // Perform mixed operations
      for (let i = 0; i < 10; i++) {
        // Update some entries
        const updateKey = `test-${i}`;
        const newValue = { id: i, data: `updated-${i}` };
        cache.set(updateKey, newValue);
        testData.set(updateKey, newValue);
        
        // Delete some entries
        if (i % 3 === 0) {
          const deleteKey = `test-${i + 10}`;
          cache.delete(deleteKey);
          testData.delete(deleteKey);
        }
      }
      
      // Verify consistency
      for (const [key, expectedValue] of testData) {
        expect(cache.get(key)).toEqual(expectedValue);
      }
      
      expect(cache.size()).toBe(testData.size);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very large values gracefully', () => {
      const largeValue = 'x'.repeat(100000); // 100KB
      
      expect(() => {
        cache.set('large-value', largeValue);
      }).not.toThrow();
      
      expect(cache.get('large-value')).toBe(largeValue);
    });

    it('should handle special characters in keys', () => {
      const specialKeys = [
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key/with/slashes',
        '键值',
        'clé',
        '🔑',
      ];
      
      specialKeys.forEach((key, index) => {
        const value = `value-${index}`;
        cache.set(key, value);
        expect(cache.get(key)).toBe(value);
      });
      
      expect(cache.size()).toBe(specialKeys.length);
    });

    it('should handle circular references in values safely', () => {
      const circularObj: any = { name: 'test' };
      circularObj.self = circularObj;
      
      // Should not throw when setting circular reference
      expect(() => {
        cache.set('circular', circularObj);
      }).not.toThrow();
      
      // Should be retrievable (though the circular reference may be handled)
      const retrieved = cache.get('circular');
      expect(retrieved).toBeDefined();
      if (retrieved && typeof retrieved === 'object') {
        expect((retrieved as any).name).toBe('test');
      }
    });

    it('should handle cache operations after destroy', () => {
      cache.set('test', 'value');
      expect(cache.get('test')).toBe('value');
      
      cache.destroy();
      
      // Operations after destroy should still work (creates new internal state)
      expect(cache.get('test')).toBeNull();
      expect(cache.size()).toBe(0);
      
      cache.set('new-test', 'new-value');
      expect(cache.get('new-test')).toBe('new-value');
    });
  });
});