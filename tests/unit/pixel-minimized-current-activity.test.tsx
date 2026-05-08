// Cover the cold branches in app/components/pixel/minimized.tsx that the
// existing pixel-minimized suite skips:
//
// - Line 152 path 1: handleTouchEnd's `handleTouchStart.current && isMobile`
//   falsy arm — touchEnd on desktop (no isMobile) is a no-op. The existing
//   swipe tests only cover mobile.
// - Line 293 path 2: tooltip activity badge has `currentLesson || currentGame`
//   guard. Cold third arm: currentLesson absent, currentGame present.
// - Line 298: `currentLesson ? Learning : Building` — both arms.
// - Line 318/327 truthy: encouragement bubble's `isMobile` ternaries on
//   position + tail offset — only fires when isMobile=true AND showEncouragement
//   is up. Existing encouragement test runs only the desktop (left) layout.
// - Line 350 truthy: progress widget's `isMobile` ternary on position. The
//   completedSteps>3 + isMobile=true combo lands at line 350's truthy arm.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PixelMinimized from '@/components/pixel/minimized';
import type { SessionActions } from '@lib/wizard/types';

const baseSessionActions = {
  completedSteps: [],
  selectedComponents: {},
  selectedAssetIds: [],
  livePreviewChoices: [],
  previewHistory: [],
} as unknown as SessionActions;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('PixelMinimized — desktop touchEnd is a no-op (line 152 path 1 falsy)', () => {
  it('touchEnd on desktop does NOT call onRestore even with a long swipe', () => {
    // On desktop (isMobile=false), handleTouchEnd's `... && isMobile` arm
    // short-circuits and onRestore is never called. Existing tests only
    // run the mobile path; this pins the desktop short-circuit.
    const onRestore = vi.fn();
    const { container } = render(
      <PixelMinimized onRestore={onRestore} sessionActions={baseSessionActions} isMobile={false} />
    );
    const wrapper = container.querySelector('.top-4.left-4') as HTMLElement;
    fireEvent.touchStart(wrapper, { touches: [{ clientY: 0 }] });
    fireEvent.touchEnd(wrapper, { changedTouches: [{ clientY: 200 }] });
    expect(onRestore).not.toHaveBeenCalled();
  });
});

describe('PixelMinimized — tooltip current-activity arms (lines 293, 298)', () => {
  it('renders "Learning: <name>" when currentLesson is provided (line 298 truthy)', () => {
    const { container } = render(
      <PixelMinimized
        onRestore={vi.fn()}
        sessionActions={baseSessionActions}
        isMobile={false}
        currentLesson="Variables 101"
      />
    );
    const wrapper = container.querySelector('.top-4.left-4') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText(/Learning: Variables 101/)).toBeInTheDocument();
  });

  it('renders "Building: <name>" when only currentGame is provided (line 293 path 2 + 298 falsy)', () => {
    const { container } = render(
      <PixelMinimized
        onRestore={vi.fn()}
        sessionActions={baseSessionActions}
        isMobile={false}
        currentGame="Pong"
      />
    );
    const wrapper = container.querySelector('.top-4.left-4') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(screen.getByText(/Building: Pong/)).toBeInTheDocument();
  });

  it('omits the activity badge when neither currentLesson nor currentGame are set (line 293 falsy)', () => {
    const { container } = render(
      <PixelMinimized onRestore={vi.fn()} sessionActions={baseSessionActions} isMobile={false} />
    );
    const wrapper = container.querySelector('.top-4.left-4') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    // Tooltip is open (the tip + restore hint are visible) but no
    // Learning/Building badge appears.
    expect(screen.getByText(/Pixel's Tip:/i)).toBeInTheDocument();
    expect(screen.queryByText(/Learning:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Building:/)).not.toBeInTheDocument();
  });
});

describe('PixelMinimized — mobile encouragement + progress positioning (lines 318, 327, 350)', () => {
  it('mobile encouragement bubble lands in the top-right (line 318/327 truthy)', () => {
    const { container } = render(
      <PixelMinimized onRestore={vi.fn()} sessionActions={baseSessionActions} isMobile={true} />
    );
    // Encouragement timer fires at 30s.
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    // The encouragement wrapper is positioned by the isMobile ternary at line 318.
    // On mobile: top-16 right-2.
    const encouragement = container.querySelector('.top-16.right-2');
    expect(encouragement).toBeInTheDocument();
  });

  it('mobile progress widget lands in the top-left at small offset (line 350 truthy)', () => {
    const sessionActions = {
      ...baseSessionActions,
      // Need >=3 completed lesson markers so completedLessons>=3 gates the widget.
      completedSteps: ['lesson-1', 'lesson-2', 'lesson-3', 'lesson-4'],
    } as unknown as SessionActions;
    const { container } = render(
      <PixelMinimized onRestore={vi.fn()} sessionActions={sessionActions} isMobile={true} />
    );
    // Progress widget gates on completedLessons>=3 AND uses the isMobile
    // ternary at line 350 to choose 'top-16 left-2' vs 'top-4 left-20'.
    const progress = container.querySelector('.top-16.left-2');
    expect(progress).toBeInTheDocument();
  });
});
