/**
 * Winston-based Real-Time Logging System
 *
 * This module provides:
 * 1. Structured logging with multiple levels and formats
 * 2. Real-time log file watching capabilities
 * 3. Performance and memory monitoring
 * 4. Context-aware logging for the Forest.os system
 */

import winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { fileURLToPath, URL } from 'url';

// Custom log levels for Forest.os
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
    perf: 5, // Performance monitoring
    memory: 6, // Memory usage tracking
    event: 7, // System events (archiving, reasoning, etc.)
    user: 8 // User actions and interactions
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue',
    trace: 'cyan',
    perf: 'magenta',
    memory: 'gray',
    event: 'brightBlue',
    user: 'brightGreen'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// Determine if we're running in an interactive terminal (both stdin and stdout are TTY)
const isInteractive = !!process.stdin.isTTY;

/**
 * Create the main winston logger instance
 */
export function createWinstonLogger(options = {}) {
  // Use module location to resolve logs directory, not current working directory
  // This fixes issues when Claude Desktop runs the server from a different working directory
  const moduleDir = path.dirname(new URL(import.meta.url).pathname);
  const projectRoot = path.resolve(moduleDir, '../'); // modules -> project root
  const defaultLogDirectory = path.resolve(projectRoot, 'logs');

  const {
    logLevel = 'info',
    enableConsole = true,
    enableFileLogging = true,
    logDirectory = defaultLogDirectory,
    maxFileSize = 50 * 1024 * 1024, // 50MB
    maxFiles = 30, // Keep 30 days of logs
    enableRealTimeLogging = true
  } = options;

  // Debug logging for path issues and fix absolute root paths
  let resolvedLogDirectory = logDirectory;
  if (logDirectory === '/logs') {
    if (isInteractive) {
      console.error(`WARNING: Suspicious log directory path detected: ${logDirectory}`);
      console.error(`Process CWD: ${process.cwd()}`);
      console.error('Options passed:', JSON.stringify(options, null, 2));
    }
    // Force to use project root instead of current working directory
    resolvedLogDirectory = defaultLogDirectory;
    if (isInteractive) {
      console.error(`Corrected to: ${resolvedLogDirectory}`);
    }
  }

  // Use the resolved directory for all subsequent operations
  let finalLogDirectory = resolvedLogDirectory;

  // Ensure log directory exists with improved error handling
  try {
    if (!fs.existsSync(finalLogDirectory)) {
      fs.mkdirSync(finalLogDirectory, { recursive: true });
    }
  } catch (error) {
    // Fallback to the project root (directory of the main script) if CWD is root or invalid
    let fallbackProjectRoot;
    try {
      const currentFile = fileURLToPath(import.meta.url);
      fallbackProjectRoot = path.resolve(path.dirname(currentFile), '../'); // modules -> project root
    } catch {
      fallbackProjectRoot = projectRoot; // Use the already-calculated project root
    }

    // If the derived project root is still '/', use the home directory as a final resort
    if (fallbackProjectRoot === path.sep) {
      fallbackProjectRoot = path.join(os.homedir(), '.forest-logs');
    }

    const fallbackLogDir = path.join(fallbackProjectRoot, 'logs');
    if (isInteractive) {
      console.error(`Attempting fallback to: ${fallbackLogDir}`);
    }

    if (!fs.existsSync(fallbackLogDir)) {
      fs.mkdirSync(fallbackLogDir, { recursive: true });
    }

    // Update the finalLogDirectory reference for the rest of the function
    finalLogDirectory = fallbackLogDir;

    if (isInteractive) {
      console.error(`Failed to create log directory ${finalLogDirectory}: ${error.message}`);
    }
  }

  // Custom format for structured logging
  const customFormat = winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss.SSS'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      // Build the log entry
      let logEntry = `${timestamp} [${level.toUpperCase()}]`;

      // Add context if available
      if (meta.module) {
        logEntry += ` [${meta.module}]`;
      }
      if (meta.component) {
        logEntry += ` [${meta.component}]`;
      }
      if (meta.userId) {
        logEntry += ` [User:${meta.userId}]`;
      }
      if (meta.projectId) {
        logEntry += ` [Project:${meta.projectId}]`;
      }

      logEntry += `: ${message}`;

      // Add stack trace for errors
      if (stack) {
        logEntry += `\\n${stack}`;
      }

      // Add metadata if present
      const metaKeys = Object.keys(meta).filter(key =>
        !['module', 'component', 'userId', 'projectId', 'timestamp', 'level', 'message'].includes(key)
      );

      if (metaKeys.length > 0) {
        const metaData = {};
        metaKeys.forEach(key => {
          metaData[key] = meta[key];
        });
        logEntry += ` | Meta: ${JSON.stringify(metaData)}`;
      }

      return logEntry;
    })
  );

  // JSON format for structured file logging
  const jsonFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  // Console format with colors
  const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
      format: 'HH:mm:ss.SSS'
    }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      let logEntry = `${timestamp} ${level}`;

      if (meta.module) {
        logEntry += ` [${meta.module}]`;
      }

      logEntry += `: ${message}`;
      return logEntry;
    })
  );

  // Create transports array
  const transports = [];

  // Console transport (only if running in a real TTY to avoid MCP protocol interference)
  if (enableConsole && isInteractive) {
    transports.push(new winston.transports.Console({
      level: logLevel,
      format: consoleFormat,
      handleExceptions: true,
      handleRejections: true
    }));
  }

  // File transports
  if (enableFileLogging) {
    // Main application log (human readable)
    transports.push(new winston.transports.File({
      filename: path.join(finalLogDirectory, 'forest-app.log'),
      level: logLevel,
      format: customFormat,
      maxsize: maxFileSize,
      maxFiles,
      tailable: true
    }));

    // Structured JSON log for machine processing
    transports.push(new winston.transports.File({
      filename: path.join(finalLogDirectory, 'forest-structured.json'),
      level: logLevel,
      format: jsonFormat,
      maxsize: maxFileSize,
      maxFiles,
      tailable: true
    }));

    // Error-only log
    transports.push(new winston.transports.File({
      filename: path.join(finalLogDirectory, 'forest-errors.log'),
      level: 'error',
      format: customFormat,
      maxsize: maxFileSize,
      maxFiles,
      tailable: true
    }));

    // Performance log
    transports.push(new winston.transports.File({
      filename: path.join(finalLogDirectory, 'forest-performance.log'),
      level: 'perf',
      format: jsonFormat,
      maxsize: maxFileSize,
      maxFiles,
      tailable: true
    }));

    // Real-time events log (for live monitoring)
    if (enableRealTimeLogging) {
      transports.push(new winston.transports.File({
        filename: path.join(finalLogDirectory, 'forest-realtime.log'),
        level: 'event',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return JSON.stringify({ timestamp, level, message, ...meta });
          })
        ),
        options: { flags: 'a' } // Append mode for real-time watching
      }));
    }
  }

  // Create the logger
  const logger = winston.createLogger({
    levels: customLevels.levels,
    level: logLevel,
    format: customFormat,
    transports,
    exitOnError: false
  });

  // Add system context to all logs
  const originalLog = logger.log.bind(logger);
  logger.log = function (level, message, meta = {}) {
    const enrichedMeta = {
      ...meta,
      pid: process.pid,
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      nodeVersion: process.version
    };

    return originalLog(level, message, enrichedMeta);
  };

  return logger;
}

/**
 * Enhanced logger class with Forest.os specific features
 */
export class ForestLogger {
  constructor(options = {}) {
    this.logger = createWinstonLogger(options);
    this.performanceMetrics = new Map();
    this.memoryThreshold = options.memoryThreshold || 500 * 1024 * 1024; // 500MB
    this.startTime = Date.now();

    // Start background monitoring
    this.startMonitoring();

    // Initialize with system info
    this.logSystemInfo();
  }

  /**
   * Log system information at startup
   */
  logSystemInfo() {
    this.logger.info('Forest.os logging system initialized', {
      module: 'ForestLogger',
      systemInfo: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        totalMemory: this.formatBytes(os.totalmem()),
        freeMemory: this.formatBytes(os.freemem()),
        uptime: process.uptime()
      }
    });
  }

  /**
   * Start background monitoring for performance and memory
   */
  startMonitoring() {
    // Memory monitoring
    this.memoryMonitor = setInterval(() => {
      const memUsage = process.memoryUsage();

      if (memUsage.heapUsed > this.memoryThreshold) {
        this.memory('High memory usage detected', {
          heapUsed: this.formatBytes(memUsage.heapUsed),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          external: this.formatBytes(memUsage.external),
          rss: this.formatBytes(memUsage.rss),
          threshold: this.formatBytes(this.memoryThreshold)
        });
      }

      // Log memory stats every 5 minutes
      if (Date.now() % (5 * 60 * 1000) < 30000) {
        this.memory('Memory usage report', {
          heapUsed: this.formatBytes(memUsage.heapUsed),
          heapTotal: this.formatBytes(memUsage.heapTotal),
          external: this.formatBytes(memUsage.external),
          rss: this.formatBytes(memUsage.rss)
        });
      }
    }, 30000); // Check every 30 seconds

    // Performance monitoring
    this.performanceMonitor = setInterval(() => {
      const loadAvg = os.loadavg();
      this.perf('System performance metrics', {
        loadAverage: loadAvg,
        uptime: process.uptime(),
        freeMemory: this.formatBytes(os.freemem()),
        activeHandles: process._getActiveHandles?.()?.length || 0,
        activeRequests: process._getActiveRequests?.()?.length || 0
      });
    }, 60000); // Every minute
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    if (this.memoryMonitor) {
      clearInterval(this.memoryMonitor);
    }
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }
  }

  /**
   * Create a child logger with context
   */
  child(context) {
    return {
      error: (message, meta = {}) => this.error(message, { ...context, ...meta }),
      warn: (message, meta = {}) => this.warn(message, { ...context, ...meta }),
      info: (message, meta = {}) => this.info(message, { ...context, ...meta }),
      debug: (message, meta = {}) => this.debug(message, { ...context, ...meta }),
      trace: (message, meta = {}) => this.trace(message, { ...context, ...meta }),
      perf: (message, meta = {}) => this.perf(message, { ...context, ...meta }),
      memory: (message, meta = {}) => this.memory(message, { ...context, ...meta }),
      event: (message, meta = {}) => this.event(message, { ...context, ...meta }),
      user: (message, meta = {}) => this.user(message, { ...context, ...meta })
    };
  }

  /**
   * Performance timing utilities
   */
  startTimer(label) {
    this.performanceMetrics.set(label, {
      startTime: process.hrtime.bigint(),
      startCpuUsage: process.cpuUsage()
    });
    this.trace(`Timer started: ${label}`, { module: 'ForestLogger', timer: label });
  }

  endTimer(label, meta = {}) {
    const startData = this.performanceMetrics.get(label);
    if (!startData) {
      this.warn(`Timer '${label}' was not started`, { module: 'ForestLogger' });
      return;
    }

    const endTime = process.hrtime.bigint();
    const endCpuUsage = process.cpuUsage(startData.startCpuUsage);
    const duration = Number(endTime - startData.startTime) / 1000000; // Convert to milliseconds

    this.performanceMetrics.delete(label);

    this.perf(`Timer completed: ${label}`, {
      module: 'ForestLogger',
      timer: label,
      duration: `${duration.toFixed(2)}ms`,
      cpuUsage: {
        user: `${endCpuUsage.user / 1000}ms`,
        system: `${endCpuUsage.system / 1000}ms`
      },
      ...meta
    });

    return duration;
  }

  /**
   * Log Forest.os specific events
   */
  logArchiving(projectId, results) {
    this.event('Data archiving completed', {
      component: 'DataArchiver',
      projectId,
      itemsArchived: results.learningHistory?.itemsArchived || 0,
      branchesArchived: results.htaData?.branchesArchived || 0,
      wisdomGenerated: results.wisdomGenerated?.length || 0
    });
  }

  logProactiveReasoning(type, projectId, insights) {
    this.event('Proactive reasoning analysis completed', {
      component: 'SystemClock',
      analysisType: type,
      projectId,
      insightsGenerated: insights?.length || 0
    });
  }

  logUserAction(action, projectId, userId, details = {}) {
    this.user(`User action: ${action}`, {
      component: 'UserInterface',
      action,
      projectId,
      userId,
      ...details
    });
  }

  logTaskCompletion(taskId, projectId, outcome) {
    this.event('Task completed', {
      component: 'TaskCompletion',
      taskId,
      projectId,
      outcome: outcome.outcome,
      breakthrough: outcome.breakthrough,
      difficulty: outcome.difficultyRating,
      engagement: outcome.engagementLevel
    });
  }

  /**
   * Logging methods for each level
   */
  error(message, meta = {}) {
    this.logger.error(message, meta);
  }

  warn(message, meta = {}) {
    this.logger.warn(message, meta);
  }

  info(message, meta = {}) {
    this.logger.info(message, meta);
  }

  debug(message, meta = {}) {
    this.logger.debug(message, meta);
  }

  trace(message, meta = {}) {
    this.logger.log('trace', message, meta);
  }

  perf(message, meta = {}) {
    this.logger.log('perf', message, meta);
  }

  memory(message, meta = {}) {
    this.logger.log('memory', message, meta);
  }

  event(message, meta = {}) {
    this.logger.log('event', message, meta);
  }

  user(message, meta = {}) {
    this.logger.log('user', message, meta);
  }

  /**
   * Utility methods
   */
  formatBytes(bytes) {
    if (bytes === 0) {return '0 Bytes';}
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * Get current performance stats
   */
  getStats() {
    const memUsage = process.memoryUsage();
    return {
      uptime: process.uptime(),
      memoryUsage: {
        heapUsed: this.formatBytes(memUsage.heapUsed),
        heapTotal: this.formatBytes(memUsage.heapTotal),
        external: this.formatBytes(memUsage.external),
        rss: this.formatBytes(memUsage.rss)
      },
      systemLoad: os.loadavg(),
      freeMemory: this.formatBytes(os.freemem()),
      activeTimers: this.performanceMetrics.size
    };
  }

  /**
   * Graceful shutdown
   */
  shutdown() {
    this.info('Forest.os logging system shutting down', {
      module: 'ForestLogger',
      uptime: process.uptime(),
      finalStats: this.getStats()
    });

    this.stopMonitoring();

    // Close winston transports
    this.logger.close();
  }
}

// Create singleton instance
let forestLoggerInstance = null;

/**
 * Get or create the Forest logger instance
 */
export function getForestLogger(options = {}) {
  if (!forestLoggerInstance) {
    forestLoggerInstance = new ForestLogger(options);
  }
  return forestLoggerInstance;
}

/**
 * Initialize Forest logging system
 */
export function initForestLogging(options = {}) {
  const logger = getForestLogger(options);

  // Override console methods to use winston
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug
  };

  console.log = (...args) => {
    logger.info(args.join(' '), { source: 'console.log' });
    originalConsole.log(...args);
  };

  console.error = (...args) => {
    logger.error(args.join(' '), { source: 'console.error' });
    originalConsole.error(...args);
  };

  console.warn = (...args) => {
    logger.warn(args.join(' '), { source: 'console.warn' });
    originalConsole.warn(...args);
  };

  console.info = (...args) => {
    logger.info(args.join(' '), { source: 'console.info' });
    originalConsole.info(...args);
  };

  console.debug = (...args) => {
    logger.debug(args.join(' '), { source: 'console.debug' });
    originalConsole.debug(...args);
  };

  // Handle process events
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception', {
      module: 'Process',
      error: error.message,
      stack: error.stack,
      code: error.code
    });
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Promise Rejection', {
      module: 'Process',
      reason: reason instanceof Error ? reason.message : String(reason),
      stack: reason instanceof Error ? reason.stack : undefined
    });
  });

  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down gracefully', { module: 'Process' });
    logger.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down gracefully', { module: 'Process' });
    logger.shutdown();
    process.exit(0);
  });

  return logger;
}