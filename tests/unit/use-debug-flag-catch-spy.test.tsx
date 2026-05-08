// Cover the readDebugFlag catch fallback in src/hooks/use-debug-flag.ts
// (line 42). The existing use-debug-flag.test.tsx assigns
// `window.localStorage.getItem = () => { throw }`, but jsdom's Storage
// methods sit on the prototype and the assignment doesn't actually
// shadow them. Spy via Storage.prototype.getItem instead so the throw
// reaches the catch arm.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { useDebugFlag } from '@lib/hooks/use-debug-flag';

beforeEach(() => {
  // Make sure ?debug=1 isn't set; otherwise the URL branch returns
  // true before reaching the localStorage call that throws.
  Object.defineProperty(window, 'location', {
    configurable: true,
    writable: true,
    value: { ...window.location, search: '' },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useDebugFlag — readDebugFlag catch fallback (line 42)', () => {
  it('returns false when localStorage.getItem throws via Storage.prototype spy', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError', 'SecurityError');
    });
    const { result } = renderHook(() => useDebugFlag());
    expect(result.current).toBe(false);
  });
});
