// Integration tests for wizard-dialogue-engine component
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor as waitForHook } from '@testing-library/react';
import { useWizardDialogue } from '../wizard-dialogue-engine';
import {
  LocalStorageMock,
  SessionStorageMock,
  createMockFlowData,
  createMockWizardNode,
  waitFor,
  simulatePageRefresh
} from '../../../tests/test-utils';
import * as persistence from '@/lib/persistence';

// Mock the persistence module
vi.mock('@/lib/persistence', () => ({
  saveWizardStateDebounced: vi.fn(),
  loadWizardState: vi.fn(),
  clearWizardState: vi.fn(),
  PersistedWizardState: {}
}));

// Mock fetch for flow loading
global.fetch = vi.fn();

describe('WizardDialogueEngine Integration Tests', () => {
  let localStorageMock: LocalStorageMock;
  let sessionStorageMock: SessionStorageMock;

  beforeEach(() => {
    // Set up storage mocks
    localStorageMock = new LocalStorageMock();
    sessionStorageMock = new SessionStorageMock();
    
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });
    
    // Clear all mocks
    vi.clearAllMocks();
    vi.useFakeTimers();
    
    // Default mock responses
    (persistence.loadWizardState as any).mockReturnValue(null);
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(createMockFlowData())
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Flow Loading', () => {
    it('should load default flow on initialization', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for flow to load
      await waitForHook(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.wizardData).toEqual(mockFlowData);
      expect(result.current.dialogueState.currentNodeId).toBe('start');
      expect(result.current.dialogueState.currentNode).toEqual(mockFlowData.start);
    });

    it('should load specialized flow when gameType is set', async () => {
      const platformerFlowData = {
        start: createMockWizardNode({
          id: 'start',
          text: 'Welcome to platformer creation!',
          options: [{ text: 'Begin', next: 'setup' }]
        }),
        setup: createMockWizardNode({
          id: 'setup',
          text: 'Let\'s set up your platformer',
          options: [{ text: 'Next', next: 'end' }]
        })
      };

      // First load default flow
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(createMockFlowData())
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      // Now set gameType to trigger specialized flow loading
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(platformerFlowData)
      });

      act(() => {
        result.current.setSessionActions(prev => ({
          ...prev,
          gameType: 'platformer',
          selectedGameType: 'platformer',
          transitionToSpecializedFlow: true
        }));
      });

      // Wait for specialized flow to load
      await waitForHook(() => {
        expect(result.current.wizardData).toEqual(platformerFlowData);
      });

      expect(global.fetch).toHaveBeenCalledWith('/platformer-flow.json');
      expect(result.current.dialogueState.currentNode?.text).toContain('platformer creation');
    });

    it('should handle flow loading errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const { result } = renderHook(() => useWizardDialogue());

      await waitForHook(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.wizardData).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load wizard flow'),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });

    it('should not reload flow if already loaded', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      const fetchCallCount = (global.fetch as any).mock.calls.length;

      // Trigger re-render without changing flow
      act(() => {
        result.current.advance();
      });

      // Should not call fetch again
      expect((global.fetch as any).mock.calls.length).toBe(fetchCallCount);
    });
  });

  describe('State Persistence', () => {
    it('should restore state from localStorage on initialization', async () => {
      const persistedState = {
        version: '1.0.0',
        activeFlowPath: '/wizard-flow.json',
        currentNodeId: 'choose-game',
        gameType: null,
        sessionActions: {
          choices: ['start'],
          createdAssets: [],
          gameType: null,
          currentProject: null,
          completedSteps: ['intro'],
          unlockedEditor: false
        },
        updatedAt: new Date().toISOString()
      };

      (persistence.loadWizardState as any).mockReturnValue(persistedState);

      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());

      await waitForHook(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should restore to persisted state
      expect(result.current.dialogueState.currentNodeId).toBe('choose-game');
      expect(result.current.sessionActions.choices).toEqual(['start']);
      expect(result.current.sessionActions.completedSteps).toEqual(['intro']);
    });

    it('should save state changes to localStorage', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      // Make a state change
      act(() => {
        result.current.handleOptionSelect({
          text: 'Start journey',
          next: 'choose-game'
        });
      });

      // Fast forward past debounce
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Should save to localStorage
      expect(persistence.saveWizardStateDebounced).toHaveBeenCalledWith(
        expect.objectContaining({
          currentNodeId: 'choose-game',
          sessionActions: expect.objectContaining({
            choices: ['Start journey']
          })
        })
      );
    });

    it('should persist state across flow transitions', async () => {
      // Start with default flow
      const defaultFlow = createMockFlowData();
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(defaultFlow)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      // Make some progress
      act(() => {
        result.current.handleOptionSelect({
          text: 'Platformer',
          next: 'platformer-intro',
          params: { gameType: 'platformer' }
        });
      });

      // Set up specialized flow
      const platformerFlow = {
        start: createMockWizardNode({
          id: 'start',
          text: 'Platformer flow start'
        })
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(platformerFlow)
      });

      // Transition to specialized flow
      act(() => {
        result.current.setSessionActions(prev => ({
          ...prev,
          gameType: 'platformer',
          transitionToSpecializedFlow: true
        }));
      });

      await waitForHook(() => {
        expect(result.current.wizardData).toEqual(platformerFlow);
      });

      // Session actions should be preserved
      expect(result.current.sessionActions.choices).toContain('Platformer');
      expect(result.current.sessionActions.gameType).toBe('platformer');
    });

    it('should handle page refresh simulation correctly', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      // Initial render
      const { result, unmount } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      // Make progress
      act(() => {
        result.current.handleOptionSelect({
          text: 'Start journey',
          next: 'choose-game'
        });
      });

      act(() => {
        result.current.handleOptionSelect({
          text: 'Platformer',
          next: 'platformer-intro',
          params: { gameType: 'platformer' }
        });
      });

      // Fast forward to save state
      act(() => {
        vi.advanceTimersByTime(250);
      });

      // Simulate saving the state
      const lastSaveCall = (persistence.saveWizardStateDebounced as any).mock.calls.slice(-1)[0][0];
      
      // Unmount (simulate page unload)
      unmount();

      // Mock loading the persisted state
      (persistence.loadWizardState as any).mockReturnValue(lastSaveCall);

      // Re-render (simulate page reload)
      const { result: newResult } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(newResult.current.isLoading).toBe(false));

      // State should be restored
      expect(newResult.current.dialogueState.currentNodeId).toBe('platformer-intro');
      expect(newResult.current.sessionActions.gameType).toBe('platformer');
      expect(newResult.current.sessionActions.choices).toContain('Platformer');
    });
  });

  describe('Node Navigation', () => {
    it('should navigate to next node on option selection', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.dialogueState.currentNodeId).toBe('start');

      act(() => {
        result.current.handleOptionSelect({
          text: 'Start journey',
          next: 'choose-game'
        });
      });

      expect(result.current.dialogueState.currentNodeId).toBe('choose-game');
      expect(result.current.dialogueState.currentNode).toEqual(mockFlowData['choose-game']);
    });

    it('should track choices in session actions', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.handleOptionSelect({
          text: 'Start journey',
          next: 'choose-game'
        });
      });

      expect(result.current.sessionActions.choices).toContain('Start journey');

      act(() => {
        result.current.handleOptionSelect({
          text: 'Platformer',
          next: 'platformer-intro',
          params: { gameType: 'platformer' }
        });
      });

      expect(result.current.sessionActions.choices).toEqual(['Start journey', 'Platformer']);
      expect(result.current.sessionActions.gameType).toBe('platformer');
    });

    it('should update session actions based on option params', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.handleOptionSelect({
          text: 'RPG',
          next: 'rpg-intro',
          params: { 
            gameType: 'rpg',
            unlockedEditor: true,
            completedSteps: ['intro', 'game-selection']
          }
        });
      });

      expect(result.current.sessionActions.gameType).toBe('rpg');
      expect(result.current.sessionActions.unlockedEditor).toBe(true);
      expect(result.current.sessionActions.completedSteps).toEqual(['intro', 'game-selection']);
    });

    it('should navigate directly to a specific node', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.navigateToNode('rpg-intro');
      });

      expect(result.current.dialogueState.currentNodeId).toBe('rpg-intro');
      expect(result.current.dialogueState.currentNode).toEqual(mockFlowData['rpg-intro']);
    });

    it('should handle navigation to non-existent nodes gracefully', async () => {
      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      const currentNodeId = result.current.dialogueState.currentNodeId;

      act(() => {
        result.current.navigateToNode('non-existent-node');
      });

      // Should stay on current node
      expect(result.current.dialogueState.currentNodeId).toBe(currentNodeId);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Node not found'),
        'non-existent-node'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Dialogue Step Management', () => {
    it('should advance dialogue steps within a node', async () => {
      const mockFlowData = {
        start: createMockWizardNode({
          id: 'start',
          text: 'Step 1|Step 2|Step 3',
          options: [{ text: 'Next', next: 'end' }]
        })
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.dialogueState.dialogueStep).toBe(0);

      act(() => {
        result.current.advance();
      });

      expect(result.current.dialogueState.dialogueStep).toBe(1);

      act(() => {
        result.current.advance();
      });

      expect(result.current.dialogueState.dialogueStep).toBe(2);
    });

    it('should reset dialogue step when navigating to new node', async () => {
      const mockFlowData = {
        start: createMockWizardNode({
          id: 'start',
          text: 'Step 1|Step 2',
          options: [{ text: 'Next', next: 'second' }]
        }),
        second: createMockWizardNode({
          id: 'second',
          text: 'New node',
          options: []
        })
      };

      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      // Advance to step 2
      act(() => {
        result.current.advance();
      });
      expect(result.current.dialogueState.dialogueStep).toBe(1);

      // Navigate to new node
      act(() => {
        result.current.handleOptionSelect({
          text: 'Next',
          next: 'second'
        });
      });

      // Step should reset
      expect(result.current.dialogueState.dialogueStep).toBe(0);
    });
  });

  describe('Specialized Flow Loading', () => {
    it('should load platformer flow when gameType is set to platformer', async () => {
      const defaultFlow = createMockFlowData();
      const platformerFlow = {
        start: createMockWizardNode({
          id: 'start',
          text: 'Platformer specific content'
        })
      };

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(defaultFlow)
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(platformerFlow)
        });

      const { result } = renderHook(() => useWizardDialogue());
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      // Set gameType to trigger specialized flow
      act(() => {
        result.current.setSessionActions(prev => ({
          ...prev,
          gameType: 'platformer',
          selectedGameType: 'platformer',
          transitionToSpecializedFlow: true
        }));
      });

      await waitForHook(() => {
        expect(global.fetch).toHaveBeenCalledWith('/platformer-flow.json');
      });

      expect(result.current.wizardData).toEqual(platformerFlow);
    });

    it('should fallback to generic game flow when specialized flow fails', async () => {
      const defaultFlow = createMockFlowData();

      (global.fetch as any)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(defaultFlow)
        })
        .mockRejectedValueOnce(new Error('404 Not Found'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWizardDialogue({
        flowType: 'game-dev'
      }));
      
      await waitForHook(() => expect(result.current.isLoading).toBe(false));

      // Try to load specialized flow that doesn't exist
      act(() => {
        result.current.setSessionActions(prev => ({
          ...prev,
          gameType: 'nonexistent',
          transitionToSpecializedFlow: true
        }));
      });

      // Should log error but continue with current flow
      await waitForHook(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('Failed to load wizard flow'),
          expect.any(Error)
        );
      });

      // Should still have the default flow loaded
      expect(result.current.wizardData).toEqual(defaultFlow);

      consoleSpy.mockRestore();
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted persisted state', async () => {
      // Return corrupted state that causes parsing error
      (persistence.loadWizardState as any).mockImplementation(() => {
        throw new Error('Invalid JSON');
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const mockFlowData = createMockFlowData();
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockFlowData)
      });

      const { result } = renderHook(() => useWizardDialogue());
      
      await waitForHook(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should start fresh with default state
      expect(result.current.dialogueState.currentNodeId).toBe('start');
      expect(result.current.sessionActions.choices).toEqual([]);

      consoleSpy.mockRestore();
    });

    it('should handle network failures when loading flows', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network failure'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWizardDialogue());
      
      await waitForHook(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.wizardData).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load wizard flow'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});