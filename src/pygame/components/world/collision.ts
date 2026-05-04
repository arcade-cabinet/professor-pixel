import { PygameComponent } from '../types';

export const collisionComponent: PygameComponent = {
  id: 'collision',
  name: 'Collision System',
  category: 'world',
  
  assetSlots: {
    sound: 'audio/sfx/collision.ogg'
  },
  
  variants: {
    A: {
      name: 'Box Collision',
      description: 'Simple AABB collision detection',
      pythonCode: `
# Box Collision System
class CollisionSystem:
    def __init__(self):
        self.solid_objects = []
        self.collision_groups = {}
        self.collision_callbacks = {}
        
    def add_solid(self, obj, group='default'):
        if group not in self.collision_groups:
            self.collision_groups[group] = []
        self.collision_groups[group].append(obj)
        self.solid_objects.append(obj)
        
        # Ensure object has rect
        if not hasattr(obj, 'rect'):
            obj.rect = pygame.Rect(obj.x, obj.y, obj.width, obj.height)
            
    def register_collision_callback(self, group1, group2, callback):
        key = f"{group1}_{group2}"
        self.collision_callbacks[key] = callback
        
    def update(self):
        # Update all rects
        for obj in self.solid_objects:
            obj.rect.x = obj.x
            obj.rect.y = obj.y
            
        # Check collisions between groups
        for key, callback in self.collision_callbacks.items():
            group1, group2 = key.split('_')
            if group1 in self.collision_groups and group2 in self.collision_groups:
                for obj1 in self.collision_groups[group1]:
                    for obj2 in self.collision_groups[group2]:
                        if obj1 != obj2 and obj1.rect.colliderect(obj2.rect):
                            callback(obj1, obj2)
                            
    def check_collision(self, rect, exclude=None):
        for obj in self.solid_objects:
            if obj != exclude and obj.rect.colliderect(rect):
                return obj
        return None
        
    def resolve_collision(self, moving_obj, static_obj):
        # Simple collision resolution - push out of collision
        moving_rect = moving_obj.rect
        static_rect = static_obj.rect
        
        # Calculate overlap
        overlap_left = moving_rect.right - static_rect.left
        overlap_right = static_rect.right - moving_rect.left
        overlap_top = moving_rect.bottom - static_rect.top
        overlap_bottom = static_rect.bottom - moving_rect.top
        
        # Find smallest overlap
        min_overlap = min(overlap_left, overlap_right, overlap_top, overlap_bottom)
        
        # Resolve based on smallest overlap
        if min_overlap == overlap_left:
            moving_obj.x = static_rect.left - moving_obj.width
            if hasattr(moving_obj, 'velocity_x'):
                moving_obj.velocity_x = 0
        elif min_overlap == overlap_right:
            moving_obj.x = static_rect.right
            if hasattr(moving_obj, 'velocity_x'):
                moving_obj.velocity_x = 0
        elif min_overlap == overlap_top:
            moving_obj.y = static_rect.top - moving_obj.height
            if hasattr(moving_obj, 'velocity_y'):
                moving_obj.velocity_y = 0
                moving_obj.on_ground = True
        elif min_overlap == overlap_bottom:
            moving_obj.y = static_rect.bottom
            if hasattr(moving_obj, 'velocity_y'):
                moving_obj.velocity_y = 0
                
        # Update rect
        moving_obj.rect.x = moving_obj.x
        moving_obj.rect.y = moving_obj.y
        
        # Play collision sound
        if '{{sound}}':
            # Would play collision sound here
            pass`
    },
    B: {
      name: 'Physics Collision',
      description: 'Advanced collision with bounce and friction',
      pythonCode: `
# Physics Collision System
class CollisionSystem:
    def __init__(self):
        self.physics_objects = []
        self.static_objects = []
        self.bounciness = {{bounciness}}
        self.friction = {{friction}}
        self.collision_pairs = []
        
    def add_physics_object(self, obj, mass=1.0, elastic=0.8):
        obj.mass = mass
        obj.elasticity = elastic
        obj.velocity_x = getattr(obj, 'velocity_x', 0)
        obj.velocity_y = getattr(obj, 'velocity_y', 0)
        obj.rect = pygame.Rect(obj.x, obj.y, obj.width, obj.height)
        self.physics_objects.append(obj)
        
    def add_static_object(self, obj):
        obj.rect = pygame.Rect(obj.x, obj.y, obj.width, obj.height)
        self.static_objects.append(obj)
        
    def update(self, dt):
        # Clear collision pairs
        self.collision_pairs = []
        
        # Update positions
        for obj in self.physics_objects:
            obj.x += obj.velocity_x * dt
            obj.y += obj.velocity_y * dt
            obj.rect.x = obj.x
            obj.rect.y = obj.y
            
        # Check physics object collisions
        for i, obj1 in enumerate(self.physics_objects):
            # Check against static objects
            for static in self.static_objects:
                if obj1.rect.colliderect(static.rect):
                    self.resolve_static_collision(obj1, static)
                    
            # Check against other physics objects
            for obj2 in self.physics_objects[i+1:]:
                if obj1.rect.colliderect(obj2.rect):
                    self.resolve_dynamic_collision(obj1, obj2)
                    self.collision_pairs.append((obj1, obj2))
                    
    def resolve_static_collision(self, dynamic, static):
        # Calculate overlap
        d_rect = dynamic.rect
        s_rect = static.rect
        
        overlap_x = min(d_rect.right - s_rect.left, s_rect.right - d_rect.left)
        overlap_y = min(d_rect.bottom - s_rect.top, s_rect.bottom - d_rect.top)
        
        # Resolve based on smallest overlap
        if overlap_x < overlap_y:
            # Horizontal collision
            if d_rect.centerx < s_rect.centerx:
                dynamic.x = s_rect.left - dynamic.width
            else:
                dynamic.x = s_rect.right
                
            # Apply bounce
            dynamic.velocity_x *= -dynamic.elasticity * self.bounciness
            
            # Apply friction to y velocity
            dynamic.velocity_y *= (1 - self.friction)
        else:
            # Vertical collision
            if d_rect.centery < s_rect.centery:
                dynamic.y = s_rect.top - dynamic.height
                dynamic.on_ground = True
            else:
                dynamic.y = s_rect.bottom
                
            # Apply bounce
            dynamic.velocity_y *= -dynamic.elasticity * self.bounciness
            
            # Apply friction to x velocity
            dynamic.velocity_x *= (1 - self.friction)
            
        # Update rect
        dynamic.rect.x = dynamic.x
        dynamic.rect.y = dynamic.y
        
    def resolve_dynamic_collision(self, obj1, obj2):
        # Calculate relative velocity
        rel_vx = obj2.velocity_x - obj1.velocity_x
        rel_vy = obj2.velocity_y - obj1.velocity_y
        
        # Calculate collision normal
        dx = obj2.rect.centerx - obj1.rect.centerx
        dy = obj2.rect.centery - obj1.rect.centery
        distance = (dx**2 + dy**2) ** 0.5
        
        if distance > 0:
            nx = dx / distance
            ny = dy / distance
        else:
            nx, ny = 1, 0
            
        # Relative velocity along collision normal
        rel_speed = rel_vx * nx + rel_vy * ny
        
        # Don't resolve if objects are separating
        if rel_speed > 0:
            return
            
        # Calculate impulse
        e = min(obj1.elasticity, obj2.elasticity) * self.bounciness
        j = -(1 + e) * rel_speed / (1/obj1.mass + 1/obj2.mass)
        
        # Apply impulse
        impulse_x = j * nx
        impulse_y = j * ny
        
        obj1.velocity_x -= impulse_x / obj1.mass
        obj1.velocity_y -= impulse_y / obj1.mass
        obj2.velocity_x += impulse_x / obj2.mass
        obj2.velocity_y += impulse_y / obj2.mass
        
        # Separate objects
        separation = 5 - distance
        if separation > 0:
            separate_x = nx * separation * 0.5
            separate_y = ny * separation * 0.5
            obj1.x -= separate_x
            obj1.y -= separate_y
            obj2.x += separate_x
            obj2.y += separate_y
            
    def draw_debug(self, screen):
        # Draw collision pairs
        for obj1, obj2 in self.collision_pairs:
            pygame.draw.line(screen, (255, 0, 0),
                           obj1.rect.center, obj2.rect.center, 2)`
    }
  },
  
  parameters: {
    bounciness: 0.8,
    friction: 0.1
  }
};