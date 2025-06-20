/**
 * MCP Handlers Module
 * Contains all MCP tool definitions and handler setup
 */

import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { getForestLogger } from './winston-logger.js';

const logger = getForestLogger({ module: 'MCPHandlers' });

export class McpHandlers {
  constructor(server, forestServer = null) {
    this.server = server;
    this.forestServer = forestServer;
    // Eagerly populate tools for handshake
    const toolDefs = this.getToolDefinitions();
    if (!this.server.capabilities) {
      this.server.capabilities = {};
    }
    this.server.capabilities.tools = Object.fromEntries(toolDefs.map(t => [t.name, t]));
  }

  async setupHandlers() {
    logger.event('MCP_HANDLERS_SETUP_START');

    // Add initialize handler debugging - this might be the issue
    logger.event('CHECKING_INITIALIZE_HANDLER');
    try {
      // The MCP SDK should handle initialize automatically, but let's debug it
      this.server.onRequest = new Proxy(this.server.onRequest || (() => {}), {
        apply(target, thisArg, argumentsList) {
          const [method, params] = argumentsList;
          logger.event('MCP_REQUEST_RECEIVED', { method, hasParams: !!params });
          if (method === 'initialize') {
            logger.event('INITIALIZE_REQUEST_PROCESSING', params);
          }
          return target.apply(thisArg, argumentsList);
        },
      });
    } catch (error) {
      logger.error('INITIALIZE_HANDLER_DEBUG_ERROR', {
        error: error.message,
        stack: error.stack,
      });
    }

    logger.event('SETTING_LIST_TOOLS_HANDLER');
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.event('LIST_TOOLS_REQUEST_RECEIVED');
      // Define the full list once so we can also publish it through the initial
      // MCP capabilities handshake (Cursor shows 0 tools if we don't do this).
      const toolDefs = this.getToolDefinitions();
      logger.event('TOOL_DEFINITIONS_RETRIEVED', { count: toolDefs.length });

      // Expose tools in the handshake exactly once (before the transport
      // connects, constructor already ran `setupHandlers`).
      if (Object.keys(this.server.capabilities.tools).length === 0) {
        this.server.capabilities.tools = Object.fromEntries(toolDefs.map(t => [t.name, t]));
      }

      return { tools: toolDefs };
    });

    // ------------------------------------------------------------------
    // Graceful fallback handlers for legacy/optional client probes
    // Many client integrations periodically call `resources/list` and
    // `prompts/list`.  These methods are *not* core to Forest, but if we
    // don't provide a handler the SDK returns "Method not found" (-32601)
    // every few minutes, cluttering logs.  We therefore register very
    // lightweight stubs that reply with an empty list.  This keeps the
    // server stateless and domain-agnostic while eliminating noisy errors.
    // ------------------------------------------------------------------
    // Register capabilities through official API so internal _capabilities map is updated before handlers are set
    this.server.registerCapabilities({ resources: {}, prompts: {} });

    // Build minimal Zod schemas for legacy probes so setRequestHandler accepts them
    const makeEmptyRequestSchema = async methodName => {
      const { z } = await import('zod');
      return z.object({
        jsonrpc: z.literal('2.0').optional(),
        method: z.literal(methodName),
        params: z.any().optional(),
        id: z.union([z.number(), z.string()]).optional(),
      });
    };

    try {
      logger.event('SETTING_UP_LEGACY_SCHEMAS');

      logger.event('CREATING_RESOURCES_SCHEMA');
      const resourcesTimer = 'MAKE_RESOURCES_SCHEMA';
      logger.startTimer(resourcesTimer);
      const resourcesSchema = await makeEmptyRequestSchema('resources/list');
      logger.endTimer(resourcesTimer);

      logger.event('CREATING_PROMPTS_SCHEMA');
      const promptsTimer = 'MAKE_PROMPTS_SCHEMA';
      logger.startTimer(promptsTimer);
      const promptsSchema = await makeEmptyRequestSchema('prompts/list');
      logger.endTimer(promptsTimer);

      const emptyArrayResponder = key => async () => {
        logger.event('EMPTY_ARRAY_RESPONSE', { key });
        return { [key]: [] };
      };

      logger.event('SETTING_RESOURCES_HANDLER');
      this.server.setRequestHandler(resourcesSchema, emptyArrayResponder('resources'));
      logger.event('SETTING_PROMPTS_HANDLER');
      this.server.setRequestHandler(promptsSchema, emptyArrayResponder('prompts'));
      logger.event('LEGACY_SCHEMAS_COMPLETE');
    } catch (error) {
      logger.error('LEGACY_SCHEMA_ERROR', {
        error: error.message,
        stack: error.stack,
      });
      console.error('Error setting up legacy handler schemas:', error);
      throw error;
    }

    logger.event('MCP_HANDLERS_SETUP_COMPLETE');
  }

  getToolDefinitions() {
    // TRY DYNAMIC GENERATION: Use tool registry if available
    if (
      this.forestServer?.toolRouter?.toolRegistry &&
      typeof this.forestServer.toolRouter.toolRegistry.tools !== 'undefined'
    ) {
      // CONSOLIDATED HIGH-LEVEL TOOLS - Clean, powerful, unambiguous API
      // Replaces 30+ tools with 3 state-aware strategic tools
      logger.event('USING_CONSOLIDATED_TOOL_DEFINITIONS');
      return [
        {
          name: 'build_hta_tree',
          description: 'Analyze goal complexity and trigger deep hierarchical roadmap generation. This creates the complete strategic breakdown for achieving your goal.',
          inputSchema: {
            type: 'object',
            properties: {
              goal: {
                type: 'string',
                description: 'The specific goal to analyze and create a roadmap for'
              },
              learning_style: {
                type: 'string',
                enum: ['visual', 'hands-on', 'analytical', 'social', 'mixed'],
                description: 'Your preferred learning approach'
              },
              focus_areas: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific areas of focus within the goal'
              },
              context: {
                type: 'string',
                description: 'Current situation and constraints'
              }
            },
            required: ['goal']
          }
        },
        {
          name: 'get_next_task',
          description: 'Get the single most logical next task based on hierarchy depth and prerequisite completion. Uses transparent priority system focusing on foundational tasks first.',
          inputSchema: {
            type: 'object',
            properties: {
              energy_level: {
                type: 'number',
                minimum: 1,
                maximum: 5,
                description: 'Current energy level (1=low, 5=high) for task difficulty matching'
              },
              time_available: {
                type: 'string',
                description: 'Available time (e.g. "30 minutes", "2 hours")'
              },
              context_from_memory: {
                type: 'string',
                description: 'Optional context from recent work or insights'
              }
            },
            required: []
          }
        },
        {
          name: 'complete_task',
          description: 'Mark a task as complete and log the outcome. Updates the strategic roadmap and triggers next-step analysis.',
          inputSchema: {
            type: 'object',
            properties: {
              task_id: {
                type: 'string',
                description: 'ID of the completed task'
              },
              outcome: {
                type: 'string',
                enum: ['success', 'partial', 'breakthrough', 'blocked', 'pivot_needed'],
                description: 'How the task went'
              },
              breakthrough: {
                type: 'string',
                description: 'Any breakthrough insights or learning (if applicable)'
              },
              notes: {
                type: 'string',
                description: 'Additional notes about the completion'
              },
              time_spent: {
                type: 'string',
                description: 'Actual time spent on the task'
              }
            },
            required: ['task_id', 'outcome']
          }
        }
      ];
    }

    // Fallback minimal tools if registry unavailable
    logger.event('USING_FALLBACK_MINIMAL_TOOLS');
    return [
      {
        name: 'create_project',
        description:
          'Create comprehensive life orchestration project with detailed personal context',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Unique project identifier (e.g. "dream_project_alpha")',
            },
            goal: {
              type: 'string',
              description: 'Ultimate ambitious goal (what you want to achieve)',
            },
            specific_interests: {
              type: 'array',
              items: { type: 'string' },
              description:
                'Optional: Specific things you want to be able to do (e.g. "play Let It Be on piano", "build a personal website"). Leave empty if you\'re not sure yet - the system will help you discover interests.',
            },
            learning_paths: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  path_name: {
                    type: 'string',
                    description: 'Name of the learning path (e.g. "saxophone", "piano", "theory")',
                  },
                  interests: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Specific interests for this path',
                  },
                  priority: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description: 'Relative priority of this path',
                  },
                },
                required: ['path_name'],
              },
              description:
                'Optional: Define separate learning paths within your goal for isolated focus (e.g. separate piano and saxophone paths)',
            },
            context: {
              type: 'string',
              description: 'Current life situation and why this goal matters now',
            },
            constraints: {
              type: 'object',
              properties: {
                time_constraints: {
                  type: 'string',
                  description: 'Available time slots, busy periods, commitments',
                },
                energy_patterns: {
                  type: 'string',
                  description: 'When you have high/low energy, physical limitations',
                },
                focus_variability: {
                  type: 'string',
                  description:
                    'How your focus and attention vary (e.g. "consistent daily", "varies with interest", "unpredictable energy levels")',
                },
                financial_constraints: {
                  type: 'string',
                  description: 'Budget limitations affecting learning resources',
                },
                location_constraints: {
                  type: 'string',
                  description: 'Home setup, workspace limitations, travel requirements',
                },
              },
            },
            existing_credentials: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  credential_type: {
                    type: 'string',
                    description: 'Degree, certificate, course, etc.',
                  },
                  subject_area: { type: 'string', description: 'What field/subject' },
                  level: {
                    type: 'string',
                    description: 'Beginner, intermediate, advanced, expert',
                  },
                  relevance_to_goal: {
                    type: 'string',
                    description: 'How this relates to your new goal',
                  },
                },
              },
              description: 'All existing education, certificates, and relevant experience',
            },
            current_habits: {
              type: 'object',
              properties: {
                good_habits: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Existing positive habits to maintain/build on',
                },
                bad_habits: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Habits you want to replace or minimize',
                },
                habit_goals: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'New habits you want to build alongside learning',
                },
              },
            },
            life_structure_preferences: {
              type: 'object',
              properties: {
                wake_time: { type: 'string', description: 'Preferred wake time (e.g. "6:00 AM")' },
                sleep_time: {
                  type: 'string',
                  description: 'Preferred sleep time (e.g. "10:30 PM")',
                },
                meal_times: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Preferred meal schedule',
                },
                break_preferences: {
                  type: 'string',
                  description: 'How often and what type of breaks you need',
                },
                focus_duration: {
                  type: 'string',
                  description:
                    'Preferred focus session length (e.g. "25 minutes", "2 hours", "until natural break", "flexible", "variable")',
                },
                transition_time: { type: 'string', description: 'Time needed between activities' },
              },
            },
            urgency_level: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'critical'],
              description: 'How urgently you need to achieve this goal',
            },
            success_metrics: {
              type: 'array',
              items: { type: 'string' },
              description:
                'How you will measure success (income, job offers, portfolio pieces, etc.)',
            },
          },
          required: ['project_id', 'goal', 'life_structure_preferences'],
        },
      },
      {
        name: 'switch_project',
        description: 'Switch to a different project workspace',
        inputSchema: {
          type: 'object',
          properties: {
            project_id: {
              type: 'string',
              description: 'Project to switch to',
            },
          },
          required: ['project_id'],
        },
      },
      {
        name: 'list_projects',
        description: 'Show all project workspaces',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'get_active_project',
        description: 'Show current active project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'build_hta_tree',
        description: 'Build strategic HTA framework for a specific learning path',
        inputSchema: {
          type: 'object',
          properties: {
            path_name: {
              type: 'string',
              description:
                'Learning path to build HTA tree for (e.g. "saxophone", "piano"). If not specified, builds for active path or general project.',
            },
            learning_style: {
              type: 'string',
              description: 'Preferred learning approach (visual, hands-on, research-based, etc.)',
            },
            focus_areas: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific areas to prioritize in the strategy',
            },
          },
        },
      },
      {
        name: 'get_hta_status',
        description: 'View HTA strategic framework for active project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'generate_daily_schedule',
        description:
          'ON-DEMAND: Generate comprehensive gap-free daily schedule when requested by user',
        inputSchema: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              description: 'YYYY-MM-DD, defaults to today',
            },
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Current energy level (affects task difficulty and timing)',
            },
            available_hours: {
              type: 'string',
              description: 'Comma-separated list of hours to prioritize (e.g. "9,10,11,14,15")',
            },
            focus_type: {
              type: 'string',
              enum: ['learning', 'building', 'networking', 'habits', 'mixed'],
              description: 'Type of work to prioritize today',
            },
            schedule_request_context: {
              type: 'string',
              description:
                'User context about why they need a schedule now (e.g. "planning tomorrow", "need structure today")',
            },
          },
        },
      },
      {
        name: 'generate_integrated_schedule',
        description: 'Build a daily schedule that balances tasks across ALL active projects',
        inputSchema: {
          type: 'object',
          properties: {
            date: { type: 'string', description: 'YYYY-MM-DD (defaults to today)' },
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Current energy level 1-5',
            },
          },
        },
      },
      {
        name: 'complete_block',
        description: 'Complete time block and capture insights for active project',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: {
              type: 'string',
            },
            outcome: {
              type: 'string',
              description: 'What happened? Key insights?',
            },
            learned: {
              type: 'string',
              description: 'What specific knowledge or skills did you gain?',
            },
            next_questions: {
              type: 'string',
              description: 'What questions emerged? What do you need to learn next?',
            },
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Energy after completion',
            },
            difficulty_rating: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'How difficult was this task? (1=too easy, 5=too hard)',
            },
            breakthrough: {
              type: 'boolean',
              description: 'Major insight or breakthrough?',
            },
          },
          required: ['block_id', 'outcome', 'energy_level'],
        },
      },
      {
        name: 'complete_with_opportunities',
        description:
          'Complete time block with rich context capture for impossible dream orchestration - use when significant breakthroughs, unexpected results, or external opportunities emerge',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: {
              type: 'string',
              description: 'The block being completed',
            },
            outcome: {
              type: 'string',
              description: 'What happened? Key insights?',
            },
            learned: {
              type: 'string',
              description: 'What specific knowledge or skills did you gain?',
            },
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Energy after completion',
            },
            engagement_level: {
              type: 'number',
              minimum: 1,
              maximum: 10,
              description:
                'How deeply engaged were you? (10 = totally absorbed, lost track of time)',
            },
            unexpected_results: {
              type: 'array',
              items: { type: 'string' },
              description: 'What unexpected things happened or were discovered?',
            },
            new_skills_revealed: {
              type: 'array',
              items: { type: 'string' },
              description: 'What hidden talents or natural abilities did this reveal?',
            },
            external_feedback: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  source: { type: 'string', description: 'Who gave feedback' },
                  content: { type: 'string', description: 'What they said' },
                  sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
                },
              },
              description: 'Any feedback from others about your work',
            },
            social_reactions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Social media reactions, shares, comments, viral moments',
            },
            viral_potential: {
              type: 'boolean',
              description: 'Does this work have viral potential or unusual appeal?',
            },
            industry_connections: {
              type: 'array',
              items: { type: 'string' },
              description: 'Any industry professionals who showed interest or made contact',
            },
            serendipitous_events: {
              type: 'array',
              items: { type: 'string' },
              description: 'Lucky coincidences, chance meetings, unexpected opportunities',
            },
          },
          required: ['block_id', 'outcome', 'energy_level', 'engagement_level'],
        },
      },
      {
        name: 'current_status',
        description: 'Show todays progress and next action for active project',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      {
        name: 'evolve_strategy',
        description: 'Analyze patterns and evolve the approach for active project',
        inputSchema: {
          type: 'object',
          properties: {
            feedback: {
              type: 'string',
              description: "What's working? What's not? What needs to change?",
            },
          },
        },
      },
      {
        name: 'generate_tiimo_export',
        description: "Export today's schedule as Tiimo-compatible markdown",
        inputSchema: {
          type: 'object',
          properties: {
            include_breaks: {
              type: 'boolean',
              default: true,
              description: 'Include break blocks between tasks',
            },
          },
        },
      },
      {
        name: 'analyze_performance',
        description: 'Analyze historical data to discover your personal productivity patterns.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'review_week',
        description: 'Summarize the last 7 days of progress, breakthroughs, and challenges.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'review_month',
        description: 'Provide a high-level monthly report of your progress towards the North Star.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_next_task',
        description: 'Get the single most logical next task based on current progress and context',
        inputSchema: {
          type: 'object',
          properties: {
            context_from_memory: {
              type: 'string',
              description:
                'Optional context retrieved from Memory MCP about recent progress/insights',
            },
            energy_level: {
              type: 'number',
              minimum: 1,
              maximum: 5,
              description: 'Current energy level to match appropriate task difficulty',
            },
            time_available: {
              type: 'string',
              description: 'Time available for the task (e.g. "30 minutes", "1 hour")',
            },
          },
        },
      },
      {
        name: 'sync_forest_memory',
        description: 'Sync current Forest state to memory for context awareness',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'debug_task_sequence',
        description: 'Debug task sequencing issues - shows prerequisite chains and task states',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'repair_sequence',
        description:
          'Fix broken task sequencing by rebuilding the frontier with proper dependencies',
        inputSchema: {
          type: 'object',
          properties: {
            force_rebuild: {
              type: 'boolean',
              description: 'Completely rebuild the task sequence from scratch',
            },
          },
        },
      },
      {
        name: 'focus_learning_path',
        description:
          'Set focus to a specific learning path within the project (e.g. "saxophone", "piano", "theory")',
        inputSchema: {
          type: 'object',
          properties: {
            path_name: {
              type: 'string',
              description:
                'Name of the learning path to focus on (e.g. "saxophone", "piano", "web development")',
            },
            duration: {
              type: 'string',
              description:
                'How long to focus on this path (e.g. "today", "this week", "until next switch")',
            },
          },
          required: ['path_name'],
        },
      },
      {
        name: 'analyze_complexity_evolution',
        description:
          'Analyze the current complexity tier and scaling opportunities for infinite growth potential',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'analyze_identity_transformation',
        description:
          'Analyze current identity and generate micro-shifts toward target professional identity',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'list_learning_paths',
        description: 'Show all available learning paths in the current project',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'analyze_reasoning',
        description: 'Generate logical deductions and strategic insights from completion patterns',
        inputSchema: {
          type: 'object',
          properties: {
            include_detailed_analysis: {
              type: 'boolean',
              default: true,
              description: 'Include detailed logical chains and pattern analysis',
            },
          },
        },
      },
      {
        name: 'ask_truthful',
        description:
          'Ask Claude to answer as truthfully, honestly, and non-sycophantically as possible. Returns both the answer and a self-critique.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The user question or prompt.' },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'ask_truthful_claude',
        description: 'Alias for ask_truthful – returns truthful answer and self-critique.',
        inputSchema: {
          type: 'object',
          properties: {
            prompt: { type: 'string', description: 'The user question or prompt.' },
          },
          required: ['prompt'],
        },
      },
      {
        name: 'generate_hta_tasks',
        description: 'Store Claude-generated tasks in specific HTA branches',
        inputSchema: {
          type: 'object',
          properties: {
            branch_tasks: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  branch_name: { type: 'string' },
                  tasks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        title: { type: 'string' },
                        description: { type: 'string' },
                        difficulty: { type: 'number' },
                        duration: { type: 'number' },
                        prerequisites: { type: 'array', items: { type: 'string' } },
                      },
                      required: ['title'],
                    },
                  },
                },
                required: ['branch_name', 'tasks'],
              },
            },
          },
          required: ['branch_tasks'],
        },
      },
      {
        name: 'get_generation_history',
        description: 'Retrieve collaborative task generation history for active project',
        inputSchema: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10 },
          },
        },
      },
      {
        name: 'complete_block_and_next',
        description: 'Complete a block and immediately retrieve the next optimal task in one step',
        inputSchema: {
          type: 'object',
          properties: {
            block_id: { type: 'string' },
            outcome: { type: 'string', description: 'What happened? Key insights?' },
            learned: {
              type: 'string',
              description: 'What specific knowledge or skills did you gain?',
            },
            next_questions: { type: 'string', description: 'Questions that emerged' },
            energy_level: { type: 'number', minimum: 1, maximum: 5 },
            difficulty_rating: { type: 'number', minimum: 1, maximum: 5 },
            breakthrough: { type: 'boolean' },
          },
          required: ['block_id', 'outcome', 'energy_level'],
        },
      },
    ];
  }

  // Helper method to generate tool descriptions based on tool name and category
  getToolDescription(toolName, category) {
    const descriptions = {
      // Project management
      create_project:
        'Create comprehensive life orchestration project with detailed personal context',
      switch_project: 'Switch to a different project workspace',
      list_projects: 'Show all project workspaces',
      get_active_project: 'Show current active project',

      // HTA Tree
      build_hta_tree: 'Build strategic HTA framework for a specific learning path',
      get_hta_status: 'View HTA strategic framework for active project',

      // Scheduling
      generate_daily_schedule: 'Generate intelligent daily schedule based on context and energy',
      generate_integrated_schedule:
        'Generate an integrated daily schedule using the new task pool system',

      // Task management
      get_next_task: 'Get the single most logical next task based on current progress and context',
      complete_block: 'Complete a scheduled task block with outcome and learning insights',
      complete_with_opportunities: 'Complete a task block with opportunity recognition',
      complete_block_and_next: 'Complete a block and immediately retrieve the next optimal task',

      // Strategy
      evolve_strategy: 'Evolve and adapt learning strategy based on completion feedback',
      current_status: 'Get comprehensive overview of current project status and progress',

      // Analytics
      analyze_performance: 'Analyze historical data to discover productivity patterns',
      analyze_reasoning:
        'Generate logical deductions and strategic insights from completion patterns',
      analyze_complexity_evolution: 'Analyze current complexity tier and scaling opportunities',
      analyze_identity_transformation:
        'Analyze current identity and generate micro-shifts toward target professional identity',
      review_week: 'Summarize the last 7 days of progress, breakthroughs, and challenges',
      review_month: 'Provide a high-level monthly report of progress',

      // Learning paths
      focus_learning_path: 'Set focus to a specific learning path within the project',
      list_learning_paths: 'Show all available learning paths in the current project',

      // Memory
      sync_forest_memory: 'Sync current Forest state to memory for context awareness',

      // Debug
      debug_health_check: 'Check Forest system health and MCP connections',
      debug_trace_task: 'Trace task generation process for debugging',
      debug_validate: 'Validate current project schema and data integrity',
      debug_export: 'Export all debug logs and data to file',
      debug_summary: 'Get debug summary and system overview',
      debug_task_sequence: 'Debug task sequencing issues',
      repair_sequence: 'Fix broken task sequencing by rebuilding the frontier',

      // Claude integration
      ask_truthful: 'Ask Claude to answer as truthfully and honestly as possible',
      ask_truthful_claude: 'Alias for ask_truthful – returns truthful answer and self-critique',
      mcp_forest_ask_truthful: 'Ask Claude truthfully via MCP Forest integration',
      mcp_forest_ask_truthful_claude: 'Ask Claude truthfully via MCP Forest integration (alias)',
      request_claude_generation: 'Request Claude to generate content or answer questions',

      // HTA generation
      generate_hta_tasks: 'Store Claude-generated tasks in specific HTA branches',
      get_generation_history: 'Retrieve collaborative task generation history',

      // Export
      generate_tiimo_export: 'Export schedule data in Tiimo-compatible format',
    };

    return descriptions[toolName] || `${category} tool: ${toolName}`;
  }

  // Helper method to generate input schema based on tool name
  getToolInputSchema(toolName) {
    const schemas = {
      create_project: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Unique project identifier' },
          goal: { type: 'string', description: 'Ultimate ambitious goal' },
          context: {
            type: 'string',
            description: 'Current life situation and why this goal matters now',
          },
        },
        required: ['project_id', 'goal'],
      },
      switch_project: {
        type: 'object',
        properties: {
          project_id: { type: 'string', description: 'Project to switch to' },
        },
        required: ['project_id'],
      },
      build_hta_tree: {
        type: 'object',
        properties: {
          path_name: { type: 'string', description: 'Learning path to build HTA tree for' },
          learning_style: { type: 'string', description: 'Preferred learning approach' },
          focus_areas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Specific areas to prioritize',
          },
        },
      },
      get_next_task: {
        type: 'object',
        properties: {
          context_from_memory: { type: 'string', description: 'Optional context from memory' },
          energy_level: {
            type: 'number',
            minimum: 1,
            maximum: 5,
            description: 'Current energy level',
          },
          time_available: { type: 'string', description: 'Time available for the task' },
        },
      },
      complete_block: {
        type: 'object',
        properties: {
          block_id: { type: 'string', description: 'Block identifier' },
          outcome: { type: 'string', description: 'What happened and key insights' },
          learned: { type: 'string', description: 'Specific knowledge or skills gained' },
          energy_level: { type: 'number', minimum: 1, maximum: 5 },
          difficulty_rating: { type: 'number', minimum: 1, maximum: 5 },
        },
        required: ['block_id', 'outcome', 'energy_level'],
      },
      ask_truthful: {
        type: 'object',
        properties: {
          prompt: { type: 'string', description: 'The question or prompt' },
        },
        required: ['prompt'],
      },
    };

    // Default schema for tools without specific schemas
    return (
      schemas[toolName] || {
        type: 'object',
        properties: {},
        required: [],
      }
    );
  }
}
