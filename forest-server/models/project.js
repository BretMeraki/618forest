/**
 * Project Model
 * Represents a Forest project with all its metadata and configuration
 */

import { DEFAULT_PATHS, MODEL_DEFAULTS, TASK_CONFIG } from '../modules/constants.js';

export class Project {
  constructor({
    id,
    goal,
    context = '',
    knowledgeLevel = TASK_CONFIG.MIN_DIFFICULTY,
    activePath = DEFAULT_PATHS.GENERAL,
    urgencyLevel = 'medium',
    learningPaths = [],
    lifeStructurePreferences = {},
    constraints = {},
    currentHabits = {},
    existingCredentials = [],
    successMetrics = [],
    specificInterests = [],
    createdAt = null,
    updatedAt = null,
  }) {
    // Validation
    if (!id) {
      throw new Error('Project requires an id');
    }
    if (!goal) {
      throw new Error('Project requires a goal');
    }

    // Core properties
    this.id = id;
    this.goal = goal;
    this.context = context;
    this.knowledgeLevel = this.validateKnowledgeLevel(knowledgeLevel);
    this.activePath = activePath || DEFAULT_PATHS.GENERAL;
    this.urgencyLevel = this.validateUrgencyLevel(urgencyLevel);

    // Learning configuration
    this.learningPaths = this.validateLearningPaths(learningPaths);
    this.specificInterests = Array.isArray(specificInterests) ? specificInterests : [];

    // Life structure and constraints
    this.lifeStructurePreferences = this.validateLifeStructure(lifeStructurePreferences);
    this.constraints = this.validateConstraints(constraints);
    this.currentHabits = this.validateHabits(currentHabits);

    // Background and metrics
    this.existingCredentials = Array.isArray(existingCredentials) ? existingCredentials : [];
    this.successMetrics = Array.isArray(successMetrics) ? successMetrics : [];

    // Metadata
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || new Date().toISOString();
  }

  // Validation methods
  validateKnowledgeLevel(level) {
    const num = Number(level);
    if (isNaN(num) || num < TASK_CONFIG.MIN_DIFFICULTY || num > TASK_CONFIG.MAX_DIFFICULTY) {
      return TASK_CONFIG.MIN_DIFFICULTY;
    }
    return Math.round(num);
  }

  validateUrgencyLevel(urgency) {
    const validLevels = ['low', 'medium', 'high', 'critical'];
    return validLevels.includes(urgency) ? urgency : 'medium';
  }

  validateLearningPaths(paths) {
    if (!Array.isArray(paths)) {
      return [];
    }
    return paths.map(path => ({
      path_name: path.path_name || '',
      priority: ['high', 'medium', 'low'].includes(path.priority) ? path.priority : 'medium',
      interests: Array.isArray(path.interests) ? path.interests : [],
    }));
  }

  validateLifeStructure(preferences) {
    const defaults = {
      wakeTime: '6:00 AM',
      sleepTime: '10:30 PM',
      mealTimes: ['7:00 AM', '12:00 PM', '6:00 PM'],
      focusDuration: '30 minutes',
      breakPreferences: 'Short breaks every hour',
      transitionTime: '5 minutes',
    };

    return {
      wakeTime: preferences.wake_time || preferences.wakeTime || defaults.wakeTime,
      sleepTime: preferences.sleep_time || preferences.sleepTime || defaults.sleepTime,
      mealTimes: preferences.meal_times || preferences.mealTimes || defaults.mealTimes,
      focusDuration:
        preferences.focus_duration || preferences.focusDuration || defaults.focusDuration,
      breakPreferences:
        preferences.break_preferences || preferences.breakPreferences || defaults.breakPreferences,
      transitionTime:
        preferences.transition_time || preferences.transitionTime || defaults.transitionTime,
    };
  }

  validateConstraints(constraints) {
    return {
      timeConstraints: constraints.time_constraints || constraints.timeConstraints || '',
      energyPatterns: constraints.energy_patterns || constraints.energyPatterns || '',
      locationConstraints:
        constraints.location_constraints || constraints.locationConstraints || '',
      financialConstraints:
        constraints.financial_constraints || constraints.financialConstraints || '',
      focusVariability: constraints.focus_variability || constraints.focusVariability || '',
    };
  }

  validateHabits(habits) {
    return {
      goodHabits: Array.isArray(habits.good_habits || habits.goodHabits)
        ? habits.good_habits || habits.goodHabits
        : [],
      badHabits: Array.isArray(habits.bad_habits || habits.badHabits)
        ? habits.bad_habits || habits.badHabits
        : [],
      habitGoals: Array.isArray(habits.habit_goals || habits.habitGoals)
        ? habits.habit_goals || habits.habitGoals
        : [],
    };
  }

  // Utility methods
  getPathByName(pathName) {
    return this.learningPaths.find(path => path.path_name === pathName);
  }

  addLearningPath(pathName, priority = 'medium', interests = []) {
    if (!this.getPathByName(pathName)) {
      this.learningPaths.push({
        path_name: pathName,
        priority,
        interests: Array.isArray(interests) ? interests : [],
      });
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  removeLearningPath(pathName) {
    const index = this.learningPaths.findIndex(path => path.path_name === pathName);
    if (index > -1) {
      this.learningPaths.splice(index, 1);
      // If removing active path, switch to general
      if (this.activePath === pathName) {
        this.activePath = DEFAULT_PATHS.GENERAL;
      }
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  setActivePath(pathName) {
    // Validate that the path exists or is 'general'
    if (pathName === DEFAULT_PATHS.GENERAL || this.getPathByName(pathName)) {
      this.activePath = pathName;
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  updateKnowledgeLevel(newLevel) {
    const oldLevel = this.knowledgeLevel;
    this.knowledgeLevel = this.validateKnowledgeLevel(newLevel);
    this.updatedAt = new Date().toISOString();
    return { oldLevel, newLevel: this.knowledgeLevel };
  }

  addCredential(credential) {
    if (credential && typeof credential === 'object') {
      this.existingCredentials.push({
        subject_area: credential.subject_area || credential.subjectArea || '',
        credential_type: credential.credential_type || credential.credentialType || '',
        level: credential.level || 'beginner',
        relevance_to_goal: credential.relevance_to_goal || credential.relevanceToGoal || '',
      });
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  addSuccessMetric(metric) {
    if (typeof metric === 'string' && metric.trim()) {
      this.successMetrics.push(metric.trim());
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  addInterest(interest) {
    if (typeof interest === 'string' && interest.trim()) {
      if (!this.specificInterests.includes(interest)) {
        this.specificInterests.push(interest.trim());
        this.updatedAt = new Date().toISOString();
      }
    }
    return this;
  }

  updateConstraints(newConstraints) {
    this.constraints = { ...this.constraints, ...this.validateConstraints(newConstraints) };
    this.updatedAt = new Date().toISOString();
    return this;
  }

  updateLifeStructure(newPreferences) {
    this.lifeStructurePreferences = {
      ...this.lifeStructurePreferences,
      ...this.validateLifeStructure(newPreferences),
    };
    this.updatedAt = new Date().toISOString();
    return this;
  }

  // Analysis methods
  getHighPriorityPaths() {
    return this.learningPaths.filter(path => path.priority === 'high');
  }

  getTotalInterests() {
    const pathInterests = this.learningPaths.reduce((acc, path) => acc.concat(path.interests), []);
    return [...new Set([...this.specificInterests, ...pathInterests])];
  }

  getRelevantCredentials(pathName = null) {
    if (!pathName) {
      return this.existingCredentials;
    }
    return this.existingCredentials.filter(
      cred =>
        cred.relevance_to_goal.toLowerCase().includes(pathName.toLowerCase()) ||
        cred.subject_area.toLowerCase().includes(pathName.toLowerCase())
    );
  }

  // Status methods
  isBeginnerLevel() {
    return this.knowledgeLevel < MODEL_DEFAULTS.PROJECT_INTERMEDIATE_THRESHOLD;
  }

  isIntermediateLevel() {
    return (
      this.knowledgeLevel >= MODEL_DEFAULTS.PROJECT_INTERMEDIATE_THRESHOLD &&
      this.knowledgeLevel < MODEL_DEFAULTS.PROJECT_ADVANCED_THRESHOLD
    );
  }

  isAdvancedLevel() {
    return this.knowledgeLevel >= MODEL_DEFAULTS.PROJECT_ADVANCED_THRESHOLD;
  }

  isHighUrgency() {
    return ['high', 'critical'].includes(this.urgencyLevel);
  }

  // Export for persistence
  toJSON() {
    return {
      id: this.id,
      goal: this.goal,
      context: this.context,
      knowledgeLevel: this.knowledgeLevel,
      activePath: this.activePath,
      urgencyLevel: this.urgencyLevel,
      learningPaths: this.learningPaths,
      specificInterests: this.specificInterests,
      lifeStructurePreferences: this.lifeStructurePreferences,
      constraints: this.constraints,
      currentHabits: this.currentHabits,
      existingCredentials: this.existingCredentials,
      successMetrics: this.successMetrics,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  // Create from existing data
  static fromData(data) {
    return new Project(data);
  }

  // Create with auto-generated ID
  static create({ goal, ...options }) {
    const id = `project_${Date.now()}_${Math.random()
      .toString(MODEL_DEFAULTS.RADIX_BASE_36)
      .slice(
        MODEL_DEFAULTS.ID_RANDOM_STRING_START,
        MODEL_DEFAULTS.ID_RANDOM_STRING_START + MODEL_DEFAULTS.ID_RANDOM_STRING_LENGTH
      )}`;
    return new Project({ id, goal, ...options });
  }
}
