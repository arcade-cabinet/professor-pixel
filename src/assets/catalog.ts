// Runtime asset catalog. Lazily fetches /assets/catalog.json (generated at
// build time by scripts/build-asset-catalog.mjs) and surfaces typed accessors.
//
// Replaces the hand-curated _kenney-*.ts and _curated-*.ts registries.

import type { SpriteAsset, SoundAsset, BackgroundAsset } from './types';

interface CatalogEntry {
  kind: 'sprite' | 'sound' | 'background';
  id: string;
  name: string;
  path: string;
  category: string;
  tags: string[];
}

interface RawCatalog {
  sprites: CatalogEntry[];
  sounds: CatalogEntry[];
  backgrounds: CatalogEntry[];
  generatedAt: string;
}

interface AssetCatalog {
  sprites: SpriteAsset[];
  sounds: SoundAsset[];
  backgrounds: BackgroundAsset[];
  generatedAt: string;
}

let cached: Promise<AssetCatalog> | null = null;

const CATALOG_URL = '/assets/catalog.json';

function toSprite(e: CatalogEntry): SpriteAsset {
  return {
    id: e.id,
    name: e.name,
    description: e.name.replaceAll(/[-_]/g, ' '),
    type: 'sprite',
    path: e.path,
    tags: e.tags,
    license: 'CC0',
    category: e.category as SpriteAsset['category'],
  };
}

function toSound(e: CatalogEntry): SoundAsset {
  return {
    id: e.id,
    name: e.name,
    description: e.name.replaceAll(/[-_]/g, ' '),
    type: e.category === 'music' ? 'music' : 'sound',
    path: e.path,
    tags: e.tags,
    license: 'CC0',
    category: e.category as SoundAsset['category'],
  };
}

function toBackground(e: CatalogEntry): BackgroundAsset {
  return {
    id: e.id,
    name: e.name,
    description: e.name.replaceAll(/[-_]/g, ' '),
    type: 'background',
    path: e.path,
    tags: e.tags,
    license: 'CC0',
    category: e.category as BackgroundAsset['category'],
  };
}

export async function loadCatalog(): Promise<AssetCatalog> {
  if (cached) return cached;
  cached = fetch(CATALOG_URL)
    .then(r => {
      if (!r.ok) throw new Error(`Asset catalog fetch failed: ${r.status}`);
      return r.json() as Promise<RawCatalog>;
    })
    .then(raw => ({
      sprites: raw.sprites.map(toSprite),
      sounds: raw.sounds.map(toSound),
      backgrounds: raw.backgrounds.map(toBackground),
      generatedAt: raw.generatedAt,
    }))
    .catch(err => {
      cached = null;
      throw err;
    });
  return cached;
}

export async function loadSprites(): Promise<SpriteAsset[]> {
  return (await loadCatalog()).sprites;
}

export async function loadSounds(): Promise<SoundAsset[]> {
  return (await loadCatalog()).sounds;
}

export async function loadBackgrounds(): Promise<BackgroundAsset[]> {
  return (await loadCatalog()).backgrounds;
}
