// P4.33 — the editor's compact offline indicator. Source-level checks:
// the catalog has the editor-specific copy, the pill component is wired
// to the shared hook (no duplicated subscription logic), and the lesson
// page actually mounts it. Drift in any of these breaks the contract.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { strings } from '@lib/i18n';

const ROOT = join(__dirname, '..', '..');
const PILL_SOURCE = readFileSync(join(ROOT, 'app/components/ui/offline-pill.tsx'), 'utf8');
const BANNER_SOURCE = readFileSync(join(ROOT, 'app/components/ui/offline-banner.tsx'), 'utf8');
const LESSON_SOURCE = readFileSync(join(ROOT, 'app/pages/lesson.tsx'), 'utf8');
const HOOK_SOURCE = readFileSync(join(ROOT, 'src/hooks/use-online-status.ts'), 'utf8');

describe('offline pill (P4.33)', () => {
  it('catalog has the editor-specific copy', () => {
    expect(strings.chrome.offlinePill.label).toBe('Offline');
    expect(strings.chrome.offlinePill.tooltip).toMatch(/code.*runs.*locally/i);
    expect(strings.chrome.offlinePill.ariaLabel).toMatch(/offline/i);
  });

  it('pill uses the shared useOnlineStatus hook', () => {
    expect(PILL_SOURCE).toContain("from '@lib/hooks/use-online-status'");
    expect(PILL_SOURCE).toContain('useOnlineStatus()');
    // The pill must NOT subscribe to online/offline events itself —
    // that subscription belongs to the shared hook.
    expect(PILL_SOURCE).not.toContain("addEventListener('online'");
    expect(PILL_SOURCE).not.toContain("addEventListener('offline'");
    expect(PILL_SOURCE).not.toContain('useSyncExternalStore');
  });

  it('banner was migrated to the shared hook (no duplicated subscription)', () => {
    expect(BANNER_SOURCE).toContain("from '@lib/hooks/use-online-status'");
    expect(BANNER_SOURCE).toContain('useOnlineStatus()');
    expect(BANNER_SOURCE).not.toContain('useSyncExternalStore');
    expect(BANNER_SOURCE).not.toContain("addEventListener('online'");
  });

  it('the shared hook is the single source of truth for online/offline events', () => {
    // Both subscriptions live exactly once — in the hook itself.
    expect(HOOK_SOURCE).toContain("addEventListener('online'");
    expect(HOOK_SOURCE).toContain("addEventListener('offline'");
    expect(HOOK_SOURCE).toContain('useSyncExternalStore');
  });

  it('lesson page mounts the offline pill', () => {
    expect(LESSON_SOURCE).toContain("from '@/components/ui/offline-pill'");
    expect(LESSON_SOURCE).toMatch(/<OfflinePill\s*\/?>/);
  });

  it('uses a persistent live-region host so announcements fire on transitions', () => {
    // Earlier shape was `if (online) return null` — that unmounted the
    // role="status" host on every online→offline flip and screen
    // readers silently lost the registered live region. The fix keeps
    // an empty live-region host mounted always; only the visible pill
    // is conditional.
    expect(PILL_SOURCE).not.toMatch(/if\s*\(\s*online\s*\)\s*return\s*null/);
    expect(PILL_SOURCE).toContain('role="status"');
    expect(PILL_SOURCE).toContain('aria-live="polite"');
    expect(PILL_SOURCE).toContain('data-testid="offline-pill-host"');
    // The visible pill still exposes its testid for integration assertions.
    expect(PILL_SOURCE).toContain('data-testid="offline-pill"');
    // Conditional render of the visible pill via `!online && ...`.
    expect(PILL_SOURCE).toMatch(/!online\s*&&/);
  });
});
