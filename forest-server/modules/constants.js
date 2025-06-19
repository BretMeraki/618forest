/**
 * Forest Server Constants
 * Centralized configuration values to eliminate hardcoded strings
 */

// File naming constants
export const FILE_NAMES = {
  CONFIG: 'config.json',
  HTA: 'hta.json',
  LEARNING_HISTORY: 'learning_history.json',
  ERROR_LOG: 'error.log',
  MEMORY_STATE: 'memory_state.json',
  EXTERNAL_CONTEXT: 'external_context.json',

  // Dynamic file name generators
  DAILY_SCHEDULE: (date) => `day_${date}.json`,
  PATH_CONFIG: (path) => `${path}_config.json`,
  BACKUP: (filename, timestamp) => `${filename}.backup.${timestamp}`
};

// Directory structure constants
export const DIRECTORIES = {
  PROJECTS: 'projects',
  PATHS: 'paths',
  BACKUPS: 'backups',
  LOGS: 'logs',
  TEMP: 'temp'
};

// Default data directory
export const DEFAULT_DATA_DIR = '.forest-data';

// Server configuration
export const SERVER_CONFIG = {
  DEFAULT_PORT: 3001,
  LOCALHOST: 'localhost',
  HTTP_TIMEOUT: 30000,
  MAX_REQUEST_SIZE: '10mb'
};

// Performance constants
export const PERFORMANCE = {
  BATCH_SIZE: 10,
  MAX_CONCURRENT: 5,
  CACHE_TTL: 300000, // 5 minutes
  CACHE_MAX_AGE: 5 * 60 * 1000, // 5 minutes (for data-persistence)
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000
};

// Validation constants
export const VALIDATION = {
  MIN_PROJECT_ID_LENGTH: 1,
  MAX_PROJECT_ID_LENGTH: 50,
  MIN_GOAL_LENGTH: 10,
  MAX_GOAL_LENGTH: 500,
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_FILE_EXTENSIONS: ['.json', '.txt', '.md']
};

// Logging levels
export const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
  TRACE: 'trace'
};

// Task and HTA constants
export const TASK_CONFIG = {
  MIN_DIFFICULTY: 1,
  MAX_DIFFICULTY: 10,
  DEFAULT_DIFFICULTY: 5,
  MIN_ENERGY_LEVEL: 1,
  MAX_ENERGY_LEVEL: 10,
  DEFAULT_DURATION: 30, // minutes
  MAX_DURATION: 480, // 8 hours

  // Task ID base values
  EXPLORE_TASK_BASE: 1000,
  SAMPLE_TASK_BASE: 2000,
  ADAPTIVE_TASK_BASE: 3000,
  ANALYTICS_TASK_BASE: 4000
};

// Memory sync constants
export const MEMORY_SYNC = {
  SYNC_INTERVAL: 60000, // 1 minute
  MAX_HISTORY_ITEMS: 100,
  COMPRESSION_THRESHOLD: 1000
};

// Error handling constants
export const ERROR_CONFIG = {
  MAX_STACK_TRACE_LENGTH: 2000,
  MAX_ERROR_LOG_SIZE: 50 * 1024 * 1024, // 50MB
  ERROR_RETENTION_DAYS: 30,
  LOG_CHECK_INTERVAL: 30000 // 30 seconds
};

// Claude integration constants
export const CLAUDE_CONFIG = {
  MAX_PROMPT_LENGTH: 8000,
  DEFAULT_TIMEOUT: 30000,
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2
};

// Default path names
export const DEFAULT_PATHS = {
  GENERAL: 'general'
};

// Path constants for common operations
export const PATHS = {
  HOME: () => process.env.HOME || process.env.USERPROFILE,
  DATA_DIR: () => process.env.FOREST_DATA_DIR || `${PATHS.HOME()}/${DEFAULT_DATA_DIR}`,
  PROJECT_DIR: (projectId) => `${PATHS.DATA_DIR()}/${DIRECTORIES.PROJECTS}/${projectId}`,
  PATH_DIR: (projectId, pathName) => `${PATHS.PROJECT_DIR(projectId)}/${DIRECTORIES.PATHS}/${pathName}`
};

// Tool names for MCP
export const TOOL_NAMES = {
  CREATE_PROJECT: 'create_project',
  SWITCH_PROJECT: 'switch_project',
  LIST_PROJECTS: 'list_projects',
  BUILD_HTA_TREE: 'build_hta_tree',
  GET_NEXT_TASK: 'get_next_task',
  COMPLETE_BLOCK: 'complete_block',
  GENERATE_SCHEDULE: 'generate_daily_schedule',
  CURRENT_STATUS: 'current_status',
  ANALYZE_REASONING: 'analyze_reasoning',
  ASK_TRUTHFUL_CLAUDE: 'ask_truthful_claude'
};

// Scoring and complexity constants
export const SCORING = {
  ADAPTIVE_TASK_BOOST: 1000,
  FINANCIAL_SCALE_LARGE: 1000000,
  FINANCIAL_SCALE_MEDIUM: 10000,
  FINANCIAL_SCALE_SMALL: 1000,
  TEAM_SIZE_LARGE: 10,
  TEAM_SIZE_MEDIUM: 3,
  COORDINATION_COMPLEXITY_THRESHOLD: 2
};

// Time conversion constants
export const TIME_CONVERSION = {
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  MILLISECONDS_PER_MINUTE: 60 * 1000,
  MILLISECONDS_PER_HOUR: 60 * 60 * 1000,
  MILLISECONDS_PER_DAY: 24 * 60 * 60 * 1000
};

// Web context constants
export const WEB_CONTEXT = {
  DEFAULT_REFRESH_HOURS: 24,
  DEFAULT_TTL_HOURS: 48,
  REFRESH_MULTIPLIER: 3600_000, // Hours to milliseconds
  TTL_MULTIPLIER: 3600_000 // Hours to milliseconds
};

// Default values
export const DEFAULTS = {
  PROJECT: {
    learningStyle: 'adaptive',
    energyLevel: 7,
    availableHours: 8,
    focusType: 'balanced'
  },
  HTA: {
    maxDepth: 5,
    minTasksPerBranch: 3,
    maxTasksPerBranch: 10
  },
  SCHEDULE: {
    startTime: '09:00',
    endTime: '17:00',
    breakDuration: 15,
    lunchDuration: 60
  }
};

// Time format constants
export const TIME_FORMATS = {
  DATE: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'YYYY-MM-DDTHH:mm:ss.sssZ',
  FILENAME_SAFE: 'YYYY-MM-DD_HH-mm-ss'
};

// Model default values
export const MODEL_DEFAULTS = {
  // HtaNode defaults
  HTA_DEFAULT_PRIORITY: 200,
  HTA_DEFAULT_DURATION_MINUTES: 30,

  // ScheduleBlock defaults
  SCHEDULE_DEFAULT_PRIORITY: 200,
  SCHEDULE_DEFAULT_DURATION_MINUTES: 30,
  SCHEDULE_BREAK_DURATION_MINUTES: 15,
  SCHEDULE_HABIT_DURATION_MINUTES: 30,
  SCHEDULE_BREAK_PRIORITY: 100,
  SCHEDULE_HABIT_PRIORITY: 150,

  // Project defaults
  PROJECT_INTERMEDIATE_THRESHOLD: 3,
  PROJECT_ADVANCED_THRESHOLD: 7,

  // ID generation
  ID_RANDOM_STRING_LENGTH: 8,
  ID_RANDOM_STRING_START: 2,
  RADIX_BASE_36: 36
};

export default {
  FILE_NAMES,
  DIRECTORIES,
  DEFAULT_DATA_DIR,
  SERVER_CONFIG,
  PERFORMANCE,
  VALIDATION,
  LOG_LEVELS,
  TASK_CONFIG,
  MEMORY_SYNC,
  ERROR_CONFIG,
  CLAUDE_CONFIG,
  DEFAULT_PATHS,
  PATHS,
  TOOL_NAMES,
  SCORING,
  TIME_CONVERSION,
  WEB_CONTEXT,
  DEFAULTS,
  TIME_FORMATS,
  MODEL_DEFAULTS
};