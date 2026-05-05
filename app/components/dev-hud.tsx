import { useEffect, useState } from 'react';
import { useDebugFlag } from '@lib/hooks/use-debug-flag';
import { getColdStartMs, getPyodideState, type PyodideState } from '@lib/python/pyodide-singleton';

const COLLAPSED_KEY = 'debug-hud-collapsed';
const POLL_MS = 500;

/**
 * Floating debug-info panel pinned bottom-right. Renders only when the debug
 * flag is set (`?debug=1` or `localStorage.debug='1'`); otherwise returns null.
 *
 * Three rows: Pyodide cold-start ms, Pyodide state, and rendering host (always
 * `client` for this SPA — kept as a row because mobile/Capacitor builds may
 * eventually add a "native" mode worth distinguishing).
 *
 * Polls the singleton state every 500ms — cheap (string + number reads) and
 * avoids forcing the singleton to expose a subscriber API just for the HUD.
 */
export function DevHud() {
  const enabled = useDebugFlag();
  const [collapsed, setCollapsed] = useState<boolean>(() => readCollapsed());
  const [snapshot, setSnapshot] = useState<HudSnapshot>(() => readSnapshot());

  useEffect(() => {
    if (!enabled) return;
    const id = window.setInterval(() => setSnapshot(readSnapshot()), POLL_MS);
    return () => window.clearInterval(id);
  }, [enabled]);

  if (!enabled) return null;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // localStorage wedged — toggle still works for the session, just not persisted.
    }
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={toggle}
        data-testid="dev-hud-toggle"
        aria-label="Expand dev HUD"
        className="fixed bottom-3 right-3 z-[9999] w-8 h-8 rounded-full bg-purple-900/85 text-purple-50 text-sm font-mono hover:bg-purple-800 shadow-lg"
      >
        ⌃
      </button>
    );
  }

  return (
    <div
      data-testid="dev-hud"
      className="fixed bottom-3 right-3 z-[9999] w-[280px] rounded-lg bg-purple-950/90 text-purple-50 text-xs font-mono shadow-xl border border-purple-700"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-purple-800">
        <span className="font-semibold">dev hud</span>
        <button
          type="button"
          onClick={toggle}
          aria-label="Collapse dev HUD"
          data-testid="dev-hud-toggle"
          className="text-purple-300 hover:text-white"
        >
          ⌄
        </button>
      </div>
      <dl className="px-3 py-2 space-y-1">
        <Row label="cold-start" value={formatColdStart(snapshot.coldStartMs)} />
        <Row label="pyodide" value={snapshot.pyodideState} />
        <Row label="host" value="client" />
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3" data-testid={`dev-hud-row-${label}`}>
      <dt className="text-purple-300">{label}</dt>
      <dd className="text-purple-50 truncate">{value}</dd>
    </div>
  );
}

interface HudSnapshot {
  coldStartMs: number | null;
  pyodideState: PyodideState;
}

function readSnapshot(): HudSnapshot {
  return {
    coldStartMs: getColdStartMs(),
    pyodideState: getPyodideState(),
  };
}

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

function formatColdStart(ms: number | null): string {
  if (ms === null) return '—';
  return `${Math.round(ms)}ms`;
}
