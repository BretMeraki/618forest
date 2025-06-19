import * as os from 'os';
import { getDatedLogPath, writeJsonLine } from './logger-utils.js';
import * as path from 'path';

/**
 * Comprehensive real-time error logger with extensive debugging information.
 * Captures errors, warnings, process state, and environmental context.
 */
export function initErrorLogger(customPath) {
  const logFile = customPath || getDatedLogPath('error');

  const append = (payload) => {
    // Add system context to every log entry
    const enrichedPayload = {
      ...payload,
      pid: process.pid,
      memory: process.memoryUsage(),
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cwd: process.cwd()
    };
    writeJsonLine(logFile, enrichedPayload);
  };

  // Store original methods for restoration if needed
  const originalConsoleError = console.error.bind(console);
  const originalConsoleWarn = console.warn.bind(console);
  const originalConsoleLog = console.log.bind(console);
  const originalConsoleInfo = console.info ? console.info.bind(console) : originalConsoleLog;
  const originalConsoleDebug = console.debug ? console.debug.bind(console) : originalConsoleLog;

  // Capture console.error with full context
  console.error = (...args) => {
    const stackTrace = new Error().stack;
    append({
      timestamp: new Date().toISOString(),
      type: 'console.error',
      message: args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return `[Object: ${arg?.constructor?.name || 'Unknown'}]`;
          }
        }
        return String(arg);
      }).join(' '),
      stackTrace: stackTrace?.split('\n')?.slice(1, 15) || [],
      argumentTypes: args.map(arg => typeof arg),
      argumentCount: args.length
    });
    originalConsoleError(...args);
  };

  // Capture console.warn
  console.warn = (...args) => {
    const stackTrace = new Error().stack;
    append({
      timestamp: new Date().toISOString(),
      type: 'console.warn',
      message: args.map(String).join(' '),
      stackTrace: stackTrace?.split('\n')?.slice(1, 10) || [],
      argumentTypes: args.map(arg => typeof arg)
    });
    originalConsoleWarn(...args);
  };

  // Capture console.log (now ALWAYS captured)
  console.log = (...args) => {
    append({
      timestamp: new Date().toISOString(),
      type: 'console.log',
      message: args.map(String).join(' '),
      argumentCount: args.length
    });
    originalConsoleLog(...args);
  };

  // Capture console.info
  console.info = (...args) => {
    append({
      timestamp: new Date().toISOString(),
      type: 'console.info',
      message: args.map(String).join(' '),
      argumentCount: args.length
    });
    originalConsoleInfo(...args);
  };

  // Capture console.debug (can be extremely noisy)
  console.debug = (...args) => {
    append({
      timestamp: new Date().toISOString(),
      type: 'console.debug',
      message: args.map(String).join(' '),
      argumentCount: args.length
    });
    originalConsoleDebug(...args);
  };

  // Uncaught exceptions with maximum detail
  process.on('uncaughtException', (err, origin) => {
    append({
      timestamp: new Date().toISOString(),
      type: 'uncaughtException',
      name: err.name,
      message: err.message,
      stack: err.stack?.split('\n') || [],
      origin,
      code: err.code,
      errno: err.errno,
      syscall: err.syscall,
      path: err.path,
      cause: err.cause ? {
        name: err.cause.name,
        message: err.cause.message,
        stack: err.cause.stack?.split('\n')?.slice(0, 10)
      } : null,
      environmentVars: {
        NODE_ENV: process.env.NODE_ENV,
        DEBUG: process.env.DEBUG,
        PATH: process.env.PATH?.split(path.delimiter)?.slice(0, 5)
      }
    });
  });

  // Unhandled promise rejections with context
  process.on('unhandledRejection', (reason, promise) => {
    append({
      timestamp: new Date().toISOString(),
      type: 'unhandledRejection',
      reason: reason instanceof Error ? {
        name: reason.name,
        message: reason.message,
        stack: reason.stack?.split('\n') || [],
        code: reason.code,
        cause: reason.cause
      } : String(reason),
      promiseState: promise.constructor?.name || 'Unknown',
      promiseString: promise.toString?.() || '[Promise object]'
    });
  });

  // Process warnings (Node.js deprecations, etc.)
  process.on('warning', (warning) => {
    append({
      timestamp: new Date().toISOString(),
      type: 'process.warning',
      name: warning.name,
      message: warning.message,
      stack: warning.stack?.split('\n') || [],
      code: warning.code
    });
  });

  // Exit event logging
  process.on('exit', (code) => {
    append({
      timestamp: new Date().toISOString(),
      type: 'process.exit',
      exitCode: code,
      uptime: process.uptime(),
      finalMemory: process.memoryUsage()
    });
  });

  // SIGINT (Ctrl+C) and SIGTERM handling
  ['SIGINT', 'SIGTERM', 'SIGHUP'].forEach(signal => {
    process.on(signal, () => {
      append({
        timestamp: new Date().toISOString(),
        type: 'signal',
        signal,
        uptime: process.uptime()
      });
    });
  });

  // Monitor for extremely high memory usage
  const memoryMonitor = setInterval(() => {
    const mem = process.memoryUsage();
    const threshold = 500 * 1024 * 1024; // 500MB
    if (mem.heapUsed > threshold) {
      append({
        timestamp: new Date().toISOString(),
        type: 'memory.high',
        memory: mem,
        threshold,
        warning: 'High memory usage detected'
      });
    }
  }, 30000); // Check every 30 seconds

  // Cleanup function
  const cleanup = () => {
    clearInterval(memoryMonitor);
    console.error = originalConsoleError;
    console.warn = originalConsoleWarn;
    console.log = originalConsoleLog;
    console.info = originalConsoleInfo;
    console.debug = originalConsoleDebug;
  };

  // Initialization record with environment snapshot
  append({
    timestamp: new Date().toISOString(),
    type: 'logger_init',
    message: `Comprehensive error logger attached. Writing to ${logFile}`,
    environment: {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      hostname: os.hostname(),
      userInfo: os.userInfo?.() || 'N/A',
      loadAverage: os.loadavg?.() || 'N/A'
    },
    processArgs: process.argv,
    cwd: process.cwd(),
    execPath: process.execPath
  });

  return cleanup;
}