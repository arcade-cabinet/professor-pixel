import { PygameComponent } from '../types';

export const meleeComponent: PygameComponent = {
  id: 'melee',
  name: 'Melee Combat',
  category: 'combat',
  
  assetSlots: {
    character: 'platformer/characters/player.png',
    effect: 'effects/slash.png',
    sound: 'audio/sfx/sword.ogg'
  },
  
  variants: {
    A: {
      name: 'Sword Combat',
      description: 'Slash attacks with combo system',
      pythonCode: `
# Sword Combat System with Combos
class MeleeSystem:
    def __init__(self, player):
        self.player = player
        self.attack_cooldown = 0
        self.combo_count = 0
        self.combo_timer = 0
        self.combo_window = {{combo_window}}
        self.attack_range = {{attack_range}}
        self.base_damage = {{damage}}
        self.attack_duration = {{attack_duration}}
        self.is_attacking = False
        self.attack_hitbox = None
        
    def update(self, keys, enemies, dt):
        # Update cooldowns and timers
        if self.attack_cooldown > 0:
            self.attack_cooldown -= dt
            
        if self.combo_timer > 0:
            self.combo_timer -= dt
        else:
            self.combo_count = 0
            
        # Update attack state
        if self.is_attacking:
            self.attack_duration -= dt
            if self.attack_duration <= 0:
                self.is_attacking = False
                self.attack_hitbox = None
        
        # Handle attack input
        if (keys[pygame.K_x] or keys[pygame.K_j]) and self.attack_cooldown <= 0:
            self.perform_attack(enemies)
            
    def perform_attack(self, enemies):
        # Set attack state
        self.is_attacking = True
        self.attack_duration = {{attack_duration}}
        self.attack_cooldown = {{attack_cooldown}}
        
        # Combo system
        if self.combo_timer > 0:
            self.combo_count = min(self.combo_count + 1, 3)
        else:
            self.combo_count = 1
        self.combo_timer = self.combo_window
        
        # Create attack hitbox
        if self.player.facing_right:
            self.attack_hitbox = pygame.Rect(
                self.player.x + self.player.width,
                self.player.y,
                self.attack_range,
                self.player.height
            )
        else:
            self.attack_hitbox = pygame.Rect(
                self.player.x - self.attack_range,
                self.player.y,
                self.attack_range,
                self.player.height
            )
            
        # Calculate damage based on combo
        damage = self.base_damage * (1 + (self.combo_count - 1) * 0.5)
        
        # Check for hits
        for enemy in enemies:
            if hasattr(enemy, 'rect') and self.attack_hitbox.colliderect(enemy.rect):
                enemy.take_damage(damage)
                # Knockback
                if self.player.facing_right:
                    enemy.velocity_x = {{knockback}}
                else:
                    enemy.velocity_x = -{{knockback}}
                    
        # Play sound
        if '{{sound}}' and hasattr(self.player, 'play_sound'):
            # Different sounds for different combo levels
            self.player.play_sound('{{sound}}')
            
    def draw(self, screen):
        # Draw attack effect
        if self.is_attacking and self.attack_hitbox:
            # Visual feedback for attack
            alpha = int(255 * (self.attack_duration / {{attack_duration}}))
            
            # Draw slash effect
            if self.combo_count == 1:
                color = (255, 255, 255, alpha)
            elif self.combo_count == 2:
                color = (255, 200, 0, alpha)
            else:  # combo 3+
                color = (255, 100, 0, alpha)
                
            # Create surface for transparency
            slash_surf = pygame.Surface((self.attack_hitbox.width, self.attack_hitbox.height))
            slash_surf.set_alpha(alpha)
            slash_surf.fill(color[:3])
            screen.blit(slash_surf, self.attack_hitbox.topleft)
            
            # Draw combo counter
            if self.combo_count > 1:
                font = pygame.font.Font(None, 24)
                combo_text = font.render(f"x{self.combo_count}", True, (255, 255, 0))
                screen.blit(combo_text, (self.player.x, self.player.y - 20))`
    },
    B: {
      name: 'Brawler',
      description: 'Fast punches with stun effects',
      pythonCode: `
# Brawler Combat System
class MeleeSystem:
    def __init__(self, player):
        self.player = player
        self.punch_cooldown = 0
        self.punch_range = {{attack_range}}
        self.punch_damage = {{damage}}
        self.is_punching = False
        self.punch_timer = 0
        self.stun_duration = {{stun_duration}}
        self.uppercut_charged = False
        self.charge_time = 0
        
    def update(self, keys, enemies, dt):
        # Update cooldowns
        if self.punch_cooldown > 0:
            self.punch_cooldown -= dt
            
        if self.punch_timer > 0:
            self.punch_timer -= dt
        else:
            self.is_punching = False
            
        # Handle charge for uppercut
        if keys[pygame.K_LSHIFT] and keys[pygame.K_x]:
            self.charge_time += dt
            if self.charge_time >= {{charge_required}}:
                self.uppercut_charged = True
        else:
            if self.charge_time > 0 and self.uppercut_charged:
                self.perform_uppercut(enemies)
            elif keys[pygame.K_x] or keys[pygame.K_j]:
                if self.punch_cooldown <= 0:
                    self.perform_punch(enemies)
            self.charge_time = 0
            self.uppercut_charged = False
            
    def perform_punch(self, enemies):
        # Quick jab
        self.is_punching = True
        self.punch_timer = 0.1
        self.punch_cooldown = {{attack_cooldown}}
        
        # Create hitbox
        if self.player.facing_right:
            hitbox = pygame.Rect(
                self.player.x + self.player.width,
                self.player.y + self.player.height//3,
                self.punch_range * 0.7,
                self.player.height//3
            )
        else:
            hitbox = pygame.Rect(
                self.player.x - self.punch_range * 0.7,
                self.player.y + self.player.height//3,
                self.punch_range * 0.7,
                self.player.height//3
            )
            
        # Check hits
        for enemy in enemies:
            if hasattr(enemy, 'rect') and hitbox.colliderect(enemy.rect):
                enemy.take_damage(self.punch_damage)
                # Brief stun
                if hasattr(enemy, 'stun'):
                    enemy.stun(self.stun_duration * 0.5)
                    
        # Sound
        if '{{sound}}' and hasattr(self.player, 'play_sound'):
            self.player.play_sound('{{sound}}')
            
    def perform_uppercut(self, enemies):
        # Powerful uppercut
        self.is_punching = True
        self.punch_timer = 0.3
        self.punch_cooldown = {{attack_cooldown}} * 2
        
        # Larger hitbox
        if self.player.facing_right:
            hitbox = pygame.Rect(
                self.player.x + self.player.width,
                self.player.y - 10,
                self.punch_range,
                self.player.height + 20
            )
        else:
            hitbox = pygame.Rect(
                self.player.x - self.punch_range,
                self.player.y - 10,
                self.punch_range,
                self.player.height + 20
            )
            
        # Check hits with knockup
        for enemy in enemies:
            if hasattr(enemy, 'rect') and hitbox.colliderect(enemy.rect):
                enemy.take_damage(self.punch_damage * 2)
                # Launch enemy upward
                if hasattr(enemy, 'velocity_y'):
                    enemy.velocity_y = -{{knockback}} * 2
                # Longer stun
                if hasattr(enemy, 'stun'):
                    enemy.stun(self.stun_duration)
                    
    def draw(self, screen):
        # Draw punch effect
        if self.is_punching:
            # Impact effect
            effect_x = self.player.x + (self.player.width if self.player.facing_right else 0)
            effect_y = self.player.y + self.player.height//2
            
            radius = int(10 + 10 * (1 - self.punch_timer * 10))
            if radius > 0:
                pygame.draw.circle(screen, (255, 255, 100), (effect_x, effect_y), radius, 2)
                
        # Draw charge indicator
        if self.charge_time > 0:
            charge_percent = min(self.charge_time / {{charge_required}}, 1.0)
            bar_y = self.player.y - 15
            
            # Background bar
            pygame.draw.rect(screen, (50, 50, 50), 
                           (self.player.x, bar_y, 40, 4))
            # Charge level
            color = (255, int(255 * (1-charge_percent)), 0)
            pygame.draw.rect(screen, color,
                           (self.player.x, bar_y, 40 * charge_percent, 4))
                           
            # Flash when ready
            if self.uppercut_charged:
                pygame.draw.rect(screen, (255, 255, 0),
                               (self.player.x - 2, bar_y - 2, 44, 8), 2)`
    }
  },
  
  parameters: {
    attack_range: 50,
    damage: 15,
    attack_duration: 0.2,
    attack_cooldown: 0.5,
    combo_window: 0.8,
    knockback: 200,
    stun_duration: 0.5,
    charge_required: 0.8
  }
};