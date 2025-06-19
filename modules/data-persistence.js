/**
 * Data Persistence Module
 * Coordinates data management between cache and file system operations
 */

import { FileSystem } from './utils/file-system.js';
import { CacheManager } from './utils/cache-manager.js';
import { DIRECTORIES, FILE_NAMES } from './constants.js';

export class DataPersistence {
  constructor(dataDir) {
    this.dataDir = dataDir;
    this.cacheManager = new CacheManager();
  }

  getProjectDir(projectId) {
    return FileSystem.join(this.dataDir, DIRECTORIES.PROJECTS, projectId);
  }

  getPathDir(projectId, pathName) {
    return FileSystem.join(this.dataDir, DIRECTORIES.PROJECTS, projectId, DIRECTORIES.PATHS, pathName);
  }

  async loadProjectData(projectId, filename) {
    const cacheKey = this.cacheManager.getCacheKey(projectId, filename);
    // Check cache first
    const cachedData = this.cacheManager.getCache(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }

    const filePath = FileSystem.join(this.getProjectDir(projectId), filename);

    // Gracefully handle brand-new projects with no data yet
    const exists = await FileSystem.exists(filePath);
    if (!exists) {
      const defaultData = this._getDefaultData(filename, projectId);
      this.cacheManager.setCache(cacheKey, defaultData);
      return defaultData;
    }

    try {
      const parsed = await FileSystem.readJSON(filePath);
      // Cache the result
      this.cacheManager.setCache(cacheKey, parsed);
      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT' || error.message?.includes('ENOENT')) {
        const defaultData = this._getDefaultData(filename, projectId);
        this.cacheManager.setCache(cacheKey, defaultData);
        return defaultData;
      }
      const { DataPersistenceError } = await import('./errors.js');
      throw new DataPersistenceError('load', filePath, error, { projectId, filename });
    }
  }

  async saveProjectData(projectId, filename, data) {
    try {
      const projectDir = this.getProjectDir(projectId);
      await FileSystem.ensureDir(projectDir);
      const filePath = FileSystem.join(projectDir, filename);
      await FileSystem.writeJSON(filePath, data);

      // Invalidate cache for this file
      const cacheKey = this.cacheManager.getCacheKey(projectId, filename);
      this.cacheManager.invalidateCache(cacheKey);

      return true;
    } catch (error) {
      await this.logError('saveProjectData', error, { projectId, filename });
      return false;
    }
  }

  async loadPathData(projectId, pathName, filename) {
    const cacheKey = this.cacheManager.getCacheKey(projectId, filename, pathName);
    // Check cache first
    const cachedData = this.cacheManager.getCache(cacheKey);
    if (cachedData !== null) {
      return cachedData;
    }

    const filePath = FileSystem.join(this.getPathDir(projectId, pathName), filename);

    const exists = await FileSystem.exists(filePath);
    if (!exists) {
      const defaultData = this._getDefaultData(filename, projectId, pathName);
      this.cacheManager.setCache(cacheKey, defaultData);
      return defaultData;
    }

    try {
      const parsed = await FileSystem.readJSON(filePath);
      // Cache the result
      this.cacheManager.setCache(cacheKey, parsed);
      return parsed;
    } catch (error) {
      if (error.code === 'ENOENT' || error.message?.includes('ENOENT')) {
        const defaultData = this._getDefaultData(filename, projectId, pathName);
        this.cacheManager.setCache(cacheKey, defaultData);
        return defaultData;
      }
      const { DataPersistenceError } = await import('./errors.js');
      throw new DataPersistenceError('load', filePath, error, { projectId, pathName, filename });
    }
  }

  async savePathData(projectId, pathName, filename, data) {
    try {
      const pathDir = this.getPathDir(projectId, pathName);
      await FileSystem.ensureDir(pathDir);
      const filePath = FileSystem.join(pathDir, filename);
      await FileSystem.writeJSON(filePath, data);

      // Invalidate cache for this file
      const cacheKey = this.cacheManager.getCacheKey(projectId, filename, pathName);
      this.cacheManager.invalidateCache(cacheKey);

      return true;
    } catch (error) {
      await this.logError('savePathData', error, { projectId, pathName, filename });
      return false;
    }
  }

  async loadGlobalData(filename) {
    const filePath = FileSystem.join(this.dataDir, filename);

    const exists = await FileSystem.exists(filePath);
    if (!exists) {
      return null;
    }

    try {
      return await FileSystem.readJSON(filePath);
    } catch (error) {
      if (error.code === 'ENOENT' || error.message?.includes('ENOENT')) {
        return null;
      }

      const { DataPersistenceError } = await import('./errors.js');
      throw new DataPersistenceError('load', filePath, error, { filename });
    }
  }

  async saveGlobalData(filename, data) {
    try {
      await FileSystem.ensureDir(this.dataDir);
      const filePath = FileSystem.join(this.dataDir, filename);
      await FileSystem.writeJSON(filePath, data);
      return true;
    } catch (error) {
      await this.logError('saveGlobalData', error, { filename });
      return false;
    }
  }

  async logError(operation, error, context = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      error: error.message,
      stack: error.stack,
      context
    };

    try {
      await FileSystem.ensureDir(this.dataDir);
      const logPath = FileSystem.join(this.dataDir, FILE_NAMES.ERROR_LOG);
      await FileSystem.appendFile(logPath, `${JSON.stringify(logEntry)}\n`);
    } catch {
      // If we can't log the error, just console.error it
      console.error('Failed to log error:', logEntry);
    }
  }

  async ensureDirectoryExists(dirPath) {
    try {
      await FileSystem.ensureDir(dirPath);
      return true;
    } catch (error) {
      await this.logError('ensureDirectoryExists', error, { dirPath });
      return false;
    }
  }

  async fileExists(filePath) {
    try {
      return await FileSystem.exists(filePath);
    } catch {
      return false;
    }
  }

  async deleteFile(filePath) {
    try {
      await FileSystem.deleteFile(filePath);
      return true;
    } catch (error) {
      await this.logError('deleteFile', error, { filePath });
      return false;
    }
  }

  async listFiles(dirPath) {
    try {
      return await FileSystem.readdir(dirPath);
    } catch (error) {
      await this.logError('listFiles', error, { dirPath });
      return [];
    }
  }

  async copyFile(sourcePath, destPath) {
    try {
      await FileSystem.copyFile(sourcePath, destPath);
      return true;
    } catch (error) {
      await this.logError('copyFile', error, { sourcePath, destPath });
      return false;
    }
  }

  // ===== CACHE MANAGEMENT METHODS =====

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    this.cacheManager.clearCache();
  }

  /**
   * Clean up expired cache entries
   * @returns {number} Number of entries removed
   */
  cleanupExpiredCacheEntries() {
    return this.cacheManager.cleanupExpiredEntries();
  }

  /**
   * Invalidate cache for specific project data
   * @param {string} projectId - Project identifier
   * @param {string} filename - File name
   * @param {string|null} pathName - Optional path name
   */
  invalidateProjectCache(projectId, filename, pathName = null) {
    const cacheKey = this.cacheManager.getCacheKey(projectId, filename, pathName);
    this.cacheManager.invalidateCache(cacheKey);
  }

  /**
   * Provide sensible default structures when a data file has not been created yet.
   * This prevents ENOENT errors from bubbling up through the stack.
   * @private
   */
  _getDefaultData(filename, projectId = '', pathName = '') {
    switch (filename) {
      case FILE_NAMES.LEARNING_HISTORY:
        return { completions: [], insights: [] };
      case FILE_NAMES.HTA:
        return { tree: null, collaborative_sessions: [] };
      default:
        break;
    }

    if (filename.startsWith('day_')) {
      return { blocks: [], notes: [] };
    }

    if (filename === FILE_NAMES.CONFIG) {
      return { projectId };
    }

    // Generic fallback
    return {};
  }
}