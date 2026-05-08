// Cover the lessonChoices action callbacks in app/components/pixel/presence.tsx
// (lines 84-109). The existing pixel-presence.test.tsx renders the choices
// on /lesson/* paths but doesn't click them, so each action body's setState
// + setPixelImage + setDialogue + (optional) setTimeout(onNavigate, 500)
// stays uncovered.

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PixelPresence from '@/components/pixel/presence';

let mobileFlag = false;
vi.mock('@lib/hooks/use-media-query', () => ({
  useIsMobile: () => mobileFlag,
}));

const trackChoiceMock = vi.fn();
vi.mock('@lib/storage/session-history', () => ({
  sessionHistory: {
    trackChoice: (...args: unknown[]) => trackChoiceMock(...args),
    trackNavigation: vi.fn(),
  },
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

beforeEach(() => {
  mobileFlag = false;
  trackChoiceMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PixelPresence — lessonChoices actions (desktop variant)', () => {
  it('lesson choice A ("Next lesson!") tracks the choice and collapses the card', () => {
    render(<PixelPresence onNavigate={vi.fn()} currentPath="/lesson/1" />);
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-expand'));
    });
    // pixel-choice-a is the index-0 lessonChoice ("Next lesson!").
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-choice-a'));
    });
    // sessionHistory.trackChoice was invoked with the next-lesson id.
    expect(trackChoiceMock).toHaveBeenCalled();
    expect(trackChoiceMock.mock.calls[0][0]).toBe('next-lesson');
    // After action fires, state flips back to 'waiting-corner' — the
    // expanded avatar is gone.
    expect(screen.queryByTestId('pixel-expanded-avatar')).not.toBeInTheDocument();
  });

  it('lesson choice B ("I\'m ready to make games!") schedules onNavigate("/project-builder")', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    render(<PixelPresence onNavigate={onNavigate} currentPath="/lesson/1" />);
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-expand'));
    });
    // pixel-choice-b is the index-1 lessonChoice ("I'm ready to make games!").
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-choice-b'));
    });
    // The action fired sessionHistory.trackChoice with the right id +
    // navigation target.
    expect(trackChoiceMock).toHaveBeenCalled();
    expect(trackChoiceMock.mock.calls[0][0]).toBe('make-game-now');
    expect(trackChoiceMock.mock.calls[0][2]).toBe('/project-builder');
    // onNavigate fires after a 500ms delay (transition window).
    expect(onNavigate).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onNavigate).toHaveBeenCalledWith('/project-builder');
    vi.useRealTimers();
  });
});

describe('PixelPresence — lessonChoices on the mobile bottom-sheet', () => {
  beforeEach(() => {
    mobileFlag = true;
  });

  it('mobile lesson choice 1 ("I\'m ready to make games!") fires the navigation action', () => {
    vi.useFakeTimers();
    const onNavigate = vi.fn();
    render(<PixelPresence onNavigate={onNavigate} currentPath="/lesson/1" />);
    act(() => {
      fireEvent.click(screen.getByTestId('pixel-expand'));
    });
    // mobile-choice-1 maps to lessonChoices[1] in mobile bottom-sheet mode.
    act(() => {
      fireEvent.click(screen.getByTestId('mobile-choice-1'));
    });
    expect(trackChoiceMock).toHaveBeenCalled();
    expect(trackChoiceMock.mock.calls[0][0]).toBe('make-game-now');
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onNavigate).toHaveBeenCalledWith('/project-builder');
    vi.useRealTimers();
  });
});
