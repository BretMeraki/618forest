/**
 * Models Index
 * Central export point for all data models
 */

import { HtaNode } from './hta-node.js';
import { ScheduleBlock } from './schedule-block.js';
import { Project } from './project.js';

export { HtaNode, ScheduleBlock, Project };

// Model utilities and helpers
export const ModelUtils = {
  /**
   * Validate and convert raw data to model instances
   */
  ensureHtaNode(data) {
    if (data instanceof HtaNode) {
      return data;
    }
    return HtaNode.fromData(data);
  },

  ensureScheduleBlock(data) {
    if (data instanceof ScheduleBlock) {
      return data;
    }
    return ScheduleBlock.fromData(data);
  },

  ensureProject(data) {
    if (data instanceof Project) {
      return data;
    }
    return Project.fromData(data);
  },

  /**
   * Convert arrays of raw data to model instances
   */
  ensureHtaNodes(dataArray) {
    if (!Array.isArray(dataArray)) {
      return [];
    }
    return dataArray.map(data => this.ensureHtaNode(data));
  },

  ensureScheduleBlocks(dataArray) {
    if (!Array.isArray(dataArray)) {
      return [];
    }
    return dataArray.map(data => this.ensureScheduleBlock(data));
  },

  /**
   * Convert model instances to JSON for persistence
   */
  toJSON(model) {
    if (model && typeof model.toJSON === 'function') {
      return model.toJSON();
    }
    return model;
  },

  arrayToJSON(modelArray) {
    if (!Array.isArray(modelArray)) {
      return [];
    }
    return modelArray.map(model => this.toJSON(model));
  },
};
