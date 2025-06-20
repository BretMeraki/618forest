/**
 * Identity Engine Module
 * Handles identity transformation and pathway analysis
 */

import { getForestLogger } from './winston-logger.js';

// Structured logger for this module
const logger = getForestLogger({ module: 'IdentityEngine' });

export class IdentityEngine {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  async analyzeIdentityTransformation() {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      const analysis = await this.performIdentityAnalysis(projectId, config);
      const reportText = this.formatIdentityReport(analysis);

      return {
        content: [
          {
            type: 'text',
            text: reportText,
          },
        ],
        identity_analysis: analysis,
      };
    } catch (error) {
      await this.dataPersistence.logError('analyzeIdentityTransformation', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing identity transformation: ${error.message}`,
          },
        ],
      };
    }
  }

  async performIdentityAnalysis(projectId, config) {
    const activePath = config.activePath || 'general';
    const learningHistory = (await this.loadLearningHistory(projectId, activePath)) || {};
    const completedTopics = learningHistory.completedTopics || [];

    // Analyze current identity
    const currentIdentity = this.analyzeCurrentIdentity(config, completedTopics);

    // Determine target identity
    const targetIdentity = this.determineTargetIdentity(config.goal, config.success_metrics);

    // Calculate transformation progress
    const transformationProgress = this.calculateTransformationProgress(
      currentIdentity,
      targetIdentity,
      completedTopics
    );

    // Generate micro-shifts
    const microShifts = this.generateMicroShifts(
      currentIdentity,
      targetIdentity,
      transformationProgress
    );

    // Analyze identity barriers
    const barriers = this.analyzeIdentityBarriers(currentIdentity, targetIdentity, completedTopics);

    return {
      currentIdentity,
      targetIdentity,
      transformationProgress,
      microShifts,
      barriers,
      nextIdentityMilestone: this.calculateNextMilestone(currentIdentity, targetIdentity),
    };
  }

  analyzeCurrentIdentity(config, completedTopics) {
    const identity = {
      coreBeliefs: this.extractCoreBeliefs(config, completedTopics),
      skillAreas: this.extractSkillAreas(completedTopics),
      experienceLevel: this.calculateExperienceLevel(completedTopics),
      professionalRole: this.inferProfessionalRole(config, completedTopics),
      networkPosition: this.analyzeNetworkPosition(completedTopics),
      resourceAccess: this.analyzeResourceAccess(config, completedTopics),
      confidenceLevel: this.calculateConfidenceLevel(completedTopics),
      timeHorizonThinking: this.analyzeTimeHorizonThinking(completedTopics),
    };

    return identity;
  }

  extractCoreBeliefs(config, completedTopics) {
    const beliefs = [];

    // Extract from initial context
    const context = config.context?.toLowerCase() || '';
    if (context.includes('passionate') || context.includes('love')) {
      beliefs.push('Passion-driven approach');
    }
    if (context.includes('challenge') || context.includes('difficult')) {
      beliefs.push('Embraces challenges');
    }
    if (context.includes('learning') || context.includes('grow')) {
      beliefs.push('Growth mindset');
    }

    // Extract from learning outcomes
    const breakthroughs = completedTopics.filter(t => t.breakthrough);
    if (breakthroughs.length > 0) {
      beliefs.push('Capable of breakthroughs');
    }

    // Extract from task completion patterns
    const avgEnergy =
      completedTopics.reduce((sum, t) => sum + (t.energyAfter || 3), 0) /
      Math.max(completedTopics.length, 1);
    if (avgEnergy >= 4) {
      beliefs.push('Learning energizes me');
    } else if (avgEnergy <= 2) {
      beliefs.push('Need to find engaging approaches');
    }

    return beliefs;
  }

  extractSkillAreas(completedTopics) {
    const skillAreas = {};

    for (const topic of completedTopics) {
      const text = topic.topic.toLowerCase();

      // Categorize skills
      if (text.includes('music') || text.includes('piano') || text.includes('saxophone')) {
        skillAreas.music = (skillAreas.music || 0) + 1;
      }
      if (text.includes('programming') || text.includes('code') || text.includes('web')) {
        skillAreas.technical = (skillAreas.technical || 0) + 1;
      }
      if (text.includes('business') || text.includes('marketing') || text.includes('sales')) {
        skillAreas.business = (skillAreas.business || 0) + 1;
      }
      if (text.includes('design') || text.includes('creative') || text.includes('art')) {
        skillAreas.creative = (skillAreas.creative || 0) + 1;
      }
      if (
        text.includes('communication') ||
        text.includes('writing') ||
        text.includes('presentation')
      ) {
        skillAreas.communication = (skillAreas.communication || 0) + 1;
      }
    }

    // Convert to proficiency levels
    const proficiencies = {};
    for (const [area, count] of Object.entries(skillAreas)) {
      if (count >= 10) {
        proficiencies[area] = 'advanced';
      } else if (count >= 5) {
        proficiencies[area] = 'intermediate';
      } else if (count >= 2) {
        proficiencies[area] = 'beginner';
      } else {
        proficiencies[area] = 'novice';
      }
    }

    return proficiencies;
  }

  calculateExperienceLevel(completedTopics) {
    const totalTasks = completedTopics.length;
    const avgDifficulty =
      completedTopics.reduce((sum, t) => sum + (t.difficulty || 3), 0) / Math.max(totalTasks, 1);
    const breakthroughRate =
      completedTopics.filter(t => t.breakthrough).length / Math.max(totalTasks, 1);

    let level = 'novice';

    if (totalTasks >= 20 && avgDifficulty >= 3.5 && breakthroughRate >= 0.2) {
      level = 'expert';
    } else if (totalTasks >= 10 && avgDifficulty >= 3) {
      level = 'intermediate';
    } else if (totalTasks >= 5) {
      level = 'beginner';
    }

    return {
      level,
      tasksCompleted: totalTasks,
      averageDifficulty: avgDifficulty.toFixed(1),
      breakthroughRate: `${(breakthroughRate * 100).toFixed(0)}%`,
    };
  }

  inferProfessionalRole(config, completedTopics) {
    const goal = config.goal?.toLowerCase() || '';
    const taskPatterns = completedTopics.map(t => t.topic.toLowerCase()).join(' ');

    // Pattern matching for professional roles
    if (
      goal.includes('entrepreneur') ||
      taskPatterns.includes('business') ||
      taskPatterns.includes('startup')
    ) {
      return 'entrepreneur';
    } else if (
      goal.includes('developer') ||
      taskPatterns.includes('programming') ||
      taskPatterns.includes('web')
    ) {
      return 'developer';
    } else if (
      goal.includes('musician') ||
      taskPatterns.includes('music') ||
      taskPatterns.includes('piano')
    ) {
      return 'musician';
    } else if (goal.includes('designer') || taskPatterns.includes('design')) {
      return 'designer';
    } else if (goal.includes('marketing') || taskPatterns.includes('marketing')) {
      return 'marketer';
    } else {
      return 'learner'; // Default identity
    }
  }

  analyzeNetworkPosition(completedTopics) {
    let networkScore = 0;
    let collaborationCount = 0;

    for (const topic of completedTopics) {
      const text = `${topic.topic} ${topic.outcome}`.toLowerCase();

      if (text.includes('network') || text.includes('connect')) {
        networkScore += 2;
      }
      if (text.includes('collaborate') || text.includes('partner')) {
        networkScore += 2;
        collaborationCount += 1;
      }
      if (text.includes('community') || text.includes('group')) {
        networkScore += 1;
      }
      if (text.includes('mentor') || text.includes('teach')) {
        networkScore += 2;
      }
    }

    let position = 'isolated';
    if (networkScore >= 8) {
      position = 'central';
    } else if (networkScore >= 4) {
      position = 'connected';
    } else if (networkScore >= 2) {
      position = 'emerging';
    }

    return {
      position,
      score: networkScore,
      collaborationCount,
    };
  }

  analyzeResourceAccess(config, completedTopics) {
    const constraints = config.constraints || {};
    let resourceLevel = 'limited';

    // Analyze financial constraints
    const financial = constraints.financial_constraints?.toLowerCase() || '';
    if (financial.includes('no budget') || financial.includes('very limited')) {
      resourceLevel = 'constrained';
    } else if (financial.includes('moderate') || financial.includes('some budget')) {
      resourceLevel = 'moderate';
    } else if (financial.includes('flexible') || financial.includes('good budget')) {
      resourceLevel = 'abundant';
    }

    // Analyze time constraints
    const time = constraints.time_constraints?.toLowerCase() || '';
    const hasTimeFlexibility = !time.includes('busy') && !time.includes('limited');

    return {
      financial: resourceLevel,
      time: hasTimeFlexibility ? 'flexible' : 'constrained',
      overall: this.calculateOverallResourceAccess(resourceLevel, hasTimeFlexibility),
    };
  }

  calculateOverallResourceAccess(financial, hasTimeFlexibility) {
    if (financial === 'abundant' && hasTimeFlexibility) {
      return 'high';
    }
    if (financial === 'moderate' || hasTimeFlexibility) {
      return 'medium';
    }
    return 'low';
  }

  calculateConfidenceLevel(completedTopics) {
    const recentTasks = completedTopics.slice(-10);
    let confidenceScore = 0;

    for (const task of recentTasks) {
      // High energy after task = confidence boost
      if ((task.energyAfter || 3) >= 4) {
        confidenceScore += 2;
      }

      // Breakthrough = major confidence boost
      if (task.breakthrough) {
        confidenceScore += 3;
      }

      // Completing difficult tasks = confidence boost
      if ((task.difficulty || 3) >= 4 && (task.difficultyRating || 3) <= 3) {
        confidenceScore += 2; // Handled difficulty well
      }

      // Task felt too easy = confidence in ability
      if ((task.difficultyRating || 3) <= 2) {
        confidenceScore += 1;
      }
    }

    const avgConfidence = confidenceScore / Math.max(recentTasks.length, 1);

    let level = 'low';
    if (avgConfidence >= 2.5) {
      level = 'high';
    } else if (avgConfidence >= 1.5) {
      level = 'moderate';
    }

    return {
      level,
      score: confidenceScore,
      recentBreakthroughs: recentTasks.filter(t => t.breakthrough).length,
    };
  }

  analyzeTimeHorizonThinking(completedTopics) {
    let longestHorizon = 'immediate';

    for (const topic of completedTopics) {
      const text = `${topic.topic} ${topic.learned}`.toLowerCase();

      if (text.includes('strategy') || text.includes('long-term') || text.includes('vision')) {
        longestHorizon = 'strategic';
      } else if (text.includes('plan') || text.includes('goal') || text.includes('future')) {
        if (longestHorizon === 'immediate') {
          longestHorizon = 'planning';
        }
      }
    }

    return longestHorizon;
  }

  determineTargetIdentity(goal, successMetrics) {
    const goalLower = goal?.toLowerCase() || '';
    const metrics = successMetrics || [];

    const targetIdentity = {
      role: this.extractTargetRole(goalLower),
      skillLevel: this.extractTargetSkillLevel(goalLower, metrics),
      networkPosition: this.extractTargetNetworkPosition(goalLower, metrics),
      resourceLevel: this.extractTargetResourceLevel(metrics),
      confidenceLevel: 'high', // Assumption: success requires high confidence
      timeHorizon: this.extractTargetTimeHorizon(goalLower, metrics),
      keyBeliefs: this.extractTargetBeliefs(goalLower),
      professionalReputation: this.extractTargetReputation(goalLower, metrics),
    };

    return targetIdentity;
  }

  extractTargetRole(goal) {
    if (goal.includes('entrepreneur') || goal.includes('founder')) {
      return 'entrepreneur';
    }
    if (goal.includes('developer') || goal.includes('programmer')) {
      return 'developer';
    }
    if (goal.includes('musician') || goal.includes('artist')) {
      return 'musician';
    }
    if (goal.includes('designer')) {
      return 'designer';
    }
    if (goal.includes('consultant') || goal.includes('expert')) {
      return 'consultant';
    }
    if (goal.includes('leader') || goal.includes('manager')) {
      return 'leader';
    }
    return 'professional'; // Default
  }

  extractTargetSkillLevel(goal, metrics) {
    if (goal.includes('expert') || goal.includes('master') || goal.includes('advanced')) {
      return 'expert';
    }
    if (
      goal.includes('professional') ||
      metrics.some(m => m.includes('income') || m.includes('client'))
    ) {
      return 'professional';
    }
    return 'competent';
  }

  extractTargetNetworkPosition(goal, metrics) {
    if (goal.includes('industry leader') || goal.includes('thought leader')) {
      return 'central';
    }
    if (goal.includes('recognized') || goal.includes('known')) {
      return 'influential';
    }
    if (metrics.some(m => m.includes('network') || m.includes('connections'))) {
      return 'connected';
    }
    return 'connected'; // Default assumption
  }

  extractTargetResourceLevel(metrics) {
    const hasFinancialMetrics = metrics.some(
      m => m.includes('income') || m.includes('revenue') || m.includes('$') || m.includes('salary')
    );

    if (hasFinancialMetrics) {
      // Analyze the scale of financial goals
      const financialText = metrics.join(' ').toLowerCase();
      if (
        financialText.includes('six figure') ||
        financialText.includes('100k') ||
        financialText.includes('$100')
      ) {
        return 'abundant';
      } else if (financialText.includes('sustainable') || financialText.includes('living')) {
        return 'moderate';
      }
    }

    return 'moderate'; // Default assumption
  }

  extractTargetTimeHorizon(goal, metrics) {
    if (goal.includes('long-term') || goal.includes('career') || goal.includes('mastery')) {
      return 'strategic';
    }
    if (
      goal.includes('professional') ||
      metrics.some(m => m.includes('career') || m.includes('industry'))
    ) {
      return 'planning';
    }
    return 'planning'; // Default
  }

  extractTargetBeliefs(goal) {
    const beliefs = [];

    if (goal.includes('creative') || goal.includes('innovative')) {
      beliefs.push('I am creative and innovative');
    }
    if (goal.includes('help') || goal.includes('impact') || goal.includes('service')) {
      beliefs.push('I create value for others');
    }
    if (goal.includes('expert') || goal.includes('master')) {
      beliefs.push('I am capable of mastery');
    }
    if (goal.includes('professional') || goal.includes('career')) {
      beliefs.push('I am a professional in my field');
    }

    // Default empowering beliefs
    beliefs.push('I can achieve my goals');
    beliefs.push('I continuously learn and grow');

    return beliefs;
  }

  extractTargetReputation(goal, metrics) {
    if (goal.includes('recognized') || goal.includes('known') || goal.includes('expert')) {
      return 'industry_expert';
    }
    if (
      goal.includes('professional') ||
      metrics.some(m => m.includes('portfolio') || m.includes('clients'))
    ) {
      return 'competent_professional';
    }
    return 'emerging_professional';
  }

  calculateTransformationProgress(currentIdentity, targetIdentity, completedTopics) {
    const dimensions = [
      'role',
      'skillLevel',
      'networkPosition',
      'resourceLevel',
      'confidenceLevel',
      'timeHorizon',
    ];

    let totalProgress = 0;
    const dimensionProgress = {};

    for (const dimension of dimensions) {
      const progress = this.calculateDimensionProgress(
        currentIdentity[dimension],
        targetIdentity[dimension],
        dimension,
        completedTopics
      );
      dimensionProgress[dimension] = progress;
      totalProgress += progress;
    }

    return {
      overall: (totalProgress / dimensions.length).toFixed(1),
      dimensions: dimensionProgress,
      keyAdvancement: this.identifyKeyAdvancement(dimensionProgress),
      nextPriorityDimension: this.identifyNextPriorityDimension(dimensionProgress),
    };
  }

  calculateDimensionProgress(current, target, dimension, completedTopics) {
    // This is a simplified calculation - in reality, this would be more sophisticated

    if (dimension === 'confidenceLevel') {
      const currentLevel = typeof current === 'object' ? current.level : current;
      const progressMap = { low: 0, moderate: 50, high: 100 };
      const currentScore = progressMap[currentLevel] || 0;
      const targetScore = progressMap[target] || 100;
      return Math.min(100, (currentScore / targetScore) * 100);
    }

    if (dimension === 'skillLevel') {
      const currentLevel = typeof current === 'object' ? current.level : current;
      const progressMap = {
        novice: 0,
        beginner: 25,
        intermediate: 50,
        competent: 75,
        professional: 90,
        expert: 100,
      };
      const currentScore = progressMap[currentLevel] || 0;
      const targetScore = progressMap[target] || 100;
      return Math.min(100, (currentScore / targetScore) * 100);
    }

    if (dimension === 'networkPosition') {
      const currentPos = typeof current === 'object' ? current.position : current;
      const progressMap = {
        isolated: 0,
        emerging: 25,
        connected: 50,
        influential: 75,
        central: 100,
      };
      const currentScore = progressMap[currentPos] || 0;
      const targetScore = progressMap[target] || 100;
      return Math.min(100, (currentScore / targetScore) * 100);
    }

    // For other dimensions, use a basic comparison
    if (current === target) {
      return 100;
    }
    if (typeof current === 'string' && typeof target === 'string') {
      return current.includes(target) || target.includes(current) ? 70 : 30;
    }

    return 50; // Default middle progress
  }

  identifyKeyAdvancement(dimensionProgress) {
    let maxProgress = 0;
    let keyDimension = '';

    for (const [dimension, progress] of Object.entries(dimensionProgress)) {
      if (progress > maxProgress) {
        maxProgress = progress;
        keyDimension = dimension;
      }
    }

    return {
      dimension: keyDimension.replace(/([A-Z])/g, ' $1').toLowerCase(),
      progress: maxProgress,
    };
  }

  identifyNextPriorityDimension(dimensionProgress) {
    let minProgress = 100;
    let priorityDimension = '';

    for (const [dimension, progress] of Object.entries(dimensionProgress)) {
      if (progress < minProgress) {
        minProgress = progress;
        priorityDimension = dimension;
      }
    }

    return {
      dimension: priorityDimension.replace(/([A-Z])/g, ' $1').toLowerCase(),
      progress: minProgress,
    };
  }

  generateMicroShifts(currentIdentity, targetIdentity, transformationProgress) {
    const microShifts = [];
    const priorityDimension = transformationProgress.nextPriorityDimension.dimension;

    // Generate micro-shifts based on the dimension that needs most work
    if (priorityDimension.includes('confidence')) {
      microShifts.push({
        type: 'belief_shift',
        current: 'I might be able to do this',
        target: 'I am becoming capable in this area',
        action: 'Complete a task that feels slightly challenging but achievable',
      });
    }

    if (priorityDimension.includes('network')) {
      microShifts.push({
        type: 'behavior_shift',
        current: 'I work alone',
        target: 'I connect with others in my field',
        action: 'Reach out to one person in your target field this week',
      });
    }

    if (priorityDimension.includes('skill')) {
      microShifts.push({
        type: 'identity_shift',
        current: 'I am learning about X',
        target: 'I am developing expertise in X',
        action: 'Focus on progressively more advanced topics in your core skill area',
      });
    }

    if (priorityDimension.includes('resource')) {
      microShifts.push({
        type: 'mindset_shift',
        current: 'I need resources to progress',
        target: 'I can create value with current resources',
        action: 'Find ways to create value or impact with what you currently have',
      });
    }

    // Always include a foundational micro-shift
    microShifts.push({
      type: 'foundational_shift',
      current: 'I am trying to become X',
      target: 'I am already becoming X through my actions',
      action: 'Act as if you already are becoming your target identity',
    });

    return microShifts.slice(0, 3); // Return top 3 micro-shifts
  }

  analyzeIdentityBarriers(currentIdentity, targetIdentity, completedTopics) {
    const barriers = [];

    // Confidence barriers
    if (currentIdentity.confidenceLevel.level === 'low') {
      barriers.push({
        type: 'confidence_barrier',
        description: 'Low confidence may be limiting progress',
        solution: 'Focus on easier wins to build confidence momentum',
      });
    }

    // Resource barriers
    if (currentIdentity.resourceAccess.overall === 'low') {
      barriers.push({
        type: 'resource_barrier',
        description: 'Limited resources may be constraining growth',
        solution: 'Focus on high-impact, low-cost learning strategies',
      });
    }

    // Network barriers
    if (currentIdentity.networkPosition.position === 'isolated') {
      barriers.push({
        type: 'network_barrier',
        description: 'Limited professional network',
        solution: 'Actively engage with communities in your target field',
      });
    }

    // Time horizon barriers
    if (
      currentIdentity.timeHorizonThinking === 'immediate' &&
      targetIdentity.timeHorizon === 'strategic'
    ) {
      barriers.push({
        type: 'planning_barrier',
        description: 'Short-term thinking may limit strategic progress',
        solution: 'Practice longer-term planning and strategic thinking',
      });
    }

    return barriers;
  }

  calculateNextMilestone(currentIdentity, targetIdentity) {
    // Determine the most achievable next milestone
    const skillGap = this.calculateSkillGap(currentIdentity.skillAreas, targetIdentity.skillLevel);
    const networkGap = this.calculateNetworkGap(
      currentIdentity.networkPosition,
      targetIdentity.networkPosition
    );
    const confidenceGap = this.calculateConfidenceGap(
      currentIdentity.confidenceLevel,
      targetIdentity.confidenceLevel
    );

    // Choose the milestone with the smallest gap (most achievable)
    const gaps = [
      { type: 'skill', gap: skillGap, milestone: 'Reach intermediate level in core skill' },
      { type: 'network', gap: networkGap, milestone: 'Make first professional connections' },
      {
        type: 'confidence',
        gap: confidenceGap,
        milestone: 'Build confidence through consistent wins',
      },
    ];

    gaps.sort((a, b) => a.gap - b.gap);

    return {
      type: gaps[0].type,
      description: gaps[0].milestone,
      estimatedTimeframe: this.estimateTimeframe(gaps[0].gap),
      keyActions: this.generateMilestoneActions(gaps[0].type),
    };
  }

  calculateSkillGap(currentSkills, targetLevel) {
    const skillLevels = {
      novice: 1,
      beginner: 2,
      intermediate: 3,
      competent: 4,
      professional: 5,
      expert: 6,
    };
    const targetScore = skillLevels[targetLevel] || 4;

    const currentMaxSkill = Math.max(
      ...Object.values(currentSkills).map(level => skillLevels[level] || 1)
    );

    return Math.max(0, targetScore - currentMaxSkill);
  }

  calculateNetworkGap(current, target) {
    const networkLevels = { isolated: 1, emerging: 2, connected: 3, influential: 4, central: 5 };
    const currentScore = networkLevels[current.position] || 1;
    const targetScore = networkLevels[target] || 3;

    return Math.max(0, targetScore - currentScore);
  }

  calculateConfidenceGap(current, target) {
    const confidenceLevels = { low: 1, moderate: 2, high: 3 };
    const currentScore = confidenceLevels[current.level] || 1;
    const targetScore = confidenceLevels[target] || 3;

    return Math.max(0, targetScore - currentScore);
  }

  estimateTimeframe(gap) {
    if (gap <= 1) {
      return '2-4 weeks';
    }
    if (gap <= 2) {
      return '1-3 months';
    }
    if (gap <= 3) {
      return '3-6 months';
    }
    return '6+ months';
  }

  generateMilestoneActions(milestoneType) {
    const actions = {
      skill: [
        'Focus on progressive skill development tasks',
        'Seek feedback on your work',
        'Practice consistently in your core area',
      ],
      network: [
        'Join professional communities or forums',
        'Reach out to one person in your field per week',
        'Share your learning journey publicly',
      ],
      confidence: [
        'Set and achieve small, clear goals',
        'Celebrate your learning victories',
        'Focus on tasks slightly above your comfort zone',
      ],
    };

    return actions[milestoneType] || ['Continue current learning path'];
  }

  formatIdentityReport(analysis) {
    let report = '🎭 **Identity Transformation Analysis**\n\n';

    // Current identity
    report += '**Current Identity**:\n';
    report += `• Role: ${analysis.currentIdentity.professionalRole}\n`;
    report += `• Experience: ${analysis.currentIdentity.experienceLevel.level} (${analysis.currentIdentity.experienceLevel.tasksCompleted} tasks)\n`;
    report += `• Confidence: ${analysis.currentIdentity.confidenceLevel.level}\n`;
    report += `• Network: ${analysis.currentIdentity.networkPosition.position}\n`;
    report += `• Key Skills: ${Object.keys(analysis.currentIdentity.skillAreas).join(', ') || 'Developing'}\n\n`;

    // Target identity
    report += '**Target Identity**:\n';
    report += `• Role: ${analysis.targetIdentity.role}\n`;
    report += `• Skill Level: ${analysis.targetIdentity.skillLevel}\n`;
    report += `• Network Position: ${analysis.targetIdentity.networkPosition}\n`;
    report += `• Reputation: ${analysis.targetIdentity.professionalReputation}\n\n`;

    // Transformation progress
    report += `**Transformation Progress**: ${analysis.transformationProgress.overall}%\n`;
    report += `• Strongest area: ${analysis.transformationProgress.keyAdvancement.dimension} (${analysis.transformationProgress.keyAdvancement.progress.toFixed(0)}%)\n`;
    report += `• Next priority: ${analysis.transformationProgress.nextPriorityDimension.dimension} (${analysis.transformationProgress.nextPriorityDimension.progress.toFixed(0)}%)\n\n`;

    // Micro-shifts
    report += '**Recommended Micro-Shifts**:\n';
    for (const shift of analysis.microShifts) {
      report += `🎯 **${shift.type.replace(/_/g, ' ')}**:\n`;
      report += `   From: "${shift.current}"\n`;
      report += `   To: "${shift.target}"\n`;
      report += `   Action: ${shift.action}\n\n`;
    }

    // Next milestone
    report += '**Next Identity Milestone**:\n';
    report += `🎯 ${analysis.nextIdentityMilestone.description}\n`;
    report += `⏱️ Estimated timeframe: ${analysis.nextIdentityMilestone.estimatedTimeframe}\n`;
    report += '**Key Actions**:\n';
    for (const action of analysis.nextIdentityMilestone.keyActions) {
      report += `• ${action}\n`;
    }

    // Barriers
    if (analysis.barriers.length > 0) {
      report += '\n**Identity Barriers to Address**:\n';
      for (const barrier of analysis.barriers) {
        report += `⚠️ **${barrier.type.replace(/_/g, ' ')}**: ${barrier.description}\n`;
        report += `   💡 Solution: ${barrier.solution}\n`;
      }
    }

    return report;
  }

  async loadLearningHistory(projectId, pathName) {
    try {
      return await this.dataPersistence.loadProjectData(projectId, 'learning_history.json');
    } catch (error) {
      return null;
    }
  }

  /**
   * Enhanced Background Identity Reflection System
   * Performs deep identity analysis for proactive self-awareness and strategic alignment
   */

  /**
   * Perform comprehensive background reflection on identity evolution
   * @param {Object} systemState - Complete system state from SystemClock
   * @returns {Object} Identity reflection analysis
   */
  async performBackgroundReflection(systemState) {
    logger.info('🧘 IdentityEngine: Performing background identity reflection...');

    try {
      const { projectId, config, learningHistory, htaData, metrics } = systemState;

      if (!config || !learningHistory) {
        return {
          error: 'Insufficient data for identity reflection',
          timestamp: new Date().toISOString(),
        };
      }

      // Perform comprehensive identity analysis
      const identityAnalysis = await this.performIdentityAnalysis(projectId, config);

      // Add strategic identity insights
      const strategicInsights = this.generateStrategicIdentityInsights(
        identityAnalysis,
        learningHistory,
        htaData,
        metrics
      );

      // Identify identity risks and opportunities
      const identityRisks = this.identifyIdentityRisks(identityAnalysis, learningHistory, metrics);
      const identityOpportunities = this.identifyIdentityOpportunities(
        identityAnalysis,
        learningHistory,
        htaData
      );

      // Generate proactive identity strategies
      const proactiveStrategies = this.generateProactiveIdentityStrategies(
        identityAnalysis,
        strategicInsights,
        identityRisks,
        identityOpportunities
      );

      return {
        baseAnalysis: identityAnalysis,
        strategicInsights,
        identityRisks,
        identityOpportunities,
        proactiveStrategies,
        reflectionSummary: this.generateReflectionSummary(identityAnalysis, strategicInsights),
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('❌ Background identity reflection failed', { error });
      await this.dataPersistence.logError('IdentityEngine.performBackgroundReflection', error);
      return {
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Generate strategic identity insights for long-term development
   * @param {Object} identityAnalysis - Base identity analysis
   * @param {Object} learningHistory - Learning history data
   * @param {Object} htaData - HTA structure data
   * @param {Object} metrics - System metrics
   * @returns {Object} Strategic insights
   */
  generateStrategicIdentityInsights(identityAnalysis, learningHistory, htaData, metrics) {
    const insights = [];
    const { currentIdentity, targetIdentity, transformationProgress } = identityAnalysis;

    // Insight 1: Identity Momentum Analysis
    const momentumInsight = this.analyzeIdentityMomentum(transformationProgress, metrics);
    if (momentumInsight) {
      insights.push(momentumInsight);
    }

    // Insight 2: Identity Coherence Assessment
    const coherenceInsight = this.analyzeIdentityCoherence(currentIdentity, learningHistory);
    if (coherenceInsight) {
      insights.push(coherenceInsight);
    }

    // Insight 3: Strategic Positioning Analysis
    const positioningInsight = this.analyzeStrategicPositioning(
      currentIdentity,
      targetIdentity,
      htaData
    );
    if (positioningInsight) {
      insights.push(positioningInsight);
    }

    // Insight 4: Identity Authenticity Check
    const authenticityInsight = this.analyzeIdentityAuthenticity(currentIdentity, learningHistory);
    if (authenticityInsight) {
      insights.push(authenticityInsight);
    }

    // Insight 5: Future Self Readiness
    const readinessInsight = this.analyzeFutureSelfReadiness(identityAnalysis, metrics);
    if (readinessInsight) {
      insights.push(readinessInsight);
    }

    return {
      insights,
      overallAssessment: this.calculateOverallIdentityAssessment(insights),
      keyDevelopmentAreas: this.identifyKeyDevelopmentAreas(insights),
      strengthAreas: this.identifyStrengthAreas(insights),
    };
  }

  /**
   * Identify potential identity-related risks
   * @param {Object} identityAnalysis - Identity analysis data
   * @param {Object} learningHistory - Learning history
   * @param {Object} metrics - System metrics
   * @returns {Array} Identity risks
   */
  identifyIdentityRisks(identityAnalysis, learningHistory, metrics) {
    const risks = [];
    const { currentIdentity, targetIdentity, transformationProgress } = identityAnalysis;

    // Risk 1: Identity Fragmentation
    const fragmentationRisk = this.detectIdentityFragmentation(currentIdentity, learningHistory);
    if (fragmentationRisk) {
      risks.push(fragmentationRisk);
    }

    // Risk 2: Imposter Syndrome
    const imposterRisk = this.detectImposterSyndrome(currentIdentity, transformationProgress);
    if (imposterRisk) {
      risks.push(imposterRisk);
    }

    // Risk 3: Identity Stagnation
    const stagnationRisk = this.detectIdentityStagnation(transformationProgress, metrics);
    if (stagnationRisk) {
      risks.push(stagnationRisk);
    }

    // Risk 4: Goal-Identity Misalignment
    const misalignmentRisk = this.detectGoalIdentityMisalignment(currentIdentity, targetIdentity);
    if (misalignmentRisk) {
      risks.push(misalignmentRisk);
    }

    // Risk 5: Confidence Erosion
    const confidenceRisk = this.detectConfidenceErosion(currentIdentity, learningHistory);
    if (confidenceRisk) {
      risks.push(confidenceRisk);
    }

    return risks;
  }

  /**
   * Identify identity development opportunities
   * @param {Object} identityAnalysis - Identity analysis data
   * @param {Object} learningHistory - Learning history
   * @param {Object} htaData - HTA data
   * @returns {Array} Identity opportunities
   */
  identifyIdentityOpportunities(identityAnalysis, learningHistory, htaData) {
    const opportunities = [];
    const { currentIdentity, targetIdentity, transformationProgress } = identityAnalysis;

    // Opportunity 1: Identity Integration
    const integrationOpp = this.detectIdentityIntegrationOpportunity(
      currentIdentity,
      learningHistory
    );
    if (integrationOpp) {
      opportunities.push(integrationOpp);
    }

    // Opportunity 2: Expertise Emergence
    const expertiseOpp = this.detectExpertiseEmergenceOpportunity(
      currentIdentity,
      transformationProgress
    );
    if (expertiseOpp) {
      opportunities.push(expertiseOpp);
    }

    // Opportunity 3: Network Leverage
    const networkOpp = this.detectNetworkLeverageOpportunity(currentIdentity, targetIdentity);
    if (networkOpp) {
      opportunities.push(networkOpp);
    }

    // Opportunity 4: Identity Breakthrough
    const breakthroughOpp = this.detectIdentityBreakthroughOpportunity(
      transformationProgress,
      learningHistory
    );
    if (breakthroughOpp) {
      opportunities.push(breakthroughOpp);
    }

    // Opportunity 5: Strategic Positioning
    const positioningOpp = this.detectStrategicPositioningOpportunity(currentIdentity, htaData);
    if (positioningOpp) {
      opportunities.push(positioningOpp);
    }

    return opportunities;
  }

  /**
   * Generate proactive identity development strategies
   */
  generateProactiveIdentityStrategies(
    identityAnalysis,
    strategicInsights,
    identityRisks,
    identityOpportunities
  ) {
    const strategies = [];

    // Strategy 1: Identity Reinforcement
    if (strategicInsights.strengthAreas?.length > 0) {
      strategies.push({
        type: 'identity_reinforcement',
        title: 'Strengthen Core Identity Elements',
        description: `Focus on reinforcing ${strategicInsights.strengthAreas[0]} to build confidence and momentum.`,
        priority: 'medium',
        timeframe: '2-3 weeks',
        actions: this.generateIdentityReinforcementActions(strategicInsights.strengthAreas),
      });
    }

    // Strategy 2: Risk Mitigation
    const highPriorityRisks = identityRisks.filter(r => r.priority === 'high');
    if (highPriorityRisks.length > 0) {
      strategies.push({
        type: 'risk_mitigation',
        title: 'Address Identity Risks',
        description: `Proactively address ${highPriorityRisks[0].type} to prevent identity development setbacks.`,
        priority: 'high',
        timeframe: 'immediate',
        actions: this.generateRiskMitigationActions(highPriorityRisks),
      });
    }

    // Strategy 3: Opportunity Capitalization
    const highValueOpps = identityOpportunities.filter(o => o.value === 'high');
    if (highValueOpps.length > 0) {
      strategies.push({
        type: 'opportunity_capitalization',
        title: 'Capitalize on Identity Opportunities',
        description: `Leverage ${highValueOpps[0].type} for accelerated identity development.`,
        priority: 'high',
        timeframe: 'next 1-2 weeks',
        actions: this.generateOpportunityActions(highValueOpps),
      });
    }

    // Strategy 4: Identity Integration
    if (
      identityAnalysis.currentIdentity.skillAreas &&
      Object.keys(identityAnalysis.currentIdentity.skillAreas).length >= 3
    ) {
      strategies.push({
        type: 'identity_integration',
        title: 'Integrate Diverse Skills',
        description:
          'Create synergies between different skill areas to develop unique identity positioning.',
        priority: 'medium',
        timeframe: '1 month',
        actions: this.generateIntegrationActions(identityAnalysis.currentIdentity.skillAreas),
      });
    }

    return strategies;
  }

  // Strategic Insight Analysis Methods

  analyzeIdentityMomentum(transformationProgress, metrics) {
    const progressScore = transformationProgress.overallProgress || 0;
    const momentum = metrics.momentum || 0;

    if (progressScore >= 0.7 && momentum >= 3) {
      return {
        type: 'identity_momentum_high',
        title: 'Strong Identity Development Momentum',
        insight: `${(progressScore * 100).toFixed(0)}% transformation progress with ${momentum} recent completions. Identity development is accelerating.`,
        confidence: 0.9,
        strategicImplication:
          'This is an optimal time for ambitious identity challenges and public positioning.',
      };
    } else if (progressScore <= 0.3 && momentum <= 1) {
      return {
        type: 'identity_momentum_low',
        title: 'Identity Development Needs Activation',
        insight: `Low transformation progress (${(progressScore * 100).toFixed(0)}%) with minimal recent activity. Identity development is stalled.`,
        confidence: 0.8,
        strategicImplication:
          'Focus on small, consistent actions to rebuild identity development momentum.',
      };
    }

    return null;
  }

  analyzeIdentityCoherence(currentIdentity, learningHistory) {
    if (!learningHistory.completedTopics || learningHistory.completedTopics.length < 5) {
      return null;
    }

    const skillAreas = Object.keys(currentIdentity.skillAreas || {});
    const recentTopics = learningHistory.completedTopics.slice(-10);
    const topicBranches = new Set(recentTopics.map(t => t.branch || 'general'));

    if (skillAreas.length >= 3 && topicBranches.size >= 3) {
      return {
        type: 'identity_coherence_integrated',
        title: 'Multi-Dimensional Identity Emerging',
        insight: `Developing coherent multi-skill identity across ${skillAreas.length} areas. Recent learning spans ${topicBranches.size} branches.`,
        confidence: 0.8,
        strategicImplication:
          'Strong foundation for unique value proposition and differentiated positioning.',
      };
    } else if (skillAreas.length === 1 && topicBranches.size === 1) {
      return {
        type: 'identity_coherence_focused',
        title: 'Highly Focused Identity Development',
        insight: `Deep specialization in ${skillAreas[0]} with concentrated learning focus. Building expert-level identity.`,
        confidence: 0.9,
        strategicImplication:
          'Well-positioned for deep expertise but may benefit from strategic diversification.',
      };
    }

    return null;
  }

  analyzeStrategicPositioning(currentIdentity, targetIdentity, htaData) {
    if (!htaData || !htaData.primaryGoal) {
      return null;
    }

    const currentRole = currentIdentity.professionalRole;
    const targetRole = targetIdentity.professionalRole;
    const confidenceLevel = currentIdentity.confidenceLevel?.level || 0;

    if (currentRole !== targetRole && confidenceLevel >= 4) {
      return {
        type: 'strategic_positioning_transitioning',
        title: 'Strategic Identity Transition in Progress',
        insight: `Transitioning from ${currentRole} to ${targetRole} with high confidence (${confidenceLevel}/5). Strong foundation for role evolution.`,
        confidence: 0.8,
        strategicImplication:
          'Ready for increased visibility and leadership opportunities in target domain.',
      };
    } else if (currentRole === targetRole && confidenceLevel >= 4) {
      return {
        type: 'strategic_positioning_established',
        title: 'Established Professional Identity',
        insight: `Strong ${currentRole} identity with high confidence. Identity alignment achieved.`,
        confidence: 0.9,
        strategicImplication: 'Focus on influence expansion and thought leadership opportunities.',
      };
    }

    return null;
  }

  analyzeIdentityAuthenticity(currentIdentity, learningHistory) {
    if (!learningHistory.completedTopics) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-8);
    const avgEnergy =
      recentTasks.reduce((sum, t) => sum + (t.energyAfter || 3), 0) / recentTasks.length;
    const breakthroughRate = recentTasks.filter(t => t.breakthrough).length / recentTasks.length;
    const coreBeliefs = currentIdentity.coreBeliefs || [];

    if (
      avgEnergy >= 4 &&
      breakthroughRate >= 0.25 &&
      coreBeliefs.includes('Learning energizes me')
    ) {
      return {
        type: 'identity_authenticity_aligned',
        title: 'Authentic Identity Expression',
        insight: `High energy (${avgEnergy.toFixed(1)}/5) and breakthrough rate (${(breakthroughRate * 100).toFixed(0)}%) indicate authentic identity alignment.`,
        confidence: 0.9,
        strategicImplication:
          'Current path strongly aligned with authentic self. Continue with confidence.',
      };
    } else if (avgEnergy <= 2.5) {
      return {
        type: 'identity_authenticity_misaligned',
        title: 'Potential Identity-Activity Misalignment',
        insight: `Lower energy levels (${avgEnergy.toFixed(1)}/5) may indicate disconnect between activities and authentic identity.`,
        confidence: 0.7,
        strategicImplication:
          'Consider adjusting approach to better align with natural strengths and interests.',
      };
    }

    return null;
  }

  analyzeFutureSelfReadiness(identityAnalysis, metrics) {
    const progressScore = identityAnalysis.transformationProgress.overallProgress || 0;
    const nextMilestone = identityAnalysis.nextIdentityMilestone;
    const momentum = metrics.momentum || 0;

    if (progressScore >= 0.6 && momentum >= 3 && nextMilestone?.timeframe === 'near-term') {
      return {
        type: 'future_self_readiness_high',
        title: 'Approaching Identity Milestone',
        insight: `${(progressScore * 100).toFixed(0)}% progress toward target identity with strong momentum. Next milestone: ${nextMilestone.type}.`,
        confidence: 0.9,
        strategicImplication:
          'Prepare for identity milestone achievement and subsequent strategic positioning.',
      };
    }

    return null;
  }

  // Risk Detection Methods

  detectIdentityFragmentation(currentIdentity, learningHistory) {
    const skillAreas = Object.keys(currentIdentity.skillAreas || {});
    const recentTopics = learningHistory.completedTopics?.slice(-15) || [];
    const branches = new Set(recentTopics.map(t => t.branch || 'general'));

    if (
      skillAreas.length >= 4 &&
      branches.size >= 5 &&
      recentTopics.filter(t => t.breakthrough).length === 0
    ) {
      return {
        type: 'identity_fragmentation',
        title: 'Identity Fragmentation Risk',
        message: `Learning across ${branches.size} areas without clear integration or breakthroughs. Risk of scattered identity development.`,
        priority: 'medium',
        recommendation:
          'Focus on creating connections between learning areas to develop coherent identity narrative.',
      };
    }

    return null;
  }

  detectImposterSyndrome(currentIdentity, transformationProgress) {
    const confidenceLevel = currentIdentity.confidenceLevel?.level || 0;
    const progressScore = transformationProgress.overallProgress || 0;
    const experienceLevel = currentIdentity.experienceLevel?.level;

    if (progressScore >= 0.5 && confidenceLevel <= 2.5 && experienceLevel !== 'novice') {
      return {
        type: 'imposter_syndrome',
        title: 'Potential Imposter Syndrome',
        message: `Good progress (${(progressScore * 100).toFixed(0)}%) but low confidence (${confidenceLevel}/5). May be undervaluing achievements.`,
        priority: 'high',
        recommendation:
          'Document and celebrate achievements to build confidence. Seek external validation and feedback.',
      };
    }

    return null;
  }

  detectIdentityStagnation(transformationProgress, metrics) {
    const progressScore = transformationProgress.overallProgress || 0;
    const momentum = metrics.momentum || 0;
    const lastActivityDays = metrics.lastActivityDays || 0;

    if (progressScore <= 0.3 && momentum <= 1 && lastActivityDays >= 5) {
      return {
        type: 'identity_stagnation',
        title: 'Identity Development Stagnation',
        message: `Low progress (${(progressScore * 100).toFixed(0)}%) and minimal recent activity (${lastActivityDays} days since last task).`,
        priority: 'high',
        recommendation:
          'Re-engage with identity development through small, achievable tasks. Review and refresh goals.',
      };
    }

    return null;
  }

  detectGoalIdentityMisalignment(currentIdentity, targetIdentity) {
    const currentRole = currentIdentity.professionalRole;
    const targetRole = targetIdentity.professionalRole;
    const currentBeliefs = currentIdentity.coreBeliefs || [];
    const targetBeliefs = targetIdentity.coreBeliefs || [];

    const beliefAlignment = targetBeliefs.filter(belief =>
      currentBeliefs.some(current => current.toLowerCase().includes(belief.toLowerCase()))
    ).length;

    if (currentRole !== targetRole && beliefAlignment / targetBeliefs.length < 0.5) {
      return {
        type: 'goal_identity_misalignment',
        title: 'Goal-Identity Misalignment',
        message: `Current identity (${currentRole}) and target identity (${targetRole}) show limited belief alignment (${beliefAlignment}/${targetBeliefs.length}).`,
        priority: 'medium',
        recommendation:
          'Clarify how current identity strengths can bridge to target identity. Adjust goals or strengthen alignment.',
      };
    }

    return null;
  }

  detectConfidenceErosion(currentIdentity, learningHistory) {
    if (!learningHistory.completedTopics || learningHistory.completedTopics.length < 5) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-6);
    const confidenceLevel = currentIdentity.confidenceLevel?.level || 0;
    const avgDifficultyRating =
      recentTasks.reduce((sum, t) => sum + (t.difficultyRating || 3), 0) / recentTasks.length;

    if (confidenceLevel <= 2.5 && avgDifficultyRating >= 4) {
      return {
        type: 'confidence_erosion',
        title: 'Confidence Under Pressure',
        message: `Low confidence (${confidenceLevel}/5) despite tackling challenging tasks (avg difficulty rating: ${avgDifficultyRating.toFixed(1)}).`,
        priority: 'high',
        recommendation:
          'Balance challenging tasks with confidence-building activities. Acknowledge difficulty achievements.',
      };
    }

    return null;
  }

  // Opportunity Detection Methods

  detectIdentityIntegrationOpportunity(currentIdentity, learningHistory) {
    const skillAreas = Object.keys(currentIdentity.skillAreas || {});
    const recentBreakthroughs = learningHistory.completedTopics?.filter(t => t.breakthrough) || [];

    if (skillAreas.length >= 3 && recentBreakthroughs.length >= 2) {
      return {
        type: 'identity_integration',
        title: 'Skill Integration Opportunity',
        description: `Multiple skill areas (${skillAreas.join(', ')}) with recent breakthroughs create integration potential.`,
        value: 'high',
        actionable: true,
        recommendation:
          'Create projects that combine skills to develop unique identity positioning.',
      };
    }

    return null;
  }

  detectExpertiseEmergenceOpportunity(currentIdentity, transformationProgress) {
    const skillAreas = currentIdentity.skillAreas || {};
    const advancedSkills = Object.entries(skillAreas).filter(([_, level]) => level === 'advanced');
    const progressScore = transformationProgress.overallProgress || 0;

    if (advancedSkills.length >= 1 && progressScore >= 0.6) {
      return {
        type: 'expertise_emergence',
        title: 'Expertise Recognition Opportunity',
        description: `Advanced level in ${advancedSkills[0][0]} with strong overall progress. Ready for expert positioning.`,
        value: 'high',
        actionable: true,
        recommendation:
          'Increase visibility through thought leadership, teaching, or public demonstration of expertise.',
      };
    }

    return null;
  }

  detectNetworkLeverageOpportunity(currentIdentity, targetIdentity) {
    const currentNetwork = currentIdentity.networkPosition || {};
    const targetNetwork = targetIdentity.networkPosition || {};
    const confidenceLevel = currentIdentity.confidenceLevel?.level || 0;

    if (confidenceLevel >= 4 && currentNetwork.score < targetNetwork.score) {
      return {
        type: 'network_leverage',
        title: 'Network Expansion Opportunity',
        description: `High confidence (${confidenceLevel}/5) creates foundation for strategic network expansion.`,
        value: 'medium',
        actionable: true,
        recommendation:
          'Leverage current confidence to engage with higher-level networks and communities.',
      };
    }

    return null;
  }

  detectIdentityBreakthroughOpportunity(transformationProgress, learningHistory) {
    const progressScore = transformationProgress.overallProgress || 0;
    const recentBreakthroughs =
      learningHistory.completedTopics?.slice(-5).filter(t => t.breakthrough) || [];

    if (progressScore >= 0.4 && progressScore <= 0.7 && recentBreakthroughs.length >= 2) {
      return {
        type: 'identity_breakthrough',
        title: 'Identity Breakthrough Window',
        description: `Mid-stage progress (${(progressScore * 100).toFixed(0)}%) with recent breakthrough momentum creates transformation potential.`,
        value: 'high',
        actionable: true,
        recommendation:
          'Pursue stretch challenges that could catalyze significant identity advancement.',
      };
    }

    return null;
  }

  detectStrategicPositioningOpportunity(currentIdentity, htaData) {
    const skillAreas = currentIdentity.skillAreas || {};
    const confidenceLevel = currentIdentity.confidenceLevel?.level || 0;
    const professionalRole = currentIdentity.professionalRole;

    if (
      Object.keys(skillAreas).length >= 2 &&
      confidenceLevel >= 3.5 &&
      professionalRole !== 'learner'
    ) {
      return {
        type: 'strategic_positioning',
        title: 'Strategic Positioning Opportunity',
        description: `Multi-skill development with solid confidence enables unique market positioning as ${professionalRole}.`,
        value: 'medium',
        actionable: true,
        recommendation:
          'Develop and communicate unique value proposition based on skill combination.',
      };
    }

    return null;
  }

  // Utility Methods

  calculateOverallIdentityAssessment(insights) {
    if (insights.length === 0) {
      return 'developing';
    }

    const positiveInsights = insights.filter(
      i => i.type.includes('high') || i.type.includes('strong') || i.type.includes('aligned')
    ).length;

    if (positiveInsights >= 3) {
      return 'thriving';
    }
    if (positiveInsights >= 2) {
      return 'progressing';
    }
    if (positiveInsights >= 1) {
      return 'developing';
    }
    return 'foundational';
  }

  identifyKeyDevelopmentAreas(insights) {
    return insights
      .filter(i => i.strategicImplication && !i.type.includes('high'))
      .map(i => i.title)
      .slice(0, 3);
  }

  identifyStrengthAreas(insights) {
    return insights
      .filter(i => i.type.includes('high') || i.type.includes('strong') || i.confidence >= 0.8)
      .map(i => i.title)
      .slice(0, 3);
  }

  generateReflectionSummary(identityAnalysis, strategicInsights) {
    const { currentIdentity, transformationProgress } = identityAnalysis;
    const progressPercent = (transformationProgress.overallProgress * 100).toFixed(0);
    const insightCount = strategicInsights.insights.length;

    return {
      currentState: `${currentIdentity.professionalRole} with ${progressPercent}% transformation progress`,
      insightCount,
      overallAssessment: strategicInsights.overallAssessment,
      keyFocus: strategicInsights.keyDevelopmentAreas[0] || 'Continue current development',
      confidence: transformationProgress.overallProgress >= 0.5 ? 'building' : 'emerging',
    };
  }

  // Action Generation Methods

  generateIdentityReinforcementActions(strengthAreas) {
    return strengthAreas.slice(0, 2).map(area => ({
      action: `Leverage ${area.toLowerCase()} in upcoming challenges`,
      timeframe: '1 week',
    }));
  }

  generateRiskMitigationActions(risks) {
    return risks.slice(0, 2).map(risk => ({
      action: risk.recommendation,
      priority: risk.priority,
      timeframe: 'immediate',
    }));
  }

  generateOpportunityActions(opportunities) {
    return opportunities.slice(0, 2).map(opp => ({
      action: opp.recommendation,
      value: opp.value,
      timeframe: '1-2 weeks',
    }));
  }

  generateIntegrationActions(skillAreas) {
    const skills = Object.keys(skillAreas).slice(0, 3);
    return [
      {
        action: `Create project combining ${skills[0]} and ${skills[1]}`,
        timeframe: '2 weeks',
      },
      {
        action: 'Develop unique approach leveraging all skill areas',
        timeframe: '1 month',
      },
    ];
  }
}
