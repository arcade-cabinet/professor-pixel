import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LessonSchema, type Lesson } from '@lib/types/schema';

function loadShippedLessons(): Lesson[] {
  const path = resolve(__dirname, '..', '..', 'public/api/static/lessons.json');
  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  return LessonSchema.array().parse(raw);
}

describe('shipped lessons.json', () => {
  const lessons = loadShippedLessons();

  it('contains at least 6 lessons', () => {
    expect(lessons.length).toBeGreaterThanOrEqual(6);
  });

  it('every lesson has a unique id', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every prerequisite resolves to a real lesson id', () => {
    const ids = new Set(lessons.map((l) => l.id));
    for (const lesson of lessons) {
      for (const prereq of lesson.prerequisites ?? []) {
        expect(ids.has(prereq), `${lesson.id} → ${prereq}`).toBe(true);
      }
    }
  });

  it('every step has a non-empty solution', () => {
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        expect(step.solution.trim().length, `${lesson.id}/${step.id}`).toBeGreaterThan(0);
      }
    }
  });

  it('every step has at least 3 hints', () => {
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        expect(step.hints.length, `${lesson.id}/${step.id} hints`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('every step has at least one test', () => {
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        expect((step.tests ?? []).length, `${lesson.id}/${step.id} tests`).toBeGreaterThan(0);
      }
    }
  });

  it('lessons span multiple AST rule kinds', () => {
    const seenKinds = new Set<string>();
    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        for (const test of step.tests ?? []) {
          for (const rc of test.astRules?.requiredConstructs ?? []) {
            seenKinds.add(rc.type);
          }
        }
      }
    }
    // Curriculum should exercise variety: print/string + control flow + functions + pygame
    expect(seenKinds.has('function_call')).toBe(true);
    expect(seenKinds.has('if_statement')).toBe(true);
    expect(seenKinds.has('loop')).toBe(true);
    expect(seenKinds.has('imports_module')).toBe(true);
    expect(seenKinds.has('parameter_count')).toBe(true);
    expect(seenKinds.has('calls_method')).toBe(true);
  });

  it('order values are strictly increasing in catalog sequence', () => {
    // Don't sort — the test's job is to catch out-of-sequence entries in the
    // file as written. Sorting first hides exactly the bug we're guarding against.
    const orders = lessons.map((l) => l.order);
    for (let i = 1; i < orders.length; i++) {
      expect(orders[i]).toBeGreaterThan(orders[i - 1]);
    }
  });

  // P1.6 from the 2026-05-08 functional truth audit. The grader runs each
  // step's solution through ast.parse + runtime rules; we don't have Pyodide
  // in unit-suite reach, so this test does a textual surface-marker check
  // that catches the most-common authoring drift: "solution edits drop a
  // required AST construct (a print() call, a for-loop, a class definition)
  // and nobody re-verifies the bundled solution still satisfies the rule."
  //
  // For each step's tests[] in 'rules' mode, we walk every requiredConstruct
  // and runtimeRule, then assert the solution string contains the surface
  // marker the rule expects. False positives are possible (a rule looks for
  // `def greet():` but the solution defines `greet` via a lambda — the AST
  // grader would still pass; this surface check would flag it). False
  // negatives are bounded — we only check rules where the surface marker is
  // unambiguous. The full belt-and-braces is the integration suite running
  // the solutions through real Pyodide; this is the cheap unit-time guard.
  it('every step solution contains the surface markers its rules require', () => {
    // Construct kinds we've deliberately decided NOT to surface-check.
    // Their textual markers are too noisy or ambiguous; the AST grader at
    // runtime is authoritative. Listed explicitly so the `default` arm
    // below fails fast on any newly-introduced kind we haven't triaged.
    const surfaceUncheckable = new Set([
      'string_literal',
      'f_string',
      'parameter_count',
      'nesting_depth',
    ]);

    // Escape user-provided strings before embedding in a RegExp source.
    // Without this, a rule name containing regex metacharacters (`$`, `(`,
    // `.`, etc.) would change the match semantics or throw.
    const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Python identifier left-boundary: callable/identifier must NOT be preceded
    // by another identifier char. Plain `\b` would match `foo(` inside `xfoo(`
    // — see CodeRabbit feedback on PR #360. Node 18+ supports lookbehinds.
    const identBoundary = (name: string) => `(?<![A-Za-z0-9_])${escapeRegExp(name)}`;

    for (const lesson of lessons) {
      for (const step of lesson.content.steps) {
        for (const test of step.tests ?? []) {
          if (test.mode !== 'rules') continue;
          for (const rc of test.astRules?.requiredConstructs ?? []) {
            const sol = step.solution;
            const where = `${lesson.id}/${step.id}`;
            switch (rc.type) {
              case 'function_call':
                if (rc.name) {
                  expect(
                    new RegExp(`${identBoundary(rc.name)}\\s*\\(`).test(sol),
                    `${where} requires call to ${rc.name}() but solution has no boundary-aware match for '${rc.name}('`
                  ).toBe(true);
                }
                break;
              case 'imports_module':
                if (rc.name) {
                  expect(
                    new RegExp(`\\b(?:import|from)\\s+${escapeRegExp(rc.name)}\\b`).test(sol),
                    `${where} requires import of ${rc.name} but solution has no boundary-aware 'import ${rc.name}' or 'from ${rc.name}'`
                  ).toBe(true);
                }
                break;
              case 'loop':
                expect(
                  /\b(for|while)\b/.test(sol),
                  `${where} requires a loop but solution has no for/while`
                ).toBe(true);
                break;
              case 'if_statement':
                expect(
                  /\bif\b/.test(sol),
                  `${where} requires an if but solution has no 'if '`
                ).toBe(true);
                break;
              case 'defines_class':
                if (rc.name) {
                  expect(
                    new RegExp(`\\bclass\\s+${escapeRegExp(rc.name)}\\b`).test(sol),
                    `${where} requires class ${rc.name} but solution has no boundary-aware 'class ${rc.name}'`
                  ).toBe(true);
                } else {
                  expect(/\bclass\s+\w+/.test(sol), `${where} requires a class def`).toBe(true);
                }
                break;
              case 'calls_method':
                if (rc.method) {
                  expect(
                    new RegExp(`\\.${escapeRegExp(rc.method)}\\s*\\(`).test(sol),
                    `${where} requires .${rc.method}() but solution has no '.${rc.method}('`
                  ).toBe(true);
                }
                break;
              case 'variable_assignment':
                if (rc.name) {
                  expect(
                    new RegExp(`${identBoundary(rc.name)}\\b\\s*=(?!=)`).test(sol),
                    `${where} requires assignment to ${rc.name} (boundary-aware, not '==')`
                  ).toBe(true);
                }
                break;
              default: {
                // Fail loudly when a new construct kind is added to the
                // schema and this audit hasn't been taught how to handle it.
                // Either add a case above or add the kind to surfaceUncheckable.
                const kind = (rc as { type: string }).type;
                expect(
                  surfaceUncheckable.has(kind),
                  `${where}: requiredConstructs kind '${kind}' is not on the surface-check switch AND not on the explicit surfaceUncheckable list. Triage in tests/unit/lessons-content.test.ts.`
                ).toBe(true);
              }
            }
          }
          // Note: we deliberately do NOT cross-check `runtimeRules.outputContains`
          // against the solution text. Computed output (e.g. width*height → 15)
          // satisfies the runtime rule at execution time even when the literal
          // never appears in the source. That belt-and-braces check is the
          // integration-suite job, when we have real Pyodide on hand.
        }
      }
    }
  });
});
