/**
 * Background Task Processor
 * Handles asynchronous operations and task queuing for improved performance
 */

import { PERFORMANCE } from '../constants.js';
import { forestLogger } from '../winston-logger.js';

export class BackgroundProcessor {
  constructor(options = {}) {
    this.taskQueue = [];
    this.processingTasks = new Map();
    this.maxQueueSize = options.maxQueueSize || PERFORMANCE.TASK_QUEUE_SIZE;
    this.processingInterval = options.processingInterval || PERFORMANCE.TASK_PROCESSING_INTERVAL;
    this.workerTimeout = options.workerTimeout || PERFORMANCE.BACKGROUND_WORKER_TIMEOUT;
    
    // Performance metrics
    this.metrics = {
      tasksProcessed: 0,
      tasksQueued: 0,
      tasksFailed: 0,
      averageProcessingTime: 0,
      queueOverflows: 0,
      timeouts: 0
    };
    
    // Processing state
    this.isProcessing = false;
    this.isShuttingDown = false;
    
    // Start background processing
    this.startProcessing();
    
    forestLogger.info('Background processor initialized', {
      maxQueueSize: this.maxQueueSize,
      processingInterval: this.processingInterval,
      component: 'BackgroundProcessor'
    });
  }

  /**
   * Add a task to the background processing queue
   * @param {Object} task - Task configuration
   * @param {string} task.id - Unique task identifier
   * @param {string} task.type - Task type for categorization
   * @param {Function} task.handler - Function to execute
   * @param {Object} task.data - Task data/parameters
   * @param {number} task.priority - Task priority (higher = more important)
   * @param {number} task.maxRetries - Maximum retry attempts
   * @returns {boolean} True if task was queued successfully
   */
  queueTask(task) {
    if (this.isShuttingDown) {
      forestLogger.warn('Cannot queue task during shutdown', { taskId: task.id });
      return false;
    }
    
    if (this.taskQueue.length >= this.maxQueueSize) {
      this.metrics.queueOverflows++;
      forestLogger.warn('Task queue overflow', { 
        queueSize: this.taskQueue.length,
        maxSize: this.maxQueueSize,
        taskId: task.id 
      });
      
      // Remove lowest priority task to make room
      this.evictLowestPriorityTask();
    }
    
    const queuedTask = {
      id: task.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: task.type || 'generic',
      handler: task.handler,
      data: task.data || {},
      priority: task.priority || 1,
      maxRetries: task.maxRetries || 3,
      retryCount: 0,
      queuedAt: Date.now(),
      timeout: task.timeout || this.workerTimeout
    };
    
    // Insert task in priority order
    this.insertTaskByPriority(queuedTask);
    this.metrics.tasksQueued++;
    
    forestLogger.debug('Task queued for background processing', {
      taskId: queuedTask.id,
      type: queuedTask.type,
      priority: queuedTask.priority,
      queueSize: this.taskQueue.length
    });
    
    return true;
  }

  /**
   * Insert task into queue maintaining priority order
   * @param {Object} task - Task to insert
   */
  insertTaskByPriority(task) {
    let insertIndex = this.taskQueue.length;
    
    // Find insertion point (higher priority first)
    for (let i = 0; i < this.taskQueue.length; i++) {
      if (task.priority > this.taskQueue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    
    this.taskQueue.splice(insertIndex, 0, task);
  }

  /**
   * Remove the lowest priority task from queue
   */
  evictLowestPriorityTask() {
    if (this.taskQueue.length === 0) return;
    
    let lowestPriorityIndex = 0;
    let lowestPriority = this.taskQueue[0].priority;
    
    for (let i = 1; i < this.taskQueue.length; i++) {
      if (this.taskQueue[i].priority < lowestPriority) {
        lowestPriority = this.taskQueue[i].priority;
        lowestPriorityIndex = i;
      }
    }
    
    const evictedTask = this.taskQueue.splice(lowestPriorityIndex, 1)[0];
    forestLogger.warn('Evicted low priority task due to queue overflow', {
      taskId: evictedTask.id,
      priority: evictedTask.priority
    });
  }

  /**
   * Start the background processing loop
   */
  startProcessing() {
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    
    this.processingTimer = setInterval(() => {
      this.processNextTask();
    }, this.processingInterval);
  }

  /**
   * Process the next task in the queue
   */
  async processNextTask() {
    if (this.isShuttingDown || this.taskQueue.length === 0) {
      return;
    }
    
    const task = this.taskQueue.shift();
    if (!task) return;
    
    const startTime = Date.now();
    this.processingTasks.set(task.id, task);
    
    try {
      forestLogger.debug('Processing background task', {
        taskId: task.id,
        type: task.type,
        waitTime: startTime - task.queuedAt
      });
      
      // Set up timeout for task execution
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), task.timeout);
      });
      
      // Execute task with timeout
      const taskPromise = Promise.resolve(task.handler(task.data));
      const result = await Promise.race([taskPromise, timeoutPromise]);
      
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(processingTime);
      this.metrics.tasksProcessed++;
      
      forestLogger.debug('Background task completed successfully', {
        taskId: task.id,
        type: task.type,
        processingTime: `${processingTime}ms`
      });
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      
      if (error.message === 'Task timeout') {
        this.metrics.timeouts++;
        forestLogger.warn('Background task timed out', {
          taskId: task.id,
          type: task.type,
          timeout: task.timeout
        });
      } else {
        forestLogger.error('Background task failed', {
          taskId: task.id,
          type: task.type,
          error: error.message,
          retryCount: task.retryCount
        });
      }
      
      // Retry logic
      if (task.retryCount < task.maxRetries) {
        task.retryCount++;
        task.queuedAt = Date.now();
        this.insertTaskByPriority(task);
        
        forestLogger.info('Retrying failed background task', {
          taskId: task.id,
          retryCount: task.retryCount,
          maxRetries: task.maxRetries
        });
      } else {
        this.metrics.tasksFailed++;
        forestLogger.error('Background task failed permanently', {
          taskId: task.id,
          type: task.type,
          finalError: error.message
        });
      }
    } finally {
      this.processingTasks.delete(task.id);
    }
  }

  /**
   * Update processing time metrics
   * @param {number} processingTime - Time taken to process task
   */
  updateProcessingMetrics(processingTime) {
    const totalTasks = this.metrics.tasksProcessed + 1;
    const currentAverage = this.metrics.averageProcessingTime;
    
    // Calculate rolling average
    this.metrics.averageProcessingTime = 
      (currentAverage * (totalTasks - 1) + processingTime) / totalTasks;
  }

  /**
   * Queue a data archiving task
   * @param {Object} archiveData - Data archiving parameters
   */
  queueArchiveTask(archiveData) {
    return this.queueTask({
      id: `archive_${archiveData.projectId}_${Date.now()}`,
      type: 'data_archiving',
      handler: async (data) => {
        const { DataArchiver } = await import('../data-archiver.js');
        const archiver = new DataArchiver();
        return await archiver.performArchiving(data);
      },
      data: archiveData,
      priority: 3,
      maxRetries: 2
    });
  }

  /**
   * Queue a memory sync task
   * @param {Object} syncData - Memory sync parameters
   */
  queueMemorySyncTask(syncData) {
    return this.queueTask({
      id: `memory_sync_${syncData.projectId}_${Date.now()}`,
      type: 'memory_sync',
      handler: async (data) => {
        const { MemorySync } = await import('../memory-sync.js');
        const memorySync = new MemorySync();
        return await memorySync.syncForestMemory(data);
      },
      data: syncData,
      priority: 2,
      maxRetries: 3
    });
  }

  /**
   * Queue a cache warming task
   * @param {Object} warmingData - Cache warming parameters
   */
  queueCacheWarmingTask(warmingData) {
    return this.queueTask({
      id: `cache_warming_${Date.now()}`,
      type: 'cache_warming',
      handler: async (data) => {
        const { CacheManager } = await import('./cache-manager.js');
        const cache = new CacheManager();
        return await cache.warmCache(data.keys, data.loader);
      },
      data: warmingData,
      priority: 1,
      maxRetries: 1
    });
  }

  /**
   * Get current processor status and metrics
   * @returns {Object} Status information
   */
  getStatus() {
    return {
      isProcessing: this.isProcessing,
      isShuttingDown: this.isShuttingDown,
      queueSize: this.taskQueue.length,
      processingTasks: this.processingTasks.size,
      metrics: { ...this.metrics },
      efficiency: this.calculateEfficiency(),
      uptime: Date.now() - (this.startTime || Date.now())
    };
  }

  /**
   * Calculate processor efficiency score
   * @returns {number} Efficiency score (0-100)
   */
  calculateEfficiency() {
    const totalTasks = this.metrics.tasksProcessed + this.metrics.tasksFailed;
    if (totalTasks === 0) return 100;
    
    const successRate = this.metrics.tasksProcessed / totalTasks;
    const overflowRate = 1 - (this.metrics.queueOverflows / Math.max(this.metrics.tasksQueued, 1));
    const timeoutRate = 1 - (this.metrics.timeouts / Math.max(totalTasks, 1));
    
    return Math.round((successRate * 0.5 + overflowRate * 0.3 + timeoutRate * 0.2) * 100);
  }

  /**
   * Gracefully shutdown the processor
   * @param {number} timeout - Maximum time to wait for current tasks
   * @returns {Promise<boolean>} True if shutdown completed successfully
   */
  async shutdown(timeout = 30000) {
    forestLogger.info('Background processor shutdown initiated', {
      queueSize: this.taskQueue.length,
      processingTasks: this.processingTasks.size
    });
    
    this.isShuttingDown = true;
    
    // Stop accepting new tasks
    if (this.processingTimer) {
      clearInterval(this.processingTimer);
    }
    
    // Wait for current tasks to complete
    const startTime = Date.now();
    while (this.processingTasks.size > 0 && Date.now() - startTime < timeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const shutdownSuccess = this.processingTasks.size === 0;
    
    forestLogger.info('Background processor shutdown completed', {
      success: shutdownSuccess,
      remainingTasks: this.processingTasks.size,
      shutdownTime: Date.now() - startTime
    });
    
    return shutdownSuccess;
  }

  /**
   * Clear all queued tasks
   */
  clearQueue() {
    const clearedCount = this.taskQueue.length;
    this.taskQueue = [];
    
    forestLogger.info('Background processor queue cleared', {
      clearedTasks: clearedCount
    });
    
    return clearedCount;
  }
} 