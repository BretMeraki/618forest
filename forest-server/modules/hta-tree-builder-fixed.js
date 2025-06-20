import { DEFAULT_PATHS, FILE_NAMES } from './constants.js';
import { getForestLogger } from './winston-logger.js';

// Module-level logger
const logger = getForestLogger({ module: 'HtaTreeBuilderFixed' });

export class HtaTreeBuilder {
  constructor(dataPersistence, projectManagement, claudeInterface) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.claudeInterface = claudeInterface;
  }

  /**
   * Build a dynamic, AI-driven HTA tree for any goal
   */
  async buildHTATree(pathName, learningStyle = 'mixed', focusAreas = []) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);

      if (!config.goal) {
        throw new Error('Project must have a goal defined to build HTA tree');
      }

      // Generate the collaborative prompt for branch creation
      const branchPrompt = this.generateBranchPrompt(config, learningStyle, focusAreas);

      // Initialize HTA structure
      const htaData = {
        projectId,
        pathName: pathName || 'general',
        created: new Date().toISOString(),
        learningStyle,
        focusAreas,
        goal: config.goal,
        context: config.context || '',
        strategicBranches: [],
        frontierNodes: [],
        completed_nodes: [],
        collaborative_sessions: [],
        generation_context: {
          method: 'collaborative_ai',
          timestamp: new Date().toISOString(),
          goal: config.goal,
          awaiting_generation: true,
        },
      };

      // Save initial structure
      await this.savePathHTA(projectId, pathName || 'general', htaData);

      // Return collaborative generation prompt
      return {
        content: [
          {
            type: 'text',
            text: `🌳 **HTA Tree Framework Created!**\n\nYour goal: **${config.goal}**\n\nThe Forest system needs to understand your specific goal to create the perfect learning structure. Please analyze this goal and create strategic branches:\n\n${branchPrompt}\n\n**Next Steps**:\n1. Copy the branch analysis above\n2. Let Claude analyze your goal and suggest 4-7 strategic branches\n3. Use \`generate_hta_tasks\` to store the branches and initial tasks\n\nYour personalized HTA tree is ready for AI-driven branch generation!`,
          },
        ],
        generation_prompt: branchPrompt,
        requires_branch_generation: true,
      };
    } catch (error) {
      logger.error('Error building HTA tree', { message: error.message, stack: error.stack });
      return {
        content: [
          {
            type: 'text',
            text: `❌ Error building HTA tree: ${error.message}`,
          },
        ],
        error: error.message,
      };
    }
  }

  /**
   * Generate the prompt for creating strategic branches
   */
  generateBranchPrompt(config, learningStyle, focusAreas) {
    return `Create a Hierarchical Task Analysis (HTA) for this goal:\n\n**GOAL**: ${config.goal}\n**CONTEXT**: ${config.context || 'Starting from scratch'}\n**CONSTRAINTS**: \n- Focus duration: ${config.life_structure_preferences?.focus_duration || '25 minutes'}\n- Available time: ${config.life_structure_preferences?.wake_time || '7am'} to ${config.life_structure_preferences?.sleep_time || '11pm'}\n**LEARNING STYLE**: ${learningStyle}\n**FOCUS AREAS**: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'Comprehensive approach'}\n\nAnalyze this goal and create 4-7 strategic branches that form a complete path to achievement. Each branch should be:\n- **Specific** to this exact goal (no generic learning categories)\n- **Sequential** where appropriate (foundations before advanced)\n- **Comprehensive** covering all aspects needed for success\n- **Actionable** with clear outcomes\n\nFor each branch, structure it as:\n{\n  \"branch_name\": \"short_identifier\", \n  \"tasks\": [\n    {\n      \"title\": \"Specific actionable task\",\n      \"description\": \"Clear description of what to do\",\n      \"difficulty\": 1-5,\n      \"duration\": minutes (consider the ${config.life_structure_preferences?.focus_duration || '25 minute'} focus constraint),\n      \"prerequisites\": [] // Use task titles from earlier branches/tasks\n    }\n  ]\n}\n\nCreate branches that transform someone from their current state to achieving: \"${config.goal}\"\n\nConsider the user's context and design branches that build momentum through small wins first.`;
  }

  /**
   * Get or create HTA for a path
   */
  async loadPathHTA(projectId, pathName) {
    try {
      if (pathName === DEFAULT_PATHS.GENERAL) {
        // Try path-specific first, then project-level
        const pathHTA = await this.dataPersistence.loadPathData(
          projectId,
          pathName,
          FILE_NAMES.HTA
        );
        if (pathHTA) return pathHTA;

        const projectHTA = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.HTA);
        if (projectHTA) return projectHTA;
      } else {
        const hta = await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.HTA);
        if (hta) return hta;
      }

      // Return null if no HTA exists
      return null;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Save HTA for a path
   */
  async savePathHTA(projectId, pathName, htaData) {
    if (pathName === DEFAULT_PATHS.GENERAL) {
      await this.dataPersistence.saveProjectData(projectId, FILE_NAMES.HTA, htaData);
    } else {
      await this.dataPersistence.savePathData(projectId, pathName, FILE_NAMES.HTA, htaData);
    }
  }
}
