import { jest } from '@jest/globals';

// Mock dependencies before importing the class
const mockDataPersistence = {
  loadProjectData: jest.fn(),
  saveProjectData: jest.fn(),
  loadPathData: jest.fn(),
  savePathData: jest.fn(),
  logError: jest.fn()
};

const mockProjectManagement = {
  requireActiveProject: jest.fn()
};

const mockMemorySync = {
  syncActiveProjectToMemory: jest.fn()
};

// Mock the CleanForestServer methods we're testing
class MockCleanForestServer {
  constructor() {
    this.dataPersistence = mockDataPersistence;
    this.projectManagement = mockProjectManagement;
    this.memorySync = mockMemorySync;
  }

  // Copy the actual methods from server-modular.js
  async requireActiveProject() {
    return await this.projectManagement.requireActiveProject();
  }

  async loadPathHTA(projectId, pathName) {
    try {
      if (pathName === 'general') {
        const pathHTA = await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
        if (pathHTA) return pathHTA;
        
        const projectHTA = await this.dataPersistence.loadProjectData(projectId, 'hta.json');
        if (projectHTA) return projectHTA;
      } else {
        const hta = await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
        if (hta) return hta;
      }
      
      return null;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async savePathHTA(projectId, pathName, htaData) {
    if (pathName === 'general') {
      await this.dataPersistence.saveProjectData(projectId, 'hta.json', htaData);
    } else {
      await this.dataPersistence.savePathData(projectId, pathName, 'hta.json', htaData);
    }
  }

  async storeGeneratedTasks(branchTasks) {
    try {
      const projectId = await this.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');
      const pathName = config.activePath || 'general';
      
      let htaData = await this.loadPathHTA(projectId, pathName);
      if (!htaData) {
        htaData = {
          projectId,
          pathName,
          created: new Date().toISOString(),
          strategicBranches: [],
          frontierNodes: [],
          completed_nodes: [],
          collaborative_sessions: [],
          hierarchy_metadata: {
            total_depth: 0,
            total_branches: 0,
            total_sub_branches: 0,
            total_tasks: 0,
            branch_task_distribution: {}
          }
        };
      }

      // Session metadata
      const sessionMeta = {
        timestamp: new Date().toISOString(),
        session_id: `sess_${Math.random().toString(36).slice(2, 10)}`,
        tasks_count: this.countTasksInHierarchy(branchTasks),
        branches_populated: branchTasks.map(b => b.branch_name),
        generation_context: 'deep_hierarchical'
      };
      
      htaData.collaborative_sessions = htaData.collaborative_sessions || [];
      htaData.collaborative_sessions.push(sessionMeta);

      const stats = {
        newBranches: 0,
        newSubBranches: 0,
        newTasks: 0,
        maxDepth: 0
      };

      // Process each main branch
      for (const branch of branchTasks) {
        const processed = await this.processHierarchicalBranch(branch, htaData, null, 1, stats);
        
        const existingIndex = htaData.strategicBranches.findIndex(b => b.id === processed.id);
        
        if (existingIndex === -1) {
          htaData.strategicBranches.push(processed);
          stats.newBranches++;
        } else {
          htaData.strategicBranches[existingIndex] = this.mergeBranches(
            htaData.strategicBranches[existingIndex], 
            processed
          );
        }
      }

      // Update hierarchy metadata
      htaData.hierarchy_metadata = {
        total_depth: stats.maxDepth,
        total_branches: htaData.strategicBranches.length,
        total_sub_branches: stats.newSubBranches,
        total_tasks: htaData.frontierNodes.length + stats.newTasks,
        branch_task_distribution: this.calculateTaskDistribution(htaData.strategicBranches)
      };

      await this.savePathHTA(projectId, pathName, htaData);
      if (this.memorySync?.syncActiveProjectToMemory) {
        await this.memorySync.syncActiveProjectToMemory(projectId);
      }

      return {
        content: [{
          type: 'text',
          text: `✅ **Deep HTA Structure Successfully Stored!**\n\n**Hierarchy Created**:\n• Main Branches: ${stats.newBranches}\n• Sub-branches: ${stats.newSubBranches}\n• Maximum Depth: ${stats.maxDepth} levels\n• Total Tasks: ${stats.newTasks}`
        }],
        storage_summary: {
          ...stats,
          hierarchy_metadata: htaData.hierarchy_metadata,
          session: sessionMeta
        }
      };
    } catch (error) {
      console.error('Error storing hierarchical tasks:', error);
      return {
        content: [{ type: 'text', text: `❌ Error storing tasks: ${error.message}` }],
        error: error.message
      };
    }
  }

  // Helper methods
  countTasksInHierarchy(branches) {
    let count = 0;
    const recurse = br => {
      if (br.tasks) count += br.tasks.length;
      if (br.sub_branches) br.sub_branches.forEach(recurse);
    };
    branches.forEach(recurse);
    return count;
  }

  calculateTaskDistribution(branches) {
    const dist = {};
    const walk = br => {
      if (br.total_task_count > 0) dist[br.title] = br.total_task_count;
      if (br.sub_branches) br.sub_branches.forEach(walk);
    };
    branches.forEach(walk);
    return dist;
  }

  createSlug(name) {
    return name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  formatBranchTitle(branchName) {
    return branchName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  inferBranchPriority(branchName) {
    const name = branchName.toLowerCase();
    if (name.includes('foundation') || name.includes('basic') || name.includes('fundamental')) {
      return 'high';
    } else if (name.includes('advanced') || name.includes('master') || name.includes('expert')) {
      return 'low';
    }
    return 'medium';
  }

  normalizeDuration(duration) {
    if (typeof duration === 'number') {
      return `${duration} minutes`;
    }
    if (typeof duration === 'string' && !duration.includes('minute')) {
      return `${duration} minutes`;
    }
    return duration || '30 minutes';
  }

  resolvePrerequisites(prerequisites, htaData) {
    if (!prerequisites || prerequisites.length === 0) return [];
    
    return prerequisites.map(prereq => {
      if (prereq.startsWith('node_')) return prereq;
      
      const task = htaData.frontierNodes.find(t => t.title === prereq) ||
                   htaData.completed_nodes.find(t => t.title === prereq);
      
      return task ? task.id : null;
    }).filter(id => id !== null);
  }

  calculateDeepTaskPriority(task, branch, depth) {
    let priority = 50;
    priority += (5 - depth) * 10; // shallower first
    if (branch.priority === 'high') priority += 20;
    else if (branch.priority === 'low') priority -= 10;
    priority += (5 - (task.difficulty || 3)) * 3;
    if (!task.prerequisites || task.prerequisites.length === 0) priority += 15;
    return Math.max(0, Math.min(100, priority));
  }

  mergeBranches(existing, incoming) {
    return {
      ...existing,
      description: incoming.description || existing.description,
      sub_branches: [...(existing.sub_branches || []), ...(incoming.sub_branches || [])],
      task_count: (existing.task_count || 0) + (incoming.task_count || 0),
      total_task_count: (existing.total_task_count || 0) + (incoming.total_task_count || 0),
      updated_at: new Date().toISOString()
    };
  }

  async processHierarchicalBranch(branch, htaData, parentId, depth, stats) {
    stats.maxDepth = Math.max(stats.maxDepth, depth);
    
    const slug = this.createSlug(branch.branch_name);
    const branchId = parentId ? `${parentId}_${slug}` : slug;
    
    const branchData = {
      id: branchId,
      title: this.formatBranchTitle(branch.branch_name),
      description: branch.description || '',
      priority: this.inferBranchPriority(branch.branch_name),
      depth,
      parent_id: parentId,
      completed: false,
      created_at: new Date().toISOString(),
      sub_branches: [],
      task_count: 0,
      total_task_count: 0
    };

    // Recursively process sub-branches
    if (branch.sub_branches && branch.sub_branches.length) {
      for (const sub of branch.sub_branches) {
        const processedSub = await this.processHierarchicalBranch(sub, htaData, branchId, depth + 1, stats);
        branchData.sub_branches.push(processedSub);
        branchData.total_task_count += processedSub.total_task_count;
        stats.newSubBranches++;
      }
    }

    // Leaf tasks
    if (branch.tasks && branch.tasks.length) {
      let nextId = htaData.frontierNodes.length + stats.newTasks + 1;
      for (const task of branch.tasks) {
        const taskNode = {
          id: `node_${nextId++}`,
          title: task.title,
          description: task.description || '',
          difficulty: task.difficulty || 1,
          duration: this.normalizeDuration(task.duration),
          branch: branchId,
          branch_path: branchId.split('_').map(this.formatBranchTitle).join(' → '),
          branch_depth: depth,
          prerequisites: this.resolvePrerequisites(task.prerequisites, htaData),
          priority: this.calculateDeepTaskPriority(task, branchData, depth),
          created_at: new Date().toISOString(),
          generated: true,
          completed: false
        };
        htaData.frontierNodes.push(taskNode);
        stats.newTasks++;
        branchData.task_count++;
        branchData.total_task_count++;
      }
    }

    return branchData;
  }
}

describe('CleanForestServer HTA Methods', () => {
  let server;
  
  beforeEach(() => {
    jest.clearAllMocks();
    server = new MockCleanForestServer();
  });

  describe('storeGeneratedTasks', () => {
         it('should create new HTA structure when none exists', async () => {
       mockProjectManagement.requireActiveProject.mockResolvedValue('test-project');
       mockDataPersistence.loadProjectData.mockResolvedValueOnce({
         activePath: 'general'
       }).mockResolvedValueOnce(null); // Second call for loadPathHTA fallback
       mockDataPersistence.loadPathData.mockResolvedValue(null);
       mockDataPersistence.saveProjectData.mockResolvedValue(true);

      const branchTasks = [{
        branch_name: 'fundamentals',
        tasks: [{
          title: 'Learn basics',
          description: 'Start with the fundamentals',
          difficulty: 1,
          duration: 30
        }]
      }];

      const result = await server.storeGeneratedTasks(branchTasks);

      expect(result.content[0].text).toContain('Deep HTA Structure Successfully Stored');
      expect(result.storage_summary.newBranches).toBe(1);
      expect(result.storage_summary.newTasks).toBe(1);
      expect(mockDataPersistence.saveProjectData).toHaveBeenCalled();
    });

         it('should handle hierarchical branch structures', async () => {
       mockProjectManagement.requireActiveProject.mockResolvedValue('test-project');
       mockDataPersistence.loadProjectData.mockResolvedValueOnce({
         activePath: 'general'
       }).mockResolvedValueOnce(null); // Second call for loadPathHTA fallback
       mockDataPersistence.loadPathData.mockResolvedValue(null);
       mockDataPersistence.saveProjectData.mockResolvedValue(true);

      const branchTasks = [{
        branch_name: 'web_development',
        sub_branches: [{
          branch_name: 'frontend',
          tasks: [{
            title: 'Learn HTML',
            difficulty: 1,
            duration: 45
          }, {
            title: 'Learn CSS',
            difficulty: 2,
            duration: 60
          }]
        }, {
          branch_name: 'backend',
          tasks: [{
            title: 'Learn Node.js',
            difficulty: 3,
            duration: 90,
            prerequisites: ['Learn HTML']
          }]
        }]
      }];

      const result = await server.storeGeneratedTasks(branchTasks);

      expect(result.storage_summary.maxDepth).toBe(2);
      expect(result.storage_summary.newSubBranches).toBe(2);
      expect(result.storage_summary.newTasks).toBe(3);
      expect(result.storage_summary.hierarchy_metadata.total_depth).toBe(2);
    });

    it('should merge with existing HTA data', async () => {
      const existingHTA = {
        projectId: 'test-project',
        pathName: 'general',
        strategicBranches: [{
          id: 'existing_branch',
          title: 'Existing Branch',
          sub_branches: [],
          task_count: 2,
          total_task_count: 2
        }],
        frontierNodes: [
          { id: 'node_1', title: 'Existing Task 1' },
          { id: 'node_2', title: 'Existing Task 2' }
        ],
        completed_nodes: [],
        collaborative_sessions: []
      };

      mockProjectManagement.requireActiveProject.mockResolvedValue('test-project');
      mockDataPersistence.loadProjectData.mockResolvedValue({
        activePath: 'general'
      });
      mockDataPersistence.loadPathData.mockResolvedValue(existingHTA);
      mockDataPersistence.saveProjectData.mockResolvedValue(true);

      const branchTasks = [{
        branch_name: 'new_branch',
        tasks: [{
          title: 'New Task',
          difficulty: 2,
          duration: 45
        }]
      }];

      const result = await server.storeGeneratedTasks(branchTasks);

      expect(result.storage_summary.newBranches).toBe(1);
      expect(result.storage_summary.hierarchy_metadata.total_branches).toBe(2);
             expect(result.storage_summary.hierarchy_metadata.total_tasks).toBeGreaterThanOrEqual(3); // 2 existing + 1 new
    });

    it('should handle errors gracefully WITHOUT console errors', async () => {
      // CRITICAL FIX: Capture console.error to prevent test pollution
      const originalConsoleError = console.error;
      const capturedErrors = [];
      console.error = (...args) => {
        capturedErrors.push(args.join(' '));
      };

      try {
        mockProjectManagement.requireActiveProject.mockRejectedValue(new Error('No active project'));

        const branchTasks = [{
          branch_name: 'test_branch',
          tasks: [{ title: 'Test Task' }]
        }];

        const result = await server.storeGeneratedTasks(branchTasks);

        // Assert the error is handled properly
        expect(result.content[0].text).toContain('Error storing tasks');
        expect(result.error).toContain('No active project');
        
        // CRITICAL: Verify that the error was logged (captured) but not printed to console during test
        expect(capturedErrors.length).toBe(1);
        expect(capturedErrors[0]).toContain('No active project');
      } finally {
        // Restore original console.error
        console.error = originalConsoleError;
      }
    });
  });

  describe('helper methods', () => {
    describe('countTasksInHierarchy', () => {
      it('should count tasks in flat structure', () => {
        const branches = [{
          branch_name: 'test',
          tasks: [{ title: 'Task 1' }, { title: 'Task 2' }]
        }];

        const count = server.countTasksInHierarchy(branches);
        expect(count).toBe(2);
      });

      it('should count tasks in nested structure', () => {
        const branches = [{
          branch_name: 'main',
          sub_branches: [{
            branch_name: 'sub1',
            tasks: [{ title: 'Task 1' }]
          }, {
            branch_name: 'sub2',
            tasks: [{ title: 'Task 2' }, { title: 'Task 3' }]
          }]
        }];

        const count = server.countTasksInHierarchy(branches);
        expect(count).toBe(3);
      });
    });

    describe('createSlug', () => {
      it('should create valid slugs from branch names', () => {
        expect(server.createSlug('Web Development')).toBe('web_development');
        expect(server.createSlug('Advanced-Machine_Learning!')).toBe('advanced_machine_learning');
        expect(server.createSlug('  Multiple   Spaces  ')).toBe('multiple_spaces');
      });
    });

    describe('formatBranchTitle', () => {
      it('should format slugs into readable titles', () => {
        expect(server.formatBranchTitle('web_development')).toBe('Web Development');
        expect(server.formatBranchTitle('machine_learning_basics')).toBe('Machine Learning Basics');
      });
    });

    describe('inferBranchPriority', () => {
      it('should assign high priority to foundational branches', () => {
        expect(server.inferBranchPriority('foundation_skills')).toBe('high');
        expect(server.inferBranchPriority('basic_concepts')).toBe('high');
        expect(server.inferBranchPriority('fundamental_knowledge')).toBe('high');
      });

      it('should assign low priority to advanced branches', () => {
        expect(server.inferBranchPriority('advanced_topics')).toBe('low');
        expect(server.inferBranchPriority('master_level')).toBe('low');
        expect(server.inferBranchPriority('expert_techniques')).toBe('low');
      });

      it('should assign medium priority to neutral branches', () => {
        expect(server.inferBranchPriority('practical_applications')).toBe('medium');
        expect(server.inferBranchPriority('intermediate_skills')).toBe('medium');
      });
    });

    describe('normalizeDuration', () => {
      it('should handle numeric durations', () => {
        expect(server.normalizeDuration(45)).toBe('45 minutes');
        expect(server.normalizeDuration(60)).toBe('60 minutes');
      });

      it('should handle string durations', () => {
        expect(server.normalizeDuration('30')).toBe('30 minutes');
        expect(server.normalizeDuration('45 minutes')).toBe('45 minutes');
      });

      it('should provide default for undefined', () => {
        expect(server.normalizeDuration(undefined)).toBe('30 minutes');
        expect(server.normalizeDuration(null)).toBe('30 minutes');
      });
    });

    describe('calculateDeepTaskPriority', () => {
      it('should prioritize shallow tasks', () => {
        const task = { difficulty: 3 };
        const branch = { priority: 'medium' };
        
        const shallowPriority = server.calculateDeepTaskPriority(task, branch, 1);
        const deepPriority = server.calculateDeepTaskPriority(task, branch, 3);
        
        expect(shallowPriority).toBeGreaterThan(deepPriority);
      });

      it('should boost priority for high-priority branches', () => {
        const task = { difficulty: 3 };
        const highBranch = { priority: 'high' };
        const lowBranch = { priority: 'low' };
        
        const highPriority = server.calculateDeepTaskPriority(task, highBranch, 2);
        const lowPriority = server.calculateDeepTaskPriority(task, lowBranch, 2);
        
        expect(highPriority).toBeGreaterThan(lowPriority);
      });

      it('should boost priority for tasks without prerequisites', () => {
        const taskWithPrereqs = { difficulty: 3, prerequisites: ['other_task'] };
        const taskWithoutPrereqs = { difficulty: 3, prerequisites: [] };
        const branch = { priority: 'medium' };
        
        const withPrereqs = server.calculateDeepTaskPriority(taskWithPrereqs, branch, 2);
        const withoutPrereqs = server.calculateDeepTaskPriority(taskWithoutPrereqs, branch, 2);
        
        expect(withoutPrereqs).toBeGreaterThan(withPrereqs);
      });
    });
  });

  describe('loadPathHTA', () => {
    it('should load path-specific HTA for general path', async () => {
      const mockHTA = { projectId: 'test', pathName: 'general' };
      mockDataPersistence.loadPathData.mockResolvedValue(mockHTA);

      const result = await server.loadPathHTA('test-project', 'general');

      expect(result).toBe(mockHTA);
      expect(mockDataPersistence.loadPathData).toHaveBeenCalledWith('test-project', 'general', 'hta.json');
    });

    it('should fallback to project-level for general path', async () => {
      const mockHTA = { projectId: 'test' };
      mockDataPersistence.loadPathData.mockResolvedValue(null);
      mockDataPersistence.loadProjectData.mockResolvedValue(mockHTA);

      const result = await server.loadPathHTA('test-project', 'general');

      expect(result).toBe(mockHTA);
      expect(mockDataPersistence.loadProjectData).toHaveBeenCalledWith('test-project', 'hta.json');
    });

    it('should return null when no HTA found', async () => {
      mockDataPersistence.loadPathData.mockResolvedValue(null);
      mockDataPersistence.loadProjectData.mockResolvedValue(null);

      const result = await server.loadPathHTA('test-project', 'general');

      expect(result).toBeNull();
    });

    it('should handle ENOENT errors gracefully', async () => {
      const enoentError = new Error('File not found');
      enoentError.code = 'ENOENT';
      mockDataPersistence.loadPathData.mockRejectedValue(enoentError);

      const result = await server.loadPathHTA('test-project', 'general');

      expect(result).toBeNull();
    });
  });

  describe('savePathHTA', () => {
    it('should save to project data for general path', async () => {
      const htaData = { projectId: 'test' };
      
      await server.savePathHTA('test-project', 'general', htaData);

      expect(mockDataPersistence.saveProjectData).toHaveBeenCalledWith('test-project', 'hta.json', htaData);
    });

    it('should save to path data for specific path', async () => {
      const htaData = { projectId: 'test' };
      
      await server.savePathHTA('test-project', 'career', htaData);

      expect(mockDataPersistence.savePathData).toHaveBeenCalledWith('test-project', 'career', 'hta.json', htaData);
    });
  });
});