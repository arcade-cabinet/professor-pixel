import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import PixelMinimizeAnimation, {
  minimizeAnimationVariants,
  bounceInAnimation,
} from '@/components/pixel/minimize-animation';

// Cover app/components/pixel/minimize-animation.tsx (243 LOC, 0% coverage).
// Two-phase animation:
//   - phase='message' for 0–2000ms — shows greeting + Pixel avatar
//   - phase='animating' for 2000–3500ms — Pixel slides toward corner
// At 3500ms the onAnimationComplete callback fires.
//
// Use vi.useFakeTimers to advance through the lifecycle deterministically.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runOnlyPendingTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('PixelMinimizeAnimation', () => {
  it('renders the greeting message during phase=message', () => {
    const onAnimationComplete = vi.fn();
    render(
      <PixelMinimizeAnimation
        message="See you soon!"
        onAnimationComplete={onAnimationComplete}
        isMobile={false}
      />
    );
    expect(screen.getByText('See you soon!')).toBeInTheDocument();
    // Pixel avatar img alt is "Pixel".
    expect(screen.getAllByAltText('Pixel').length).toBeGreaterThan(0);
  });

  it('uses the default message when none is supplied', () => {
    const onAnimationComplete = vi.fn();
    render(<PixelMinimizeAnimation onAnimationComplete={onAnimationComplete} isMobile={false} />);
    expect(screen.getByText(/right here if you need me/i)).toBeInTheDocument();
  });

  it('transitions message → animating phase after 2000ms', () => {
    const onAnimationComplete = vi.fn();
    render(
      <PixelMinimizeAnimation
        message="bye"
        onAnimationComplete={onAnimationComplete}
        isMobile={false}
      />
    );
    expect(screen.getByText('bye')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    // Message gone, Pixel still rendered (animating phase).
    expect(screen.queryByText('bye')).not.toBeInTheDocument();
    expect(screen.getAllByAltText('Pixel').length).toBeGreaterThan(0);
  });

  it('fires onAnimationComplete after 3500ms total', () => {
    const onAnimationComplete = vi.fn();
    render(
      <PixelMinimizeAnimation
        message="bye"
        onAnimationComplete={onAnimationComplete}
        isMobile={false}
      />
    );
    expect(onAnimationComplete).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(3500);
    });
    expect(onAnimationComplete).toHaveBeenCalledTimes(1);
  });

  it('cleans up timers on unmount (no late onAnimationComplete fire)', () => {
    const onAnimationComplete = vi.fn();
    const { unmount } = render(
      <PixelMinimizeAnimation
        message="bye"
        onAnimationComplete={onAnimationComplete}
        isMobile={false}
      />
    );
    unmount();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onAnimationComplete).not.toHaveBeenCalled();
  });

  it('exposes the desktop target position (top-left) when isMobile=false', () => {
    // Indirect: the component renders; we just confirm both isMobile
    // values produce a valid render.
    render(<PixelMinimizeAnimation message="bye" onAnimationComplete={vi.fn()} isMobile={false} />);
    expect(screen.getAllByAltText('Pixel').length).toBeGreaterThan(0);
  });

  it('exposes the mobile target position (top-right) when isMobile=true', () => {
    render(<PixelMinimizeAnimation message="bye" onAnimationComplete={vi.fn()} isMobile={true} />);
    expect(screen.getAllByAltText('Pixel').length).toBeGreaterThan(0);
  });
});

describe('minimize-animation — exported animation variants', () => {
  it('minimizeAnimationVariants exposes initial/minimizing/minimized keys', () => {
    expect(minimizeAnimationVariants).toHaveProperty('initial');
    expect(minimizeAnimationVariants).toHaveProperty('minimizing');
    expect(minimizeAnimationVariants).toHaveProperty('minimized');
  });

  it('bounceInAnimation has initial + animate stages', () => {
    expect(bounceInAnimation).toHaveProperty('initial');
    expect(bounceInAnimation).toHaveProperty('animate');
  });
});
