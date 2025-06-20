/**
 * Task Formatter Module
 * Handles formatting of task responses and user-facing messages
 */

import { TaskScorer } from './task-scorer.js';
import { DEFAULT_PATHS } from '../constants.js';

export class TaskFormatter {
  /**
   * Format a task into a user-friendly response
   * @param {Object} task - Task to format
   * @param {number} energyLevel - User's current energy level
   * @param {string} timeAvailable - Available time string
   * @returns {string} Formatted task response
   */
  static formatTaskResponse(task, energyLevel, timeAvailable) {
    const difficultyStars = '⭐'.repeat(task.difficulty || 1);
    const duration = task.duration || '30 minutes';

    let response = '🎯 **Next Recommended Task**\n\n';
    response += `**${task.title}**\n`;
    response += `${task.description || 'No description available'}\n\n`;
    response += `⏱️ **Duration**: ${duration}\n`;
    response += `${difficultyStars} **Difficulty**: ${task.difficulty || 1}/5\n`;
    response += `🎯 **Branch**: ${task.branch || DEFAULT_PATHS.GENERAL}\n`;

    if (task.learningOutcome) {
      response += `📈 **Learning Outcome**: ${task.learningOutcome}\n`;
    }

    response += `\n⚡ **Energy Match**: ${this.getEnergyMatchText(task.difficulty || 3, energyLevel)}\n`;
    response += `⏰ **Time Match**: ${this.getTimeMatchText(duration, timeAvailable)}\n`;

    response += `\n✅ Use \`complete_block\` with block_id: "${task.id}" when finished`;

    return response;
  }

  /**
   * Get energy level match description
   * @param {number} taskDifficulty - Task difficulty level
   * @param {number} energyLevel - User's energy level
   * @returns {string} Energy match description
   */
  static getEnergyMatchText(taskDifficulty, energyLevel) {
    const diff = Math.abs(taskDifficulty - energyLevel);
    if (diff <= 1) {
      return 'Excellent match';
    }
    if (diff <= 2) {
      return 'Good match';
    }
    return 'Consider adjusting energy or task difficulty';
  }

  /**
   * Get time availability match description
   * @param {string} taskDuration - Task duration string
   * @param {string} timeAvailable - Available time string
   * @returns {string} Time match description
   */
  static getTimeMatchText(taskDuration, timeAvailable) {
    const taskMinutes = TaskScorer.parseTimeToMinutes(taskDuration);
    const availableMinutes = TaskScorer.parseTimeToMinutes(timeAvailable);

    if (taskMinutes <= availableMinutes) {
      return 'Perfect fit ✅';
    } else if (taskMinutes <= availableMinutes * 1.2) {
      return 'Close fit (consider extending slightly)';
    } else if (taskMinutes <= availableMinutes * 1.5) {
      const adaptation = Math.round(availableMinutes * 0.8);
      return `Too long - try for ${adaptation} minutes instead`;
    } else {
      const adaptation = Math.round(availableMinutes * 0.8);
      return `Much too long - do first ${adaptation} minutes only`;
    }
  }

  /**
   * Format strategy evolution response
   * @param {Object} analysis - Strategy analysis data
   * @param {Array} newTasks - Array of newly generated tasks
   * @param {string} feedback - User feedback
   * @returns {string} Formatted strategy evolution response
   */
  static formatStrategyEvolutionResponse(analysis, newTasks, feedback) {
    let response = '🧠 **Strategy Evolution Complete**\n\n';

    response += '📊 **Current Status**:\n';
    response += `• Completed tasks: ${analysis.completedTasks}/${analysis.totalTasks}\n`;
    response += `• Available tasks: ${analysis.availableTasks}\n`;

    if (analysis.stuckIndicators.length > 0) {
      response += `• Detected issues: ${analysis.stuckIndicators.join(', ')}\n`;
    }

    response += `\n🎯 **Evolution Strategy**: ${analysis.recommendedEvolution.replace(/_/g, ' ')}\n`;

    if (newTasks.length > 0) {
      response += `\n✨ **New Tasks Generated** (${newTasks.length}):\n`;
      for (const task of newTasks.slice(0, 3)) {
        response += `• ${task.title} (${task.duration || '30 min'})\n`;
      }

      if (newTasks.length > 3) {
        response += `• ... and ${newTasks.length - 3} more\n`;
      }
    }

    if (feedback) {
      response += `\n💬 **Feedback Processed**: ${analysis.userFeedback.sentiment} sentiment detected\n`;
    }

    response += '\n🚀 **Next Step**: Use `get_next_task` to get your optimal next task';

    return response;
  }

  /**
   * Format a task for display (legacy method for tests)
   * @param {Object} task - Task to format
   * @returns {string} Formatted task display
   */
  static formatTaskForDisplay(task) {
    return this.formatTaskResponse(task, 3, '60 minutes');
  }

  /**
   * Format a list of tasks
   * @param {Array} tasks - Array of tasks to format
   * @param {Object} options - Formatting options
   * @returns {string} Formatted task list
   */
  static formatTaskList(tasks, options = {}) {
    if (!tasks || tasks.length === 0) {
      return 'No tasks available at this time.';
    }

    let response = '';
    
    if (options.groupByBranch) {
      const branches = {};
      for (const task of tasks) {
        const branch = task.branch_name || task.branch || 'General';
        if (!branches[branch]) {
          branches[branch] = [];
        }
        branches[branch].push(task);
      }
      
      for (const [branchName, branchTasks] of Object.entries(branches)) {
        response += `\n**${branchName}**\n`;
        branchTasks.forEach((task, index) => {
          response += `${index + 1}. ${task.title} (${task.duration || '30 min'})\n`;
        });
      }
    } else {
      tasks.forEach((task, index) => {
        response += `${index + 1}. ${task.title} (${task.duration || '30 min'})\n`;
      });
    }

    return response;
  }

  /**
   * Format task progress
   * @param {Object} progress - Progress data
   * @returns {string} Formatted progress display
   */
  static formatTaskProgress(progress) {
    const percentage = Math.round((progress.completed / progress.total) * 100);
    let response = `Progress: ${percentage}% (${progress.completed} of ${progress.total})\n`;
    
    if (percentage === 100) {
      response += '🎉 All tasks completed!\n';
    }
    
    if (progress.branch_breakdown) {
      response += '\nBy branch:\n';
      for (const [branch, data] of Object.entries(progress.branch_breakdown)) {
        const branchPercent = Math.round((data.completed / data.total) * 100);
        response += `• ${branch}: ${branchPercent}% (${data.completed}/${data.total})\n`;
      }
    }
    
    return response;
  }

  /**
   * Format time estimate
   * @param {number|string} duration - Duration in minutes or string
   * @returns {string} Formatted time estimate
   */
  static formatTimeEstimate(duration) {
    if (duration === null || duration === undefined || duration === '') {
      return 'Unknown';
    }
    
    let minutes;
    if (typeof duration === 'string') {
      minutes = TaskScorer.parseTimeToMinutes(duration);
    } else {
      minutes = parseInt(duration, 10);
    }
    
    if (isNaN(minutes) || minutes === 0) {
      return minutes === 0 ? '0 min' : 'Unknown';
    }
    
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours}h`;
      } else {
        return `${hours}h ${remainingMinutes}min`;
      }
    }
  }

  /**
   * Format difficulty level
   * @param {number} difficulty - Difficulty level (1-5)
   * @returns {string} Formatted difficulty display
   */
  static formatDifficultyLevel(difficulty) {
    if (!difficulty || difficulty < 1 || difficulty > 5) {
      return 'Unknown difficulty';
    }
    
    const stars = '⭐'.repeat(difficulty);
    const labels = {
      1: 'Beginner',
      2: 'Easy', 
      3: 'Moderate',
      4: 'Advanced',
      5: 'Expert'
    };
    
    return `${stars} ${labels[difficulty]}`;
  }

  /**
   * Format task summary
   * @param {Object} task - Task to summarize
   * @returns {string} Task summary
   */
  static formatTaskSummary(task) {
    const duration = this.formatTimeEstimate(task.duration);
    let summary = `${task.title} (${duration})`;
    
    if (task.description && task.description.length > 100) {
      summary += ` - ${task.description.substring(0, 100)}...`;
    } else if (task.description) {
      summary += ` - ${task.description}`;
    }
    
    return summary;
  }

  /**
   * Format completed task
   * @param {Object} task - Completed task
   * @returns {string} Formatted completed task display
   */
  static formatCompletedTask(task) {
    let response = `✅ ${task.title}`;
    
    if (task.completed_at) {
      response += ` (completed ${task.completed_at})`;
    }
    
    if (task.completion_notes) {
      response += `\nNotes: ${task.completion_notes}`;
    }
    
    return response;
  }
}
