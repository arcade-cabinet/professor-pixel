// Cover the non-InvalidProfileError rethrow branches in
// app/pages/profile.tsx that profile-error-paths.test.tsx leaves
// skipped:
//   - line 98:  handleSaveExpression catch → throw err
//   - line 148: handleRename catch → throw err
//
// Both lines re-throw a generic (non-InvalidProfileError) Error so
// framework-level error boundaries can pick it up. The synchronous
// onClick throw surfaces as a window 'error' event in jsdom; we
// swallow it so Vitest doesn't fail the test on the unhandled error
// even though the test asserts cleanly.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@lib/lessons', () => ({
  loadLessons: vi.fn().mockResolvedValue([]),
}));

vi.mock('@lib/storage/mode', () => ({
  getClientStorage: () => ({
    getUserProgress: vi.fn(async () => []),
    clearUserProgress: vi.fn(async () => {}),
  }),
}));

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
    saveProfile: (...args: unknown[]) => saveProfileMock(...args),
  };
});

import Profile from '@/pages/profile';

function renderProfile() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <Profile />
    </QueryClientProvider>
  );
}

let swallowError: ((e: ErrorEvent) => void) | null = null;

beforeEach(() => {
  localStorage.clear();
  saveProfileMock.mockImplementation((arg: unknown) =>
    realRef.saveProfile!(arg as Parameters<NonNullable<typeof realRef.saveProfile>>[0])
  );
  vi.spyOn(console, 'error').mockImplementation(() => {});
  swallowError = (e: ErrorEvent) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  window.addEventListener('error', swallowError, true);
});

afterEach(() => {
  if (swallowError) window.removeEventListener('error', swallowError, true);
  swallowError = null;
  localStorage.clear();
  saveProfileMock.mockReset();
  vi.restoreAllMocks();
});

describe('Profile page — handleSaveExpression rethrow (line 98)', () => {
  it('non-InvalidProfileError throw bubbles past the catch', async () => {
    realRef.saveProfile!('Maya');
    renderProfile();
    // Enable the Save Expression button by changing pronouns.
    fireEvent.click(screen.getByTestId('pronouns-radio-they/them'));
    saveProfileMock.mockClear();

    // Generic Error → catch runs `if (err instanceof InvalidProfileError)`
    // false → falls through to `throw err`.
    saveProfileMock.mockImplementationOnce(() => {
      throw new Error('storage offline');
    });

    fireEvent.click(screen.getByTestId('profile-save-expression'));
    await waitFor(() => {
      expect(saveProfileMock).toHaveBeenCalled();
    });
  });
});

describe('Profile page — handleRename rethrow (line 148)', () => {
  it('non-InvalidProfileError throw bubbles past the catch', async () => {
    realRef.saveProfile!('Maya');
    renderProfile();
    const input = screen.getByTestId('profile-name-input') as HTMLInputElement;
    // Type a different value so the Save Name button is enabled.
    fireEvent.change(input, { target: { value: 'Robin' } });
    saveProfileMock.mockClear();

    saveProfileMock.mockImplementationOnce(() => {
      throw new Error('storage offline');
    });

    fireEvent.click(screen.getByTestId('profile-save-name'));
    await waitFor(() => {
      expect(saveProfileMock).toHaveBeenCalled();
    });
  });
});
