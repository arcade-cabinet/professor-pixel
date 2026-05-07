// Cover residual branches in app/components/pixel/menu.tsx that
// pixel-menu.test.tsx doesn't reach:
//   - formatTime hours/days branches (the existing tests use sessionActions
//     dated "now", which only exercises the minutes branch)
//   - tab toggle round-trip (default "actions" → "history" → back to "actions")
// We skip the swipe-right-close branch — useSwipeable in jsdom doesn't
// honor synthetic touch events, and that branch is identical to swipe-down
// (both call onClose()) so the cost-benefit is poor.

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PixelMenu from '@/components/pixel/menu';

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('PixelMenu — formatTime branches in History tab', () => {
  it('renders an action with hours-ago label when timestamp is between 1 and 23 hours old', () => {
    // 2 hours ago → 120 minutes → falls past `mins < 60` into `hours < 24`.
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    render(
      <PixelMenu
        isOpen={true}
        onClose={vi.fn()}
        sessionActions={[
          {
            id: 'a',
            type: 'game_created' as const,
            title: 'Built game X',
            description: 'desc',
            timestamp: twoHoursAgo,
            icon: () => null,
          },
        ]}
      />
    );
    // Switch to history.
    const historyTab = screen
      .getAllByRole('button')
      .find((b) => /history|recent|activity/i.test(b.textContent ?? ''));
    if (historyTab) fireEvent.click(historyTab);
    expect(screen.getByText('Built game X')).toBeInTheDocument();
    // The exact phrasing is from the i18n catalog, but it must contain the
    // hour count in some form (h, hour, etc.).
    expect(
      screen.queryAllByText(/2.*(hour|hr|h\b)/i).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders an action with days-ago label when timestamp is more than 24 hours old', () => {
    // 3 days ago → ~4320 minutes → 72 hours → falls past `hours < 24` into days.
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    render(
      <PixelMenu
        isOpen={true}
        onClose={vi.fn()}
        sessionActions={[
          {
            id: 'a',
            type: 'game_created' as const,
            title: 'Old game',
            description: 'desc',
            timestamp: threeDaysAgo,
            icon: () => null,
          },
        ]}
      />
    );
    const historyTab = screen
      .getAllByRole('button')
      .find((b) => /history|recent|activity/i.test(b.textContent ?? ''));
    if (historyTab) fireEvent.click(historyTab);
    expect(screen.getByText('Old game')).toBeInTheDocument();
    // The label must include some representation of "3 days".
    expect(
      screen.queryAllByText(/3.*(day|d\b)/i).length
    ).toBeGreaterThanOrEqual(1);
  });
});

describe('PixelMenu — tab toggle round-trip', () => {
  it('clicking History then Actions returns to the action grid', () => {
    render(<PixelMenu isOpen={true} onClose={vi.fn()} />);
    // Default: actions grid is visible.
    expect(screen.getByTestId('change-game-button')).toBeInTheDocument();
    const tabs = screen.getAllByRole('button');
    const historyTab = tabs.find((b) => /history|recent|activity/i.test(b.textContent ?? ''));
    expect(historyTab).toBeDefined();
    fireEvent.click(historyTab!);
    // History tab visible → action grid hidden.
    expect(screen.queryByTestId('change-game-button')).not.toBeInTheDocument();
    // Now click the Actions tab to come back.
    const actionsTab = screen.getAllByRole('button').find((b) => /actions/i.test(b.textContent ?? ''));
    expect(actionsTab).toBeDefined();
    fireEvent.click(actionsTab!);
    expect(screen.getByTestId('change-game-button')).toBeInTheDocument();
  });
});
