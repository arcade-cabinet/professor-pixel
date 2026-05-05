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

vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgress: vi
      .fn()
      .mockResolvedValue([
        { id: 'p1', userId: 'anonymous-user', lessonId: 'l1', currentStep: 0, completed: true },
      ]),
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

  it('Switch user clears profile + onboarding flag + lesson progress', async () => {
    saveProfile('Maya');
    localStorage.setItem('pp.onboardingComplete', '1');
    localStorage.setItem(
      'pygame_academy_progress',
      JSON.stringify({ p1: { id: 'p1', userId: 'anonymous-user', lessonId: 'l1' } })
    );

    renderProfile();
    fireEvent.click(screen.getByTestId('profile-switch-user'));
    fireEvent.click(screen.getByTestId('profile-switch-confirm'));

    await waitFor(() => {
      expect(loadProfile()).toBeNull();
    });
    expect(localStorage.getItem('pp.onboardingComplete')).toBeNull();
    expect(localStorage.getItem('pygame_academy_progress')).toBeNull();
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
});
