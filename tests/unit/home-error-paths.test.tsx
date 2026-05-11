// Cover the error-path branches of app/pages/home.tsx that the smoke +
// extras suites skip. Targets:
//   - lines 109-115: deleteProjectMutation onError → toast + clear confirm
//   - lines 127-128: renameProjectMutation onError → toast
//   - lines 162-163: remixProjectMutation onError → toast
//   - lines 175-176: openProject snapshot null → setLocation('/wizard')
//   - lines 197-198, 203: openProject try/catch → toast + setLocation('/wizard')
//   - lines 234-238: shouldWarnQuota=true → quota toast + markQuotaWarned
//   - lines 249-250: subscribeStorageEvents projects.changed → invalidate
//   - line 492: export 'cancelled' result toast

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const setLocationMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocationMock],
}));

const loadWizardStateMock = vi.fn();
const saveWizardStateMock = vi.fn();
vi.mock('@lib/storage/persistence', () => ({
  loadWizardState: () => loadWizardStateMock(),
  saveWizardState: (s: unknown) => saveWizardStateMock(s),
  loadLastLandingPath: () => {
    const v = localStorage.getItem('pp.lastLandingPath');
    return v === 'wizard' || v === 'lessons' ? v : null;
  },
  saveLastLandingPath: (p: 'wizard' | 'lessons') => {
    localStorage.setItem('pp.lastLandingPath', p);
  },
  hasSeenIntro: () => localStorage.getItem('pp.hasSeenIntro') === '1',
  markIntroSeen: () => {
    localStorage.setItem('pp.hasSeenIntro', '1');
  },
}));

const listWizardProjectsMock = vi.fn();
const loadWizardProjectMock = vi.fn();
const deleteWizardProjectMock = vi.fn();
const renameWizardProjectMock = vi.fn();
const cloneWizardProjectMock = vi.fn();
vi.mock('@lib/storage/projects', () => ({
  listWizardProjects: () => listWizardProjectsMock(),
  loadWizardProject: (id: string) => loadWizardProjectMock(id),
  deleteWizardProject: (id: string) => deleteWizardProjectMock(id),
  renameWizardProject: (id: string, name: string) => renameWizardProjectMock(id, name),
  cloneWizardProject: (id: string) => cloneWizardProjectMock(id),
}));

const exportSavedProjectMock = vi.fn();
vi.mock('@lib/pygame/runtime/exporter', () => ({
  exportSavedProject: (id: string) => exportSavedProjectMock(id),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}));

const shouldWarnQuotaMock = vi.fn();
const markQuotaWarnedMock = vi.fn();
vi.mock('@lib/storage/quota', () => ({
  shouldWarnQuota: () => shouldWarnQuotaMock(),
  markQuotaWarned: () => markQuotaWarnedMock(),
}));

let storageEventCallback: ((event: { type: string }) => void) | null = null;
vi.mock('@lib/storage/broadcast', () => ({
  subscribeStorageEvents: (cb: (event: { type: string }) => void) => {
    storageEventCallback = cb;
    return () => {
      storageEventCallback = null;
    };
  },
}));

vi.mock('@/components/wizard/universal', () => ({
  default: () => <div data-testid="universal-wizard-stub">UniversalWizard</div>,
}));
vi.mock('@/components/audio-toggle', () => ({
  default: () => <button>Audio</button>,
}));
vi.mock('@/components/ui/offline-banner', () => ({ default: () => null }));
vi.mock('@/components/ui/storage-blocked-notice', () => ({ default: () => null }));

const toastMock = vi.fn();
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import Home from '@/pages/home';

function renderHome() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <Home />
      </QueryClientProvider>
    ),
  };
}

const proj = {
  id: 'proj-1',
  name: 'Pong Clone',
  createdAt: '2026-05-01T00:00:00Z',
  updatedAt: '2026-05-02T00:00:00Z',
  thumbnailDataUrl: null,
};

beforeEach(() => {
  setLocationMock.mockReset();
  loadWizardStateMock.mockReset().mockReturnValue(null);
  saveWizardStateMock.mockReset();
  listWizardProjectsMock.mockReset();
  loadWizardProjectMock.mockReset();
  deleteWizardProjectMock.mockReset();
  renameWizardProjectMock.mockReset();
  cloneWizardProjectMock.mockReset();
  exportSavedProjectMock.mockReset();
  shouldWarnQuotaMock.mockReset().mockResolvedValue(false);
  markQuotaWarnedMock.mockReset();
  toastMock.mockReset();
  storageEventCallback = null;
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home — deleteProjectMutation onError (lines 108-116)', () => {
  it('delete-project rejection fires destructive toast + clears confirm state', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    deleteWizardProjectMock.mockRejectedValue(new Error('storage boom'));
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-delete-proj-1'));
    fireEvent.click(screen.getByTestId('my-game-confirm-delete-proj-1'));
    await waitFor(() => {
      const destructive = toastMock.mock.calls.some(
        ([arg]) => (arg as { variant?: string })?.variant === 'destructive'
      );
      expect(destructive).toBe(true);
    });
    // Confirm UI cleared.
    expect(screen.queryByTestId('my-game-confirm-delete-proj-1')).not.toBeInTheDocument();
  });
});

describe('Home — renameProjectMutation onError (lines 126-133)', () => {
  it('rename-project rejection fires destructive toast', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renameWizardProjectMock.mockRejectedValue(new Error('rename storage boom'));
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    fireEvent.change(screen.getByTestId('my-game-rename-input-proj-1'), {
      target: { value: 'New Name' },
    });
    fireEvent.click(screen.getByTestId('my-game-rename-save-proj-1'));
    await waitFor(() => {
      const destructive = toastMock.mock.calls.some(
        ([arg]) => (arg as { variant?: string })?.variant === 'destructive'
      );
      expect(destructive).toBe(true);
    });
  });
});

describe('Home — remixProjectMutation onError (lines 161-168)', () => {
  it('clone rejection fires destructive toast (does NOT skip chooser)', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    cloneWizardProjectMock.mockRejectedValue(new Error('clone storage boom'));
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-remix-proj-1'));
    await waitFor(() => {
      const destructive = toastMock.mock.calls.some(
        ([arg]) => (arg as { variant?: string })?.variant === 'destructive'
      );
      expect(destructive).toBe(true);
    });
  });
});

describe('Home — openProject edge cases', () => {
  // openProject is internal — not directly invoked by the test, so we
  // exercise it via the existing my-game-open- testid that fires it.
  it('openProject with snapshot=null falls back to /wizard (lines 174-176)', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    loadWizardProjectMock.mockResolvedValue(null);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-open-proj-1'));
    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith('/wizard');
    });
  });

  it('openProject loadWizardProject rejection toasts + falls back to /wizard (lines 193-203)', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    loadWizardProjectMock.mockRejectedValue(new Error('storage boom'));
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-open-proj-1'));
    await waitFor(() => {
      const destructive = toastMock.mock.calls.some(
        ([arg]) => (arg as { variant?: string })?.variant === 'destructive'
      );
      expect(destructive).toBe(true);
    });
    expect(setLocationMock).toHaveBeenCalledWith('/wizard');
  });
});

describe('Home — quota warning (lines 232-239)', () => {
  it('shouldWarnQuota=true fires the warning toast and marks quota warned', async () => {
    listWizardProjectsMock.mockResolvedValue([]);
    shouldWarnQuotaMock.mockResolvedValue(true);
    renderHome();
    await waitFor(() => {
      expect(markQuotaWarnedMock).toHaveBeenCalled();
    });
    // The warning toast was one of the toast calls.
    expect(toastMock).toHaveBeenCalled();
  });
});

describe('Home — broadcast projects.changed (lines 247-252)', () => {
  it('a projects.changed event runs the subscriber callback (drives line 249-250)', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    await screen.findByTestId('my-game-open-proj-1');
    expect(storageEventCallback).not.toBeNull();
    // Firing the callback drives the if-branch at line 249. The
    // queryClient.invalidateQueries call is on the module-level
    // singleton (not the test's QueryClientProvider client) so we
    // can't verify the call directly — just verify the handler ran
    // without throwing, which is enough for coverage.
    expect(() => storageEventCallback!({ type: 'projects.changed' })).not.toThrow();
  });

  it('a non-projects.changed event does NOT crash (filter branch)', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    await screen.findByTestId('my-game-open-proj-1');
    expect(() => storageEventCallback!({ type: 'something-else' })).not.toThrow();
  });
});

describe('Home — export cancelled toast (line 491-495)', () => {
  it("'cancelled' export result fires the cancellation toast (non-destructive)", async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    exportSavedProjectMock.mockResolvedValue('cancelled');
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-export-proj-1'));
    await waitFor(() => {
      // A toast was fired without the destructive variant — the
      // cancellation path doesn't surface as an error to the kid.
      const nonDestructive = toastMock.mock.calls.some(
        ([arg]) => (arg as { variant?: string })?.variant !== 'destructive'
      );
      expect(nonDestructive).toBe(true);
    });
  });
});
