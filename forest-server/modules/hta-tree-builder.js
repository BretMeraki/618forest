// ============================================
// HTA DEEP HIERARCHY SYSTEM
// Supports multi-level depth based on goal complexity
// ============================================

import { DEFAULT_PATHS, FILE_NAMES } from './constants.js'; // Assuming constants.js is in the same directory

export class HtaTreeBuilder {
  constructor(dataPersistence, projectManagement, claudeInterface) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.claudeInterface = claudeInterface; // Will be available for future AI interaction logic
  }

  /**
   * Build a deep, complexity-aware HTA tree
   */
  async buildHTATree(pathName, learningStyle = 'mixed', focusAreas = []) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.CONFIG);

      if (!config || !config.goal) { // Added check for config itself
        throw new Error('Project must have a goal defined in config to build HTA tree');
      }

      // Analyze goal complexity to determine tree depth
      const complexityAnalysis = this.analyzeGoalComplexity(config.goal, config.context);

      // Generate the collaborative prompt for deep branch creation
      const branchPrompt = this.generateDeepBranchPrompt(config, learningStyle, focusAreas, complexityAnalysis);

      // Initialize HTA structure with hierarchy support
      const htaData = {
        projectId,
        pathName: pathName || DEFAULT_PATHS.GENERAL, // Use DEFAULT_PATHS
        created: new Date().toISOString(),
        learningStyle,
        focusAreas,
        goal: config.goal,
        context: config.context || '',
        complexity: complexityAnalysis,
        strategicBranches: [],
        frontierNodes: [],
        completed_nodes: [], // Corrected typo from completed_nodes
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
      await this.savePathHTA(projectId, pathName || DEFAULT_PATHS.GENERAL, htaData); // Use DEFAULT_PATHS

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
      console.error('Error building HTA tree:', error);
      // Ensure consistent error object structure
      return {
        content: [{
          type: 'text',
          text: `❌ Error building HTA tree: ${error.message}`
        }],
        error: error.message,
        error_details: error.stack // Added for better debugging
      };
    }
  }

  /**
   * Analyze goal complexity to determine appropriate tree depth
   */
  analyzeGoalComplexity(goal, context = '') {
    if (!goal) {
      // Handle empty goal to prevent errors downstream
      return this.calculateTreeStructure(1); // Default to lowest complexity
    }
    const goalLower = goal.toLowerCase();
    const combinedText = `${goal} ${context || ''}`.toLowerCase(); // Ensure context is not undefined

    let complexityScore = 5; // Base complexity

    // Adjust based on goal indicators
    if (combinedText.includes('professional') || combinedText.includes('expert')) complexityScore += 2;
    if (combinedText.includes('master') || combinedText.includes('advanced')) complexityScore += 2;
    if (combinedText.includes('career') || combinedText.includes('business')) complexityScore += 1;
    // Adjusted: "from scratch" or "beginner" might not always mean higher overall complexity,
    // but rather a different starting point. Context is key.
    if (combinedText.includes('from scratch') || combinedText.includes('beginner')) complexityScore += 0; // Neutral impact on complexity score itself
    if (combinedText.includes('certification') || combinedText.includes('degree')) complexityScore += 2;
    if (combinedText.includes('simple') || combinedText.includes('basic')) complexityScore -= 2;
    if (combinedText.includes('hobby') || combinedText.includes('fun')) complexityScore -= 1;

    // Count distinct skill domains mentioned
    const skillDomains = ['technical', 'creative', 'business', 'social', 'physical', 'mental', 'financial', 'academic', 'language']; // Expanded list
    const domainsPresent = skillDomains.filter(domain => combinedText.includes(domain)).length;
    complexityScore += Math.min(domainsPresent, 3); // Cap contribution from domain count

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
   * Production-ready: Consider making these factors configurable.
   */
  calculateTreeStructure(complexityScore) {
    let depth, mainBranches, subBranchesPerMain, tasksPerLeaf;

    // Define structure parameters based on complexity score bands
    if (complexityScore <= 0) complexityScore = 1; // Ensure score is at least 1

    if (complexityScore <= 2) { // Very Simple
      depth = 2;
      mainBranches = 3 + Math.floor(complexityScore / 2); // 3-4
      subBranchesPerMain = 2;
      tasksPerLeaf = 4 + complexityScore; // 5-6
    } else if (complexityScore <= 4) { // Simple to Moderate
      depth = 3;
      mainBranches = 3 + Math.floor(complexityScore / 2); // 4-5
      subBranchesPerMain = 2 + Math.floor(complexityScore / 3); // 2-3
      tasksPerLeaf = 5 + complexityScore; // 8-9
    } else if (complexityScore <= 7) { // Moderate to Complex
      depth = 3;
      mainBranches = 4 + Math.floor(complexityScore / 2); // 6-7
      subBranchesPerMain = 3 + Math.floor(complexityScore / 4); // 3-4
      tasksPerLeaf = 6 + complexityScore; // 11-13
    } else { // Very Complex / Advanced
      depth = 4;
      mainBranches = 5 + Math.floor(complexityScore / 2); // 8-10
      subBranchesPerMain = 4 + Math.floor(complexityScore / 5); // 4-6
      tasksPerLeaf = 7 + complexityScore; // 15-17
    }

    // Calculate totals
    let totalSubBranches = mainBranches;
    if (depth > 1) {
        totalSubBranches *= subBranchesPerMain;
    }

    let totalLeaves = mainBranches;
    if (depth === 2) {
        totalLeaves = mainBranches * subBranchesPerMain;
    } else if (depth === 3) {
        totalLeaves = mainBranches * subBranchesPerMain * (subBranchesPerMain > 0 ? (subBranchesPerMain -1) : 1) ; // Approximation for 3 levels
         // A more common pattern is subBranchesPerMain at each non-leaf level.
         // If depth 3 means Main -> Sub -> SubSub, then use subBranchesPerMain twice.
         // If depth 3 means Main -> Sub -> Tasks, and another Main -> Sub -> SubSub -> Tasks, it's more complex.
         // Assuming consistent branching factor for simplicity here.
         // Let's assume sub_branches_per_main applies at each level of branching.
         let currentLevelNodes = mainBranches;
         totalLeaves = 0;
         for(let i=1; i<depth; i++){
            currentLevelNodes *= subBranchesPerMain;
         }
         totalLeaves = currentLevelNodes;

    } else if (depth === 4) {
        let currentLevelNodes = mainBranches;
         for(let i=1; i<depth; i++){
            currentLevelNodes *= subBranchesPerMain;
         }
         totalLeaves = currentLevelNodes;
    }


    const estimatedTasks = totalLeaves * tasksPerLeaf;

    // Time estimate (rough) - consider making average task duration configurable
    const avgTaskDurationMinutes = 30; // average minutes per task
    const totalHoursEstimate = (estimatedTasks * avgTaskDurationMinutes) / 60;

    let timeEstimate;
    if (totalHoursEstimate < 40) timeEstimate = `${Math.ceil(totalHoursEstimate)} hours`; // Less than a week of full-time
    else if (totalHoursEstimate < 160) timeEstimate = `${Math.ceil(totalHoursEstimate / 40)} weeks`; // 1-4 weeks
    else if (totalHoursEstimate < 640) timeEstimate = `${Math.ceil(totalHoursEstimate / 160)} months`; // 1-4 months
    else timeEstimate = `${Math.ceil(totalHoursEstimate / (160 * 12))} years`; // For very large goals

    return {
      recommended_depth: depth,
      main_branches: mainBranches,
      sub_branches_per_main: subBranchesPerMain,
      tasks_per_leaf: tasksPerLeaf,
      estimated_tasks: Math.round(estimatedTasks), // Round to whole number
      time_estimate: timeEstimate
    };
  }

  /**
   * Generate prompt for deep hierarchical branch creation
   */
  generateDeepBranchPrompt(config, learningStyle, focusAreas, complexity) {
    const focusDuration = config.life_structure_preferences?.focus_duration || '25 minutes';
    let taskBlock = `"tasks": [
            {
              "title": "Specific actionable task",
              "description": "Clear instructions and expected outcome",
              "difficulty": "1-5 (integer)",
              "duration": "Approximate minutes (e.g., ${focusDuration.replace(' minutes', '')}, consider focus blocks)",
              "prerequisites": ["earlier_task_title_if_any"]
            }
          ]`;

    let subBranchStructure = '';
    if (complexity.recommended_depth === 2) {
      subBranchStructure = `
    {
      "branch_name": "sub_branch_identifier (e.g., Core_Concept_1)",
      "description": "Specific aspect of the main branch (e.g., Understanding X)",
      ${taskBlock}
    }`;
    } else if (complexity.recommended_depth === 3) {
      subBranchStructure = `
    {
      "branch_name": "sub_branch_identifier (e.g., Module_A)",
      "description": "Specific aspect of the main branch (e.g., Advanced Topic Y)",
      "sub_branches": [
        {
          "branch_name": "sub_sub_branch_identifier (e.g., Lesson_A1)",
          "description": "Even more specific aspect (e.g., Practical Application of Y)",
          ${taskBlock}
        }
      ]
    }`;
    } else if (complexity.recommended_depth >= 4) {
      // For depth 4 or more, illustrate one more level of nesting for clarity
      subBranchStructure = `
    {
      "branch_name": "sub_branch_identifier (e.g., Phase_One)",
      "description": "Specific aspect of the main branch",
      "sub_branches": [
        {
          "branch_name": "sub_sub_branch_identifier (e.g., Unit_1.1)",
          "description": "More specific aspect",
          "sub_branches": [
            {
              "branch_name": "leaf_branch_identifier (e.g., Skill_1.1.1)",
              "description": "Most granular topic, containing tasks",
              ${taskBlock}
            }
          ]
        }
      ]
    }`;
    }


    return \`Create a ${complexity.recommended_depth}-level deep Hierarchical Task Analysis (HTA) for this goal:

**GOAL**: ${config.goal}
**CONTEXT**: ${config.context || 'Starting from scratch'}
**COMPLEXITY SCORE (1-10)**: ${complexity.score} (${complexity.level})
**USER'S TARGET STRUCTURE BASED ON COMPLEXITY**:
- ${complexity.main_branches} main strategic branches.
- Each main branch should ideally have around ${complexity.sub_branches_per_main} sub-branches.
- Each sub-branch (if not leading to further sub-branches) or leaf-node branch should contain approximately ${complexity.tasks_per_leaf} tasks.
- The hierarchy should extend to ${complexity.recommended_depth} levels deep.
- Aim for a total of ~${complexity.estimated_tasks} tasks.

**USER CONSTRAINTS & PREFERENCES**:
- Preferred focus duration for tasks: ${focusDuration}
- Learning style: ${learningStyle}
- Specific focus areas (if any): ${focusAreas.length > 0 ? focusAreas.join(', ') : 'Comprehensive approach, cover all necessary areas'}

**OUTPUT STRUCTURE GUIDELINES**:
Provide the output as a JSON array of main branches. Each branch follows this recursive structure:
{
  "branch_name": "main_branch_identifier (e.g., Foundational_Knowledge)",
  "description": "What this major area or stage covers in relation to the main goal.",
  "sub_branches": [ // If depth > 1 and this branch is not a leaf
    ${subBranchStructure}
    // ... more sub-branches as needed, adhering to complexity.sub_branches_per_main
  ]
  // If a branch is a leaf node (i.e., it directly contains tasks, not further sub-branches):
  // "tasks": [ { "title": "...", "description": "...", ... } ] // (only if this branch itself is a leaf)
}

**DETAILED INSTRUCTIONS FOR AI**:
1.  **Analyze Goal & Context**: Thoroughly understand the user's goal: "${config.goal}".
2.  **Design Main Branches**: Create ${complexity.main_branches} top-level main branches. These should be distinct, comprehensive, and logically sequenced stages or components for achieving the goal.
3.  **Develop Hierarchy**: For each main branch, create a hierarchy of sub-branches down to ${complexity.recommended_depth} levels.
    - If a branch has \`sub_branches\`, it should NOT also have a direct \`tasks\` array. Tasks only exist at the LEAF nodes of the tree.
    - A branch at depth ${complexity.recommended_depth} is a leaf node and MUST contain a \`tasks\` array.
    - A branch at a depth less than ${complexity.recommended_depth} can either have \`sub_branches\` (if it's an intermediate node) or \`tasks\` (if it's a leaf node before max depth, though aim for full depth).
4.  **Populate Leaf Nodes with Tasks**: At each terminal/leaf branch (typically at depth ${complexity.recommended_depth}), define ~${complexity.tasks_per_leaf} specific, actionable tasks.
    - Task \`duration\` should be in minutes and respect the user's focus preference (e.g., ${focusDuration}).
    - Task \`difficulty\` should be an integer from 1 (very easy) to 5 (very challenging).
    - \`prerequisites\` should list titles of tasks that must be completed before this one. Use titles from tasks defined within THIS ENTIRE HTA structure.
5.  **Naming and Descriptions**: Use clear, descriptive \`branch_name\` (snake_case_preferably) and \`description\` fields. Task titles should be actionable.
6.  **Adherence to Structure**: Strictly follow the JSON structure. Ensure all required fields are present.
7.  **Comprehensive Roadmap**: The final HTA should be a complete roadmap from the user's current state to achieving "${config.goal}".

Example of a task within a leaf branch's \`tasks\` array:
{
  "title": "Example: Set up development environment",
  "description": "Install Node.js, VS Code, and necessary libraries for the project.",
  "difficulty": 2,
  "duration": "60", // minutes
  "prerequisites": [] // or ["Example: Research software options"]
}

Begin by defining the ${complexity.main_branches} main branches.
Provide ONLY the JSON output.
\`;
  }

  // ============================================
  // Methods from Version 1 (Simpler HTA) to be included for persistence
  // ============================================

  /**
   * Get or create HTA for a path
   * Tries path-specific HTA first, then project-level for general path.
   */
  async loadPathHTA(projectId, pathName) {
    try {
      const actualPathName = pathName || DEFAULT_PATHS.GENERAL; // Ensure pathName is set

      if (actualPathName === DEFAULT_PATHS.GENERAL) {
        // For general path, attempt to load from path-specific storage first (if it was ever saved there)
        // This handles a case where a general HTA might have been saved under a specific path name "general"
        try {
            const pathHTA = await this.dataPersistence.loadPathData(projectId, actualPathName, FILE_NAMES.HTA);
            if (pathHTA) return pathHTA;
        } catch (e) {
            // If path-specific "general" doesn't exist or fails, that's okay, proceed to project HTA
            if (e.code !== 'ENOENT' && e.name !== 'FileNotFoundError') { // Common error codes for not found
                 console.warn(\`Warning: Error trying to load path-specific HTA for 'general' path: \${e.message}\`);
            }
        }

        // Then try loading from the main project-level HTA file
        const projectHTA = await this.dataPersistence.loadProjectData(projectId, FILE_NAMES.HTA);
        if (projectHTA) return projectHTA;

      } else {
        // For specific paths, just load from path-specific storage
        const hta = await this.dataPersistence.loadPathData(projectId, actualPathName, FILE_NAMES.HTA);
        if (hta) return hta;
      }

      // Return null if no HTA exists after trying appropriate locations
      return null;
    } catch (error) {
      // If any error occurs that indicates file not found, return null.
      // This simplifies calling code, as it doesn't need to check for ENOENT specifically.
      if (error.code === 'ENOENT' || error.name === 'FileNotFoundError' || error.message.includes('No such file or directory')) {
        return null;
      }
      // Log other errors and rethrow
      console.error(\`Error loading HTA for project \${projectId}, path \${pathName || DEFAULT_PATHS.GENERAL}:\`, error);
      throw error;
    }
  }

  /**
   * Save HTA for a path
   * Saves to project-level for general path, path-specific for others.
   */
  async savePathHTA(projectId, pathName, htaData) {
    const actualPathName = pathName || DEFAULT_PATHS.GENERAL; // Ensure pathName is set
    if (!htaData) {
        throw new Error("Attempted to save null or undefined HTA data.");
    }
    try {
      if (actualPathName === DEFAULT_PATHS.GENERAL) {
        await this.dataPersistence.saveProjectData(projectId, FILE_NAMES.HTA, htaData);
      } else {
        await this.dataPersistence.savePathData(projectId, actualPathName, FILE_NAMES.HTA, htaData);
      }
    } catch (error) {
        console.error(\`Error saving HTA for project \${projectId}, path \${actualPathName}:\`, error);
        throw error; // Rethrow to allow calling function to handle
    }
  }
}
