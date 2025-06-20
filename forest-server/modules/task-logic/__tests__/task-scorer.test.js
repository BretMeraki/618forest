import { TaskScorer } from '../task-scorer.js';

describe('TaskScorer', () => {
  // Sample tasks with new hierarchical properties
  const foundationalTask = {
    id: 'task1',
    title: 'Setup Development Environment',
    priority: 100,
    depth: 1, // Foundational
    prerequisites: [],
    difficulty: 2,
    duration: '60 minutes',
  };

  const coreTask = {
    id: 'task2',
    title: 'Build First Component',
    priority: 100,
    depth: 2, // Core development
    prerequisites: ['Setup Development Environment'],
    difficulty: 3,
    duration: '90 minutes',
  };

  const blockedTask = {
    id: 'task3',
    title: 'Advanced State Management',
    priority: 100,
    depth: 3, // Advanced
    prerequisites: ['Build First Component'],
    difficulty: 4,
    duration: '45 minutes',
  };

  const projectContext_early = {
    completedTasks: [],
  };

  const projectContext_mid = {
    completedTasks: [{ title: 'Setup Development Environment' }],
  };

  describe('calculateTaskScore with New Hierarchy Logic', () => {
    test('should give the highest score to a foundational, unblocked task', () => {
      const score = TaskScorer.calculateTaskScore(
        foundationalTask,
        3, // energyLevel
        120, // timeInMinutes
        '',
        projectContext_early
      );

      // Expected: 100 (base) + 1000 (depth 1) + 800 (prereqs met) + 200 (energy) + 100 (time) = 2200
      expect(score).toBe(2200);
    });

    test('should give a medium score to a core task with met prerequisites', () => {
      const score = TaskScorer.calculateTaskScore(
        coreTask,
        3, // energyLevel
        120, // timeInMinutes
        '',
        projectContext_mid // 'Setup Development Environment' is done
      );

      // Expected: 100 (base) + 500 (depth 2) + 800 (prereqs met) + 250 (energy) + 100 (time) = 1750
      expect(score).toBe(1750);
    });

    test('should heavily penalize a task with unmet prerequisites', () => {
      const score = TaskScorer.calculateTaskScore(
        blockedTask,
        4, // energyLevel
        60, // timeInMinutes
        '',
        projectContext_mid // 'Build First Component' is NOT done
      );

      // Expected: 100 (base) + 200 (depth 3) - 500 (blocked) + 250 (energy) + 100 (time) = 150
      expect(score).toBe(150);
    });

    test('should penalize for time mismatch', () => {
      const score = TaskScorer.calculateTaskScore(
        foundationalTask, // 60 min task
        3,
        30, // Only 30 mins available
        '',
        projectContext_early
      );

      // Expected: 100 (base) + 1000 (depth 1) + 800 (prereqs met) + 200 (energy) - 100 (time) = 2000
      expect(score).toBe(2000);
    });

    test('should give a small boost for good energy match', () => {
        const score = TaskScorer.calculateTaskScore(
          foundationalTask, // difficulty 2
          2, // perfect energy match
          60, 
          '',
          projectContext_early
        );
  
        // Expected: 100 (base) + 1000 (depth 1) + 800 (prereqs met) + 250 (energy) + 100 (time) = 2250
        expect(score).toBe(2250);
      });

      test('should penalize for poor energy match', () => {
        const score = TaskScorer.calculateTaskScore(
          blockedTask, // difficulty 4
          1, // very low energy
          60, 
          '',
          projectContext_mid
        );
  
        // Expected: 100 (base) + 200 (depth 3) - 500 (blocked) + 100 (energy) + 100 (time) = 0
        expect(score).toBe(0);
      });
  });

  describe('parseTimeToMinutes', () => {
    test('should parse minute formats', () => {
      expect(TaskScorer.parseTimeToMinutes('30 minutes')).toBe(30);
      expect(TaskScorer.parseTimeToMinutes('45 min')).toBe(45);
      expect(TaskScorer.parseTimeToMinutes('15 minute')).toBe(15);
    });

    test('should parse hour formats', () => {
      expect(TaskScorer.parseTimeToMinutes('2 hours')).toBe(120);
      expect(TaskScorer.parseTimeToMinutes('1 hour')).toBe(60);
      expect(TaskScorer.parseTimeToMinutes('3 hr')).toBe(180);
    });

    test('should return default for invalid formats', () => {
      expect(TaskScorer.parseTimeToMinutes('invalid')).toBe(30);
      expect(TaskScorer.parseTimeToMinutes('')).toBe(30);
      expect(TaskScorer.parseTimeToMinutes('some text')).toBe(30);
    });

    test('should be case insensitive', () => {
      expect(TaskScorer.parseTimeToMinutes('2 HOURS')).toBe(120);
      expect(TaskScorer.parseTimeToMinutes('30 MINUTES')).toBe(30);
    });
  });
});
