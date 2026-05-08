// Persistence library for wizard state management
// Handles localStorage, sessionStorage, and cookies for state persistence

import { z } from 'zod';
import type { SessionActions, UIState } from '@lib/wizard/types';

// Type definitions for persisted data
export interface PersistedWizardState {
  version: string;
  activeFlowPath?: string | null;
  currentNodeId?: string;
  /**
   * Position within a multiStep node. Persisted so a kid who refreshes
   * mid-multiStep (e.g. parked on slide 2 of a 4-slide tutorial node)
   * resumes on the same slide instead of restarting the node from step 0.
   * Only meaningful for nodes whose `multiStep` array exists; for plain
   * single-text nodes this is always 0.
   */
  dialogueStep?: number;
  gameType?: string | null;
  selectedGameType?: string | null;
  sessionActions?: SessionActions;
  /**
   * Asset IDs (not full GameAsset objects) selected by the kid during the
   * wizard. Stored as IDs so the asset catalog stays the source of truth —
   * if an asset's metadata changes between sessions, the wizard sees the
   * fresh version on rehydration. Re-resolved against `assetManager` /
   * the catalog at mount time.
   */
  selectedAssetIds?: string[];
  updatedAt: string;
}

export interface PersistedSessionState {
  version: string;
  uiState?: UIState;
  /** Free-form game name set by the wizard's "name your game" step. */
  gameName?: string;
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
const INTRO_SEEN_KEY = 'pp.hasSeenIntro';
const LANDING_PATH_KEY = 'pp.lastLandingPath';

// Debounce utility — generic over the function signature so callers keep
// their argument types intact through the wrapper.
function debounce<TArgs extends unknown[]>(
  func: (...args: TArgs) => unknown,
  delay: number
): (...args: TArgs) => void {
  let timeoutId: NodeJS.Timeout | null = null;

  return function (...args: TArgs) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func(...args);
      timeoutId = null;
    }, delay);
  };
}

// Detect a quota-exceeded error across browsers. Firefox uses NS_ERROR_DOM_QUOTA_REACHED
// (code 1014); Chrome/Safari use QuotaExceededError (code 22). DOMException name is
// the most reliable signal post-2018, but older Safari still returns string names.
export function isQuotaExceeded(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  const code = (error as Error & { code?: number }).code;
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014 ||
    /quota/i.test(error.message)
  );
}

// Error handler for storage operations. On QuotaExceeded we surface a kid-
// friendly toast (if the host page wires one up) so the player isn't blindsided
// by a silent save failure mid-session.
function handleStorageError(error: Error, operation: string): void {
  console.error(`Storage operation failed (${operation}):`, error);

  // Both branches below touch `window`. SSR + Node test runs hit this when
  // a fake-storage shim throws — gate ALL window access behind a single
  // typeof check so we don't ReferenceError before reaching the real bug.
  if (typeof window === 'undefined') return;

  if (isQuotaExceeded(error)) {
    const winWithToast = window as Window & { toast?: (msg: unknown) => void };
    if (typeof winWithToast.toast === 'function') {
      winWithToast.toast(
        "Looks like your saved games are full! Open the menu to clear old data, or your browser's site settings."
      );
    }
  }

  const winWithTrack = window as Window & {
    trackError?: (err: Error, context: Record<string, unknown>) => void;
  };
  if (winWithTrack.trackError) {
    winWithTrack.trackError(error, {
      operation,
      type: 'storage',
      quotaExceeded: isQuotaExceeded(error),
    });
  }
}

// Schemas for persisted payloads. We treat localStorage as untrusted input —
// another tab, an extension, or a user's devtools session could put anything
// there. Validating with zod prevents `selectedAssetIds: ["a", 42, null]`
// from sneaking past the type system and exploding inside React render.
//
// Unknown fields are passed through (`.passthrough()`) so a kid who switched
// to a newer build doesn't lose data when the schema gains optional fields.
// `version` and `updatedAt` are required at write time, but legacy payloads
// (pre-migration) may be missing one or both. Mark optional so the migration
// path can repair them rather than rejecting the whole record.
export const persistedWizardStateSchema = z
  .object({
    version: z.string().optional(),
    activeFlowPath: z.string().nullable().optional(),
    currentNodeId: z.string().optional(),
    dialogueStep: z.number().int().nonnegative().optional(),
    gameType: z.string().nullable().optional(),
    selectedGameType: z.string().nullable().optional(),
    sessionActions: z.record(z.string(), z.unknown()).optional(),
    selectedAssetIds: z.array(z.string()).optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

// UIState lives in wizard/types.ts as a hand-rolled type; persisted UI is
// transient (sessionStorage), so we accept any object and let the consumer
// guard individual fields. The structural pieces we DO care about (version,
// gameName) are validated; everything else is passthrough.
const persistedSessionStateSchema = z
  .object({
    version: z.string().optional(),
    uiState: z.record(z.string(), z.unknown()).optional(),
    gameName: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

// Validate and migrate stored data. Parses untrusted JSON.parse output through
// the supplied schema and bumps the `version` field if the payload is from an
// older build. Returns null on validation failure so the caller can clear the
// corrupted record.
function validateAndMigrate<T extends z.ZodTypeAny>(
  data: unknown,
  schema: T,
  currentVersion: string
): z.infer<T> | null {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    console.warn('Persisted data failed schema validation:', parsed.error.issues);
    return null;
  }

  const bag = parsed.data as { version?: string };
  const storedVersion = bag.version || '0.0.0';
  if (storedVersion !== currentVersion) {
    console.log(`Migrating data from version ${storedVersion} to ${currentVersion}`);
    bag.version = currentVersion;
  }

  return parsed.data;
}

// LocalStorage functions for wizard state
export function saveWizardState(state: Partial<PersistedWizardState>): void {
  try {
    const currentState = loadWizardState();
    const newState: PersistedWizardState = {
      ...currentState,
      ...state,
      version: STORAGE_VERSION,
      updatedAt: new Date().toISOString(),
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
    return validateAndMigrate(
      parsed,
      persistedWizardStateSchema,
      STORAGE_VERSION
    ) as PersistedWizardState | null;
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
      updatedAt: new Date().toISOString(),
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
    return validateAndMigrate(
      parsed,
      persistedSessionStateSchema,
      STORAGE_VERSION
    ) as PersistedSessionState | null;
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
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
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
      soundEnabled: soundEnabled !== 'false', // Default to true
      autoSaveEnabled: autoSaveEnabled !== 'false', // Default to true
    };
  } catch (error) {
    handleStorageError(error as Error, 'loadUserPreferences');
    return {
      theme: 'system',
      dismissedTips: [],
      soundEnabled: true,
      autoSaveEnabled: true,
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
  // Inspect the raw stored payload (loadWizardState would have already
  // upgraded the in-memory version field in validateAndMigrate).
  const needsWizardMigration = needsMigration(WIZARD_STATE_KEY, localStorage);
  const needsSessionMigration = needsMigration(SESSION_STATE_KEY, sessionStorage);

  if (needsWizardMigration) {
    const wizardState = loadWizardState();
    if (wizardState) {
      console.log('Migrating wizard state to new version');
      saveWizardState(wizardState);
    }
  }

  if (needsSessionMigration) {
    const sessionState = loadSessionState();
    if (sessionState) {
      console.log('Migrating session state to new version');
      saveSessionState(sessionState);
    }
  }
}

function needsMigration(key: string, storage: Storage): boolean {
  try {
    const raw = storage.getItem(key);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.version !== STORAGE_VERSION;
  } catch {
    return false;
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
  } catch (_e) {
    return false;
  }
}

/* ─── Landing-chooser preferences (consumed by app/pages/home.tsx) ────────
 * The home page remembers two scrap-of-state values: which path the user
 * last took ('wizard' | 'lessons') and whether the intro card has been
 * dismissed. Both are tiny KV reads at boot, so localStorage is correct
 * (sync, no async OPFS round-trip on first paint).
 *
 * These wrappers let the TSX call typed helpers instead of inline
 * try/catch around localStorage. SSR-safe: typeof window guards mean the
 * functions return defensible defaults under jsdom-without-window or any
 * future server-render.
 * ----------------------------------------------------------------------- */

export type LandingPath = 'wizard' | 'lessons';

export function loadLastLandingPath(): LandingPath | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LANDING_PATH_KEY);
    return stored === 'wizard' || stored === 'lessons' ? stored : null;
  } catch {
    return null;
  }
}

export function saveLastLandingPath(path: LandingPath): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LANDING_PATH_KEY, path);
  } catch {
    // QuotaExceededError or similar — fail silently; chooser still works.
  }
}

export function hasSeenIntro(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    // ignore
  }
}
