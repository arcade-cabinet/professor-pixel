import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { DevHud } from '@/components/dev-hud';

vi.mock('@lib/python/pyodide-singleton', () => ({
  getColdStartMs: vi.fn(() => 1234.6),
  getPyodideState: vi.fn(() => 'ready' as const),
}));

describe('DevHud', () => {
  beforeEach(() => {
    window.localStorage.clear();
    // Reset URL to a clean state — the query-param path uses
    // window.location.search, which we drive via history.pushState.
    window.history.pushState({}, '', '/');
  });

  afterEach(() => {
    window.localStorage.clear();
    window.history.pushState({}, '', '/');
    vi.useRealTimers();
  });

  it('renders nothing when the debug flag is unset', () => {
    render(<DevHud />);
    expect(screen.queryByTestId('dev-hud')).not.toBeInTheDocument();
    expect(screen.queryByTestId('dev-hud-toggle')).not.toBeInTheDocument();
  });

  it('renders the panel when localStorage.debug = "1"', () => {
    window.localStorage.setItem('debug', '1');
    render(<DevHud />);
    expect(screen.getByTestId('dev-hud')).toBeInTheDocument();
    expect(screen.getByTestId('dev-hud-row-cold-start')).toHaveTextContent('1235ms');
    expect(screen.getByTestId('dev-hud-row-pyodide')).toHaveTextContent('ready');
    expect(screen.getByTestId('dev-hud-row-host')).toHaveTextContent('client');
  });

  it('renders the panel when ?debug=1 is set in the URL', () => {
    window.history.pushState({}, '', '/?debug=1');
    render(<DevHud />);
    expect(screen.getByTestId('dev-hud')).toBeInTheDocument();
  });

  it('starts collapsed when localStorage.debug-hud-collapsed = "1"', () => {
    window.localStorage.setItem('debug', '1');
    window.localStorage.setItem('debug-hud-collapsed', '1');
    render(<DevHud />);
    expect(screen.queryByTestId('dev-hud')).not.toBeInTheDocument();
    expect(screen.getByTestId('dev-hud-toggle')).toBeInTheDocument();
  });

  it('toggles between collapsed and expanded, persisting to localStorage', async () => {
    window.localStorage.setItem('debug', '1');
    const user = userEvent.setup();
    render(<DevHud />);

    // Starts expanded; collapse.
    await user.click(screen.getByTestId('dev-hud-toggle'));
    expect(screen.queryByTestId('dev-hud')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('debug-hud-collapsed')).toBe('1');

    // Re-expand.
    await user.click(screen.getByTestId('dev-hud-toggle'));
    expect(screen.getByTestId('dev-hud')).toBeInTheDocument();
    expect(window.localStorage.getItem('debug-hud-collapsed')).toBe('0');
  });

  it('renders a dash for cold-start before Pyodide has booted', async () => {
    const mod = await import('@lib/python/pyodide-singleton');
    vi.mocked(mod.getColdStartMs).mockReturnValueOnce(null);
    vi.mocked(mod.getPyodideState).mockReturnValueOnce('uninitialized');
    window.localStorage.setItem('debug', '1');
    render(<DevHud />);
    expect(screen.getByTestId('dev-hud-row-cold-start')).toHaveTextContent('—');
    expect(screen.getByTestId('dev-hud-row-pyodide')).toHaveTextContent('uninitialized');
  });

  it('polls and re-renders when the singleton state changes', async () => {
    vi.useFakeTimers();
    const mod = await import('@lib/python/pyodide-singleton');
    vi.mocked(mod.getColdStartMs).mockReturnValue(null);
    vi.mocked(mod.getPyodideState).mockReturnValue('uninitialized');
    window.localStorage.setItem('debug', '1');
    render(<DevHud />);
    expect(screen.getByTestId('dev-hud-row-pyodide')).toHaveTextContent('uninitialized');

    // Pyodide finishes loading mid-session.
    vi.mocked(mod.getColdStartMs).mockReturnValue(2500);
    vi.mocked(mod.getPyodideState).mockReturnValue('ready');
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId('dev-hud-row-pyodide')).toHaveTextContent('ready');
    expect(screen.getByTestId('dev-hud-row-cold-start')).toHaveTextContent('2500ms');
  });
});
