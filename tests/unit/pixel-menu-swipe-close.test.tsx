// Cover the useSwipeable onSwipedDown / onSwipedRight close handlers
// in app/components/pixel/menu.tsx (lines 118-122). The existing
// pixel-menu-extras.test.tsx skips them because useSwipeable in jsdom
// doesn't honor synthetic touch events.
//
// Strategy: vi.mock react-swipeable so useSwipeable captures the
// config object at mount; the test then invokes onSwipedDown /
// onSwipedRight manually and asserts onClose was called.

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

interface CapturedSwipeConfig {
  onSwipedDown?: () => void;
  onSwipedRight?: () => void;
}

const captured: { config: CapturedSwipeConfig | null } = { config: null };

vi.mock('react-swipeable', () => ({
  useSwipeable: (config: CapturedSwipeConfig) => {
    captured.config = config;
    return {}; // useSwipeable normally returns refs/spread props
  },
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('framer-motion');
  return {
    ...actual,
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  };
});

import PixelMenu from '@/components/pixel/menu';

afterEach(() => {
  captured.config = null;
  vi.restoreAllMocks();
});

describe('PixelMenu — swipe-to-close handlers (lines 118-122)', () => {
  it('onSwipedDown fires onClose', () => {
    const onClose = vi.fn();
    render(<PixelMenu isOpen={true} onClose={onClose} sessionActions={[]} />);
    expect(captured.config).not.toBeNull();
    expect(typeof captured.config!.onSwipedDown).toBe('function');
    captured.config!.onSwipedDown!();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('onSwipedRight fires onClose', () => {
    const onClose = vi.fn();
    render(<PixelMenu isOpen={true} onClose={onClose} sessionActions={[]} />);
    expect(typeof captured.config!.onSwipedRight).toBe('function');
    captured.config!.onSwipedRight!();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
