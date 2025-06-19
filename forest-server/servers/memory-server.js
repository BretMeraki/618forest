#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';

const server = new Server(
  {
    name: 'memory-server',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

const memoryPath = process.argv[2] || 'memory.json';

async function loadMemory() {
  try {
    const data = await fs.readFile(memoryPath, 'utf8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function saveMemory(memory) {
  await fs.writeFile(memoryPath, JSON.stringify(memory, null, 2), 'utf8');
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'memory_add',
        description: 'Add or update information in memory',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The key to store the information under'
            },
            value: {
              type: 'string',
              description: 'The information to store'
            }
          },
          required: ['key', 'value']
        }
      },
      {
        name: 'memory_get',
        description: 'Retrieve information from memory',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The key to retrieve information for'
            }
          },
          required: ['key']
        }
      },
      {
        name: 'memory_list',
        description: 'List all keys in memory',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'memory_delete',
        description: 'Delete information from memory',
        inputSchema: {
          type: 'object',
          properties: {
            key: {
              type: 'string',
              description: 'The key to delete'
            }
          },
          required: ['key']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const memory = await loadMemory();

  switch (request.params.name) {
  case 'memory_add': {
    const { key, value } = request.params.arguments;
    memory[key] = value;
    await saveMemory(memory);
    return {
      content: [{ type: 'text', text: `Stored information under key: ${key}` }]
    };
  }

  case 'memory_get': {
    const { key } = request.params.arguments;
    const value = memory[key];
    return {
      content: [{
        type: 'text',
        text: value ? `${key}: ${value}` : `No information found for key: ${key}`
      }]
    };
  }

  case 'memory_list': {
    const keys = Object.keys(memory);
    return {
      content: [{
        type: 'text',
        text: keys.length > 0 ? `Memory keys: ${keys.join(', ')}` : 'No information stored in memory'
      }]
    };
  }

  case 'memory_delete': {
    const { key } = request.params.arguments;
    if (memory[key]) {
      delete memory[key];
      await saveMemory(memory);
      return {
        content: [{ type: 'text', text: `Deleted information for key: ${key}` }]
      };
    } else {
      return {
        content: [{ type: 'text', text: `No information found for key: ${key}` }]
      };
    }
  }

  default:
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Memory MCP server running on stdio');
}

runServer().catch(console.error);