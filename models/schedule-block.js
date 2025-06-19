/**
 * Schedule Block Model
 * Represents a single time block in a daily schedule
 */

import { MODEL_DEFAULTS, TASK_CONFIG, TIME_CONVERSION } from '../modules/constants.js';

export class ScheduleBlock {
  constructor({
    id,
    type = 'learning',
    title,
    description = '',
    startTime,
    duration,
    difficulty = TASK_CONFIG.MIN_DIFFICULTY,
    taskId = null,
    branch = 'general',
    priority = MODEL_DEFAULTS.SCHEDULE_DEFAULT_PRIORITY,
    completed = false,
    completedAt = null,
    outcome = null,
    learned = null,
    nextQuestions = null,
    energyAfter = null,
    difficultyRating = null,
    breakthrough = false,
    opportunityContext = null
  }) {
    // Validation
    if (!id) {
      throw new Error('ScheduleBlock requires an id');
    }
    if (!title) {
      throw new Error('ScheduleBlock requires a title');
    }
    if (!startTime) {
      throw new Error('ScheduleBlock requires a startTime');
    }

    // Core properties
    this.id = id;
    this.type = this.validateType(type);
    this.title = title;
    this.description = description;
    this.startTime = this.validateStartTime(startTime);
    this.duration = this.validateDuration(duration);

    // Task characteristics
    this.difficulty = this.validateDifficulty(difficulty);
    this.taskId = taskId;
    this.branch = branch || 'general';
    this.priority = this.validatePriority(priority);

    // State tracking
    this.completed = Boolean(completed);
    this.completedAt = completedAt;

    // Completion data
    this.outcome = outcome;
    this.learned = learned;
    this.nextQuestions = nextQuestions;
    this.energyAfter = energyAfter;
    this.difficultyRating = difficultyRating;
    this.breakthrough = Boolean(breakthrough);
    this.opportunityContext = opportunityContext;

    // Metadata
    this.createdAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
  }

  // Validation methods
  validateType(type) {
    const validTypes = ['learning', 'break', 'habit', 'meeting', 'focus', 'admin'];
    return validTypes.includes(type) ? type : 'learning';
  }

  validateStartTime(startTime) {
    if (typeof startTime === 'string' && startTime.trim()) {
      return startTime.trim();
    }
    if (startTime instanceof Date) {
      return startTime.toISOString();
    }
    throw new Error('startTime must be a valid time string or Date object');
  }

  validateDuration(duration) {
    if (typeof duration === 'number' && duration > 0) {
      return duration;
    }
    if (typeof duration === 'string') {
      const match = duration.match(/(\d+)\s*(?:min|minutes?)?/i);
      if (match) {
        return parseInt(match[1], 10);
      }
    }
    return MODEL_DEFAULTS.SCHEDULE_DEFAULT_DURATION_MINUTES; // Default minutes
  }

  validateDifficulty(difficulty) {
    const diff = Number(difficulty);
    if (isNaN(diff) || diff < TASK_CONFIG.MIN_DIFFICULTY || diff > TASK_CONFIG.MAX_DIFFICULTY) {
      return TASK_CONFIG.MIN_DIFFICULTY;
    }
    return Math.round(diff);
  }

  validatePriority(priority) {
    const prio = Number(priority);
    if (isNaN(prio) || prio < 0) {
      return MODEL_DEFAULTS.SCHEDULE_DEFAULT_PRIORITY;
    }
    return Math.round(prio);
  }

  // Status methods
  markCompleted({
    outcome,
    learned = '',
    nextQuestions = '',
    energyAfter,
    difficultyRating = null,
    breakthrough = false,
    opportunityContext = null,
    completedAt = null
  }) {
    this.completed = true;
    this.completedAt = completedAt || new Date().toISOString();
    this.outcome = outcome;
    this.learned = learned;
    this.nextQuestions = nextQuestions;
    this.energyAfter = energyAfter;
    this.difficultyRating = difficultyRating;
    this.breakthrough = Boolean(breakthrough);
    this.opportunityContext = opportunityContext;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  markIncomplete() {
    this.completed = false;
    this.completedAt = null;
    this.outcome = null;
    this.learned = null;
    this.nextQuestions = null;
    this.energyAfter = null;
    this.difficultyRating = null;
    this.breakthrough = false;
    this.opportunityContext = null;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  updateStartTime(newStartTime) {
    this.startTime = this.validateStartTime(newStartTime);
    this.updatedAt = new Date().toISOString();
    return this;
  }

  updateDuration(newDuration) {
    this.duration = this.validateDuration(newDuration);
    this.updatedAt = new Date().toISOString();
    return this;
  }

  // Utility methods
  getStartTimeAsDate() {
    // Handle various time formats
    if (this.startTime.match(/^\d{1,2}:\d{2}(?:\s?[AP]M)?$/i)) {
      // Time format like "9:00 AM" or "14:30"
      const today = new Date();
      const [time, period] = this.startTime.split(/\s+/);
      const [hours, minutes] = time.split(':').map(Number);

      let hour24 = hours;
      if (period) {
        const twelve = 12;
        if (period.toUpperCase() === 'PM' && hours !== twelve) {
          hour24 += twelve;
        } else if (period.toUpperCase() === 'AM' && hours === twelve) {
          hour24 = 0;
        }
      }

      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour24, minutes);
    }

    // ISO string or other date format
    return new Date(this.startTime);
  }

  getEndTime() {
    const start = this.getStartTimeAsDate();
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + this.duration);
    return end;
  }

  isCurrentlyActive(currentTime = new Date()) {
    const start = this.getStartTimeAsDate();
    const end = this.getEndTime();
    return currentTime >= start && currentTime <= end;
  }

  isOverdue(currentTime = new Date()) {
    if (this.completed) {
      return false;
    }
    return currentTime > this.getEndTime();
  }

  getFormattedTimeRange() {
    const start = this.getStartTimeAsDate();
    const end = this.getEndTime();
    const formatTime = (date) => {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    };
    return `${formatTime(start)} - ${formatTime(end)}`;
  }

  getDurationText() {
    if (this.duration < TIME_CONVERSION.MINUTES_PER_HOUR) {
      return `${this.duration} min`;
    }
    const hours = Math.floor(this.duration / TIME_CONVERSION.MINUTES_PER_HOUR);
    const minutes = this.duration % TIME_CONVERSION.MINUTES_PER_HOUR;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  getStatusIcon() {
    if (this.completed) {
      return this.breakthrough ? '🚀' : '✅';
    }
    if (this.isOverdue()) {
      return '⏰';
    }
    if (this.isCurrentlyActive()) {
      return '▶️';
    }
    return '⏸️';
  }

  // Export for persistence
  toJSON() {
    return {
      id: this.id,
      type: this.type,
      title: this.title,
      description: this.description,
      startTime: this.startTime,
      duration: this.duration,
      difficulty: this.difficulty,
      taskId: this.taskId,
      branch: this.branch,
      priority: this.priority,
      completed: this.completed,
      completedAt: this.completedAt,
      outcome: this.outcome,
      learned: this.learned,
      nextQuestions: this.nextQuestions,
      energyAfter: this.energyAfter,
      difficultyRating: this.difficultyRating,
      breakthrough: this.breakthrough,
      opportunityContext: this.opportunityContext,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  // Create from existing data
  static fromData(data) {
    return new ScheduleBlock(data);
  }

  // Create with auto-generated ID
  static create({ title, startTime, duration, ...options }) {
    const id = `block_${Date.now()}_${Math.random().toString(MODEL_DEFAULTS.RADIX_BASE_36).slice(MODEL_DEFAULTS.ID_RANDOM_STRING_START, MODEL_DEFAULTS.ID_RANDOM_STRING_START + MODEL_DEFAULTS.ID_RANDOM_STRING_LENGTH)}`;
    return new ScheduleBlock({ id, title, startTime, duration, ...options });
  }

  // Create a break block
  static createBreak({ startTime, duration = MODEL_DEFAULTS.SCHEDULE_BREAK_DURATION_MINUTES, title = 'Break' }) {
    return ScheduleBlock.create({
      title,
      startTime,
      duration,
      type: 'break',
      difficulty: TASK_CONFIG.MIN_DIFFICULTY,
      priority: MODEL_DEFAULTS.SCHEDULE_BREAK_PRIORITY
    });
  }

  // Create a habit block
  static createHabit({ title, startTime, duration = MODEL_DEFAULTS.SCHEDULE_HABIT_DURATION_MINUTES, branch = 'habits' }) {
    return ScheduleBlock.create({
      title,
      startTime,
      duration,
      type: 'habit',
      branch,
      difficulty: TASK_CONFIG.MIN_DIFFICULTY,
      priority: MODEL_DEFAULTS.SCHEDULE_HABIT_PRIORITY
    });
  }
}