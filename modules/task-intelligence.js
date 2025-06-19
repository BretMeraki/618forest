/**
 * Task Intelligence Module
 * Orchestrates task selection, scoring, and formatting through specialized modules
 */

import { WebContext } from './web-context.js';
import { FILE_NAMES, DEFAULT_PATHS, TASK_CONFIG, SCORING } from './constants.js';
import { TaskScorer, TaskSelector, TaskFormatter } from './task-logic/index.js';

// @ts-nocheck
export class TaskIntelligence {
  constructor(dataPersistence, projectManagement, llmInterface) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.webContext = new WebContext(dataPersistence, llmInterface);
  }

  async getNextTask(contextFromMemory = '', energyLevel = 3, timeAvailable = '30 minutes') {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);

      if (!config) {
        throw new Error(`Project configuration not found for project '${projectId}' in getNextTask. Ensure project exists and config.json is valid.`);
      }

      // Extract project context
      const projectContext = {
        goal: config.goal,
        domain: config.domain,
        learningStyle: config.learningStyle,
        activePath: config.activePath || DEFAULT_PATHS.GENERAL
      };

      const htaData = await this.loadPathHTA(projectId, projectContext.activePath);

      // CRITICAL FIX: Check for breakthrough context even with existing tasks
      const hasBreakthroughContext = contextFromMemory &&
        (contextFromMemory.toLowerCase().includes('breakthrough') ||
         contextFromMemory.toLowerCase().includes('discovery') ||
         contextFromMemory.toLowerCase().includes('major') ||
         contextFromMemory.toLowerCase().includes('energized') ||
         contextFromMemory.toLowerCase().includes('advanced challenges'));

      if (!htaData || !Array.isArray(htaData.frontierNodes) || htaData.frontierNodes.length === 0) {
        // CRITICAL FIX: If no tasks found but we have context indicating life changes or breakthroughs,
        // automatically evolve strategy to generate adaptive tasks
        if (contextFromMemory && (TaskScorer.isLifeChangeContext(contextFromMemory) || hasBreakthroughContext)) {
          // Auto-evolve strategy for life changes or breakthroughs
          await this.evolveStrategy(hasBreakthroughContext ? `BREAKTHROUGH_CONTEXT: ${contextFromMemory}` : contextFromMemory);

          // Reload HTA data after evolution
          const updatedHtaData = await this.loadPathHTA(projectId, projectContext.activePath);
          if (updatedHtaData && Array.isArray(updatedHtaData.frontierNodes) && updatedHtaData.frontierNodes.length > 0) {
            // Use TaskSelector to get optimal task with updated data
            const selectedTask = TaskSelector.selectOptimalTask(updatedHtaData, energyLevel, timeAvailable, contextFromMemory, projectContext);
            if (selectedTask) {
              const extSummary = await this.webContext.refreshIfNeeded(projectContext.goal, selectedTask.title || '');
              const taskResponse = TaskFormatter.formatTaskResponse(selectedTask, energyLevel, timeAvailable) +
                (extSummary ? `\n\n🌐 External context used:\n${extSummary}` : '');
              return {
                content: [{
                  type: 'text',
                  text: taskResponse
                }],
                selected_task: selectedTask,
                energy_level: energyLevel,
                time_available: timeAvailable,
                context_used: 'yes',
                project_context: projectContext,
                auto_evolved: true
              };
            }
          }
        }

        return {
          content: [{
            type: 'text',
            text: 'ℹ️ Roadmap is in place but no actionable tasks were found. Use `generate_hta_tasks` to populate tasks from the roadmap, or run `evolve_strategy` to let the system suggest next steps.'
          }]
        };
      } else if (hasBreakthroughContext) {
        // CRITICAL FIX: If we have breakthrough context AND existing tasks, evolve strategy to generate escalated tasks
        await this.evolveStrategy(`BREAKTHROUGH_CONTEXT: ${contextFromMemory}`);

        // Reload and get the new escalated task
        const updatedHtaData = await this.loadPathHTA(projectId, projectContext.activePath);
        if (updatedHtaData && Array.isArray(updatedHtaData.frontierNodes) && updatedHtaData.frontierNodes.length > 0) {
          const selectedTask = TaskSelector.selectOptimalTask(updatedHtaData, energyLevel, timeAvailable, contextFromMemory, projectContext);
          if (selectedTask) {
            const extSummary2 = await this.webContext.refreshIfNeeded(projectContext.goal, selectedTask.title || '');
            const taskResponse = TaskFormatter.formatTaskResponse(selectedTask, energyLevel, timeAvailable) +
              (extSummary2 ? `\n\n🌐 External context used:\n${extSummary2}` : '');
            return {
              content: [{
                type: 'text',
                text: taskResponse
              }],
              selected_task: selectedTask,
              energy_level: energyLevel,
              time_available: timeAvailable,
              context_used: 'yes',
              project_context: projectContext,
              auto_evolved: true,
              breakthrough_escalation: true
            };
          }
        }
      }

      const selectedTask = TaskSelector.selectOptimalTask(htaData, energyLevel, timeAvailable, contextFromMemory, projectContext);

      if (!selectedTask) {
        return {
          content: [{
            type: 'text',
            text: '🎯 No more tasks available in current sequence.\n\n' +
                 '💡 **Next Steps**:\n' +
                 '• Use `evolve_strategy` to generate new tasks\n' +
                 '• Use `build_hta_tree` to rebuild learning path\n' +
                 '• Use `generate_daily_schedule` for comprehensive planning'
          }]
        };
      }

      const extSummary = await this.webContext.refreshIfNeeded(projectContext.goal, selectedTask.title || '');
      const taskResponse = TaskFormatter.formatTaskResponse(selectedTask, energyLevel, timeAvailable) +
        (extSummary ? `\n\n🌐 External context used:\n${extSummary}` : '');

      return {
        content: [{
          type: 'text',
          text: taskResponse
        }],
        selected_task: selectedTask,
        energy_level: energyLevel,
        time_available: timeAvailable,
        context_used: contextFromMemory ? 'yes' : 'no',
        project_context: projectContext
      };
    } catch (error) {
      await this.dataPersistence.logError('getNextTask', error, { contextFromMemory, energyLevel, timeAvailable });
      return {
        content: [{
          type: 'text',
          text: `Error getting next task: ${error.message}`
        }]
      };
    }
  }

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

      // Update HTA tree with new tasks
      if (newTasks.length > 0) {
        const htaData = await this.loadPathHTA(projectId, activePath) || {};

        // Ensure proper data structure initialization
        if (!htaData.frontierNodes) {
          htaData.frontierNodes = [];
        }

        // Add new tasks
        htaData.frontierNodes = htaData.frontierNodes.concat(newTasks);
        htaData.lastUpdated = new Date().toISOString();

        // CRITICAL: Ensure the HTA structure is properly initialized
        if (!htaData.metadata) {
          htaData.metadata = {
            created: new Date().toISOString(),
            version: '1.0'
          };
        }

        await this.savePathHTA(projectId, activePath, htaData);
      }

      const responseText = TaskFormatter.formatStrategyEvolutionResponse(analysis, newTasks, feedback);

      return {
        content: [{
          type: 'text',
          text: responseText
        }],
        strategy_analysis: analysis,
        new_tasks: newTasks,
        feedback_processed: feedback || 'none'
      };
    } catch (error) {
      await this.dataPersistence.logError('evolveStrategy', error, { feedback });
      return {
        content: [{
          type: 'text',
          text: `Error evolving strategy: ${error.message}`
        }]
      };
    }
  }

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

    // Determine evolution strategy
    analysis.recommendedEvolution = this.determineEvolutionStrategy(analysis);

    return analysis;
  }

  getAvailableTasksCount(htaData) {
    const nodes = htaData.frontierNodes || [];
    const completedNodeIds = nodes.filter(n => n.completed).map(n => n.id);

    return nodes.filter(node => {
      if (node.completed) {return false;}

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

    // No available tasks
    if (this.getAvailableTasksCount(htaData) === 0) {
      indicators.push('no_available_tasks');
    }

    // No recent completions
    const recentCompletions = learningHistory.completedTopics?.filter(t => {
      const daysDiff = (Date.now() - new Date(t.completedAt)) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    }) || [];

    if (recentCompletions.length === 0) {
      indicators.push('no_recent_progress');
    }

    // Low engagement
    const avgEngagement = recentCompletions.reduce((sum, c) => sum + (c.energyAfter || 3), 0) / Math.max(recentCompletions.length, 1);
    if (avgEngagement < 2.5) {
      indicators.push('low_engagement');
    }

    return indicators;
  }

  analyzeFeedback(feedback) {
    if (!feedback) {return { sentiment: 'neutral', keywords: [], lifeChangeType: 'none' };}

    const feedbackLower = feedback.toLowerCase();

    // MAJOR LIFE CHANGE DETECTION
    const financialCrisis = ['lost savings', 'no money', 'broke', 'financial crisis', 'medical bills', 'zero budget', 'no budget'];
    const locationChange = ['moved', 'out of town', 'away from home', 'different city', 'traveling', 'relocated'];
    const caregivingMode = ['caring for', 'taking care', 'caregiver', 'family emergency', 'sick mother', 'sick father'];
    const timeConstraints = ['only 2 hours', 'limited time', 'very little time', 'no time', 'busy with'];
    const healthIssues = ['sick', 'illness', 'hospital', 'medical', 'health crisis', 'emergency'];

    let lifeChangeType = 'none';
    let severity = 'low';

    if (financialCrisis.some(phrase => feedbackLower.includes(phrase))) {
      lifeChangeType = 'financial_crisis';
      severity = 'high';
    } else if (caregivingMode.some(phrase => feedbackLower.includes(phrase))) {
      lifeChangeType = 'caregiving_mode';
      severity = 'high';
    } else if (locationChange.some(phrase => feedbackLower.includes(phrase))) {
      lifeChangeType = 'location_change';
      severity = 'medium';
    } else if (timeConstraints.some(phrase => feedbackLower.includes(phrase))) {
      lifeChangeType = 'time_constraints';
      severity = 'medium';
    } else if (healthIssues.some(phrase => feedbackLower.includes(phrase))) {
      lifeChangeType = 'health_crisis';
      severity = 'high';
    }

    // BREAKTHROUGH DETECTION
    const breakthroughWords = ['breakthrough', 'discovery', 'major breakthrough', 'energized', 'advanced challenges', 'ready for', 'discovered'];
    const hasBreakthrough = breakthroughWords.some(word => feedbackLower.includes(word)) || feedbackLower.includes('breakthrough_context:');

    // SENTIMENT ANALYSIS (enhanced)
    const positiveWords = ['great', 'interesting', 'progress', 'excellent', 'perfect', 'energized', 'proud', 'good', 'working', 'breakthrough'];
    const negativeWords = ['boring', 'stuck', 'difficult', 'difficulty', 'frustrated', 'overwhelmed', 'bad', 'problem', 'crisis', 'emergency'];

    const positiveCount = positiveWords.filter(w => feedbackLower.includes(w)).length;
    const negativeCount = negativeWords.filter(w => feedbackLower.includes(w)).length;

    let sentiment = 'neutral';
    if (lifeChangeType !== 'none') {
      sentiment = 'major_change'; // Special sentiment for life changes
    } else if (hasBreakthrough) {
      sentiment = 'breakthrough'; // Special sentiment for breakthroughs
    } else if (positiveCount > negativeCount) {
      sentiment = 'positive';
    } else if (negativeCount > positiveCount) {
      sentiment = 'negative';
    }

    const keywords = feedback.split(/\s+/).filter(word => word.length > 3);

    return {
      sentiment,
      keywords,
      original: feedback,
      lifeChangeType,
      severity,
      requiresAdaptation: lifeChangeType !== 'none',
      hasBreakthrough
    };
  }

  determineEvolutionStrategy(analysis) {
    // PRIORITY 1: Handle breakthroughs first (escalate complexity)
    if (analysis.userFeedback.hasBreakthrough || analysis.userFeedback.sentiment === 'breakthrough') {
      return 'escalate_after_breakthrough';
    }

    // PRIORITY 2: Handle major life changes
    if (analysis.userFeedback.requiresAdaptation) {
      switch (analysis.userFeedback.lifeChangeType) {
      case 'financial_crisis':
        return 'adapt_to_zero_budget';
      case 'caregiving_mode':
        return 'adapt_to_caregiving';
      case 'location_change':
        return 'adapt_to_new_location';
      case 'time_constraints':
        return 'adapt_to_time_limits';
      case 'health_crisis':
        return 'adapt_to_health_crisis';
      default:
        return 'major_life_adaptation';
      }
    }

    // PRIORITY 3: Handle normal workflow issues
    if (analysis.stuckIndicators.includes('no_available_tasks')) {
      return 'generate_new_tasks';
    }

    if (analysis.stuckIndicators.includes('low_engagement')) {
      return 'increase_variety_and_interest';
    }

    if (analysis.userFeedback.sentiment === 'negative') {
      return 'address_user_concerns';
    }

    if (analysis.availableTasks < 3) {
      return 'expand_task_frontier';
    }

    return 'optimize_existing_sequence';
  }

  async generateSmartNextTasks(projectId, pathName, analysis) {
    const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
    const htaData = await this.loadPathHTA(projectId, pathName) || {};

    const newTasks = [];
    const taskId = (htaData.frontierNodes?.length || 0) + TASK_CONFIG.ADAPTIVE_TASK_BASE;

    // CRITICAL FIX: Check for recent breakthroughs and completed task patterns
    const completedTasks = htaData.frontierNodes?.filter(n => n.completed) || [];
    const recentlyCompletedBranches = completedTasks.slice(-3).map(t => t.branch || 'unknown');
    const hasRecentBreakthroughs = completedTasks.slice(-2).some(t => t.breakthrough === true);

    // CRITICAL FIX: Avoid generating duplicate task types
    const existingTaskTitles = new Set((htaData.frontierNodes || []).map(t => t.title));

    const strategy = analysis.recommendedEvolution;

    // CRITICAL FIX: If recent breakthroughs OR breakthrough context, escalate to higher complexity
    if (hasRecentBreakthroughs || strategy === 'escalate_after_breakthrough') {
      newTasks.push(...this.generateBreakthroughEscalationTasks(config, completedTasks, taskId, existingTaskTitles));
    } else {
      switch (strategy) {
      // LIFE ADAPTATION STRATEGIES
      case 'adapt_to_zero_budget':
        newTasks.push(...this.generateZeroBudgetTasks(config, taskId, existingTaskTitles));
        break;

      case 'adapt_to_caregiving':
        newTasks.push(...this.generateCaregivingTasks(config, taskId, existingTaskTitles));
        break;

      case 'adapt_to_new_location':
        newTasks.push(...this.generateLocationAdaptedTasks(config, taskId, existingTaskTitles));
        break;

      case 'adapt_to_time_limits':
        newTasks.push(...this.generateTimeLimitedTasks(config, taskId, existingTaskTitles));
        break;

      case 'adapt_to_health_crisis':
        newTasks.push(...this.generateHealthCrisisTasks(config, taskId, existingTaskTitles));
        break;

      case 'major_life_adaptation':
        newTasks.push(...this.generateGenericAdaptationTasks(config, taskId, existingTaskTitles));
        break;

        // NORMAL STRATEGIES
      case 'generate_new_tasks':
        newTasks.push(...this.generateExplorationTasks(config, taskId, existingTaskTitles));
        break;

      case 'increase_variety_and_interest':
        newTasks.push(...this.generateInterestBasedTasks(config, taskId, existingTaskTitles));
        break;

      case 'address_user_concerns':
        newTasks.push(...this.generateConcernAddressingTasks(analysis.userFeedback, taskId, existingTaskTitles));
        break;

      case 'expand_task_frontier':
        newTasks.push(...this.generateProgressiveTasks(htaData, taskId, existingTaskTitles));
        break;

      default:
        newTasks.push(...this.generateBalancedTasks(config, htaData, taskId, existingTaskTitles));
      }
    }

    return newTasks.slice(0, 5); // Limit to 5 new tasks at a time
  }

  generateExplorationTasks(config, startId) {
    const goal = config.goal || 'learning';

    return [
      {
        id: `explore_${startId}`,
        title: `Explore: What's Next in ${goal}`,
        description: 'Open exploration of next steps and possibilities',
        difficulty: 1,
        duration: '15 minutes',
        branch: 'exploration',
        priority: 250,
        generated: true,
        learningOutcome: 'Clarity on next learning directions'
      },
      {
        id: `sample_${startId + 1}`,
        title: 'Sample: Try Something Different',
        description: 'Experiment with a new approach or technique',
        difficulty: 2,
        duration: '25 minutes',
        branch: 'experimentation',
        priority: 240,
        generated: true,
        learningOutcome: 'Experience with alternative approaches'
      }
    ];
  }

  generateInterestBasedTasks(config, startId) {
    const interests = config.specific_interests || [];
    const tasks = [];

    for (let i = 0; i < Math.min(3, interests.length); i++) {
      const interest = interests[i];
      tasks.push({
        id: `interest_${startId + i}`,
        title: `Focus: ${interest}`,
        description: `Dedicated work on your specific interest: ${interest}`,
        difficulty: 2,
        duration: '30 minutes',
        branch: 'interests',
        priority: 300, // High priority for interests
        generated: true,
        learningOutcome: `Progress in ${interest}`
      });
    }

    return tasks;
  }

  generateConcernAddressingTasks(feedback, startId) {
    return [
      {
        id: `address_${startId}`,
        title: 'Address: Current Challenge',
        description: `Work on overcoming the challenge: ${feedback.original}`,
        difficulty: 1,
        duration: '20 minutes',
        branch: 'problem_solving',
        priority: 280,
        generated: true,
        learningOutcome: 'Resolution of current learning obstacle'
      }
    ];
  }

  generateProgressiveTasks(htaData, startId) {
    const completedTasks = htaData.frontierNodes?.filter(n => n.completed) || [];
    const lastCompleted = completedTasks[completedTasks.length - 1];

    if (!lastCompleted) {
      return this.generateExplorationTasks({ goal: 'general learning' }, startId);
    }

    return [
      {
        id: `build_${startId}`,
        title: `Build On: ${lastCompleted.title}`,
        description: `Continue building on the foundation from ${lastCompleted.title}`,
        difficulty: Math.min(5, (lastCompleted.difficulty || 3) + 1),
        duration: '35 minutes',
        branch: lastCompleted.branch || 'progression',
        prerequisites: [lastCompleted.id],
        priority: 270,
        generated: true,
        learningOutcome: `Advanced understanding beyond ${lastCompleted.title}`
      }
    ];
  }

  generateBalancedTasks(config, htaData, startId) {
    // No hard-coded fallback – signal external generation required
    return [];
  }

  // ===== LIFE ADAPTATION TASK GENERATORS =====

  generateZeroBudgetTasks(config, startId, existingTaskTitles = new Set()) {
    const goal = config.goal || 'learning';
    const tasks = [
      {
        id: `free_${startId}`,
        title: 'Research completely free alternatives for current goals',
        description: 'Find zero-cost resources, tools, and methods that can replace paid options',
        difficulty: 1,
        duration: '25 minutes',
        branch: 'zero_budget_adaptation',
        priority: 400,
        generated: true,
        learningOutcome: 'Comprehensive free resource plan'
      },
      {
        id: `creative_${startId + 1}`,
        title: 'Creative constraint solutions',
        description: 'Brainstorm innovative ways to achieve goals with zero budget constraints',
        difficulty: 2,
        duration: '20 minutes',
        branch: 'creative_solutions',
        priority: 390,
        generated: true,
        learningOutcome: 'Creative problem-solving mindset'
      }
    ];

    // Filter out existing tasks
    return tasks.filter(task => !existingTaskTitles.has(task.title));
  }

  generateBreakthroughEscalationTasks(config, completedTasks, startId, existingTaskTitles = new Set()) {
    const goal = config.goal || 'learning';
    const lastBreakthrough = completedTasks.filter(t => t.breakthrough).slice(-1)[0];

    const escalatedTasks = [
      {
        id: `escalate_${startId}`,
        title: 'Advanced: Build on breakthrough discovery',
        description: 'Take your recent breakthrough to the next level with more sophisticated approaches',
        difficulty: 3,
        duration: '45 minutes',
        branch: 'breakthrough_scaling',
        priority: 500, // Highest priority for breakthrough follow-up
        generated: true,
        learningOutcome: 'Advanced expertise building on breakthrough insights'
      },
      {
        id: `connect_${startId + 1}`,
        title: 'Connect with experts in breakthrough area',
        description: 'Reach out to professionals who can provide advanced guidance on your recent discovery',
        difficulty: 3,
        duration: '30 minutes',
        branch: 'expert_networking',
        priority: 480,
        generated: true,
        learningOutcome: 'Professional connections and advanced mentorship'
      },
      {
        id: `document_${startId + 2}`,
        title: 'Document and share breakthrough insights',
        description: 'Create content about your discovery that could help others and establish your expertise',
        difficulty: 2,
        duration: '35 minutes',
        branch: 'thought_leadership',
        priority: 470,
        generated: true,
        learningOutcome: 'Thought leadership and breakthrough amplification'
      }
    ];

    return escalatedTasks.filter(task => !existingTaskTitles.has(task.title));
  }

  generateCaregivingTasks(config, startId) {
    return [
      {
        id: `caregiver_${startId}`,
        title: 'Voice memo learning while caregiving',
        description: 'Record thoughts, ideas, and voice notes during quiet caregiving moments',
        difficulty: 1,
        duration: '5 minutes',
        branch: 'caregiving_compatible',
        priority: 400,
        generated: true,
        learningOutcome: 'Maintained learning momentum during care'
      },
      {
        id: `passive_${startId + 1}`,
        title: 'Passive learning during care',
        description: 'Listen to educational content while providing care (podcasts, audiobooks)',
        difficulty: 1,
        duration: '30 minutes',
        branch: 'passive_learning',
        priority: 390,
        generated: true,
        learningOutcome: 'Knowledge absorption during care duties'
      },
      {
        id: `document_${startId + 2}`,
        title: 'Document this experience',
        description: 'Capture photos, videos, or notes about this caregiving experience for potential content',
        difficulty: 1,
        duration: '10 minutes',
        branch: 'experience_documentation',
        priority: 380,
        generated: true,
        learningOutcome: 'Raw material for future projects'
      }
    ];
  }

  generateLocationAdaptedTasks(config, startId) {
    return [
      {
        id: `mobile_${startId}`,
        title: 'Optimize mobile-only workflow',
        description: 'Set up learning and work processes that work from any location with just phone/laptop',
        difficulty: 2,
        duration: '30 minutes',
        branch: 'location_independence',
        priority: 400,
        generated: true,
        learningOutcome: 'Location-independent workflow'
      },
      {
        id: `local_${startId + 1}`,
        title: 'Discover local resources and opportunities',
        description: 'Research what learning resources, communities, or opportunities exist in new location',
        difficulty: 1,
        duration: '25 minutes',
        branch: 'local_adaptation',
        priority: 390,
        generated: true,
        learningOutcome: 'Local opportunity map'
      }
    ];
  }

  generateTimeLimitedTasks(config, startId) {
    return [
      {
        id: `micro_${startId}`,
        title: 'Micro-learning session',
        description: 'High-impact 5-10 minute learning burst optimized for maximum value',
        difficulty: 1,
        duration: '5 minutes',
        branch: 'time_optimized',
        priority: 400,
        generated: true,
        learningOutcome: 'Efficient knowledge absorption'
      },
      {
        id: `batch_${startId + 1}`,
        title: 'Batch focused work session',
        description: 'Intensive focused work that maximizes limited available time windows',
        difficulty: 2,
        duration: '45 minutes',
        branch: 'time_batching',
        priority: 390,
        generated: true,
        learningOutcome: 'High-efficiency focused output'
      }
    ];
  }

  generateHealthCrisisTasks(config, startId) {
    return [
      {
        id: `rest_${startId}`,
        title: 'Gentle learning while recovering',
        description: 'Light, low-energy learning activities that support recovery',
        difficulty: 1,
        duration: '15 minutes',
        branch: 'recovery_compatible',
        priority: 400,
        generated: true,
        learningOutcome: 'Maintained progress during recovery'
      }
    ];
  }

  generateGenericAdaptationTasks(config, startId) {
    return [
      {
        id: `adapt_${startId}`,
        title: 'Adaptation strategy planning',
        description: 'Plan how to adapt current goals to new life circumstances',
        difficulty: 2,
        duration: '30 minutes',
        branch: 'life_adaptation',
        priority: 400,
        generated: true,
        learningOutcome: 'Realistic adaptation plan'
      }
    ];
  }

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

  async loadLearningHistory(projectId, pathName) {
    if (pathName === DEFAULT_PATHS.GENERAL) {
      return await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.LEARNING_HISTORY);
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.LEARNING_HISTORY);
    }
  }

}