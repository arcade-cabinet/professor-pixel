// Cover the localStorage catch fallbacks in app/pages/home.tsx:
//   - line 34: readLastLandingPath catch → return null
//   - line 50: readHasSeenIntro catch → return false
//
// Existing home tests don't make localStorage.getItem throw, so the
// catch arms stay cold. Spy via Storage.prototype to throw, then
// mount Home and assert it doesn't crash. Coverage is the contract.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
}));

vi.mock('@lib/storage/persistence', () => ({
  loadWizardState: () => null,
  saveWizardState: vi.fn(),
  // Mirror src/storage/persistence.ts shape: try/catch swallows
  // SecurityError / QuotaExceededError / no-storage-mode so the home
  // page never sees a throw bubble up. The cold-arm test below spies
  // localStorage to throw and expects render not to crash.
  loadLastLandingPath: () => {
    try {
      const v = localStorage.getItem('pp.lastLandingPath');
      return v === 'wizard' || v === 'lessons' ? v : null;
    } catch {
      return null;
    }
  },
  saveLastLandingPath: (p: 'wizard' | 'lessons') => {
    try {
      localStorage.setItem('pp.lastLandingPath', p);
    } catch {
      /* fail silently */
    }
  },
  hasSeenIntro: () => {
    try {
      return localStorage.getItem('pp.hasSeenIntro') === '1';
    } catch {
      return false;
    }
  },
  markIntroSeen: () => {
    try {
      localStorage.setItem('pp.hasSeenIntro', '1');
    } catch {
      /* fail silently */
    }
  },
}));

vi.mock('@lib/storage/projects', () => ({
  listWizardProjects: () => Promise.resolve([]),
  loadWizardProject: vi.fn(),
  deleteWizardProject: vi.fn(),
  renameWizardProject: vi.fn(),
  cloneWizardProject: vi.fn(),
}));

vi.mock('@lib/pygame/runtime/exporter', () => ({
  exportSavedProject: vi.fn(),
  slugify: (s: string) => s.toLowerCase(),
}));

vi.mock('@lib/storage/quota', () => ({
  shouldWarnQuota: () => Promise.resolve(false),
  markQuotaWarned: vi.fn(),
}));

vi.mock('@lib/storage/broadcast', () => ({
  subscribeStorageEvents: () => () => {},
}));

vi.mock('@/components/wizard/universal', () => ({
  default: () => <div data-testid="universal-wizard-stub" />,
}));
vi.mock('@/components/audio-toggle', () => ({
  default: () => <button>Audio</button>,
}));
vi.mock('@/components/ui/offline-banner', () => ({ default: () => null }));
vi.mock('@/components/ui/storage-blocked-notice', () => ({ default: () => null }));
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

import Home from '@/pages/home';

beforeEach(() => {
  // Make every localStorage read throw so both readLastLandingPath
  // and readHasSeenIntro hit their catch arms.
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new DOMException('SecurityError', 'SecurityError');
  });
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home — localStorage catch fallbacks (lines 34, 50)', () => {
  it('renders without crashing when both helpers throw on localStorage.getItem', () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    expect(() =>
      render(
        <QueryClientProvider client={client}>
          <Home />
        </QueryClientProvider>
      )
    ).not.toThrow();
  });
});
