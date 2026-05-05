---
title: Pillar 4 — Grading
updated: 2026-05-04
status: current
domain: technical
---

# Pillar 4 — Grading

> Two complementary checks per test: the AST validator runs structural rules inside Pyodide; the runtime validator inspects the captured stdout and post-execution Python globals.
> Returns per-rule pass/fail with a `score` (0..1) so the UI can show partial credit.

## Modes

| Mode | Behavior |
|------|----------|
| `output` (default if `mode` omitted) | Exact match against `expectedOutput` (whitespace-normalized). Counts as one rule for scoring. |
| `rules` | Run `astRules` and `runtimeRules`. One `RuleResult` per rule contributes to the score. |

A lesson can mix both styles across its `tests[]`.

## RuleResult

Every rule produces one of these:

```ts
{ id: 'ast.has_function:greet', passed: true, message: 'Defined function greet()' }
```

The `id` is stable (`<pillar>.<kind>:<target>`). The `message` is the friendly explanation that gets surfaced to the student. `partial.ast` and `partial.runtime` on the GradeResult carry these arrays for the UI.

## AST rules

Driven by `LessonAstRules`:

```ts
{
  requiredFunctions?: string[];
  requiredConstructs?: RequiredConstruct[];
  forbiddenConstructs?: ForbiddenConstruct[];
}
```

The validator (`src/grading/ast.ts`) runs Python's `ast.parse` once and walks the tree once per rule.

### Rule kinds

| Kind | Spec | What it checks |
|------|------|----------------|
| `function_call` | `{name?, minCount?, maxCount?}` | Calls to a function (or any function if `name` omitted). Counts both `name(...)` and `obj.name(...)`. |
| `string_literal` | `{minCount?}` | Number of string-literal expressions in the AST. |
| `loop` | `{minCount?}` | `for` or `while` statement count. |
| `if_statement` | `{minCount?}` | `if` statement count. |
| `variable_assignment` | `{name?, minCount?}` | Assignments. If `name`, only counts assignments whose left-hand-side targets that name. |
| `import` | `{minCount?}` | Any `import` or `from … import …` statement. |
| `f_string` | `{minCount?}` | f-string (`JoinedStr`) count. |
| `imports_module` | `{name, from?}` | `import name` or `from name import …` (or specifically `from X import name` when `from` set). |
| `defines_class` | `{name?, baseClass?, minMethods?}` | `class Name(Base):` with optional method-count floor. |
| `calls_method` | `{on, method, minCount?}` | Calls of the form `receiver.method(...)`. |
| `parameter_count` | `{function, min?, max?}` | Number of positional parameters in `def function(...)`. |
| `nesting_depth` | `{max}` | Style: cap on how deeply if/for/while/with/def nest. |

### Anti-rules (forbiddenConstructs)

Use to block specific patterns:

```json
"forbiddenConstructs": [
  { "type": "function_call", "name": "eval" }
]
```

The rule passes iff the construct is **not** present. Useful for "must not use eval", "must not import os", etc. Currently supports `function_call`, `import`, `loop`, `imports_module`.

## Runtime rules

Driven by `LessonRuntimeRules`:

| Field | Behavior |
|-------|----------|
| `outputContains: string[]` | Each needle must appear in stdout |
| `outputMatches: string` | Stdout must match the regex |
| `variableExists: string[]` | Each name must be defined in the post-execution Python globals (worker-collected snapshot — see below) |
| `functionCalled: string[]` | Each name must have been invoked at runtime (worker-side `sys.settrace` counter, not a stdout heuristic) |
| `acceptsUserInput: boolean` | The user code must have called `input()` at least once (worker-side counter, not "did the test provide input") |
| `outputIncludesInput: boolean` | Stdout must echo the provided input |

Runtime rules see only the post-execution state. Caps (timeoutMs, maxStdout — see Pillar 2) ensure the captured state is bounded before the rules run.

### Worker-collected runtime metadata

Three rules need to peek inside the worker's Pyodide rather than the main-thread Pyodide:

- **`variableExists`** → the engine collects every name across the step's tests into a single `inspectGlobals: string[]` arg on `runSnippet`. The worker reads each from post-execution globals and returns `RunResult.globals: Record<string, unknown>` — *omitting* names that were never defined. The validator's existence check is `name in globals`, which keeps falsy Python values (`0`, `''`, `False`) classified as defined while still failing on absent names. Without this plumbing the rule queries main-thread Pyodide, which never executed the user's code on worker-routed lessons (the original bug fixed in the grader follow-ups pillar).
- **`functionCalled`** → the engine collects every name across the step's tests into `trackFunctions: string[]`; the worker installs a `sys.settrace` callback that increments per-name counters on every Python frame entry. Returned as `RunResult.functionCalls: Record<string, number>`. A function defined but never called returns `0` and fails the rule.
- **`acceptsUserInput`** → the worker monkey-patches `builtins.input` and counts each call. Returned as `RunResult.inputCalls: number`.

These three live one level above the validator: they are runtime *metadata*, gathered during execution rather than reconstructed from stdout. The validator (`src/grading/runtime.ts`) just reads pre-collected counters and snapshots — no main-thread Pyodide reach-around.

## Scoring

```ts
score = passed_rules / total_rules
```

across **all** tests in the step. `total_rules` includes:
- one entry per rule (AST + runtime)
- one entry per non-rule (exact-output) test

Examples:
- 3 rules, all pass → `score = 1.0`, `passed = true`
- 5 rules, 4 pass → `score = 0.8`, `passed = false`, feedback: *"You're 80% there. Address the items below: …"*
- Execution error → `score = 0`, traceback in feedback
- Timeout → `score = 0`, *"Your code took too long (more than Nms)..."*

## Resource caps

Per-test, on the `TestSpec`:

```json
"timeoutMs": 3000,
"maxStdout": 65536
```

The engine collects the **minimum** across a step's rule-mode tests and passes it to `runner.runSnippet`. If the runner throws `PythonTimeoutError`, the engine returns a friendly timeout result; the worker is recycled before the next step's run.

## Common authoring mistakes

| Mistake | What happens |
|---------|--------------|
| `requiredConstructs: [{type: "function_call", name: "print"}]` without `minCount` | Defaults to `minCount: 1` — works as expected. |
| `function_call` with `name: "method"` to catch `obj.method()` | Yes — the rule matches both `Name(...)` and `Attribute(...)` calls by attribute name. |
| `nesting_depth` counting too aggressively | The rule counts `if/for/while/with/def` (sync + async). A 2-step solution typically has depth 2 (function body + loop). Setting `max: 3` is safe. |
| Anti-rule for "no print() at all" without typing `name` | Don't omit `name` on a `function_call` anti-rule — it would block every function call in the file. |

## See also

- `src/grading/ast.ts` — Python validator source (the canonical rule list)
- `src/grading/runtime.ts` — runtime validator source
- `src/grading/engine.ts` — orchestration + scoring
- `src/types/schema.ts` — `LessonAstRules`, `LessonRuntimeRules`, `LessonTestSpec` schemas
- [Pillar 2 — Runtime](02-runtime.md) — where the worker + caps come from
- [Pillar 3 — Lesson engine](03-lesson-engine.md) — where `tests[]` lives in lessons
