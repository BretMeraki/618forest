/**
 * HTA Status Module
 * Handles HTA tree status reporting and metadata
 */

export class HtaStatus {
  constructor(dataPersistence, projectManagement) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
  }

  async getHTAStatus() {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      const activePath = config.activePath || 'general';
      const htaData = await this.loadPathHTA(projectId, activePath);

      if (!htaData) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ No HTA tree found for "${activePath}" path. Use \`build_hta_tree\` first.`,
            },
          ],
        };
      }

      const statusReport = this.generateStatusReport(htaData, activePath);

      return {
        content: [
          {
            type: 'text',
            text: statusReport,
          },
        ],
        hta_status: {
          path: activePath,
          strategic_branches: htaData.strategicBranches || [],
          frontier_nodes: htaData.frontierNodes || [],
          progress: this.calculateProgress(htaData),
          last_updated: htaData.lastUpdated,
        },
      };
    } catch (error) {
      await this.dataPersistence.logError('getHTAStatus', error);
      return {
        content: [
          {
            type: 'text',
            text: `Error getting HTA status: ${error.message}`,
          },
        ],
      };
    }
  }

  async loadPathHTA(projectId, pathName) {
    if (pathName === 'general') {
      return await this.dataPersistence.loadProjectData(projectId, 'hta.json');
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
    }
  }

  generateStatusReport(htaData, pathName) {
    const branches = htaData.strategicBranches || [];
    const nodes = htaData.frontierNodes || [];
    const progress = this.calculateProgress(htaData);

    let report = `🌳 **HTA Tree Status - ${pathName} Path**\n\n`;
    report += `**Goal**: ${htaData.goal || 'Not specified'}\n`;
    report += `**Progress**: ${progress.percentage}% (${progress.completed}/${progress.total} tasks)\n`;
    report += `**Learning Style**: ${htaData.learningStyle || 'mixed'}\n\n`;

    // Strategic Branches Status
    report += `📊 **Strategic Branches** (${branches.length}):\n`;
    for (const branch of branches) {
      const branchNodes = nodes.filter(n => n.branch === branch.id);
      const completedBranchNodes = branchNodes.filter(n => n.completed);
      const branchProgress =
        branchNodes.length > 0
          ? Math.round((completedBranchNodes.length / branchNodes.length) * 100)
          : 0;

      const status = branch.completed ? '✅' : branchProgress > 0 ? '🔄' : '⏳';
      report += `${status} **${branch.title}** - ${branchProgress}% (${completedBranchNodes.length}/${branchNodes.length})\n`;
    }

    // Ready Tasks
    const readyNodes = this.getReadyNodes(nodes);
    report += `\n🎯 **Ready Tasks** (${readyNodes.length}):\n`;

    if (readyNodes.length === 0) {
      report += '• No tasks ready - check prerequisites or build new tasks\n';
    } else {
      for (const node of readyNodes.slice(0, 5)) {
        // Show top 5
        const difficultyStars = '⭐'.repeat(node.difficulty || 1);
        report += `• **${node.title}** ${difficultyStars} (${node.duration || '30 min'})\n`;
      }

      if (readyNodes.length > 5) {
        report += `• ... and ${readyNodes.length - 5} more tasks\n`;
      }
    }

    // Next Actions
    report += '\n🚀 **Next Actions**:\n';
    if (readyNodes.length > 0) {
      report += '• Use `get_next_task` to get the optimal next task\n';
      report += '• Use `generate_daily_schedule` for comprehensive planning\n';
    } else {
      report += '• Use `evolve_strategy` to generate new tasks\n';
      report += '• Use `build_hta_tree` to rebuild the learning path\n';
    }

    return report;
  }

  calculateProgress(htaData) {
    const nodes = htaData.frontierNodes || [];
    const completed = nodes.filter(n => n.completed).length;
    const total = nodes.length;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      completed,
      total,
      percentage,
    };
  }

  getReadyNodes(nodes) {
    const completedNodeIds = nodes.filter(n => n.completed).map(n => n.id);

    return nodes.filter(node => {
      if (node.completed) {
        return false;
      }

      // Check if all prerequisites are met
      if (node.prerequisites && node.prerequisites.length > 0) {
        return node.prerequisites.every(
          prereq =>
            completedNodeIds.includes(prereq) || nodes.some(n => n.title === prereq && n.completed)
        );
      }

      return true; // No prerequisites, so it's ready
    });
  }

  getBranchProgress(branchId, nodes) {
    const branchNodes = nodes.filter(n => n.branch === branchId);
    const completedNodes = branchNodes.filter(n => n.completed);

    return {
      total: branchNodes.length,
      completed: completedNodes.length,
      percentage:
        branchNodes.length > 0 ? Math.round((completedNodes.length / branchNodes.length) * 100) : 0,
    };
  }

  getNodesByDifficulty(nodes) {
    const byDifficulty = {};

    for (const node of nodes) {
      const difficulty = node.difficulty || 1;
      if (!byDifficulty[difficulty]) {
        byDifficulty[difficulty] = [];
      }
      byDifficulty[difficulty].push(node);
    }

    return byDifficulty;
  }

  getCompletionVelocity(htaData, days = 7) {
    // This would analyze completion timestamps to calculate velocity
    // For now, return placeholder data
    const nodes = htaData.frontierNodes || [];
    const recentCompletions = nodes.filter(
      n =>
        n.completed &&
        n.completedAt &&
        new Date(n.completedAt) > new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    );

    return {
      completionsInPeriod: recentCompletions.length,
      averagePerDay: recentCompletions.length / days,
      estimatedDaysToComplete:
        nodes.filter(n => !n.completed).length / Math.max(recentCompletions.length / days, 0.1),
    };
  }
}
