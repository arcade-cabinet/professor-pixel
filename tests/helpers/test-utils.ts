// Test utilities and helpers for testing the wizard application
import { vi } from 'vitest';
import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { WizardNode, DialogueState, SessionActions } from '@lib/wizard/types';

// Mock localStorage with spy capabilities
export class LocalStorageMock {
  private store: Record<string, string> = {};

  getItem = vi.fn((key: string): string | null => {
    return this.store[key] || null;
  });

  setItem = vi.fn((key: string, value: string): void => {
    this.store[key] = value;
  });

  removeItem = vi.fn((key: string): void => {
    delete this.store[key];
  });

  clear = vi.fn((): void => {
    this.store = {};
  });

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store);
    return keys[index] || null;
  }

  // Test helper methods
  getStore(): Record<string, string> {
    return { ...this.store };
  }

  setStore(store: Record<string, string>): void {
    this.store = { ...store };
  }
}

// Mock sessionStorage with spy capabilities
export class SessionStorageMock extends LocalStorageMock {}

// Cookie mock utilities
export class CookieMock {
  private cookies: Record<string, string> = {};

  get document() {
    return {
      cookie: {
        get: () => {
          return Object.entries(this.cookies)
            .map(([key, value]) => `${key}=${value}`)
            .join('; ');
        },
        set: (value: string) => {
          // Parse a Set-Cookie-style string. The first segment is name=value;
          // subsequent segments are attributes (expires, path, SameSite, …).
          const segments = value.split(';').map((s) => s.trim());
          const first = segments[0];
          if (!first) return;
          const eq = first.indexOf('=');
          if (eq < 0) return;
          const key = first.slice(0, eq);
          const val = first.slice(eq + 1);

          const expiresAttr = segments.slice(1).find((s) => s.toLowerCase().startsWith('expires='));
          if (expiresAttr) {
            const expiryDate = new Date(expiresAttr.slice('expires='.length));
            if (Number.isFinite(expiryDate.getTime()) && expiryDate < new Date()) {
              delete this.cookies[key];
              return;
            }
          }
          this.cookies[key] = val;
        },
      },
    };
  }

  clear(): void {
    this.cookies = {};
  }

  getCookie(name: string): string | null {
    return this.cookies[name] || null;
  }

  setCookie(name: string, value: string): void {
    this.cookies[name] = value;
  }

  getCookies(): Record<string, string> {
    return { ...this.cookies };
  }
}

// Test data generators
export const createMockWizardNode = (overrides?: Partial<WizardNode>): WizardNode => ({
  id: 'test-node',
  text: 'Test node text',
  speaker: 'pixel',
  options: [
    { text: 'Option 1', next: 'next-node-1' },
    { text: 'Option 2', next: 'next-node-2' },
  ],
  ...overrides,
});

export const createMockDialogueState = (overrides?: Partial<DialogueState>): DialogueState => ({
  currentNodeId: 'start',
  currentNode: createMockWizardNode({ id: 'start' }),
  dialogueStep: 0,
  carouselIndex: 0,
  showAllChoices: false,
  ...overrides,
});

export const createMockSessionActions = (overrides?: Partial<SessionActions>): SessionActions => ({
  choices: [],
  createdAssets: [],
  gameType: null,
  currentProject: null,
  completedSteps: [],
  unlockedEditor: false,
  ...overrides,
});

export const createMockFlowData = (): Record<string, WizardNode> => ({
  start: createMockWizardNode({
    id: 'start',
    text: 'Welcome to the wizard!',
    options: [{ text: 'Start journey', next: 'choose-game' }],
  }),
  'choose-game': createMockWizardNode({
    id: 'choose-game',
    text: 'Choose your game type',
    options: [
      { text: 'Platformer', next: 'platformer-intro', setVariable: { gameType: 'platformer' } },
      { text: 'RPG', next: 'rpg-intro', setVariable: { gameType: 'rpg' } },
      { text: 'Racing', next: 'racing-intro', setVariable: { gameType: 'racing' } },
    ],
  }),
  'platformer-intro': createMockWizardNode({
    id: 'platformer-intro',
    text: 'Welcome to platformer creation!',
    action: 'transitionToSpecializedFlow',
    options: [{ text: 'Continue', next: 'platformer-setup' }],
  }),
  'rpg-intro': createMockWizardNode({
    id: 'rpg-intro',
    text: 'Welcome to RPG creation!',
    action: 'transitionToSpecializedFlow',
    options: [{ text: 'Continue', next: 'rpg-setup' }],
  }),
  'racing-intro': createMockWizardNode({
    id: 'racing-intro',
    text: 'Welcome to racing game creation!',
    action: 'transitionToSpecializedFlow',
    options: [{ text: 'Continue', next: 'racing-setup' }],
  }),
});

// Custom matchers for persistence testing
export const persistenceMatchers = {
  toHavePersistedState(received: any, expected: any) {
    const pass = JSON.stringify(received) === JSON.stringify(expected);
    return {
      pass,
      message: () =>
        pass
          ? `Expected state not to be persisted as ${JSON.stringify(expected)}`
          : `Expected state to be persisted as ${JSON.stringify(expected)}, but got ${JSON.stringify(received)}`,
    };
  },

  toHaveValidVersion(received: any, expectedVersion: string) {
    const pass = received?.version === expectedVersion;
    return {
      pass,
      message: () =>
        pass
          ? `Expected version not to be ${expectedVersion}`
          : `Expected version to be ${expectedVersion}, but got ${received?.version}`,
    };
  },
};

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to trigger storage events
export const triggerStorageEvent = (
  key: string,
  newValue: string | null,
  oldValue: string | null = null
) => {
  const event = new StorageEvent('storage', {
    key,
    newValue,
    oldValue,
    storageArea: localStorage,
    url: window.location.href,
  });
  window.dispatchEvent(event);
};

// Helper to simulate page refresh
export const simulatePageRefresh = () => {
  // Save current localStorage and sessionStorage
  const localStorageData = { ...localStorage };
  const sessionStorageData = { ...sessionStorage };

  // Simulate unload
  window.dispatchEvent(new Event('beforeunload'));

  // Clear memory state but keep storage
  // This simulates what happens during a real page refresh

  // Simulate load with storage intact
  window.dispatchEvent(new Event('load'));

  return {
    localStorageData,
    sessionStorageData,
  };
};

// Helper to create corrupted storage data
export const createCorruptedData = () => {
  return {
    invalid: 'not-json-{[}]',
    malformed: '{"partial": ',
    wrongType: '123',
    missingVersion: JSON.stringify({ data: 'test' }),
    wrongVersion: JSON.stringify({ version: '0.0.1', data: 'old' }),
  };
};

// Render helper with providers
export const renderWithProviders = (ui: ReactElement, options?: RenderOptions) => {
  // Add any necessary providers here (Router, Theme, etc.)
  return render(ui, options);
};

// Mock fetch responses for flow loading
export const mockFlowResponse = (data: Record<string, WizardNode>, delay: number = 0) => {
  return vi.fn(
    () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            ok: true,
            json: () => Promise.resolve(data),
          });
        }, delay);
      })
  );
};

// Helper to validate flow structure
export const validateFlowStructure = (
  flow: Record<string, WizardNode>
): {
  valid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];
  const nodeIds = new Set(Object.keys(flow));

  for (const [nodeId, node] of Object.entries(flow)) {
    // Check node has required fields
    if (!node.id) errors.push(`Node ${nodeId} missing id`);
    if (!node.text) errors.push(`Node ${nodeId} missing text`);

    // Check options point to valid nodes
    if (node.options) {
      for (const option of node.options) {
        if (option.next && !nodeIds.has(option.next)) {
          errors.push(`Node ${nodeId} option points to non-existent node: ${option.next}`);
        }
      }
    }

    // Check for continue-only nodes (should have meaningful choices)
    if (node.options?.length === 1 && node.options[0].text === 'Continue') {
      if (!node.action) {
        errors.push(`Node ${nodeId} is continue-only without an action`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Export all mocks and utilities
export const testUtils = {
  LocalStorageMock,
  SessionStorageMock,
  CookieMock,
  createMockWizardNode,
  createMockDialogueState,
  createMockSessionActions,
  createMockFlowData,
  persistenceMatchers,
  waitFor,
  triggerStorageEvent,
  simulatePageRefresh,
  createCorruptedData,
  renderWithProviders,
  mockFlowResponse,
  validateFlowStructure,
};
