// Cover the readCollapsed catch block in app/components/dev-hud.tsx
// (line 108): when window.localStorage.getItem throws, readCollapsed
// must return false (HUD renders expanded). The existing component test
// (real Chromium) doesn't easily wedge localStorage; here we use jsdom
// + a Storage.prototype spy.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

vi.mock('@lib/python/pyodide-singleton', () => ({
  getColdStartMs: vi.fn(() => 100),
  getPyodideState: vi.fn(() => 'ready' as const),
}));

vi.mock('@lib/hooks/use-debug-flag', () => ({
  useDebugFlag: () => true,
}));

import { DevHud } from '@/components/dev-hud';

beforeEach(() => {
  // Spy on Storage.prototype.getItem so the readCollapsed call throws
  // synchronously during the useState initializer. Other consumers of
  // localStorage in this render path (none, since useDebugFlag is mocked
  // and dev-hud's setItem is only called from the toggle handler) won't
  // trigger this spy.
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('localStorage wedged');
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('DevHud — readCollapsed catch (line 108)', () => {
  it('renders the expanded HUD when localStorage.getItem throws', () => {
    render(<DevHud />);
    // readCollapsed catch → false → expanded HUD (data-testid="dev-hud").
    expect(screen.getByTestId('dev-hud')).toBeInTheDocument();
    // Sanity: not collapsed (the toggle-only button has aria-label "Expand dev HUD").
    const toggle = screen.getByTestId('dev-hud-toggle');
    expect(toggle.getAttribute('aria-label')).toBe('Collapse dev HUD');
  });
});
