import { PygameComponent } from '../types';

export const walkComponent: PygameComponent = {
  id: 'walk',
  name: 'Walking Mechanics',
  category: 'movement',
  
  assetSlots: {
    character: 'platformer/characters/player.png',
    sound: 'audio/sfx/footsteps.ogg'
  },
  
  variants: {
    A: {
      name: 'Smooth Walking',
      description: 'Acceleration-based movement with momentum',
      pythonCode: `
# Smooth Walking System - Acceleration and momentum
class WalkSystem:
    def __init__(self, player):
        self.player = player
        self.max_speed = {{max_speed}}
        self.acceleration = {{acceleration}}
        self.friction = {{friction}}
        self.air_friction = {{air_friction}}
        self.footstep_timer = 0
        self.footstep_interval = {{footstep_interval}}
        
    def update(self, keys, dt):
        # Handle horizontal input
        move_input = 0
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            move_input = -1
            self.player.facing_right = False
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            move_input = 1
            self.player.facing_right = True
            
        # Apply acceleration
        if move_input != 0:
            self.player.velocity_x += move_input * self.acceleration * dt
            
            # Play footstep sounds
            if self.player.on_ground:
                self.footstep_timer += dt
                if self.footstep_timer >= self.footstep_interval:
                    if '{{sound}}' and hasattr(self.player, 'play_sound'):
                        self.player.play_sound('{{sound}}')
                    self.footstep_timer = 0
        else:
            # Apply friction when no input
            if self.player.on_ground:
                self.player.velocity_x *= (1 - self.friction * dt)
            else:
                self.player.velocity_x *= (1 - self.air_friction * dt)
            self.footstep_timer = 0
            
        # Clamp to max speed
        if abs(self.player.velocity_x) > self.max_speed:
            self.player.velocity_x = self.max_speed if self.player.velocity_x > 0 else -self.max_speed
            
        # Stop if very slow
        if abs(self.player.velocity_x) < 0.1:
            self.player.velocity_x = 0`
    },
    B: {
      name: 'Instant Walking',
      description: 'Direct control with immediate response',
      pythonCode: `
# Instant Walking System - Direct control
class WalkSystem:
    def __init__(self, player):
        self.player = player
        self.walk_speed = {{walk_speed}}
        self.run_speed = {{run_speed}}
        self.is_running = False
        self.footstep_timer = 0
        self.footstep_interval = {{footstep_interval}}
        
    def update(self, keys, dt):
        # Check for run modifier
        self.is_running = keys[pygame.K_LSHIFT] or keys[pygame.K_RSHIFT]
        current_speed = self.run_speed if self.is_running else self.walk_speed
        
        # Direct movement control
        self.player.velocity_x = 0
        
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.player.velocity_x = -current_speed
            self.player.facing_right = False
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.player.velocity_x = current_speed
            self.player.facing_right = True
            
        # Footstep sounds for movement
        if self.player.velocity_x != 0 and self.player.on_ground:
            # Faster footsteps when running
            interval = self.footstep_interval / (1.5 if self.is_running else 1)
            self.footstep_timer += dt
            
            if self.footstep_timer >= interval:
                if '{{sound}}' and hasattr(self.player, 'play_sound'):
                    self.player.play_sound('{{sound}}')
                self.footstep_timer = 0
        else:
            self.footstep_timer = 0`
    }
  },
  
  parameters: {
    max_speed: 5,
    walk_speed: 5,
    run_speed: 8,
    acceleration: 20,
    friction: 10,
    air_friction: 2,
    footstep_interval: 0.4
  }
};