/**
 * Strategy Evolver Module
 * Handles HTA tree evolution and strategy adaptation based on learning events
 * Decoupled from TaskCompletion through event-driven architecture
 */

import { bus } from './utils/event-bus.js';
import { FILE_NAMES, DEFAULT_PATHS, TASK_CONFIG } from './constants.js';
import { TaskFormatter } from './task-logic/index.js';

export class StrategyEvolver {
  constructor(dataPersistence, projectManagement, eventBus = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.eventBus = eventBus || bus; // Use provided eventBus or default to global bus

    // Register event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Listen for block completion events
    this.eventBus.on('block:completed', this.handleBlockCompletion.bind(this), 'StrategyEvolver');

    // Listen for learning milestone events
    this.eventBus.on('learning:breakthrough', this.handleBreakthrough.bind(this), 'StrategyEvolver');

    // Listen for opportunity detection events
    this.eventBus.on('opportunity:detected', this.handleOpportunityDetection.bind(this), 'StrategyEvolver');

    // Listen for strategy evolution requests
    this.eventBus.on('strategy:evolve_requested', this.handleEvolutionRequest.bind(this), 'StrategyEvolver');

    console.log('🧠 StrategyEvolver event listeners registered');
  }

  /**
   * Handle block completion event and evolve HTA based on learning
   * @param {Object} eventData - Block completion event data
   */
  async handleBlockCompletion({ projectId, pathName, block, _eventMetadata }) {
    try {
      console.log(`🔄 StrategyEvolver processing block completion: ${block.title}`);

      // Only evolve if there's actual learning to process
      if (!block.learned && !block.nextQuestions && !block.breakthrough) {
        console.log('📝 No learning content to process, skipping HTA evolution');
        return;
      }

      await this.evolveHTABasedOnLearning(projectId, pathName, block);

      // Emit follow-up events based on the learning content
      if (block.breakthrough) {
        this.eventBus.emit('learning:breakthrough', {
          projectId,
          pathName,
          block,
          breakthroughContent: block.learned
        }, 'StrategyEvolver');
      }

      if (block.opportunityContext) {
        this.eventBus.emit('opportunity:detected', {
          projectId,
          pathName,
          block,
          opportunities: block.opportunityContext
        }, 'StrategyEvolver');
      }

    } catch (error) {
      console.error('❌ StrategyEvolver failed to handle block completion:', error.message);
      await this.dataPersistence.logError('StrategyEvolver.handleBlockCompletion', error, {
        projectId, pathName, blockTitle: block.title
      });
    }
  }

  /**
   * Handle breakthrough learning events
   * @param {Object} eventData - Breakthrough event data
   */
  async handleBreakthrough({ projectId, pathName, block, breakthroughContent, _eventMetadata }) {
    try {
      console.log(`🎉 StrategyEvolver processing breakthrough: ${block.title}`);

      // Generate breakthrough-specific follow-up tasks
      const htaData = await this.loadPathHTA(projectId, pathName);
      if (!htaData) {return;}

      const breakthroughTasks = this.generateBreakthroughTasks(block, htaData, breakthroughContent);
      if (breakthroughTasks.length > 0) {
        htaData.frontierNodes = (htaData.frontierNodes || []).concat(breakthroughTasks);
        htaData.lastUpdated = new Date().toISOString();
        await this.savePathHTA(projectId, pathName, htaData);

        console.log(`✨ Generated ${breakthroughTasks.length} breakthrough tasks`);
      }

    } catch (error) {
      console.error('❌ StrategyEvolver failed to handle breakthrough:', error.message);
    }
  }

  /**
   * Handle opportunity detection events
   * @param {Object} eventData - Opportunity detection event data
   */
  async handleOpportunityDetection({ projectId, pathName, block, opportunities, _eventMetadata }) {
    try {
      console.log(`🎯 StrategyEvolver processing opportunity detection: ${block.title}`);

      const htaData = await this.loadPathHTA(projectId, pathName);
      if (!htaData) {return;}

      const opportunityTasks = this.generateOpportunityTasks(block, htaData);
      if (opportunityTasks.length > 0) {
        htaData.frontierNodes = (htaData.frontierNodes || []).concat(opportunityTasks);
        htaData.lastUpdated = new Date().toISOString();
        await this.savePathHTA(projectId, pathName, htaData);

        console.log(`🚀 Generated ${opportunityTasks.length} opportunity tasks`);
      }

    } catch (error) {
      console.error('❌ StrategyEvolver failed to handle opportunity detection:', error.message);
    }
  }

  /**
   * Handle strategy evolution requests
   * @param {Object} eventData - Evolution request event data
   */
  async handleEvolutionRequest({ projectId, pathName, feedback, analysis, _eventMetadata }) {
    try {
      console.log(`🔄 StrategyEvolver processing evolution request for project: ${projectId}`);

      // This would integrate with the existing evolve strategy logic
      // For now, emit a completion event
      this.eventBus.emit('strategy:evolution_completed', {
        projectId,
        pathName,
        feedback,
        analysis,
        evolvedAt: new Date().toISOString()
      }, 'StrategyEvolver');

    } catch (error) {
      console.error('❌ StrategyEvolver failed to handle evolution request:', error.message);
    }
  }

  /**
   * Evolve HTA tree based on learning from completed block
   * @param {string} projectId - Project ID
   * @param {string} pathName - Learning path name
   * @param {Object} block - Completed block data
   */
  async evolveHTABasedOnLearning(projectId, pathName, block) {
    const htaData = await this.loadPathHTA(projectId, pathName);
    if (!htaData) {return;}

    // Mark corresponding HTA node as completed
    if (block.taskId) {
      const node = htaData.frontierNodes?.find(n => n.id === block.taskId);
      if (node) {
        node.completed = true;
        node.completedAt = block.completedAt;
        node.actualDifficulty = block.difficultyRating;
        node.actualDuration = block.duration;
      }
    }

    // Generate follow-up tasks based on learning and questions
    if (block.nextQuestions || block.breakthrough) {
      const newTasks = this.generateFollowUpTasks(block, htaData);
      if (newTasks.length > 0) {
        htaData.frontierNodes = (htaData.frontierNodes || []).concat(newTasks);
      }
    }

    // Handle opportunity-driven task generation
    if (block.opportunityContext) {
      const opportunityTasks = this.generateOpportunityTasks(block, htaData);
      if (opportunityTasks.length > 0) {
        htaData.frontierNodes = (htaData.frontierNodes || []).concat(opportunityTasks);
      }
    }

    htaData.lastUpdated = new Date().toISOString();
    await this.savePathHTA(projectId, pathName, htaData);

    // Emit event for successful HTA evolution
    this.eventBus.emit('hta:evolved', {
      projectId,
      pathName,
      block,
      tasksAdded: (block.nextQuestions ? 1 : 0) + (block.opportunityContext ? 1 : 0),
      evolvedAt: new Date().toISOString()
    }, 'StrategyEvolver');
  }

  /**
   * Generate follow-up tasks based on learning outcomes
   * @param {Object} block - Completed block
   * @param {Object} htaData - Current HTA data
   * @returns {Array} Array of new tasks
   */
  generateFollowUpTasks(block, htaData) {
    const newTasks = [];
    let taskId = (htaData.frontierNodes?.length || 0) + TASK_CONFIG.EXPLORE_TASK_BASE;

    // Enhanced momentum building tasks
    const momentumTasks = this.generateMomentumBuildingTasks(block, taskId);
    newTasks.push(...momentumTasks);
    taskId += momentumTasks.length;

    // Generate tasks from next questions
    if (block.nextQuestions) {
      const questions = block.nextQuestions.split('.').filter(q => q.trim().length > 0);

      for (const question of questions.slice(0, 2)) {
        newTasks.push({
          id: `followup_${taskId++}`,
          title: `Explore: ${question.trim()}`,
          description: `Investigation stemming from ${block.title}`,
          branch: block.branch || 'exploration',
          difficulty: Math.max(1, (block.difficultyRating || 3) - 1),
          duration: '20 minutes',
          prerequisites: [block.taskId].filter(Boolean),
          learningOutcome: `Understanding of ${question.trim()}`,
          priority: block.breakthrough ? 250 : 200,
          generated: true,
          sourceBlock: block.id,
          generatedBy: 'StrategyEvolver'
        });
      }
    }

    return newTasks;
  }

  /**
   * Generate momentum building tasks based on learning outcomes
   * @param {Object} block - Completed block
   * @param {number} startTaskId - Starting task ID
   * @returns {Array} Array of momentum building tasks
   */
  generateMomentumBuildingTasks(block, startTaskId) {
    const momentumTasks = [];
    const outcome = (block.outcome || '').toLowerCase();
    let taskId = startTaskId;

    // Parse specific outcomes for momentum building
    const outcomePatterns = [
      {
        pattern: /professor|teacher|instructor|academic/i,
        task: {
          title: 'Follow up with professor contact',
          description: 'Reach out to the professor who showed interest and explore collaboration opportunities',
          branch: 'academic_networking',
          difficulty: 2,
          duration: '25 minutes',
          priority: 400,
          learningOutcome: 'Professional academic connection and mentorship',
          momentumBuilding: true
        }
      },
      {
        pattern: /viral|shares|social media|linkedin|twitter/i,
        task: {
          title: 'Capitalize on viral momentum',
          description: 'Engage with the viral response and create follow-up content to maintain visibility',
          branch: 'content_amplification',
          difficulty: 2,
          duration: '30 minutes',
          priority: 380,
          learningOutcome: 'Sustained social media engagement and reach',
          momentumBuilding: true
        }
      }
    ];

    for (const pattern of outcomePatterns) {
      if (pattern.pattern.test(outcome)) {
        momentumTasks.push({
          id: `momentum_${taskId++}`,
          ...pattern.task,
          prerequisites: [block.taskId].filter(Boolean),
          generated: true,
          sourceBlock: block.id,
          generatedBy: 'StrategyEvolver'
        });
      }
    }

    return momentumTasks;
  }

  /**
   * Generate breakthrough-specific tasks
   * @param {Object} block - Block with breakthrough
   * @param {Object} htaData - Current HTA data
   * @param {string} breakthroughContent - The breakthrough learning content
   * @returns {Array} Array of breakthrough tasks
   */
  generateBreakthroughTasks(block, htaData, breakthroughContent) {
    const breakthroughTasks = [];
    let taskId = (htaData.frontierNodes?.length || 0) + 1000; // Higher ID range for breakthrough tasks

    // Generate tasks to capitalize on the breakthrough
    breakthroughTasks.push({
      id: `breakthrough_${taskId++}`,
      title: `Apply breakthrough: ${breakthroughContent.substring(0, 50)}...`,
      description: `Apply the breakthrough insight from ${block.title} to a new practical scenario`,
      branch: block.branch || 'breakthrough_application',
      difficulty: Math.min(5, (block.difficultyRating || 3) + 1),
      duration: '45 minutes',
      prerequisites: [block.taskId].filter(Boolean),
      learningOutcome: 'Practical application of breakthrough insight',
      priority: 350,
      generated: true,
      sourceBlock: block.id,
      breakthrough: true,
      generatedBy: 'StrategyEvolver'
    });

    return breakthroughTasks;
  }

  /**
   * Generate opportunity-based tasks
   * @param {Object} block - Block with opportunities
   * @param {Object} htaData - Current HTA data
   * @returns {Array} Array of opportunity tasks
   */
  generateOpportunityTasks(block, htaData) {
    const opportunityTasks = [];
    let taskId = (htaData.frontierNodes?.length || 0) + 2000; // Higher ID range for opportunity tasks

    if (block.opportunityContext?.viralPotential) {
      opportunityTasks.push({
        id: `opportunity_${taskId++}`,
        title: 'Leverage viral potential',
        description: `Capitalize on the viral potential identified from ${block.title}`,
        branch: 'viral_leverage',
        difficulty: 3,
        duration: '35 minutes',
        prerequisites: [block.taskId].filter(Boolean),
        learningOutcome: 'Amplified reach and engagement',
        priority: 320,
        generated: true,
        sourceBlock: block.id,
        opportunityType: 'viral_amplification',
        generatedBy: 'StrategyEvolver'
      });
    }

    return opportunityTasks;
  }

  // === DATA ACCESS HELPERS ===

  async loadPathHTA(projectId, pathName) {
    if (pathName === DEFAULT_PATHS.GENERAL) {
      return await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.HTA);
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.HTA);
    }
  }

  async savePathHTA(projectId, pathName, htaData) {
    if (pathName === DEFAULT_PATHS.GENERAL) {
      return await this.dataPersistence.saveProjectData(projectId, FILE_NAMES.HTA, htaData);
    } else {
      return await this.dataPersistence.savePathData(projectId, pathName, FILE_NAMES.HTA, htaData);
    }
  }

  // === HIGH-LEVEL STRATEGY EVOLUTION (moved from TaskIntelligence) ===

  async evolveStrategy(feedback = '') {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);

      if (!config) {
        throw new Error(`Project configuration not found for project '${projectId}' in evolveStrategy. Check if config.json exists and is valid.`);
      }

      const activePath = config.activePath || DEFAULT_PATHS.GENERAL;
      const analysis = await this.analyzeCurrentStrategy(projectId, activePath, feedback);
      const newTasks = await this.generateSmartNextTasks(projectId, activePath, analysis);

      if (newTasks.length > 0) {
        const htaData = await this.loadPathHTA(projectId, activePath) || {};

        if (!htaData.frontierNodes) { htaData.frontierNodes = []; }

        htaData.frontierNodes = htaData.frontierNodes.concat(newTasks);
        htaData.lastUpdated = new Date().toISOString();

        if (!htaData.metadata) {
          htaData.metadata = { created: new Date().toISOString(), version: '1.0' };
        }

        await this.savePathHTA(projectId, activePath, htaData);
      }

      const responseText = TaskFormatter.formatStrategyEvolutionResponse(analysis, newTasks, feedback);

      return {
        content: [{ type: 'text', text: responseText }],
        strategy_analysis: analysis,
        new_tasks: newTasks,
        feedback_processed: feedback || 'none'
      };
    } catch (error) {
      await this.dataPersistence.logError('StrategyEvolver.evolveStrategy', error, { feedback });
      return { content: [{ type: 'text', text: `Error evolving strategy: ${error.message}` }] };
    }
  }

  // === ANALYSIS HELPERS (moved) ===

  async analyzeCurrentStrategy(projectId, pathName, feedback) {
    const htaData = await this.loadPathHTA(projectId, pathName) || {};
    const learningHistory = await this.loadLearningHistory(projectId, pathName) || {};

    const analysis = {
      completedTasks: htaData.frontierNodes?.filter(n => n.completed).length || 0,
      totalTasks: htaData.frontierNodes?.length || 0,
      availableTasks: this.getAvailableTasksCount(htaData),
      stuckIndicators: this.detectStuckIndicators(htaData, learningHistory),
      userFeedback: this.analyzeFeedback(feedback),
      recommendedEvolution: null
    };

    analysis.recommendedEvolution = this.determineEvolutionStrategy(analysis);
    return analysis;
  }

  getAvailableTasksCount(htaData) {
    const nodes = htaData.frontierNodes || [];
    const completedNodeIds = nodes.filter(n => n.completed).map(n => n.id);

    return nodes.filter(node => {
      if (node.completed) { return false; }

      if (node.prerequisites && node.prerequisites.length > 0) {
        return node.prerequisites.every(prereq =>
          completedNodeIds.includes(prereq) ||
          nodes.some(n => n.title === prereq && n.completed)
        );
      }

      return true;
    }).length;
  }

  detectStuckIndicators(htaData, learningHistory) {
    const indicators = [];

    if (this.getAvailableTasksCount(htaData) === 0) {
      indicators.push('no_available_tasks');
    }

    const recentCompletions = learningHistory.completedTopics?.filter(t => {
      const daysDiff = (Date.now() - new Date(t.completedAt)) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }) || [];

    if (recentCompletions.length === 0) {
      indicators.push('no_recent_progress');
    }

    const avgEngagement = recentCompletions.reduce((sum, c) => sum + (c.energyAfter || 3), 0) / Math.max(recentCompletions.length, 1);
    if (avgEngagement < 2.5) {
      indicators.push('low_engagement');
    }

    return indicators;
  }

  analyzeFeedback(feedback) {
    if (!feedback) { return { sentiment: 'neutral', keywords: [], lifeChangeType: 'none' }; }

    const feedbackLower = feedback.toLowerCase();

    const financialCrisis = ['lost savings', 'no money', 'broke', 'financial crisis', 'medical bills', 'zero budget', 'no budget'];
    const locationChange = ['moved', 'out of town', 'away from home', 'different city', 'traveling', 'relocated'];
    const caregivingMode = ['caring for', 'taking care', 'caregiver', 'family emergency', 'sick mother', 'sick father'];
    const timeConstraints = ['only 2 hours', 'limited time', 'very little time', 'no time', 'busy with'];
    const healthIssues = ['sick', 'illness', 'hospital', 'medical', 'health crisis', 'emergency'];

    let lifeChangeType = 'none';
    let severity = 'low';

    if (financialCrisis.some(p => feedbackLower.includes(p))) { lifeChangeType = 'financial_crisis'; severity = 'high'; }
    else if (caregivingMode.some(p => feedbackLower.includes(p))) { lifeChangeType = 'caregiving_mode'; severity = 'high'; }
    else if (locationChange.some(p => feedbackLower.includes(p))) { lifeChangeType = 'location_change'; severity = 'medium'; }
    else if (timeConstraints.some(p => feedbackLower.includes(p))) { lifeChangeType = 'time_constraints'; severity = 'medium'; }
    else if (healthIssues.some(p => feedbackLower.includes(p))) { lifeChangeType = 'health_crisis'; severity = 'high'; }

    const breakthroughWords = ['breakthrough', 'discovery', 'major breakthrough', 'energized', 'advanced challenges', 'ready for', 'discovered'];
    const hasBreakthrough = breakthroughWords.some(w => feedbackLower.includes(w)) || feedbackLower.includes('breakthrough_context:');

    const positiveWords = ['great', 'interesting', 'progress', 'excellent', 'perfect', 'energized', 'proud', 'good', 'working', 'breakthrough'];
    const negativeWords = ['boring', 'stuck', 'difficult', 'difficulty', 'frustrated', 'overwhelmed', 'bad', 'problem', 'crisis', 'emergency'];

    const positiveCount = positiveWords.filter(w => feedbackLower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => feedbackLower.includes(w)).length;

    let sentiment = 'neutral';
    if (lifeChangeType !== 'none') { sentiment = 'major_change'; }
    else if (hasBreakthrough) { sentiment = 'breakthrough'; }
    else if (positiveCount > negativeCount) { sentiment = 'positive'; }
    else if (negativeCount > positiveCount) { sentiment = 'negative'; }

    const keywords = feedback.split(/\s+/).filter(word => word.length > 3);

    return { sentiment, keywords, original: feedback, lifeChangeType, severity, requiresAdaptation: lifeChangeType !== 'none', hasBreakthrough };
  }

  determineEvolutionStrategy(analysis) {
    if (analysis.userFeedback.hasBreakthrough || analysis.userFeedback.sentiment === 'breakthrough') {
      return 'escalate_after_breakthrough';
    }

    if (analysis.userFeedback.requiresAdaptation) {
      switch (analysis.userFeedback.lifeChangeType) {
      case 'financial_crisis': return 'adapt_to_zero_budget';
      case 'caregiving_mode': return 'adapt_to_caregiving';
      case 'location_change': return 'adapt_to_new_location';
      case 'time_constraints': return 'adapt_to_time_limits';
      case 'health_crisis': return 'adapt_to_health_crisis';
      default: return 'major_life_adaptation';
      }
    }

    if (analysis.stuckIndicators.includes('no_available_tasks')) { return 'generate_new_tasks'; }
    if (analysis.stuckIndicators.includes('low_engagement')) { return 'increase_variety_and_interest'; }
    if (analysis.userFeedback.sentiment === 'negative') { return 'address_user_concerns'; }
    if (analysis.availableTasks < 3) { return 'expand_task_frontier'; }

    return 'optimize_existing_sequence';
  }

  async generateSmartNextTasks(projectId, pathName, analysis) {
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const htaData = await this.loadPathHTA(projectId, pathName) || {};

    const newTasks = [];
    const taskId = (htaData.frontierNodes?.length || 0) + TASK_CONFIG.ADAPTIVE_TASK_BASE;

    const completedTasks = htaData.frontierNodes?.filter(n => n.completed) || [];
    const hasRecentBreakthroughs = completedTasks.slice(-2).some(t => t.breakthrough === true);
    const existingTaskTitles = new Set((htaData.frontierNodes || []).map(t => t.title));

    const strategy = analysis.recommendedEvolution;

    if (hasRecentBreakthroughs || strategy === 'escalate_after_breakthrough') {
      newTasks.push(...this.generateBreakthroughEscalationTasks(config, completedTasks, taskId, existingTaskTitles));
    } else {
      switch (strategy) {
      case 'adapt_to_zero_budget': newTasks.push(...this.generateZeroBudgetTasks(config, taskId, existingTaskTitles)); break;
      case 'adapt_to_caregiving': newTasks.push(...this.generateCaregivingTasks(config, taskId, existingTaskTitles)); break;
      case 'adapt_to_new_location': newTasks.push(...this.generateLocationAdaptedTasks(config, taskId, existingTaskTitles)); break;
      case 'adapt_to_time_limits': newTasks.push(...this.generateTimeLimitedTasks(config, taskId, existingTaskTitles)); break;
      case 'adapt_to_health_crisis': newTasks.push(...this.generateHealthCrisisTasks(config, taskId, existingTaskTitles)); break;
      case 'major_life_adaptation': newTasks.push(...this.generateGenericAdaptationTasks(config, taskId, existingTaskTitles)); break;
      case 'generate_new_tasks': newTasks.push(...this.generateExplorationTasks(config, taskId, existingTaskTitles)); break;
      case 'increase_variety_and_interest': newTasks.push(...this.generateInterestBasedTasks(config, taskId, existingTaskTitles)); break;
      case 'address_user_concerns': newTasks.push(...this.generateConcernAddressingTasks(analysis.userFeedback, taskId, existingTaskTitles)); break;
      case 'expand_task_frontier': newTasks.push(...this.generateProgressiveTasks(htaData, taskId, existingTaskTitles)); break;
      default: newTasks.push(...this.generateBalancedTasks(config, htaData, taskId, existingTaskTitles));
      }
    }

    return newTasks.slice(0, 5);
  }

  // === TASK GENERATORS === (trimmed for brevity but identical logic moved from TaskIntelligence)

  generateExplorationTasks(config, startId, existingTaskTitles = new Set()) {
    const goal = config.goal || 'learning';
    const tasks = [
      { id: `explore_${startId}`, title: `Explore: What's Next in ${goal}`, description: 'Open exploration of next steps and possibilities', difficulty: 1, duration: '15 minutes', branch: 'exploration', priority: 250, generated: true, learningOutcome: 'Clarity on next learning directions' },
      { id: `sample_${startId + 1}`, title: 'Sample: Try Something Different', description: 'Experiment with a new approach or technique', difficulty: 2, duration: '25 minutes', branch: 'experimentation', priority: 240, generated: true, learningOutcome: 'Experience with alternative approaches' }
    ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateInterestBasedTasks(config, startId, existingTaskTitles = new Set()) {
    const interests = config.specific_interests || [];
    const tasks = [];
    for (let i = 0; i < Math.min(3, interests.length); i++) {
      const interest = interests[i];
      tasks.push({ id: `interest_${startId + i}`, title: `Focus: ${interest}`, description: `Dedicated work on your specific interest: ${interest}`, difficulty: 2, duration: '30 minutes', branch: 'interest_focus', priority: 230, generated: true, learningOutcome: 'Deeper knowledge in personal interest' });
    }
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateConcernAddressingTasks(feedback, startId, existingTaskTitles = new Set()) {
    const tasks = [ {
      id: `concern_${startId}`, title: 'Address: Specific user concern', description: `Investigate and resolve the issue: ${feedback.original.substring(0, 60)}...`, difficulty: 2, duration: '30 minutes', branch: 'concern_resolution', priority: 260, generated: true, learningOutcome: 'Resolution strategies for user concern' }
    ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateProgressiveTasks(htaData, startId, existingTaskTitles = new Set()) {
    const tasks = [];
    const nextNodes = (htaData.frontierNodes || []).filter(n => !n.completed).slice(0, 3);
    let id = startId;
    for (const node of nextNodes) {
      tasks.push({ id: `progress_${id++}`, title: `Deepen: ${node.title}`, description: 'Advance to the next level of this topic', difficulty: (node.difficulty || 3) + 1, duration: '40 minutes', branch: node.branch || 'progression', priority: 220, generated: true, learningOutcome: 'Advanced understanding' });
    }
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateBalancedTasks(config, htaData, startId, existingTaskTitles = new Set()) {
    const tasks = [];
    tasks.push(...this.generateExplorationTasks(config, startId, existingTaskTitles));
    tasks.push(...this.generateProgressiveTasks(htaData, startId + tasks.length, existingTaskTitles));
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateZeroBudgetTasks(config, startId, existingTaskTitles = new Set()) {
    const goal = config.goal || 'learning';
    const tasks = [
      { id: `zero_${startId}`, title: 'Zero-budget research sprint', description: `Use free online resources to explore ${goal} deeper`, difficulty: 1, duration: '30 minutes', branch: 'zero_budget_adaptation', priority: 300, generated: true, learningOutcome: 'Cost-free resource compilation' },
      { id: `creative_${startId + 1}`, title: 'Creative reuse brainstorm', description: 'Ideate creative uses of existing materials and tools to advance learning without spending', difficulty: 1, duration: '20 minutes', branch: 'creative_solutions', priority: 290, generated: true, learningOutcome: 'List of creative zero-budget tactics' }
    ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateBreakthroughEscalationTasks(config, completedTasks, startId, existingTaskTitles = new Set()) {
    const escalatedTasks = [
      { id: `escalate_${startId}`, title: 'Advanced: Build on breakthrough discovery', description: 'Take your recent breakthrough to the next level...', difficulty: 3, duration: '45 minutes', branch: 'breakthrough_scaling', priority: 500, generated: true, learningOutcome: 'Advanced expertise building on breakthrough insights' },
      { id: `connect_${startId + 1}`, title: 'Connect with experts in breakthrough area', description: 'Reach out to professionals for advanced guidance', difficulty: 3, duration: '30 minutes', branch: 'expert_networking', priority: 480, generated: true, learningOutcome: 'Professional connections and mentorship' },
      { id: `document_${startId + 2}`, title: 'Document and share breakthrough insights', description: 'Create content about your discovery to help others', difficulty: 2, duration: '35 minutes', branch: 'thought_leadership', priority: 470, generated: true, learningOutcome: 'Thought leadership and breakthrough amplification' }
    ];
    return escalatedTasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateCaregivingTasks(config, startId, existingTaskTitles = new Set()) {
    const tasks = [
      { id: `caregiver_${startId}`, title: 'Voice memo learning while caregiving', description: 'Record ideas during quiet caregiving moments', difficulty: 1, duration: '5 minutes', branch: 'caregiving_compatible', priority: 400, generated: true, learningOutcome: 'Maintained momentum during care' },
      { id: `passive_${startId + 1}`, title: 'Passive learning during care', description: 'Listen to educational content while providing care', difficulty: 1, duration: '30 minutes', branch: 'passive_learning', priority: 390, generated: true, learningOutcome: 'Knowledge absorption during care duties' }
    ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateLocationAdaptedTasks(config, startId, existingTaskTitles = new Set()) {
    const tasks = [
      { id: `mobile_${startId}`, title: 'Optimize mobile-only workflow', description: 'Set up mobile workflow', difficulty: 2, duration: '30 minutes', branch: 'location_independence', priority: 400, generated: true, learningOutcome: 'Location-independent workflow' },
      { id: `local_${startId + 1}`, title: 'Discover local resources', description: 'Research learning resources in new location', difficulty: 1, duration: '25 minutes', branch: 'local_adaptation', priority: 390, generated: true, learningOutcome: 'Local opportunity map' }
    ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateTimeLimitedTasks(config, startId, existingTaskTitles = new Set()) {
    const tasks = [
      { id: `micro_${startId}`, title: 'Micro-learning session', description: 'High-impact 5-10 minute learning burst', difficulty: 1, duration: '5 minutes', branch: 'time_optimized', priority: 400, generated: true, learningOutcome: 'Efficient knowledge absorption' },
      { id: `batch_${startId + 1}`, title: 'Batch focused work session', description: 'Intensive focused work maximizing limited time', difficulty: 2, duration: '45 minutes', branch: 'time_batching', priority: 390, generated: true, learningOutcome: 'High-efficiency focused output' }
    ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateHealthCrisisTasks(config, startId, existingTaskTitles = new Set()) {
    const tasks = [ { id: `rest_${startId}`, title: 'Gentle learning while recovering', description: 'Light, low-energy learning activities', difficulty: 1, duration: '15 minutes', branch: 'recovery_compatible', priority: 400, generated: true, learningOutcome: 'Maintained progress during recovery' } ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  generateGenericAdaptationTasks(config, startId, existingTaskTitles = new Set()) {
    const tasks = [ { id: `adapt_${startId}`, title: 'Adaptation strategy planning', description: 'Plan how to adapt goals to new circumstances', difficulty: 2, duration: '30 minutes', branch: 'life_adaptation', priority: 400, generated: true, learningOutcome: 'Realistic adaptation plan' } ];
    return tasks.filter(t => !existingTaskTitles.has(t.title));
  }

  // === LEARNING HISTORY HELPER ===
  async loadLearningHistory(projectId, pathName) {
    if (pathName === DEFAULT_PATHS.GENERAL) {
      return await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.LEARNING_HISTORY);
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.LEARNING_HISTORY);
    }
  }
}