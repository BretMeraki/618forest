/**
 * Strategy Evolver Module
 * Handles HTA tree evolution and strategy adaptation based on learning events
 * Decoupled from TaskCompletion through event-driven architecture
 */

import { bus } from './utils/event-bus.js';
import { FILE_NAMES, DEFAULT_PATHS, TASK_CONFIG } from './constants.js';

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
      if (!htaData) return;

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
      if (!htaData) return;

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
    if (!htaData) return;

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
      learningOutcome: `Practical application of breakthrough insight`,
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
} 