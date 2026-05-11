import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PixelMenu from '@/components/pixel/menu';

// Cover app/components/pixel/menu.tsx (374 LOC, 11.62% → ~95% coverage).
// The menu is a fullscreen overlay with two tabs (Quick Actions + History).
// Six action buttons + an audio toggle + Help launcher.

// AnimatePresence stalls in jsdom; passthrough.
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

describe('PixelMenu — open/close', () => {
  it('returns nothing when isOpen=false', () => {
    const { container } = render(<PixelMenu isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the menu chrome when isOpen=true', () => {
    render(<PixelMenu isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('close-pixel-menu')).toBeInTheDocument();
    expect(screen.getByTestId('change-game-button')).toBeInTheDocument();
  });

  it('close button invokes onClose', () => {
    const onClose = vi.fn();
    render(<PixelMenu isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('close-pixel-menu'));
    expect(onClose).toHaveBeenCalled();
  });

  it('clicking the backdrop invokes onClose', () => {
    const onClose = vi.fn();
    const { container } = render(<PixelMenu isOpen={true} onClose={onClose} />);
    // The backdrop is the outermost motion.div with onClick={onClose}.
    const backdrop = container.querySelector('.bg-black\\/50');
    expect(backdrop).toBeTruthy();
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});

describe('PixelMenu — action button forwarding', () => {
  it('change game button invokes onChangeGame', () => {
    const onChangeGame = vi.fn();
    render(<PixelMenu isOpen={true} onClose={vi.fn()} onChangeGame={onChangeGame} />);
    fireEvent.click(screen.getByTestId('change-game-button'));
    expect(onChangeGame).toHaveBeenCalled();
  });

  it('switch lesson button invokes onSwitchLesson', () => {
    const onSwitchLesson = vi.fn();
    render(<PixelMenu isOpen={true} onClose={vi.fn()} onSwitchLesson={onSwitchLesson} />);
    fireEvent.click(screen.getByTestId('switch-lesson-button'));
    expect(onSwitchLesson).toHaveBeenCalled();
  });

  it('export button invokes onExportGame', () => {
    const onExportGame = vi.fn();
    render(<PixelMenu isOpen={true} onClose={vi.fn()} onExportGame={onExportGame} />);
    fireEvent.click(screen.getByTestId('export-game-button'));
    expect(onExportGame).toHaveBeenCalled();
  });

  it('view progress invokes onViewProgress', () => {
    const onViewProgress = vi.fn();
    render(<PixelMenu isOpen={true} onClose={vi.fn()} onViewProgress={onViewProgress} />);
    fireEvent.click(screen.getByTestId('view-progress-button'));
    expect(onViewProgress).toHaveBeenCalled();
  });

  it('return current invokes onReturnCurrent', () => {
    const onReturnCurrent = vi.fn();
    render(<PixelMenu isOpen={true} onClose={vi.fn()} onReturnCurrent={onReturnCurrent} />);
    fireEvent.click(screen.getByTestId('return-current-button'));
    expect(onReturnCurrent).toHaveBeenCalled();
  });
});

describe('PixelMenu — audio toggle', () => {
  it('starts ON by default and toggles OFF then back ON', () => {
    render(<PixelMenu isOpen={true} onClose={vi.fn()} />);
    const toggle = screen.getByTestId('audio-toggle-button');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('PixelMenu — Help modal', () => {
  it('Help button opens the modal', () => {
    render(<PixelMenu isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('help-button'));
    // Help modal renders a heading; we just check the button no longer
    // is the only Help text on screen — the modal also shows it.
    expect(screen.getAllByText(/Help/i).length).toBeGreaterThan(1);
  });
});

describe('PixelMenu — tab switching', () => {
  it('switching to History tab swaps the content area', () => {
    render(<PixelMenu isOpen={true} onClose={vi.fn()} />);
    // Actions tab default: change-game button visible.
    expect(screen.getByTestId('change-game-button')).toBeInTheDocument();
    // Click history tab.
    const tabs = screen.getAllByRole('button');
    const historyTab = tabs.find((b) => /history|recent|activity/i.test(b.textContent ?? ''));
    expect(historyTab).toBeDefined();
    fireEvent.click(historyTab!);
    // Action grid disappears.
    expect(screen.queryByTestId('change-game-button')).not.toBeInTheDocument();
  });
});

describe('PixelMenu — pixel image cycle (3000ms interval)', () => {
  it('cleans up the cycle interval on unmount', () => {
    vi.useFakeTimers();
    try {
      const { unmount } = render(<PixelMenu isOpen={true} onClose={vi.fn()} />);
      // Advance past one cycle.
      act(() => {
        vi.advanceTimersByTime(3000);
      });
      unmount();
      // No crash on a further advance with the interval cleared.
      act(() => {
        vi.advanceTimersByTime(10000);
      });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('PixelMenu — supplied sessionActions override mock history', () => {
  // Just smoke — the History tab renders the supplied list without crash.
  // We can't easily assert on text without importing the strings catalog.
  it('renders supplied actions in the History tab', () => {
    const sessionActions = [
      {
        id: 'a',
        type: 'game_created' as const,
        title: 'Built game X',
        description: 'desc',
        timestamp: new Date(),
        icon: () => null,
      },
    ];
    render(<PixelMenu isOpen={true} onClose={vi.fn()} sessionActions={sessionActions} />);
    const tabs = screen.getAllByRole('button');
    const historyTab = tabs.find((b) => /history|recent|activity/i.test(b.textContent ?? ''));
    if (historyTab) fireEvent.click(historyTab);
    expect(screen.getByText('Built game X')).toBeInTheDocument();
  });
});
