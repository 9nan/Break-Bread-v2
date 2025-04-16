/**
 * Command Cache Manager for BreakBread Discord Bot
 * Specialized wrapper around main cache system for command-specific caching\
 * created by Itznan 
 * Discord = itz._.nan_
 */
const cacheManager = require('./cacheManager');

class CommandCacheManager {
  constructor() {
    this.cacheManager = cacheManager;
    this.commandStats = new Map();
    this.cacheEnabled = true;
    
    // Automatically track performance and usage patterns
    this.trackingInterval = setInterval(() => {
      this.logCommandPerformance();
    }, 60 * 60 * 1000); // Log every hour
  }
  
  /**
   * Enable or disable the cache system
   * @param {boolean} enabled - Whether to enable caching
   */
  setCacheEnabled(enabled) {
    this.cacheEnabled = !!enabled;
    return this.cacheEnabled;
  }
  
  /**
   * Get a cached command result
   * @param {string} commandName - The command name
   * @param {string} key - The cache key within the command
   * @returns {any} - The cached result or null
   */
  getCommandCache(commandName, key) {
    if (!this.cacheEnabled) return null;
    
    const fullKey = this.getFullKey(commandName, key);
    const result = this.cacheManager.get(fullKey);
    
    // Track command stats
    this.trackCommandStats(commandName, !!result);
    
    return result;
  }
  
  /**
   * Set a command result in cache
   * @param {string} commandName - The command name
   * @param {string} key - The cache key within the command
   * @param {any} value - The value to cache
   * @param {object} options - Cache options
   * @returns {boolean} - Success indicator
   */
  setCommandCache(commandName, key, value, options = {}) {
    if (!this.cacheEnabled) return false;
    
    const fullKey = this.getFullKey(commandName, key);
    return this.cacheManager.set(fullKey, value, options);
  }
  
  /**
   * Check if a command result is cached
   * @param {string} commandName - The command name
   * @param {string} key - The cache key within the command
   * @returns {boolean} - Whether the result is cached
   */
  hasCommandCache(commandName, key) {
    if (!this.cacheEnabled) return false;
    
    const fullKey = this.getFullKey(commandName, key);
    return this.cacheManager.has(fullKey);
  }
  
  /**
   * Clear cache for a specific command
   * @param {string} commandName - The command name to clear cache for
   * @returns {number} - Number of entries cleared
   */
  clearCommandCache(commandName) {
    const prefix = `cmd:${commandName}:`;
    let cleared = 0;
    
    // Find all keys for this command and delete them
    for (const key of this.getAllKeys()) {
      if (key.startsWith(prefix)) {
        this.cacheManager.delete(key);
        cleared++;
      }
    }
    
    return cleared;
  }
  
  /**
   * Get all cache keys
   * @returns {Array<string>} - All cache keys
   */
  getAllKeys() {
    return Array.from(this.cacheManager.cache.keys());
  }
  
  /**
   * Get full cache key
   * @param {string} commandName - The command name
   * @param {string} key - The cache key
   * @returns {string} - The full cache key
   */
  getFullKey(commandName, key) {
    return `cmd:${commandName}:${key}`;
  }
  
  /**
   * Track command cache usage statistics
   * @param {string} commandName - The command name
   * @param {boolean} wasHit - Whether the cache was hit
   */
  trackCommandStats(commandName, wasHit) {
    if (!this.commandStats.has(commandName)) {
      this.commandStats.set(commandName, {
        hits: 0,
        misses: 0,
        last_used: Date.now()
      });
    }
    
    const stats = this.commandStats.get(commandName);
    if (wasHit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    stats.last_used = Date.now();
  }
  
  /**
   * Log performance of commands
   */
  logCommandPerformance() {
    const commandStats = Array.from(this.commandStats.entries())
      .map(([command, stats]) => {
        const total = stats.hits + stats.misses;
        const hitRate = total > 0 ? (stats.hits / total * 100).toFixed(1) : 0;
        return { 
          command, 
          hitRate: `${hitRate}%`, 
          hits: stats.hits, 
          misses: stats.misses,
          total,
          last_used: stats.last_used
        };
      })
      .sort((a, b) => b.total - a.total);
    
    // Performance logging removed
  }
  
  /**
   * Get statistics about command cache usage
   * @returns {object} - Command cache statistics
   */
  getCommandStats() {
    if (this.commandStats.size === 0) {
      return [];
    }

    const commandStats = [];
    for (const [command, stats] of this.commandStats.entries()) {
      commandStats.push({
        command,
        hits: stats.hits,
        total: stats.total,
        hitRate: (stats.hits / stats.total).toFixed(2),
      });
    }

    // Sort by hit rate descending
    commandStats.sort((a, b) => b.hitRate - a.hitRate);

    // Performance logging removed

    return commandStats;
  }
  
  /**
   * Destroy the cache manager
   */
  destroy() {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
  }
}

// Export singleton instance
module.exports = new CommandCacheManager(); 