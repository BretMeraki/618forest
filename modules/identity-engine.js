/**
 * Identity Engine Module
 * Handles identity transformation and pathway analysis
 */

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
        content: [{
          type: 'text',
          text: reportText
        }],
        identity_analysis: analysis
      };
    } catch (error) {
      await this.dataPersistence.logError('analyzeIdentityTransformation', error);
      return {
        content: [{
          type: 'text',
          text: `Error analyzing identity transformation: ${error.message}`
        }]
      };
    }
  }

  async performIdentityAnalysis(projectId, config) {
    const activePath = config.activePath || 'general';
    const learningHistory = await this.loadLearningHistory(projectId, activePath) || {};
    const completedTopics = learningHistory.completedTopics || [];

    // Analyze current identity
    const currentIdentity = this.analyzeCurrentIdentity(config, completedTopics);

    // Determine target identity
    const targetIdentity = this.determineTargetIdentity(config.goal, config.success_metrics);

    // Calculate transformation progress
    const transformationProgress = this.calculateTransformationProgress(currentIdentity, targetIdentity, completedTopics);

    // Generate micro-shifts
    const microShifts = this.generateMicroShifts(currentIdentity, targetIdentity, transformationProgress);

    // Analyze identity barriers
    const barriers = this.analyzeIdentityBarriers(currentIdentity, targetIdentity, completedTopics);

    return {
      currentIdentity,
      targetIdentity,
      transformationProgress,
      microShifts,
      barriers,
      nextIdentityMilestone: this.calculateNextMilestone(currentIdentity, targetIdentity)
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
      timeHorizonThinking: this.analyzeTimeHorizonThinking(completedTopics)
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
    const avgEnergy = completedTopics.reduce((sum, t) => sum + (t.energyAfter || 3), 0) / Math.max(completedTopics.length, 1);
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
      if (text.includes('communication') || text.includes('writing') || text.includes('presentation')) {
        skillAreas.communication = (skillAreas.communication || 0) + 1;
      }
    }

    // Convert to proficiency levels
    const proficiencies = {};
    for (const [area, count] of Object.entries(skillAreas)) {
      if (count >= 10) {proficiencies[area] = 'advanced';}
      else if (count >= 5) {proficiencies[area] = 'intermediate';}
      else if (count >= 2) {proficiencies[area] = 'beginner';}
      else {proficiencies[area] = 'novice';}
    }

    return proficiencies;
  }

  calculateExperienceLevel(completedTopics) {
    const totalTasks = completedTopics.length;
    const avgDifficulty = completedTopics.reduce((sum, t) => sum + (t.difficulty || 3), 0) / Math.max(totalTasks, 1);
    const breakthroughRate = completedTopics.filter(t => t.breakthrough).length / Math.max(totalTasks, 1);

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
      breakthroughRate: `${(breakthroughRate * 100).toFixed(0)}%`
    };
  }

  inferProfessionalRole(config, completedTopics) {
    const goal = config.goal?.toLowerCase() || '';
    const taskPatterns = completedTopics.map(t => t.topic.toLowerCase()).join(' ');

    // Pattern matching for professional roles
    if (goal.includes('entrepreneur') || taskPatterns.includes('business') || taskPatterns.includes('startup')) {
      return 'entrepreneur';
    } else if (goal.includes('developer') || taskPatterns.includes('programming') || taskPatterns.includes('web')) {
      return 'developer';
    } else if (goal.includes('musician') || taskPatterns.includes('music') || taskPatterns.includes('piano')) {
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
      const text = (`${topic.topic} ${topic.outcome}`).toLowerCase();

      if (text.includes('network') || text.includes('connect')) {networkScore += 2;}
      if (text.includes('collaborate') || text.includes('partner')) {
        networkScore += 2;
        collaborationCount += 1;
      }
      if (text.includes('community') || text.includes('group')) {networkScore += 1;}
      if (text.includes('mentor') || text.includes('teach')) {networkScore += 2;}
    }

    let position = 'isolated';
    if (networkScore >= 8) {position = 'central';}
    else if (networkScore >= 4) {position = 'connected';}
    else if (networkScore >= 2) {position = 'emerging';}

    return {
      position,
      score: networkScore,
      collaborationCount
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
      overall: this.calculateOverallResourceAccess(resourceLevel, hasTimeFlexibility)
    };
  }

  calculateOverallResourceAccess(financial, hasTimeFlexibility) {
    if (financial === 'abundant' && hasTimeFlexibility) {return 'high';}
    if (financial === 'moderate' || hasTimeFlexibility) {return 'medium';}
    return 'low';
  }

  calculateConfidenceLevel(completedTopics) {
    const recentTasks = completedTopics.slice(-10);
    let confidenceScore = 0;

    for (const task of recentTasks) {
      // High energy after task = confidence boost
      if ((task.energyAfter || 3) >= 4) {confidenceScore += 2;}

      // Breakthrough = major confidence boost
      if (task.breakthrough) {confidenceScore += 3;}

      // Completing difficult tasks = confidence boost
      if ((task.difficulty || 3) >= 4 && (task.difficultyRating || 3) <= 3) {
        confidenceScore += 2; // Handled difficulty well
      }

      // Task felt too easy = confidence in ability
      if ((task.difficultyRating || 3) <= 2) {confidenceScore += 1;}
    }

    const avgConfidence = confidenceScore / Math.max(recentTasks.length, 1);

    let level = 'low';
    if (avgConfidence >= 2.5) {level = 'high';}
    else if (avgConfidence >= 1.5) {level = 'moderate';}

    return {
      level,
      score: confidenceScore,
      recentBreakthroughs: recentTasks.filter(t => t.breakthrough).length
    };
  }

  analyzeTimeHorizonThinking(completedTopics) {
    let longestHorizon = 'immediate';

    for (const topic of completedTopics) {
      const text = (`${topic.topic} ${topic.learned}`).toLowerCase();

      if (text.includes('strategy') || text.includes('long-term') || text.includes('vision')) {
        longestHorizon = 'strategic';
      } else if (text.includes('plan') || text.includes('goal') || text.includes('future')) {
        if (longestHorizon === 'immediate') {longestHorizon = 'planning';}
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
      professionalReputation: this.extractTargetReputation(goalLower, metrics)
    };

    return targetIdentity;
  }

  extractTargetRole(goal) {
    if (goal.includes('entrepreneur') || goal.includes('founder')) {return 'entrepreneur';}
    if (goal.includes('developer') || goal.includes('programmer')) {return 'developer';}
    if (goal.includes('musician') || goal.includes('artist')) {return 'musician';}
    if (goal.includes('designer')) {return 'designer';}
    if (goal.includes('consultant') || goal.includes('expert')) {return 'consultant';}
    if (goal.includes('leader') || goal.includes('manager')) {return 'leader';}
    return 'professional'; // Default
  }

  extractTargetSkillLevel(goal, metrics) {
    if (goal.includes('expert') || goal.includes('master') || goal.includes('advanced')) {
      return 'expert';
    }
    if (goal.includes('professional') || metrics.some(m => m.includes('income') || m.includes('client'))) {
      return 'professional';
    }
    return 'competent';
  }

  extractTargetNetworkPosition(goal, metrics) {
    if (goal.includes('industry leader') || goal.includes('thought leader')) {return 'central';}
    if (goal.includes('recognized') || goal.includes('known')) {return 'influential';}
    if (metrics.some(m => m.includes('network') || m.includes('connections'))) {return 'connected';}
    return 'connected'; // Default assumption
  }

  extractTargetResourceLevel(metrics) {
    const hasFinancialMetrics = metrics.some(m =>
      m.includes('income') || m.includes('revenue') || m.includes('$') || m.includes('salary')
    );

    if (hasFinancialMetrics) {
      // Analyze the scale of financial goals
      const financialText = metrics.join(' ').toLowerCase();
      if (financialText.includes('six figure') || financialText.includes('100k') || financialText.includes('$100')) {
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
    if (goal.includes('professional') || metrics.some(m => m.includes('career') || m.includes('industry'))) {
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
    if (goal.includes('professional') || metrics.some(m => m.includes('portfolio') || m.includes('clients'))) {
      return 'competent_professional';
    }
    return 'emerging_professional';
  }

  calculateTransformationProgress(currentIdentity, targetIdentity, completedTopics) {
    const dimensions = [
      'role', 'skillLevel', 'networkPosition', 'resourceLevel',
      'confidenceLevel', 'timeHorizon'
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
      nextPriorityDimension: this.identifyNextPriorityDimension(dimensionProgress)
    };
  }

  calculateDimensionProgress(current, target, dimension, completedTopics) {
    // This is a simplified calculation - in reality, this would be more sophisticated

    if (dimension === 'confidenceLevel') {
      const currentLevel = typeof current === 'object' ? current.level : current;
      const progressMap = { 'low': 0, 'moderate': 50, 'high': 100 };
      const currentScore = progressMap[currentLevel] || 0;
      const targetScore = progressMap[target] || 100;
      return Math.min(100, (currentScore / targetScore) * 100);
    }

    if (dimension === 'skillLevel') {
      const currentLevel = typeof current === 'object' ? current.level : current;
      const progressMap = { 'novice': 0, 'beginner': 25, 'intermediate': 50, 'competent': 75, 'professional': 90, 'expert': 100 };
      const currentScore = progressMap[currentLevel] || 0;
      const targetScore = progressMap[target] || 100;
      return Math.min(100, (currentScore / targetScore) * 100);
    }

    if (dimension === 'networkPosition') {
      const currentPos = typeof current === 'object' ? current.position : current;
      const progressMap = { 'isolated': 0, 'emerging': 25, 'connected': 50, 'influential': 75, 'central': 100 };
      const currentScore = progressMap[currentPos] || 0;
      const targetScore = progressMap[target] || 100;
      return Math.min(100, (currentScore / targetScore) * 100);
    }

    // For other dimensions, use a basic comparison
    if (current === target) {return 100;}
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
      progress: maxProgress
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
      progress: minProgress
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
        action: 'Complete a task that feels slightly challenging but achievable'
      });
    }

    if (priorityDimension.includes('network')) {
      microShifts.push({
        type: 'behavior_shift',
        current: 'I work alone',
        target: 'I connect with others in my field',
        action: 'Reach out to one person in your target field this week'
      });
    }

    if (priorityDimension.includes('skill')) {
      microShifts.push({
        type: 'identity_shift',
        current: 'I am learning about X',
        target: 'I am developing expertise in X',
        action: 'Focus on progressively more advanced topics in your core skill area'
      });
    }

    if (priorityDimension.includes('resource')) {
      microShifts.push({
        type: 'mindset_shift',
        current: 'I need resources to progress',
        target: 'I can create value with current resources',
        action: 'Find ways to create value or impact with what you currently have'
      });
    }

    // Always include a foundational micro-shift
    microShifts.push({
      type: 'foundational_shift',
      current: 'I am trying to become X',
      target: 'I am already becoming X through my actions',
      action: 'Act as if you already are becoming your target identity'
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
        solution: 'Focus on easier wins to build confidence momentum'
      });
    }

    // Resource barriers
    if (currentIdentity.resourceAccess.overall === 'low') {
      barriers.push({
        type: 'resource_barrier',
        description: 'Limited resources may be constraining growth',
        solution: 'Focus on high-impact, low-cost learning strategies'
      });
    }

    // Network barriers
    if (currentIdentity.networkPosition.position === 'isolated') {
      barriers.push({
        type: 'network_barrier',
        description: 'Limited professional network',
        solution: 'Actively engage with communities in your target field'
      });
    }

    // Time horizon barriers
    if (currentIdentity.timeHorizonThinking === 'immediate' && targetIdentity.timeHorizon === 'strategic') {
      barriers.push({
        type: 'planning_barrier',
        description: 'Short-term thinking may limit strategic progress',
        solution: 'Practice longer-term planning and strategic thinking'
      });
    }

    return barriers;
  }

  calculateNextMilestone(currentIdentity, targetIdentity) {
    // Determine the most achievable next milestone
    const skillGap = this.calculateSkillGap(currentIdentity.skillAreas, targetIdentity.skillLevel);
    const networkGap = this.calculateNetworkGap(currentIdentity.networkPosition, targetIdentity.networkPosition);
    const confidenceGap = this.calculateConfidenceGap(currentIdentity.confidenceLevel, targetIdentity.confidenceLevel);

    // Choose the milestone with the smallest gap (most achievable)
    const gaps = [
      { type: 'skill', gap: skillGap, milestone: 'Reach intermediate level in core skill' },
      { type: 'network', gap: networkGap, milestone: 'Make first professional connections' },
      { type: 'confidence', gap: confidenceGap, milestone: 'Build confidence through consistent wins' }
    ];

    gaps.sort((a, b) => a.gap - b.gap);

    return {
      type: gaps[0].type,
      description: gaps[0].milestone,
      estimatedTimeframe: this.estimateTimeframe(gaps[0].gap),
      keyActions: this.generateMilestoneActions(gaps[0].type)
    };
  }

  calculateSkillGap(currentSkills, targetLevel) {
    const skillLevels = { 'novice': 1, 'beginner': 2, 'intermediate': 3, 'competent': 4, 'professional': 5, 'expert': 6 };
    const targetScore = skillLevels[targetLevel] || 4;

    const currentMaxSkill = Math.max(...Object.values(currentSkills).map(level => skillLevels[level] || 1));

    return Math.max(0, targetScore - currentMaxSkill);
  }

  calculateNetworkGap(current, target) {
    const networkLevels = { 'isolated': 1, 'emerging': 2, 'connected': 3, 'influential': 4, 'central': 5 };
    const currentScore = networkLevels[current.position] || 1;
    const targetScore = networkLevels[target] || 3;

    return Math.max(0, targetScore - currentScore);
  }

  calculateConfidenceGap(current, target) {
    const confidenceLevels = { 'low': 1, 'moderate': 2, 'high': 3 };
    const currentScore = confidenceLevels[current.level] || 1;
    const targetScore = confidenceLevels[target] || 3;

    return Math.max(0, targetScore - currentScore);
  }

  estimateTimeframe(gap) {
    if (gap <= 1) {return '2-4 weeks';}
    if (gap <= 2) {return '1-3 months';}
    if (gap <= 3) {return '3-6 months';}
    return '6+ months';
  }

  generateMilestoneActions(milestoneType) {
    const actions = {
      'skill': [
        'Focus on progressive skill development tasks',
        'Seek feedback on your work',
        'Practice consistently in your core area'
      ],
      'network': [
        'Join professional communities or forums',
        'Reach out to one person in your field per week',
        'Share your learning journey publicly'
      ],
      'confidence': [
        'Set and achieve small, clear goals',
        'Celebrate your learning victories',
        'Focus on tasks slightly above your comfort zone'
      ]
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
    if (pathName === 'general') {
      return await this.dataPersistence.loadProjectData(projectId, 'learning_history.json');
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, 'learning_history.json');
    }
  }
}