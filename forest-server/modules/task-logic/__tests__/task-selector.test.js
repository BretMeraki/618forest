import { jest } from '@jest/globals';
import { TaskSelector } from '../task-selector.js';

describe('TaskSelector', () => {
  // Mock HTA data for testing
  const mockHtaData = {
    frontierNodes: [
      {
        id: 'task_1',
        title: 'Learn HTML Basics',
        description: 'Study HTML fundamentals',
        duration: '30 minutes',
        difficulty: 2,
        priority: 70,
        branch: 'frontend',
        prerequisites: [],
        completed: false
      },
      {
        id: 'task_2',
        title: 'Setup Development Environment',
        description: 'Install and configure development tools',
        duration: '60 minutes',
        difficulty: 3,
        priority: 80,
        branch: 'frontend',
        prerequisites: [],
        completed: false
      },
      {
        id: 'task_3',
        title: 'Learn CSS Flexbox',
        description: 'Master CSS flexbox layout',
        duration: '45 minutes',
        difficulty: 4,
        priority: 85,
        branch: 'frontend',
        prerequisites: [],
        completed: false
      },
      {
        id: 'task_4',
        title: 'Build Sample Project',
        description: 'Create a complete web project',
        duration: '120 minutes',
        difficulty: 5,
        priority: 75,
        branch: 'frontend',
        prerequisites: ['task_2', 'task_3'],
        completed: false
      },
      {
        id: 'task_5',
        title: 'API Integration',
        description: 'Connect frontend to backend API',
        duration: '90 minutes',
        difficulty: 4,
        priority: 60,
        branch: 'backend',
        prerequisites: [],
        completed: false
      }
    ]
  };

  describe('selectOptimalTask', () => {
    it('should select task with highest priority when energy is high', () => {
      const energyLevel = 5;
      const timeAvailable = '60 minutes';
      const contextFromMemory = '';
      const projectContext = {};

      const selected = TaskSelector.selectOptimalTask(
        mockHtaData,
        energyLevel,
        timeAvailable,
        contextFromMemory,
        projectContext
      );

      expect(selected).not.toBeNull();
      expect(['task_2', 'task_3', 'task_5']).toContain(selected.id); // Available tasks
    });

    it('should select easier tasks when energy is low', () => {
      const energyLevel = 2;
      const timeAvailable = '60 minutes';
      const contextFromMemory = '';
      const projectContext = {};

      const selected = TaskSelector.selectOptimalTask(
        mockHtaData,
        energyLevel,
        timeAvailable,
        contextFromMemory,
        projectContext
      );

      expect(selected).not.toBeNull();
      expect(selected.difficulty).toBeLessThanOrEqual(3);
      expect(selected.id).toBe('task_1'); // Easiest available task
    });

    it('should respect time constraints', () => {
      const energyLevel = 4;
      const timeAvailable = '35 minutes';
      const contextFromMemory = '';
      const projectContext = {};

      const selected = TaskSelector.selectOptimalTask(
        mockHtaData,
        energyLevel,
        timeAvailable,
        contextFromMemory,
        projectContext
      );

      expect(selected).not.toBeNull();
      // Should select a short task
      expect(['task_1'].includes(selected.id)).toBe(true);
    });

    it('should respect prerequisite dependencies', () => {
      const energyLevel = 4;
      const timeAvailable = '150 minutes';
      const contextFromMemory = '';
      const projectContext = {};

      const selected = TaskSelector.selectOptimalTask(
        mockHtaData,
        energyLevel,
        timeAvailable,
        contextFromMemory,
        projectContext
      );

      // Should not select task_4 which requires both task_2 and task_3
      expect(selected.id).not.toBe('task_4');
    });

    it('should return null when no suitable tasks available', () => {
      const mockEmptyData = { frontierNodes: [] };
      const energyLevel = 4;
      const timeAvailable = '60 minutes';
      const contextFromMemory = '';
      const projectContext = {};

      const selected = TaskSelector.selectOptimalTask(
        mockEmptyData,
        energyLevel,
        timeAvailable,
        contextFromMemory,
        projectContext
      );

      expect(selected).toBeNull();
    });

    it('should handle completed tasks in frontier nodes', () => {
      const dataWithCompletedTasks = {
        frontierNodes: [
          ...mockHtaData.frontierNodes,
          {
            id: 'completed_task',
            title: 'Completed Task',
            completed: true,
            duration: '30 minutes',
            difficulty: 2
          }
        ]
      };

      const energyLevel = 3;
      const timeAvailable = '60 minutes';
      const contextFromMemory = '';
      const projectContext = {};

      const selected = TaskSelector.selectOptimalTask(
        dataWithCompletedTasks,
        energyLevel,
        timeAvailable,
        contextFromMemory,
        projectContext
      );

      expect(selected).not.toBeNull();
      expect(selected.id).not.toBe('completed_task');
    });
  });

  describe('selectDiverseTask', () => {
    it('should select diverse tasks based on branch distribution', () => {
      const topTasks = [
        { id: 'task_1', branch: 'frontend', score: 100 },
        { id: 'task_2', branch: 'backend', score: 100 },
        { id: 'task_3', branch: 'frontend', score: 100 }
      ];

      const selected = TaskSelector.selectDiverseTask(topTasks);
      
      // Should prefer backend task for diversity
      expect(selected.branch).toBe('backend');
      expect(selected.id).toBe('task_2');
    });

    it('should handle tasks without branch property', () => {
      const topTasks = [
        { id: 'task_1', score: 100 },
        { id: 'task_2', branch: 'frontend', score: 100 }
      ];

      const selected = TaskSelector.selectDiverseTask(topTasks);
      
      expect(selected).toBeDefined();
      expect(['task_1', 'task_2']).toContain(selected.id);
    });

    it('should prefer momentum building tasks when branch diversity is equal', () => {
      const topTasks = [
        { id: 'task_1', branch: 'frontend', score: 100, momentumBuilding: false },
        { id: 'task_2', branch: 'backend', score: 100, momentumBuilding: true }
      ];

      const selected = TaskSelector.selectDiverseTask(topTasks);
      
      expect(selected.momentumBuilding).toBe(true);
      expect(selected.id).toBe('task_2');
    });

    it('should handle single task input', () => {
      const topTasks = [
        { id: 'only_task', branch: 'frontend', score: 100 }
      ];

      const selected = TaskSelector.selectDiverseTask(topTasks);
      
      expect(selected.id).toBe('only_task');
    });

    it('should handle empty task list', () => {
      const topTasks = [];

      const selected = TaskSelector.selectDiverseTask(topTasks);
      
      expect(selected).toBeUndefined();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty task list', () => {
      const mockEmptyData = { frontierNodes: [] };
      const selected = TaskSelector.selectOptimalTask(
        mockEmptyData,
        5,
        '60 minutes',
        '',
        {}
      );

      expect(selected).toBeNull();
    });

    it('should handle invalid context gracefully', () => {
      const selected = TaskSelector.selectOptimalTask(
        mockHtaData,
        4,
        '60 minutes',
        '',
        {}
      );

      expect(selected).toBeDefined(); // Should still return something
    });

    it('should handle tasks with missing required fields', () => {
      const incompleteTasks = {
        frontierNodes: [
          { id: 'task_incomplete', completed: false }
        ]
      };

      const selected = TaskSelector.selectOptimalTask(
        incompleteTasks,
        4,
        '60 minutes',
        '',
        {}
      );

      // Should handle gracefully and potentially return the task or null
      expect(selected === null || selected.id === 'task_incomplete').toBe(true);
    });

    it('should handle null/undefined inputs gracefully', () => {
      expect(() => {
        TaskSelector.selectOptimalTask(null, 4, '60 minutes', '', {});
      }).not.toThrow();

      expect(() => {
        TaskSelector.selectOptimalTask(mockHtaData, null, '60 minutes', '', {});
      }).not.toThrow();

      expect(() => {
        TaskSelector.selectOptimalTask(mockHtaData, 4, null, '', {});
      }).not.toThrow();

      expect(() => {
        TaskSelector.selectOptimalTask(mockHtaData, 4, '60 minutes', null, {});
      }).not.toThrow();

      expect(() => {
        TaskSelector.selectOptimalTask(mockHtaData, 4, '60 minutes', '', null);
      }).not.toThrow();
    });

    it('should handle tasks with invalid time formats', () => {
      const dataWithInvalidTimes = {
        frontierNodes: [
          {
            id: 'invalid_time_task',
            title: 'Invalid Time Task',
            duration: 'invalid time format',
            difficulty: 2,
            priority: 70,
            prerequisites: [],
            completed: false
          }
        ]
      };

      expect(() => {
        TaskSelector.selectOptimalTask(
          dataWithInvalidTimes,
          3,
          '60 minutes',
          '',
          {}
        );
      }).not.toThrow();
    });

    it('should handle tasks with circular prerequisites', () => {
      const dataWithCircularDeps = {
        frontierNodes: [
          {
            id: 'task_a',
            title: 'Task A',
            duration: '30 minutes',
            difficulty: 2,
            priority: 70,
            prerequisites: ['task_b'],
            completed: false
          },
          {
            id: 'task_b',
            title: 'Task B',
            duration: '30 minutes',
            difficulty: 2,
            priority: 70,
            prerequisites: ['task_a'],
            completed: false
          }
        ]
      };

      const selected = TaskSelector.selectOptimalTask(
        dataWithCircularDeps,
        3,
        '60 minutes',
        '',
        {}
      );

      // Should return null since neither task can be started
      expect(selected).toBeNull();
    });
  });
});