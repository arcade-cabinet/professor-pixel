#!/usr/bin/env node
// Part 0 architectural audit: classify every app/ TSX/TS file as
// clean / leaky / inverted across six dimensions.
//
// Output: a markdown table written to stdout. The audit doc consumes it.
//
// Heuristics (intentionally conservative — false positives are reviewable):
//   - deepImports:   imports of @lib/<pkg>/<path> beyond the barrel
//   - tryCatchCount: count of `try {` blocks
//   - rawHexCount:   count of `#[0-9a-fA-F]{6}` literals outside imports
//   - inlineStyle:   count of `style={{` literals
//   - domainTypes:   non-Props interface/type declarations naming domain concepts
//   - bodyLogic:     proxy for "is this TSX doing work" — count of:
//                    regex literals, parseInt/Number(), JSON.parse,
//                    new Promise(, fetch(, and try/catch around await
//
// A file is "clean" if every signal is 0 or below threshold.
// "leaky" if 1-2 signals trip but the file is < 200 lines.
// "inverted" if it's heavy on multiple signals — the load-bearing offender.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../app/', import.meta.url).pathname;

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) yield* walk(p);
    else if (/\.(tsx?|jsx?)$/.test(name)) yield p;
  }
}

const DOMAIN_NAMES = [
  'Lesson',
  'Project',
  'Grade',
  'Component',
  'Wizard',
  'Pyodide',
  'Pygame',
  'Storage',
  'Asset',
  'Dialogue',
  'Choice',
  'Branch',
];

const results = [];

for (const file of walk(ROOT)) {
  const rel = file.replace(ROOT, 'app/');
  const src = readFileSync(file, 'utf8');
  const lines = src.split('\n').length;

  // 1. Deep imports past the package barrel.
  // @lib/<pkg> = barrel (OK). @lib/<pkg>/<file> = deep (NOT OK).
  // Allowlist: '@lib/types/schema' is the public barrel for the legacy schema.ts pattern.
  const deepImports = [];
  const importRe = /from ['"]@lib\/([a-z-]+)\/([^'"]+)['"]/g;
  let m;
  while ((m = importRe.exec(src))) {
    const [, pkg, rest] = m;
    if (pkg === 'types' && /^schema$/.test(rest)) continue;
    deepImports.push(`@lib/${pkg}/${rest}`);
  }

  // 2. try/catch count — proxy for "TSX is handling errors from logic".
  const tryCatchCount = (src.match(/^\s*try\s*\{/gm) || []).length;

  // 3. raw hex literals outside `from '...'` imports.
  const rawHexLines = src
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.includes('from ') && /#[0-9a-fA-F]{6}\b/.test(l));
  const rawHexCount = rawHexLines.length;

  // 4. inline style literals.
  const inlineStyleCount = (src.match(/style=\{\{/g) || []).length;

  // 5. domain-named type/interface declarations that aren't *Props.
  const domainTypes = [];
  const typeRe = /^(?:export\s+)?(?:interface|type)\s+([A-Z][A-Za-z0-9]+)/gm;
  while ((m = typeRe.exec(src))) {
    const name = m[1];
    if (name.endsWith('Props')) continue;
    if (DOMAIN_NAMES.some((d) => name.includes(d))) {
      domainTypes.push(name);
    }
  }

  // 6. body logic markers.
  const bodyLogicMarkers = [];
  if (/parseInt\(|parseFloat\(|Number\([^)]/m.test(src)) bodyLogicMarkers.push('numeric-parse');
  if (/JSON\.parse\(/.test(src)) bodyLogicMarkers.push('json-parse');
  if (/new RegExp\(|\/[^\n/]+\/[gimsuy]*\.(test|exec|match)/.test(src)) bodyLogicMarkers.push('regex-eval');
  if (/new Promise\s*\(/.test(src)) bodyLogicMarkers.push('promise-construction');
  if (/(?:await )?fetch\(/.test(src)) bodyLogicMarkers.push('fetch-call');
  if (/setInterval\(|setTimeout\(/.test(src)) bodyLogicMarkers.push('timer');
  if (/requestAnimationFrame\(/.test(src)) bodyLogicMarkers.push('raf');

  const bodyLogicCount = bodyLogicMarkers.length;

  // Classify.
  // inverted: large + heavy logic + try/catch + likely owns refs/state machines.
  // leaky: small-to-medium with some leakage.
  // clean: barely any signals.
  const heavyScore =
    (lines >= 400 ? 2 : 0) +
    (tryCatchCount >= 3 ? 2 : tryCatchCount >= 1 ? 1 : 0) +
    (bodyLogicCount >= 3 ? 2 : bodyLogicCount >= 1 ? 1 : 0) +
    (inlineStyleCount >= 5 ? 1 : 0) +
    (rawHexCount >= 3 ? 1 : 0) +
    (deepImports.length >= 1 ? 1 : 0) +
    (domainTypes.length >= 1 ? 1 : 0);

  const verdict = heavyScore >= 5 ? 'INVERTED' : heavyScore >= 2 ? 'LEAKY' : 'CLEAN';

  results.push({
    file: rel,
    lines,
    verdict,
    score: heavyScore,
    tryCatchCount,
    inlineStyleCount,
    rawHexCount,
    deepImports: deepImports.length,
    deepImportSamples: deepImports.slice(0, 3),
    domainTypes: domainTypes.join(',') || '—',
    bodyLogic: bodyLogicMarkers.join(',') || '—',
  });
}

// Sort: INVERTED first (worst → best within), then LEAKY, then CLEAN.
const order = { INVERTED: 0, LEAKY: 1, CLEAN: 2 };
results.sort((a, b) => order[a.verdict] - order[b.verdict] || b.score - a.score || b.lines - a.lines);

const counts = results.reduce((acc, r) => ((acc[r.verdict] = (acc[r.verdict] || 0) + 1), acc), {});

console.log(`# Part 0 — UI-as-shell architectural audit (mechanical pass)\n`);
console.log(`Files scanned: **${results.length}**`);
console.log(`Verdict: **${counts.INVERTED || 0} inverted**, **${counts.LEAKY || 0} leaky**, **${counts.CLEAN || 0} clean**\n`);

console.log(`## Inverted — UI is load-bearing logic\n`);
console.log(`| File | Lines | try/catch | bodyLogic | inlineStyle | rawHex | deepImports | domainTypes | Score |`);
console.log(`|---|---:|---:|---|---:|---:|---:|---|---:|`);
for (const r of results.filter((r) => r.verdict === 'INVERTED')) {
  console.log(
    `| \`${r.file}\` | ${r.lines} | ${r.tryCatchCount} | ${r.bodyLogic} | ${r.inlineStyleCount} | ${r.rawHexCount} | ${r.deepImports} | ${r.domainTypes} | ${r.score} |`
  );
}

console.log(`\n## Leaky — small but holding logic that should move\n`);
console.log(`| File | Lines | try/catch | bodyLogic | inlineStyle | rawHex | deepImports | domainTypes | Score |`);
console.log(`|---|---:|---:|---|---:|---:|---:|---|---:|`);
for (const r of results.filter((r) => r.verdict === 'LEAKY')) {
  console.log(
    `| \`${r.file}\` | ${r.lines} | ${r.tryCatchCount} | ${r.bodyLogic} | ${r.inlineStyleCount} | ${r.rawHexCount} | ${r.deepImports} | ${r.domainTypes} | ${r.score} |`
  );
}

console.log(`\n## Clean — TSX-as-shell ✓\n`);
console.log(`Total clean: ${counts.CLEAN || 0}. Names omitted; see machine-readable JSON for full list.\n`);
