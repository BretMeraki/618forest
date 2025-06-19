*\#\!/usr/bin/env node*

*/\*\**  
 *\* Forest MCP Server \- Life Orchestration Engine with Project Workspaces*  
 *\* Complete daily optimization with isolated goal contexts*  
 *\*/*

import { Server } from '@modelcontextprotocol/sdk/server/index.js';  
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';  
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';  
import fs from 'fs/promises';  
import path from 'path';

class ForestServer {  
  constructor() {  
    this.server \= new Server(  
      {  
        name: 'forest-server',  
        version: '1.0.0'  
      },  
      {  
        capabilities: {  
          tools: {}  
        }  
      }  
    );  
    this.dataDir \= './forest-data';  
    this.activeProject \= null;  
    this.setupHandlers();  
  }

  **setupHandlers**() {  
    this.server.setRequestHandler(ListToolsRequestSchema, async () \=\> {  
      return {  
        tools: \[  
          {  
            name: 'create\_project',  
            description: 'Create new project workspace for a major life goal',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                project\_id: {  
                  type: 'string',  
                  description: 'Unique project identifier (e.g. "lucasfilm\_producer")'  
                },  
                goal: {  
                  type: 'string',  
                  description: 'Ultimate ambitious goal'  
                },  
                context: {  
                  type: 'string',  
                  description: 'Current situation and why this matters'  
                },  
                wake\_time: {  
                  type: 'string',  
                  description: 'e.g. "6:00 AM"'  
                },  
                sleep\_time: {  
                  type: 'string',  
                  description: 'e.g. "10:30 PM"'  
                }  
              },  
              required: \['project\_id', 'goal', 'wake\_time', 'sleep\_time'\]  
            }  
          },  
          {  
            name: 'switch\_project',  
            description: 'Switch to a different project workspace',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                project\_id: {  
                  type: 'string',  
                  description: 'Project to switch to'  
                }  
              },  
              required: \['project\_id'\]  
            }  
          },  
          {  
            name: 'list\_projects',  
            description: 'Show all project workspaces',  
            inputSchema: {  
              type: 'object',  
              properties: {}  
            }  
          },  
          {  
            name: 'get\_active\_project',  
            description: 'Show current active project',  
            inputSchema: {  
              type: 'object',  
              properties: {}  
            }  
          },  
          {  
            name: 'build\_hta\_tree',  
            description: 'Build strategic HTA framework for active project',  
            inputSchema: {  
              type: 'object',  
              properties: {}  
            }  
          },  
          {  
            name: 'get\_hta\_status',  
            description: 'View HTA strategic framework for active project',  
            inputSchema: {  
              type: 'object',  
              properties: {}  
            }  
          },  
          {  
            name: 'orchestrate\_day',  
            description: 'Generate complete daily schedule for active project',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                date: {  
                  type: 'string',  
                  description: 'YYYY-MM-DD, defaults to today'  
                },  
                energy\_level: {  
                  type: 'number',  
                  minimum: 1,  
                  maximum: 5,  
                  description: 'Desired energy level for the day'  
                },  
                available\_hours: {  
                  type: 'string',  
                  description: 'Comma-separated list of hours to prioritize (e.g. "9,10,11")'  
                }  
              }  
            }  
          },  
          {  
            name: 'complete\_block',  
            description: 'Complete time block and capture insights for active project',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                block\_id: {  
                  type: 'string'  
                },  
                outcome: {  
                  type: 'string',  
                  description: 'What happened? Key insights?'  
                },  
                energy\_level: {  
                  type: 'number',  
                  minimum: 1,  
                  maximum: 5,  
                  description: 'Energy after completion'  
                },  
                breakthrough: {  
                  type: 'boolean',  
                  description: 'Major insight or breakthrough?'  
                }  
              },  
              required: \['block\_id', 'outcome', 'energy\_level'\]  
            }  
          },  
          {  
            name: 'current\_status',  
            description: 'Show today\\'s progress and next action for active project',  
            inputSchema: {  
              type: 'object',  
              properties: {}  
            }  
          },  
          {  
            name: 'evolve\_strategy',  
            description: 'Analyze patterns and evolve the approach for active project',  
            inputSchema: {  
              type: 'object',  
              properties: {}  
            }  
          },  
          {  
            name: 'analyze\_performance',  
            description: 'Analyze historical data to discover your personal productivity patterns.',  
            inputSchema: { type: 'object', properties: {} }  
          },  
          {  
            name: 'review\_week',  
            description: 'Summarize the last 7 days of progress, breakthroughs, and challenges.',  
            inputSchema: { type: 'object', properties: {} }  
          },  
          {  
            name: 'review\_month',  
            description: 'Provide a high-level monthly report of your progress towards the North Star.',  
            inputSchema: { type: 'object', properties: {} }  
          },  
          {  
            name: 'add\_frontier\_node',  
            description: 'Manually add a new task to the strategic HTA frontier.',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                title: { type: 'string', description: 'Title of the new node' },  
                description: { type: 'string', description: 'Description of the task' },  
                branch\_type: { type: 'string', description: 'Branch type (e.g. foundation, network, portfolio, innovation)' },  
                estimated\_time: { type: 'string', description: 'Estimated time (e.g. "30 minutes")' },  
                knowledge\_level: { type: 'string', description: 'Knowledge level (e.g. "beginner", "intermediate", "advanced")' }  
              },  
              required: \['title', 'description', 'branch\_type', 'estimated\_time', 'knowledge\_level'\]  
            }  
          },  
          {  
            name: 'complete\_hta\_branch',  
            description: 'Mark a strategic branch as complete and move to the next phase.',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                branch\_id: { type: 'string', description: 'ID of the branch to complete' }  
              },  
              required: \['branch\_id'\]  
            }  
          },  
          {  
            name: 'archive\_project',  
            description: 'Archive a completed or paused project, removing it from active lists.',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                project\_id: { type: 'string', description: 'Project to archive' }  
              },  
              required: \['project\_id'\]  
            }  
          },  
          {  
            name: 'log\_breakthrough\_to\_memory',  
            description: 'Log a breakthrough as a conversation in the memory server.',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                project\_id: { type: 'string' },  
                insight: { type: 'string' }  
              },  
              required: \['project\_id', 'insight'\]  
            }  
          },  
          {  
            name: 'suggest\_tasks\_from\_memory',  
            description: 'Suggest new tasks for the active project based on memory entities/relations.',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                project\_id: { type: 'string' }  
              },  
              required: \['project\_id'\]  
            }  
          },  
          {  
            name: 'summarize\_progress\_with\_memory',  
            description: 'Summarize project progress, including memory insights.',  
            inputSchema: {  
              type: 'object',  
              properties: {  
                project\_id: { type: 'string' }  
              },  
              required: \['project\_id'\]  
            }  
          }  
        \]  
      };  
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (*request*) \=\> {  
      try {  
        const { name, arguments: args } \= request.params;  
         
        switch (name) {  
          case 'create\_project':  
            return await this.createProject(  
              args.project\_id,  
              args.goal,  
              args.context || '',  
              args.wake\_time,  
              args.sleep\_time  
            );  
          case 'switch\_project':  
            return await this.switchProject(args.project\_id);  
          case 'list\_projects':  
            return await this.listProjects();  
          case 'get\_active\_project':  
            return await this.getActiveProject();  
          case 'build\_hta\_tree':  
            return await this.buildHTATree();  
          case 'get\_hta\_status':  
            return await this.getHTAStatus();  
          case 'orchestrate\_day':  
            return await this.orchestrateDay(args.date || null, args.energy\_level ?? 3, args.available\_hours || null);  
          case 'complete\_block':  
            return await this.completeBlock(  
              args.block\_id,  
              args.outcome,  
              args.energy\_level,  
              args.breakthrough || false  
            );  
          case 'current\_status':  
            return await this.currentStatus();  
          case 'evolve\_strategy':  
            return await this.evolveStrategy();  
          case 'analyze\_performance':  
            return await this.analyzePerformance();  
          case 'review\_week':  
            return await this.reviewPeriod(7);  
          case 'review\_month':  
            return await this.reviewPeriod(30);  
          case 'add\_frontier\_node':  
            return await this.addFrontierNode(args.title, args.description, args.branch\_type, args.estimated\_time, args.knowledge\_level);  
          case 'complete\_hta\_branch':  
            return await this.completeHTABranch(args.branch\_id);  
          case 'archive\_project':  
            return await this.archiveProject(args.project\_id);  
          case 'log\_breakthrough\_to\_memory':  
            return await this.logBreakthroughToMemory(args.project\_id, args.insight);  
          case 'suggest\_tasks\_from\_memory':  
            return await this.suggestTasksFromMemory(args.project\_id);  
          case 'summarize\_progress\_with\_memory':  
            return await this.summarizeProgressWithMemory(args.project\_id);  
          default:  
            throw new Error(\`Unknown tool: ${name}\`);  
        }  
      } catch (error) {  
        return {  
          content: \[  
            {  
              type: 'text',  
              text: \`Error: ${error.message}\`  
            }  
          \]  
        };  
      }  
    });  
  }

  getProjectDir(*projectId*) {  
    return path.join(this.dataDir, 'projects', projectId);  
  }

  async loadProjectData(*projectId*, *filename*) {  
    try {  
      const filePath \= path.join(this.getProjectDir(projectId), filename);  
      const data \= await fs.readFile(filePath, 'utf8');  
      return JSON.parse(data);  
    } catch (error) {  
      return null;  
    }  
  }

  async saveProjectData(*projectId*, *filename*, *data*) {  
    try {  
      const projectDir \= this.getProjectDir(projectId);  
      await fs.mkdir(projectDir, { recursive: true });  
      const filePath \= path.join(projectDir, filename);  
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');  
      return true;  
    } catch (error) {  
      console.error(\`Error saving project data: ${error.message}\`);  
      return false;  
    }  
  }

  async loadGlobalData(*filename*) {  
    try {  
      const filePath \= path.join(this.dataDir, filename);  
      const data \= await fs.readFile(filePath, 'utf8');  
      return JSON.parse(data);  
    } catch (error) {  
      return null;  
    }  
  }

  async saveGlobalData(*filename*, *data*) {  
    try {  
      await fs.mkdir(this.dataDir, { recursive: true });  
      const filePath \= path.join(this.dataDir, filename);  
      await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');  
      return true;  
    } catch (error) {  
      console.error(\`Error saving global data: ${error.message}\`);  
      return false;  
    }  
  }

  generateId() {  
    return Math.random().toString(36).substr(2, 9);  
  }

  getTodayDate() {  
    return new Date().toISOString().split('T')\[0\];  
  }

  parseTime(*timeStr*) {  
    try {  
      const \[time, period\] \= timeStr.split(' ');  
      let \[hours, minutes\] \= time.split(':').map(Number);  
      if (period \=== 'PM' && hours \!== 12) hours \+= 12;  
      if (period \=== 'AM' && hours \=== 12) hours \= 0;  
      return hours \* 60 \+ minutes;  
    } catch (error) {  
      console.error(\`Error parsing time: ${timeStr}\`);  
      return 0;  
    }  
  }

  formatTime(*minutes*) {  
    try {  
      const hours \= Math.floor(minutes / 60);  
      const mins \= minutes % 60;  
      const period \= hours \>= 12 ? 'PM' : 'AM';  
      const displayHours \= hours \=== 0 ? 12 : hours \> 12 ? hours \- 12 : hours;  
      return \`${displayHours}:${mins.toString().padStart(2, '0')} ${period}\`;  
    } catch (error) {  
      console.error(\`Error formatting time: ${minutes}\`);  
      return '12:00 AM';  
    }  
  }

  async createProject(*projectId*, *goal*, *context* \= '', *wakeTime*, *sleepTime*) {  
    if (\!projectId || \!goal || \!wakeTime || \!sleepTime) {  
      throw new Error('Missing required project parameters');  
    }

    const existingProject \= await this.loadProjectData(projectId, 'config.json');  
    if (existingProject) {  
      throw new Error(\`Project "${projectId}" already exists\`);  
    }

    const projectConfig \= {  
      project\_id: projectId,  
      goal: goal,  
      context: context,  
      wake\_time: wakeTime,  
      sleep\_time: sleepTime,  
      wake\_minutes: this.parseTime(wakeTime),  
      sleep\_minutes: this.parseTime(sleepTime),  
      created: new Date().toISOString(),  
      total\_days: 0,  
      breakthroughs: 0  
    };

    const saved \= await this.saveProjectData(projectId, 'config.json', projectConfig);  
    if (\!saved) {  
      throw new Error('Failed to save project configuration');  
    }

    let globalConfig \= await this.loadGlobalData('config.json') || {  
      projects: \[\],  
      active\_project: null  
    };  
     
    if (\!globalConfig.projects.includes(projectId)) {  
      globalConfig.projects.push(projectId);  
    }  
    globalConfig.active\_project \= projectId;  
     
    const globalSaved \= await this.saveGlobalData('config.json', globalConfig);  
    if (\!globalSaved) {  
      throw new Error('Failed to update global configuration');  
    }

    this.activeProject \= projectId;

    const totalHours \= Math.round((projectConfig.sleep\_minutes \- projectConfig.wake\_minutes) / 60);

    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`🌟 Project Created: "${projectId}"\\n\\n🎯 Goal: "${goal}"\\n📍 Context: ${context}\\n⏰ Schedule: ${wakeTime} → ${sleepTime} (${totalHours} hours)\\n\\n✅ Project is now active. Use 'build\_hta\_tree' to create your strategic framework\!\`  
        }  
      \]  
    };  
  }

  async switchProject(*projectId*) {  
    const projectConfig \= await this.loadProjectData(projectId, 'config.json');  
    if (\!projectConfig) {  
      throw new Error(\`Project "${projectId}" not found\`);  
    }

    this.activeProject \= projectId;

    let globalConfig \= await this.loadGlobalData('config.json') || {  
      projects: \[\],  
      active\_project: null  
    };  
    globalConfig.active\_project \= projectId;  
    await this.saveGlobalData('config.json', globalConfig);

    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`🔄 Switched to project: "${projectId}"\\n\\n🎯 Goal: ${projectConfig.goal}\\n📅 Context: ${projectConfig.context}\\n\\nAll actions now focus on this goal. Use 'current\_status' to see today's progress.\`  
        }  
      \]  
    };  
  }

  async listProjects() {  
    const globalConfig \= await this.loadGlobalData('config.json');  
    if (\!globalConfig || \!globalConfig.projects || globalConfig.projects.length \=== 0) {  
      return {  
        content: \[  
          {  
            type: 'text',  
            text: 'No projects created yet. Use create\_project to start your first transformation\!'  
          }  
        \]  
      };  
    }

    const projectList \= \[\];  
    for (const projectId of globalConfig.projects) {  
      const config \= await this.loadProjectData(projectId, 'config.json');  
      if (config) {  
        const isActive \= projectId \=== globalConfig.active\_project ? ' ⭐ ACTIVE' : '';  
        projectList.push(\`• ${projectId}: ${config.goal}${isActive}\`);  
      }  
    }

    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`📁 Your Project Workspaces:\\n\\n${projectList.join('\\n')}\\n\\nUse 'switch\_project' to change focus between goals.\`  
        }  
      \]  
    };  
  }

  async getActiveProject() {  
    const globalConfig \= await this.loadGlobalData('config.json');  
    if (\!globalConfig || \!globalConfig.active\_project) {  
      return {  
        content: \[  
          {  
            type: 'text',  
            text: 'No active project. Use create\_project or switch\_project.'  
          }  
        \]  
      };  
    }

    const projectConfig \= await this.loadProjectData(globalConfig.active\_project, 'config.json');  
    if (\!projectConfig) {  
      return {  
        content: \[  
          {  
            type: 'text',  
            text: 'Active project not found. Use create\_project or switch\_project.'  
          }  
        \]  
      };  
    }

    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`⭐ Active Project: ${globalConfig.active\_project}\\n\\n🎯 Goal: ${projectConfig.goal}\\n📍 Context: ${projectConfig.context}\\n⏰ Schedule: ${projectConfig.wake\_time} → ${projectConfig.sleep\_time}\`  
        }  
      \]  
    };  
  }

  async requireActiveProject() {  
    const globalConfig \= await this.loadGlobalData('config.json');  
    if (\!globalConfig || \!globalConfig.active\_project) {  
      throw new Error('No active project. Use create\_project or switch\_project first.');  
    }  
    this.activeProject \= globalConfig.active\_project;  
    return globalConfig.active\_project;  
  }

  async buildHTATree() {  
    const projectId \= await this.requireActiveProject();  
    const projectConfig \= await this.loadProjectData(projectId, 'config.json');

    if (\!projectConfig) {  
      throw new Error('Project configuration not found');  
    }

    const hta \= {  
      project\_id: projectId,  
      north\_star: projectConfig.goal,  
      context: projectConfig.context,  
      created: new Date().toISOString(),  
       
      branches: \[  
        {  
          id: this.generateId(),  
          title: \`Foundation Skills: ${projectConfig.goal}\`,  
          description: 'Core competencies required',  
          status: 'active',  
          priority: 'high'  
        },  
        {  
          id: this.generateId(),  
          title: \`Network Building: ${projectConfig.goal}\`,  
          description: 'Industry connections and relationships',  
          status: 'active',  
          priority: 'high'  
        },  
        {  
          id: this.generateId(),  
          title: \`Portfolio Development: ${projectConfig.goal}\`,  
          description: 'Demonstrable work and achievements',  
          status: 'active',  
          priority: 'medium'  
        },  
        {  
          id: this.generateId(),  
          title: \`Advanced Positioning: ${projectConfig.goal}\`,  
          description: 'Leadership and strategic opportunities',  
          status: 'future',  
          priority: 'medium'  
        }  
      \],  
       
      frontier\_nodes: this.generateAdaptiveFrontierNodes(projectConfig),  
       
      completed\_nodes: \[\],  
      last\_evolution: new Date().toISOString()  
    };

    const saved \= await this.saveProjectData(projectId, 'hta.json', hta);  
    if (\!saved) {  
      throw new Error('Failed to save HTA tree');  
    }

    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`🌲 HTA Strategic Framework Built for "${projectId}"\!\\n\\n⭐ North Star: ${projectConfig.goal}\\n\\n🌿 Strategic Branches:\\n• Foundation Skills (active)\\n• Network Building (active)\\n• Portfolio Development (active)\\n• Advanced Positioning (future)\\n\\n🎯 Ready Frontier Nodes: ${hta.frontier\_nodes.length}\\n\\nNow use 'orchestrate\_day' to turn strategy into daily action blocks\!\`  
        }  
      \]  
    };  
  }

  generateAdaptiveFrontierNodes(*projectConfig*) {  
    const nodes \= \[  
      {  
        id: this.generateId(),  
        title: 'Research industry landscape',  
        description: \`Understand current state of ${projectConfig.goal} field\`,  
        branch\_type: 'foundation',  
        estimated\_time: '30 minutes',  
        priority: 'high',  
        status: 'ready',  
        knowledge\_level: 'beginner',  
        magnitude: 8  
      },  
      {  
        id: this.generateId(),  
        title: 'Identify key industry players',  
        description: 'Map out important people and companies',  
        branch\_type: 'network',  
        estimated\_time: '25 minutes',  
        priority: 'high',  
        status: 'ready',  
        knowledge\_level: 'beginner',  
        magnitude: 8  
      },  
      {  
        id: this.generateId(),  
        title: 'Create first portfolio piece',  
        description: 'Begin building demonstrable work',  
        branch\_type: 'portfolio',  
        estimated\_time: '45 minutes',  
        priority: 'medium',  
        status: 'ready',  
        knowledge\_level: 'beginner',  
        magnitude: 5  
      }  
    \];

    *// Advanced tasks*  
    nodes.push(  
      {  
        id: this.generateId(),  
        title: 'Identify a unique angle or approach',  
        description: 'Find your differentiator',  
        branch\_type: 'innovation',  
        complexity: 'advanced',  
        estimated\_time: '45 minutes',  
        priority: 'high',  
        status: 'ready',  
        prerequisites: \['domain\_expertise'\],  
        skill\_requirements: { 'analysis': 6, 'creativity': 7 },  
        knowledge\_level: 'intermediate',  
        magnitude: 5  
      },  
      {  
        id: this.generateId(),  
        title: 'Mentor someone newer in the field',  
        description: 'Teaching deepens your own expertise',  
        branch\_type: 'network',  
        complexity: 'advanced',  
        estimated\_time: '40 minutes',  
        priority: 'medium',  
        status: 'ready',  
        prerequisites: \['networking\_experience'\],  
        skill\_requirements: { 'communication': 7, 'leadership': 6 },  
        knowledge\_level: 'intermediate',  
        magnitude: 5  
      }  
    );  
    return nodes;  
  }

  *// Filter and personalize available frontier nodes*  
  filterAvailableFrontierNodes(*nodes*, *skillMap*) {  
    return nodes.filter(*node* \=\> {  
      *// Check prerequisites*  
      if (node.prerequisites && node.prerequisites.length \> 0) {  
        const completedSkills \= Object.keys(skillMap.skills || {});  
        if (\!node.prerequisites.every(*req* \=\> completedSkills.includes(req))) {  
          return false;  
        }  
      }  
      *// Check skill requirements*  
      if (node.skill\_requirements) {  
        for (const \[skill, level\] of Object.entries(node.skill\_requirements)) {  
          if (\!skillMap.skills\[skill\] || skillMap.skills\[skill\].current\_level \< level) {  
            return false;  
          }  
        }  
      }  
      return true;  
    });  
  }

  async getPersonalizedFrontierNodes() {  
    const projectId \= await this.requireActiveProject();  
    const hta \= await this.loadProjectData(projectId, 'hta.json');  
    const skillMap \= await this.loadProjectData(projectId, 'skills.json') || { skills: {} };  
    if (\!hta) return \[\];  
    return this.filterAvailableFrontierNodes(hta.frontier\_nodes, skillMap);  
  }

  async getHTAStatus() {  
    const projectId \= await this.requireActiveProject();  
    const hta \= await this.loadProjectData(projectId, 'hta.json');  
     
    if (\!hta) {  
      return {  
        content: \[  
          {  
            type: 'text',  
            text: 'No HTA tree found for this project. Use build\_hta\_tree first.'  
          }  
        \]  
      };  
    }

    const activeBranches \= hta.branches.filter(*b* \=\> b.status \=== 'active');  
    const readyNodes \= hta.frontier\_nodes.filter(*n* \=\> n.status \=== 'ready');  
     
    const branchStatus \= activeBranches.map(*b* \=\> \`• ${b.title}: ${b.priority} priority\`).join('\\n');  
    const frontierStatus \= readyNodes.map(*n* \=\> \`• ${n.title} (${n.estimated\_time})\`).join('\\n');

    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`🌲 HTA Strategic Status: "${projectId}"\\n\\n⭐ North Star: ${hta.north\_star}\\n\\n🌿 Active Branches (${activeBranches.length}):\\n${branchStatus}\\n\\n🎯 Ready Frontier Nodes (${readyNodes.length}):\\n${frontierStatus}\\n\\n📊 Completed: ${hta.completed\_nodes.length} nodes\\n\\nDaily orchestration draws from these frontier nodes\!\`  
        }  
      \]  
    };  
  }

  async orchestrateDay(*date*, *energy\_level* \= 3, *available\_hours* \= null) {  
    const projectId \= await this.requireActiveProject();  
    const targetDate \= date || this.getTodayDate();  
    const projectConfig \= await this.loadProjectData(projectId, 'config.json');  
    const hta \= await this.loadProjectData(projectId, 'hta.json');  
    const skillMap \= await this.loadProjectData(projectId, 'skills.json') || { skills: {} };  
    if (\!projectConfig) {  
      throw new Error('Project configuration not found');  
    }  
    if (\!hta) {  
      throw new Error('No HTA tree found for this project. Use build\_hta\_tree first.');  
    }  
    *// \--- Performance analytics integration \---*  
    const perfResult \= await this.analyzePerformance();  
    let bestHour \= 9, avgEstimationError \= 30, bestTaskType \= null;  
    if (perfResult && perfResult.content && perfResult.content\[0\] && perfResult.content\[0\].text) {  
      const text \= perfResult.content\[0\].text;  
      const bestHourMatch \= text.match(/Highest energy hour: (\\d\+):00/);  
      if (bestHourMatch) bestHour \= parseInt(bestHourMatch\[1\]);  
      const avgEstimationErrorMatch \= text.match(/Avg estimation error \\(min\\): (\[\\d\\.\]\+)/);  
      if (avgEstimationErrorMatch) avgEstimationError \= parseFloat(avgEstimationErrorMatch\[1\]);  
      const bestTaskTypeMatch \= text.match(/Best task type: (\[^\\n\]\+)/);  
      if (bestTaskTypeMatch) bestTaskType \= bestTaskTypeMatch\[1\].trim();  
    }  
    *// \--- Personalized block generation \---*  
    const userSkillLevel \= projectConfig.skill\_level || 1;  
    const availableNodes \= hta.frontier\_nodes.filter(*node* \=\> {  
      *// Only include tasks at or below user's skill/knowledge level*  
      const nodeLevel \= node.knowledge\_level \=== 'beginner' ? 2 : node.knowledge\_level \=== 'intermediate' ? 6 : 10;  
      return nodeLevel \<= userSkillLevel;  
    });  
    *// Sort nodes: prefer bestTaskType if available*  
    let sortedNodes \= availableNodes;  
    if (bestTaskType) {  
      sortedNodes \= availableNodes.sort((*a*, *b*) \=\> {  
        if (a.strategic\_purpose \=== bestTaskType && b.strategic\_purpose \!== bestTaskType) return \-1;  
        if (b.strategic\_purpose \=== bestTaskType && a.strategic\_purpose \!== bestTaskType) return 1;  
        return 0;  
      });  
    }  
    *// Schedule blocks, putting high-focus tasks at bestHour*  
    let currentTime \= projectConfig.wake\_minutes;  
    const endTime \= projectConfig.sleep\_minutes;  
    const blockDuration \= Math.max(15, Math.round(avgEstimationError));  
    const timeBlocks \= \[\];  
    let nodeIndex \= 0;  
    const prioritizedHours \= available\_hours ? available\_hours.split(',').map(*h* \=\> parseInt(h.trim())).filter(*n* \=\> \!isNaN(n)) : null;  
    while (currentTime \< endTime && timeBlocks.length \< 50 && nodeIndex \< sortedNodes.length) {  
      const currentHour \= Math.floor(currentTime / 60);  
      if (prioritizedHours && \!prioritizedHours.includes(currentHour)) {  
        currentTime \+= 60; *// skip to next hour if not prioritized*  
        continue;  
      }  
      const blockNode \= sortedNodes\[nodeIndex\];  
      let blockTime \= this.formatTime(currentTime);  
      *// If bestHour is within this block, schedule high-focus task*  
      if (Math.abs(Math.floor(currentTime / 60) \- bestHour) \< 1 && blockNode) {  
        *// Prefer high-focus task at bestHour*  
        blockTime \= this.formatTime(bestHour \* 60);  
      }  
      timeBlocks.push({  
        id: blockNode.id,  
        time: blockTime,  
        duration: \`${blockDuration} min\`,  
        action: blockNode.title,  
        strategic\_purpose: blockNode.branch\_type,  
        energy\_type: Math.abs(Math.floor(currentTime / 60) \- bestHour) \< 1 ? 'high\_focus' : 'steady\_progress',  
        hta\_connected: true,  
        knowledge\_level: blockNode.knowledge\_level,  
        magnitude: blockNode.magnitude  
      });  
      currentTime \+= blockDuration;  
      nodeIndex\++;  
    }  
    const schedule \= {  
      project\_id: projectId,  
      date: targetDate,  
      north\_star: hta.north\_star,  
      time\_blocks: timeBlocks,  
      total\_blocks: timeBlocks.length,  
      completed: 0,  
      created: new Date().toISOString()  
    };  
    const saved \= await this.saveProjectData(projectId, \`day\_${targetDate}.json\`, schedule);  
    if (\!saved) {  
      throw new Error('Failed to save daily schedule');  
    }  
    const blockPreview \= timeBlocks.slice(0, 5).map(*block* \=\>  
      \`${block.time}: ${block.action} (${block.duration})\`  
    ).join('\\n');  
    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`📅 Day Orchestrated for "${projectId}": ${targetDate}\\n\\n🎯 Goal: ${hta.north\_star}\\n⏰ ${projectConfig.wake\_time} → ${projectConfig.sleep\_time}\\n\\n🚀 First 5 Actions:\\n${blockPreview}\\n...(${timeBlocks.length} total blocks)\\n\\nEvery moment optimized for your transformation\! Use 'current\_status' to see your next action.\`  
        }  
      \]  
    };  
  }

  async completeBlock(*blockId*, *outcome*, *difficulty*, *actualDuration*, *newInsights*, *blockers*, *energyAfter*, *wantMore*) {  
    const projectId \= await this.requireActiveProject();  
    const today \= this.getTodayDate();  
    const schedule \= await this.loadProjectData(projectId, \`day\_${today}.json\`);  
    if (\!schedule) {  
      throw new Error('No schedule found for today in this project');  
    }  
    const block \= schedule.time\_blocks.find(*b* \=\> b.id \=== blockId);  
    if (\!block) {  
      throw new Error(\`Block ${blockId} not found\`);  
    }  
    block.completed \= new Date().toISOString();  
    block.outcome \= outcome;  
    block.difficulty \= difficulty;  
    block.actual\_duration \= actualDuration;  
    block.new\_insights \= newInsights;  
    block.blockers \= blockers;  
    block.energy\_after \= energyAfter;  
    block.want\_more \= wantMore;  
    schedule.completed\++;  
    const saved \= await this.saveProjectData(projectId, \`day\_${today}.json\`, schedule);  
    if (\!saved) {  
      throw new Error('Failed to save schedule update');  
    }  
    *// Feedback-driven skill adjustment*  
    const skillMap \= await this.loadProjectData(projectId, 'skills.json') || { skills: {} };  
    const hta \= await this.loadProjectData(projectId, 'hta.json');  
    const htaNode \= hta && hta.frontier\_nodes.find(*n* \=\> n.id \=== blockId);  
    if (htaNode && htaNode.skill\_requirements) {  
      for (const skill of Object.keys(htaNode.skill\_requirements)) {  
        if (\!skillMap.skills\[skill\]) {  
          skillMap.skills\[skill\] \= { current\_level: 1, verified\_level: null, history: \[\], last\_assessed: new Date().toISOString() };  
        }  
        if (difficulty \=== 'too\_easy') {  
          skillMap.skills\[skill\].current\_level \= Math.min(10, skillMap.skills\[skill\].current\_level \+ 1);  
        } else if (difficulty \=== 'too\_hard') {  
          skillMap.skills\[skill\].current\_level \= Math.max(1, skillMap.skills\[skill\].current\_level \- 1);  
        }  
        skillMap.skills\[skill\].history.push({  
          block\_id: blockId,  
          outcome,  
          difficulty,  
          timestamp: new Date().toISOString()  
        });  
      }  
      await this.saveProjectData(projectId, 'skills.json', skillMap);  
    }  
    *// Optionally, update projectConfig.skill\_level and learning\_velocity here*  
    const nextBlock \= schedule.time\_blocks.find(*b* \=\> \!b.completed);  
    let response \= \`✅ "${block.action}" completed (${projectId})\\n\\n💡 Outcome: ${outcome}\\n🧠 Difficulty: ${difficulty}\\n⚡ Energy: ${energyAfter}/5\`;  
    if (nextBlock) {  
      response \+= \`\\n\\n⏭️ Next: ${nextBlock.time} \- ${nextBlock.action}\`;  
    } else {  
      response \+= '\\n\\n🎉 Day complete\! Perfect execution.';  
    }  
    return { content: \[{ type: 'text', text: response }\] };  
  }

  async evolveStrategy() {  
    const projectId \= await this.requireActiveProject();  
    const skillMap \= await this.loadProjectData(projectId, 'skills.json') || { skills: {} };  
    const hta \= await this.loadProjectData(projectId, 'hta.json');  
    *// Analyze recent history*  
    let tooEasy \= 0, tooHard \= 0, justRight \= 0;  
    for (const skill of Object.values(skillMap.skills)) {  
      for (const entry of skill.history || \[\]) {  
        if (entry.difficulty \=== 'too\_easy') tooEasy\++;  
        else if (entry.difficulty \=== 'too\_hard') tooHard\++;  
        else if (entry.difficulty \=== 'just\_right') justRight\++;  
      }  
    }  
    let strategy \= '';  
    if (tooEasy \> justRight && tooEasy \> tooHard) {  
      strategy \= "You are progressing quickly\! Let's increase the challenge and introduce more advanced tasks.";  
      *// Optionally, add more advanced nodes to HTA here*  
    } else if (tooHard \> justRight) {  
      strategy \= "Some tasks are too difficult. Let's reinforce foundational skills and add more review tasks.";  
      *// Optionally, add more beginner nodes to HTA here*  
    } else {  
      strategy \= 'Your current progression is well-matched. Keep going\!';  
    }  
    return {  
      content: \[  
        {  
          type: 'text',  
          text: \`📈 Strategy Evolved\\n\\n${strategy}\\n\\n(Feedback analyzed: ${tooEasy} too easy, ${justRight} just right, ${tooHard} too hard)\`  
        }  
      \]  
    };  
  }

  async currentStatus() {  
    const projectId \= await this.requireActiveProject();  
    const today \= this.getTodayDate();  
    const schedule \= await this.loadProjectData(projectId, \`day\_${today}.json\`);  
    const projectConfig \= await this.loadProjectData(projectId, 'config.json');  
     
    if (\!schedule) {  
      return {  
        content: \[  
          {  
            type: 'text',  
            text: \`No schedule for today in project "${projectId}". Use orchestrate\_day to create one\!\`  
          }  
        \]  
      };  
    }

    const nextBlock \= schedule.time\_blocks.find(*b* \=\> \!b.completed);  
    const progress \= \`${schedule.completed}/${schedule.total\_blocks}\`;  
     
    let status \= \`🎯 Active Project: ${projectId}\\n📋 Goal: ${projectConfig.goal}\\n📅 Today: ${today}\\n📊 Progress: ${progress} blocks\\n\\n\`;  
     
    if (nextBlock) {  
      status \+= \`⏰ NEXT ACTION:\\n${nextBlock.time}: ${nextBlock.action}\\nDuration: ${nextBlock.duration}\\nPurpose: ${nextBlock.strategic\_purpose}\`;  
    } else {  
      status \+= '🎉 All actions complete\! Day perfectly executed.';  
    }

    return { content: \[{ type: 'text', text: status }\] };  
  }

  async **analyzePerformance**() {  
    const projectId \= await this.requireActiveProject();  
    const projectDir \= this.getProjectDir(projectId);  
    const files \= await fs.readdir(projectDir);  
    const dayFiles \= files.filter(*f* \=\> *f*.startsWith('day\_') && *f*.endsWith('.json'));  
    if (dayFiles.length \=== 0) {  
      return { content: \[{ type: 'text', text: 'No daily data found for this project.' }\] };  
    }  
    let energyByHour \= Array(24).fill(\[\]);  
    let energyByTask \= {};  
    let estimationErrors \= \[\];  
    let productivityByWeekday \= Array(7).fill(0);  
    for (const file of dayFiles) {  
      const dayData \= await this.loadProjectData(projectId, file);  
      if (\!dayData || \!dayData.time\_blocks) continue;  
      const date \= new Date(dayData.date);  
      productivityByWeekday\[date.getDay()\]++;  
      for (const block of dayData.time\_blocks) {  
        if (block.energy\_after) {  
          const hour \= parseInt(block.time.split(':')\[0\]);  
          energyByHour\[hour\] \= \[...(energyByHour\[hour\] || \[\]), block.energy\_after\];  
        }  
        if (block.strategic\_purpose) {  
          if (\!energyByTask\[block.strategic\_purpose\]) energyByTask\[block.strategic\_purpose\] \= \[\];  
          if (block.energy\_after) energyByTask\[block.strategic\_purpose\].push(block.energy\_after);  
        }  
        if (block.actual\_duration && block.duration) {  
          const planned \= parseInt(block.duration);  
          estimationErrors.push(block.actual\_duration \- planned);  
        }  
      }  
    }  
    *// Compute averages*  
    const avgEnergyByHour \= energyByHour.map(*arr* \=\> *arr*.length ? (*arr*.reduce((*a*, *b*) \=\> *a* \+ *b*, 0) / *arr*.length).toFixed(2) : 'N/A');  
    const bestHour \= avgEnergyByHour.indexOf(Math.max(...avgEnergyByHour.filter(*e* \=\> *e* \!== 'N/A').map(Number)));  
    const worstHour \= avgEnergyByHour.indexOf(Math.min(...avgEnergyByHour.filter(*e* \=\> *e* \!== 'N/A').map(Number)));  
    const avgEnergyByTask \= Object.fromEntries(Object.entries(energyByTask).map((\[*k*, *v*\]) \=\> \[*k*, (*v*.reduce((*a*, *b*) \=\> *a* \+ *b*, 0) / *v*.length).toFixed(2)\]));  
    const avgEstimationError \= estimationErrors.length ? (estimationErrors.reduce((*a*, *b*) \=\> *a* \+ *b*, 0) / estimationErrors.length).toFixed(2) : 'N/A';  
    const bestDay \= productivityByWeekday.indexOf(Math.max(...productivityByWeekday));  
    const worstDay \= productivityByWeekday.indexOf(Math.min(...productivityByWeekday));  
    return {  
      content: \[{  
        type: 'text',  
        text: \`📊 Performance Analysis\\n\\n\- Highest energy hour: ${bestHour}:00\\n\- Lowest energy hour: ${worstHour}:00\\n\- Best task type: ${Object.entries(avgEnergyByTask).sort((*a*,*b*)\=\>*b*\[1\]-*a*\[1\])\[0\]?.\[0\] || 'N/A'}\\n\- Avg estimation error (min): ${avgEstimationError}\\n\- Most productive day: ${\['Sun','Mon','Tue','Wed','Thu','Fri','Sat'\]\[bestDay\]}\\n\- Least productive day: ${\['Sun','Mon','Tue','Wed','Thu','Fri','Sat'\]\[worstDay\]}\`  
      }\]  
    };  
  }

  async **reviewPeriod**(*days*) {  
    const projectId \= await this.requireActiveProject();  
    const projectDir \= this.getProjectDir(projectId);  
    const files \= (await fs.readdir(projectDir)).filter(*f* \=\> *f*.startsWith('day\_') && *f*.endsWith('.json'));  
    if (files.length \=== 0) return { content: \[{ type: 'text', text: 'No daily data found.' }\] };  
    const sorted \= files.sort((*a*, *b*) \=\> *b*.localeCompare(*a*));  
    const periodFiles \= sorted.slice(0, *days*);  
    let totalBlocks \= 0, completedBlocks \= 0, totalEnergy \= 0, energyCount \= 0, insights \= \[\], daysWithData \= 0;  
    for (const file of periodFiles) {  
      const dayData \= await this.loadProjectData(projectId, file);  
      if (\!dayData) continue;  
      daysWithData\++;  
      totalBlocks \+= dayData.total\_blocks || 0;  
      completedBlocks \+= dayData.completed || 0;  
      for (const block of (dayData.time\_blocks || \[\])) {  
        if (block.energy\_after) { totalEnergy \+= block.energy\_after; energyCount\++; }  
        if (block.new\_insights) insights.push(block.new\_insights);  
      }  
    }  
    const avgEnergy \= energyCount ? (totalEnergy / energyCount).toFixed(2) : 'N/A';  
    const consistency \= \`${daysWithData} of ${*days*} days logged\`;  
    return {  
      content: \[{  
        type: 'text',  
        text: \`📅 Review (${*days*} days)\\n\\n\- Total blocks: ${totalBlocks}\\n\- Completed: ${completedBlocks}\\n\- Avg energy: ${avgEnergy}\\n\- Consistency: ${consistency}\\n\- Insights: ${insights.filter(Boolean).join('; ') || 'None'}\`  
      }\]  
    };  
  }

  async **addFrontierNode**(*title*, *description*, *branchType*, *estimatedTime*, *knowledgeLevel*) {  
    const projectId \= await this.requireActiveProject();  
    const hta \= await this.loadProjectData(projectId, 'hta.json');  
    if (\!hta) throw new Error('No HTA tree found.');  
    const newNode \= {  
      id: this.generateId(),  
      title,  
      description,  
      branch\_type: *branchType*,  
      estimated\_time: *estimatedTime*,  
      priority: 'medium',  
      status: 'ready',  
      prerequisites: \[\],  
      skill\_requirements: {},  
      knowledge\_level: *knowledgeLevel*,  
      magnitude: 5  
    };  
    hta.frontier\_nodes.push(newNode);  
    await this.saveProjectData(projectId, 'hta.json', hta);  
    return { content: \[{ type: 'text', text: \`✅ Added new frontier node: ${*title*}\` }\] };  
  }

  async **completeHTABranch**(*branchId*) {  
    const projectId \= await this.requireActiveProject();  
    const hta \= await this.loadProjectData(projectId, 'hta.json');  
    if (\!hta) throw new Error('No HTA tree found.');  
    const branch \= hta.branches.find(*b* \=\> *b*.id \=== *branchId*);  
    if (\!branch) throw new Error('Branch not found.');  
    branch.status \= 'completed';  
    await this.saveProjectData(projectId, 'hta.json', hta);  
    return { content: \[{ type: 'text', text: \`🎉 Branch marked as complete: ${branch.title}\` }\] };  
  }

  async **archiveProject**(*projectId*) {  
    const projectDir \= this.getProjectDir(*projectId*);  
    const archiveDir \= path.join(this.dataDir, 'archive');  
    await fs.mkdir(archiveDir, { recursive: true });  
    const destDir \= path.join(archiveDir, *projectId*);  
    await fs.rename(projectDir, destDir);  
    let globalConfig \= await this.loadGlobalData('config.json') || { projects: \[\], active\_project: null };  
    globalConfig.projects \= globalConfig.projects.filter(*pid* \=\> *pid* \!== *projectId*);  
    if (globalConfig.active\_project \=== *projectId*) globalConfig.active\_project \= null;  
    await this.saveGlobalData('config.json', globalConfig);  
    return { content: \[{ type: 'text', text: \`📦 Project archived: ${*projectId*}\` }\] };  
  }

  async **callMemoryServer**(*toolName*, *payload*) {  
    *// Placeholder: Implement this to call the memory MCP server (e.g., via HTTP, MCP client, etc.)*  
    *// For now, just return a mock response*  
    return { entities: \[\], relations: \[\], conversations: \[\] };  
  }

  async **logBreakthroughToMemory**(*projectId*, *insight*) {  
    const memoryPayload \= {  
      project\_id: *projectId*,  
      type: 'breakthrough',  
      text: *insight*,  
      timestamp: new Date().toISOString()  
    };  
    await this.callMemoryServer('add\_conversation', memoryPayload);  
    return { content: \[{ type: 'text', text: 'Breakthrough logged in memory.' }\] };  
  }

  async **suggestTasksFromMemory**(*projectId*) {  
    const memoryData \= await this.callMemoryServer('query\_memory', { project\_id: *projectId* });  
    const suggestions \= \[\];  
    const skillMap \= await this.loadProjectData(*projectId*, 'skills.json') || { skills: {} };  
    for (const entity of memoryData.entities || \[\]) {  
      if (entity.type \=== 'skill' && \!(entity.id in skillMap.skills)) {  
        suggestions.push(\`Practice skill: ${entity.name}\`);  
      }  
    }  
    return { content: \[{ type: 'text', text: suggestions.length ? suggestions.join('\\n') : 'No new suggestions from memory.' }\] };  
  }

  async **summarizeProgressWithMemory**(*projectId*) {  
    const projectConfig \= await this.loadProjectData(*projectId*, 'config.json');  
    const memoryData \= await this.callMemoryServer('query\_memory', { project\_id: *projectId* });  
    let summary \= \`Project: ${projectConfig.goal}\\n\\nForest Progress: ...\`;  
    if (memoryData.conversations && memoryData.conversations.length) {  
      summary \+= \`\\n\\nRecent Insights:\\n\` \+ memoryData.conversations.slice(\-5).map(*c* \=\> \`- ${*c*.text}\`).join('\\n');  
    }  
    return { content: \[{ type: 'text', text: summary }\] };  
  }  
}

*// Start the server using stdio transport*  
const server \= new ForestServer();  
const transport \= new StdioServerTransport();  
(async () \=\> {  
  await server.server.connect(transport);  
})();  
