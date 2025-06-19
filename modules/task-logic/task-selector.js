/**
 * Task Selector Module
 * Handles selection of optimal tasks based on scoring and diversity criteria
 */

import { TaskScorer } from './task-scorer.js';
import { getAvailableNodes } from '../utils/hta-logic.js';

// Lint-friendly constants
const TIME_TOLERANCE_FACTOR = 1.2; // Allow task duration up to 120% of available time
const RANDOM_TIE_BREAK_EPSILON = 0.5; // Random threshold for tie-breaks

export class TaskSelector {
  /**
   * Select the optimal task from available tasks
   * @param {Object} htaData - HTA data with frontier nodes
   * @param {number} energyLevel - User's current energy level (1-5)
   * @param {string} timeAvailable - Available time string
   * @param {string} contextFromMemory - Context from previous activities
   * @param {Object} projectContext - Project context
   * @returns {Object|null} Selected task or null if none available
   */
  static selectOptimalTask(htaData, energyLevel, timeAvailable, contextFromMemory, projectContext) {
    const nodes = htaData.frontierNodes || [];

    // Create a map for fast node lookup by title (for legacy prerequisite support)
    const nodesByTitle = new Map();
    for (const node of nodes) {
      if (node.completed) {
        nodesByTitle.set(node.title, node);
      }
    }

    // Use centralised HTA util to get tasks with prerequisites satisfied
    const availableBase = getAvailableNodes(nodes, nodes.filter(n => n.completed));

    // Apply time filter
    const availableTasks = [];
    const timeInMinutes = TaskScorer.parseTimeToMinutes(timeAvailable);
    for (const node of availableBase) {
      const taskMinutes = TaskScorer.parseTimeToMinutes(node.duration || '30 minutes');
      if (taskMinutes > timeInMinutes * TIME_TOLERANCE_FACTOR) {
        continue;
      }
      availableTasks.push(node);
    }

    if (availableTasks.length === 0) {
      return null;
    }

    // Score all tasks and collect high-scoring ones for diversity
    const scoredTasks = availableTasks.map(task => ({
      ...task,
      score: TaskScorer.calculateTaskScore(task, energyLevel, timeInMinutes, contextFromMemory, projectContext)
    }));

    // Sort by score descending
    scoredTasks.sort((a, b) => b.score - a.score);

    if (scoredTasks.length === 0) {
      return null;
    }

    // CRITICAL FIX: If multiple tasks have same high score, add variety
    const topScore = scoredTasks[0].score;
    const topTasks = scoredTasks.filter(task => task.score === topScore);

    if (topTasks.length === 1) {
      return topTasks[0];
    }

    // Multiple high-scoring tasks - add diversity selection
    // Prefer different branches and task types
    const diverseTask = this.selectDiverseTask(topTasks);
    return diverseTask || topTasks[0];
  }

  /**
   * Select a diverse task from multiple high-scoring tasks
   * @param {Array} topTasks - Array of top-scoring tasks
   * @returns {Object} Selected diverse task
   */
  static selectDiverseTask(topTasks) {
    // Track which branches we've seen recently to encourage diversity
    const branchCounts = {};

    for (const task of topTasks) {
      const branch = task.branch || 'general';
      branchCounts[branch] = (branchCounts[branch] || 0) + 1;
    }

    // Prefer tasks from less common branches
    const sortedByBranchRarity = topTasks.sort((a, b) => {
      const branchA = a.branch || 'general';
      const branchB = b.branch || 'general';

      // Lower count = higher priority
      const countDiff = branchCounts[branchA] - branchCounts[branchB];
      if (countDiff !== 0) { return countDiff; }

      // If same branch rarity, prefer different task types
      const momentumA = a.momentumBuilding ? 1 : 0;
      const momentumB = b.momentumBuilding ? 1 : 0;

      // Add some randomness to break final ties
      if (momentumA === momentumB) {
        return Math.random() - RANDOM_TIE_BREAK_EPSILON;
      }

      return momentumB - momentumA; // Prefer momentum tasks
    });

    return sortedByBranchRarity[0];
  }
}