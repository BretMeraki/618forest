/**
 * Performance Monitor
 * Tracks system performance metrics and provides health monitoring
 */

import * as os from 'os';
import { PERFORMANCE } from '../constants.js';
import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'PerformanceMonitor' });

export class PerformanceMonitor {
  constructor(options = {}) {
    this.metricsInterval = options.metricsInterval || PERFORMANCE.METRICS_COLLECTION_INTERVAL;
    this.alertThreshold = options.alertThreshold || PERFORMANCE.PERFORMANCE_ALERT_THRESHOLD;
    this.memoryAlertThreshold = options.memoryAlertThreshold || PERFORMANCE.MEMORY_ALERT_THRESHOLD;
    
    // Performance metrics storage
    this.metrics = {
      responseTimes: [],
      memoryUsage: [],
      systemLoad: [],
      activeConnections: 0,
      requestCounts: {},
      errorCounts: {},
      startTime: Date.now()
    };
    
    // Performance tracking
    this.activeRequests = new Map();
    this.performanceHistory = [];
    this.maxHistorySize = 1000;
    
    // Health status
    this.healthStatus = {
      overall: 'healthy',
      memory: 'healthy',
      cpu: 'healthy',
      responseTime: 'healthy',
      lastCheck: Date.now()
    };
    
    // Start monitoring
    this.startMonitoring();
    
    logger.info('Performance monitor initialized', {
      metricsInterval: this.metricsInterval,
      alertThreshold: this.alertThreshold,
      component: 'PerformanceMonitor'
    });
  }

  /**
   * Start performance monitoring
   */
  startMonitoring() {
    // Collect metrics periodically
    this.metricsTimer = setInterval(() => {
      this.collectSystemMetrics();
      this.checkHealthStatus();
    }, this.metricsInterval);
    
    // Initial metrics collection
    this.collectSystemMetrics();
  }

  /**
   * Start tracking a request/operation
   * @param {string} operationId - Unique operation identifier
   * @param {string} operationType - Type of operation
   * @returns {Object} Tracking context
   */
  startTracking(operationId, operationType = 'generic') {
    const context = {
      id: operationId,
      type: operationType,
      startTime: Date.now(),
      startMemory: process.memoryUsage()
    };
    
    this.activeRequests.set(operationId, context);
    this.metrics.activeConnections++;
    
    // Increment request count
    this.metrics.requestCounts[operationType] = (this.metrics.requestCounts[operationType] || 0) + 1;
    
    return context;
  }

  /**
   * End tracking for an operation
   * @param {string} operationId - Operation identifier
   * @param {boolean} success - Whether operation was successful
   * @param {Object} metadata - Additional metadata
   */
  endTracking(operationId, success = true, metadata = {}) {
    const context = this.activeRequests.get(operationId);
    if (!context) {
      logger.warn('Attempted to end tracking for unknown operation', { operationId });
      return;
    }
    
    const endTime = Date.now();
    const responseTime = endTime - context.startTime;
    const endMemory = process.memoryUsage();
    
    // Calculate memory delta
    const memoryDelta = endMemory.heapUsed - context.startMemory.heapUsed;
    
    // Store performance data
    const performanceData = {
      id: operationId,
      type: context.type,
      responseTime,
      memoryDelta,
      success,
      timestamp: endTime,
      metadata
    };
    
    // Add to metrics
    this.metrics.responseTimes.push(responseTime);
    this.performanceHistory.push(performanceData);
    
    // Maintain history size
    if (this.metrics.responseTimes.length > this.maxHistorySize) {
      this.metrics.responseTimes = this.metrics.responseTimes.slice(-this.maxHistorySize);
    }
    if (this.performanceHistory.length > this.maxHistorySize) {
      this.performanceHistory = this.performanceHistory.slice(-this.maxHistorySize);
    }
    
    // Check for performance alerts
    if (responseTime > this.alertThreshold) {
      logger.warn('Slow operation detected', {
        operationId,
        type: context.type,
        responseTime: `${responseTime}ms`,
        threshold: `${this.alertThreshold}ms`
      });
    }
    
    // Track errors
    if (!success) {
      this.metrics.errorCounts[context.type] = (this.metrics.errorCounts[context.type] || 0) + 1;
    }
    
    // Cleanup
    this.activeRequests.delete(operationId);
    this.metrics.activeConnections--;
    
    logger.debug('Operation tracking completed', {
      operationId,
      type: context.type,
      responseTime: `${responseTime}ms`,
      success,
      memoryDelta: this.formatBytes(memoryDelta)
    });
    
    return performanceData;
  }

  /**
   * Collect system-level metrics
   */
  collectSystemMetrics() {
    const memUsage = process.memoryUsage();
    const loadAvg = os.loadavg();
    
    // Store current metrics
    this.metrics.memoryUsage.push({
      timestamp: Date.now(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      rss: memUsage.rss
    });
    
    this.metrics.systemLoad.push({
      timestamp: Date.now(),
      load1: loadAvg[0],
      load5: loadAvg[1],
      load15: loadAvg[2]
    });
    
    // Maintain metrics array size
    if (this.metrics.memoryUsage.length > this.maxHistorySize) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-this.maxHistorySize);
    }
    if (this.metrics.systemLoad.length > this.maxHistorySize) {
      this.metrics.systemLoad = this.metrics.systemLoad.slice(-this.maxHistorySize);
    }
    
    // Log memory usage if high
    if (memUsage.heapUsed > this.memoryAlertThreshold) {
      logger.warn('High memory usage detected', {
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        threshold: this.formatBytes(this.memoryAlertThreshold)
      });
    }
  }

  /**
   * Check overall system health status
   */
  checkHealthStatus() {
    const now = Date.now();
    
    // Check memory health
    const currentMemory = process.memoryUsage().heapUsed;
    this.healthStatus.memory = currentMemory > this.memoryAlertThreshold ? 'warning' : 'healthy';
    
    // Check response time health
    const recentResponses = this.metrics.responseTimes.slice(-10);
    const avgResponseTime = recentResponses.length > 0 
      ? recentResponses.reduce((sum, time) => sum + time, 0) / recentResponses.length
      : 0;
    this.healthStatus.responseTime = avgResponseTime > this.alertThreshold ? 'warning' : 'healthy';
    
    // Check CPU health (based on system load)
    const recentLoad = this.metrics.systemLoad.slice(-3);
    const avgLoad = recentLoad.length > 0
      ? recentLoad.reduce((sum, load) => sum + load.load1, 0) / recentLoad.length
      : 0;
    const cpuCount = os.cpus().length;
    this.healthStatus.cpu = avgLoad > cpuCount * 0.8 ? 'warning' : 'healthy';
    
    // Determine overall health
    const healthStatuses = Object.values(this.healthStatus).filter(status => status !== now);
    const hasWarnings = healthStatuses.includes('warning');
    const hasErrors = healthStatuses.includes('error');
    
    if (hasErrors) {
      this.healthStatus.overall = 'error';
    } else if (hasWarnings) {
      this.healthStatus.overall = 'warning';
    } else {
      this.healthStatus.overall = 'healthy';
    }
    
    this.healthStatus.lastCheck = now;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance statistics
   */
  getStats() {
    const responseTimes = this.metrics.responseTimes;
    const recentMemory = this.metrics.memoryUsage.slice(-1)[0];
    const recentLoad = this.metrics.systemLoad.slice(-1)[0];
    
    return {
      uptime: Date.now() - this.metrics.startTime,
      activeConnections: this.metrics.activeConnections,
      totalRequests: Object.values(this.metrics.requestCounts).reduce((sum, count) => sum + count, 0),
      totalErrors: Object.values(this.metrics.errorCounts).reduce((sum, count) => sum + count, 0),
      responseTime: {
        avg: responseTimes.length > 0 ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length : 0,
        min: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
        max: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
        p95: this.calculatePercentile(responseTimes, 95),
        p99: this.calculatePercentile(responseTimes, 99)
      },
      memory: recentMemory ? {
        heapUsed: this.formatBytes(recentMemory.heapUsed),
        heapTotal: this.formatBytes(recentMemory.heapTotal),
        external: this.formatBytes(recentMemory.external),
        rss: this.formatBytes(recentMemory.rss)
      } : null,
      systemLoad: recentLoad ? {
        load1: recentLoad.load1.toFixed(2),
        load5: recentLoad.load5.toFixed(2),
        load15: recentLoad.load15.toFixed(2)
      } : null,
      health: { ...this.healthStatus },
      requestCounts: { ...this.metrics.requestCounts },
      errorCounts: { ...this.metrics.errorCounts }
    };
  }

  /**
   * Calculate percentile for response times
   * @param {Array} values - Array of values
   * @param {number} percentile - Percentile to calculate (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Format bytes into human readable format
   * @param {number} bytes - Number of bytes
   * @returns {string} Formatted string
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Shutdown the performance monitor
   */
  shutdown() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
    }
    
    logger.info('Performance monitor shutdown', {
      totalOperations: this.performanceHistory.length,
      uptime: Date.now() - this.metrics.startTime
    });
  }
}
