/**
 * Analytics Tools Module
 * Handles performance analysis and debugging tools
 */

export class AnalyticsTools {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  async generateTiimoExport(includeBreaks = true) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const today = new Date().toISOString().split('T')[0];
      const schedule = await this.dataPersistence.loadProjectData(projectId, `day_${today}.json`);

      if (!schedule || !schedule.blocks) {
        return {
          content: [{
            type: 'text',
            text: '❌ No schedule found for today. Generate a schedule first with `generate_daily_schedule`.'
          }]
        };
      }

      const tiimoMarkdown = this.formatTiimoMarkdown(schedule, includeBreaks);

      return {
        content: [{
          type: 'text',
          text: `📱 **Tiimo Export - ${today}**\n\n\`\`\`markdown\n${tiimoMarkdown}\n\`\`\``
        }],
        tiimo_export: tiimoMarkdown,
        date: today
      };
    } catch (error) {
      await this.dataPersistence.logError('generateTiimoExport', error, { includeBreaks });
      return {
        content: [{
          type: 'text',
          text: `Error generating Tiimo export: ${error.message}`
        }]
      };
    }
  }

  async analyzePerformance() {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      const analysis = await this.performComprehensiveAnalysis(projectId, config);
      const reportText = this.formatPerformanceReport(analysis);

      return {
        content: [{
          type: 'text',
          text: reportText
        }],
        performance_analysis: analysis
      };
    } catch (error) {
      await this.dataPersistence.logError('analyzePerformance', error);
      return {
        content: [{
          type: 'text',
          text: `Error analyzing performance: ${error.message}`
        }]
      };
    }
  }

  async reviewPeriod(days) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      const review = await this.generatePeriodReview(projectId, config, days);
      const reportText = this.formatPeriodReview(review, days);

      return {
        content: [{
          type: 'text',
          text: reportText
        }],
        period_review: review,
        days_reviewed: days
      };
    } catch (error) {
      await this.dataPersistence.logError('reviewPeriod', error, { days });
      return {
        content: [{
          type: 'text',
          text: `Error reviewing period: ${error.message}`
        }]
      };
    }
  }

  async debugTaskSequence() {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      const activePath = config.activePath || 'general';
      const htaData = await this.loadPathHTA(projectId, activePath);

      if (!htaData) {
        return {
          content: [{
            type: 'text',
            text: '❌ No HTA tree found. Build an HTA tree first.'
          }]
        };
      }

      const debugInfo = this.analyzeTaskSequencing(htaData);
      const debugText = this.formatDebugReport(debugInfo);

      return {
        content: [{
          type: 'text',
          text: debugText
        }],
        debug_info: debugInfo
      };
    } catch (error) {
      await this.dataPersistence.logError('debugTaskSequence', error);
      return {
        content: [{
          type: 'text',
          text: `Error debugging task sequence: ${error.message}`
        }]
      };
    }
  }

  async repairSequence(forceRebuild = false) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      const activePath = config.activePath || 'general';
      const htaData = await this.loadPathHTA(projectId, activePath);

      if (!htaData && !forceRebuild) {
        return {
          content: [{
            type: 'text',
            text: '❌ No HTA tree found. Use `build_hta_tree` first or set force_rebuild to true.'
          }]
        };
      }

      const repairResult = await this.performSequenceRepair(projectId, activePath, htaData, forceRebuild);
      const repairText = this.formatRepairReport(repairResult);

      return {
        content: [{
          type: 'text',
          text: repairText
        }],
        repair_result: repairResult
      };
    } catch (error) {
      await this.dataPersistence.logError('repairSequence', error, { forceRebuild });
      return {
        content: [{
          type: 'text',
          text: `Error repairing sequence: ${error.message}`
        }]
      };
    }
  }

  formatTiimoMarkdown(schedule, includeBreaks) {
    const blocks = schedule.blocks || [];
    let markdown = `# Daily Schedule - ${schedule.date}\n\n`;

    for (const block of blocks) {
      if (!includeBreaks && block.type === 'break') {continue;}

      const icon = this.getTiimoIcon(block.type);
      const duration = `${block.duration}min`;

      markdown += `## ${block.startTime} - ${block.title} ${icon}\n`;
      markdown += `Duration: ${duration}\n`;

      if (block.description) {
        markdown += `${block.description}\n`;
      }

      if (block.completed) {
        markdown += '✅ Completed\n';
      }

      markdown += '\n';
    }

    return markdown;
  }

  getTiimoIcon(blockType) {
    const icons = {
      'learning': '📚',
      'meal': '🍽️',
      'break': '☕',
      'habit': '🔄',
      'exercise': '💪',
      'work': '💼'
    };

    return icons[blockType] || '📋';
  }

  async performComprehensiveAnalysis(projectId, config) {
    const activePath = config.activePath || 'general';
    const learningHistory = await this.loadLearningHistory(projectId, activePath) || {};
    const htaData = await this.loadPathHTA(projectId, activePath) || {};

    const completedTopics = learningHistory.completedTopics || [];
    const insights = learningHistory.insights || [];

    return {
      overview: {
        totalCompletedTasks: completedTopics.length,
        totalInsights: insights.length,
        averageTaskDifficulty: this.calculateAverageTaskDifficulty(completedTopics),
        averageEnergyAfter: this.calculateAverageEnergyAfter(completedTopics),
        breakthroughRate: this.calculateBreakthroughRate(completedTopics)
      },
      patterns: {
        energyTrends: this.analyzeEnergyTrends(completedTopics),
        difficultyProgression: this.analyzeDifficultyProgression(completedTopics),
        completionVelocity: this.analyzeCompletionVelocity(completedTopics),
        timeOfDayPatterns: this.analyzeTimeOfDayPatterns(completedTopics)
      },
      recommendations: this.generatePerformanceRecommendations(completedTopics, htaData)
    };
  }

  calculateAverageTaskDifficulty(completedTopics) {
    if (completedTopics.length === 0) {return 0;}
    const sum = completedTopics.reduce((acc, task) => acc + (task.difficulty || 3), 0);
    return (sum / completedTopics.length).toFixed(2);
  }

  calculateAverageEnergyAfter(completedTopics) {
    if (completedTopics.length === 0) {return 0;}
    const sum = completedTopics.reduce((acc, task) => acc + (task.energyAfter || 3), 0);
    return (sum / completedTopics.length).toFixed(2);
  }

  calculateBreakthroughRate(completedTopics) {
    if (completedTopics.length === 0) {return 0;}
    const breakthroughs = completedTopics.filter(task => task.breakthrough).length;
    return ((breakthroughs / completedTopics.length) * 100).toFixed(1);
  }

  analyzeEnergyTrends(completedTopics) {
    if (completedTopics.length < 3) {return 'Insufficient data';}

    const recentTasks = completedTopics.slice(-10);
    const energyLevels = recentTasks.map(task => task.energyAfter || 3);

    const trend = this.calculateTrend(energyLevels);
    const average = energyLevels.reduce((sum, e) => sum + e, 0) / energyLevels.length;

    return {
      trend: trend > 0.1 ? 'increasing' : (trend < -0.1 ? 'decreasing' : 'stable'),
      average: average.toFixed(2),
      latest: energyLevels[energyLevels.length - 1]
    };
  }

  analyzeDifficultyProgression(completedTopics) {
    if (completedTopics.length < 3) {return 'Insufficient data';}

    const difficulties = completedTopics.map(task => task.difficulty || 3);
    const trend = this.calculateTrend(difficulties);

    return {
      trend: trend > 0.1 ? 'increasing' : (trend < -0.1 ? 'decreasing' : 'stable'),
      range: `${Math.min(...difficulties)}-${Math.max(...difficulties)}`,
      current: difficulties[difficulties.length - 1]
    };
  }

  analyzeCompletionVelocity(completedTopics) {
    const now = new Date();
    const periods = [1, 7, 30]; // days

    const velocity = {};

    for (const days of periods) {
      const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const recentTasks = completedTopics.filter(task => new Date(task.completedAt) > cutoff);
      velocity[`${days}day`] = {
        count: recentTasks.length,
        rate: (recentTasks.length / days).toFixed(2)
      };
    }

    return velocity;
  }

  analyzeTimeOfDayPatterns(completedTopics) {
    const hourCounts = {};

    for (const task of completedTopics) {
      if (task.completedAt) {
        const hour = new Date(task.completedAt).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    }

    const bestHour = Object.keys(hourCounts).reduce((a, b) =>
      hourCounts[a] > hourCounts[b] ? a : b, '0');

    return {
      mostProductiveHour: `${bestHour}:00`,
      hourlyDistribution: hourCounts
    };
  }

  generatePerformanceRecommendations(completedTopics, htaData) {
    const recommendations = [];

    // Energy recommendations
    const avgEnergy = this.calculateAverageEnergyAfter(completedTopics);
    if (avgEnergy < 2.5) {
      recommendations.push({
        type: 'energy',
        message: 'Low average energy after tasks - consider shorter sessions or easier tasks'
      });
    } else if (avgEnergy > 4) {
      recommendations.push({
        type: 'energy',
        message: 'High energy levels - consider more challenging tasks or longer sessions'
      });
    }

    // Difficulty recommendations
    const difficultyAnalysis = this.analyzeDifficultyProgression(completedTopics);
    if (difficultyAnalysis.trend === 'stable' && completedTopics.length > 5) {
      recommendations.push({
        type: 'difficulty',
        message: 'Difficulty plateau detected - consider progressive difficulty increase'
      });
    }

    // Velocity recommendations
    const velocity = this.analyzeCompletionVelocity(completedTopics);
    if (velocity['7day']?.rate < 0.5) {
      recommendations.push({
        type: 'velocity',
        message: 'Low completion velocity - consider breaking tasks into smaller pieces'
      });
    }

    return recommendations;
  }

  async generatePeriodReview(projectId, config, days) {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const activePath = config.activePath || 'general';
    const learningHistory = await this.loadLearningHistory(projectId, activePath) || {};

    const recentTasks = (learningHistory.completedTopics || []).filter(task =>
      new Date(task.completedAt) > cutoffDate
    );

    const recentInsights = (learningHistory.insights || []).filter(insight =>
      new Date(insight.timestamp) > cutoffDate
    );

    return {
      period: `Last ${days} days`,
      summary: {
        tasksCompleted: recentTasks.length,
        insightsGained: recentInsights.length,
        breakthroughs: recentTasks.filter(t => t.breakthrough).length,
        averageEnergy: recentTasks.length > 0 ?
          (recentTasks.reduce((sum, t) => sum + (t.energyAfter || 3), 0) / recentTasks.length).toFixed(1) : 0
      },
      highlights: this.extractPeriodHighlights(recentTasks, recentInsights),
      challenges: this.extractPeriodChallenges(recentTasks),
      nextSteps: this.generateNextSteps(recentTasks, learningHistory)
    };
  }

  extractPeriodHighlights(recentTasks, recentInsights) {
    const highlights = [];

    // Breakthrough tasks
    const breakthroughs = recentTasks.filter(t => t.breakthrough);
    for (const bt of breakthroughs.slice(0, 3)) {
      highlights.push(`🎉 Breakthrough: ${bt.topic}`);
    }

    // High energy tasks
    const highEnergyTasks = recentTasks.filter(t => (t.energyAfter || 0) >= 4);
    if (highEnergyTasks.length > 0) {
      highlights.push(`⚡ ${highEnergyTasks.length} high-energy completions`);
    }

    // Recent insights
    for (const insight of recentInsights.slice(0, 2)) {
      highlights.push(`💡 "${insight.insight}"`);
    }

    return highlights.slice(0, 5);
  }

  extractPeriodChallenges(recentTasks) {
    const challenges = [];

    // Low energy tasks
    const lowEnergyTasks = recentTasks.filter(t => (t.energyAfter || 5) <= 2);
    if (lowEnergyTasks.length > recentTasks.length * 0.3) {
      challenges.push('😓 Multiple low-energy completions - consider easier tasks');
    }

    // High difficulty without breakthroughs
    const hardTasks = recentTasks.filter(t => (t.difficulty || 0) >= 4 && !t.breakthrough);
    if (hardTasks.length > 2) {
      challenges.push('🔥 Several difficult tasks without breakthroughs');
    }

    // No recent completions
    if (recentTasks.length === 0) {
      challenges.push('📉 No recent task completions');
    }

    return challenges;
  }

  generateNextSteps(recentTasks, learningHistory) {
    const nextSteps = [];

    if (recentTasks.length === 0) {
      nextSteps.push('Start with an easy exploration task to rebuild momentum');
    } else {
      const lastTask = recentTasks[recentTasks.length - 1];
      if (lastTask.breakthrough) {
        nextSteps.push('Build on recent breakthrough with related advanced topics');
      }

      const avgEnergy = recentTasks.reduce((sum, t) => sum + (t.energyAfter || 3), 0) / recentTasks.length;
      if (avgEnergy >= 4) {
        nextSteps.push('High energy levels - consider more challenging tasks');
      } else if (avgEnergy <= 2) {
        nextSteps.push('Focus on easier, more engaging tasks to rebuild energy');
      }
    }

    // Check for knowledge gaps
    const gaps = learningHistory.knowledgeGaps || [];
    const recentGaps = gaps.filter(g => !g.addressed).slice(0, 2);
    for (const gap of recentGaps) {
      nextSteps.push(`Address knowledge gap: ${gap.question}`);
    }

    return nextSteps.slice(0, 4);
  }

  analyzeTaskSequencing(htaData) {
    const nodes = htaData.frontierNodes || [];
    const completedNodes = nodes.filter(n => n.completed);
    const availableNodes = this.getAvailableNodes(nodes);
    const blockedNodes = this.getBlockedNodes(nodes);

    return {
      totalNodes: nodes.length,
      completedNodes: completedNodes.length,
      availableNodes: availableNodes.length,
      blockedNodes: blockedNodes.length,
      prerequisiteChains: this.analyzePrerequisiteChains(nodes),
      orphanedNodes: this.findOrphanedNodes(nodes),
      circularDependencies: this.detectCircularDependencies(nodes)
    };
  }

  getAvailableNodes(nodes) {
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
    });
  }

  getBlockedNodes(nodes) {
    const completedNodeIds = nodes.filter(n => n.completed).map(n => n.id);

    return nodes.filter(node => {
      if (node.completed) {return false;}

      if (node.prerequisites && node.prerequisites.length > 0) {
        return !node.prerequisites.every(prereq =>
          completedNodeIds.includes(prereq) ||
          nodes.some(n => n.title === prereq && n.completed)
        );
      }

      return false;
    });
  }

  analyzePrerequisiteChains(nodes) {
    const chains = [];

    for (const node of nodes) {
      if (node.prerequisites && node.prerequisites.length > 0) {
        chains.push({
          nodeId: node.id,
          title: node.title,
          prerequisites: node.prerequisites,
          depth: this.calculatePrerequisiteDepth(node, nodes)
        });
      }
    }

    return chains;
  }

  calculatePrerequisiteDepth(node, nodes, visited = new Set()) {
    if (visited.has(node.id)) {return 0;} // Circular dependency
    visited.add(node.id);

    if (!node.prerequisites || node.prerequisites.length === 0) {
      return 0;
    }

    let maxDepth = 0;
    for (const prereqId of node.prerequisites) {
      const prereqNode = nodes.find(n => n.id === prereqId);
      if (prereqNode) {
        const depth = this.calculatePrerequisiteDepth(prereqNode, nodes, new Set(visited));
        maxDepth = Math.max(maxDepth, depth + 1);
      }
    }

    return maxDepth;
  }

  findOrphanedNodes(nodes) {
    // Create sets for both node IDs and titles for fast lookup
    const nodeIds = new Set(nodes.map(n => n.id));
    const nodeTitles = new Set(nodes.map(n => n.title));
    const orphanedPrereqs = new Set();

    for (const node of nodes) {
      if (node.prerequisites) {
        for (const prereq of node.prerequisites) {
          // Check if prerequisite exists as either a node ID or a task title
          if (!nodeIds.has(prereq) && !nodeTitles.has(prereq)) {
            orphanedPrereqs.add(prereq);
          }
        }
      }
    }

    return Array.from(orphanedPrereqs);
  }

  detectCircularDependencies(nodes) {
    const circular = [];

    for (const node of nodes) {
      const cycle = this.findCycle(node, nodes, new Set(), []);
      if (cycle.length > 0) {
        circular.push(cycle);
      }
    }

    return circular;
  }

  findCycle(node, nodes, visited, path) {
    if (path.includes(node.id)) {
      return path.slice(path.indexOf(node.id));
    }

    if (visited.has(node.id)) {
      return [];
    }

    visited.add(node.id);
    path.push(node.id);

    if (node.prerequisites) {
      for (const prereqId of node.prerequisites) {
        const prereqNode = nodes.find(n => n.id === prereqId);
        if (prereqNode) {
          const cycle = this.findCycle(prereqNode, nodes, visited, [...path]);
          if (cycle.length > 0) {
            return cycle;
          }
        }
      }
    }

    return [];
  }

  async performSequenceRepair(projectId, pathName, htaData, forceRebuild) {
    const repairActions = [];

    if (forceRebuild || !htaData) {
      // Complete rebuild
      repairActions.push('Complete HTA tree rebuild required');
      return {
        actions: repairActions,
        success: false,
        message: 'Use build_hta_tree to create a new learning structure'
      };
    }

    const debugInfo = this.analyzeTaskSequencing(htaData);

    // Fix orphaned prerequisites
    if (debugInfo.orphanedNodes.length > 0) {
      htaData.frontierNodes = htaData.frontierNodes.map(node => ({
        ...node,
        prerequisites: node.prerequisites?.filter(prereq =>
          !debugInfo.orphanedNodes.includes(prereq)
        ) || []
      }));
      repairActions.push(`Removed ${debugInfo.orphanedNodes.length} orphaned prerequisites`);
    }

    // Generate new tasks if none available
    if (debugInfo.availableNodes === 0 && debugInfo.blockedNodes > 0) {
      const newTasks = this.generateRepairTasks(htaData);
      htaData.frontierNodes = (htaData.frontierNodes || []).concat(newTasks);
      repairActions.push(`Generated ${newTasks.length} new accessible tasks`);
    }

    // Save repaired HTA
    htaData.lastUpdated = new Date().toISOString();
    await this.savePathHTA(projectId, pathName, htaData);

    return {
      actions: repairActions,
      success: true,
      availableTasksAfterRepair: this.getAvailableNodes(htaData.frontierNodes || []).length
    };
  }

  generateRepairTasks(htaData) {
    const taskId = (htaData.frontierNodes?.length || 0) + 4000;

    return [
      {
        id: `repair_explore_${taskId}`,
        title: 'Explore: Continue Learning',
        description: 'Open exploration to continue learning progress',
        difficulty: 1,
        duration: '15 minutes',
        branch: 'exploration',
        priority: 250,
        generated: true,
        repairTask: true
      },
      {
        id: `repair_practice_${taskId + 1}`,
        title: 'Practice: Review Fundamentals',
        description: 'Review and practice core concepts',
        difficulty: 2,
        duration: '25 minutes',
        branch: 'practice',
        priority: 220,
        generated: true,
        repairTask: true
      }
    ];
  }

  formatPerformanceReport(analysis) {
    let report = '📊 **Performance Analysis Report**\n\n';

    // Overview
    report += '**Overview**:\n';
    report += `• Total completed tasks: ${analysis.overview.totalCompletedTasks}\n`;
    report += `• Average difficulty: ${analysis.overview.averageTaskDifficulty}/5\n`;
    report += `• Average energy after: ${analysis.overview.averageEnergyAfter}/5\n`;
    report += `• Breakthrough rate: ${analysis.overview.breakthroughRate}%\n\n`;

    // Patterns
    report += '**Patterns Detected**:\n';
    report += `• Energy trend: ${analysis.patterns.energyTrends.trend || 'No data'}\n`;
    report += `• Difficulty progression: ${analysis.patterns.difficultyProgression.trend || 'No data'}\n`;
    report += `• Most productive hour: ${analysis.patterns.timeOfDayPatterns.mostProductiveHour || 'No data'}\n\n`;

    // Recommendations
    if (analysis.recommendations.length > 0) {
      report += '**Recommendations**:\n';
      for (const rec of analysis.recommendations) {
        report += `• ${rec.message}\n`;
      }
    }

    return report;
  }

  formatPeriodReview(review, days) {
    let report = `📅 **${days === 7 ? 'Weekly' : 'Monthly'} Review**\n\n`;

    report += '**Summary**:\n';
    report += `• Tasks completed: ${review.summary.tasksCompleted}\n`;
    report += `• Breakthroughs: ${review.summary.breakthroughs}\n`;
    report += `• Average energy: ${review.summary.averageEnergy}/5\n`;
    report += `• Insights gained: ${review.summary.insightsGained}\n\n`;

    if (review.highlights.length > 0) {
      report += '**Highlights**:\n';
      for (const highlight of review.highlights) {
        report += `• ${highlight}\n`;
      }
      report += '\n';
    }

    if (review.challenges.length > 0) {
      report += '**Challenges**:\n';
      for (const challenge of review.challenges) {
        report += `• ${challenge}\n`;
      }
      report += '\n';
    }

    if (review.nextSteps.length > 0) {
      report += '**Next Steps**:\n';
      for (const step of review.nextSteps) {
        report += `• ${step}\n`;
      }
    }

    return report;
  }

  formatDebugReport(debugInfo) {
    let report = '🔧 **Task Sequence Debug Report**\n\n';

    report += '**Overview**:\n';
    report += `• Total nodes: ${debugInfo.totalNodes}\n`;
    report += `• Completed: ${debugInfo.completedNodes}\n`;
    report += `• Available: ${debugInfo.availableNodes}\n`;
    report += `• Blocked: ${debugInfo.blockedNodes}\n\n`;

    if (debugInfo.orphanedNodes.length > 0) {
      report += '**Issues Detected**:\n';
      report += `• Orphaned prerequisites: ${debugInfo.orphanedNodes.join(', ')}\n`;
    }

    if (debugInfo.circularDependencies.length > 0) {
      report += `• Circular dependencies: ${debugInfo.circularDependencies.length} detected\n`;
    }

    if (debugInfo.prerequisiteChains.length > 0) {
      report += '\n**Prerequisite Chains**:\n';
      for (const chain of debugInfo.prerequisiteChains.slice(0, 5)) {
        report += `• ${chain.title} (depth: ${chain.depth})\n`;
      }
    }

    return report;
  }

  formatRepairReport(repairResult) {
    let report = '🔧 **Sequence Repair Complete**\n\n';

    if (repairResult.success) {
      report += '✅ **Repair Successful**\n\n';
      report += '**Actions Taken**:\n';
      for (const action of repairResult.actions) {
        report += `• ${action}\n`;
      }
      report += `\n📊 Available tasks after repair: ${repairResult.availableTasksAfterRepair}\n`;
    } else {
      report += '❌ **Repair Required Manual Intervention**\n\n';
      for (const action of repairResult.actions) {
        report += `• ${action}\n`;
      }
      report += `\n💡 ${repairResult.message}`;
    }

    return report;
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

  async loadLearningHistory(projectId, pathName) {
    if (pathName === 'general') {
      return await this.dataPersistence.loadProjectData(projectId, 'learning_history.json');
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, 'learning_history.json');
    }
  }

  async loadPathHTA(projectId, pathName) {
    if (pathName === 'general') {
      return await this.dataPersistence.loadProjectData(projectId, 'hta.json');
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
    }
  }

  async savePathHTA(projectId, pathName, htaData) {
    if (pathName === 'general') {
      return await this.dataPersistence.saveProjectData(projectId, 'hta.json', htaData);
    } else {
      return await this.dataPersistence.savePathData(projectId, pathName, 'hta.json', htaData);
    }
  }
}