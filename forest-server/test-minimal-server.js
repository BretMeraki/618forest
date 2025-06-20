#!/usr/bin/env node

/**
 * Minimal MCP Server Test
 * Tests if the issue is in our code or the MCP SDK itself
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

console.error('🧪 Starting minimal MCP server test...');

try {
  console.error('📦 Creating server...');
  const server = new Server(
    {
      name: 'minimal-test',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  console.error('🔧 Setting up handlers...');
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    console.error('📋 ListTools request received');
    return { tools: [] };
  });

  console.error('🚀 Connecting transport...');
  const transport = new StdioServerTransport();

  console.error('🔌 Starting server.connect()...');
  const startTime = Date.now();

  await server.connect(transport);

  const connectTime = Date.now() - startTime;
  console.error(`✅ Server connected successfully in ${connectTime}ms`);

  // Log when we receive any requests
  console.error('📡 Server ready and listening...');
} catch (error) {
  console.error('❌ Error in minimal server:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
