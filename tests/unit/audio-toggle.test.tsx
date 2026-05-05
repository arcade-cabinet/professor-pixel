import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import AudioToggle from '@/components/audio-toggle';
import { isAudioEnabled, setAudioEnabled } from '@lib/audio/tts';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('AudioToggle (P8)', () => {
  it('starts in the persisted state — default off', () => {
    render(<AudioToggle />);
    expect(screen.getByTestId('audio-toggle-off-icon')).toBeInTheDocument();
    expect(screen.getByTestId('audio-toggle')).toHaveAttribute('aria-pressed', 'false');
  });

  it('reflects a pre-toggled persisted state on mount', () => {
    setAudioEnabled(true);
    render(<AudioToggle />);
    expect(screen.getByTestId('audio-toggle-on-icon')).toBeInTheDocument();
    expect(screen.getByTestId('audio-toggle')).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles persisted state on click and exposes aria-pressed', () => {
    render(<AudioToggle />);
    const btn = screen.getByTestId('audio-toggle');
    expect(isAudioEnabled()).toBe(false);

    fireEvent.click(btn);
    expect(isAudioEnabled()).toBe(true);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('audio-toggle-on-icon')).toBeInTheDocument();

    fireEvent.click(btn);
    expect(isAudioEnabled()).toBe(false);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('audio-toggle-off-icon')).toBeInTheDocument();
  });

  it('updates when audio state flips externally (subscribeAudioEnabled)', async () => {
    render(<AudioToggle />);
    expect(screen.getByTestId('audio-toggle-off-icon')).toBeInTheDocument();

    // Simulate another surface (PixelMenu, settings) flipping the toggle.
    act(() => {
      setAudioEnabled(true);
    });
    await waitFor(() => expect(screen.getByTestId('audio-toggle-on-icon')).toBeInTheDocument());
  });

  it('renders the optional label form for settings/profile contexts', () => {
    render(<AudioToggle showLabel />);
    expect(screen.getByText(/sound off/i)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('audio-toggle'));
    expect(screen.getByText(/sound on/i)).toBeInTheDocument();
  });
});
