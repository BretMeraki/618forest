/**
 * Tool Registry Unit Tests
 * Tests the tool registration and execution system
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { ToolRegistry } from '../tool-registry.js';
import { ToolDispatchError } from '../../errors.js';

describe('ToolRegistry', () => {
  let registry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  describe('registration', () => {
    test('should register a tool successfully', () => {
      const handler = () => 'test result';
      registry.register('test_tool', handler, 'test');

      expect(registry.has('test_tool')).toBe(true);
      expect(registry.getToolNames()).toContain('test_tool');
      expect(registry.getToolsByCategory('test')).toContain('test_tool');
    });

    test('should throw error for invalid tool name', () => {
      expect(() => {
        registry.register('', () => {});
      }).toThrow('Tool name must be a non-empty string');

      expect(() => {
        registry.register(null, () => {});
      }).toThrow('Tool name must be a non-empty string');
    });

    test('should throw error for invalid handler', () => {
      expect(() => {
        registry.register('test_tool', null);
      }).toThrow('Tool handler must be a function');

      expect(() => {
        registry.register('test_tool', 'not a function');
      }).toThrow('Tool handler must be a function');
    });

    test('should organize tools by category', () => {
      registry.register('tool1', () => {}, 'category1');
      registry.register('tool2', () => {}, 'category1');
      registry.register('tool3', () => {}, 'category2');

      expect(registry.getCategories()).toEqual(expect.arrayContaining(['category1', 'category2']));
      expect(registry.getToolsByCategory('category1')).toEqual(['tool1', 'tool2']);
      expect(registry.getToolsByCategory('category2')).toEqual(['tool3']);
    });
  });

  describe('execution', () => {
    test('should execute registered tool successfully', async () => {
      let calledWith = null;
      const mockHandler = args => {
        calledWith = args;
        return Promise.resolve('success');
      };
      registry.register('test_tool', mockHandler, 'test');

      const result = await registry.execute('test_tool', { arg1: 'value1' });

      expect(result).toBe('success');
      expect(calledWith).toEqual({ arg1: 'value1' });
    });

    test('should throw ToolDispatchError for unregistered tool', async () => {
      await expect(registry.execute('nonexistent_tool')).rejects.toThrow(ToolDispatchError);
    });

    test('should wrap handler errors in ToolDispatchError', async () => {
      const mockHandler = () => {
        return Promise.reject(new Error('Handler error'));
      };
      registry.register('failing_tool', mockHandler, 'test');

      await expect(registry.execute('failing_tool')).rejects.toThrow(ToolDispatchError);
    });

    test('should handle synchronous tools', async () => {
      registry.register('sync_tool', args => `sync result: ${args.input}`, 'test');

      const result = await registry.execute('sync_tool', { input: 'test' });
      expect(result).toBe('sync result: test');
    });

    test('should handle asynchronous tools', async () => {
      registry.register(
        'async_tool',
        async args => {
          await new Promise(resolve => setTimeout(resolve, 1));
          return `async result: ${args.input}`;
        },
        'test'
      );

      const result = await registry.execute('async_tool', { input: 'test' });
      expect(result).toBe('async result: test');
    });
  });

  describe('metadata and statistics', () => {
    test('should store and retrieve tool metadata', () => {
      const metadata = { description: 'Test tool', version: '1.0' };
      registry.register('test_tool', () => {}, 'test', metadata);

      const toolMetadata = registry.getToolMetadata('test_tool');
      expect(toolMetadata.category).toBe('test');
      expect(toolMetadata.metadata).toEqual(metadata);
      expect(toolMetadata.registeredAt).toBeDefined();
    });

    test('should return null for nonexistent tool metadata', () => {
      expect(registry.getToolMetadata('nonexistent')).toBeNull();
    });

    test('should provide registry statistics', () => {
      registry.register('tool1', () => {}, 'category1');
      registry.register('tool2', () => {}, 'category1');
      registry.register('tool3', () => {}, 'category2');

      const stats = registry.getStats();
      expect(stats.totalTools).toBe(3);
      expect(stats.totalCategories).toBe(2);
      expect(stats.toolsByCategory).toEqual({
        category1: 2,
        category2: 1,
      });
      expect(stats.registeredTools).toEqual(['tool1', 'tool2', 'tool3']);
    });
  });

  describe('unregistration', () => {
    test('should unregister tool successfully', () => {
      registry.register('test_tool', () => {}, 'test');
      expect(registry.has('test_tool')).toBe(true);

      const result = registry.unregister('test_tool');
      expect(result).toBe(true);
      expect(registry.has('test_tool')).toBe(false);
      expect(registry.getToolsByCategory('test')).not.toContain('test_tool');
    });

    test('should return false for nonexistent tool', () => {
      const result = registry.unregister('nonexistent');
      expect(result).toBe(false);
    });

    test('should clean up empty categories', () => {
      registry.register('test_tool', () => {}, 'test');
      expect(registry.getCategories()).toContain('test');

      registry.unregister('test_tool');
      expect(registry.getCategories()).not.toContain('test');
    });
  });
});
