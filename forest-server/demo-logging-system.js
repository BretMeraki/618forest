#!/usr/bin/env node

/**
 * Forest.os Real-Time Logging System Demo
 *
 * This script demonstrates the comprehensive winston-based logging system
 * integrated into Forest.os, showcasing:
 *
 * - Multi-level structured logging
 * - Performance timing capabilities
 * - Memory monitoring
 * - Component-specific logging
 * - Real-time log viewing
 */

import { getForestLogger } from './modules/winston-logger.js';

console.log('🌳 Forest.os Real-Time Logging System Demo\n');

// Initialize the logger
const logger = getForestLogger({
  logLevel: 'trace',
  enableConsole: true,
  enableFileLogging: true,
  enableRealTimeLogging: true,
});

// Create component-specific loggers
const dataArchiverLogger = logger.child({
  component: 'DataArchiver',
  projectId: 'demo-project',
  userId: 'demo-user',
});

const systemClockLogger = logger.child({
  component: 'SystemClock',
  projectId: 'demo-project',
});

const userActionLogger = logger.child({
  component: 'UserInterface',
  userId: 'demo-user',
});

console.log('📝 Demonstrating all log levels...\n');

// Demonstrate all log levels
logger.error('Critical system error detected', {
  errorCode: 'SYS_001',
  details: 'Database connection failed',
});

logger.warn('Performance threshold exceeded', {
  metric: 'memory_usage',
  current: '450MB',
  threshold: '400MB',
});

logger.info('Forest.os logging demo started', {
  version: '2.0',
  features: ['winston', 'real-time', 'structured'],
});

logger.debug('Debug information for development', {
  debugLevel: 'verbose',
  context: 'logging-demo',
});

logger.trace('Detailed trace information', {
  function: 'demo-logging-system',
  line: 58,
});

console.log('\n⏱️ Demonstrating performance timing...\n');

// Demonstrate performance timing
logger.startTimer('demo_operation');

// Simulate some work
await new Promise(resolve => setTimeout(resolve, 1000));

logger.endTimer('demo_operation', {
  operation: 'data_processing',
  itemsProcessed: 1500,
  cacheHits: 87,
});

logger.startTimer('archiving_simulation');
await new Promise(resolve => setTimeout(resolve, 500));
logger.endTimer('archiving_simulation', {
  operation: 'archive_simulation',
  itemsArchived: 50,
  wisdomGenerated: 3,
});

console.log('\n📊 Demonstrating component-specific logging...\n');

// Demonstrate component-specific logging
dataArchiverLogger.event('Archiving process started', {
  itemsToArchive: 150,
  estimatedDuration: '45 seconds',
  archiveThreshold: '18 months',
});

dataArchiverLogger.perf('Archive assessment completed', {
  assessmentTime: '2.3s',
  itemsFound: 150,
  archiveNeeded: true,
});

systemClockLogger.event('Proactive reasoning triggered', {
  analysisType: 'strategic',
  lastAnalysis: '2 days ago',
  priority: 'high',
});

userActionLogger.user('User completed task', {
  taskId: 'task_123',
  outcome: 'breakthrough',
  difficulty: 4,
  engagement: 5,
});

console.log('\n🧠 Demonstrating Forest.os specific events...\n');

// Demonstrate Forest.os specific logging patterns
logger.logArchiving('demo-project', {
  learningHistory: { itemsArchived: 25 },
  htaData: { branchesArchived: 3 },
  wisdomGenerated: [
    { type: 'learning_history_wisdom', insights: 5 },
    { type: 'strategic_branch_wisdom', principles: 3 },
  ],
});

logger.logProactiveReasoning('opportunity', 'demo-project', [
  'Skill synergy opportunity detected in JavaScript/TypeScript domains',
  'Breakthrough momentum window identified for next 3 days',
  'Cross-pollination potential between current learning branches',
]);

logger.logUserAction('generate_daily_schedule', 'demo-project', 'demo-user', {
  scheduleDate: '2025-06-19',
  energyLevel: 4,
  blocksGenerated: 6,
  estimatedDuration: '8 hours',
});

logger.logTaskCompletion('task_456', 'demo-project', {
  outcome: 'significant_progress',
  breakthrough: false,
  difficultyRating: 3,
  engagementLevel: 4,
});

console.log('\n💾 Demonstrating memory and performance monitoring...\n');

// Force memory logging
logger.memory('Demo memory usage spike', {
  simulatedSpike: true,
  heapUsed: '150MB',
  reason: 'large_data_processing',
});

// Log system performance metrics
const stats = logger.getStats();
logger.perf('System performance snapshot', {
  uptime: stats.uptime,
  memoryUsage: stats.memoryUsage,
  systemLoad: stats.systemLoad,
  activeTimers: stats.activeTimers,
});

console.log('\n📈 Logging demo completed!\n');

console.log('📁 Log files created in logs/ directory:');
console.log('• forest-app.log - Human-readable application logs');
console.log('• forest-errors.log - Error-only logs');
console.log('• forest-performance.log - Performance metrics');
console.log('• forest-realtime.log - Real-time monitoring');
console.log('• forest-structured.json - Machine-readable JSON logs');

console.log('\n📺 To view logs in real-time:');
console.log('• node tools/log-viewer.js - Basic real-time viewing');
console.log('• node tools/log-viewer.js -l error - Show only errors');
console.log('• node tools/log-viewer.js -c DataArchiver - Component-specific logs');
console.log('• node tools/log-viewer.js -m - Watch all log files');
console.log('• node tools/log-viewer.js --filter "archiving" - Filter content');

console.log('\n🔧 MCP Integration:');
console.log('The logging system is fully integrated with Forest.os MCP tools:');
console.log('• get_logging_status - System status and file information');
console.log('• create_log_entry - Create custom log entries');
console.log('• start_performance_timer / end_performance_timer - Performance timing');
console.log('• view_recent_logs - View and filter recent entries');

// Graceful shutdown
logger.info('Demo logging session completed', {
  totalDemoTime: '~10 seconds',
  logEntriesGenerated: 'Multiple across all levels',
  nextSteps: 'Use MCP tools or log viewer for monitoring',
});

setTimeout(() => {
  logger.shutdown();
  console.log('\n✅ Logging system demo completed successfully!');
  process.exit(0);
}, 1000);
