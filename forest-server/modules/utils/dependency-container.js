/**
 * Dependency Injection Container - Super Glue for Forest.os
 * Provides robust dependency management with automatic healing
 */

import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'DependencyContainer' });

export class DependencyContainer {
  constructor() {
    this.dependencies = new Map();
    this.factories = new Map();
    this.singletons = new Map();
    this.healthChecks = new Map();
    this.fallbacks = new Map();
    this.initializationOrder = [];
    this.dependencyGraph = new Map();
  }

  /**
   * Register a dependency with automatic health checking
   */
  register(name, factory, options = {}) {
    this.factories.set(name, factory);
    
    if (options.healthCheck) {
      this.healthChecks.set(name, options.healthCheck);
    }
    
    if (options.fallback) {
      this.fallbacks.set(name, options.fallback);
    }
    
    if (options.singleton) {
      this.singletons.set(name, null);
    }

    if (options.dependencies) {
      this.dependencyGraph.set(name, options.dependencies);
    }

    logger.debug('Dependency registered', { name, options });
  }

  /**
   * Resolve dependency with automatic fallback and healing
   */
  async resolve(name) {
    try {
      // Check if singleton exists and is healthy
      if (this.singletons.has(name) && this.singletons.get(name)) {
        const instance = this.singletons.get(name);
        if (await this.checkHealth(name, instance)) {
          return instance;
        } else {
          logger.warn(`Singleton instance unhealthy, recreating: ${name}`);
          this.singletons.set(name, null);
        }
      }

      // Resolve dependencies first
      const deps = this.dependencyGraph.get(name) || [];
      const resolvedDeps = {};
      
      for (const dep of deps) {
        resolvedDeps[dep] = await this.resolve(dep);
      }

      // Create new instance
      const factory = this.factories.get(name);
      if (!factory) {
        throw new Error(`Dependency '${name}' not registered`);
      }

      const instance = await factory(resolvedDeps);
      
      // Store singleton if configured
      if (this.singletons.has(name)) {
        this.singletons.set(name, instance);
      }

      logger.debug('Dependency resolved', { name });
      return instance;
    } catch (error) {
      logger.error('Dependency resolution failed', { name, error: error.message });
      
      // Attempt fallback
      const fallback = this.fallbacks.get(name);
      if (fallback) {
        logger.warn(`Using fallback for dependency '${name}'`, { error: error.message });
        return await fallback();
      }
      
      throw error;
    }
  }

  /**
   * Check health of a dependency
   */
  async checkHealth(name, instance) {
    const healthCheck = this.healthChecks.get(name);
    if (!healthCheck) return true;
    
    try {
      return await healthCheck(instance);
    } catch (error) {
      logger.warn(`Health check failed for '${name}'`, { error: error.message });
      return false;
    }
  }

  /**
   * Get all dependency health statuses
   */
  async getHealthStatus() {
    const status = {};
    
    for (const [name] of this.factories) {
      try {
        const instance = this.singletons.get(name);
        if (instance) {
          status[name] = await this.checkHealth(name, instance) ? 'healthy' : 'unhealthy';
        } else {
          status[name] = 'not_initialized';
        }
      } catch (error) {
        status[name] = 'error';
      }
    }
    
    return status;
  }

  /**
   * Initialize all dependencies in proper order
   */
  async initializeAll() {
    const initialized = new Set();
    const initializing = new Set();

    const initDependency = async (name) => {
      if (initialized.has(name)) return;
      if (initializing.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`);
      }

      initializing.add(name);
      
      // Initialize dependencies first
      const deps = this.dependencyGraph.get(name) || [];
      for (const dep of deps) {
        await initDependency(dep);
      }

      // Initialize this dependency
      await this.resolve(name);
      
      initializing.delete(name);
      initialized.add(name);
    };

    for (const [name] of this.factories) {
      await initDependency(name);
    }

    logger.info('All dependencies initialized', { count: initialized.size });
  }

  /**
   * Gracefully shutdown all dependencies
   */
  async shutdown() {
    for (const [name, instance] of this.singletons) {
      if (instance && typeof instance.shutdown === 'function') {
        try {
          await instance.shutdown();
          logger.debug('Dependency shutdown completed', { name });
        } catch (error) {
          logger.error('Dependency shutdown failed', { name, error: error.message });
        }
      }
    }
  }
}

// Global container instance
export const container = new DependencyContainer(); 