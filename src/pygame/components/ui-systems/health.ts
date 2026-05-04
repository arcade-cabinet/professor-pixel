import { PygameComponent } from '../types';

export const healthComponent: PygameComponent = {
  id: 'health',
  name: 'Health System',
  category: 'ui',
  
  assetSlots: {
    effect: 'ui/hearts.png',
    sound: 'audio/sfx/damage.ogg'
  },
  
  variants: {
    A: {
      name: 'Heart System',
      description: 'Classic heart-based health display',
      pythonCode: `
# Heart-based Health System
class HealthSystem:
    def __init__(self, player):
        self.player = player
        self.max_health = {{max_health}}
        self.current_health = self.max_health
        self.hearts = {{heart_count}}
        self.health_per_heart = self.max_health / self.hearts
        self.invulnerable_time = 0
        self.invulnerable_duration = {{invulnerable_duration}}
        self.flash_timer = 0
        
    def take_damage(self, amount):
        if self.invulnerable_time <= 0:
            self.current_health = max(0, self.current_health - amount)
            self.invulnerable_time = self.invulnerable_duration
            
            # Play damage sound
            if '{{sound}}' and hasattr(self.player, 'play_sound'):
                self.player.play_sound('{{sound}}')
                
            # Check if dead
            if self.current_health <= 0:
                return 'dead'
        return 'alive'
        
    def heal(self, amount):
        self.current_health = min(self.max_health, self.current_health + amount)
        
    def update(self, dt):
        # Update invulnerability
        if self.invulnerable_time > 0:
            self.invulnerable_time -= dt
            self.flash_timer += dt
            
    def draw(self, screen):
        # Draw hearts
        heart_size = 32
        heart_spacing = 5
        start_x = 20
        start_y = 20
        
        for i in range(self.hearts):
            heart_x = start_x + i * (heart_size + heart_spacing)
            heart_value = (i + 1) * self.health_per_heart
            
            # Determine heart state
            if self.current_health >= heart_value:
                # Full heart
                color = (255, 0, 0)
                filled = True
            elif self.current_health > heart_value - self.health_per_heart:
                # Partial heart
                color = (255, 100, 100)
                filled = True
            else:
                # Empty heart
                color = (100, 100, 100)
                filled = False
                
            # Draw heart shape
            if filled:
                # Simplified heart shape
                pygame.draw.circle(screen, color, (heart_x + 8, start_y + 10), 8)
                pygame.draw.circle(screen, color, (heart_x + 22, start_y + 10), 8)
                pygame.draw.polygon(screen, color, [
                    (heart_x + 2, start_y + 12),
                    (heart_x + 15, start_y + 28),
                    (heart_x + 28, start_y + 12)
                ])
            else:
                # Heart outline
                pygame.draw.circle(screen, color, (heart_x + 8, start_y + 10), 8, 2)
                pygame.draw.circle(screen, color, (heart_x + 22, start_y + 10), 8, 2)
                pygame.draw.lines(screen, color, False, [
                    (heart_x + 2, start_y + 12),
                    (heart_x + 15, start_y + 28),
                    (heart_x + 28, start_y + 12)
                ], 2)
                
        # Flash effect when invulnerable
        if self.invulnerable_time > 0:
            if int(self.flash_timer * 10) % 2 == 0:
                # Flash overlay on player
                if hasattr(self.player, 'rect'):
                    flash_surf = pygame.Surface((self.player.rect.width, self.player.rect.height))
                    flash_surf.set_alpha(128)
                    flash_surf.fill((255, 255, 255))
                    screen.blit(flash_surf, (self.player.x, self.player.y))`
    },
    B: {
      name: 'Health Bar',
      description: 'Modern health bar with shield system',
      pythonCode: `
# Health Bar System with Shields
class HealthSystem:
    def __init__(self, player):
        self.player = player
        self.max_health = {{max_health}}
        self.current_health = self.max_health
        self.max_shield = {{max_shield}}
        self.current_shield = 0
        self.shield_regen_rate = {{shield_regen_rate}}
        self.shield_regen_delay = {{shield_regen_delay}}
        self.time_since_damage = 0
        self.low_health_threshold = 0.3
        
    def take_damage(self, amount):
        self.time_since_damage = 0
        
        # Damage shield first
        if self.current_shield > 0:
            shield_damage = min(amount, self.current_shield)
            self.current_shield -= shield_damage
            amount -= shield_damage
            
        # Then health
        if amount > 0:
            self.current_health = max(0, self.current_health - amount)
            
            # Play damage sound
            if '{{sound}}' and hasattr(self.player, 'play_sound'):
                self.player.play_sound('{{sound}}')
                
        # Check if dead
        if self.current_health <= 0:
            return 'dead'
        return 'alive'
        
    def heal(self, amount):
        self.current_health = min(self.max_health, self.current_health + amount)
        
    def add_shield(self, amount):
        self.current_shield = min(self.max_shield, self.current_shield + amount)
        
    def update(self, dt):
        # Shield regeneration
        self.time_since_damage += dt
        if self.time_since_damage > self.shield_regen_delay:
            if self.current_shield < self.max_shield:
                self.current_shield = min(self.max_shield, 
                                         self.current_shield + self.shield_regen_rate * dt)
                
    def draw(self, screen):
        # Bar dimensions
        bar_width = 200
        bar_height = 20
        start_x = 20
        start_y = 20
        
        # Draw background
        pygame.draw.rect(screen, (50, 50, 50), 
                        (start_x - 2, start_y - 2, bar_width + 4, bar_height + 4))
        pygame.draw.rect(screen, (30, 30, 30),
                        (start_x, start_y, bar_width, bar_height))
        
        # Draw health bar
        health_percent = self.current_health / self.max_health
        health_width = int(bar_width * health_percent)
        
        # Color based on health level
        if health_percent > 0.6:
            health_color = (0, 255, 0)
        elif health_percent > self.low_health_threshold:
            health_color = (255, 255, 0)
        else:
            # Low health - pulsing red
            pulse = abs(math.sin(pygame.time.get_ticks() * 0.005))
            health_color = (255, int(100 * pulse), int(100 * pulse))
            
        pygame.draw.rect(screen, health_color,
                        (start_x, start_y, health_width, bar_height))
        
        # Draw shield bar
        if self.max_shield > 0:
            shield_y = start_y + bar_height + 5
            shield_percent = self.current_shield / self.max_shield
            shield_width = int(bar_width * shield_percent)
            
            # Shield background
            pygame.draw.rect(screen, (30, 30, 40),
                            (start_x, shield_y, bar_width, bar_height // 2))
            
            # Shield fill with animation
            if self.time_since_damage > self.shield_regen_delay:
                # Regenerating - add glow effect
                shield_color = (100, 200, 255)
            else:
                shield_color = (0, 150, 255)
                
            pygame.draw.rect(screen, shield_color,
                            (start_x, shield_y, shield_width, bar_height // 2))
            
        # Draw text
        font = pygame.font.Font(None, 16)
        health_text = font.render(f"{int(self.current_health)}/{int(self.max_health)}", 
                                 True, (255, 255, 255))
        text_rect = health_text.get_rect(center=(start_x + bar_width // 2, start_y + bar_height // 2))
        screen.blit(health_text, text_rect)
        
        # Low health warning
        if health_percent <= self.low_health_threshold:
            warning_text = font.render("LOW HEALTH!", True, (255, 0, 0))
            screen.blit(warning_text, (start_x, start_y + bar_height + 15))`
    }
  },
  
  parameters: {
    max_health: 100,
    heart_count: 5,
    invulnerable_duration: 1.5,
    max_shield: 50,
    shield_regen_rate: 10,
    shield_regen_delay: 3
  }
};