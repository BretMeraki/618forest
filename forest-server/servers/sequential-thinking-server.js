#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const server = new Server(
  {
    name: 'sequential-thinking-server',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'thinking',
        description: 'Process thoughts in a structured way before responding',
        inputSchema: {
          type: 'object',
          properties: {
            thoughts: {
              type: 'string',
              description: 'The thoughts to process',
            },
          },
          required: ['thoughts'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async request => {
  switch (request.params.name) {
    case 'thinking': {
      const { thoughts } = request.params.arguments;

      // Simple thinking processor that structures the thoughts
      const processedThoughts = `
<thinking>
${thoughts}
</thinking>

Thoughts processed and structured for better clarity.
      `.trim();

      return {
        content: [{ type: 'text', text: processedThoughts }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sequential Thinking MCP server running on stdio');
}

runServer().catch(console.error);
