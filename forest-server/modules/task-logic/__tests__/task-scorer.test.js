import { TaskScorer } from '../task-scorer.js';

describe('TaskScorer', () => {
  // Sample task objects for testing
  const basicTask = {
    id: 'task1',
    title: 'Learn JavaScript basics',
    description: 'Study fundamental JavaScript concepts',
    priority: 200,
    difficulty: 3,
    duration: '30 minutes'
  };

  const momentumTask = {
    id: 'task2',
    title: 'Build first project',
    description: 'Create a simple web application',
    priority: 100,
    difficulty: 4,
    duration: '2 hours',
    momentumBuilding: true,
    branch: 'expert_networking'
  };

  const breakthroughTask = {
    id: 'task3',
    title: 'Advanced optimization',
    description: 'Implement performance improvements',
    priority: 150,
    difficulty: 5,
    duration: '45 minutes',
    opportunityType: 'breakthrough_amplification'
  };

  const adaptiveTask = {
    id: 'task4',
    title: 'Free online course',
    description: 'Complete zero budget learning module',
    priority: 180,
    difficulty: 2,
    duration: '1 hour',
    branch: 'zero_budget_adaptation'
  };

  const projectContext = {
    goal: 'Become a JavaScript developer',
    domain: 'web development programming'
  };

  describe('calculateTaskScore', () => {
    test('should calculate basic score with energy matching', () => {
      const score = TaskScorer.calculateTaskScore(
        basicTask,
        3, // energyLevel matches task difficulty
        60, // timeInMinutes
        '',
        projectContext
      );

      // Expected: 200 (priority) + 100 (perfect energy match: 5-|3-3|*20) + 50 (time fits) + 100 (domain relevant)
      expect(score).toBe(450);
    });

    test('should penalize energy mismatch', () => {
      const score = TaskScorer.calculateTaskScore(
        basicTask,
        1, // energyLevel (low) vs task difficulty 3
        60,
        '',
        projectContext
      );

      // Expected: 200 (priority) + 60 (poor energy match: 5-|1-3|*20 = 5-2*20 = 60) + 50 (time fits) + 100 (domain relevant)
      expect(score).toBe(410);
    });

    test('should give massive boost to momentum building tasks', () => {
      const score = TaskScorer.calculateTaskScore(
        momentumTask,
        4, // energyLevel matches task difficulty
        120, // timeInMinutes (fits 2 hours)
        '',
        projectContext
      );

      // Expected: 100 (priority) + 100 (perfect energy match) + 50 (time fits) + 100 (domain relevant) + 500+ (momentum boost + branch variation + random)
      // The momentum boost is 500 + 15 (expert_networking branch) + 0-10 (random)
      expect(score).toBeGreaterThan(750);
      expect(score).toBeLessThan(790); // Account for random variation
    });

    test('should boost breakthrough amplification tasks', () => {
      const score = TaskScorer.calculateTaskScore(
        breakthroughTask,
        5, // energyLevel matches task difficulty
        60, // timeInMinutes
        '',
        projectContext
      );

      // Expected: 150 (priority) + 100 (perfect energy match) + 50 (time fits) + 100 (breakthrough boost)
      // Note: Domain relevance is not detected for this task, so no +100
      expect(score).toBe(400);
    });

    test('should penalize tasks that are too long for available time', () => {
      const longTask = {
        ...basicTask,
        duration: '3 hours'
      };

      const score = TaskScorer.calculateTaskScore(
        longTask,
        3,
        30, // Only 30 minutes available for 3-hour task
        '',
        projectContext
      );

      // Expected: 200 (priority) + 100 (energy match) - 100 (way too long) + 100 (domain relevant)
      expect(score).toBe(300);
    });

    test('should handle time constraint adaptations', () => {
      const score1 = TaskScorer.calculateTaskScore(
        basicTask, // 30 minutes
        3,
        25, // 25 minutes available (83% of task duration - should get +20)
        '',
        projectContext
      );

      const score2 = TaskScorer.calculateTaskScore(
        basicTask, // 30 minutes
        3,
        15, // 15 minutes available (50% of task duration - should get -20)
        '',
        projectContext
      );

      // Score1: 200 + 100 + 20 + 100 = 420
      expect(score1).toBe(420);
      // Score2: 200 + 100 - 20 + 100 = 380
      expect(score2).toBe(380);
    });

    test('should boost tasks adapted for life changes', () => {
      const lifeChangeContext = 'I lost my savings and have zero budget for learning';

      const score = TaskScorer.calculateTaskScore(
        adaptiveTask,
        2, // energyLevel matches task difficulty
        60,
        lifeChangeContext,
        projectContext
      );

      // Expected: 180 (priority) + 100 (perfect energy match) + 50 (time fits) + 50 (context relevant) + 1000 (adaptive task boost)
      // Note: Domain relevance not detected for this task
      expect(score).toBe(1380);
    });

    test('should boost context-relevant tasks', () => {
      const contextFromMemory = 'Working on JavaScript and web development projects';

      const score = TaskScorer.calculateTaskScore(
        basicTask,
        3,
        60,
        contextFromMemory,
        projectContext
      );

      // Expected: 200 (priority) + 100 (energy match) + 50 (time fits) + 100 (domain relevant) + 50 (context relevant)
      expect(score).toBe(500);
    });

    test('should boost recently generated tasks', () => {
      const generatedTask = {
        ...basicTask,
        generated: true
      };

      const score = TaskScorer.calculateTaskScore(
        generatedTask,
        3,
        60,
        '',
        projectContext
      );

      // Expected: 200 (priority) + 100 (energy match) + 50 (time fits) + 100 (domain relevant) + 25 (generated boost)
      expect(score).toBe(475);
    });
  });

  describe('getBranchVariation', () => {
    test('should return specific boost for known branches', () => {
      expect(TaskScorer.getBranchVariation('expert_networking')).toBe(15);
      expect(TaskScorer.getBranchVariation('academic_networking')).toBe(19);
      expect(TaskScorer.getBranchVariation('media_relations')).toBe(18);
      expect(TaskScorer.getBranchVariation('thought_leadership')).toBe(17);
    });

    test('should return default boost for unknown branches', () => {
      expect(TaskScorer.getBranchVariation('unknown_branch')).toBe(5);
      expect(TaskScorer.getBranchVariation('')).toBe(5);
      expect(TaskScorer.getBranchVariation(null)).toBe(5);
    });
  });

  describe('isDomainRelevant', () => {
    test('should detect domain relevance', () => {
      const webDevTask = {
        title: 'JavaScript tutorial',
        description: 'Learn web development fundamentals'
      };

      const result = TaskScorer.isDomainRelevant(webDevTask, projectContext);
      expect(result).toBe(true);
    });

    test('should reject non-relevant tasks', () => {
      const unrelatedTask = {
        title: 'Cook dinner',
        description: 'Make pasta and salad'
      };

      const result = TaskScorer.isDomainRelevant(unrelatedTask, projectContext);
      expect(result).toBe(false);
    });

    test('should filter out common research words', () => {
      const researchTask = {
        title: 'Research study project',
        description: 'Learning about research methods'
      };

      // Should not match even though it contains 'learning' because that's filtered out
      const result = TaskScorer.isDomainRelevant(researchTask, projectContext);
      expect(result).toBe(false);
    });
  });

  describe('isContextRelevant', () => {
    test('should match relevant context strings', () => {
      const task = {
        title: 'JavaScript debugging',
        description: 'Fix web application bugs'
      };

      const relevantContext = 'Working on JavaScript application development';
      const result = TaskScorer.isContextRelevant(task, relevantContext);
      expect(result).toBe(true);
    });

    test('should handle non-string context gracefully', () => {
      const task = {
        title: 'Test task',
        description: 'Sample description'
      };

      expect(TaskScorer.isContextRelevant(task, null)).toBe(false);
      expect(TaskScorer.isContextRelevant(task, undefined)).toBe(false);
      expect(TaskScorer.isContextRelevant(task, {})).toBe(false);
      expect(TaskScorer.isContextRelevant(task, [])).toBe(false);
    });

    test('should handle object context by stringifying', () => {
      const task = {
        title: 'Programming task',
        description: 'Code development'
      };

      const objectContext = { activity: 'programming', language: 'JavaScript' };
      const result = TaskScorer.isContextRelevant(task, objectContext);
      expect(result).toBe(true); // Should match 'programming'
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

  describe('isLifeChangeContext', () => {
    test('should detect financial crisis indicators', () => {
      expect(TaskScorer.isLifeChangeContext('I lost savings')).toBe(true);
      expect(TaskScorer.isLifeChangeContext('We have no money left')).toBe(true);
      expect(TaskScorer.isLifeChangeContext('Facing financial crisis')).toBe(true);
      expect(TaskScorer.isLifeChangeContext('zero budget situation')).toBe(true);
    });

    test('should detect caregiving indicators', () => {
      expect(TaskScorer.isLifeChangeContext('caring for sick mother')).toBe(true);
      expect(TaskScorer.isLifeChangeContext('taking care of family')).toBe(true);
      expect(TaskScorer.isLifeChangeContext('I am now a caregiver')).toBe(true);
    });

    test('should detect time constraint indicators', () => {
      expect(TaskScorer.isLifeChangeContext('I only 2 hours per day')).toBe(true);
      expect(TaskScorer.isLifeChangeContext('very limited time available')).toBe(true);
    });

    test('should handle non-string inputs gracefully', () => {
      expect(TaskScorer.isLifeChangeContext(null)).toBe(false);
      expect(TaskScorer.isLifeChangeContext(undefined)).toBe(false);
      expect(TaskScorer.isLifeChangeContext({})).toBe(false);
      expect(TaskScorer.isLifeChangeContext(123)).toBe(false);
    });

    test('should return false for normal context', () => {
      expect(TaskScorer.isLifeChangeContext('Learning JavaScript')).toBe(false);
      expect(TaskScorer.isLifeChangeContext('Working on projects')).toBe(false);
    });
  });

  describe('detectLifeChangeType', () => {
    test('should detect financial crisis type', () => {
      expect(TaskScorer.detectLifeChangeType('lost savings')).toBe('financial_crisis');
      expect(TaskScorer.detectLifeChangeType('zero budget')).toBe('financial_crisis');
      expect(TaskScorer.detectLifeChangeType('no money left')).toBe('financial_crisis');
    });

    test('should detect caregiving mode', () => {
      expect(TaskScorer.detectLifeChangeType('caring for sick mother')).toBe('caregiving_mode');
      expect(TaskScorer.detectLifeChangeType('I am a caregiver now')).toBe('caregiving_mode');
    });

    test('should detect location change', () => {
      expect(TaskScorer.detectLifeChangeType('moved out of town')).toBe('location_change');
      expect(TaskScorer.detectLifeChangeType('relocated to new city')).toBe('location_change');
    });

    test('should detect time constraints', () => {
      expect(TaskScorer.detectLifeChangeType('only 2 hours available')).toBe('time_constraints');
      expect(TaskScorer.detectLifeChangeType('limited time each day')).toBe('time_constraints');
    });

    test('should detect health crisis', () => {
      expect(TaskScorer.detectLifeChangeType('health crisis emerged')).toBe('health_crisis');
      expect(TaskScorer.detectLifeChangeType('medical emergency')).toBe('health_crisis');
    });

    test('should return unknown for unrecognized changes', () => {
      expect(TaskScorer.detectLifeChangeType('something changed')).toBe('unknown_change');
    });

    test('should return none for no context', () => {
      expect(TaskScorer.detectLifeChangeType('')).toBe('none');
      expect(TaskScorer.detectLifeChangeType(null)).toBe('none');
    });
  });

  describe('isTaskAdaptedForLifeChange', () => {
    test('should identify financial crisis adaptations', () => {
      const freeTask = {
        title: 'Free coding course',
        description: 'Zero cost learning resource',
        branch: 'zero_budget_adaptation'
      };

      expect(TaskScorer.isTaskAdaptedForLifeChange(freeTask, 'financial_crisis')).toBe(true);
    });

    test('should identify caregiving adaptations', () => {
      const passiveTask = {
        title: 'Voice lessons',
        description: 'Passive learning while caregiving',
        branch: 'caregiving_compatible'
      };

      expect(TaskScorer.isTaskAdaptedForLifeChange(passiveTask, 'caregiving_mode')).toBe(true);
    });

    test('should identify time constraint adaptations', () => {
      const microTask = {
        title: 'Micro learning session',
        description: '5 minutes daily practice',
        branch: 'time_optimized'
      };

      expect(TaskScorer.isTaskAdaptedForLifeChange(microTask, 'time_constraints')).toBe(true);
    });

    test('should default to generic adaptation markers', () => {
      const adaptiveTask = {
        title: 'Flexible learning',
        description: 'Adaptable to circumstances',
        branch: 'life_adaptation',
        generated: true
      };

      expect(TaskScorer.isTaskAdaptedForLifeChange(adaptiveTask, 'unknown_change')).toBe(true);
    });

    test('should return false for non-adapted tasks', () => {
      const regularTask = {
        title: 'Regular course',
        description: 'Standard learning approach'
      };

      expect(TaskScorer.isTaskAdaptedForLifeChange(regularTask, 'financial_crisis')).toBe(false);
    });
  });
});