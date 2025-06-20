/**
 * Error Classes Unit Tests
 * Tests the custom error classes and error handling utilities
 */

import { describe, test, expect } from '@jest/globals';
import {
  ForestError,
  ProjectConfigurationError,
  DataPersistenceError,
  ToolDispatchError,
  ValidationError,
  enhanceError,
  extractErrorInfo,
} from '../errors.js';

describe('ForestError', () => {
  test('should create basic forest error', () => {
    const error = new ForestError('Test error message');

    expect(error.message).toBe('Test error message');
    expect(error.name).toBe('ForestError');
    expect(error.timestamp).toBeDefined();
    expect(error.context).toEqual({});
  });

  test('should store context and cause', () => {
    const cause = new Error('Original error');
    const context = { operation: 'test', data: 'value' };

    const error = new ForestError('Wrapper error', { cause, context });

    expect(error.cause).toBe(cause);
    expect(error.context).toEqual(context);
  });

  test('should serialize to JSON correctly', () => {
    const cause = new Error('Cause error');
    const error = new ForestError('Test error', {
      cause,
      context: { key: 'value' },
    });

    const json = error.toJSON();

    expect(json.name).toBe('ForestError');
    expect(json.message).toBe('Test error');
    expect(json.context).toEqual({ key: 'value' });
    expect(json.cause).toBe('Cause error');
    expect(json.timestamp).toBeDefined();
  });
});

describe('ProjectConfigurationError', () => {
  test('should create project configuration error', () => {
    const error = new ProjectConfigurationError('project123', 'config.json', 'File not found');

    expect(error.message).toContain('project123');
    expect(error.message).toContain('config.json');
    expect(error.message).toContain('File not found');
    expect(error.projectId).toBe('project123');
    expect(error.configPath).toBe('config.json');
  });

  test('should include operation context', () => {
    const error = new ProjectConfigurationError('project123', 'config.json', null, {
      operation: 'loadProject',
    });

    expect(error.context.operation).toBe('loadProject');
    expect(error.context.projectId).toBe('project123');
  });
});

describe('DataPersistenceError', () => {
  test('should create data persistence error', () => {
    const cause = new Error('ENOENT: file not found');
    const error = new DataPersistenceError('load', '/path/to/file.json', cause);

    expect(error.message).toContain('load');
    expect(error.message).toContain('/path/to/file.json');
    expect(error.operation).toBe('load');
    expect(error.filePath).toBe('/path/to/file.json');
    expect(error.cause).toBe(cause);
  });
});

describe('ToolDispatchError', () => {
  test('should create tool dispatch error', () => {
    const cause = new Error('Handler failed');
    const args = { param1: 'value1', param2: 'value2' };
    const error = new ToolDispatchError('test_tool', cause, args);

    expect(error.message).toContain('test_tool');
    expect(error.toolName).toBe('test_tool');
    expect(error.args).toBe(args);
    expect(error.cause).toBe(cause);
    expect(error.context.toolName).toBe('test_tool');
    expect(error.context.args).toEqual(['param1', 'param2']);
  });
});

describe('ValidationError', () => {
  test('should create validation error', () => {
    const error = new ValidationError('username', 'abc', 'string longer than 5 characters');

    expect(error.message).toContain('username');
    expect(error.message).toContain('string longer than 5 characters');
    expect(error.field).toBe('username');
    expect(error.value).toBe('abc');
    expect(error.expected).toBe('string longer than 5 characters');
  });
});

describe('enhanceError', () => {
  test('should return ForestError unchanged', () => {
    const forestError = new ForestError('Already enhanced');
    const result = enhanceError(forestError);

    expect(result).toBe(forestError);
  });

  test('should wrap regular errors', () => {
    const regularError = new Error('Regular error');
    const result = enhanceError(regularError, { operation: 'test' });

    expect(result).toBeInstanceOf(ForestError);
    expect(result.message).toBe('Regular error');
    expect(result.cause).toBe(regularError);
    expect(result.context.operation).toBe('test');
  });
});

describe('extractErrorInfo', () => {
  test('should extract info from ForestError', () => {
    const error = new ForestError('Test error', {
      context: { key: 'value' },
    });
    const info = extractErrorInfo(error);

    expect(info.name).toBe('ForestError');
    expect(info.message).toBe('Test error');
    expect(info.timestamp).toBeDefined();
    expect(info.context).toEqual({ key: 'value' });
  });

  test('should extract info from regular error', () => {
    const error = new Error('Regular error');
    error.stack = 'Stack trace...';
    const info = extractErrorInfo(error);

    expect(info.name).toBe('Error');
    expect(info.message).toBe('Regular error');
    expect(info.timestamp).toBeDefined();
    expect(info.stack).toBe('Stack trace...');
  });

  test('should handle error without properties', () => {
    const error = {};
    const info = extractErrorInfo(error);

    expect(info.name).toBe('Error');
    expect(info.message).toBe('Unknown error');
    expect(info.timestamp).toBeDefined();
  });
});
