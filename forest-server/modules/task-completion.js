/**
 * Task Completion Module
 * Handles task completion and learning evolution
 * Now uses event-driven architecture for decoupled strategy evolution
 */

import { FILE_NAMES, DEFAULT_PATHS, TASK_CONFIG } from './constants.js';
import { bus } from './utils/event-bus.js';

export class TaskCompletion {
  constructor(dataPersistence, projectManagement, eventBus = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.eventBus = eventBus || bus; // Use provided eventBus or default to global bus
  }

  async completeBlock(blockId, outcome, learned = '', nextQuestions = '', energyLevel, difficultyRating = 3, breakthrough = false,
    engagementLevel = 5, unexpectedResults = [], newSkillsRevealed = [], externalFeedback = [],
    socialReactions = [], viralPotential = false, industryConnections = [], serendipitousEvents = []) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);

      if (!config) {
        throw new Error('Project configuration not found');
      }

      // Load today's schedule to find the block
      const today = new Date().toISOString().split('T')[0];
      const schedule = await this.dataPersistence.loadProjectData(projectId, `day_${today}.json`) || {};

      // Ensure schedule.blocks exists for later persistence
      if (!Array.isArray(schedule.blocks)) {
        schedule.blocks = [];
      }

      let block = schedule.blocks.find(b => b.id === blockId);

      // --- FALLBACK: allow completing tasks that were never scheduled ---
      if (!block) {
        // Try to fetch the HTA node so we can pull in metadata
        const htaData = await this.loadPathHTA(projectId, config.activePath || DEFAULT_PATHS.GENERAL) || {};
        const node = htaData.frontierNodes?.find(n => n.id === blockId);

        block = {
          id: blockId,
          type: 'learning',
          title: node?.title || `Ad-hoc Task ${blockId}`,
          description: node?.description || '',
          startTime: new Date().toISOString(),
          duration: node?.duration || '30 minutes',
          difficulty: node?.difficulty || difficultyRating,
          taskId: node?.id || blockId,
          branch: node?.branch || DEFAULT_PATHS.GENERAL,
          completed: false,
          priority: node?.priority || 200
        };

        // Push the synthetic block into the schedule so history is consistent
        schedule.blocks.push(block);
      }

      // Mark block as completed
      block.completed = true;
      block.completedAt = new Date().toISOString();
      block.outcome = outcome;
      block.learned = learned;
      block.nextQuestions = nextQuestions;
      block.energyAfter = energyLevel;
      block.difficultyRating = difficultyRating;
      block.breakthrough = breakthrough;

      // Add opportunity detection context if provided
      if (engagementLevel !== 5 || unexpectedResults.length > 0) {
        block.opportunityContext = {
          engagementLevel,
          unexpectedResults,
          newSkillsRevealed,
          externalFeedback,
          socialReactions,
          viralPotential,
          industryConnections,
          serendipitousEvents
        };
      }

      // Save updated schedule
      await this.dataPersistence.saveProjectData(projectId, `day_${today}.json`, schedule);

      // Update learning history
      await this.updateLearningHistory(projectId, config.activePath || DEFAULT_PATHS.GENERAL, block);

      // Emit block completion event for decoupled strategy evolution
      if (learned || nextQuestions || breakthrough) {
        this.eventBus.emit('block:completed', {
          projectId,
          pathName: config.activePath || DEFAULT_PATHS.GENERAL,
          block
        }, 'TaskCompletion');
      }

      // Handle opportunity detection for impossible dream orchestration
      const opportunityResponse = await this.handleOpportunityDetection(projectId, block);

      const responseText = this.generateCompletionResponse(block, opportunityResponse);

      return {
        content: [{
          type: 'text',
          text: responseText
        }],
        block_completed: block,
        opportunity_analysis: opportunityResponse,
        next_suggested_action: this.suggestNextAction(block, schedule)
      };

    } catch (error) {
      await this.dataPersistence.logError('completeBlock', error, { blockId, outcome });
      return {
        content: [{
          type: 'text',
          text: `Error completing block: ${error.message}`
        }]
      };
    }
  }

  async updateLearningHistory(projectId, pathName, block) {
    const learningHistory = await this.loadPathLearningHistory(projectId, pathName) || {
      completedTopics: [],
      insights: [],
      knowledgeGaps: [],
      skillProgression: {}
    };

    // Add completed topic
    learningHistory.completedTopics.push({
      topic: block.title,
      description: block.description || '',
      completedAt: block.completedAt,
      outcome: block.outcome,
      learned: block.learned,
      difficulty: block.difficultyRating,
      energyAfter: block.energyAfter,
      breakthrough: block.breakthrough,
      blockId: block.id,
      taskId: block.taskId
    });

    // Add insights if breakthrough
    if (block.breakthrough && block.learned) {
      learningHistory.insights.push({
        insight: block.learned,
        topic: block.title,
        timestamp: block.completedAt,
        context: block.outcome
      });
    }

    // Add knowledge gaps from next questions
    if (block.nextQuestions) {
      const questions = block.nextQuestions.split('.').filter(q => q.trim().length > 0);
      for (const question of questions) {
        learningHistory.knowledgeGaps.push({
          question: question.trim(),
          relatedTopic: block.title,
          identified: block.completedAt,
          priority: block.breakthrough ? 'high' : 'medium'
        });
      }
    }

    // Update skill progression
    if (block.branch) {
      if (!learningHistory.skillProgression[block.branch]) {
        learningHistory.skillProgression[block.branch] = {
          level: 1,
          completedTasks: 0,
          totalEngagement: 0
        };
      }

      const progression = learningHistory.skillProgression[block.branch];
      progression.completedTasks += 1;
      progression.totalEngagement += (block.opportunityContext?.engagementLevel || 5);
      progression.level = Math.min(10, 1 + Math.floor(progression.completedTasks / 3));
    }

    await this.savePathLearningHistory(projectId, pathName, learningHistory);
  }

  // NOTE: Strategy evolution methods (evolveHTABasedOnLearning, generateFollowUpTasks,
  // generateMomentumBuildingTasks, generateOpportunityTasks) have been moved to StrategyEvolver module
  // TaskCompletion now emits 'block:completed' events instead of directly calling evolution logic

  async handleOpportunityDetection(projectId, block) {
    const context = block.opportunityContext;
    if (!context) {return null;}

    const opportunities = [];

    // Analyze engagement levels
    if (context.engagementLevel >= 8) {
      opportunities.push({
        type: 'natural_talent_indicator',
        message: `🌟 High engagement detected (${context.engagementLevel}/10)! This suggests natural aptitude.`,
        action: 'Consider doubling down on this area and exploring advanced techniques.'
      });
    }

    // Analyze unexpected results
    if (context.unexpectedResults?.length > 0) {
      opportunities.push({
        type: 'serendipitous_discovery',
        message: `🔍 Unexpected discoveries: ${context.unexpectedResults.join(', ')}`,
        action: 'These discoveries could open new pathways - explore them further.'
      });
    }

    // Analyze external feedback
    if (context.externalFeedback?.length > 0) {
      const positiveCount = context.externalFeedback.filter(f => f.sentiment === 'positive').length;
      if (positiveCount > 0) {
        opportunities.push({
          type: 'external_validation',
          message: `👥 Received ${positiveCount} positive feedback responses`,
          action: 'This external validation suggests market potential - consider networking.'
        });
      }
    }

    // Analyze viral potential
    if (context.viralPotential) {
      opportunities.push({
        type: 'viral_potential',
        message: '🚀 Content has viral potential detected',
        action: 'Create more content in this style and engage with the audience.'
      });
    }

    return {
      detected: opportunities.length > 0,
      opportunities,
      recommendedPath: this.recommendOpportunityPath(opportunities)
    };
  }

  recommendOpportunityPath(opportunities) {
    if (opportunities.length === 0) {return 'continue_planned_path';}

    const types = opportunities.map(o => o.type);

    // IMPOSSIBLE DREAM ORCHESTRATION: Generate specific next actions
    if (types.includes('viral_potential') && types.includes('external_validation')) {
      return {
        path: 'accelerated_professional_path',
        nextActions: [
          'Create follow-up content to viral piece within 24 hours',
          'Reach out to people who gave positive feedback',
          'Document what made the content viral for replication'
        ]
      };
    } else if (types.includes('natural_talent_indicator') && types.includes('serendipitous_discovery')) {
      return {
        path: 'exploration_amplification_path',
        nextActions: [
          'Spend 2x time on high-engagement activities',
          'Research advanced techniques in discovered talent area',
          'Connect with experts in this unexpected domain'
        ]
      };
    } else if (types.includes('external_validation')) {
      return {
        path: 'networking_focus_path',
        nextActions: [
          'Follow up with feedback providers within 48 hours',
          'Ask for introductions to others in the field',
          'Share your work with their professional networks'
        ]
      };
    } else {
      return {
        path: 'breakthrough_deepening_path',
        nextActions: [
          'Double down on what created the breakthrough',
          'Document the conditions that led to success',
          'Plan 3 similar experiments to replicate results'
        ]
      };
    }
  }

  generateCompletionResponse(block, opportunityResponse) {
    let response = `✅ **Block Completed**: ${block.title}\n\n`;
    response += `**Outcome**: ${block.outcome}\n`;

    if (block.learned) {
      response += `**Learned**: ${block.learned}\n`;
    }

    response += `**Energy After**: ${block.energyAfter}/5\n`;
    response += `**Difficulty**: ${block.difficultyRating}/5\n`;

    if (block.breakthrough) {
      response += '\n🎉 **BREAKTHROUGH DETECTED!** 🎉\n';
    }

    if (opportunityResponse?.detected) {
      response += '\n🌟 **OPPORTUNITY ANALYSIS**:\n';
      for (const opp of opportunityResponse.opportunities) {
        response += `• ${opp.message}\n`;
        response += `  💡 ${opp.action}\n`;
      }

      // IMPOSSIBLE DREAM ORCHESTRATION: Show specific next actions
      if (opportunityResponse.recommendedPath.nextActions) {
        response += '\n🚀 **IMPOSSIBLE DREAM ORCHESTRATION**:\n';
        response += `Path: ${opportunityResponse.recommendedPath.path}\n`;
        response += '**Immediate Actions**:\n';
        for (const action of opportunityResponse.recommendedPath.nextActions) {
          response += `• ${action}\n`;
        }
      } else {
        const pathRecommendation = this.getPathRecommendationText(opportunityResponse.recommendedPath);
        response += `\n🎯 **Recommended Path**: ${pathRecommendation}\n`;
      }
    }

    if (block.nextQuestions) {
      response += `\n❓ **Next Questions**: ${block.nextQuestions}\n`;
    }

    return response;
  }

  getPathRecommendationText(pathType) {
    const paths = {
      'accelerated_professional_path': 'Focus on professional networking and content creation',
      'exploration_amplification_path': 'Deep dive into discovered talents and interests',
      'networking_focus_path': 'Prioritize building professional connections',
      'breakthrough_deepening_path': 'Deepen mastery in breakthrough areas',
      'continue_planned_path': 'Continue planned learning'
    };

    return paths[pathType] || 'Continue planned learning';
  }

  suggestNextAction(block, schedule) {
    const remainingBlocks = schedule.blocks?.filter(b => !b.completed) || [];

    if (remainingBlocks.length > 0) {
      const nextBlock = remainingBlocks[0];
      return {
        type: 'continue_schedule',
        message: `Next: ${nextBlock.title} at ${nextBlock.startTime}`,
        blockId: nextBlock.id
      };
    } else {
      return {
        type: 'day_complete',
        message: 'All blocks completed! Consider reviewing progress or planning tomorrow.',
        suggestion: 'Use analyze_reasoning to extract insights from today\'s learning'
      };
    }
  }

  async loadPathLearningHistory(projectId, pathName) {
    if (pathName === DEFAULT_PATHS.GENERAL) {
      return await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.LEARNING_HISTORY);
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.LEARNING_HISTORY);
    }
  }

  async savePathLearningHistory(projectId, pathName, learningHistory) {
    if (pathName === DEFAULT_PATHS.GENERAL) {
      return await this.dataPersistence.saveProjectData(projectId, FILE_NAMES.LEARNING_HISTORY, learningHistory);
    } else {
      return await this.dataPersistence.savePathData(projectId, pathName, FILE_NAMES.LEARNING_HISTORY, learningHistory);
    }
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
}