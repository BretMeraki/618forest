/**
 * Intelligent Task Batcher Module
 * Groups similar tasks for efficient batch processing
 */

import { TASK_CONFIG, PERFORMANCE } from '../constants.js';
import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'TaskBatcher' });

export class TaskBatcher {
  constructor(options = {}) {
    this.options = {
      maxBatchSize: options.maxBatchSize || 10,
      maxWaitTime: options.maxWaitTime || 30000, // 30 seconds
      minBatchSize: options.minBatchSize || 2,
      similarityThreshold: options.similarityThreshold || 0.7,
      enableSmartBatching: options.enableSmartBatching !== false,
      ...options
    };
    
    // Batching queues
    this.batchQueues = new Map();
    this.pendingTasks = new Map();
    this.batchTimers = new Map();
    
    // Batch processing metrics
    this.metrics = {
      totalBatches: 0,
      totalTasks: 0,
      averageBatchSize: 0,
      averageWaitTime: 0,
      efficiencyGain: 0,
      similarityMatches: 0
    };
    
    // Task similarity cache
    this.similarityCache = new Map();
    
    // Batch strategies
    this.batchStrategies = {
      type: this.batchByType.bind(this),
      complexity: this.batchByComplexity.bind(this),
      duration: this.batchByDuration.bind(this),
      priority: this.batchByPriority.bind(this),
      semantic: this.batchBySemantic.bind(this),
      hybrid: this.batchByHybrid.bind(this)
    };
    
    this.currentStrategy = options.strategy || 'hybrid';
    
    logger.info('TaskBatcher initialized', {
      strategy: this.currentStrategy,
      options: this.options
    });
  }

  /**
   * Add task to batching system
   */
  async addTask(task, context = {}) {
    const taskId = task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Enhance task with batching metadata
      const enhancedTask = {
        ...task,
        id: taskId,
        batchMetadata: {
          addedAt: Date.now(),
          context: context,
          priority: task.priority || 200,
          estimatedDuration: this.parseTimeToMinutes(task.duration || '30 minutes'),
          complexity: task.difficulty || 3,
          type: task.type || 'general'
        }
      };
      
      // Find or create appropriate batch
      const batchKey = await this.findOptimalBatch(enhancedTask);
      
      if (!this.batchQueues.has(batchKey)) {
        this.batchQueues.set(batchKey, []);
        this.startBatchTimer(batchKey);
      }
      
      // Add task to batch
      this.batchQueues.get(batchKey).push(enhancedTask);
      this.pendingTasks.set(taskId, { batchKey, task: enhancedTask });
      
      logger.debug('Task added to batch', {
        taskId: taskId,
        batchKey: batchKey,
        batchSize: this.batchQueues.get(batchKey).length
      });
      
      // Check if batch is ready for processing
      const batch = this.batchQueues.get(batchKey);
      if (batch.length >= this.options.maxBatchSize || context.immediate) {
        return await this.processBatch(batchKey);
      }
      
      return {
        success: true,
        taskId: taskId,
        batchKey: batchKey,
        batchSize: batch.length,
        status: 'queued'
      };
      
    } catch (error) {
      logger.error('Error adding task to batch', { error: error.message, taskId });
      return {
        success: false,
        error: error.message,
        taskId: taskId
      };
    }
  }

  /**
   * Find optimal batch for a task
   */
  async findOptimalBatch(task) {
    if (!this.options.enableSmartBatching) {
      return 'default';
    }
    
    const strategy = this.batchStrategies[this.currentStrategy];
    if (strategy) {
      return await strategy(task);
    }
    
    return await this.batchByHybrid(task);
  }

  /**
   * Batch tasks by type
   */
  async batchByType(task) {
    const taskType = task.batchMetadata.type;
    return `type_${taskType}`;
  }

  /**
   * Batch tasks by complexity level
   */
  async batchByComplexity(task) {
    const complexity = task.batchMetadata.complexity;
    const complexityRange = Math.floor(complexity / 2) * 2; // Group in ranges of 2
    return `complexity_${complexityRange}-${complexityRange + 1}`;
  }

  /**
   * Batch tasks by duration
   */
  async batchByDuration(task) {
    const duration = task.batchMetadata.estimatedDuration;
    let durationRange;
    
    if (duration <= 15) {
      durationRange = 'short';
    } else if (duration <= 45) {
      durationRange = 'medium';
    } else if (duration <= 90) {
      durationRange = 'long';
    } else {
      durationRange = 'extended';
    }
    
    return `duration_${durationRange}`;
  }

  /**
   * Batch tasks by priority
   */
  async batchByPriority(task) {
    const priority = task.batchMetadata.priority;
    let priorityRange;
    
    if (priority >= 400) {
      priorityRange = 'high';
    } else if (priority >= 200) {
      priorityRange = 'medium';
    } else {
      priorityRange = 'low';
    }
    
    return `priority_${priorityRange}`;
  }

  /**
   * Batch tasks by semantic similarity
   */
  async batchBySemantic(task) {
    const taskText = `${task.title || ''} ${task.description || ''}`.toLowerCase();
    
    // Check existing batches for semantic similarity
    for (const [batchKey, batch] of this.batchQueues.entries()) {
      if (batch.length > 0) {
        const similarity = await this.calculateSemanticSimilarity(taskText, batch[0]);
        if (similarity >= this.options.similarityThreshold) {
          this.metrics.similarityMatches++;
          return batchKey;
        }
      }
    }
    
    // Create new semantic batch
    const semanticKey = this.generateSemanticKey(taskText);
    return `semantic_${semanticKey}`;
  }

  /**
   * Hybrid batching strategy combining multiple factors
   */
  async batchByHybrid(task) {
    const type = task.batchMetadata.type;
    const complexity = Math.floor(task.batchMetadata.complexity / 2) * 2;
    const priority = task.batchMetadata.priority >= 300 ? 'high' : 'normal';
    
    // Check for semantic similarity within type/complexity groups
    const baseKey = `${type}_${complexity}_${priority}`;
    
    if (this.batchQueues.has(baseKey)) {
      const existingBatch = this.batchQueues.get(baseKey);
      if (existingBatch.length > 0) {
        const similarity = await this.calculateSemanticSimilarity(
          `${task.title || ''} ${task.description || ''}`.toLowerCase(),
          existingBatch[0]
        );
        
        if (similarity >= this.options.similarityThreshold * 0.8) { // Lower threshold for hybrid
          return baseKey;
        }
      }
    }
    
    return baseKey;
  }

  /**
   * Calculate semantic similarity between task and existing batch
   */
  async calculateSemanticSimilarity(taskText, batchTask) {
    const batchText = `${batchTask.title || ''} ${batchTask.description || ''}`.toLowerCase();
    
    // Use cached similarity if available
    const cacheKey = `${taskText}_${batchText}`;
    if (this.similarityCache.has(cacheKey)) {
      return this.similarityCache.get(cacheKey);
    }
    
    // Simple keyword-based similarity
    const taskWords = new Set(taskText.split(/\s+/).filter(word => word.length > 2));
    const batchWords = new Set(batchText.split(/\s+/).filter(word => word.length > 2));
    
    const intersection = new Set([...taskWords].filter(word => batchWords.has(word)));
    const union = new Set([...taskWords, ...batchWords]);
    
    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    
    // Cache the result
    this.similarityCache.set(cacheKey, similarity);
    
    // Limit cache size
    if (this.similarityCache.size > 1000) {
      const firstKey = this.similarityCache.keys().next().value;
      this.similarityCache.delete(firstKey);
    }
    
    return similarity;
  }

  /**
   * Generate semantic key from task text
   */
  generateSemanticKey(taskText) {
    // Extract key terms and create a semantic identifier
    const words = taskText.split(/\s+/).filter(word => word.length > 3);
    const keyWords = words.slice(0, 3).join('_');
    return keyWords || 'general';
  }

  /**
   * Start batch timer for automatic processing
   */
  startBatchTimer(batchKey) {
    if (this.batchTimers.has(batchKey)) {
      clearTimeout(this.batchTimers.get(batchKey));
    }
    
    const timer = setTimeout(async () => {
      await this.processBatch(batchKey);
    }, this.options.maxWaitTime);
    
    this.batchTimers.set(batchKey, timer);
  }

  /**
   * Process a batch of tasks
   */
  async processBatch(batchKey) {
    const batch = this.batchQueues.get(batchKey);
    if (!batch || batch.length === 0) {
      return { success: false, error: 'Empty batch' };
    }
    
    const startTime = Date.now();
    
    try {
      // Clear timer
      if (this.batchTimers.has(batchKey)) {
        clearTimeout(this.batchTimers.get(batchKey));
        this.batchTimers.delete(batchKey);
      }
      
      // Sort batch by priority
      batch.sort((a, b) => (b.batchMetadata.priority || 0) - (a.batchMetadata.priority || 0));
      
      // Process batch
      const results = await this.executeBatch(batch, batchKey);
      
      // Update metrics
      this.updateMetrics(batch, startTime);
      
      // Clean up
      this.batchQueues.delete(batchKey);
      batch.forEach(task => this.pendingTasks.delete(task.id));
      
      logger.info('Batch processed successfully', {
        batchKey: batchKey,
        taskCount: batch.length,
        duration: Date.now() - startTime,
        strategy: this.currentStrategy
      });
      
      return {
        success: true,
        batchKey: batchKey,
        taskCount: batch.length,
        results: results,
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      logger.error('Error processing batch', { error: error.message, batchKey });
      return {
        success: false,
        error: error.message,
        batchKey: batchKey
      };
    }
  }

  /**
   * Execute batch of tasks
   */
  async executeBatch(tasks, batchKey) {
    const results = [];
    
    // Batch execution strategies
    const executionStrategy = this.determineExecutionStrategy(tasks);
    
    switch (executionStrategy) {
      case 'parallel':
        results.push(...await this.executeParallel(tasks));
        break;
      case 'sequential':
        results.push(...await this.executeSequential(tasks));
        break;
      case 'pipeline':
        results.push(...await this.executePipeline(tasks));
        break;
      default:
        results.push(...await this.executeSequential(tasks));
    }
    
    return results;
  }

  /**
   * Determine optimal execution strategy for batch
   */
  determineExecutionStrategy(tasks) {
    const avgComplexity = tasks.reduce((sum, task) => sum + task.batchMetadata.complexity, 0) / tasks.length;
    const avgDuration = tasks.reduce((sum, task) => sum + task.batchMetadata.estimatedDuration, 0) / tasks.length;
    
    // High complexity or long duration tasks should be sequential
    if (avgComplexity >= 7 || avgDuration >= 60) {
      return 'sequential';
    }
    
    // Similar short tasks can be parallel
    if (avgComplexity <= 3 && avgDuration <= 20) {
      return 'parallel';
    }
    
    // Mixed complexity can use pipeline
    return 'pipeline';
  }

  /**
   * Execute tasks in parallel
   */
  async executeParallel(tasks) {
    const promises = tasks.map(task => this.executeTask(task));
    return await Promise.all(promises);
  }

  /**
   * Execute tasks sequentially
   */
  async executeSequential(tasks) {
    const results = [];
    for (const task of tasks) {
      const result = await this.executeTask(task);
      results.push(result);
    }
    return results;
  }

  /**
   * Execute tasks in pipeline mode
   */
  async executePipeline(tasks) {
    const results = [];
    const batchSize = Math.min(3, tasks.length);
    
    for (let i = 0; i < tasks.length; i += batchSize) {
      const batch = tasks.slice(i, i + batchSize);
      const batchResults = await this.executeParallel(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  /**
   * Execute individual task
   */
  async executeTask(task) {
    const startTime = Date.now();
    
    try {
      // Simulate task execution
      // In real implementation, this would call the actual task processor
      await new Promise(resolve => setTimeout(resolve, Math.min(100, task.batchMetadata.estimatedDuration)));
      
      return {
        taskId: task.id,
        success: true,
        duration: Date.now() - startTime,
        result: 'Task completed successfully'
      };
    } catch (error) {
      return {
        taskId: task.id,
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Update batching metrics
   */
  updateMetrics(batch, startTime) {
    this.metrics.totalBatches++;
    this.metrics.totalTasks += batch.length;
    
    const waitTimes = batch.map(task => startTime - task.batchMetadata.addedAt);
    const avgWaitTime = waitTimes.reduce((sum, time) => sum + time, 0) / waitTimes.length;
    
    this.metrics.averageBatchSize = this.metrics.totalTasks / this.metrics.totalBatches;
    this.metrics.averageWaitTime = (this.metrics.averageWaitTime + avgWaitTime) / 2;
    
    // Calculate efficiency gain (estimated)
    const estimatedIndividualTime = batch.reduce((sum, task) => sum + task.batchMetadata.estimatedDuration, 0);
    const actualBatchTime = Date.now() - startTime;
    this.metrics.efficiencyGain = Math.max(0, (estimatedIndividualTime - actualBatchTime) / estimatedIndividualTime);
  }

  /**
   * Get batching statistics
   */
  getBatchingStats() {
    return {
      metrics: { ...this.metrics },
      currentStrategy: this.currentStrategy,
      activeBatches: this.batchQueues.size,
      pendingTasks: this.pendingTasks.size,
      options: { ...this.options },
      queueStatus: Array.from(this.batchQueues.entries()).map(([key, batch]) => ({
        batchKey: key,
        taskCount: batch.length,
        oldestTask: batch.length > 0 ? Date.now() - batch[0].batchMetadata.addedAt : 0
      })),
      timestamp: Date.now()
    };
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
    
    return unit.startsWith('h') ? value * 60 : value;
  }

  /**
   * Change batching strategy
   */
  setBatchingStrategy(strategy) {
    if (this.batchStrategies[strategy]) {
      this.currentStrategy = strategy;
      logger.info('Batching strategy updated', { strategy });
      return { success: true, strategy };
    } else {
      logger.warn('Invalid batching strategy', { strategy });
      return { success: false, error: 'Invalid strategy' };
    }
  }

  /**
   * Force process all pending batches
   */
  async forceProcessAllBatches() {
    const results = [];
    const batchKeys = Array.from(this.batchQueues.keys());
    
    for (const batchKey of batchKeys) {
      const result = await this.processBatch(batchKey);
      results.push(result);
    }
    
    return results;
  }

  /**
   * Clean up and destroy the batcher
   */
  destroy() {
    // Clear all timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    // Clear all data structures
    this.batchQueues.clear();
    this.pendingTasks.clear();
    this.batchTimers.clear();
    this.similarityCache.clear();
    
    logger.info('TaskBatcher destroyed');
  }
}