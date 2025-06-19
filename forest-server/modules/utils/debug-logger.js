/**
 * Debug Logger Module
 * Provides comprehensive debugging and error tracking for MCP server issues
 */

import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

export class DebugLogger {
  constructor(logDir = 'logs') {
    // Use module location to resolve logs directory, not current working directory
    // This fixes issues when Claude Desktop runs the server from a different working directory
    if (path.isAbsolute(logDir)) {
      this.logDir = logDir;
    } else {
      // Get the directory containing this module, then go up to project root
      const moduleDir = path.dirname(new URL(import.meta.url).pathname);
      const projectRoot = path.resolve(moduleDir, '../../'); // modules/utils -> project root
      this.logDir = path.resolve(projectRoot, logDir);
    }
    this.initTimestamp = Date.now();
    this.events = [];
    this.setupLogDir();
    this.setupProcessListeners();

    // Track all async operations
    this.pendingOperations = new Map();
    this.operationCounter = 0;
  }

  setupLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  setupProcessListeners() {
    // Track uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.logCritical('UNCAUGHT_EXCEPTION', {
        error: error.message,
        stack: error.stack,
        timestamp: Date.now()
      });
      this.flushLogs();
    });

    // Track unhandled rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.logCritical('UNHANDLED_REJECTION', {
        reason: reason?.toString(),
        promise: promise.toString(),
        timestamp: Date.now()
      });
      this.flushLogs();
    });

    // Track process exit
    process.on('exit', (code) => {
      this.logEvent('PROCESS_EXIT', { code, uptime: process.uptime() });
      this.flushLogs();
    });

    // Track SIGTERM/SIGINT
    process.on('SIGTERM', () => {
      this.logEvent('SIGTERM_RECEIVED', { uptime: process.uptime() });
      this.flushLogs();
    });

    process.on('SIGINT', () => {
      this.logEvent('SIGINT_RECEIVED', { uptime: process.uptime() });
      this.flushLogs();
    });
  }

  logEvent(type, data = {}) {
    const event = {
      timestamp: Date.now(),
      elapsed: Date.now() - this.initTimestamp,
      type,
      data,
      memory: process.memoryUsage(),
      pid: process.pid
    };

    this.events.push(event);

    // Also log to stderr for immediate visibility
    console.error(`[DEBUG-${type}] ${JSON.stringify({ elapsed: event.elapsed, ...data })}`);

    // Auto-flush every 10 events or if it's critical
    if (this.events.length % 10 === 0 || type.includes('CRITICAL') || type.includes('ERROR')) {
      this.flushLogs();
    }
  }

  logCritical(type, data = {}) {
    this.logEvent(`CRITICAL_${type}`, data);
  }

  logAsyncStart(operation, data = {}) {
    const opId = ++this.operationCounter;
    this.pendingOperations.set(opId, {
      operation,
      startTime: Date.now(),
      data
    });

    this.logEvent('ASYNC_START', { opId, operation, ...data });
    return opId;
  }

  logAsyncEnd(opId, success = true, result = {}) {
    const op = this.pendingOperations.get(opId);
    if (op) {
      const duration = Date.now() - op.startTime;
      this.logEvent('ASYNC_END', {
        opId,
        operation: op.operation,
        duration,
        success,
        result
      });
      this.pendingOperations.delete(opId);
    }
  }

  logAsyncError(opId, error) {
    const op = this.pendingOperations.get(opId);
    if (op) {
      this.logCritical('ASYNC_ERROR', {
        opId,
        operation: op.operation,
        error: error.message,
        stack: error.stack
      });
      this.pendingOperations.delete(opId);
    }
  }

  getStuckOperations() {
    const now = Date.now();
    const stuck = [];

    for (const [opId, op] of this.pendingOperations.entries()) {
      const duration = now - op.startTime;
      if (duration > 5000) { // Operations stuck for more than 5 seconds
        stuck.push({
          opId,
          operation: op.operation,
          duration,
          data: op.data
        });
      }
    }

    return stuck;
  }

  logStuckOperations() {
    const stuck = this.getStuckOperations();
    if (stuck.length > 0) {
      this.logCritical('STUCK_OPERATIONS', { count: stuck.length, operations: stuck });
    }
  }

  flushLogs() {
    try {
      const logFile = path.join(this.logDir, `debug-${new Date().toISOString().split('T')[0]}.json`);
      const summary = {
        serverStart: this.initTimestamp,
        totalEvents: this.events.length,
        pendingOperations: Array.from(this.pendingOperations.entries()),
        events: this.events
      };

      fs.writeFileSync(logFile, JSON.stringify(summary, null, 2));

      // Also create a readable summary
      const summaryFile = path.join(this.logDir, `debug-summary-${new Date().toISOString().split('T')[0]}.txt`);
      let summaryText = `DEBUG SUMMARY (${new Date().toISOString()})\n`;
      summaryText += '==============================================\n\n';
      summaryText += `Server started: ${new Date(this.initTimestamp).toISOString()}\n`;
      summaryText += `Total events: ${this.events.length}\n`;
      summaryText += `Pending operations: ${this.pendingOperations.size}\n\n`;

      // Recent events
      summaryText += 'RECENT EVENTS (last 20):\n';
      const recentEvents = this.events.slice(-20);
      for (const event of recentEvents) {
        summaryText += `[${event.elapsed}ms] ${event.type}: ${JSON.stringify(event.data)}\n`;
      }

      // Stuck operations
      const stuck = this.getStuckOperations();
      if (stuck.length > 0) {
        summaryText += '\nSTUCK OPERATIONS:\n';
        for (const op of stuck) {
          summaryText += `- ${op.operation} (${op.duration}ms): ${JSON.stringify(op.data)}\n`;
        }
      }

      fs.writeFileSync(summaryFile, summaryText);

    } catch (error) {
      console.error('Failed to flush debug logs:', error.message);
    }
  }

  // Monitor for hung operations every 10 seconds
  startMonitoring() {
    setInterval(() => {
      this.logStuckOperations();
      this.logEvent('HEALTH_CHECK', {
        uptime: process.uptime(),
        pendingOps: this.pendingOperations.size,
        memoryUsage: process.memoryUsage()
      });
    }, 10000);
  }
}

// Global debug logger instance
export const debugLogger = new DebugLogger();