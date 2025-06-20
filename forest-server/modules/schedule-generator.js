/**
 * Schedule Generator Module
 * Handles daily schedule generation and planning
 */

import { parseTimeWithContext } from './utils/time-helpers.js';
import { v4 as uuidv4 } from 'uuid';
import { getForestLogger } from './winston-logger.js';

const logger = getForestLogger({ module: 'ScheduleGenerator' });

export class ScheduleGenerator {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  async generateDailySchedule(
    dateStr = null,
    energyLevel = 3,
    availableHours = null,
    focusType = 'mixed',
    context = 'User requested schedule'
  ) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      const targetDate = dateStr || new Date().toISOString().split('T')[0];
      const schedule = await this.generateComprehensiveSchedule(
        config,
        projectId,
        targetDate,
        energyLevel,
        availableHours,
        focusType,
        context
      );

      // Save the schedule
      await this.dataPersistence.saveProjectData(projectId, `day_${targetDate}.json`, schedule);

      const scheduleText = this.formatScheduleForDisplay(schedule);

      return {
        content: [
          {
            type: 'text',
            text:
              `📅 **Daily Schedule Generated - ${targetDate}**\n\n${scheduleText}\n\n` +
              `🎯 **Focus**: ${focusType}\n` +
              `⚡ **Energy Level**: ${energyLevel}/5\n` +
              `📋 **Total Blocks**: ${schedule.blocks?.length || 0}\n\n` +
              '✅ Ready to start your structured day!',
          },
        ],
        daily_schedule: schedule,
        date: targetDate,
      };
    } catch (error) {
      await this.dataPersistence.logError('generateDailySchedule', error, {
        dateStr,
        energyLevel,
        focusType,
      });
      return {
        content: [
          {
            type: 'text',
            text: `Error generating schedule: ${error.message}`,
          },
        ],
      };
    }
  }

  async generateComprehensiveSchedule(
    config,
    projectId,
    date,
    energyLevel,
    availableHours,
    focusType,
    context
  ) {
    const preferences = config.life_structure_preferences || {};
    const constraints = config.constraints || {};

    // Parse time preferences
    const wakeTime = parseTimeWithContext(preferences.wake_time || '7:00 AM', 'wake');
    const sleepTime = parseTimeWithContext(preferences.sleep_time || '10:00 PM', 'sleep');
    const mealTimes = this.parseMealTimes(
      preferences.meal_times || ['8:00 AM', '12:00 PM', '6:00 PM']
    );

    // Get available learning tasks
    const htaData = await this.loadPathHTA(projectId, config.activePath || 'general');
    const readyTasks = this.getReadyTasks(htaData);

    // Generate time blocks
    const blocks = this.createTimeBlocks(
      wakeTime,
      sleepTime,
      mealTimes,
      readyTasks,
      energyLevel,
      focusType,
      preferences,
      constraints,
      availableHours
    );

    return {
      date,
      projectId,
      activePath: config.activePath || 'general',
      energyLevel,
      focusType,
      context,
      preferences,
      blocks,
      generated: new Date().toISOString(),
    };
  }

  async loadPathHTA(projectId, pathName) {
    if (pathName === 'general') {
      return (await this.dataPersistence.loadProjectData(projectId, 'hta.json')) || {};
    } else {
      return (await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json')) || {};
    }
  }

  getReadyTasks(htaData) {
    const nodes = htaData.frontierNodes || [];
    const completedNodeIds = nodes.filter(n => n.completed).map(n => n.id);

    return nodes
      .filter(node => {
        if (node.completed) {
          return false;
        }

        if (node.prerequisites && node.prerequisites.length > 0) {
          return node.prerequisites.every(
            prereq =>
              completedNodeIds.includes(prereq) ||
              nodes.some(n => n.title === prereq && n.completed)
          );
        }

        return true;
      })
      .sort((a, b) => (b.priority || 200) - (a.priority || 200));
  }

  createTimeBlocks(
    wakeTime,
    sleepTime,
    mealTimes,
    readyTasks,
    energyLevel,
    focusType,
    preferences,
    constraints,
    availableHours
  ) {
    const blocks = [];
    let currentTime = wakeTime;
    const endTime = sleepTime;
    let blockId = 1;

    // Parse available hours if provided
    const priorityHours = availableHours
      ? availableHours.split(',').map(h => parseInt(h.trim(), 10))
      : [];

    // Create blocks from wake to sleep
    while (currentTime < endTime) {
      const hour = Math.floor(currentTime / 60);
      const isAvailableHour = priorityHours.length === 0 || priorityHours.includes(hour);
      const isMealTime = this.isMealTime(currentTime, mealTimes);

      if (isMealTime) {
        // Add meal block
        const mealType = this.getMealType(currentTime, mealTimes);
        blocks.push({
          id: `meal_${blockId++}`,
          type: 'meal',
          title: mealType,
          startTime: this.formatTime(currentTime),
          duration: 45, // 45 minutes for meals
          completed: false,
          priority: 'high',
        });
        currentTime += 45;
      } else if (isAvailableHour && (readyTasks.length > 0 || focusType === 'learning')) {
        // Add learning block (either with real tasks or exploration)
        const task = this.selectTaskForTimeSlot(readyTasks, currentTime, energyLevel, focusType);
        const duration = this.calculateTaskDuration(task, preferences, energyLevel);

        blocks.push({
          id: `task_${blockId++}`,
          type: 'learning',
          title: task.title,
          description: task.description,
          startTime: this.formatTime(currentTime),
          duration,
          difficulty: task.difficulty,
          taskId: task.id,
          branch: task.branch,
          completed: false,
          priority: task.priority || 200,
        });

        // Remove task from available list to avoid duplication (only if it was a real task)
        if (task.id !== 'explore_general') {
          const taskIndex = readyTasks.indexOf(task);
          if (taskIndex > -1) {
            readyTasks.splice(taskIndex, 1);
          }
        }

        currentTime += duration;

        // Add break after learning blocks
        if (currentTime < endTime - 30) {
          blocks.push({
            id: `break_${blockId++}`,
            type: 'break',
            title: 'Break & Reflection',
            startTime: this.formatTime(currentTime),
            duration: this.getBreakDuration(preferences),
            completed: false,
            priority: 'medium',
          });
          currentTime += this.getBreakDuration(preferences);
        }
      } else {
        // Add habit/routine block for non-learning time, but advance by larger increments
        const habitBlock = this.generateHabitBlock(currentTime, constraints, preferences);
        blocks.push({
          id: `habit_${blockId++}`,
          type: 'habit',
          title: habitBlock.title,
          startTime: this.formatTime(currentTime),
          duration: habitBlock.duration,
          completed: false,
          priority: 'low',
        });
        currentTime += habitBlock.duration;
      }

      // Safety check to prevent infinite loops
      if (blocks.length > 50) {
        break;
      }
    }

    return blocks;
  }

  selectTaskForTimeSlot(readyTasks, currentTime, energyLevel, focusType) {
    if (readyTasks.length === 0) {
      // Generate exploration tasks based on time and energy
      const hour = Math.floor(currentTime / 60);
      const explorationTasks = [
        {
          title: 'Explore: Industry Research',
          description: 'Research latest trends and opportunities',
          difficulty: 2,
        },
        {
          title: 'Explore: Skill Practice',
          description: 'Practice core skills with new challenges',
          difficulty: 3,
        },
        {
          title: 'Explore: Network Building',
          description: 'Connect with professionals and communities',
          difficulty: 2,
        },
        {
          title: 'Explore: Portfolio Development',
          description: 'Create or improve portfolio pieces',
          difficulty: 3,
        },
        {
          title: 'Explore: Learning Resources',
          description: 'Discover new courses, books, or tutorials',
          difficulty: 1,
        },
        {
          title: 'Review & Planning',
          description: 'Review progress and plan next steps',
          difficulty: 1,
        },
      ];

      // Select based on energy and time
      let selectedTask;
      if (energyLevel >= 4 && hour >= 9 && hour <= 16) {
        selectedTask = explorationTasks[Math.floor(Math.random() * 4)]; // Higher difficulty options
      } else {
        selectedTask = explorationTasks[4 + Math.floor(Math.random() * 2)]; // Lower difficulty options
      }

      return {
        id: 'explore_general',
        title: selectedTask.title,
        description: selectedTask.description,
        difficulty: selectedTask.difficulty,
        duration: energyLevel >= 4 ? 45 : 30, // This is already a number
      };
    }

    // Filter tasks based on energy level and time of day
    const hour = Math.floor(currentTime / 60);
    const isHighEnergyTime = hour >= 9 && hour <= 11; // Morning high energy

    let suitableTasks = readyTasks.filter(task => {
      const taskDifficulty = task.difficulty || 1;

      if (energyLevel >= 4 && isHighEnergyTime) {
        return taskDifficulty >= 2; // High energy can handle harder tasks
      } else if (energyLevel <= 2) {
        return taskDifficulty <= 2; // Low energy needs easier tasks
      } else {
        return taskDifficulty <= 3; // Medium energy moderate tasks
      }
    });

    if (suitableTasks.length === 0) {
      suitableTasks = readyTasks; // Fallback to any available task
    }

    // Return highest priority suitable task
    return suitableTasks[0];
  }

  calculateTaskDuration(task, preferences, energyLevel) {
    const baseDuration =
      typeof task.duration === 'number'
        ? task.duration
        : this.parseDuration(task.duration || '30 minutes');
    const focusDuration = preferences.focus_duration || 'flexible';

    // Adjust based on focus preference and energy
    if (focusDuration.includes('25')) {
      return 25;
    } // Pomodoro
    if (focusDuration.includes('1 hour')) {
      return 60;
    }
    if (focusDuration.includes('2 hour')) {
      return Math.min(120, baseDuration * 2);
    }

    // Adjust based on energy level
    const energyMultiplier = energyLevel >= 4 ? 1.5 : energyLevel <= 2 ? 0.7 : 1.0;

    return Math.max(15, Math.min(120, Math.round(baseDuration * energyMultiplier)));
  }

  parseTime(timeStr) {
    if (!timeStr) {
      return 420;
    } // Default 7:00 AM in minutes

    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    let totalMinutes = hours * 60 + (minutes || 0);

    if (period?.toUpperCase() === 'PM' && hours !== 12) {
      totalMinutes += 12 * 60;
    } else if (period?.toUpperCase() === 'AM' && hours === 12) {
      totalMinutes = minutes || 0;
    }

    return totalMinutes;
  }

  formatTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;

    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  }

  parseMealTimes(mealTimes) {
    return mealTimes.map(time => parseTimeWithContext(time, 'meal'));
  }

  isMealTime(currentTime, mealTimes) {
    return mealTimes.some(
      mealTime => Math.abs(currentTime - mealTime) <= 15 // Within 15 minutes of meal time
    );
  }

  getMealType(currentTime, mealTimes) {
    const hour = Math.floor(currentTime / 60);

    if (hour <= 10) {
      return 'Breakfast';
    }
    if (hour <= 14) {
      return 'Lunch';
    }
    if (hour <= 16) {
      return 'Snack';
    }
    return 'Dinner';
  }

  getBreakDuration(preferences) {
    const breakPref = preferences.break_preferences || 'every hour';

    if (breakPref.includes('15')) {
      return 15;
    }
    if (breakPref.includes('10')) {
      return 10;
    }
    if (breakPref.includes('5')) {
      return 5;
    }

    return 15; // Default 15 minute break
  }

  generateHabitBlock(currentTime, constraints, preferences) {
    const hour = Math.floor(currentTime / 60);

    // Morning habits (6-9 AM)
    if (hour <= 9) {
      return { title: 'Morning Routine', duration: 30 };
    }

    // Late morning buffer (9-10 AM)
    if (hour <= 10) {
      return { title: 'Planning & Organization', duration: 30 };
    }

    // Midday check-in (12-1 PM)
    if (hour >= 12 && hour <= 13) {
      return { title: 'Midday Review', duration: 20 };
    }

    // Afternoon productivity (1-4 PM)
    if (hour >= 13 && hour <= 16) {
      return { title: 'Deep Work Session', duration: 45 };
    }

    // Late afternoon (4-6 PM)
    if (hour >= 16 && hour <= 18) {
      return { title: 'Administrative Tasks', duration: 30 };
    }

    // Evening habits (7+ PM)
    if (hour >= 19) {
      return { title: 'Evening Wind-down', duration: 45 };
    }

    // Default fallback (should rarely hit)
    return { title: 'Flexible Time', duration: 30 };
  }

  parseDuration(durationStr) {
    if (typeof durationStr === 'number') {
      return durationStr;
    }
    if (!durationStr || typeof durationStr !== 'string') {
      logger.debug('parseDuration received non-string', { type: typeof durationStr, value: durationStr });
      return 30;
    }

    try {
      const matches = durationStr.match(/(\d+)\s*(minute|hour)/i);
      if (!matches) {
        return 30;
      } // Default 30 minutes

      const value = parseInt(matches[1], 10);
      const unit = matches[2].toLowerCase();

      return unit.startsWith('hour') ? value * 60 : value;
    } catch (error) {
      logger.warn('parseDuration error', { type: typeof durationStr, value: durationStr, error: error.message });
      return 30;
    }
  }

  formatScheduleForDisplay(schedule) {
    const blocks = schedule.blocks || [];
    let display = '';

    for (const block of blocks) {
      const icon = this.getBlockIcon(block.type);
      const duration = `${block.duration}min`;
      display += `${icon} **${block.startTime}** - ${block.title} (${duration})\n`;
    }

    return display;
  }

  getBlockIcon(blockType) {
    const icons = {
      learning: '📚',
      meal: '🍽️',
      break: '☕',
      habit: '🔄',
      exercise: '💪',
      work: '💼',
    };

    return icons[blockType] || '📋';
  }
}
