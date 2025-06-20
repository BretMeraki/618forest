/**
 * Task Scorer Module - Simplified Transparent Scoring
 * Prioritizes hierarchy depth (foundational tasks first) and prerequisite completion
 * Eliminates opaque formulas in favor of logical, understandable scoring
 */

import { SCORING, DEFAULT_PATHS } from '../constants.js';
import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'TaskScorer' });

export class TaskScorer {
  /**
   * Calculate transparent task score based on logical progression
   * Primary factors: 1) Hierarchy depth (shallower = higher priority)
   *                 2) Prerequisites met (blocked tasks = lower priority)
   *                 3) Secondary factors for tie-breaking
   */
  static calculateTaskScore(
    task,
    energyLevel,
    timeInMinutes,
    contextFromMemory,
    projectContext,
    fullConfig = null,
    reasoningAnalysis = null
  ) {
    const scoreBreakdown = {
      base: 0,
      depth: 0,
      prerequisites: 0,
      energy: 0,
      time: 0,
      total: 0
    };

    // BASE SCORE: Start with task's natural priority
    scoreBreakdown.base = task.priority || 200;

    // PRIMARY FACTOR 1: HIERARCHY DEPTH
    // Shallower tasks (foundational) get much higher priority
    const taskDepth = task.branch_depth || task.depth || this.inferDepthFromBranch(task.branch);
    if (taskDepth === 1) {
      scoreBreakdown.depth = 1000; // Foundation level - highest priority
      logger.debug('Foundation task identified', { task: task.title, depth: taskDepth });
    } else if (taskDepth === 2) {
      scoreBreakdown.depth = 500;  // Core development - high priority
    } else if (taskDepth === 3) {
      scoreBreakdown.depth = 200;  // Advanced - medium priority
    } else if (taskDepth >= 4) {
      scoreBreakdown.depth = 50;   // Mastery - lower priority
    } else {
      scoreBreakdown.depth = 300;  // Unknown depth - default medium
    }

    // PRIMARY FACTOR 2: PREREQUISITES
    // Tasks with unmet prerequisites get significantly lowered priority
    const prerequisiteStatus = this.checkPrerequisites(task, projectContext);
    if (prerequisiteStatus.allMet) {
      scoreBreakdown.prerequisites = 800; // Ready to work on - major boost
      logger.debug('Prerequisites met', { task: task.title, prerequisites: task.prerequisites });
    } else if (prerequisiteStatus.partiallyMet) {
      scoreBreakdown.prerequisites = 200; // Some blockers - reduced priority
      logger.debug('Prerequisites partially met', { 
        task: task.title, 
        met: prerequisiteStatus.metCount,
        total: prerequisiteStatus.totalCount 
      });
    } else {
      scoreBreakdown.prerequisites = -500; // Blocked - major penalty
      logger.debug('Prerequisites not met', { 
        task: task.title, 
        blockers: prerequisiteStatus.unmeta
      });
    }

    // SECONDARY FACTOR 1: ENERGY MATCHING
    // Simple, transparent energy matching for tie-breaking
    const taskDifficulty = task.difficulty || 3;
    const energyMatch = Math.max(0, 5 - Math.abs(energyLevel - taskDifficulty));
    scoreBreakdown.energy = energyMatch * 50; // Small boost for good energy match

    // SECONDARY FACTOR 2: TIME FITTING
    // Simple time constraint handling
    const taskDuration = this.parseTimeToMinutes(task.duration || '30 minutes');
    if (timeInMinutes >= taskDuration) {
      scoreBreakdown.time = 100; // Task fits - small boost
    } else if (timeInMinutes >= taskDuration * 0.7) {
      scoreBreakdown.time = 50;  // Slightly tight - smaller boost
    } else {
      scoreBreakdown.time = -100; // Too long - small penalty
    }

    // CALCULATE TOTAL
    scoreBreakdown.total = scoreBreakdown.base + 
                          scoreBreakdown.depth + 
                          scoreBreakdown.prerequisites + 
                          scoreBreakdown.energy + 
                          scoreBreakdown.time;

    logger.debug('Task score calculated', {
      task: task.title,
      breakdown: scoreBreakdown,
      reasoning: this.explainScore(scoreBreakdown, taskDepth, prerequisiteStatus)
    });

    return scoreBreakdown.total;
  }

  /**
   * Check prerequisite completion status
   */
  static checkPrerequisites(task, projectContext) {
    if (!task.prerequisites || task.prerequisites.length === 0) {
      return { allMet: true, partiallyMet: false, metCount: 0, totalCount: 0, unmet: [] };
    }

    const completedTasks = projectContext?.completedTasks || [];
    const completedTitles = new Set(completedTasks.map(t => t.title || t.id));
    
    let metCount = 0;
    const unmet = [];
    
    for (const prereq of task.prerequisites) {
      if (completedTitles.has(prereq)) {
        metCount++;
      } else {
        unmet.push(prereq);
      }
    }

    const totalCount = task.prerequisites.length;
    const allMet = metCount === totalCount;
    const partiallyMet = metCount > 0 && metCount < totalCount;

    return { allMet, partiallyMet, metCount, totalCount, unmet };
  }

  /**
   * Infer task depth from branch name if not explicitly set
   */
  static inferDepthFromBranch(branch) {
    if (!branch) return 2; // Default to core level

    const branchLower = branch.toLowerCase();
    
    // Foundation indicators
    if (branchLower.includes('foundation') || 
        branchLower.includes('basic') || 
        branchLower.includes('intro') ||
        branchLower.includes('fundamentals')) {
      return 1;
    }
    
    // Advanced indicators
    if (branchLower.includes('advanced') || 
        branchLower.includes('mastery') || 
        branchLower.includes('expert')) {
      return 4;
    }
    
    // Development indicators (medium depth)
    if (branchLower.includes('development') || 
        branchLower.includes('implementation') || 
        branchLower.includes('core')) {
      return 2;
    }

    return 2; // Default to core development level
  }

  /**
   * Generate human-readable explanation of the score
   */
  static explainScore(scoreBreakdown, taskDepth, prerequisiteStatus) {
    const explanations = [];
    
    if (scoreBreakdown.depth >= 1000) {
      explanations.push("FOUNDATION task - highest priority for building strong base");
    } else if (scoreBreakdown.depth >= 500) {
      explanations.push("CORE task - high priority for skill development");
    } else if (scoreBreakdown.depth >= 200) {
      explanations.push("ADVANCED task - medium priority");
    } else {
      explanations.push("MASTERY task - lower priority until foundations complete");
    }

    if (prerequisiteStatus.allMet) {
      explanations.push("All prerequisites MET - ready to proceed");
    } else if (prerequisiteStatus.partiallyMet) {
      explanations.push(`Prerequisites PARTIALLY met (${prerequisiteStatus.metCount}/${prerequisiteStatus.totalCount})`);
    } else {
      explanations.push(`Prerequisites NOT met - blocked by: ${prerequisiteStatus.unmet.join(', ')}`);
    }

    return explanations.join("; ");
  }

  // Keep essential utility methods from original implementation
  static parseTimeToMinutes(timeStr) {
    if (typeof timeStr === 'number') return timeStr;
    if (!timeStr || typeof timeStr !== 'string') return 30;

    const str = timeStr.toLowerCase().trim();
    const match = str.match(/(\d+(?:\.\d+)?)\s*(min|minutes|hour|hours|hr|h)?/);

    if (!match) return 30;

    const value = parseFloat(match[1]);
    const unit = match[2] || '';

    if (unit.startsWith('h')) {
      return Math.round(value * 60);
    }
    return Math.round(value);
  }

  // Legacy method stubs for backwards compatibility
  static getBranchVariation(branch) {
    return 0; // No longer using random variations
  }

  static isDomainRelevant(task, projectContext) {
    return true; // Simplified - assume all tasks in project are relevant
  }

  static isContextRelevant(task, context) {
    return false; // Simplified - no complex context matching
  }

  static isLifeChangeContext(context) {
    return false; // Simplified - removed complex life change detection
  }

  static detectLifeChangeType(context) {
    return null; // Simplified
  }

  static isTaskAdaptedForLifeChange(task, changeType) {
    return false; // Simplified
  }
}
