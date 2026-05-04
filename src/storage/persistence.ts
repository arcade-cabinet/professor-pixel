// Persistence library for wizard state management
// Handles localStorage, sessionStorage, and cookies for state persistence

// Type definitions for persisted data
export interface PersistedWizardState {
  version: string;
  activeFlowPath: string | null;
  currentNodeId: string;
  gameType: string | null;
  selectedGameType: string | null;
  sessionActions: {
    choices: string[];
    createdAssets: string[];
    gameType: string | null;
    selectedGameType?: string | null;
    currentProject: any | null;
    completedSteps: string[];
    unlockedEditor: boolean;
    selectedComponents?: Record<string, string>;
    compiledScenes?: Record<string, boolean>;
    gameAssembled?: boolean;
    titlePresetApplied?: boolean;
    gameplayConfigured?: boolean;
    endingConfigured?: boolean;
  };
  updatedAt: string;
}

export interface PersistedSessionState {
  version: string;
  uiState: {
    pixelMenuOpen: boolean;
    embeddedComponent: string;
    pixelState: string;
    wysiwygEditorOpen: boolean;
    assetBrowserOpen: boolean;
    assetBrowserType: string;
    selectedGameType?: string;
    isMinimizing: boolean;
    minimizeMessage?: string;
    previewMode?: string;
    viewMode?: string;
    pyodideMode?: boolean;
    curatedMode?: boolean;
  };
  updatedAt: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  dismissedTips?: string[];
  soundEnabled?: boolean;
  autoSaveEnabled?: boolean;
}

// Constants
const STORAGE_VERSION = '1.0.0';
const WIZARD_STATE_KEY = 'wizard.state.v1';
const SESSION_STATE_KEY = 'wizard.session.v1';
const PREFERENCES_COOKIE_PREFIX = 'wizard_';
const COOKIE_EXPIRY_DAYS = 365;
const DEBOUNCE_DELAY = 200; // milliseconds

// Debounce utility
function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null;
  
  return function (...args: Parameters<T>) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

// Error handler for storage operations
function handleStorageError(error: Error, operation: string): void {
  console.error(`Storage operation failed (${operation}):`, error);
  
  // Send error to monitoring if available
  if (typeof window !== 'undefined' && (window as any).trackError) {
    (window as any).trackError(error, { operation, type: 'storage' });
  }
}

// Validate and migrate stored data
function validateAndMigrate<T>(data: any, currentVersion: string): T | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  
  // Check version and perform migrations if needed
  const storedVersion = data.version || '0.0.0';
  
  if (storedVersion !== currentVersion) {
    console.log(`Migrating data from version ${storedVersion} to ${currentVersion}`);
    // Add migration logic here as needed in the future
    data.version = currentVersion;
  }
  
  return data as T;
}

// LocalStorage functions for wizard state
export function saveWizardState(state: Partial<PersistedWizardState>): void {
  try {
    const currentState = loadWizardState();
    const newState: PersistedWizardState = {
      ...currentState,
      ...state,
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString()
    };
    
    localStorage.setItem(WIZARD_STATE_KEY, JSON.stringify(newState));
  } catch (error) {
    handleStorageError(error as Error, 'saveWizardState');
  }
}

// Debounced version of saveWizardState
export const saveWizardStateDebounced = debounce(saveWizardState, DEBOUNCE_DELAY);

export function loadWizardState(): PersistedWizardState | null {
  try {
    const stored = localStorage.getItem(WIZARD_STATE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return validateAndMigrate<PersistedWizardState>(parsed, STORAGE_VERSION);
  } catch (error) {
    handleStorageError(error as Error, 'loadWizardState');
    // Clear corrupted data
    clearWizardState();
    return null;
  }
}

export function clearWizardState(): void {
  try {
    localStorage.removeItem(WIZARD_STATE_KEY);
  } catch (error) {
    handleStorageError(error as Error, 'clearWizardState');
  }
}

// SessionStorage functions for UI state
export function saveSessionState(state: Partial<PersistedSessionState>): void {
  try {
    const currentState = loadSessionState();
    const newState: PersistedSessionState = {
      ...currentState,
      ...state,
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString()
    };
    
    sessionStorage.setItem(SESSION_STATE_KEY, JSON.stringify(newState));
  } catch (error) {
    handleStorageError(error as Error, 'saveSessionState');
  }
}

export function loadSessionState(): PersistedSessionState | null {
  try {
    const stored = sessionStorage.getItem(SESSION_STATE_KEY);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    return validateAndMigrate<PersistedSessionState>(parsed, STORAGE_VERSION);
  } catch (error) {
    handleStorageError(error as Error, 'loadSessionState');
    // Clear corrupted data
    clearSessionState();
    return null;
  }
}

export function clearSessionState(): void {
  try {
    sessionStorage.removeItem(SESSION_STATE_KEY);
  } catch (error) {
    handleStorageError(error as Error, 'clearSessionState');
  }
}

// Cookie functions for user preferences
export function setCookie(name: string, value: string, days: number = COOKIE_EXPIRY_DAYS): void {
  try {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = `expires=${date.toUTCString()}`;
    
    // Use SameSite=Lax for GitHub Pages compatibility
    document.cookie = `${PREFERENCES_COOKIE_PREFIX}${name}=${value};${expires};path=/;SameSite=Lax`;
  } catch (error) {
    handleStorageError(error as Error, 'setCookie');
  }
}

export function getCookie(name: string): string | null {
  try {
    const fullName = `${PREFERENCES_COOKIE_PREFIX}${name}`;
    const cookies = document.cookie.split(';');
    
    for (const cookie of cookies) {
      const trimmed = cookie.trim();
      if (trimmed.startsWith(`${fullName}=`)) {
        return trimmed.substring(fullName.length + 1);
      }
    }
    
    return null;
  } catch (error) {
    handleStorageError(error as Error, 'getCookie');
    return null;
  }
}

export function deleteCookie(name: string): void {
  try {
    setCookie(name, '', -1);
  } catch (error) {
    handleStorageError(error as Error, 'deleteCookie');
  }
}

// User preferences helpers
export function saveUserPreferences(prefs: UserPreferences): void {
  try {
    if (prefs.theme !== undefined) {
      setCookie('theme', prefs.theme);
    }
    
    if (prefs.dismissedTips !== undefined) {
      setCookie('tips_dismissed', JSON.stringify(prefs.dismissedTips));
    }
    
    if (prefs.soundEnabled !== undefined) {
      setCookie('sound_enabled', prefs.soundEnabled.toString());
    }
    
    if (prefs.autoSaveEnabled !== undefined) {
      setCookie('auto_save_enabled', prefs.autoSaveEnabled.toString());
    }
  } catch (error) {
    handleStorageError(error as Error, 'saveUserPreferences');
  }
}

export function loadUserPreferences(): UserPreferences {
  try {
    const theme = getCookie('theme');
    const dismissedTipsStr = getCookie('tips_dismissed');
    const soundEnabled = getCookie('sound_enabled');
    const autoSaveEnabled = getCookie('auto_save_enabled');
    
    return {
      theme: (theme as 'light' | 'dark' | 'system') || 'system',
      dismissedTips: dismissedTipsStr ? JSON.parse(dismissedTipsStr) : [],
      soundEnabled: soundEnabled === 'true',
      autoSaveEnabled: autoSaveEnabled !== 'false' // Default to true
    };
  } catch (error) {
    handleStorageError(error as Error, 'loadUserPreferences');
    return {
      theme: 'system',
      dismissedTips: [],
      soundEnabled: true,
      autoSaveEnabled: true
    };
  }
}

// Clear all stored data
export function clearAllData(): void {
  clearWizardState();
  clearSessionState();
  
  // Clear all wizard-related cookies
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex > -1) {
      const name = trimmed.substring(0, eqIndex);
      if (name.startsWith(PREFERENCES_COOKIE_PREFIX)) {
        const shortName = name.substring(PREFERENCES_COOKIE_PREFIX.length);
        deleteCookie(shortName);
      }
    }
  }
}

// Migration utilities for future updates
export function migrateStorageIfNeeded(): void {
  // This function can be called on app initialization to handle
  // any necessary data migrations between versions
  const wizardState = loadWizardState();
  const sessionState = loadSessionState();
  
  // Perform any needed migrations here
  if (wizardState && wizardState.version !== STORAGE_VERSION) {
    console.log('Migrating wizard state to new version');
    saveWizardState(wizardState);
  }
  
  if (sessionState && sessionState.version !== STORAGE_VERSION) {
    console.log('Migrating session state to new version');
    saveSessionState(sessionState);
  }
}

// Export a function to check if storage is available
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}