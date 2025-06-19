// modules/utils/logger.js

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// This dynamically gets your project's data directory.
const dataDir = process.env.FOREST_DATA_DIR || path.join(process.env.HOME || process.env.USERPROFILE, '.forest-data');
const logDir = path.join(dataDir, 'logs');

// Ensure log directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: 'info', // The minimum level of logs to record
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }), // Log the full stack trace on errors
    winston.format.splat(),
    winston.format.json() // Log in a structured JSON format
  ),
  defaultMeta: { service: 'forest-mcp-server' },
  transports: [
    // Transport 1: Write all logs with level 'error' or less to `error.log`
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    // Transport 2: Write all logs with level 'info' or less to `combined.log`
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
});

// If we're not in production, also log to the `console`
// with a simpler, more readable format.
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

export default logger;