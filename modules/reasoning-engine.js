/**
 * Reasoning Engine Module
 * Handles deductive reasoning and context analysis
 */

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
        timestamp: new Date().toISOString()
      };

      const reportText = this.formatReasoningReport(analysis, includeDetailedAnalysis);

      return {
        content: [{
          type: 'text',
          text: reportText
        }],
        reasoning_analysis: analysis
      };
    } catch (error) {
      await this.dataPersistence.logError('analyzeReasoning', error);
      return {
        content: [{
          type: 'text',
          text: `Error analyzing reasoning: ${error.message}`
        }]
      };
    }
  }

  async generateLogicalDeductions(projectId) {
    const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
    const learningHistory = await this.loadLearningHistory(projectId, config?.activePath || 'general');

    const deductions = [];

    if (!learningHistory?.completedTopics?.length) {
      return [{ type: 'insufficient_data', insight: 'Need more completed tasks for pattern analysis' }];
    }

    const completedTopics = learningHistory.completedTopics;

    // Analyze difficulty progression
    const difficultyProgression = this.analyzeDifficultyProgression(completedTopics);
    if (difficultyProgression.insight) {
      deductions.push({
        type: 'difficulty_pattern',
        insight: difficultyProgression.insight,
        evidence: difficultyProgression.evidence
      });
    }

    // Analyze energy patterns
    const energyPatterns = this.analyzeEnergyPatterns(completedTopics);
    if (energyPatterns.insight) {
      deductions.push({
        type: 'energy_pattern',
        insight: energyPatterns.insight,
        evidence: energyPatterns.evidence
      });
    }

    // Analyze breakthrough triggers
    const breakthroughPatterns = this.analyzeBreakthroughPatterns(completedTopics);
    if (breakthroughPatterns.insight) {
      deductions.push({
        type: 'breakthrough_pattern',
        insight: breakthroughPatterns.insight,
        evidence: breakthroughPatterns.evidence
      });
    }

    // Analyze learning velocity
    const velocityPattern = this.analyzeVelocityPattern(completedTopics);
    if (velocityPattern.insight) {
      deductions.push({
        type: 'velocity_pattern',
        insight: velocityPattern.insight,
        evidence: velocityPattern.evidence
      });
    }

    return deductions;
  }

  analyzeDifficultyProgression(completedTopics) {
    if (completedTopics.length < 3) {return {};}

    const recentTasks = completedTopics.slice(-5);
    const difficulties = recentTasks.map(t => t.difficulty || 3);
    const ratings = recentTasks.map(t => t.difficultyRating || 3);

    const avgDifficulty = difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length;
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

    let insight = '';
    let evidence = [];

    if (avgRating > avgDifficulty + 1) {
      insight = 'Tasks are too easy - ready for higher difficulty';
      evidence = [`Average perceived difficulty: ${avgRating.toFixed(1)}`, `Average assigned difficulty: ${avgDifficulty.toFixed(1)}`];
    } else if (avgRating < avgDifficulty - 1) {
      insight = 'Tasks may be too challenging - consider easier tasks';
      evidence = [`Average perceived difficulty: ${avgRating.toFixed(1)}`, `Average assigned difficulty: ${avgDifficulty.toFixed(1)}`];
    } else if (Math.max(...difficulties) - Math.min(...difficulties) <= 1) {
      insight = 'Difficulty plateau detected - introduce more challenging tasks';
      evidence = [`Difficulty range: ${Math.min(...difficulties)}-${Math.max(...difficulties)}`];
    }

    return { insight, evidence };
  }

  analyzeEnergyPatterns(completedTopics) {
    if (completedTopics.length < 3) {return {};}

    const recentTasks = completedTopics.slice(-7);
    const energyLevels = recentTasks.map(t => t.energyAfter || 3);

    const avgEnergy = energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length;
    const energyTrend = this.calculateTrend(energyLevels);

    let insight = '';
    let evidence = [];

    if (avgEnergy >= 4 && energyTrend > 0) {
      insight = 'Learning is energizing - high engagement detected';
      evidence = [`Average energy after tasks: ${avgEnergy.toFixed(1)}/5`, `Energy trend: ${energyTrend > 0 ? 'increasing' : 'stable'}`];
    } else if (avgEnergy <= 2) {
      insight = 'Learning may be draining - consider shorter sessions or easier tasks';
      evidence = [`Average energy after tasks: ${avgEnergy.toFixed(1)}/5`];
    } else if (energyTrend < -0.5) {
      insight = 'Energy declining over time - may need breaks or variety';
      evidence = ['Energy trend: declining', `Latest energy: ${energyLevels[energyLevels.length - 1]}/5`];
    }

    return { insight, evidence };
  }

  analyzeBreakthroughPatterns(completedTopics) {
    const breakthroughs = completedTopics.filter(t => t.breakthrough);

    if (breakthroughs.length === 0) {return {};}

    const breakthroughRate = breakthroughs.length / completedTopics.length;

    let insight = '';
    let evidence = [];

    if (breakthroughRate > 0.3) {
      insight = 'High breakthrough rate - excellent learning momentum';
      evidence = [`${breakthroughs.length} breakthroughs in ${completedTopics.length} tasks (${(breakthroughRate * 100).toFixed(0)}%)`];
    } else if (breakthroughRate > 0.1) {
      insight = 'Moderate breakthrough rate - good progress';
      evidence = [`${breakthroughs.length} breakthroughs in ${completedTopics.length} tasks (${(breakthroughRate * 100).toFixed(0)}%)`];
    }

    // Analyze breakthrough triggers
    const breakthroughDifficulties = breakthroughs.map(b => b.difficulty || 3);
    if (breakthroughDifficulties.length > 1) {
      const avgBreakthroughDifficulty = breakthroughDifficulties.reduce((sum, d) => sum + d, 0) / breakthroughDifficulties.length;
      evidence.push(`Breakthroughs typically occur at difficulty ${avgBreakthroughDifficulty.toFixed(1)}`);
    }

    return { insight, evidence };
  }

  analyzeVelocityPattern(completedTopics) {
    if (completedTopics.length < 5) {return {};}

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
      evidence = [`${recentTasks.length} tasks completed in last 7 days`, `Average: ${velocity.toFixed(1)} tasks/day`];
    } else if (velocity >= 0.5) {
      insight = 'Moderate learning velocity - steady progress';
      evidence = [`${recentTasks.length} tasks completed in last 7 days`, `Average: ${velocity.toFixed(1)} tasks/day`];
    } else if (velocity > 0) {
      insight = 'Low learning velocity - consider shorter, easier tasks to build momentum';
      evidence = [`${recentTasks.length} tasks completed in last 7 days`, `Average: ${velocity.toFixed(1)} tasks/day`];
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
      recommendations: this.generatePacingRecommendations(pacingAnalysis, urgencyLevel)
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
      delta: progressDelta
    };
  }

  calculateExpectedProgress(urgencyLevel, daysSinceStart) {
    // Expected progress curves based on urgency
    const progressCurves = {
      'critical': daysSinceStart * 2, // Fast pace
      'high': daysSinceStart * 1.5,
      'medium': daysSinceStart * 1,
      'low': daysSinceStart * 0.7
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
          priority: 'high'
        });
      } else if (difficultyDeduction.insight.includes('too challenging')) {
        recommendations.push({
          type: 'difficulty_adjustment',
          action: 'Reduce task difficulty to build confidence',
          priority: 'high'
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
          priority: 'medium'
        });
      } else if (energyDeduction.insight.includes('energizing')) {
        recommendations.push({
          type: 'energy_management',
          action: 'Consider longer sessions to capitalize on high engagement',
          priority: 'low'
        });
      }
    }

    // Pacing recommendations
    if (pacingContext.pacingAnalysis.status === 'behind') {
      recommendations.push({
        type: 'pacing_adjustment',
        action: 'Increase learning frequency or focus on easier tasks for momentum',
        priority: 'high'
      });
    } else if (pacingContext.pacingAnalysis.status === 'ahead') {
      recommendations.push({
        type: 'pacing_adjustment',
        action: 'Consider exploring advanced topics or taking strategic breaks',
        priority: 'low'
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
    if (values.length < 2) {return 0;}

    const n = values.length;
    const sumX = n * (n - 1) / 2;
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
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
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
        const priority = rec.priority === 'high' ? '🔥' : (rec.priority === 'medium' ? '⚡' : '💡');
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
    if (pathName === 'general') {
      return await this.dataPersistence.loadProjectData(projectId, 'hta.json');
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
    }
  }
}