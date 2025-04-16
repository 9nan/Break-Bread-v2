/**
 * Memory Cache Manager for BreakBread Discord Bot
 * Provides RAM-based caching to speed up response times
 * created by Itznan 
 * Discord = itz._.nan_
 */
// const cleanLogger = require('./cleanLogger');

class CacheManager {
  constructor(options = {}) {
    // Default options
    this.options = {
      maxSize: options.maxSize || 500, // Maximum number of items in cache
      ttl: options.ttl || 1800000,     // Default TTL: 30 minutes in ms
      checkInterval: options.checkInterval || 300000 // Cleanup interval: 5 minutes
    };

    // Cache storage
    this.cache = new Map();
    
    // Metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      size: 0
    };

    // Start automatic cache cleanup
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.options.checkInterval);
  }

  /**
   * Sets a value in the cache
   * @param {string} key - The cache key
   * @param {any} value - The value to store
   * @param {object} options - Cache entry options
   * @param {number} options.ttl - Time to live in ms
   */
  set(key, value, options = {}) {
    const ttl = options.ttl || this.options.ttl;
    const expiresAt = Date.now() + ttl;

    // If cache is at max size, remove oldest entry
    if (this.cache.size >= this.options.maxSize && !this.cache.has(key)) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now()
    });

    this.metrics.size = this.cache.size;
    return true;
  }

  /**
   * Gets a value from the cache
   * @param {string} key - The cache key
   * @returns {any|null} - The cached value or null if not found/expired
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.metrics.misses++;
      return null;
    }

    // Check if entry is expired
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.metrics.misses++;
      this.metrics.size = this.cache.size;
      return null;
    }

    this.metrics.hits++;
    return entry.value;
  }

  /**
   * Checks if a key exists in the cache
   * @param {string} key - The cache key
   * @returns {boolean} - Whether the key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check if entry is expired
    if (entry.expiresAt <= Date.now()) {
      this.cache.delete(key);
      this.metrics.size = this.cache.size;
      return false;
    }
    
    return true;
  }

  /**
   * Removes a value from the cache
   * @param {string} key - The cache key
   */
  delete(key) {
    const result = this.cache.delete(key);
    this.metrics.size = this.cache.size;
    return result;
  }

  /**
   * Clears all entries from the cache
   */
  clear() {
    this.cache.clear();
    this.metrics.size = 0;
    return true;
  }

  /**
   * Cleans up expired entries
   */
  cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      this.metrics.size = this.cache.size;
      // Logging removed
    }
    
    return expiredCount;
  }

  /**
   * Gets the oldest key in the cache
   * @returns {string|null} - The oldest key or null if cache is empty
   */
  getOldestKey() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestKey = key;
        oldestTime = entry.createdAt;
      }
    }
    
    return oldestKey;
  }

  /**
   * Gets the current cache statistics
   * @returns {object} - Cache stats
   */
  getStats() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0
      ? (this.metrics.hits / (this.metrics.hits + this.metrics.misses) * 100).toFixed(2)
      : 0;
      
    return {
      size: this.metrics.size,
      maxSize: this.options.maxSize,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      hitRate: `${hitRate}%`,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Gets the approximate memory usage of the cache
   * @returns {string} - Human-readable memory usage
   */
  getMemoryUsage() {
    // Get approximate size in bytes
    const usageInBytes = this.estimateSize();
    
    // Convert to human-readable format
    if (usageInBytes < 1024) {
      return `${usageInBytes} bytes`;
    } else if (usageInBytes < 1024 * 1024) {
      return `${(usageInBytes / 1024).toFixed(2)} KB`;
    } else {
      return `${(usageInBytes / (1024 * 1024)).toFixed(2)} MB`;
    }
  }

  /**
   * Estimates the size of the cache in bytes
   * This is an approximation as JavaScript doesn't provide exact memory usage
   * @returns {number} - Estimated size in bytes
   */
  estimateSize() {
    let totalSize = 0;
    
    // Estimate size for each entry (keys + values + metadata)
    for (const [key, entry] of this.cache.entries()) {
      // Key size (2 bytes per char)
      totalSize += key.length * 2;
      
      // Value size (very rough estimate)
      const value = entry.value;
      
      if (typeof value === 'string') {
        totalSize += value.length * 2;
      } else if (value instanceof Uint8Array || Array.isArray(value)) {
        totalSize += value.length * 8;
      } else if (typeof value === 'object' && value !== null) {
        // Rough estimate for objects
        totalSize += JSON.stringify(value).length * 2;
      } else {
        // Numbers, booleans, etc.
        totalSize += 8;
      }
      
      // Metadata (timestamps, etc.)
      totalSize += 24;
    }
    
    return totalSize;
  }

  /**
   * Stops the cleanup interval when no longer needed
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Export singleton instance with larger default cache size
module.exports = new CacheManager({
  maxSize: 10000,    // Store up to 10,000 items
  ttl: 3600000,      // Default: 1 hour cache lifetime
  checkInterval: 600000 // Clean up every 10 minutes
}); 