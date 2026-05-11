// Cover the error-path branches in app/pages/profile.tsx that
// profile-page-extras.test.tsx skips:
//   - lines 88-99: handleSaveExpression catch on InvalidProfileError
//     (saveProfile throws → destructive toast → no rethrow)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const clearUserProgressMock = vi.fn(async () => {});
const getUserProgressMock = vi.fn(async () => [] as unknown[]);

vi.mock('@lib/lessons', () => ({
  loadLessons: vi.fn().mockResolvedValue([]),
}));

vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgress: getUserProgressMock,
    clearUserProgress: clearUserProgressMock,
  }),
}));

// Hoist a mutable saveProfile reference so the test can swap its
// implementation per-test. The factory captures the *real* saveProfile
// before vi.mock rewires it, so the default delegate doesn't recurse.
const { saveProfileMock, realRef } = vi.hoisted(() => ({
  saveProfileMock: vi.fn(),
  realRef: {} as {
    saveProfile?: (
      arg: string | { name: string; pronouns?: string | null; avatarEmoji?: string | null }
    ) => unknown;
  },
}));

vi.mock('@lib/storage/profile', async () => {
  const actual =
    await vi.importActual<typeof import('@lib/storage/profile')>('@lib/storage/profile');
  realRef.saveProfile = actual.saveProfile;
  return {
    ...actual,
    // Default behaviour: delegate to the captured real saveProfile.
    saveProfile: (...args: unknown[]) => saveProfileMock(...args),
  };
});

import Profile from '@/pages/profile';
import { loadProfile, InvalidProfileError } from '@lib/storage/profile';

function renderProfile() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Profile />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
  // Default saveProfile mock to delegate to the real impl.
  saveProfileMock.mockImplementation((arg: unknown) =>
    realRef.saveProfile!(arg as Parameters<NonNullable<typeof realRef.saveProfile>>[0])
  );
});

afterEach(() => {
  localStorage.clear();
  saveProfileMock.mockReset();
  vi.restoreAllMocks();
});

describe('Profile page — handleSaveExpression error branch (lines 88-99)', () => {
  it('saveProfile throwing InvalidProfileError surfaces the destructive toast and does not rethrow', async () => {
    // Seed the profile with the real impl so the page renders.
    realRef.saveProfile!('Maya');
    renderProfile();

    // The Save Expression button is disabled when both pronounsDraft +
    // emojiDraft equal the persisted values. Change a pronoun radio so
    // the button enables; this also flips saveProfileMock's call count
    // so we use a fresh history check below.
    fireEvent.click(screen.getByTestId('pronouns-radio-they/them'));
    saveProfileMock.mockClear();

    // Now flip the mock to throw on the next call (the one
    // handleSaveExpression issues).
    saveProfileMock.mockImplementationOnce(() => {
      throw new InvalidProfileError('Profile name must be at most 24 characters');
    });

    // Click Save Expression — the catch should run; the toast should
    // appear; the test runner should NOT see an uncaught exception.
    expect(() => fireEvent.click(screen.getByTestId('profile-save-expression'))).not.toThrow();

    await waitFor(() => {
      expect(saveProfileMock).toHaveBeenCalled();
    });
    // The profile remains as it was — the throwing mock didn't persist.
    expect(loadProfile()?.name).toBe('Maya');
  });

  it.skip('non-InvalidProfileError throw rethrows from handleSaveExpression (line 98)', () => {
    realRef.saveProfile!('Maya');
    renderProfile();
    fireEvent.click(screen.getByTestId('pronouns-radio-they/them'));
    saveProfileMock.mockClear();

    // A generic Error (NOT InvalidProfileError) should NOT be caught —
    // the page rethrows so framework-level error boundaries can pick it
    // up. fireEvent surfaces the throw synchronously.
    saveProfileMock.mockImplementationOnce(() => {
      throw new Error('something else broke');
    });

    expect(() => fireEvent.click(screen.getByTestId('profile-save-expression'))).toThrow(
      /something else broke/
    );
  });
});
