// Game Building Blocks - Modular components for creating unique games
// Each component has A/B choices that fundamentally change how the game plays

export interface ComponentChoice {
  component: string;
  choice: 'A' | 'B';
}

export interface ComponentOption {
  title: string;
  description: string;
  features: string[];
  pythonCode: string;
  preview?: string;
}

export interface GameComponent {
  id: string;
  title: string;
  description: string;
  optionA: ComponentOption;
  optionB: ComponentOption;
}

// Define all game components with their Python implementations
export const gameComponents: GameComponent[] = [
  {
    id: 'combat',
    title: 'Combat System',
    description: 'How battles work in your game',
    optionA: {
      title: 'Real-time Combat',
      description: 'Fast-paced action with instant reactions',
      features: ['Health bars', 'Collision damage', 'Cooldown timers', 'Dodge mechanics'],
      pythonCode: `# Real-time Combat System
class CombatSystem:
    def __init__(self):
        self.enemies = []
        self.projectiles = []
        self.damage_cooldown = 0
        
    def add_enemy(self, x, y, health=100):
        enemy = {
            'x': x, 'y': y,
            'health': health,
            'max_health': health,
            'damage': 10,
            'rect': pygame.Rect(x, y, 40, 40)
        }
        self.enemies.append(enemy)
        
    def check_collision_damage(self, player_rect):
        """Check if player touches enemy and return damage amount"""
        if self.damage_cooldown <= 0:
            for enemy in self.enemies:
                if player_rect.colliderect(enemy['rect']):
                    self.damage_cooldown = 60  # 1 second at 60 FPS
                    return enemy['damage']  # Return damage to be applied
        else:
            self.damage_cooldown -= 1
        return 0  # No damage this frame
    
    def fire_projectile(self, x, y, direction):
        """Create a projectile for ranged attacks"""
        projectile = {
            'x': x, 'y': y,
            'vel_x': direction[0] * 10,
            'vel_y': direction[1] * 10,
            'damage': 25,
            'rect': pygame.Rect(x, y, 10, 10)
        }
        self.projectiles.append(projectile)
    
    def update_combat(self, player_rect):
        # Update projectiles
        for projectile in self.projectiles[:]:
            projectile['x'] += projectile['vel_x']
            projectile['y'] += projectile['vel_y']
            projectile['rect'].x = projectile['x']
            projectile['rect'].y = projectile['y']
            
            # Check projectile hits
            for enemy in self.enemies:
                if projectile['rect'].colliderect(enemy['rect']):
                    enemy['health'] -= projectile['damage']
                    if projectile in self.projectiles:
                        self.projectiles.remove(projectile)
                    break
            
            # Remove off-screen projectiles
            if (projectile['x'] < 0 or projectile['x'] > 800 or
                projectile['y'] < 0 or projectile['y'] > 600):
                if projectile in self.projectiles:
                    self.projectiles.remove(projectile)
        
        # Remove defeated enemies
        self.enemies = [e for e in self.enemies if e['health'] > 0]
        
        # Check collision damage (damage is handled elsewhere)
        # Note: Collision detection only, damage applied in main game loop
    
    def draw_combat(self, screen):
        # Draw enemies with health bars
        for enemy in self.enemies:
            # Enemy body
            pygame.draw.rect(screen, (200, 50, 50), enemy['rect'])
            
            # Health bar
            bar_width = 40
            bar_height = 5
            health_percent = enemy['health'] / enemy['max_health']
            pygame.draw.rect(screen, (100, 0, 0), 
                           (enemy['x'], enemy['y'] - 10, bar_width, bar_height))
            pygame.draw.rect(screen, (0, 255, 0),
                           (enemy['x'], enemy['y'] - 10, 
                            bar_width * health_percent, bar_height))
        
        # Draw projectiles
        for projectile in self.projectiles:
            pygame.draw.circle(screen, (255, 255, 0),
                             (int(projectile['x']), int(projectile['y'])), 5)`,
    },
    optionB: {
      title: 'Turn-based Combat',
      description: 'Strategic battles with planned moves',
      features: ['Action points', 'Turn order', 'Move selection', 'Strategy planning'],
      pythonCode: `# Turn-based Combat System
class CombatSystem:
    def __init__(self):
        self.enemies = []
        self.turn_order = []
        self.current_turn = 0
        self.player_actions = []
        self.action_points = 3
        self.combat_active = False
        
    def add_enemy(self, name, health=100, speed=5):
        enemy = {
            'name': name,
            'health': health,
            'max_health': health,
            'speed': speed,
            'attack': 20,
            'defense': 5,
            'is_player': False
        }
        self.enemies.append(enemy)
        
    def start_combat(self, player):
        """Initialize combat encounter"""
        self.combat_active = True
        # Create turn order based on speed
        all_units = [player] + self.enemies
        self.turn_order = sorted(all_units, 
                                key=lambda x: x.get('speed', 5), 
                                reverse=True)
        self.current_turn = 0
        self.action_points = 3
        
    def get_current_unit(self):
        """Get whose turn it is"""
        if self.turn_order:
            return self.turn_order[self.current_turn % len(self.turn_order)]
        return None
        
    def execute_action(self, action_type, source, target):
        """Execute a combat action"""
        if action_type == 'attack':
            damage = max(1, source['attack'] - target.get('defense', 0))
            target['health'] -= damage
            return f"{source.get('name', 'Player')} deals {damage} damage!"
            
        elif action_type == 'defend':
            source['defense'] = source.get('defense', 5) + 10
            return f"{source.get('name', 'Player')} raises defense!"
            
        elif action_type == 'heal':
            heal_amount = 30
            source['health'] = min(source['max_health'], 
                                  source['health'] + heal_amount)
            return f"{source.get('name', 'Player')} heals {heal_amount} HP!"
        
        return "Unknown action"
    
    def enemy_turn(self, enemy, player):
        """AI for enemy turns"""
        # Simple AI: attack if healthy, heal if low
        if enemy['health'] < enemy['max_health'] * 0.3:
            return self.execute_action('heal', enemy, enemy)
        else:
            return self.execute_action('attack', enemy, player)
    
    def next_turn(self):
        """Move to next turn"""
        self.current_turn += 1
        current = self.get_current_unit()
        
        if current and current.get('is_player', True):
            self.action_points = 3
        
        # Remove defeated enemies
        self.enemies = [e for e in self.enemies if e['health'] > 0]
        self.turn_order = [u for u in self.turn_order if u['health'] > 0]
        
        # Check if combat is over
        if not self.enemies:
            self.combat_active = False
            return "Victory!"
        elif not any(u.get('is_player', True) for u in self.turn_order):
            self.combat_active = False
            return "Defeat!"
            
        return None
    
    def update_combat(self, player_rect):
        """Update turn-based combat system"""
        if not self.combat_active:
            # Check if should start combat (example: player near enemy)
            for enemy in self.enemies:
                enemy_rect = pygame.Rect(enemy.get('x', 0), enemy.get('y', 0), 40, 40)
                if player_rect.colliderect(enemy_rect):
                    # Mock player data for turn-based combat
                    player = {
                        'name': 'Player',
                        'health': 100,
                        'max_health': 100,
                        'speed': 10,
                        'attack': 25,
                        'defense': 10,
                        'is_player': True
                    }
                    self.start_combat(player)
                    break
        else:
            # Handle ongoing combat
            current = self.get_current_unit()
            if current and not current.get('is_player', True):
                # AI turn - automatically execute
                player = next((u for u in self.turn_order if u.get('is_player', True)), None)
                if player:
                    self.enemy_turn(current, player)
                    self.next_turn()
    
    def draw_combat(self, screen):
        """Draw turn-based combat interface"""
        if not self.combat_active:
            return
            
        # Create font for drawing
        font = pygame.font.Font(None, 24)
            
        # Draw turn order
        y_offset = 20
        for i, unit in enumerate(self.turn_order):
            color = (255, 255, 0) if i == self.current_turn % len(self.turn_order) else (200, 200, 200)
            name = unit.get('name', 'Player')
            health = unit['health']
            max_health = unit['max_health']
            
            text = font.render(f"{name}: {health}/{max_health} HP", True, color)
            screen.blit(text, (600, y_offset))
            y_offset += 30
        
        # Draw action points
        current = self.get_current_unit()
        if current and current.get('is_player', True):
            ap_text = font.render(f"Action Points: {self.action_points}", True, (255, 255, 255))
            screen.blit(ap_text, (20, 500))
            
            # Draw action menu
            actions = ['Attack (1 AP)', 'Defend (1 AP)', 'Heal (2 AP)', 'End Turn']
            for i, action in enumerate(actions):
                color = (255, 255, 255) if i < 3 and self.action_points > 0 else (100, 100, 100)
                action_text = font.render(f"{i+1}. {action}", True, color)
                screen.blit(action_text, (20, 530 + i * 25))`,
    },
  },

  {
    id: 'inventory',
    title: 'Inventory System',
    description: 'How players manage items and equipment',
    optionA: {
      title: 'Grid-based Inventory',
      description: 'Visual grid with drag-and-drop functionality',
      features: ['Limited slots', 'Item stacking', 'Visual organization', 'Quick slots'],
      pythonCode: `# Grid-based Inventory System
class InventorySystem:
    def __init__(self, rows=5, cols=8):
        self.rows = rows
        self.cols = cols
        self.grid = [[None for _ in range(cols)] for _ in range(rows)]
        self.selected_item = None
        self.quick_slots = [None] * 5  # 5 quick access slots
        
    def add_item(self, item):
        """Add item to first available slot"""
        # Check if item can stack with existing
        if item.get('stackable', False):
            for row in range(self.rows):
                for col in range(self.cols):
                    slot = self.grid[row][col]
                    if slot and slot['id'] == item['id']:
                        if slot['quantity'] < slot.get('max_stack', 99):
                            slot['quantity'] += 1
                            return True
        
        # Find empty slot
        for row in range(self.rows):
            for col in range(self.cols):
                if self.grid[row][col] is None:
                    self.grid[row][col] = {
                        'id': item['id'],
                        'name': item['name'],
                        'icon': item.get('icon', '?'),
                        'quantity': 1,
                        'stackable': item.get('stackable', False),
                        'max_stack': item.get('max_stack', 99),
                        'type': item.get('type', 'misc')
                    }
                    return True
        return False  # Inventory full
    
    def remove_item(self, row, col):
        """Remove item from specific slot"""
        if 0 <= row < self.rows and 0 <= col < self.cols:
            item = self.grid[row][col]
            if item:
                if item.get('quantity', 1) > 1:
                    item['quantity'] -= 1
                else:
                    self.grid[row][col] = None
                return item
        return None
    
    def move_item(self, from_pos, to_pos):
        """Move item between slots"""
        from_row, from_col = from_pos
        to_row, to_col = to_pos
        
        # Validate positions
        if not (0 <= from_row < self.rows and 0 <= from_col < self.cols):
            return False
        if not (0 <= to_row < self.rows and 0 <= to_col < self.cols):
            return False
            
        # Swap items
        self.grid[to_row][to_col], self.grid[from_row][from_col] = \
            self.grid[from_row][from_col], self.grid[to_row][to_col]
        return True
    
    def set_quick_slot(self, slot_index, row, col):
        """Assign item to quick access slot"""
        if 0 <= slot_index < len(self.quick_slots):
            if 0 <= row < self.rows and 0 <= col < self.cols:
                self.quick_slots[slot_index] = (row, col)
                return True
        return False
    
    def use_quick_slot(self, slot_index):
        """Use item from quick slot"""
        if 0 <= slot_index < len(self.quick_slots):
            if self.quick_slots[slot_index]:
                row, col = self.quick_slots[slot_index]
                return self.grid[row][col]
        return None
    
    def draw_inventory(self, screen, x, y, cell_size=40):
        """Draw inventory grid"""
        # Draw grid background
        width = self.cols * cell_size
        height = self.rows * cell_size
        pygame.draw.rect(screen, (50, 50, 50), (x, y, width, height))
        
        # Draw grid cells and items
        for row in range(self.rows):
            for col in range(self.cols):
                cell_x = x + col * cell_size
                cell_y = y + row * cell_size
                
                # Draw cell border
                pygame.draw.rect(screen, (100, 100, 100), 
                               (cell_x, cell_y, cell_size, cell_size), 2)
                
                # Draw item if present
                item = self.grid[row][col]
                if item:
                    # Draw item icon/text
                    font = pygame.font.Font(None, 24)
                    text = font.render(item['icon'], True, (255, 255, 255))
                    text_rect = text.get_rect(center=(cell_x + cell_size//2, 
                                                     cell_y + cell_size//2))
                    screen.blit(text, text_rect)
                    
                    # Draw quantity if stackable
                    if item.get('quantity', 1) > 1:
                        qty_font = pygame.font.Font(None, 16)
                        qty_text = qty_font.render(str(item['quantity']), 
                                                  True, (255, 255, 0))
                        screen.blit(qty_text, (cell_x + 2, cell_y + 2))
        
        # Draw quick slots
        quick_y = y + height + 10
        for i, slot in enumerate(self.quick_slots):
            slot_x = x + i * (cell_size + 5)
            pygame.draw.rect(screen, (80, 80, 80),
                           (slot_x, quick_y, cell_size, cell_size))
            pygame.draw.rect(screen, (150, 150, 0),
                           (slot_x, quick_y, cell_size, cell_size), 2)
            
            # Draw quick slot number
            font = pygame.font.Font(None, 16)
            num_text = font.render(str(i+1), True, (255, 255, 255))
            screen.blit(num_text, (slot_x + 2, quick_y + 2))
            
            # Draw item in quick slot
            if slot:
                row, col = slot
                item = self.grid[row][col]
                if item:
                    icon_font = pygame.font.Font(None, 20)
                    icon_text = icon_font.render(item['icon'], True, (255, 255, 255))
                    icon_rect = icon_text.get_rect(center=(slot_x + cell_size//2,
                                                          quick_y + cell_size//2))
                    screen.blit(icon_text, icon_rect)`,
    },
    optionB: {
      title: 'List-based Inventory',
      description: 'Organized categories with unlimited storage',
      features: ['Item categories', 'Unlimited items', 'Search & filter', 'Auto-sorting'],
      pythonCode: `# List-based Inventory System  
class InventorySystem:
    def __init__(self):
        self.items = []
        self.categories = {
            'weapons': [],
            'armor': [],
            'consumables': [],
            'materials': [],
            'quest': [],
            'misc': []
        }
        self.quick_bar = []  # Quick access items
        self.max_quick_bar = 8
        self.current_category = 'all'
        self.sort_by = 'name'  # name, quantity, type
        
    def add_item(self, item):
        """Add item to inventory"""
        # Check if item already exists
        existing = next((i for i in self.items if i['id'] == item['id']), None)
        
        if existing and existing.get('stackable', False):
            existing['quantity'] += item.get('quantity', 1)
        else:
            new_item = {
                'id': item['id'],
                'name': item['name'],
                'category': item.get('category', 'misc'),
                'quantity': item.get('quantity', 1),
                'stackable': item.get('stackable', False),
                'description': item.get('description', ''),
                'value': item.get('value', 0),
                'icon': item.get('icon', '?')
            }
            self.items.append(new_item)
            
            # Add to category list
            category = new_item['category']
            if category in self.categories:
                self.categories[category].append(new_item)
        
        # Auto-sort after adding
        self.sort_inventory()
        return True
    
    def remove_item(self, item_id, quantity=1):
        """Remove item from inventory"""
        item = next((i for i in self.items if i['id'] == item_id), None)
        
        if item:
            if item.get('quantity', 1) > quantity:
                item['quantity'] -= quantity
            else:
                self.items.remove(item)
                # Remove from category
                category = item.get('category', 'misc')
                if category in self.categories and item in self.categories[category]:
                    self.categories[category].remove(item)
                # Remove from quick bar if present
                if item in self.quick_bar:
                    self.quick_bar.remove(item)
            return True
        return False
    
    def get_items_by_category(self, category):
        """Get all items in a category"""
        if category == 'all':
            return self.items
        return self.categories.get(category, [])
    
    def search_items(self, search_term):
        """Search items by name or description"""
        search_term = search_term.lower()
        return [item for item in self.items 
                if search_term in item['name'].lower() or 
                   search_term in item.get('description', '').lower()]
    
    def sort_inventory(self):
        """Sort inventory by current sort method"""
        if self.sort_by == 'name':
            self.items.sort(key=lambda x: x['name'])
        elif self.sort_by == 'quantity':
            self.items.sort(key=lambda x: x.get('quantity', 1), reverse=True)
        elif self.sort_by == 'type':
            self.items.sort(key=lambda x: x.get('category', 'misc'))
        elif self.sort_by == 'value':
            self.items.sort(key=lambda x: x.get('value', 0), reverse=True)
    
    def add_to_quick_bar(self, item_id):
        """Add item to quick access bar"""
        if len(self.quick_bar) < self.max_quick_bar:
            item = next((i for i in self.items if i['id'] == item_id), None)
            if item and item not in self.quick_bar:
                self.quick_bar.append(item)
                return True
        return False
    
    def use_quick_bar_item(self, index):
        """Use item from quick bar"""
        if 0 <= index < len(self.quick_bar):
            return self.quick_bar[index]
        return None
    
    def get_total_value(self):
        """Calculate total inventory value"""
        return sum(item.get('value', 0) * item.get('quantity', 1) 
                  for item in self.items)
    
    def draw_inventory_list(self, screen, x, y, width=300, height=400):
        """Draw list-based inventory"""
        # Draw background
        pygame.draw.rect(screen, (40, 40, 40), (x, y, width, height))
        pygame.draw.rect(screen, (100, 100, 100), (x, y, width, height), 2)
        
        # Draw category tabs
        categories = ['all'] + list(self.categories.keys())
        tab_width = width // len(categories)
        font = pygame.font.Font(None, 16)
        
        for i, cat in enumerate(categories):
            tab_x = x + i * tab_width
            tab_color = (80, 80, 80) if cat == self.current_category else (60, 60, 60)
            pygame.draw.rect(screen, tab_color, (tab_x, y, tab_width, 25))
            pygame.draw.rect(screen, (100, 100, 100), (tab_x, y, tab_width, 25), 1)
            
            text = font.render(cat.capitalize()[:5], True, (255, 255, 255))
            text_rect = text.get_rect(center=(tab_x + tab_width//2, y + 12))
            screen.blit(text, text_rect)
        
        # Draw item list
        items_to_show = self.get_items_by_category(self.current_category)
        item_y = y + 30
        item_height = 30
        max_items = (height - 30) // item_height
        
        item_font = pygame.font.Font(None, 18)
        for i, item in enumerate(items_to_show[:max_items]):
            # Alternating row colors
            row_color = (50, 50, 50) if i % 2 == 0 else (45, 45, 45)
            pygame.draw.rect(screen, row_color, 
                           (x + 5, item_y, width - 10, item_height - 2))
            
            # Draw item icon
            icon_text = item_font.render(item['icon'], True, (255, 255, 255))
            screen.blit(icon_text, (x + 10, item_y + 5))
            
            # Draw item name
            name = item['name'][:20]  # Truncate long names
            name_text = item_font.render(name, True, (255, 255, 255))
            screen.blit(name_text, (x + 35, item_y + 5))
            
            # Draw quantity
            if item.get('quantity', 1) > 1:
                qty_text = item_font.render(f"x{item['quantity']}", 
                                           True, (255, 255, 0))
                screen.blit(qty_text, (x + width - 50, item_y + 5))
            
            item_y += item_height
        
        # Draw quick bar
        quick_y = y + height + 10
        for i in range(self.max_quick_bar):
            slot_x = x + i * 35
            slot_color = (60, 60, 60)
            pygame.draw.rect(screen, slot_color, (slot_x, quick_y, 32, 32))
            pygame.draw.rect(screen, (150, 150, 0), (slot_x, quick_y, 32, 32), 2)
            
            # Draw slot number
            num_text = font.render(str(i+1), True, (200, 200, 200))
            screen.blit(num_text, (slot_x + 2, quick_y + 2))
            
            # Draw item in slot
            if i < len(self.quick_bar):
                item = self.quick_bar[i]
                icon_text = item_font.render(item['icon'], True, (255, 255, 255))
                icon_rect = icon_text.get_rect(center=(slot_x + 16, quick_y + 16))
                screen.blit(icon_text, icon_rect)`,
    },
  },

  {
    id: 'movement',
    title: 'Movement System',
    description: 'How characters move around the game world',
    optionA: {
      title: 'Smooth Movement',
      description: 'Physics-based movement with acceleration',
      features: ['Velocity & acceleration', 'Smooth animations', 'Momentum', 'Air control'],
      pythonCode: `# Smooth Movement System
class MovementSystem:
    def __init__(self, entity):
        self.entity = entity
        self.velocity = pygame.Vector2(0, 0)
        self.acceleration = pygame.Vector2(0, 0)
        self.position = pygame.Vector2(entity.x, entity.y)
        
        # Movement parameters
        self.max_speed = 5
        self.acceleration_rate = 0.5
        self.friction = 0.9
        self.air_friction = 0.95
        self.jump_power = -12
        self.gravity = 0.5
        self.max_fall_speed = 15
        
        # State tracking
        self.on_ground = False
        self.facing_right = True
        self.is_jumping = False
        self.double_jump_available = True
        
    def apply_force(self, force_x, force_y):
        """Apply external force to entity"""
        self.acceleration.x += force_x
        self.acceleration.y += force_y
    
    def handle_input(self):
        """Process movement input"""
        keys = pygame.key.get_pressed()
        
        # Horizontal movement
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.acceleration.x = -self.acceleration_rate
            self.facing_right = False
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.acceleration.x = self.acceleration_rate
            self.facing_right = True
        else:
            # Apply friction when no input
            self.acceleration.x = 0
            if self.on_ground:
                self.velocity.x *= self.friction
            else:
                self.velocity.x *= self.air_friction
        
        # Jumping
        if keys[pygame.K_SPACE] or keys[pygame.K_w]:
            if self.on_ground:
                self.jump()
            elif self.double_jump_available and not self.on_ground:
                self.double_jump()
    
    def jump(self):
        """Perform a jump"""
        self.velocity.y = self.jump_power
        self.is_jumping = True
        self.on_ground = False
        self.double_jump_available = True
    
    def double_jump(self):
        """Perform a double jump"""
        self.velocity.y = self.jump_power * 0.8  # Slightly weaker
        self.double_jump_available = False
    
    def apply_gravity(self):
        """Apply gravity to vertical movement"""
        if not self.on_ground:
            self.velocity.y += self.gravity
            # Terminal velocity
            if self.velocity.y > self.max_fall_speed:
                self.velocity.y = self.max_fall_speed
    
    def update_position(self, platforms=[]):
        """Update position based on velocity"""
        # Apply acceleration to velocity
        self.velocity += self.acceleration
        
        # Limit horizontal speed
        if abs(self.velocity.x) > self.max_speed:
            self.velocity.x = self.max_speed if self.velocity.x > 0 else -self.max_speed
        
        # Apply gravity
        self.apply_gravity()
        
        # Update position
        self.position += self.velocity
        
        # Check ground collision
        self.check_platform_collision(platforms)
        
        # Update entity position
        self.entity.x = int(self.position.x)
        self.entity.y = int(self.position.y)
        
        # Reset acceleration for next frame
        self.acceleration = pygame.Vector2(0, 0)
    
    def check_platform_collision(self, platforms):
        """Check collision with platforms"""
        entity_rect = pygame.Rect(self.position.x, self.position.y, 
                                 self.entity.width, self.entity.height)
        
        self.on_ground = False
        
        for platform in platforms:
            if entity_rect.colliderect(platform):
                # Landing on top of platform
                if self.velocity.y > 0 and self.position.y < platform.centery:
                    self.position.y = platform.top - self.entity.height
                    self.velocity.y = 0
                    self.on_ground = True
                    self.double_jump_available = True
                    self.is_jumping = False
                
                # Hitting bottom of platform
                elif self.velocity.y < 0 and self.position.y > platform.centery:
                    self.position.y = platform.bottom
                    self.velocity.y = 0
                
                # Side collisions
                else:
                    if self.velocity.x > 0:  # Moving right
                        self.position.x = platform.left - self.entity.width
                    elif self.velocity.x < 0:  # Moving left
                        self.position.x = platform.right
                    self.velocity.x = 0
    
    def dash(self, direction):
        """Perform a dash move"""
        dash_power = 15
        if direction == 'right':
            self.velocity.x = dash_power
        elif direction == 'left':
            self.velocity.x = -dash_power
        elif direction == 'up':
            self.velocity.y = -dash_power
        elif direction == 'down' and not self.on_ground:
            self.velocity.y = dash_power
    
    def get_movement_state(self):
        """Get current movement state for animation"""
        if not self.on_ground:
            if self.velocity.y < 0:
                return 'jumping'
            else:
                return 'falling'
        elif abs(self.velocity.x) > 0.5:
            return 'running'
        else:
            return 'idle'
    
    def draw_debug_info(self, screen, font):
        """Draw movement debug information"""
        debug_info = [
            f"Pos: ({int(self.position.x)}, {int(self.position.y)})",
            f"Vel: ({self.velocity.x:.1f}, {self.velocity.y:.1f})",
            f"On Ground: {self.on_ground}",
            f"State: {self.get_movement_state()}",
            f"Facing: {'Right' if self.facing_right else 'Left'}"
        ]
        
        y_offset = 10
        for info in debug_info:
            text = font.render(info, True, (255, 255, 255))
            screen.blit(text, (10, y_offset))
            y_offset += 20`,
    },
    optionB: {
      title: 'Grid Movement',
      description: 'Tile-based movement like classic RPGs',
      features: ['Tile snapping', 'Cardinal directions', 'Instant movement', 'Grid pathfinding'],
      pythonCode: `# Grid Movement System
class MovementSystem:
    def __init__(self, entity, tile_size=32):
        self.entity = entity
        self.tile_size = tile_size
        self.grid_x = entity.x // tile_size
        self.grid_y = entity.y // tile_size
        
        # Movement parameters
        self.move_speed = 4  # Tiles per second
        self.move_cooldown = 0
        self.move_delay = 15  # Frames between moves
        
        # Animation
        self.is_moving = False
        self.move_progress = 0
        self.move_from = (self.grid_x, self.grid_y)
        self.move_to = (self.grid_x, self.grid_y)
        self.facing = 'down'  # up, down, left, right
        
        # Grid tracking
        self.blocked_tiles = set()
        self.interactive_tiles = {}
        
    def set_grid_position(self, grid_x, grid_y):
        """Set position on grid"""
        self.grid_x = grid_x
        self.grid_y = grid_y
        self.entity.x = grid_x * self.tile_size
        self.entity.y = grid_y * self.tile_size
    
    def add_blocked_tile(self, grid_x, grid_y):
        """Mark a tile as blocked"""
        self.blocked_tiles.add((grid_x, grid_y))
    
    def add_interactive_tile(self, grid_x, grid_y, interaction):
        """Add an interactive tile (door, chest, etc)"""
        self.interactive_tiles[(grid_x, grid_y)] = interaction
    
    def can_move_to(self, grid_x, grid_y):
        """Check if tile is walkable"""
        # Check bounds (example map size)
        if grid_x < 0 or grid_x >= 25 or grid_y < 0 or grid_y >= 19:
            return False
        
        # Check if tile is blocked
        if (grid_x, grid_y) in self.blocked_tiles:
            return False
        
        return True
    
    def handle_input(self):
        """Process grid movement input"""
        if self.is_moving or self.move_cooldown > 0:
            return
        
        keys = pygame.key.get_pressed()
        new_x, new_y = self.grid_x, self.grid_y
        
        # Determine movement direction
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            new_y -= 1
            self.facing = 'up'
        elif keys[pygame.K_DOWN] or keys[pygame.K_s]:
            new_y += 1
            self.facing = 'down'
        elif keys[pygame.K_LEFT] or keys[pygame.K_a]:
            new_x -= 1
            self.facing = 'left'
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            new_x += 1
            self.facing = 'right'
        else:
            return
        
        # Try to move
        if self.can_move_to(new_x, new_y):
            self.start_move(new_x, new_y)
        else:
            # Just change facing direction if blocked
            self.move_cooldown = self.move_delay // 2
    
    def start_move(self, target_x, target_y):
        """Begin movement to target tile"""
        self.is_moving = True
        self.move_progress = 0
        self.move_from = (self.grid_x, self.grid_y)
        self.move_to = (target_x, target_y)
    
    def update_position(self, platforms=None):
        """Update smooth movement between tiles
        
        Args:
            platforms: List of platform rectangles (unused in grid movement)
        """
        if self.move_cooldown > 0:
            self.move_cooldown -= 1
        
        if self.is_moving:
            # Smooth movement animation
            self.move_progress += 1.0 / self.move_delay
            
            if self.move_progress >= 1.0:
                # Movement complete
                self.grid_x = self.move_to[0]
                self.grid_y = self.move_to[1]
                self.entity.x = self.grid_x * self.tile_size
                self.entity.y = self.grid_y * self.tile_size
                
                self.is_moving = False
                self.move_cooldown = self.move_delay
                
                # Check for tile interactions
                self.check_tile_interaction()
            else:
                # Interpolate position
                from_x = self.move_from[0] * self.tile_size
                from_y = self.move_from[1] * self.tile_size
                to_x = self.move_to[0] * self.tile_size
                to_y = self.move_to[1] * self.tile_size
                
                # Smooth easing
                t = self.ease_in_out(self.move_progress)
                self.entity.x = int(from_x + (to_x - from_x) * t)
                self.entity.y = int(from_y + (to_y - from_y) * t)
    
    def ease_in_out(self, t):
        """Smooth easing function for movement"""
        if t < 0.5:
            return 2 * t * t
        return -1 + (4 - 2 * t) * t
    
    def check_tile_interaction(self):
        """Check if current tile has interaction"""
        current_tile = (self.grid_x, self.grid_y)
        if current_tile in self.interactive_tiles:
            interaction = self.interactive_tiles[current_tile]
            return interaction
        return None
    
    def find_path(self, target_x, target_y):
        """Simple A* pathfinding to target"""
        from queue import PriorityQueue
        
        start = (self.grid_x, self.grid_y)
        goal = (target_x, target_y)
        
        frontier = PriorityQueue()
        frontier.put((0, start))
        came_from = {start: None}
        cost_so_far = {start: 0}
        
        while not frontier.empty():
            current = frontier.get()[1]
            
            if current == goal:
                break
            
            # Check all 4 directions
            for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                next_pos = (current[0] + dx, current[1] + dy)
                
                if not self.can_move_to(next_pos[0], next_pos[1]):
                    continue
                
                new_cost = cost_so_far[current] + 1
                
                if next_pos not in cost_so_far or new_cost < cost_so_far[next_pos]:
                    cost_so_far[next_pos] = new_cost
                    priority = new_cost + self.heuristic(goal, next_pos)
                    frontier.put((priority, next_pos))
                    came_from[next_pos] = current
        
        # Reconstruct path
        if goal not in came_from:
            return []  # No path found
        
        path = []
        current = goal
        while current != start:
            path.append(current)
            current = came_from[current]
        path.reverse()
        return path
    
    def heuristic(self, a, b):
        """Manhattan distance heuristic"""
        return abs(a[0] - b[0]) + abs(a[1] - b[1])
    
    def draw_grid(self, screen, camera_x=0, camera_y=0):
        """Draw grid lines for debugging"""
        # Draw grid
        for x in range(0, 800, self.tile_size):
            pygame.draw.line(screen, (50, 50, 50), 
                           (x - camera_x, 0), 
                           (x - camera_x, 600), 1)
        for y in range(0, 600, self.tile_size):
            pygame.draw.line(screen, (50, 50, 50), 
                           (0, y - camera_y), 
                           (800, y - camera_y), 1)
        
        # Draw blocked tiles
        for (bx, by) in self.blocked_tiles:
            rect = pygame.Rect(bx * self.tile_size - camera_x,
                              by * self.tile_size - camera_y,
                              self.tile_size, self.tile_size)
            pygame.draw.rect(screen, (100, 0, 0), rect, 2)
        
        # Draw interactive tiles
        for (ix, iy) in self.interactive_tiles:
            rect = pygame.Rect(ix * self.tile_size - camera_x,
                              iy * self.tile_size - camera_y,
                              self.tile_size, self.tile_size)
            pygame.draw.rect(screen, (0, 100, 200), rect, 2)`,
    },
  },

  {
    id: 'progression',
    title: 'Character Progression',
    description: 'How players become stronger over time',
    optionA: {
      title: 'Level-based System',
      description: 'Traditional XP and level ups with skill trees',
      features: ['Experience points', 'Level ups', 'Skill trees', 'Stat growth'],
      pythonCode: `# Level-based Progression System
class ProgressionSystem:
    def __init__(self, player):
        self.player = player
        
        # Core stats
        self.level = 1
        self.experience = 0
        self.exp_to_next_level = 100
        self.skill_points = 0
        
        # Player stats
        self.stats = {
            'max_health': 100,
            'max_mana': 50,
            'strength': 10,
            'defense': 5,
            'speed': 5,
            'intelligence': 5
        }
        
        # Skill tree
        self.skills = {
            'combat': {
                'power_strike': {'level': 0, 'max': 5, 'cost': 1, 
                               'effect': 'Damage +20% per level'},
                'defensive_stance': {'level': 0, 'max': 3, 'cost': 1,
                                   'effect': 'Defense +15% per level'},
                'berserker': {'level': 0, 'max': 1, 'cost': 3,
                            'effect': 'Double damage, half defense'}
            },
            'magic': {
                'fireball': {'level': 0, 'max': 5, 'cost': 1,
                           'effect': 'Fire damage spell'},
                'heal': {'level': 0, 'max': 3, 'cost': 1,
                       'effect': 'Restore health'},
                'teleport': {'level': 0, 'max': 1, 'cost': 2,
                           'effect': 'Instant movement'}
            },
            'utility': {
                'sprint': {'level': 0, 'max': 3, 'cost': 1,
                         'effect': 'Speed +25% per level'},
                'treasure_hunter': {'level': 0, 'max': 5, 'cost': 1,
                                  'effect': 'Better loot chance'},
                'regeneration': {'level': 0, 'max': 3, 'cost': 2,
                               'effect': 'Passive health regen'}
            }
        }
        
        # Achievements/milestones
        self.achievements = []
        self.total_enemies_defeated = 0
        self.total_damage_dealt = 0
        
    def gain_experience(self, amount):
        """Add experience points"""
        self.experience += amount
        level_ups = 0
        
        # Check for level up
        while self.experience >= self.exp_to_next_level:
            self.experience -= self.exp_to_next_level
            self.level_up()
            level_ups += 1
        
        return level_ups
    
    def level_up(self):
        """Handle level up"""
        self.level += 1
        self.skill_points += 2  # Grant skill points
        
        # Increase exp requirement (exponential growth)
        self.exp_to_next_level = int(100 * (1.5 ** (self.level - 1)))
        
        # Boost base stats
        self.stats['max_health'] += 20
        self.stats['max_mana'] += 10
        self.stats['strength'] += 2
        self.stats['defense'] += 1
        self.stats['speed'] += 1
        self.stats['intelligence'] += 1
        
        # Restore health/mana on level up
        self.player.health = self.stats['max_health']
        self.player.mana = self.stats['max_mana']
        
        # Check for milestone achievements
        self.check_achievements()
        
        return f"Level Up! Now level {self.level}"
    
    def learn_skill(self, category, skill_name):
        """Learn or upgrade a skill"""
        if category not in self.skills:
            return False
        
        skill = self.skills[category].get(skill_name)
        if not skill:
            return False
        
        # Check if can learn
        if skill['level'] >= skill['max']:
            return False  # Max level reached
        
        if self.skill_points < skill['cost']:
            return False  # Not enough points
        
        # Learn the skill
        skill['level'] += 1
        self.skill_points -= skill['cost']
        
        # Apply skill effects
        self.apply_skill_effects(category, skill_name)
        return True
    
    def apply_skill_effects(self, category, skill_name):
        """Apply passive skill effects"""
        skill = self.skills[category][skill_name]
        level = skill['level']
        
        if category == 'combat':
            if skill_name == 'power_strike':
                self.player.damage_multiplier = 1 + (0.2 * level)
            elif skill_name == 'defensive_stance':
                self.stats['defense'] = int(self.stats['defense'] * (1 + 0.15 * level))
        
        elif category == 'utility':
            if skill_name == 'sprint':
                self.stats['speed'] = int(self.stats['speed'] * (1 + 0.25 * level))
            elif skill_name == 'regeneration':
                self.player.regen_rate = 2 * level  # HP per second
    
    def get_skill_damage(self, skill_name):
        """Calculate damage for active skills"""
        base_damages = {
            'fireball': 50,
            'power_strike': 30
        }
        
        base = base_damages.get(skill_name, 0)
        
        # Find skill level
        for category in self.skills:
            if skill_name in self.skills[category]:
                level = self.skills[category][skill_name]['level']
                return int(base * (1 + 0.3 * level))
        
        return base
    
    def check_achievements(self):
        """Check and unlock achievements"""
        new_achievements = []
        
        if self.level >= 10 and 'Decimator' not in self.achievements:
            self.achievements.append('Decimator')
            new_achievements.append('Decimator: Reached level 10!')
            self.skill_points += 3  # Bonus points
        
        if self.level >= 25 and 'Quarter Master' not in self.achievements:
            self.achievements.append('Quarter Master')
            new_achievements.append('Quarter Master: Reached level 25!')
            self.stats['max_health'] += 100  # Bonus health
        
        if self.total_enemies_defeated >= 100 and 'Centurion' not in self.achievements:
            self.achievements.append('Centurion')
            new_achievements.append('Centurion: Defeated 100 enemies!')
        
        return new_achievements
    
    def get_exp_percentage(self):
        """Get progress to next level as percentage"""
        return (self.experience / self.exp_to_next_level) * 100
    
    def draw_level_ui(self, screen, x, y):
        """Draw level and XP bar"""
        font = pygame.font.Font(None, 24)
        small_font = pygame.font.Font(None, 18)
        
        # Draw level
        level_text = font.render(f"Level {self.level}", True, (255, 255, 255))
        screen.blit(level_text, (x, y))
        
        # Draw XP bar
        bar_width = 200
        bar_height = 20
        bar_x = x
        bar_y = y + 25
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50), 
                       (bar_x, bar_y, bar_width, bar_height))
        
        # Fill based on XP
        fill_width = int(bar_width * (self.experience / self.exp_to_next_level))
        pygame.draw.rect(screen, (100, 200, 100),
                       (bar_x, bar_y, fill_width, bar_height))
        
        # Border
        pygame.draw.rect(screen, (150, 150, 150),
                       (bar_x, bar_y, bar_width, bar_height), 2)
        
        # XP text
        xp_text = small_font.render(f"{self.experience}/{self.exp_to_next_level} XP",
                                   True, (255, 255, 255))
        text_rect = xp_text.get_rect(center=(bar_x + bar_width//2, 
                                            bar_y + bar_height//2))
        screen.blit(xp_text, text_rect)
        
        # Skill points
        if self.skill_points > 0:
            sp_text = font.render(f"Skill Points: {self.skill_points}",
                                True, (255, 255, 0))
            screen.blit(sp_text, (x, bar_y + bar_height + 5))`,
    },
    optionB: {
      title: 'Item-based Progression',
      description: 'Power through equipment and collectibles',
      features: ['Equipment tiers', 'Power-ups', 'Collectible upgrades', 'No level cap'],
      pythonCode: `# Item-based Progression System
class ProgressionSystem:
    def __init__(self, player):
        self.player = player
        
        # Equipment slots
        self.equipment = {
            'weapon': None,
            'armor': None,
            'accessory1': None,
            'accessory2': None,
            'special': None
        }
        
        # Collected permanent upgrades
        self.power_ups = {
            'health_crystals': 0,  # Each adds +20 max HP
            'mana_crystals': 0,    # Each adds +10 max mana
            'speed_boots': 0,      # Each adds +1 speed
            'power_gems': 0,       # Each adds +5 damage
            'shield_fragments': 0  # Each adds +2 defense
        }
        
        # Temporary buffs from consumables
        self.active_buffs = []
        
        # Collection tracking
        self.total_items_collected = 0
        self.legendary_items = []
        self.set_bonuses = {}
        
    def equip_item(self, item, slot=None):
        """Equip an item"""
        # Auto-detect slot if not specified
        if not slot:
            slot = item.get('slot', 'accessory1')
        
        if slot not in self.equipment:
            return False
        
        # Unequip current item
        old_item = self.equipment[slot]
        if old_item:
            self.remove_item_stats(old_item)
        
        # Equip new item
        self.equipment[slot] = item
        self.apply_item_stats(item)
        
        # Check for set bonuses
        self.check_set_bonuses()
        
        self.total_items_collected += 1
        return old_item  # Return unequipped item
    
    def apply_item_stats(self, item):
        """Apply item stat bonuses"""
        if not item:
            return
        
        # Apply basic stats
        self.player.max_health += item.get('health', 0)
        self.player.damage += item.get('damage', 0)
        self.player.defense += item.get('defense', 0)
        self.player.speed += item.get('speed', 0)
        
        # Apply special effects
        if 'effect' in item:
            self.apply_special_effect(item['effect'])
        
        # Track legendary items
        if item.get('rarity') == 'legendary':
            self.legendary_items.append(item['name'])
    
    def remove_item_stats(self, item):
        """Remove item stat bonuses"""
        if not item:
            return
        
        self.player.max_health -= item.get('health', 0)
        self.player.damage -= item.get('damage', 0)
        self.player.defense -= item.get('defense', 0)
        self.player.speed -= item.get('speed', 0)
        
        if item.get('rarity') == 'legendary' and item['name'] in self.legendary_items:
            self.legendary_items.remove(item['name'])
    
    def collect_power_up(self, power_up_type):
        """Collect a permanent upgrade"""
        if power_up_type not in self.power_ups:
            return False
        
        self.power_ups[power_up_type] += 1
        
        # Apply immediate effects
        if power_up_type == 'health_crystals':
            self.player.max_health += 20
            self.player.health += 20  # Heal on pickup
            return "Max Health increased by 20!"
        
        elif power_up_type == 'mana_crystals':
            self.player.max_mana += 10
            self.player.mana += 10
            return "Max Mana increased by 10!"
        
        elif power_up_type == 'speed_boots':
            self.player.speed += 1
            return "Movement speed increased!"
        
        elif power_up_type == 'power_gems':
            self.player.damage += 5
            return "Attack power increased by 5!"
        
        elif power_up_type == 'shield_fragments':
            self.player.defense += 2
            return "Defense increased by 2!"
        
        return "Power up collected!"
    
    def use_consumable(self, consumable):
        """Use a temporary buff item"""
        buff = {
            'name': consumable['name'],
            'effect': consumable['effect'],
            'duration': consumable.get('duration', 300),  # 5 seconds default
            'stats': consumable.get('stats', {})
        }
        
        # Apply buff stats
        for stat, value in buff['stats'].items():
            if hasattr(self.player, stat):
                setattr(self.player, stat, 
                       getattr(self.player, stat) + value)
        
        self.active_buffs.append(buff)
        return f"Used {consumable['name']}!"
    
    def update_buffs(self):
        """Update temporary buff durations"""
        expired_buffs = []
        
        for buff in self.active_buffs:
            buff['duration'] -= 1
            
            if buff['duration'] <= 0:
                expired_buffs.append(buff)
                # Remove buff stats
                for stat, value in buff['stats'].items():
                    if hasattr(self.player, stat):
                        setattr(self.player, stat,
                               getattr(self.player, stat) - value)
        
        # Remove expired buffs
        for buff in expired_buffs:
            self.active_buffs.remove(buff)
    
    def check_set_bonuses(self):
        """Check for equipment set bonuses"""
        # Count items from each set
        sets = {}
        for item in self.equipment.values():
            if item and 'set' in item:
                set_name = item['set']
                sets[set_name] = sets.get(set_name, 0) + 1
        
        # Apply set bonuses
        for set_name, count in sets.items():
            if set_name == 'warrior' and count >= 2:
                if 'warrior_2pc' not in self.set_bonuses:
                    self.player.damage += 10
                    self.set_bonuses['warrior_2pc'] = True
                
                if count >= 4 and 'warrior_4pc' not in self.set_bonuses:
                    self.player.defense += 15
                    self.player.max_health += 50
                    self.set_bonuses['warrior_4pc'] = True
            
            elif set_name == 'mage' and count >= 2:
                if 'mage_2pc' not in self.set_bonuses:
                    self.player.max_mana += 30
                    self.set_bonuses['mage_2pc'] = True
    
    def get_total_power(self):
        """Calculate total power level"""
        power = 0
        
        # Base stats contribution
        power += self.player.max_health // 10
        power += self.player.damage * 2
        power += self.player.defense * 3
        power += self.player.speed * 5
        
        # Equipment contribution
        for item in self.equipment.values():
            if item:
                rarity_multiplier = {
                    'common': 1,
                    'rare': 2,
                    'epic': 3,
                    'legendary': 5
                }.get(item.get('rarity', 'common'), 1)
                
                power += item.get('power', 10) * rarity_multiplier
        
        # Power-ups contribution
        for upgrade, count in self.power_ups.items():
            power += count * 15
        
        return power
    
    def generate_random_item(self, level=1):
        """Generate a random equipment piece"""
        import random
        
        rarities = ['common', 'rare', 'epic', 'legendary']
        rarity_weights = [60, 25, 12, 3]
        rarity = random.choices(rarities, rarity_weights)[0]
        
        slots = ['weapon', 'armor', 'accessory1', 'accessory2']
        slot = random.choice(slots)
        
        # Base stats based on rarity
        stat_multiplier = {
            'common': 1,
            'rare': 1.5,
            'epic': 2,
            'legendary': 3
        }[rarity]
        
        item = {
            'name': f"{rarity.capitalize()} {slot.capitalize()}",
            'slot': slot,
            'rarity': rarity,
            'level': level,
            'power': int(10 * level * stat_multiplier)
        }
        
        # Add random stats
        if slot == 'weapon':
            item['damage'] = int(5 * level * stat_multiplier)
        elif slot == 'armor':
            item['defense'] = int(3 * level * stat_multiplier)
            item['health'] = int(20 * level * stat_multiplier)
        else:  # accessory
            stat_type = random.choice(['speed', 'health', 'damage'])
            item[stat_type] = int(2 * level * stat_multiplier)
        
        # Add special effects for higher rarities
        if rarity in ['epic', 'legendary']:
            effects = ['lifesteal', 'thorns', 'dodge', 'crit']
            item['effect'] = random.choice(effects)
        
        return item
    
    def draw_equipment_ui(self, screen, x, y):
        """Draw equipment and power level"""
        font = pygame.font.Font(None, 20)
        
        # Draw power level
        power = self.get_total_power()
        power_text = font.render(f"Power Level: {power}", True, (255, 215, 0))
        screen.blit(power_text, (x, y))
        
        # Draw equipment slots
        y_offset = y + 30
        for slot, item in self.equipment.items():
            if item:
                color = {
                    'common': (200, 200, 200),
                    'rare': (100, 150, 255),
                    'epic': (200, 100, 255),
                    'legendary': (255, 200, 0)
                }.get(item.get('rarity', 'common'), (255, 255, 255))
                
                text = font.render(f"{slot}: {item['name']}", True, color)
            else:
                text = font.render(f"{slot}: Empty", True, (100, 100, 100))
            
            screen.blit(text, (x, y_offset))
            y_offset += 25
        
        # Draw active buffs
        if self.active_buffs:
            y_offset += 10
            buff_text = font.render("Active Buffs:", True, (255, 255, 255))
            screen.blit(buff_text, (x, y_offset))
            y_offset += 20
            
            for buff in self.active_buffs:
                remaining = buff['duration'] // 60  # Convert to seconds
                buff_info = font.render(f"  {buff['name']} ({remaining}s)",
                                       True, (100, 255, 100))
                screen.blit(buff_info, (x, y_offset))
                y_offset += 20`,
    },
  },

  {
    id: 'mapgen',
    title: 'Map Generation',
    description: 'How game worlds are created',
    optionA: {
      title: 'Procedural Generation',
      description: 'Random worlds that are different every time',
      features: ['Infinite worlds', 'Random dungeons', 'Roguelike elements', 'Seed-based'],
      pythonCode: `# Procedural Map Generation System
import random
import noise

class MapGenerationSystem:
    def __init__(self, width=100, height=100, seed=None):
        self.width = width
        self.height = height
        self.seed = seed or random.randint(0, 999999)
        random.seed(self.seed)
        
        # Map data
        self.tiles = [[0 for _ in range(width)] for _ in range(height)]
        self.rooms = []
        self.corridors = []
        self.spawn_point = (0, 0)
        self.exit_point = (0, 0)
        
        # Tile types
        self.TILE_TYPES = {
            0: 'empty',
            1: 'floor',
            2: 'wall',
            3: 'door',
            4: 'chest',
            5: 'enemy_spawn',
            6: 'trap',
            7: 'treasure',
            8: 'stairs_up',
            9: 'stairs_down'
        }
    
    def generate_dungeon(self, room_count=10):
        """Generate a dungeon with rooms and corridors"""
        self.clear_map()
        
        # Generate rooms
        for _ in range(room_count):
            room = self.create_room()
            if room and not self.room_overlaps(room):
                self.carve_room(room)
                self.rooms.append(room)
        
        # Connect rooms with corridors
        for i in range(len(self.rooms) - 1):
            self.create_corridor(self.rooms[i], self.rooms[i + 1])
        
        # Add features
        self.add_doors()
        self.add_treasures()
        self.add_enemies()
        self.place_stairs()
        
        return self.tiles
    
    def create_room(self):
        """Create a random room"""
        min_size, max_size = 5, 15
        width = random.randint(min_size, max_size)
        height = random.randint(min_size, max_size)
        x = random.randint(1, self.width - width - 1)
        y = random.randint(1, self.height - height - 1)
        
        return {'x': x, 'y': y, 'width': width, 'height': height}
    
    def room_overlaps(self, room):
        """Check if room overlaps with existing rooms"""
        for other in self.rooms:
            if (room['x'] < other['x'] + other['width'] + 2 and
                room['x'] + room['width'] + 2 > other['x'] and
                room['y'] < other['y'] + other['height'] + 2 and
                room['y'] + room['height'] + 2 > other['y']):
                return True
        return False
    
    def carve_room(self, room):
        """Carve out a room in the map"""
        for y in range(room['y'], room['y'] + room['height']):
            for x in range(room['x'], room['x'] + room['width']):
                if 0 <= x < self.width and 0 <= y < self.height:
                    # Walls on edges, floor inside
                    if (x == room['x'] or x == room['x'] + room['width'] - 1 or
                        y == room['y'] or y == room['y'] + room['height'] - 1):
                        self.tiles[y][x] = 2  # Wall
                    else:
                        self.tiles[y][x] = 1  # Floor
    
    def create_corridor(self, room1, room2):
        """Create corridor between two rooms"""
        # Get center points
        x1 = room1['x'] + room1['width'] // 2
        y1 = room1['y'] + room1['height'] // 2
        x2 = room2['x'] + room2['width'] // 2
        y2 = room2['y'] + room2['height'] // 2
        
        # Randomly choose horizontal-first or vertical-first
        if random.random() < 0.5:
            # Horizontal then vertical
            self.carve_h_corridor(x1, x2, y1)
            self.carve_v_corridor(y1, y2, x2)
        else:
            # Vertical then horizontal
            self.carve_v_corridor(y1, y2, x1)
            self.carve_h_corridor(x1, x2, y2)
    
    def carve_h_corridor(self, x1, x2, y):
        """Carve horizontal corridor"""
        for x in range(min(x1, x2), max(x1, x2) + 1):
            if 0 <= x < self.width and 0 <= y < self.height:
                if self.tiles[y][x] == 0:  # Only carve through empty
                    self.tiles[y][x] = 1  # Floor
                # Add walls around corridor
                if y - 1 >= 0 and self.tiles[y-1][x] == 0:
                    self.tiles[y-1][x] = 2
                if y + 1 < self.height and self.tiles[y+1][x] == 0:
                    self.tiles[y+1][x] = 2
    
    def carve_v_corridor(self, y1, y2, x):
        """Carve vertical corridor"""
        for y in range(min(y1, y2), max(y1, y2) + 1):
            if 0 <= x < self.width and 0 <= y < self.height:
                if self.tiles[y][x] == 0:  # Only carve through empty
                    self.tiles[y][x] = 1  # Floor
                # Add walls around corridor
                if x - 1 >= 0 and self.tiles[y][x-1] == 0:
                    self.tiles[y][x-1] = 2
                if x + 1 < self.width and self.tiles[y][x+1] == 0:
                    self.tiles[y][x+1] = 2
    
    def add_doors(self):
        """Add doors at room entrances"""
        for room in self.rooms:
            # Find potential door locations (walls adjacent to corridors)
            door_spots = []
            
            # Check room edges
            for x in range(room['x'], room['x'] + room['width']):
                # Top and bottom edges
                if self.is_valid_door(x, room['y']):
                    door_spots.append((x, room['y']))
                if self.is_valid_door(x, room['y'] + room['height'] - 1):
                    door_spots.append((x, room['y'] + room['height'] - 1))
            
            # Add 1-2 doors per room
            if door_spots:
                num_doors = min(2, len(door_spots))
                for _ in range(num_doors):
                    if door_spots:
                        dx, dy = random.choice(door_spots)
                        self.tiles[dy][dx] = 3  # Door
                        door_spots.remove((dx, dy))
    
    def is_valid_door(self, x, y):
        """Check if position is valid for a door"""
        if not (0 <= x < self.width and 0 <= y < self.height):
            return False
        
        # Must be a wall
        if self.tiles[y][x] != 2:
            return False
        
        # Check if connects to corridor
        adjacent = [
            (x-1, y), (x+1, y), (x, y-1), (x, y+1)
        ]
        
        floor_count = 0
        for ax, ay in adjacent:
            if 0 <= ax < self.width and 0 <= ay < self.height:
                if self.tiles[ay][ax] == 1:  # Floor
                    floor_count += 1
        
        return floor_count >= 2  # Connects two floor tiles
    
    def add_treasures(self):
        """Add treasure chests to rooms"""
        for room in self.rooms:
            if random.random() < 0.3:  # 30% chance per room
                # Place in random spot in room
                tx = random.randint(room['x'] + 1, room['x'] + room['width'] - 2)
                ty = random.randint(room['y'] + 1, room['y'] + room['height'] - 2)
                
                if self.tiles[ty][tx] == 1:  # Only on floor
                    self.tiles[ty][tx] = 4  # Chest
    
    def add_enemies(self):
        """Add enemy spawn points"""
        for room in self.rooms[1:]:  # Skip first room (spawn room)
            # Number of enemies based on room size
            room_area = room['width'] * room['height']
            num_enemies = random.randint(1, max(1, room_area // 20))
            
            for _ in range(num_enemies):
                ex = random.randint(room['x'] + 1, room['x'] + room['width'] - 2)
                ey = random.randint(room['y'] + 1, room['y'] + room['height'] - 2)
                
                if self.tiles[ey][ex] == 1:  # Only on floor
                    self.tiles[ey][ex] = 5  # Enemy spawn
    
    def place_stairs(self):
        """Place entrance and exit stairs"""
        if self.rooms:
            # Entrance in first room
            first_room = self.rooms[0]
            self.spawn_point = (
                first_room['x'] + first_room['width'] // 2,
                first_room['y'] + first_room['height'] // 2
            )
            self.tiles[self.spawn_point[1]][self.spawn_point[0]] = 8  # Stairs up
            
            # Exit in last room
            last_room = self.rooms[-1]
            self.exit_point = (
                last_room['x'] + last_room['width'] // 2,
                last_room['y'] + last_room['height'] // 2
            )
            self.tiles[self.exit_point[1]][self.exit_point[0]] = 9  # Stairs down
    
    def generate_cave(self, smoothing=5):
        """Generate cave-like map using cellular automata"""
        # Initialize with random noise
        for y in range(self.height):
            for x in range(self.width):
                self.tiles[y][x] = 2 if random.random() < 0.45 else 1
        
        # Apply cellular automata smoothing
        for _ in range(smoothing):
            new_tiles = [[0 for _ in range(self.width)] for _ in range(self.height)]
            
            for y in range(self.height):
                for x in range(self.width):
                    wall_count = self.count_walls_around(x, y)
                    
                    if wall_count > 4:
                        new_tiles[y][x] = 2  # Wall
                    elif wall_count < 4:
                        new_tiles[y][x] = 1  # Floor
                    else:
                        new_tiles[y][x] = self.tiles[y][x]
            
            self.tiles = new_tiles
        
        # Ensure borders are walls
        for x in range(self.width):
            self.tiles[0][x] = 2
            self.tiles[self.height-1][x] = 2
        for y in range(self.height):
            self.tiles[y][0] = 2
            self.tiles[y][self.width-1] = 2
    
    def count_walls_around(self, x, y):
        """Count walls in 3x3 area around position"""
        wall_count = 0
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                nx, ny = x + dx, y + dy
                
                # Out of bounds counts as wall
                if nx < 0 or nx >= self.width or ny < 0 or ny >= self.height:
                    wall_count += 1
                elif self.tiles[ny][nx] == 2:
                    wall_count += 1
        
        return wall_count
    
    def generate_overworld(self):
        """Generate overworld map using Perlin noise"""
        scale = 20.0  # Adjust for different terrain features
        
        for y in range(self.height):
            for x in range(self.width):
                # Get Perlin noise value
                value = noise.pnoise2(x/scale, y/scale, 
                                     octaves=4, persistence=0.5, 
                                     lacunarity=2.0, repeatx=self.width,
                                     repeaty=self.height, base=self.seed)
                
                # Map noise to terrain types
                if value < -0.3:
                    self.tiles[y][x] = 'water'
                elif value < -0.1:
                    self.tiles[y][x] = 'sand'
                elif value < 0.1:
                    self.tiles[y][x] = 'grass'
                elif value < 0.3:
                    self.tiles[y][x] = 'forest'
                else:
                    self.tiles[y][x] = 'mountain'
        
        return self.tiles
    
    def clear_map(self):
        """Clear the map"""
        self.tiles = [[0 for _ in range(self.width)] for _ in range(self.height)]
        self.rooms = []
        self.corridors = []
    
    def draw_minimap(self, screen, x, y, scale=2):
        """Draw a minimap of the dungeon"""
        colors = {
            0: (0, 0, 0),        # Empty
            1: (100, 100, 100),  # Floor
            2: (50, 50, 50),     # Wall
            3: (139, 69, 19),    # Door
            4: (255, 215, 0),    # Chest
            5: (255, 0, 0),      # Enemy
            8: (0, 255, 0),      # Stairs up
            9: (0, 0, 255),      # Stairs down
        }
        
        for ty in range(self.height):
            for tx in range(self.width):
                tile = self.tiles[ty][tx]
                color = colors.get(tile, (0, 0, 0))
                
                rect = pygame.Rect(x + tx * scale, y + ty * scale, scale, scale)
                pygame.draw.rect(screen, color, rect)`,
    },
    optionB: {
      title: 'Designed Levels',
      description: 'Handcrafted stages with intentional design',
      features: ['Consistent layout', 'Puzzle placement', 'Narrative flow', 'Secret areas'],
      pythonCode: `# Designed Level System
class MapGenerationSystem:
    def __init__(self):
        self.current_level = 0
        self.levels = []
        self.tile_size = 32
        
        # Tile legend for level design
        self.TILE_LEGEND = {
            '#': 'wall',
            '.': 'floor',
            '@': 'player_spawn',
            'E': 'enemy',
            'C': 'chest',
            'D': 'door',
            'K': 'key',
            'S': 'secret',
            'X': 'exit',
            'T': 'trap',
            'H': 'health',
            'P': 'powerup',
            '~': 'water',
            '^': 'spikes',
            'B': 'boss',
            'L': 'locked_door',
            'V': 'save_point'
        }
        
        # Level metadata
        self.level_info = {}
        
        # Define all levels
        self.define_levels()
    
    def define_levels(self):
        """Define all handcrafted levels"""
        # Level 1: Tutorial
        self.levels.append({
            'name': 'Tutorial Dungeon',
            'theme': 'castle',
            'music': 'dungeon_theme.ogg',
            'layout': [
                "####################",
                "#@.................#",
                "#..................#",
                "#...###....###.....#",
                "#...#C#....#H#.....#",
                "#...###....###.....#",
                "#..................#",
                "#......#DD#........#",
                "#......#..#........#",
                "#......#..#........#",
                "#..................#",
                "#........E.........#",
                "#..................#",
                "#..................#",
                "#........X.........#",
                "####################"
            ],
            'objectives': [
                'Learn to move with arrow keys',
                'Collect the chest',
                'Defeat the enemy',
                'Find the exit'
            ],
            'secrets': [(10, 4)],  # Hidden chest location
            'dialog': {
                'intro': "Welcome, hero! Use arrow keys to move.",
                'chest': "You found treasure! Press SPACE to open.",
                'enemy': "Combat! Press X to attack.",
                'exit': "Well done! Proceed to the next level."
            }
        })
        
        # Level 2: Puzzle Room
        self.levels.append({
            'name': 'Puzzle Chamber',
            'theme': 'temple',
            'music': 'puzzle_theme.ogg',
            'layout': [
                "########################",
                "#@...#.....#...........#",
                "#....#.....L...........#",
                "#....#.....#...........#",
                "###D###...###..........#",
                "#............#.........#",
                "#............#.....K...#",
                "#.....T......#.........#",
                "#............###L###...#",
                "#..................#...#",
                "#..................#...#",
                "#..................D...#",
                "#..................#...#",
                "#.....C......S.....#...#",
                "#..................#.X.#",
                "########################"
            ],
            'objectives': [
                'Find the key',
                'Unlock the doors',
                'Avoid the traps',
                'Discover the secret'
            ],
            'secrets': [(13, 13)],
            'puzzle_logic': {
                'switches': [(5, 7), (10, 10)],
                'doors_affected': [(11, 4), (11, 8)]
            }
        })
        
        # Level 3: Boss Arena
        self.levels.append({
            'name': 'Boss Arena',
            'theme': 'arena',
            'music': 'boss_battle.ogg',
            'layout': [
                "##########################",
                "#........................#",
                "#...@....................#",
                "#........................#",
                "#...######....######.....#",
                "#...#....#....#....#.....#",
                "#...#....#....#....#.....#",
                "#...#....#....#....#.....#",
                "#...######....######.....#",
                "#........................#",
                "#.........B..............#",
                "#........................#",
                "#..H..................H..#",
                "#........................#",
                "#........................#",
                "#..........X.............#",
                "##########################"
            ],
            'objectives': [
                'Defeat the boss',
                'Use the arena layout strategically',
                'Manage your health'
            ],
            'boss_config': {
                'health': 300,
                'phases': 3,
                'attack_patterns': ['sweep', 'projectile', 'summon']
            }
        })
    
    def load_level(self, level_index):
        """Load a specific level"""
        if 0 <= level_index < len(self.levels):
            self.current_level = level_index
            level_data = self.levels[level_index]
            
            # Convert ASCII layout to tile map
            tile_map = []
            spawn_point = None
            enemies = []
            items = []
            
            for y, row in enumerate(level_data['layout']):
                tile_row = []
                for x, char in enumerate(row):
                    tile_type = self.TILE_LEGEND.get(char, 'floor')
                    tile_row.append(tile_type)
                    
                    # Track special tiles
                    if char == '@':
                        spawn_point = (x * self.tile_size, y * self.tile_size)
                    elif char == 'E':
                        enemies.append({'x': x, 'y': y, 'type': 'basic'})
                    elif char == 'B':
                        enemies.append({'x': x, 'y': y, 'type': 'boss'})
                    elif char in ['C', 'K', 'H', 'P']:
                        items.append({'x': x, 'y': y, 'type': tile_type})
                
                tile_map.append(tile_row)
            
            return {
                'map': tile_map,
                'spawn': spawn_point,
                'enemies': enemies,
                'items': items,
                'metadata': level_data
            }
        return None
    
    def create_custom_level(self, width, height, name="Custom Level"):
        """Create a blank level for custom design"""
        custom_level = {
            'name': name,
            'theme': 'custom',
            'layout': [],
            'objectives': [],
            'width': width,
            'height': height
        }
        
        # Create empty layout
        for y in range(height):
            if y == 0 or y == height - 1:
                # Top and bottom walls
                custom_level['layout'].append('#' * width)
            else:
                # Side walls with empty space
                row = '#' + '.' * (width - 2) + '#'
                custom_level['layout'].append(row)
        
        return custom_level
    
    def add_checkpoint(self, level_index, x, y):
        """Add a checkpoint/save point to level"""
        if 0 <= level_index < len(self.levels):
            if 'checkpoints' not in self.levels[level_index]:
                self.levels[level_index]['checkpoints'] = []
            
            self.levels[level_index]['checkpoints'].append({
                'x': x, 
                'y': y,
                'activated': False
            })
    
    def trigger_event(self, level_index, event_type, x, y):
        """Trigger scripted events in levels"""
        events = {
            'dialog': self.show_dialog,
            'cutscene': self.play_cutscene,
            'spawn_enemies': self.spawn_wave,
            'unlock_door': self.unlock_door,
            'secret_found': self.reveal_secret
        }
        
        if event_type in events:
            return events[event_type](level_index, x, y)
    
    def show_dialog(self, level_index, x, y):
        """Show dialog at specific location"""
        if 0 <= level_index < len(self.levels):
            level = self.levels[level_index]
            
            # Check for dialog triggers
            for trigger_type in ['intro', 'chest', 'enemy', 'exit']:
                if trigger_type in level.get('dialog', {}):
                    # Check if player is at trigger location
                    return level['dialog'][trigger_type]
        return None
    
    def reveal_secret(self, level_index, x, y):
        """Reveal secret area"""
        if 0 <= level_index < len(self.levels):
            level = self.levels[level_index]
            
            for secret_x, secret_y in level.get('secrets', []):
                if abs(x - secret_x) < 2 and abs(y - secret_y) < 2:
                    # Reveal secret tiles
                    return {
                        'type': 'secret_revealed',
                        'message': 'You discovered a secret!',
                        'reward': 'bonus_treasure'
                    }
        return None
    
    def get_level_progress(self):
        """Get completion percentage for current level"""
        if 0 <= self.current_level < len(self.levels):
            level = self.levels[self.current_level]
            objectives = level.get('objectives', [])
            completed = 0
            
            # Track completed objectives (simplified)
            # In real implementation, track actual game state
            
            if objectives:
                return (completed / len(objectives)) * 100
        return 0
    
    def draw_level_editor_grid(self, screen, x, y, selected_tile='#'):
        """Draw grid for level editor"""
        if self.current_level < len(self.levels):
            level = self.levels[self.current_level]
            
            for row_idx, row in enumerate(level['layout']):
                for col_idx, tile in enumerate(row):
                    tile_x = x + col_idx * self.tile_size
                    tile_y = y + row_idx * self.tile_size
                    
                    # Draw tile
                    color = self.get_tile_color(tile)
                    pygame.draw.rect(screen, color,
                                   (tile_x, tile_y, self.tile_size, self.tile_size))
                    
                    # Draw grid lines
                    pygame.draw.rect(screen, (100, 100, 100),
                                   (tile_x, tile_y, self.tile_size, self.tile_size), 1)
    
    def get_tile_color(self, tile_char):
        """Get color for tile type"""
        colors = {
            '#': (50, 50, 50),    # Wall
            '.': (200, 200, 200), # Floor
            '@': (0, 255, 0),     # Spawn
            'E': (255, 0, 0),     # Enemy
            'C': (255, 215, 0),   # Chest
            'D': (139, 69, 19),   # Door
            'K': (255, 255, 0),   # Key
            'X': (0, 0, 255),     # Exit
            '~': (0, 150, 255),   # Water
            '^': (150, 150, 150), # Spikes
            'B': (128, 0, 128),   # Boss
        }
        return colors.get(tile_char, (100, 100, 100))`,
    },
  },

  {
    id: 'jump_mechanics',
    title: 'Jump Mechanics',
    description: 'How jumping feels in your game',
    optionA: {
      title: 'Floaty Jump',
      description: 'Mario-style jumping with air control and variable height',
      features: ['Hold to jump higher', 'Air control', 'Coyote time', 'Jump buffering'],
      pythonCode: `# Floaty Jump Mechanics (Mario-style)
class JumpMechanics:
    def __init__(self, player):
        self.player = player
        
        # Jump parameters (tweakable for kids!)
        self.jump_initial_velocity = -15  # Initial jump speed
        self.jump_hold_velocity = -2      # Extra velocity when holding jump
        self.max_jump_hold_time = 15      # Frames you can hold jump
        self.air_control_strength = 0.8    # How much control in air (0-1)
        self.coyote_time = 6              # Frames after leaving ground where you can still jump
        self.jump_buffer_time = 5         # Frames before landing where jump input is remembered
        
        # State tracking
        self.is_jumping = False
        self.jump_hold_timer = 0
        self.coyote_timer = 0
        self.jump_buffer_timer = 0
        self.double_jump_available = True
        self.jump_particles = []
        
        # Asset substitution support
        self.jump_sprite = None  # Can be replaced with custom sprite
        self.land_sprite = None   # Landing effect sprite
        self.double_jump_effect = None
        
    def start_jump(self):
        """Initiate a floaty jump"""
        if self.can_jump():
            self.player.velocity_y = self.jump_initial_velocity
            self.is_jumping = True
            self.jump_hold_timer = self.max_jump_hold_time
            self.coyote_timer = 0
            
            # Create jump particles
            self.create_jump_effect(self.player.x, self.player.y + self.player.height)
            
            # Play jump animation if sprite exists
            if self.jump_sprite:
                self.player.current_sprite = self.jump_sprite
                
            return True
        elif self.double_jump_available and not self.player.on_ground:
            # Double jump with floaty mechanics
            self.player.velocity_y = self.jump_initial_velocity * 0.85
            self.double_jump_available = False
            self.jump_hold_timer = self.max_jump_hold_time * 0.7
            
            # Special double jump effect
            if self.double_jump_effect:
                self.create_double_jump_effect()
                
            return True
        return False
    
    def update_jump(self, jump_held):
        """Update floaty jump mechanics each frame"""
        # Handle jump hold for variable height
        if self.is_jumping and jump_held and self.jump_hold_timer > 0:
            # Add upward velocity while holding jump
            self.player.velocity_y += self.jump_hold_velocity
            self.jump_hold_timer -= 1
        elif not jump_held:
            # Cut jump short if button released
            self.jump_hold_timer = 0
            if self.player.velocity_y < -5:  # Only if still moving up fast
                self.player.velocity_y *= 0.5  # Reduce upward momentum
        
        # Air control
        if not self.player.on_ground:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_LEFT] or keys[pygame.K_a]:
                self.player.velocity_x -= self.air_control_strength
            elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
                self.player.velocity_x += self.air_control_strength
        
        # Update coyote time
        if self.player.on_ground:
            self.coyote_timer = self.coyote_time
            self.double_jump_available = True
            
            # Landing effect
            if self.is_jumping:
                self.on_land()
                
            self.is_jumping = False
        else:
            if self.coyote_timer > 0:
                self.coyote_timer -= 1
        
        # Update jump buffer
        if not self.player.on_ground:
            keys = pygame.key.get_pressed()
            if keys[pygame.K_SPACE] or keys[pygame.K_w]:
                self.jump_buffer_timer = self.jump_buffer_time
        elif self.jump_buffer_timer > 0:
            self.jump_buffer_timer -= 1
            self.start_jump()  # Auto-jump when landing
        
        # Update particles
        self.update_particles()
    
    def can_jump(self):
        """Check if player can jump (includes coyote time)"""
        return self.player.on_ground or self.coyote_timer > 0
    
    def create_jump_effect(self, x, y):
        """Create visual effect for jump"""
        for i in range(8):
            particle = {
                'x': x + self.player.width // 2,
                'y': y,
                'vel_x': random.uniform(-2, 2),
                'vel_y': random.uniform(-1, -3),
                'life': 20,
                'size': random.randint(2, 5),
                'color': (255, 255, 255)
            }
            self.jump_particles.append(particle)
    
    def create_double_jump_effect(self):
        """Create special effect for double jump"""
        x = self.player.x + self.player.width // 2
        y = self.player.y + self.player.height // 2
        
        # Ring of particles
        for angle in range(0, 360, 30):
            rad = math.radians(angle)
            particle = {
                'x': x,
                'y': y,
                'vel_x': math.cos(rad) * 4,
                'vel_y': math.sin(rad) * 4,
                'life': 25,
                'size': 4,
                'color': (100, 200, 255)
            }
            self.jump_particles.append(particle)
    
    def on_land(self):
        """Handle landing effects"""
        # Create landing particles
        for i in range(5):
            particle = {
                'x': self.player.x + self.player.width // 2 + random.randint(-10, 10),
                'y': self.player.y + self.player.height,
                'vel_x': random.uniform(-1, 1),
                'vel_y': random.uniform(0, -2),
                'life': 15,
                'size': 3,
                'color': (200, 200, 200)
            }
            self.jump_particles.append(particle)
        
        # Play landing sprite if available
        if self.land_sprite:
            self.player.current_sprite = self.land_sprite
    
    def update_particles(self):
        """Update particle effects"""
        for particle in self.jump_particles[:]:
            particle['x'] += particle['vel_x']
            particle['y'] += particle['vel_y']
            particle['vel_y'] += 0.3  # Gravity for particles
            particle['life'] -= 1
            
            if particle['life'] <= 0:
                self.jump_particles.remove(particle)
    
    def draw_effects(self, screen):
        """Draw jump effects and particles"""
        for particle in self.jump_particles:
            alpha = particle['life'] / 25.0
            color = tuple(int(c * alpha) for c in particle['color'])
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])),
                             particle['size'])
    
    def get_jump_parameters(self):
        """Get current parameters for UI display/editing"""
        return {
            'Jump Power': self.jump_initial_velocity,
            'Hold Boost': self.jump_hold_velocity,
            'Air Control': self.air_control_strength,
            'Coyote Time': self.coyote_time,
            'Buffer Time': self.jump_buffer_time
        }`,
    },
    optionB: {
      title: 'Realistic Jump',
      description: 'Fixed arc jumping with no air control',
      features: ['Fixed jump height', 'No air control', 'Predictable arc', 'Landing prediction'],
      pythonCode: `# Realistic Jump Mechanics (Fixed arc)
class JumpMechanics:
    def __init__(self, player):
        self.player = player
        
        # Jump parameters (tweakable for kids!)
        self.jump_force = -18          # Single fixed jump force
        self.landing_threshold = 2     # Velocity threshold for landing
        self.jump_cooldown_time = 10   # Frames before can jump again
        
        # State tracking
        self.jump_cooldown = 0
        self.peak_reached = False
        self.jump_start_x = 0
        self.jump_trajectory = []  # For showing jump arc
        self.can_jump = True
        
        # Asset substitution support
        self.jump_sprite = None     # Jump animation sprite
        self.fall_sprite = None     # Falling sprite
        self.land_sprite = None     # Landing sprite
        self.trajectory_sprite = None  # Arc preview sprite
        
    def start_jump(self):
        """Initiate a realistic fixed jump"""
        if self.can_perform_jump():
            # Set fixed jump velocity
            self.player.velocity_y = self.jump_force
            
            # Lock horizontal velocity at jump start
            self.jump_start_x = self.player.velocity_x
            
            # Reset states
            self.peak_reached = False
            self.jump_cooldown = self.jump_cooldown_time
            self.can_jump = False
            
            # Calculate jump trajectory for preview
            self.calculate_trajectory()
            
            # Set jump sprite
            if self.jump_sprite:
                self.player.current_sprite = self.jump_sprite
                
            return True
        return False
    
    def update_jump(self, jump_held=None):
        """Update realistic jump (no air control)"""
        # Jump held has no effect in realistic mode
        
        # Update cooldown
        if self.jump_cooldown > 0:
            self.jump_cooldown -= 1
        
        # No air control - maintain initial horizontal velocity
        if not self.player.on_ground:
            # Keep horizontal velocity constant during jump
            if hasattr(self, 'jump_start_x'):
                self.player.velocity_x = self.jump_start_x
            
            # Check if reached peak
            if not self.peak_reached and self.player.velocity_y >= 0:
                self.peak_reached = True
                if self.fall_sprite:
                    self.player.current_sprite = self.fall_sprite
        
        # Reset when landing
        if self.player.on_ground:
            if not self.can_jump:  # Just landed
                self.on_land()
            self.can_jump = True
            self.peak_reached = False
    
    def can_perform_jump(self):
        """Check if player can jump"""
        return self.player.on_ground and self.jump_cooldown <= 0 and self.can_jump
    
    def calculate_trajectory(self):
        """Calculate the jump arc for preview"""
        self.jump_trajectory = []
        
        # Simulate jump physics
        sim_x = self.player.x
        sim_y = self.player.y
        sim_vel_x = self.player.velocity_x
        sim_vel_y = self.jump_force
        gravity = 0.8  # Match game gravity
        
        # Calculate next 30 frames of jump
        for i in range(30):
            sim_x += sim_vel_x
            sim_y += sim_vel_y
            sim_vel_y += gravity
            
            # Store position every 3 frames
            if i % 3 == 0:
                self.jump_trajectory.append((sim_x, sim_y))
            
            # Stop if would hit ground
            if sim_y > self.player.y:
                break
    
    def on_land(self):
        """Handle landing impact"""
        # Calculate landing force
        impact_force = abs(self.player.velocity_y)
        
        # Heavy landing effect for high falls
        if impact_force > 10:
            self.create_heavy_landing_effect()
            # Add screen shake or other effects here
        else:
            self.create_normal_landing_effect()
        
        # Set landing sprite
        if self.land_sprite:
            self.player.current_sprite = self.land_sprite
    
    def create_heavy_landing_effect(self):
        """Create effect for heavy landing"""
        # Create dust cloud effect
        x = self.player.x + self.player.width // 2
        y = self.player.y + self.player.height
        
        # This would create actual particle effects in full implementation
        self.landing_effect = {
            'x': x,
            'y': y,
            'radius': 30,
            'life': 15,
            'type': 'heavy'
        }
    
    def create_normal_landing_effect(self):
        """Create effect for normal landing"""
        x = self.player.x + self.player.width // 2
        y = self.player.y + self.player.height
        
        self.landing_effect = {
            'x': x,
            'y': y,
            'radius': 15,
            'life': 10,
            'type': 'normal'
        }
    
    def draw_effects(self, screen):
        """Draw jump effects and trajectory preview"""
        # Draw trajectory preview (when on ground)
        if self.player.on_ground and len(self.jump_trajectory) > 0:
            for i, (x, y) in enumerate(self.jump_trajectory):
                # Fade out dots further in trajectory
                alpha = 1.0 - (i / len(self.jump_trajectory))
                size = max(1, int(3 * alpha))
                color = (255, 255, 255, int(255 * alpha))
                pygame.draw.circle(screen, color[:3], (int(x), int(y)), size)
        
        # Draw landing effect
        if hasattr(self, 'landing_effect'):
            effect = self.landing_effect
            if effect['life'] > 0:
                alpha = effect['life'] / 15.0
                
                if effect['type'] == 'heavy':
                    # Draw expanding dust circle
                    radius = effect['radius'] - effect['life']
                    pygame.draw.circle(screen, (150, 150, 150),
                                     (int(effect['x']), int(effect['y'])),
                                     radius, 2)
                    
                    # Draw dust particles
                    for angle in range(0, 360, 45):
                        rad = math.radians(angle)
                        px = effect['x'] + math.cos(rad) * radius
                        py = effect['y'] + math.sin(rad) * radius * 0.5
                        pygame.draw.circle(screen, (180, 180, 180),
                                         (int(px), int(py)), 3)
                else:
                    # Simple landing puff
                    radius = 15 - effect['life']
                    pygame.draw.circle(screen, (200, 200, 200),
                                     (int(effect['x']), int(effect['y'])),
                                     radius, 1)
                
                effect['life'] -= 1
    
    def get_jump_parameters(self):
        """Get current parameters for UI display/editing"""
        return {
            'Jump Force': self.jump_force,
            'Landing Threshold': self.landing_threshold,
            'Jump Cooldown': self.jump_cooldown_time,
            'Current Cooldown': self.jump_cooldown,
            'Can Jump': self.can_jump
        }`,
    },
  },

  {
    id: 'ground_movement',
    title: 'Ground Movement',
    description: 'How characters accelerate and move on the ground',
    optionA: {
      title: 'Smooth Acceleration',
      description: 'Gradual speed changes with momentum',
      features: ['Acceleration curves', 'Deceleration', 'Turn momentum', 'Speed tiers'],
      pythonCode: `# Smooth Acceleration Ground Movement
class GroundMovement:
    def __init__(self, player):
        self.player = player
        
        # Movement parameters (tweakable!)
        self.acceleration = 0.8        # How fast to speed up
        self.deceleration = 0.7        # How fast to slow down
        self.max_walk_speed = 4        # Walking speed limit
        self.max_run_speed = 8         # Running speed limit
        self.turn_speed = 0.3          # How fast to change direction
        self.speed_tier_threshold = 0.7 # Percentage of max speed for tier change
        
        # State tracking
        self.current_speed = 0
        self.target_speed = 0
        self.facing_direction = 1  # 1 = right, -1 = left
        self.is_running = False
        self.speed_tier = 0  # 0=idle, 1=walk, 2=run
        self.footstep_timer = 0
        self.momentum = 0
        
        # Asset support
        self.idle_sprite = None
        self.walk_sprites = []  # Animation frames
        self.run_sprites = []   # Animation frames
        self.turn_sprite = None
        self.current_frame = 0
        self.animation_speed = 0.2
        
    def update_movement(self, left_pressed, right_pressed, run_pressed):
        """Update smooth ground movement"""
        # Determine target speed and direction
        if left_pressed and not right_pressed:
            self.target_speed = -self.max_run_speed if run_pressed else -self.max_walk_speed
            
            # Handle smooth turning
            if self.facing_direction > 0 and self.current_speed > 1:
                # Skid turn effect
                self.momentum = self.current_speed * 0.3
                if self.turn_sprite:
                    self.player.current_sprite = self.turn_sprite
            
            self.facing_direction = -1
            
        elif right_pressed and not left_pressed:
            self.target_speed = self.max_run_speed if run_pressed else self.max_walk_speed
            
            # Handle smooth turning
            if self.facing_direction < 0 and self.current_speed < -1:
                # Skid turn effect
                self.momentum = self.current_speed * 0.3
                if self.turn_sprite:
                    self.player.current_sprite = self.turn_sprite
            
            self.facing_direction = 1
            
        else:
            # No input - decelerate smoothly
            self.target_speed = 0
        
        # Apply acceleration/deceleration
        if abs(self.target_speed) > abs(self.current_speed):
            # Accelerating
            speed_diff = self.target_speed - self.current_speed
            self.current_speed += speed_diff * self.acceleration
        else:
            # Decelerating
            speed_diff = self.target_speed - self.current_speed
            self.current_speed += speed_diff * self.deceleration
        
        # Apply momentum during turns
        if self.momentum != 0:
            self.current_speed += self.momentum
            self.momentum *= 0.9  # Decay momentum
            if abs(self.momentum) < 0.1:
                self.momentum = 0
        
        # Apply speed to player
        self.player.velocity_x = self.current_speed
        
        # Update speed tier for animations
        self.update_speed_tier()
        
        # Update animation
        self.update_animation()
        
        # Footstep effects
        self.update_footsteps()
    
    def update_speed_tier(self):
        """Determine current speed tier for animations"""
        speed_percent = abs(self.current_speed) / self.max_run_speed
        
        if speed_percent < 0.1:
            self.speed_tier = 0  # Idle
        elif speed_percent < self.speed_tier_threshold:
            self.speed_tier = 1  # Walking
        else:
            self.speed_tier = 2  # Running
    
    def update_animation(self):
        """Update sprite animation based on movement"""
        if self.speed_tier == 0:
            # Idle animation
            if self.idle_sprite:
                self.player.current_sprite = self.idle_sprite
                
        elif self.speed_tier == 1:
            # Walking animation
            if self.walk_sprites:
                # Animation speed based on movement speed
                self.current_frame += self.animation_speed * abs(self.current_speed) / self.max_walk_speed
                frame_index = int(self.current_frame) % len(self.walk_sprites)
                self.player.current_sprite = self.walk_sprites[frame_index]
                
        elif self.speed_tier == 2:
            # Running animation
            if self.run_sprites:
                # Faster animation for running
                self.current_frame += self.animation_speed * 1.5 * abs(self.current_speed) / self.max_run_speed
                frame_index = int(self.current_frame) % len(self.run_sprites)
                self.player.current_sprite = self.run_sprites[frame_index]
    
    def update_footsteps(self):
        """Create footstep effects based on speed"""
        if self.speed_tier > 0:
            # Footstep frequency based on speed
            step_frequency = 20 if self.speed_tier == 1 else 12
            
            self.footstep_timer += 1
            if self.footstep_timer >= step_frequency:
                self.footstep_timer = 0
                self.create_footstep_effect()
    
    def create_footstep_effect(self):
        """Create visual footstep effect"""
        # This would create dust particles in full implementation
        effect_x = self.player.x + self.player.width // 2
        effect_y = self.player.y + self.player.height
        
        # Store effect for drawing
        if not hasattr(self, 'footstep_effects'):
            self.footstep_effects = []
            
        self.footstep_effects.append({
            'x': effect_x,
            'y': effect_y,
            'life': 10,
            'size': 3 if self.speed_tier == 1 else 5
        })
    
    def apply_friction(self, friction_coefficient=1.0):
        """Apply surface friction to movement"""
        # Different surfaces can have different friction
        self.current_speed *= (0.95 * friction_coefficient)
        
        # Stop completely if very slow
        if abs(self.current_speed) < 0.1:
            self.current_speed = 0
    
    def draw_effects(self, screen):
        """Draw movement effects"""
        if hasattr(self, 'footstep_effects'):
            for effect in self.footstep_effects[:]:
                alpha = effect['life'] / 10.0
                color = (150, 150, 150)
                pygame.draw.circle(screen, color,
                                 (int(effect['x']), int(effect['y'])),
                                 effect['size'])
                
                effect['life'] -= 1
                if effect['life'] <= 0:
                    self.footstep_effects.remove(effect)
        
        # Draw speed lines when running fast
        if self.speed_tier == 2:
            speed_line_x = self.player.x
            if self.facing_direction > 0:
                speed_line_x += self.player.width
            
            for i in range(3):
                y = self.player.y + i * 15
                length = int(abs(self.current_speed) * 3)
                start_x = speed_line_x - self.facing_direction * length
                pygame.draw.line(screen, (255, 255, 255, 100),
                               (start_x, y), (speed_line_x, y), 1)
    
    def get_movement_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Acceleration': self.acceleration,
            'Deceleration': self.deceleration,
            'Walk Speed': self.max_walk_speed,
            'Run Speed': self.max_run_speed,
            'Current Speed': round(self.current_speed, 2),
            'Speed Tier': ['Idle', 'Walking', 'Running'][self.speed_tier]
        }`,
    },
    optionB: {
      title: 'Instant Movement',
      description: 'Immediate response with no momentum',
      features: ['Instant start/stop', 'Precise control', 'Fixed speeds', 'No sliding'],
      pythonCode: `# Instant Movement (Responsive)
class GroundMovement:
    def __init__(self, player):
        self.player = player
        
        # Movement parameters (tweakable!)
        self.walk_speed = 5           # Fixed walking speed
        self.run_speed = 9            # Fixed running speed
        self.stop_threshold = 0.1     # Instant stop below this speed
        
        # State tracking
        self.is_moving = False
        self.is_running = False
        self.facing_direction = 1  # 1 = right, -1 = left
        self.last_direction = 1
        
        # Asset support
        self.idle_sprite = None
        self.walk_sprites = []  # Animation frames
        self.run_sprites = []   # Animation frames
        self.current_frame = 0
        self.animation_timer = 0
        self.animation_speed = 5  # Frames per animation frame
        
    def update_movement(self, left_pressed, right_pressed, run_pressed):
        """Update instant responsive movement"""
        # Determine movement state
        self.is_running = run_pressed
        current_speed = self.run_speed if self.is_running else self.walk_speed
        
        # Instant movement based on input
        if left_pressed and not right_pressed:
            # Instant left movement
            self.player.velocity_x = -current_speed
            self.is_moving = True
            self.facing_direction = -1
            
        elif right_pressed and not left_pressed:
            # Instant right movement
            self.player.velocity_x = current_speed
            self.is_moving = True
            self.facing_direction = 1
            
        else:
            # Instant stop
            self.player.velocity_x = 0
            self.is_moving = False
        
        # Update animation
        self.update_animation()
        
        # Create movement effects
        if self.is_moving:
            self.create_movement_effects()
    
    def update_animation(self):
        """Update sprite animation with fixed timing"""
        if not self.is_moving:
            # Show idle sprite
            if self.idle_sprite:
                self.player.current_sprite = self.idle_sprite
            self.current_frame = 0
            self.animation_timer = 0
            
        else:
            # Increment animation timer
            self.animation_timer += 1
            
            if self.animation_timer >= self.animation_speed:
                self.animation_timer = 0
                self.current_frame += 1
                
                # Choose sprite set based on speed
                if self.is_running and self.run_sprites:
                    frame_index = self.current_frame % len(self.run_sprites)
                    self.player.current_sprite = self.run_sprites[frame_index]
                elif self.walk_sprites:
                    frame_index = self.current_frame % len(self.walk_sprites)
                    self.player.current_sprite = self.walk_sprites[frame_index]
    
    def create_movement_effects(self):
        """Create simple movement effects"""
        if not hasattr(self, 'move_effects'):
            self.move_effects = []
        
        # Add effect every few frames
        if self.animation_timer % 3 == 0:
            effect_x = self.player.x + self.player.width // 2
            effect_y = self.player.y + self.player.height
            
            self.move_effects.append({
                'x': effect_x,
                'y': effect_y,
                'life': 8,
                'type': 'run' if self.is_running else 'walk'
            })
    
    def stop_instantly(self):
        """Force instant stop"""
        self.player.velocity_x = 0
        self.is_moving = False
        self.current_frame = 0
    
    def reverse_direction(self):
        """Instant direction reversal"""
        self.player.velocity_x *= -1
        self.facing_direction *= -1
    
    def dash_move(self, direction, distance):
        """Instant dash in direction"""
        if direction == 'left':
            self.player.x -= distance
        elif direction == 'right':
            self.player.x += distance
        elif direction == 'up':
            self.player.y -= distance
        elif direction == 'down':
            self.player.y += distance
        
        # Ensure player stays in bounds
        self.player.x = max(0, min(800 - self.player.width, self.player.x))
        self.player.y = max(0, min(600 - self.player.height, self.player.y))
    
    def apply_conveyor_movement(self, conveyor_speed):
        """Apply external movement (like conveyor belts) instantly"""
        self.player.x += conveyor_speed
    
    def draw_effects(self, screen):
        """Draw movement effects"""
        if hasattr(self, 'move_effects'):
            for effect in self.move_effects[:]:
                alpha = effect['life'] / 8.0
                
                if effect['type'] == 'run':
                    # Running creates larger effects
                    size = 4
                    color = (255, 200, 100)
                else:
                    # Walking creates smaller effects
                    size = 2
                    color = (200, 200, 200)
                
                # Fade out effect
                display_color = tuple(int(c * alpha) for c in color)
                pygame.draw.circle(screen, display_color,
                                 (int(effect['x']), int(effect['y'])), size)
                
                effect['life'] -= 1
                if effect['life'] <= 0:
                    self.move_effects.remove(effect)
        
        # Direction indicator when not moving
        if not self.is_moving and hasattr(self.player, 'x'):
            # Draw small arrow showing facing direction
            arrow_x = self.player.x + (self.player.width if self.facing_direction > 0 else 0)
            arrow_y = self.player.y + self.player.height // 2
            
            if self.facing_direction > 0:
                points = [(arrow_x, arrow_y), (arrow_x + 5, arrow_y - 3), (arrow_x + 5, arrow_y + 3)]
            else:
                points = [(arrow_x, arrow_y), (arrow_x - 5, arrow_y - 3), (arrow_x - 5, arrow_y + 3)]
            
            pygame.draw.polygon(screen, (255, 255, 255, 128), points)
    
    def get_movement_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Walk Speed': self.walk_speed,
            'Run Speed': self.run_speed,
            'Is Moving': self.is_moving,
            'Is Running': self.is_running,
            'Direction': 'Right' if self.facing_direction > 0 else 'Left',
            'Current Speed': abs(self.player.velocity_x)
        }`,
    },
  },

  {
    id: 'gravity_system',
    title: 'Gravity System',
    description: 'How gravity affects all physics objects',
    optionA: {
      title: 'Light Gravity',
      description: 'Moon-like gravity with slow, floaty falls',
      features: ['Slow falling', 'Extended air time', 'Gentle landings', 'Float mechanics'],
      pythonCode: `# Light Gravity System (Moon-like)
class GravitySystem:
    def __init__(self):
        # Gravity parameters (tweakable!)
        self.gravity_strength = 0.25      # Low gravity value
        self.terminal_velocity = 8        # Maximum fall speed (low)
        self.float_factor = 0.7           # How much to reduce gravity when floating
        self.air_resistance = 0.98        # Air friction
        self.low_grav_zones = []          # Special low gravity areas
        
        # Physics objects affected by gravity
        self.physics_objects = []
        self.floating_objects = []
        
        # Effects
        self.float_particles = []
        self.gravity_field_visible = False
        
    def add_physics_object(self, obj):
        """Add an object affected by gravity"""
        if obj not in self.physics_objects:
            self.physics_objects.append(obj)
            # Initialize gravity properties
            if not hasattr(obj, 'velocity_y'):
                obj.velocity_y = 0
            if not hasattr(obj, 'is_floating'):
                obj.is_floating = False
            if not hasattr(obj, 'mass'):
                obj.mass = 1.0
    
    def remove_physics_object(self, obj):
        """Remove object from gravity system"""
        if obj in self.physics_objects:
            self.physics_objects.remove(obj)
        if obj in self.floating_objects:
            self.floating_objects.remove(obj)
    
    def update_gravity(self):
        """Apply light gravity to all objects"""
        for obj in self.physics_objects:
            if not obj.on_ground:
                # Check if in low gravity zone
                gravity_multiplier = self.get_zone_gravity(obj.x, obj.y)
                
                # Apply light gravity
                if obj.is_floating:
                    # Even lighter gravity when floating
                    obj.velocity_y += self.gravity_strength * self.float_factor * gravity_multiplier
                    self.create_float_effect(obj)
                else:
                    # Normal light gravity
                    obj.velocity_y += self.gravity_strength * gravity_multiplier
                
                # Apply air resistance for floaty feel
                obj.velocity_y *= self.air_resistance
                
                # Cap at terminal velocity
                if obj.velocity_y > self.terminal_velocity:
                    obj.velocity_y = self.terminal_velocity
                
                # Create float particles for slow falling objects
                if obj.velocity_y < 2 and obj.velocity_y > 0:
                    self.create_float_particles(obj)
    
    def enable_floating(self, obj):
        """Enable floating for an object"""
        obj.is_floating = True
        if obj not in self.floating_objects:
            self.floating_objects.append(obj)
    
    def disable_floating(self, obj):
        """Disable floating for an object"""
        obj.is_floating = False
        if obj in self.floating_objects:
            self.floating_objects.remove(obj)
    
    def add_low_gravity_zone(self, x, y, width, height, strength=0.5):
        """Create a zone with even lower gravity"""
        zone = {
            'rect': pygame.Rect(x, y, width, height),
            'strength': strength,  # Multiplier for gravity (0.5 = half gravity)
            'particles': []
        }
        self.low_grav_zones.append(zone)
        return zone
    
    def get_zone_gravity(self, x, y):
        """Check if position is in a low gravity zone"""
        point = pygame.Rect(x, y, 1, 1)
        for zone in self.low_grav_zones:
            if zone['rect'].colliderect(point):
                return zone['strength']
        return 1.0  # Normal gravity multiplier
    
    def create_float_effect(self, obj):
        """Create visual effect for floating objects"""
        if random.random() < 0.1:  # 10% chance each frame
            particle = {
                'x': obj.x + obj.width // 2 + random.randint(-10, 10),
                'y': obj.y + obj.height,
                'vel_y': -random.uniform(0.5, 1.5),
                'vel_x': random.uniform(-0.5, 0.5),
                'life': 30,
                'size': random.randint(2, 4),
                'color': (200, 200, 255)  # Light blue
            }
            self.float_particles.append(particle)
    
    def create_float_particles(self, obj):
        """Create particles showing light gravity"""
        if random.random() < 0.05:  # 5% chance
            for _ in range(3):
                particle = {
                    'x': obj.x + random.randint(0, obj.width),
                    'y': obj.y + obj.height,
                    'vel_y': -random.uniform(0.2, 0.8),
                    'vel_x': random.uniform(-0.3, 0.3),
                    'life': 40,
                    'size': 2,
                    'color': (180, 180, 255)
                }
                self.float_particles.append(particle)
    
    def apply_anti_gravity_burst(self, x, y, radius, force):
        """Create a temporary anti-gravity burst"""
        for obj in self.physics_objects:
            dist = math.sqrt((obj.x - x)**2 + (obj.y - y)**2)
            if dist < radius and dist > 0:
                # Push objects away from burst center
                push_force = force * (1 - dist / radius)
                angle = math.atan2(obj.y - y, obj.x - x)
                obj.velocity_x += math.cos(angle) * push_force
                obj.velocity_y += math.sin(angle) * push_force - 2  # Extra upward push
    
    def update_particles(self):
        """Update floating particles"""
        for particle in self.float_particles[:]:
            particle['x'] += particle['vel_x']
            particle['y'] += particle['vel_y']
            particle['vel_y'] += 0.02  # Very light gravity for particles
            particle['life'] -= 1
            
            if particle['life'] <= 0:
                self.float_particles.remove(particle)
    
    def draw_gravity_field(self, screen):
        """Draw visual representation of gravity field"""
        if self.gravity_field_visible:
            # Draw flowing lines showing gravity direction
            for x in range(0, 800, 40):
                for y in range(0, 600, 40):
                    # Check zone gravity
                    strength = self.get_zone_gravity(x, y)
                    alpha = int(50 * strength)
                    
                    # Draw downward lines with varying opacity
                    pygame.draw.line(screen, (100, 100, 200, alpha),
                                   (x, y), (x, y + 20 * strength), 1)
        
        # Draw low gravity zones
        for zone in self.low_grav_zones:
            # Draw zone boundary
            pygame.draw.rect(screen, (150, 150, 255, 50), zone['rect'], 2)
            
            # Draw zone particles
            if random.random() < 0.1:
                px = random.randint(zone['rect'].left, zone['rect'].right)
                py = random.randint(zone['rect'].top, zone['rect'].bottom)
                zone['particles'].append({
                    'x': px, 'y': py,
                    'vel_y': -0.5,
                    'life': 50
                })
            
            for particle in zone['particles'][:]:
                particle['y'] += particle['vel_y']
                particle['life'] -= 1
                
                alpha = particle['life'] / 50.0
                pygame.draw.circle(screen, (200, 200, 255),
                                 (int(particle['x']), int(particle['y'])), 2)
                
                if particle['life'] <= 0:
                    zone['particles'].remove(particle)
    
    def draw_effects(self, screen):
        """Draw all gravity effects"""
        # Draw floating particles
        for particle in self.float_particles:
            alpha = particle['life'] / 40.0
            color = tuple(int(c * alpha) for c in particle['color'])
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])),
                             particle['size'])
        
        # Draw gravity field if enabled
        self.draw_gravity_field(screen)
    
    def get_gravity_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Gravity Strength': self.gravity_strength,
            'Terminal Velocity': self.terminal_velocity,
            'Float Factor': self.float_factor,
            'Air Resistance': self.air_resistance,
            'Physics Objects': len(self.physics_objects),
            'Floating Objects': len(self.floating_objects),
            'Low Grav Zones': len(self.low_grav_zones)
        }`,
    },
    optionB: {
      title: 'Heavy Gravity',
      description: 'Realistic gravity with fast, heavy falls',
      features: ['Fast falling', 'Weight matters', 'Fall damage', 'No floating'],
      pythonCode: `# Heavy Gravity System (Realistic)
class GravitySystem:
    def __init__(self):
        # Gravity parameters (tweakable!)
        self.gravity_strength = 0.98      # Earth-like gravity
        self.terminal_velocity = 20       # High terminal velocity
        self.mass_effect = True           # Mass affects fall speed
        self.fall_damage_threshold = 12   # Velocity for fall damage
        
        # Physics objects affected by gravity
        self.physics_objects = []
        self.heavy_objects = []  # Objects with extra mass
        
        # Effects and tracking
        self.impact_effects = []
        self.fall_streaks = []
        self.screen_shake = 0
        
    def add_physics_object(self, obj, mass=1.0):
        """Add an object affected by heavy gravity"""
        if obj not in self.physics_objects:
            self.physics_objects.append(obj)
            
            # Initialize physics properties
            if not hasattr(obj, 'velocity_y'):
                obj.velocity_y = 0
            if not hasattr(obj, 'mass'):
                obj.mass = mass
            if not hasattr(obj, 'fall_distance'):
                obj.fall_distance = 0
            
            # Track heavy objects
            if mass > 2.0:
                self.heavy_objects.append(obj)
    
    def update_gravity(self):
        """Apply heavy gravity to all objects"""
        for obj in self.physics_objects:
            if not obj.on_ground:
                # Apply gravity based on mass
                if self.mass_effect:
                    gravity_force = self.gravity_strength * obj.mass
                else:
                    gravity_force = self.gravity_strength
                
                # Accelerate downward
                obj.velocity_y += gravity_force
                
                # Track fall distance for damage calculation
                if obj.velocity_y > 0:
                    obj.fall_distance += obj.velocity_y
                
                # Cap at terminal velocity (higher for heavier objects)
                max_fall = self.terminal_velocity
                if self.mass_effect:
                    max_fall *= math.sqrt(obj.mass)
                
                if obj.velocity_y > max_fall:
                    obj.velocity_y = max_fall
                
                # Create fall streak effects for fast falling
                if obj.velocity_y > 10:
                    self.create_fall_streak(obj)
            else:
                # Check for fall damage when landing
                if obj.fall_distance > 0:
                    self.handle_landing(obj)
                obj.fall_distance = 0
    
    def handle_landing(self, obj):
        """Handle landing impact based on fall speed"""
        impact_velocity = obj.velocity_y
        
        # Calculate fall damage
        if impact_velocity > self.fall_damage_threshold:
            damage = (impact_velocity - self.fall_damage_threshold) * 5
            
            # Apply damage if object has health
            if hasattr(obj, 'health'):
                obj.health -= damage
                
            # Create heavy impact effect
            self.create_heavy_impact(obj, impact_velocity)
            
            # Screen shake for very heavy impacts
            if impact_velocity > 15:
                self.screen_shake = min(10, int(impact_velocity - 15))
        else:
            # Normal landing
            self.create_normal_impact(obj)
    
    def create_fall_streak(self, obj):
        """Create motion blur effect for falling objects"""
        if random.random() < 0.3:  # 30% chance per frame
            streak = {
                'x': obj.x + obj.width // 2,
                'y': obj.y,
                'width': obj.width,
                'height': min(30, int(obj.velocity_y * 2)),
                'life': 10,
                'velocity': obj.velocity_y
            }
            self.fall_streaks.append(streak)
    
    def create_heavy_impact(self, obj, velocity):
        """Create effect for heavy landing"""
        impact_x = obj.x + obj.width // 2
        impact_y = obj.y + obj.height
        
        # Main impact effect
        self.impact_effects.append({
            'x': impact_x,
            'y': impact_y,
            'radius': 0,
            'max_radius': int(velocity * 3),
            'life': 20,
            'type': 'heavy'
        })
        
        # Create debris particles
        particle_count = int(velocity)
        for _ in range(particle_count):
            angle = random.uniform(0, math.pi)  # Upward semicircle
            speed = random.uniform(2, velocity / 2)
            
            self.impact_effects.append({
                'x': impact_x,
                'y': impact_y,
                'vel_x': math.cos(angle) * speed,
                'vel_y': -abs(math.sin(angle) * speed),  # Always upward initially
                'life': 30,
                'type': 'debris',
                'size': random.randint(2, 5)
            })
    
    def create_normal_impact(self, obj):
        """Create effect for normal landing"""
        self.impact_effects.append({
            'x': obj.x + obj.width // 2,
            'y': obj.y + obj.height,
            'radius': 0,
            'max_radius': 15,
            'life': 10,
            'type': 'normal'
        })
    
    def apply_explosion_force(self, x, y, radius, force):
        """Apply explosive force to objects (throws them up)"""
        for obj in self.physics_objects:
            dist = math.sqrt((obj.x - x)**2 + (obj.y - y)**2)
            if dist < radius and dist > 0:
                # Calculate force based on distance and mass
                push_force = (force / obj.mass) * (1 - dist / radius)
                angle = math.atan2(obj.y - y, obj.x - x)
                
                # Apply force (mostly upward for explosions)
                obj.velocity_x += math.cos(angle) * push_force * 0.5
                obj.velocity_y += min(-5, math.sin(angle) * push_force - push_force)
    
    def update_effects(self):
        """Update all gravity effects"""
        # Update fall streaks
        for streak in self.fall_streaks[:]:
            streak['life'] -= 1
            streak['y'] += 2  # Streak fades downward
            
            if streak['life'] <= 0:
                self.fall_streaks.remove(streak)
        
        # Update impact effects
        for effect in self.impact_effects[:]:
            if effect['type'] in ['heavy', 'normal']:
                # Expanding circle effect
                effect['radius'] += (effect['max_radius'] - effect['radius']) * 0.3
                effect['life'] -= 1
                
            elif effect['type'] == 'debris':
                # Flying debris
                effect['x'] += effect['vel_x']
                effect['y'] += effect['vel_y']
                effect['vel_y'] += 0.8  # Debris affected by gravity too
                effect['life'] -= 1
            
            if effect['life'] <= 0:
                self.impact_effects.remove(effect)
        
        # Update screen shake
        if self.screen_shake > 0:
            self.screen_shake -= 1
    
    def draw_effects(self, screen):
        """Draw all gravity effects"""
        # Draw fall streaks
        for streak in self.fall_streaks:
            alpha = streak['life'] / 10.0
            color = (255, 255, 255, int(100 * alpha))
            
            # Draw motion blur line
            pygame.draw.line(screen, color[:3],
                           (streak['x'], streak['y']),
                           (streak['x'], streak['y'] - streak['height']), 
                           max(1, streak['width'] // 4))
        
        # Draw impact effects
        for effect in self.impact_effects:
            if effect['type'] == 'heavy':
                # Heavy impact ring
                alpha = effect['life'] / 20.0
                pygame.draw.circle(screen, (255, 200, 100),
                                 (int(effect['x']), int(effect['y'])),
                                 int(effect['radius']), max(1, int(3 * alpha)))
                
            elif effect['type'] == 'normal':
                # Normal impact puff
                alpha = effect['life'] / 10.0
                pygame.draw.circle(screen, (200, 200, 200),
                                 (int(effect['x']), int(effect['y'])),
                                 int(effect['radius']), 1)
                
            elif effect['type'] == 'debris':
                # Flying debris particles
                pygame.draw.circle(screen, (150, 100, 50),
                                 (int(effect['x']), int(effect['y'])),
                                 effect['size'])
        
        # Apply screen shake offset (caller should use this)
        if self.screen_shake > 0:
            shake_offset = (
                random.randint(-self.screen_shake, self.screen_shake),
                random.randint(-self.screen_shake, self.screen_shake)
            )
            return shake_offset
        return (0, 0)
    
    def get_gravity_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Gravity Strength': self.gravity_strength,
            'Terminal Velocity': self.terminal_velocity,
            'Mass Effect': self.mass_effect,
            'Fall Damage Threshold': self.fall_damage_threshold,
            'Physics Objects': len(self.physics_objects),
            'Heavy Objects': len(self.heavy_objects),
            'Screen Shake': self.screen_shake
        }`,
    },
  },

  {
    id: 'dash_move',
    title: 'Dash/Special Move',
    description: 'Quick movement abilities with cooldowns',
    optionA: {
      title: 'Air Dash',
      description: 'Quick omnidirectional dash that works in mid-air',
      features: ['8-directional dash', 'Air mobility', 'Dash chaining', 'After-images'],
      pythonCode: `# Air Dash System
class DashSystem:
    def __init__(self, player):
        self.player = player
        
        # Dash parameters (tweakable!)
        self.dash_speed = 20           # Dash velocity
        self.dash_distance = 100       # Maximum dash distance
        self.dash_duration = 10        # Frames of dash
        self.dash_cooldown_time = 30   # Frames between dashes
        self.air_dashes_max = 2        # Dashes available in air
        self.dash_trail_length = 5     # Number of after-images
        
        # State tracking
        self.is_dashing = False
        self.dash_timer = 0
        self.dash_cooldown = 0
        self.air_dashes_remaining = self.air_dashes_max
        self.dash_direction = (0, 0)
        self.dash_start_pos = (0, 0)
        
        # Visual effects
        self.after_images = []
        self.dash_particles = []
        self.dash_trail = []
        
        # Asset support
        self.dash_sprite = None
        self.dash_effect_sprite = None
        
    def can_dash(self):
        """Check if dash is available"""
        if self.dash_cooldown > 0 or self.is_dashing:
            return False
        
        if self.player.on_ground:
            return True
        else:
            return self.air_dashes_remaining > 0
    
    def start_dash(self, direction_x, direction_y):
        """Initiate an air dash"""
        if not self.can_dash():
            return False
        
        # Normalize direction
        length = math.sqrt(direction_x**2 + direction_y**2)
        if length > 0:
            direction_x /= length
            direction_y /= length
        else:
            # Default to facing direction if no input
            direction_x = 1 if self.player.facing_right else -1
            direction_y = 0
        
        # Start dash
        self.is_dashing = True
        self.dash_timer = self.dash_duration
        self.dash_direction = (direction_x, direction_y)
        self.dash_start_pos = (self.player.x, self.player.y)
        
        # Set dash velocity
        self.player.velocity_x = direction_x * self.dash_speed
        self.player.velocity_y = direction_y * self.dash_speed
        
        # Consume air dash if not on ground
        if not self.player.on_ground:
            self.air_dashes_remaining -= 1
        
        # Create dash start effect
        self.create_dash_start_effect()
        
        # Set dash sprite
        if self.dash_sprite:
            self.player.current_sprite = self.dash_sprite
        
        return True
    
    def update_dash(self):
        """Update dash mechanics"""
        # Update cooldown
        if self.dash_cooldown > 0:
            self.dash_cooldown -= 1
        
        # Update active dash
        if self.is_dashing:
            self.dash_timer -= 1
            
            # Maintain dash velocity
            self.player.velocity_x = self.dash_direction[0] * self.dash_speed
            self.player.velocity_y = self.dash_direction[1] * self.dash_speed
            
            # Create after-image
            if self.dash_timer % 2 == 0:  # Every 2 frames
                self.create_after_image()
            
            # Create dash trail particles
            self.create_dash_trail()
            
            # End dash
            if self.dash_timer <= 0:
                self.end_dash()
        
        # Reset air dashes when on ground
        if self.player.on_ground:
            self.air_dashes_remaining = self.air_dashes_max
        
        # Update visual effects
        self.update_effects()
    
    def end_dash(self):
        """End the dash"""
        self.is_dashing = False
        self.dash_cooldown = self.dash_cooldown_time
        
        # Reduce velocity after dash
        self.player.velocity_x *= 0.5
        self.player.velocity_y *= 0.5
        
        # Create end effect
        self.create_dash_end_effect()
    
    def create_after_image(self):
        """Create an after-image trail effect"""
        after_image = {
            'x': self.player.x,
            'y': self.player.y,
            'width': self.player.width,
            'height': self.player.height,
            'life': 15,
            'sprite': self.player.current_sprite,
            'alpha': 150
        }
        self.after_images.append(after_image)
        
        # Limit after-images
        if len(self.after_images) > self.dash_trail_length:
            self.after_images.pop(0)
    
    def create_dash_trail(self):
        """Create particle trail during dash"""
        for _ in range(2):
            particle = {
                'x': self.player.x + self.player.width // 2 + random.randint(-5, 5),
                'y': self.player.y + self.player.height // 2 + random.randint(-5, 5),
                'vel_x': -self.dash_direction[0] * random.uniform(1, 3),
                'vel_y': -self.dash_direction[1] * random.uniform(1, 3),
                'life': 20,
                'size': random.randint(2, 4),
                'color': (100, 200, 255)  # Cyan trail
            }
            self.dash_particles.append(particle)
    
    def create_dash_start_effect(self):
        """Create visual effect when dash starts"""
        x = self.player.x + self.player.width // 2
        y = self.player.y + self.player.height // 2
        
        # Burst of particles
        for angle in range(0, 360, 20):
            rad = math.radians(angle)
            particle = {
                'x': x,
                'y': y,
                'vel_x': math.cos(rad) * 5,
                'vel_y': math.sin(rad) * 5,
                'life': 25,
                'size': 3,
                'color': (150, 220, 255)
            }
            self.dash_particles.append(particle)
    
    def create_dash_end_effect(self):
        """Create visual effect when dash ends"""
        x = self.player.x + self.player.width // 2
        y = self.player.y + self.player.height // 2
        
        # Implosion effect
        for _ in range(10):
            angle = random.uniform(0, math.pi * 2)
            dist = random.uniform(20, 30)
            particle = {
                'x': x + math.cos(angle) * dist,
                'y': y + math.sin(angle) * dist,
                'vel_x': -math.cos(angle) * 2,
                'vel_y': -math.sin(angle) * 2,
                'life': 15,
                'size': 2,
                'color': (100, 150, 255)
            }
            self.dash_particles.append(particle)
    
    def chain_dash(self, new_direction_x, new_direction_y):
        """Perform a chained dash (if upgraded)"""
        if self.is_dashing and self.dash_timer < self.dash_duration // 2:
            # Allow direction change mid-dash
            length = math.sqrt(new_direction_x**2 + new_direction_y**2)
            if length > 0:
                self.dash_direction = (new_direction_x / length, new_direction_y / length)
                self.dash_timer = min(self.dash_timer + 5, self.dash_duration)
                self.create_dash_start_effect()
                return True
        return False
    
    def update_effects(self):
        """Update visual effects"""
        # Update after-images
        for after_image in self.after_images[:]:
            after_image['life'] -= 1
            after_image['alpha'] = int(150 * (after_image['life'] / 15.0))
            
            if after_image['life'] <= 0:
                self.after_images.remove(after_image)
        
        # Update particles
        for particle in self.dash_particles[:]:
            particle['x'] += particle['vel_x']
            particle['y'] += particle['vel_y']
            particle['vel_x'] *= 0.95  # Deceleration
            particle['vel_y'] *= 0.95
            particle['life'] -= 1
            
            if particle['life'] <= 0:
                self.dash_particles.remove(particle)
    
    def draw_effects(self, screen):
        """Draw dash effects"""
        # Draw after-images
        for after_image in self.after_images:
            # Create transparent surface
            s = pygame.Surface((after_image['width'], after_image['height']))
            s.set_alpha(after_image['alpha'])
            s.fill((100, 150, 255))  # Tinted blue
            screen.blit(s, (after_image['x'], after_image['y']))
        
        # Draw particles
        for particle in self.dash_particles:
            alpha = particle['life'] / 25.0
            color = tuple(int(c * alpha) for c in particle['color'])
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])),
                             particle['size'])
        
        # Draw dash UI
        self.draw_dash_ui(screen)
    
    def draw_dash_ui(self, screen):
        """Draw dash availability UI"""
        # Draw dash charges
        ui_x = 10
        ui_y = 100
        
        for i in range(self.air_dashes_max):
            color = (100, 200, 255) if i < self.air_dashes_remaining else (50, 50, 50)
            pygame.draw.circle(screen, color, (ui_x + i * 25, ui_y), 8)
            pygame.draw.circle(screen, (255, 255, 255), (ui_x + i * 25, ui_y), 8, 2)
        
        # Draw cooldown bar
        if self.dash_cooldown > 0:
            bar_width = 100
            bar_height = 5
            cooldown_percent = self.dash_cooldown / self.dash_cooldown_time
            
            pygame.draw.rect(screen, (50, 50, 50), (ui_x, ui_y + 15, bar_width, bar_height))
            pygame.draw.rect(screen, (255, 100, 100), 
                           (ui_x, ui_y + 15, int(bar_width * cooldown_percent), bar_height))
    
    def get_dash_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Dash Speed': self.dash_speed,
            'Dash Distance': self.dash_distance,
            'Dash Duration': self.dash_duration,
            'Cooldown Time': self.dash_cooldown_time,
            'Air Dashes Max': self.air_dashes_max,
            'Air Dashes Left': self.air_dashes_remaining,
            'Is Dashing': self.is_dashing,
            'Cooldown': self.dash_cooldown
        }`,
    },
    optionB: {
      title: 'Ground Slide',
      description: 'Fast sliding dash along the ground',
      features: ['Ground-only', 'Goes under obstacles', 'Momentum based', 'Slide combos'],
      pythonCode: `# Ground Slide System
class DashSystem:
    def __init__(self, player):
        self.player = player
        
        # Slide parameters (tweakable!)
        self.slide_speed = 15          # Initial slide velocity
        self.slide_deceleration = 0.9  # Slide friction
        self.slide_duration_max = 30   # Maximum slide frames
        self.slide_cooldown_time = 45  # Frames between slides
        self.slide_height_reduction = 0.5  # Player height multiplier during slide
        
        # State tracking
        self.is_sliding = False
        self.slide_timer = 0
        self.slide_cooldown = 0
        self.slide_direction = 1  # 1 or -1
        self.slide_speed_current = 0
        self.can_slide_jump = True
        self.slide_combo = 0
        
        # Visual effects
        self.slide_trail = []
        self.dust_particles = []
        self.spark_effects = []
        
        # Asset support
        self.slide_sprite = None
        self.dust_sprite = None
        
        # Original height for restoration
        self.original_height = None
    
    def can_slide(self):
        """Check if slide is available"""
        return (self.player.on_ground and 
                not self.is_sliding and 
                self.slide_cooldown <= 0 and
                abs(self.player.velocity_x) > 1)  # Need some movement to slide
    
    def start_slide(self):
        """Initiate a ground slide"""
        if not self.can_slide():
            return False
        
        # Determine slide direction from current movement
        self.slide_direction = 1 if self.player.velocity_x >= 0 else -1
        
        # Start slide
        self.is_sliding = True
        self.slide_timer = self.slide_duration_max
        self.slide_speed_current = max(abs(self.player.velocity_x), self.slide_speed)
        self.can_slide_jump = True
        
        # Reduce hitbox height
        self.original_height = self.player.height
        self.player.height = int(self.original_height * self.slide_height_reduction)
        self.player.y += self.original_height - self.player.height  # Adjust position
        
        # Set slide velocity
        self.player.velocity_x = self.slide_direction * self.slide_speed_current
        
        # Combo tracking
        if self.slide_combo > 0 and self.slide_cooldown < 10:
            self.slide_combo += 1
            self.slide_speed_current *= 1.2  # Speed boost for combos
        else:
            self.slide_combo = 1
        
        # Create slide start effect
        self.create_slide_start_effect()
        
        # Set slide sprite
        if self.slide_sprite:
            self.player.current_sprite = self.slide_sprite
        
        return True
    
    def update_slide(self):
        """Update slide mechanics"""
        # Update cooldown
        if self.slide_cooldown > 0:
            self.slide_cooldown -= 1
        
        # Update active slide
        if self.is_sliding:
            self.slide_timer -= 1
            
            # Decelerate slide
            self.slide_speed_current *= self.slide_deceleration
            self.player.velocity_x = self.slide_direction * self.slide_speed_current
            
            # Create slide effects
            if self.slide_timer % 2 == 0:
                self.create_dust_effect()
            
            if self.slide_speed_current > 10:  # Sparks at high speed
                self.create_spark_effect()
            
            # Create slide trail
            self.create_slide_trail()
            
            # End slide conditions
            if (self.slide_timer <= 0 or 
                self.slide_speed_current < 2 or 
                not self.player.on_ground):
                self.end_slide()
        
        # Update visual effects
        self.update_effects()
    
    def end_slide(self):
        """End the slide"""
        if self.is_sliding:
            self.is_sliding = False
            self.slide_cooldown = self.slide_cooldown_time
            
            # Restore hitbox height
            if self.original_height:
                self.player.y -= self.player.height  # Adjust position back
                self.player.height = self.original_height
                self.player.y += self.player.height
                self.original_height = None
            
            # Momentum carry-over
            self.player.velocity_x = self.slide_direction * self.slide_speed_current * 0.7
            
            # Create end effect
            self.create_slide_end_effect()
    
    def slide_jump(self):
        """Perform a jump during slide (slide-jump combo)"""
        if self.is_sliding and self.can_slide_jump:
            # Boost jump based on slide speed
            jump_boost = self.slide_speed_current * 0.3
            self.player.velocity_y = -(12 + jump_boost)  # Enhanced jump
            self.player.velocity_x = self.slide_direction * self.slide_speed_current
            
            self.can_slide_jump = False
            self.end_slide()  # End slide but keep momentum
            
            # Create special effect
            self.create_slide_jump_effect()
            return True
        return False
    
    def slide_under_obstacle(self, obstacle_rect):
        """Check if can slide under an obstacle"""
        if self.is_sliding:
            # Sliding hitbox can go under taller obstacles
            player_rect = pygame.Rect(self.player.x, self.player.y,
                                     self.player.width, self.player.height)
            
            # Check if obstacle is above sliding height
            if obstacle_rect.bottom > player_rect.top and obstacle_rect.top < player_rect.top:
                return True  # Can slide under
        return False
    
    def create_dust_effect(self):
        """Create dust particles during slide"""
        for _ in range(3):
            particle = {
                'x': self.player.x + random.randint(0, self.player.width),
                'y': self.player.y + self.player.height,
                'vel_x': -self.slide_direction * random.uniform(1, 3),
                'vel_y': -random.uniform(1, 3),
                'life': 20,
                'size': random.randint(3, 6),
                'color': (150, 120, 90)  # Brown dust
            }
            self.dust_particles.append(particle)
    
    def create_spark_effect(self):
        """Create sparks during high-speed slide"""
        if random.random() < 0.3:  # 30% chance
            spark = {
                'x': self.player.x + (0 if self.slide_direction > 0 else self.player.width),
                'y': self.player.y + self.player.height - 5,
                'vel_x': -self.slide_direction * random.uniform(2, 5),
                'vel_y': -random.uniform(2, 4),
                'life': 10,
                'size': 2,
                'color': (255, 230, 100)  # Yellow spark
            }
            self.spark_effects.append(spark)
    
    def create_slide_trail(self):
        """Create motion trail during slide"""
        trail_segment = {
            'x': self.player.x,
            'y': self.player.y,
            'width': self.player.width,
            'height': self.player.height,
            'life': 10,
            'alpha': 100
        }
        self.slide_trail.append(trail_segment)
        
        # Limit trail length
        if len(self.slide_trail) > 8:
            self.slide_trail.pop(0)
    
    def create_slide_start_effect(self):
        """Create effect when slide starts"""
        # Dust burst
        for _ in range(10):
            particle = {
                'x': self.player.x + self.player.width // 2,
                'y': self.player.y + self.player.height,
                'vel_x': random.uniform(-3, 3),
                'vel_y': -random.uniform(1, 4),
                'life': 25,
                'size': random.randint(2, 5),
                'color': (120, 100, 80)
            }
            self.dust_particles.append(particle)
    
    def create_slide_end_effect(self):
        """Create effect when slide ends"""
        # Dust puff
        for _ in range(5):
            particle = {
                'x': self.player.x + (self.player.width if self.slide_direction > 0 else 0),
                'y': self.player.y + self.player.height,
                'vel_x': self.slide_direction * random.uniform(1, 3),
                'vel_y': -random.uniform(1, 2),
                'life': 15,
                'size': 3,
                'color': (140, 110, 90)
            }
            self.dust_particles.append(particle)
    
    def create_slide_jump_effect(self):
        """Create effect for slide-jump combo"""
        # Radial burst
        x = self.player.x + self.player.width // 2
        y = self.player.y + self.player.height
        
        for angle in range(0, 360, 30):
            rad = math.radians(angle)
            particle = {
                'x': x,
                'y': y,
                'vel_x': math.cos(rad) * 4,
                'vel_y': math.sin(rad) * 4 - 2,  # Upward bias
                'life': 20,
                'size': 3,
                'color': (200, 150, 100)
            }
            self.dust_particles.append(particle)
    
    def update_effects(self):
        """Update visual effects"""
        # Update slide trail
        for trail in self.slide_trail[:]:
            trail['life'] -= 1
            trail['alpha'] = int(100 * (trail['life'] / 10.0))
            
            if trail['life'] <= 0:
                self.slide_trail.remove(trail)
        
        # Update dust particles
        for particle in self.dust_particles[:]:
            particle['x'] += particle['vel_x']
            particle['y'] += particle['vel_y']
            particle['vel_y'] += 0.3  # Gravity
            particle['life'] -= 1
            
            if particle['life'] <= 0:
                self.dust_particles.remove(particle)
        
        # Update sparks
        for spark in self.spark_effects[:]:
            spark['x'] += spark['vel_x']
            spark['y'] += spark['vel_y']
            spark['vel_y'] += 0.5  # Gravity
            spark['life'] -= 1
            
            if spark['life'] <= 0:
                self.spark_effects.remove(spark)
    
    def draw_effects(self, screen):
        """Draw slide effects"""
        # Draw slide trail
        for trail in self.slide_trail:
            s = pygame.Surface((trail['width'], trail['height']))
            s.set_alpha(trail['alpha'])
            s.fill((100, 100, 150))  # Slight blue tint
            screen.blit(s, (trail['x'], trail['y']))
        
        # Draw dust particles
        for particle in self.dust_particles:
            alpha = particle['life'] / 25.0
            color = tuple(int(c * alpha) for c in particle['color'])
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])),
                             particle['size'])
        
        # Draw sparks
        for spark in self.spark_effects:
            pygame.draw.circle(screen, spark['color'],
                             (int(spark['x']), int(spark['y'])),
                             spark['size'])
        
        # Draw slide UI
        self.draw_slide_ui(screen)
    
    def draw_slide_ui(self, screen):
        """Draw slide availability UI"""
        ui_x = 10
        ui_y = 100
        
        # Slide ready indicator
        if self.can_slide():
            color = (100, 255, 100)
            text = "SLIDE READY"
        elif self.is_sliding:
            color = (255, 200, 100)
            text = f"SLIDING x{self.slide_combo}"
        else:
            color = (150, 150, 150)
            text = f"COOLDOWN: {self.slide_cooldown}"
        
        font = pygame.font.Font(None, 20)
        text_surface = font.render(text, True, color)
        screen.blit(text_surface, (ui_x, ui_y))
        
        # Slide speed meter
        if self.is_sliding:
            bar_width = 100
            bar_height = 5
            speed_percent = self.slide_speed_current / self.slide_speed
            
            pygame.draw.rect(screen, (50, 50, 50), 
                           (ui_x, ui_y + 25, bar_width, bar_height))
            pygame.draw.rect(screen, (255, 200, 0),
                           (ui_x, ui_y + 25, int(bar_width * speed_percent), bar_height))
    
    def get_dash_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Slide Speed': self.slide_speed,
            'Deceleration': self.slide_deceleration,
            'Max Duration': self.slide_duration_max,
            'Cooldown Time': self.slide_cooldown_time,
            'Height Reduction': self.slide_height_reduction,
            'Is Sliding': self.is_sliding,
            'Current Speed': round(self.slide_speed_current, 2),
            'Slide Combo': self.slide_combo
        }`,
    },
  },

  {
    id: 'water_physics',
    title: 'Swimming/Water Physics',
    description: 'How characters move and interact with water',
    optionA: {
      title: 'Float and Paddle',
      description: 'Buoyant swimming with easy floating',
      features: ['Natural buoyancy', 'Treading water', 'Smooth swimming', 'Breath meter'],
      pythonCode: `# Float and Paddle Swimming System
class WaterPhysics:
    def __init__(self, player):
        self.player = player
        
        # Water parameters (tweakable!)
        self.buoyancy_force = 1.2      # Upward force in water
        self.water_resistance = 0.8    # Movement dampening
        self.swim_speed = 3             # Swimming velocity
        self.float_level = 0.3          # Natural floating position (% from surface)
        self.breath_max = 300           # Frames of breath (5 seconds at 60 FPS)
        self.paddle_strength = 2        # Upward force per paddle
        
        # State tracking
        self.in_water = False
        self.water_depth = 0
        self.water_surface_y = 0
        self.breath_remaining = self.breath_max
        self.is_underwater = False
        self.paddle_cooldown = 0
        self.float_offset = 0  # For bobbing animation
        
        # Visual effects
        self.bubbles = []
        self.ripples = []
        self.splash_particles = []
        
        # Asset support
        self.swim_sprites = []
        self.float_sprite = None
        self.underwater_sprite = None
        
    def enter_water(self, water_rect):
        """Handle entering water"""
        if not self.in_water:
            self.in_water = True
            self.water_surface_y = water_rect.top
            self.water_depth = water_rect.bottom
            
            # Apply water entry effects
            entry_speed = abs(self.player.velocity_y)
            self.create_splash_effect(entry_speed)
            
            # Reduce velocity on entry
            self.player.velocity_y *= 0.3
            self.player.velocity_x *= 0.7
            
            # Reset breath
            self.breath_remaining = self.breath_max
    
    def exit_water(self):
        """Handle leaving water"""
        if self.in_water:
            self.in_water = False
            self.is_underwater = False
            
            # Create exit splash
            self.create_splash_effect(5)
            
            # Boost upward velocity slightly
            if self.player.velocity_y < 0:
                self.player.velocity_y *= 1.2
    
    def update_swimming(self):
        """Update swimming physics"""
        if not self.in_water:
            return
        
        # Check if underwater
        self.is_underwater = self.player.y > self.water_surface_y + 10
        
        # Apply buoyancy
        self.apply_buoyancy()
        
        # Apply water resistance
        self.player.velocity_x *= self.water_resistance
        self.player.velocity_y *= self.water_resistance
        
        # Handle swimming input
        self.handle_swim_input()
        
        # Update breath
        self.update_breath()
        
        # Natural floating animation
        self.update_float_animation()
        
        # Create water effects
        self.update_water_effects()
        
        # Update paddle cooldown
        if self.paddle_cooldown > 0:
            self.paddle_cooldown -= 1
    
    def apply_buoyancy(self):
        """Apply upward buoyant force"""
        # Calculate depth below surface
        depth = self.player.y - self.water_surface_y
        
        if depth > 0:
            # Stronger buoyancy near surface
            buoyancy = self.buoyancy_force * (1 - depth / (self.water_depth - self.water_surface_y))
            buoyancy = max(0, buoyancy)
            
            # Apply upward force
            self.player.velocity_y -= buoyancy
            
            # Natural floating position
            target_depth = (self.water_depth - self.water_surface_y) * self.float_level
            if abs(depth - target_depth) < 20:
                # Stabilize at float level
                self.player.velocity_y *= 0.9
    
    def handle_swim_input(self):
        """Handle swimming controls"""
        keys = pygame.key.get_pressed()
        
        # Horizontal swimming
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.player.velocity_x -= self.swim_speed
            self.create_swim_bubbles()
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.player.velocity_x += self.swim_speed
            self.create_swim_bubbles()
        
        # Vertical swimming
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            # Paddle upward
            if self.paddle_cooldown <= 0:
                self.paddle_up()
                
        elif keys[pygame.K_DOWN] or keys[pygame.K_s]:
            # Dive down
            self.player.velocity_y += self.swim_speed * 0.7
        
        # Treading water (stay at surface)
        if keys[pygame.K_SPACE] and not self.is_underwater:
            if self.player.y > self.water_surface_y - 10:
                self.player.velocity_y -= self.paddle_strength * 0.5
                if random.random() < 0.1:
                    self.create_ripple()
    
    def paddle_up(self):
        """Perform upward paddle motion"""
        self.player.velocity_y -= self.paddle_strength
        self.paddle_cooldown = 10
        
        # Create paddle effect
        self.create_paddle_effect()
        
        # Bubbles when underwater
        if self.is_underwater:
            for _ in range(5):
                self.create_bubble()
    
    def update_breath(self):
        """Update breath meter"""
        if self.is_underwater:
            self.breath_remaining -= 1
            
            # Create warning bubbles when low on breath
            if self.breath_remaining < 60 and self.breath_remaining % 10 == 0:
                for _ in range(3):
                    self.create_bubble(large=True)
            
            # Take damage when out of breath
            if self.breath_remaining <= 0:
                if hasattr(self.player, 'health'):
                    self.player.health -= 1
                self.breath_remaining = 0
        else:
            # Recover breath at surface
            self.breath_remaining = min(self.breath_max, self.breath_remaining + 3)
    
    def update_float_animation(self):
        """Create bobbing effect at surface"""
        if not self.is_underwater:
            self.float_offset = math.sin(pygame.time.get_ticks() * 0.003) * 3
            
            # Apply gentle vertical movement
            if abs(self.player.velocity_y) < 1:
                self.player.y += self.float_offset * 0.1
    
    def create_splash_effect(self, intensity):
        """Create water splash particles"""
        particle_count = int(intensity * 3)
        
        for _ in range(particle_count):
            particle = {
                'x': self.player.x + self.player.width // 2,
                'y': self.water_surface_y,
                'vel_x': random.uniform(-intensity/2, intensity/2),
                'vel_y': -random.uniform(intensity/3, intensity),
                'life': 30,
                'size': random.randint(2, 5),
                'color': (150, 200, 255)  # Light blue
            }
            self.splash_particles.append(particle)
    
    def create_bubble(self, large=False):
        """Create air bubble"""
        size = random.randint(4, 8) if large else random.randint(2, 4)
        bubble = {
            'x': self.player.x + self.player.width // 2 + random.randint(-10, 10),
            'y': self.player.y + random.randint(0, self.player.height),
            'vel_y': -random.uniform(1, 2),
            'vel_x': random.uniform(-0.5, 0.5),
            'size': size,
            'life': 60,
            'wobble': random.uniform(0, math.pi * 2)
        }
        self.bubbles.append(bubble)
    
    def create_swim_bubbles(self):
        """Create bubbles while swimming"""
        if self.is_underwater and random.random() < 0.2:
            self.create_bubble()
    
    def create_ripple(self):
        """Create surface ripple"""
        ripple = {
            'x': self.player.x + self.player.width // 2,
            'y': self.water_surface_y,
            'radius': 5,
            'max_radius': 30,
            'life': 20,
            'alpha': 150
        }
        self.ripples.append(ripple)
    
    def create_paddle_effect(self):
        """Create effect for paddle motion"""
        # Water displacement effect
        for _ in range(8):
            particle = {
                'x': self.player.x + self.player.width // 2,
                'y': self.player.y + self.player.height,
                'vel_x': random.uniform(-2, 2),
                'vel_y': random.uniform(1, 3),
                'life': 15,
                'size': 3,
                'color': (180, 220, 255)
            }
            self.splash_particles.append(particle)
    
    def update_water_effects(self):
        """Update all water visual effects"""
        # Update bubbles
        for bubble in self.bubbles[:]:
            bubble['y'] += bubble['vel_y']
            bubble['x'] += bubble['vel_x'] + math.sin(bubble['wobble']) * 0.3
            bubble['wobble'] += 0.1
            bubble['life'] -= 1
            
            # Pop at surface
            if bubble['y'] <= self.water_surface_y:
                self.bubbles.remove(bubble)
                # Create small ripple
                if random.random() < 0.3:
                    self.create_ripple()
            elif bubble['life'] <= 0:
                self.bubbles.remove(bubble)
        
        # Update ripples
        for ripple in self.ripples[:]:
            ripple['radius'] += (ripple['max_radius'] - ripple['radius']) * 0.2
            ripple['life'] -= 1
            ripple['alpha'] = int(150 * (ripple['life'] / 20.0))
            
            if ripple['life'] <= 0:
                self.ripples.remove(ripple)
        
        # Update splash particles
        for particle in self.splash_particles[:]:
            particle['x'] += particle['vel_x']
            particle['y'] += particle['vel_y']
            particle['vel_y'] += 0.5  # Gravity
            particle['life'] -= 1
            
            if particle['life'] <= 0:
                self.splash_particles.remove(particle)
    
    def draw_effects(self, screen):
        """Draw water effects"""
        # Draw underwater tint
        if self.is_underwater:
            underwater_surface = pygame.Surface((800, 600))
            underwater_surface.set_alpha(50)
            underwater_surface.fill((0, 100, 200))
            screen.blit(underwater_surface, (0, 0))
        
        # Draw water surface line
        if self.in_water:
            pygame.draw.line(screen, (100, 150, 255),
                           (0, self.water_surface_y),
                           (800, self.water_surface_y), 2)
        
        # Draw ripples
        for ripple in self.ripples:
            s = pygame.Surface((ripple['radius'] * 2, ripple['radius'] * 2))
            s.set_alpha(ripple['alpha'])
            pygame.draw.circle(s, (200, 230, 255),
                             (ripple['radius'], ripple['radius']),
                             ripple['radius'], 2)
            screen.blit(s, (ripple['x'] - ripple['radius'], 
                           ripple['y'] - ripple['radius']))
        
        # Draw bubbles
        for bubble in self.bubbles:
            pygame.draw.circle(screen, (220, 240, 255),
                             (int(bubble['x']), int(bubble['y'])),
                             bubble['size'])
            pygame.draw.circle(screen, (255, 255, 255),
                             (int(bubble['x'] - bubble['size']//3), 
                              int(bubble['y'] - bubble['size']//3)),
                             bubble['size'] // 3)
        
        # Draw splash particles
        for particle in self.splash_particles:
            alpha = particle['life'] / 30.0
            color = tuple(int(c * alpha) for c in particle['color'])
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])),
                             particle['size'])
        
        # Draw breath meter
        if self.is_underwater:
            self.draw_breath_meter(screen)
    
    def draw_breath_meter(self, screen):
        """Draw breath remaining UI"""
        bar_width = 100
        bar_height = 10
        bar_x = self.player.x - 25
        bar_y = self.player.y - 20
        
        breath_percent = self.breath_remaining / self.breath_max
        
        # Warning color when low
        if breath_percent > 0.3:
            color = (100, 200, 255)
        else:
            color = (255, 100, 100)
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50),
                       (bar_x, bar_y, bar_width, bar_height))
        # Fill
        pygame.draw.rect(screen, color,
                       (bar_x, bar_y, int(bar_width * breath_percent), bar_height))
        # Border
        pygame.draw.rect(screen, (255, 255, 255),
                       (bar_x, bar_y, bar_width, bar_height), 1)
    
    def get_water_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Buoyancy Force': self.buoyancy_force,
            'Water Resistance': self.water_resistance,
            'Swim Speed': self.swim_speed,
            'Float Level': self.float_level,
            'Breath Max': self.breath_max,
            'Breath Remaining': self.breath_remaining,
            'In Water': self.in_water,
            'Underwater': self.is_underwater
        }`,
    },
    optionB: {
      title: 'Sink and Swim',
      description: 'Must actively swim to stay afloat',
      features: [
        'Active swimming required',
        'Sinking mechanics',
        'Stroke timing',
        'Diving ability',
      ],
      pythonCode: `# Sink and Swim System
class WaterPhysics:
    def __init__(self, player):
        self.player = player
        
        # Water parameters (tweakable!)
        self.sink_rate = 1.5           # How fast player sinks
        self.swim_thrust = 4           # Upward force per stroke
        self.stroke_efficiency = 1.0   # Stroke power multiplier
        self.stroke_cooldown_time = 15 # Frames between strokes
        self.water_drag = 0.85         # Heavy water resistance
        self.dive_speed = 5            # Active diving speed
        self.stamina_max = 200         # Swimming stamina
        
        # State tracking
        self.in_water = False
        self.water_surface_y = 0
        self.water_bottom_y = 600
        self.is_underwater = False
        self.is_sinking = True
        self.stroke_cooldown = 0
        self.stamina = self.stamina_max
        self.stroke_count = 0
        self.last_stroke_time = 0
        self.stroke_rhythm = []  # Track stroke timing
        
        # Visual effects
        self.water_trails = []
        self.struggle_bubbles = []
        self.dive_bubbles = []
        
        # Asset support
        self.stroke_sprites = []
        self.sink_sprite = None
        self.dive_sprite = None
        
    def enter_water(self, water_rect):
        """Handle entering water"""
        if not self.in_water:
            self.in_water = True
            self.water_surface_y = water_rect.top
            self.water_bottom_y = water_rect.bottom
            self.is_sinking = True
            
            # Heavy impact reduces momentum
            entry_speed = abs(self.player.velocity_y)
            self.player.velocity_y *= 0.2
            self.player.velocity_x *= 0.5
            
            # Create entry splash
            self.create_entry_splash(entry_speed)
            
            # Reset stamina
            self.stamina = self.stamina_max
    
    def exit_water(self):
        """Handle leaving water"""
        if self.in_water:
            self.in_water = False
            self.is_underwater = False
            self.is_sinking = False
            
            # Exhaustion effect
            if self.stamina < 50:
                self.player.velocity_y *= 0.7  # Weak exit
    
    def update_swimming(self):
        """Update sink-and-swim physics"""
        if not self.in_water:
            return
        
        # Check if underwater
        self.is_underwater = self.player.y > self.water_surface_y + 5
        
        # Apply sinking
        self.apply_sinking()
        
        # Apply heavy water drag
        self.player.velocity_x *= self.water_drag
        self.player.velocity_y *= self.water_drag
        
        # Handle swimming input
        self.handle_swim_input()
        
        # Update stamina
        self.update_stamina()
        
        # Update stroke cooldown
        if self.stroke_cooldown > 0:
            self.stroke_cooldown -= 1
        
        # Create struggle effects if sinking
        if self.is_sinking and self.is_underwater:
            self.create_struggle_effects()
        
        # Update visual effects
        self.update_effects()
    
    def apply_sinking(self):
        """Apply constant sinking force"""
        if self.is_sinking:
            # Sink faster when exhausted
            sink_multiplier = 1.0
            if self.stamina < 50:
                sink_multiplier = 1.5
            elif self.stamina <= 0:
                sink_multiplier = 2.0
            
            self.player.velocity_y += self.sink_rate * sink_multiplier
            
            # Check if hit bottom
            if self.player.y + self.player.height >= self.water_bottom_y:
                self.player.y = self.water_bottom_y - self.player.height
                self.player.velocity_y = 0
    
    def handle_swim_input(self):
        """Handle swimming controls"""
        keys = pygame.key.get_pressed()
        
        # Swimming strokes
        if (keys[pygame.K_SPACE] or keys[pygame.K_w]) and self.stroke_cooldown <= 0:
            self.perform_stroke()
        
        # Horizontal swimming (costs stamina)
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            if self.stamina > 0:
                self.player.velocity_x -= 2
                self.stamina -= 0.5
                self.create_swim_trail('left')
        elif keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            if self.stamina > 0:
                self.player.velocity_x += 2
                self.stamina -= 0.5
                self.create_swim_trail('right')
        
        # Active diving
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            self.is_sinking = False  # Controlled descent
            self.player.velocity_y += self.dive_speed
            self.create_dive_bubbles()
    
    def perform_stroke(self):
        """Perform swimming stroke"""
        if self.stamina <= 0:
            # Can't swim when exhausted
            self.create_exhaustion_bubbles()
            return
        
        # Calculate stroke efficiency based on rhythm
        efficiency = self.calculate_stroke_efficiency()
        
        # Apply upward thrust
        thrust = self.swim_thrust * efficiency * self.stroke_efficiency
        self.player.velocity_y -= thrust
        
        # Use stamina
        stamina_cost = 10 * (2 - efficiency)  # Better rhythm = less stamina
        self.stamina = max(0, self.stamina - stamina_cost)
        
        # Update stroke tracking
        self.stroke_cooldown = self.stroke_cooldown_time
        self.stroke_count += 1
        
        # Track rhythm
        current_time = pygame.time.get_ticks()
        if self.last_stroke_time > 0:
            time_diff = current_time - self.last_stroke_time
            self.stroke_rhythm.append(time_diff)
            if len(self.stroke_rhythm) > 5:
                self.stroke_rhythm.pop(0)
        self.last_stroke_time = current_time
        
        # Temporarily not sinking
        self.is_sinking = False
        
        # Create stroke effect
        self.create_stroke_effect(efficiency)
    
    def calculate_stroke_efficiency(self):
        """Calculate efficiency based on stroke rhythm"""
        if len(self.stroke_rhythm) < 2:
            return 1.0
        
        # Check rhythm consistency
        avg_rhythm = sum(self.stroke_rhythm) / len(self.stroke_rhythm)
        variance = sum((r - avg_rhythm) ** 2 for r in self.stroke_rhythm) / len(self.stroke_rhythm)
        
        # Lower variance = better rhythm
        if variance < 100:
            return 1.5  # Perfect rhythm bonus
        elif variance < 500:
            return 1.2  # Good rhythm
        elif variance < 1000:
            return 1.0  # Normal
        else:
            return 0.7  # Poor rhythm penalty
    
    def update_stamina(self):
        """Update swimming stamina"""
        # Slowly recover stamina when not swimming
        if not self.is_underwater and self.player.velocity_y >= -0.5:
            self.stamina = min(self.stamina_max, self.stamina + 0.5)
        
        # Start sinking again after stroke
        if self.stroke_cooldown == self.stroke_cooldown_time - 5:
            self.is_sinking = True
    
    def create_entry_splash(self, intensity):
        """Create water entry effect"""
        for _ in range(int(intensity * 2)):
            particle = {
                'x': self.player.x + self.player.width // 2,
                'y': self.water_surface_y,
                'vel_x': random.uniform(-intensity/3, intensity/3),
                'vel_y': -random.uniform(intensity/4, intensity/2),
                'life': 25,
                'size': random.randint(3, 6),
                'color': (180, 210, 255)
            }
            self.water_trails.append(particle)
    
    def create_stroke_effect(self, efficiency):
        """Create effect for swimming stroke"""
        # Stronger effect for better strokes
        particle_count = int(5 * efficiency)
        
        for _ in range(particle_count):
            particle = {
                'x': self.player.x + self.player.width // 2,
                'y': self.player.y + self.player.height,
                'vel_x': random.uniform(-3, 3),
                'vel_y': random.uniform(2, 4),
                'life': 20,
                'size': random.randint(2, 4),
                'color': (200, 220, 255)
            }
            self.water_trails.append(particle)
        
        # Create bubbles
        for _ in range(3):
            self.create_bubble()
    
    def create_swim_trail(self, direction):
        """Create trail when swimming horizontally"""
        if random.random() < 0.3:
            x_offset = 0 if direction == 'left' else self.player.width
            particle = {
                'x': self.player.x + x_offset,
                'y': self.player.y + self.player.height // 2,
                'vel_x': 2 if direction == 'left' else -2,
                'vel_y': random.uniform(-0.5, 0.5),
                'life': 15,
                'size': 2,
                'color': (190, 210, 255)
            }
            self.water_trails.append(particle)
    
    def create_struggle_effects(self):
        """Create effects when struggling to swim"""
        if random.random() < 0.1:
            # Panic bubbles
            for _ in range(random.randint(2, 5)):
                self.create_bubble(panic=True)
    
    def create_dive_bubbles(self):
        """Create bubbles when diving"""
        if random.random() < 0.2:
            bubble = {
                'x': self.player.x + self.player.width // 2 + random.randint(-5, 5),
                'y': self.player.y,
                'vel_y': -1,
                'size': random.randint(2, 3),
                'life': 40
            }
            self.dive_bubbles.append(bubble)
    
    def create_exhaustion_bubbles(self):
        """Create effect when exhausted"""
        for _ in range(5):
            bubble = {
                'x': self.player.x + self.player.width // 2 + random.randint(-10, 10),
                'y': self.player.y + random.randint(0, self.player.height),
                'vel_y': -random.uniform(0.5, 1.5),
                'size': random.randint(1, 3),
                'life': 30
            }
            self.struggle_bubbles.append(bubble)
    
    def create_bubble(self, panic=False):
        """Create air bubble"""
        bubble = {
            'x': self.player.x + self.player.width // 2 + random.randint(-10, 10),
            'y': self.player.y + random.randint(0, self.player.height),
            'vel_y': -random.uniform(2, 4) if panic else -random.uniform(1, 2),
            'size': random.randint(3, 6) if panic else random.randint(2, 4),
            'life': 50
        }
        self.struggle_bubbles.append(bubble)
    
    def update_effects(self):
        """Update all visual effects"""
        # Update water trails
        for particle in self.water_trails[:]:
            particle['x'] += particle['vel_x']
            particle['y'] += particle['vel_y']
            particle['vel_y'] += 0.3
            particle['life'] -= 1
            
            if particle['life'] <= 0:
                self.water_trails.remove(particle)
        
        # Update struggle bubbles
        for bubble in self.struggle_bubbles[:]:
            bubble['y'] += bubble['vel_y']
            bubble['life'] -= 1
            
            if bubble['y'] <= self.water_surface_y or bubble['life'] <= 0:
                self.struggle_bubbles.remove(bubble)
        
        # Update dive bubbles
        for bubble in self.dive_bubbles[:]:
            bubble['y'] += bubble['vel_y']
            bubble['life'] -= 1
            
            if bubble['life'] <= 0:
                self.dive_bubbles.remove(bubble)
    
    def draw_effects(self, screen):
        """Draw water effects"""
        # Draw water overlay if underwater
        if self.is_underwater:
            depth_percent = (self.player.y - self.water_surface_y) / (self.water_bottom_y - self.water_surface_y)
            alpha = int(50 + 50 * depth_percent)  # Darker with depth
            
            underwater_surface = pygame.Surface((800, 600))
            underwater_surface.set_alpha(alpha)
            underwater_surface.fill((0, 50, 150))
            screen.blit(underwater_surface, (0, 0))
        
        # Draw water surface
        if self.in_water:
            # Animated surface
            for x in range(0, 800, 20):
                wave_offset = math.sin((x + pygame.time.get_ticks() * 0.001) * 0.1) * 3
                pygame.draw.circle(screen, (100, 150, 255),
                                 (x, int(self.water_surface_y + wave_offset)), 2)
        
        # Draw water trails
        for particle in self.water_trails:
            alpha = particle['life'] / 25.0
            color = tuple(int(c * alpha) for c in particle['color'])
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])),
                             particle['size'])
        
        # Draw bubbles
        for bubble in self.struggle_bubbles + self.dive_bubbles:
            pygame.draw.circle(screen, (230, 240, 255),
                             (int(bubble['x']), int(bubble['y'])),
                             bubble['size'])
            pygame.draw.circle(screen, (255, 255, 255),
                             (int(bubble['x'] - bubble['size']//3),
                              int(bubble['y'] - bubble['size']//3)),
                             max(1, bubble['size'] // 3))
        
        # Draw stamina bar
        if self.in_water:
            self.draw_stamina_bar(screen)
        
        # Draw stroke rhythm indicator
        if self.is_underwater and len(self.stroke_rhythm) > 0:
            self.draw_rhythm_indicator(screen)
    
    def draw_stamina_bar(self, screen):
        """Draw swimming stamina bar"""
        bar_width = 100
        bar_height = 10
        bar_x = self.player.x - 25
        bar_y = self.player.y - 30
        
        stamina_percent = self.stamina / self.stamina_max
        
        # Color based on stamina level
        if stamina_percent > 0.5:
            color = (100, 255, 100)
        elif stamina_percent > 0.25:
            color = (255, 255, 100)
        else:
            color = (255, 100, 100)
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50),
                       (bar_x, bar_y, bar_width, bar_height))
        # Fill
        pygame.draw.rect(screen, color,
                       (bar_x, bar_y, int(bar_width * stamina_percent), bar_height))
        # Border
        pygame.draw.rect(screen, (255, 255, 255),
                       (bar_x, bar_y, bar_width, bar_height), 1)
        
        # Exhaustion warning
        if self.stamina <= 0:
            font = pygame.font.Font(None, 16)
            text = font.render("EXHAUSTED!", True, (255, 50, 50))
            screen.blit(text, (bar_x + 20, bar_y - 15))
    
    def draw_rhythm_indicator(self, screen):
        """Draw stroke rhythm indicator"""
        efficiency = self.calculate_stroke_efficiency()
        
        # Color based on efficiency
        if efficiency >= 1.5:
            color = (100, 255, 100)  # Perfect
            text = "PERFECT"
        elif efficiency >= 1.2:
            color = (200, 255, 100)  # Good
            text = "GOOD"
        elif efficiency >= 1.0:
            color = (255, 255, 100)  # Normal
            text = "OK"
        else:
            color = (255, 100, 100)  # Poor
            text = "POOR"
        
        if self.stroke_cooldown > self.stroke_cooldown_time - 10:
            font = pygame.font.Font(None, 20)
            rhythm_text = font.render(text, True, color)
            screen.blit(rhythm_text, 
                       (self.player.x + self.player.width // 2 - 20,
                        self.player.y - 50))
    
    def get_water_parameters(self):
        """Get parameters for UI editing"""
        return {
            'Sink Rate': self.sink_rate,
            'Swim Thrust': self.swim_thrust,
            'Stroke Efficiency': self.stroke_efficiency,
            'Water Drag': self.water_drag,
            'Stamina': f"{self.stamina}/{self.stamina_max}",
            'In Water': self.in_water,
            'Is Sinking': self.is_sinking,
            'Stroke Count': self.stroke_count,
            'Rhythm': self.calculate_stroke_efficiency()
        }`,
    },
  },

  // New Combat & Action Components
  {
    id: 'shooting',
    title: 'Shooting System',
    description: 'How ranged attacks work in your game',
    optionA: {
      title: 'Rapid Fire',
      description: 'Hold to shoot continuously - spray and pray!',
      features: ['Automatic firing', 'Fast bullets', 'Spread patterns', 'Overheating system'],
      pythonCode: `# Rapid Fire Shooting System
class ShootingSystem:
    def __init__(self):
        self.bullets = []
        self.fire_rate = 5  # Frames between shots
        self.fire_cooldown = 0
        self.bullet_speed = 12
        self.bullet_damage = 10
        self.spread_angle = 5  # Degrees of spread
        self.is_firing = False
        
        # Overheating system
        self.heat = 0
        self.max_heat = 100
        self.heat_per_shot = 5
        self.cooling_rate = 2
        self.overheated = False
        
        # Visual/Audio settings
        self.bullet_sprite = None  # Can be replaced with actual sprite
        self.bullet_color = (255, 255, 0)  # Yellow bullets
        self.muzzle_flash_timer = 0
        
    def start_firing(self):
        """Begin continuous firing"""
        if not self.overheated:
            self.is_firing = True
    
    def stop_firing(self):
        """Stop continuous firing"""
        self.is_firing = False
    
    def update(self, player_x, player_y, facing_direction):
        """Update shooting system"""
        # Cool down heat
        if self.heat > 0:
            self.heat = max(0, self.heat - self.cooling_rate)
            if self.heat == 0:
                self.overheated = False
        
        # Check if overheated
        if self.heat >= self.max_heat:
            self.overheated = True
            self.is_firing = False
        
        # Handle firing
        if self.is_firing and not self.overheated:
            if self.fire_cooldown <= 0:
                self.fire_bullet(player_x, player_y, facing_direction)
                self.fire_cooldown = self.fire_rate
                self.heat = min(self.max_heat, self.heat + self.heat_per_shot)
                self.muzzle_flash_timer = 3
                # Sound hook: play rapid fire sound
                # pygame.mixer.Sound('rapid_fire.wav').play()
        
        # Update cooldowns
        if self.fire_cooldown > 0:
            self.fire_cooldown -= 1
        if self.muzzle_flash_timer > 0:
            self.muzzle_flash_timer -= 1
        
        # Update all bullets
        for bullet in self.bullets[:]:
            bullet['x'] += bullet['vel_x']
            bullet['y'] += bullet['vel_y']
            bullet['lifetime'] -= 1
            
            # Remove old or off-screen bullets
            if (bullet['lifetime'] <= 0 or 
                bullet['x'] < -50 or bullet['x'] > 850 or
                bullet['y'] < -50 or bullet['y'] > 650):
                self.bullets.remove(bullet)
    
    def fire_bullet(self, x, y, direction):
        """Create a new bullet with spread"""
        import math
        import random
        
        # Add random spread
        spread = random.uniform(-self.spread_angle, self.spread_angle)
        angle = math.atan2(direction[1], direction[0]) + math.radians(spread)
        
        bullet = {
            'x': x,
            'y': y,
            'vel_x': math.cos(angle) * self.bullet_speed,
            'vel_y': math.sin(angle) * self.bullet_speed,
            'damage': self.bullet_damage,
            'lifetime': 60,  # Frames before despawn
            'rect': pygame.Rect(x-2, y-2, 4, 4)
        }
        self.bullets.append(bullet)
    
    def check_collisions(self, targets):
        """Check bullet collisions with targets"""
        hits = []
        for bullet in self.bullets[:]:
            bullet['rect'].x = bullet['x'] - 2
            bullet['rect'].y = bullet['y'] - 2
            
            for target in targets:
                if bullet['rect'].colliderect(target['rect']):
                    hits.append({'bullet': bullet, 'target': target})
                    if bullet in self.bullets:
                        self.bullets.remove(bullet)
                    break
        return hits
    
    def draw(self, screen):
        """Draw bullets and UI"""
        # Draw bullets
        for bullet in self.bullets:
            if self.bullet_sprite:
                # Draw custom sprite
                screen.blit(self.bullet_sprite, (bullet['x']-4, bullet['y']-4))
            else:
                # Draw default bullet
                pygame.draw.circle(screen, self.bullet_color, 
                                 (int(bullet['x']), int(bullet['y'])), 3)
                # Bullet trail effect
                pygame.draw.circle(screen, (255, 200, 0), 
                                 (int(bullet['x']-bullet['vel_x']*0.5), 
                                  int(bullet['y']-bullet['vel_y']*0.5)), 2)
        
        # Draw heat gauge
        self.draw_heat_gauge(screen, 10, 80)
    
    def draw_heat_gauge(self, screen, x, y):
        """Draw overheating indicator"""
        width = 150
        height = 15
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50), (x, y, width, height))
        
        # Heat fill
        heat_percent = self.heat / self.max_heat
        if self.overheated:
            color = (255, 0, 0)  # Red when overheated
        elif heat_percent > 0.7:
            color = (255, 150, 0)  # Orange when hot
        else:
            color = (0, 200, 255)  # Blue when cool
        
        pygame.draw.rect(screen, color, 
                       (x, y, int(width * heat_percent), height))
        
        # Border
        pygame.draw.rect(screen, (255, 255, 255), (x, y, width, height), 2)
        
        # Text
        font = pygame.font.Font(None, 16)
        if self.overheated:
            text = font.render("OVERHEATED!", True, (255, 0, 0))
            screen.blit(text, (x, y - 15))
        else:
            text = font.render("Heat", True, (255, 255, 255))
            screen.blit(text, (x, y - 15))`,
    },
    optionB: {
      title: 'Charged Shots',
      description: 'Hold to power up devastating blasts!',
      features: ['Charge levels', 'Power indicators', 'Piercing shots', 'Area damage'],
      pythonCode: `# Charged Shot Shooting System
class ShootingSystem:
    def __init__(self):
        self.projectiles = []
        self.charge_level = 0
        self.max_charge = 100
        self.charge_rate = 2
        self.is_charging = False
        self.charge_start_time = 0
        
        # Projectile properties by charge level
        self.charge_tiers = [
            {'min_charge': 0, 'damage': 15, 'speed': 10, 'size': 3, 'color': (200, 200, 0)},
            {'min_charge': 30, 'damage': 30, 'speed': 12, 'size': 5, 'color': (255, 200, 0)},
            {'min_charge': 60, 'damage': 50, 'speed': 15, 'size': 8, 'color': (255, 150, 0)},
            {'min_charge': 90, 'damage': 100, 'speed': 18, 'size': 12, 'color': (255, 50, 0)},
        ]
        
        # Visual effects
        self.charge_particles = []
        self.projectile_sprite = None  # Can be replaced
        self.charge_sound_playing = False
        
    def start_charging(self):
        """Begin charging a shot"""
        if not self.is_charging:
            self.is_charging = True
            self.charge_start_time = pygame.time.get_ticks()
            # Sound hook: play charge start sound
            # pygame.mixer.Sound('charge_start.wav').play()
    
    def release_shot(self, player_x, player_y, direction):
        """Fire the charged shot"""
        if self.is_charging and self.charge_level >= 10:
            # Determine projectile properties based on charge
            tier = self.get_charge_tier()
            
            projectile = {
                'x': player_x,
                'y': player_y,
                'vel_x': direction[0] * tier['speed'],
                'vel_y': direction[1] * tier['speed'],
                'damage': tier['damage'],
                'size': tier['size'],
                'color': tier['color'],
                'piercing': self.charge_level >= 60,  # Piercing at high charge
                'explosive': self.charge_level >= 90,  # Explosive at max charge
                'hit_targets': [],  # Track what's been hit (for piercing)
                'lifetime': 120,
                'charge_level': self.charge_level,
                'rect': pygame.Rect(player_x - tier['size'], 
                                   player_y - tier['size'],
                                   tier['size'] * 2, tier['size'] * 2)
            }
            self.projectiles.append(projectile)
            
            # Sound hook: play fire sound based on charge
            # if self.charge_level >= 90:
            #     pygame.mixer.Sound('mega_shot.wav').play()
            # elif self.charge_level >= 60:
            #     pygame.mixer.Sound('power_shot.wav').play()
            # else:
            #     pygame.mixer.Sound('basic_shot.wav').play()
        
        # Reset charging
        self.is_charging = False
        self.charge_level = 0
        self.charge_particles.clear()
    
    def get_charge_tier(self):
        """Get projectile tier based on charge level"""
        tier = self.charge_tiers[0]
        for t in self.charge_tiers:
            if self.charge_level >= t['min_charge']:
                tier = t
        return tier
    
    def update(self, player_x, player_y):
        """Update charging and projectiles"""
        # Update charging
        if self.is_charging:
            if self.charge_level < self.max_charge:
                self.charge_level = min(self.max_charge, 
                                       self.charge_level + self.charge_rate)
                
                # Create charge particles
                if len(self.charge_particles) < self.charge_level // 2:
                    import random
                    import math
                    angle = random.uniform(0, 2 * math.pi)
                    dist = random.uniform(20, 40)
                    particle = {
                        'x': player_x + math.cos(angle) * dist,
                        'y': player_y + math.sin(angle) * dist,
                        'target_x': player_x,
                        'target_y': player_y,
                        'life': 30
                    }
                    self.charge_particles.append(particle)
        
        # Update charge particles
        for particle in self.charge_particles[:]:
            # Move toward player
            dx = particle['target_x'] - particle['x']
            dy = particle['target_y'] - particle['y']
            dist = (dx*dx + dy*dy) ** 0.5
            if dist > 0:
                particle['x'] += (dx/dist) * 2
                particle['y'] += (dy/dist) * 2
            
            particle['life'] -= 1
            if particle['life'] <= 0:
                self.charge_particles.remove(particle)
        
        # Update projectiles
        for proj in self.projectiles[:]:
            proj['x'] += proj['vel_x']
            proj['y'] += proj['vel_y']
            proj['lifetime'] -= 1
            proj['rect'].x = proj['x'] - proj['size']
            proj['rect'].y = proj['y'] - proj['size']
            
            # Remove expired projectiles
            if (proj['lifetime'] <= 0 or
                proj['x'] < -100 or proj['x'] > 900 or
                proj['y'] < -100 or proj['y'] > 700):
                self.projectiles.remove(proj)
    
    def check_collisions(self, targets):
        """Check projectile collisions"""
        hits = []
        for proj in self.projectiles[:]:
            for target in targets:
                # Skip if already hit this target (for piercing)
                if target in proj['hit_targets']:
                    continue
                    
                if proj['rect'].colliderect(target['rect']):
                    hits.append({'projectile': proj, 'target': target})
                    proj['hit_targets'].append(target)
                    
                    # Handle explosive shots
                    if proj['explosive']:
                        # Damage all nearby targets
                        explosion_radius = 50
                        for other in targets:
                            if other != target:
                                dist = ((other['rect'].centerx - proj['x'])**2 + 
                                       (other['rect'].centery - proj['y'])**2)**0.5
                                if dist <= explosion_radius:
                                    hits.append({'projectile': proj, 
                                               'target': other,
                                               'splash': True})
                    
                    # Remove non-piercing projectiles
                    if not proj['piercing']:
                        if proj in self.projectiles:
                            self.projectiles.remove(proj)
                        break
        return hits
    
    def draw(self, screen):
        """Draw projectiles and charging effects"""
        # Draw charge particles
        for particle in self.charge_particles:
            size = 2
            color = self.get_charge_tier()['color']
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])), size)
        
        # Draw projectiles
        for proj in self.projectiles:
            if self.projectile_sprite:
                # Scale sprite based on charge
                scaled_size = proj['size'] * 2
                scaled_sprite = pygame.transform.scale(self.projectile_sprite,
                                                      (scaled_size, scaled_size))
                screen.blit(scaled_sprite, 
                          (proj['x'] - proj['size'], proj['y'] - proj['size']))
            else:
                # Draw default projectile with glow effect
                # Outer glow
                glow_color = tuple(min(255, c + 50) for c in proj['color'])
                pygame.draw.circle(screen, glow_color,
                                 (int(proj['x']), int(proj['y'])), 
                                 proj['size'] + 2)
                # Core
                pygame.draw.circle(screen, proj['color'],
                                 (int(proj['x']), int(proj['y'])), 
                                 proj['size'])
                # Inner bright spot
                pygame.draw.circle(screen, (255, 255, 255),
                                 (int(proj['x']), int(proj['y'])), 
                                 max(2, proj['size'] // 2))
        
        # Draw charge indicator
        if self.is_charging:
            self.draw_charge_indicator(screen, 10, 80)
    
    def draw_charge_indicator(self, screen, x, y):
        """Draw charge level indicator"""
        width = 150
        height = 20
        
        # Background
        pygame.draw.rect(screen, (30, 30, 30), (x, y, width, height))
        
        # Charge segments
        tier_colors = [(200, 200, 0), (255, 200, 0), (255, 150, 0), (255, 50, 0)]
        segment_width = width / len(tier_colors)
        
        for i, color in enumerate(tier_colors):
            seg_x = x + i * segment_width
            if self.charge_level >= (i * 25):
                fill_amount = min(1.0, (self.charge_level - i * 25) / 25)
                pygame.draw.rect(screen, color,
                               (seg_x, y, segment_width * fill_amount, height))
        
        # Border
        pygame.draw.rect(screen, (255, 255, 255), (x, y, width, height), 2)
        
        # Charge level text
        font = pygame.font.Font(None, 16)
        tier = self.get_charge_tier()
        charge_text = f"Charge: {int(self.charge_level)}%"
        text = font.render(charge_text, True, tier['color'])
        screen.blit(text, (x, y - 15))`,
    },
  },

  {
    id: 'melee',
    title: 'Melee Combat',
    description: 'Close-range combat mechanics',
    optionA: {
      title: 'Sword Swing',
      description: 'Wide arc attacks that hit multiple enemies',
      features: ['Sweeping attacks', 'Combo chains', 'Spin attacks', 'Weapon trails'],
      pythonCode: `# Sword Swing Melee System
class MeleeCombat:
    def __init__(self):
        self.is_attacking = False
        self.attack_frame = 0
        self.attack_duration = 15  # Total frames for attack
        self.attack_cooldown = 0
        self.combo_count = 0
        self.combo_window = 30  # Frames to chain attacks
        self.combo_timer = 0
        
        # Attack properties
        self.base_damage = 25
        self.attack_range = 60
        self.attack_arc = 120  # Degrees of swing arc
        self.current_angle = 0
        
        # Weapon customization
        self.weapon_sprite = None  # Custom weapon sprite
        self.weapon_color = (200, 200, 200)  # Silver sword
        self.trail_positions = []  # For motion trail effect
        
        # Special moves
        self.spin_attack_active = False
        self.spin_rotation = 0
        self.spin_duration = 0
        
    def start_attack(self, player_x, player_y, facing_right):
        """Initiate a sword swing"""
        if self.attack_cooldown <= 0:
            self.is_attacking = True
            self.attack_frame = 0
            self.attack_cooldown = 20
            
            # Check for combo
            if self.combo_timer > 0:
                self.combo_count = min(3, self.combo_count + 1)
            else:
                self.combo_count = 1
            self.combo_timer = self.combo_window
            
            # Set swing direction
            if facing_right:
                self.current_angle = -45  # Start angle
            else:
                self.current_angle = 225
            
            # Sound hook: play swing sound
            # pygame.mixer.Sound(f'sword_swing_{self.combo_count}.wav').play()
            
            # Check for special move (3rd combo = spin attack)
            if self.combo_count >= 3:
                self.start_spin_attack()
    
    def start_spin_attack(self):
        """Execute spinning blade attack"""
        self.spin_attack_active = True
        self.spin_duration = 30
        self.spin_rotation = 0
        # Sound hook: play spin attack sound
        # pygame.mixer.Sound('spin_attack.wav').play()
    
    def update(self, player_x, player_y, facing_right):
        """Update melee combat state"""
        # Update cooldowns
        if self.attack_cooldown > 0:
            self.attack_cooldown -= 1
        if self.combo_timer > 0:
            self.combo_timer -= 1
        else:
            self.combo_count = 0
        
        # Update regular attack
        if self.is_attacking:
            self.attack_frame += 1
            
            # Calculate swing angle
            if facing_right:
                angle_start = -45
                angle_end = 45
            else:
                angle_start = 225
                angle_end = 135
            
            # Interpolate angle for smooth swing
            progress = self.attack_frame / self.attack_duration
            self.current_angle = angle_start + (angle_end - angle_start) * progress
            
            # Add to trail
            import math
            trail_x = player_x + math.cos(math.radians(self.current_angle)) * self.attack_range
            trail_y = player_y + math.sin(math.radians(self.current_angle)) * self.attack_range
            self.trail_positions.append({'x': trail_x, 'y': trail_y, 'life': 10})
            
            if self.attack_frame >= self.attack_duration:
                self.is_attacking = False
                self.attack_frame = 0
        
        # Update spin attack
        if self.spin_attack_active:
            self.spin_rotation += 24  # Degrees per frame
            self.spin_duration -= 1
            
            if self.spin_duration <= 0:
                self.spin_attack_active = False
                self.spin_rotation = 0
        
        # Update trail effect
        for trail in self.trail_positions[:]:
            trail['life'] -= 1
            if trail['life'] <= 0:
                self.trail_positions.remove(trail)
    
    def get_hit_area(self, player_x, player_y, facing_right):
        """Calculate the area being attacked"""
        import math
        
        if self.spin_attack_active:
            # Circular area for spin attack
            return {
                'type': 'circle',
                'x': player_x,
                'y': player_y,
                'radius': self.attack_range * 1.2,
                'damage': self.base_damage * 1.5
            }
        elif self.is_attacking:
            # Arc area for normal swing
            hit_zones = []
            
            # Create multiple hit detection points along the arc
            for offset in range(-30, 31, 10):
                angle = self.current_angle + offset
                hit_x = player_x + math.cos(math.radians(angle)) * self.attack_range
                hit_y = player_y + math.sin(math.radians(angle)) * self.attack_range
                hit_zones.append({
                    'x': hit_x,
                    'y': hit_y,
                    'rect': pygame.Rect(hit_x - 10, hit_y - 10, 20, 20)
                })
            
            return {
                'type': 'arc',
                'zones': hit_zones,
                'damage': self.base_damage * (1 + self.combo_count * 0.2)  # Combo multiplier
            }
        
        return None
    
    def check_hits(self, targets, player_x, player_y, facing_right):
        """Check if attack hits any targets"""
        hit_area = self.get_hit_area(player_x, player_y, facing_right)
        hits = []
        
        if not hit_area:
            return hits
        
        for target in targets:
            if hit_area['type'] == 'circle':
                # Check circular spin attack
                dist = ((target['rect'].centerx - hit_area['x'])**2 + 
                       (target['rect'].centery - hit_area['y'])**2)**0.5
                if dist <= hit_area['radius']:
                    hits.append({'target': target, 'damage': hit_area['damage']})
            
            elif hit_area['type'] == 'arc':
                # Check arc swing
                for zone in hit_area['zones']:
                    if zone['rect'].colliderect(target['rect']):
                        hits.append({'target': target, 'damage': hit_area['damage']})
                        break
        
        return hits
    
    def draw(self, screen, player_x, player_y, facing_right):
        """Draw sword and attack effects"""
        import math
        
        # Draw trail effect
        for i, trail in enumerate(self.trail_positions):
            alpha = trail['life'] / 10.0
            color = tuple(int(c * alpha) for c in self.weapon_color)
            size = int(3 * alpha)
            if size > 0:
                pygame.draw.circle(screen, color, 
                                 (int(trail['x']), int(trail['y'])), size)
        
        # Draw sword
        if self.is_attacking or self.spin_attack_active:
            if self.spin_attack_active:
                # Draw spinning blade effect
                for angle_offset in range(0, 360, 45):
                    angle = self.spin_rotation + angle_offset
                    sword_x = player_x + math.cos(math.radians(angle)) * self.attack_range
                    sword_y = player_y + math.sin(math.radians(angle)) * self.attack_range
                    
                    # Draw sword line
                    pygame.draw.line(screen, self.weapon_color,
                                   (player_x, player_y),
                                   (sword_x, sword_y), 3)
                    
                    # Draw blade tip
                    pygame.draw.circle(screen, (255, 255, 255),
                                     (int(sword_x), int(sword_y)), 4)
            else:
                # Draw swinging sword
                sword_x = player_x + math.cos(math.radians(self.current_angle)) * self.attack_range
                sword_y = player_y + math.sin(math.radians(self.current_angle)) * self.attack_range
                
                if self.weapon_sprite:
                    # Draw custom weapon sprite
                    angle = -self.current_angle
                    rotated = pygame.transform.rotate(self.weapon_sprite, angle)
                    rect = rotated.get_rect(center=(sword_x, sword_y))
                    screen.blit(rotated, rect)
                else:
                    # Draw default sword
                    pygame.draw.line(screen, self.weapon_color,
                                   (player_x, player_y),
                                   (sword_x, sword_y), 4)
                    
                    # Draw blade shine
                    pygame.draw.line(screen, (255, 255, 255),
                                   (player_x, player_y),
                                   (sword_x, sword_y), 2)
                    
                    # Draw hilt
                    pygame.draw.circle(screen, (150, 100, 50),
                                     (player_x, player_y), 6)
        
        # Draw combo counter
        if self.combo_count > 0:
            font = pygame.font.Font(None, 24)
            combo_text = f"x{self.combo_count} COMBO!"
            color = (255, 255, 0) if self.combo_count < 3 else (255, 100, 0)
            text = font.render(combo_text, True, color)
            screen.blit(text, (player_x - 30, player_y - 40))`,
    },
    optionB: {
      title: 'Punch/Kick',
      description: 'Fast, precise strikes with martial arts flair',
      features: ['Quick jabs', 'Uppercuts', 'Roundhouse kicks', 'Counter attacks'],
      pythonCode: `# Punch/Kick Melee System
class MeleeCombat:
    def __init__(self):
        self.is_attacking = False
        self.attack_type = None  # 'punch', 'kick', 'uppercut', 'roundhouse'
        self.attack_frame = 0
        self.attack_cooldown = 0
        
        # Attack properties
        self.attacks = {
            'punch': {'damage': 15, 'range': 30, 'duration': 8, 'cooldown': 10},
            'kick': {'damage': 20, 'range': 40, 'duration': 12, 'cooldown': 15},
            'uppercut': {'damage': 30, 'range': 25, 'duration': 15, 'cooldown': 20},
            'roundhouse': {'damage': 35, 'range': 50, 'duration': 20, 'cooldown': 25}
        }
        
        # Combo system
        self.combo_sequence = []
        self.combo_timer = 0
        self.combo_window = 20
        self.special_combos = {
            ('punch', 'punch', 'kick'): 'rapid_strike',
            ('kick', 'kick', 'punch'): 'power_combo',
            ('punch', 'uppercut'): 'launcher',
            ('kick', 'roundhouse'): 'spin_finish'
        }
        
        # Counter/parry system
        self.can_counter = False
        self.counter_window = 0
        self.counter_frames = 10
        
        # Visual effects
        self.impact_effects = []
        self.attack_sprite = None
        
    def attack(self, attack_type, player_x, player_y, facing_right):
        """Execute a martial arts attack"""
        if self.attack_cooldown <= 0:
            self.is_attacking = True
            self.attack_type = attack_type
            self.attack_frame = 0
            
            attack_info = self.attacks[attack_type]
            self.attack_cooldown = attack_info['cooldown']
            
            # Add to combo sequence
            self.combo_sequence.append(attack_type)
            if len(self.combo_sequence) > 3:
                self.combo_sequence.pop(0)
            self.combo_timer = self.combo_window
            
            # Check for special combo
            combo_tuple = tuple(self.combo_sequence)
            for combo_pattern, special_name in self.special_combos.items():
                if combo_tuple[-len(combo_pattern):] == combo_pattern:
                    self.execute_special(special_name)
                    break
            
            # Sound hook
            # pygame.mixer.Sound(f'{attack_type}.wav').play()
    
    def execute_special(self, special_name):
        """Execute special combo move"""
        # Enhance current attack
        if special_name == 'rapid_strike':
            self.attack_cooldown = 5  # Faster recovery
        elif special_name == 'power_combo':
            # Double damage for this hit
            pass
        elif special_name == 'launcher':
            # Knock enemy upward
            pass
        elif special_name == 'spin_finish':
            # Hit all nearby enemies
            pass
        
        # Sound hook for special move
        # pygame.mixer.Sound(f'special_{special_name}.wav').play()
    
    def start_counter(self):
        """Begin counter/parry stance"""
        self.can_counter = True
        self.counter_window = self.counter_frames
        # Sound hook
        # pygame.mixer.Sound('counter_ready.wav').play()
    
    def update(self, player_x, player_y):
        """Update combat state"""
        # Update cooldowns
        if self.attack_cooldown > 0:
            self.attack_cooldown -= 1
        
        if self.combo_timer > 0:
            self.combo_timer -= 1
        else:
            self.combo_sequence.clear()
        
        if self.counter_window > 0:
            self.counter_window -= 1
            if self.counter_window == 0:
                self.can_counter = False
        
        # Update attack animation
        if self.is_attacking:
            self.attack_frame += 1
            attack_info = self.attacks[self.attack_type]
            
            if self.attack_frame >= attack_info['duration']:
                self.is_attacking = False
                self.attack_type = None
                self.attack_frame = 0
        
        # Update impact effects
        for effect in self.impact_effects[:]:
            effect['life'] -= 1
            effect['x'] += effect['vel_x']
            effect['y'] += effect['vel_y']
            if effect['life'] <= 0:
                self.impact_effects.remove(effect)
    
    def get_hit_area(self, player_x, player_y, facing_right):
        """Get current attack hitbox"""
        if not self.is_attacking:
            return None
        
        attack_info = self.attacks[self.attack_type]
        
        # Calculate hit position
        if facing_right:
            hit_x = player_x + attack_info['range']
        else:
            hit_x = player_x - attack_info['range']
        
        hit_y = player_y
        
        # Adjust for different attack types
        if self.attack_type == 'uppercut':
            hit_y -= 10  # Hits higher
        elif self.attack_type == 'kick':
            hit_y += 5  # Hits lower
        
        # Create hitbox
        hit_rect = pygame.Rect(hit_x - 15, hit_y - 15, 30, 30)
        
        # Roundhouse has wider hit area
        if self.attack_type == 'roundhouse':
            hit_rect.width = 60
            hit_rect.height = 40
        
        return {
            'rect': hit_rect,
            'damage': attack_info['damage'],
            'type': self.attack_type
        }
    
    def check_hits(self, targets, player_x, player_y, facing_right):
        """Check if attacks hit targets"""
        hits = []
        hit_area = self.get_hit_area(player_x, player_y, facing_right)
        
        if not hit_area:
            return hits
        
        for target in targets:
            if hit_area['rect'].colliderect(target['rect']):
                # Calculate knockback
                if facing_right:
                    knockback_x = 5
                else:
                    knockback_x = -5
                
                knockback_y = 0
                if self.attack_type == 'uppercut':
                    knockback_y = -8
                elif self.attack_type == 'kick':
                    knockback_x *= 1.5
                
                hits.append({
                    'target': target,
                    'damage': hit_area['damage'],
                    'knockback': (knockback_x, knockback_y)
                })
                
                # Create impact effect
                import random
                for _ in range(3):
                    self.impact_effects.append({
                        'x': hit_area['rect'].centerx,
                        'y': hit_area['rect'].centery,
                        'vel_x': random.uniform(-2, 2),
                        'vel_y': random.uniform(-2, 2),
                        'life': 10
                    })
        
        return hits
    
    def check_counter(self, incoming_attack_rect):
        """Check if counter is successful"""
        if self.can_counter and self.counter_window > 0:
            # Sound hook
            # pygame.mixer.Sound('counter_success.wav').play()
            self.can_counter = False
            self.counter_window = 0
            
            # Auto-counter attack
            self.attack('uppercut', 0, 0, True)  # Will be positioned properly
            return True
        return False
    
    def draw(self, screen, player_x, player_y, facing_right):
        """Draw attack animations and effects"""
        # Draw attack motion
        if self.is_attacking:
            attack_info = self.attacks[self.attack_type]
            
            # Calculate animation progress
            progress = self.attack_frame / attack_info['duration']
            
            # Draw different attack types
            if self.attack_type == 'punch':
                # Draw fist
                if facing_right:
                    fist_x = player_x + attack_info['range'] * progress
                else:
                    fist_x = player_x - attack_info['range'] * progress
                fist_y = player_y
                
                pygame.draw.circle(screen, (255, 200, 150), 
                                 (int(fist_x), int(fist_y)), 8)
                # Motion blur
                for i in range(3):
                    blur_x = fist_x - (5 * i * (1 if facing_right else -1))
                    pygame.draw.circle(screen, (255, 200, 150, 100 - i*30),
                                     (int(blur_x), int(fist_y)), 6 - i)
            
            elif self.attack_type == 'kick':
                # Draw leg sweep
                if facing_right:
                    kick_x = player_x + attack_info['range'] * progress
                else:
                    kick_x = player_x - attack_info['range'] * progress
                kick_y = player_y + 10
                
                # Draw boot/foot
                pygame.draw.ellipse(screen, (100, 50, 0),
                                  (kick_x - 10, kick_y - 5, 20, 10))
                
                # Motion lines
                for i in range(3):
                    line_x = kick_x - (8 * i * (1 if facing_right else -1))
                    pygame.draw.line(screen, (255, 255, 255, 150 - i*50),
                                   (line_x, kick_y - 5), (line_x, kick_y + 5), 2)
            
            elif self.attack_type == 'uppercut':
                # Draw upward fist
                fist_x = player_x + (10 if facing_right else -10)
                fist_y = player_y - attack_info['range'] * progress
                
                pygame.draw.circle(screen, (255, 200, 150),
                                 (int(fist_x), int(fist_y)), 9)
                # Upward motion trail
                for i in range(4):
                    trail_y = fist_y + (5 * i)
                    pygame.draw.circle(screen, (255, 200, 150, 100 - i*25),
                                     (int(fist_x), int(trail_y)), 7 - i)
            
            elif self.attack_type == 'roundhouse':
                # Draw circular kick motion
                import math
                angle = progress * 180
                if not facing_right:
                    angle = -angle
                
                kick_x = player_x + math.cos(math.radians(angle)) * attack_info['range']
                kick_y = player_y + math.sin(math.radians(angle)) * 20
                
                pygame.draw.ellipse(screen, (100, 50, 0),
                                  (kick_x - 12, kick_y - 6, 24, 12))
                
                # Circular motion trail
                for i in range(5):
                    trail_angle = angle - (20 * i * (1 if facing_right else -1))
                    trail_x = player_x + math.cos(math.radians(trail_angle)) * attack_info['range']
                    trail_y = player_y + math.sin(math.radians(trail_angle)) * 20
                    pygame.draw.circle(screen, (255, 255, 255, 100 - i*20),
                                     (int(trail_x), int(trail_y)), 3)
        
        # Draw impact effects
        for effect in self.impact_effects:
            pygame.draw.circle(screen, (255, 255, 0),
                             (int(effect['x']), int(effect['y'])), 
                             effect['life'] // 2)
        
        # Draw counter indicator
        if self.can_counter and self.counter_window > 0:
            # Draw counter stance glow
            pygame.draw.circle(screen, (0, 150, 255, 50),
                             (player_x, player_y), 30, 3)
            font = pygame.font.Font(None, 16)
            text = font.render("COUNTER!", True, (0, 150, 255))
            screen.blit(text, (player_x - 25, player_y - 50))
        
        # Draw combo display
        if len(self.combo_sequence) > 1:
            font = pygame.font.Font(None, 20)
            combo_text = " > ".join(self.combo_sequence)
            text = font.render(combo_text, True, (255, 255, 0))
            screen.blit(text, (player_x - 40, player_y + 30))`,
    },
  },

  {
    id: 'health',
    title: 'Health System',
    description: 'How player health is displayed and managed',
    optionA: {
      title: 'Hearts System',
      description: 'Discrete health units like classic games',
      features: ['Heart containers', 'Half hearts', 'Extra lives', 'Heart pickups'],
      pythonCode: `# Hearts Health System
class HealthSystem:
    def __init__(self, max_hearts=5):
        self.max_hearts = max_hearts
        self.current_hearts = max_hearts
        self.heart_pieces = 0  # For half-heart damage
        self.temporary_hearts = 0  # Golden/temporary hearts
        self.extra_lives = 3
        
        # Visual settings
        self.heart_size = 24
        self.heart_sprite = None  # Custom heart sprite
        self.empty_heart_sprite = None
        self.golden_heart_sprite = None
        
        # Animation states
        self.damage_flash_timer = 0
        self.heal_pulse_timer = 0
        self.low_health_pulse = 0
        
        # Heart container upgrades
        self.heart_containers_found = 0
        self.max_possible_hearts = 10
        
    def take_damage(self, damage):
        """Apply damage in half-heart increments"""
        # Damage is converted to half-hearts
        half_hearts_damage = damage // 10  # 10 damage = half heart
        
        # First remove temporary hearts
        if self.temporary_hearts > 0:
            temp_removed = min(self.temporary_hearts, half_hearts_damage)
            self.temporary_hearts -= temp_removed
            half_hearts_damage -= temp_removed
        
        # Then remove regular hearts
        if half_hearts_damage > 0:
            # Apply to heart pieces first
            if self.heart_pieces > 0:
                self.heart_pieces = 0
                half_hearts_damage -= 1
            
            # Then full hearts
            hearts_to_remove = half_hearts_damage // 2
            remaining_half = half_hearts_damage % 2
            
            self.current_hearts = max(0, self.current_hearts - hearts_to_remove)
            if remaining_half > 0 and self.current_hearts > 0:
                if self.heart_pieces == 0:
                    self.current_hearts -= 1
                    self.heart_pieces = 1  # Half heart remains
            
            self.damage_flash_timer = 30
            
            # Sound hook
            # if self.current_hearts <= 1:
            #     pygame.mixer.Sound('low_health.wav').play()
            # else:
            #     pygame.mixer.Sound('hurt.wav').play()
        
        # Check for death
        if self.current_hearts == 0 and self.heart_pieces == 0:
            return self.die()
        
        return False
    
    def heal(self, amount):
        """Heal by heart amounts"""
        hearts_to_heal = amount // 20  # 20 = 1 heart
        
        # Heal half hearts first
        if self.heart_pieces == 1 and self.current_hearts < self.max_hearts:
            self.heart_pieces = 0
            self.current_hearts += 1
            hearts_to_heal -= 1
        
        # Heal full hearts
        self.current_hearts = min(self.max_hearts, 
                                 self.current_hearts + hearts_to_heal)
        
        self.heal_pulse_timer = 20
        # Sound hook
        # pygame.mixer.Sound('heal.wav').play()
    
    def add_temporary_heart(self):
        """Add a golden/temporary heart"""
        if self.temporary_hearts < 3:  # Max 3 temp hearts
            self.temporary_hearts += 1
            # Sound hook
            # pygame.mixer.Sound('bonus_heart.wav').play()
    
    def add_heart_container(self):
        """Increase maximum hearts"""
        if self.max_hearts < self.max_possible_hearts:
            self.max_hearts += 1
            self.current_hearts = self.max_hearts  # Full heal on upgrade
            self.heart_containers_found += 1
            # Sound hook
            # pygame.mixer.Sound('heart_container.wav').play()
            return True
        return False
    
    def die(self):
        """Handle player death"""
        if self.extra_lives > 0:
            self.extra_lives -= 1
            self.current_hearts = self.max_hearts
            self.heart_pieces = 0
            self.temporary_hearts = 0
            # Sound hook
            # pygame.mixer.Sound('extra_life.wav').play()
            return False  # Not game over
        else:
            # Sound hook
            # pygame.mixer.Sound('game_over.wav').play()
            return True  # Game over
    
    def update(self):
        """Update animation timers"""
        if self.damage_flash_timer > 0:
            self.damage_flash_timer -= 1
        
        if self.heal_pulse_timer > 0:
            self.heal_pulse_timer -= 1
        
        # Pulse when low health
        if self.current_hearts <= 1:
            self.low_health_pulse += 0.2
        else:
            self.low_health_pulse = 0
    
    def draw(self, screen, x, y):
        """Draw heart display"""
        import math
        
        # Draw heart containers
        for i in range(self.max_hearts):
            heart_x = x + i * (self.heart_size + 4)
            heart_y = y
            
            # Pulse effect for low health
            if self.current_hearts <= 1 and self.low_health_pulse > 0:
                scale = 1 + math.sin(self.low_health_pulse) * 0.1
                heart_y -= int(scale * 2)
            
            # Determine heart state
            if i < self.current_hearts:
                # Full heart
                if self.damage_flash_timer > 0 and self.damage_flash_timer % 4 < 2:
                    # Flash white when damaged
                    self.draw_heart(screen, heart_x, heart_y, (255, 255, 255))
                else:
                    self.draw_heart(screen, heart_x, heart_y, (255, 0, 0))
            elif i == self.current_hearts and self.heart_pieces == 1:
                # Half heart
                self.draw_half_heart(screen, heart_x, heart_y)
            else:
                # Empty heart container
                self.draw_empty_heart(screen, heart_x, heart_y)
        
        # Draw temporary hearts
        for i in range(self.temporary_hearts):
            heart_x = x + (self.max_hearts + i) * (self.heart_size + 4)
            heart_y = y
            
            # Golden heart with sparkle effect
            self.draw_heart(screen, heart_x, heart_y, (255, 215, 0))
            
            # Sparkle particles
            import random
            if random.random() < 0.1:
                sparkle_x = heart_x + random.randint(0, self.heart_size)
                sparkle_y = heart_y + random.randint(0, self.heart_size)
                pygame.draw.circle(screen, (255, 255, 255), 
                                 (sparkle_x, sparkle_y), 2)
        
        # Draw extra lives
        if self.extra_lives > 0:
            font = pygame.font.Font(None, 20)
            lives_text = font.render(f"x{self.extra_lives}", True, (255, 255, 255))
            lives_x = x + (self.max_hearts + self.temporary_hearts) * (self.heart_size + 4) + 10
            screen.blit(lives_text, (lives_x, y))
    
    def draw_heart(self, screen, x, y, color=(255, 0, 0)):
        """Draw a heart shape"""
        if self.heart_sprite:
            screen.blit(self.heart_sprite, (x, y))
        else:
            # Draw pixelated heart
            heart_pixels = [
                [0,1,1,0,0,1,1,0],
                [1,1,1,1,1,1,1,1],
                [1,1,1,1,1,1,1,1],
                [0,1,1,1,1,1,1,0],
                [0,0,1,1,1,1,0,0],
                [0,0,0,1,1,0,0,0]
            ]
            
            pixel_size = 3
            for row_idx, row in enumerate(heart_pixels):
                for col_idx, pixel in enumerate(row):
                    if pixel == 1:
                        pygame.draw.rect(screen, color,
                                       (x + col_idx * pixel_size,
                                        y + row_idx * pixel_size,
                                        pixel_size, pixel_size))
    
    def draw_half_heart(self, screen, x, y):
        """Draw half a heart"""
        if self.heart_sprite:
            # Draw left half only
            half_sprite = self.heart_sprite.subsurface(
                (0, 0, self.heart_size // 2, self.heart_size))
            screen.blit(half_sprite, (x, y))
        else:
            # Draw left half of pixelated heart
            heart_pixels = [
                [0,1,1,0],
                [1,1,1,1],
                [1,1,1,1],
                [0,1,1,1],
                [0,0,1,1],
                [0,0,0,1]
            ]
            
            pixel_size = 3
            for row_idx, row in enumerate(heart_pixels):
                for col_idx, pixel in enumerate(row):
                    if pixel == 1:
                        pygame.draw.rect(screen, (255, 0, 0),
                                       (x + col_idx * pixel_size,
                                        y + row_idx * pixel_size,
                                        pixel_size, pixel_size))
            
            # Draw empty right half
            for row_idx in range(6):
                for col_idx in range(4, 8):
                    if col_idx < 7 or row_idx > 0:
                        pygame.draw.rect(screen, (100, 100, 100),
                                       (x + col_idx * pixel_size,
                                        y + row_idx * pixel_size,
                                        pixel_size, pixel_size), 1)
    
    def draw_empty_heart(self, screen, x, y):
        """Draw empty heart container"""
        if self.empty_heart_sprite:
            screen.blit(self.empty_heart_sprite, (x, y))
        else:
            # Draw heart outline
            heart_pixels = [
                [0,1,1,0,0,1,1,0],
                [1,0,0,1,1,0,0,1],
                [1,0,0,0,0,0,0,1],
                [0,1,0,0,0,0,1,0],
                [0,0,1,0,0,1,0,0],
                [0,0,0,1,1,0,0,0]
            ]
            
            pixel_size = 3
            for row_idx, row in enumerate(heart_pixels):
                for col_idx, pixel in enumerate(row):
                    if pixel == 1:
                        pygame.draw.rect(screen, (100, 100, 100),
                                       (x + col_idx * pixel_size,
                                        y + row_idx * pixel_size,
                                        pixel_size, pixel_size))`,
    },
    optionB: {
      title: 'Health Bar',
      description: 'Continuous HP bar with smooth damage',
      features: ['Smooth damage', 'Regeneration', 'Damage numbers', 'Status effects'],
      pythonCode: `# Health Bar System
class HealthSystem:
    def __init__(self, max_health=100):
        self.max_health = max_health
        self.current_health = max_health
        self.display_health = max_health  # For smooth animation
        
        # Regeneration
        self.regen_rate = 0.1  # HP per frame
        self.regen_delay = 0
        self.regen_delay_time = 180  # 3 seconds at 60 FPS
        
        # Visual settings
        self.bar_width = 200
        self.bar_height = 20
        self.bar_color = (0, 255, 0)
        self.back_color = (100, 0, 0)
        self.damage_color = (255, 255, 0)
        
        # Damage numbers
        self.damage_numbers = []
        
        # Status effects
        self.status_effects = {
            'poison': {'active': False, 'duration': 0, 'damage': 0.5},
            'burn': {'active': False, 'duration': 0, 'damage': 1},
            'freeze': {'active': False, 'duration': 0, 'slow': 0.5},
            'shield': {'active': False, 'duration': 0, 'reduction': 0.5}
        }
        
        # Health segments (for visual style)
        self.segments = 10
        self.critical_threshold = 0.25
        
    def take_damage(self, damage):
        """Apply damage with status effect modifiers"""
        # Apply shield reduction
        if self.status_effects['shield']['active']:
            damage *= (1 - self.status_effects['shield']['reduction'])
        
        actual_damage = min(self.current_health, damage)
        self.current_health = max(0, self.current_health - actual_damage)
        
        # Reset regeneration delay
        self.regen_delay = self.regen_delay_time
        
        # Create damage number
        self.damage_numbers.append({
            'value': int(actual_damage),
            'x': 0,  # Will be set when drawing
            'y': 0,
            'vel_y': -3,
            'life': 30,
            'color': (255, 50, 50),
            'crit': damage > 30
        })
        
        # Sound based on damage amount
        # if damage > 30:
        #     pygame.mixer.Sound('heavy_damage.wav').play()
        # else:
        #     pygame.mixer.Sound('light_damage.wav').play()
        
        return self.current_health <= 0
    
    def heal(self, amount):
        """Heal with visual feedback"""
        actual_heal = min(self.max_health - self.current_health, amount)
        self.current_health += actual_heal
        
        # Create heal number
        if actual_heal > 0:
            self.damage_numbers.append({
                'value': int(actual_heal),
                'x': 0,
                'y': 0,
                'vel_y': -2,
                'life': 30,
                'color': (50, 255, 50),
                'crit': False
            })
            # Sound hook
            # pygame.mixer.Sound('heal.wav').play()
    
    def apply_status(self, effect_name, duration):
        """Apply a status effect"""
        if effect_name in self.status_effects:
            self.status_effects[effect_name]['active'] = True
            self.status_effects[effect_name]['duration'] = duration
            # Sound hook
            # pygame.mixer.Sound(f'status_{effect_name}.wav').play()
    
    def update(self):
        """Update health system"""
        # Smooth health bar animation
        if self.display_health > self.current_health:
            self.display_health -= 2
            if self.display_health < self.current_health:
                self.display_health = self.current_health
        elif self.display_health < self.current_health:
            self.display_health += 2
            if self.display_health > self.current_health:
                self.display_health = self.current_health
        
        # Regeneration
        if self.regen_delay > 0:
            self.regen_delay -= 1
        else:
            if self.current_health < self.max_health:
                self.current_health = min(self.max_health,
                                         self.current_health + self.regen_rate)
        
        # Update status effects
        for effect_name, effect in self.status_effects.items():
            if effect['active']:
                effect['duration'] -= 1
                
                # Apply effect
                if effect_name == 'poison':
                    self.current_health = max(1, 
                                            self.current_health - effect['damage'])
                elif effect_name == 'burn':
                    self.current_health = max(0,
                                            self.current_health - effect['damage'])
                
                if effect['duration'] <= 0:
                    effect['active'] = False
        
        # Update damage numbers
        for num in self.damage_numbers[:]:
            num['y'] += num['vel_y']
            num['vel_y'] += 0.2  # Gravity
            num['life'] -= 1
            if num['life'] <= 0:
                self.damage_numbers.remove(num)
    
    def get_health_color(self):
        """Get color based on health percentage"""
        health_percent = self.current_health / self.max_health
        
        if health_percent > 0.66:
            return (0, 255, 0)  # Green
        elif health_percent > 0.33:
            return (255, 255, 0)  # Yellow
        elif health_percent > self.critical_threshold:
            return (255, 150, 0)  # Orange
        else:
            return (255, 0, 0)  # Red
    
    def draw(self, screen, x, y):
        """Draw health bar and effects"""
        import math
        
        # Draw bar background
        pygame.draw.rect(screen, self.back_color,
                       (x, y, self.bar_width, self.bar_height))
        
        # Draw damage preview (yellow bar showing recent damage)
        if self.display_health > self.current_health:
            damage_width = int((self.display_health / self.max_health) * self.bar_width)
            pygame.draw.rect(screen, self.damage_color,
                           (x, y, damage_width, self.bar_height))
        
        # Draw current health
        health_width = int((self.current_health / self.max_health) * self.bar_width)
        health_color = self.get_health_color()
        
        # Add pulse effect when critical
        if self.current_health / self.max_health <= self.critical_threshold:
            pulse = abs(math.sin(pygame.time.get_ticks() * 0.01)) * 50
            health_color = tuple(min(255, c + int(pulse)) for c in health_color)
        
        pygame.draw.rect(screen, health_color,
                       (x, y, health_width, self.bar_height))
        
        # Draw segments
        segment_width = self.bar_width // self.segments
        for i in range(1, self.segments):
            seg_x = x + i * segment_width
            pygame.draw.line(screen, (0, 0, 0),
                           (seg_x, y), (seg_x, y + self.bar_height), 1)
        
        # Draw bar border
        pygame.draw.rect(screen, (255, 255, 255),
                       (x, y, self.bar_width, self.bar_height), 2)
        
        # Draw health text
        font = pygame.font.Font(None, 16)
        health_text = f"{int(self.current_health)}/{self.max_health}"
        text_surface = font.render(health_text, True, (255, 255, 255))
        text_rect = text_surface.get_rect(center=(x + self.bar_width // 2, 
                                                 y + self.bar_height // 2))
        screen.blit(text_surface, text_rect)
        
        # Draw status effect icons
        effect_x = x
        effect_y = y + self.bar_height + 5
        for effect_name, effect in self.status_effects.items():
            if effect['active']:
                # Draw effect indicator
                effect_colors = {
                    'poison': (150, 0, 150),
                    'burn': (255, 100, 0),
                    'freeze': (0, 200, 255),
                    'shield': (100, 100, 255)
                }
                pygame.draw.circle(screen, effect_colors[effect_name],
                                 (effect_x + 10, effect_y + 10), 8)
                
                # Duration bar
                duration_percent = effect['duration'] / 300  # Max 5 seconds
                pygame.draw.rect(screen, effect_colors[effect_name],
                               (effect_x, effect_y + 20, 20 * duration_percent, 3))
                
                effect_x += 25
        
        # Draw damage numbers
        for num in self.damage_numbers:
            if num['x'] == 0:  # Set initial position
                num['x'] = x + self.bar_width // 2
                num['y'] = y - 20
            
            # Draw number with outline
            font_size = 24 if num['crit'] else 20
            font = pygame.font.Font(None, font_size)
            
            # Add transparency based on life
            alpha = min(255, num['life'] * 8)
            
            # Draw outline
            for dx in [-1, 0, 1]:
                for dy in [-1, 0, 1]:
                    if dx != 0 or dy != 0:
                        outline_text = font.render(str(num['value']), True, (0, 0, 0))
                        outline_text.set_alpha(alpha)
                        screen.blit(outline_text, (num['x'] + dx, num['y'] + dy))
            
            # Draw main number
            text = font.render(str(num['value']), True, num['color'])
            text.set_alpha(alpha)
            screen.blit(text, (num['x'], num['y']))
            
            # Draw "CRIT!" for critical hits
            if num['crit'] and num['life'] > 20:
                crit_font = pygame.font.Font(None, 16)
                crit_text = crit_font.render("CRIT!", True, (255, 255, 0))
                crit_text.set_alpha(alpha)
                screen.blit(crit_text, (num['x'] - 10, num['y'] - 15))`,
    },
  },

  {
    id: 'shield',
    title: 'Shield/Defense System',
    description: 'How players defend against attacks',
    optionA: {
      title: 'Energy Shield',
      description: 'Regenerating barrier that absorbs damage',
      features: ['Auto-regeneration', 'Overcharge capacity', 'Shield breaks', 'Energy management'],
      pythonCode: `# Energy Shield Defense System
class ShieldSystem:
    def __init__(self):
        self.max_shield = 50
        self.current_shield = self.max_shield
        self.shield_regen_rate = 0.5  # Per frame
        self.regen_delay = 0
        self.regen_delay_time = 120  # 2 seconds at 60 FPS
        
        # Overcharge system
        self.overcharge_active = False
        self.overcharge_amount = 0
        self.max_overcharge = 25
        self.overcharge_decay_rate = 0.2
        
        # Shield states
        self.is_broken = False
        self.break_cooldown = 0
        self.break_cooldown_time = 180  # 3 seconds to reboot
        
        # Visual effects
        self.shield_hex_pattern = []
        self.impact_ripples = []
        self.shield_color = (0, 150, 255)
        self.overcharge_color = (255, 150, 0)
        self.shield_opacity = 128
        self.shield_radius = 40
        
        # Energy management
        self.energy_cores = 3
        self.active_cores = 3
        
    def absorb_damage(self, damage):
        """Shield absorbs incoming damage"""
        if self.is_broken:
            return damage  # No protection when broken
        
        absorbed = 0
        remaining_damage = damage
        
        # First absorb with overcharge
        if self.overcharge_amount > 0:
            absorbed = min(self.overcharge_amount, remaining_damage)
            self.overcharge_amount -= absorbed
            remaining_damage -= absorbed
        
        # Then regular shield
        if remaining_damage > 0 and self.current_shield > 0:
            shield_absorbed = min(self.current_shield, remaining_damage)
            self.current_shield -= shield_absorbed
            absorbed += shield_absorbed
            remaining_damage -= shield_absorbed
            
            # Create impact ripple
            import random
            self.impact_ripples.append({
                'radius': 10,
                'max_radius': 30,
                'x': random.randint(-20, 20),
                'y': random.randint(-20, 20),
                'life': 20
            })
            
            # Reset regen delay
            self.regen_delay = self.regen_delay_time
            
            # Check for shield break
            if self.current_shield <= 0:
                self.break_shield()
        
        # Sound based on absorption
        # if absorbed > 0:
        #     if self.overcharge_amount > 0:
        #         pygame.mixer.Sound('shield_overcharge_hit.wav').play()
        #     else:
        #         pygame.mixer.Sound('shield_hit.wav').play()
        
        return remaining_damage
    
    def break_shield(self):
        """Shield breaks and needs to reboot"""
        self.is_broken = True
        self.break_cooldown = self.break_cooldown_time
        self.current_shield = 0
        self.overcharge_amount = 0
        self.active_cores = 0
        # Sound hook
        # pygame.mixer.Sound('shield_break.wav').play()
    
    def reboot_shield(self):
        """Reboot shield after break"""
        self.is_broken = False
        self.current_shield = self.max_shield * 0.5  # Start at half
        self.active_cores = self.energy_cores
        # Sound hook
        # pygame.mixer.Sound('shield_reboot.wav').play()
    
    def add_overcharge(self, amount):
        """Add overcharge shield energy"""
        if not self.is_broken:
            self.overcharge_amount = min(self.max_overcharge,
                                        self.overcharge_amount + amount)
            self.overcharge_active = True
            # Sound hook
            # pygame.mixer.Sound('overcharge.wav').play()
    
    def boost_regeneration(self):
        """Temporarily boost shield regen"""
        if self.active_cores > 1:
            self.active_cores -= 1
            self.shield_regen_rate *= 2
            # Returns to normal after some time
            return True
        return False
    
    def update(self):
        """Update shield system"""
        # Handle broken shield
        if self.is_broken:
            if self.break_cooldown > 0:
                self.break_cooldown -= 1
                if self.break_cooldown == 0:
                    self.reboot_shield()
            return
        
        # Shield regeneration
        if self.regen_delay > 0:
            self.regen_delay -= 1
        else:
            if self.current_shield < self.max_shield:
                regen_amount = self.shield_regen_rate * (self.active_cores / self.energy_cores)
                self.current_shield = min(self.max_shield,
                                        self.current_shield + regen_amount)
        
        # Overcharge decay
        if self.overcharge_amount > 0:
            self.overcharge_amount = max(0,
                                        self.overcharge_amount - self.overcharge_decay_rate)
            if self.overcharge_amount == 0:
                self.overcharge_active = False
        
        # Update visual effects
        for ripple in self.impact_ripples[:]:
            ripple['radius'] += 2
            ripple['life'] -= 1
            if ripple['life'] <= 0 or ripple['radius'] >= ripple['max_radius']:
                self.impact_ripples.remove(ripple)
    
    def draw(self, screen, player_x, player_y):
        """Draw shield effects and UI"""
        import math
        
        # Draw shield bubble
        if self.current_shield > 0 or self.overcharge_amount > 0:
            # Calculate shield strength for visuals
            shield_strength = self.current_shield / self.max_shield
            
            # Draw hexagonal shield pattern
            if self.overcharge_active:
                shield_color = self.overcharge_color
                opacity = min(200, self.shield_opacity + 50)
            else:
                shield_color = self.shield_color
                opacity = int(self.shield_opacity * shield_strength)
            
            # Draw shield bubble
            for ring in range(3):
                ring_radius = self.shield_radius - ring * 5
                ring_opacity = opacity // (ring + 1)
                
                # Create hexagon points
                hex_points = []
                for i in range(6):
                    angle = math.radians(60 * i)
                    x = player_x + ring_radius * math.cos(angle)
                    y = player_y + ring_radius * math.sin(angle)
                    hex_points.append((x, y))
                
                # Draw hexagon with transparency
                if len(hex_points) >= 3:
                    surface = pygame.Surface((screen.get_width(), screen.get_height()), 
                                           pygame.SRCALPHA)
                    color_with_alpha = (*shield_color, ring_opacity)
                    pygame.draw.polygon(surface, color_with_alpha, hex_points, 2)
                    screen.blit(surface, (0, 0))
            
            # Draw impact ripples
            for ripple in self.impact_ripples:
                ripple_opacity = int((ripple['life'] / 20) * 128)
                surface = pygame.Surface((screen.get_width(), screen.get_height()),
                                        pygame.SRCALPHA)
                pygame.draw.circle(surface, (*shield_color, ripple_opacity),
                                 (player_x + ripple['x'], player_y + ripple['y']),
                                 ripple['radius'], 2)
                screen.blit(surface, (0, 0))
        
        # Draw broken shield effect
        if self.is_broken:
            # Flickering effect
            if self.break_cooldown % 10 < 5:
                font = pygame.font.Font(None, 16)
                text = font.render("SHIELD OFFLINE", True, (255, 0, 0))
                screen.blit(text, (player_x - 40, player_y - 60))
                
                # Draw reboot progress
                reboot_progress = 1 - (self.break_cooldown / self.break_cooldown_time)
                pygame.draw.rect(screen, (100, 100, 100),
                               (player_x - 30, player_y - 45, 60, 5))
                pygame.draw.rect(screen, (0, 255, 0),
                               (player_x - 30, player_y - 45,
                                int(60 * reboot_progress), 5))
        
        # Draw shield UI bar
        self.draw_shield_bar(screen, 10, 60)
    
    def draw_shield_bar(self, screen, x, y):
        """Draw shield status bar"""
        bar_width = 150
        bar_height = 15
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50), (x, y, bar_width, bar_height))
        
        # Regular shield
        if self.current_shield > 0:
            shield_width = int((self.current_shield / self.max_shield) * bar_width)
            pygame.draw.rect(screen, self.shield_color,
                           (x, y, shield_width, bar_height))
        
        # Overcharge layer
        if self.overcharge_amount > 0:
            overcharge_width = int((self.overcharge_amount / self.max_overcharge) * bar_width)
            pygame.draw.rect(screen, self.overcharge_color,
                           (x, y, min(overcharge_width, bar_width), bar_height))
        
        # Energy core indicators
        for i in range(self.energy_cores):
            core_x = x + bar_width + 5 + i * 12
            if i < self.active_cores:
                pygame.draw.circle(screen, (0, 255, 255), (core_x, y + 7), 4)
            else:
                pygame.draw.circle(screen, (50, 50, 50), (core_x, y + 7), 4)
                pygame.draw.circle(screen, (100, 100, 100), (core_x, y + 7), 4, 1)
        
        # Border
        pygame.draw.rect(screen, (255, 255, 255), (x, y, bar_width, bar_height), 2)
        
        # Text
        font = pygame.font.Font(None, 16)
        if self.is_broken:
            text = font.render("REBOOTING...", True, (255, 0, 0))
        else:
            text = font.render("Shield", True, (255, 255, 255))
        screen.blit(text, (x, y - 15))`,
    },
    optionB: {
      title: 'Block/Parry',
      description: 'Timing-based defense with perfect blocks',
      features: ['Timed blocks', 'Perfect parries', 'Stamina usage', 'Counter opportunities'],
      pythonCode: `# Block/Parry Defense System
class ShieldSystem:
    def __init__(self):
        # Block mechanics
        self.is_blocking = False
        self.block_start_time = 0
        self.block_duration = 0
        self.block_cooldown = 0
        
        # Parry mechanics
        self.parry_window = 10  # Frames for perfect parry
        self.parry_success = False
        self.parry_flash_timer = 0
        
        # Stamina system
        self.max_stamina = 100
        self.current_stamina = self.max_stamina
        self.block_stamina_drain = 0.5  # Per frame while blocking
        self.parry_stamina_cost = 20
        self.stamina_regen_rate = 1.0
        
        # Block effectiveness
        self.block_reduction = 0.5  # 50% damage reduction
        self.perfect_parry_reduction = 1.0  # 100% damage reduction
        self.guard_break_threshold = 30  # Heavy attacks break guard
        
        # Visual feedback
        self.shield_sprite = None
        self.block_effects = []
        self.parry_spark_effects = []
        
        # Counter window
        self.counter_window_active = False
        self.counter_window_timer = 0
        self.counter_damage_multiplier = 2.0
        
    def start_block(self):
        """Begin blocking stance"""
        if self.current_stamina > 10 and self.block_cooldown <= 0:
            self.is_blocking = True
            self.block_start_time = pygame.time.get_ticks()
            self.block_duration = 0
            # Sound hook
            # pygame.mixer.Sound('shield_raise.wav').play()
    
    def end_block(self):
        """End blocking stance"""
        self.is_blocking = False
        self.block_cooldown = 10  # Short cooldown
        self.parry_success = False
    
    def attempt_parry(self, incoming_damage):
        """Check if attack is perfectly parried"""
        if self.is_blocking and self.block_duration <= self.parry_window:
            if self.current_stamina >= self.parry_stamina_cost:
                # Perfect parry!
                self.parry_success = True
                self.parry_flash_timer = 15
                self.current_stamina -= self.parry_stamina_cost
                
                # Activate counter window
                self.counter_window_active = True
                self.counter_window_timer = 30  # Half second to counter
                
                # Create spark effects
                import random
                for _ in range(10):
                    self.parry_spark_effects.append({
                        'x': random.randint(-20, 20),
                        'y': random.randint(-20, 20),
                        'vel_x': random.uniform(-5, 5),
                        'vel_y': random.uniform(-5, 5),
                        'life': 20,
                        'size': random.randint(2, 5)
                    })
                
                # Sound hook
                # pygame.mixer.Sound('perfect_parry.wav').play()
                return 0  # No damage taken
        
        return None  # Not a parry
    
    def block_damage(self, damage, attack_type='normal'):
        """Process incoming damage through block"""
        if not self.is_blocking:
            return damage  # Full damage if not blocking
        
        # Check for perfect parry first
        parry_result = self.attempt_parry(damage)
        if parry_result is not None:
            return parry_result
        
        # Check for guard break
        if attack_type == 'heavy' or damage > self.guard_break_threshold:
            # Guard broken!
            self.is_blocking = False
            self.block_cooldown = 60  # Longer cooldown when guard broken
            
            # Create break effect
            self.block_effects.append({
                'type': 'break',
                'x': 0, 'y': 0,
                'life': 30
            })
            
            # Sound hook
            # pygame.mixer.Sound('guard_break.wav').play()
            return damage * 0.75  # Take most damage
        
        # Normal block
        stamina_cost = damage * 0.5
        if self.current_stamina >= stamina_cost:
            self.current_stamina -= stamina_cost
            reduced_damage = damage * (1 - self.block_reduction)
            
            # Create block effect
            self.block_effects.append({
                'type': 'block',
                'x': random.randint(-10, 10),
                'y': random.randint(-10, 10),
                'life': 10
            })
            
            # Sound hook
            # pygame.mixer.Sound('block_hit.wav').play()
            return reduced_damage
        else:
            # Not enough stamina, partial block
            self.current_stamina = 0
            return damage * 0.75
    
    def update(self):
        """Update blocking system"""
        # Update block duration
        if self.is_blocking:
            self.block_duration += 1
            # Drain stamina while blocking
            self.current_stamina = max(0, 
                                      self.current_stamina - self.block_stamina_drain)
            
            # Force end block if out of stamina
            if self.current_stamina <= 0:
                self.end_block()
        else:
            # Regenerate stamina when not blocking
            self.current_stamina = min(self.max_stamina,
                                      self.current_stamina + self.stamina_regen_rate)
        
        # Update cooldowns
        if self.block_cooldown > 0:
            self.block_cooldown -= 1
        
        if self.parry_flash_timer > 0:
            self.parry_flash_timer -= 1
        
        if self.counter_window_timer > 0:
            self.counter_window_timer -= 1
            if self.counter_window_timer == 0:
                self.counter_window_active = False
        
        # Update visual effects
        for effect in self.block_effects[:]:
            effect['life'] -= 1
            if 'vel_x' in effect:
                effect['x'] += effect['vel_x']
                effect['y'] += effect['vel_y']
            if effect['life'] <= 0:
                self.block_effects.remove(effect)
        
        for spark in self.parry_spark_effects[:]:
            spark['x'] += spark['vel_x']
            spark['y'] += spark['vel_y']
            spark['vel_y'] += 0.5  # Gravity
            spark['life'] -= 1
            if spark['life'] <= 0:
                self.parry_spark_effects.remove(spark)
    
    def get_counter_multiplier(self):
        """Get damage multiplier for counter attacks"""
        if self.counter_window_active:
            return self.counter_damage_multiplier
        return 1.0
    
    def draw(self, screen, player_x, player_y, facing_right):
        """Draw blocking effects and UI"""
        # Draw shield/block pose
        if self.is_blocking:
            # Shield position
            if facing_right:
                shield_x = player_x + 15
            else:
                shield_x = player_x - 15
            shield_y = player_y
            
            # Draw shield
            if self.shield_sprite:
                screen.blit(self.shield_sprite, (shield_x - 10, shield_y - 20))
            else:
                # Draw default shield
                shield_color = (150, 150, 150)
                if self.block_duration <= self.parry_window:
                    # Parry window indicator - golden shield
                    shield_color = (255, 215, 0)
                
                # Shield shape
                pygame.draw.rect(screen, shield_color,
                               (shield_x - 10, shield_y - 20, 20, 40))
                pygame.draw.rect(screen, (100, 100, 100),
                               (shield_x - 10, shield_y - 20, 20, 40), 2)
                
                # Shield decorations
                pygame.draw.line(screen, (200, 200, 200),
                               (shield_x - 8, shield_y - 15),
                               (shield_x + 8, shield_y - 15), 2)
                pygame.draw.line(screen, (200, 200, 200),
                               (shield_x, shield_y - 18),
                               (shield_x, shield_y + 18), 2)
        
        # Draw parry flash
        if self.parry_flash_timer > 0:
            flash_radius = 50 - (15 - self.parry_flash_timer) * 3
            surface = pygame.Surface((screen.get_width(), screen.get_height()),
                                    pygame.SRCALPHA)
            pygame.draw.circle(surface, (255, 255, 0, 100),
                             (player_x, player_y), flash_radius, 3)
            screen.blit(surface, (0, 0))
        
        # Draw parry sparks
        for spark in self.parry_spark_effects:
            pygame.draw.circle(screen, (255, 255, 0),
                             (player_x + spark['x'], player_y + spark['y']),
                             spark['size'])
        
        # Draw block effects
        for effect in self.block_effects:
            if effect['type'] == 'block':
                # Impact flash
                pygame.draw.circle(screen, (255, 255, 255),
                                 (player_x + effect['x'], player_y + effect['y']),
                                 effect['life'])
            elif effect['type'] == 'break':
                # Guard break effect
                for i in range(3):
                    pygame.draw.circle(screen, (255, 0, 0),
                                     (player_x + random.randint(-30, 30),
                                      player_y + random.randint(-30, 30)),
                                     random.randint(2, 5))
        
        # Draw counter window indicator
        if self.counter_window_active:
            font = pygame.font.Font(None, 20)
            text = font.render("COUNTER!", True, (255, 100, 0))
            text_rect = text.get_rect(center=(player_x, player_y - 50))
            screen.blit(text, text_rect)
        
        # Draw stamina bar
        self.draw_stamina_bar(screen, 10, 60)
    
    def draw_stamina_bar(self, screen, x, y):
        """Draw stamina gauge"""
        bar_width = 150
        bar_height = 12
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50), (x, y, bar_width, bar_height))
        
        # Stamina fill
        stamina_percent = self.current_stamina / self.max_stamina
        stamina_color = (0, 200, 0)
        if stamina_percent < 0.3:
            stamina_color = (200, 0, 0)
        elif stamina_percent < 0.5:
            stamina_color = (200, 200, 0)
        
        stamina_width = int(bar_width * stamina_percent)
        pygame.draw.rect(screen, stamina_color,
                       (x, y, stamina_width, bar_height))
        
        # Parry window indicator
        if self.is_blocking and self.block_duration <= self.parry_window:
            # Golden line for parry timing
            parry_percent = (self.parry_window - self.block_duration) / self.parry_window
            parry_x = x + int(bar_width * parry_percent)
            pygame.draw.line(screen, (255, 215, 0),
                           (parry_x, y), (parry_x, y + bar_height), 2)
        
        # Border
        pygame.draw.rect(screen, (255, 255, 255), (x, y, bar_width, bar_height), 2)
        
        # Text
        font = pygame.font.Font(None, 16)
        text = font.render("Stamina", True, (255, 255, 255))
        screen.blit(text, (x, y - 15))`,
    },
  },

  {
    id: 'combo',
    title: 'Combo System',
    description: 'How attack combinations work',
    optionA: {
      title: 'Button Mashing',
      description: 'Speed-based combos - the faster you attack, the higher the combo!',
      features: ['Speed multipliers', 'Combo meter', 'Chain bonuses', 'Fever mode'],
      pythonCode: `# Button Mashing Combo System
class ComboSystem:
    def __init__(self):
        self.combo_count = 0
        self.combo_timer = 0
        self.combo_timeout = 60  # 1 second to continue combo
        
        # Speed tracking
        self.hit_timestamps = []
        self.hits_per_second = 0
        self.max_speed_bonus = 3.0
        
        # Combo multipliers
        self.base_multiplier = 1.0
        self.current_multiplier = 1.0
        self.combo_tiers = [
            {'min': 0, 'mult': 1.0, 'color': (255, 255, 255), 'name': ''},
            {'min': 5, 'mult': 1.5, 'color': (255, 255, 0), 'name': 'GOOD!'},
            {'min': 10, 'mult': 2.0, 'color': (255, 150, 0), 'name': 'GREAT!'},
            {'min': 20, 'mult': 3.0, 'color': (255, 100, 0), 'name': 'AMAZING!'},
            {'min': 30, 'mult': 4.0, 'color': (255, 0, 0), 'name': 'INCREDIBLE!'},
            {'min': 50, 'mult': 5.0, 'color': (255, 0, 255), 'name': 'LEGENDARY!'}
        ]
        
        # Fever mode
        self.fever_mode = False
        self.fever_timer = 0
        self.fever_duration = 300  # 5 seconds
        self.fever_threshold = 40  # Combo count to trigger
        self.fever_multiplier = 2.0
        
        # Combo meter (builds up for special attacks)
        self.combo_meter = 0
        self.max_combo_meter = 100
        self.meter_per_hit = 2
        
        # Visual effects
        self.screen_shake = 0
        self.combo_particles = []
        self.combo_text_effects = []
        
    def register_hit(self):
        """Register a successful hit"""
        current_time = pygame.time.get_ticks()
        
        # Add to combo
        self.combo_count += 1
        self.combo_timer = self.combo_timeout
        
        # Track hit timing for speed calculation
        self.hit_timestamps.append(current_time)
        # Keep only last second of hits
        self.hit_timestamps = [t for t in self.hit_timestamps 
                              if current_time - t < 1000]
        
        # Calculate hits per second
        self.hits_per_second = len(self.hit_timestamps)
        
        # Build combo meter
        meter_gain = self.meter_per_hit * self.current_multiplier
        self.combo_meter = min(self.max_combo_meter, 
                              self.combo_meter + meter_gain)
        
        # Check for fever mode activation
        if self.combo_count >= self.fever_threshold and not self.fever_mode:
            self.activate_fever_mode()
        
        # Update multiplier
        self.update_multiplier()
        
        # Create visual feedback
        self.create_hit_effect()
        
        # Sound based on combo tier
        # tier = self.get_current_tier()
        # pygame.mixer.Sound(f'combo_{tier["name"].lower()}.wav').play()
    
    def activate_fever_mode(self):
        """Enter fever mode for massive damage"""
        self.fever_mode = True
        self.fever_timer = self.fever_duration
        self.screen_shake = 20
        
        # Create explosion of particles
        import random
        for _ in range(30):
            self.combo_particles.append({
                'x': 400 + random.randint(-50, 50),
                'y': 300 + random.randint(-50, 50),
                'vel_x': random.uniform(-10, 10),
                'vel_y': random.uniform(-10, 10),
                'life': 60,
                'color': (255, random.randint(0, 255), 0),
                'size': random.randint(3, 8)
            })
        
        # Sound hook
        # pygame.mixer.Sound('fever_mode.wav').play()
    
    def update_multiplier(self):
        """Calculate current damage multiplier"""
        # Base tier multiplier
        tier = self.get_current_tier()
        tier_mult = tier['mult']
        
        # Speed bonus (more hits per second = higher multiplier)
        speed_mult = 1.0 + (self.hits_per_second * 0.1)
        speed_mult = min(self.max_speed_bonus, speed_mult)
        
        # Fever mode bonus
        fever_mult = self.fever_multiplier if self.fever_mode else 1.0
        
        # Total multiplier
        self.current_multiplier = tier_mult * speed_mult * fever_mult
    
    def get_current_tier(self):
        """Get current combo tier"""
        current_tier = self.combo_tiers[0]
        for tier in self.combo_tiers:
            if self.combo_count >= tier['min']:
                current_tier = tier
        return current_tier
    
    def use_special_attack(self):
        """Consume combo meter for special attack"""
        if self.combo_meter >= self.max_combo_meter:
            self.combo_meter = 0
            self.screen_shake = 15
            
            # Create special effect
            self.combo_text_effects.append({
                'text': 'SPECIAL ATTACK!',
                'x': 400,
                'y': 200,
                'vel_y': -3,
                'life': 60,
                'size': 48,
                'color': (255, 0, 255)
            })
            
            # Sound hook
            # pygame.mixer.Sound('special_attack.wav').play()
            return True
        return False
    
    def break_combo(self):
        """Reset combo when missed or took damage"""
        if self.combo_count > 10:  # Only show break message for decent combos
            self.combo_text_effects.append({
                'text': f'COMBO BROKEN: {self.combo_count}',
                'x': 400,
                'y': 250,
                'vel_y': -2,
                'life': 45,
                'size': 24,
                'color': (255, 50, 50)
            })
        
        self.combo_count = 0
        self.combo_timer = 0
        self.hits_per_second = 0
        self.hit_timestamps.clear()
        self.current_multiplier = 1.0
        
        if self.fever_mode:
            self.fever_mode = False
            self.fever_timer = 0
    
    def create_hit_effect(self):
        """Create visual effect for combo hit"""
        import random
        
        # Add combo text
        tier = self.get_current_tier()
        if tier['name'] and self.combo_count % 5 == 0:  # Show every 5 hits
            self.combo_text_effects.append({
                'text': tier['name'],
                'x': 400 + random.randint(-50, 50),
                'y': 250,
                'vel_y': -4,
                'life': 30,
                'size': 32,
                'color': tier['color']
            })
        
        # Add particles
        particle_count = min(10, self.combo_count // 5)
        for _ in range(particle_count):
            self.combo_particles.append({
                'x': 400,
                'y': 300,
                'vel_x': random.uniform(-5, 5),
                'vel_y': random.uniform(-5, 0),
                'life': 20,
                'color': tier['color'],
                'size': random.randint(2, 5)
            })
    
    def update(self):
        """Update combo system"""
        # Update combo timer
        if self.combo_timer > 0:
            self.combo_timer -= 1
            if self.combo_timer == 0:
                self.break_combo()
        
        # Update fever mode
        if self.fever_mode:
            self.fever_timer -= 1
            if self.fever_timer <= 0:
                self.fever_mode = False
                self.fever_timer = 0
        
        # Update screen shake
        if self.screen_shake > 0:
            self.screen_shake -= 1
        
        # Update particles
        for particle in self.combo_particles[:]:
            particle['x'] += particle['vel_x']
            particle['y'] += particle['vel_y']
            particle['vel_y'] += 0.5  # Gravity
            particle['life'] -= 1
            particle['vel_x'] *= 0.95  # Air resistance
            if particle['life'] <= 0:
                self.combo_particles.remove(particle)
        
        # Update text effects
        for text in self.combo_text_effects[:]:
            text['y'] += text['vel_y']
            text['life'] -= 1
            if text['life'] <= 0:
                self.combo_text_effects.remove(text)
    
    def get_screen_offset(self):
        """Get screen shake offset"""
        if self.screen_shake > 0:
            import random
            return (random.randint(-self.screen_shake, self.screen_shake),
                   random.randint(-self.screen_shake, self.screen_shake))
        return (0, 0)
    
    def draw(self, screen):
        """Draw combo UI and effects"""
        # Draw particles
        for particle in self.combo_particles:
            if self.fever_mode:
                # Rainbow particles in fever mode
                import math
                hue = (pygame.time.get_ticks() * 0.01 + particle['life']) % 360
                color = self.hsv_to_rgb(hue, 1, 1)
            else:
                color = particle['color']
            
            pygame.draw.circle(screen, color,
                             (int(particle['x']), int(particle['y'])),
                             particle['size'])
        
        # Draw combo counter
        if self.combo_count > 0:
            tier = self.get_current_tier()
            font_size = 48 if self.fever_mode else 36
            font = pygame.font.Font(None, font_size)
            
            # Combo number
            combo_text = f"{self.combo_count} COMBO"
            text_surface = font.render(combo_text, True, tier['color'])
            text_rect = text_surface.get_rect(center=(400, 100))
            
            # Add pulsing effect
            if self.fever_mode:
                import math
                scale = 1 + math.sin(pygame.time.get_ticks() * 0.01) * 0.1
                text_surface = pygame.transform.rotozoom(text_surface, 0, scale)
            
            screen.blit(text_surface, text_rect)
            
            # Speed indicator
            speed_font = pygame.font.Font(None, 24)
            speed_text = f"{self.hits_per_second} HITS/SEC"
            speed_surface = speed_font.render(speed_text, True, (255, 255, 255))
            screen.blit(speed_surface, (350, 130))
            
            # Multiplier
            mult_text = f"x{self.current_multiplier:.1f}"
            mult_surface = font.render(mult_text, True, (255, 255, 0))
            screen.blit(mult_surface, (350, 150))
        
        # Draw text effects
        for text in self.combo_text_effects:
            font = pygame.font.Font(None, text['size'])
            surface = font.render(text['text'], True, text['color'])
            alpha = min(255, text['life'] * 8)
            surface.set_alpha(alpha)
            rect = surface.get_rect(center=(text['x'], text['y']))
            screen.blit(surface, rect)
        
        # Draw combo meter
        self.draw_combo_meter(screen, 10, 100)
        
        # Draw fever mode effect
        if self.fever_mode:
            # Screen border glow
            surface = pygame.Surface((screen.get_width(), screen.get_height()),
                                    pygame.SRCALPHA)
            for i in range(5):
                alpha = 50 - i * 10
                pygame.draw.rect(surface, (255, 0, 0, alpha),
                               (i*10, i*10, 
                                screen.get_width() - i*20,
                                screen.get_height() - i*20), 5)
            screen.blit(surface, (0, 0))
    
    def draw_combo_meter(self, screen, x, y):
        """Draw special attack meter"""
        width = 150
        height = 20
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50), (x, y, width, height))
        
        # Fill
        fill_percent = self.combo_meter / self.max_combo_meter
        fill_color = (255, 255, 0) if fill_percent < 1.0 else (255, 0, 255)
        
        # Pulsing when full
        if fill_percent >= 1.0:
            import math
            pulse = abs(math.sin(pygame.time.get_ticks() * 0.01))
            fill_color = tuple(int(c * (0.5 + pulse * 0.5)) for c in fill_color)
        
        pygame.draw.rect(screen, fill_color,
                       (x, y, int(width * fill_percent), height))
        
        # Border
        pygame.draw.rect(screen, (255, 255, 255), (x, y, width, height), 2)
        
        # Text
        font = pygame.font.Font(None, 16)
        if fill_percent >= 1.0:
            text = font.render("SPECIAL READY!", True, (255, 0, 255))
        else:
            text = font.render(f"Special: {int(fill_percent * 100)}%", True, (255, 255, 255))
        screen.blit(text, (x, y - 15))
    
    def hsv_to_rgb(self, h, s, v):
        """Convert HSV to RGB for rainbow effects"""
        import math
        h = h / 360
        i = math.floor(h * 6)
        f = h * 6 - i
        p = v * (1 - s)
        q = v * (1 - f * s)
        t = v * (1 - (1 - f) * s)
        
        i = i % 6
        
        if i == 0:
            r, g, b = v, t, p
        elif i == 1:
            r, g, b = q, v, p
        elif i == 2:
            r, g, b = p, v, t
        elif i == 3:
            r, g, b = p, q, v
        elif i == 4:
            r, g, b = t, p, v
        elif i == 5:
            r, g, b = v, p, q
        
        return (int(r * 255), int(g * 255), int(b * 255))`,
    },
    optionB: {
      title: 'Rhythm Combat',
      description: 'Time your hits to the beat for maximum damage!',
      features: ['Beat indicators', 'Perfect timing', 'Musical combos', 'Rhythm streaks'],
      pythonCode: `# Rhythm Combat System
class ComboSystem:
    def __init__(self):
        # Beat timing
        self.bpm = 120  # Beats per minute
        self.beat_interval = 60000 / self.bpm  # Milliseconds per beat
        self.last_beat_time = pygame.time.get_ticks()
        self.next_beat_time = self.last_beat_time + self.beat_interval
        
        # Timing windows
        self.perfect_window = 50  # ms window for perfect hit
        self.good_window = 100  # ms window for good hit
        self.ok_window = 150  # ms window for ok hit
        
        # Combo tracking
        self.combo_count = 0
        self.perfect_streak = 0
        self.rhythm_score = 0
        self.max_combo = 0
        
        # Timing feedback
        self.last_hit_timing = None  # 'perfect', 'good', 'ok', 'miss'
        self.timing_display_timer = 0
        
        # Musical patterns
        self.current_pattern = []
        self.pattern_index = 0
        self.patterns = {
            'basic': [1, 0, 1, 0],  # Simple beat
            'synco': [1, 0, 0, 1, 0, 1, 1, 0],  # Syncopated
            'triplet': [1, 1, 1, 0],  # Triplet feel
            'complex': [1, 0, 1, 1, 0, 0, 1, 0]  # Complex pattern
        }
        self.current_pattern = self.patterns['basic']
        
        # Visual elements
        self.beat_indicators = []
        self.hit_effects = []
        self.beat_pulse = 0
        
        # Rhythm multipliers
        self.timing_multipliers = {
            'perfect': 2.0,
            'good': 1.5,
            'ok': 1.0,
            'miss': 0.5
        }
        self.current_multiplier = 1.0
        
        # Special rhythm mode
        self.rhythm_fury = False
        self.fury_timer = 0
        self.fury_duration = 480  # 8 beats
        
    def update(self):
        """Update rhythm system"""
        current_time = pygame.time.get_ticks()
        
        # Check for beat
        if current_time >= self.next_beat_time:
            self.on_beat()
            self.last_beat_time = self.next_beat_time
            self.next_beat_time += self.beat_interval
        
        # Update beat pulse for visual
        beat_progress = (current_time - self.last_beat_time) / self.beat_interval
        self.beat_pulse = math.sin(beat_progress * math.pi) * 0.3
        
        # Update timing display
        if self.timing_display_timer > 0:
            self.timing_display_timer -= 1
        
        # Update visual effects
        for indicator in self.beat_indicators[:]:
            indicator['life'] -= 1
            indicator['radius'] += 2
            if indicator['life'] <= 0:
                self.beat_indicators.remove(indicator)
        
        for effect in self.hit_effects[:]:
            effect['y'] -= 2
            effect['life'] -= 1
            if effect['life'] <= 0:
                self.hit_effects.remove(effect)
        
        # Update rhythm fury
        if self.rhythm_fury:
            self.fury_timer -= 1
            if self.fury_timer <= 0:
                self.rhythm_fury = False
    
    def on_beat(self):
        """Called when a beat occurs"""
        # Create beat indicator
        self.beat_indicators.append({
            'radius': 10,
            'life': 20,
            'strong': self.pattern_index == 0  # Strong beat
        })
        
        # Advance pattern
        self.pattern_index = (self.pattern_index + 1) % len(self.current_pattern)
        
        # Sound hook for metronome
        # if self.pattern_index == 0:
        #     pygame.mixer.Sound('beat_strong.wav').play()
        # else:
        #     pygame.mixer.Sound('beat_weak.wav').play()
    
    def register_hit(self):
        """Register an attack and check timing"""
        current_time = pygame.time.get_ticks()
        time_to_beat = abs(current_time - self.last_beat_time)
        time_to_next_beat = abs(current_time - self.next_beat_time)
        
        # Find closest beat
        closest_beat_distance = min(time_to_beat, time_to_next_beat)
        
        # Determine timing quality
        if closest_beat_distance <= self.perfect_window:
            self.last_hit_timing = 'perfect'
            self.perfect_streak += 1
            self.combo_count += 1
            self.rhythm_score += 100 * (1 + self.perfect_streak * 0.1)
            color = (255, 215, 0)  # Gold
            
            # Check for rhythm fury activation
            if self.perfect_streak >= 8 and not self.rhythm_fury:
                self.activate_rhythm_fury()
                
        elif closest_beat_distance <= self.good_window:
            self.last_hit_timing = 'good'
            self.perfect_streak = 0
            self.combo_count += 1
            self.rhythm_score += 50
            color = (0, 255, 0)  # Green
            
        elif closest_beat_distance <= self.ok_window:
            self.last_hit_timing = 'ok'
            self.perfect_streak = 0
            self.combo_count += 1
            self.rhythm_score += 25
            color = (255, 255, 0)  # Yellow
            
        else:
            self.last_hit_timing = 'miss'
            self.perfect_streak = 0
            self.combo_count = 0  # Break combo on miss
            color = (255, 0, 0)  # Red
        
        # Update multiplier
        self.current_multiplier = self.timing_multipliers[self.last_hit_timing]
        if self.rhythm_fury:
            self.current_multiplier *= 2.0
        
        # Create hit effect
        self.hit_effects.append({
            'text': self.last_hit_timing.upper(),
            'x': 400,
            'y': 200,
            'life': 30,
            'color': color
        })
        
        self.timing_display_timer = 30
        
        # Update max combo
        self.max_combo = max(self.max_combo, self.combo_count)
        
        # Sound feedback
        # pygame.mixer.Sound(f'hit_{self.last_hit_timing}.wav').play()
        
        return self.current_multiplier
    
    def activate_rhythm_fury(self):
        """Activate special rhythm fury mode"""
        self.rhythm_fury = True
        self.fury_timer = self.fury_duration
        
        # Create visual explosion
        for _ in range(20):
            self.beat_indicators.append({
                'radius': random.randint(10, 50),
                'life': 40,
                'strong': True
            })
        
        # Sound hook
        # pygame.mixer.Sound('rhythm_fury.wav').play()
    
    def change_pattern(self, pattern_name):
        """Change the rhythm pattern"""
        if pattern_name in self.patterns:
            self.current_pattern = self.patterns[pattern_name]
            self.pattern_index = 0
    
    def draw(self, screen):
        """Draw rhythm UI"""
        import math
        
        # Draw beat timeline
        self.draw_beat_timeline(screen, 200, 500, 400, 50)
        
        # Draw beat indicators (pulsing circles)
        for indicator in self.beat_indicators:
            alpha = indicator['life'] * 12
            color = (255, 255, 255) if indicator['strong'] else (150, 150, 150)
            
            surface = pygame.Surface((screen.get_width(), screen.get_height()),
                                    pygame.SRCALPHA)
            color_with_alpha = (*color, alpha)
            pygame.draw.circle(surface, color_with_alpha,
                             (400, 300), indicator['radius'], 3)
            screen.blit(surface, (0, 0))
        
        # Draw timing feedback
        for effect in self.hit_effects:
            font = pygame.font.Font(None, 36)
            text = font.render(effect['text'], True, effect['color'])
            text_rect = text.get_rect(center=(effect['x'], effect['y']))
            text.set_alpha(effect['life'] * 8)
            screen.blit(text, text_rect)
        
        # Draw combo counter
        if self.combo_count > 0:
            font = pygame.font.Font(None, 48)
            combo_text = f"{self.combo_count} COMBO"
            
            # Add rhythm pulse
            scale = 1 + self.beat_pulse * 0.2
            color = (255, 215, 0) if self.perfect_streak > 0 else (255, 255, 255)
            
            text = font.render(combo_text, True, color)
            text = pygame.transform.rotozoom(text, 0, scale)
            text_rect = text.get_rect(center=(400, 100))
            screen.blit(text, text_rect)
            
            # Perfect streak indicator
            if self.perfect_streak > 0:
                streak_font = pygame.font.Font(None, 24)
                streak_text = f"PERFECT x{self.perfect_streak}"
                streak_surface = streak_font.render(streak_text, True, (255, 215, 0))
                screen.blit(streak_surface, (350, 130))
        
        # Draw multiplier
        mult_font = pygame.font.Font(None, 36)
        mult_text = f"x{self.current_multiplier:.1f}"
        mult_color = (255, 255, 255)
        if self.rhythm_fury:
            # Rainbow color in fury mode
            hue = (pygame.time.get_ticks() * 0.1) % 360
            mult_color = self.hsv_to_rgb(hue, 1, 1)
        mult_surface = mult_font.render(mult_text, True, mult_color)
        screen.blit(mult_surface, (10, 150))
        
        # Draw rhythm fury effect
        if self.rhythm_fury:
            # Screen edge glow
            surface = pygame.Surface((screen.get_width(), screen.get_height()),
                                    pygame.SRCALPHA)
            
            # Pulsing border
            pulse = abs(math.sin(pygame.time.get_ticks() * 0.01)) * 100
            for i in range(3):
                alpha = int(pulse - i * 30)
                if alpha > 0:
                    pygame.draw.rect(surface, (255, 0, 255, alpha),
                                   (i*10, i*10,
                                    screen.get_width() - i*20,
                                    screen.get_height() - i*20), 5)
            screen.blit(surface, (0, 0))
            
            # Fury text
            fury_font = pygame.font.Font(None, 64)
            fury_text = fury_font.render("RHYTHM FURY!", True, (255, 0, 255))
            fury_rect = fury_text.get_rect(center=(400, 50))
            screen.blit(fury_text, fury_rect)
    
    def draw_beat_timeline(self, screen, x, y, width, height):
        """Draw visual beat timeline"""
        current_time = pygame.time.get_ticks()
        
        # Background
        pygame.draw.rect(screen, (50, 50, 50), (x, y, width, height))
        
        # Draw upcoming beats
        for i in range(-2, 5):  # Show past and future beats
            beat_time = self.last_beat_time + i * self.beat_interval
            time_diff = beat_time - current_time
            
            # Convert to position on timeline
            beat_x = x + width // 2 + int(time_diff * width / (self.beat_interval * 4))
            
            if x <= beat_x <= x + width:
                # Determine if this is a strong beat
                beat_index = (self.pattern_index + i) % len(self.current_pattern)
                is_strong = self.current_pattern[beat_index] == 1
                
                # Draw beat marker
                if is_strong:
                    pygame.draw.line(screen, (255, 255, 255),
                                   (beat_x, y), (beat_x, y + height), 3)
                else:
                    pygame.draw.line(screen, (150, 150, 150),
                                   (beat_x, y + 10), (beat_x, y + height - 10), 1)
        
        # Draw timing windows
        center_x = x + width // 2
        
        # Perfect window (gold)
        perfect_width = int(self.perfect_window * width / (self.beat_interval * 4))
        pygame.draw.rect(screen, (255, 215, 0, 50),
                       (center_x - perfect_width, y, perfect_width * 2, height))
        
        # Good window (green)
        good_width = int(self.good_window * width / (self.beat_interval * 4))
        pygame.draw.rect(screen, (0, 255, 0, 30),
                       (center_x - good_width, y, good_width * 2, height))
        
        # OK window (yellow)
        ok_width = int(self.ok_window * width / (self.beat_interval * 4))
        pygame.draw.rect(screen, (255, 255, 0, 20),
                       (center_x - ok_width, y, ok_width * 2, height))
        
        # Draw center line (now)
        pygame.draw.line(screen, (255, 0, 0),
                       (center_x, y - 5), (center_x, y + height + 5), 2)
        
        # Border
        pygame.draw.rect(screen, (255, 255, 255), (x, y, width, height), 2)
        
        # Labels
        font = pygame.font.Font(None, 16)
        label = font.render("RHYTHM", True, (255, 255, 255))
        screen.blit(label, (x, y - 20))
    
    def hsv_to_rgb(self, h, s, v):
        """Convert HSV to RGB for rainbow effects"""
        import math
        h = h / 360
        i = math.floor(h * 6)
        f = h * 6 - i
        p = v * (1 - s)
        q = v * (1 - f * s)
        t = v * (1 - (1 - f) * s)
        
        i = i % 6
        
        if i == 0:
            r, g, b = v, t, p
        elif i == 1:
            r, g, b = q, v, p
        elif i == 2:
            r, g, b = p, v, t
        elif i == 3:
            r, g, b = p, q, v
        elif i == 4:
            r, g, b = t, p, v
        elif i == 5:
            r, g, b = v, p, q
        
        return (int(r * 255), int(g * 255), int(b * 255))`,
    },
  },

  {
    id: 'scoredisplay',
    title: 'Score Display',
    description: 'How scores and points are shown on screen',
    optionA: {
      title: 'Arcade Style Score',
      description: 'Big, bold numbers at the top center like classic arcade games',
      features: [
        'Large font display',
        'Animated score changes',
        'High score tracking',
        'Combo multipliers',
      ],
      pythonCode: `# Arcade Style Score Display
class ScoreDisplay:
    def __init__(self):
        self.score = 0
        self.high_score = self.load_high_score()
        self.display_score = 0  # For animated transitions
        self.combo_multiplier = 1
        self.combo_timer = 0
        self.score_popups = []  # For floating score animations
        
        # Font sizes for different elements
        self.score_font_size = 48
        self.high_score_font_size = 24
        self.combo_font_size = 36
        
    def load_high_score(self):
        """Load high score from file or return 0"""
        try:
            with open('high_score.txt', 'r') as f:
                return int(f.read())
        except:
            return 0
    
    def save_high_score(self):
        """Save high score to file"""
        if self.score > self.high_score:
            self.high_score = self.score
            with open('high_score.txt', 'w') as f:
                f.write(str(self.high_score))
    
    def add_score(self, points, x=None, y=None):
        """Add points to score with optional popup animation"""
        actual_points = points * self.combo_multiplier
        self.score += actual_points
        
        # Reset combo timer
        self.combo_timer = 180  # 3 seconds at 60 FPS
        
        # Create popup animation if position provided
        if x is not None and y is not None:
            self.score_popups.append({
                'points': actual_points,
                'x': x,
                'y': y,
                'timer': 60,
                'color': self.get_popup_color(actual_points)
            })
        
        # Update high score if beaten
        if self.score > self.high_score:
            self.high_score = self.score
    
    def update_combo(self):
        """Update combo multiplier based on timer"""
        if self.combo_timer > 0:
            self.combo_timer -= 1
            
            # Increase combo for consecutive hits
            if self.combo_timer > 150:  # Within 0.5 seconds
                if self.combo_multiplier < 8:
                    self.combo_multiplier += 1
        else:
            # Reset combo if timer expires
            self.combo_multiplier = 1
    
    def get_popup_color(self, points):
        """Get color based on point value"""
        if points >= 1000:
            return (255, 215, 0)  # Gold
        elif points >= 500:
            return (255, 255, 0)  # Yellow
        elif points >= 100:
            return (0, 255, 255)  # Cyan
        else:
            return (255, 255, 255)  # White
    
    def update(self):
        """Update score animations"""
        # Smooth score display transition
        if self.display_score < self.score:
            diff = self.score - self.display_score
            self.display_score += max(1, diff // 10)
        
        # Update combo
        self.update_combo()
        
        # Update popup animations
        for popup in self.score_popups[:]:
            popup['y'] -= 2  # Float upward
            popup['timer'] -= 1
            
            if popup['timer'] <= 0:
                self.score_popups.remove(popup)
    
    def draw(self, screen, screen_width):
        """Draw arcade-style score display"""
        # Create fonts
        score_font = pygame.font.Font(None, self.score_font_size)
        high_font = pygame.font.Font(None, self.high_score_font_size)
        combo_font = pygame.font.Font(None, self.combo_font_size)
        
        # Main score - centered at top
        score_text = f"{self.display_score:08d}"  # 8-digit display
        score_surface = score_font.render(score_text, True, (255, 255, 255))
        score_rect = score_surface.get_rect(centerx=screen_width//2, y=10)
        
        # Draw score shadow for depth
        shadow_surface = score_font.render(score_text, True, (50, 50, 50))
        shadow_rect = score_surface.get_rect(centerx=screen_width//2 + 3, y=13)
        screen.blit(shadow_surface, shadow_rect)
        screen.blit(score_surface, score_rect)
        
        # High score below main score
        high_text = f"HIGH SCORE: {self.high_score:08d}"
        high_surface = high_font.render(high_text, True, (200, 200, 200))
        high_rect = high_surface.get_rect(centerx=screen_width//2, y=60)
        screen.blit(high_surface, high_rect)
        
        # Combo multiplier (if active)
        if self.combo_multiplier > 1:
            # Pulsing effect based on timer
            pulse = abs(math.sin(self.combo_timer * 0.1))
            combo_color = (
                255,
                int(200 + 55 * pulse),
                int(100 * pulse)
            )
            
            combo_text = f"x{self.combo_multiplier} COMBO!"
            combo_surface = combo_font.render(combo_text, True, combo_color)
            combo_rect = combo_surface.get_rect(centerx=screen_width//2, y=90)
            screen.blit(combo_surface, combo_rect)
        
        # Draw score popups
        popup_font = pygame.font.Font(None, 24)
        for popup in self.score_popups:
            # Fade out effect
            alpha = min(255, popup['timer'] * 8)
            color = (*popup['color'][:3],)  # Remove alpha from color tuple
            
            text = f"+{popup['points']}"
            if self.combo_multiplier > 1:
                text += f" x{self.combo_multiplier}"
            
            popup_surface = popup_font.render(text, True, color)
            popup_surface.set_alpha(alpha)
            screen.blit(popup_surface, (popup['x'], popup['y']))`,
    },
    optionB: {
      title: 'Modern Style Score',
      description: 'Minimalist score display in the corner with smooth animations',
      features: [
        'Compact display',
        'Smooth transitions',
        'Statistics tracking',
        'Achievement notifications',
      ],
      pythonCode: `# Modern Style Score Display
class ScoreDisplay:
    def __init__(self):
        self.score = 0
        self.display_score = 0  # For smooth animation
        self.stats = {
            'coins': 0,
            'enemies': 0,
            'time': 0,
            'deaths': 0,
            'accuracy': 100.0
        }
        self.notifications = []  # Achievement/milestone notifications
        self.position = 'top-right'  # Can be customized
        self.theme_color = (100, 200, 255)  # Customizable theme
        
        # Font sizes
        self.score_font_size = 24
        self.stats_font_size = 16
        self.notification_font_size = 20
    
    def add_score(self, points, reason=None):
        """Add score with optional reason for tracking"""
        self.score += points
        
        # Track statistics
        if reason == 'coin':
            self.stats['coins'] += 1
        elif reason == 'enemy':
            self.stats['enemies'] += 1
        
        # Check for milestones
        self.check_milestones()
    
    def check_milestones(self):
        """Check for achievement milestones"""
        milestones = [
            (1000, "Score 1,000!", (255, 200, 100)),
            (5000, "Score 5,000!", (255, 215, 0)),
            (10000, "Score 10,000!", (255, 100, 255)),
            (25000, "Score 25,000!", (100, 255, 255)),
            (50000, "Score 50,000!", (255, 50, 50)),
        ]
        
        for threshold, message, color in milestones:
            if self.score >= threshold and self.display_score < threshold:
                self.add_notification(message, color)
    
    def add_notification(self, message, color=(255, 255, 255)):
        """Add an achievement notification"""
        self.notifications.append({
            'message': message,
            'color': color,
            'timer': 180,  # 3 seconds
            'y_offset': 0
        })
    
    def update_stats(self, dt):
        """Update game statistics"""
        self.stats['time'] += dt
    
    def update(self):
        """Update animations and timers"""
        # Smooth score transition
        if self.display_score < self.score:
            diff = self.score - self.display_score
            # Faster catch-up for larger differences
            speed = max(1, diff // 20)
            self.display_score = min(self.score, self.display_score + speed)
        elif self.display_score > self.score:
            self.display_score = self.score
        
        # Update notifications
        for notif in self.notifications[:]:
            notif['timer'] -= 1
            
            # Slide in/out animation
            if notif['timer'] > 150:  # Sliding in
                notif['y_offset'] = (180 - notif['timer']) * 2
            elif notif['timer'] < 30:  # Sliding out
                notif['y_offset'] = -(30 - notif['timer']) * 2
            else:
                notif['y_offset'] = 60  # Stable position
            
            if notif['timer'] <= 0:
                self.notifications.remove(notif)
    
    def draw(self, screen, screen_width, screen_height):
        """Draw modern minimalist score display"""
        # Determine position based on setting
        if self.position == 'top-right':
            base_x = screen_width - 150
            base_y = 20
        elif self.position == 'top-left':
            base_x = 20
            base_y = 20
        elif self.position == 'bottom-right':
            base_x = screen_width - 150
            base_y = screen_height - 100
        else:  # bottom-left
            base_x = 20
            base_y = screen_height - 100
        
        # Create fonts
        score_font = pygame.font.Font(None, self.score_font_size)
        stats_font = pygame.font.Font(None, self.stats_font_size)
        
        # Background panel with transparency
        panel_rect = pygame.Rect(base_x - 10, base_y - 10, 140, 80)
        panel_surface = pygame.Surface((140, 80), pygame.SRCALPHA)
        pygame.draw.rect(panel_surface, (0, 0, 0, 180), (0, 0, 140, 80), border_radius=10)
        screen.blit(panel_surface, panel_rect)
        
        # Score with icon
        score_icon = "◆"  # Diamond icon
        score_text = f"{score_icon} {self.display_score:,}"  # Comma formatting
        score_surface = score_font.render(score_text, True, self.theme_color)
        screen.blit(score_surface, (base_x, base_y))
        
        # Stats display
        y_offset = base_y + 30
        
        # Time
        time_minutes = int(self.stats['time'] // 60)
        time_seconds = int(self.stats['time'] % 60)
        time_text = f"⏱ {time_minutes:02d}:{time_seconds:02d}"
        time_surface = stats_font.render(time_text, True, (200, 200, 200))
        screen.blit(time_surface, (base_x, y_offset))
        
        # Coins collected
        y_offset += 20
        coins_text = f"● {self.stats['coins']} coins"
        coins_surface = stats_font.render(coins_text, True, (255, 215, 0))
        screen.blit(coins_surface, (base_x, y_offset))
        
        # Draw notifications
        notif_font = pygame.font.Font(None, self.notification_font_size)
        notif_y = screen_height // 3
        
        for notif in self.notifications:
            # Create notification surface
            notif_surface = notif_font.render(notif['message'], True, notif['color'])
            notif_rect = notif_surface.get_rect(centerx=screen_width//2, 
                                                y=notif_y + notif['y_offset'])
            
            # Background for readability
            bg_rect = notif_rect.inflate(20, 10)
            bg_surface = pygame.Surface((bg_rect.width, bg_rect.height), pygame.SRCALPHA)
            
            # Fade effect
            alpha = min(255, notif['timer'] * 2)
            pygame.draw.rect(bg_surface, (0, 0, 0, min(180, alpha)), 
                           (0, 0, bg_rect.width, bg_rect.height), 
                           border_radius=5)
            
            screen.blit(bg_surface, bg_rect)
            notif_surface.set_alpha(alpha)
            screen.blit(notif_surface, notif_rect)
            
            notif_y += 40  # Stack multiple notifications`,
    },
  },

  {
    id: 'minimap',
    title: 'Minimap',
    description: 'Small map showing player position and surroundings',
    optionA: {
      title: 'Radar Style Minimap',
      description: 'Rotating minimap that follows player orientation',
      features: ['Player-centered view', 'Rotation with player', 'Range indicators', 'Enemy blips'],
      pythonCode: `# Radar Style Minimap
class Minimap:
    def __init__(self, radius=80):
        self.radius = radius
        self.range = 500  # World units visible on radar
        self.rotation = 0  # Current radar rotation
        self.blips = []  # Objects to show on radar
        self.sweep_angle = 0  # For radar sweep animation
        self.show_grid = True
        self.show_range_circles = True
        
        # Colors for different object types
        self.colors = {
            'player': (0, 255, 0),      # Green
            'enemy': (255, 0, 0),        # Red
            'ally': (0, 100, 255),       # Blue
            'objective': (255, 255, 0),  # Yellow
            'item': (255, 255, 255),     # White
            'obstacle': (100, 100, 100)  # Gray
        }
        
        # Radar surface for efficiency
        self.radar_surface = None
        self.create_radar_surface()
    
    def create_radar_surface(self):
        """Create the base radar surface"""
        size = self.radius * 2 + 20
        self.radar_surface = pygame.Surface((size, size), pygame.SRCALPHA)
    
    def add_blip(self, x, y, obj_type='enemy', size=3):
        """Add an object to track on radar"""
        self.blips.append({
            'x': x,
            'y': y,
            'type': obj_type,
            'size': size,
            'pulse': 0  # For pulsing animation
        })
    
    def update(self, player_x, player_y, player_angle=0, entities=[]):
        """Update radar with current game state"""
        # Update rotation to match player
        self.rotation = player_angle
        
        # Update sweep animation
        self.sweep_angle = (self.sweep_angle + 2) % 360
        
        # Clear and update blips from entities
        self.blips = []
        for entity in entities:
            # Calculate relative position
            dx = entity['x'] - player_x
            dy = entity['y'] - player_y
            distance = math.sqrt(dx**2 + dy**2)
            
            # Only show if within range
            if distance <= self.range:
                self.add_blip(entity['x'], entity['y'], 
                            entity.get('type', 'enemy'),
                            entity.get('size', 3))
        
        # Update blip animations
        for blip in self.blips:
            blip['pulse'] = (blip['pulse'] + 5) % 360
    
    def world_to_radar(self, world_x, world_y, player_x, player_y):
        """Convert world coordinates to radar coordinates"""
        # Get relative position
        dx = world_x - player_x
        dy = world_y - player_y
        
        # Apply rotation
        angle_rad = math.radians(-self.rotation)
        rotated_x = dx * math.cos(angle_rad) - dy * math.sin(angle_rad)
        rotated_y = dx * math.sin(angle_rad) + dy * math.cos(angle_rad)
        
        # Scale to radar size
        scale = self.radius / self.range
        radar_x = rotated_x * scale
        radar_y = rotated_y * scale
        
        return radar_x, radar_y
    
    def draw(self, screen, x, y, player_x, player_y):
        """Draw rotating radar minimap"""
        center_x = x + self.radius
        center_y = y + self.radius
        
        # Clear radar surface
        self.radar_surface.fill((0, 0, 0, 0))
        
        # Draw radar background circle
        pygame.draw.circle(self.radar_surface, (0, 50, 0), 
                         (self.radius + 10, self.radius + 10), 
                         self.radius, 0)
        pygame.draw.circle(self.radar_surface, (0, 100, 0), 
                         (self.radius + 10, self.radius + 10), 
                         self.radius, 2)
        
        # Draw range circles
        if self.show_range_circles:
            for i in range(1, 4):
                circle_radius = self.radius * i // 3
                pygame.draw.circle(self.radar_surface, (0, 60, 0),
                                 (self.radius + 10, self.radius + 10),
                                 circle_radius, 1)
        
        # Draw grid lines
        if self.show_grid:
            # Vertical line
            pygame.draw.line(self.radar_surface, (0, 60, 0),
                           (self.radius + 10, 10),
                           (self.radius + 10, self.radius * 2 + 10), 1)
            # Horizontal line
            pygame.draw.line(self.radar_surface, (0, 60, 0),
                           (10, self.radius + 10),
                           (self.radius * 2 + 10, self.radius + 10), 1)
        
        # Draw radar sweep effect
        sweep_end_x = self.radius + 10 + int(self.radius * math.cos(math.radians(self.sweep_angle)))
        sweep_end_y = self.radius + 10 + int(self.radius * math.sin(math.radians(self.sweep_angle)))
        
        # Draw fading sweep lines
        for i in range(5):
            angle = self.sweep_angle - i * 10
            alpha = 100 - i * 20
            end_x = self.radius + 10 + int(self.radius * math.cos(math.radians(angle)))
            end_y = self.radius + 10 + int(self.radius * math.sin(math.radians(angle)))
            color = (0, 255, 0, alpha)
            
            # Draw line with decreasing opacity
            pygame.draw.line(self.radar_surface, (0, 150, 0),
                           (self.radius + 10, self.radius + 10),
                           (end_x, end_y), 1)
        
        # Draw blips
        for blip in self.blips:
            radar_x, radar_y = self.world_to_radar(blip['x'], blip['y'], 
                                                  player_x, player_y)
            
            # Check if within radar bounds
            if abs(radar_x) <= self.radius and abs(radar_y) <= self.radius:
                blip_x = int(self.radius + 10 + radar_x)
                blip_y = int(self.radius + 10 + radar_y)
                
                color = self.colors.get(blip['type'], (255, 255, 255))
                
                # Pulsing effect for important objects
                if blip['type'] in ['objective', 'item']:
                    pulse_size = blip['size'] + math.sin(math.radians(blip['pulse'])) * 2
                    pygame.draw.circle(self.radar_surface, color,
                                     (blip_x, blip_y), int(pulse_size))
                else:
                    # Draw blip with outline
                    pygame.draw.circle(self.radar_surface, color,
                                     (blip_x, blip_y), blip['size'])
                    pygame.draw.circle(self.radar_surface, (255, 255, 255),
                                     (blip_x, blip_y), blip['size'], 1)
        
        # Draw player indicator (always at center)
        pygame.draw.circle(self.radar_surface, self.colors['player'],
                         (self.radius + 10, self.radius + 10), 4)
        
        # Draw direction indicator
        dir_length = 15
        dir_end_x = self.radius + 10
        dir_end_y = self.radius + 10 - dir_length
        pygame.draw.line(self.radar_surface, self.colors['player'],
                       (self.radius + 10, self.radius + 10),
                       (dir_end_x, dir_end_y), 2)
        
        # Draw compass directions
        font = pygame.font.Font(None, 16)
        directions = [
            ('N', 0, -self.radius - 5),
            ('E', self.radius + 5, 0),
            ('S', 0, self.radius + 5),
            ('W', -self.radius - 5, 0)
        ]
        
        for label, dx, dy in directions:
            # Rotate compass based on player rotation
            angle_rad = math.radians(-self.rotation)
            rot_x = dx * math.cos(angle_rad) - dy * math.sin(angle_rad)
            rot_y = dx * math.sin(angle_rad) + dy * math.cos(angle_rad)
            
            text = font.render(label, True, (100, 255, 100))
            text_rect = text.get_rect(center=(self.radius + 10 + rot_x,
                                             self.radius + 10 + rot_y))
            self.radar_surface.blit(text, text_rect)
        
        # Blit radar to screen
        screen.blit(self.radar_surface, (x - 10, y - 10))`,
    },
    optionB: {
      title: 'Overview Map',
      description: 'Fixed minimap showing the entire level layout',
      features: ['Full level view', 'Fog of war', 'Discovered areas', 'Waypoint markers'],
      pythonCode: `# Overview Map Minimap
class Minimap:
    def __init__(self, map_width, map_height, display_size=150):
        self.map_width = map_width
        self.map_height = map_height
        self.display_size = display_size
        
        # Calculate scale to fit map in display
        scale_x = display_size / map_width
        scale_y = display_size / map_height
        self.scale = min(scale_x, scale_y)
        
        # Actual minimap dimensions
        self.minimap_width = int(map_width * self.scale)
        self.minimap_height = int(map_height * self.scale)
        
        # Map data
        self.tiles = []  # Level layout
        self.discovered = []  # Fog of war
        self.markers = []  # Waypoints and objectives
        
        # Display options
        self.show_fog = True
        self.show_grid = False
        self.opacity = 200
        
        # Colors for different tile types
        self.tile_colors = {
            'wall': (50, 50, 50),
            'floor': (150, 150, 150),
            'door': (139, 69, 19),
            'water': (50, 100, 200),
            'lava': (200, 50, 0),
            'grass': (50, 150, 50),
            'path': (180, 150, 100),
            'secret': (100, 0, 100)
        }
        
        # Icon colors
        self.icon_colors = {
            'player': (0, 255, 0),
            'enemy': (255, 0, 0),
            'npc': (100, 100, 255),
            'chest': (255, 215, 0),
            'save': (255, 255, 255),
            'boss': (255, 0, 255),
            'objective': (255, 255, 0),
            'waypoint': (0, 255, 255)
        }
        
        self.create_minimap_surface()
    
    def create_minimap_surface(self):
        """Create minimap surface"""
        self.minimap_surface = pygame.Surface(
            (self.minimap_width, self.minimap_height), 
            pygame.SRCALPHA
        )
    
    def load_map(self, tile_data):
        """Load map layout from tile data"""
        self.tiles = tile_data
        # Initialize fog of war (all undiscovered)
        self.discovered = [[False for _ in row] for row in tile_data]
    
    def discover_area(self, x, y, radius=5):
        """Reveal area around position"""
        tile_x = int(x / (self.map_width / len(self.tiles[0])))
        tile_y = int(y / (self.map_height / len(self.tiles)))
        
        for dy in range(-radius, radius + 1):
            for dx in range(-radius, radius + 1):
                ny = tile_y + dy
                nx = tile_x + dx
                
                if (0 <= ny < len(self.tiles) and 
                    0 <= nx < len(self.tiles[0])):
                    # Circular discovery
                    if dx*dx + dy*dy <= radius*radius:
                        self.discovered[ny][nx] = True
    
    def add_marker(self, x, y, marker_type='waypoint', label=''):
        """Add a waypoint or objective marker"""
        self.markers.append({
            'x': x,
            'y': y,
            'type': marker_type,
            'label': label,
            'pulse': 0  # For animation
        })
    
    def remove_marker(self, x, y):
        """Remove marker at position"""
        self.markers = [m for m in self.markers 
                       if not (abs(m['x'] - x) < 10 and abs(m['y'] - y) < 10)]
    
    def update(self, player_x, player_y, entities=[]):
        """Update minimap with current game state"""
        # Discover area around player
        self.discover_area(player_x, player_y)
        
        # Update marker animations
        for marker in self.markers:
            marker['pulse'] = (marker['pulse'] + 3) % 360
    
    def draw(self, screen, x, y, player_x, player_y, entities=[]):
        """Draw overview minimap"""
        # Clear minimap surface
        self.minimap_surface.fill((20, 20, 30, self.opacity))
        
        # Draw border
        border_rect = pygame.Rect(0, 0, self.minimap_width, self.minimap_height)
        pygame.draw.rect(self.minimap_surface, (100, 100, 100), border_rect, 2)
        
        # Draw tiles
        if self.tiles:
            tile_width = self.minimap_width / len(self.tiles[0])
            tile_height = self.minimap_height / len(self.tiles)
            
            for row_idx, row in enumerate(self.tiles):
                for col_idx, tile in enumerate(row):
                    if self.show_fog and not self.discovered[row_idx][col_idx]:
                        # Undiscovered area - darker
                        color = (20, 20, 20)
                    else:
                        # Get tile color
                        color = self.tile_colors.get(tile, (100, 100, 100))
                    
                    tile_rect = pygame.Rect(
                        col_idx * tile_width,
                        row_idx * tile_height,
                        tile_width + 1,
                        tile_height + 1
                    )
                    pygame.draw.rect(self.minimap_surface, color, tile_rect)
        
        # Draw grid overlay if enabled
        if self.show_grid:
            grid_color = (60, 60, 60, 100)
            # Vertical lines
            for i in range(0, self.minimap_width, 10):
                pygame.draw.line(self.minimap_surface, grid_color,
                               (i, 0), (i, self.minimap_height), 1)
            # Horizontal lines
            for i in range(0, self.minimap_height, 10):
                pygame.draw.line(self.minimap_surface, grid_color,
                               (0, i), (self.minimap_width, i), 1)
        
        # Draw markers
        for marker in self.markers:
            marker_x = int(marker['x'] * self.scale)
            marker_y = int(marker['y'] * self.scale)
            
            color = self.icon_colors.get(marker['type'], (255, 255, 255))
            
            # Pulsing effect
            pulse_size = 3 + math.sin(math.radians(marker['pulse'])) * 2
            
            # Draw marker icon
            if marker['type'] == 'waypoint':
                # Draw X shape
                pygame.draw.line(self.minimap_surface, color,
                               (marker_x - 3, marker_y - 3),
                               (marker_x + 3, marker_y + 3), 2)
                pygame.draw.line(self.minimap_surface, color,
                               (marker_x + 3, marker_y - 3),
                               (marker_x - 3, marker_y + 3), 2)
            else:
                # Draw pulsing circle
                pygame.draw.circle(self.minimap_surface, color,
                                 (marker_x, marker_y), int(pulse_size))
            
            # Draw label if present
            if marker['label']:
                font = pygame.font.Font(None, 12)
                label_surface = font.render(marker['label'], True, color)
                label_rect = label_surface.get_rect(center=(marker_x, marker_y - 10))
                self.minimap_surface.blit(label_surface, label_rect)
        
        # Draw entities
        for entity in entities:
            if entity.get('on_minimap', True):
                entity_x = int(entity['x'] * self.scale)
                entity_y = int(entity['y'] * self.scale)
                
                # Check if in discovered area
                tile_x = int(entity['x'] / (self.map_width / len(self.tiles[0])))
                tile_y = int(entity['y'] / (self.map_height / len(self.tiles)))
                
                if (0 <= tile_y < len(self.discovered) and 
                    0 <= tile_x < len(self.discovered[0]) and
                    self.discovered[tile_y][tile_x]):
                    
                    entity_type = entity.get('type', 'enemy')
                    color = self.icon_colors.get(entity_type, (200, 200, 200))
                    size = entity.get('minimap_size', 2)
                    
                    pygame.draw.circle(self.minimap_surface, color,
                                     (entity_x, entity_y), size)
        
        # Draw player position (always visible)
        player_minimap_x = int(player_x * self.scale)
        player_minimap_y = int(player_y * self.scale)
        
        # Player icon with direction arrow
        pygame.draw.circle(self.minimap_surface, self.icon_colors['player'],
                         (player_minimap_x, player_minimap_y), 3)
        # White outline for visibility
        pygame.draw.circle(self.minimap_surface, (255, 255, 255),
                         (player_minimap_x, player_minimap_y), 3, 1)
        
        # Draw legend
        font = pygame.font.Font(None, 14)
        legend_y = self.minimap_height + 5
        legend_items = [
            ('Player', self.icon_colors['player']),
            ('Enemy', self.icon_colors['enemy']),
            ('Objective', self.icon_colors['objective'])
        ]
        
        for i, (label, color) in enumerate(legend_items):
            # Icon
            icon_x = 10 + i * 50
            pygame.draw.circle(self.minimap_surface, color,
                             (icon_x, legend_y), 3)
            # Label
            text = font.render(label, True, (200, 200, 200))
            self.minimap_surface.blit(text, (icon_x + 8, legend_y - 5))
        
        # Blit minimap to screen with border
        screen.blit(self.minimap_surface, (x, y))`,
    },
  },

  {
    id: 'dialogsystem',
    title: 'Dialog System',
    description: 'How conversations and text are displayed',
    optionA: {
      title: 'Speech Bubbles',
      description: 'Text appears in bubbles above characters',
      features: [
        'Character-attached bubbles',
        'Emotion indicators',
        'Multiple speakers',
        'Auto-positioning',
      ],
      pythonCode: `# Speech Bubble Dialog System
class DialogSystem:
    def __init__(self):
        self.active_bubbles = []
        self.queue = []  # Dialog queue
        self.bubble_lifetime = 180  # 3 seconds default
        self.max_bubbles = 3  # Max simultaneous bubbles
        
        # Bubble styling
        self.bubble_padding = 10
        self.bubble_max_width = 200
        self.font_size = 16
        self.tail_size = 10
        
        # Emotion colors and symbols
        self.emotions = {
            'normal': {'color': (255, 255, 255), 'symbol': ''},
            'happy': {'color': (255, 255, 100), 'symbol': '😊'},
            'angry': {'color': (255, 100, 100), 'symbol': '😠'},
            'sad': {'color': (150, 150, 255), 'symbol': '😢'},
            'surprised': {'color': (255, 200, 100), 'symbol': '😲'},
            'thinking': {'color': (200, 200, 200), 'symbol': '🤔'},
            'love': {'color': (255, 150, 200), 'symbol': '❤️'}
        }
    
    def add_dialog(self, text, character_x, character_y, 
                   speaker_name='', emotion='normal', duration=None):
        """Add a speech bubble to display"""
        bubble = {
            'text': text,
            'x': character_x,
            'y': character_y,
            'speaker': speaker_name,
            'emotion': emotion,
            'timer': duration or self.bubble_lifetime,
            'fade_timer': 30,  # Fade in/out duration
            'offset_y': 0,  # For floating animation
            'width': 0,  # Calculated on first draw
            'height': 0,  # Calculated on first draw
            'lines': []  # Text wrapped into lines
        }
        
        # Process text wrapping
        bubble['lines'] = self.wrap_text(text, self.bubble_max_width)
        
        # Calculate bubble dimensions
        font = pygame.font.Font(None, self.font_size)
        bubble['height'] = len(bubble['lines']) * 20 + self.bubble_padding * 2
        max_width = 0
        for line in bubble['lines']:
            line_width = font.size(line)[0]
            max_width = max(max_width, line_width)
        bubble['width'] = max_width + self.bubble_padding * 2
        
        # Add to queue or active bubbles
        if len(self.active_bubbles) < self.max_bubbles:
            self.active_bubbles.append(bubble)
        else:
            self.queue.append(bubble)
    
    def wrap_text(self, text, max_width):
        """Wrap text to fit within max width"""
        font = pygame.font.Font(None, self.font_size)
        words = text.split(' ')
        lines = []
        current_line = []
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            if font.size(test_line)[0] <= max_width - self.bubble_padding * 2:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
                else:
                    # Word is too long, force break
                    lines.append(word)
        
        if current_line:
            lines.append(' '.join(current_line))
        
        return lines
    
    def update(self):
        """Update all active bubbles"""
        # Update active bubbles
        for bubble in self.active_bubbles[:]:
            bubble['timer'] -= 1
            
            # Floating animation
            bubble['offset_y'] = math.sin(bubble['timer'] * 0.05) * 3
            
            # Remove expired bubbles
            if bubble['timer'] <= 0:
                self.active_bubbles.remove(bubble)
                
                # Check queue for next bubble
                if self.queue:
                    self.active_bubbles.append(self.queue.pop(0))
    
    def clear_all(self):
        """Clear all bubbles and queue"""
        self.active_bubbles = []
        self.queue = []
    
    def draw(self, screen, camera_x=0, camera_y=0):
        """Draw all speech bubbles"""
        font = pygame.font.Font(None, self.font_size)
        name_font = pygame.font.Font(None, 14)
        
        for i, bubble in enumerate(self.active_bubbles):
            # Calculate screen position
            screen_x = bubble['x'] - camera_x
            screen_y = bubble['y'] - camera_y - 50 - (i * 60) + bubble['offset_y']
            
            # Calculate opacity for fade in/out
            if bubble['timer'] > bubble['fade_timer']:
                alpha = 255
            elif bubble['timer'] > 0:
                alpha = int(255 * (bubble['timer'] / bubble['fade_timer']))
            else:
                alpha = 0
            
            # Get emotion style
            emotion_data = self.emotions.get(bubble['emotion'], self.emotions['normal'])
            
            # Create bubble surface
            bubble_surface = pygame.Surface((bubble['width'], bubble['height']), 
                                          pygame.SRCALPHA)
            
            # Draw bubble background
            bubble_rect = pygame.Rect(0, 0, bubble['width'], bubble['height'])
            pygame.draw.rect(bubble_surface, (*emotion_data['color'], alpha * 0.9), 
                           bubble_rect, border_radius=10)
            pygame.draw.rect(bubble_surface, (0, 0, 0, alpha * 0.8), 
                           bubble_rect, 2, border_radius=10)
            
            # Draw tail pointing to character
            tail_points = [
                (bubble['width'] // 2 - self.tail_size, bubble['height']),
                (bubble['width'] // 2, bubble['height'] + self.tail_size),
                (bubble['width'] // 2 + self.tail_size, bubble['height'])
            ]
            
            # Create tail surface
            tail_surface = pygame.Surface((bubble['width'], bubble['height'] + self.tail_size),
                                        pygame.SRCALPHA)
            pygame.draw.polygon(tail_surface, (*emotion_data['color'], alpha * 0.9),
                              tail_points)
            pygame.draw.lines(tail_surface, (0, 0, 0, alpha * 0.8), False,
                            [(tail_points[0]), (tail_points[1]), (tail_points[2])], 2)
            
            # Draw speaker name if provided
            text_y = self.bubble_padding
            if bubble['speaker']:
                name_text = name_font.render(bubble['speaker'] + ':', True, 
                                            (0, 0, 0, alpha))
                bubble_surface.blit(name_text, (self.bubble_padding, text_y))
                text_y += 18
            
            # Draw text lines
            for line in bubble['lines']:
                text_surface = font.render(line, True, (0, 0, 0, alpha))
                bubble_surface.blit(text_surface, (self.bubble_padding, text_y))
                text_y += 20
            
            # Draw emotion symbol
            if emotion_data['symbol']:
                emotion_text = font.render(emotion_data['symbol'], True, 
                                         (255, 255, 255, alpha))
                bubble_surface.blit(emotion_text, 
                                  (bubble['width'] - 25, self.bubble_padding))
            
            # Blit bubble and tail to screen
            screen.blit(tail_surface, (screen_x - bubble['width'] // 2, screen_y))
            screen.blit(bubble_surface, (screen_x - bubble['width'] // 2, screen_y))
    
    def is_active(self):
        """Check if any dialog is active"""
        return len(self.active_bubbles) > 0 or len(self.queue) > 0`,
    },
    optionB: {
      title: 'Dialog Box',
      description: 'Traditional RPG-style text box at bottom of screen',
      features: [
        'Typewriter effect',
        'Character portraits',
        'Choice selection',
        'Auto-advance options',
      ],
      pythonCode: `# Dialog Box System
class DialogSystem:
    def __init__(self, screen_width, screen_height):
        self.screen_width = screen_width
        self.screen_height = screen_height
        
        # Dialog box dimensions
        self.box_height = 150
        self.box_margin = 20
        self.box_padding = 15
        self.portrait_size = 100
        
        # Current dialog state
        self.current_dialog = None
        self.dialog_queue = []
        self.current_text = ''
        self.displayed_text = ''
        self.char_index = 0
        self.typewriter_speed = 2  # Characters per frame
        self.typewriter_timer = 0
        
        # Choice system
        self.showing_choices = False
        self.choices = []
        self.selected_choice = 0
        
        # Portrait animations
        self.portrait_bounce = 0
        self.portrait_talking = False
        
        # Settings
        self.auto_advance = False
        self.auto_advance_timer = 0
        self.auto_advance_delay = 180  # 3 seconds
        
        # Font sizes
        self.name_font_size = 20
        self.text_font_size = 18
        self.choice_font_size = 16
    
    def add_dialog(self, text, speaker_name='', portrait=None, 
                   choices=None, callback=None):
        """Add dialog to the queue"""
        dialog = {
            'text': text,
            'speaker': speaker_name,
            'portrait': portrait,  # Image path or surface
            'choices': choices,  # List of choice strings
            'callback': callback,  # Function to call with choice
            'emotion': 'normal'  # Can be changed for different portraits
        }
        
        self.dialog_queue.append(dialog)
        
        # Start if not already showing dialog
        if not self.current_dialog:
            self.next_dialog()
    
    def next_dialog(self):
        """Move to next dialog in queue"""
        if self.dialog_queue:
            self.current_dialog = self.dialog_queue.pop(0)
            self.current_text = self.current_dialog['text']
            self.displayed_text = ''
            self.char_index = 0
            self.typewriter_timer = 0
            self.portrait_talking = True
            
            # Setup choices if present
            if self.current_dialog['choices']:
                self.choices = self.current_dialog['choices']
                self.selected_choice = 0
                self.showing_choices = False
        else:
            self.current_dialog = None
            self.portrait_talking = False
    
    def skip_typewriter(self):
        """Skip to show full text immediately"""
        if self.current_dialog:
            self.displayed_text = self.current_text
            self.char_index = len(self.current_text)
            self.portrait_talking = False
            
            # Show choices if dialog is complete
            if self.current_dialog['choices']:
                self.showing_choices = True
    
    def make_choice(self, choice_index):
        """Handle choice selection"""
        if self.current_dialog and self.current_dialog['callback']:
            self.current_dialog['callback'](choice_index, self.choices[choice_index])
        
        self.showing_choices = False
        self.next_dialog()
    
    def update(self):
        """Update dialog animations and typewriter"""
        if not self.current_dialog:
            return
        
        # Update typewriter effect
        if self.char_index < len(self.current_text):
            self.typewriter_timer += self.typewriter_speed
            
            while self.typewriter_timer >= 1 and self.char_index < len(self.current_text):
                self.displayed_text += self.current_text[self.char_index]
                self.char_index += 1
                self.typewriter_timer -= 1
            
            # Check if finished typing
            if self.char_index >= len(self.current_text):
                self.portrait_talking = False
                
                if self.current_dialog['choices']:
                    self.showing_choices = True
                elif self.auto_advance:
                    self.auto_advance_timer = self.auto_advance_delay
        
        # Auto-advance timer
        if self.auto_advance and self.auto_advance_timer > 0:
            self.auto_advance_timer -= 1
            if self.auto_advance_timer <= 0:
                self.next_dialog()
        
        # Portrait animation
        if self.portrait_talking:
            self.portrait_bounce = math.sin(pygame.time.get_ticks() * 0.01) * 3
        else:
            self.portrait_bounce *= 0.9  # Smooth stop
    
    def handle_input(self, event):
        """Handle player input for dialog"""
        if not self.current_dialog:
            return False
        
        if event.type == pygame.KEYDOWN:
            if self.showing_choices:
                # Navigate choices
                if event.key == pygame.K_UP:
                    self.selected_choice = (self.selected_choice - 1) % len(self.choices)
                    return True
                elif event.key == pygame.K_DOWN:
                    self.selected_choice = (self.selected_choice + 1) % len(self.choices)
                    return True
                elif event.key in [pygame.K_RETURN, pygame.K_SPACE]:
                    self.make_choice(self.selected_choice)
                    return True
            else:
                # Advance dialog
                if event.key in [pygame.K_RETURN, pygame.K_SPACE]:
                    if self.char_index < len(self.current_text):
                        self.skip_typewriter()
                    else:
                        self.next_dialog()
                    return True
        
        return False
    
    def draw(self, screen):
        """Draw dialog box and content"""
        if not self.current_dialog:
            return
        
        # Calculate box position
        box_y = self.screen_height - self.box_height - self.box_margin
        box_rect = pygame.Rect(self.box_margin, box_y,
                              self.screen_width - self.box_margin * 2, 
                              self.box_height)
        
        # Draw box background with transparency
        box_surface = pygame.Surface((box_rect.width, box_rect.height), 
                                    pygame.SRCALPHA)
        pygame.draw.rect(box_surface, (0, 0, 50, 230), 
                       (0, 0, box_rect.width, box_rect.height),
                       border_radius=10)
        pygame.draw.rect(box_surface, (100, 150, 255, 200),
                       (0, 0, box_rect.width, box_rect.height), 
                       3, border_radius=10)
        screen.blit(box_surface, box_rect)
        
        # Draw portrait if available
        portrait_x = box_rect.x + self.box_padding
        text_x = portrait_x
        
        if self.current_dialog['portrait']:
            # Portrait background
            portrait_rect = pygame.Rect(portrait_x, 
                                       box_rect.y + self.box_padding,
                                       self.portrait_size, self.portrait_size)
            pygame.draw.rect(screen, (50, 50, 100), portrait_rect, 
                           border_radius=5)
            pygame.draw.rect(screen, (150, 150, 200), portrait_rect, 
                           2, border_radius=5)
            
            # Draw portrait (placeholder - would load actual image)
            # In real implementation, load portrait image
            portrait_color = (100, 200, 100)
            portrait_center = (portrait_rect.centerx,
                             portrait_rect.centery + self.portrait_bounce)
            pygame.draw.circle(screen, portrait_color, portrait_center, 30)
            
            # Adjust text position
            text_x = portrait_x + self.portrait_size + self.box_padding
        
        # Draw speaker name
        if self.current_dialog['speaker']:
            name_font = pygame.font.Font(None, self.name_font_size)
            name_surface = name_font.render(self.current_dialog['speaker'], 
                                          True, (255, 255, 100))
            screen.blit(name_surface, (text_x, box_rect.y + self.box_padding))
        
        # Draw dialog text
        text_font = pygame.font.Font(None, self.text_font_size)
        text_y = box_rect.y + self.box_padding + 30
        
        # Word wrap displayed text
        words = self.displayed_text.split(' ')
        lines = []
        current_line = []
        max_width = box_rect.width - text_x + box_rect.x - self.box_padding * 2
        
        for word in words:
            test_line = ' '.join(current_line + [word])
            if text_font.size(test_line)[0] <= max_width:
                current_line.append(word)
            else:
                if current_line:
                    lines.append(' '.join(current_line))
                    current_line = [word]
        if current_line:
            lines.append(' '.join(current_line))
        
        # Draw text lines
        for line in lines[:3]:  # Max 3 lines
            text_surface = text_font.render(line, True, (255, 255, 255))
            screen.blit(text_surface, (text_x, text_y))
            text_y += 25
        
        # Draw choices if showing
        if self.showing_choices:
            choice_font = pygame.font.Font(None, self.choice_font_size)
            choice_y = box_rect.y + self.box_padding + 60
            
            for i, choice in enumerate(self.choices):
                # Highlight selected choice
                if i == self.selected_choice:
                    choice_color = (255, 255, 100)
                    # Draw selection arrow
                    arrow_x = text_x - 20
                    arrow_y = choice_y + 3
                    pygame.draw.polygon(screen, choice_color,
                                      [(arrow_x, arrow_y),
                                       (arrow_x + 10, arrow_y + 5),
                                       (arrow_x, arrow_y + 10)])
                else:
                    choice_color = (200, 200, 200)
                
                choice_surface = choice_font.render(f"{i+1}. {choice}", 
                                                  True, choice_color)
                screen.blit(choice_surface, (text_x, choice_y))
                choice_y += 25
        
        # Draw continue indicator
        if not self.showing_choices and self.char_index >= len(self.current_text):
            indicator_x = box_rect.right - 30
            indicator_y = box_rect.bottom - 30
            
            # Blinking arrow
            if (pygame.time.get_ticks() // 500) % 2:
                pygame.draw.polygon(screen, (255, 255, 255),
                                  [(indicator_x, indicator_y),
                                   (indicator_x + 10, indicator_y + 5),
                                   (indicator_x, indicator_y + 10)])`,
    },
  },

  {
    id: 'questtracker',
    title: 'Quest/Objective Tracker',
    description: 'How missions and objectives are displayed',
    optionA: {
      title: 'Checklist Style',
      description: 'Task list with checkboxes that mark completion',
      features: ['Checkbox indicators', 'Task categories', 'Subtask support', 'Priority marking'],
      pythonCode: `# Checklist Style Quest Tracker
class QuestTracker:
    def __init__(self):
        self.quests = []
        self.completed_quests = []
        self.active_quest = None
        
        # Display settings
        self.position = 'top-left'
        self.max_visible = 5
        self.show_completed = True
        self.animation_timer = 0
        
        # Visual settings
        self.checkbox_size = 16
        self.indent_size = 20
        self.line_height = 25
        
        # Categories and priorities
        self.categories = {
            'main': {'color': (255, 215, 0), 'icon': '★', 'priority': 1},
            'side': {'color': (150, 200, 255), 'icon': '◆', 'priority': 2},
            'daily': {'color': (150, 255, 150), 'icon': '↻', 'priority': 3},
            'hidden': {'color': (200, 150, 255), 'icon': '?', 'priority': 4}
        }
    
    def add_quest(self, quest_id, title, description='', 
                  category='main', tasks=None):
        """Add a new quest"""
        quest = {
            'id': quest_id,
            'title': title,
            'description': description,
            'category': category,
            'tasks': tasks or [],
            'completed': False,
            'progress': 0,
            'revealed_tasks': 1,  # Progressive task reveal
            'start_time': pygame.time.get_ticks(),
            'completion_animation': 0
        }
        
        # Process tasks
        for task in quest['tasks']:
            task['completed'] = False
            task['subtasks'] = task.get('subtasks', [])
            for subtask in task['subtasks']:
                subtask['completed'] = False
        
        self.quests.append(quest)
        
        # Set as active if no active quest
        if not self.active_quest:
            self.active_quest = quest
    
    def complete_task(self, quest_id, task_index, subtask_index=None):
        """Mark a task or subtask as completed"""
        quest = self.get_quest(quest_id)
        if not quest:
            return False
        
        if subtask_index is not None:
            # Complete subtask
            task = quest['tasks'][task_index]
            if subtask_index < len(task['subtasks']):
                task['subtasks'][subtask_index]['completed'] = True
                
                # Check if all subtasks completed
                if all(st['completed'] for st in task['subtasks']):
                    task['completed'] = True
        else:
            # Complete task
            if task_index < len(quest['tasks']):
                quest['tasks'][task_index]['completed'] = True
                
                # Reveal next task if using progressive reveal
                if quest['revealed_tasks'] < len(quest['tasks']):
                    quest['revealed_tasks'] += 1
        
        # Update quest progress
        self.update_quest_progress(quest)
        
        # Check if quest is complete
        if all(task['completed'] for task in quest['tasks']):
            self.complete_quest(quest_id)
        
        return True
    
    def complete_quest(self, quest_id):
        """Mark entire quest as completed"""
        quest = self.get_quest(quest_id)
        if quest:
            quest['completed'] = True
            quest['completion_animation'] = 60  # 1 second animation
            quest['completion_time'] = pygame.time.get_ticks()
            
            # Move to completed list after animation
            self.completed_quests.append(quest)
            self.quests.remove(quest)
            
            # Select new active quest
            if self.active_quest == quest:
                self.active_quest = self.quests[0] if self.quests else None
    
    def get_quest(self, quest_id):
        """Get quest by ID"""
        for quest in self.quests + self.completed_quests:
            if quest['id'] == quest_id:
                return quest
        return None
    
    def update_quest_progress(self, quest):
        """Calculate quest completion percentage"""
        if not quest['tasks']:
            quest['progress'] = 100 if quest['completed'] else 0
        else:
            total_tasks = len(quest['tasks'])
            completed_tasks = sum(1 for task in quest['tasks'] if task['completed'])
            quest['progress'] = int((completed_tasks / total_tasks) * 100)
    
    def update(self):
        """Update animations"""
        self.animation_timer = (self.animation_timer + 1) % 360
        
        # Update completion animations
        for quest in self.quests + self.completed_quests:
            if quest.get('completion_animation', 0) > 0:
                quest['completion_animation'] -= 1
    
    def draw(self, screen, x, y):
        """Draw checklist-style quest tracker"""
        # Create fonts
        title_font = pygame.font.Font(None, 20)
        task_font = pygame.font.Font(None, 16)
        
        # Background panel
        visible_quests = self.quests[:self.max_visible]
        if not visible_quests:
            return
        
        # Calculate panel height
        panel_height = 30  # Header
        for quest in visible_quests:
            panel_height += 30  # Quest title
            visible_tasks = min(quest['revealed_tasks'], len(quest['tasks']))
            panel_height += visible_tasks * self.line_height
            # Add space for subtasks
            for i in range(visible_tasks):
                if quest['tasks'][i].get('subtasks'):
                    panel_height += len(quest['tasks'][i]['subtasks']) * 20
        
        # Draw semi-transparent background
        panel_surface = pygame.Surface((250, panel_height), pygame.SRCALPHA)
        pygame.draw.rect(panel_surface, (0, 0, 0, 180), 
                       (0, 0, 250, panel_height), border_radius=5)
        pygame.draw.rect(panel_surface, (100, 100, 100, 200),
                       (0, 0, 250, panel_height), 2, border_radius=5)
        screen.blit(panel_surface, (x, y))
        
        # Draw header
        header_text = title_font.render("OBJECTIVES", True, (255, 255, 255))
        screen.blit(header_text, (x + 10, y + 5))
        
        current_y = y + 30
        
        # Draw quests
        for quest in visible_quests:
            category_data = self.categories.get(quest['category'], 
                                               self.categories['main'])
            
            # Quest title with category icon
            title_color = category_data['color']
            if quest['completed']:
                title_color = (100, 100, 100)  # Grayed out
            
            # Category icon
            icon_text = title_font.render(category_data['icon'], True, title_color)
            screen.blit(icon_text, (x + 10, current_y))
            
            # Quest title
            quest_title = quest['title']
            if len(quest_title) > 25:
                quest_title = quest_title[:22] + "..."
            
            title_surface = title_font.render(quest_title, True, title_color)
            screen.blit(title_surface, (x + 30, current_y))
            
            # Progress percentage
            if quest['tasks']:
                progress_text = f"{quest['progress']}%"
                progress_surface = task_font.render(progress_text, True, 
                                                   (150, 150, 150))
                screen.blit(progress_surface, (x + 210, current_y + 2))
            
            current_y += 25
            
            # Draw tasks
            visible_tasks = min(quest['revealed_tasks'], len(quest['tasks']))
            for i in range(visible_tasks):
                task = quest['tasks'][i]
                
                # Draw checkbox
                checkbox_x = x + 20
                checkbox_y = current_y + 2
                checkbox_rect = pygame.Rect(checkbox_x, checkbox_y, 
                                           self.checkbox_size, self.checkbox_size)
                
                if task['completed']:
                    # Filled checkbox
                    pygame.draw.rect(screen, (100, 255, 100), checkbox_rect)
                    pygame.draw.rect(screen, (255, 255, 255), checkbox_rect, 2)
                    # Checkmark
                    pygame.draw.lines(screen, (255, 255, 255), False,
                                    [(checkbox_x + 3, checkbox_y + 8),
                                     (checkbox_x + 7, checkbox_y + 12),
                                     (checkbox_x + 13, checkbox_y + 4)], 2)
                else:
                    # Empty checkbox
                    pygame.draw.rect(screen, (50, 50, 50), checkbox_rect)
                    pygame.draw.rect(screen, (200, 200, 200), checkbox_rect, 2)
                
                # Task text
                task_color = (150, 150, 150) if task['completed'] else (255, 255, 255)
                task_text = task.get('text', f"Task {i+1}")
                if len(task_text) > 28:
                    task_text = task_text[:25] + "..."
                
                task_surface = task_font.render(task_text, True, task_color)
                if task['completed']:
                    # Strikethrough effect
                    pygame.draw.line(screen, task_color,
                                   (x + 40, current_y + 10),
                                   (x + 40 + task_surface.get_width(), current_y + 10), 1)
                
                screen.blit(task_surface, (x + 40, current_y))
                current_y += self.line_height
                
                # Draw subtasks if present
                for subtask in task.get('subtasks', []):
                    # Smaller checkbox for subtasks
                    sub_checkbox_x = x + 40
                    sub_checkbox_y = current_y + 2
                    sub_checkbox_size = 12
                    sub_checkbox_rect = pygame.Rect(sub_checkbox_x, sub_checkbox_y,
                                                   sub_checkbox_size, sub_checkbox_size)
                    
                    if subtask['completed']:
                        pygame.draw.rect(screen, (80, 200, 80), sub_checkbox_rect)
                        pygame.draw.rect(screen, (200, 200, 200), sub_checkbox_rect, 1)
                    else:
                        pygame.draw.rect(screen, (40, 40, 40), sub_checkbox_rect)
                        pygame.draw.rect(screen, (150, 150, 150), sub_checkbox_rect, 1)
                    
                    # Subtask text
                    subtask_color = (120, 120, 120) if subtask['completed'] else (200, 200, 200)
                    subtask_text = subtask.get('text', 'Subtask')
                    if len(subtask_text) > 25:
                        subtask_text = subtask_text[:22] + "..."
                    
                    subtask_surface = task_font.render("  • " + subtask_text, 
                                                      True, subtask_color)
                    screen.blit(subtask_surface, (x + 55, current_y))
                    current_y += 20
            
            current_y += 5  # Space between quests
        
        # Show count if more quests exist
        if len(self.quests) > self.max_visible:
            more_text = f"... and {len(self.quests) - self.max_visible} more"
            more_surface = task_font.render(more_text, True, (150, 150, 150))
            screen.blit(more_surface, (x + 10, current_y))`,
    },
    optionB: {
      title: 'Progress Bar Style',
      description: 'Visual progress bars showing completion percentage',
      features: [
        'Animated fill bars',
        'Milestone markers',
        'XP visualization',
        'Multi-stage quests',
      ],
      pythonCode: `# Progress Bar Style Quest Tracker
class QuestTracker:
    def __init__(self):
        self.quests = []
        self.completed_quests = []
        self.active_quest = None
        
        # Display settings
        self.position = 'right-side'
        self.max_visible = 4
        self.bar_width = 200
        self.bar_height = 20
        
        # Animation values
        self.display_progress = {}  # Smooth progress animation
        self.pulse_timers = {}
        self.milestone_animations = {}
        
        # Visual themes
        self.themes = {
            'main': {
                'bar_color': (255, 200, 0),
                'bg_color': (100, 80, 0),
                'complete_color': (0, 255, 100)
            },
            'side': {
                'bar_color': (100, 150, 255),
                'bg_color': (30, 50, 100),
                'complete_color': (150, 200, 255)
            },
            'challenge': {
                'bar_color': (255, 100, 100),
                'bg_color': (100, 30, 30),
                'complete_color': (255, 150, 150)
            }
        }
    
    def add_quest(self, quest_id, title, stages=1, max_progress=100,
                  quest_type='main', rewards=None):
        """Add a new quest with progress tracking"""
        quest = {
            'id': quest_id,
            'title': title,
            'type': quest_type,
            'current_stage': 1,
            'total_stages': stages,
            'progress': 0,
            'max_progress': max_progress,
            'milestones': [],  # Progress points for bonuses
            'rewards': rewards or {},
            'completed': False,
            'xp_gained': 0,
            'start_time': pygame.time.get_ticks()
        }
        
        # Initialize display progress
        self.display_progress[quest_id] = 0
        self.pulse_timers[quest_id] = 0
        
        # Auto-generate milestones
        if stages == 1:
            # Single stage - milestones at 25%, 50%, 75%
            quest['milestones'] = [25, 50, 75]
        else:
            # Multi-stage - milestone at each stage
            quest['milestones'] = [100 / stages * i for i in range(1, stages)]
        
        self.quests.append(quest)
        
        if not self.active_quest:
            self.active_quest = quest
    
    def update_progress(self, quest_id, amount, absolute=False):
        """Update quest progress"""
        quest = self.get_quest(quest_id)
        if not quest or quest['completed']:
            return
        
        old_progress = quest['progress']
        
        if absolute:
            quest['progress'] = min(amount, quest['max_progress'])
        else:
            quest['progress'] = min(quest['progress'] + amount, quest['max_progress'])
        
        # Check milestones
        for milestone in quest['milestones']:
            milestone_progress = (milestone / 100) * quest['max_progress']
            if old_progress < milestone_progress <= quest['progress']:
                self.trigger_milestone(quest_id, milestone)
        
        # Check stage completion
        stage_progress = quest['max_progress'] / quest['total_stages']
        if quest['progress'] >= stage_progress * quest['current_stage']:
            if quest['current_stage'] < quest['total_stages']:
                quest['current_stage'] += 1
                self.pulse_timers[quest_id] = 30  # Pulse animation
            else:
                self.complete_quest(quest_id)
    
    def trigger_milestone(self, quest_id, milestone_percent):
        """Trigger milestone animation and rewards"""
        if quest_id not in self.milestone_animations:
            self.milestone_animations[quest_id] = []
        
        self.milestone_animations[quest_id].append({
            'percent': milestone_percent,
            'timer': 60,
            'y_offset': 0
        })
        
        # Could grant milestone rewards here
        quest = self.get_quest(quest_id)
        if quest and 'milestone_xp' in quest['rewards']:
            quest['xp_gained'] += quest['rewards']['milestone_xp']
    
    def complete_quest(self, quest_id):
        """Complete a quest"""
        quest = self.get_quest(quest_id)
        if quest:
            quest['completed'] = True
            quest['progress'] = quest['max_progress']
            quest['completion_time'] = pygame.time.get_ticks()
            
            # Grant rewards
            if 'completion_xp' in quest['rewards']:
                quest['xp_gained'] += quest['rewards']['completion_xp']
            
            # Move to completed
            self.completed_quests.append(quest)
            self.quests.remove(quest)
            
            # Update active quest
            if self.active_quest == quest:
                self.active_quest = self.quests[0] if self.quests else None
    
    def get_quest(self, quest_id):
        """Get quest by ID"""
        for quest in self.quests + self.completed_quests:
            if quest['id'] == quest_id:
                return quest
        return None
    
    def update(self):
        """Update animations"""
        # Update display progress (smooth animation)
        for quest in self.quests:
            quest_id = quest['id']
            target = quest['progress']
            current = self.display_progress.get(quest_id, 0)
            
            if current < target:
                # Animate progress increase
                diff = target - current
                speed = max(0.5, diff * 0.1)
                self.display_progress[quest_id] = min(target, current + speed)
            elif current > target:
                self.display_progress[quest_id] = target
            
            # Update pulse timer
            if self.pulse_timers.get(quest_id, 0) > 0:
                self.pulse_timers[quest_id] -= 1
        
        # Update milestone animations
        for quest_id in list(self.milestone_animations.keys()):
            anims = self.milestone_animations[quest_id]
            for anim in anims[:]:
                anim['timer'] -= 1
                anim['y_offset'] -= 0.5  # Float up
                
                if anim['timer'] <= 0:
                    anims.remove(anim)
            
            if not anims:
                del self.milestone_animations[quest_id]
    
    def draw(self, screen, x, y):
        """Draw progress bar style quest tracker"""
        # Fonts
        title_font = pygame.font.Font(None, 18)
        info_font = pygame.font.Font(None, 14)
        
        current_y = y
        
        # Draw header
        header_text = title_font.render("QUEST PROGRESS", True, (255, 255, 255))
        screen.blit(header_text, (x, current_y))
        current_y += 25
        
        # Draw quests
        for i, quest in enumerate(self.quests[:self.max_visible]):
            if i > 0:
                current_y += 5  # Spacing
            
            theme = self.themes.get(quest['type'], self.themes['main'])
            quest_id = quest['id']
            
            # Quest title
            title_color = theme['bar_color'] if not quest['completed'] else (150, 150, 150)
            title_text = quest['title']
            if len(title_text) > 30:
                title_text = title_text[:27] + "..."
            
            title_surface = title_font.render(title_text, True, title_color)
            screen.blit(title_surface, (x, current_y))
            current_y += 20
            
            # Progress bar background
            bar_rect = pygame.Rect(x, current_y, self.bar_width, self.bar_height)
            pygame.draw.rect(screen, theme['bg_color'], bar_rect)
            pygame.draw.rect(screen, (100, 100, 100), bar_rect, 2)
            
            # Calculate fill width
            progress_percent = self.display_progress[quest_id] / quest['max_progress']
            fill_width = int(self.bar_width * progress_percent)
            
            if fill_width > 0:
                # Gradient effect on progress bar
                for i in range(fill_width):
                    gradient_percent = i / self.bar_width
                    color_intensity = 0.7 + 0.3 * math.sin(gradient_percent * math.pi)
                    
                    bar_color = theme['bar_color']
                    gradient_color = tuple(int(c * color_intensity) for c in bar_color)
                    
                    pygame.draw.line(screen, gradient_color,
                                   (x + i, current_y + 1),
                                   (x + i, current_y + self.bar_height - 1))
                
                # Pulse effect
                if self.pulse_timers.get(quest_id, 0) > 0:
                    pulse_alpha = self.pulse_timers[quest_id] / 30
                    pulse_surface = pygame.Surface((fill_width, self.bar_height), 
                                                 pygame.SRCALPHA)
                    pulse_surface.fill((*theme['bar_color'], int(100 * pulse_alpha)))
                    screen.blit(pulse_surface, (x, current_y))
            
            # Draw milestone markers
            for milestone in quest['milestones']:
                milestone_x = x + int(self.bar_width * (milestone / 100))
                milestone_reached = quest['progress'] >= (milestone / 100) * quest['max_progress']
                
                marker_color = theme['complete_color'] if milestone_reached else (80, 80, 80)
                
                # Diamond marker
                pygame.draw.polygon(screen, marker_color,
                                  [(milestone_x, current_y - 3),
                                   (milestone_x - 3, current_y + self.bar_height // 2),
                                   (milestone_x, current_y + self.bar_height + 3),
                                   (milestone_x + 3, current_y + self.bar_height // 2)])
                pygame.draw.polygon(screen, (255, 255, 255),
                                  [(milestone_x, current_y - 3),
                                   (milestone_x - 3, current_y + self.bar_height // 2),
                                   (milestone_x, current_y + self.bar_height + 3),
                                   (milestone_x + 3, current_y + self.bar_height // 2)], 1)
            
            # Progress text overlay
            progress_text = f"{int(quest['progress'])}/{quest['max_progress']}"
            if quest['total_stages'] > 1:
                progress_text += f" (Stage {quest['current_stage']}/{quest['total_stages']})"
            
            text_surface = info_font.render(progress_text, True, (255, 255, 255))
            text_rect = text_surface.get_rect(center=(x + self.bar_width // 2,
                                                     current_y + self.bar_height // 2))
            
            # Text background for readability
            text_bg = pygame.Surface((text_rect.width + 4, text_rect.height), 
                                    pygame.SRCALPHA)
            text_bg.fill((0, 0, 0, 150))
            screen.blit(text_bg, (text_rect.x - 2, text_rect.y))
            screen.blit(text_surface, text_rect)
            
            # Draw milestone animations
            if quest_id in self.milestone_animations:
                for anim in self.milestone_animations[quest_id]:
                    anim_alpha = min(255, anim['timer'] * 8)
                    anim_text = f"+{int(anim['percent'])}% Milestone!"
                    anim_surface = info_font.render(anim_text, True, 
                                                   theme['complete_color'])
                    anim_surface.set_alpha(anim_alpha)
                    screen.blit(anim_surface, 
                              (x + self.bar_width // 2 - 40,
                               current_y - 10 + anim['y_offset']))
            
            current_y += self.bar_height + 20
            
            # XP indicator if quest gives XP
            if quest.get('xp_gained', 0) > 0:
                xp_text = f"XP Earned: {quest['xp_gained']}"
                xp_surface = info_font.render(xp_text, True, (200, 200, 100))
                screen.blit(xp_surface, (x, current_y - 15))
        
        # Show additional quest count
        if len(self.quests) > self.max_visible:
            more_text = f"+{len(self.quests) - self.max_visible} more quests"
            more_surface = info_font.render(more_text, True, (150, 150, 150))
            screen.blit(more_surface, (x, current_y + 5))`,
    },
  },
];

// LocalStorage management functions
export function getUserComponentChoices(): ComponentChoice[] {
  const stored = localStorage.getItem('gameComponentChoices');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Error parsing component choices:', e);
      return [];
    }
  }
  return [];
}

export function saveComponentChoice(componentId: string, choice: 'A' | 'B'): void {
  const choices = getUserComponentChoices();
  const existingIndex = choices.findIndex((c) => c.component === componentId);

  if (existingIndex >= 0) {
    choices[existingIndex].choice = choice;
  } else {
    choices.push({ component: componentId, choice });
  }

  localStorage.setItem('gameComponentChoices', JSON.stringify(choices));
}

export function getComponentChoice(componentId: string): 'A' | 'B' | null {
  const choices = getUserComponentChoices();
  const choice = choices.find((c) => c.component === componentId);
  return choice ? choice.choice : null;
}

// Generate a complete game template based on component choices
export function generateGameTemplate(
  gameType: string,
  componentChoices?: ComponentChoice[]
): string {
  const choices = componentChoices || getUserComponentChoices();

  // Track which systems are selected
  const selectedSystems = new Set<string>();

  // Start with base template
  let template = `# Pixel's PyGame Palace - ${gameType} Game
# Generated with your custom component choices
import pygame
import random
import math

# Initialize Pygame
pygame.init()

# Game settings
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors
BLACK = (0, 0, 0)
WHITE = (255, 255, 255)
RED = (255, 0, 0)
GREEN = (0, 255, 0)
BLUE = (0, 0, 255)
YELLOW = (255, 255, 0)
GRAY = (128, 128, 128)

`;

  // Add chosen components
  for (const choice of choices) {
    const component = gameComponents.find((c) => c.id === choice.component);
    if (component) {
      selectedSystems.add(component.id);
      const selectedOption = choice.choice === 'A' ? component.optionA : component.optionB;
      template += `\n# ${component.title} - ${selectedOption.title}\n`;
      template += selectedOption.pythonCode + '\n';
    }
  }

  // Add default movement if no movement system selected
  if (!selectedSystems.has('movement')) {
    template += `\n# Default Movement (no movement system selected)\n`;
    template += `class BasicMovement:
    def __init__(self, entity):
        self.entity = entity
        self.speed = 5
        
    def handle_input(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT] or keys[pygame.K_a]:
            self.entity.x -= self.speed
        if keys[pygame.K_RIGHT] or keys[pygame.K_d]:
            self.entity.x += self.speed
        if keys[pygame.K_UP] or keys[pygame.K_w]:
            self.entity.y -= self.speed
        if keys[pygame.K_DOWN] or keys[pygame.K_s]:
            self.entity.y += self.speed
            
        # Keep player on screen
        self.entity.x = max(0, min(SCREEN_WIDTH - self.entity.width, self.entity.x))
        self.entity.y = max(0, min(SCREEN_HEIGHT - self.entity.height, self.entity.y))
    
    def update_position(self, platforms=[]):
        pass  # Basic movement doesn't need platform collision\n`;
  }

  // Add main game class that uses the components
  template += `
# Main Game Class
class Game:
    def __init__(self):
        self.screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
        pygame.display.set_caption("${gameType} Adventure")
        self.clock = pygame.time.Clock()
        self.running = True
        
        # Initialize player
        self.player = type('Player', (), {
            'x': SCREEN_WIDTH // 2, 'y': SCREEN_HEIGHT // 2,
            'width': 30, 'height': 40,
            'health': 100, 'max_health': 100,
            'damage': 10, 'defense': 5,
            'speed': 5,
            'mana': 50, 'max_mana': 50,
            'is_player': True,
            'damage_multiplier': 1.0,
            'regen_rate': 0
        })()
        
        # Initialize only selected systems`;

  // Add system initialization based on what was selected
  if (selectedSystems.has('combat')) {
    template += `\n        self.combat_system = CombatSystem()\n        # Add some initial enemies\n        self.combat_system.add_enemy(400, 300, 50)`;
  }

  if (selectedSystems.has('inventory')) {
    template += `\n        self.inventory_system = InventorySystem()\n        # Add some starter items\n        self.inventory_system.add_item({'id': 'potion', 'name': 'Health Potion', 'icon': '♥', 'stackable': True})`;
  }

  if (selectedSystems.has('movement')) {
    template += `\n        self.movement_system = MovementSystem(self.player)`;
  } else {
    template += `\n        self.movement_system = BasicMovement(self.player)  # Default movement`;
  }

  if (selectedSystems.has('progression')) {
    template += `\n        self.progression_system = ProgressionSystem(self.player)`;
  }

  if (selectedSystems.has('mapgen')) {
    template += `\n        self.map_system = MapGenerationSystem()\n        self.map_system.generate_dungeon()`;
  }

  template += `
        
        # Game state
        self.font = pygame.font.Font(None, 24)
        self.platforms = []  # For movement collision
        self.show_inventory = False  # Track inventory UI visibility
        `;

  // Only add platform creation if no map system
  if (!selectedSystems.has('mapgen')) {
    template += `
        # Create default platforms since no map system selected
        # Ground platform
        self.platforms.append(pygame.Rect(0, SCREEN_HEIGHT - 40, SCREEN_WIDTH, 40))
        # Some floating platforms
        self.platforms.append(pygame.Rect(200, 400, 150, 20))
        self.platforms.append(pygame.Rect(450, 300, 150, 20))
        self.platforms.append(pygame.Rect(100, 200, 150, 20))`;
  }

  template += `
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
            
            # Handle other events based on systems
            elif event.type == pygame.KEYDOWN:
                # ESC to quit
                if event.key == pygame.K_ESCAPE:
                    self.running = False
                
                # Inventory controls - only if inventory system exists
                if hasattr(self, 'inventory_system'):
                    # Toggle inventory visibility with I
                    if event.key == pygame.K_i:
                        self.show_inventory = not self.show_inventory
                    
                    # Quick slot items (1-5 keys)
                    if pygame.K_1 <= event.key <= pygame.K_5:
                        slot_index = event.key - pygame.K_1
                        item = self.inventory_system.use_quick_slot(slot_index)
                        if item:
                            print(f"Used {item['name']}")
                
                # Combat controls - only if combat system exists
                if hasattr(self, 'combat_system') and event.key == pygame.K_SPACE:
                    # Fire projectile in direction player is facing
                    direction = (1, 0)  # Default right
                    self.combat_system.fire_projectile(self.player.x + self.player.width, 
                                                      self.player.y + self.player.height // 2, 
                                                      direction)
    
    def update(self):
        # Update movement (always present - either custom or basic)
        self.movement_system.handle_input()
        self.movement_system.update_position(self.platforms)
        
        # Update combat if present
        if hasattr(self, 'combat_system'):
            player_rect = pygame.Rect(self.player.x, self.player.y,
                                    self.player.width, self.player.height)
            self.combat_system.update_combat(player_rect)
        
        # Update progression if present
        if hasattr(self, 'progression_system'):
            self.progression_system.update_buffs()
        
        # Basic health regeneration if no progression system
        if not hasattr(self, 'progression_system'):
            # Slowly regenerate health
            if self.player.health < self.player.max_health:
                self.player.health = min(self.player.max_health, 
                                        self.player.health + 0.01)
    
    def draw(self):
        # Draw background
        if hasattr(self, 'map_system'):
            # Dark background for dungeon feel
            self.screen.fill(BLACK)
            # Draw minimap if map system exists
            self.map_system.draw_minimap(self.screen, 600, 20, 2)
        else:
            # Simple gradient background if no map system
            self.screen.fill((50, 50, 80))  # Dark blue
            # Draw platforms
            for platform in self.platforms:
                pygame.draw.rect(self.screen, GRAY, platform)
                pygame.draw.rect(self.screen, WHITE, platform, 2)
        
        # Draw player (always visible)
        pygame.draw.rect(self.screen, RED,
                       (self.player.x, self.player.y,
                        self.player.width, self.player.height))
        # Player outline
        pygame.draw.rect(self.screen, WHITE,
                       (self.player.x, self.player.y,
                        self.player.width, self.player.height), 2)
        
        # Draw combat elements if present
        if hasattr(self, 'combat_system'):
            self.combat_system.draw_combat(self.screen)
        
        # Draw inventory if present and open
        if hasattr(self, 'inventory_system') and hasattr(self, 'show_inventory'):
            if self.show_inventory:
                self.inventory_system.draw_inventory(self.screen, 250, 150)
        
        # Draw UI elements
        self.draw_ui()
        
        pygame.display.flip()
    
    def draw_ui(self):
        # Always draw health bar
        bar_width = 200
        bar_height = 20
        health_percent = max(0, self.player.health / self.player.max_health)
        
        # Health bar background
        pygame.draw.rect(self.screen, (100, 0, 0), (10, 10, bar_width, bar_height))
        # Health bar fill
        pygame.draw.rect(self.screen, (0, 255, 0),
                       (10, 10, int(bar_width * health_percent), bar_height))
        # Health bar border
        pygame.draw.rect(self.screen, WHITE, (10, 10, bar_width, bar_height), 2)
        # Health text
        health_text = self.font.render(f"HP: {int(self.player.health)}/{self.player.max_health}",
                                      True, WHITE)
        self.screen.blit(health_text, (15, 12))
        
        # Draw progression UI if present
        if hasattr(self, 'progression_system'):
            self.progression_system.draw_level_ui(self.screen, 10, 40)
        
        # Draw control hints based on available systems
        hints = []
        hints.append("Arrow Keys/WASD: Move")
        
        if hasattr(self, 'combat_system'):
            hints.append("Space: Attack")
        
        if hasattr(self, 'inventory_system'):
            hints.append("I: Inventory")
            hints.append("1-5: Quick items")
        
        hints.append("ESC: Quit")
        
        # Draw hints at bottom
        hint_y = SCREEN_HEIGHT - 30
        hint_text = self.font.render(" | ".join(hints), True, WHITE)
        self.screen.blit(hint_text, (10, hint_y))
        
        # Draw game title at top right
        title_text = self.font.render("${gameType} Adventure", True, YELLOW)
        title_rect = title_text.get_rect(right=SCREEN_WIDTH - 10, top=10)
        self.screen.blit(title_text, title_rect)
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(FPS)
        
        pygame.quit()

# Start the game
if __name__ == "__main__":
    game = Game()
    game.run()
`;

  return template;
}

// Get a summary of chosen components
export function getComponentSummary(): { [key: string]: string } {
  const choices = getUserComponentChoices();
  const summary: { [key: string]: string } = {};

  for (const choice of choices) {
    const component = gameComponents.find((c) => c.id === choice.component);
    if (component) {
      const selectedOption = choice.choice === 'A' ? component.optionA : component.optionB;
      summary[component.title] = selectedOption.title;
    }
  }

  return summary;
}

// Reset all component choices
export function resetComponentChoices(): void {
  localStorage.removeItem('gameComponentChoices');
}
