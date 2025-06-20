import { jest } from '@jest/globals';
import { HtaTreeBuilder } from '../hta-tree-builder.js';

// Mock dependencies
const mockDataPersistence = {
  loadProjectData: jest.fn(),
  saveProjectData: jest.fn(),
  loadPathData: jest.fn(),
  savePathData: jest.fn()
};

const mockProjectManagement = {
  requireActiveProject: jest.fn()
};

const mockClaudeInterface = {
  requestIntelligence: jest.fn()
};

describe('HtaTreeBuilder (Deep Hierarchy System)', () => {
  let htaBuilder;
  
  beforeEach(() => {
    jest.clearAllMocks();
    htaBuilder = new HtaTreeBuilder(
      mockDataPersistence,
      mockProjectManagement,
      mockClaudeInterface
    );
  });

  describe('buildHTATree', () => {
    it('should create deep HTA structure for valid project', async () => {
      mockProjectManagement.requireActiveProject.mockResolvedValue('test-project');
      mockDataPersistence.loadProjectData.mockResolvedValue({
        goal: 'Learn JavaScript programming',
        context: 'Starting from scratch',
        life_structure_preferences: {
          focus_duration: '25 minutes'
        }
      });
      mockDataPersistence.saveProjectData.mockResolvedValue(true);

      const result = await htaBuilder.buildHTATree('general', 'mixed', []);

      expect(result.content[0].text).toContain('Deep HTA Tree Framework Created');
      expect(result.generation_prompt).toContain('Learn JavaScript programming');
      expect(result.requires_branch_generation).toBe(true);
      expect(mockDataPersistence.saveProjectData).toHaveBeenCalled();
      expect(result.complexity_analysis.score).toBeGreaterThan(0);
    });

    it('should handle missing goal error', async () => {
      mockProjectManagement.requireActiveProject.mockResolvedValue('test-project');
      mockDataPersistence.loadProjectData.mockResolvedValue({});

      const result = await htaBuilder.buildHTATree('general');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Project must have a goal defined');
    });

    it('should handle data persistence failures', async () => {
      mockProjectManagement.requireActiveProject.mockResolvedValue('test-project');
      mockDataPersistence.loadProjectData.mockRejectedValue(new Error('Database error'));

      const result = await htaBuilder.buildHTATree('general');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });

  describe('generateDeepBranchPrompt', () => {
    it('should generate appropriate prompt for a complex goal', () => {
      const config = {
        goal: 'Learn React development',
        context: 'Have basic JavaScript knowledge',
        life_structure_preferences: {
          focus_duration: '30 minutes'
        }
      };
      // Manually run complexity analysis to pass to the prompt generator
      const complexity = htaBuilder.analyzeGoalComplexity(config.goal, config.context);

      const prompt = htaBuilder.generateDeepBranchPrompt(config, 'practical', ['web development'], complexity);

      expect(prompt).toContain('Learn React development');
      expect(prompt).toContain('30 minute');
      expect(prompt).toContain('web development');
      expect(prompt).toContain(`${complexity.recommended_depth}-level deep`);
      expect(prompt).toContain(`"branch_name"`);
    });
  });

  describe('analyzeGoalComplexity', () => {
    it('should assign high complexity to professional goals', () => {
      const complexity = htaBuilder.analyzeGoalComplexity(
        'Become a professional software engineer', 
        'Advanced certification required'
      );

      expect(complexity.score).toBeGreaterThan(7);
      expect(complexity.level).toBe('complex');
      expect(complexity.recommended_depth).toBeGreaterThanOrEqual(3);
    });

    it('should assign low complexity to hobby goals', () => {
      const complexity = htaBuilder.analyzeGoalComplexity(
        'Learn basic photography for fun', 
        'Simple hobby project'
      );

      expect(complexity.score).toBeLessThan(4);
      expect(complexity.level).toBe('simple');
      expect(complexity.recommended_depth).toBeLessThanOrEqual(2);
    });
  });

  describe('loadPathHTA', () => {
    it('should fallback to project-level HTA when path-specific not found', async () => {
      const mockHTA = { projectId: 'test', pathName: 'project' };
      mockDataPersistence.loadPathData.mockResolvedValue(null);
      mockDataPersistence.loadProjectData.mockResolvedValue(mockHTA);

      const result = await htaBuilder.loadPathHTA('test-project', 'general');

      expect(result).toBe(mockHTA);
      expect(mockDataPersistence.loadProjectData).toHaveBeenCalledWith('test-project', 'hta.json');
    });
  });

  describe('savePathHTA', () => {
    it('should save to project data for general path', async () => {
      const htaData = { projectId: 'test', pathName: 'general' };
      mockDataPersistence.saveProjectData.mockResolvedValue(true);

      await htaBuilder.savePathHTA('test-project', 'general', htaData);

      expect(mockDataPersistence.saveProjectData).toHaveBeenCalledWith('test-project', 'hta.json', htaData);
    });
  });
});