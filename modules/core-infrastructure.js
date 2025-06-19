/**
 * Core Infrastructure Module
 * Handles server initialization, dependencies, and basic setup
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import path from 'path';
import os from 'os';

// Enable the lightweight HTTP status API by default. You can turn it off
// by setting the environment variable FOREST_HTTP_API=off (or "false").
const ENABLE_HTTP_API = !(process.env.FOREST_HTTP_API?.toLowerCase?.() === 'off' || process.env.FOREST_HTTP_API?.toLowerCase?.() === 'false');

export class CoreInfrastructure {
  constructor() {
    this.server = new Server(
      {
        name: 'forest-server',
        version: '2.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    // Decide on a guaranteed-writable data directory.
    // 1. If FOREST_DATA_DIR is set, use that.
    // 2. Otherwise default to ~/.forest-data (cross-platform writable location).
    this.dataDir = process.env.FOREST_DATA_DIR
      ? path.resolve(process.env.FOREST_DATA_DIR)
      : path.join(os.homedir(), '.forest-data');

    this.activeProject = null;

    // Lightweight ClaudeInterface wrapper for contextual intelligence requests
    this.claudeInterface = {
      requestIntelligence: async (type, payload) => ({
        request_for_claude: { type, payload }
      })
    };
  }

  getServer() {
    return this.server;
  }

  getDataDir() {
    return this.dataDir;
  }

  getActiveProject() {
    return this.activeProject;
  }

  setActiveProject(project) {
    this.activeProject = project;
  }

  getClaudeInterface() {
    return this.claudeInterface;
  }

  isHttpApiEnabled() {
    return ENABLE_HTTP_API;
  }
}

export { ENABLE_HTTP_API };