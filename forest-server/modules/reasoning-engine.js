/**
 * Reasoning Engine Module
 * Handles deductive reasoning and context analysis
 */

import { getForestLogger } from './winston-logger.js';

// Structured logger for this module
const logger = getForestLogger({ module: 'ReasoningEngine' });

export class ReasoningEngine {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  async analyzeReasoning(includeDetailedAnalysis = true) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();

      // Generate logical deductions from completion patterns
      const deductions = await this.generateLogicalDeductions(projectId);

      // Generate pacing context
      const pacingContext = await this.generatePacingContext(projectId);

      // Combine analysis
      const analysis = {
        deductions,
        pacingContext,
        recommendations: this.generateRecommendations(deductions, pacingContext),
        timestamp: new Date().toISOString(),
      };

      const reportText = this.formatReasoningReport(analysis, includeDetailedAnalysis);

      return {
        content: [
          {
            type: 'text',
            text: reportText,
          },
        ],
        reasoning_analysis: analysis,
      };
    } catch (error) {
      await this.dataPersistence.logError('analyzeReasoning', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error analyzing reasoning: ${error.message}`,
          },
        ],
      };
    }
  }

  async generateLogicalDeductions(projectId) {
    const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
    const learningHistory = await this.loadLearningHistory(
      projectId,
      config?.activePath || 'general'
    );

    const deductions = [];

    if (!learningHistory?.completedTopics?.length) {
      return [
        { type: 'insufficient_data', insight: 'Need more completed tasks for pattern analysis' },
      ];
    }

    const completedTopics = learningHistory.completedTopics;

    // Analyze difficulty progression
    const difficultyProgression = this.analyzeDifficultyProgression(completedTopics);
    if (difficultyProgression.insight) {
      deductions.push({
        type: 'difficulty_pattern',
        insight: difficultyProgression.insight,
        evidence: difficultyProgression.evidence,
      });
    }

    // Analyze energy patterns
    const energyPatterns = this.analyzeEnergyPatterns(completedTopics);
    if (energyPatterns.insight) {
      deductions.push({
        type: 'energy_pattern',
        insight: energyPatterns.insight,
        evidence: energyPatterns.evidence,
      });
    }

    // Analyze breakthrough triggers
    const breakthroughPatterns = this.analyzeBreakthroughPatterns(completedTopics);
    if (breakthroughPatterns.insight) {
      deductions.push({
        type: 'breakthrough_pattern',
        insight: breakthroughPatterns.insight,
        evidence: breakthroughPatterns.evidence,
      });
    }

    // Analyze learning velocity
    const velocityPattern = this.analyzeVelocityPattern(completedTopics);
    if (velocityPattern.insight) {
      deductions.push({
        type: 'velocity_pattern',
        insight: velocityPattern.insight,
        evidence: velocityPattern.evidence,
      });
    }

    return deductions;
  }

  analyzeDifficultyProgression(completedTopics) {
    if (completedTopics.length < 3) {
      return {};
    }

    const recentTasks = completedTopics.slice(-5);
    const difficulties = recentTasks.map(t => t.difficulty || 3);
    const ratings = recentTasks.map(t => t.difficultyRating || 3);

    const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    let insight = '';
    let evidence = [];

    if (avgRating > avgDifficulty + 1) {
      insight = 'Tasks are too easy - ready for higher difficulty';
      evidence = [
        `Average perceived difficulty: ${avgRating.toFixed(1)}`,
        `Average assigned difficulty: ${avgDifficulty.toFixed(1)}`,
      ];
    } else if (avgRating < avgDifficulty - 1) {
      insight = 'Tasks may be too challenging - consider easier tasks';
      evidence = [
        `Average perceived difficulty: ${avgRating.toFixed(1)}`,
        `Average assigned difficulty: ${avgDifficulty.toFixed(1)}`,
      ];
    } else if (Math.max(...difficulties) - Math.min(...difficulties) <= 1) {
      insight = 'Difficulty plateau detected - introduce more challenging tasks';
      evidence = [`Difficulty range: ${Math.min(...difficulties)}-${Math.max(...difficulties)}`];
    }

    return { insight, evidence };
  }

  analyzeEnergyPatterns(completedTopics) {
    if (completedTopics.length < 3) {
      return {};
    }

    const recentTasks = completedTopics.slice(-7);
    const energyLevels = recentTasks.map(t => t.energyAfter || 3);

    const avgEnergy = energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length;
    const energyTrend = this.calculateTrend(energyLevels);

    let insight = '';
    let evidence = [];

    if (avgEnergy >= 4 && energyTrend > 0) {
      insight = 'Learning is energizing - high engagement detected';
      evidence = [
        `Average energy after tasks: ${avgEnergy.toFixed(1)}/5`,
        `Energy trend: ${energyTrend > 0 ? 'increasing' : 'stable'}`,
      ];
    } else if (avgEnergy <= 2) {
      insight = 'Learning may be draining - consider shorter sessions or easier tasks';
      evidence = [`Average energy after tasks: ${avgEnergy.toFixed(1)}/5`];
    } else if (energyTrend < -0.5) {
      insight = 'Energy declining over time - may need breaks or variety';
      evidence = [
        'Energy trend: declining',
        `Latest energy: ${energyLevels[energyLevels.length - 1]}/5`,
      ];
    }

    return { insight, evidence };
  }

  analyzeBreakthroughPatterns(completedTopics) {
    const breakthroughs = completedTopics.filter(t => t.breakthrough);

    if (breakthroughs.length === 0) {
      return {};
    }

    const breakthroughRate = breakthroughs.length / completedTopics.length;

    let insight = '';
    let evidence = [];

    if (breakthroughRate > 0.3) {
      insight = 'High breakthrough rate - excellent learning momentum';
      evidence = [
        `${breakthroughs.length} breakthroughs in ${completedTopics.length} tasks (${(breakthroughRate * 100).toFixed(0)}%)`,
      ];
    } else if (breakthroughRate > 0.1) {
      insight = 'Moderate breakthrough rate - good progress';
      evidence = [
        `${breakthroughs.length} breakthroughs in ${completedTopics.length} tasks (${(breakthroughRate * 100).toFixed(0)}%)`,
      ];
    }

    // Analyze breakthrough triggers
    const breakthroughDifficulties = breakthroughs.map(b => b.difficulty || 3);
    if (breakthroughDifficulties.length > 1) {
      const avgBreakthroughDifficulty =
        breakthroughDifficulties.reduce((sum, d) => sum + d, 0) / breakthroughDifficulties.length;
      evidence.push(
        `Breakthroughs typically occur at difficulty ${avgBreakthroughDifficulty.toFixed(1)}`
      );
    }

    return { insight, evidence };
  }

  analyzeVelocityPattern(completedTopics) {
    if (completedTopics.length < 5) {
      return {};
    }

    const now = new Date();
    const recentTasks = completedTopics.filter(t => {
      const taskDate = new Date(t.completedAt);
      const daysDiff = (now - taskDate) / (1000 * 60 * 60 * 24);
      return daysDiff <= 7;
    });

    const velocity = recentTasks.length / 7; // tasks per day

    let insight = '';
    let evidence = [];

    if (velocity >= 1) {
      insight = 'High learning velocity - maintaining excellent pace';
      evidence = [
        `${recentTasks.length} tasks completed in last 7 days`,
        `Average: ${velocity.toFixed(1)} tasks/day`,
      ];
    } else if (velocity >= 0.5) {
      insight = 'Moderate learning velocity - steady progress';
      evidence = [
        `${recentTasks.length} tasks completed in last 7 days`,
        `Average: ${velocity.toFixed(1)} tasks/day`,
      ];
    } else if (velocity > 0) {
      insight = 'Low learning velocity - consider shorter, easier tasks to build momentum';
      evidence = [
        `${recentTasks.length} tasks completed in last 7 days`,
        `Average: ${velocity.toFixed(1)} tasks/day`,
      ];
    } else {
      insight = 'No recent learning activity - time to re-engage';
      evidence = ['No tasks completed in last 7 days'];
    }

    return { insight, evidence };
  }

  async generatePacingContext(projectId) {
    const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
    const urgencyLevel = config?.urgency_level || 'medium';
    const createdDate = new Date(config?.created_at || Date.now());
    const daysSinceStart = Math.floor((Date.now() - createdDate) / (1000 * 60 * 60 * 24));

    const htaData = await this.loadHTA(projectId, config?.activePath || 'general');
    const progress = this.calculateProgress(htaData);

    const pacingAnalysis = this.analyzePacing(urgencyLevel, daysSinceStart, progress);

    return {
      urgencyLevel,
      daysSinceStart,
      progress,
      pacingAnalysis,
      recommendations: this.generatePacingRecommendations(pacingAnalysis, urgencyLevel),
    };
  }

  analyzePacing(urgencyLevel, daysSinceStart, progress) {
    const expectedProgress = this.calculateExpectedProgress(urgencyLevel, daysSinceStart);
    const progressDelta = progress.percentage - expectedProgress;

    let status = 'on_track';
    let message = '';

    if (progressDelta > 10) {
      status = 'ahead';
      message = `Ahead of schedule by ${progressDelta.toFixed(0)} percentage points`;
    } else if (progressDelta < -20) {
      status = 'behind';
      message = `Behind schedule by ${Math.abs(progressDelta).toFixed(0)} percentage points`;
    } else if (progressDelta < -10) {
      status = 'slightly_behind';
      message = 'Slightly behind expected pace';
    } else {
      message = `Progress aligned with ${urgencyLevel} urgency level`;
    }

    return {
      status,
      message,
      expectedProgress,
      actualProgress: progress.percentage,
      delta: progressDelta,
    };
  }

  calculateExpectedProgress(urgencyLevel, daysSinceStart) {
    // Expected progress curves based on urgency
    const progressCurves = {
      critical: daysSinceStart * 2, // Fast pace
      high: daysSinceStart * 1.5,
      medium: daysSinceStart * 1,
      low: daysSinceStart * 0.7,
    };

    return Math.min(100, progressCurves[urgencyLevel] || progressCurves.medium);
  }

  generateRecommendations(deductions, pacingContext) {
    const recommendations = [];

    // Difficulty recommendations
    const difficultyDeduction = deductions.find(d => d.type === 'difficulty_pattern');
    if (difficultyDeduction) {
      if (difficultyDeduction.insight.includes('too easy')) {
        recommendations.push({
          type: 'difficulty_adjustment',
          action: 'Increase task difficulty to maintain challenge',
          priority: 'high',
        });
      } else if (difficultyDeduction.insight.includes('too challenging')) {
        recommendations.push({
          type: 'difficulty_adjustment',
          action: 'Reduce task difficulty to build confidence',
          priority: 'high',
        });
      }
    }

    // Energy recommendations
    const energyDeduction = deductions.find(d => d.type === 'energy_pattern');
    if (energyDeduction) {
      if (energyDeduction.insight.includes('draining')) {
        recommendations.push({
          type: 'energy_management',
          action: 'Take more breaks or try shorter learning sessions',
          priority: 'medium',
        });
      } else if (energyDeduction.insight.includes('energizing')) {
        recommendations.push({
          type: 'energy_management',
          action: 'Consider longer sessions to capitalize on high engagement',
          priority: 'low',
        });
      }
    }

    // Pacing recommendations
    if (pacingContext.pacingAnalysis.status === 'behind') {
      recommendations.push({
        type: 'pacing_adjustment',
        action: 'Increase learning frequency or focus on easier tasks for momentum',
        priority: 'high',
      });
    } else if (pacingContext.pacingAnalysis.status === 'ahead') {
      recommendations.push({
        type: 'pacing_adjustment',
        action: 'Consider exploring advanced topics or taking strategic breaks',
        priority: 'low',
      });
    }

    return recommendations;
  }

  generatePacingRecommendations(pacingAnalysis, urgencyLevel) {
    const recommendations = [];

    if (pacingAnalysis.status === 'behind' && urgencyLevel === 'critical') {
      recommendations.push('Consider daily learning sessions');
      recommendations.push('Focus on shorter, high-impact tasks');
      recommendations.push('Use get_next_task for optimal sequencing');
    } else if (pacingAnalysis.status === 'ahead') {
      recommendations.push('Explore advanced or optional topics');
      recommendations.push('Consider starting a related learning path');
      recommendations.push('Take time for deep practice and reflection');
    }

    return recommendations;
  }

  calculateTrend(values) {
    if (values.length < 2) {
      return 0;
    }

    const n = values.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + val * i, 0);
    const sumX2 = values.reduce((sum, val, i) => sum + i * i, 0);

    return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }

  calculateProgress(htaData) {
    const nodes = htaData?.frontierNodes || [];
    const completed = nodes.filter(n => n.completed).length;
    const total = nodes.length;

    return {
      completed,
      total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }

  formatReasoningReport(analysis, includeDetailed) {
    let report = '🧠 **Reasoning Analysis Report**\n\n';

    // Deductions
    report += '📊 **Key Insights**:\n';
    for (const deduction of analysis.deductions) {
      report += `• ${deduction.insight}\n`;
      if (includeDetailed && deduction.evidence) {
        for (const evidence of deduction.evidence) {
          report += `  📈 ${evidence}\n`;
        }
      }
    }

    // Pacing analysis
    report += '\n⏱️ **Pacing Analysis**:\n';
    report += `• ${analysis.pacingContext.pacingAnalysis.message}\n`;
    report += `• Days since start: ${analysis.pacingContext.daysSinceStart}\n`;
    report += `• Current progress: ${analysis.pacingContext.progress.percentage}%\n`;

    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += '\n💡 **Recommendations**:\n';
      for (const rec of analysis.recommendations) {
        const priority = rec.priority === 'high' ? '🔥' : rec.priority === 'medium' ? '⚡' : '💡';
        report += `${priority} ${rec.action}\n`;
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

  async loadHTA(projectId, pathName) {
    try {
      return await this.dataPersistence.loadProjectData(projectId, 'hta.json');
    } catch (error) {
      await this.dataPersistence.logError('ReasoningEngine.loadHTA', error);
      return null;
    }
  }

  /**
   * Enhanced Background Analysis System for Proactive Reasoning
   * Performs strategic analysis, risk detection, and opportunity identification
   */

  /**
   * Perform comprehensive background analysis based on system state
   * Supports both (systemState, analysisType) and (analysisType, systemState) signatures for backward compatibility.
   * @param {Object|string} arg1 - systemState object or analysisType string
   * @param {string|Object} arg2 - analysisType string or systemState object
   * @returns {Object} Analysis results
   */
  async performBackgroundAnalysis(arg1, arg2) {
    // Back-compat handling: allow either order of parameters
    let systemState;
    let analysisType;

    if (typeof arg1 === 'string') {
      // Signature: (analysisType, projectData)
      analysisType = arg1;
      systemState = arg2 || {};
    } else {
      // Signature: (systemState, analysisType)
      systemState = arg1 || {};
      analysisType = arg2 || 'strategic_overview';
    }

    logger.info(`🧠 ReasoningEngine: Performing ${analysisType} analysis`);

    try {
      switch (analysisType) {
        case 'strategic_overview':
          return await this.performStrategicOverviewAnalysis(systemState);
        case 'risk_detection':
          return await this.performRiskDetectionAnalysis(systemState);
        case 'opportunity_detection':
          return await this.performOpportunityDetectionAnalysis(systemState);
        default:
          logger.error(`❌ Unknown analysis type: ${analysisType}`);
          return { error: `Unknown analysis type: ${analysisType}` };
      }
    } catch (error) {
      logger.error('❌ Background analysis failed', { error, analysisType });
      await this.dataPersistence.logError(
        `ReasoningEngine.performBackgroundAnalysis.${analysisType}`,
        error
      );
      return { error: error.message };
    }
  }

  /**
   * Calculate skill acceleration metrics based on recent completion history.
   * @param {Object} context - Context object containing `completions` array with {breakthrough?, difficulty?}
   * @returns {{accelerationFactor: number, recommendedDifficulty: number, learningVelocity: string}}
   */
  calculateSkillAcceleration(context = {}) {
    const recentCompletions = context.completions || [];
    const breakthroughRate =
      recentCompletions.filter(c => c.breakthrough).length / Math.max(recentCompletions.length, 1);
    const averageDifficulty =
      recentCompletions.reduce((sum, c) => sum + (c.difficulty ?? 3), 0) /
      Math.max(recentCompletions.length, 1);

    return {
      accelerationFactor: 1 + breakthroughRate * 0.5,
      recommendedDifficulty: Math.min(
        5,
        Math.max(1, averageDifficulty + (breakthroughRate > 0.5 ? 1 : 0))
      ),
      learningVelocity: breakthroughRate > 0.3 ? 'accelerating' : 'steady',
    };
  }

  /**
   * Strategic Overview Analysis - High-level strategic insights
   * @param {Object} systemState - System state data
   * @returns {Object} Strategic insights
   */
  async performStrategicOverviewAnalysis(systemState) {
    const insights = [];
    const metrics = systemState.metrics || {};
    const learningHistory = systemState.learningHistory || {};
    const htaData = systemState.htaData || {};

    logger.debug('📊 Performing strategic overview analysis...');

    // Analyze overall trajectory
    const trajectoryInsight = this.analyzeOverallTrajectory(metrics, learningHistory);
    if (trajectoryInsight) {
      insights.push(trajectoryInsight);
    }

    // Analyze strategic alignment
    const alignmentInsight = this.analyzeStrategicAlignment(htaData, learningHistory);
    if (alignmentInsight) {
      insights.push(alignmentInsight);
    }

    // Analyze capability gaps
    const gapInsight = this.analyzeCapabilityGaps(htaData, learningHistory);
    if (gapInsight) {
      insights.push(gapInsight);
    }

    // Analyze momentum patterns
    const momentumInsight = this.analyzeMomentumPatterns(metrics, systemState.recentSchedules);
    if (momentumInsight) {
      insights.push(momentumInsight);
    }

    return {
      insights,
      analysisType: 'strategic_overview',
      confidence: this.calculateInsightConfidence(insights),
      nextRecommendedActions: this.generateStrategicActions(insights),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Risk Detection Analysis - Identify potential strategic risks
   * @param {Object} systemState - System state data
   * @returns {Object} Risk analysis results
   */
  async performRiskDetectionAnalysis(systemState) {
    const risks = [];
    const metrics = systemState.metrics || {};
    const learningHistory = systemState.learningHistory || {};

    logger.debug('⚠️ Performing risk detection analysis...');

    // Risk 1: Stagnation Detection
    const stagnationRisk = this.detectStagnationRisk(metrics, learningHistory);
    if (stagnationRisk) {
      risks.push(stagnationRisk);
    }

    // Risk 2: Skill Silo Detection
    const skillSiloRisk = this.detectSkillSiloRisk(learningHistory, systemState.htaData);
    if (skillSiloRisk) {
      risks.push(skillSiloRisk);
    }

    // Risk 3: Burnout Detection
    const burnoutRisk = this.detectBurnoutRisk(learningHistory, metrics);
    if (burnoutRisk) {
      risks.push(burnoutRisk);
    }

    // Risk 4: Goal Drift Detection
    const goalDriftRisk = this.detectGoalDriftRisk(systemState.htaData, learningHistory);
    if (goalDriftRisk) {
      risks.push(goalDriftRisk);
    }

    // Risk 5: Engagement Decline Detection
    const engagementRisk = this.detectEngagementDeclineRisk(learningHistory);
    if (engagementRisk) {
      risks.push(engagementRisk);
    }

    // Calculate overall risk level
    const overallRiskLevel = this.calculateOverallRiskLevel(risks);

    return {
      risks,
      overallRiskLevel,
      riskCount: risks.length,
      highPriorityRisks: risks.filter(r => r.priority === 'high'),
      mitigationStrategies: this.generateRiskMitigationStrategies(risks),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Opportunity Detection Analysis - Identify strategic opportunities
   * @param {Object} systemState - System state data
   * @returns {Object} Opportunity analysis results
   */
  async performOpportunityDetectionAnalysis(systemState) {
    const opportunities = [];
    const metrics = systemState.metrics || {};
    const learningHistory = systemState.learningHistory || {};

    logger.debug('🎯 Performing opportunity detection analysis...');

    // Opportunity 1: Breakthrough Momentum
    const breakthroughOpportunity = this.detectBreakthroughMomentumOpportunity(learningHistory);
    if (breakthroughOpportunity) {
      opportunities.push(breakthroughOpportunity);
    }

    // Opportunity 2: Skill Synergy
    const synergyOpportunity = this.detectSkillSynergyOpportunity(
      learningHistory,
      systemState.htaData
    );
    if (synergyOpportunity) {
      opportunities.push(synergyOpportunity);
    }

    // Opportunity 3: Difficulty Readiness
    const difficultyOpportunity = this.detectDifficultyReadinessOpportunity(learningHistory);
    if (difficultyOpportunity) {
      opportunities.push(difficultyOpportunity);
    }

    // Opportunity 4: Cross-Pollination
    const crossPollinationOpportunity = this.detectCrossPollinationOpportunity(
      systemState.htaData,
      learningHistory
    );
    if (crossPollinationOpportunity) {
      opportunities.push(crossPollinationOpportunity);
    }

    // Opportunity 5: Strategic Timing
    const timingOpportunity = this.detectStrategicTimingOpportunity(systemState);
    if (timingOpportunity) {
      opportunities.push(timingOpportunity);
    }

    const priorityLevel = this.calculateOpportunityPriority(opportunities);

    return {
      opportunities,
      priorityLevel,
      opportunityCount: opportunities.length,
      highValueOpportunities: opportunities.filter(o => o.value === 'high'),
      actionableOpportunities: opportunities.filter(o => o.actionable),
      timestamp: new Date().toISOString(),
    };
  }

  // Strategic Analysis Helper Methods

  analyzeOverallTrajectory(metrics, learningHistory) {
    if (!metrics.totalCompletedTasks || metrics.totalCompletedTasks < 5) {
      return {
        type: 'trajectory_insufficient_data',
        title: 'Building Learning Foundation',
        insight: 'Still establishing baseline learning patterns. Continue with current approach.',
        confidence: 0.6,
      };
    }

    const { averageDifficulty, momentum, breakthroughCount } = metrics;

    if (momentum >= 5 && breakthroughCount >= 2) {
      return {
        type: 'trajectory_accelerating',
        title: 'Accelerating Growth Trajectory',
        insight: `Excellent momentum with ${momentum} tasks completed recently and ${breakthroughCount} breakthroughs. You're in a high-performance learning state.`,
        confidence: 0.9,
        actionSuggestion:
          'Consider tackling more ambitious challenges while maintaining this momentum.',
      };
    } else if (momentum <= 1 && metrics.lastActivityDays > 3) {
      return {
        type: 'trajectory_stalling',
        title: 'Learning Momentum Declining',
        insight: `Only ${momentum} tasks completed recently, with ${metrics.lastActivityDays} days since last activity. Learning velocity is decreasing.`,
        confidence: 0.8,
        actionSuggestion:
          'Focus on re-engaging with smaller, achievable tasks to rebuild momentum.',
      };
    }

    return null;
  }

  analyzeStrategicAlignment(htaData, learningHistory) {
    if (!htaData || !learningHistory?.completedTopics) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-10);
    const branches = recentTasks.map(t => t.branch || 'general');
    const uniqueBranches = new Set(branches);

    if (uniqueBranches.size === 1 && recentTasks.length >= 5) {
      return {
        type: 'alignment_narrow_focus',
        title: 'Highly Focused Learning Path',
        insight: `Last 10 tasks concentrated in '${Array.from(uniqueBranches)[0]}' branch. Deep expertise being developed.`,
        confidence: 0.8,
        actionSuggestion:
          'Consider if this focus aligns with your broader strategic goals, or if diversification is needed.',
      };
    } else if (uniqueBranches.size >= 4) {
      return {
        type: 'alignment_broad_exploration',
        title: 'Diverse Skill Development',
        insight: `Recent tasks span ${uniqueBranches.size} different branches. Building well-rounded capabilities.`,
        confidence: 0.7,
        actionSuggestion:
          'Consider identifying which areas provide the highest strategic value and prioritize accordingly.',
      };
    }

    return null;
  }

  analyzeCapabilityGaps(htaData, learningHistory) {
    if (!htaData?.paths || !learningHistory?.completedTopics) {
      return null;
    }

    const pathNames = Object.keys(htaData.paths);
    const recentBranches = new Set(
      learningHistory.completedTopics.slice(-20).map(t => t.branch || 'general')
    );

    const unexploredPaths = pathNames.filter(path => !recentBranches.has(path));

    if (unexploredPaths.length >= 2) {
      return {
        type: 'capability_gaps_identified',
        title: 'Potential Capability Gaps',
        insight: `${unexploredPaths.length} skill areas haven't been recently practiced: ${unexploredPaths.slice(0, 3).join(', ')}.`,
        confidence: 0.7,
        actionSuggestion: `Consider whether these areas (${unexploredPaths[0]}, ${unexploredPaths[1]}) are strategically important for your goals.`,
      };
    }

    return null;
  }

  analyzeMomentumPatterns(metrics, recentSchedules) {
    if (!recentSchedules || recentSchedules.length === 0) {
      return null;
    }

    const scheduledDays = recentSchedules.length;
    const actualMomentum = metrics.momentum || 0;
    const expectedDaily = actualMomentum / 7;

    if (expectedDaily >= 1.5) {
      return {
        type: 'momentum_high_velocity',
        title: 'High Learning Velocity',
        insight: `Completing ${expectedDaily.toFixed(1)} tasks per day on average. Exceptional learning pace.`,
        confidence: 0.9,
        actionSuggestion:
          'Maintain this pace but monitor for sustainability and ensure adequate recovery time.',
      };
    } else if (expectedDaily <= 0.3 && scheduledDays >= 3) {
      return {
        type: 'momentum_low_velocity',
        title: 'Low Learning Velocity',
        insight: `Completing only ${expectedDaily.toFixed(1)} tasks per day. Learning pace may be too slow for goal achievement.`,
        confidence: 0.8,
        actionSuggestion:
          'Consider shorter, more achievable tasks or address potential barriers to consistent learning.',
      };
    }

    return null;
  }

  // Risk Detection Helper Methods

  detectStagnationRisk(metrics, learningHistory) {
    const { averageDifficulty, lastActivityDays } = metrics;
    const recentTasks = learningHistory.completedTopics?.slice(-10) || [];

    // Check for difficulty plateau
    const isDifficultyPlateaued = this.isDifficultyPlateaued(recentTasks);

    if (isDifficultyPlateaued && recentTasks.length >= 5) {
      return {
        type: 'stagnation_risk',
        title: 'Learning Stagnation Detected',
        message: `Tasks have maintained difficulty level ${averageDifficulty.toFixed(1)} for last ${recentTasks.length} tasks. Risk of boredom and disengagement.`,
        priority: 'high',
        evidence: [
          `Difficulty variance: ${this.calculateDifficultyVariance(recentTasks).toFixed(2)}`,
          `Days since challenge increase: ${lastActivityDays}`,
        ],
        recommendation:
          'Introduce higher-difficulty tasks or new challenge types to reignite growth.',
      };
    }

    return null;
  }

  detectSkillSiloRisk(learningHistory, htaData) {
    if (!learningHistory?.completedTopics || !htaData?.paths) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-15);
    const branches = recentTasks.map(t => t.branch || 'general');
    const branchCounts = branches.reduce((acc, branch) => {
      acc[branch] = (acc[branch] || 0) + 1;
      return acc;
    }, {});

    const totalBranches = Object.keys(htaData.paths).length;
    const activeBranches = Object.keys(branchCounts).length;
    const dominantBranch = Object.entries(branchCounts).sort((a, b) => b[1] - a[1])[0];

    if (
      dominantBranch &&
      dominantBranch[1] / recentTasks.length > 0.7 &&
      activeBranches < totalBranches / 2
    ) {
      return {
        type: 'skill_silo_risk',
        title: 'Skill Silo Formation',
        message: `Over-concentration in '${dominantBranch[0]}' branch (${dominantBranch[1]}/${recentTasks.length} recent tasks). Neglecting other strategic areas.`,
        priority: 'medium',
        evidence: [
          `Active branches: ${activeBranches}/${totalBranches}`,
          `Dominant branch: ${dominantBranch[0]} (${Math.round((dominantBranch[1] / recentTasks.length) * 100)}%)`,
        ],
        recommendation:
          'Diversify learning by including tasks from underutilized branches to maintain strategic balance.',
      };
    }

    return null;
  }

  detectBurnoutRisk(learningHistory, metrics) {
    if (!learningHistory?.completedTopics) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-7);
    const energyLevels = recentTasks.map(t => t.energyAfter || 3);
    const avgEnergy = energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length;
    const energyTrend = this.calculateTrend(energyLevels);

    if (avgEnergy <= 2 && energyTrend < -0.3 && metrics.momentum >= 3) {
      return {
        type: 'burnout_risk',
        title: 'Potential Burnout Risk',
        message: `Despite high task completion (${metrics.momentum}), energy levels are low (${avgEnergy.toFixed(1)}/5) and declining.`,
        priority: 'high',
        evidence: [
          `Average energy: ${avgEnergy.toFixed(1)}/5`,
          'Energy trend: declining',
          `Tasks completed: ${metrics.momentum}`,
        ],
        recommendation:
          'Reduce task intensity, increase break periods, or focus on more energizing activities.',
      };
    }

    return null;
  }

  detectGoalDriftRisk(htaData, learningHistory) {
    if (!htaData?.primaryGoal || !learningHistory?.completedTopics) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-10);
    const goalAlignment = recentTasks.filter(
      t =>
        t.description?.toLowerCase().includes(htaData.primaryGoal.toLowerCase()) ||
        t.learningNotes?.toLowerCase().includes(htaData.primaryGoal.toLowerCase())
    );

    if (goalAlignment.length / recentTasks.length < 0.3 && recentTasks.length >= 5) {
      return {
        type: 'goal_drift_risk',
        title: 'Goal Alignment Drift',
        message: `Only ${goalAlignment.length}/${recentTasks.length} recent tasks directly relate to primary goal: "${htaData.primaryGoal}".`,
        priority: 'medium',
        evidence: [
          `Goal alignment: ${Math.round((goalAlignment.length / recentTasks.length) * 100)}%`,
          `Primary goal: ${htaData.primaryGoal}`,
        ],
        recommendation: 'Refocus upcoming tasks to ensure alignment with core strategic objective.',
      };
    }

    return null;
  }

  detectEngagementDeclineRisk(learningHistory) {
    if (!learningHistory?.completedTopics) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-8);
    const engagementLevels = recentTasks
      .map(t => t.opportunityContext?.engagementLevel || t.difficultyRating || 3)
      .filter(level => level !== undefined);

    if (engagementLevels.length >= 4) {
      const avgEngagement =
        engagementLevels.reduce((sum, e) => sum + e, 0) / engagementLevels.length;
      const engagementTrend = this.calculateTrend(engagementLevels);

      if (avgEngagement <= 3 && engagementTrend < -0.5) {
        return {
          type: 'engagement_decline_risk',
          title: 'Declining Engagement',
          message: `Engagement levels declining over recent tasks (avg: ${avgEngagement.toFixed(1)}/5). Risk of learning abandonment.`,
          priority: 'high',
          evidence: [
            `Average engagement: ${avgEngagement.toFixed(1)}/5`,
            'Trend: declining',
            `Recent tasks analyzed: ${engagementLevels.length}`,
          ],
          recommendation:
            'Introduce variety, reduce difficulty, or explore new learning modalities to reignite interest.',
        };
      }
    }

    return null;
  }

  // Opportunity Detection Helper Methods

  detectBreakthroughMomentumOpportunity(learningHistory) {
    if (!learningHistory?.completedTopics) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-5);
    const recentBreakthroughs = recentTasks.filter(t => t.breakthrough);

    if (recentBreakthroughs.length >= 2) {
      return {
        type: 'breakthrough_momentum',
        title: 'Breakthrough Momentum Window',
        description: `${recentBreakthroughs.length} breakthroughs in last ${recentTasks.length} tasks. High learning receptivity detected.`,
        value: 'high',
        actionable: true,
        timeWindow: 'next 2-3 days',
        recommendation:
          'Capitalize on this momentum by tackling your most ambitious learning challenges.',
        confidence: 0.9,
      };
    }

    return null;
  }

  detectSkillSynergyOpportunity(learningHistory, htaData) {
    if (!learningHistory?.completedTopics || !htaData?.paths) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-8);
    const recentBranches = recentTasks.map(t => t.branch || 'general');
    const uniqueBranches = new Set(recentBranches);

    if (uniqueBranches.size >= 3 && recentTasks.filter(t => t.breakthrough).length >= 1) {
      return {
        type: 'skill_synergy',
        title: 'Cross-Skill Synergy Opportunity',
        description: `Recent learning across ${uniqueBranches.size} branches creates potential for knowledge synthesis.`,
        value: 'high',
        actionable: true,
        timeWindow: 'next week',
        recommendation: `Create integrative tasks that combine insights from: ${Array.from(uniqueBranches).slice(0, 3).join(', ')}.`,
        confidence: 0.8,
      };
    }

    return null;
  }

  detectDifficultyReadinessOpportunity(learningHistory) {
    if (!learningHistory?.completedTopics) {
      return null;
    }

    const recentTasks = learningHistory.completedTopics.slice(-5);
    const avgRating =
      recentTasks.reduce((sum, t) => sum + (t.difficultyRating || 3), 0) / recentTasks.length;
    const avgAssigned =
      recentTasks.reduce((sum, t) => sum + (t.difficulty || 3), 0) / recentTasks.length;

    if (avgRating > avgAssigned + 1.2 && recentTasks.filter(t => t.energyAfter >= 4).length >= 3) {
      return {
        type: 'difficulty_readiness',
        title: 'Ready for Challenge Escalation',
        description: `Tasks feel easier than assigned (${avgRating.toFixed(1)} vs ${avgAssigned.toFixed(1)}) with maintained high energy.`,
        value: 'medium',
        actionable: true,
        timeWindow: 'immediate',
        recommendation: 'Increase task difficulty by 1-2 levels to maintain optimal challenge.',
        confidence: 0.85,
      };
    }

    return null;
  }

  detectCrossPollinationOpportunity(htaData, learningHistory) {
    if (!htaData?.paths || !learningHistory?.completedTopics) {
      return null;
    }

    const allPaths = Object.keys(htaData.paths);
    const recentBranches = new Set(
      learningHistory.completedTopics.slice(-15).map(t => t.branch || 'general')
    );
    const unexploredPaths = allPaths.filter(path => !recentBranches.has(path));

    if (
      unexploredPaths.length >= 2 &&
      learningHistory.completedTopics.filter(t => t.breakthrough).length >= 3
    ) {
      return {
        type: 'cross_pollination',
        title: 'Knowledge Cross-Pollination Opportunity',
        description: `Strong foundation in explored areas (${recentBranches.size} branches) enables knowledge transfer to new domains.`,
        value: 'medium',
        actionable: true,
        timeWindow: 'next 1-2 weeks',
        recommendation: `Explore ${unexploredPaths[0]} or ${unexploredPaths[1]} to leverage existing knowledge in new contexts.`,
        confidence: 0.7,
      };
    }

    return null;
  }

  detectStrategicTimingOpportunity(systemState) {
    const { metrics, lastAnalyses } = systemState;
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hourOfDay = now.getHours();

    // Detect optimal timing windows
    if ((dayOfWeek === 1 || dayOfWeek === 2) && hourOfDay >= 9 && hourOfDay <= 11) {
      // Monday/Tuesday morning
      if (metrics.momentum >= 2) {
        return {
          type: 'strategic_timing',
          title: 'Peak Performance Window',
          description:
            'Monday/Tuesday morning with existing momentum - optimal time for challenging tasks.',
          value: 'medium',
          actionable: true,
          timeWindow: 'next 2 hours',
          recommendation:
            'Schedule your most demanding learning objectives during this high-energy window.',
          confidence: 0.7,
        };
      }
    }

    return null;
  }

  // Utility Methods for Risk and Opportunity Analysis

  isDifficultyPlateaued(tasks) {
    if (tasks.length < 4) {
      return false;
    }

    const difficulties = tasks.map(t => t.difficulty || 3);
    const variance = this.calculateDifficultyVariance(tasks);

    return variance < 0.5; // Very low variance indicates plateau
  }

  calculateDifficultyVariance(tasks) {
    if (tasks.length === 0) {
      return 0;
    }

    const difficulties = tasks.map(t => t.difficulty || 3);
    const mean = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
    const squaredDiffs = difficulties.map(d => Math.pow(d - mean, 2));

    return squaredDiffs.reduce((sum, sq) => sum + sq, 0) / squaredDiffs.length;
  }

  calculateOverallRiskLevel(risks) {
    if (risks.length === 0) {
      return 'low';
    }

    const highPriorityCount = risks.filter(r => r.priority === 'high').length;
    const mediumPriorityCount = risks.filter(r => r.priority === 'medium').length;

    if (highPriorityCount >= 2) {
      return 'high';
    }
    if (highPriorityCount >= 1 || mediumPriorityCount >= 3) {
      return 'medium';
    }
    return 'low';
  }

  calculateOpportunityPriority(opportunities) {
    if (opportunities.length === 0) {
      return 'low';
    }

    const highValueCount = opportunities.filter(o => o.value === 'high').length;
    const actionableCount = opportunities.filter(o => o.actionable).length;

    if (highValueCount >= 2 || actionableCount >= 3) {
      return 'high';
    }
    if (highValueCount >= 1 || actionableCount >= 2) {
      return 'medium';
    }
    return 'low';
  }

  calculateInsightConfidence(insights) {
    if (insights.length === 0) {
      return 0;
    }

    const avgConfidence =
      insights.filter(i => i.confidence !== undefined).reduce((sum, i) => sum + i.confidence, 0) /
      insights.length;

    return avgConfidence || 0.5;
  }

  generateStrategicActions(insights) {
    return insights
      .filter(i => i.actionSuggestion)
      .map(i => ({
        action: i.actionSuggestion,
        priority: i.confidence > 0.8 ? 'high' : 'medium',
        relatedInsight: i.title,
      }))
      .slice(0, 3); // Top 3 actions
  }

  generateRiskMitigationStrategies(risks) {
    return risks.map(risk => ({
      riskType: risk.type,
      mitigation: risk.recommendation,
      priority: risk.priority,
      timeframe: this.estimateRiskTimeframe(risk.type),
    }));
  }

  estimateRiskTimeframe(riskType) {
    const timeframes = {
      stagnation_risk: 'immediate',
      skill_silo_risk: '1-2 weeks',
      burnout_risk: 'immediate',
      goal_drift_risk: '1 week',
      engagement_decline_risk: 'immediate',
    };

    return timeframes[riskType] || 'medium-term';
  }
}
