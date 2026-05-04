import { PygameComponent } from '../types';

export const shootingComponent: PygameComponent = {
  id: 'shooting',
  name: 'Shooting System',
  category: 'combat',
  
  assetSlots: {
    character: 'platformer/characters/player.png',
    projectile: 'platformer/items/projectile.png',
    sound: 'audio/sfx/shoot.ogg',
    effect: 'effects/muzzle_flash.png'
  },
  
  variants: {
    A: {
      name: 'Rapid Fire',
      description: 'Fast shooting with cooldown',
      pythonCode: `
# Rapid Fire Shooting System
class ShootingSystem:
    def __init__(self, player):
        self.player = player
        self.projectiles = []
        self.fire_rate = {{fire_rate}}
        self.cooldown = 0
        self.projectile_speed = {{projectile_speed}}
        self.damage = {{damage}}
        self.max_projectiles = {{max_projectiles}}
        
    def update(self, keys, mouse_pos, dt):
        # Update cooldown
        if self.cooldown > 0:
            self.cooldown -= dt
            
        # Handle shooting input
        if keys[pygame.K_SPACE] or pygame.mouse.get_pressed()[0]:
            if self.cooldown <= 0 and len(self.projectiles) < self.max_projectiles:
                self.fire_projectile(mouse_pos)
                self.cooldown = 1.0 / self.fire_rate
                
        # Update projectiles
        for projectile in self.projectiles[:]:
            projectile['x'] += projectile['vx'] * dt
            projectile['y'] += projectile['vy'] * dt
            projectile['lifetime'] -= dt
            
            # Remove expired projectiles
            if projectile['lifetime'] <= 0:
                self.projectiles.remove(projectile)
            # Remove off-screen projectiles
            elif (projectile['x'] < 0 or projectile['x'] > 800 or
                  projectile['y'] < 0 or projectile['y'] > 600):
                self.projectiles.remove(projectile)
                
    def fire_projectile(self, target_pos):
        # Calculate direction
        dx = target_pos[0] - self.player.x
        dy = target_pos[1] - self.player.y
        distance = (dx**2 + dy**2) ** 0.5
        
        if distance > 0:
            dx /= distance
            dy /= distance
        else:
            dx = 1 if self.player.facing_right else -1
            dy = 0
            
        # Create projectile
        projectile = {
            'x': self.player.x + self.player.width/2,
            'y': self.player.y + self.player.height/2,
            'vx': dx * self.projectile_speed,
            'vy': dy * self.projectile_speed,
            'damage': self.damage,
            'lifetime': {{projectile_lifetime}},
            'rect': pygame.Rect(0, 0, 10, 10)
        }
        self.projectiles.append(projectile)
        
        # Play sound
        if '{{sound}}' and hasattr(self.player, 'play_sound'):
            self.player.play_sound('{{sound}}')
            
    def draw(self, screen):
        for projectile in self.projectiles:
            # Draw projectile (replace with sprite if available)
            if '{{projectile}}':
                # Would load and draw projectile sprite
                pass
            else:
                pygame.draw.circle(screen, (255, 255, 0), 
                                 (int(projectile['x']), int(projectile['y'])), 5)`
    },
    B: {
      name: 'Charge Shot',
      description: 'Hold to charge powerful shots',
      pythonCode: `
# Charge Shot System
class ShootingSystem:
    def __init__(self, player):
        self.player = player
        self.projectiles = []
        self.charge_time = 0
        self.max_charge = {{max_charge}}
        self.min_charge = {{min_charge}}
        self.is_charging = False
        self.projectile_speed = {{projectile_speed}}
        self.base_damage = {{damage}}
        
    def update(self, keys, mouse_pos, dt):
        # Handle charging
        if keys[pygame.K_SPACE] or pygame.mouse.get_pressed()[0]:
            if not self.is_charging:
                self.is_charging = True
                self.charge_time = 0
            else:
                self.charge_time = min(self.charge_time + dt, self.max_charge)
        elif self.is_charging:
            # Release charged shot
            if self.charge_time >= self.min_charge:
                self.fire_charged_projectile(mouse_pos)
            self.is_charging = False
            self.charge_time = 0
            
        # Update projectiles
        for projectile in self.projectiles[:]:
            projectile['x'] += projectile['vx'] * dt
            projectile['y'] += projectile['vy'] * dt
            projectile['lifetime'] -= dt
            
            # Charged shots have gravity
            if projectile['charged']:
                projectile['vy'] += 200 * dt  # Gravity effect
            
            # Remove expired or off-screen projectiles
            if (projectile['lifetime'] <= 0 or
                projectile['x'] < -50 or projectile['x'] > 850 or
                projectile['y'] < -50 or projectile['y'] > 650):
                self.projectiles.remove(projectile)
                
    def fire_charged_projectile(self, target_pos):
        # Calculate charge percentage
        charge_percent = self.charge_time / self.max_charge
        
        # Calculate direction
        dx = target_pos[0] - self.player.x
        dy = target_pos[1] - self.player.y
        distance = (dx**2 + dy**2) ** 0.5
        
        if distance > 0:
            dx /= distance
            dy /= distance
        else:
            dx = 1 if self.player.facing_right else -1
            dy = 0
            
        # Create charged projectile
        speed = self.projectile_speed * (1 + charge_percent)
        damage = self.base_damage * (1 + charge_percent * 2)
        size = 5 + int(15 * charge_percent)
        
        projectile = {
            'x': self.player.x + self.player.width/2,
            'y': self.player.y + self.player.height/2,
            'vx': dx * speed,
            'vy': dy * speed,
            'damage': damage,
            'size': size,
            'charged': True,
            'charge_level': charge_percent,
            'lifetime': {{projectile_lifetime}},
            'rect': pygame.Rect(0, 0, size*2, size*2)
        }
        self.projectiles.append(projectile)
        
        # Play sound with pitch based on charge
        if '{{sound}}' and hasattr(self.player, 'play_sound'):
            self.player.play_sound('{{sound}}')
            
    def draw(self, screen):
        # Draw charge indicator
        if self.is_charging:
            charge_percent = self.charge_time / self.max_charge
            bar_width = 40
            bar_height = 5
            bar_x = self.player.x
            bar_y = self.player.y - 10
            
            # Background
            pygame.draw.rect(screen, (100, 100, 100), 
                           (bar_x, bar_y, bar_width, bar_height))
            # Charge level
            color = (255, 255 - int(200 * charge_percent), 0)
            pygame.draw.rect(screen, color,
                           (bar_x, bar_y, bar_width * charge_percent, bar_height))
        
        # Draw projectiles
        for projectile in self.projectiles:
            if projectile['charged']:
                # Larger, colored projectiles for charged shots
                color = (255, 200 - int(100 * projectile['charge_level']), 0)
            else:
                color = (255, 255, 0)
                
            pygame.draw.circle(screen, color,
                             (int(projectile['x']), int(projectile['y'])),
                             projectile.get('size', 5))`
    }
  },
  
  parameters: {
    fire_rate: 5,
    projectile_speed: 300,
    damage: 10,
    max_projectiles: 10,
    projectile_lifetime: 3,
    max_charge: 2,
    min_charge: 0.3
  }
};