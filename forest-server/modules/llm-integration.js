/**
 * LLM Integration Module
 * Handles Claude API integration and complexity scaling
 */

export class LlmIntegration {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  async analyzeComplexityEvolution() {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error(`Project configuration not found for project '${projectId}' in LLM complexity analysis. Verify project exists and config.json is accessible.`);
      }

      const analysis = await this.performComplexityAnalysis(projectId, config);
      const reportText = this.formatComplexityReport(analysis);

      return {
        content: [{
          type: 'text',
          text: reportText
        }],
        complexity_analysis: analysis
      };
    } catch (error) {
      await this.dataPersistence.logError('analyzeComplexityEvolution', error);
      return {
        content: [{
          type: 'text',
          text: `Error analyzing complexity evolution: ${error.message}`
        }]
      };
    }
  }

  async performComplexityAnalysis(projectId, config) {
    const activePath = config.activePath || 'general';
    const learningHistory = await this.loadLearningHistory(projectId, activePath) || {};
    const completedTopics = learningHistory.completedTopics || [];

    // Detect current complexity tier
    const currentTier = this.detectComplexityTier(completedTopics, config);

    // Analyze scaling indicators
    const scalingIndicators = this.analyzeScalingIndicators(completedTopics, config);

    // Generate scaling opportunities
    const opportunities = this.generateScalingOpportunities(currentTier, scalingIndicators);

    return {
      currentTier,
      scalingIndicators,
      opportunities,
      nextTierRequirements: this.getNextTierRequirements(currentTier),
      infiniteScalingPotential: this.assessInfiniteScalingPotential(scalingIndicators)
    };
  }

  detectComplexityTier(completedTopics, config) {
    const indicators = this.extractComplexityIndicators(completedTopics, config);

    // Analyze patterns to determine tier
    if (indicators.financialScale >= 1000000 || indicators.teamSize >= 10) {
      return {
        tier: 'ENTERPRISE',
        level: 5,
        description: 'Full enterprise complexity orchestration',
        indicators: ['Multi-million revenue', 'Large team management', 'Strategic operations']
      };
    } else if (indicators.financialScale >= 10000 || indicators.teamSize >= 3) {
      return {
        tier: 'STRATEGIC',
        level: 4,
        description: 'Strategic operations and market positioning',
        indicators: ['Significant revenue', 'Team coordination', 'Market strategy']
      };
    } else if (indicators.financialScale >= 1000 || indicators.coordinationComplexity >= 2) {
      return {
        tier: 'MANAGEMENT',
        level: 3,
        description: 'Multi-domain management and coordination',
        indicators: ['Revenue generation', 'Complex coordination', 'Systems thinking']
      };
    } else if (indicators.collaborationLevel >= 2 || indicators.financialScale >= 100) {
      return {
        tier: 'COORDINATION',
        level: 2,
        description: 'Basic coordination and simple financial tracking',
        indicators: ['Team collaboration', 'Financial awareness', 'Project management']
      };
    } else {
      return {
        tier: 'INDIVIDUAL',
        level: 1,
        description: 'Personal learning and skill building',
        indicators: ['Individual tasks', 'Skill development', 'Personal growth']
      };
    }
  }

  extractComplexityIndicators(completedTopics, config) {
    const indicators = {
      financialScale: 0,
      teamSize: 0,
      coordinationComplexity: 0,
      collaborationLevel: 0,
      timeHorizon: 'daily',
      decisionWeight: 'personal',
      strategicThinking: 0
    };

    // Analyze task descriptions and outcomes for complexity signals
    for (const topic of completedTopics) {
      const text = (`${topic.topic} ${topic.outcome} ${topic.learned}`).toLowerCase();

      // Financial scale detection
      const dollarMatches = text.match(/\$\d+/g);
      if (dollarMatches) {
        for (const match of dollarMatches) {
          const amount = parseInt(match.replace('$', '').replace(',', ''), 10);
          indicators.financialScale = Math.max(indicators.financialScale, amount);
        }
      }

      // Team size detection
      if (text.includes('team') || text.includes('hire') || text.includes('manage')) {
        indicators.teamSize += 0.5;
      }

      // Collaboration detection
      if (text.includes('collaborate') || text.includes('partner') || text.includes('client')) {
        indicators.collaborationLevel += 0.5;
      }

      // Strategic thinking detection
      if (text.includes('strategy') || text.includes('market') || text.includes('competition')) {
        indicators.strategicThinking += 1;
      }

      // Time horizon detection
      if (text.includes('quarterly') || text.includes('annual') || text.includes('year')) {
        indicators.timeHorizon = 'long-term';
      } else if (text.includes('monthly') || text.includes('month')) {
        indicators.timeHorizon = 'medium-term';
      }
    }

    return indicators;
  }

  analyzeScalingIndicators(completedTopics, config) {
    const recent = completedTopics.slice(-10);

    return {
      growthVelocity: this.calculateGrowthVelocity(recent),
      complexityProgression: this.analyzeComplexityProgression(recent),
      domainExpansion: this.analyzeDomainExpansion(recent),
      networkEffects: this.analyzeNetworkEffects(recent),
      systemsThinking: this.analyzeSystemsThinking(recent)
    };
  }

  calculateGrowthVelocity(recentTopics) {
    if (recentTopics.length < 3) {return 'insufficient_data';}

    // Analyze task complexity over time
    const complexityScores = recentTopics.map(topic => {
      const text = topic.topic.toLowerCase();
      let score = topic.difficulty || 1;

      // Boost for business/strategic content
      if (text.includes('business') || text.includes('strategy')) {score += 2;}
      if (text.includes('team') || text.includes('manage')) {score += 1;}
      if (text.includes('revenue') || text.includes('customer')) {score += 1;}

      return score;
    });

    const trend = this.calculateTrend(complexityScores);

    if (trend > 0.5) {return 'accelerating';}
    if (trend > 0.1) {return 'growing';}
    if (trend > -0.1) {return 'stable';}
    return 'declining';
  }

  analyzeComplexityProgression(recentTopics) {
    const domains = new Set();
    const skills = new Set();

    for (const topic of recentTopics) {
      const text = topic.topic.toLowerCase();

      // Domain detection
      if (text.includes('marketing')) {domains.add('marketing');}
      if (text.includes('sales')) {domains.add('sales');}
      if (text.includes('development') || text.includes('coding')) {domains.add('technical');}
      if (text.includes('design')) {domains.add('design');}
      if (text.includes('finance')) {domains.add('finance');}
      if (text.includes('operations')) {domains.add('operations');}

      // Skill level detection
      if (text.includes('advanced') || text.includes('expert')) {skills.add('advanced');}
      if (text.includes('strategy') || text.includes('planning')) {skills.add('strategic');}
      if (text.includes('leadership') || text.includes('manage')) {skills.add('leadership');}
    }

    return {
      domainCount: domains.size,
      skillLevels: Array.from(skills),
      isMultiDisciplinary: domains.size >= 3
    };
  }

  analyzeDomainExpansion(recentTopics) {
    const coreTopics = recentTopics.slice(0, 5);
    const recentTopics2 = recentTopics.slice(-5);

    const coreKeywords = this.extractKeywords(coreTopics);
    const recentKeywords = this.extractKeywords(recentTopics2);

    const overlap = coreKeywords.filter(keyword => recentKeywords.includes(keyword));
    const expansionRate = 1 - (overlap.length / Math.max(coreKeywords.length, 1));

    return {
      expansionRate,
      newDomains: recentKeywords.filter(keyword => !coreKeywords.includes(keyword)),
      isExpanding: expansionRate > 0.3
    };
  }

  analyzeNetworkEffects(recentTopics) {
    let networkScore = 0;

    for (const topic of recentTopics) {
      const text = (`${topic.topic} ${topic.outcome}`).toLowerCase();

      if (text.includes('connect') || text.includes('network')) {networkScore += 2;}
      if (text.includes('partner') || text.includes('collaborate')) {networkScore += 2;}
      if (text.includes('client') || text.includes('customer')) {networkScore += 1;}
      if (text.includes('community') || text.includes('audience')) {networkScore += 1;}
    }

    return {
      score: networkScore,
      level: networkScore >= 5 ? 'high' : (networkScore >= 2 ? 'medium' : 'low'),
      hasNetworkEffects: networkScore >= 3
    };
  }

  analyzeSystemsThinking(recentTopics) {
    let systemsScore = 0;

    for (const topic of recentTopics) {
      const text = (`${topic.topic} ${topic.learned}`).toLowerCase();

      if (text.includes('system') || text.includes('process')) {systemsScore += 2;}
      if (text.includes('workflow') || text.includes('automation')) {systemsScore += 2;}
      if (text.includes('scale') || text.includes('optimize')) {systemsScore += 1;}
      if (text.includes('integration') || text.includes('coordinate')) {systemsScore += 1;}
    }

    return {
      score: systemsScore,
      level: systemsScore >= 6 ? 'high' : (systemsScore >= 3 ? 'medium' : 'low'),
      isSystemsThinker: systemsScore >= 4
    };
  }

  generateScalingOpportunities(currentTier, scalingIndicators) {
    const opportunities = [];

    // Based on current tier and indicators, suggest next level opportunities
    if (currentTier.tier === 'INDIVIDUAL') {
      if (scalingIndicators.networkEffects.score >= 2) {
        opportunities.push({
          type: 'collaboration_opportunity',
          description: 'Ready to start collaborating with others',
          nextSteps: ['Find collaboration partners', 'Join communities', 'Offer value to others']
        });
      }

      if (scalingIndicators.complexityProgression.domainCount >= 2) {
        opportunities.push({
          type: 'coordination_readiness',
          description: 'Multi-domain skills ready for coordination challenges',
          nextSteps: ['Take on project management', 'Coordinate multi-disciplinary work', 'Start tracking resources']
        });
      }
    }

    if (currentTier.tier === 'COORDINATION') {
      if (scalingIndicators.systemsThinking.isSystemsThinker) {
        opportunities.push({
          type: 'management_transition',
          description: 'Systems thinking indicates management readiness',
          nextSteps: ['Build team processes', 'Implement systems', 'Scale operations']
        });
      }
    }

    if (currentTier.tier === 'MANAGEMENT') {
      if (scalingIndicators.growthVelocity === 'accelerating') {
        opportunities.push({
          type: 'strategic_evolution',
          description: 'Rapid growth indicates strategic opportunity',
          nextSteps: ['Develop market strategy', 'Position for industry impact', 'Build strategic partnerships']
        });
      }
    }

    return opportunities;
  }

  getNextTierRequirements(currentTier) {
    const requirements = {
      'INDIVIDUAL': {
        nextTier: 'COORDINATION',
        requirements: [
          'Start collaborating with others regularly',
          'Begin tracking simple finances or resources',
          'Take on coordination responsibilities'
        ]
      },
      'COORDINATION': {
        nextTier: 'MANAGEMENT',
        requirements: [
          'Manage multiple projects simultaneously',
          'Build and lead a small team',
          'Implement systematic processes'
        ]
      },
      'MANAGEMENT': {
        nextTier: 'STRATEGIC',
        requirements: [
          'Develop market positioning strategy',
          'Generate significant revenue ($10K+)',
          'Build industry connections and reputation'
        ]
      },
      'STRATEGIC': {
        nextTier: 'ENTERPRISE',
        requirements: [
          'Scale to enterprise level operations',
          'Manage large teams (10+ people)',
          'Generate substantial revenue ($1M+)'
        ]
      },
      'ENTERPRISE': {
        nextTier: 'INFINITE_SCALE',
        requirements: [
          'Industry transformation capability',
          'Global impact potential',
          'Unlimited scaling opportunities'
        ]
      }
    };

    return requirements[currentTier.tier] || {
      nextTier: 'UNKNOWN',
      requirements: ['Continue current trajectory']
    };
  }

  assessInfiniteScalingPotential(scalingIndicators) {
    const potential = {
      score: 0,
      factors: [],
      readiness: 'not_ready'
    };

    // Growth velocity
    if (scalingIndicators.growthVelocity === 'accelerating') {
      potential.score += 3;
      potential.factors.push('Accelerating growth velocity');
    }

    // Network effects
    if (scalingIndicators.networkEffects.hasNetworkEffects) {
      potential.score += 2;
      potential.factors.push('Strong network effects');
    }

    // Systems thinking
    if (scalingIndicators.systemsThinking.isSystemsThinker) {
      potential.score += 2;
      potential.factors.push('Advanced systems thinking');
    }

    // Domain expansion
    if (scalingIndicators.domainExpansion.isExpanding) {
      potential.score += 1;
      potential.factors.push('Active domain expansion');
    }

    // Multi-disciplinary
    if (scalingIndicators.complexityProgression.isMultiDisciplinary) {
      potential.score += 1;
      potential.factors.push('Multi-disciplinary capabilities');
    }

    // Assess readiness
    if (potential.score >= 7) {
      potential.readiness = 'ready_for_infinite_scale';
    } else if (potential.score >= 5) {
      potential.readiness = 'approaching_infinite_scale';
    } else if (potential.score >= 3) {
      potential.readiness = 'building_foundations';
    }

    return potential;
  }

  extractKeywords(topics) {
    const keywords = new Set();

    for (const topic of topics) {
      const words = topic.topic.toLowerCase().split(' ');
      for (const word of words) {
        if (word.length > 3 && !['the', 'and', 'for', 'with'].includes(word)) {
          keywords.add(word);
        }
      }
    }

    return Array.from(keywords);
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

  formatComplexityReport(analysis) {
    let report = '🚀 **Infinite Scaling Complexity Analysis**\n\n';

    // Current tier
    report += `**Current Tier**: ${analysis.currentTier.tier} (Level ${analysis.currentTier.level})\n`;
    report += `${analysis.currentTier.description}\n\n`;

    // Current indicators
    report += '**Current Complexity Indicators**:\n';
    for (const indicator of analysis.currentTier.indicators) {
      report += `• ${indicator}\n`;
    }
    report += '\n';

    // Scaling indicators
    report += '**Scaling Analysis**:\n';
    report += `• Growth velocity: ${analysis.scalingIndicators.growthVelocity}\n`;
    report += `• Domains active: ${analysis.scalingIndicators.complexityProgression.domainCount}\n`;
    report += `• Network effects: ${analysis.scalingIndicators.networkEffects.level}\n`;
    report += `• Systems thinking: ${analysis.scalingIndicators.systemsThinking.level}\n\n`;

    // Opportunities
    if (analysis.opportunities.length > 0) {
      report += '**Scaling Opportunities Detected**:\n';
      for (const opp of analysis.opportunities) {
        report += `🎯 **${opp.type.replace(/_/g, ' ')}**: ${opp.description}\n`;
        report += '   Next steps:\n';
        for (const step of opp.nextSteps) {
          report += `   • ${step}\n`;
        }
        report += '\n';
      }
    }

    // Next tier requirements
    report += `**Path to ${analysis.nextTierRequirements.nextTier}**:\n`;
    for (const req of analysis.nextTierRequirements.requirements) {
      report += `• ${req}\n`;
    }
    report += '\n';

    // Infinite scaling potential
    const potential = analysis.infiniteScalingPotential;
    report += `**Infinite Scaling Readiness**: ${potential.readiness.replace(/_/g, ' ')} (${potential.score}/9)\n`;
    if (potential.factors.length > 0) {
      for (const factor of potential.factors) {
        report += `✅ ${factor}\n`;
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