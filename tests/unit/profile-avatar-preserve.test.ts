// Cover the "preserve existing avatarEmoji when patch omits it" branch
// in src/storage/profile.ts (line 117-118). Existing profile.test.ts
// tests null-clear and explicit-set; this test pins the contract that
// re-saving with a partial patch (no avatarEmoji field) keeps the
// previously-set emoji rather than clearing it.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { saveProfile, loadProfile, clearProfile } from '@lib/storage/profile';

beforeEach(() => {
  clearProfile();
  localStorage.clear();
});

afterEach(() => {
  clearProfile();
  localStorage.clear();
});

describe('saveProfile — preserves existing avatarEmoji when patch omits it (line 118)', () => {
  it('a re-save with only a name change keeps the previously-set avatarEmoji', () => {
    saveProfile({ name: 'Maya', avatarEmoji: '🦊' });
    expect(loadProfile()?.avatarEmoji).toBe('🦊');

    // Re-save with just a name change — avatarEmoji should persist.
    saveProfile({ name: 'Maya Renamed' });
    const after = loadProfile();
    expect(after?.name).toBe('Maya Renamed');
    expect(after?.avatarEmoji).toBe('🦊');
  });

  it('a re-save with both pronouns AND avatarEmoji omitted preserves both', () => {
    saveProfile({ name: 'Maya', pronouns: 'they/them', avatarEmoji: '🚀' });
    saveProfile({ name: 'Maya' });
    const after = loadProfile();
    expect(after?.pronouns).toBe('they/them');
    expect(after?.avatarEmoji).toBe('🚀');
  });
});
