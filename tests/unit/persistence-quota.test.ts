import { describe, expect, it } from 'vitest';
import { isQuotaExceeded } from '@lib/storage/persistence';

describe('isQuotaExceeded', () => {
  it('matches by DOMException name (Chrome/Safari modern)', () => {
    const err = new Error('full');
    err.name = 'QuotaExceededError';
    expect(isQuotaExceeded(err)).toBe(true);
  });

  it('matches by Firefox-specific name', () => {
    const err = new Error('full');
    err.name = 'NS_ERROR_DOM_QUOTA_REACHED';
    expect(isQuotaExceeded(err)).toBe(true);
  });

  it('matches by legacy code === 22 (Chrome/Safari pre-2018)', () => {
    const err = new Error('full') as Error & { code: number };
    err.code = 22;
    expect(isQuotaExceeded(err)).toBe(true);
  });

  it('matches by legacy code === 1014 (Firefox pre-2018)', () => {
    const err = new Error('full') as Error & { code: number };
    err.code = 1014;
    expect(isQuotaExceeded(err)).toBe(true);
  });

  it('matches by message text fallback', () => {
    expect(isQuotaExceeded(new Error('quota exceeded'))).toBe(true);
    expect(isQuotaExceeded(new Error('storage quota'))).toBe(true);
  });

  it('does not match unrelated errors', () => {
    expect(isQuotaExceeded(new Error('nope'))).toBe(false);
    expect(isQuotaExceeded(new TypeError('something else'))).toBe(false);
  });

  it('handles non-Error inputs safely', () => {
    expect(isQuotaExceeded(null)).toBe(false);
    expect(isQuotaExceeded(undefined)).toBe(false);
    expect(isQuotaExceeded('string error')).toBe(false);
    expect(isQuotaExceeded({ name: 'QuotaExceededError' })).toBe(false);
  });
});
