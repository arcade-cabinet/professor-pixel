#!/usr/bin/env node
// Scans public/assets/ at build time and emits public/assets/catalog.json.
// Replaces the hand-curated _kenney-*.ts / _curated-*.ts registries.

import { readdirSync, writeFileSync } from 'node:fs';
import { join, relative, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const publicAssets = join(repoRoot, 'public', 'assets');
const outFile = join(publicAssets, 'catalog.json');

const SPRITE_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const AUDIO_EXT = new Set(['.wav', '.ogg', '.mp3', '.m4a']);

// Top-level dir → asset category mapping. Anything else falls through to 'misc'.
const SPRITE_DIRS = new Set([
  'characters', 'enemies', 'items', 'effects', 'tiles', 'vehicles', 'misc',
  'sprites',
]);
const BACKGROUND_DIRS = new Set(['backgrounds']);
const AUDIO_DIRS = new Set(['audio']);

function walk(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) stack.push(full);
      else if (e.isFile()) out.push(full);
    }
  }
  return out;
}

function classify(absPath) {
  const rel = relative(publicAssets, absPath).replaceAll('\\', '/');
  const segs = rel.split('/');
  const top = segs[0];
  const ext = extname(absPath).toLowerCase();
  const name = basename(absPath, ext);

  // public-served URL (browser fetches /assets/<rel>)
  const url = `/assets/${rel}`;

  // sprites
  if (SPRITE_EXT.has(ext)) {
    if (BACKGROUND_DIRS.has(top)) {
      return {
        kind: 'background',
        id: `bg-${name}`,
        name,
        path: url,
        category: inferBackgroundCategory(name),
        tags: tagsFromName(name),
      };
    }
    if (SPRITE_DIRS.has(top)) {
      // sprites/characters/foo.png → category 'characters'
      const category = top === 'sprites' && segs.length > 2 ? segs[1] : top;
      return {
        kind: 'sprite',
        id: `sp-${name}`,
        name,
        path: url,
        category,
        tags: tagsFromName(name),
      };
    }
    return null;
  }

  // sounds
  if (AUDIO_EXT.has(ext) && AUDIO_DIRS.has(top)) {
    return {
      kind: 'sound',
      id: `snd-${name}`,
      name,
      path: url,
      category: inferSoundCategory(name),
      tags: tagsFromName(name),
    };
  }

  return null;
}

function inferBackgroundCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('space') || n.includes('star')) return 'space';
  if (n.includes('forest') || n.includes('tree')) return 'forest';
  if (n.includes('city') || n.includes('urban')) return 'city';
  if (n.includes('water') || n.includes('ocean') || n.includes('sea')) return 'underwater';
  if (n.includes('desert') || n.includes('sand')) return 'desert';
  if (n.includes('dungeon') || n.includes('cave')) return 'dungeon';
  return 'abstract';
}

function inferSoundCategory(name) {
  const n = name.toLowerCase();
  if (n.includes('jump')) return 'jump';
  if (n.includes('coin') || n.includes('collect') || n.includes('pickup')) return 'collect';
  if (n.includes('hit') || n.includes('hurt') || n.includes('damage')) return 'hit';
  if (n.includes('shoot') || n.includes('laser') || n.includes('fire')) return 'shoot';
  if (n.includes('power') || n.includes('boost')) return 'powerup';
  if (n.includes('click') || n.includes('button') || n.includes('select')) return 'ui';
  if (n.includes('music') || n.includes('theme') || n.includes('song')) return 'music';
  return 'ambient';
}

function tagsFromName(name) {
  return name
    .toLowerCase()
    .split(/[-_\s.]+/)
    .filter(t => t.length > 1 && !/^\d+$/.test(t));
}

function main() {
  let files;
  try { files = walk(publicAssets); }
  catch (e) {
    console.error(`[asset-catalog] cannot read ${publicAssets}:`, e.message);
    process.exit(1);
  }

  const catalog = { sprites: [], sounds: [], backgrounds: [], generatedAt: new Date().toISOString() };
  let skipped = 0;
  for (const f of files) {
    if (basename(f) === 'catalog.json') continue;
    const c = classify(f);
    if (!c) { skipped++; continue; }
    if (c.kind === 'sprite') catalog.sprites.push(c);
    else if (c.kind === 'background') catalog.backgrounds.push(c);
    else if (c.kind === 'sound') catalog.sounds.push(c);
  }

  writeFileSync(outFile, JSON.stringify(catalog, null, 2));
  console.log(
    `[asset-catalog] wrote ${outFile}: ` +
    `${catalog.sprites.length} sprites, ${catalog.backgrounds.length} backgrounds, ` +
    `${catalog.sounds.length} sounds (${skipped} skipped).`,
  );
}

main();
