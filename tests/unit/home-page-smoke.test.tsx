// Smoke + behaviour tests for app/pages/home.tsx (657 LOC, 0% coverage).
// Targets the chooser render, returning-user route, intro-card flow, and
// the My Games delete / rename / open paths via mocked storage.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const setLocationMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocationMock],
}));

// Storage seam — the page reads/writes wizard state, project list, quota.
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

vi.mock('@lib/pygame/runtime/exporter', () => ({
  exportSavedProject: vi.fn().mockResolvedValue('downloaded'),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}));

vi.mock('@lib/storage/quota', () => ({
  shouldWarnQuota: vi.fn().mockResolvedValue(false),
  markQuotaWarned: vi.fn(),
}));

vi.mock('@lib/storage/broadcast', () => ({
  subscribeStorageEvents: () => () => {},
}));

// Stub the wizard so opening it doesn't pull in the full wizard tree.
vi.mock('@/components/wizard/universal', () => ({
  default: () => <div data-testid="universal-wizard-stub">UniversalWizard</div>,
}));

vi.mock('@/components/audio-toggle', () => ({
  default: () => <button>Audio</button>,
}));

vi.mock('@/components/ui/offline-banner', () => ({
  default: () => null,
}));
vi.mock('@/components/ui/storage-blocked-notice', () => ({
  default: () => null,
}));

const toastMock = vi.fn();
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import Home from '@/pages/home';

function renderHome() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Home />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  setLocationMock.mockReset();
  loadWizardStateMock.mockReset();
  saveWizardStateMock.mockReset();
  listWizardProjectsMock.mockReset();
  loadWizardProjectMock.mockReset();
  deleteWizardProjectMock.mockReset();
  renameWizardProjectMock.mockReset();
  cloneWizardProjectMock.mockReset();
  toastMock.mockReset();
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home — chooser render', () => {
  it('renders both landing CTAs when there is no prior state', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    expect(await screen.findByTestId('landing-choose-wizard')).toBeInTheDocument();
    expect(screen.getByTestId('landing-choose-lessons')).toBeInTheDocument();
  });

  it('shows the intro card on first visit (no INTRO_SEEN flag)', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    expect(await screen.findByTestId('landing-intro-card')).toBeInTheDocument();
  });

  it('hides the intro card after dismiss + persists the seen flag', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    const dismiss = await screen.findByTestId('landing-intro-dismiss');
    fireEvent.click(dismiss);
    await waitFor(() => {
      expect(screen.queryByTestId('landing-intro-card')).not.toBeInTheDocument();
    });
    expect(localStorage.getItem('pp.hasSeenIntro')).toBe('1');
  });

  it('does not show the intro card when INTRO_SEEN is already set', async () => {
    localStorage.setItem('pp.hasSeenIntro', '1');
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    await screen.findByTestId('landing-choose-wizard');
    expect(screen.queryByTestId('landing-intro-card')).not.toBeInTheDocument();
  });
});

describe('Home — choose() handlers', () => {
  it('clicking "Make a game" persists wizard as last path and shows the wizard', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    fireEvent.click(await screen.findByTestId('landing-choose-wizard'));
    await waitFor(() => {
      expect(screen.getByTestId('universal-wizard-stub')).toBeInTheDocument();
    });
    expect(localStorage.getItem('pp.lastLandingPath')).toBe('wizard');
  });

  it('clicking "Take a lesson" persists lessons + routes to /lessons', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    fireEvent.click(await screen.findByTestId('landing-choose-lessons'));
    expect(setLocationMock).toHaveBeenCalledWith('/lessons');
    expect(localStorage.getItem('pp.lastLandingPath')).toBe('lessons');
  });
});

describe('Home — returning-user routing on mount', () => {
  it('persisted wizard state → skips chooser straight into the wizard', async () => {
    loadWizardStateMock.mockReturnValue({ step: 'pick-game' });
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    expect(await screen.findByTestId('universal-wizard-stub')).toBeInTheDocument();
  });

  it('lastPath=lessons takes priority over persisted wizard state', async () => {
    localStorage.setItem('pp.lastLandingPath', 'lessons');
    loadWizardStateMock.mockReturnValue({ step: 'pick-game' });
    listWizardProjectsMock.mockResolvedValue([]);
    renderHome();
    await waitFor(() => {
      expect(setLocationMock).toHaveBeenCalledWith('/lessons');
    });
  });
});

describe('Home — My Games list interactions', () => {
  it('renders saved projects when listWizardProjects resolves with rows', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Pong Clone',
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-02T00:00:00Z',
        thumbnailDataUrl: null,
      },
    ]);
    renderHome();
    expect(await screen.findByTestId('my-game-row-proj-1')).toBeInTheDocument();
    expect(screen.getByText('Pong Clone')).toBeInTheDocument();
  });

  it('Open button hydrates the wizard state and routes into it', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([
      {
        id: 'proj-1',
        name: 'Pong Clone',
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-02T00:00:00Z',
        thumbnailDataUrl: null,
      },
    ]);
    loadWizardProjectMock.mockResolvedValue({
      id: 'proj-1',
      name: 'Pong Clone',
      wizardState: { step: 'wysiwyg' },
    });
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-open-proj-1'));
    await waitFor(() => {
      expect(saveWizardStateMock).toHaveBeenCalledWith({ step: 'wysiwyg' });
    });
    await waitFor(() => {
      expect(screen.getByTestId('universal-wizard-stub')).toBeInTheDocument();
    });
    expect(localStorage.getItem('pp.activeProjectId')).toBe('proj-1');
  });

  it('Delete shows the inline confirm; Confirm fires the mutation', async () => {
    loadWizardStateMock.mockReturnValue(null);
    listWizardProjectsMock.mockResolvedValue([
      {
        id: 'proj-2',
        name: 'Snake',
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-02T00:00:00Z',
        thumbnailDataUrl: null,
      },
    ]);
    deleteWizardProjectMock.mockResolvedValue(undefined);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-delete-proj-2'));
    fireEvent.click(await screen.findByTestId('my-game-confirm-delete-proj-2'));
    await waitFor(() => expect(deleteWizardProjectMock).toHaveBeenCalledWith('proj-2'));
  });
});
