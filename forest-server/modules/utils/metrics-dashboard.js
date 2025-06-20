/**
 * Advanced Metrics Dashboard Module
 * Comprehensive performance and productivity metrics visualization
 */

import { TASK_CONFIG, PERFORMANCE, SCORING } from '../constants.js';
import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'MetricsDashboard' });

export class MetricsDashboard {
  constructor(performanceMonitor, cacheManager, backgroundProcessor, resourceAllocator, taskBatcher, learningSystem) {
    this.performanceMonitor = performanceMonitor;
    this.cacheManager = cacheManager;
    this.backgroundProcessor = backgroundProcessor;
    this.resourceAllocator = resourceAllocator;
    this.taskBatcher = taskBatcher;
    this.learningSystem = learningSystem;
    
    // Dashboard configuration
    this.dashboardConfig = {
      refreshInterval: 30000, // 30 seconds
      historyRetention: 24 * 60 * 60 * 1000, // 24 hours
      aggregationIntervals: ['1m', '5m', '15m', '1h', '6h', '24h'],
      alertThresholds: {
        performance: { warning: 2000, critical: 5000 }, // Response time in ms
        memory: { warning: 70, critical: 85 }, // Percentage
        errorRate: { warning: 0.05, critical: 0.1 }, // Percentage
        efficiency: { warning: 0.7, critical: 0.5 } // Efficiency score
      }
    };
    
    // Metrics storage
    this.metricsHistory = {
      performance: [],
      productivity: [],
      system: [],
      user: [],
      alerts: []
    };
    
    // Dashboard widgets
    this.widgets = {
      performance: this.createPerformanceWidget.bind(this),
      productivity: this.createProductivityWidget.bind(this),
      system: this.createSystemWidget.bind(this),
      learning: this.createLearningWidget.bind(this),
      tasks: this.createTasksWidget.bind(this),
      resources: this.createResourcesWidget.bind(this),
      trends: this.createTrendsWidget.bind(this),
      alerts: this.createAlertsWidget.bind(this)
    };
    
    // Current metrics snapshot
    this.currentMetrics = {
      timestamp: Date.now(),
      performance: {},
      productivity: {},
      system: {},
      user: {},
      health: 'unknown'
    };
    
    // Start metrics collection
    this.startMetricsCollection();
    
    logger.info('MetricsDashboard initialized', {
      refreshInterval: this.dashboardConfig.refreshInterval,
      widgets: Object.keys(this.widgets).length
    });
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    // Collect metrics at regular intervals
    this.metricsTimer = setInterval(async () => {
      await this.collectMetrics();
    }, this.dashboardConfig.refreshInterval);
    
    // Initial collection
    this.collectMetrics();
    
    logger.info('Metrics collection started');
  }

  /**
   * Stop metrics collection
   */
  stopMetricsCollection() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
      logger.info('Metrics collection stopped');
    }
  }

  /**
   * Collect all metrics
   */
  async collectMetrics() {
    try {
      const timestamp = Date.now();
      
      // Collect performance metrics
      const performanceMetrics = await this.collectPerformanceMetrics();
      
      // Collect productivity metrics
      const productivityMetrics = await this.collectProductivityMetrics();
      
      // Collect system metrics
      const systemMetrics = await this.collectSystemMetrics();
      
      // Collect user metrics
      const userMetrics = await this.collectUserMetrics();
      
      // Update current snapshot
      this.currentMetrics = {
        timestamp: timestamp,
        performance: performanceMetrics,
        productivity: productivityMetrics,
        system: systemMetrics,
        user: userMetrics,
        health: this.calculateOverallHealth(performanceMetrics, systemMetrics)
      };
      
      // Store in history
      this.storeMetricsHistory(this.currentMetrics);
      
      // Check for alerts
      await this.checkAlerts(this.currentMetrics);
      
      logger.debug('Metrics collected successfully', {
        timestamp: timestamp,
        health: this.currentMetrics.health
      });
      
    } catch (error) {
      logger.error('Error collecting metrics', { error: error.message });
    }
  }

  /**
   * Collect performance metrics
   */
  async collectPerformanceMetrics() {
    const metrics = {};
    
    try {
      if (this.performanceMonitor) {
        const perfStats = await this.performanceMonitor.getPerformanceMetrics();
        metrics.responseTime = perfStats.averageResponseTime || 0;
        metrics.throughput = perfStats.requestsPerSecond || 0;
        metrics.errorRate = perfStats.errorRate || 0;
        metrics.uptime = perfStats.uptime || 0;
        metrics.p95ResponseTime = perfStats.p95ResponseTime || 0;
        metrics.p99ResponseTime = perfStats.p99ResponseTime || 0;
      }
      
      if (this.cacheManager) {
        const cacheStats = this.cacheManager.getCacheStats();
        metrics.cacheHitRate = parseFloat(cacheStats.hitRate) || 0;
        metrics.cacheSize = cacheStats.totalEntries || 0;
        metrics.cacheMemoryUsage = cacheStats.memoryUsage || '0B';
      }
      
    } catch (error) {
      logger.warn('Error collecting performance metrics', { error: error.message });
    }
    
    return metrics;
  }

  /**
   * Collect productivity metrics
   */
  async collectProductivityMetrics() {
    const metrics = {};
    
    try {
      if (this.taskBatcher) {
        const batchStats = this.taskBatcher.getBatchingStats();
        metrics.tasksProcessed = batchStats.metrics.totalTasks || 0;
        metrics.batchEfficiency = batchStats.metrics.efficiencyGain || 0;
        metrics.averageBatchSize = batchStats.metrics.averageBatchSize || 0;
        metrics.pendingTasks = batchStats.pendingTasks || 0;
      }
      
      if (this.backgroundProcessor) {
        const bgStats = this.backgroundProcessor.getProcessorStats();
        metrics.backgroundTasksCompleted = bgStats.metrics.totalProcessed || 0;
        metrics.backgroundTasksSuccess = bgStats.metrics.successfulTasks || 0;
        metrics.backgroundProcessingTime = bgStats.metrics.averageProcessingTime || 0;
      }
      
    } catch (error) {
      logger.warn('Error collecting productivity metrics', { error: error.message });
    }
    
    return metrics;
  }

  /**
   * Collect system metrics
   */
  async collectSystemMetrics() {
    const metrics = {};
    
    try {
      if (this.resourceAllocator) {
        const resourceStats = this.resourceAllocator.getResourceStats();
        metrics.resourceUtilization = resourceStats.utilization || 0;
        metrics.resourceEfficiency = resourceStats.efficiency || 0;
        metrics.allocationStrategy = resourceStats.currentStrategy || 'unknown';
        metrics.successfulAllocations = resourceStats.adaptationMetrics.successfulAllocations || 0;
        metrics.failedAllocations = resourceStats.adaptationMetrics.failedAllocations || 0;
      }
      
      // System health indicators
      metrics.memoryUsage = process.memoryUsage();
      metrics.cpuUsage = process.cpuUsage();
      metrics.nodeVersion = process.version;
      metrics.platform = process.platform;
      
    } catch (error) {
      logger.warn('Error collecting system metrics', { error: error.message });
    }
    
    return metrics;
  }

  /**
   * Collect user metrics
   */
  async collectUserMetrics() {
    const metrics = {};
    
    try {
      if (this.learningSystem) {
        const learningStats = this.learningSystem.getLearningStats();
        metrics.totalInteractions = learningStats.totalInteractions || 0;
        metrics.patternsIdentified = learningStats.learningMetrics.patternsIdentified || 0;
        metrics.adaptationsApplied = learningStats.learningMetrics.adaptationsApplied || 0;
        metrics.accuracyScore = learningStats.learningMetrics.accuracyScore || 0;
        metrics.confidenceLevel = learningStats.confidenceLevel || 0;
      }
      
    } catch (error) {
      logger.warn('Error collecting user metrics', { error: error.message });
    }
    
    return metrics;
  }

  /**
   * Calculate overall system health
   */
  calculateOverallHealth(performanceMetrics, systemMetrics) {
    const healthFactors = [];
    
    // Performance health
    if (performanceMetrics.responseTime !== undefined) {
      if (performanceMetrics.responseTime < this.dashboardConfig.alertThresholds.performance.warning) {
        healthFactors.push(1.0);
      } else if (performanceMetrics.responseTime < this.dashboardConfig.alertThresholds.performance.critical) {
        healthFactors.push(0.7);
      } else {
        healthFactors.push(0.3);
      }
    }
    
    // Error rate health
    if (performanceMetrics.errorRate !== undefined) {
      if (performanceMetrics.errorRate < this.dashboardConfig.alertThresholds.errorRate.warning) {
        healthFactors.push(1.0);
      } else if (performanceMetrics.errorRate < this.dashboardConfig.alertThresholds.errorRate.critical) {
        healthFactors.push(0.6);
      } else {
        healthFactors.push(0.2);
      }
    }
    
    // Memory health
    if (systemMetrics.memoryUsage && systemMetrics.memoryUsage.heapUsed) {
      const memoryPercent = (systemMetrics.memoryUsage.heapUsed / systemMetrics.memoryUsage.heapTotal) * 100;
      if (memoryPercent < this.dashboardConfig.alertThresholds.memory.warning) {
        healthFactors.push(1.0);
      } else if (memoryPercent < this.dashboardConfig.alertThresholds.memory.critical) {
        healthFactors.push(0.6);
      } else {
        healthFactors.push(0.2);
      }
    }
    
    // Calculate overall health
    if (healthFactors.length === 0) {
      return 'unknown';
    }
    
    const averageHealth = healthFactors.reduce((sum, factor) => sum + factor, 0) / healthFactors.length;
    
    if (averageHealth >= 0.8) {
      return 'excellent';
    } else if (averageHealth >= 0.6) {
      return 'good';
    } else if (averageHealth >= 0.4) {
      return 'fair';
    } else if (averageHealth >= 0.2) {
      return 'poor';
    } else {
      return 'critical';
    }
  }

  /**
   * Store metrics in history
   */
  storeMetricsHistory(metrics) {
    // Store in appropriate history arrays
    this.metricsHistory.performance.push({
      timestamp: metrics.timestamp,
      ...metrics.performance
    });
    
    this.metricsHistory.productivity.push({
      timestamp: metrics.timestamp,
      ...metrics.productivity
    });
    
    this.metricsHistory.system.push({
      timestamp: metrics.timestamp,
      ...metrics.system
    });
    
    this.metricsHistory.user.push({
      timestamp: metrics.timestamp,
      ...metrics.user
    });
    
    // Clean up old history
    this.cleanupHistory();
  }

  /**
   * Clean up old metrics history
   */
  cleanupHistory() {
    const cutoffTime = Date.now() - this.dashboardConfig.historyRetention;
    
    for (const [category, history] of Object.entries(this.metricsHistory)) {
      if (Array.isArray(history)) {
        this.metricsHistory[category] = history.filter(entry => entry.timestamp > cutoffTime);
      }
    }
  }

  /**
   * Check for alerts
   */
  async checkAlerts(metrics) {
    const alerts = [];
    
    // Performance alerts
    if (metrics.performance.responseTime > this.dashboardConfig.alertThresholds.performance.critical) {
      alerts.push({
        type: 'critical',
        category: 'performance',
        message: `Response time critical: ${metrics.performance.responseTime}ms`,
        value: metrics.performance.responseTime,
        threshold: this.dashboardConfig.alertThresholds.performance.critical,
        timestamp: metrics.timestamp
      });
    } else if (metrics.performance.responseTime > this.dashboardConfig.alertThresholds.performance.warning) {
      alerts.push({
        type: 'warning',
        category: 'performance',
        message: `Response time elevated: ${metrics.performance.responseTime}ms`,
        value: metrics.performance.responseTime,
        threshold: this.dashboardConfig.alertThresholds.performance.warning,
        timestamp: metrics.timestamp
      });
    }
    
    // Error rate alerts
    if (metrics.performance.errorRate > this.dashboardConfig.alertThresholds.errorRate.critical) {
      alerts.push({
        type: 'critical',
        category: 'performance',
        message: `Error rate critical: ${(metrics.performance.errorRate * 100).toFixed(2)}%`,
        value: metrics.performance.errorRate,
        threshold: this.dashboardConfig.alertThresholds.errorRate.critical,
        timestamp: metrics.timestamp
      });
    }
    
    // Store alerts
    if (alerts.length > 0) {
      this.metricsHistory.alerts.push(...alerts);
      logger.warn('Alerts triggered', { count: alerts.length, alerts });
    }
  }

  /**
   * Get dashboard data
   */
  async getDashboardData(timeRange = '1h') {
    try {
      const dashboardData = {
        timestamp: Date.now(),
        timeRange: timeRange,
        currentMetrics: this.currentMetrics,
        widgets: {},
        alerts: this.getRecentAlerts(timeRange),
        summary: this.generateSummary()
      };
      
      // Generate widgets
      for (const [widgetName, widgetFunction] of Object.entries(this.widgets)) {
        try {
          dashboardData.widgets[widgetName] = await widgetFunction(timeRange);
        } catch (error) {
          logger.warn(`Error generating widget ${widgetName}`, { error: error.message });
          dashboardData.widgets[widgetName] = { error: error.message };
        }
      }
      
      return dashboardData;
      
    } catch (error) {
      logger.error('Error getting dashboard data', { error: error.message });
      return {
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Create performance widget
   */
  async createPerformanceWidget(timeRange) {
    const history = this.getHistoryForTimeRange(this.metricsHistory.performance, timeRange);
    
    return {
      title: 'Performance Metrics',
      type: 'chart',
      data: {
        responseTime: this.aggregateMetric(history, 'responseTime'),
        throughput: this.aggregateMetric(history, 'throughput'),
        errorRate: this.aggregateMetric(history, 'errorRate'),
        cacheHitRate: this.aggregateMetric(history, 'cacheHitRate')
      },
      current: {
        responseTime: this.currentMetrics.performance.responseTime || 0,
        throughput: this.currentMetrics.performance.throughput || 0,
        errorRate: this.currentMetrics.performance.errorRate || 0,
        cacheHitRate: this.currentMetrics.performance.cacheHitRate || 0
      },
      health: this.currentMetrics.health
    };
  }

  /**
   * Create productivity widget
   */
  async createProductivityWidget(timeRange) {
    const history = this.getHistoryForTimeRange(this.metricsHistory.productivity, timeRange);
    
    return {
      title: 'Productivity Metrics',
      type: 'stats',
      data: {
        tasksProcessed: this.aggregateMetric(history, 'tasksProcessed'),
        batchEfficiency: this.aggregateMetric(history, 'batchEfficiency'),
        backgroundTasksCompleted: this.aggregateMetric(history, 'backgroundTasksCompleted')
      },
      current: {
        tasksProcessed: this.currentMetrics.productivity.tasksProcessed || 0,
        batchEfficiency: this.currentMetrics.productivity.batchEfficiency || 0,
        pendingTasks: this.currentMetrics.productivity.pendingTasks || 0
      }
    };
  }

  /**
   * Create system widget
   */
  async createSystemWidget(timeRange) {
    const history = this.getHistoryForTimeRange(this.metricsHistory.system, timeRange);
    
    return {
      title: 'System Resources',
      type: 'gauge',
      data: {
        resourceUtilization: this.aggregateMetric(history, 'resourceUtilization'),
        resourceEfficiency: this.aggregateMetric(history, 'resourceEfficiency')
      },
      current: {
        resourceUtilization: this.currentMetrics.system.resourceUtilization || 0,
        resourceEfficiency: this.currentMetrics.system.resourceEfficiency || 0,
        allocationStrategy: this.currentMetrics.system.allocationStrategy || 'unknown',
        memoryUsage: this.formatMemoryUsage(this.currentMetrics.system.memoryUsage)
      }
    };
  }

  /**
   * Create learning widget
   */
  async createLearningWidget(timeRange) {
    const history = this.getHistoryForTimeRange(this.metricsHistory.user, timeRange);
    
    return {
      title: 'Learning & Adaptation',
      type: 'progress',
      data: {
        accuracyScore: this.aggregateMetric(history, 'accuracyScore'),
        confidenceLevel: this.aggregateMetric(history, 'confidenceLevel')
      },
      current: {
        totalInteractions: this.currentMetrics.user.totalInteractions || 0,
        patternsIdentified: this.currentMetrics.user.patternsIdentified || 0,
        adaptationsApplied: this.currentMetrics.user.adaptationsApplied || 0,
        accuracyScore: this.currentMetrics.user.accuracyScore || 0,
        confidenceLevel: this.currentMetrics.user.confidenceLevel || 0
      }
    };
  }

  /**
   * Create tasks widget
   */
  async createTasksWidget(timeRange) {
    return {
      title: 'Task Management',
      type: 'summary',
      current: {
        pendingTasks: this.currentMetrics.productivity.pendingTasks || 0,
        averageBatchSize: this.currentMetrics.productivity.averageBatchSize || 0,
        batchEfficiency: this.currentMetrics.productivity.batchEfficiency || 0,
        backgroundTasksCompleted: this.currentMetrics.productivity.backgroundTasksCompleted || 0
      }
    };
  }

  /**
   * Create resources widget
   */
  async createResourcesWidget(timeRange) {
    return {
      title: 'Resource Allocation',
      type: 'allocation',
      current: {
        strategy: this.currentMetrics.system.allocationStrategy || 'unknown',
        utilization: this.currentMetrics.system.resourceUtilization || 0,
        efficiency: this.currentMetrics.system.resourceEfficiency || 0,
        successfulAllocations: this.currentMetrics.system.successfulAllocations || 0,
        failedAllocations: this.currentMetrics.system.failedAllocations || 0
      }
    };
  }

  /**
   * Create trends widget
   */
  async createTrendsWidget(timeRange) {
    const performanceHistory = this.getHistoryForTimeRange(this.metricsHistory.performance, timeRange);
    const productivityHistory = this.getHistoryForTimeRange(this.metricsHistory.productivity, timeRange);
    
    return {
      title: 'Trends Analysis',
      type: 'trends',
      data: {
        responseTimeTrend: this.calculateTrend(performanceHistory, 'responseTime'),
        throughputTrend: this.calculateTrend(performanceHistory, 'throughput'),
        efficiencyTrend: this.calculateTrend(productivityHistory, 'batchEfficiency'),
        errorRateTrend: this.calculateTrend(performanceHistory, 'errorRate')
      }
    };
  }

  /**
   * Create alerts widget
   */
  async createAlertsWidget(timeRange) {
    const recentAlerts = this.getRecentAlerts(timeRange);
    
    return {
      title: 'System Alerts',
      type: 'alerts',
      data: {
        total: recentAlerts.length,
        critical: recentAlerts.filter(alert => alert.type === 'critical').length,
        warning: recentAlerts.filter(alert => alert.type === 'warning').length,
        recent: recentAlerts.slice(0, 10) // Last 10 alerts
      }
    };
  }

  /**
   * Get history for time range
   */
  getHistoryForTimeRange(history, timeRange) {
    const now = Date.now();
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = now - timeRangeMs;
    
    return history.filter(entry => entry.timestamp > cutoffTime);
  }

  /**
   * Parse time range string to milliseconds
   */
  parseTimeRange(timeRange) {
    const match = timeRange.match(/^(\d+)([mhd])$/);
    if (!match) {
      return 60 * 60 * 1000; // Default to 1 hour
    }
    
    const value = parseInt(match[1]);
    const unit = match[2];
    
    switch (unit) {
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 60 * 60 * 1000;
    }
  }

  /**
   * Aggregate metric over time
   */
  aggregateMetric(history, metricName) {
    if (history.length === 0) {
      return [];
    }
    
    return history.map(entry => ({
      timestamp: entry.timestamp,
      value: entry[metricName] || 0
    }));
  }

  /**
   * Calculate trend for metric
   */
  calculateTrend(history, metricName) {
    if (history.length < 2) {
      return { direction: 'stable', change: 0 };
    }
    
    const values = history.map(entry => entry[metricName] || 0);
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    const change = secondAvg - firstAvg;
    const changePercent = firstAvg !== 0 ? (change / firstAvg) * 100 : 0;
    
    let direction = 'stable';
    if (Math.abs(changePercent) > 10) {
      direction = changePercent > 0 ? 'increasing' : 'decreasing';
    }
    
    return {
      direction: direction,
      change: changePercent,
      firstAvg: firstAvg,
      secondAvg: secondAvg
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(timeRange) {
    const timeRangeMs = this.parseTimeRange(timeRange);
    const cutoffTime = Date.now() - timeRangeMs;
    
    return this.metricsHistory.alerts.filter(alert => alert.timestamp > cutoffTime);
  }

  /**
   * Generate dashboard summary
   */
  generateSummary() {
    return {
      overallHealth: this.currentMetrics.health,
      keyMetrics: {
        responseTime: this.currentMetrics.performance.responseTime || 0,
        errorRate: this.currentMetrics.performance.errorRate || 0,
        resourceUtilization: this.currentMetrics.system.resourceUtilization || 0,
        tasksProcessed: this.currentMetrics.productivity.tasksProcessed || 0
      },
      recommendations: this.generateRecommendations()
    };
  }

  /**
   * Generate recommendations based on current metrics
   */
  generateRecommendations() {
    const recommendations = [];
    
    // Performance recommendations
    if (this.currentMetrics.performance.responseTime > this.dashboardConfig.alertThresholds.performance.warning) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        message: 'Consider optimizing response time or scaling resources'
      });
    }
    
    // Resource recommendations
    if (this.currentMetrics.system.resourceUtilization > 0.8) {
      recommendations.push({
        type: 'resources',
        priority: 'medium',
        message: 'Resource utilization is high, consider load balancing'
      });
    }
    
    // Efficiency recommendations
    if (this.currentMetrics.productivity.batchEfficiency < 0.5) {
      recommendations.push({
        type: 'productivity',
        priority: 'medium',
        message: 'Batch processing efficiency could be improved'
      });
    }
    
    return recommendations;
  }

  /**
   * Format memory usage for display
   */
  formatMemoryUsage(memoryUsage) {
    if (!memoryUsage) {
      return 'Unknown';
    }
    
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };
    
    return {
      heapUsed: formatBytes(memoryUsage.heapUsed),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      external: formatBytes(memoryUsage.external),
      rss: formatBytes(memoryUsage.rss)
    };
  }

  /**
   * Export metrics data
   */
  async exportMetrics(format = 'json', timeRange = '24h') {
    try {
      const exportData = {
        timestamp: Date.now(),
        timeRange: timeRange,
        format: format,
        currentMetrics: this.currentMetrics,
        history: {
          performance: this.getHistoryForTimeRange(this.metricsHistory.performance, timeRange),
          productivity: this.getHistoryForTimeRange(this.metricsHistory.productivity, timeRange),
          system: this.getHistoryForTimeRange(this.metricsHistory.system, timeRange),
          user: this.getHistoryForTimeRange(this.metricsHistory.user, timeRange)
        },
        alerts: this.getRecentAlerts(timeRange),
        summary: this.generateSummary()
      };
      
      if (format === 'csv') {
        return this.convertToCSV(exportData);
      } else {
        return JSON.stringify(exportData, null, 2);
      }
      
    } catch (error) {
      logger.error('Error exporting metrics', { error: error.message });
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    // Simplified CSV conversion for performance metrics
    const csvLines = ['timestamp,responseTime,throughput,errorRate,cacheHitRate'];
    
    for (const entry of data.history.performance) {
      csvLines.push([
        entry.timestamp,
        entry.responseTime || 0,
        entry.throughput || 0,
        entry.errorRate || 0,
        entry.cacheHitRate || 0
      ].join(','));
    }
    
    return csvLines.join('\n');
  }

  /**
   * Get dashboard configuration
   */
  getDashboardConfig() {
    return {
      ...this.dashboardConfig,
      availableWidgets: Object.keys(this.widgets),
      availableTimeRanges: ['1m', '5m', '15m', '1h', '6h', '24h'],
      availableFormats: ['json', 'csv']
    };
  }

  /**
   * Update dashboard configuration
   */
  updateDashboardConfig(newConfig) {
    try {
      this.dashboardConfig = {
        ...this.dashboardConfig,
        ...newConfig
      };
      
      // Restart metrics collection if interval changed
      if (newConfig.refreshInterval) {
        this.stopMetricsCollection();
        this.startMetricsCollection();
      }
      
      logger.info('Dashboard configuration updated', { newConfig });
      return { success: true };
      
    } catch (error) {
      logger.error('Error updating dashboard configuration', { error: error.message });
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup and destroy the dashboard
   */
  destroy() {
    this.stopMetricsCollection();
    
    // Clear metrics history
    for (const category of Object.keys(this.metricsHistory)) {
      if (Array.isArray(this.metricsHistory[category])) {
        this.metricsHistory[category] = [];
      }
    }
    
    logger.info('MetricsDashboard destroyed');
  }
}
