/**
 * Task Completion Module
 * Handles task completion and learning evolution
 */

import { FILE_NAMES, DEFAULT_PATHS, TASK_CONFIG } from './constants.js';

export class TaskCompletion {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
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

      // Evolve HTA tree based on learning
      if (learned || nextQuestions || breakthrough) {
        await this.evolveHTABasedOnLearning(projectId, config.activePath || DEFAULT_PATHS.GENERAL, block);
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
  }

  generateFollowUpTasks(block, htaData) {
    const newTasks = [];
    let taskId = (htaData.frontierNodes?.length || 0) + TASK_CONFIG.EXPLORE_TASK_BASE;

    // CRITICAL: Enhanced momentum building - parse specific outcomes for targeted tasks
    const momentumTasks = this.generateMomentumBuildingTasks(block, taskId);
    newTasks.push(...momentumTasks);
    taskId += momentumTasks.length;

    // Generate tasks from next questions (as secondary priority)
    if (block.nextQuestions) {
      const questions = block.nextQuestions.split('.').filter(q => q.trim().length > 0);

      for (const question of questions.slice(0, 2)) { // Limit to 2 follow-up tasks
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
          sourceBlock: block.id
        });
      }
    }

    return newTasks;
  }

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
          priority: 400, // High priority for momentum
          learningOutcome: 'Professional academic connection and mentorship'
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
          priority: 390,
          learningOutcome: 'Understanding of viral content strategy and audience engagement'
        }
      },
      {
        pattern: /contacted|reached out|email|message/i,
        task: {
          title: 'Respond to incoming connections',
          description: 'Follow up with people who contacted you and explore potential collaborations',
          branch: 'response_networking',
          difficulty: 2,
          duration: '20 minutes',
          priority: 380,
          learningOutcome: 'Professional networking and relationship building'
        }
      },
      {
        pattern: /journalist|media|reporter|news/i,
        task: {
          title: 'Engage with journalism contacts',
          description: 'Follow up with journalism professionals who showed interest in your work',
          branch: 'media_relations',
          difficulty: 3,
          duration: '35 minutes',
          priority: 420,
          learningOutcome: 'Media relations and professional journalism connections'
        }
      },
      {
        pattern: /expert|professional|industry/i,
        task: {
          title: 'Connect with industry experts',
          description: 'Reach out to industry professionals who can provide advanced guidance',
          branch: 'expert_networking',
          difficulty: 3,
          duration: '30 minutes',
          priority: 400,
          learningOutcome: 'Expert mentorship and industry connections'
        }
      }
    ];

    // CRITICAL FIX: Generate momentum tasks for ALL matching patterns, not just first one
    for (const pattern of outcomePatterns) {
      if (pattern.pattern.test(outcome)) {
        momentumTasks.push({
          id: `momentum_${taskId++}`,
          title: pattern.task.title,
          description: pattern.task.description,
          branch: pattern.task.branch,
          difficulty: pattern.task.difficulty,
          duration: pattern.task.duration,
          prerequisites: [], // CRITICAL FIX: No prerequisites for momentum tasks to avoid orphaning
          learningOutcome: pattern.task.learningOutcome,
          priority: pattern.task.priority,
          generated: true,
          sourceBlock: block.id,
          momentumBuilding: true
        });
        // Continue checking other patterns instead of breaking after first match
      }
    }

    // If breakthrough but no specific patterns detected, generate generic momentum task
    if (block.breakthrough && momentumTasks.length === 0) {
      momentumTasks.push({
        id: `momentum_${taskId++}`,
        title: 'Build on breakthrough momentum',
        description: `Capitalize on the success and insights from ${block.title}`,
        branch: 'breakthrough_scaling',
        difficulty: Math.min(5, (block.difficultyRating || 3) + 1),
        duration: '40 minutes',
        prerequisites: [], // CRITICAL FIX: No prerequisites for momentum tasks to avoid orphaning
        learningOutcome: 'Advanced expertise building on breakthrough insights',
        priority: 350,
        generated: true,
        sourceBlock: block.id,
        momentumBuilding: true
      });
    }

    return momentumTasks;
  }

  generateOpportunityTasks(block, htaData) {
    const opportunityTasks = [];
    const context = block.opportunityContext;
    let taskId = (htaData.frontierNodes?.length || 0) + TASK_CONFIG.SAMPLE_TASK_BASE;

    // High engagement detection - indicates natural talent/interest
    if (context.engagementLevel >= 8) {
      opportunityTasks.push({
        id: `breakthrough_${taskId++}`,
        title: `Amplify: ${block.title} Success`,
        description: `Build on the breakthrough momentum from ${block.title}`,
        branch: block.branch || 'opportunity',
        difficulty: Math.min(5, (block.difficultyRating || 3) + 1),
        duration: '45 minutes',
        prerequisites: [block.taskId].filter(Boolean),
        learningOutcome: 'Amplified skills and deeper mastery',
        priority: 350, // High priority for breakthrough amplification
        opportunityType: 'breakthrough_amplification'
      });
    }

    // External feedback opportunities
    if (context.externalFeedback?.length > 0) {
      const positiveFeedback = context.externalFeedback.filter(f => f.sentiment === 'positive');
      if (positiveFeedback.length > 0) {
        opportunityTasks.push({
          id: `network_${taskId++}`,
          title: 'Follow Up: External Interest',
          description: `Connect with people who showed interest in your ${block.title} work`,
          branch: 'networking',
          difficulty: 2,
          duration: '30 minutes',
          learningOutcome: 'Professional connections and feedback',
          priority: 300,
          opportunityType: 'networking'
        });
      }
    }

    // Viral potential tasks
    if (context.viralPotential) {
      opportunityTasks.push({
        id: `viral_${taskId++}`,
        title: 'Leverage: Viral Momentum',
        description: `Capitalize on the viral potential of your ${block.title} work`,
        branch: 'marketing',
        difficulty: 3,
        duration: '60 minutes',
        learningOutcome: 'Understanding of viral content and audience building',
        priority: 320,
        opportunityType: 'viral_leverage'
      });
    }

    return opportunityTasks;
  }

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