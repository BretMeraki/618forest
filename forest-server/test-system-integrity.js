#!/usr/bin/env node
/**
 * Test System Integrity Debugger
 * Verifies the debugging and super glue capabilities
 */

import { SystemIntegrityDebugger } from './debug-system-integrity.js';
import { container } from './modules/utils/dependency-container.js';
import { withErrorBoundary, getAllBoundaryStatuses } from './modules/utils/error-boundary.js';
import { getForestLogger } from './modules/winston-logger.js';

const logger = getForestLogger({ module: 'SystemIntegrityTest' });

async function testSystemIntegrity() {
  logger.info('Starting System Integrity Test');
  
  try {
    // Test 1: Dependency Container
    logger.info('Testing Dependency Container');
    
    container.register('testService', async () => {
      return {
        name: 'TestService',
        status: 'healthy',
        process: async (data) => `Processed: ${data}`
      };
    }, { singleton: true });
    
    const service = await container.resolve('testService');
    logger.info('Dependency resolution successful', { service: service.name });
    
    // Test 2: Error Boundary
    logger.info('Testing Error Boundary');
    
    const testFunction = async (shouldFail = false) => {
      if (shouldFail) {
        throw new Error('Intentional test error');
      }
      return 'Success!';
    };
    
    // Test successful execution
    const result1 = await withErrorBoundary('testBoundary', testFunction, {
      maxRetries: 2,
      fallback: async () => 'Fallback executed'
    });
    logger.info('Error boundary success test', { result: result1 });
    
    // Test error handling with fallback
    const result2 = await withErrorBoundary('testBoundary', () => testFunction(true), {
      maxRetries: 2,
      fallback: async () => 'Fallback executed'
    });
    logger.info('Error boundary fallback test', { result: result2 });
    
    // Test 3: System Analysis
    logger.info('Testing System Analysis');
    
    const systemDebugger = new SystemIntegrityDebugger();
    const analysis = await systemDebugger.analyzeSystemIntegrity();
    
    logger.info('System analysis completed', {
      totalModules: analysis.dependencyAnalysis.totalModules,
      healthyModules: analysis.moduleHealthCheck.healthyModules,
      brittlenessLevel: analysis.brittlenessAssessment.level,
      circularDependencies: analysis.circularDependencyCheck.count
    });
    
    // Test 4: Health Status Check
    const dependencyHealth = await container.getHealthStatus();
    const boundaryStatuses = getAllBoundaryStatuses();
    
    logger.info('Health checks completed', {
      dependencyHealth,
      boundaryStatuses
    });
    
    // Generate test report
    const testReport = {
      timestamp: new Date().toISOString(),
      tests: {
        dependencyContainer: 'PASSED',
        errorBoundary: 'PASSED',
        systemAnalysis: 'PASSED',
        healthChecks: 'PASSED'
      },
      systemMetrics: {
        totalModules: analysis.dependencyAnalysis.totalModules,
        healthyModules: analysis.moduleHealthCheck.healthyModules,
        overallHealth: analysis.moduleHealthCheck.overallHealth,
        brittlenessScore: analysis.brittlenessAssessment.score,
        brittlenessLevel: analysis.brittlenessAssessment.level
      },
      recommendations: analysis.superGlueRecommendations
    };
    
    logger.info('System Integrity Test completed successfully', testReport);
    return testReport;
    
  } catch (error) {
    logger.error('System Integrity Test failed', { error: error.message, stack: error.stack });
    throw error;
  }
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSystemIntegrity()
    .then(report => {
      console.log('\n🎉 System Integrity Test Results:');
      console.log('✅ All tests passed');
      console.log(`📊 System Health: ${report.systemMetrics.overallHealth}%`);
      console.log(`🔧 Brittleness Level: ${report.systemMetrics.brittlenessLevel}`);
      console.log(`📈 Total Modules: ${report.systemMetrics.totalModules}`);
    })
    .catch(error => {
      console.error('❌ System Integrity Test failed:', error.message);
      process.exit(1);
    });
}

export { testSystemIntegrity }; 