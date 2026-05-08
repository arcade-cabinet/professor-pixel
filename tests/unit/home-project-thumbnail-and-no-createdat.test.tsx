// Cover the project-tile render arms in app/pages/home.tsx that the
// existing home-* suites skip:
//   - line 346 path 0 truthy: project.thumbnailDataUrl truthy → renders
//     the <img> tile thumbnail. Existing seeds always set thumbnailDataUrl
//     to null, so only the falsy arm fires.
//   - line 437 path 1 falsy: project.createdAt falsy → falls through to
//     strings.home.project.recently. Existing seeds always include
//     createdAt; the fallback arm sat cold.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
}));

const listWizardProjectsMock = vi.fn();
vi.mock('@lib/storage/projects', () => ({
  listWizardProjects: () => listWizardProjectsMock(),
  loadWizardProject: vi.fn(),
  deleteWizardProject: vi.fn(),
  renameWizardProject: vi.fn(),
  cloneWizardProject: vi.fn(),
}));

vi.mock('@lib/pygame/runtime/exporter', () => ({
  exportSavedProject: vi.fn(),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}));

vi.mock('@lib/storage/quota', () => ({
  shouldWarnQuota: vi.fn().mockResolvedValue(false),
  markQuotaWarned: vi.fn(),
}));

vi.mock('@lib/storage/broadcast', () => ({
  subscribeStorageEvents: () => () => {},
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
  loadWizardStateMock.mockReset().mockReturnValue(null);
  saveWizardStateMock.mockReset();
  listWizardProjectsMock.mockReset();
  toastMock.mockReset();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home — project tile thumbnailDataUrl truthy arm (line 346 path 0)', () => {
  it('renders the <img> when project.thumbnailDataUrl is a real data URL', async () => {
    listWizardProjectsMock.mockResolvedValue([
      {
        id: 'proj-thumb',
        name: 'Game With Thumbnail',
        createdAt: '2026-05-01T00:00:00Z',
        updatedAt: '2026-05-02T00:00:00Z',
        thumbnailDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==',
      },
    ]);
    renderHome();
    await waitFor(() => {
      expect(screen.getByTestId('my-game-thumb-img-proj-thumb')).toBeInTheDocument();
    });
    const img = screen.getByTestId('my-game-thumb-img-proj-thumb') as HTMLImageElement;
    expect(img.tagName).toBe('IMG');
    expect(img.src).toContain('data:image/png');
  });
});

describe('Home — project tile createdAt falsy fallback (line 437 path 1)', () => {
  it("renders the 'recently' fallback when project.createdAt is missing", async () => {
    listWizardProjectsMock.mockResolvedValue([
      {
        id: 'proj-no-date',
        name: 'Date-less Game',
        // createdAt intentionally omitted → undefined → ternary falsy arm.
        updatedAt: '2026-05-02T00:00:00Z',
        thumbnailDataUrl: null,
      },
    ]);
    renderHome();
    // Wait for the project tile to render, then assert the fallback copy.
    await waitFor(() => {
      expect(screen.getByTestId('my-game-thumb-proj-no-date')).toBeInTheDocument();
    });
    // strings.home.project.recently — assert the copy is "Recently" or
    // similar non-date text. Match the i18n string loosely.
    const tile = screen.getByTestId('my-game-thumb-proj-no-date').parentElement;
    expect(tile).toBeTruthy();
    expect(tile?.textContent ?? '').toMatch(/recently/i);
  });
});
