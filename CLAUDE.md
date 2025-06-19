# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Forest MCP Server - a **Impossible Dream Orchestration Engine** that builds bridges across any chasm between current reality and ambitious dreams. It uses dynamic dependency tracking, opportunity emergence detection, and adaptive path discovery to orchestrate transformations that couldn't be pre-planned (like janitor → Grammy winner).

## Core Architecture

### Forest Server (`server.js`)
- **Main Class**: `ForestServer` - handles all MCP tool implementations
- **Data Management**: JSON-based persistence in `~/.forest-data/` (configurable via `FOREST_DATA_DIR`)
- **Project Structure**: Each project gets its own directory with separate files for configuration, HTA trees, daily schedules, and learning history
- **Memory Integration**: Designed to sync with memory MCP servers for context awareness

### Key Data Files per Project
- `config.json` - Project settings, goals, schedule, progress tracking
- `hta.json` - Hierarchical Task Analysis tree with strategic branches and frontier nodes
- `day_YYYY-MM-DD.json` - Daily schedules with time blocks and completion tracking
- `learning_history.json` - Completed topics, skill levels, knowledge gaps, insights

### HTA System Architecture
The system uses a sophisticated task sequencing approach:
- **Strategic Branches**: High-level areas (e.g., "Marketing Fundamentals", "Digital Channels")
- **Frontier Nodes**: Ready-to-execute tasks with prerequisites, learning outcomes, and difficulty ratings
- **Adaptive Sequencing**: Tasks dynamically generated based on user progress and feedback
- **Knowledge Tracking**: Maintains user skill levels and adjusts task difficulty accordingly

## Development Commands

### Testing
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Running the Server
The server is designed to run as an MCP server via stdio transport:
```bash
node server.js
```

## Key Implementation Patterns

### Tool Handler Architecture
- All MCP tools are registered in `setupHandlers()` method
- Each tool maps to a corresponding method in the ForestServer class
- Error handling is centralized with detailed logging to `error.log`

### Data Persistence Strategy
- Hierarchical JSON storage: global config + per-project directories
- Graceful error handling with fallback to default values
- Automatic directory creation via `{ recursive: true }`

### Time Management
- Custom time parsing/formatting for 12-hour format with AM/PM
- Minute-based internal representation for scheduling calculations
- Dynamic block duration based on task complexity and user energy levels

### Intelligence Features
- **Performance Analytics**: Tracks completion rates, energy levels, difficulty ratings
- **Adaptive Difficulty**: Adjusts task complexity based on user feedback
- **Learning Sequencing**: Prerequisites system ensures proper knowledge building
- **Memory Integration**: Syncs active state for context-aware recommendations

## Common Development Patterns

### Adding New Tools
1. Add tool definition to `ListToolsRequestSchema` handler
2. Add case to `CallToolRequestSchema` handler switch statement
3. Implement method in ForestServer class
4. Follow error handling pattern with try/catch and detailed logging

### Data Loading Pattern
```javascript
const data = await this.loadProjectData(projectId, 'filename.json') || defaultValue;
```

### Project Requirement Pattern
```javascript
const projectId = await this.requireActiveProject();
```

### Memory Sync Pattern
```javascript
const memoryData = await this.syncActiveProjectToMemory(projectId);
// Include in response for external memory system integration
```

## Error Handling

The system includes comprehensive error logging via `logError()` method that captures:
- Operation context
- Error messages and stack traces
- Additional context data
- Timestamp for debugging

## Dependencies

- `@modelcontextprotocol/sdk` - MCP server framework
- Standard Node.js modules: `fs/promises`, `path`, `os`
- Development: `eslint`, `jest`, `@babel/preset-env`

## Core Workflow for Claude Desktop

The Forest MCP Server is designed for a specific workflow in Claude Desktop using multiple MCP servers:

### Primary Workflow Pattern
1. **Project Creation**: User creates a project with `create_project`, providing their goal, current knowledge level, and constraints
2. **HTA Tree Building**: `build_hta_tree` creates a strategic learning framework with sequential tasks
3. **Flexible Learning Options**: 
   - **Individual Tasks**: Claude calls `get_next_task` for single task recommendations
   - **Full Day Planning**: User requests `generate_daily_schedule` when they want comprehensive daily structure
   - **Progress Tracking**: Claude calls `complete_block` with outcomes and reflections
   - **System Evolution**: HTA tree automatically evolves based on learning progress
4. **Memory Integration**: Each operation syncs state to Memory MCP for context continuity

### Key Tools for Sequencing

#### `get_next_task`
**Purpose**: Returns the single most logical next task based on current progress
**Key Features**:
- Intelligent prerequisite checking using task IDs
- Adaptive difficulty based on energy level and time available
- Context-aware selection using Memory MCP input
- Automatic task generation when frontier is empty
**Usage**: Primary tool for individual task recommendations

#### `generate_daily_schedule` 
**Purpose**: ON-DEMAND creation of comprehensive gap-free daily schedules
**Key Features**:
- Creates complete daily structure from wake to sleep
- Integrates learning tasks with habit building and life constraints
- Adapts to user's energy patterns and available time slots
- Includes meals, breaks, transitions, and buffer time
- Respects personal challenges and constraints
**Usage**: Called when user wants full daily orchestration

#### `complete_block` 
**Purpose**: Mark task completion and capture learning insights
**Key Features**:
- Updates learning history with what was learned and questions raised
- Evolves HTA tree by adding follow-up tasks based on insights
- Adjusts difficulty of remaining tasks based on feedback

#### `complete_with_opportunities` ⭐ **NEW: Impossible Dream Orchestration**
**Purpose**: Enhanced completion that captures rich context for opportunity detection
**Key Features**:
- **Engagement Level Tracking**: Detects when user is highly engaged (natural talent indicators)
- **Unexpected Results Capture**: Documents serendipitous discoveries and surprises
- **New Skills Revelation**: Tracks hidden talents that emerge during tasks
- **External Feedback Integration**: Captures reactions from others, viral moments, industry interest
- **Dynamic Dependency Invalidation**: Removes tasks that become unnecessary due to discoveries
- **Emergent Opportunity Generation**: Creates new tasks based on breakthroughs and external interest
**Usage**: Use when significant breakthroughs, viral moments, or external opportunities emerge

## 🌉 IMPOSSIBLE DREAM ORCHESTRATION

### The Vision System
Forest Server can orchestrate **impossible transformations** like janitor → Grammy winner by:

1. **Dynamic Dependency Tracking**
   - Task completion reveals new possible futures
   - Each success invalidates unnecessary preparation steps
   - Opportunities emerge that couldn't be pre-planned

2. **Opportunity Emergence Detection**
   - High engagement (≥8/10) triggers breakthrough amplification tasks
   - External feedback creates networking and amplification opportunities  
   - Viral potential generates momentum-riding strategies
   - Industry connections activate professional pathway tasks

3. **Adaptive Path Discovery**
   - Traditional path: Learn theory → Practice → Submit → Get rejected
   - Forest path: Hum while working → Goes viral → Producer notices → Grammy winner
   - **The system builds bridges through authentic momentum, not forced logic**

### Real-World Pathway Example
```
Week 1: "Hum while cleaning" (5 min task)
→ High engagement detected (9/10) + Natural rhythm revealed
→ System generates: "Record humming" + "Explore rhythm further"

Week 10: Recording goes viral as "working person's anthem"  
→ Viral potential detected + Producer feedback captured
→ System invalidates: Local networking tasks (bypassed by viral reach)
→ System generates: "Collaborate with interested producer" + "Leverage viral momentum"

Week 50: Collaboration becomes "Working Class Music" movement
→ Industry connections + Social impact detected
→ System generates: "Position for social impact Grammy category"

Week 1205: Wins Grammy in category that didn't exist when started
```

### Context Capture for Orchestration

**Standard Completion**: Basic task tracking
**Orchestration Completion**: Rich context that reveals new possibilities:
- `engagement_level`: 1-10 (8+ triggers breakthrough detection)
- `unexpected_results`: Array of surprising discoveries
- `new_skills_revealed`: Hidden talents that emerged
- `external_feedback`: Reactions from others
- `viral_potential`: Content with unusual appeal
- `industry_connections`: Professional interest
- `serendipitous_events`: Lucky coincidences and opportunities

## 🚀 INFINITE SCALING COMPLEXITY ENGINE

### **The Revolutionary Capability**
Forest automatically detects when users are ready for higher complexity and seamlessly scales task orchestration from individual to enterprise level **without ever feeling like they outgrew the tool**.

### **Complexity Tiers (Auto-Detected)**
- **🌱 INDIVIDUAL**: Personal learning and skill building
- **🤝 COORDINATION**: Basic coordination and simple financial tracking  
- **📊 MANAGEMENT**: Multi-domain management and team coordination
- **🎯 STRATEGIC**: Strategic operations and market positioning
- **🏢 ENTERPRISE**: Full enterprise complexity orchestration

### **Pattern Recognition (Domain-Agnostic)**
The system detects complexity indicators across all domains:
- **Financial tracking**: `$100 → $1K → $10K → $1M` revenue mentions
- **People coordination**: `collaborate → team → hire → manage staff`
- **Time horizons**: `daily → weekly → quarterly → annual` planning
- **Decision weight**: `choose → strategy → invest → acquire`
- **Strategic thinking**: `market → competition → industry → scale`

### **Automatic Task Scaling**
**Week 1**: "Research competitor pricing" (20 min)
**Year 3**: "Negotiate Series B funding" (3-day strategic operation)
**Same system. Same perfect guidance. Infinite complexity.**

### **Key Tools for Infinite Scaling**
- `analyze_complexity_evolution`: Shows current tier and scaling opportunities
- `generateComplexityAppropriateTask()`: Auto-generates tasks at correct complexity level
- Enhanced `complete_with_opportunities`: Captures context that triggers scaling
- Syncs progress to Memory MCP
**Usage**: Called after each task completion with reflections

#### Memory Integration Pattern
```javascript
// Claude Desktop workflow options:

// OPTION 1: Individual Task Flow
1. Query Memory MCP for recent context
2. Call get_next_task with memory context
3. User completes task
4. Call complete_block with outcomes
5. Memory MCP automatically receives updated state

// OPTION 2: Full Day Planning Flow  
1. Query Memory MCP for recent context
2. User requests daily schedule ("I need to plan my day")
3. Claude calls generate_daily_schedule with context
4. User works through schedule blocks
5. Call complete_block for each activity
6. Memory MCP tracks all progress
```

## Advanced Features

### Anti-Overwhelm Learning Architecture
The system prevents the "piano learning trap" through adaptive starting points based on your clarity:

**When You Know What You Want:**
- **Interest-Driven Path**: Start with specific goals (e.g. "play Let It Be", "build a personal website")
- **Quick Start Approach**: Jump into your interests immediately, learn prerequisites as needed
- **Interest Tasks Score 300 points** vs fundamentals (200 points)

**When You're Not Sure Where to Start:**
- **Gentle Exploration Path**: "Explore: What's Possible in [goal]" (magnitude 5 - very easy)
- **Low-Pressure Sampling**: "Sample: Try Something Small" to discover what resonates
- **Discovery Tasks Score 250 points** - prioritized over abstract fundamentals
- **Fundamentals Available**: Always there when you're ready, but not forced as starting point

### Intelligent Task Sequencing
- **Prerequisites**: Tasks use ID-based dependencies, not string matching
- **Adaptive Generation**: System generates new tasks based on knowledge gaps and interests
- **Domain Agnostic**: Works for any learning goal (marketing, programming, design, etc.)
- **Difficulty Adjustment**: Tasks adapt based on user feedback and performance

### Adaptive Focus Duration Support
The system accommodates natural human attention variability rather than enforcing rigid time limits:
- **Natural Flow States**: "As long as needed", "Until natural stopping point"
- **Variable Capacity**: "30-60 minutes", "1-3 hours" for days when focus fluctuates
- **Deep Work Sessions**: "2-4 hours" for extended concentrated work
- **Structured Intervals**: "25 minutes", "1 hour" for those who prefer clear boundaries
- **Completely Flexible**: System defaults to adaptive timing if no preference specified
- **Energy-Responsive**: Task duration suggestions adapt to reported energy levels

### Learning History Tracking
- **Completed Topics**: Full history of what's been learned with difficulty ratings
- **Knowledge Gaps**: Questions and areas identified for future exploration  
- **Skill Progression**: Automatic knowledge level tracking
- **Breakthrough Detection**: Special handling for major insights

### Memory MCP Integration
- **Rich Context**: Exports comprehensive learning state including recent progress, gaps, and trends
- **Suggested Queries**: Provides Memory MCP query suggestions for Claude Desktop
- **Bidirectional**: System can receive memory context to influence task selection

## Configuration

### Environment Variables
- `FOREST_DATA_DIR` - Custom data directory (defaults to `~/.forest-data`)

### Data Directory Structure
```
forest-data/
├── config.json (global projects list and active project)
├── error.log
└── projects/
    └── {project_id}/
        ├── config.json (project settings, learning paths)
        ├── hta.json (legacy - general HTA tree)
        ├── learning_history.json (legacy - general history)
        ├── day_YYYY-MM-DD.json (daily schedules)
        └── paths/
            ├── saxophone/
            │   ├── hta.json (saxophone-specific HTA tree)
            │   ├── learning_history.json (saxophone progress)
            │   └── day_YYYY-MM-DD.json (saxophone daily schedules)
            ├── piano/
            │   ├── hta.json (piano-specific HTA tree) 
            │   ├── learning_history.json (piano progress)
            │   └── day_YYYY-MM-DD.json (piano daily schedules)
            └── theory/
                ├── hta.json (theory-specific HTA tree)
                └── learning_history.json (theory progress)
```

## Scheduling Workflow

### When to Use Individual Tasks vs Full Day Planning

**Use `get_next_task` when:**
- User wants a single focused activity
- Working in short time windows
- Spontaneous learning moments
- Building momentum with quick wins

**Use `generate_daily_schedule` when:**
- User says "plan my day" or "I need structure"
- User wants comprehensive time management
- Beginning a dedicated learning day
- Need to integrate learning with life routines
- Want habit building alongside goal achievement

### Schedule Generation Features
- **No gaps**: Every minute from wake to sleep is purposefully scheduled
- **Life integration**: Includes meals, breaks, habits, and transitions
- **Energy optimization**: Places challenging tasks during high-energy periods
- **Constraint-aware**: Respects personal challenges and limitations
- **Habit building**: Weaves new habits into natural transition times

## Common Workflow Issues

### When get_next_task returns "No more tasks available"
- Prerequisites may not be satisfied - check `complete_block` was called for dependencies
- Use `evolve_strategy` to generate new learning paths
- Check if learning goal has been achieved

### When user wants schedule but none exists
- `current_status` will suggest using `generate_daily_schedule`
- System never auto-generates schedules - always user-requested
- Can generate multiple schedules per day as needs change

### For optimal sequencing
- Always provide memory context from Memory MCP when calling tools
- Capture detailed reflections in `complete_block` - this drives task evolution
- Request new schedules anytime circumstances change
- Use `sync_forest_memory` periodically to ensure Memory MCP has latest state