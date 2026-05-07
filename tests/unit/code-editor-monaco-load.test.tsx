// Cover the Monaco load + create paths in app/components/editor/code-editor.tsx
// (lines 174-294 — the script.onload handler and the AMD shim require()
// callback). Driven by:
//   - intercepting document.head.appendChild on the Monaco loader script,
//     extracting it, and dispatching `load` after window.monaco/require are
//     stubbed in.
//   - the require() shim resolves immediately with the installed monaco
//     stub, so editor.create + addCommand + onDidChangeModelContent all
//     fire under jsdom.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeEditor from '@/components/editor/code-editor';

// Mock the monaco-theme registration so the test doesn't pull in the
// theme-validation surface — registerPpDarkTheme just receives our fake
// monaco and returns a name; we make it return a stable 'pp-dark'.
vi.mock('@lib/python/monaco-theme', () => ({
  registerPpDarkTheme: vi.fn(() => 'pp-dark'),
}));

type WritableShim = Record<'require' | 'monaco', unknown>;

const baseProps = {
  code: 'print("hello")',
  onChange: vi.fn(),
  onExecute: vi.fn(),
  output: '',
  error: '',
  isExecuting: false,
};

beforeEach(() => {
  const w = window as unknown as WritableShim;
  w.require = undefined;
  w.monaco = undefined;
});

afterEach(() => {
  vi.restoreAllMocks();
  const w = window as unknown as Partial<WritableShim>;
  delete w.require;
  delete w.monaco;
});

describe('CodeEditor — Monaco script.onload happy path', () => {
  it('drives editor.create + addCommand + onDidChangeModelContent through to fire', async () => {
    // Build a minimal monaco shim. The component reads:
    //   monaco.editor.create(el, options) → returns an editor instance
    //     with .onDidChangeModelContent(cb), .addCommand(keychord, cb),
    //     .getValue(), .getAction(id).run(), .dispose()
    //   monaco.KeyMod.CtrlCmd, KeyMod.Shift
    //   monaco.KeyCode.Enter, KeyCode.Space
    const editorInstance = {
      onDidChangeModelContent: vi.fn(),
      addCommand: vi.fn(),
      getValue: vi.fn(() => 'print("typed")'),
      getAction: vi.fn(() => ({ run: vi.fn() })),
      dispose: vi.fn(),
      setValue: vi.fn(),
    };
    const monacoStub = {
      editor: { create: vi.fn(() => editorInstance) },
      KeyMod: { CtrlCmd: 1 << 0, Shift: 1 << 1 },
      KeyCode: { Enter: 100, Space: 101 },
    };
    const requireFn = vi.fn(
      (modules: string[], cb: () => void) => {
        // First call may be require.config; only the array+cb call drives the
        // Monaco-create path. The component invokes require([...], cb) once
        // it's done with require.config(...).
        cb();
      }
    ) as unknown as ((modules: string[], cb: () => void) => void) & {
      config: (cfg: unknown) => void;
    };
    requireFn.config = vi.fn();

    // Intercept the loader <script> tag the component appends so we can
    // (a) prevent jsdom from making a real network request and
    // (b) install the Monaco shim before firing the load event.
    const realAppend = document.head.appendChild.bind(document.head);
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node: Node) => {
        if (node instanceof HTMLScriptElement && node.src.includes('monaco-editor')) {
          // Stage the global Monaco shim before flipping load — the
          // script.onload handler reads window.require + window.monaco
          // synchronously inside its require() callback chain.
          const w = window as unknown as WritableShim;
          w.require = requireFn;
          w.monaco = monacoStub;
          // Dispatch load on next microtask so the component's
          // useEffect cleanup ordering is respected.
          queueMicrotask(() => {
            node.dispatchEvent(new Event('load'));
          });
          return node;
        }
        return realAppend(node);
      });

    render(<CodeEditor {...baseProps} />);

    // Wait for the microtask + the require() callback chain to fire.
    await new Promise((resolve) => setTimeout(resolve, 30));

    // editor.create was called once with the editor container element.
    expect(monacoStub.editor.create).toHaveBeenCalled();
    // The onDidChangeModelContent listener was registered.
    expect(editorInstance.onDidChangeModelContent).toHaveBeenCalled();
    // addCommand was invoked at least once for Ctrl+Enter (run code).
    expect(editorInstance.addCommand).toHaveBeenCalled();
    // Drive the change handler so the onChange forwarding is exercised.
    const changeCb = editorInstance.onDidChangeModelContent.mock.calls[0]?.[0] as
      | (() => void)
      | undefined;
    if (changeCb) {
      changeCb();
      expect(baseProps.onChange).toHaveBeenCalledWith('print("typed")');
    }

    appendSpy.mockRestore();
  });

  it('logs an error when registerPpDarkTheme throws (editor.create create-throw branch)', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const requireFn = vi.fn((_modules: string[], cb: () => void) => cb()) as unknown as ((
      modules: string[],
      cb: () => void
    ) => void) & { config: (cfg: unknown) => void };
    requireFn.config = vi.fn();
    const monacoStub = {
      editor: {
        create: vi.fn(() => {
          throw new Error('jsdom — no canvas getContext for Monaco');
        }),
      },
      KeyMod: { CtrlCmd: 1, Shift: 2 },
      KeyCode: { Enter: 100, Space: 101 },
    };
    const realAppend = document.head.appendChild.bind(document.head);
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node: Node) => {
        if (node instanceof HTMLScriptElement && node.src.includes('monaco-editor')) {
          const w = window as unknown as WritableShim;
          w.require = requireFn;
          w.monaco = monacoStub;
          queueMicrotask(() => node.dispatchEvent(new Event('load')));
          return node;
        }
        return realAppend(node);
      });

    render(<CodeEditor {...baseProps} />);
    await new Promise((resolve) => setTimeout(resolve, 30));

    // The catch block at line 219-222 logs the error.
    expect(errorSpy).toHaveBeenCalled();
    appendSpy.mockRestore();
  });

  it('script.onerror path is exercised when the loader fails to fetch', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const realAppend = document.head.appendChild.bind(document.head);
    const appendSpy = vi
      .spyOn(document.head, 'appendChild')
      .mockImplementation((node: Node) => {
        if (node instanceof HTMLScriptElement && node.src.includes('monaco-editor')) {
          // Fire onerror instead of onload — Monaco never installs.
          queueMicrotask(() => node.dispatchEvent(new Event('error')));
          return node;
        }
        return realAppend(node);
      });

    render(<CodeEditor {...baseProps} />);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect(errorSpy).toHaveBeenCalledWith('Failed to load Monaco Editor script');
    appendSpy.mockRestore();
  });

  it('skips re-loading when window.monaco is already populated', async () => {
    const w = window as unknown as WritableShim;
    w.monaco = { editor: {} };
    // No appendChild interception — if the component tried to load Monaco
    // again we'd see a real <script> insertion attempt. We just verify the
    // component renders without throwing under the early-return path.
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<CodeEditor {...baseProps} />)).not.toThrow();
    // No onerror was fired (the component never tried to load).
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

// Sanity: the existing reset-confirm + visual-viewport tests guard those
// branches; we don't duplicate them here. Just confirm import wires up.
describe('CodeEditor — re-export sanity', () => {
  it('default export is a React component', () => {
    expect(typeof CodeEditor).toBe('function');
  });
});

void fireEvent; // imported for parallel-test consistency; not used directly
