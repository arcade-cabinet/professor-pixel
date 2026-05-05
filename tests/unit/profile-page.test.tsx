import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Profile from '@/pages/profile';
import { saveProfile, loadProfile } from '@lib/storage/profile';

// Mock the lessons loader and the storage adapter the progress query uses
// so the test runs offline and deterministic.
vi.mock('@lib/lessons', () => ({
  loadLessons: vi.fn().mockResolvedValue([
    { id: 'l1', title: 'Variables', order: 1 },
    { id: 'l2', title: 'Loops', order: 2 },
  ]),
}));

// Stateful storage stub: getUserProgress reads from progressRows so a test
// can flip the data after switch-user and verify the UI reacts. Keeps the
// test honest about the new clearUserProgress() abstraction landing in P7
// reviewer follow-up.
const progressRows: { rows: unknown[] } = { rows: [] };
const clearUserProgressMock = vi.fn(async (_userId: string) => {
  progressRows.rows = [];
});
vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgress: vi.fn().mockImplementation(async () => progressRows.rows),
    clearUserProgress: clearUserProgressMock,
  }),
}));

const renderProfile = () => {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <Profile />
    </QueryClientProvider>
  );
};

beforeEach(() => {
  localStorage.clear();
  progressRows.rows = [
    { id: 'p1', userId: 'anonymous-user', lessonId: 'l1', currentStep: 0, completed: true },
  ];
  clearUserProgressMock.mockClear();
});

afterEach(() => {
  localStorage.clear();
});

describe('Profile page (P7)', () => {
  it('renders rename form and persists the new name to storage', async () => {
    saveProfile('Maya');
    renderProfile();

    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    expect(input.value).toBe('Maya');

    fireEvent.change(input, { target: { value: 'Maya the Builder' } });
    fireEvent.click(screen.getByTestId('profile-save-name'));

    await waitFor(() => {
      expect(loadProfile()?.name).toBe('Maya the Builder');
    });
  });

  it('shows completed lessons summary from progress data', async () => {
    saveProfile('Jake');
    renderProfile();

    // The queries resolve async; wait for the completed-lesson item to land.
    await waitFor(() => {
      expect(screen.getByTestId('profile-completed-Variables')).toBeInTheDocument();
    });
    // Loops was not in the progress fixture as completed → should not appear.
    expect(screen.queryByTestId('profile-completed-Loops')).not.toBeInTheDocument();
  });

  it('Switch user clears profile + onboarding flag + lesson progress via the storage adapter', async () => {
    saveProfile('Maya');
    localStorage.setItem('pp.onboardingComplete', '1');

    renderProfile();
    fireEvent.click(screen.getByTestId('profile-switch-user'));
    fireEvent.click(screen.getByTestId('profile-switch-confirm'));

    await waitFor(() => {
      expect(loadProfile()).toBeNull();
    });
    expect(localStorage.getItem('pp.onboardingComplete')).toBeNull();
    // Routed through the storage adapter — not a hardcoded localStorage key.
    expect(clearUserProgressMock).toHaveBeenCalledWith('anonymous-user');
  });

  it('cancelling the switch keeps the profile intact', async () => {
    saveProfile('Maya');
    renderProfile();

    fireEvent.click(screen.getByTestId('profile-switch-user'));
    fireEvent.click(screen.getByTestId('profile-switch-cancel'));

    expect(loadProfile()?.name).toBe('Maya');
    expect(screen.queryByTestId('profile-switch-confirm')).not.toBeInTheDocument();
  });

  it('rejects empty-name save with a toast and does not write profile', async () => {
    renderProfile();
    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '   ' } });

    // Save button is disabled when the trimmed draft is empty.
    expect(screen.getByTestId('profile-save-name')).toBeDisabled();
    expect(loadProfile()).toBeNull();
  });

  it('renders cleanly when no profile exists yet (cold-start path)', async () => {
    // P7 reviewer follow-up: verify the page doesn't null-deref on
    // profile.name when loadProfile() returns null. Cold-start = empty
    // localStorage; the form should mount with an empty input, the
    // save button disabled, and no createdAt line.
    renderProfile();

    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    expect(input.value).toBe('');
    expect(screen.getByTestId('profile-save-name')).toBeDisabled();
    expect(screen.queryByText(/started on/i)).not.toBeInTheDocument();

    // Typing a name and saving creates the first profile.
    fireEvent.change(input, { target: { value: 'Sam' } });
    fireEvent.click(screen.getByTestId('profile-save-name'));
    await waitFor(() => expect(loadProfile()?.name).toBe('Sam'));
  });
});
