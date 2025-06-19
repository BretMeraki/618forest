/**
 * System Clock Module
 * Provides periodic background processing for proactive reasoning and strategic analysis
 * Transforms the system from reactive to proactive by continuously analyzing user state
 */

import { bus } from './utils/event-bus.js';
import { DataArchiver } from './data-archiver.js';

export class SystemClock {
  constructor(dataPersistence, projectManagement, reasoningEngine, identityEngine, eventBus = null) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.reasoningEngine = reasoningEngine;
    this.identityEngine = identityEngine;
    this.eventBus = eventBus || bus;

    // Initialize Data Archiver for long-term scalability
    this.dataArchiver = new DataArchiver(dataPersistence, this.eventBus);

    this.isRunning = false;
    this.intervals = new Map(); // Track different interval types
    this.lastAnalysis = new Map(); // Track when different analyses were last run

    this.setupEventListeners();

    // Only show initialization message in terminal mode (not MCP)
    if (process.stdin.isTTY) {
      console.log('🕰️ SystemClock initialized - Ready for proactive reasoning');
    }
  }

  setupEventListeners() {
    // Listen for system events that might trigger immediate analysis
    this.eventBus.on('block:completed', this.onBlockCompleted.bind(this), 'SystemClock');
    this.eventBus.on('project:created', this.onProjectCreated.bind(this), 'SystemClock');
    this.eventBus.on('strategy:evolved', this.onStrategyEvolved.bind(this), 'SystemClock');
  }

  /**
   * Start the system clock with configured intervals
   * @param {Object} config - Clock configuration
   * @param {number} config.strategicAnalysisHours - Hours between strategic analysis (default: 24)
   * @param {number} config.riskDetectionHours - Hours between risk detection (default: 12)
   * @param {number} config.opportunityScansHours - Hours between opportunity scans (default: 6)
   * @param {number} config.identityReflectionDays - Days between identity reflection (default: 7)
   * @param {number} config.archivingDays - Days between archiving checks (default: 30)
   */
  start(config = {}) {
    if (this.isRunning) {
      console.log('⚠️ SystemClock already running');
      return;
    }

    const defaultConfig = {
      strategicAnalysisHours: 24,
      riskDetectionHours: 12,
      opportunityScansHours: 6,
      identityReflectionDays: 7,
      archivingDays: 30,
      enableBackgroundTicks: true
    };

    const clockConfig = { ...defaultConfig, ...config };
    this.isRunning = true;

    // Skip intervals in MCP mode to prevent event loop interference
    const isMcpMode = !process.stdin.isTTY;
    if (isMcpMode) {
      console.log('🕰️ SystemClock starting in MCP mode (intervals disabled to prevent initialization timeout)');
      clockConfig.enableBackgroundTicks = false;
    } else {
      console.log('🕰️ SystemClock starting with config:', clockConfig);
    }

    // Schedule different types of background analysis
    if (clockConfig.enableBackgroundTicks) {
      this.scheduleStrategicAnalysis(clockConfig.strategicAnalysisHours);
      this.scheduleRiskDetection(clockConfig.riskDetectionHours);
      this.scheduleOpportunityScans(clockConfig.opportunityScansHours);
      this.scheduleIdentityReflection(clockConfig.identityReflectionDays);
      this.scheduleArchiving(clockConfig.archivingDays);
    }

    // Emit system clock started event
    this.eventBus.emit('system:clock_started', {
      config: clockConfig,
      startedAt: new Date().toISOString()
    }, 'SystemClock');

    if (isMcpMode) {
      console.log('✅ SystemClock started in MCP mode - Event-driven analysis only');
    } else {
      console.log('✅ SystemClock started - Proactive reasoning engaged');
    }
  }

  /**
   * Stop the system clock and clear all intervals
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.intervals.forEach((intervalId, type) => {
      clearInterval(intervalId);
      console.log(`⏹️ Stopped ${type} interval`);
    });

    this.intervals.clear();
    this.isRunning = false;

    this.eventBus.emit('system:clock_stopped', {
      stoppedAt: new Date().toISOString()
    }, 'SystemClock');

    console.log('🛑 SystemClock stopped');
  }

  /**
   * Schedule periodic strategic analysis
   * @param {number} hours - Interval in hours
   */
  scheduleStrategicAnalysis(hours) {
    const intervalMs = hours * 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      this.performStrategicAnalysis();
    }, intervalMs);

    this.intervals.set('strategic_analysis', intervalId);
    console.log(`📊 Strategic analysis scheduled every ${hours} hours`);

    // Perform initial analysis after a short delay
    setTimeout(() => {
      this.performStrategicAnalysis();
    }, 30000); // 30 seconds delay for system stabilization
  }

  /**
   * Schedule periodic risk detection
   * @param {number} hours - Interval in hours
   */
  scheduleRiskDetection(hours) {
    const intervalMs = hours * 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      this.performRiskDetection();
    }, intervalMs);

    this.intervals.set('risk_detection', intervalId);
    console.log(`⚠️ Risk detection scheduled every ${hours} hours`);

    // Perform initial analysis after a delay
    setTimeout(() => {
      this.performRiskDetection();
    }, 60000); // 1 minute delay
  }

  /**
   * Schedule periodic opportunity scanning
   * @param {number} hours - Interval in hours
   */
  scheduleOpportunityScans(hours) {
    const intervalMs = hours * 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      this.performOpportunityScanning();
    }, intervalMs);

    this.intervals.set('opportunity_scanning', intervalId);
    console.log(`🔍 Opportunity scanning scheduled every ${hours} hours`);

    // Perform initial scan after a delay
    setTimeout(() => {
      this.performOpportunityScanning();
    }, 90000); // 1.5 minutes delay
  }

  /**
   * Schedule periodic identity reflection
   * @param {number} days - Interval in days
   */
  scheduleIdentityReflection(days) {
    const intervalMs = days * 24 * 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      this.performIdentityReflection();
    }, intervalMs);

    this.intervals.set('identity_reflection', intervalId);
    console.log(`🧘 Identity reflection scheduled every ${days} days`);

    // Perform initial reflection after a delay
    setTimeout(() => {
      this.performIdentityReflection();
    }, 120000); // 2 minutes delay
  }

  /**
   * Schedule periodic data archiving
   * @param {number} days - Interval in days
   */
  scheduleArchiving(days) {
    const intervalMs = days * 24 * 60 * 60 * 1000;
    const intervalId = setInterval(() => {
      this.performArchiving();
    }, intervalMs);

    this.intervals.set('data_archiving', intervalId);
    console.log(`📦 Data archiving scheduled every ${days} days`);

    // Perform initial archiving check after a delay
    setTimeout(() => {
      this.performArchiving();
    }, 150000); // 2.5 minutes delay
  }

  /**
   * Perform strategic analysis - main proactive reasoning tick
   */
  async performStrategicAnalysis() {
    try {
      console.log('🔮 SystemClock: Performing strategic analysis...');
      const activeProject = await this.projectManagement.requireActiveProject();

      // Gather comprehensive system state
      const systemState = await this.gatherSystemState(activeProject);

      // Perform deep reasoning analysis
      const strategicInsights = await this.reasoningEngine.performBackgroundAnalysis(
        systemState,
        'strategic_overview'
      );

      // Store analysis timestamp
      this.lastAnalysis.set('strategic_analysis', new Date().toISOString());

      // Emit strategic insights event
      this.eventBus.emit('system:strategic_insights', {
        projectId: activeProject,
        insights: strategicInsights,
        systemState,
        analysisType: 'background_strategic',
        analyzedAt: new Date().toISOString()
      }, 'SystemClock');

      console.log(`✨ Strategic analysis completed - ${strategicInsights.insights?.length || 0} insights generated`);

    } catch (error) {
      console.error('❌ Strategic analysis failed:', error.message);
      await this.dataPersistence.logError('SystemClock.performStrategicAnalysis', error);
    }
  }

  /**
   * Perform risk detection analysis
   */
  async performRiskDetection() {
    try {
      console.log('⚠️ SystemClock: Performing risk detection...');
      const activeProject = await this.projectManagement.requireActiveProject();

      const systemState = await this.gatherSystemState(activeProject);
      const riskAnalysis = await this.reasoningEngine.performBackgroundAnalysis(
        systemState,
        'risk_detection'
      );

      this.lastAnalysis.set('risk_detection', new Date().toISOString());

      this.eventBus.emit('system:risks_detected', {
        projectId: activeProject,
        risks: riskAnalysis.risks || [],
        riskLevel: riskAnalysis.overallRiskLevel || 'low',
        detectedAt: new Date().toISOString()
      }, 'SystemClock');

      console.log(`🚨 Risk detection completed - ${riskAnalysis.risks?.length || 0} risks identified`);

    } catch (error) {
      console.error('❌ Risk detection failed:', error.message);
      await this.dataPersistence.logError('SystemClock.performRiskDetection', error);
    }
  }

  /**
   * Perform opportunity scanning
   */
  async performOpportunityScanning() {
    try {
      console.log('🔍 SystemClock: Performing opportunity scanning...');
      const activeProject = await this.projectManagement.requireActiveProject();

      const systemState = await this.gatherSystemState(activeProject);
      const opportunityAnalysis = await this.reasoningEngine.performBackgroundAnalysis(
        systemState,
        'opportunity_detection'
      );

      this.lastAnalysis.set('opportunity_scanning', new Date().toISOString());

      this.eventBus.emit('system:opportunities_detected', {
        projectId: activeProject,
        opportunities: opportunityAnalysis.opportunities || [],
        priorityLevel: opportunityAnalysis.priorityLevel || 'medium',
        detectedAt: new Date().toISOString()
      }, 'SystemClock');

      console.log(`🎯 Opportunity scanning completed - ${opportunityAnalysis.opportunities?.length || 0} opportunities found`);

    } catch (error) {
      console.error('❌ Opportunity scanning failed:', error.message);
      await this.dataPersistence.logError('SystemClock.performOpportunityScanning', error);
    }
  }

  /**
   * Perform identity reflection analysis
   */
  async performIdentityReflection() {
    try {
      console.log('🧘 SystemClock: Performing identity reflection...');
      const activeProject = await this.projectManagement.requireActiveProject();

      const systemState = await this.gatherSystemState(activeProject);
      const identityAnalysis = await this.identityEngine.performBackgroundReflection(systemState);

      this.lastAnalysis.set('identity_reflection', new Date().toISOString());

      this.eventBus.emit('system:identity_insights', {
        projectId: activeProject,
        identityInsights: identityAnalysis,
        reflectedAt: new Date().toISOString()
      }, 'SystemClock');

      console.log('🌟 Identity reflection completed');

    } catch (error) {
      console.error('❌ Identity reflection failed:', error.message);
      await this.dataPersistence.logError('SystemClock.performIdentityReflection', error);
    }
  }

  /**
   * Perform data archiving for long-term scalability
   */
  async performArchiving() {
    try {
      console.log('📦 SystemClock: Performing data archiving check...');
      const activeProject = await this.projectManagement.requireActiveProject();

      // Check if archiving is needed and perform if necessary
      const archiveNeeded = await this.dataArchiver.assessArchiveNeeds(activeProject);

      if (archiveNeeded) {
        console.log('📦 Archive threshold reached - beginning archiving process');
        const archiveResults = await this.dataArchiver.performArchiving({ projectId: activeProject });

        this.lastAnalysis.set('data_archiving', new Date().toISOString());

        // Emit archiving completed event
        this.eventBus.emit('system:archiving_completed', {
          projectId: activeProject,
          results: archiveResults,
          archivedAt: new Date().toISOString()
        }, 'SystemClock');

        console.log('✅ Archiving completed successfully');
      } else {
        console.log('📦 No archiving needed at this time');
        this.lastAnalysis.set('data_archiving_check', new Date().toISOString());
      }

    } catch (error) {
      console.error('❌ Data archiving failed:', error.message);
      await this.dataPersistence.logError('SystemClock.performArchiving', error);
    }
  }

  /**
   * Gather comprehensive system state for analysis
   * @param {string} projectId - Active project ID
   * @returns {Object} Complete system state
   */
  async gatherSystemState(projectId) {
    const systemState = {
      projectId,
      timestamp: new Date().toISOString(),
      lastAnalyses: Object.fromEntries(this.lastAnalysis)
    };

    try {
      // Load project configuration
      systemState.config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      // Load HTA data for all paths
      systemState.htaData = await this.dataPersistence.loadProjectData(projectId, 'hta.json');

      // Load recent learning history
      systemState.learningHistory = await this.dataPersistence.loadProjectData(projectId, 'learning_history.json');

      // Load recent schedules (last 7 days)
      const recentSchedules = [];
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        try {
          const schedule = await this.dataPersistence.loadProjectData(projectId, `day_${dateStr}.json`);
          if (schedule) {
            recentSchedules.push({ date: dateStr, schedule });
          }
        } catch (error) {
          // Schedule might not exist for this date, continue
        }
      }
      systemState.recentSchedules = recentSchedules;

      // Calculate derived metrics
      systemState.metrics = this.calculateSystemMetrics(systemState);

    } catch (error) {
      console.error('⚠️ Error gathering system state:', error.message);
      systemState.error = error.message;
    }

    return systemState;
  }

  /**
   * Calculate system metrics for analysis
   * @param {Object} systemState - System state data
   * @returns {Object} Calculated metrics
   */
  calculateSystemMetrics(systemState) {
    const metrics = {
      totalCompletedTasks: 0,
      averageDifficulty: 0,
      breakthroughCount: 0,
      branchDiversity: 0,
      momentum: 0,
      lastActivityDays: 0
    };

    try {
      // Analyze learning history
      if (systemState.learningHistory?.completedTopics) {
        const topics = systemState.learningHistory.completedTopics;
        metrics.totalCompletedTasks = topics.length;

        if (topics.length > 0) {
          // Calculate average difficulty
          const difficulties = topics.map(t => t.difficulty || 3);
          metrics.averageDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;

          // Count breakthroughs
          metrics.breakthroughCount = topics.filter(t => t.breakthrough).length;

          // Calculate branch diversity
          const branches = new Set(topics.map(t => t.branch || 'general'));
          metrics.branchDiversity = branches.size;

          // Calculate momentum (tasks completed in last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          metrics.momentum = topics.filter(t => {
            const completedDate = new Date(t.completedAt);
            return completedDate >= sevenDaysAgo;
          }).length;

          // Calculate days since last activity
          const lastTopic = topics[topics.length - 1];
          if (lastTopic?.completedAt) {
            const lastActivity = new Date(lastTopic.completedAt);
            const now = new Date();
            metrics.lastActivityDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
          }
        }
      }

    } catch (error) {
      console.error('⚠️ Error calculating metrics:', error.message);
      metrics.error = error.message;
    }

    return metrics;
  }

  /**
   * React to block completion events
   */
  async onBlockCompleted({ block, _eventMetadata }) {
    // If this is a breakthrough or significant event, trigger immediate analysis
    if (block.breakthrough || (block.opportunityContext?.engagementLevel >= 8)) {
      console.log('🔥 Significant event detected - triggering immediate strategic analysis');

      // Delay to allow other systems to process the completion
      setTimeout(() => {
        this.performStrategicAnalysis();
      }, 5000);
    }
  }

  /**
   * React to project creation events
   */
  async onProjectCreated({ projectId, _eventMetadata }) {
    console.log(`🆕 New project detected: ${projectId} - scheduling initial analysis`);

    // Schedule comprehensive analysis for new project
    setTimeout(() => {
      this.performStrategicAnalysis();
      this.performOpportunityScanning();
    }, 10000);
  }

  /**
   * React to strategy evolution events
   */
  async onStrategyEvolved({ projectId, tasksAdded, _eventMetadata }) {
    if (tasksAdded >= 3) {
      console.log('📈 Significant strategy evolution - triggering risk detection');

      setTimeout(() => {
        this.performRiskDetection();
      }, 3000);
    }
  }

  /**
   * Get system clock status
   * @returns {Object} Clock status and metrics
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      activeIntervals: Array.from(this.intervals.keys()),
      lastAnalyses: Object.fromEntries(this.lastAnalysis),
      uptime: this.isRunning ? 'Active' : 'Stopped'
    };
  }

  /**
   * Trigger immediate analysis of specific type
   * @param {string} analysisType - Type of analysis to perform
   */
  async triggerImmediateAnalysis(analysisType) {
    console.log(`⚡ Triggering immediate ${analysisType} analysis`);

    switch (analysisType) {
    case 'strategic':
      await this.performStrategicAnalysis();
      break;
    case 'risk':
      await this.performRiskDetection();
      break;
    case 'opportunity':
      await this.performOpportunityScanning();
      break;
    case 'identity':
      await this.performIdentityReflection();
      break;
    case 'archive':
      await this.performArchiving();
      break;
    default:
      console.error(`❌ Unknown analysis type: ${analysisType}`);
    }
  }
}