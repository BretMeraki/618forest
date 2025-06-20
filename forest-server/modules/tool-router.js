/**
 * Tool Router Module
 * Handles MCP tool request routing and execution
 */

import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getDatedLogPath, writeJsonLine } from './logger-utils.js';
import { ToolRegistry } from './utils/tool-registry.js';
import { getForestLogger } from './winston-logger.js';

const logger = getForestLogger({ module: 'ToolRouter' });

export class ToolRouter {
  constructor(server, forestServer) {
    this.server = server;
    this.forestServer = forestServer;
    // Path for persistent stack-trace log
    this.stackTraceLogPath = getDatedLogPath('stack');
    // Initialize tool registry
    this.toolRegistry = new ToolRegistry();
    this.registerAllTools();
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
        stack: (new Error().stack?.split('\n').slice(3, 15) || []).map(s => s.trim()),
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          DEBUG: process.env.DEBUG,
        },
        // Capture detailed argument info (truncated for safety)
        argsPreview: this.truncateArgsForLogging(args),
        logTime: startTime,
      };

      writeJsonLine(this.stackTraceLogPath, entry);
      console.error(
        `[STACK-TRACE] Written to ${this.stackTraceLogPath} (${Date.now() - startTime}ms)`
      );
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
          errorStack: err.stack?.split('\n')?.slice(0, 5),
        };
        writeJsonLine(this.stackTraceLogPath, errorEntry);
      } catch (secondErr) {
        console.error('[STACK-TRACE] Failed to write error entry:', secondErr.message);
      }
    }
  }

  // Helper to safely truncate arguments for logging
  truncateArgsForLogging(args) {
    if (!args || typeof args !== 'object') {
      return args;
    }

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
    const isTerminal = process.stdin.isTTY;

    // ENHANCED MCP TOOL LOGGING - only in terminal mode
    if (isTerminal) {
      console.error(
        `🚀 [MCP-CALL] Tool: ${toolName} | ID: ${executionId} | Args: ${JSON.stringify(Object.keys(args || {}))}`
      );
      logger.debug(
        `🚀 [MCP-CALL] Tool: ${toolName} | ID: ${executionId} | Args: ${JSON.stringify(Object.keys(args || {}))}`
      );
      console.info(
        `🚀 [MCP-CALL] Tool: ${toolName} | ID: ${executionId} | Args: ${JSON.stringify(Object.keys(args || {}))}`
      );
    }

    // Trigger stack-trace logging for every call
    await this.logStack(toolName, args);

    if (isTerminal) {
      console.error(`[DISPATCH-${executionId}] Starting tool: ${toolName}`);
    }

    try {
      // Execute the tool using registry - MUCH cleaner!
      const result = await this.toolRegistry.execute(toolName, args);
      return result;
    } catch (e) {
      if (isTerminal) {
        console.error(`[DISPATCH-${executionId}] Error executing tool:`, e.message);
      }
      throw e;
    } finally {
      const executionEnd = Date.now();
      const executionDuration = executionEnd - executionStart;
      if (isTerminal) {
        console.error(
          `[DISPATCH-${executionId}] Tool execution completed in ${executionDuration}ms`
        );
        logger.debug(
          `✅ [MCP-COMPLETE] Tool: ${toolName} | ID: ${executionId} | Duration: ${executionDuration}ms`
        );
        console.info(
          `✅ [MCP-COMPLETE] Tool: ${toolName} | ID: ${executionId} | Duration: ${executionDuration}ms`
        );
      }
    }
  }

  /**
   * Register all Forest tools in the registry
   * This replaces the giant switch statement with a clean, maintainable registry
   */
  registerAllTools() {
    // Project Management Tools
    this.toolRegistry.register(
      'create_project',
      args => this.forestServer.createProject(args),
      'project'
    );
    this.toolRegistry.register(
      'switch_project',
      args => this.forestServer.switchProject(args.project_id),
      'project'
    );
    this.toolRegistry.register('list_projects', () => this.forestServer.listProjects(), 'project');
    this.toolRegistry.register(
      'get_active_project',
      () => this.forestServer.getActiveProject(),
      'project'
    );

    // HTA Tree Tools
    this.toolRegistry.register(
      'build_hta_tree',
      args =>
        this.forestServer.buildHTATree(
          args.path_name,
          args.learning_style || 'mixed',
          args.focus_areas || []
        ),
      'hta'
    );
    this.toolRegistry.register('get_hta_status', () => this.forestServer.getHTAStatus(), 'hta');

    // Scheduling Tools
    this.toolRegistry.register(
      'generate_daily_schedule',
      args =>
        this.forestServer.generateDailySchedule(
          args.date || null,
          args.energy_level ?? 3,
          args.available_hours || null,
          args.focus_type || 'mixed',
          args.schedule_request_context || 'User requested schedule'
        ),
      'scheduling'
    );
    this.toolRegistry.register(
      'generate_integrated_schedule',
      args =>
        this.forestServer.generateIntegratedSchedule(args.date || null, args.energy_level || 3),
      'scheduling'
    );

    // Task Management Tools
    this.toolRegistry.register(
      'get_next_task',
      args =>
        this.forestServer.getNextTask(
          args.context_from_memory || '',
          args.energy_level || 3,
          args.time_available || '30 minutes'
        ),
      'tasks'
    );
    this.toolRegistry.register(
      'complete_block',
      args => this.forestServer.completeBlock(args),
      'tasks'
    );
    this.toolRegistry.register(
      'complete_with_opportunities',
      args =>
        this.forestServer.completeBlock({
          ...args,
          opportunityContext: {
            engagementLevel: args.engagement_level || 5,
            unexpectedResults: args.unexpected_results || [],
            newSkillsRevealed: args.new_skills_revealed || [],
            externalFeedback: args.external_feedback || [],
            socialReactions: args.social_reactions || [],
            viralPotential: args.viral_potential || false,
            industryConnections: args.industry_connections || [],
            serendipitousEvents: args.serendipitous_events || [],
          },
        }),
      'tasks'
    );
    this.toolRegistry.register(
      'complete_block_and_next',
      async args => {
        const completion = await this.forestServer.completeBlock(args);
        // CRITICAL FIX: Pass completion context for momentum building
        const momentumContext = args.breakthrough
          ? `BREAKTHROUGH_CONTEXT: Task completed with breakthrough. Outcome: ${args.outcome}. Learned: ${args.learned || 'Key insights gained'}. Ready for advanced momentum building.`
          : `Task completed. Outcome: ${args.outcome}. ${args.learned ? `Learned: ${args.learned}.` : ''} Looking for momentum building opportunities.`;

        const next = await this.forestServer.getNextTask(
          momentumContext,
          args.energy_level || 3,
          '30 minutes'
        );
        return { ...completion, next_task: next };
      },
      'tasks'
    );

    // Strategy Tools
    this.toolRegistry.register(
      'evolve_strategy',
      args => this.forestServer.evolveStrategy(args.feedback || ''),
      'strategy'
    );
    this.toolRegistry.register(
      'current_status',
      () => this.forestServer.currentStatus(),
      'strategy'
    );

    // Analysis Tools
    this.toolRegistry.register(
      'analyze_performance',
      () => this.forestServer.analyzePerformance(),
      'analytics'
    );
    this.toolRegistry.register(
      'analyze_reasoning',
      args => this.forestServer.analyzeReasoning(args.include_detailed_analysis ?? true),
      'analytics'
    );
    this.toolRegistry.register(
      'analyze_complexity_evolution',
      () => this.forestServer.analyzeComplexityEvolution(),
      'analytics'
    );
    this.toolRegistry.register(
      'analyze_identity_transformation',
      () => this.forestServer.analyzeIdentityTransformation(),
      'analytics'
    );
    this.toolRegistry.register('review_week', () => this.forestServer.reviewPeriod(7), 'analytics');
    this.toolRegistry.register(
      'review_month',
      () => this.forestServer.reviewPeriod(30),
      'analytics'
    );

    // Export Tools
    this.toolRegistry.register(
      'generate_tiimo_export',
      args => this.forestServer.generateTiimoExport(args.include_breaks ?? true),
      'export'
    );

    // Memory Integration Tools
    this.toolRegistry.register(
      'sync_forest_memory',
      () => this.forestServer.syncForestMemory(),
      'memory'
    );

    // Learning Path Tools
    this.toolRegistry.register(
      'focus_learning_path',
      args =>
        this.forestServer.focusLearningPath(args.path_name, args.duration || 'until next switch'),
      'learning'
    );
    this.toolRegistry.register(
      'list_learning_paths',
      () => this.forestServer.listLearningPaths(),
      'learning'
    );

    // Debug Tools
    this.toolRegistry.register(
      'debug_health_check',
      () => this.forestServer.debugCommands.healthCheck(),
      'debug'
    );
    this.toolRegistry.register(
      'debug_trace_task',
      args => this.forestServer.debugCommands.traceTask(args.project_id || null),
      'debug'
    );
    this.toolRegistry.register(
      'debug_validate',
      () => this.forestServer.debugCommands.validateCurrent(),
      'debug'
    );
    this.toolRegistry.register(
      'debug_export',
      () => this.forestServer.debugCommands.exportLogs(),
      'debug'
    );
    this.toolRegistry.register(
      'debug_summary',
      () => this.forestServer.debugCommands.getSummary(),
      'debug'
    );
    this.toolRegistry.register(
      'debug_task_sequence',
      () => this.forestServer.debugTaskSequence(),
      'debug'
    );
    this.toolRegistry.register(
      'repair_sequence',
      args => this.forestServer.repairSequence(args.force_rebuild || false),
      'debug'
    );

    // Claude Integration Tools
    const truthfulHandler = args => this.forestServer.askTruthfulClaude(args.prompt);
    this.toolRegistry.register('ask_truthful', truthfulHandler, 'claude');
    this.toolRegistry.register('ask_truthful_claude', truthfulHandler, 'claude');
    this.toolRegistry.register('mcp_forest_ask_truthful', truthfulHandler, 'claude');
    this.toolRegistry.register('mcp_forest_ask_truthful_claude', truthfulHandler, 'claude');
    this.toolRegistry.register(
      'request_claude_generation',
      args =>
        this.forestServer.requestClaudeGeneration(
          args.prompt,
          args.generation_type || 'tasks',
          args.context || {}
        ),
      'claude'
    );

    // HTA Task Generation Tools
    this.toolRegistry.register(
      'generate_hta_tasks',
      args => this.forestServer.storeGeneratedTasks(args.branch_tasks),
      'hta'
    );
    this.toolRegistry.register(
      'get_generation_history',
      args => this.forestServer.getGenerationHistory(args.limit || 10),
      'hta'
    );
  }

  setupRouter() {
    const isTerminal = process.stdin.isTTY;
          logger.event('TOOL_ROUTER_SETUP_START');

      if (isTerminal) {
        console.error('🔧 DEBUG: ToolRouter setupRouter() called with TRUTHFUL VERIFICATION');
      }

      logger.event('SETTING_CALL_TOOL_HANDLER');
      this.server.setRequestHandler(CallToolRequestSchema, async request => {
        logger.event('CALL_TOOL_REQUEST_RECEIVED', { tool: request.params.name });
      const { name: toolName, arguments: args } = request.params;

      if (isTerminal) {
        console.error(`▶️ Executing tool: ${toolName}`);
      }

              try {
          // Step 1: Execute the tool as normal.
          logger.event('DISPATCHING_TOOL', { tool: toolName });
          const timerLabel = `TOOL_DISPATCH_${toolName}`;
          logger.startTimer(timerLabel);
          const originalResult = await this.dispatchTool(toolName, args);
          logger.endTimer(timerLabel, { tool: toolName });
          logger.event('TOOL_DISPATCH_COMPLETE', { tool: toolName });

        // SIMPLIFIED: Return definitive tool response
        // Tools should provide trustworthy responses the first time
        // No post-hoc critique that makes output unreliable by design
        return originalResult;
      } catch (error) {
        logger.error('TOOL_EXECUTION_ERROR', {
          tool: toolName,
          error: error.message,
          stack: error.stack,
        });
        if (isTerminal) {
          console.error('Tool execution failed:', { toolName, error: error.message });
        }
        throw new Error(`Tool '${toolName}' failed: ${error.message}`, { cause: error });
      }
    });
    logger.event('CALL_TOOL_HANDLER_SET');

    if (isTerminal) {
      console.error('🔧 DEBUG: CallToolRequestSchema handler registration completed');
    }

    logger.event('TOOL_ROUTER_SETUP_COMPLETE');
  }
}
