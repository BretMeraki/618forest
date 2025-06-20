/**
 * Enhanced Cache Manager Module
 * Handles in-memory caching with advanced performance features
 */

import { PERFORMANCE } from '../constants.js';
import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'CacheManager' });

export class CacheManager {
  constructor(options = {}) {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.accessOrder = new Map(); // For LRU tracking
    this.cacheMaxAge = options.maxAge || PERFORMANCE.CACHE_MAX_AGE;
    this.maxSize = options.maxSize || PERFORMANCE.CACHE_MAX_SIZE;
    this.memoryThreshold = options.memoryThreshold || PERFORMANCE.MEMORY_THRESHOLD;
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
      lastCleanup: Date.now(),
      cacheWarming: 0
    };
    
    // Auto-cleanup timer
    this.cleanupInterval = setInterval(() => {
      this.performMaintenance();
    }, PERFORMANCE.CACHE_CLEANUP_INTERVAL);
  }

  /**
   * Generate a cache key for project/path data
   * @param {string} projectId - Project identifier
   * @param {string} filename - File name
   * @param {string|null} pathName - Optional path name for path-specific data
   * @returns {string} Generated cache key
   */
  getCacheKey(projectId, filename, pathName = null) {
    return pathName ? `${projectId}:${pathName}:${filename}` : `${projectId}:${filename}`;
  }

  /**
   * Check if a cache entry is still valid
   * @param {string} cacheKey - Cache key to check
   * @returns {boolean} True if cache entry is valid
   */
  isCacheValid(cacheKey) {
    const timestamp = this.cacheTimestamps.get(cacheKey);
    return timestamp && Date.now() - timestamp < this.cacheMaxAge;
  }

  /**
   * Store data in cache with current timestamp and LRU tracking
   * @param {string} cacheKey - Cache key
   * @param {any} data - Data to cache
   * @param {Object} options - Caching options
   */
  setCache(cacheKey, data, options = {}) {
    // Check memory usage before adding
    if (this.shouldEvictForMemory()) {
      this.performLRUEviction();
    }
    
    // Check size limit
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }
    
    const now = Date.now();
    this.cache.set(cacheKey, {
      data,
      size: this.estimateSize(data),
      priority: options.priority || 1,
      warmed: options.warmed || false
    });
    this.cacheTimestamps.set(cacheKey, now);
    this.accessOrder.set(cacheKey, now);
    
    this.updateMemoryMetrics();
  }

  /**
   * Get data from cache if valid, with LRU tracking
   * @param {string} cacheKey - Cache key
   * @returns {any|null} Cached data or null if not found/invalid
   */
  getCache(cacheKey) {
    if (this.isCacheValid(cacheKey)) {
      const entry = this.cache.get(cacheKey);
      if (entry) {
        // Update access order for LRU
        this.accessOrder.set(cacheKey, Date.now());
        this.metrics.hits++;
        return entry.data;
      }
    }
    this.metrics.misses++;
    return null;
  }

  /**
   * Warm cache with frequently accessed data
   * @param {Array} cacheKeys - Array of cache keys to pre-load
   * @param {Function} dataLoader - Function to load data for cache keys
   */
  async warmCache(cacheKeys, dataLoader) {
    for (const key of cacheKeys) {
      try {
        const data = await dataLoader(key);
        if (data) {
          this.setCache(key, data, { warmed: true, priority: 2 });
          this.metrics.cacheWarming++;
        }
      } catch (error) {
        logger.warn(`Cache warming failed for key ${key}`, { message: error.message });
      }
    }
  }

  /**
   * Remove an entry from cache
   * @param {string} cacheKey - Cache key to invalidate
   */
  invalidateCache(cacheKey) {
    this.cache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
    this.accessOrder.delete(cacheKey);
    this.updateMemoryMetrics();
  }

  /**
   * Clear all cache entries
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
    this.accessOrder.clear();
    this.metrics.memoryUsage = 0;
  }

  /**
   * Get comprehensive cache statistics
   * @returns {Object} Detailed cache statistics
   */
  getCacheStats() {
    const totalEntries = this.cache.size;
    const validEntries = Array.from(this.cacheTimestamps.keys()).filter(key =>
      this.isCacheValid(key)
    ).length;
    
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;

    return {
      totalEntries,
      validEntries,
      expiredEntries: totalEntries - validEntries,
      cacheMaxAge: this.cacheMaxAge,
      maxSize: this.maxSize,
      hitRate: `${hitRate}%`,
      memoryUsage: this.formatBytes(this.metrics.memoryUsage),
      metrics: { ...this.metrics },
      efficiency: this.calculateEfficiency()
    };
  }

  /**
   * Perform comprehensive cache maintenance
   */
  performMaintenance() {
    const before = this.cache.size;
    
    // Clean expired entries
    const expiredRemoved = this.cleanupExpiredEntries();
    
    // Check memory pressure
    if (this.shouldEvictForMemory()) {
      this.performLRUEviction();
    }
    
    const after = this.cache.size;
    this.metrics.lastCleanup = Date.now();
    
    if (before !== after) {
      logger.debug(`🧹 Cache maintenance: removed ${before - after} entries (${expiredRemoved} expired)`);
    }
  }

  /**
   * Clean up expired cache entries
   * @returns {number} Number of entries removed
   */
  cleanupExpiredEntries() {
    let removedCount = 0;

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if (Date.now() - timestamp >= this.cacheMaxAge) {
        this.invalidateCache(key);
        removedCount++;
      }
    }

    return removedCount;
  }

  /**
   * Evict least recently used entry
   */
  evictLRU() {
    if (this.accessOrder.size === 0) return;
    
    // Find the oldest accessed entry
    let oldestKey = null;
    let oldestTime = Date.now();
    
    for (const [key, time] of this.accessOrder.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.invalidateCache(oldestKey);
      this.metrics.evictions++;
    }
  }

  /**
   * Perform memory-pressure based LRU eviction
   */
  performLRUEviction() {
    const targetSize = Math.floor(this.cache.size * 0.8); // Remove 20% of entries
    while (this.cache.size > targetSize) {
      this.evictLRU();
    }
  }

  /**
   * Check if cache should evict entries due to memory pressure
   * @returns {boolean} True if eviction is needed
   */
  shouldEvictForMemory() {
    return this.metrics.memoryUsage > this.memoryThreshold;
  }

  /**
   * Estimate the memory size of cached data
   * @param {any} data - Data to estimate size for
   * @returns {number} Estimated size in bytes
   */
  estimateSize(data) {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (UTF-16)
    } catch {
      return 1024; // Default estimate for non-serializable data
    }
  }

  /**
   * Update memory usage metrics
   */
  updateMemoryMetrics() {
    let totalSize = 0;
    for (const entry of this.cache.values()) {
      totalSize += entry.size || 0;
    }
    this.metrics.memoryUsage = totalSize;
  }

  /**
   * Calculate cache efficiency score
   * @returns {number} Efficiency score (0-100)
   */
  calculateEfficiency() {
    const hitRate = this.metrics.hits / (this.metrics.hits + this.metrics.misses || 1);
    const memoryEfficiency = 1 - (this.metrics.memoryUsage / this.memoryThreshold);
    const evictionRate = 1 - (this.metrics.evictions / (this.cache.size || 1));
    
    return Math.round((hitRate * 0.5 + memoryEfficiency * 0.3 + evictionRate * 0.2) * 100);
  }

  /**
   * Format bytes into human readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Cleanup resources
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clearCache();
  }
}
