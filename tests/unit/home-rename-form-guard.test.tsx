// Cover the rename form's onSubmit early-return in app/pages/home.tsx
// (line 373). The Save button's disabled prop only gates pointer events,
// so Enter-key submission must independently guard against empty,
// unchanged, or in-flight names. The existing home-error-paths suite
// only drives the rename via the Save button (which is gated by the
// disabled prop) — Enter on an empty / unchanged value is a separate
// path that lands at line 373.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const setLocationMock = vi.fn();
vi.mock('wouter', () => ({
  useLocation: () => ['/', setLocationMock],
}));

vi.mock('@lib/storage/persistence', () => ({
  loadWizardState: () => null,
  saveWizardState: vi.fn(),
}));

const listWizardProjectsMock = vi.fn();
const renameWizardProjectMock = vi.fn();
vi.mock('@lib/storage/projects', () => ({
  listWizardProjects: () => listWizardProjectsMock(),
  loadWizardProject: vi.fn(),
  deleteWizardProject: vi.fn(),
  renameWizardProject: (id: string, name: string) => renameWizardProjectMock(id, name),
  cloneWizardProject: vi.fn(),
}));

vi.mock('@lib/pygame/runtime/exporter', () => ({
  exportSavedProject: vi.fn(),
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, '-'),
}));

vi.mock('@lib/storage/quota', () => ({
  shouldWarnQuota: () => Promise.resolve(false),
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
vi.mock('@lib/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
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
  listWizardProjectsMock.mockReset().mockResolvedValue([proj]);
  renameWizardProjectMock.mockReset();
  setLocationMock.mockReset();
  localStorage.clear();
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Home — rename form Enter-key guard (line 373)', () => {
  it('Enter with empty trimmed name does not call renameProject', async () => {
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    const input = screen.getByTestId('my-game-rename-input-proj-1') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });
    // Submit the form (form submit, not button click — Save button is
    // disabled but Enter would still fire form onSubmit).
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(renameWizardProjectMock).not.toHaveBeenCalled();
    });
  });

  it('Enter with name unchanged from the persisted name does not call renameProject', async () => {
    renderHome();
    fireEvent.click(await screen.findByTestId('my-game-rename-proj-1'));
    const input = screen.getByTestId('my-game-rename-input-proj-1') as HTMLInputElement;
    // The rename input pre-fills with the project's name. Submitting
    // with the same value should hit the `trimmed === project.name`
    // branch of the line-373 guard.
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(renameWizardProjectMock).not.toHaveBeenCalled();
    });
  });
});
