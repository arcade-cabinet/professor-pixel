import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadProfile, saveProfile, clearProfile, InvalidProfileError } from '@lib/storage/profile';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('profile storage', () => {
  it('returns null when no profile is set', () => {
    expect(loadProfile()).toBeNull();
  });

  it('round-trips a name through save then load', () => {
    saveProfile('Alex');
    const loaded = loadProfile();
    expect(loaded?.name).toBe('Alex');
    expect(loaded?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO timestamp
  });

  it('trims whitespace from the saved name', () => {
    saveProfile('   Sam   ');
    expect(loadProfile()?.name).toBe('Sam');
  });

  it('rejects names longer than the cap with InvalidProfileError (P4.19)', async () => {
    // Old behaviour silently truncated to 32 chars; new behaviour rejects
    // so the caller can surface a "names can be at most N characters"
    // toast. Length cap is centralized in PROFILE_NAME_MAX_LENGTH.
    const { PROFILE_NAME_MAX_LENGTH, InvalidProfileError } = await import('@lib/storage/profile');
    expect(() => saveProfile('a'.repeat(PROFILE_NAME_MAX_LENGTH + 1))).toThrow(InvalidProfileError);
    // No partial save — loadProfile returns null because nothing landed.
    expect(loadProfile()).toBeNull();
  });

  it('accepts names exactly at the cap (P4.19)', async () => {
    const { PROFILE_NAME_MAX_LENGTH } = await import('@lib/storage/profile');
    saveProfile('a'.repeat(PROFILE_NAME_MAX_LENGTH));
    expect(loadProfile()?.name).toHaveLength(PROFILE_NAME_MAX_LENGTH);
  });

  it('preserves createdAt across re-saves (does not reset)', async () => {
    saveProfile('First');
    const t1 = loadProfile()?.createdAt;
    // Wait a millisecond so a fresh ISO would differ
    await new Promise((r) => setTimeout(r, 5));
    saveProfile('Second');
    const t2 = loadProfile()?.createdAt;
    expect(t1).toBe(t2);
    expect(loadProfile()?.name).toBe('Second');
  });

  it('clearProfile removes the saved data', () => {
    saveProfile('Bye');
    clearProfile();
    expect(loadProfile()).toBeNull();
  });

  it('returns null for malformed JSON in storage', () => {
    localStorage.setItem('pp.profile', 'not json');
    expect(loadProfile()).toBeNull();
  });

  it('returns null when stored shape lacks required fields', () => {
    localStorage.setItem('pp.profile', JSON.stringify({ name: 'NoTimestamp' }));
    expect(loadProfile()).toBeNull();
  });

  it('throws InvalidProfileError on blank/whitespace input rather than persisting', () => {
    expect(() => saveProfile('')).toThrow(InvalidProfileError);
    expect(() => saveProfile('   ')).toThrow(InvalidProfileError);
    expect(() => saveProfile('\t\n')).toThrow(InvalidProfileError);
    expect(localStorage.getItem('pp.profile')).toBeNull();
  });

  it('rejects a stored blank-name profile from older versions', () => {
    localStorage.setItem(
      'pp.profile',
      JSON.stringify({ name: '   ', createdAt: '2026-01-01T00:00:00.000Z' })
    );
    expect(loadProfile()).toBeNull();
  });
});
