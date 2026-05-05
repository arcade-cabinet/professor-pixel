import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import OfflineBanner from '@/components/ui/offline-banner';

// Q15 — banner subscribes to window online/offline events. We swap
// navigator.onLine via Object.defineProperty (it's read-only by default
// on jsdom but configurable) and dispatch the corresponding event.

const setOnline = (value: boolean) => {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value,
  });
};

beforeEach(() => {
  setOnline(true);
});

afterEach(() => {
  vi.restoreAllMocks();
  setOnline(true);
});

describe('OfflineBanner (Q15)', () => {
  it('renders nothing when navigator.onLine is true on mount', () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });

  it('renders the banner when navigator.onLine is false on mount', () => {
    setOnline(false);
    render(<OfflineBanner />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
  });

  it('appears on offline event and disappears on online event', () => {
    setOnline(true);
    render(<OfflineBanner />);
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();

    act(() => {
      setOnline(false);
      window.dispatchEvent(new Event('offline'));
    });
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();

    act(() => {
      setOnline(true);
      window.dispatchEvent(new Event('online'));
    });
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });
});
