#!/usr/bin/env python3
"""
Catalog all Kenney assets and generate TypeScript manifests
This script scans the attached_assets directory and creates proper asset manifests
"""

import os
import json
import shutil
from pathlib import Path
from PIL import Image
import hashlib

# Asset categories based on Kenney pack names
CATEGORY_MAPPINGS = {
    'characters': ['Character Pack', 'Platformer Characters', 'Toon Characters', 'Shape Characters', 'Robot Pack'],
    'enemies': ['Monster Builder', 'Alien UFO', 'Animal Pack'],
    'items': ['Generic Items', 'Puzzle Assets', 'Physics Assets', 'Donuts', 'Fish Pack'],
    'tiles': ['Platformer Pack', 'Pixel Platformer', 'Block Pack', 'Isometric Tiles', 'Roguelike'],
    'backgrounds': ['Background Elements', 'Pattern Pack', 'Planets', 'Simple Space'],
    'ui': ['UI Pack', 'UI Adventure', 'Onscreen Controls', 'Fantasy UI Borders'],
    'vehicles': ['Racing Pack', 'Tank Pack', 'Pixel Vehicle Pack', 'Topdown Tanks'],
    'effects': ['Particle Pack', 'Explosion Pack', 'Smoke Particles', 'Splat Pack']
}

def get_category(pack_name):
    """Determine category based on pack name"""
    for category, patterns in CATEGORY_MAPPINGS.items():
        for pattern in patterns:
            if pattern.lower() in pack_name.lower():
                return category
    return 'misc'

def generate_asset_id(file_path):
    """Generate unique ID for asset"""
    return hashlib.md5(file_path.encode()).hexdigest()[:8]

def process_2d_assets():
    """Process all 2D Kenney assets"""
    assets_2d_path = Path('../attached_assets/2D assets')
    public_assets_path = Path('../client/public/assets')
    
    # Create output directories
    for category in CATEGORY_MAPPINGS.keys():
        (public_assets_path / category).mkdir(parents=True, exist_ok=True)
    
    sprite_assets = []
    tileset_assets = []
    background_assets = []
    
    # Process each pack
    for pack_dir in assets_2d_path.iterdir():
        if not pack_dir.is_dir():
            continue
            
        pack_name = pack_dir.name
        category = get_category(pack_name)
        
        # Find PNG files in the pack
        png_files = list(pack_dir.rglob('*.png'))
        
        for png_file in png_files[:20]:  # Limit to 20 per pack for now
            try:
                # Skip if file is too large
                if png_file.stat().st_size > 5 * 1024 * 1024:  # 5MB limit
                    continue
                    
                # Get image dimensions
                with Image.open(png_file) as img:
                    width, height = img.size
                    
                # Determine asset type based on dimensions and name
                asset_type = 'sprite'
                if 'tile' in png_file.name.lower() or 'sheet' in png_file.name.lower():
                    asset_type = 'tileset'
                elif 'background' in png_file.name.lower() or 'bg' in png_file.name.lower():
                    asset_type = 'background'
                elif width > 512 or height > 512:
                    asset_type = 'background'
                
                # Generate asset ID and new filename
                asset_id = f"{pack_name.lower().replace(' ', '_')}_{png_file.stem}"[:50]
                asset_id = ''.join(c if c.isalnum() or c in '_-' else '_' for c in asset_id)
                new_filename = f"{asset_id}.png"
                
                # Copy to public assets
                dest_path = public_assets_path / category / new_filename
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(png_file, dest_path)
                
                # Create asset metadata
                asset_data = {
                    'id': asset_id,
                    'name': png_file.stem.replace('_', ' ').title(),
                    'description': f'{pack_name} - {png_file.stem}',
                    'type': asset_type,
                    'category': category,
                    'path': f'/assets/{category}/{new_filename}',
                    'thumbnail': f'/assets/{category}/{new_filename}',
                    'tags': [category, pack_name.lower().replace(' ', '_')],
                    'license': 'CC0 - Kenney.nl',
                    'suggestedUse': f'From {pack_name} pack',
                    'size': {'width': width, 'height': height}
                }
                
                # Add to appropriate list
                if asset_type == 'sprite':
                    sprite_assets.append(asset_data)
                elif asset_type == 'tileset':
                    tileset_assets.append(asset_data)
                else:
                    background_assets.append(asset_data)
                    
            except Exception as e:
                print(f"Error processing {png_file}: {e}")
                continue
    
    return sprite_assets, tileset_assets, background_assets

def process_audio_assets():
    """Process audio assets"""
    audio_path = Path('../attached_assets/Audio')
    public_audio_path = Path('../client/public/assets/audio')
    public_audio_path.mkdir(parents=True, exist_ok=True)
    
    sound_assets = []
    music_assets = []
    
    if audio_path.exists():
        # Process OGG and MP3 files
        audio_files = list(audio_path.rglob('*.ogg')) + list(audio_path.rglob('*.mp3'))
        
        for audio_file in audio_files[:50]:  # Limit for now
            try:
                # Skip large files
                if audio_file.stat().st_size > 10 * 1024 * 1024:  # 10MB limit
                    continue
                
                # Determine if it's music or sound effect
                is_music = 'music' in audio_file.name.lower() or 'theme' in audio_file.name.lower()
                
                # Generate asset ID
                asset_id = f"audio_{audio_file.stem}"[:50]
                asset_id = ''.join(c if c.isalnum() or c in '_-' else '_' for c in asset_id)
                new_filename = f"{asset_id}{audio_file.suffix}"
                
                # Copy to public
                dest_path = public_audio_path / new_filename
                shutil.copy2(audio_file, dest_path)
                
                # Create metadata
                asset_data = {
                    'id': asset_id,
                    'name': audio_file.stem.replace('_', ' ').title(),
                    'type': 'music' if is_music else 'sound',
                    'path': f'/assets/audio/{new_filename}',
                    'tags': ['music' if is_music else 'sound', 'cc0'],
                    'license': 'CC0 - Kenney.nl'
                }
                
                if is_music:
                    music_assets.append(asset_data)
                else:
                    sound_assets.append(asset_data)
                    
            except Exception as e:
                print(f"Error processing {audio_file}: {e}")
                continue
    
    return sound_assets, music_assets

def generate_typescript_manifests(sprite_assets, tileset_assets, background_assets, sound_assets, music_assets):
    """Generate TypeScript files with asset manifests"""
    
    # Generate sprites manifest
    sprites_ts = '''// Auto-generated Kenney asset manifests
import { SpriteAsset } from './asset-types';

export const kenneySprites: SpriteAsset[] = [
'''
    for asset in sprite_assets[:100]:  # Limit for compilation speed
        sprites_ts += f'''  {{
    id: '{asset['id']}',
    name: '{asset['name']}',
    description: '{asset['description']}',
    type: 'sprite',
    category: '{asset['category']}',
    path: '{asset['path']}',
    thumbnail: '{asset['thumbnail']}',
    tags: {json.dumps(asset['tags'])},
    license: '{asset['license']}',
    suggestedUse: '{asset['suggestedUse']}',
    size: {{ width: {asset['size']['width']}, height: {asset['size']['height']} }}
  }},
'''
    sprites_ts += '];\n'
    
    # Generate backgrounds manifest
    backgrounds_ts = '''import { BackgroundAsset } from './asset-types';

export const kenneyBackgrounds: BackgroundAsset[] = [
'''
    for asset in background_assets[:50]:
        backgrounds_ts += f'''  {{
    id: '{asset['id']}',
    name: '{asset['name']}',
    description: '{asset['description']}',
    type: 'background',
    category: '{asset['category']}',
    path: '{asset['path']}',
    thumbnail: '{asset['thumbnail']}',
    tags: {json.dumps(asset['tags'])},
    license: '{asset['license']}'
  }},
'''
    backgrounds_ts += '];\n'
    
    # Generate sounds manifest
    sounds_ts = '''import { SoundAsset } from './asset-types';

export const kenneySounds: SoundAsset[] = [
'''
    for asset in sound_assets[:50]:
        sounds_ts += f'''  {{
    id: '{asset['id']}',
    name: '{asset['name']}',
    type: 'sound',
    path: '{asset['path']}',
    tags: {json.dumps(asset['tags'])},
    license: '{asset['license']}'
  }},
'''
    sounds_ts += '];\n'
    
    # Generate music manifest  
    music_ts = '''export const kenneyMusic: SoundAsset[] = [
'''
    for asset in music_assets[:20]:
        music_ts += f'''  {{
    id: '{asset['id']}',
    name: '{asset['name']}',
    type: 'music',
    path: '{asset['path']}',
    tags: {json.dumps(asset['tags'])},
    license: '{asset['license']}'
  }},
'''
    music_ts += '];\n'
    
    # Write TypeScript files
    Path('../client/src/lib/asset-library').mkdir(parents=True, exist_ok=True)
    
    with open('../client/src/lib/asset-library/kenney-sprites.ts', 'w') as f:
        f.write(sprites_ts)
    
    with open('../client/src/lib/asset-library/kenney-backgrounds.ts', 'w') as f:
        f.write(backgrounds_ts)
        
    with open('../client/src/lib/asset-library/kenney-sounds.ts', 'w') as f:
        f.write(sounds_ts + '\n' + music_ts)
    
    print(f"Generated manifests:")
    print(f"  - {len(sprite_assets)} sprites")
    print(f"  - {len(background_assets)} backgrounds")
    print(f"  - {len(sound_assets)} sounds")
    print(f"  - {len(music_assets)} music tracks")
    print(f"  - {len(tileset_assets)} tilesets")

def main():
    print("Cataloging Kenney assets...")
    
    # Process 2D assets
    sprite_assets, tileset_assets, background_assets = process_2d_assets()
    
    # Process audio
    sound_assets, music_assets = process_audio_assets()
    
    # Generate TypeScript manifests
    generate_typescript_manifests(
        sprite_assets, 
        tileset_assets, 
        background_assets,
        sound_assets,
        music_assets
    )
    
    print("Asset cataloging complete!")
    
    # Save summary
    summary = {
        'sprites': len(sprite_assets),
        'tilesets': len(tileset_assets),
        'backgrounds': len(background_assets),
        'sounds': len(sound_assets),
        'music': len(music_assets),
        'total': len(sprite_assets) + len(tileset_assets) + len(background_assets) + len(sound_assets) + len(music_assets)
    }
    
    with open('asset-catalog-summary.json', 'w') as f:
        json.dump(summary, f, indent=2)
    
    print(f"\nTotal assets cataloged: {summary['total']}")

if __name__ == "__main__":
    main()