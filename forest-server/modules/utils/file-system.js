/**
 * FileSystem Utility Module
 * Centralizes all direct file system operations for the Forest MCP server
 * Following Single Responsibility Principle - handles only file I/O operations
 */

import fs from 'fs/promises';
import path from 'path';

export class FileSystem {
  /**
   * Read file contents as UTF-8 string
   * @param {string} filePath - Absolute or relative path to file
   * @returns {Promise<string>} File contents
   * @throws {Error} If file cannot be read
   */
  static async readFile(filePath) {
    try {
      return await fs.readFile(filePath, 'utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Write data to file as UTF-8 string
   * @param {string} filePath - Absolute or relative path to file
   * @param {string} data - Data to write to file
   * @returns {Promise<void>}
   * @throws {Error} If file cannot be written
   */
  static async writeFile(filePath, data) {
    try {
      await fs.writeFile(filePath, data, 'utf8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Append data to file as UTF-8 string
   * @param {string} filePath - Absolute or relative path to file
   * @param {string} data - Data to append to file
   * @returns {Promise<void>}
   * @throws {Error} If file cannot be appended to
   */
  static async appendFile(filePath, data) {
    try {
      await fs.appendFile(filePath, data, 'utf8');
    } catch (error) {
      throw new Error(`Failed to append to file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Check if file or directory exists
   * @param {string} filePath - Absolute or relative path to check
   * @returns {Promise<boolean>} True if path exists, false otherwise
   */
  static async exists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create directory recursively (equivalent to mkdir -p)
   * @param {string} dirPath - Absolute or relative path to directory
   * @returns {Promise<void>}
   * @throws {Error} If directory cannot be created
   */
  static async mkdir(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Remove/delete a file
   * @param {string} filePath - Absolute or relative path to file
   * @returns {Promise<void>}
   * @throws {Error} If file cannot be deleted
   */
  static async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      throw new Error(`Failed to delete file ${filePath}: ${error.message}`);
    }
  }

  /**
   * List contents of a directory
   * @param {string} dirPath - Absolute or relative path to directory
   * @returns {Promise<string[]>} Array of file/directory names
   * @throws {Error} If directory cannot be read
   */
  static async readdir(dirPath) {
    try {
      return await fs.readdir(dirPath);
    } catch (error) {
      throw new Error(`Failed to read directory ${dirPath}: ${error.message}`);
    }
  }

  /**
   * Get file/directory stats
   * @param {string} filePath - Absolute or relative path
   * @returns {Promise<import('fs').Stats>} File stats object
   * @throws {Error} If stats cannot be retrieved
   */
  static async stat(filePath) {
    try {
      return await fs.stat(filePath);
    } catch (error) {
      throw new Error(`Failed to get stats for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Copy a file from source to destination
   * @param {string} sourcePath - Source file path
   * @param {string} destPath - Destination file path
   * @returns {Promise<void>}
   * @throws {Error} If file cannot be copied
   */
  static async copyFile(sourcePath, destPath) {
    try {
      await fs.copyFile(sourcePath, destPath);
    } catch (error) {
      throw new Error(`Failed to copy file from ${sourcePath} to ${destPath}: ${error.message}`);
    }
  }

  /**
   * Read and parse JSON file
   * @param {string} filePath - Path to JSON file
   * @returns {Promise<any>} Parsed JSON object
   * @throws {Error} If file cannot be read or JSON is invalid
   */
  static async readJSON(filePath) {
    try {
      const data = await FileSystem.readFile(filePath);
      return JSON.parse(data);
    } catch (error) {
      if (error.message.includes('Failed to read file')) {
        throw error; // Re-throw file read errors as-is
      }
      throw new Error(`Failed to parse JSON from ${filePath}: ${error.message}`);
    }
  }

  /**
   * Write object to file as formatted JSON
   * @param {string} filePath - Path to JSON file
   * @param {any} data - Object to serialize as JSON
   * @param {number} spaces - Number of spaces for JSON formatting (default: 2)
   * @returns {Promise<void>}
   * @throws {Error} If data cannot be serialized or file cannot be written
   */
  static async writeJSON(filePath, data, spaces = 2) {
    try {
      const jsonString = JSON.stringify(data, null, spaces);
      await FileSystem.writeFile(filePath, jsonString);
    } catch (error) {
      if (error.message.includes('Failed to write file')) {
        throw error; // Re-throw file write errors as-is
      }
      throw new Error(`Failed to serialize JSON for ${filePath}: ${error.message}`);
    }
  }

  /**
   * Ensure directory exists, create if it doesn't
   * @param {string} dirPath - Directory path to ensure exists
   * @returns {Promise<void>}
   */
  static async ensureDir(dirPath) {
    const exists = await FileSystem.exists(dirPath);
    if (!exists) {
      await FileSystem.mkdir(dirPath);
    }
  }

  /**
   * Get the directory name from a file path
   * @param {string} filePath - File path
   * @returns {string} Directory name
   */
  static dirname(filePath) {
    return path.dirname(filePath);
  }

  /**
   * Join path segments
   * @param {...string} segments - Path segments to join
   * @returns {string} Joined path
   */
  static join(...segments) {
    return path.join(...segments);
  }

  /**
   * Get the base name (file name) from a path
   * @param {string} filePath - File path
   * @param {string} ext - Optional extension to remove
   * @returns {string} Base name
   */
  static basename(filePath, ext) {
    return path.basename(filePath, ext);
  }

  /**
   * Get the extension of a file
   * @param {string} filePath - File path
   * @returns {string} File extension (including the dot)
   */
  static extname(filePath) {
    return path.extname(filePath);
  }

  /**
   * Resolve a path to an absolute path
   * @param {...string} segments - Path segments to resolve
   * @returns {string} Absolute path
   */
  static resolve(...segments) {
    return path.resolve(...segments);
  }
}
