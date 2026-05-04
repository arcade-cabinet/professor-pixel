import { PygameComponent } from '../types';

export const gravityComponent: PygameComponent = {
  id: 'gravity',
  name: 'Gravity System',
  category: 'world',
  
  assetSlots: {},
  
  variants: {
    A: {
      name: 'Standard Gravity',
      description: 'Earth-like gravity with terminal velocity',
      pythonCode: `
# Standard Gravity System
class GravitySystem:
    def __init__(self):
        self.gravity = {{gravity_force}}
        self.terminal_velocity = {{terminal_velocity}}
        self.entities = []
        
    def add_entity(self, entity):
        if entity not in self.entities:
            self.entities.append(entity)
            entity.velocity_y = getattr(entity, 'velocity_y', 0)
            entity.on_ground = getattr(entity, 'on_ground', False)
            
    def remove_entity(self, entity):
        if entity in self.entities:
            self.entities.remove(entity)
            
    def update(self, dt, platforms):
        for entity in self.entities:
            if not entity.on_ground:
                # Apply gravity
                entity.velocity_y += self.gravity * dt
                
                # Terminal velocity
                if entity.velocity_y > self.terminal_velocity:
                    entity.velocity_y = self.terminal_velocity
                    
            # Update position
            entity.y += entity.velocity_y * dt
            
            # Ground collision
            entity.on_ground = False
            for platform in platforms:
                if hasattr(platform, 'rect'):
                    entity_rect = pygame.Rect(entity.x, entity.y, entity.width, entity.height)
                    
                    # Landing on platform
                    if (entity_rect.colliderect(platform.rect) and 
                        entity.velocity_y > 0 and
                        entity.y < platform.rect.centery):
                        entity.y = platform.rect.top - entity.height
                        entity.velocity_y = 0
                        entity.on_ground = True
                        break`
    },
    B: {
      name: 'Low Gravity',
      description: 'Moon-like gravity with floaty physics',
      pythonCode: `
# Low Gravity System
class GravitySystem:
    def __init__(self):
        self.gravity = {{gravity_force}} * 0.3  # Reduced gravity
        self.terminal_velocity = {{terminal_velocity}}
        self.air_resistance = {{air_resistance}}
        self.entities = []
        self.gravity_zones = []  # Special gravity areas
        
    def add_entity(self, entity):
        if entity not in self.entities:
            self.entities.append(entity)
            entity.velocity_y = getattr(entity, 'velocity_y', 0)
            entity.on_ground = getattr(entity, 'on_ground', False)
            
    def add_gravity_zone(self, x, y, width, height, gravity_multiplier):
        zone = {
            'rect': pygame.Rect(x, y, width, height),
            'multiplier': gravity_multiplier
        }
        self.gravity_zones.append(zone)
            
    def update(self, dt, platforms):
        for entity in self.entities:
            # Check for gravity zones
            current_gravity = self.gravity
            entity_rect = pygame.Rect(entity.x, entity.y, entity.width, entity.height)
            
            for zone in self.gravity_zones:
                if entity_rect.colliderect(zone['rect']):
                    current_gravity = self.gravity * zone['multiplier']
                    break
                    
            if not entity.on_ground:
                # Apply current gravity
                entity.velocity_y += current_gravity * dt
                
                # Air resistance for floaty feel
                entity.velocity_y *= (1 - self.air_resistance * dt)
                
                # Terminal velocity
                if abs(entity.velocity_y) > self.terminal_velocity:
                    entity.velocity_y = self.terminal_velocity if entity.velocity_y > 0 else -self.terminal_velocity
                    
            # Update position with interpolation for smooth movement
            entity.y += entity.velocity_y * dt
            
            # Ground collision
            entity.on_ground = False
            for platform in platforms:
                if hasattr(platform, 'rect'):
                    # Landing on platform
                    if (entity_rect.colliderect(platform.rect) and 
                        entity.velocity_y > 0 and
                        entity.y < platform.rect.centery):
                        entity.y = platform.rect.top - entity.height
                        entity.velocity_y = 0
                        entity.on_ground = True
                        break
                        
    def draw_debug(self, screen):
        # Draw gravity zones for debugging
        for zone in self.gravity_zones:
            color = (0, 100, 255) if zone['multiplier'] < 1 else (255, 100, 0)
            pygame.draw.rect(screen, color, zone['rect'], 2)`
    }
  },
  
  parameters: {
    gravity_force: 800,
    terminal_velocity: 600,
    air_resistance: 0.5
  }
};