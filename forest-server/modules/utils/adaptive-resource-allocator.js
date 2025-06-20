/**
 * Adaptive Resource Allocator Module
 * Dynamically manages system resources based on real-time performance metrics
 */

import { PERFORMANCE, TASK_CONFIG } from '../constants.js';
import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'AdaptiveResourceAllocator' });

export class AdaptiveResourceAllocator {
  constructor(performanceMonitor, cacheManager, backgroundProcessor) {
    this.performanceMonitor = performanceMonitor;
    this.cacheManager = cacheManager;
    this.backgroundProcessor = backgroundProcessor;
    
    // Resource allocation state
    this.resourcePools = {
      cpu: { allocated: 0, available: 100, threshold: 80 },
      memory: { allocated: 0, available: 100, threshold: 75 },
      cache: { allocated: 0, available: 100, threshold: 85 },
      backgroundTasks: { allocated: 0, available: 10, threshold: 8 }
    };
    
    // Allocation strategies
    this.allocationStrategies = {
      conservative: { cpuWeight: 0.6, memoryWeight: 0.7, cacheWeight: 0.8 },
      balanced: { cpuWeight: 0.8, memoryWeight: 0.8, cacheWeight: 0.9 },
      aggressive: { cpuWeight: 0.95, memoryWeight: 0.9, cacheWeight: 0.95 }
    };
    
    // Current strategy
    this.currentStrategy = 'balanced';
    
    // Performance history for adaptation
    this.performanceHistory = [];
    this.adaptationMetrics = {
      totalAllocations: 0,
      successfulAllocations: 0,
      failedAllocations: 0,
      averageResponseTime: 0,
      resourceEfficiency: 0
    };
    
    // Auto-adaptation settings
    this.autoAdaptation = {
      enabled: true,
      interval: 30000, // 30 seconds
      thresholds: {
        responseTimeThreshold: 2000, // 2 seconds
        errorRateThreshold: 0.05, // 5%
        efficiencyThreshold: 0.8 // 80%
      }
    };
    
    // Start auto-adaptation if enabled
    if (this.autoAdaptation.enabled) {
      this.startAutoAdaptation();
    }
    
    logger.info('AdaptiveResourceAllocator initialized', {
      strategy: this.currentStrategy,
      autoAdaptation: this.autoAdaptation.enabled
    });
  }

  /**
   * Allocate resources for a task based on its complexity and current system state
   */
  async allocateResources(task, context = {}) {
    const startTime = Date.now();
    
    try {
      // Analyze task requirements
      const requirements = this.analyzeTaskRequirements(task, context);
      
      // Check current system state
      const systemState = await this.getSystemState();
      
      // Calculate optimal allocation
      const allocation = this.calculateOptimalAllocation(requirements, systemState);
      
      // Attempt to reserve resources
      const reservation = await this.reserveResources(allocation);
      
      if (reservation.success) {
        this.adaptationMetrics.successfulAllocations++;
        this.updateResourcePools(allocation, 'allocate');
        
        logger.debug('Resources allocated successfully', {
          taskId: task.id,
          allocation: allocation,
          strategy: this.currentStrategy
        });
        
        return {
          success: true,
          allocation: allocation,
          reservation: reservation,
          estimatedDuration: requirements.estimatedDuration,
          resourceId: reservation.resourceId
        };
      } else {
        this.adaptationMetrics.failedAllocations++;
        
        // Try with degraded allocation
        const degradedAllocation = this.calculateDegradedAllocation(requirements, systemState);
        const degradedReservation = await this.reserveResources(degradedAllocation);
        
        if (degradedReservation.success) {
          this.updateResourcePools(degradedAllocation, 'allocate');
          
          logger.warn('Resources allocated with degraded performance', {
            taskId: task.id,
            originalAllocation: allocation,
            degradedAllocation: degradedAllocation
          });
          
          return {
            success: true,
            allocation: degradedAllocation,
            reservation: degradedReservation,
            estimatedDuration: requirements.estimatedDuration * 1.5,
            resourceId: degradedReservation.resourceId,
            degraded: true
          };
        } else {
          logger.error('Failed to allocate resources', {
            taskId: task.id,
            requirements: requirements,
            systemState: systemState
          });
          
          return {
            success: false,
            error: 'Insufficient resources available',
            requirements: requirements,
            systemState: systemState
          };
        }
      }
    } catch (error) {
      logger.error('Error in resource allocation', { error: error.message, taskId: task.id });
      this.adaptationMetrics.failedAllocations++;
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      this.adaptationMetrics.totalAllocations++;
      this.recordPerformanceMetric(startTime, Date.now());
    }
  }

  /**
   * Release allocated resources
   */
  async releaseResources(resourceId, allocation) {
    try {
      // Release reserved resources
      await this.unreserveResources(resourceId);
      
      // Update resource pools
      this.updateResourcePools(allocation, 'release');
      
      logger.debug('Resources released successfully', {
        resourceId: resourceId,
        allocation: allocation
      });
      
      return { success: true };
    } catch (error) {
      logger.error('Error releasing resources', { error: error.message, resourceId });
      return { success: false, error: error.message };
    }
  }

  /**
   * Analyze task requirements based on complexity and type
   */
  analyzeTaskRequirements(task, context) {
    const difficulty = task.difficulty || TASK_CONFIG.DEFAULT_DIFFICULTY;
    const duration = this.parseTimeToMinutes(task.duration || '30 minutes');
    const taskType = task.type || 'general';
    
    // Base requirements
    let cpuRequirement = Math.min(20 + (difficulty * 10), 80);
    let memoryRequirement = Math.min(15 + (difficulty * 8), 70);
    let cacheRequirement = Math.min(10 + (difficulty * 5), 60);
    let backgroundTaskRequirement = Math.min(1 + Math.floor(difficulty / 3), 5);
    
    // Adjust based on task type
    switch (taskType) {
      case 'analytical':
        cpuRequirement *= 1.3;
        memoryRequirement *= 1.2;
        break;
      case 'creative':
        cacheRequirement *= 1.4;
        backgroundTaskRequirement *= 1.2;
        break;
      case 'research':
        memoryRequirement *= 1.3;
        cacheRequirement *= 1.5;
        break;
      case 'administrative':
        cpuRequirement *= 0.8;
        memoryRequirement *= 0.9;
        break;
    }
    
    // Adjust based on context
    if (context.highPriority) {
      cpuRequirement *= 1.2;
      memoryRequirement *= 1.1;
    }
    
    if (context.batchProcessing) {
      backgroundTaskRequirement *= 1.5;
    }
    
    return {
      cpu: Math.round(cpuRequirement),
      memory: Math.round(memoryRequirement),
      cache: Math.round(cacheRequirement),
      backgroundTasks: Math.round(backgroundTaskRequirement),
      estimatedDuration: duration,
      taskType: taskType,
      difficulty: difficulty
    };
  }

  /**
   * Calculate optimal resource allocation
   */
  calculateOptimalAllocation(requirements, systemState) {
    const strategy = this.allocationStrategies[this.currentStrategy];
    
    const allocation = {
      cpu: Math.min(
        requirements.cpu,
        (this.resourcePools.cpu.available - this.resourcePools.cpu.allocated) * strategy.cpuWeight
      ),
      memory: Math.min(
        requirements.memory,
        (this.resourcePools.memory.available - this.resourcePools.memory.allocated) * strategy.memoryWeight
      ),
      cache: Math.min(
        requirements.cache,
        (this.resourcePools.cache.available - this.resourcePools.cache.allocated) * strategy.cacheWeight
      ),
      backgroundTasks: Math.min(
        requirements.backgroundTasks,
        this.resourcePools.backgroundTasks.available - this.resourcePools.backgroundTasks.allocated
      )
    };
    
    // Adjust based on system performance
    if (systemState.averageResponseTime > this.autoAdaptation.thresholds.responseTimeThreshold) {
      allocation.cpu *= 0.8;
      allocation.memory *= 0.9;
    }
    
    if (systemState.errorRate > this.autoAdaptation.thresholds.errorRateThreshold) {
      allocation.cpu *= 0.7;
      allocation.memory *= 0.8;
    }
    
    return {
      cpu: Math.max(1, Math.round(allocation.cpu)),
      memory: Math.max(1, Math.round(allocation.memory)),
      cache: Math.max(1, Math.round(allocation.cache)),
      backgroundTasks: Math.max(1, Math.round(allocation.backgroundTasks))
    };
  }

  /**
   * Calculate degraded allocation when optimal allocation fails
   */
  calculateDegradedAllocation(requirements, systemState) {
    const allocation = this.calculateOptimalAllocation(requirements, systemState);
    
    // Reduce allocation by 40%
    return {
      cpu: Math.max(1, Math.round(allocation.cpu * 0.6)),
      memory: Math.max(1, Math.round(allocation.memory * 0.6)),
      cache: Math.max(1, Math.round(allocation.cache * 0.6)),
      backgroundTasks: Math.max(1, Math.round(allocation.backgroundTasks * 0.6))
    };
  }

  /**
   * Reserve resources based on allocation
   */
  async reserveResources(allocation) {
    const resourceId = `res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check if resources are available
    for (const [resource, amount] of Object.entries(allocation)) {
      const pool = this.resourcePools[resource];
      if (pool.allocated + amount > pool.available) {
        return {
          success: false,
          error: `Insufficient ${resource} resources`,
          required: amount,
          available: pool.available - pool.allocated
        };
      }
    }
    
    // Reserve resources
    const reservation = {
      resourceId: resourceId,
      allocation: allocation,
      timestamp: Date.now(),
      success: true
    };
    
    return reservation;
  }

  /**
   * Unreserve resources
   */
  async unreserveResources(resourceId) {
    // In a real implementation, this would release the specific reservation
    logger.debug('Resources unreserved', { resourceId });
    return { success: true };
  }

  /**
   * Update resource pools based on allocation/release
   */
  updateResourcePools(allocation, action) {
    const multiplier = action === 'allocate' ? 1 : -1;
    
    for (const [resource, amount] of Object.entries(allocation)) {
      if (this.resourcePools[resource]) {
        this.resourcePools[resource].allocated += amount * multiplier;
        this.resourcePools[resource].allocated = Math.max(0, this.resourcePools[resource].allocated);
      }
    }
  }

  /**
   * Get current system state
   */
  async getSystemState() {
    const performanceMetrics = this.performanceMonitor ? 
      await this.performanceMonitor.getPerformanceMetrics() : {};
    
    const cacheStats = this.cacheManager ? 
      this.cacheManager.getCacheStats() : {};
    
    return {
      averageResponseTime: performanceMetrics.averageResponseTime || 0,
      errorRate: performanceMetrics.errorRate || 0,
      memoryUsage: performanceMetrics.memoryUsage || 0,
      cpuLoad: performanceMetrics.cpuLoad || 0,
      cacheHitRate: parseFloat(cacheStats.hitRate) || 0,
      timestamp: Date.now()
    };
  }

  /**
   * Start auto-adaptation process
   */
  startAutoAdaptation() {
    this.adaptationTimer = setInterval(async () => {
      await this.performAdaptation();
    }, this.autoAdaptation.interval);
    
    logger.info('Auto-adaptation started', {
      interval: this.autoAdaptation.interval,
      thresholds: this.autoAdaptation.thresholds
    });
  }

  /**
   * Stop auto-adaptation process
   */
  stopAutoAdaptation() {
    if (this.adaptationTimer) {
      clearInterval(this.adaptationTimer);
      this.adaptationTimer = null;
      logger.info('Auto-adaptation stopped');
    }
  }

  /**
   * Perform adaptation based on current performance
   */
  async performAdaptation() {
    try {
      const systemState = await this.getSystemState();
      const currentEfficiency = this.calculateResourceEfficiency();
      
      // Determine if strategy change is needed
      let newStrategy = this.currentStrategy;
      
      if (systemState.averageResponseTime > this.autoAdaptation.thresholds.responseTimeThreshold) {
        newStrategy = 'conservative';
      } else if (currentEfficiency < this.autoAdaptation.thresholds.efficiencyThreshold) {
        newStrategy = 'aggressive';
      } else if (systemState.errorRate < this.autoAdaptation.thresholds.errorRateThreshold / 2) {
        newStrategy = 'balanced';
      }
      
      if (newStrategy !== this.currentStrategy) {
        this.currentStrategy = newStrategy;
        logger.info('Strategy adapted', {
          oldStrategy: this.currentStrategy,
          newStrategy: newStrategy,
          systemState: systemState,
          efficiency: currentEfficiency
        });
      }
      
      // Update adaptation metrics
      this.adaptationMetrics.resourceEfficiency = currentEfficiency;
      this.adaptationMetrics.averageResponseTime = systemState.averageResponseTime;
      
    } catch (error) {
      logger.error('Error in auto-adaptation', { error: error.message });
    }
  }

  /**
   * Calculate resource efficiency
   */
  calculateResourceEfficiency() {
    if (this.adaptationMetrics.totalAllocations === 0) {
      return 1.0;
    }
    
    const successRate = this.adaptationMetrics.successfulAllocations / this.adaptationMetrics.totalAllocations;
    const utilizationRate = this.calculateUtilizationRate();
    
    return (successRate * 0.7) + (utilizationRate * 0.3);
  }

  /**
   * Calculate resource utilization rate
   */
  calculateUtilizationRate() {
    let totalUtilization = 0;
    let resourceCount = 0;
    
    for (const [resource, pool] of Object.entries(this.resourcePools)) {
      totalUtilization += pool.allocated / pool.available;
      resourceCount++;
    }
    
    return resourceCount > 0 ? totalUtilization / resourceCount : 0;
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(startTime, endTime) {
    const duration = endTime - startTime;
    this.performanceHistory.push({
      duration: duration,
      timestamp: endTime
    });
    
    // Keep only last 100 records
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }

  /**
   * Parse time string to minutes
   */
  parseTimeToMinutes(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') {
      return TASK_CONFIG.DEFAULT_DURATION;
    }
    
    const match = timeStr.match(/(\d+)\s*(minute|minutes|min|hour|hours|hr|h)/i);
    if (!match) {
      return TASK_CONFIG.DEFAULT_DURATION;
    }
    
    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    
    if (unit.startsWith('h')) {
      return value * 60;
    } else {
      return value;
    }
  }

  /**
   * Get comprehensive resource allocation statistics
   */
  getResourceStats() {
    return {
      resourcePools: { ...this.resourcePools },
      currentStrategy: this.currentStrategy,
      adaptationMetrics: { ...this.adaptationMetrics },
      autoAdaptation: { ...this.autoAdaptation },
      performanceHistory: this.performanceHistory.slice(-10), // Last 10 records
      efficiency: this.calculateResourceEfficiency(),
      utilization: this.calculateUtilizationRate(),
      timestamp: Date.now()
    };
  }

  /**
   * Update allocation strategy
   */
  setAllocationStrategy(strategy) {
    if (this.allocationStrategies[strategy]) {
      this.currentStrategy = strategy;
      logger.info('Allocation strategy updated', { strategy });
      return { success: true, strategy };
    } else {
      logger.warn('Invalid allocation strategy', { strategy });
      return { success: false, error: 'Invalid strategy' };
    }
  }

  /**
   * Cleanup and destroy the allocator
   */
  destroy() {
    this.stopAutoAdaptation();
    logger.info('AdaptiveResourceAllocator destroyed');
  }
}