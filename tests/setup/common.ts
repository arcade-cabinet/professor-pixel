// Global test setup for Vitest
import { expect, afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  // Tests may install ad-hoc storage shims that don't implement clear()
  // (e.g. the "storage disabled" simulation). Be defensive.
  try {
    (localStorage as Storage & { clear?: () => void }).clear?.();
  } catch {}
  try {
    (sessionStorage as Storage & { clear?: () => void }).clear?.();
  } catch {}
  // Clear all cookies
  try {
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
    });
  } catch {}
});

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
globalThis.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock fetch only in jsdom — component tests run in a real browser and need
// real fetch (e.g. for the asset catalog bootstrap).
//
// Default impl returns a rejected promise: tests that don't opt in to a
// specific mock should see fetch fail loudly rather than getting back
// `undefined` and crashing on `.then`. Modules like src/assets/catalog.ts
// fire .catch on the rejection and surface a console.warn — visible, but
// not an unhandled-rejection that fails the whole vitest run.
if (typeof window !== 'undefined' && window.navigator?.userAgent?.includes('jsdom')) {
  globalThis.fetch = vi.fn(() => Promise.reject(new Error('fetch not mocked in this test')));
}

// Setup console error/warning suppression for expected errors in tests
const originalError = console.error;
const originalWarn = console.warn;

beforeEach(() => {
  console.error = vi.fn((message, ...args) => {
    // Only suppress expected React errors in tests
    if (
      typeof message === 'string' &&
      (message.includes('ReactDOM.render') ||
        message.includes('unmounted component') ||
        message.includes('not wrapped in act'))
    ) {
      return;
    }
    originalError(message, ...args);
  });

  console.warn = vi.fn((message, ...args) => {
    // Suppress specific warnings if needed
    originalWarn(message, ...args);
  });
});

afterEach(() => {
  console.error = originalError;
  console.warn = originalWarn;
});
