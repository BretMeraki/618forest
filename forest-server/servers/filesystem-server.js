#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { promises as fs } from 'fs';
import path from 'path';

const server = new Server(
  {
    name: 'filesystem-server',
    version: '0.1.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

// Parse allowed directories from command line args
const allowedDirs = [];
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--allowed-directories' || args[i] === '--allow') {
    i++;
    if (i < args.length) {
      allowedDirs.push(path.resolve(args[i]));
    }
  }
}

function isPathAllowed(filepath) {
  const resolvedPath = path.resolve(filepath);
  return allowedDirs.some(dir => resolvedPath.startsWith(dir));
}

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_file',
        description: 'Read contents of a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to read'
            }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write contents to a file',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the file to write'
            },
            content: {
              type: 'string',
              description: 'Content to write to the file'
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'list_directory',
        description: 'List contents of a directory',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'Path to the directory to list'
            }
          },
          required: ['path']
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
  case 'read_file': {
    const { path: filepath } = request.params.arguments;

    if (!isPathAllowed(filepath)) {
      return {
        content: [{ type: 'text', text: `Access denied: ${filepath} is not in allowed directories` }]
      };
    }

    try {
      const content = await fs.readFile(filepath, 'utf8');
      return {
        content: [{ type: 'text', text: content }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error reading file: ${error.message}` }]
      };
    }
  }

  case 'write_file': {
    const { path: filepath, content } = request.params.arguments;

    if (!isPathAllowed(filepath)) {
      return {
        content: [{ type: 'text', text: `Access denied: ${filepath} is not in allowed directories` }]
      };
    }

    try {
      await fs.writeFile(filepath, content, 'utf8');
      return {
        content: [{ type: 'text', text: `Successfully wrote to ${filepath}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error writing file: ${error.message}` }]
      };
    }
  }

  case 'list_directory': {
    const { path: dirpath } = request.params.arguments;

    if (!isPathAllowed(dirpath)) {
      return {
        content: [{ type: 'text', text: `Access denied: ${dirpath} is not in allowed directories` }]
      };
    }

    try {
      const entries = await fs.readdir(dirpath, { withFileTypes: true });
      const listing = entries.map(entry => {
        const type = entry.isDirectory() ? 'directory' : 'file';
        return `${type}: ${entry.name}`;
      }).join('\n');

      return {
        content: [{ type: 'text', text: listing || 'Directory is empty' }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Error listing directory: ${error.message}` }]
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
  console.error(`Filesystem MCP server running on stdio. Allowed directories: ${allowedDirs.join(', ')}`);
}

runServer().catch(console.error);