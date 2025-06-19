/**
 * HTA Tree Builder Module
 * Handles HTA tree construction and strategic task generation
 */

import { HtaNode } from '../models/index.js';

export class HtaTreeBuilder {
  constructor(dataPersistence, projectManagement, llmInterface) {
    this.dataPersistence = dataPersistence;
    this.projectManagement = projectManagement;
    this.llm = llmInterface; // Store reference to Claude/LLM interface
    // Collect Claude generation requests when an online LLM is not available.
    this.pendingClaudeRequests = [];
  }

  async buildHTATree(pathName = null, learningStyle = 'mixed', focusAreas = []) {
    try {
      const projectId = await this.projectManagement.requireActiveProject();
      const config = await this.dataPersistence.loadProjectData(projectId, 'config.json');

      if (!config) {
        throw new Error('Project configuration not found');
      }

      // Warn (but no longer block) if additional context is missing. Heuristic fallback now allowed.
      const contextWarning = (!config.context || (typeof config.context === 'string' && config.context.trim() === ''))
        ? '⚠️ Context not provided – using heuristic roadmap generation. Results may be less precise.'
        : null;

      // Determine which path to build for
      const targetPath = pathName || config.activePath || 'general';

      // Check if path exists in learning paths
      const pathExists = config.learning_paths?.some(p => p.path_name === targetPath) || targetPath === 'general';
      if (!pathExists) {
        throw new Error(`Learning path "${targetPath}" not found in project configuration`);
      }

      // Load existing HTA data for this path
      const existingHTA = await this.loadPathHTA(projectId, targetPath);

      // Generate strategic framework
      const htaData = await this.generateHTAFramework(config, targetPath, learningStyle, focusAreas, existingHTA);

      // Save HTA data
      await this.savePathHTA(projectId, targetPath, htaData);

      // Update project config with active path
      config.activePath = targetPath;
      await this.dataPersistence.saveProjectData(projectId, 'config.json', config);

      // If no frontier nodes were generated, return the pending Claude request directly so MCP can prompt the user
      if ((htaData.frontierNodes?.length || 0) === 0 && this.pendingClaudeRequests.length > 0) {
        // Return the FIRST pending request (one branch at a time is fine – Claude can iterate)
        const pending = this.pendingClaudeRequests[0];
        return {
          content: [{ type: 'text', text: pending.claude_request || 'LLM generation required' }],
          pending_claude: pending
        };
      }

      // Format question tree for display
      const formatQuestionTree = (node, indent = '') => {
        if (!node) {return '';}
        let output = `${indent}❓ ${node.question}\n`;
        if (node.spawned_questions?.length > 0) {
          for (const child of node.spawned_questions) {
            output += formatQuestionTree(child, `${indent}  `);
          }
        }
        return output;
      };

      const questionTreeDisplay = htaData.questionTree ?
        `\n**🧠 Question Roadmap:**\n${formatQuestionTree(htaData.questionTree)}` : '';

      const summaryText = `🌳 HTA Question-Tree built successfully for "${targetPath}" path!\n\n` +
               `**Complexity**: ${htaData.complexityProfile?.complexity_score || 'N/A'}/10\n` +
               `**Target Depth**: ${htaData.depthConfig?.targetDepth || 'N/A'} levels\n` +
               `**Questions Generated**: ${this.countTotalQuestions(htaData.questionTree)}\n` +
               `**Learning Style**: ${learningStyle}\n` +
               `**Focus Areas**: ${focusAreas.join(', ') || 'General exploration'}${
                 questionTreeDisplay}\n\n` +
        '✅ Ready to start with question-driven task generation!';

      return {
        content: [{ type: 'text', text: contextWarning ? `${contextWarning}\n\n${summaryText}` : summaryText }],
        hta_tree: htaData,
        active_path: targetPath,
        warning: contextWarning || undefined
      };
    } catch (error) {
      await this.dataPersistence.logError('buildHTATree', error, { pathName, learningStyle, focusAreas });
      return {
        content: [{
          type: 'text',
          text: `Error building HTA tree: ${error.message}`
        }]
      };
    }
  }

  countTotalQuestions(questionTree) {
    if (!questionTree) {return 0;}
    let count = 1; // count this node
    if (questionTree.spawned_questions?.length > 0) {
      for (const child of questionTree.spawned_questions) {
        count += this.countTotalQuestions(child);
      }
    }
    return count;
  }

  async loadPathHTA(projectId, pathName) {
    if (pathName === 'general') {
      return await this.dataPersistence.loadProjectData(projectId, 'hta.json');
    } else {
      return await this.dataPersistence.loadPathData(projectId, pathName, 'hta.json');
    }
  }

  async savePathHTA(projectId, pathName, htaData) {
    if (pathName === 'general') {
      return await this.dataPersistence.saveProjectData(projectId, 'hta.json', htaData);
    } else {
      return await this.dataPersistence.savePathData(projectId, pathName, 'hta.json', htaData);
    }
  }

  async generateHTAFramework(config, pathName, learningStyle = 'mixed', focusAreas = [], existingHTA = null) {
    const goal = config.goal;
    const knowledgeLevel = config.knowledge_level || 1;
    const interests = this.getPathInterests(config, pathName);

    /* ─── NEW • analyse goal complexity & compute optimal depth ─── */
    const targetTimeframe = config.target_timeframe || '';
    const complexityProfile = await this.assessGoalComplexity(goal);
    const depthConfig = this.calculateOptimalDepth(
      complexityProfile?.complexity_score ?? 5,
      knowledgeLevel,
      targetTimeframe
    );
    /* ───────────────────────────────────────────────────────────── */

    // ─── NEW • generate calibrated Question-Tree skeleton ───
    const questionTree = await this.generateQuestionSkeleton(goal, depthConfig);
    // ----------------------------------------------------------

    // Generate strategic branches (legacy approach – will evolve to Q-driven soon)
    const strategicBranches = await this.generateStrategicBranches(
      goal,
      pathName,
      focusAreas,
      knowledgeLevel
    );

    // Generate frontier nodes (kept empty for now)
    const frontierNodes = [];

    return {
      pathName,
      goal,
      strategicBranches,
      frontierNodes,
      learningStyle,
      focusAreas,
      knowledgeLevel,
      complexityProfile,
      depthConfig,
      questionTree,
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };
  }

  getPathInterests(config, pathName) {
    if (pathName === 'general') {
      return config.specific_interests || [];
    }

    const path = config.learning_paths?.find(p => p.path_name === pathName);
    return path?.interests || config.specific_interests || [];
  }

  async generateStrategicBranches(goal, pathName, focusAreas, knowledgeLevel) {
    // 1. If focus areas are supplied, use them directly (purely user-driven, no hard-coding)
    if (Array.isArray(focusAreas) && focusAreas.length > 0) {
      const customBranches = focusAreas.map((raw) => {
        const area = String(raw).trim();
        return {
          id: `focus_${area.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`.replace(/_+/g, '_').replace(/^_|_$/g, ''),
          title: area.charAt(0).toUpperCase() + area.slice(1),
          priority: 'high',
          completed: false,
          description: `Roadmap for developing expertise in ${area}`,
          expected_duration: this.estimateDuration(knowledgeLevel),
          subBranches: []
        };
      });

      // Attempt to enrich with sub-branches just like auto-generated domains
      for (const branch of customBranches) {
        try {
          // eslint-disable-next-line no-await-in-loop
          branch.subBranches = await this.generateSubBranches(branch.title, knowledgeLevel);
        } catch (_) {
          branch.subBranches = [];
        }
      }

      return customBranches;
    }

    // 2. ENHANCED: Perform Goal Complexity Analysis first
    const complexityAnalysis = await this.assessGoalComplexity(goal);
    const complexityRating = complexityAnalysis.complexity_score || 5;
    const estimatedDurationYears = this.estimateDurationYears(complexityAnalysis.estimated_time);

    // 3. Determine appropriate number of domains based on complexity
    let targetDomainCount;
    if (complexityRating <= 3) {
      targetDomainCount = 2; // Simple goals: 2 domains (e.g., "Learn to Bake a Cake")
    } else if (complexityRating <= 6) {
      targetDomainCount = 4; // Moderate goals: 4 domains
    } else if (complexityRating <= 8) {
      targetDomainCount = 6; // Complex goals: 6 domains
    } else {
      targetDomainCount = 8; // Highly complex goals: 8 domains (e.g., "Become a Neurosurgeon")
    }

    // 4. Generate domains with complexity-aware prompt
    const domainGenerationPrompt = `You are a curriculum architect analyzing a goal with complexity rating ${complexityRating}/10 (estimated duration: ${estimatedDurationYears} years).

Goal: "${goal}"
Complexity: ${complexityRating}/10
Target domains needed: ${targetDomainCount}

Based on this complexity level, propose exactly ${targetDomainCount} top-level learning domains that together form a comprehensive roadmap. For goals with:
- Low complexity (1-3): Focus on core essentials and immediate application
- Medium complexity (4-6): Add foundational theory and practical specializations  
- High complexity (7-10): Include extensive theoretical foundations, multiple specializations, and advanced applications

Domains must be short noun phrases (e.g. "Core Grammar", "Cultural Fluency"). Return them as a JSON array of exactly ${targetDomainCount} strings.`;

    const aiResp = await this.llm.requestIntelligence('hta-complexity-aware-domain-generation', {
      prompt: domainGenerationPrompt,
      metadata: { complexity_rating: complexityRating, target_domains: targetDomainCount }
    });

    let domains = [];
    if (aiResp && !aiResp.request_for_claude) {
      try {
        const text = aiResp.completion || aiResp.answer || aiResp.text || '[]';
        domains = JSON.parse(text);
      } catch (_) { /* ignore parsing failure */ }
    }

    // 5. Fallback: create complexity-appropriate generic domains
    if (!Array.isArray(domains) || domains.length === 0) {
      domains = this.generateFallbackDomains(complexityRating, targetDomainCount);
    }

    // Ensure we have the right number of domains
    if (domains.length < targetDomainCount) {
      domains = [...domains, ...this.generateFallbackDomains(complexityRating, targetDomainCount - domains.length)];
    } else if (domains.length > targetDomainCount) {
      domains = domains.slice(0, targetDomainCount);
    }

    // 6. Build enriched branch objects
    const branches = domains.map((d, idx) => ({
      id: `domain_${idx + 1}`,
      title: d,
      priority: 'high',
      completed: false,
      description: `Roadmap for ${d} (complexity: ${complexityRating}/10)`,
      expected_duration: this.estimateDuration(knowledgeLevel),
      complexity_rating: complexityRating,
      subBranches: []
    }));

    // 7. For high complexity goals (>7), generate deeper sub-branch hierarchies
    for (const branch of branches) {
      try {
        branch.subBranches = await this.generateSubBranches(branch.title, knowledgeLevel);

        // For very high complexity goals, add another layer of depth
        if (complexityRating > 7) {
          for (const subBranch of branch.subBranches) {
            try {
              // eslint-disable-next-line no-await-in-loop
              subBranch.subBranches = await this.generateSubBranches(subBranch.title, knowledgeLevel);
            } catch (_) {
              subBranch.subBranches = [];
            }
          }
        }
      } catch (_) {
        // Fail gracefully; leave subBranches empty
        branch.subBranches = [];
      }
    }

    return branches;
  }

  async generateSequencedFrontierNodes(strategicBranches, interests, learningStyle, knowledgeLevel, existingHTA, context = '') {
    const frontierNodes = [];
    let nodeId = 1;

    // Extract existing completed tasks to avoid duplication
    const completedTasks = existingHTA?.frontierNodes?.filter(n => n.completed)?.map(n => n.title) || [];

    for (const branch of strategicBranches) {
      // Pure AI generation: ask the LLM to generate tasks for this branch
      const aiNodes = await this.generateBranchNodesAI(
        branch,
        interests,
        learningStyle,
        knowledgeLevel,
        completedTasks,
        nodeId,
        context
      );
      frontierNodes.push(...aiNodes);
      nodeId += aiNodes.length;
    }

    // Sort by priority and difficulty
    return this.sortNodesBySequence(frontierNodes, knowledgeLevel);
  }

  // Remove all template-based code. Use LLM to generate nodes for each branch.
  async generateBranchNodesAI(branch, interests, learningStyle, knowledgeLevel, completedTasks, startNodeId, context = '') {
    // CRITICAL FIX: Much more explicit prompt for proper beginner handling
    let levelGuidance = '';
    if (knowledgeLevel <= 2) {
      levelGuidance = `CRITICAL: This is a COMPLETE BEGINNER (level ${knowledgeLevel}/10). Tasks must be:
- Extremely simple, basic actions that can be done in 15-25 minutes
- Difficulty level 1 ONLY (no exceptions)
- No prior knowledge assumed
- Focus on "getting familiar" and "first steps"
- Examples: "Hold a guitar for 5 minutes", "Find middle C on piano", "Crack an egg into a bowl"`;
    } else if (knowledgeLevel <= 4) {
      levelGuidance = `This is an EARLY LEARNER (level ${knowledgeLevel}/10). Tasks should be:
- Simple but slightly more involved (25-45 minutes)
- Difficulty 1-2 maximum
- Build on very basic foundations
- Examples: "Play a single note cleanly", "Make scrambled eggs", "Write a simple HTML page"`;
    } else {
      levelGuidance = `This is an INTERMEDIATE+ learner (level ${knowledgeLevel}/10). Tasks can be more complex.`;
    }

    const contextSection = context ? `\n\nIMPORTANT CONTEXT: ${context}\n` : '';

    const prompt = 'You are an expert in learning design. Generate a list of 3-5 actionable, concrete, and appropriately-leveled tasks for a learner with the following context:\n\n' +
      `Goal: ${branch.title}\n` +
      `Branch Type: ${branch.title} (${branch.description})\n` +
      `Knowledge Level: ${knowledgeLevel}/10\n` +
      `${levelGuidance}${contextSection}\n` +
      `Interests: ${interests.join(', ') || 'None'}\n` +
      `Learning Style: ${learningStyle}\n\n` +
      'ABSOLUTELY NO TEMPLATES OR GENERIC PLACEHOLDERS. Tasks must be specific, realistic, and tailored to the actual level and context.\n' +
      'If context mentions "never done X" or "complete beginner", ensure tasks start from absolute zero.\n\n' +
      'CRITICAL: Create a logical learning progression where later tasks build on earlier ones. Use the "prerequisites" field to reference the EXACT TITLE of previous tasks that must be completed first. For beginners, start with 1-2 foundation tasks that have no prerequisites, then build dependencies.\n\n' +
      'Return the result as a JSON array of objects, each with: title, description, difficulty (1-5), duration (in minutes), and prerequisites (array of exact task titles from this same list).\n\n' +
      'Example progression: [{"title": "Hold guitar comfortably", "description": "Practice holding the guitar in playing position for 5 minutes", "difficulty": 1, "duration": 15, "prerequisites": []}, {"title": "Find middle C and practice finger placement", "description": "Locate middle C and practice placing your index finger correctly", "difficulty": 1, "duration": 10, "prerequisites": ["Hold guitar comfortably"]}]';

    // Call the LLM (Claude) via the stored interface
    const aiResponse = await this.llm.requestIntelligence('hta-task-generation', { prompt });
    let tasks = [];

    // CRITICAL FIX: Check if we actually got a real AI response
    if (aiResponse && aiResponse.request_for_claude) {
      // Queue a Claude generation request to be returned to the client via MCP
      this.pendingClaudeRequests.push({
        claude_request: prompt,
        type: 'tasks',
        context: { branchId: branch.id, pathName: branch.title }
      });
      // Return no tasks – actual tasks will be supplied by Claude later
      tasks = [];
    } else {
      // Try to parse real LLM response
      try {
        const responseText = aiResponse.completion || aiResponse.answer || aiResponse.text || '[]';
        tasks = JSON.parse(responseText);
        if (!Array.isArray(tasks) || tasks.length === 0) {
          throw new Error('Empty or invalid response');
        }
      } catch (e) {
        console.warn('⚠️  AI response parsing failed, using fallback tasks');
        tasks = this.generateFallbackTasks(branch, knowledgeLevel, interests);
      }
    }

    // Filter out completed tasks and post-process for beginner appropriateness
    const filtered = tasks.filter(t => !completedTasks.includes(t.title)).map(t => {
      // CRITICAL FIX: Ensure difficulty matches knowledge level properly
      if (knowledgeLevel <= 2) {
        // Complete beginners (1-2) should only get difficulty 1
        t.difficulty = 1;
        // Cap duration to 25 minutes for beginners
        if (typeof t.duration === 'number') {
          t.duration = Math.min(25, t.duration);
        }
      } else if (knowledgeLevel <= 4) {
        // Early learners (3-4) can handle difficulty 1-2
        t.difficulty = Math.min(2, Math.max(1, t.difficulty || 1));
        if (typeof t.duration === 'number') {
          t.duration = Math.min(45, t.duration);
        }
      } else if (knowledgeLevel <= 6) {
        // Intermediate learners (5-6) can handle difficulty 1-3
        t.difficulty = Math.min(3, Math.max(1, t.difficulty || 2));
        if (typeof t.duration === 'number') {
          t.duration = Math.min(60, t.duration);
        }
      } else {
        // Advanced learners (7+) can handle any difficulty
        t.difficulty = Math.min(5, Math.max(1, t.difficulty || 3));
      }
      return t;
    });

    // Map to node format using HtaNode model
    return filtered.map((t, i) => {
      const nodeData = {
        id: `node_${startNodeId + i}`,
        title: t.title,
        description: t.description,
        branch: branch.id,
        difficulty: t.difficulty || 1,
        priority: 200 + (t.difficulty || 1) * 10,
        duration: typeof t.duration === 'number' ? `${t.duration} minutes` : (t.duration || '30 minutes'),
        prerequisites: this.mapPrerequisitesToNodeIds(t.prerequisites || [], filtered, startNodeId),
        completed: false,
        opportunityType: t.opportunityType || undefined
      };

      return new HtaNode(nodeData);
    });
  }

  // NEW METHOD: Convert prerequisite titles to node IDs and validate dependencies
  mapPrerequisitesToNodeIds(prerequisites, allTasks, startNodeId) {
    if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
      return [];
    }

    const validPrerequisites = [];

    for (const prereq of prerequisites) {
      // Find the task by title
      const prereqTaskIndex = allTasks.findIndex(task => task.title === prereq);
      if (prereqTaskIndex !== -1) {
        const prereqNodeId = `node_${startNodeId + prereqTaskIndex}`;
        validPrerequisites.push(prereqNodeId);
      }
      // If prerequisite not found, skip it (don't create broken dependencies)
    }

    return validPrerequisites;
  }

  sortNodesBySequence(frontierNodes, knowledgeLevel) {
    // Sort by priority (higher first), then by difficulty (appropriate for knowledge level)
    return frontierNodes.sort((a, b) => {
      // First by priority
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }

      // CRITICAL FIX: Proper difficulty matching for beginners
      let idealDifficulty;
      if (knowledgeLevel <= 2) {
        idealDifficulty = 1; // Beginners need difficulty 1 only
      } else if (knowledgeLevel <= 4) {
        idealDifficulty = 2; // Early learners prefer difficulty 2
      } else if (knowledgeLevel <= 6) {
        idealDifficulty = 3; // Intermediate learners prefer difficulty 3
      } else {
        idealDifficulty = Math.min(knowledgeLevel - 2, 5); // Advanced learners
      }

      const aDiffDistance = Math.abs(a.difficulty - idealDifficulty);
      const bDiffDistance = Math.abs(b.difficulty - idealDifficulty);

      return aDiffDistance - bDiffDistance;
    });
  }

  generateFallbackTasks(branch, knowledgeLevel, interests) {
    // Fallback disabled – require external Claude generation
    return [];
  }

  // Disable template fallback – empty list signals need for Claude
  generateFallbackTasksNode(branch, startNodeId) {
    return [];
  }

  // ====== NEW HELPERS FOR MULTILAYER ROADMAP ======
  /**
   * Very rough duration estimate based on learner level.
   * Beginners will have shorter domain time-frames; advanced learners may need longer.
   */
  estimateDuration(knowledgeLevel) {
    if (knowledgeLevel <= 2) {return '0-3 months';}
    if (knowledgeLevel <= 4) {return '2-6 months';}
    if (knowledgeLevel <= 6) {return '4-9 months';}
    return '6-12+ months';
  }

  /**
   * Convert complexity analysis estimated_time to years for better prompt context.
   * @param {string} estimatedTime - "short|months|years"
   * @returns {string} - Human readable duration estimate
   */
  estimateDurationYears(estimatedTime) {
    switch (estimatedTime) {
    case 'short': return '0.1-0.5';
    case 'months': return '0.5-2';
    case 'years': return '2-10+';
    default: return '1-3';
    }
  }

  /**
   * Generate fallback domains based on complexity rating when LLM fails.
   * @param {number} complexityRating - 1-10 complexity score
   * @param {number} targetCount - Number of domains to generate
   * @returns {string[]} - Array of domain names
   */
  generateFallbackDomains(complexityRating, targetCount) {
    const baseDomains = ['Fundamentals', 'Practice', 'Application'];
    const intermediateDomains = ['Theory', 'Advanced Practice', 'Specialization'];
    const advancedDomains = ['Research', 'Innovation', 'Mastery', 'Teaching', 'Leadership'];

    const availableDomains = [...baseDomains];

    if (complexityRating > 3) {
      availableDomains.push(...intermediateDomains);
    }

    if (complexityRating > 6) {
      availableDomains.push(...advancedDomains);
    }

    // Return the first targetCount domains, cycling if needed
    const result = [];
    for (let i = 0; i < targetCount; i++) {
      result.push(availableDomains[i % availableDomains.length]);
    }

    return result;
  }

  /**
   * Ask the LLM for 2-3 sub-domains within a given top-level domain.
   * Falls back to an empty array on any failure.
   * @param {string} domainTitle
   * @param {number} knowledgeLevel
   */
  async generateSubBranches(domainTitle, knowledgeLevel) {
    const prompt = `You are a curriculum architect. Propose 2-3 logical sub-domains (1-3 word noun phrases) that sit under the broader domain "${domainTitle}" for a learner at knowledge level ${knowledgeLevel}/10. Return as a JSON array of strings.`;

    try {
      const resp = await this.llm.requestIntelligence('hta-subdomain-generation', { prompt });
      if (resp && !resp.request_for_claude) {
        const text = resp.completion || resp.answer || resp.text || '[]';
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 3).map((s, idx) => ({
            id: `${domainTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_sub_${idx + 1}`.replace(/_+/g, '_'),
            title: s,
            description: `Sub-domain of ${domainTitle}: ${s}`
          }));
        }
      }
    } catch (_) {/* ignore */}

    // === Heuristic fallback: derive 2 simple sub-domains from the domain title ===
    const words = domainTitle.split(/\s+/).filter(w => w.length>3);
    if (words.length >= 2) {
      const first = words[0];
      const second = words[1];
      return [first, second].map((w,idx) => ({
        id: `${domainTitle.toLowerCase().replace(/[^a-z0-9]+/g,'_')}_sub_${idx+1}`.replace(/_+/g,'_'),
        title: w.charAt(0).toUpperCase()+w.slice(1),
        description: `Sub-domain of ${domainTitle}: ${w}`
      }));
    }

    // If even heuristic fails, return empty array
    return [];
  }

  // ====== NEW HELPERS – Complexity & Depth Calibration ======
  /**
   * Ask the LLM (or Claude) to analyse goal complexity.
   * Falls back to a quick heuristic if the LLM is offline.
   */
  async assessGoalComplexity(goal) {
    const prompt = `Analyse the complexity of the goal: "${goal}". 
Return JSON: { "complexity_score": 1-10, "estimated_time": "short|months|years" }`;
    try {
      const resp = await this.llm.requestIntelligence('goal-complexity-analysis', { prompt });
      if (resp && !resp.request_for_claude) {
        return JSON.parse(resp.completion || resp.answer || resp.text || '{}');
      }
      if (resp?.request_for_claude) {
        this.pendingClaudeRequests.push({
          claude_request: prompt,
          type: 'complexity',
          context: { goal }
        });
      }
    } catch { /* fall through to heuristic */ }

    // Heuristic fallback: rough guess by goal length
    const wc = goal.split(/\s+/).length;
    return {
      complexity_score: Math.min(10, Math.max(3, Math.ceil(wc / 4))),
      estimated_time  : wc > 12 ? 'years' : wc > 6 ? 'months' : 'short'
    };
  }

  calculateOptimalDepth(score, userLevel, timeFrame = '') {
    const base = Math.ceil(score * 0.7);
    const lvlAdj = userLevel < 3 ? -1 : 0;
    const tfAdj = /year/i.test(timeFrame) ? +1 : /month/i.test(timeFrame) ? -1 : 0;
    return {
      targetDepth          : Math.max(3, base + lvlAdj + tfAdj),
      minQuestionsPerLevel : score > 7 ? 4 : 3,
      maxInitialBreadth    : score < 4 ? 3 : 5
    };
  }

  /* ─────────────────────────────────────────────────────────────
   *  QUESTION-TREE SKELETON HELPERS
   * ───────────────────────────────────────────────────────────── */

  async generateQuestionSkeleton(goal, depthCfg) {
    const rootQ = `What must be true for "${goal}" to become reality?`;
    return await this._decomposeQuestion(rootQ, 0, depthCfg, []);
  }

  async _decomposeQuestion(question, level, depthCfg, parentPath) {
    const nodeId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Base case: reached target depth
    if (level >= depthCfg.targetDepth) {
      return {
        id: nodeId,
        question,
        answered: false,
        answer_artifacts: [],
        spawned_questions: [],
        depth_level: level,
        parent_path: parentPath
      };
    }

    // Build prompt for sub-questions
    const prompt = `Parent question: ${question}\n` +
      `Goal: ${parentPath[0] || question}\n` +
      `Depth level: ${level}/${depthCfg.targetDepth}\n\n` +
      `Generate ${depthCfg.minQuestionsPerLevel} sub-questions that must be answered to fully resolve the parent.\n` +
      'Return JSON: { \"sub\": string[] }';

    let subQs = [];
    try {
      const aiResp = await this.llm.requestIntelligence('hta-question-decomposition', { prompt });
      if (aiResp && !aiResp.request_for_claude) {
        const parsed = JSON.parse(aiResp.completion || aiResp.answer || aiResp.text || '{}');
        if (Array.isArray(parsed.sub)) { subQs = parsed.sub; }
      } else if (aiResp?.request_for_claude) {
        this.pendingClaudeRequests.push({
          claude_request: prompt,
          type: 'question_decomp',
          context: { parent: question }
        });
      }
    } catch {
      // ignore parsing errors; fallback below
    }

    // Fallback: simple heuristic questions
    if (subQs.length === 0) {
      subQs = [
        `How can we practically achieve ${question}?`,
        `What resources are required for ${question}?`,
        `Why is ${question} challenging and how do we mitigate that?`
      ];
    }

    // Ensure we have at least minQuestionsPerLevel items
    while (subQs.length < depthCfg.minQuestionsPerLevel) {
      subQs.push(`${question} – subtopic ${subQs.length + 1}`);
    }

    const children = [];
    for (const sub of subQs) {
      // eslint-disable-next-line no-await-in-loop
      const child = await this._decomposeQuestion(sub, level + 1, depthCfg, [...parentPath, question]);
      children.push(child);
    }

    return {
      id: nodeId,
      question,
      answered: false,
      answer_artifacts: [],
      spawned_questions: children,
      depth_level: level,
      parent_path: parentPath
    };
  }
}