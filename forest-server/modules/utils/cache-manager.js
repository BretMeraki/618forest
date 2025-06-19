/**
 * Cache Manager Module
 * Handles in-memory caching with timestamp-based invalidation
 */

import { PERFORMANCE } from '../constants.js';

export class CacheManager {
  constructor(maxAge = PERFORMANCE.CACHE_MAX_AGE) {
    this.cache = new Map();
    this.cacheTimestamps = new Map();
    this.cacheMaxAge = maxAge;
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
    return timestamp && (Date.now() - timestamp) < this.cacheMaxAge;
  }

  /**
   * Store data in cache with current timestamp
   * @param {string} cacheKey - Cache key
   * @param {any} data - Data to cache
   */
  setCache(cacheKey, data) {
    this.cache.set(cacheKey, data);
    this.cacheTimestamps.set(cacheKey, Date.now());
  }

  /**
   * Get data from cache if valid
   * @param {string} cacheKey - Cache key
   * @returns {any|null} Cached data or null if not found/invalid
   */
  getCache(cacheKey) {
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    return null;
  }

  /**
   * Remove an entry from cache
   * @param {string} cacheKey - Cache key to invalidate
   */
  invalidateCache(cacheKey) {
    this.cache.delete(cacheKey);
    this.cacheTimestamps.delete(cacheKey);
  }

  /**
   * Clear all cache entries
   */
  clearCache() {
    this.cache.clear();
    this.cacheTimestamps.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics including size and hit ratio estimates
   */
  getCacheStats() {
    const totalEntries = this.cache.size;
    const validEntries = Array.from(this.cacheTimestamps.keys())
      .filter(key => this.isCacheValid(key))
      .length;

    return {
      totalEntries,
      validEntries,
      expiredEntries: totalEntries - validEntries,
      cacheMaxAge: this.cacheMaxAge
    };
  }

  /**
   * Clean up expired cache entries
   * @returns {number} Number of entries removed
   */
  cleanupExpiredEntries() {
    let removedCount = 0;

    for (const [key, timestamp] of this.cacheTimestamps.entries()) {
      if ((Date.now() - timestamp) >= this.cacheMaxAge) {
        this.cache.delete(key);
        this.cacheTimestamps.delete(key);
        removedCount++;
      }
    }

    return removedCount;
  }
}