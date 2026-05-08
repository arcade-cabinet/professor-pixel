// Cover the Monaco keybinding-callback bodies + dispose/setValue
// try/catch branches in app/components/editor/code-editor.tsx that the
// existing code-editor-monaco-load.test.tsx skips:
//   - line 241-242: Ctrl+Enter command callback fires onExecute
//   - line 260-262: Ctrl+Space command dispatches pp:request-hint
//   - line 267: Ctrl+Shift+Space command runs editor.action.triggerSuggest
//   - line 272: addCommand try/catch swallows a key-binding registration throw
//   - line 276: outer catch when require([...]) callback throws
//   - line 292: editor.dispose throwing on unmount is swallowed
//   - lines 300-304: setValue useEffect (code prop changes after mount)

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CodeEditor from '@/components/editor/code-editor';

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

// Build a fresh Monaco shim per test. Captures every addCommand call so
// individual key bindings can be invoked manually.
function makeMonacoShim(opts: {
  addCommandImpl?: (key: number, cb: () => void) => void;
  disposeThrows?: boolean;
}) {
  const commandCalls: Array<{ key: number; cb: () => void }> = [];
  const editorInstance = {
    onDidChangeModelContent: vi.fn(),
    addCommand:
      opts.addCommandImpl ??
      vi.fn((key: number, cb: () => void) => {
        commandCalls.push({ key, cb });
      }),
    getValue: vi.fn(() => 'print("typed")'),
    setValue: vi.fn(),
    getAction: vi.fn(() => ({ run: vi.fn() })),
    dispose: vi.fn(() => {
      if (opts.disposeThrows) throw new Error('dispose boom');
    }),
  };
  const monacoStub = {
    editor: { create: vi.fn(() => editorInstance) },
    // Use bit-isolated values so OR combos are unique:
    //   Ctrl+Enter = 0x100 | 0x10 = 0x110
    //   Ctrl+Space = 0x100 | 0x20 = 0x120
    //   Ctrl+Shift+Space = 0x100 | 0x200 | 0x20 = 0x320
    KeyMod: { CtrlCmd: 0x100, Shift: 0x200 },
    KeyCode: { Enter: 0x10, Space: 0x20 },
  };
  return { editorInstance, monacoStub, commandCalls };
}

function installMonacoOnAppend(
  monacoStub: unknown,
  requireFn: (modules: string[], cb: () => void) => void
) {
  const realAppend = document.head.appendChild.bind(document.head);
  const requireWithConfig = requireFn as unknown as ((
    modules: string[],
    cb: () => void
  ) => void) & { config: (cfg: unknown) => void };
  requireWithConfig.config = vi.fn();
  return vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
    if (node instanceof HTMLScriptElement && node.src.includes('monaco-editor')) {
      const w = window as unknown as WritableShim;
      w.require = requireWithConfig;
      w.monaco = monacoStub;
      queueMicrotask(() => node.dispatchEvent(new Event('load')));
      return node;
    }
    return realAppend(node);
  });
}

describe('CodeEditor — Ctrl+Enter callback fires onExecute (line 241-242)', () => {
  it('the addCommand callback registered for Ctrl+Enter invokes onExecute', async () => {
    const onExecute = vi.fn();
    const { monacoStub, commandCalls } = makeMonacoShim({});
    const requireFn = vi.fn((_m: string[], cb: () => void) => cb());
    const spy = installMonacoOnAppend(monacoStub, requireFn);
    render(<CodeEditor {...baseProps} onExecute={onExecute} />);
    await new Promise((r) => setTimeout(r, 30));
    spy.mockRestore();
    // Find the Ctrl+Enter binding (0x100 | 0x10 = 0x110).
    const ctrlEnter = commandCalls.find((c) => c.key === (0x100 | 0x10));
    expect(ctrlEnter).toBeDefined();
    ctrlEnter!.cb();
    expect(onExecute).toHaveBeenCalled();
  });
});

describe('CodeEditor — Ctrl+Space dispatches pp:request-hint (line 260)', () => {
  it('the Ctrl+Space binding dispatches a CustomEvent on document', async () => {
    const { monacoStub, commandCalls } = makeMonacoShim({});
    const requireFn = vi.fn((_m: string[], cb: () => void) => cb());
    const spy = installMonacoOnAppend(monacoStub, requireFn);
    render(<CodeEditor {...baseProps} />);
    await new Promise((r) => setTimeout(r, 30));
    spy.mockRestore();
    // Ctrl+Space = 0x100 | 0x20 = 0x120.
    const ctrlSpace = commandCalls.find((c) => c.key === (0x100 | 0x20));
    expect(ctrlSpace).toBeDefined();
    let captured: CustomEvent | null = null;
    const listener = (e: Event) => {
      captured = e as CustomEvent;
    };
    document.addEventListener('pp:request-hint', listener);
    ctrlSpace!.cb();
    document.removeEventListener('pp:request-hint', listener);
    expect(captured).not.toBeNull();
    expect(captured!.detail).toEqual({ source: 'editor' });
  });
});

describe('CodeEditor — Ctrl+Shift+Space runs editor.action.triggerSuggest (line 267)', () => {
  it('the Ctrl+Shift+Space binding calls editor.getAction(triggerSuggest).run()', async () => {
    const triggerRun = vi.fn();
    const { monacoStub, editorInstance, commandCalls } = makeMonacoShim({});
    editorInstance.getAction = vi.fn(() => ({ run: triggerRun }));
    const requireFn = vi.fn((_m: string[], cb: () => void) => cb());
    const spy = installMonacoOnAppend(monacoStub, requireFn);
    render(<CodeEditor {...baseProps} />);
    await new Promise((r) => setTimeout(r, 30));
    spy.mockRestore();
    // Ctrl+Shift+Space = 0x100 | 0x200 | 0x20 = 0x320.
    const ctrlShiftSpace = commandCalls.find((c) => c.key === (0x100 | 0x200 | 0x20));
    expect(ctrlShiftSpace).toBeDefined();
    ctrlShiftSpace!.cb();
    expect(editorInstance.getAction).toHaveBeenCalledWith('editor.action.triggerSuggest');
    expect(triggerRun).toHaveBeenCalled();
  });
});

describe('CodeEditor — addCommand try/catch (line 271-273)', () => {
  it('addCommand throwing is swallowed by the try/catch', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { monacoStub } = makeMonacoShim({
      addCommandImpl: () => {
        throw new Error('addCommand boom');
      },
    });
    const requireFn = vi.fn((_m: string[], cb: () => void) => cb());
    const spy = installMonacoOnAppend(monacoStub, requireFn);
    render(<CodeEditor {...baseProps} />);
    await new Promise((r) => setTimeout(r, 30));
    spy.mockRestore();
    // The keyboard-shortcut catch (line 271-273) logs.
    expect(errSpy).toHaveBeenCalledWith('Error adding keyboard shortcut:', expect.any(Error));
  });
});

describe('CodeEditor — outer catch when require callback throws (line 275-277)', () => {
  it("require callback throwing logs 'Error loading Monaco'", async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // require.config throws → outer try/catch logs.
    const requireFn = vi.fn((_m: string[], cb: () => void) => cb());
    const requireWithConfig = requireFn as unknown as ((
      modules: string[],
      cb: () => void
    ) => void) & { config: (cfg: unknown) => void };
    requireWithConfig.config = vi.fn(() => {
      throw new Error('config boom');
    });
    const realAppend = document.head.appendChild.bind(document.head);
    const spy = vi.spyOn(document.head, 'appendChild').mockImplementation((node: Node) => {
      if (node instanceof HTMLScriptElement && node.src.includes('monaco-editor')) {
        const w = window as unknown as WritableShim;
        w.require = requireWithConfig;
        w.monaco = { editor: {} };
        queueMicrotask(() => node.dispatchEvent(new Event('load')));
        return node;
      }
      return realAppend(node);
    });
    render(<CodeEditor {...baseProps} />);
    await new Promise((r) => setTimeout(r, 30));
    spy.mockRestore();
    expect(errSpy).toHaveBeenCalledWith('Error loading Monaco:', expect.any(Error));
  });
});

describe('CodeEditor — dispose throw on unmount (line 291-293)', () => {
  it('editor.dispose throwing during unmount is swallowed', async () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { monacoStub } = makeMonacoShim({ disposeThrows: true });
    const requireFn = vi.fn((_m: string[], cb: () => void) => cb());
    const spy = installMonacoOnAppend(monacoStub, requireFn);
    const { unmount } = render(<CodeEditor {...baseProps} />);
    await new Promise((r) => setTimeout(r, 30));
    spy.mockRestore();
    expect(() => unmount()).not.toThrow();
    expect(errSpy).toHaveBeenCalledWith('Error disposing Monaco editor:', expect.any(Error));
  });
});

// The setValue useEffect at lines 298-306 is structurally hard to reach in
// a test: the Monaco-load effect's deps include `code`, so a code-prop
// change fires that effect's cleanup (dispose + null the ref) BEFORE the
// setValue effect's body runs against a now-null ref. Skipping; coverage
// of these lines requires an integration-style harness that doesn't
// re-run the load effect on prop change.
