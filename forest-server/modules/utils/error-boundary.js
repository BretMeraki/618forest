/**
 * Error Boundary System - Prevents cascading failures
 */

import { getForestLogger } from '../winston-logger.js';

const logger = getForestLogger({ module: 'ErrorBoundary' });

export class ErrorBoundary {
  constructor(name, options = {}) {
    this.name = name;
    this.maxRetries = options.maxRetries || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.fallback = options.fallback;
    this.onError = options.onError;
    this.circuitBreakerThreshold = options.circuitBreakerThreshold || 5;
    
    this.errorCount = 0;
    this.lastError = null;
    this.isCircuitOpen = false;
    this.lastCircuitCheck = Date.now();
    this.successCount = 0;
  }

  /**
   * Execute function with error boundary protection
   */
  async execute(fn, ...args) {
    // Check circuit breaker
    if (this.isCircuitOpen && Date.now() - this.lastCircuitCheck < 60000) {
      if (this.fallback) {
        logger.warn(`Circuit breaker open for '${this.name}', using fallback`);
        return await this.fallback(...args);
      }
      throw new Error(`Circuit breaker open for '${this.name}'`);
    }

    let lastError;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await fn(...args);
        
        // Reset error count on success
        this.errorCount = 0;
        this.successCount++;
        this.isCircuitOpen = false;
        
        return result;
      } catch (error) {
        lastError = error;
        this.errorCount++;
        this.lastError = error;
        
        logger.warn(`Error boundary '${this.name}' caught error (attempt ${attempt}/${this.maxRetries})`, {
          error: error.message,
          stack: error.stack
        });

        // Check circuit breaker threshold
        if (this.errorCount >= this.circuitBreakerThreshold) {
          this.isCircuitOpen = true;
          this.lastCircuitCheck = Date.now();
          logger.error(`Circuit breaker opened for '${this.name}'`);
        }

        // Call error handler
        if (this.onError) {
          await this.onError(error, attempt);
        }

        // Wait before retry (except on last attempt)
        if (attempt < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    // All retries failed, try fallback
    if (this.fallback) {
      logger.warn(`All retries failed for '${this.name}', using fallback`);
      return await this.fallback(...args);
    }

    throw lastError;
  }

  /**
   * Get boundary status
   */
  getStatus() {
    return {
      name: this.name,
      errorCount: this.errorCount,
      successCount: this.successCount,
      isCircuitOpen: this.isCircuitOpen,
      lastError: this.lastError?.message,
      lastCircuitCheck: this.lastCircuitCheck,
      successRate: this.successCount / (this.successCount + this.errorCount) || 0
    };
  }

  /**
   * Reset the error boundary
   */
  reset() {
    this.errorCount = 0;
    this.successCount = 0;
    this.isCircuitOpen = false;
    this.lastError = null;
    logger.info(`Error boundary '${this.name}' reset`);
  }
}

// Global error boundaries registry
export const errorBoundaries = new Map();

/**
 * Create or get error boundary
 */
export function createErrorBoundary(name, options) {
  if (!errorBoundaries.has(name)) {
    errorBoundaries.set(name, new ErrorBoundary(name, options));
  }
  return errorBoundaries.get(name);
}

/**
 * Execute function with automatic error boundary
 */
export async function withErrorBoundary(name, fn, options = {}) {
  const boundary = createErrorBoundary(name, options);
  return await boundary.execute(fn);
}

/**
 * Get status of all error boundaries
 */
export function getAllBoundaryStatuses() {
  const statuses = {};
  for (const [name, boundary] of errorBoundaries) {
    statuses[name] = boundary.getStatus();
  }
  return statuses;
} 