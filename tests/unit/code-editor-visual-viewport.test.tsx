import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeEditor from '@/components/editor/code-editor';

// jsdom does not implement window.visualViewport. Stub it as a minimal
// EventTarget-like surface so the keyboard-inset effect can listen for
// resize/scroll without throwing. We drive the height + offsetTop +
// dispatchEvent('resize') manually to simulate iOS / Android opening
// the soft keyboard underneath the editor.
function installVisualViewportStub(initial: { height: number; offsetTop?: number }) {
  const listeners = new Map<string, Set<(ev: Event) => void>>();
  const stub = {
    height: initial.height,
    offsetTop: initial.offsetTop ?? 0,
    addEventListener(type: string, fn: (ev: Event) => void) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type: string, fn: (ev: Event) => void) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(ev: Event) {
      listeners.get(ev.type)?.forEach((fn) => fn(ev));
      return true;
    },
  };
  Object.defineProperty(window, 'visualViewport', {
    configurable: true,
    value: stub,
  });
  return stub;
}

// Monaco loads through an AMD shim by appending a <script> tag and waiting
// for window.require to resolve a callback. We never actually instantiate
// the real editor in this test — we only care about the viewport effect on
// the wrapper. Stubbing window.require to no-op prevents the loader from
// firing during render.
//
// Global ambients declare window.require/monaco as required at the type
// level; for tests we want the "not yet loaded" state to be the
// deterministic default. Cast through a writable record so the assignment
// is structural (no `any`).
type WritableShim = Record<'require' | 'monaco' | 'visualViewport', unknown>;

beforeEach(() => {
  const w = window as unknown as WritableShim;
  w.require = undefined;
  w.monaco = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  const w = window as unknown as Partial<WritableShim>;
  delete w.visualViewport;
});

describe('CodeEditor — visualViewport keyboard inset (P4.6)', () => {
  it('caps wrapper maxHeight to visible viewport when soft keyboard opens', async () => {
    // documentElement.clientHeight is the stable layout reference (800px);
    // visualViewport starts equal (no keyboard).
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 800,
    });
    const vv = installVisualViewportStub({ height: 800 });

    render(
      <CodeEditor
        code=""
        onChange={() => {}}
        onExecute={() => {}}
        output=""
        error=""
        isExecuting={false}
      />
    );

    const wrapper = screen.getByTestId('code-editor-wrapper');
    // No keyboard yet — no inline maxHeight should be applied.
    expect(wrapper.style.maxHeight).toBe('');

    // Simulate soft keyboard opening: viewport shrinks by 320px.
    act(() => {
      vv.height = 480;
      vv.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      // maxHeight is clientHeight - inset in px, keeping the cap baseline
      // and the inset reference in the same coordinate system. 800 - 320
      // = 480 visible CSS pixels for the wrapper.
      expect(wrapper.style.maxHeight).toBe('480px');
      // Overflow is gated on the same condition but lives in the
      // className (the static piece) — the inline style only carries
      // the dynamic px math.
      expect(wrapper.className).toMatch(/overflow-hidden/);
    });

    // Keyboard closes — maxHeight releases.
    act(() => {
      vv.height = 800;
      vv.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(wrapper.style.maxHeight).toBe('');
    });
  });

  it('clamps a transient negative inset to zero (no upward layout shift)', async () => {
    Object.defineProperty(document.documentElement, 'clientHeight', {
      configurable: true,
      value: 800,
    });
    // Viewport reports MORE than window height — a quirk seen on some
    // Android browsers during orientation change. Should not produce a
    // negative inset (which would expand the layout).
    const vv = installVisualViewportStub({ height: 850 });

    render(
      <CodeEditor
        code=""
        onChange={() => {}}
        onExecute={() => {}}
        output=""
        error=""
        isExecuting={false}
      />
    );

    const wrapper = screen.getByTestId('code-editor-wrapper');
    // Negative inset → clamp to 0 → no inline style applied.
    await waitFor(() => {
      expect(wrapper.style.maxHeight).toBe('');
    });

    // Sanity: still works when a real positive inset arrives.
    act(() => {
      vv.height = 600;
      vv.dispatchEvent(new Event('resize'));
    });
    await waitFor(() => {
      // 800 - 200 = 600px visible.
      expect(wrapper.style.maxHeight).toBe('600px');
    });
  });

  it('renders without throwing when visualViewport is undefined (older browsers)', async () => {
    delete (window as unknown as Partial<WritableShim>).visualViewport;

    const { container } = render(
      <CodeEditor
        code=""
        onChange={() => {}}
        onExecute={() => {}}
        output=""
        error=""
        isExecuting={false}
      />
    );

    expect(container.firstChild).toBeInTheDocument();
  });
});
