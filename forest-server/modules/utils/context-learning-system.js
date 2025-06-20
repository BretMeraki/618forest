/**
 * Context-Aware Learning System Module
 * Learns from user patterns and adapts system behavior
 */

import { TASK_CONFIG, SCORING, DEFAULTS } from '../constants.js';
import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'ContextLearningSystem' });

export class ContextLearningSystem {
  constructor(dataPersistence, memorySync) {
    this.dataPersistence = dataPersistence;
    this.memorySync = memorySync;
    
    // Learning data structures
    this.userPatterns = {
      taskPreferences: new Map(),
      timePreferences: new Map(),
      difficultyPreferences: new Map(),
      contextualPatterns: new Map(),
      successPatterns: new Map(),
      failurePatterns: new Map()
    };
    
    // Learning metrics
    this.learningMetrics = {
      totalObservations: 0,
      patternsIdentified: 0,
      adaptationsApplied: 0,
      accuracyScore: 0,
      confidenceLevel: 0
    };
    
    // Pattern recognition settings
    this.patternSettings = {
      minObservations: 5,
      confidenceThreshold: 0.7,
      adaptationThreshold: 0.8,
      maxPatterns: 1000,
      learningRate: 0.1
    };
    
    // Context categories
    this.contextCategories = {
      temporal: ['time_of_day', 'day_of_week', 'season'],
      environmental: ['energy_level', 'focus_state', 'interruptions'],
      task_related: ['task_type', 'difficulty', 'duration', 'priority'],
      behavioral: ['completion_rate', 'engagement_level', 'feedback_sentiment'],
      domain_specific: ['project_type', 'learning_style', 'expertise_level']
    };
    
    // Adaptation strategies
    this.adaptationStrategies = {
      task_selection: this.adaptTaskSelection.bind(this),
      difficulty_adjustment: this.adaptDifficultyLevel.bind(this),
      timing_optimization: this.adaptTimingRecommendations.bind(this),
      resource_allocation: this.adaptResourceAllocation.bind(this),
      personalization: this.adaptPersonalization.bind(this)
    };
    
    // Initialize learning system
    this.initializeLearningSystem();
    
    logger.info('ContextLearningSystem initialized', {
      patternSettings: this.patternSettings,
      contextCategories: Object.keys(this.contextCategories)
    });
  }

  /**
   * Initialize the learning system
   */
  async initializeLearningSystem() {
    try {
      // Load existing patterns from persistence
      await this.loadExistingPatterns();
      
      // Start pattern analysis
      this.startPatternAnalysis();
      
      logger.info('Learning system initialized successfully');
    } catch (error) {
      logger.error('Error initializing learning system', { error: error.message });
    }
  }

  /**
   * Record user interaction for learning
   */
  async recordInteraction(interaction) {
    try {
      const enhancedInteraction = {
        ...interaction,
        timestamp: Date.now(),
        context: await this.extractContext(interaction),
        outcome: this.evaluateOutcome(interaction)
      };
      
      // Store interaction
      await this.storeInteraction(enhancedInteraction);
      
      // Update patterns
      await this.updatePatterns(enhancedInteraction);
      
      // Check for new insights
      await this.analyzeForNewInsights(enhancedInteraction);
      
      this.learningMetrics.totalObservations++;
      
      logger.debug('Interaction recorded', {
        type: interaction.type,
        outcome: enhancedInteraction.outcome,
        contextKeys: Object.keys(enhancedInteraction.context)
      });
      
      return {
        success: true,
        interactionId: enhancedInteraction.id,
        patternsUpdated: true
      };
      
    } catch (error) {
      logger.error('Error recording interaction', { error: error.message });
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Extract context from interaction
   */
  async extractContext(interaction) {
    const context = {};
    
    // Temporal context
    const now = new Date();
    context.time_of_day = this.getTimeOfDayCategory(now.getHours());
    context.day_of_week = now.getDay();
    context.season = this.getSeasonFromDate(now);
    
    // Environmental context
    context.energy_level = interaction.energyLevel || 3;
    context.focus_state = interaction.focusState || 'normal';
    context.interruptions = interaction.interruptions || 0;
    
    // Task-related context
    if (interaction.task) {
      context.task_type = interaction.task.type || 'general';
      context.difficulty = interaction.task.difficulty || 3;
      context.duration = this.parseTimeToMinutes(interaction.task.duration || '30 minutes');
      context.priority = interaction.task.priority || 200;
    }
    
    // Behavioral context
    context.completion_rate = interaction.completionRate || 0;
    context.engagement_level = interaction.engagementLevel || 'medium';
    context.feedback_sentiment = interaction.feedbackSentiment || 'neutral';
    
    // Domain-specific context
    context.project_type = interaction.projectType || 'general';
    context.learning_style = interaction.learningStyle || 'adaptive';
    context.expertise_level = interaction.expertiseLevel || 'intermediate';
    
    return context;
  }

  /**
   * Evaluate interaction outcome
   */
  evaluateOutcome(interaction) {
    let score = 0;
    let factors = 0;
    
    // Completion rate
    if (interaction.completionRate !== undefined) {
      score += interaction.completionRate;
      factors++;
    }
    
    // User satisfaction
    if (interaction.satisfaction !== undefined) {
      score += interaction.satisfaction / 5; // Normalize to 0-1
      factors++;
    }
    
    // Engagement level
    if (interaction.engagementLevel) {
      const engagementScore = {
        'low': 0.2,
        'medium': 0.6,
        'high': 1.0
      }[interaction.engagementLevel] || 0.5;
      score += engagementScore;
      factors++;
    }
    
    // Time efficiency
    if (interaction.estimatedTime && interaction.actualTime) {
      const efficiency = Math.min(1, interaction.estimatedTime / interaction.actualTime);
      score += efficiency;
      factors++;
    }
    
    return factors > 0 ? score / factors : 0.5;
  }

  /**
   * Store interaction for future analysis
   */
  async storeInteraction(interaction) {
    const interactionId = `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    interaction.id = interactionId;
    
    // Store in memory for immediate access
    if (!this.interactions) {
      this.interactions = [];
    }
    
    this.interactions.push(interaction);
    
    // Keep only recent interactions in memory
    if (this.interactions.length > 1000) {
      this.interactions = this.interactions.slice(-1000);
    }
    
    // Persist to storage
    try {
      await this.dataPersistence.saveData('learning_interactions', this.interactions);
    } catch (error) {
      logger.warn('Failed to persist interactions', { error: error.message });
    }
  }

  /**
   * Update patterns based on new interaction
   */
  async updatePatterns(interaction) {
    const context = interaction.context;
    const outcome = interaction.outcome;
    
    // Update task preferences
    if (context.task_type) {
      this.updatePatternMap(this.userPatterns.taskPreferences, context.task_type, outcome);
    }
    
    // Update time preferences
    const timeKey = `${context.time_of_day}_${context.day_of_week}`;
    this.updatePatternMap(this.userPatterns.timePreferences, timeKey, outcome);
    
    // Update difficulty preferences
    if (context.difficulty) {
      this.updatePatternMap(this.userPatterns.difficultyPreferences, context.difficulty.toString(), outcome);
    }
    
    // Update contextual patterns
    for (const [key, value] of Object.entries(context)) {
      const contextKey = `${key}:${value}`;
      this.updatePatternMap(this.userPatterns.contextualPatterns, contextKey, outcome);
    }
    
    // Update success/failure patterns
    if (outcome >= 0.7) {
      this.updateSuccessPattern(context);
    } else if (outcome <= 0.3) {
      this.updateFailurePattern(context);
    }
  }

  /**
   * Update a pattern map with new data
   */
  updatePatternMap(patternMap, key, outcome) {
    if (!patternMap.has(key)) {
      patternMap.set(key, {
        count: 0,
        totalOutcome: 0,
        averageOutcome: 0,
        confidence: 0,
        lastUpdated: Date.now()
      });
    }
    
    const pattern = patternMap.get(key);
    pattern.count++;
    pattern.totalOutcome += outcome;
    pattern.averageOutcome = pattern.totalOutcome / pattern.count;
    pattern.confidence = Math.min(1, pattern.count / this.patternSettings.minObservations);
    pattern.lastUpdated = Date.now();
    
    // Apply learning rate for gradual adaptation
    if (pattern.count > 1) {
      const learningRate = this.patternSettings.learningRate;
      pattern.averageOutcome = (1 - learningRate) * pattern.averageOutcome + learningRate * outcome;
    }
  }

  /**
   * Update success pattern
   */
  updateSuccessPattern(context) {
    const successKey = this.generateContextKey(context);
    this.updatePatternMap(this.userPatterns.successPatterns, successKey, 1.0);
  }

  /**
   * Update failure pattern
   */
  updateFailurePattern(context) {
    const failureKey = this.generateContextKey(context);
    this.updatePatternMap(this.userPatterns.failurePatterns, failureKey, 0.0);
  }

  /**
   * Generate context key for pattern matching
   */
  generateContextKey(context) {
    const keyParts = [];
    
    // Include most relevant context elements
    const relevantKeys = ['task_type', 'difficulty', 'time_of_day', 'energy_level', 'focus_state'];
    
    for (const key of relevantKeys) {
      if (context[key] !== undefined) {
        keyParts.push(`${key}:${context[key]}`);
      }
    }
    
    return keyParts.join('|');
  }

  /**
   * Analyze for new insights
   */
  async analyzeForNewInsights(interaction) {
    try {
      // Check for emerging patterns
      const newPatterns = await this.identifyEmergingPatterns();
      
      // Update learning metrics
      if (newPatterns.length > 0) {
        this.learningMetrics.patternsIdentified += newPatterns.length;
        logger.info('New patterns identified', { count: newPatterns.length });
      }
      
      // Calculate accuracy
      this.updateAccuracyScore();
      
      // Trigger adaptations if needed
      await this.triggerAdaptations();
      
    } catch (error) {
      logger.error('Error analyzing for insights', { error: error.message });
    }
  }

  /**
   * Identify emerging patterns
   */
  async identifyEmergingPatterns() {
    const newPatterns = [];
    
    // Analyze each pattern category
    for (const [category, patternMap] of Object.entries(this.userPatterns)) {
      for (const [key, pattern] of patternMap.entries()) {
        if (pattern.confidence >= this.patternSettings.confidenceThreshold &&
            pattern.count >= this.patternSettings.minObservations) {
          
          // Check if this is a new insight
          if (!pattern.analyzed) {
            newPatterns.push({
              category: category,
              key: key,
              pattern: pattern,
              insight: this.generateInsight(category, key, pattern)
            });
            pattern.analyzed = true;
          }
        }
      }
    }
    
    return newPatterns;
  }

  /**
   * Generate insight from pattern
   */
  generateInsight(category, key, pattern) {
    const outcome = pattern.averageOutcome;
    const confidence = pattern.confidence;
    
    let insight = '';
    
    if (outcome >= 0.8) {
      insight = `High success rate (${(outcome * 100).toFixed(1)}%) for ${key} in ${category}`;
    } else if (outcome <= 0.3) {
      insight = `Low success rate (${(outcome * 100).toFixed(1)}%) for ${key} in ${category}`;
    } else {
      insight = `Moderate success rate (${(outcome * 100).toFixed(1)}%) for ${key} in ${category}`;
    }
    
    return {
      description: insight,
      confidence: confidence,
      recommendation: this.generateRecommendation(category, key, outcome)
    };
  }

  /**
   * Generate recommendation based on pattern
   */
  generateRecommendation(category, key, outcome) {
    if (outcome >= 0.8) {
      return `Continue leveraging ${key} - it shows high success rates`;
    } else if (outcome <= 0.3) {
      return `Consider avoiding or modifying ${key} - it shows low success rates`;
    } else {
      return `Monitor ${key} for optimization opportunities`;
    }
  }

  /**
   * Update accuracy score
   */
  updateAccuracyScore() {
    if (this.interactions && this.interactions.length > 0) {
      const recentInteractions = this.interactions.slice(-100); // Last 100 interactions
      const totalOutcome = recentInteractions.reduce((sum, interaction) => sum + interaction.outcome, 0);
      this.learningMetrics.accuracyScore = totalOutcome / recentInteractions.length;
    }
  }

  /**
   * Trigger adaptations based on learned patterns
   */
  async triggerAdaptations() {
    for (const [strategy, adaptFunction] of Object.entries(this.adaptationStrategies)) {
      try {
        const adaptationResult = await adaptFunction();
        if (adaptationResult.applied) {
          this.learningMetrics.adaptationsApplied++;
          logger.info('Adaptation applied', { strategy, result: adaptationResult });
        }
      } catch (error) {
        logger.error('Error applying adaptation', { strategy, error: error.message });
      }
    }
  }

  /**
   * Adapt task selection based on learned preferences
   */
  async adaptTaskSelection() {
    const taskPreferences = this.userPatterns.taskPreferences;
    const adaptations = [];
    
    for (const [taskType, pattern] of taskPreferences.entries()) {
      if (pattern.confidence >= this.patternSettings.adaptationThreshold) {
        if (pattern.averageOutcome >= 0.8) {
          adaptations.push({
            type: 'boost_task_type',
            taskType: taskType,
            boost: 0.2
          });
        } else if (pattern.averageOutcome <= 0.3) {
          adaptations.push({
            type: 'reduce_task_type',
            taskType: taskType,
            reduction: 0.2
          });
        }
      }
    }
    
    return {
      applied: adaptations.length > 0,
      adaptations: adaptations
    };
  }

  /**
   * Adapt difficulty level recommendations
   */
  async adaptDifficultyLevel() {
    const difficultyPreferences = this.userPatterns.difficultyPreferences;
    let optimalDifficulty = 3; // Default
    let maxOutcome = 0;
    
    for (const [difficulty, pattern] of difficultyPreferences.entries()) {
      if (pattern.confidence >= this.patternSettings.adaptationThreshold &&
          pattern.averageOutcome > maxOutcome) {
        maxOutcome = pattern.averageOutcome;
        optimalDifficulty = parseInt(difficulty);
      }
    }
    
    return {
      applied: optimalDifficulty !== 3,
      optimalDifficulty: optimalDifficulty,
      confidence: maxOutcome
    };
  }

  /**
   * Adapt timing recommendations
   */
  async adaptTimingRecommendations() {
    const timePreferences = this.userPatterns.timePreferences;
    const recommendations = [];
    
    for (const [timeKey, pattern] of timePreferences.entries()) {
      if (pattern.confidence >= this.patternSettings.adaptationThreshold) {
        const [timeOfDay, dayOfWeek] = timeKey.split('_');
        
        if (pattern.averageOutcome >= 0.8) {
          recommendations.push({
            type: 'optimal_time',
            timeOfDay: timeOfDay,
            dayOfWeek: parseInt(dayOfWeek),
            score: pattern.averageOutcome
          });
        }
      }
    }
    
    return {
      applied: recommendations.length > 0,
      recommendations: recommendations
    };
  }

  /**
   * Adapt resource allocation
   */
  async adaptResourceAllocation() {
    // Analyze resource usage patterns
    const resourcePatterns = new Map();
    
    if (this.interactions) {
      for (const interaction of this.interactions) {
        if (interaction.resourceUsage) {
          const key = `${interaction.context.task_type}_${interaction.context.difficulty}`;
          if (!resourcePatterns.has(key)) {
            resourcePatterns.set(key, {
              totalUsage: 0,
              count: 0,
              averageUsage: 0
            });
          }
          
          const pattern = resourcePatterns.get(key);
          pattern.totalUsage += interaction.resourceUsage;
          pattern.count++;
          pattern.averageUsage = pattern.totalUsage / pattern.count;
        }
      }
    }
    
    return {
      applied: resourcePatterns.size > 0,
      patterns: Object.fromEntries(resourcePatterns)
    };
  }

  /**
   * Adapt personalization settings
   */
  async adaptPersonalization() {
    const personalizations = [];
    
    // Analyze success patterns for personalization
    for (const [contextKey, pattern] of this.userPatterns.successPatterns.entries()) {
      if (pattern.confidence >= this.patternSettings.adaptationThreshold &&
          pattern.averageOutcome >= 0.8) {
        
        personalizations.push({
          type: 'preference',
          context: contextKey,
          strength: pattern.averageOutcome,
          confidence: pattern.confidence
        });
      }
    }
    
    return {
      applied: personalizations.length > 0,
      personalizations: personalizations
    };
  }

  /**
   * Get learning recommendations for a given context
   */
  async getRecommendations(context) {
    const recommendations = [];
    
    try {
      // Check task type preferences
      const taskType = context.task_type;
      if (taskType && this.userPatterns.taskPreferences.has(taskType)) {
        const pattern = this.userPatterns.taskPreferences.get(taskType);
        if (pattern.confidence >= this.patternSettings.confidenceThreshold) {
          recommendations.push({
            type: 'task_preference',
            confidence: pattern.confidence,
            score: pattern.averageOutcome,
            suggestion: pattern.averageOutcome >= 0.7 ? 'recommended' : 'not_recommended'
          });
        }
      }
      
      // Check timing preferences
      const timeKey = `${context.time_of_day}_${context.day_of_week}`;
      if (this.userPatterns.timePreferences.has(timeKey)) {
        const pattern = this.userPatterns.timePreferences.get(timeKey);
        if (pattern.confidence >= this.patternSettings.confidenceThreshold) {
          recommendations.push({
            type: 'timing',
            confidence: pattern.confidence,
            score: pattern.averageOutcome,
            suggestion: pattern.averageOutcome >= 0.7 ? 'optimal_time' : 'suboptimal_time'
          });
        }
      }
      
      // Check contextual patterns
      const contextKey = this.generateContextKey(context);
      if (this.userPatterns.successPatterns.has(contextKey)) {
        const pattern = this.userPatterns.successPatterns.get(contextKey);
        if (pattern.confidence >= this.patternSettings.confidenceThreshold) {
          recommendations.push({
            type: 'contextual',
            confidence: pattern.confidence,
            score: pattern.averageOutcome,
            suggestion: 'similar_context_successful'
          });
        }
      }
      
      return {
        success: true,
        recommendations: recommendations,
        confidence: this.learningMetrics.confidenceLevel
      };
      
    } catch (error) {
      logger.error('Error getting recommendations', { error: error.message });
      return {
        success: false,
        error: error.message,
        recommendations: []
      };
    }
  }

  /**
   * Get learning statistics
   */
  getLearningStats() {
    const patternCounts = {};
    for (const [category, patternMap] of Object.entries(this.userPatterns)) {
      patternCounts[category] = patternMap.size;
    }
    
    return {
      learningMetrics: { ...this.learningMetrics },
      patternCounts: patternCounts,
      patternSettings: { ...this.patternSettings },
      totalInteractions: this.interactions ? this.interactions.length : 0,
      confidenceLevel: this.calculateOverallConfidence(),
      timestamp: Date.now()
    };
  }

  /**
   * Calculate overall confidence level
   */
  calculateOverallConfidence() {
    let totalConfidence = 0;
    let patternCount = 0;
    
    for (const patternMap of Object.values(this.userPatterns)) {
      for (const pattern of patternMap.values()) {
        totalConfidence += pattern.confidence;
        patternCount++;
      }
    }
    
    return patternCount > 0 ? totalConfidence / patternCount : 0;
  }

  /**
   * Load existing patterns from storage
   */
  async loadExistingPatterns() {
    try {
      const savedInteractions = await this.dataPersistence.loadData('learning_interactions');
      if (savedInteractions) {
        this.interactions = savedInteractions;
        
        // Rebuild patterns from saved interactions
        for (const interaction of this.interactions) {
          await this.updatePatterns(interaction);
        }
        
        logger.info('Loaded existing patterns', { 
          interactions: this.interactions.length,
          patterns: this.getUserPatterns().length
        });
      }
    } catch (error) {
      logger.warn('Could not load existing patterns', { error: error.message });
    }
  }

  /**
   * Start pattern analysis
   */
  startPatternAnalysis() {
    // Run pattern analysis every 5 minutes
    this.analysisTimer = setInterval(async () => {
      await this.performPatternAnalysis();
    }, 5 * 60 * 1000);
    
    logger.info('Pattern analysis started');
  }

  /**
   * Perform periodic pattern analysis
   */
  async performPatternAnalysis() {
    try {
      // Clean up old patterns
      this.cleanupOldPatterns();
      
      // Update confidence levels
      this.updateConfidenceLevels();
      
      // Trigger adaptations
      await this.triggerAdaptations();
      
    } catch (error) {
      logger.error('Error in pattern analysis', { error: error.message });
    }
  }

  /**
   * Clean up old patterns
   */
  cleanupOldPatterns() {
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    const now = Date.now();
    
    for (const patternMap of Object.values(this.userPatterns)) {
      for (const [key, pattern] of patternMap.entries()) {
        if (now - pattern.lastUpdated > maxAge) {
          patternMap.delete(key);
        }
      }
    }
  }

  /**
   * Update confidence levels
   */
  updateConfidenceLevels() {
    this.learningMetrics.confidenceLevel = this.calculateOverallConfidence();
  }

  /**
   * Get time of day category
   */
  getTimeOfDayCategory(hour) {
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 21) return 'evening';
    return 'night';
  }

  /**
   * Get season from date
   */
  getSeasonFromDate(date) {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Parse time string to minutes
   */
  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return TASK_CONFIG.DEFAULT_DURATION;
    }
    
    const match = timeStr.match(/(\d+)\s*(minute|minutes|min|hour|hours|hr|h)/i);
    if (!match) {
      return TASK_CONFIG.DEFAULT_DURATION;
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    return unit.startsWith('h') ? value * 60 : value;
  }

  /**
   * Get user patterns summary
   */
  getUserPatterns() {
    const patterns = [];
    
    for (const [category, patternMap] of Object.entries(this.userPatterns)) {
      for (const [key, pattern] of patternMap.entries()) {
        if (pattern.confidence >= this.patternSettings.confidenceThreshold) {
          patterns.push({
            category: category,
            key: key,
            confidence: pattern.confidence,
            averageOutcome: pattern.averageOutcome,
            count: pattern.count
          });
        }
      }
    }
    
    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Stop pattern analysis
   */
  stopPatternAnalysis() {
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
      logger.info('Pattern analysis stopped');
    }
  }

  /**
   * Cleanup and destroy the learning system
   */
  destroy() {
    this.stopPatternAnalysis();
    
    // Clear all data structures
    for (const patternMap of Object.values(this.userPatterns)) {
      patternMap.clear();
    }
    
    logger.info('ContextLearningSystem destroyed');
  }
}
