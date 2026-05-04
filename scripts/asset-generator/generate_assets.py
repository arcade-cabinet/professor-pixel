#!/usr/bin/env python3
"""
Generate CC0 game assets for Pixel's PyGame Palace
Creates sprite sheets, placeholder sounds, and organizes assets
"""

from PIL import Image, ImageDraw, ImageFont
import json
import os
import random
import numpy as np

def create_sprite_sheet(name, sprite_size=32, cols=8, rows=8, color_scheme=None):
    """Generate a sprite sheet with simple geometric shapes"""
    width = sprite_size * cols
    height = sprite_size * rows
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    if color_scheme is None:
        color_scheme = [(255, 100, 100), (100, 255, 100), (100, 100, 255), 
                       (255, 255, 100), (255, 100, 255), (100, 255, 255)]
    
    for row in range(rows):
        for col in range(cols):
            x = col * sprite_size
            y = row * sprite_size
            
            # Random sprite type
            sprite_type = random.choice(['circle', 'square', 'triangle', 'diamond', 'star'])
            color = random.choice(color_scheme)
            
            if sprite_type == 'circle':
                draw.ellipse([x+4, y+4, x+sprite_size-4, y+sprite_size-4], fill=color)
            elif sprite_type == 'square':
                draw.rectangle([x+6, y+6, x+sprite_size-6, y+sprite_size-6], fill=color)
            elif sprite_type == 'triangle':
                points = [(x+sprite_size//2, y+4), (x+4, y+sprite_size-4), 
                         (x+sprite_size-4, y+sprite_size-4)]
                draw.polygon(points, fill=color)
            elif sprite_type == 'diamond':
                points = [(x+sprite_size//2, y+4), (x+sprite_size-4, y+sprite_size//2),
                         (x+sprite_size//2, y+sprite_size-4), (x+4, y+sprite_size//2)]
                draw.polygon(points, fill=color)
            else:  # star
                # Simple 4-point star
                points = []
                for i in range(8):
                    angle = i * np.pi / 4
                    if i % 2 == 0:
                        r = sprite_size // 2 - 4
                    else:
                        r = sprite_size // 4
                    px = x + sprite_size // 2 + r * np.cos(angle)
                    py = y + sprite_size // 2 + r * np.sin(angle)
                    points.append((px, py))
                draw.polygon(points, fill=color)
    
    return img

def create_tileset(name, tile_size=16, cols=16, rows=16):
    """Generate a tileset with various tile patterns"""
    width = tile_size * cols
    height = tile_size * rows
    img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Define tile types
    tile_types = {
        'grass': (34, 139, 34),
        'dirt': (139, 69, 19),
        'stone': (128, 128, 128),
        'water': (64, 164, 223),
        'sand': (238, 203, 173),
        'wood': (160, 82, 45),
        'brick': (178, 34, 34),
        'ice': (176, 224, 230)
    }
    
    tile_list = list(tile_types.items())
    
    for row in range(rows):
        for col in range(cols):
            x = col * tile_size
            y = row * tile_size
            
            # Choose tile type based on position
            tile_idx = (row * cols + col) % len(tile_list)
            tile_name, base_color = tile_list[tile_idx]
            
            # Add variation
            color = tuple(min(255, max(0, c + random.randint(-20, 20))) for c in base_color)
            
            # Draw base tile
            draw.rectangle([x, y, x+tile_size, y+tile_size], fill=color)
            
            # Add texture
            if tile_name == 'grass':
                for _ in range(3):
                    gx = x + random.randint(2, tile_size-2)
                    gy = y + random.randint(2, tile_size-2)
                    draw.line([gx, gy, gx, gy-2], fill=(0, 100, 0))
            elif tile_name == 'brick':
                # Draw brick lines
                if row % 2 == 0:
                    draw.line([x+tile_size//2, y, x+tile_size//2, y+tile_size], fill=(100, 20, 20))
                draw.line([x, y+tile_size//2, x+tile_size, y+tile_size//2], fill=(100, 20, 20))
            elif tile_name == 'water':
                # Add wave pattern
                for i in range(0, tile_size, 4):
                    wave_y = y + tile_size//2 + int(2 * np.sin(x + i))
                    draw.point((x+i, wave_y), fill=(255, 255, 255, 50))
    
    return img

def create_character_sprites():
    """Create simple character sprites in different poses"""
    sprites = []
    sprite_size = 32
    
    # Character colors
    colors = [
        ('hero', (100, 100, 255)),  # Blue hero
        ('enemy1', (255, 100, 100)),  # Red enemy
        ('enemy2', (100, 255, 100)),  # Green enemy
        ('npc', (255, 255, 100)),  # Yellow NPC
    ]
    
    for char_name, color in colors:
        # Create sprite sheet for this character
        img = Image.new('RGBA', (sprite_size * 4, sprite_size * 4), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Different poses (rows): idle, walk, jump, attack
        for pose in range(4):
            # Animation frames (columns)
            for frame in range(4):
                x = frame * sprite_size
                y = pose * sprite_size
                
                # Draw simple character
                # Head
                head_size = 8
                draw.ellipse([x+12, y+4, x+20, y+12], fill=color)
                
                # Body
                body_height = 12
                draw.rectangle([x+14, y+12, x+18, y+24], fill=color)
                
                # Arms and legs with animation
                if pose == 0:  # Idle
                    # Arms
                    draw.line([x+14, y+14, x+10, y+18], fill=color, width=2)
                    draw.line([x+18, y+14, x+22, y+18], fill=color, width=2)
                    # Legs
                    draw.line([x+15, y+24, x+13, y+30], fill=color, width=2)
                    draw.line([x+17, y+24, x+19, y+30], fill=color, width=2)
                elif pose == 1:  # Walk
                    # Animated walking
                    offset = frame * 2
                    # Arms swing
                    draw.line([x+14, y+14, x+10-offset, y+18], fill=color, width=2)
                    draw.line([x+18, y+14, x+22+offset, y+18], fill=color, width=2)
                    # Legs walk
                    draw.line([x+15, y+24, x+13-offset, y+30], fill=color, width=2)
                    draw.line([x+17, y+24, x+19+offset, y+30], fill=color, width=2)
                elif pose == 2:  # Jump
                    # Arms up
                    draw.line([x+14, y+14, x+10, y+10], fill=color, width=2)
                    draw.line([x+18, y+14, x+22, y+10], fill=color, width=2)
                    # Legs bent
                    draw.line([x+15, y+24, x+13, y+26], fill=color, width=2)
                    draw.line([x+17, y+24, x+19, y+26], fill=color, width=2)
                else:  # Attack
                    # Arm extended
                    draw.line([x+14, y+14, x+8, y+14], fill=color, width=2)
                    draw.line([x+18, y+14, x+26, y+14], fill=color, width=2)
                    # Legs stance
                    draw.line([x+15, y+24, x+11, y+30], fill=color, width=2)
                    draw.line([x+17, y+24, x+21, y+30], fill=color, width=2)
        
        sprites.append((f"{char_name}_sprites.png", img))
    
    return sprites

def create_ui_elements():
    """Create UI element sprites"""
    elements = []
    
    # Buttons
    button_img = Image.new('RGBA', (256, 128), (0, 0, 0, 0))
    draw = ImageDraw.Draw(button_img)
    
    # Different button states
    button_colors = [
        (100, 200, 100),  # Normal
        (150, 250, 150),  # Hover
        (50, 150, 50),    # Pressed
        (150, 150, 150),  # Disabled
    ]
    
    for i, color in enumerate(button_colors):
        x = (i % 2) * 128
        y = (i // 2) * 64
        # Button background
        draw.rounded_rectangle([x+4, y+4, x+124, y+60], radius=8, fill=color)
        # Button border
        draw.rounded_rectangle([x+4, y+4, x+124, y+60], radius=8, outline=(0, 0, 0), width=2)
    
    elements.append(('ui_buttons.png', button_img))
    
    # Health bars
    bar_img = Image.new('RGBA', (256, 64), (0, 0, 0, 0))
    draw = ImageDraw.Draw(bar_img)
    
    # Different bar states
    for i in range(5):
        x = 10
        y = i * 12 + 4
        width = 200
        height = 8
        
        # Bar background
        draw.rectangle([x, y, x+width, y+height], fill=(50, 50, 50))
        # Bar fill
        fill_width = int(width * (1.0 - i * 0.2))
        if i == 0:
            fill_color = (0, 255, 0)  # Full health
        elif i < 3:
            fill_color = (255, 255, 0)  # Medium health
        else:
            fill_color = (255, 0, 0)  # Low health
        draw.rectangle([x, y, x+fill_width, y+height], fill=fill_color)
        # Bar border
        draw.rectangle([x, y, x+width, y+height], outline=(0, 0, 0), width=1)
    
    elements.append(('ui_health_bars.png', bar_img))
    
    # Icons
    icon_img = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    draw = ImageDraw.Draw(icon_img)
    
    icon_types = ['heart', 'star', 'coin', 'key', 'sword', 'shield', 'potion', 'gem']
    icon_colors = [(255, 100, 100), (255, 255, 0), (255, 215, 0), (192, 192, 192),
                   (169, 169, 169), (135, 206, 235), (147, 0, 211), (0, 255, 127)]
    
    for idx, (icon_type, color) in enumerate(zip(icon_types, icon_colors)):
        x = (idx % 8) * 32
        y = (idx // 8) * 32
        
        if icon_type == 'heart':
            # Simple heart shape
            draw.ellipse([x+8, y+8, x+16, y+16], fill=color)
            draw.ellipse([x+16, y+8, x+24, y+16], fill=color)
            draw.polygon([(x+8, y+14), (x+16, y+24), (x+24, y+14)], fill=color)
        elif icon_type == 'star':
            # 5-point star
            points = []
            for i in range(10):
                angle = i * np.pi / 5 - np.pi / 2
                if i % 2 == 0:
                    r = 12
                else:
                    r = 6
                px = x + 16 + r * np.cos(angle)
                py = y + 16 + r * np.sin(angle)
                points.append((px, py))
            draw.polygon(points, fill=color)
        elif icon_type == 'coin':
            draw.ellipse([x+8, y+8, x+24, y+24], fill=color)
            draw.text((x+14, y+12), "$", fill=(0, 0, 0))
        elif icon_type == 'key':
            # Simple key shape
            draw.ellipse([x+8, y+8, x+16, y+16], fill=color)
            draw.rectangle([x+14, y+12, x+24, y+14], fill=color)
            draw.rectangle([x+20, y+12, x+22, y+18], fill=color)
            draw.rectangle([x+22, y+12, x+24, y+16], fill=color)
        else:
            # Generic square icon
            draw.rectangle([x+8, y+8, x+24, y+24], fill=color)
    
    elements.append(('ui_icons.png', icon_img))
    
    return elements

def generate_all_assets():
    """Generate all game assets"""
    
    # Create sprite sheets
    print("Generating sprite sheets...")
    os.makedirs('assets/sprites', exist_ok=True)
    
    # Generic sprite sheets
    sprite_names = [
        'enemies', 'items', 'effects', 'projectiles', 'platforms',
        'powerups', 'obstacles', 'decorations', 'particles', 'backgrounds'
    ]
    
    for name in sprite_names:
        img = create_sprite_sheet(name)
        img.save(f'assets/sprites/{name}_sprites.png')
        print(f"  Created {name}_sprites.png")
    
    # Character sprites
    char_sprites = create_character_sprites()
    for filename, img in char_sprites:
        img.save(f'assets/sprites/{filename}')
        print(f"  Created {filename}")
    
    # UI elements
    ui_elements = create_ui_elements()
    for filename, img in ui_elements:
        img.save(f'assets/sprites/{filename}')
        print(f"  Created {filename}")
    
    # Create tilesets
    print("\nGenerating tilesets...")
    os.makedirs('assets/tilesets', exist_ok=True)
    
    tileset_names = [
        'dungeon', 'forest', 'desert', 'ice', 'lava',
        'city', 'space', 'underwater', 'clouds', 'cave'
    ]
    
    for name in tileset_names:
        img = create_tileset(name)
        img.save(f'assets/tilesets/{name}_tileset.png')
        print(f"  Created {name}_tileset.png")

if __name__ == "__main__":
    generate_all_assets()
    print("\nAsset generation complete!")