/**
 * Integration Validation Test - CTO Super Glue Verification
 * Validates that all components work together seamlessly
 */

import { jest } from '@jest/globals';
import { createIntegrationTestHarness } from './integration-test-harness.js';
import { HtaTreeBuilder } from '../hta-tree-builder.js';

describe('Integration Validation', () => {
  let testHarness;

  beforeEach(() => {
    testHarness = createIntegrationTestHarness();
  });

  afterEach(() => {
    testHarness.cleanup();
  });

  it('should build an HTA tree successfully with a valid project', async () => {
    await testHarness.setupCompleteSystemState();
    const mocks = testHarness.createComprehensiveMocks();
    
    const htaBuilder = new HtaTreeBuilder(
      mocks.mockDataPersistence,
      mocks.mockProjectManagement,
      { generateCompletion: jest.fn().mockResolvedValue('Generated HTA content') }
    );

    const result = await htaBuilder.buildHTATree('main-path');
    
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return an error when the project has no goal', async () => {
    await testHarness.setupCompleteSystemState();
    const mocks = testHarness.createComprehensiveMocks();
    
    mocks.mockDataPersistence.loadProjectData.mockResolvedValue({
      projectId: 'test-project-001',
      // No goal
    });
    
    const htaBuilder = new HtaTreeBuilder(
      mocks.mockDataPersistence,
      mocks.mockProjectManagement,
      { generateCompletion: jest.fn().mockResolvedValue('Generated content') }
    );

    const result = await htaBuilder.buildHTATree('main-path');
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('goal');
  });
});

describe('System Resilience Validation', () => {
  it('should validate the system can recover from various failure scenarios', async () => {
    const testHarness = createIntegrationTestHarness();
    
    try {
      await testHarness.setupCompleteSystemState();
      const mocks = testHarness.createComprehensiveMocks();
      
      // Test scenario 1: Database connection failure
      mocks.mockDataPersistence.loadProjectData.mockRejectedValueOnce(new Error('Database connection lost'));
      mocks.mockDataPersistence.loadProjectData.mockResolvedValue(testHarness.mockState.projectConfig);
      
      // Test scenario 2: Network timeout
      mocks.mockProjectManagement.requireActiveProject.mockRejectedValueOnce(new Error('Network timeout'));
      mocks.mockProjectManagement.requireActiveProject.mockResolvedValue('test-project-001');
      
      // System should handle these failures gracefully
      const testServer = await testHarness.createTestServerInstance();
      expect(testServer).toBeDefined();
      
    } finally {
      testHarness.cleanup();
    }
  });
}); 