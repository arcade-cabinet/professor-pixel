import { PygameComponent } from '../types';

export const jumpComponent: PygameComponent = {
  id: 'jump',
  name: 'Jump Mechanics',
  category: 'movement',
  
  assetSlots: {
    character: 'platformer/characters/player.png',
    sound: 'audio/sfx/jump.ogg'
  },
  
  variants: {
    A: {
      name: 'Floaty Jump',
      description: 'Hold to jump higher with air control',
      pythonCode: `
# Floaty Jump System - Hold space for higher jumps
class JumpSystem:
    def __init__(self, player):
        self.player = player
        self.jump_power = {{jump_power}}
        self.gravity = {{gravity}}
        self.max_jumps = {{max_jumps}}
        self.jumps_remaining = self.max_jumps
        self.is_jumping = False
        self.jump_hold_time = 0
        self.max_hold_time = {{max_hold_time}}
        
    def update(self, keys, dt):
        # Handle jump input
        if keys[pygame.K_SPACE]:
            if self.jumps_remaining > 0 and not self.is_jumping:
                # Start jump
                self.player.velocity_y = -self.jump_power
                self.jumps_remaining -= 1
                self.is_jumping = True
                self.jump_hold_time = 0
                
                # Play jump sound if available
                if '{{sound}}' and hasattr(self.player, 'play_sound'):
                    self.player.play_sound('{{sound}}')
            
            # Floaty effect - reduce gravity while holding
            elif self.is_jumping and self.jump_hold_time < self.max_hold_time:
                self.player.velocity_y *= 0.95
                self.jump_hold_time += dt
        else:
            self.is_jumping = False
        
        # Reset jumps when on ground
        if self.player.on_ground:
            self.jumps_remaining = self.max_jumps
            
        # Apply gravity
        if not self.player.on_ground:
            self.player.velocity_y += self.gravity * dt
            self.player.velocity_y = min(self.player.velocity_y, {{max_fall_speed}})`
    },
    B: {
      name: 'Realistic Jump',
      description: 'Fixed arc jump with no air control',
      pythonCode: `
# Realistic Jump System - Fixed arc physics
class JumpSystem:
    def __init__(self, player):
        self.player = player
        self.jump_power = {{jump_power}}
        self.gravity = {{gravity}}
        self.can_jump = True
        self.coyote_time = {{coyote_time}}  # Grace period after leaving platform
        self.time_since_grounded = 0
        
    def update(self, keys, dt):
        # Track time since last grounded
        if self.player.on_ground:
            self.time_since_grounded = 0
            self.can_jump = True
        else:
            self.time_since_grounded += dt
            
        # Handle jump input (only when grounded or within coyote time)
        if keys[pygame.K_SPACE] and self.can_jump:
            if self.player.on_ground or self.time_since_grounded < self.coyote_time:
                # Execute jump
                self.player.velocity_y = -self.jump_power
                self.can_jump = False
                
                # Play jump sound if available
                if '{{sound}}' and hasattr(self.player, 'play_sound'):
                    self.player.play_sound('{{sound}}')
        
        # Apply constant gravity (no air control)
        if not self.player.on_ground:
            self.player.velocity_y += self.gravity * dt
            self.player.velocity_y = min(self.player.velocity_y, {{max_fall_speed}})`
    }
  },
  
  parameters: {
    jump_power: 15,
    gravity: 30,
    max_jumps: 2,
    max_hold_time: 0.3,
    coyote_time: 0.1,
    max_fall_speed: 20
  }
};