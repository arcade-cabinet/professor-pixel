// Cover the measureLocalStorageBytes catch in src/storage/quota.ts
// (line 127-128). When the iteration over localStorage entries throws
// (e.g. sandboxed iframe surfaces the storage object but throws on
// `key(i)` access, or quota-exceeded on a previous write left the
// store in an inconsistent state), the catch returns null so
// shouldWarnQuota cleanly degrades to "I don't know — assume OK".

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shouldWarnQuota } from '@lib/storage/quota';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('quota — measureLocalStorageBytes catch (line 127-128)', () => {
  it('returns false (no warn) when localStorage.key throws inside the iteration', async () => {
    // Plant a value so length > 0 and the loop body runs at least once.
    localStorage.setItem('a', 'b');
    // Force key(i) to throw — simulates sandbox / opaque-origin
    // surfaces where the storage proxy throws on enumeration.
    vi.spyOn(Storage.prototype, 'key').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    // measureLocalStorageBytes returns null → shouldWarnQuota's
    // `total >= warningBytes` check sees null which is NOT >= number,
    // so the result is false.
    const result = await shouldWarnQuota();
    expect(result).toBe(false);
  });

  it('returns false when localStorage.getItem throws inside the iteration', async () => {
    localStorage.setItem('a', 'b');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('SecurityError');
    });
    const result = await shouldWarnQuota();
    expect(result).toBe(false);
  });
});
