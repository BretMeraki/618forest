/**
 * Tool Registry Module
 * Provides dynamic tool registration and execution without hardcoded switch statements
 */

import { ToolDispatchError } from '../errors.js';

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
    this.toolCategories = new Map();
  }

  /**
   * Register a tool with its handler
   * @param {string} toolName - Name of the tool
   * @param {Function} handler - Function to handle the tool execution
   * @param {string} category - Category for organization (optional)
   * @param {Object} metadata - Additional metadata about the tool (optional)
   */
  register(toolName, handler, category = 'general', metadata = {}) {
    if (!toolName || typeof toolName !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }

    if (!handler || typeof handler !== 'function') {
      throw new Error('Tool handler must be a function');
    }

    this.tools.set(toolName, {
      handler,
      category,
      metadata,
      registeredAt: new Date().toISOString(),
    });

    // Track tools by category
    if (!this.toolCategories.has(category)) {
      this.toolCategories.set(category, new Set());
    }
    this.toolCategories.get(category).add(toolName);
  }

  /**
   * Execute a tool by name
   * @param {string} toolName - Name of the tool to execute
   * @param {Object} args - Arguments to pass to the tool
   * @returns {Promise<any>} Result from the tool execution
   */
  async execute(toolName, args = {}) {
    if (!this.tools.has(toolName)) {
      throw new ToolDispatchError(toolName, new Error(`Tool '${toolName}' not found`), args);
    }

    const tool = this.tools.get(toolName);

    try {
      return await tool.handler(args);
    } catch (error) {
      throw new ToolDispatchError(toolName, error, args);
    }
  }

  /**
   * Check if a tool is registered
   * @param {string} toolName - Name of the tool
   * @returns {boolean} True if tool is registered
   */
  has(toolName) {
    return this.tools.has(toolName);
  }

  /**
   * Get all registered tool names
   * @returns {string[]} Array of tool names
   */
  getToolNames() {
    return Array.from(this.tools.keys());
  }

  /**
   * Get tools by category
   * @param {string} category - Category name
   * @returns {string[]} Array of tool names in the category
   */
  getToolsByCategory(category) {
    const categorySet = this.toolCategories.get(category);
    return categorySet ? Array.from(categorySet) : [];
  }

  /**
   * Get all categories
   * @returns {string[]} Array of category names
   */
  getCategories() {
    return Array.from(this.toolCategories.keys());
  }

  /**
   * Get tool metadata
   * @param {string} toolName - Name of the tool
   * @returns {Object|null} Tool metadata or null if not found
   */
  getToolMetadata(toolName) {
    const tool = this.tools.get(toolName);
    return tool
      ? {
          category: tool.category,
          metadata: tool.metadata,
          registeredAt: tool.registeredAt,
        }
      : null;
  }

  /**
   * Unregister a tool
   * @param {string} toolName - Name of the tool to remove
   * @returns {boolean} True if tool was removed, false if it didn't exist
   */
  unregister(toolName) {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return false;
    }

    this.tools.delete(toolName);

    // Remove from category tracking
    const categorySet = this.toolCategories.get(tool.category);
    if (categorySet) {
      categorySet.delete(toolName);
      if (categorySet.size === 0) {
        this.toolCategories.delete(tool.category);
      }
    }

    return true;
  }

  /**
   * Get registry statistics
   * @returns {Object} Statistics about the registry
   */
  getStats() {
    const toolsByCategory = {};
    for (const [category, tools] of this.toolCategories.entries()) {
      toolsByCategory[category] = tools.size;
    }

    return {
      totalTools: this.tools.size,
      totalCategories: this.toolCategories.size,
      toolsByCategory,
      registeredTools: this.getToolNames(),
    };
  }
}
