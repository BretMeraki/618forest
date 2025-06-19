/**
 * Proactive Insights Handler Module
 * Processes strategic insights, risks, and opportunities to generate actionable recommendations
 * Transforms background analysis into user-facing wisdom and guidance
 */

import { bus } from './utils/event-bus.js';

export class ProactiveInsightsHandler {
  constructor(dataPersistence, projectManagement, eventBus = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.eventBus = eventBus || bus;

    this.insightHistory = new Map(); // Track insight patterns over time
    this.lastRecommendations = new Map(); // Avoid recommendation spam

    this.setupEventListeners();

    // Only show initialization message in terminal mode (not MCP)
    if (process.stdin.isTTY) {
      console.log('🧠 ProactiveInsightsHandler initialized - Ready to transform insights into wisdom');
    }
  }

  setupEventListeners() {
    // Listen to system analysis events
    this.eventBus.on('system:strategic_insights', this.handleStrategicInsights.bind(this), 'ProactiveInsightsHandler');
    this.eventBus.on('system:risks_detected', this.handleRiskDetection.bind(this), 'ProactiveInsightsHandler');
    this.eventBus.on('system:opportunities_detected', this.handleOpportunityDetection.bind(this), 'ProactiveInsightsHandler');
    this.eventBus.on('system:identity_insights', this.handleIdentityInsights.bind(this), 'ProactiveInsightsHandler');
  }

  /**
   * Handle strategic insights from background analysis
   * @param {Object} data - Strategic insights data
   */
  async handleStrategicInsights({ projectId, insights, systemState, analysisType, analyzedAt }) {
    try {
      console.log('📊 Processing strategic insights...');

      if (!insights?.insights || insights.insights.length === 0) {
        console.log('📊 No strategic insights to process');
        return;
      }

      // Process and prioritize insights
      const processedInsights = this.processStrategicInsights(insights, systemState);

      // Generate proactive recommendations
      const recommendations = await this.generateStrategicRecommendations(processedInsights, projectId);

      // Check for urgent insights that require immediate attention
      const urgentInsights = this.identifyUrgentInsights(processedInsights);

      // Store insights for pattern analysis
      await this.storeInsightHistory(projectId, 'strategic', processedInsights);

      // Emit actionable recommendations
      if (recommendations.length > 0) {
        this.eventBus.emit('insights:recommendations_available', {
          projectId,
          type: 'strategic',
          recommendations,
          urgentCount: urgentInsights.length,
          generatedAt: new Date().toISOString()
        }, 'ProactiveInsightsHandler');
      }

      // Generate proactive alerts if needed
      if (urgentInsights.length > 0) {
        await this.generateProactiveAlerts(projectId, urgentInsights, 'strategic');
      }

      console.log(`✨ Processed ${processedInsights.length} strategic insights, generated ${recommendations.length} recommendations`);

    } catch (error) {
      console.error('❌ Error handling strategic insights:', error);
      await this.dataPersistence.logError('ProactiveInsightsHandler.handleStrategicInsights', error);
    }
  }

  /**
   * Handle risk detection events
   * @param {Object} data - Risk detection data
   */
  async handleRiskDetection({ projectId, risks, riskLevel, detectedAt }) {
    try {
      console.log(`⚠️ Processing ${risks.length} detected risks (level: ${riskLevel})...`);

      if (risks.length === 0) {
        console.log('⚠️ No risks detected');
        return;
      }

      // Prioritize and contextualize risks
      const prioritizedRisks = this.prioritizeRisks(risks);

      // Generate risk mitigation strategies
      const mitigationStrategies = await this.generateRiskMitigationStrategies(prioritizedRisks, projectId);

      // Check for critical risks requiring immediate action
      const criticalRisks = prioritizedRisks.filter(r => r.priority === 'high');

      // Store risk history for trend analysis
      await this.storeInsightHistory(projectId, 'risks', prioritizedRisks);

      // Emit risk alerts and mitigation recommendations
      this.eventBus.emit('insights:risk_alert', {
        projectId,
        risks: prioritizedRisks,
        riskLevel,
        mitigationStrategies,
        criticalCount: criticalRisks.length,
        detectedAt
      }, 'ProactiveInsightsHandler');

      // Generate immediate alerts for critical risks
      if (criticalRisks.length > 0) {
        await this.generateProactiveAlerts(projectId, criticalRisks, 'risk');
      }

      console.log(`🚨 Processed ${risks.length} risks, ${criticalRisks.length} critical, generated ${mitigationStrategies.length} mitigation strategies`);

    } catch (error) {
      console.error('❌ Error handling risk detection:', error);
      await this.dataPersistence.logError('ProactiveInsightsHandler.handleRiskDetection', error);
    }
  }

  /**
   * Handle opportunity detection events
   * @param {Object} data - Opportunity detection data
   */
  async handleOpportunityDetection({ projectId, opportunities, priorityLevel, detectedAt }) {
    try {
      console.log(`🎯 Processing ${opportunities.length} detected opportunities (priority: ${priorityLevel})...`);

      if (opportunities.length === 0) {
        console.log('🎯 No opportunities detected');
        return;
      }

      // Prioritize and enrich opportunities
      const enrichedOpportunities = this.enrichOpportunities(opportunities);

      // Generate opportunity action plans
      const actionPlans = await this.generateOpportunityActionPlans(enrichedOpportunities, projectId);

      // Identify time-sensitive opportunities
      const urgentOpportunities = enrichedOpportunities.filter(o =>
        o.timeWindow && (o.timeWindow.includes('immediate') || o.timeWindow.includes('next 2'))
      );

      // Store opportunity history
      await this.storeInsightHistory(projectId, 'opportunities', enrichedOpportunities);

      // Emit opportunity recommendations
      this.eventBus.emit('insights:opportunity_alert', {
        projectId,
        opportunities: enrichedOpportunities,
        priorityLevel,
        actionPlans,
        urgentCount: urgentOpportunities.length,
        detectedAt
      }, 'ProactiveInsightsHandler');

      // Generate proactive alerts for urgent opportunities
      if (urgentOpportunities.length > 0) {
        await this.generateProactiveAlerts(projectId, urgentOpportunities, 'opportunity');
      }

      console.log(`🌟 Processed ${opportunities.length} opportunities, ${urgentOpportunities.length} urgent, generated ${actionPlans.length} action plans`);

    } catch (error) {
      console.error('❌ Error handling opportunity detection:', error);
      await this.dataPersistence.logError('ProactiveInsightsHandler.handleOpportunityDetection', error);
    }
  }

  /**
   * Handle identity insights from background reflection
   * @param {Object} data - Identity insights data
   */
  async handleIdentityInsights({ projectId, identityInsights, reflectedAt }) {
    try {
      console.log('🧘 Processing identity insights...');

      if (!identityInsights || identityInsights.error) {
        console.log('🧘 No valid identity insights to process');
        return;
      }

      // Extract actionable identity recommendations
      const identityRecommendations = this.extractIdentityRecommendations(identityInsights);

      // Identify identity development priorities
      const developmentPriorities = this.identifyIdentityPriorities(identityInsights);

      // Generate identity development action plan
      const identityActionPlan = await this.generateIdentityActionPlan(identityInsights, projectId);

      // Store identity reflection history
      await this.storeInsightHistory(projectId, 'identity', identityInsights);

      // Emit identity development recommendations
      if (identityRecommendations.length > 0 || developmentPriorities.length > 0) {
        this.eventBus.emit('insights:identity_guidance', {
          projectId,
          recommendations: identityRecommendations,
          priorities: developmentPriorities,
          actionPlan: identityActionPlan,
          reflectionSummary: identityInsights.reflectionSummary,
          reflectedAt
        }, 'ProactiveInsightsHandler');
      }

      console.log(`🌟 Processed identity insights, generated ${identityRecommendations.length} recommendations and ${developmentPriorities.length} priorities`);

    } catch (error) {
      console.error('❌ Error handling identity insights:', error);
      await this.dataPersistence.logError('ProactiveInsightsHandler.handleIdentityInsights', error);
    }
  }

  // Strategic Insight Processing Methods

  processStrategicInsights(insights, systemState) {
    return insights.insights.map(insight => ({
      ...insight,
      urgency: this.calculateInsightUrgency(insight, systemState),
      actionability: this.calculateActionability(insight),
      strategicValue: this.calculateStrategicValue(insight),
      processedAt: new Date().toISOString()
    }));
  }

  async generateStrategicRecommendations(processedInsights, projectId) {
    const recommendations = [];

    for (const insight of processedInsights) {
      // Skip if we've recently made this recommendation
      const recentKey = `${projectId}-${insight.type}`;
      if (this.lastRecommendations.has(recentKey)) {
        const lastTime = this.lastRecommendations.get(recentKey);
        const hoursSince = (Date.now() - lastTime) / (1000 * 60 * 60);
        if (hoursSince < 24) {continue;} // Don't repeat recommendations within 24 hours
      }

      const recommendation = await this.createStrategicRecommendation(insight, projectId);
      if (recommendation) {
        recommendations.push(recommendation);
        this.lastRecommendations.set(recentKey, Date.now());
      }
    }

    return recommendations;
  }

  async createStrategicRecommendation(insight, projectId) {
    const baseRecommendation = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      type: 'strategic',
      title: insight.title,
      insight: insight.insight,
      urgency: insight.urgency,
      actionability: insight.actionability,
      strategicValue: insight.strategicValue,
      createdAt: new Date().toISOString()
    };

    // Generate specific recommendations based on insight type
    switch (insight.type) {
    case 'trajectory_accelerating':
      return {
        ...baseRecommendation,
        recommendation: insight.actionSuggestion || 'Capitalize on your excellent momentum by tackling more ambitious challenges.',
        actions: [
          'Schedule a high-difficulty learning session this week',
          'Consider sharing your progress publicly to build accountability',
          'Explore advanced topics in your strongest skill area'
        ],
        timeframe: 'next 3 days'
      };

    case 'trajectory_stalling':
      return {
        ...baseRecommendation,
        recommendation: insight.actionSuggestion || 'Re-engage with smaller, achievable tasks to rebuild momentum.',
        actions: [
          'Complete one small learning task today',
          'Review and refresh your learning goals',
          'Consider reducing task difficulty temporarily'
        ],
        timeframe: 'immediate'
      };

    case 'momentum_high_velocity':
      return {
        ...baseRecommendation,
        recommendation: insight.actionSuggestion || 'Maintain this exceptional pace while monitoring sustainability.',
        actions: [
          'Schedule recovery time between learning sessions',
          'Document your learning process for future reference',
          'Consider mentoring others to reinforce your knowledge'
        ],
        timeframe: 'next week'
      };

    case 'momentum_low_velocity':
      return {
        ...baseRecommendation,
        recommendation: insight.actionSuggestion || 'Address barriers to consistent learning and rebuild momentum.',
        actions: [
          'Identify specific obstacles to learning consistency',
          'Break down current goals into smaller tasks',
          'Set up environmental cues to support learning habits'
        ],
        timeframe: 'next 2 days'
      };

    default:
      return {
        ...baseRecommendation,
        recommendation: insight.actionSuggestion || `Leverage this insight: ${insight.insight}`,
        actions: ['Review current approach', 'Consider strategic adjustments', 'Monitor progress carefully'],
        timeframe: 'next week'
      };
    }
  }

  identifyUrgentInsights(processedInsights) {
    return processedInsights.filter(insight =>
      insight.urgency === 'high' ||
      insight.confidence >= 0.9 ||
      insight.type.includes('stalling') ||
      insight.type.includes('declining')
    );
  }

  // Risk Processing Methods

  prioritizeRisks(risks) {
    return risks
      .map(risk => ({
        ...risk,
        impact: this.calculateRiskImpact(risk),
        likelihood: this.calculateRiskLikelihood(risk),
        urgency: this.calculateRiskUrgency(risk)
      }))
      .sort((a, b) => {
        // Sort by priority first, then by urgency
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) {return priorityDiff;}
        return b.urgency - a.urgency;
      });
  }

  async generateRiskMitigationStrategies(prioritizedRisks, projectId) {
    const strategies = [];

    for (const risk of prioritizedRisks.slice(0, 3)) { // Top 3 risks
      const strategy = await this.createMitigationStrategy(risk, projectId);
      if (strategy) {strategies.push(strategy);}
    }

    return strategies;
  }

  async createMitigationStrategy(risk, projectId) {
    const baseStrategy = {
      id: `strat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      riskType: risk.type,
      title: `Mitigate ${risk.title}`,
      priority: risk.priority,
      createdAt: new Date().toISOString()
    };

    switch (risk.type) {
    case 'stagnation_risk':
      return {
        ...baseStrategy,
        strategy: 'Progressive Challenge Introduction',
        actions: [
          'Increase task difficulty by one level',
          'Introduce new learning modalities or topics',
          'Set weekly breakthrough challenges',
          'Track difficulty progression explicitly'
        ],
        timeline: 'Start immediately, review in 1 week',
        successMetrics: ['Difficulty variance > 0.5', 'At least 1 breakthrough per week']
      };

    case 'skill_silo_risk':
      return {
        ...baseStrategy,
        strategy: 'Strategic Skill Diversification',
        actions: [
          'Schedule tasks in underutilized branches',
          'Create cross-skill integration projects',
          'Set minimum weekly time for each major skill area',
          'Look for synergies between different skills'
        ],
        timeline: 'Implement over next 2 weeks',
        successMetrics: ['Active branches >= 3', 'No single branch >50% of tasks']
      };

    case 'burnout_risk':
      return {
        ...baseStrategy,
        strategy: 'Energy Recovery and Sustainability',
        actions: [
          'Reduce daily learning load by 25%',
          'Introduce energy-boosting activities',
          'Schedule mandatory rest days',
          'Focus on intrinsically motivating topics'
        ],
        timeline: 'Immediate implementation',
        successMetrics: ['Average energy >3.5/5', 'Energy trend stabilized']
      };

    default:
      return {
        ...baseStrategy,
        strategy: `Address ${risk.title}`,
        actions: [risk.recommendation || 'Review and adjust current approach'],
        timeline: 'Next 1-2 weeks',
        successMetrics: ['Risk level reduced']
      };
    }
  }

  // Opportunity Processing Methods

  enrichOpportunities(opportunities) {
    return opportunities.map(opp => ({
      ...opp,
      urgencyScore: this.calculateOpportunityUrgency(opp),
      valueScore: this.calculateOpportunityValue(opp),
      feasibilityScore: this.calculateOpportunityFeasibility(opp)
    }));
  }

  async generateOpportunityActionPlans(enrichedOpportunities, projectId) {
    const actionPlans = [];

    for (const opportunity of enrichedOpportunities.slice(0, 2)) { // Top 2 opportunities
      const plan = await this.createOpportunityActionPlan(opportunity, projectId);
      if (plan) {actionPlans.push(plan);}
    }

    return actionPlans;
  }

  async createOpportunityActionPlan(opportunity, projectId) {
    const basePlan = {
      id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      opportunityType: opportunity.type,
      title: `Capitalize on ${opportunity.title}`,
      value: opportunity.value,
      urgency: opportunity.urgencyScore,
      createdAt: new Date().toISOString()
    };

    switch (opportunity.type) {
    case 'breakthrough_momentum':
      return {
        ...basePlan,
        strategy: 'Momentum Amplification',
        actions: [
          'Schedule highest-difficulty task within 48 hours',
          'Share breakthrough insights to reinforce learning',
          'Tackle a challenge you previously avoided',
          'Connect breakthroughs to broader learning goals'
        ],
        timeline: opportunity.timeWindow || 'Next 2-3 days',
        expectedOutcome: 'Additional breakthrough or significant skill advancement'
      };

    case 'skill_synergy':
      return {
        ...basePlan,
        strategy: 'Cross-Skill Integration',
        actions: [
          'Design project combining recent skill areas',
          'Look for unique applications of skill combinations',
          'Create learning tasks that bridge different domains',
          'Document synergistic insights and patterns'
        ],
        timeline: opportunity.timeWindow || 'Next week',
        expectedOutcome: 'Unique skill integration and differentiated capability'
      };

    case 'difficulty_readiness':
      return {
        ...basePlan,
        strategy: 'Challenge Escalation',
        actions: [
          'Increase task difficulty by 1-2 levels immediately',
          'Seek out advanced challenges in current focus area',
          'Consider expert-level learning resources',
          'Set stretch goals that push current limits'
        ],
        timeline: opportunity.timeWindow || 'Immediate',
        expectedOutcome: 'Accelerated skill development and increased confidence'
      };

    default:
      return {
        ...basePlan,
        strategy: `Leverage ${opportunity.title}`,
        actions: [opportunity.recommendation || 'Take action on this opportunity'],
        timeline: opportunity.timeWindow || 'Next 1-2 weeks',
        expectedOutcome: 'Opportunity successfully leveraged'
      };
    }
  }

  // Identity Processing Methods

  extractIdentityRecommendations(identityInsights) {
    const recommendations = [];

    // Extract from proactive strategies
    if (identityInsights.proactiveStrategies) {
      identityInsights.proactiveStrategies.forEach(strategy => {
        recommendations.push({
          type: strategy.type,
          title: strategy.title,
          description: strategy.description,
          priority: strategy.priority,
          timeframe: strategy.timeframe,
          actions: strategy.actions || []
        });
      });
    }

    // Extract from strategic insights
    if (identityInsights.strategicInsights?.insights) {
      identityInsights.strategicInsights.insights.forEach(insight => {
        if (insight.strategicImplication) {
          recommendations.push({
            type: 'strategic_insight',
            title: insight.title,
            description: insight.strategicImplication,
            priority: insight.confidence >= 0.8 ? 'high' : 'medium',
            timeframe: 'ongoing',
            actions: [insight.strategicImplication]
          });
        }
      });
    }

    return recommendations;
  }

  identifyIdentityPriorities(identityInsights) {
    const priorities = [];

    // High-priority risks become immediate priorities
    if (identityInsights.identityRisks) {
      const highRisks = identityInsights.identityRisks.filter(r => r.priority === 'high');
      highRisks.forEach(risk => {
        priorities.push({
          type: 'risk_mitigation',
          title: `Address ${risk.title}`,
          description: risk.message,
          urgency: 'high',
          recommendation: risk.recommendation
        });
      });
    }

    // High-value opportunities become medium priorities
    if (identityInsights.identityOpportunities) {
      const highValueOpps = identityInsights.identityOpportunities.filter(o => o.value === 'high');
      highValueOpps.forEach(opp => {
        priorities.push({
          type: 'opportunity_capture',
          title: `Pursue ${opp.title}`,
          description: opp.description,
          urgency: 'medium',
          recommendation: opp.recommendation
        });
      });
    }

    return priorities.slice(0, 3); // Top 3 priorities
  }

  async generateIdentityActionPlan(identityInsights, projectId) {
    const { baseAnalysis, strategicInsights, reflectionSummary } = identityInsights;

    if (!baseAnalysis || !strategicInsights) {
      return null;
    }

    return {
      id: `identity-plan-${Date.now()}`,
      projectId,
      currentState: reflectionSummary?.currentState || 'In development',
      overallAssessment: strategicInsights.overallAssessment || 'developing',
      keyFocus: strategicInsights.keyDevelopmentAreas?.[0] || 'Continue current development',
      nextMilestone: baseAnalysis.nextIdentityMilestone?.type || 'Skill advancement',
      recommendedActions: this.extractTopIdentityActions(identityInsights),
      timeframe: '2-4 weeks',
      createdAt: new Date().toISOString()
    };
  }

  extractTopIdentityActions(identityInsights) {
    const actions = [];

    // From proactive strategies
    if (identityInsights.proactiveStrategies) {
      identityInsights.proactiveStrategies.slice(0, 2).forEach(strategy => {
        if (strategy.actions) {
          actions.push(...strategy.actions);
        }
      });
    }

    // From micro-shifts
    if (identityInsights.baseAnalysis?.microShifts) {
      identityInsights.baseAnalysis.microShifts.slice(0, 2).forEach(shift => {
        actions.push({
          action: shift.description,
          timeframe: '1-2 weeks'
        });
      });
    }

    return actions.slice(0, 4); // Top 4 actions
  }

  // Proactive Alert Generation

  async generateProactiveAlerts(projectId, items, type) {
    const alertTitle = this.generateAlertTitle(type, items);
    const alertMessage = this.generateAlertMessage(type, items);

    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId,
      type,
      title: alertTitle,
      message: alertMessage,
      items,
      urgency: items.some(i => i.priority === 'high' || i.urgency === 'high') ? 'high' : 'medium',
      createdAt: new Date().toISOString(),
      read: false
    };

    // Store alert for user retrieval
    await this.storeProactiveAlert(projectId, alert);

    // Emit immediate alert event
    this.eventBus.emit('insights:proactive_alert', alert, 'ProactiveInsightsHandler');

    console.log(`🚨 Generated proactive alert: ${alertTitle}`);
  }

  generateAlertTitle(type, items) {
    const count = items.length;

    switch (type) {
    case 'strategic':
      return `${count} Strategic Insight${count > 1 ? 's' : ''} Require${count === 1 ? 's' : ''} Attention`;
    case 'risk':
      return `${count} Critical Risk${count > 1 ? 's' : ''} Detected`;
    case 'opportunity':
      return `${count} Time-Sensitive Opportunit${count === 1 ? 'y' : 'ies'} Available`;
    default:
      return `${count} Item${count > 1 ? 's' : ''} Need Attention`;
    }
  }

  generateAlertMessage(type, items) {
    const titles = items.map(i => i.title || i.type).slice(0, 2);
    const moreCount = Math.max(0, items.length - 2);

    let message = titles.join(' and ');
    if (moreCount > 0) {
      message += ` and ${moreCount} more`;
    }

    switch (type) {
    case 'strategic':
      return `Strategic insights detected: ${message}. Review recommendations to optimize your learning strategy.`;
    case 'risk':
      return `Critical risks identified: ${message}. Immediate action recommended to prevent setbacks.`;
    case 'opportunity':
      return `Time-sensitive opportunities: ${message}. Act quickly to maximize learning potential.`;
    default:
      return `Items requiring attention: ${message}.`;
    }
  }

  // Utility Calculation Methods

  calculateInsightUrgency(insight, systemState) {
    let urgency = 1; // Base urgency

    // High confidence insights are more urgent
    if (insight.confidence >= 0.9) {urgency += 2;}
    else if (insight.confidence >= 0.7) {urgency += 1;}

    // Stalling/declining patterns are urgent
    if (insight.type.includes('stalling') || insight.type.includes('declining')) {urgency += 2;}

    // High momentum insights are moderately urgent (opportunity cost)
    if (insight.type.includes('accelerating') || insight.type.includes('momentum')) {urgency += 1;}

    return Math.min(3, urgency); // Cap at 3
  }

  calculateActionability(insight) {
    // Check if insight has clear action suggestions
    if (insight.actionSuggestion) {return 3;}
    if (insight.strategicImplication) {return 2;}
    return 1;
  }

  calculateStrategicValue(insight) {
    let value = 1; // Base value

    // High confidence insights have higher strategic value
    if (insight.confidence >= 0.8) {value += 2;}
    else if (insight.confidence >= 0.6) {value += 1;}

    // Momentum and trajectory insights are strategically valuable
    if (insight.type.includes('momentum') || insight.type.includes('trajectory')) {value += 1;}

    return Math.min(3, value); // Cap at 3
  }

  calculateRiskImpact(risk) {
    const impactMap = { high: 3, medium: 2, low: 1 };
    return impactMap[risk.priority] || 1;
  }

  calculateRiskLikelihood(risk) {
    // Based on risk type patterns
    const likelihoodMap = {
      'stagnation_risk': 2,
      'burnout_risk': 3,
      'skill_silo_risk': 2,
      'engagement_decline_risk': 3
    };
    return likelihoodMap[risk.type] || 2;
  }

  calculateRiskUrgency(risk) {
    return this.calculateRiskImpact(risk) * this.calculateRiskLikelihood(risk);
  }

  calculateOpportunityUrgency(opportunity) {
    if (opportunity.timeWindow?.includes('immediate')) {return 3;}
    if (opportunity.timeWindow?.includes('next 2') || opportunity.timeWindow?.includes('next 3')) {return 2;}
    return 1;
  }

  calculateOpportunityValue(opportunity) {
    const valueMap = { high: 3, medium: 2, low: 1 };
    return valueMap[opportunity.value] || 1;
  }

  calculateOpportunityFeasibility(opportunity) {
    return opportunity.actionable ? 3 : 1;
  }

  // Data Persistence Methods

  async storeInsightHistory(projectId, type, insights) {
    try {
      const historyKey = `${projectId}-${type}`;
      const existingHistory = this.insightHistory.get(historyKey) || [];

      const newEntry = {
        timestamp: new Date().toISOString(),
        type,
        insights: Array.isArray(insights) ? insights : [insights],
        count: Array.isArray(insights) ? insights.length : 1
      };

      existingHistory.push(newEntry);

      // Keep only last 10 entries
      if (existingHistory.length > 10) {
        existingHistory.splice(0, existingHistory.length - 10);
      }

      this.insightHistory.set(historyKey, existingHistory);

      // Optionally persist to disk
      await this.dataPersistence.saveProjectData(
        projectId,
        `insights_history_${type}.json`,
        existingHistory
      );

    } catch (error) {
      console.error('Error storing insight history:', error);
    }
  }

  async storeProactiveAlert(projectId, alert) {
    try {
      const alertsFile = 'proactive_alerts.json';
      let alerts = [];

      try {
        alerts = await this.dataPersistence.loadProjectData(projectId, alertsFile) || [];
      } catch (error) {
        // File doesn't exist yet, start with empty array
      }

      alerts.push(alert);

      // Keep only last 20 alerts
      if (alerts.length > 20) {
        alerts.splice(0, alerts.length - 20);
      }

      await this.dataPersistence.saveProjectData(projectId, alertsFile, alerts);

    } catch (error) {
      console.error('Error storing proactive alert:', error);
    }
  }

  /**
   * Get insight history for analysis
   * @param {string} projectId - Project ID
   * @param {string} type - Insight type
   * @returns {Array} Insight history
   */
  getInsightHistory(projectId, type) {
    const historyKey = `${projectId}-${type}`;
    return this.insightHistory.get(historyKey) || [];
  }

  /**
   * Get recent proactive alerts
   * @param {string} projectId - Project ID
   * @returns {Array} Recent alerts
   */
  async getRecentAlerts(projectId) {
    try {
      return await this.dataPersistence.loadProjectData(projectId, 'proactive_alerts.json') || [];
    } catch (error) {
      return [];
    }
  }
}