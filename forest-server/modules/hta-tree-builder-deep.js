// ============================================
// HTA DEEP HIERARCHY SYSTEM
// Supports multi-level depth based on goal complexity
// ============================================

import { DEFAULT_PATHS, FILE_NAMES } from './constants.js';
import { getForestLogger } from './winston-logger.js';

// Module-level logger
const logger = getForestLogger({ module: 'HtaTreeBuilderDeep' });

export class HtaTreeBuilder {
  constructor(dataPersistence, projectManagement, claudeInterface) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.claudeInterface = claudeInterface;
  }

  /**
   * Build a deep, complexity-aware HTA tree
   */
  async buildHTATree(pathName, learningStyle = 'mixed', focusAreas = []) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);
      
      if (!config.goal) {
        throw new Error('Project must have a goal defined to build HTA tree');
      }

      // Analyze goal complexity to determine tree depth
      const complexityAnalysis = this.analyzeGoalComplexity(config.goal, config.context);
      
      // Generate the collaborative prompt for deep branch creation
      const branchPrompt = this.generateDeepBranchPrompt(config, learningStyle, focusAreas, complexityAnalysis);
      
      // Initialize HTA structure with hierarchy support
      const htaData = {
        projectId,
        pathName: pathName || 'general',
        created: new Date().toISOString(),
        learningStyle,
        focusAreas,
        goal: config.goal,
        context: config.context || '',
        complexity: complexityAnalysis,
        strategicBranches: [],
        frontierNodes: [],
        completed_nodes: [],
        collaborative_sessions: [],
        hierarchy_metadata: {
          total_depth: complexityAnalysis.recommended_depth,
          total_branches: 0,
          total_sub_branches: 0,
          total_tasks: 0,
          branch_task_distribution: {}
        },
        generation_context: {
          method: 'deep_hierarchical_ai',
          timestamp: new Date().toISOString(),
          goal: config.goal,
          complexity_score: complexityAnalysis.score,
          awaiting_generation: true
        }
      };

      // Save initial structure
      await this.savePathHTA(projectId, pathName || 'general', htaData);

      return {
        content: [{
          type: 'text',
          text: `🌳 **Deep HTA Tree Framework Created!**

**Your Goal**: ${config.goal}

**Complexity Analysis**:
• Complexity Score: ${complexityAnalysis.score}/10
• Recommended Depth: ${complexityAnalysis.recommended_depth} levels
• Estimated Total Tasks: ${complexityAnalysis.estimated_tasks}
• Time to Mastery: ${complexityAnalysis.time_estimate}

**Tree Structure**:
• Main Branches: ${complexityAnalysis.main_branches}
• Sub-branches per Branch: ${complexityAnalysis.sub_branches_per_main}
• Tasks per Leaf: ${complexityAnalysis.tasks_per_leaf}

The Forest system will create a ${complexityAnalysis.recommended_depth}-level deep hierarchy tailored to your goal's complexity.

**Prompt for Branch Generation**:

${branchPrompt}

**Next Steps**:
1. Copy the analysis prompt above
2. Let Claude create your deep hierarchical structure
3. Use \`generate_hta_tasks\` to store the complete tree

Your goal deserves the depth and detail this system will provide!`
        }],
        generation_prompt: branchPrompt,
        complexity_analysis: complexityAnalysis,
        requires_branch_generation: true
      };
    } catch (error) {
      logger.error('Error building HTA tree', { message: error.message, stack: error.stack });
      return {
        content: [{
          type: 'text',
          text: `❌ Error building HTA tree: ${error.message}`
        }],
        error: error.message
      };
    }
  }

  /**
   * Analyze goal complexity to determine appropriate tree depth
   */
  analyzeGoalComplexity(goal, context = '') {
    const goalLower = goal.toLowerCase();
    const combinedText = `${goal} ${context}`.toLowerCase();
    
    let complexityScore = 5; // Base complexity
    
    // Adjust based on goal indicators
    if (combinedText.includes('professional') || combinedText.includes('expert')) complexityScore += 2;
    if (combinedText.includes('master') || combinedText.includes('advanced')) complexityScore += 2;
    if (combinedText.includes('career') || combinedText.includes('business')) complexityScore += 1;
    if (combinedText.includes('from scratch') || combinedText.includes('beginner')) complexityScore += 1;
    if (combinedText.includes('certification') || combinedText.includes('degree')) complexityScore += 2;
    if (combinedText.includes('simple') || combinedText.includes('basic')) complexityScore -= 2;
    if (combinedText.includes('hobby') || combinedText.includes('fun')) complexityScore -= 1;
    
    // Count distinct skill domains mentioned
    const skillDomains = ['technical', 'creative', 'business', 'social', 'physical', 'mental', 'financial'];
    const domainsPresent = skillDomains.filter(domain => combinedText.includes(domain)).length;
    complexityScore += Math.min(domainsPresent, 3);
    
    // Normalize score
    complexityScore = Math.max(1, Math.min(10, complexityScore));
    
    // Calculate tree structure based on complexity
    const treeStructure = this.calculateTreeStructure(complexityScore);
    
    return {
      score: complexityScore,
      level: complexityScore <= 3 ? 'simple' : complexityScore <= 6 ? 'moderate' : 'complex',
      ...treeStructure
    };
  }

  /**
   * Calculate tree structure parameters based on complexity
   */
  calculateTreeStructure(complexityScore) {
    // More complex goals get deeper trees with more tasks
    const depth = complexityScore <= 3 ? 2 : complexityScore <= 6 ? 3 : 4;
    const mainBranches = 3 + Math.floor(complexityScore / 2);
    const subBranchesPerMain = complexityScore <= 3 ? 2 : complexityScore <= 6 ? 3 : 4;
    const tasksPerLeaf = 5 + complexityScore;
    
    // Calculate totals
    const totalSubBranches = mainBranches * subBranchesPerMain;
    const totalLeaves = depth === 2 ? totalSubBranches : totalSubBranches * (depth === 3 ? 3 : 4);
    const estimatedTasks = totalLeaves * tasksPerLeaf;
    
    // Time estimate (rough)
    const hoursEstimate = estimatedTasks * 0.75; // 45 min average per task
    const timeEstimate = hoursEstimate < 100 ? `${Math.round(hoursEstimate)} hours` :
                        hoursEstimate < 500 ? `${Math.round(hoursEstimate/40)} weeks` :
                        `${Math.round(hoursEstimate/160)} months`;
    
    return {
      recommended_depth: depth,
      main_branches: mainBranches,
      sub_branches_per_main: subBranchesPerMain,
      tasks_per_leaf: tasksPerLeaf,
      estimated_tasks: estimatedTasks,
      time_estimate: timeEstimate
    };
  }

  /**
   * Generate prompt for deep hierarchical branch creation
   */
  generateDeepBranchPrompt(config, learningStyle, focusAreas, complexity) {
    return `Create a ${complexity.recommended_depth}-level deep Hierarchical Task Analysis (HTA) for this goal:

**GOAL**: ${config.goal}
**CONTEXT**: ${config.context || 'Starting from scratch'}
**COMPLEXITY**: ${complexity.score}/10 (${complexity.level})
**EXPECTED STRUCTURE**:
- ${complexity.main_branches} main branches
- ${complexity.sub_branches_per_main} sub-branches per main branch
- ${complexity.tasks_per_leaf} tasks per terminal node
- Total depth: ${complexity.recommended_depth} levels
- Estimated total tasks: ${complexity.estimated_tasks}

**CONSTRAINTS**: 
- Focus duration: ${config.life_structure_preferences?.focus_duration || '25 minutes'}
- Learning style: ${learningStyle}
- Focus areas: ${focusAreas.length > 0 ? focusAreas.join(', ') : 'Comprehensive'}

Create a hierarchical structure following this format:

{
  "branch_name": "main_branch_identifier",
  "description": "What this major area covers",
  "sub_branches": [
    {
      "branch_name": "sub_branch_identifier",
      "description": "Specific aspect of the main branch",
      ${complexity.recommended_depth > 2 ? `"sub_branches": [
        {
          "branch_name": "sub_sub_branch",
          "description": "Even more specific aspect",
          "tasks": [
            {
              "title": "Specific actionable task",
              "description": "Clear instructions",
              "difficulty": 1-5,
              "duration": 15-45 (consider ${config.life_structure_preferences?.focus_duration || '25 minute'} blocks),
              "prerequisites": ["earlier_task_title"]
            }
          ]
        }
      ]` : `"tasks": [
        {
          "title": "Specific actionable task",
          "description": "Clear instructions",
          "difficulty": 1-5,
          "duration": 15-45,
          "prerequisites": []
        }
      ]`}
    }
  ]
}

For a ${complexity.level} goal like this, create:
1. **Breadth**: ${complexity.main_branches} distinct main branches covering all aspects
2. **Depth**: ${complexity.recommended_depth} levels of hierarchy 
3. **Granularity**: ~${complexity.tasks_per_leaf} specific tasks at each terminal node
4. **Progression**: Clear prerequisite chains from basics to mastery

Remember: This person wants to achieve "${config.goal}". Create a comprehensive roadmap that breaks this down into ${complexity.estimated_tasks}+ manageable tasks across a deep hierarchy.

Make each branch and sub-branch meaningful and specific to this exact goal. No generic categories.`;
  }

  /**
   * Get or create HTA for a path
   */
  async loadPathHTA(projectId, pathName) {
    try {
      if (pathName === DEFAULT_PATHS.GENERAL) {
        // Try path-specific first, then project-level
        const pathHTA = await this.dataPersistence.loadPathData(projectId, pathName, FILE_NAMES.HTA);
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
