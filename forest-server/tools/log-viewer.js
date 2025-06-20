#!/usr/bin/env node

/**
 * Real-Time Log Viewer for Forest.os
 *
 * This tool provides a live view of Forest.os logs with:
 * - Real-time log tailing
 * - Filtering by log level and component
 * - Colored output for better readability
 * - Search and highlighting capabilities
 * - Multiple log file support
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

class LogViewer {
  constructor(options = {}) {
    this.logDirectory = options.logDirectory || path.resolve(process.cwd(), 'logs');
    this.logFile = options.logFile || 'forest-app.log';
    this.filter = options.filter || null;
    this.level = options.level || null;
    this.component = options.component || null;
    this.search = options.search || null;
    this.follow = options.follow !== false; // Default to true
    this.lines = options.lines || 50; // Number of lines to show initially
    this.jsonMode = options.json || false;

    this.watchers = new Map();
    this.isRunning = false;
  }

  /**
   * Start the log viewer
   */
  async start() {
    console.log(`${colors.bright}${colors.green}🌳 Forest.os Real-Time Log Viewer${colors.reset}`);
    console.log(
      `${colors.dim}Watching: ${path.join(this.logDirectory, this.logFile)}${colors.reset}`
    );

    if (this.filter) {
      console.log(`${colors.dim}Filter: ${this.filter}${colors.reset}`);
    }
    if (this.level) {
      console.log(`${colors.dim}Level: ${this.level}${colors.reset}`);
    }
    if (this.component) {
      console.log(`${colors.dim}Component: ${this.component}${colors.reset}`);
    }
    if (this.search) {
      console.log(`${colors.dim}Search: ${this.search}${colors.reset}`);
    }

    console.log(`${colors.dim}${'-'.repeat(80)}${colors.reset}`);

    this.isRunning = true;

    try {
      const logPath = path.join(this.logDirectory, this.logFile);

      // Check if log file exists
      if (!fs.existsSync(logPath)) {
        console.log(`${colors.yellow}⚠️  Log file does not exist: ${logPath}${colors.reset}`);
        console.log(`${colors.dim}Waiting for log file to be created...${colors.reset}`);

        // Watch directory for file creation
        await this.waitForFile(logPath);
      }

      // Show recent lines
      if (this.lines > 0) {
        await this.showRecentLines(logPath);
      }

      // Start watching
      if (this.follow) {
        await this.watchFile(logPath);
      }
    } catch (error) {
      console.error(`${colors.red}❌ Error starting log viewer:${colors.reset}`, error.message);
    }
  }

  /**
   * Wait for log file to be created
   */
  async waitForFile(filePath) {
    return new Promise(resolve => {
      const dir = path.dirname(filePath);
      const filename = path.basename(filePath);

      const watcher = fs.watch(dir, (eventType, changedFilename) => {
        if (changedFilename === filename && fs.existsSync(filePath)) {
          console.log(`${colors.green}✅ Log file created: ${filePath}${colors.reset}`);
          watcher.close();
          resolve();
        }
      });
    });
  }

  /**
   * Show recent lines from the log file
   */
  async showRecentLines(filePath) {
    try {
      // Use tail command to get recent lines
      const tail = spawn('tail', ['-n', this.lines.toString(), filePath]);

      tail.stdout.on('data', data => {
        const lines = data
          .toString()
          .split('\n')
          .filter(line => line.trim());
        lines.forEach(line => this.processLogLine(line));
      });

      await new Promise(resolve => {
        tail.on('close', resolve);
      });
    } catch (error) {
      console.error(`${colors.red}Error reading recent lines:${colors.reset}`, error.message);
    }
  }

  /**
   * Watch log file for changes
   */
  async watchFile(filePath) {
    try {
      // Use tail -f for efficient file following
      const tailProcess = spawn('tail', ['-f', filePath]);

      tailProcess.stdout.on('data', data => {
        const lines = data
          .toString()
          .split('\n')
          .filter(line => line.trim());
        lines.forEach(line => this.processLogLine(line));
      });

      tailProcess.stderr.on('data', data => {
        console.error(`${colors.red}Tail error:${colors.reset}`, data.toString());
      });

      tailProcess.on('close', code => {
        if (this.isRunning) {
          console.log(`${colors.yellow}⚠️  Tail process exited with code ${code}${colors.reset}`);
        }
      });

      // Handle process termination
      process.on('SIGINT', () => {
        console.log(`\n${colors.dim}Stopping log viewer...${colors.reset}`);
        this.isRunning = false;
        tailProcess.kill();
        process.exit(0);
      });

      // Keep the process alive
      await new Promise(() => {}); // Run indefinitely
    } catch (error) {
      console.error(`${colors.red}Error watching file:${colors.reset}`, error.message);
    }
  }

  /**
   * Process and format a log line
   */
  processLogLine(line) {
    if (!line.trim()) {
      return;
    }

    try {
      // Try to parse as structured log first
      if (this.jsonMode || line.startsWith('{')) {
        this.processJsonLogLine(line);
      } else {
        this.processTextLogLine(line);
      }
    } catch (error) {
      // If parsing fails, treat as plain text
      this.processTextLogLine(line);
    }
  }

  /**
   * Process JSON formatted log line
   */
  processJsonLogLine(line) {
    try {
      const logEntry = JSON.parse(line);

      // Apply filters
      if (!this.passesFilters(logEntry)) {
        return;
      }

      // Format for display
      const timestamp = logEntry.timestamp || new Date().toISOString();
      const level = logEntry.level || 'INFO';
      const message = logEntry.message || '';
      const component = logEntry.component || logEntry.module || '';

      const formattedLine = this.formatLogLine(timestamp, level, component, message, logEntry);
      console.log(formattedLine);
    } catch (error) {
      // Fallback to text processing
      this.processTextLogLine(line);
    }
  }

  /**
   * Process text formatted log line
   */
  processTextLogLine(line) {
    // Apply text-based filters
    if (this.filter && !line.toLowerCase().includes(this.filter.toLowerCase())) {
      return;
    }

    if (this.level) {
      const levelPattern = new RegExp(`\\[${this.level.toUpperCase()}\\]`, 'i');
      if (!levelPattern.test(line)) {
        return;
      }
    }

    if (this.component) {
      const componentPattern = new RegExp(`\\[${this.component}\\]`, 'i');
      if (!componentPattern.test(line)) {
        return;
      }
    }

    // Highlight search terms
    let displayLine = line;
    if (this.search) {
      const searchRegex = new RegExp(`(${this.search})`, 'gi');
      displayLine = displayLine.replace(
        searchRegex,
        `${colors.bgYellow}${colors.red}$1${colors.reset}`
      );
    }

    // Color code by log level
    displayLine = this.colorizeLogLine(displayLine);

    console.log(displayLine);
  }

  /**
   * Check if log entry passes filters
   */
  passesFilters(logEntry) {
    if (this.level && logEntry.level !== this.level.toLowerCase()) {
      return false;
    }

    if (this.component) {
      const entryComponent = logEntry.component || logEntry.module || '';
      if (!entryComponent.toLowerCase().includes(this.component.toLowerCase())) {
        return false;
      }
    }

    if (this.filter) {
      const searchableText = JSON.stringify(logEntry).toLowerCase();
      if (!searchableText.includes(this.filter.toLowerCase())) {
        return false;
      }
    }

    if (this.search) {
      const searchableText = JSON.stringify(logEntry).toLowerCase();
      if (!searchableText.includes(this.search.toLowerCase())) {
        return false;
      }
    }

    return true;
  }

  /**
   * Format log line for display
   */
  formatLogLine(timestamp, level, component, message, fullEntry) {
    const time = new Date(timestamp).toLocaleTimeString();
    const levelColor = this.getLevelColor(level);
    const componentStr = component ? `[${component}]` : '';

    let formattedLine = `${colors.dim}${time}${colors.reset} ${levelColor}[${level.toUpperCase()}]${colors.reset}`;

    if (componentStr) {
      formattedLine += ` ${colors.cyan}${componentStr}${colors.reset}`;
    }

    formattedLine += `: ${message}`;

    // Add important metadata
    if (fullEntry.projectId) {
      formattedLine += ` ${colors.dim}(Project: ${fullEntry.projectId})${colors.reset}`;
    }

    if (fullEntry.userId) {
      formattedLine += ` ${colors.dim}(User: ${fullEntry.userId})${colors.reset}`;
    }

    if (fullEntry.duration) {
      formattedLine += ` ${colors.magenta}[${fullEntry.duration}]${colors.reset}`;
    }

    // Highlight search terms
    if (this.search) {
      const searchRegex = new RegExp(`(${this.search})`, 'gi');
      formattedLine = formattedLine.replace(
        searchRegex,
        `${colors.bgYellow}${colors.red}$1${colors.reset}`
      );
    }

    return formattedLine;
  }

  /**
   * Get color for log level
   */
  getLevelColor(level) {
    switch (level.toLowerCase()) {
      case 'error':
        return colors.red;
      case 'warn':
        return colors.yellow;
      case 'info':
        return colors.green;
      case 'debug':
        return colors.blue;
      case 'trace':
        return colors.cyan;
      case 'perf':
        return colors.magenta;
      case 'memory':
        return colors.dim;
      case 'event':
        return colors.bright + colors.blue;
      case 'user':
        return colors.bright + colors.green;
      default:
        return colors.white;
    }
  }

  /**
   * Colorize text log lines
   */
  colorizeLogLine(line) {
    // Color log levels
    line = line.replace(/\[ERROR\]/g, `${colors.red}[ERROR]${colors.reset}`);
    line = line.replace(/\[WARN\]/g, `${colors.yellow}[WARN]${colors.reset}`);
    line = line.replace(/\[INFO\]/g, `${colors.green}[INFO]${colors.reset}`);
    line = line.replace(/\[DEBUG\]/g, `${colors.blue}[DEBUG]${colors.reset}`);
    line = line.replace(/\[TRACE\]/g, `${colors.cyan}[TRACE]${colors.reset}`);
    line = line.replace(/\[PERF\]/g, `${colors.magenta}[PERF]${colors.reset}`);
    line = line.replace(/\[MEMORY\]/g, `${colors.dim}[MEMORY]${colors.reset}`);
    line = line.replace(/\[EVENT\]/g, `${colors.bright}${colors.blue}[EVENT]${colors.reset}`);
    line = line.replace(/\[USER\]/g, `${colors.bright}${colors.green}[USER]${colors.reset}`);

    // Color timestamps
    line = line.replace(/(\d{2}:\d{2}:\d{2}\.\d{3})/g, `${colors.dim}$1${colors.reset}`);

    // Color component names
    line = line.replace(/\[([A-Za-z][A-Za-z0-9_-]+)\]/g, `${colors.cyan}[$1]${colors.reset}`);

    return line;
  }

  /**
   * Stop the log viewer
   */
  stop() {
    this.isRunning = false;
    this.watchers.forEach(watcher => watcher.close());
    this.watchers.clear();
  }
}

/**
 * Multi-file log viewer for comprehensive monitoring
 */
class MultiLogViewer {
  constructor(options = {}) {
    this.logDirectory = options.logDirectory || path.resolve(process.cwd(), 'logs');
    this.viewers = new Map();
    this.filter = options.filter || null;
    this.search = options.search || null;
  }

  /**
   * Watch multiple log files simultaneously
   */
  async watchAll() {
    const logFiles = [
      { file: 'forest-app.log', label: 'APP', color: colors.green },
      { file: 'forest-errors.log', label: 'ERR', color: colors.red },
      { file: 'forest-performance.log', label: 'PERF', color: colors.magenta },
      { file: 'forest-realtime.log', label: 'RT', color: colors.cyan },
    ];

    console.log(`${colors.bright}${colors.green}🌳 Forest.os Multi-Log Viewer${colors.reset}`);
    console.log(`${colors.dim}Watching ${logFiles.length} log files...${colors.reset}`);
    console.log(`${colors.dim}${'-'.repeat(80)}${colors.reset}`);

    for (const { file, label, color } of logFiles) {
      const logPath = path.join(this.logDirectory, file);

      if (fs.existsSync(logPath)) {
        this.watchFileWithLabel(logPath, label, color);
      } else {
        console.log(`${colors.yellow}⚠️  ${label}: Waiting for ${file}${colors.reset}`);
      }
    }

    // Keep process alive
    await new Promise(() => {});
  }

  /**
   * Watch a single file with label
   */
  watchFileWithLabel(filePath, label, color) {
    const tail = spawn('tail', ['-f', filePath]);

    tail.stdout.on('data', data => {
      const lines = data
        .toString()
        .split('\n')
        .filter(line => line.trim());
      lines.forEach(line => {
        if (this.passesFilter(line)) {
          console.log(`${color}[${label}]${colors.reset} ${line}`);
        }
      });
    });

    this.viewers.set(label, tail);
  }

  /**
   * Check if line passes filters
   */
  passesFilter(line) {
    if (this.filter && !line.toLowerCase().includes(this.filter.toLowerCase())) {
      return false;
    }

    if (this.search && !line.toLowerCase().includes(this.search.toLowerCase())) {
      return false;
    }

    return true;
  }
}

// CLI handling
if (process.argv[1] === __filename) {
  const args = process.argv.slice(2);
  const options = {};

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--file':
      case '-f':
        options.logFile = args[++i];
        break;
      case '--level':
      case '-l':
        options.level = args[++i];
        break;
      case '--component':
      case '-c':
        options.component = args[++i];
        break;
      case '--filter':
        options.filter = args[++i];
        break;
      case '--search':
      case '-s':
        options.search = args[++i];
        break;
      case '--lines':
      case '-n':
        options.lines = parseInt(args[++i], 10);
        break;
      case '--no-follow':
        options.follow = false;
        break;
      case '--json':
      case '-j':
        options.jsonMode = true;
        break;
      case '--multi':
      case '-m':
        options.multiMode = true;
        break;
      case '--help':
      case '-h':
        console.log(`
Forest.os Log Viewer

Usage: node log-viewer.js [options]

Options:
  -f, --file <file>        Log file to watch (default: forest-app.log)
  -l, --level <level>      Filter by log level (error, warn, info, debug, etc.)
  -c, --component <name>   Filter by component name
  --filter <text>          Filter lines containing text
  -s, --search <text>      Highlight search terms
  -n, --lines <num>        Number of initial lines to show (default: 50)
  --no-follow             Don't follow new log entries
  -j, --json              Parse as JSON logs
  -m, --multi             Watch multiple log files
  -h, --help              Show this help

Examples:
  node log-viewer.js                           # Watch main app log
  node log-viewer.js -f forest-errors.log     # Watch error log only
  node log-viewer.js -l error                 # Show only error level logs
  node log-viewer.js -c DataArchiver          # Show only DataArchiver logs
  node log-viewer.js --filter "archiving"     # Filter for archiving-related logs
  node log-viewer.js -m                       # Watch all log files
        `);
        process.exit(0);
        break;
    }
  }

  // Start appropriate viewer
  if (options.multiMode) {
    const multiViewer = new MultiLogViewer(options);
    multiViewer.watchAll();
  } else {
    const viewer = new LogViewer(options);
    viewer.start();
  }
}

export { LogViewer, MultiLogViewer };
