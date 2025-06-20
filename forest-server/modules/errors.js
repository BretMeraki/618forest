/**
 * Forest Server Error Classes
 * Provides specific, contextual error types for better debugging and handling
 */

export class ForestError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.context = options.context || {};
    this.cause = options.cause;

    // Maintain stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      timestamp: this.timestamp,
      context: this.context,
      cause: this.cause?.message || this.cause,
    };
  }
}

export class ProjectConfigurationError extends ForestError {
  constructor(projectId, configPath, cause, context = {}) {
    const message = `Project configuration not found for '${projectId}' at '${configPath}'${cause ? `. Cause: ${cause}` : ''}`;
    super(message, {
      cause,
      context: {
        projectId,
        configPath,
        operation: context.operation || 'unknown',
        ...context,
      },
    });
    this.projectId = projectId;
    this.configPath = configPath;
  }
}

export class NoActiveProjectError extends ForestError {
  constructor(operation = 'unknown') {
    super(
      `No active project available for operation: ${operation}. Create or switch to a project first.`
    );
    this.operation = operation;
  }
}

export class RequiredFieldsError extends ForestError {
  constructor(missingFields, operation = 'unknown') {
    const fieldsList = Array.isArray(missingFields) ? missingFields.join(', ') : missingFields;
    super(`Missing required fields for ${operation}: ${fieldsList}`);
    this.missingFields = missingFields;
    this.operation = operation;
  }
}

export class DataPersistenceError extends ForestError {
  constructor(operation, filePath, cause, context = {}) {
    super(`Data persistence operation '${operation}' failed for file: ${filePath}`, {
      cause,
      context: { operation, filePath, ...context },
    });
    this.operation = operation;
    this.filePath = filePath;
  }
}

export class ToolDispatchError extends ForestError {
  constructor(toolName, cause, args = {}) {
    super(`Tool '${toolName}' execution failed`, {
      cause,
      context: { toolName, args: Object.keys(args) },
    });
    this.toolName = toolName;
    this.args = args;
  }
}

export class ValidationError extends ForestError {
  constructor(field, value, expected, context = {}) {
    super(
      `Validation failed for field '${field}': expected ${expected}, got ${typeof value} (${value})`,
      {
        context: { field, value, expected, ...context },
      }
    );
    this.field = field;
    this.value = value;
    this.expected = expected;
  }
}

export class MemorySyncError extends ForestError {
  constructor(operation, cause, context = {}) {
    super(`Memory synchronization failed for operation: ${operation}`, {
      cause,
      context: { operation, ...context },
    });
    this.operation = operation;
  }
}

export class TaskExecutionError extends ForestError {
  constructor(taskId, phase, cause, context = {}) {
    super(`Task execution failed: ${taskId} in phase '${phase}'`, {
      cause,
      context: { taskId, phase, ...context },
    });
    this.taskId = taskId;
    this.phase = phase;
  }
}

export class HTATreeError extends ForestError {
  constructor(operation, cause, context = {}) {
    super(`HTA tree operation failed: ${operation}`, {
      cause,
      context: { operation, ...context },
    });
    this.operation = operation;
  }
}

// Utility function to wrap and enhance existing errors
export function enhanceError(error, context = {}) {
  if (error instanceof ForestError) {
    // Already enhanced
    return error;
  }

  return new ForestError(error.message, {
    cause: error,
    context,
  });
}

// Utility function to safely extract error information
export function extractErrorInfo(error) {
  if (error instanceof ForestError) {
    return error.toJSON();
  }

  return {
    name: error.name || 'Error',
    message: error.message || 'Unknown error',
    timestamp: new Date().toISOString(),
    stack: error.stack,
  };
}
