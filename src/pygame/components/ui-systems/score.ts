import { PygameComponent } from '../types';

export const scoreComponent: PygameComponent = {
  id: 'score',
  name: 'Score System',
  category: 'ui',
  
  assetSlots: {
    sound: 'audio/sfx/coin.ogg',
    effect: 'ui/stars.png'
  },
  
  variants: {
    A: {
      name: 'Point Collector',
      description: 'Collect items for points with combos',
      pythonCode: `
# Point Collection System with Combos
class ScoreSystem:
    def __init__(self):
        self.score = 0
        self.high_score = {{high_score}}
        self.combo_multiplier = 1
        self.combo_timer = 0
        self.combo_duration = {{combo_duration}}
        self.collectibles = []
        self.score_popups = []
        self.milestone_scores = [100, 500, 1000, 5000, 10000]
        self.milestone_index = 0
        
    def add_collectible(self, x, y, value=10, type='coin'):
        collectible = {
            'x': x,
            'y': y,
            'value': value,
            'type': type,
            'rect': pygame.Rect(x, y, 20, 20),
            'collected': False,
            'bob_offset': random.random() * 3.14
        }
        self.collectibles.append(collectible)
        
    def collect_item(self, player_rect):
        collected_this_frame = []
        
        for item in self.collectibles:
            if not item['collected'] and item['rect'].colliderect(player_rect):
                item['collected'] = True
                
                # Calculate points with multiplier
                points = item['value'] * self.combo_multiplier
                self.score += points
                
                # Update combo
                self.combo_timer = self.combo_duration
                if len(collected_this_frame) > 0:
                    self.combo_multiplier = min(self.combo_multiplier + 0.5, {{max_multiplier}})
                    
                # Add popup
                self.score_popups.append({
                    'x': item['x'],
                    'y': item['y'],
                    'value': points,
                    'timer': 1.0,
                    'combo': self.combo_multiplier > 1
                })
                
                collected_this_frame.append(item)
                
                # Play sound
                if '{{sound}}' and hasattr(player_rect, 'play_sound'):
                    # Higher pitch for combo
                    player_rect.play_sound('{{sound}}')
                    
        # Remove collected items
        self.collectibles = [c for c in self.collectibles if not c['collected']]
        
        # Check milestones
        if self.milestone_index < len(self.milestone_scores):
            if self.score >= self.milestone_scores[self.milestone_index]:
                self.milestone_index += 1
                return 'milestone_reached'
                
        return len(collected_this_frame) > 0
        
    def update(self, dt):
        # Update combo timer
        if self.combo_timer > 0:
            self.combo_timer -= dt
        else:
            self.combo_multiplier = 1
            
        # Update collectibles (bobbing animation)
        for item in self.collectibles:
            item['bob_offset'] += dt * 2
            
        # Update popups
        for popup in self.score_popups[:]:
            popup['timer'] -= dt
            popup['y'] -= 50 * dt  # Float upward
            if popup['timer'] <= 0:
                self.score_popups.remove(popup)
                
    def draw(self, screen):
        # Draw collectibles
        for item in self.collectibles:
            # Bobbing effect
            bob_y = item['y'] + math.sin(item['bob_offset']) * 5
            
            # Draw coin/item
            if item['type'] == 'coin':
                color = (255, 215, 0)
            elif item['type'] == 'gem':
                color = (0, 255, 255)
            else:
                color = (255, 255, 255)
                
            pygame.draw.circle(screen, color, 
                             (int(item['x'] + 10), int(bob_y + 10)), 8)
            pygame.draw.circle(screen, (255, 255, 255), 
                             (int(item['x'] + 10), int(bob_y + 10)), 8, 2)
                             
        # Draw score
        font = pygame.font.Font(None, 36)
        score_text = font.render(f"Score: {self.score:06d}", True, (255, 255, 255))
        screen.blit(score_text, (20, 60))
        
        # Draw combo multiplier
        if self.combo_multiplier > 1:
            combo_color = (255, int(255 - self.combo_timer * 100), 0)
            combo_text = font.render(f"x{self.combo_multiplier:.1f}", True, combo_color)
            screen.blit(combo_text, (20, 95))
            
            # Combo bar
            bar_width = 100
            bar_x = 20
            bar_y = 130
            pygame.draw.rect(screen, (50, 50, 50), (bar_x, bar_y, bar_width, 8))
            pygame.draw.rect(screen, combo_color, 
                           (bar_x, bar_y, int(bar_width * (self.combo_timer / self.combo_duration)), 8))
                           
        # Draw popups
        popup_font = pygame.font.Font(None, 24)
        for popup in self.score_popups:
            alpha = int(255 * popup['timer'])
            color = (255, 255, 0) if not popup['combo'] else (255, 100, 0)
            text = popup_font.render(f"+{popup['value']}", True, color)
            text.set_alpha(alpha)
            screen.blit(text, (popup['x'], popup['y']))`
    },
    B: {
      name: 'Wave Survival',
      description: 'Score based on survival time and enemies defeated',
      pythonCode: `
# Wave Survival Scoring System
class ScoreSystem:
    def __init__(self):
        self.score = 0
        self.wave_number = 1
        self.enemies_defeated = 0
        self.survival_time = 0
        self.time_bonus_interval = {{time_bonus_interval}}
        self.next_time_bonus = self.time_bonus_interval
        self.wave_bonus = {{wave_bonus}}
        self.enemy_values = {
            'basic': 10,
            'fast': 20,
            'tank': 50,
            'boss': 200
        }
        self.score_events = []
        self.perfect_wave = True
        
    def enemy_defeated(self, enemy_type='basic'):
        # Base points for enemy
        points = self.enemy_values.get(enemy_type, 10)
        
        # Wave multiplier
        points *= self.wave_number
        
        self.score += points
        self.enemies_defeated += 1
        
        # Add to events
        self.score_events.append({
            'text': f"{enemy_type.upper()} +{points}",
            'timer': 2.0,
            'x': 400,
            'y': 100
        })
        
        return points
        
    def complete_wave(self, player_damaged=False):
        # Wave completion bonus
        bonus = self.wave_bonus * self.wave_number
        
        # Perfect wave bonus
        if not player_damaged and self.perfect_wave:
            bonus *= 2
            self.score_events.append({
                'text': f"PERFECT WAVE! +{bonus}",
                'timer': 3.0,
                'x': 400,
                'y': 200,
                'special': True
            })
        else:
            self.score_events.append({
                'text': f"Wave {self.wave_number} Complete! +{bonus}",
                'timer': 3.0,
                'x': 400,
                'y': 200
            })
            
        self.score += bonus
        self.wave_number += 1
        self.perfect_wave = not player_damaged
        
    def update(self, dt):
        # Update survival time
        self.survival_time += dt
        
        # Time bonus
        if self.survival_time >= self.next_time_bonus:
            time_bonus = 50 * self.wave_number
            self.score += time_bonus
            self.next_time_bonus += self.time_bonus_interval
            
            self.score_events.append({
                'text': f"Survival Bonus +{time_bonus}",
                'timer': 2.0,
                'x': 400,
                'y': 150
            })
            
        # Update events
        for event in self.score_events[:]:
            event['timer'] -= dt
            event['y'] -= 30 * dt  # Float upward
            if event['timer'] <= 0:
                self.score_events.remove(event)
                
    def draw(self, screen):
        # Main score display
        font = pygame.font.Font(None, 42)
        score_text = font.render(f"{self.score:08d}", True, (255, 255, 255))
        score_rect = score_text.get_rect(topright=(780, 20))
        screen.blit(score_text, score_rect)
        
        # Wave info
        wave_font = pygame.font.Font(None, 28)
        wave_text = wave_font.render(f"Wave {self.wave_number}", True, (200, 200, 255))
        wave_rect = wave_text.get_rect(topright=(780, 65))
        screen.blit(wave_text, wave_rect)
        
        # Stats panel
        stats_font = pygame.font.Font(None, 20)
        stats = [
            f"Enemies: {self.enemies_defeated}",
            f"Time: {int(self.survival_time)}s"
        ]
        
        y_offset = 95
        for stat in stats:
            stat_text = stats_font.render(stat, True, (180, 180, 180))
            stat_rect = stat_text.get_rect(topright=(780, y_offset))
            screen.blit(stat_text, stat_rect)
            y_offset += 22
            
        # Perfect wave indicator
        if self.perfect_wave:
            perfect_text = stats_font.render("PERFECT!", True, (255, 215, 0))
            perfect_rect = perfect_text.get_rect(topright=(780, y_offset))
            
            # Pulsing effect
            pulse = abs(math.sin(pygame.time.get_ticks() * 0.005))
            perfect_text.set_alpha(int(150 + 105 * pulse))
            screen.blit(perfect_text, perfect_rect)
            
        # Draw score events
        event_font = pygame.font.Font(None, 24)
        for event in self.score_events:
            alpha = int(255 * (event['timer'] / 2.0))
            
            if event.get('special'):
                # Special events with glow
                color = (255, 215, 0)
                glow_surf = pygame.Surface((200, 40))
                glow_surf.set_alpha(alpha // 2)
                glow_surf.fill(color)
                screen.blit(glow_surf, (event['x'] - 100, event['y'] - 20))
            else:
                color = (255, 255, 255)
                
            text = event_font.render(event['text'], True, color)
            text.set_alpha(alpha)
            text_rect = text.get_rect(center=(event['x'], event['y']))
            screen.blit(text, text_rect)`
    }
  },
  
  parameters: {
    high_score: 0,
    combo_duration: 3,
    max_multiplier: 5,
    time_bonus_interval: 10,
    wave_bonus: 100
  }
};