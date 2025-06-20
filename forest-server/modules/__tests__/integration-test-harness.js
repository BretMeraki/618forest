import { jest } from '@jest/globals';
import { CleanForestServer } from '../../server-modular.js';
import { EventBus } from '../utils/event-bus.js';

/**
 * A factory function to create a consistent test environment for integration tests.
 * This harness provides mock objects and state management to ensure tests are
 * isolated and predictable.
 */
export function createIntegrationTestHarness() {
  const mockState = {
    projectConfig: {
      projectId: 'test-project-001',
      goal: 'Achieve test success',
      context: 'Testing the full system',
      life_structure_preferences: { focus_duration: '25 minutes' },
    },
    htaData: {
      'main-path': {
        // Mock HTA data
        goal: 'Achieve test success',
        pathName: 'main-path',
        strategicBranches: [],
      }
    }
  };

  /**
   * Creates a comprehensive set of mock dependencies for the system.
   * Each mock is a Jest mock function, allowing for spying and assertion.
   */
  const createComprehensiveMocks = () => ({
    mockDataPersistence: {
      loadProjectData: jest.fn().mockResolvedValue(mockState.projectConfig),
      saveProjectData: jest.fn().mockResolvedValue(true),
      loadPathData: jest.fn((projectId, pathName) => Promise.resolve(mockState.htaData[pathName])),
      savePathData: jest.fn().mockResolvedValue(true),
    },
    mockProjectManagement: {
      requireActiveProject: jest.fn().mockResolvedValue(mockState.projectConfig.projectId),
      getActiveProject: jest.fn().mockResolvedValue(mockState.projectConfig.projectId),
    },
    mockClaudeInterface: {
      requestIntelligence: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Mocked AI response' }]
      }),
      generateCompletion: jest.fn().mockResolvedValue('Mocked AI completion'),
    },
  });

  const harness = {
    mockState,
    mocks: createComprehensiveMocks(),

    // Prepares the harness by resetting all mocks to a clean state.
    setupCompleteSystemState: async () => {
      harness.mocks = createComprehensiveMocks();
    },

    // Creates an instance of the server with the mocked dependencies injected.
    createTestServerInstance: async () => {
      const server = new CleanForestServer({
        dataPersistence: harness.mocks.mockDataPersistence,
        projectManagement: harness.mocks.mockProjectManagement,
        claude: harness.mocks.mockClaudeInterface,
      });
      return server;
    },

    // Resets all mocks and the event bus to ensure no state leaks between tests.
    cleanup: () => {
      jest.clearAllMocks();
      if (EventBus.reset) {
        EventBus.reset();
      }
    },
    
    createComprehensiveMocks,
  };

  return harness;
}

// ---------------------------------------------------------------------------
// Jest requires at least one test per test file; this helper previously had
// none and caused the suite to fail.  The following trivial test satisfies
// Jest without affecting integration harness behaviour.
// ---------------------------------------------------------------------------

test('integration test harness module loads', () => {
  // Simply assert that the harness factory is defined.
  expect(typeof createIntegrationTestHarness).toBe('function');
}); 