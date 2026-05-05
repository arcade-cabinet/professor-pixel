import type { AstRules, RuleResult } from '@lib/grading/types';

/**
 * AST-based grading. Runs the full rule set in a single Pyodide call —
 * one parse, one walk per rule. Returns per-rule pass/fail so the engine
 * can compute partial credit (T5.2).
 *
 * Supports all rule kinds documented in docs/pillars/04-grading.md:
 *   - has_function, has_loop, has_conditional, uses_variable
 *   - function_call(name, minCount), string_literal(minCount)
 *   - imports_module(name, from?)
 *   - defines_class(name, baseClass?, minMethods?)
 *   - calls_method(on, method, minCount?)
 *   - parameter_count(function, min?, max?)
 *   - nesting_depth(max)
 *   - forbiddenConstructs[]: anti-rule wrapper, fail if matched
 */
export async function validateAst(
  code: string,
  rules: AstRules | undefined,
  pyodide: PyodideInstance | null
): Promise<RuleResult[]> {
  if (!pyodide || !rules) return [];
  if (
    !rules.requiredFunctions?.length &&
    !rules.requiredConstructs?.length &&
    !rules.forbiddenConstructs?.length
  ) {
    return [];
  }

  pyodide.globals.set('js_code', code);
  pyodide.globals.set('js_rules', rules);

  const raw = pyodide.runPython(AST_VALIDATOR_SOURCE);
  const text = typeof raw === 'string' ? raw : String(raw);
  // Defensive parse: the Python validator emits json.dumps(results),
  // but a stray print() inserted into AST_VALIDATOR_SOURCE during
  // debugging, a Pyodide upgrade quirk, or a Python-side exception
  // that escapes the inner try/except can produce non-JSON output.
  // Without this guard the throw escapes validateAst and crashes the
  // grading layer — kid sees a generic error, dev gets no signal that
  // the validator template is the actual culprit. Empty rule-results
  // is the same fallback the early-return branches use, so the
  // grading engine is already shaped to handle it.
  try {
    return JSON.parse(text) as RuleResult[];
  } catch (parseError) {
    // Don't dump the raw Python output verbatim — a stray
    // `print(user_code)` in the validator could echo learner-authored
    // content into the console (and any log shipper). Surface enough
    // for triage: the parse error message, output length, and a tiny
    // sanitized prefix (control chars + non-ASCII stripped) capped at
    // 80 chars.
    console.warn(
      '[grading/ast] AST validator returned non-JSON output; treating as no rules evaluated.',
      {
        outputLength: text.length,
        prefix: text.replace(/[^\x20-\x7e]/g, '').slice(0, 80),
        parseError,
      }
    );
    return [];
  }
}

// The Python validator. Kept as a single string so it ships in one Pyodide
// runPython call. Each rule appends to results[] with {id, passed, message}.
const AST_VALIDATOR_SOURCE = `
import ast, json

code = js_code
rules = js_rules.to_py()
results = []

def add(rule_id, passed, message):
    results.append({"id": rule_id, "passed": bool(passed), "message": message})

try:
    tree = ast.parse(code)
except SyntaxError as exc:
    add("ast.parse", False, f"Syntax error on line {exc.lineno}: {exc.msg}")
else:
    nodes = list(ast.walk(tree))

    def has_function(name):
        return any(isinstance(n, ast.FunctionDef) and n.name == name for n in nodes)

    def function_calls(name=None):
        out = []
        for n in nodes:
            if isinstance(n, ast.Call):
                fn = n.func
                if isinstance(fn, ast.Name) and (name is None or fn.id == name):
                    out.append(n)
                elif isinstance(fn, ast.Attribute) and (name is None or fn.attr == name):
                    out.append(n)
        return out

    def _expr_to_dotted(node):
        # "obj.attr1.attr2" → "obj.attr1.attr2"; "name" → "name"; anything else → None.
        if isinstance(node, ast.Name):
            return node.id
        if isinstance(node, ast.Attribute):
            inner = _expr_to_dotted(node.value)
            return f"{inner}.{node.attr}" if inner else None
        return None

    def method_calls(receiver, method):
        out = []
        for n in nodes:
            if isinstance(n, ast.Call) and isinstance(n.func, ast.Attribute):
                if n.func.attr != method:
                    continue
                base_path = _expr_to_dotted(n.func.value)
                if base_path == receiver:
                    out.append(n)
        return out

    def imports():
        out = []
        for n in nodes:
            if isinstance(n, ast.Import):
                for alias in n.names:
                    out.append(("import", alias.name, None))
            elif isinstance(n, ast.ImportFrom):
                for alias in n.names:
                    out.append(("from", n.module or "", alias.name))
        return out

    def class_defs():
        return [n for n in nodes if isinstance(n, ast.ClassDef)]

    def max_nesting_depth():
        # Compute the deepest nesting of If/For/While/With/FunctionDef in the tree.
        def depth(node, current):
            best = current
            kid_extra = 1 if isinstance(node, (ast.If, ast.For, ast.While, ast.With, ast.FunctionDef, ast.AsyncFunctionDef, ast.AsyncFor, ast.AsyncWith)) else 0
            for child in ast.iter_child_nodes(node):
                best = max(best, depth(child, current + kid_extra))
            return best
        return depth(tree, 0)

    # --- requiredFunctions ---
    for name in rules.get("requiredFunctions") or []:
        ok = has_function(name)
        add(f"ast.has_function:{name}", ok,
            f"Defined function {name}()" if ok else f"Missing required function: {name}()")

    # --- requiredConstructs ---
    for spec in rules.get("requiredConstructs") or []:
        kind = spec.get("type")
        name = spec.get("name")
        min_count = spec.get("minCount") or 1
        max_count = spec.get("maxCount")

        if kind == "function_call":
            count = len(function_calls(name))
            ok = count >= min_count and (max_count is None or count <= max_count)
            label = f"call to {name}()" if name else "function call"
            add(f"ast.function_call:{name or '*'}", ok,
                f"Used {label} {count} time(s)" if ok else
                f"Need at least {min_count} {label}; found {count}")

        elif kind == "string_literal":
            count = sum(1 for n in nodes if isinstance(n, ast.Constant) and isinstance(n.value, str))
            ok = count >= min_count
            add("ast.string_literal", ok,
                f"Used {count} string literal(s)" if ok else
                f"Need at least {min_count} string literal(s); found {count}")

        elif kind == "loop":
            count = sum(1 for n in nodes if isinstance(n, (ast.For, ast.While)))
            ok = count >= min_count
            add("ast.loop", ok,
                "Used a loop" if ok else "Need a for or while loop")

        elif kind == "if_statement":
            count = sum(1 for n in nodes if isinstance(n, ast.If))
            ok = count >= min_count
            add("ast.if_statement", ok,
                "Used a conditional" if ok else "Need an if statement")

        elif kind == "variable_assignment":
            count = sum(1 for n in nodes if isinstance(n, ast.Assign))
            ok = count >= min_count
            label = f"assignment to {name}" if name else "variable assignment"
            if name:
                count = sum(1 for n in nodes if isinstance(n, ast.Assign) and any(
                    isinstance(t, ast.Name) and t.id == name for t in n.targets))
                ok = count >= min_count
            add(f"ast.variable_assignment:{name or '*'}", ok,
                f"Used {label} {count} time(s)" if ok else f"Need at least {min_count} {label}")

        elif kind == "import":
            ok = len(imports()) >= min_count
            add("ast.import", ok,
                "Imported a module" if ok else "Need an import statement")

        elif kind == "f_string":
            count = sum(1 for n in nodes if isinstance(n, ast.JoinedStr))
            ok = count >= min_count
            add("ast.f_string", ok,
                f"Used {count} f-string(s)" if ok else f"Need at least {min_count} f-string(s)")

        elif kind == "imports_module":
            target = name or spec.get("module")
            from_clause = spec.get("from")
            ok = False
            for kind_imp, mod, alias in imports():
                if kind_imp == "import" and mod == target and from_clause is None:
                    ok = True
                elif kind_imp == "from" and mod == target and (from_clause is None or alias == from_clause):
                    ok = True
            add(f"ast.imports_module:{target}",
                ok,
                f"Imported {target}" if ok else f"Need to import {target}")

        elif kind == "defines_class":
            target = name
            base = spec.get("baseClass")
            min_methods = spec.get("minMethods") or 0
            classes = class_defs()
            match = next((c for c in classes if c.name == target), None) if target else (classes[0] if classes else None)
            ok = match is not None
            if ok and base:
                ok = any(
                    (isinstance(b, ast.Name) and b.id == base) or
                    (isinstance(b, ast.Attribute) and b.attr == base)
                    for b in match.bases
                )
            if ok and min_methods:
                method_count = sum(1 for m in match.body if isinstance(m, ast.FunctionDef))
                ok = method_count >= min_methods
            label = f"class {target}" if target else "a class"
            add(f"ast.defines_class:{target or '*'}",
                ok,
                f"Defined {label}" if ok else f"Need to define {label}" + (f" extending {base}" if base else ""))

        elif kind == "calls_method":
            receiver = spec.get("on")
            method = spec.get("method")
            calls = method_calls(receiver, method) if receiver and method else []
            ok = len(calls) >= min_count
            add(f"ast.calls_method:{receiver}.{method}",
                ok,
                f"Called {receiver}.{method}() {len(calls)} time(s)" if ok else
                f"Need to call {receiver}.{method}()")

        elif kind == "parameter_count":
            target = spec.get("function")
            lo = spec.get("min")
            hi = spec.get("max")
            fn_def = next((n for n in nodes if isinstance(n, ast.FunctionDef) and n.name == target), None)
            if fn_def is None:
                add(f"ast.parameter_count:{target}", False,
                    f"Function {target}() not defined")
            else:
                arg_count = len(fn_def.args.args)
                ok_lo = lo is None or arg_count >= lo
                ok_hi = hi is None or arg_count <= hi
                ok = ok_lo and ok_hi
                msg = f"{target}() takes {arg_count} parameter(s)"
                if not ok_lo: msg = f"{target}() needs at least {lo} parameter(s); has {arg_count}"
                elif not ok_hi: msg = f"{target}() should have at most {hi} parameter(s); has {arg_count}"
                add(f"ast.parameter_count:{target}", ok, msg)

        elif kind == "nesting_depth":
            cap = spec.get("max")
            depth = max_nesting_depth()
            ok = cap is None or depth <= cap
            add("ast.nesting_depth", ok,
                f"Nesting depth is {depth}" if ok else
                f"Code is nested {depth} levels deep; keep it under {cap}")

        else:
            add(f"ast.unknown:{kind}", False, f"Unknown rule kind: {kind}")

    # --- forbiddenConstructs (anti-rules) ---
    for spec in rules.get("forbiddenConstructs") or []:
        kind = spec.get("type")
        name = spec.get("name")
        violated = False
        if kind == "function_call":
            violated = bool(function_calls(name))
        elif kind == "import":
            violated = bool(imports())
        elif kind == "loop":
            violated = any(isinstance(n, (ast.For, ast.While)) for n in nodes)
        elif kind == "imports_module":
            target = name
            for kind_imp, mod, _ in imports():
                if mod == target:
                    violated = True
                    break
        else:
            # Don't fail open on unknown kinds — emit a failing rule so the
            # author sees their typo instead of silently passing.
            add(f"ast.not_uses:{kind or '*'}", False,
                f"Unknown forbidden-construct kind: {kind!r}")
            continue
        ok = not violated
        add(f"ast.not_uses:{kind}:{name or '*'}", ok,
            f"Did not use {kind}{':'+name if name else ''}" if ok else
            f"Must NOT use {kind}{':'+name if name else ''}")

json.dumps(results)
`;
