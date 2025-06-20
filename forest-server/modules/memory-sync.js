/**
 * Memory Sync Module
 * Handles Memory MCP integration and state synchronization
 */

export class MemorySync {
  constructor(dataPersistence) {
    this.dataPersistence = dataPersistence;
  }

  async syncActiveProjectToMemory(projectId) {
    try {
      const config = (await this.dataPersistence.loadProjectData(projectId, 'config.json')) || {};
      const htaData = (await this.dataPersistence.loadProjectData(projectId, 'hta.json')) || {};
      const learningHistory = (await this.dataPersistence.loadProjectData(
        projectId,
        'learning_history.json'
      )) || { completedTopics: [], insights: [] };

      const today = new Date().toISOString().split('T')[0];
      const todaySchedule =
        (await this.dataPersistence.loadProjectData(projectId, `day_${today}.json`)) || {};

      const collaborativeSessions = htaData.collaborative_sessions || [];
      const latestSession = collaborativeSessions[collaborativeSessions.length - 1];

      // Prepare comprehensive context for Memory MCP
      const memoryContext = {
        project_id: projectId,
        goal: config.goal || 'Unknown goal',
        current_focus: config.activePath || 'general',
        progress_summary: this.generateProgressSummary(learningHistory, htaData),
        recent_insights: learningHistory.insights?.slice(-5) || [],
        completion_patterns: this.analyzeCompletionPatterns(learningHistory),
        energy_trends: this.analyzeEnergyTrends(learningHistory),
        next_logical_areas: this.identifyNextLogicalAreas(htaData, learningHistory),
        collaborative_generation:
          collaborativeSessions.length > 0
            ? {
                last_session: latestSession?.timestamp || null,
                total_sessions: collaborativeSessions.length,
                recent_branches: latestSession?.branches_populated || [],
              }
            : undefined,
        today_progress: todaySchedule.blocks
          ? `${todaySchedule.blocks.filter(b => b.completed).length}/${todaySchedule.blocks.length} blocks completed`
          : 'No schedule today',
        suggested_memory_queries: this.generateMemoryQueries(config, learningHistory),
        sync_timestamp: new Date().toISOString(),
      };

      return memoryContext;
    } catch (error) {
      await this.dataPersistence.logError('syncActiveProjectToMemory', error, { projectId });
      return {
        project_id: projectId,
        error: 'Failed to sync project data',
        sync_timestamp: new Date().toISOString(),
      };
    }
  }

  async syncForestMemory() {
    try {
      const globalData = (await this.dataPersistence.loadGlobalData('config.json')) || {};
      const activeProjectId = globalData.activeProject;

      if (!activeProjectId) {
        return {
          content: [
            {
              type: 'text',
              text: 'No active project to sync to memory. Create or switch to a project first.',
            },
          ],
        };
      }

      const memoryData = await this.syncActiveProjectToMemory(activeProjectId);

      return {
        content: [
          {
            type: 'text',
            text:
              `Forest state synced to memory for project: ${activeProjectId}\n\n` +
                '📊 Memory Context Summary:\n' +
                `• Goal: ${memoryData.goal}\n` +
                `• Current Focus: ${memoryData.current_focus}\n` +
                `• Progress: ${memoryData.progress_summary}\n` +
                `• Today: ${memoryData.today_progress}\n\n` +
                `🔍 Suggested Memory Queries:\n${memoryData.suggested_memory_queries
                  ?.map(q => `• ${q}`)
                  .join('\n')}` || 'None available',
          },
        ],
        forest_memory_sync: memoryData,
      };
    } catch (error) {
      await this.dataPersistence.logError('syncForestMemory', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error syncing to memory: ${error.message}`,
          },
        ],
      };
    }
  }

  generateProgressSummary(learningHistory, htaData) {
    const completedCount = learningHistory.completedTopics?.length || 0;
    const totalBranches = htaData.strategicBranches?.length || 0;
    const completedBranches = htaData.strategicBranches?.filter(b => b.completed)?.length || 0;

    return `${completedCount} topics completed, ${completedBranches}/${totalBranches} strategic branches finished`;
  }

  analyzeCompletionPatterns(learningHistory) {
    const completions = learningHistory.completedTopics || [];
    if (completions.length < 3) {
      return 'Insufficient data for pattern analysis';
    }

    const recentCompletions = completions.slice(-10);
    const avgDifficulty =
      recentCompletions.reduce((sum, c) => sum + (c.difficulty || 3), 0) / recentCompletions.length;
    const breakthroughRate =
      recentCompletions.filter(c => c.breakthrough).length / recentCompletions.length;

    return `Avg difficulty: ${avgDifficulty.toFixed(1)}/5, Breakthrough rate: ${(breakthroughRate * 100).toFixed(0)}%`;
  }

  analyzeEnergyTrends(learningHistory) {
    const completions = learningHistory.completedTopics || [];
    if (completions.length < 5) {
      return 'Insufficient data for energy analysis';
    }

    const recentEnergy = completions.slice(-10).map(c => c.energyAfter || 3);
    const avgEnergy = recentEnergy.reduce((sum, e) => sum + e, 0) / recentEnergy.length;
    const trend =
      recentEnergy.length > 1
        ? recentEnergy[recentEnergy.length - 1] > recentEnergy[0]
          ? 'increasing'
          : 'stable'
        : 'stable';

    return `Recent avg: ${avgEnergy.toFixed(1)}/5, Trend: ${trend}`;
  }

  identifyNextLogicalAreas(htaData, learningHistory) {
    const completedTopics = learningHistory.completedTopics?.map(c => c.topic) || [];
    const frontierNodes = htaData.frontierNodes || [];

    // Find nodes that are ready (prerequisites met) but not completed
    const readyNodes = frontierNodes.filter(node => {
      const prereqsMet =
        !node.prerequisites || node.prerequisites.every(prereq => completedTopics.includes(prereq));
      const notCompleted = !completedTopics.includes(node.title);
      return prereqsMet && notCompleted;
    });

    return readyNodes.slice(0, 3).map(node => node.title) || ['No specific areas identified'];
  }

  generateMemoryQueries(config, learningHistory) {
    const queries = [];
    const goal = config.goal || '';
    const recentTopics = learningHistory.completedTopics?.slice(-3).map(c => c.topic) || [];

    if (goal) {
      queries.push(`What have I learned recently about ${goal}?`);
      queries.push(`What questions or challenges have emerged in my ${goal} journey?`);
    }

    if (recentTopics.length > 0) {
      queries.push(`What insights did I gain from ${recentTopics[0]}?`);
    }

    queries.push('What patterns do you notice in my learning progress?');
    queries.push('What should I focus on next based on my recent progress?');

    return queries;
  }
}
