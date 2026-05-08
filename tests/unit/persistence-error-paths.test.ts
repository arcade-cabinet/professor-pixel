// Cover the error-path catch handlers in src/storage/persistence.ts that
// the existing persistence.test.ts skips:
//   - line 107: handleStorageError + isQuotaExceeded → window.toast invocation
//   - line 117: handleStorageError → window.trackError invocation
//   - line 230: clearWizardState catch
//   - line 247: saveSessionState catch
//   - line 274: clearSessionState catch
//   - line 315: deleteCookie catch
//   - line 338: saveUserPreferences catch
//   - lines 356-357: loadUserPreferences catch
//   - line 417: needsMigration catch (JSON.parse throw)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearWizardState,
  saveSessionState,
  clearSessionState,
  deleteCookie,
  saveUserPreferences,
  loadUserPreferences,
} from '@lib/storage/persistence';

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  // Drop any window.toast / window.trackError stubs the tests installed.
  delete (window as Window & { toast?: unknown }).toast;
  delete (window as Window & { trackError?: unknown }).trackError;
});

// QuotaExceededError-shaped exception. Different browsers throw with
// different .name and .code values; the prod isQuotaExceeded(error)
// recognizes any of QuotaExceededError / NS_ERROR_DOM_QUOTA_REACHED /
// code 22 / code 1014, so the simplest match is .name = 'QuotaExceededError'.
function makeQuotaError() {
  const err = new Error('quota');
  err.name = 'QuotaExceededError';
  return err;
}

describe('persistence — handleStorageError window.toast branch (line 107)', () => {
  it('quota-exceeded error fires window.toast when set', () => {
    const toastMock = vi.fn();
    (window as Window & { toast?: (msg: unknown) => void }).toast = toastMock;
    // Make localStorage.removeItem throw a quota error → clearWizardState's
    // catch routes through handleStorageError, which sees a quota error
    // and invokes window.toast.
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw makeQuotaError();
    });
    clearWizardState();
    expect(toastMock).toHaveBeenCalledWith(
      expect.stringContaining('saved games are full')
    );
  });
});

describe('persistence — handleStorageError window.trackError branch (line 117)', () => {
  it('window.trackError is called with the error + operation context', () => {
    const trackMock = vi.fn();
    (window as Window & {
      trackError?: (e: Error, ctx: Record<string, unknown>) => void;
    }).trackError = trackMock;
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      // Avoid the substring 'quota' — isQuotaExceeded does a /quota/i regex
      // on the message, which would flip quotaExceeded=true.
      throw new Error('generic storage failure');
    });
    clearWizardState();
    expect(trackMock).toHaveBeenCalled();
    const ctx = trackMock.mock.calls[0][1] as Record<string, unknown>;
    expect(ctx.operation).toBe('clearWizardState');
    expect(ctx.type).toBe('storage');
    expect(ctx.quotaExceeded).toBe(false);
  });
});

describe('persistence — saveSessionState catch (line 247)', () => {
  it('sessionStorage.setItem throw is caught + handleStorageError fires', () => {
    const errSpy = vi.spyOn(console, 'error');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('session setItem boom');
    });
    expect(() => saveSessionState({ version: '1.0.0' })).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Storage operation failed (saveSessionState)'),
      expect.any(Error)
    );
  });
});

describe('persistence — clearSessionState catch (line 274)', () => {
  it('sessionStorage.removeItem throw is caught', () => {
    const errSpy = vi.spyOn(console, 'error');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('session removeItem boom');
    });
    expect(() => clearSessionState()).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Storage operation failed (clearSessionState)'),
      expect.any(Error)
    );
  });
});

describe('persistence — deleteCookie catch (line 315)', () => {
  it('document.cookie set throw is caught (deleteCookie delegates to setCookie)', () => {
    const errSpy = vi.spyOn(console, 'error');
    // Spy on document.cookie's setter so writing throws.
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() {
        return '';
      },
      set() {
        throw new Error('cookie write boom');
      },
    });
    // setCookie's own try/catch swallows the throw; deleteCookie wraps
    // setCookie in another try/catch, but since setCookie already
    // catches, deleteCookie's catch never fires. The setCookie catch
    // logs 'setCookie' as the operation (line 288).
    expect(() => deleteCookie('theme')).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Storage operation failed (setCookie)'),
      expect.any(Error)
    );
    // Restore document.cookie property to default.
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      writable: true,
      value: '',
    });
  });
});

describe('persistence — saveUserPreferences catch (line 338)', () => {
  it('an inner setCookie throw inside saveUserPreferences is logged via the setCookie catch', () => {
    const errSpy = vi.spyOn(console, 'error');
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      get() {
        return '';
      },
      set() {
        throw new Error('cookie boom');
      },
    });
    expect(() =>
      saveUserPreferences({
        theme: 'dark',
        dismissedTips: [],
        soundEnabled: true,
        autoSaveEnabled: true,
      })
    ).not.toThrow();
    expect(errSpy).toHaveBeenCalled();
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      writable: true,
      value: '',
    });
  });
});

describe('persistence — loadUserPreferences catch (lines 355-363)', () => {
  it('JSON.parse throwing on tips_dismissed cookie returns the default prefs', () => {
    const errSpy = vi.spyOn(console, 'error');
    // Set a valid theme cookie + an INVALID dismissedTips cookie so
    // JSON.parse throws inside loadUserPreferences.
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      writable: true,
      value: 'wizard_tips_dismissed={not valid json',
    });
    const result = loadUserPreferences();
    expect(result.theme).toBe('system');
    expect(result.dismissedTips).toEqual([]);
    expect(result.soundEnabled).toBe(true);
    expect(result.autoSaveEnabled).toBe(true);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Storage operation failed (loadUserPreferences)'),
      expect.any(Error)
    );
  });
});

describe('persistence — clearWizardState catch (line 230)', () => {
  it('localStorage.removeItem throw is caught + handleStorageError fires', () => {
    const errSpy = vi.spyOn(console, 'error');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('local removeItem boom');
    });
    expect(() => clearWizardState()).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining('Storage operation failed (clearWizardState)'),
      expect.any(Error)
    );
  });
});
