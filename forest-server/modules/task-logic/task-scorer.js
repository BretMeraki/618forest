/**
 * Task Scorer Module
 * Handles scoring and ranking of tasks based on energy, time, context, and domain relevance
 */

import { SCORING, DEFAULT_PATHS } from '../constants.js';

export class TaskScorer {
  /**
   * Calculate score for a task based on multiple factors
   * @param {Object} task - The task to score
   * @param {number} energyLevel - User's current energy level (1-5)
   * @param {number} timeInMinutes - Available time in minutes
   * @param {string} contextFromMemory - Context from previous activities
   * @param {Object} projectContext - Project context including goal and domain
   * @param {Object} fullConfig - Full project configuration with user profile, constraints, habits
   * @param {Object} reasoningAnalysis - Analysis from reasoning engine (optional)
   * @returns {number} Task score
   */
  static calculateTaskScore(task, energyLevel, timeInMinutes, contextFromMemory, projectContext, fullConfig = null, reasoningAnalysis = null) {
    let score = task.priority || 200;

    // CRITICAL: Major life change adaptation gets HIGHEST priority
    if (contextFromMemory && this.isLifeChangeContext(contextFromMemory)) {
      const changeType = this.detectLifeChangeType(contextFromMemory);
      if (this.isTaskAdaptedForLifeChange(task, changeType)) {
        score += SCORING.ADAPTIVE_TASK_BOOST; // Massive boost for adaptive tasks
      }
    }

    // Energy level matching
    const taskDifficulty = task.difficulty || 3;
    const energyMatch = 5 - Math.abs(energyLevel - taskDifficulty);
    score += energyMatch * SCORING.ENERGY_MATCH_WEIGHT;

    // CRITICAL FIX: Better time constraint handling
    const taskDuration = this.parseTimeToMinutes(task.duration || '30 minutes');

    if (timeInMinutes >= taskDuration) {
      // Task fits perfectly within time constraint
      score += SCORING.TIME_FIT_BONUS;
    } else if (timeInMinutes >= taskDuration * 0.8) {
      // Task is slightly longer but could be adapted
      score += SCORING.TIME_ADAPT_BONUS;
    } else if (timeInMinutes >= taskDuration * 0.5) {
      // Task is much longer but could be partially completed
      score += SCORING.TIME_ADAPT_BONUS * -1;
    } else {
      // Task is way too long
      score += SCORING.TIME_TOO_LONG_PENALTY;
    }

    // Domain context relevance
    if (this.isDomainRelevant(task, projectContext)) {
      score += SCORING.DOMAIN_RELEVANCE_BONUS;
    }

    // Context relevance from memory
    if (contextFromMemory && this.isContextRelevant(task, contextFromMemory)) {
      score += SCORING.CONTEXT_RELEVANCE_BONUS;
    }

    // CRITICAL: Momentum building tasks get HIGHEST priority with slight variations for diversity
    if (task.momentumBuilding) {
      const baseBoost = SCORING.MOMENTUM_TASK_BASE_BOOST;
      const branchVariation = this.getBranchVariation(task.branch);
      const randomVariation = Math.random() * 10; // 0-10 points for diversity
      score += baseBoost + branchVariation + randomVariation;
    }

    // Breakthrough potential
    if (task.opportunityType === 'breakthrough_amplification') {
      score += SCORING.BREAKTHROUGH_AMPLIFICATION_BONUS;
    }

    // Recently generated tasks get boost
    if (task.generated) {
      score += SCORING.GENERATED_TASK_BOOST;
    }

    // ===== ENHANCED RICH CONTEXT SCORING =====
    if (fullConfig) {
      // Financial Constraint Alignment
      if (task.isFreeResource && fullConfig.constraints?.financial_constraints?.includes('no budget')) {
        score += 150; // Massively boost free tasks if user has no budget
      }

      if (task.cost === 'free' || task.budget === 'zero' || task.title?.toLowerCase().includes('free')) {
        if (fullConfig.constraints?.financial_constraints?.includes('no budget') ||
            fullConfig.constraints?.financial_constraints?.includes('limited budget')) {
          score += 120; // Major boost for free resources when budget is constrained
        }
      }

      // Habit Alignment
      if (task.branch === 'habit_building' && fullConfig.current_habits?.habit_goals?.includes(task.title)) {
        score += 100; // Boost tasks that align with stated habit goals
      }

      // Time Constraint Alignment
      if (fullConfig.constraints?.time_constraints) {
        const timeConstraints = fullConfig.constraints.time_constraints;

        if (timeConstraints.includes('limited time') && taskDuration <= 15) {
          score += 80; // Boost very short tasks for time-constrained users
        }

        if (timeConstraints.includes('flexible schedule') && taskDuration >= 45) {
          score += 60; // Boost longer tasks for users with flexible schedules
        }
      }

      // Location Constraint Alignment
      if (fullConfig.constraints?.location_constraints) {
        const locationConstraints = fullConfig.constraints.location_constraints;

        if (locationConstraints.includes('home only') &&
            (task.location === 'home' || task.remote === true || task.online === true)) {
          score += 90; // Major boost for home/online tasks when location-constrained
        }

        if (locationConstraints.includes('mobile learner') &&
            (task.mobile === true || task.title?.toLowerCase().includes('mobile'))) {
          score += 70; // Boost mobile-friendly tasks
        }
      }

      // Learning Style Alignment
      if (fullConfig.learningStyle) {
        const style = fullConfig.learningStyle.toLowerCase();

        if (style.includes('visual') &&
            (task.type === 'visual' || task.title?.toLowerCase().includes('visual') ||
             task.title?.toLowerCase().includes('diagram') || task.title?.toLowerCase().includes('chart'))) {
          score += 60;
        }

        if (style.includes('hands-on') &&
            (task.type === 'practical' || task.title?.toLowerCase().includes('practice') ||
             task.title?.toLowerCase().includes('build') || task.title?.toLowerCase().includes('create'))) {
          score += 60;
        }

        if (style.includes('social') &&
            (task.type === 'social' || task.title?.toLowerCase().includes('discuss') ||
             task.title?.toLowerCase().includes('collaborate') || task.title?.toLowerCase().includes('share'))) {
          score += 60;
        }
      }

      // Interest Alignment
      if (fullConfig.specific_interests && Array.isArray(fullConfig.specific_interests)) {
        const taskText = `${task.title} ${task.description}`.toLowerCase();
        for (const interest of fullConfig.specific_interests) {
          if (taskText.includes(interest.toLowerCase())) {
            score += 40; // Boost tasks that match specific interests
          }
        }
      }

      // Current Habits Integration
      if (fullConfig.current_habits?.existing_habits) {
        const taskText = `${task.title} ${task.description}`.toLowerCase();
        for (const habit of fullConfig.current_habits.existing_habits) {
          if (taskText.includes(habit.toLowerCase())) {
            score += 35; // Boost tasks that build on existing habits
          }
        }
      }
    }

    // ===== REASONING ENGINE ANALYSIS INTEGRATION =====
    if (reasoningAnalysis) {
      // Energy Pattern Alignment
      if (reasoningAnalysis.pacingContext?.pacingAnalysis?.status === 'behind' && task.difficulty < 3) {
        score += 80; // Boost easier tasks if user is behind schedule to build momentum
      }

      if (reasoningAnalysis.pacingContext?.pacingAnalysis?.status === 'ahead' && task.difficulty >= 4) {
        score += 70; // Boost challenging tasks if user is ahead of schedule
      }

      // Velocity Pattern Alignment
      const deductions = reasoningAnalysis.deductions || [];
      for (const deduction of deductions) {
        if (deduction.type === 'difficulty_pattern') {
          if (deduction.insight?.includes('too easy') && task.difficulty >= 4) {
            score += 90; // Major boost for harder tasks if current tasks are too easy
          }

          if (deduction.insight?.includes('too challenging') && task.difficulty <= 2) {
            score += 85; // Major boost for easier tasks if current tasks are too hard
          }

          if (deduction.insight?.includes('plateau') && task.difficulty >= 3) {
            score += 75; // Boost challenging tasks to break difficulty plateau
          }
        }

        if (deduction.type === 'energy_pattern') {
          if (deduction.insight?.includes('draining') && taskDuration <= 20) {
            score += 70; // Boost shorter tasks if learning is currently draining
          }

          if (deduction.insight?.includes('energizing') && taskDuration >= 45) {
            score += 65; // Boost longer tasks if learning is energizing
          }
        }

        if (deduction.type === 'breakthrough_pattern') {
          if (deduction.insight?.includes('high breakthrough rate') && task.difficulty >= 3) {
            score += 80; // Boost challenging tasks if user has high breakthrough rate
          }

          if (deduction.evidence?.some(e => e.includes('difficulty')) && task.difficulty >= 3) {
            score += 60; // Boost tasks at breakthrough difficulty level
          }
        }

        if (deduction.type === 'velocity_pattern') {
          if (deduction.insight?.includes('high velocity') && task.priority >= 300) {
            score += 50; // Boost high-priority tasks if user has high velocity
          }

          if (deduction.insight?.includes('slowing down') && task.difficulty <= 2) {
            score += 55; // Boost easier tasks if velocity is slowing
          }
        }
      }

      // Recommendation Alignment
      if (reasoningAnalysis.recommendations) {
        const recText = JSON.stringify(reasoningAnalysis.recommendations).toLowerCase();
        const taskText = `${task.title} ${task.description}`.toLowerCase();

        if (recText.includes('easier') && task.difficulty <= 2) {
          score += 45; // Boost easier tasks if recommendations suggest it
        }

        if (recText.includes('challenging') && task.difficulty >= 4) {
          score += 45; // Boost harder tasks if recommendations suggest it
        }

        if (recText.includes('variety') && task.branch !== projectContext.activePath) {
          score += 40; // Boost tasks from different branches if variety is recommended
        }
      }
    }

    return score;
  }

  /**
   * Get branch-specific variation for task scoring diversity
   * @param {string} branch - Task branch
   * @returns {number} Branch variation score
   */
  static getBranchVariation(branch) {
    // Different branches get slight score variations to encourage diversity
    const branchBoosts = {
      'expert_networking': 15,
      'academic_networking': 19,
      'response_networking': 11,
      'content_amplification': 12,
      'media_relations': 18,
      'networking': 10,
      'journalism': 16,
      'breakthrough_scaling': 14,
      'viral_leverage': 13,
      'thought_leadership': 17
    };

    return branchBoosts[branch] || 5; // Default small boost for unknown branches
  }

  /**
   * Check if task is relevant to the project domain
   * @param {Object} task - Task to check
   * @param {Object} projectContext - Project context
   * @returns {boolean} True if domain relevant
   */
  static isDomainRelevant(task, projectContext) {
    const taskText = (`${task.title} ${task.description}`).toLowerCase();
    const domainText = (`${projectContext.goal} ${projectContext.domain}`).toLowerCase();

    // Extract domain-specific keywords
    const domainKeywords = domainText.split(' ')
      .filter(word => word.length > 3)
      .filter(word => !['research', 'learning', 'study', 'project'].includes(word));

    // Check if task contains domain-specific terminology
    return domainKeywords.some(keyword => taskText.includes(keyword));
  }

  /**
   * Check if task is relevant to the given context
   * @param {Object} task - Task to check
   * @param {string|Object} context - Context to match against
   * @returns {boolean} True if context relevant
   */
  static isContextRelevant(task, context) {
    const taskText = (`${task.title} ${task.description}`).toLowerCase();

    // Gracefully handle non-string context values (objects, arrays, etc.)
    let contextStr;
    if (typeof context === 'string') {
      contextStr = context;
    } else if (context === null || context === undefined) {
      contextStr = '';
    } else {
      try {
        contextStr = JSON.stringify(context);
      } catch {
        contextStr = String(context);
      }
    }

    const contextLower = contextStr.toLowerCase();

    // Simple keyword matching - could be enhanced with NLP
    const keywords = contextLower.split(/\W+/).filter(word => word.length > 3);
    return keywords.some(keyword => taskText.includes(keyword));
  }

  /**
   * Parse time string to minutes
   * @param {string} timeStr - Time string like "30 minutes" or "2 hours"
   * @returns {number} Time in minutes
   */
  static parseTimeToMinutes(timeStr) {
    const matches = timeStr.match(/(\d+)\s*(minute|hour|min|hr)/i);
    if (!matches) { return 30; }

    const value = parseInt(matches[1], 10);
    const unit = matches[2].toLowerCase();

    return unit.startsWith('hour') || unit.startsWith('hr') ? value * 60 : value;
  }

  /**
   * Check if context indicates a major life change
   * @param {string} context - Context to analyze
   * @returns {boolean} True if life change detected
   */
  static isLifeChangeContext(context) {
    if (!context || typeof context !== 'string') { return false; }

    const contextLower = context.toLowerCase();
    const lifeChangeIndicators = [
      'lost savings', 'no money', 'broke', 'financial crisis', 'medical bills', 'zero budget',
      'caring for', 'taking care', 'caregiver', 'sick mother', 'sick father',
      'moved', 'out of town', 'away from home', 'relocated',
      'only 2 hours', 'limited time', 'very little time',
      'health crisis', 'emergency', 'crisis'
    ];

    return lifeChangeIndicators.some(indicator => contextLower.includes(indicator));
  }

  /**
   * Detect the type of life change from context
   * @param {string} context - Context to analyze
   * @returns {string} Type of life change
   */
  static detectLifeChangeType(context) {
    if (!context) { return 'none'; }

    const contextLower = context.toLowerCase();

    if (contextLower.includes('lost savings') || contextLower.includes('zero budget') || contextLower.includes('no money')) {
      return 'financial_crisis';
    }
    if (contextLower.includes('caring for') || contextLower.includes('sick mother') || contextLower.includes('caregiver')) {
      return 'caregiving_mode';
    }
    if (contextLower.includes('out of town') || contextLower.includes('moved') || contextLower.includes('relocated')) {
      return 'location_change';
    }
    if (contextLower.includes('only 2 hours') || contextLower.includes('limited time')) {
      return 'time_constraints';
    }
    if (contextLower.includes('health crisis') || contextLower.includes('emergency')) {
      return 'health_crisis';
    }

    return 'unknown_change';
  }

  /**
   * Check if task is adapted for a specific life change type
   * @param {Object} task - Task to check
   * @param {string} changeType - Type of life change
   * @returns {boolean} True if task is adapted for the change
   */
  static isTaskAdaptedForLifeChange(task, changeType) {
    const taskText = (`${task.title} ${task.description} ${task.branch || ''}`).toLowerCase();

    switch (changeType) {
    case 'financial_crisis':
      return taskText.includes('free') || taskText.includes('zero') || taskText.includes('creative') ||
               task.branch === 'zero_budget_adaptation' || task.branch === 'creative_solutions';

    case 'caregiving_mode':
      return taskText.includes('voice') || taskText.includes('passive') || taskText.includes('document') ||
               task.branch === 'caregiving_compatible' || task.branch === 'passive_learning';

    case 'location_change':
      return taskText.includes('mobile') || taskText.includes('local') || taskText.includes('remote') ||
               task.branch === 'location_independence' || task.branch === 'local_adaptation';

    case 'time_constraints':
      return taskText.includes('micro') || taskText.includes('batch') || taskText.includes('5 minutes') ||
               task.branch === 'time_optimized' || task.branch === 'time_batching';

    case 'health_crisis':
      return taskText.includes('gentle') || taskText.includes('recovery') || taskText.includes('rest') ||
               task.branch === 'recovery_compatible';

    default:
      return task.branch === 'life_adaptation' || task.generated === true;
    }
  }
}