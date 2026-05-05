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

  it('caps name length at 32 chars', () => {
    saveProfile('a'.repeat(100));
    expect(loadProfile()?.name).toHaveLength(32);
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
