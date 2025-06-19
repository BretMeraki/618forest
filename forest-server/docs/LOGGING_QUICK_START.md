# Forest.os Real-Time Logging System - Quick Start Guide

Forest.os now includes a comprehensive real-time logging system powered by **winston**, the industry-standard Node.js logging library. This system provides both robust backend logging and powerful real-time viewing capabilities.

## 🏗️ Architecture Overview

The logging system consists of two main components:

### 1. **The Logger (Backend)**
- **winston-based** structured logging with multiple levels and formats
- **Automatic** performance and memory monitoring
- **Context-aware** logging for Forest.os components
- **Multiple log files** for different purposes

### 2. **The Viewer (Frontend)**
- **Real-time** log file watching and display
- **Filtering** by level, component, and search terms
- **Colorized** output for better readability
- **Multi-file** monitoring support

## 🚀 Getting Started

### 1. Start the Forest.os Server
The winston logging system is automatically initialized when you start the Forest.os server:

```bash
node forest-server/server-modular.js
```

### 2. View Logs in Real-Time
Open a separate terminal and run the log viewer:

```bash
# Basic real-time viewing
node forest-server/tools/log-viewer.js

# Or make it executable and run directly
./forest-server/tools/log-viewer.js
```

## 📁 Log Files Created

The system creates several specialized log files in the `logs/` directory:

- **`forest-app.log`** - Main application logs (human-readable)
- **`forest-errors.log`** - Error-only logs
- **`forest-performance.log`** - Performance metrics and timing
- **`forest-realtime.log`** - Real-time events for live monitoring
- **`forest-structured.json`** - Machine-readable JSON format

## 🎯 Log Levels Available

Forest.os uses 9 specialized log levels:

- **`error`** - Error conditions
- **`warn`** - Warning messages
- **`info`** - General information
- **`debug`** - Debug information
- **`trace`** - Detailed trace information
- **`perf`** - Performance measurements
- **`memory`** - Memory usage tracking
- **`event`** - System events (archiving, reasoning, etc.)
- **`user`** - User actions and interactions

## 🔍 Real-Time Viewing Options

### Basic Usage
```bash
# Watch main application log
node tools/log-viewer.js

# Watch error log only
node tools/log-viewer.js -f forest-errors.log

# Watch performance log
node tools/log-viewer.js -f forest-performance.log
```

### Filtering Options
```bash
# Show only error level logs
node tools/log-viewer.js -l error

# Show only specific component logs
node tools/log-viewer.js -c DataArchiver

# Filter for specific terms
node tools/log-viewer.js --filter "archiving"

# Search and highlight terms
node tools/log-viewer.js -s "proactive"

# Show specific number of recent lines
node tools/log-viewer.js -n 100
```

### Advanced Usage
```bash
# Watch all log files simultaneously
node tools/log-viewer.js -m

# Parse JSON structured logs
node tools/log-viewer.js -f forest-structured.json -j

# No live following (just show recent lines)
node tools/log-viewer.js --no-follow
```

## 🔧 MCP Tools Integration

The logging system is fully integrated with Forest.os MCP tools:

### Available MCP Tools:
- **`get_logging_status`** - View system status and log file information
- **`get_log_stats`** - Get performance statistics
- **`create_log_entry`** - Create custom log entries
- **`start_performance_timer`** - Start timing operations
- **`end_performance_timer`** - End timing and log duration
- **`view_recent_logs`** - View recent entries with filtering

### Example MCP Usage:
```bash
# Check logging system status
{"tool": "get_logging_status"}

# Create a custom log entry
{"tool": "create_log_entry", "level": "info", "message": "Testing custom logging", "component": "UserTest"}

# Start performance timing
{"tool": "start_performance_timer", "label": "my_operation", "component": "MyComponent"}

# End performance timing
{"tool": "end_performance_timer", "label": "my_operation"}

# View recent error logs
{"tool": "view_recent_logs", "level": "error", "lines": 10}
```

## 📊 Enhanced Forest.os Integration

The logging system provides specialized logging for Forest.os components:

### Automatic Logging:
- **Data Archiving** operations and results
- **Proactive Reasoning** analysis completion
- **User Actions** and interactions
- **Task Completion** events
- **Memory Usage** monitoring
- **Performance Metrics** tracking

### Component-Specific Loggers:
```javascript
// Components can create child loggers with context
const logger = forestLogger.child({
  component: 'DataArchiver',
  projectId: 'my-project',
  userId: 'user123'
});

logger.info('Starting archiving process');
logger.perf('Archive completed', { itemsArchived: 150, duration: '2.5s' });
```

## 🎨 Visual Output Features

The log viewer provides rich visual formatting:

- **Color-coded** log levels (red for errors, green for info, etc.)
- **Component highlighting** in cyan
- **Timestamp formatting** in dim text
- **Search term highlighting** with background colors
- **Real-time updates** as new log entries arrive

## 🚨 Monitoring and Alerts

### Automatic Monitoring:
- **Memory threshold alerts** (500MB default)
- **Performance degradation** detection
- **System load** monitoring
- **Error pattern** recognition

### Background Processes:
- Memory usage checked every 30 seconds
- Performance metrics collected every minute
- Log file rotation when files exceed 50MB
- Automatic cleanup of old log files (30 days retention)

## 🛠️ Configuration Options

### Environment Variables:
```bash
# Set log level
export LOG_LEVEL=debug

# Enable development mode for enhanced logging
export NODE_ENV=development

# Enable Forest debug features
export FOREST_DEBUG=true
```

### Programmatic Configuration:
The winston logger accepts configuration options for:
- Log levels and filtering
- File rotation settings
- Console output formatting
- Real-time monitoring thresholds
- Memory usage alerts

## 📈 Performance Impact

The winston logging system is designed for production use:

- **Minimal overhead** - Asynchronous file operations
- **Memory efficient** - Automatic log rotation and cleanup
- **Non-blocking** - Won't slow down Forest.os operations
- **Graceful degradation** - Continues working even if log files are unavailable

## 🔄 Integration with Legacy Systems

The new winston system works alongside the existing error-logger.js:

- **Backward compatibility** maintained
- **Console methods** enhanced but preserved
- **Error capturing** extended with more context
- **Process event handling** improved

## 💡 Tips for Effective Use

1. **Run log viewer in separate terminal** for real-time monitoring
2. **Use component filtering** to focus on specific areas
3. **Monitor performance logs** during intensive operations
4. **Check error logs** when troubleshooting issues
5. **Use custom log entries** to track user-specific events
6. **Monitor memory usage** during long-running processes

## 🔮 Future Enhancements

The logging system is designed to evolve with Forest.os:

- **Log aggregation** for multi-project analysis
- **Metrics dashboard** for visual monitoring
- **Alert notifications** for critical events
- **Log analytics** for pattern detection
- **Export capabilities** for external analysis

---

**The Forest.os logging system transforms debugging from reactive troubleshooting into proactive system insight, giving you complete visibility into your learning system's operation.**