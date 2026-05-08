// Cover the needsMigration catch branch in src/storage/persistence.ts
// (line 416-417). When the stored value isn't valid JSON, JSON.parse
// throws and the catch returns false. Without this branch, a single
// corrupt value would crash migrateStorageIfNeeded and prevent the
// app from booting.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrateStorageIfNeeded } from '@lib/storage/persistence';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('persistence — needsMigration JSON.parse catch (line 416-417)', () => {
  it('migrateStorageIfNeeded does not throw when localStorage has corrupt JSON', () => {
    localStorage.setItem('wizard.state.v1', '{not valid json');
    expect(() => migrateStorageIfNeeded()).not.toThrow();
  });

  it('migrateStorageIfNeeded does not throw when sessionStorage has corrupt JSON', () => {
    sessionStorage.setItem('wizard.session.v1', '{also not valid json');
    expect(() => migrateStorageIfNeeded()).not.toThrow();
  });

  it('migrateStorageIfNeeded handles both stores with corrupt JSON in one pass', () => {
    localStorage.setItem('wizard.state.v1', 'definitely[not}json');
    sessionStorage.setItem('wizard.session.v1', 'still~not~json');
    expect(() => migrateStorageIfNeeded()).not.toThrow();
  });
});
