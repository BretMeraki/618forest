/**
 * Task Selector Module
 * Handles selection of optimal tasks based on scoring and diversity criteria
 */

import { TaskScorer } from './task-scorer.js';

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

    // Pre-compute completed node IDs as a Set for O(1) lookup
    const completedNodeIds = new Set(nodes.filter(n => n.completed).map(n => n.id));

    // Create a map for fast node lookup by title (for legacy prerequisite support)
    const nodesByTitle = new Map();
    for (const node of nodes) {
      if (node.completed) {
        nodesByTitle.set(node.title, node);
      }
    }

    // Filter available tasks (not completed, prerequisites met)
    const availableTasks = [];
    for (const node of nodes) {
      if (node.completed) {
        continue;
      }

      // Check prerequisites efficiently
      if (node.prerequisites && node.prerequisites.length > 0) {
        let prerequisitesMet = true;
        for (const prereq of node.prerequisites) {
          if (!completedNodeIds.has(prereq) && !nodesByTitle.has(prereq)) {
            prerequisitesMet = false;
            break;
          }
        }
        if (!prerequisitesMet) {
          continue;
        }
      }

      // Filter by time availability (more than 120% of available time).  This prevents the
      // system from suggesting 20-minute tasks for a 10-minute slot.
      const timeInMinutes = TaskScorer.parseTimeToMinutes(timeAvailable);
      const taskMinutes = TaskScorer.parseTimeToMinutes(node.duration || '30 minutes');
      if (taskMinutes > timeInMinutes * 1.2) {
        continue; // Too long – try another task
      }

      availableTasks.push(node);
    }

    if (availableTasks.length === 0) {
      return null;
    }

    // Parse time available once
    const timeInMinutes = TaskScorer.parseTimeToMinutes(timeAvailable);

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
        return Math.random() - 0.5;
      }

      return momentumB - momentumA; // Prefer momentum tasks
    });

    return sortedByBranchRarity[0];
  }
} 