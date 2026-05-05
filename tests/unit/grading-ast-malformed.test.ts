// Omnibus task-002 — validateAst must not crash if the Python AST
// validator emits non-JSON output. The Python source is bundled into
// a single runPython call (ast.ts AST_VALIDATOR_SOURCE), and any of
// the following can break the json.dumps contract:
//   • a stray print() inserted during debugging,
//   • a Pyodide minor-version upgrade that changes stdout buffering,
//   • a Python-side exception that escapes the inner try/except.
//
// Without the guard the parse throws and crashes the grading engine.
// With the guard, validateAst returns [] (the same fallback used when
// the rule set is empty) and the engine treats the lesson as "no AST
// rules evaluated" — the kid still gets a runtime-rules grade.

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { validateAst } from '@lib/grading/ast';
import type { AstRules } from '@lib/grading/types';

interface FakePyodide {
  runPython: (src: string) => unknown;
  globals: { set: (k: string, v: unknown) => void };
}

function makeFakePyodide(runPythonReturn: unknown): FakePyodide {
  return {
    runPython: () => runPythonReturn,
    globals: { set: () => {} },
  };
}

const RULES: AstRules = {
  requiredFunctions: ['main'],
  requiredConstructs: [],
  forbiddenConstructs: [],
};

describe('validateAst malformed-JSON guard (omnibus task-002)', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('returns [] when the validator output is not valid JSON', async () => {
    // Simulates a stray print() in AST_VALIDATOR_SOURCE that breaks
    // json.dumps output ordering.
    const pyodide = makeFakePyodide('hello stray print\n[{"id":"main","passed":true}]');
    const result = await validateAst('def main(): pass', RULES, pyodide as never);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/non-JSON/);
  });

  it('returns [] when runPython returns a Python object that stringifies to non-JSON', async () => {
    // A Python exception object that escapes the inner try/except
    // would stringify into something like "<TypeError(...)>".
    const pyodide = makeFakePyodide({ toString: () => '<TypeError: bad ast>' });
    const result = await validateAst('def main(): pass', RULES, pyodide as never);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('still returns parsed rules when JSON is well-formed (regression guard)', async () => {
    const pyodide = makeFakePyodide(
      JSON.stringify([
        { id: 'main', passed: true, message: 'ok' },
        { id: 'helper', passed: false, message: 'missing' },
      ])
    );
    const result = await validateAst('def main(): pass', RULES, pyodide as never);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'main', passed: true });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns [] when the JSON is valid but the shape is wrong (schema guard)', async () => {
    // JSON-valid but RuleResult-invalid: `passed` as a string, missing
    // `message`, etc. Without schema validation this would flow into
    // the grading engine and produce silent incorrect verdicts.
    const pyodide = makeFakePyodide(JSON.stringify([{ id: 'main', passed: 'yes', message: 'ok' }]));
    const result = await validateAst('def main(): pass', RULES, pyodide as never);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
    expect(warnSpy.mock.calls[0][0]).toMatch(/schema validation/);
  });

  it('returns [] when the payload is a JSON-valid non-array', async () => {
    const pyodide = makeFakePyodide(JSON.stringify({ rules: [] }));
    const result = await validateAst('def main(): pass', RULES, pyodide as never);
    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });
});
