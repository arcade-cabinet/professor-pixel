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
beforeEach(() => {
  // biome-ignore lint/suspicious/noExplicitAny: test-only window shim
  (window as any).require = undefined;
  // biome-ignore lint/suspicious/noExplicitAny: test-only window shim
  (window as any).monaco = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  // biome-ignore lint/suspicious/noExplicitAny: test cleanup
  delete (window as any).visualViewport;
});

describe('CodeEditor — visualViewport keyboard inset (P4.6)', () => {
  it('applies paddingBottom equal to keyboard height when soft keyboard opens', async () => {
    // Window is 800px tall; viewport starts equal (no keyboard).
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
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
    // No keyboard yet — no inline padding should be applied.
    expect(wrapper.style.paddingBottom).toBe('');

    // Simulate soft keyboard opening: viewport shrinks by 320px.
    act(() => {
      vv.height = 480;
      vv.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(wrapper.style.paddingBottom).toBe('320px');
    });

    // Keyboard closes — padding releases.
    act(() => {
      vv.height = 800;
      vv.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      expect(wrapper.style.paddingBottom).toBe('');
    });
  });

  it('clamps a transient negative inset to zero (no upward layout shift)', async () => {
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    // Viewport reports MORE than window height — a quirk seen on some
    // Android browsers during orientation change. Should not produce a
    // negative padding (which would lift the layout into the chrome).
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
    // Negative inset → clamp to 0 → no inline padding applied.
    await waitFor(() => {
      expect(wrapper.style.paddingBottom).toBe('');
    });

    // Sanity: still works when a real positive inset arrives.
    act(() => {
      vv.height = 600;
      vv.dispatchEvent(new Event('resize'));
    });
    await waitFor(() => {
      expect(wrapper.style.paddingBottom).toBe('200px');
    });
  });

  it('renders without throwing when visualViewport is undefined (older browsers)', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: test-only override
    delete (window as any).visualViewport;

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
