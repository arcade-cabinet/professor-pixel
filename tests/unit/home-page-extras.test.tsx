// Push home.tsx coverage past the smoke suite by driving the rename + remix
// + export + Play paths and the delete-cancel branch.

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
  toastMock.mockReset();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home — Play row button', () => {
  it('routes to /play/:id when the Play button is clicked', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-play-proj-1'));
    expect(setLocationMock).toHaveBeenCalledWith('/play/proj-1');
  });
});

describe('Home — Rename flow', () => {
  it('Rename button opens the inline input prefilled with the current name', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    const input = screen.getByTestId('my-game-rename-input-proj-1') as HTMLInputElement;
    expect(input.value).toBe('Pong Clone');
  });

  it('Cancel button closes the rename UI without firing the mutation', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    fireEvent.click(screen.getByTestId('my-game-rename-cancel-proj-1'));
    expect(renameWizardProjectMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('my-game-rename-input-proj-1')).not.toBeInTheDocument();
  });

  it('Save fires renameWizardProject with the trimmed value', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renameWizardProjectMock.mockResolvedValue(undefined);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    fireEvent.change(screen.getByTestId('my-game-rename-input-proj-1'), {
      target: { value: '  Pong Clone v2  ' },
    });
    fireEvent.click(screen.getByTestId('my-game-rename-save-proj-1'));
    await waitFor(() => {
      expect(renameWizardProjectMock).toHaveBeenCalledWith('proj-1', 'Pong Clone v2');
    });
  });

  it('Save is disabled when the trimmed value matches the original name', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    const save = screen.getByTestId('my-game-rename-save-proj-1') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });

  it('Save is disabled when the input is empty', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    fireEvent.change(screen.getByTestId('my-game-rename-input-proj-1'), {
      target: { value: '   ' },
    });
    const save = screen.getByTestId('my-game-rename-save-proj-1') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
  });
});

describe('Home — Delete cancel branch', () => {
  it('clicking Cancel after Delete dismisses the confirm without firing the mutation', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-delete-proj-1'));
    fireEvent.click(screen.getByTestId('my-game-cancel-delete-proj-1'));
    expect(deleteWizardProjectMock).not.toHaveBeenCalled();
    expect(
      screen.queryByTestId('my-game-confirm-delete-proj-1')
    ).not.toBeInTheDocument();
  });
});

describe('Home — Export button', () => {
  it("'shared' result toasts a share-success notice", async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    exportSavedProjectMock.mockResolvedValue('shared');
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-export-proj-1'));
    await waitFor(() => {
      expect(exportSavedProjectMock).toHaveBeenCalledWith('proj-1');
    });
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
  });

  it("'downloaded' result toasts a download-success notice", async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    exportSavedProjectMock.mockResolvedValue('downloaded');
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-export-proj-1'));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
  });

  it('exporter rejection toasts a destructive error', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    exportSavedProjectMock.mockRejectedValue(new Error('share sheet rejected'));
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-export-proj-1'));
    await waitFor(() => {
      const calls = toastMock.mock.calls;
      const destructive = calls.some(
        ([arg]) => (arg as { variant?: string })?.variant === 'destructive'
      );
      expect(destructive).toBe(true);
    });
  });
});

describe('Home — Remix mutation', () => {
  it('clicking Remix clones the project and routes the kid into the wizard', async () => {
    listWizardProjectsMock.mockResolvedValue([proj]);
    cloneWizardProjectMock.mockResolvedValue({
      id: 'clone-1',
      name: 'Pong Clone (copy)',
    });
    loadWizardProjectMock.mockResolvedValue({
      id: 'clone-1',
      name: 'Pong Clone (copy)',
      wizardState: { step: 'remixed' },
    });
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-remix-proj-1'));
    await waitFor(() =>
      expect(cloneWizardProjectMock).toHaveBeenCalledWith('proj-1')
    );
    // After the clone settles, the wizard takes over.
    await waitFor(() =>
      expect(screen.getByTestId('universal-wizard-stub')).toBeInTheDocument()
    );
    expect(localStorage.getItem('pp.activeProjectId')).toBe('clone-1');
  });
});
