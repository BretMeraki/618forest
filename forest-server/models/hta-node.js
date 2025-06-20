/**
 * HTA Node Model
 * Represents a single node in the Hierarchical Task Analysis tree
 */

import { MODEL_DEFAULTS, TASK_CONFIG, TIME_CONVERSION } from '../modules/constants.js';

export class HtaNode {
  /**
   * Create a new HTA Node
   * @param {Object} options - Node configuration options
   * @param {string} options.id - Unique identifier for the node
   * @param {string} options.title - Node title/name
   * @param {string} [options.description=''] - Detailed description
   * @param {string} options.branch - HTA branch this node belongs to
   * @param {number} [options.difficulty=1] - Task difficulty level (1-5)
   * @param {number} [options.priority=200] - Task priority score
   * @param {string} [options.duration='30 minutes'] - Expected duration
   * @param {string[]} [options.prerequisites=[]] - Required prerequisite node IDs
   * @param {boolean} [options.completed=false] - Whether task is completed
   * @param {string|null} [options.completedAt=null] - Completion timestamp
   * @param {string|null} [options.opportunityType=null] - Type of opportunity
   * @param {number|null} [options.actualDifficulty=null] - Actual difficulty experienced
   * @param {string|null} [options.actualDuration=null] - Actual time taken
   * @throws {Error} If required fields (id, title, branch) are missing
   */
  constructor({
    id,
    title,
    description = '',
    branch,
    difficulty = TASK_CONFIG.MIN_DIFFICULTY,
    priority = MODEL_DEFAULTS.HTA_DEFAULT_PRIORITY,
    duration = `${MODEL_DEFAULTS.HTA_DEFAULT_DURATION_MINUTES} minutes`,
    prerequisites = [],
    completed = false,
    completedAt = null,
    opportunityType = null,
    actualDifficulty = null,
    actualDuration = null,
  }) {
    // Validation
    if (!id) {
      throw new Error('HtaNode requires an id');
    }
    if (!title) {
      throw new Error('HtaNode requires a title');
    }
    if (!branch) {
      throw new Error('HtaNode requires a branch');
    }

    // Core properties
    this.id = id;
    this.title = title;
    this.description = description;
    this.branch = branch;

    // Task characteristics
    this.difficulty = this.validateDifficulty(difficulty);
    this.priority = this.validatePriority(priority);
    this.duration = this.validateDuration(duration);
    this.prerequisites = this.validatePrerequisites(prerequisites);

    // State tracking
    this.completed = Boolean(completed);
    this.completedAt = completedAt;

    // Opportunity and optimization data
    this.opportunityType = opportunityType;
    this.actualDifficulty = actualDifficulty;
    this.actualDuration = actualDuration;

    // Metadata
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  /**
   * Validate and normalize difficulty value
   * @param {number} difficulty - Difficulty value to validate
   * @returns {number} Validated difficulty (1-5)
   */
  validateDifficulty(difficulty) {
    const diff = Number(difficulty);
    if (isNaN(diff) || diff < TASK_CONFIG.MIN_DIFFICULTY || diff > TASK_CONFIG.MAX_DIFFICULTY) {
      return TASK_CONFIG.MIN_DIFFICULTY; // Default to easiest
    }
    return Math.round(diff);
  }

  /**
   * Validate and normalize priority value
   * @param {number} priority - Priority value to validate
   * @returns {number} Validated priority (>= 0)
   */
  validatePriority(priority) {
    const prio = Number(priority);
    if (isNaN(prio) || prio < 0) {
      return MODEL_DEFAULTS.HTA_DEFAULT_PRIORITY; // Default priority
    }
    return Math.round(prio);
  }

  /**
   * Validate and normalize duration string
   * @param {string|number} duration - Duration to validate
   * @returns {string} Validated duration string
   */
  validateDuration(duration) {
    if (typeof duration === 'number') {
      return `${duration} minutes`;
    }
    if (typeof duration === 'string' && duration.trim()) {
      return duration.trim();
    }
    return `${MODEL_DEFAULTS.HTA_DEFAULT_DURATION_MINUTES} minutes`;
  }

  /**
   * Validate and filter prerequisites array
   * @param {string[]} prerequisites - Prerequisites to validate
   * @returns {string[]} Filtered valid prerequisites
   */
  validatePrerequisites(prerequisites) {
    if (!Array.isArray(prerequisites)) {
      return [];
    }
    return prerequisites.filter(prereq => typeof prereq === 'string' && prereq.trim());
  }

  /**
   * Mark this node as completed
   * @param {string|null} [completedAt=null] - Completion timestamp (defaults to now)
   * @returns {HtaNode} This node for chaining
   */
  markCompleted(completedAt = null) {
    this.completed = true;
    this.completedAt = completedAt || new Date().toISOString();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Mark this node as incomplete
   * @returns {HtaNode} This node for chaining
   */
  markIncomplete() {
    this.completed = false;
    this.completedAt = null;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Update actual task metrics after completion
   * @param {number|null} [actualDifficulty=null] - Actual difficulty experienced
   * @param {string|null} [actualDuration=null] - Actual time taken
   * @returns {HtaNode} This node for chaining
   */
  updateActuals(actualDifficulty = null, actualDuration = null) {
    if (actualDifficulty !== null) {
      this.actualDifficulty = this.validateDifficulty(actualDifficulty);
    }
    if (actualDuration !== null) {
      this.actualDuration = this.validateDuration(actualDuration);
    }
    this.updatedAt = new Date().toISOString();
    return this;
  }

  /**
   * Add a prerequisite to this node
   * @param {string} prerequisiteId - ID of prerequisite node
   * @returns {HtaNode} This node for chaining
   */
  addPrerequisite(prerequisiteId) {
    if (typeof prerequisiteId === 'string' && prerequisiteId.trim()) {
      if (!this.prerequisites.includes(prerequisiteId)) {
        this.prerequisites.push(prerequisiteId);
        this.updatedAt = new Date().toISOString();
      }
    }
    return this;
  }

  /**
   * Remove a prerequisite from this node
   * @param {string} prerequisiteId - ID of prerequisite to remove
   * @returns {HtaNode} This node for chaining
   */
  removePrerequisite(prerequisiteId) {
    const index = this.prerequisites.indexOf(prerequisiteId);
    if (index > -1) {
      this.prerequisites.splice(index, 1);
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  /**
   * Check if this node is available for execution
   * @param {string[]} [completedNodeIds=[]] - Array of completed node IDs
   * @returns {boolean} True if node is available (not completed, prerequisites met)
   */
  isAvailable(completedNodeIds = []) {
    if (this.completed) {
      return false;
    }

    // Check if all prerequisites are satisfied
    return this.prerequisites.every(prereqId => completedNodeIds.includes(prereqId));
  }

  /**
   * Get duration as number of minutes
   * @returns {number} Duration in minutes
   */
  getDurationInMinutes() {
    const match = this.duration.match(/(\d+)\s*minutes?/i);
    return match ? parseInt(match[1], 10) : MODEL_DEFAULTS.HTA_DEFAULT_DURATION_MINUTES;
  }

  /**
   * Check if this node is overdue
   * @param {Date} [currentTime=new Date()] - Current time for comparison
   * @returns {boolean} True if node is overdue
   */
  isOverdue(currentTime = new Date()) {
    // If not completed and has been created more than expected duration ago
    if (this.completed) {
      return false;
    }

    const created = new Date(this.createdAt);
    const durationMs = this.getDurationInMinutes() * TIME_CONVERSION.MILLISECONDS_PER_MINUTE;
    const overdueThreshold = TIME_CONVERSION.MILLISECONDS_PER_DAY; // 24 hours

    return currentTime - created > durationMs + overdueThreshold;
  }

  /**
   * Convert node to JSON for persistence
   * @returns {Object} JSON representation of the node
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      description: this.description,
      branch: this.branch,
      difficulty: this.difficulty,
      priority: this.priority,
      duration: this.duration,
      prerequisites: this.prerequisites,
      completed: this.completed,
      completedAt: this.completedAt,
      opportunityType: this.opportunityType,
      actualDifficulty: this.actualDifficulty,
      actualDuration: this.actualDuration,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Create a new HtaNode from existing data
   * @param {Object} data - Node data object
   * @returns {HtaNode} New HtaNode instance
   */
  static fromData(data) {
    return new HtaNode(data);
  }

  /**
   * Create a new HtaNode with auto-generated ID
   * @param {Object} options - Node configuration options (excluding id)
   * @param {string} options.title - Node title/name
   * @param {string} options.description - Detailed description
   * @param {string} options.branch - HTA branch this node belongs to
   * @returns {HtaNode} New HtaNode instance with generated ID
   */
  static create({ title, description, branch, ...options }) {
    const id = `node_${Date.now()}_${Math.random()
      .toString(MODEL_DEFAULTS.RADIX_BASE_36)
      .slice(
        MODEL_DEFAULTS.ID_RANDOM_STRING_START,
        MODEL_DEFAULTS.ID_RANDOM_STRING_START + MODEL_DEFAULTS.ID_RANDOM_STRING_LENGTH
      )}`;
    return new HtaNode({ id, title, description, branch, ...options });
  }
}
