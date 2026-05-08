// Cover the cold mutation-pending render arms in app/pages/home.tsx that
// the existing home-* suites skip. Existing tests resolve the mutation
// promises immediately, so the buttons never render in their pending
// (in-flight) state. Hold the underlying storage call open with a
// deferred promise so the React Query mutation sits in `isPending=true`
// while we read the rendered text.
//
// - Line 525 path 0 truthy: cloneWizardProject in flight + variables
//   matches project.id → button shows the localized "Remixing…" copy
//   instead of the '🎨' icon.
// - Line 559 path 0 truthy: deleteWizardProject in flight → confirm
//   button shows "Deleting…" instead of the localized delete label.

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
}));

const listWizardProjectsMock = vi.fn();
const loadWizardProjectMock = vi.fn();
const deleteWizardProjectMock = vi.fn();
const cloneWizardProjectMock = vi.fn();
vi.mock('@lib/storage/projects', () => ({
  listWizardProjects: () => listWizardProjectsMock(),
  loadWizardProject: (id: string) => loadWizardProjectMock(id),
  deleteWizardProject: (id: string) => deleteWizardProjectMock(id),
  renameWizardProject: vi.fn(),
  cloneWizardProject: (id: string) => cloneWizardProjectMock(id),
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
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <Home />
    </QueryClientProvider>
  );
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
  cloneWizardProjectMock.mockReset();
  toastMock.mockReset();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home — remix mutation pending state (line 525 path 0 truthy)', () => {
  it("remix button shows 'Remixing…' copy while cloneWizardProject is in flight", async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    // Hold cloneWizardProject open so the mutation sits in isPending.
    cloneWizardProjectMock.mockReturnValue(new Promise(() => {}));
    renderHome();
    await waitFor(() => {
      expect(screen.getByTestId(`my-game-remix-${proj.id}`)).toBeInTheDocument();
    });
    const remixBtn = screen.getByTestId(`my-game-remix-${proj.id}`);
    fireEvent.click(remixBtn);
    // Once the click fires, the mutation enters the pending state and the
    // button text flips to the "Remixing…" copy. We don't pin the exact
    // string (i18n) — assert it differs from the '🎨' default.
    await waitFor(() => {
      expect(remixBtn.textContent).not.toBe('🎨');
    });
    expect(remixBtn).toBeDisabled();
  });
});

describe('Home — delete mutation pending state (line 559 path 0 truthy)', () => {
  it("confirm-delete button shows 'Deleting…' copy while deleteWizardProject is in flight", async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    // Hold deleteWizardProject open.
    deleteWizardProjectMock.mockReturnValue(new Promise(() => {}));
    renderHome();
    await waitFor(() => {
      expect(screen.getByTestId(`my-game-delete-${proj.id}`)).toBeInTheDocument();
    });
    // First click: open the confirm dialog.
    fireEvent.click(screen.getByTestId(`my-game-delete-${proj.id}`));
    const confirmBtn = await screen.findByTestId(`my-game-confirm-delete-${proj.id}`);
    const initialText = confirmBtn.textContent;
    // Second click: trigger the in-flight mutation.
    fireEvent.click(confirmBtn);
    // The pending arm flips the copy to "Deleting…".
    await waitFor(() => {
      expect(confirmBtn.textContent).not.toBe(initialText);
    });
    expect(confirmBtn).toBeDisabled();
  });
});
