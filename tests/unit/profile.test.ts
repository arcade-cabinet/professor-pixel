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

  // P4.32 — pronouns + emoji avatar
  describe('expression fields (P4.32)', () => {
    it('saves and loads optional pronouns', () => {
      saveProfile({ name: 'Alex', pronouns: 'they/them' });
      expect(loadProfile()?.pronouns).toBe('they/them');
    });

    it('saves and loads optional avatarEmoji', () => {
      saveProfile({ name: 'Alex', avatarEmoji: '🦊' });
      expect(loadProfile()?.avatarEmoji).toBe('🦊');
    });

    it('legacy profiles (no pronouns/avatarEmoji) load with undefined fields', () => {
      // Simulate a v1-shape profile written before P4.32 shipped.
      localStorage.setItem(
        'pp.profile',
        JSON.stringify({ name: 'Old', createdAt: '2026-01-01T00:00:00.000Z' })
      );
      const loaded = loadProfile();
      expect(loaded?.name).toBe('Old');
      expect(loaded?.pronouns).toBeUndefined();
      expect(loaded?.avatarEmoji).toBeUndefined();
    });

    it('null pronouns explicitly clears the existing value', () => {
      saveProfile({ name: 'Alex', pronouns: 'she/her' });
      expect(loadProfile()?.pronouns).toBe('she/her');
      saveProfile({ name: 'Alex', pronouns: null });
      expect(loadProfile()?.pronouns).toBeUndefined();
    });

    it('omitted pronouns carry over from the existing profile', () => {
      saveProfile({ name: 'Alex', pronouns: 'they/them' });
      // Re-save with just a name change — pronouns should persist.
      saveProfile({ name: 'Alex' });
      expect(loadProfile()?.pronouns).toBe('they/them');
    });

    it('null avatarEmoji clears the existing value', () => {
      saveProfile({ name: 'Alex', avatarEmoji: '🦄' });
      expect(loadProfile()?.avatarEmoji).toBe('🦄');
      saveProfile({ name: 'Alex', avatarEmoji: null });
      expect(loadProfile()?.avatarEmoji).toBeUndefined();
    });

    it('bare-string saveProfile still works (legacy callers)', () => {
      saveProfile('Bare');
      expect(loadProfile()?.name).toBe('Bare');
    });

    it('rejects malformed pronouns/avatarEmoji from disk', () => {
      // A corrupted disk entry where pronouns is a number — load drops it.
      localStorage.setItem(
        'pp.profile',
        JSON.stringify({
          name: 'Alex',
          createdAt: '2026-01-01T00:00:00.000Z',
          pronouns: 42, // wrong type
          avatarEmoji: '', // empty string treated as unset
        })
      );
      const loaded = loadProfile();
      expect(loaded?.pronouns).toBeUndefined();
      expect(loaded?.avatarEmoji).toBeUndefined();
    });
  });
});
