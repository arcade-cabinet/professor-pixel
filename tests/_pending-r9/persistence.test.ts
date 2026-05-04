// Unit tests for persistence library
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  saveWizardState,
  saveWizardStateDebounced,
  loadWizardState,
  clearWizardState,
  saveSessionState,
  loadSessionState,
  clearSessionState,
  setCookie,
  getCookie,
  deleteCookie,
  saveUserPreferences,
  loadUserPreferences,
  clearAllData,
  migrateStorageIfNeeded,
  isStorageAvailable,
  PersistedWizardState,
  PersistedSessionState,
  UserPreferences
} from '../persistence';
import {
  LocalStorageMock,
  SessionStorageMock,
  CookieMock,
  createCorruptedData,
  waitFor
} from '../../../tests/test-utils';

describe('Persistence Library', () => {
  let localStorageMock: LocalStorageMock;
  let sessionStorageMock: SessionStorageMock;
  let cookieMock: CookieMock;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    // Set up mocks
    localStorageMock = new LocalStorageMock();
    sessionStorageMock = new SessionStorageMock();
    cookieMock = new CookieMock();
    
    // Replace global storage objects
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true
    });
    Object.defineProperty(window, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true
    });
    Object.defineProperty(document, 'cookie', {
      get: () => cookieMock.document.cookie.get(),
      set: (value) => cookieMock.document.cookie.set(value),
      configurable: true
    });
    
    // Mock console.error to suppress expected errors
    originalConsoleError = console.error;
    console.error = vi.fn();
    
    // Clear all timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    console.error = originalConsoleError;
  });

  describe('saveWizardState / loadWizardState', () => {
    it('should save and load wizard state correctly', () => {
      const state: Partial<PersistedWizardState> = {
        activeFlowPath: '/platformer-flow.json',
        currentNodeId: 'game-setup',
        gameType: 'platformer',
        selectedGameType: 'platformer',
        sessionActions: {
          choices: ['start', 'platformer'],
          createdAssets: ['player.png'],
          gameType: 'platformer',
          selectedGameType: 'platformer',
          currentProject: { name: 'My Game' },
          completedSteps: ['intro', 'setup'],
          unlockedEditor: true
        }
      };

      saveWizardState(state);
      const loaded = loadWizardState();

      expect(loaded).toBeTruthy();
      expect(loaded?.activeFlowPath).toBe('/platformer-flow.json');
      expect(loaded?.currentNodeId).toBe('game-setup');
      expect(loaded?.gameType).toBe('platformer');
      expect(loaded?.sessionActions.choices).toEqual(['start', 'platformer']);
      expect(loaded?.sessionActions.unlockedEditor).toBe(true);
      expect(loaded?.version).toBe('1.0.0');
      expect(loaded?.updatedAt).toBeTruthy();
    });

    it('should merge with existing state when saving partial state', () => {
      const initialState: Partial<PersistedWizardState> = {
        currentNodeId: 'start',
        gameType: 'platformer',
        sessionActions: {
          choices: ['initial'],
          createdAssets: [],
          gameType: 'platformer',
          currentProject: null,
          completedSteps: [],
          unlockedEditor: false
        }
      };

      saveWizardState(initialState);
      
      // Save partial update
      saveWizardState({
        currentNodeId: 'next-node',
        sessionActions: {
          ...initialState.sessionActions!,
          choices: ['initial', 'next'],
          unlockedEditor: true
        }
      });

      const loaded = loadWizardState();
      expect(loaded?.currentNodeId).toBe('next-node');
      expect(loaded?.gameType).toBe('platformer');
      expect(loaded?.sessionActions.choices).toEqual(['initial', 'next']);
      expect(loaded?.sessionActions.unlockedEditor).toBe(true);
    });

    it('should handle corrupted data gracefully', () => {
      const corrupted = createCorruptedData();
      
      // Test invalid JSON
      localStorageMock.setItem('wizard.state.v1', corrupted.invalid);
      let loaded = loadWizardState();
      expect(loaded).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('wizard.state.v1');
      
      // Test malformed JSON
      localStorageMock.setItem('wizard.state.v1', corrupted.malformed);
      loaded = loadWizardState();
      expect(loaded).toBeNull();
      
      // Test wrong data type
      localStorageMock.setItem('wizard.state.v1', corrupted.wrongType);
      loaded = loadWizardState();
      expect(loaded).toBeNull();
    });

    it('should clear wizard state correctly', () => {
      saveWizardState({ currentNodeId: 'test' });
      expect(loadWizardState()).toBeTruthy();
      
      clearWizardState();
      expect(loadWizardState()).toBeNull();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('wizard.state.v1');
    });

    it('should handle storage errors gracefully', () => {
      // Simulate localStorage being full
      localStorageMock.setItem = vi.fn(() => {
        throw new Error('QuotaExceededError');
      });

      const state = { currentNodeId: 'test' };
      saveWizardState(state);
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Storage operation failed'),
        expect.any(Error)
      );
    });
  });

  describe('saveWizardStateDebounced', () => {
    it('should debounce multiple rapid saves', async () => {
      const spy = vi.spyOn(localStorage, 'setItem');
      
      // Make multiple rapid calls
      saveWizardStateDebounced({ currentNodeId: 'node1' });
      saveWizardStateDebounced({ currentNodeId: 'node2' });
      saveWizardStateDebounced({ currentNodeId: 'node3' });
      saveWizardStateDebounced({ currentNodeId: 'node4' });
      
      // Should not have saved yet
      expect(spy).not.toHaveBeenCalled();
      
      // Fast forward past debounce delay (200ms)
      vi.advanceTimersByTime(250);
      
      // Should only save once with the last value
      expect(spy).toHaveBeenCalledTimes(1);
      const savedData = JSON.parse(spy.mock.calls[0][1]);
      expect(savedData.currentNodeId).toBe('node4');
    });

    it('should save after debounce delay', async () => {
      const spy = vi.spyOn(localStorage, 'setItem');
      
      saveWizardStateDebounced({ currentNodeId: 'delayed-node' });
      
      // Not saved immediately
      expect(spy).not.toHaveBeenCalled();
      
      // Advance time
      vi.advanceTimersByTime(200);
      
      // Should be saved now
      expect(spy).toHaveBeenCalled();
      const savedData = JSON.parse(spy.mock.calls[0][1]);
      expect(savedData.currentNodeId).toBe('delayed-node');
    });
  });

  describe('Session Storage Functions', () => {
    it('should save and load session state correctly', () => {
      const state: Partial<PersistedSessionState> = {
        uiState: {
          pixelMenuOpen: true,
          embeddedComponent: 'code-editor',
          pixelState: 'minimized',
          wysiwygEditorOpen: false,
          assetBrowserOpen: true,
          assetBrowserType: 'sprites',
          selectedGameType: 'platformer',
          isMinimizing: false,
          previewMode: 'gameplay'
        }
      };

      saveSessionState(state);
      const loaded = loadSessionState();

      expect(loaded).toBeTruthy();
      expect(loaded?.uiState.pixelMenuOpen).toBe(true);
      expect(loaded?.uiState.embeddedComponent).toBe('code-editor');
      expect(loaded?.uiState.selectedGameType).toBe('platformer');
      expect(loaded?.version).toBe('1.0.0');
    });

    it('should clear session state correctly', () => {
      saveSessionState({ uiState: { pixelMenuOpen: true } as any });
      expect(loadSessionState()).toBeTruthy();
      
      clearSessionState();
      expect(loadSessionState()).toBeNull();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('wizard.session.v1');
    });

    it('should handle corrupted session storage data', () => {
      sessionStorageMock.setItem('wizard.session.v1', 'invalid-json');
      const loaded = loadSessionState();
      expect(loaded).toBeNull();
      expect(sessionStorageMock.removeItem).toHaveBeenCalledWith('wizard.session.v1');
    });
  });

  describe('Cookie Functions', () => {
    it('should set and get cookies correctly', () => {
      setCookie('test', 'value123');
      expect(getCookie('test')).toBe('value123');
      
      setCookie('theme', 'dark');
      expect(getCookie('theme')).toBe('dark');
    });

    it('should set cookies with correct prefix', () => {
      setCookie('preference', 'value');
      const allCookies = document.cookie;
      expect(allCookies).toContain('wizard_preference=value');
    });

    it('should delete cookies correctly', () => {
      setCookie('temp', 'data');
      expect(getCookie('temp')).toBe('data');
      
      deleteCookie('temp');
      expect(getCookie('temp')).toBeNull();
    });

    it('should handle cookie errors gracefully', () => {
      // Override document.cookie to throw error
      Object.defineProperty(document, 'cookie', {
        get: () => { throw new Error('Cookie access denied'); },
        set: () => { throw new Error('Cookie access denied'); },
        configurable: true
      });

      setCookie('test', 'value');
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Storage operation failed'),
        expect.any(Error)
      );

      const value = getCookie('test');
      expect(value).toBeNull();
    });
  });

  describe('User Preferences', () => {
    it('should save and load user preferences correctly', () => {
      const prefs: UserPreferences = {
        theme: 'dark',
        dismissedTips: ['tip1', 'tip2'],
        soundEnabled: false,
        autoSaveEnabled: true
      };

      saveUserPreferences(prefs);
      const loaded = loadUserPreferences();

      expect(loaded.theme).toBe('dark');
      expect(loaded.dismissedTips).toEqual(['tip1', 'tip2']);
      expect(loaded.soundEnabled).toBe(false);
      expect(loaded.autoSaveEnabled).toBe(true);
    });

    it('should handle partial preference updates', () => {
      saveUserPreferences({ theme: 'light' });
      saveUserPreferences({ soundEnabled: true });
      
      const loaded = loadUserPreferences();
      expect(loaded.theme).toBe('light');
      expect(loaded.soundEnabled).toBe(true);
    });

    it('should provide defaults for missing preferences', () => {
      // Clear all cookies
      cookieMock.clear();
      
      const loaded = loadUserPreferences();
      expect(loaded.theme).toBe('system');
      expect(loaded.dismissedTips).toEqual([]);
      expect(loaded.soundEnabled).toBe(true);
      expect(loaded.autoSaveEnabled).toBe(true);
    });
  });

  describe('Data Migration', () => {
    it('should migrate data from older versions', () => {
      // Simulate old version data
      const oldData = {
        version: '0.9.0',
        currentNodeId: 'old-node',
        gameType: 'platformer',
        updatedAt: '2024-01-01'
      };
      
      localStorageMock.setItem('wizard.state.v1', JSON.stringify(oldData));
      
      const loaded = loadWizardState();
      expect(loaded?.version).toBe('1.0.0');
      expect(loaded?.currentNodeId).toBe('old-node');
      expect(loaded?.gameType).toBe('platformer');
    });

    it('should run migration on app initialization', () => {
      // Set up old version data
      const oldWizardState = {
        version: '0.8.0',
        currentNodeId: 'test'
      };
      const oldSessionState = {
        version: '0.8.0',
        uiState: { pixelMenuOpen: false }
      };
      
      localStorageMock.setItem('wizard.state.v1', JSON.stringify(oldWizardState));
      sessionStorageMock.setItem('wizard.session.v1', JSON.stringify(oldSessionState));
      
      migrateStorageIfNeeded();
      
      // Check that data was migrated
      const wizardState = JSON.parse(localStorageMock.getItem('wizard.state.v1') || '{}');
      const sessionState = JSON.parse(sessionStorageMock.getItem('wizard.session.v1') || '{}');
      
      expect(wizardState.version).toBe('1.0.0');
      expect(sessionState.version).toBe('1.0.0');
    });
  });

  describe('Clear All Data', () => {
    it('should clear all wizard-related data', () => {
      // Set up data in all storage types
      saveWizardState({ currentNodeId: 'test' });
      saveSessionState({ uiState: { pixelMenuOpen: true } as any });
      setCookie('theme', 'dark');
      setCookie('sound_enabled', 'true');
      setCookie('other_cookie', 'value'); // Non-wizard cookie
      
      clearAllData();
      
      // Check everything is cleared
      expect(loadWizardState()).toBeNull();
      expect(loadSessionState()).toBeNull();
      expect(getCookie('theme')).toBeNull();
      expect(getCookie('sound_enabled')).toBeNull();
      
      // Non-wizard cookies should remain (if we had any)
      // In this test environment, all wizard cookies are cleared
    });
  });

  describe('Storage Availability', () => {
    it('should correctly detect when storage is available', () => {
      expect(isStorageAvailable()).toBe(true);
    });

    it('should correctly detect when storage is not available', () => {
      // Make localStorage throw error
      Object.defineProperty(window, 'localStorage', {
        value: {
          setItem: () => { throw new Error('Storage disabled'); },
          getItem: () => { throw new Error('Storage disabled'); },
          removeItem: () => { throw new Error('Storage disabled'); }
        },
        writable: true
      });

      expect(isStorageAvailable()).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from corrupted wizard state', () => {
      // Save valid state first
      saveWizardState({ currentNodeId: 'valid-node' });
      expect(loadWizardState()?.currentNodeId).toBe('valid-node');
      
      // Corrupt the data
      localStorageMock.setItem('wizard.state.v1', 'corrupted-data-{[}]');
      
      // Try to load - should clear and return null
      const loaded = loadWizardState();
      expect(loaded).toBeNull();
      
      // Storage should be cleared
      expect(localStorageMock.getItem('wizard.state.v1')).toBeNull();
      
      // Should be able to save new state
      saveWizardState({ currentNodeId: 'new-node' });
      expect(loadWizardState()?.currentNodeId).toBe('new-node');
    });

    it('should recover from corrupted session state', () => {
      // Save valid state
      saveSessionState({ uiState: { pixelMenuOpen: true } as any });
      expect(loadSessionState()?.uiState.pixelMenuOpen).toBe(true);
      
      // Corrupt the data
      sessionStorageMock.setItem('wizard.session.v1', '{invalid-json}');
      
      // Try to load - should clear and return null
      const loaded = loadSessionState();
      expect(loaded).toBeNull();
      
      // Should be able to save new state
      saveSessionState({ uiState: { pixelMenuOpen: false } as any });
      expect(loadSessionState()?.uiState.pixelMenuOpen).toBe(false);
    });
  });

  describe('Version Handling', () => {
    it('should add version to new data', () => {
      saveWizardState({ currentNodeId: 'test' });
      const loaded = loadWizardState();
      expect(loaded?.version).toBe('1.0.0');
    });

    it('should update version when migrating old data', () => {
      const oldData = {
        currentNodeId: 'test'
        // No version field
      };
      localStorageMock.setItem('wizard.state.v1', JSON.stringify(oldData));
      
      const loaded = loadWizardState();
      expect(loaded?.version).toBe('1.0.0');
      expect(loaded?.currentNodeId).toBe('test');
    });

    it('should preserve data during version migration', () => {
      const oldData = {
        version: '0.5.0',
        currentNodeId: 'preserved-node',
        gameType: 'rpg',
        sessionActions: {
          choices: ['a', 'b', 'c'],
          unlockedEditor: true
        }
      };
      localStorageMock.setItem('wizard.state.v1', JSON.stringify(oldData));
      
      const loaded = loadWizardState();
      expect(loaded?.version).toBe('1.0.0');
      expect(loaded?.currentNodeId).toBe('preserved-node');
      expect(loaded?.gameType).toBe('rpg');
      expect(loaded?.sessionActions?.choices).toEqual(['a', 'b', 'c']);
      expect(loaded?.sessionActions?.unlockedEditor).toBe(true);
    });
  });
});