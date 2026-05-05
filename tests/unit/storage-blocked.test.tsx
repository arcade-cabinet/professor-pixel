import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import StorageBlockedNotice from '@/components/ui/storage-blocked-notice';
import { __resetStorageBlockedCache } from '@lib/storage/private-mode';

beforeEach(() => {
  __resetStorageBlockedCache();
  sessionStorage.clear();
});

afterEach(() => {
  __resetStorageBlockedCache();
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe('StorageBlockedNotice (Q12)', () => {
  it('renders nothing when localStorage is writable', () => {
    // jsdom localStorage works by default — probe will succeed.
    render(<StorageBlockedNotice />);
    expect(screen.queryByTestId('storage-blocked-notice')).not.toBeInTheDocument();
  });

  it('renders the notice when localStorage.setItem throws (private mode)', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    render(<StorageBlockedNotice />);
    expect(screen.getByTestId('storage-blocked-notice')).toBeInTheDocument();
    setItemSpy.mockRestore();
  });

  it('renders the notice when the round-trip echo mismatches (silent-drop case)', () => {
    // Some browsers accept setItem then return null on getItem. Mimic that.
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
    render(<StorageBlockedNotice />);
    expect(screen.getByTestId('storage-blocked-notice')).toBeInTheDocument();
  });

  it('disappears after dismiss and persists the dismissal in sessionStorage', () => {
    // Delegate non-probe keys to the real Storage.prototype.setItem so the
    // dismiss write actually lands in sessionStorage and we can assert it
    // (CodeRabbit feedback: stubbing all setItem only proves in-memory hiding).
    const realSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (
      this: Storage,
      key: string,
      value: string
    ) {
      // The probe key is randomized per tab (pp.__storage_probe_<rand>__).
      // Throw only on probe keys; pass everything else through (the dismiss
      // key pp.storageBlockedDismissed needs to actually persist).
      if (typeof key === 'string' && key.startsWith('pp.__storage_probe_')) {
        throw new Error('QuotaExceededError');
      }
      return realSetItem.call(this, key, value);
    });
    render(<StorageBlockedNotice />);
    expect(screen.getByTestId('storage-blocked-notice')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('storage-blocked-dismiss'));
    expect(screen.queryByTestId('storage-blocked-notice')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('pp.storageBlockedDismissed')).toBe('1');
  });
});
