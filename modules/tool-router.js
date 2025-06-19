/**
 * Tool Router Module
 * Handles MCP tool request routing and execution
 */

import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getDatedLogPath, writeJsonLine } from './logger-utils.js';

export class ToolRouter {
  constructor(server, forestServer) {
    this.server = server;
    this.forestServer = forestServer;
    // Path for persistent stack-trace log
    this.stackTraceLogPath = getDatedLogPath('stack');
  }

  // Lightweight stack-trace logger – called on every tool invocation
  async logStack(toolName, args) {
    const startTime = Date.now();
    console.error(`[STACK-TRACE] Logging tool: ${toolName}`);

    try {
      const entry = {
        timestamp: new Date().toISOString(),
        tool: toolName,
        argKeys: Object.keys(args || {}),
        argCount: Object.keys(args || {}).length,
        stack: (new Error().stack?.split('\n').slice(3, 15) || []).map((s) => s.trim()),
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          DEBUG: process.env.DEBUG
        },
        // Capture detailed argument info (truncated for safety)
        argsPreview: this.truncateArgsForLogging(args),
        logTime: startTime
      };

      writeJsonLine(this.stackTraceLogPath, entry);
      console.error(`[STACK-TRACE] Written to ${this.stackTraceLogPath} (${Date.now() - startTime}ms)`);
    } catch (err) {
      console.error(`[STACK-TRACE] Error writing log: ${err.message}`);
      console.error('[STACK-TRACE] Stack trace of logging error:', err.stack);
      // Try to write a minimal error entry
      try {
        const errorEntry = {
          timestamp: new Date().toISOString(),
          type: 'stack-trace-error',
          tool: toolName,
          error: err.message,
          errorStack: err.stack?.split('\n')?.slice(0, 5)
        };
        writeJsonLine(this.stackTraceLogPath, errorEntry);
      } catch (secondErr) {
        console.error('[STACK-TRACE] Failed to write error entry:', secondErr.message);
      }
    }
  }

  // Helper to safely truncate arguments for logging
  truncateArgsForLogging(args) {
    if (!args || typeof args !== 'object') {return args;}

    const preview = {};
    for (const [key, value] of Object.entries(args)) {
      if (typeof value === 'string') {
        preview[key] = value.length > 200 ? `${value.slice(0, 200)}...` : value;
      } else if (typeof value === 'object' && value !== null) {
        try {
          const json = JSON.stringify(value);
          preview[key] = json.length > 200 ? `[Object: ${value.constructor?.name}]` : value;
        } catch (e) {
          preview[key] = `[Object: ${value.constructor?.name || 'Unknown'}]`;
        }
      } else {
        preview[key] = value;
      }
    }
    return preview;
  }

  // Main tool call dispatcher with truthful filtering built-in
  async dispatchTool(toolName, args) {
    const executionId = Math.random().toString(36).substr(2, 9);
    const executionStart = Date.now();

    // ENHANCED MCP TOOL LOGGING
    console.error(`🚀 [MCP-CALL] Tool: ${toolName} | ID: ${executionId} | Args: ${JSON.stringify(Object.keys(args || {}))}`);
    console.log(`🚀 [MCP-CALL] Tool: ${toolName} | ID: ${executionId} | Args: ${JSON.stringify(Object.keys(args || {}))}`);
    console.info(`🚀 [MCP-CALL] Tool: ${toolName} | ID: ${executionId} | Args: ${JSON.stringify(Object.keys(args || {}))}`);

    // Trigger stack-trace logging for every call
    await this.logStack(toolName, args);

    console.error(`[DISPATCH-${executionId}] Starting tool: ${toolName}`);

    try {
      // Execute the tool and return the result
      let result;

      try {
        switch (toolName) {
        case 'create_project':
          result = await this.forestServer.createProject(args);
          break;
        case 'switch_project':
          result = await this.forestServer.switchProject(args.project_id);
          break;
        case 'list_projects':
          result = await this.forestServer.listProjects();
          break;
        case 'get_active_project':
          result = await this.forestServer.getActiveProject();
          break;
        case 'build_hta_tree':
          result = await this.forestServer.buildHTATree(args.path_name, args.learning_style || 'mixed', args.focus_areas || []);
          break;
        case 'get_hta_status':
          result = await this.forestServer.getHTAStatus();
          break;
        case 'generate_daily_schedule':
          result = await this.forestServer.generateDailySchedule(
            args.date || null,
            args.energy_level ?? 3,
            args.available_hours || null,
            args.focus_type || 'mixed',
            args.schedule_request_context || 'User requested schedule'
          );
          break;
        case 'complete_block':
          result = await this.forestServer.completeBlock(args);
          break;
        case 'complete_with_opportunities':
          result = await this.forestServer.completeBlock(
            args.block_id,
            args.outcome,
            args.learned || '',
            args.next_questions || '',
            args.energy_level,
            args.difficulty_rating ?? args.difficulty ?? 1,
            args.breakthrough || false,
            // OPPORTUNITY DETECTION CONTEXT
            args.engagement_level || 5,
            args.unexpected_results || [],
            args.new_skills_revealed || [],
            args.external_feedback || [],
            args.social_reactions || [],
            args.viral_potential || false,
            args.industry_connections || [],
            args.serendipitous_events || []
          );
          break;
        case 'get_next_task':
          result = await this.forestServer.getNextTask(
            args.context_from_memory || '',
            args.energy_level || 3,
            args.time_available || '30 minutes'
          );
          break;
        case 'current_status':
          result = await this.forestServer.currentStatus();
          break;
        case 'evolve_strategy':
          result = await this.forestServer.evolveStrategy(args.feedback || '');
          break;
        case 'generate_tiimo_export':
          result = await this.forestServer.generateTiimoExport(args.include_breaks ?? true);
          break;
        case 'analyze_performance':
          result = await this.forestServer.analyzePerformance();
          break;
        case 'review_week':
          result = await this.forestServer.reviewPeriod(7);
          break;
        case 'review_month':
          result = await this.forestServer.reviewPeriod(30);
          break;
        case 'sync_forest_memory':
          result = await this.forestServer.syncForestMemory();
          break;
        case 'debug_task_sequence':
          result = await this.forestServer.debugTaskSequence();
          break;
        case 'repair_sequence':
          result = await this.forestServer.repairSequence(args.force_rebuild || false);
          break;
        case 'focus_learning_path':
          result = await this.forestServer.focusLearningPath(args.path_name, args.duration || 'until next switch');
          break;
        case 'list_learning_paths':
          result = await this.forestServer.listLearningPaths();
          break;
        case 'analyze_complexity_evolution':
          result = await this.forestServer.analyzeComplexityEvolution();
          break;
        case 'analyze_identity_transformation':
          result = await this.forestServer.analyzeIdentityTransformation();
          break;
        case 'analyze_reasoning':
          result = await this.forestServer.analyzeReasoning(args.include_detailed_analysis ?? true);
          break;
        case 'ask_truthful':
        case 'ask_truthful_claude':
        case 'mcp_forest_ask_truthful':
        case 'mcp_forest_ask_truthful_claude':
          result = await this.forestServer.askTruthfulClaude(args.prompt);
          break;
        case 'debug_health_check':
          result = await this.forestServer.debugCommands.healthCheck();
          break;
        case 'debug_trace_task':
          result = await this.forestServer.debugCommands.traceTask(args.project_id || null);
          break;
        case 'debug_validate':
          result = await this.forestServer.debugCommands.validateCurrent();
          break;
        case 'debug_export':
          result = await this.forestServer.debugCommands.exportLogs();
          break;
        case 'debug_summary':
          result = await this.forestServer.debugCommands.getSummary();
          break;
        case 'request_claude_generation':
          result = await this.forestServer.requestClaudeGeneration(
            args.prompt,
            args.generation_type || 'tasks',
            args.context || {}
          );
          break;
        case 'generate_hta_tasks':
          result = await this.forestServer.storeGeneratedTasks(args.branch_tasks);
          break;
        case 'get_generation_history':
          result = await this.forestServer.getGenerationHistory(args.limit || 10);
          break;
        case 'generate_integrated_schedule':
          result = await this.forestServer.generateIntegratedSchedule(
            args.date || null,
            args.energy_level || 3
          );
          break;
        case 'complete_block_and_next': {
          const completion = await this.forestServer.completeBlock(args);

          // CRITICAL FIX: Pass completion context for momentum building
          const momentumContext = args.breakthrough ?
            `BREAKTHROUGH_CONTEXT: Task completed with breakthrough. Outcome: ${args.outcome}. Learned: ${args.learned || 'Key insights gained'}. Ready for advanced momentum building.` :
            `Task completed. Outcome: ${args.outcome}. ${args.learned ? `Learned: ${args.learned}.` : ''} Looking for momentum building opportunities.`;

          const next = await this.forestServer.getNextTask(momentumContext, args.energy_level || 3, '30 minutes');
          result = { ...completion, next_task: next };
          break;
        }
        default:
          throw new Error(`Unknown tool: ${toolName}`);
        }
      } catch (e) {
        console.error(`[DISPATCH-${executionId}] Error executing tool:`, e.message);
        throw e;
      }

      return result;
    } catch (e) {
      console.error(`[DISPATCH-${executionId}] Error executing tool:`, e.message);
      throw e;
    } finally {
      const executionEnd = Date.now();
      const executionDuration = executionEnd - executionStart;
      console.error(`[DISPATCH-${executionId}] Tool execution completed in ${executionDuration}ms`);
      console.log(`✅ [MCP-COMPLETE] Tool: ${toolName} | ID: ${executionId} | Duration: ${executionDuration}ms`);
      console.info(`✅ [MCP-COMPLETE] Tool: ${toolName} | ID: ${executionId} | Duration: ${executionDuration}ms`);
    }
  }

  setupRouter() {
    console.error('🔧 DEBUG: ToolRouter setupRouter() called with AUTOMATIC TRUTHFUL FILTER');

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name: toolName, arguments: args } = request.params;
      console.error(`▶️ Executing tool: ${toolName}`);

      try {
        // Step 1: Execute the tool as normal.
        const originalResult = await this.dispatchTool(toolName, args);

        // Step 2: Get the truthful critique of the tool's result.
        // The critique logic is called here as a simple internal method.
        const { response, critique } = this.forestServer.getTruthfulCritique(originalResult);

        // Step 3: Combine the original result with the critique into a single, final response.
        // We will structure the final output to always contain both parts.
        const finalResponse = {
          tool_output: originalResult, // The original, unmodified output from the tool
          truthful_assessment: {
            // A new, dedicated section for the critique
            response,
            critique
          },
          // For easy display, we also include a formatted text block.
          content: [
            {
              type: 'text',
              text: `🧠 **Truthful Assessment & Critique**:\n${critique}\n\n---\n\n**Original Tool Output for '${toolName}':**\n${
                typeof originalResult === 'string'
                  ? originalResult
                  : JSON.stringify(originalResult, null, 2)
              }`
            }
          ]
        };

        return finalResponse;

      } catch (error) {
        console.error('Tool dispatch or filtering failed:', { toolName, error: error.message });
        throw new Error(`Tool '${toolName}' failed: ${error.message}`, { cause: error });
      }
    });

    console.error('🔧 DEBUG: CallToolRequestSchema handler registration completed');
  }
}