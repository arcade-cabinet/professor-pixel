// 3D Support for PyGame using simple projection
// This demonstrates how pygame can render 3D models without full OpenGL

export const pygame3DSupport = `# 3D Support for PyGame - Simple 3D without OpenGL
# This shows how to create 3D effects in pygame using projection math

import pygame
import math
import json

class Simple3D:
    """Simple 3D engine for pygame without OpenGL dependencies"""
    
    def __init__(self, screen_width, screen_height):
        self.width = screen_width
        self.height = screen_height
        self.center_x = screen_width // 2
        self.center_y = screen_height // 2
        self.fov = 256  # Field of view
        self.viewer_distance = 4
        
        # Camera position and rotation
        self.camera_x = 0
        self.camera_y = 0
        self.camera_z = -5
        self.rotation_x = 0
        self.rotation_y = 0
        self.rotation_z = 0
    
    def project_point(self, point_3d):
        """Project a 3D point to 2D screen coordinates"""
        x, y, z = point_3d
        
        # Apply rotations
        x, y, z = self.rotate_point(x, y, z)
        
        # Translate relative to camera
        x -= self.camera_x
        y -= self.camera_y
        z -= self.camera_z
        
        # Avoid division by zero
        if z <= 0:
            z = 0.1
        
        # Project to 2D
        factor = self.fov / z
        x_2d = int(x * factor + self.center_x)
        y_2d = int(y * factor + self.center_y)
        
        return (x_2d, y_2d, z)  # Return z for depth sorting
    
    def rotate_point(self, x, y, z):
        """Apply rotation transformations"""
        # Rotate around X axis
        if self.rotation_x:
            cos_x = math.cos(self.rotation_x)
            sin_x = math.sin(self.rotation_x)
            y, z = y * cos_x - z * sin_x, y * sin_x + z * cos_x
        
        # Rotate around Y axis
        if self.rotation_y:
            cos_y = math.cos(self.rotation_y)
            sin_y = math.sin(self.rotation_y)
            x, z = x * cos_y + z * sin_y, -x * sin_y + z * cos_y
        
        # Rotate around Z axis
        if self.rotation_z:
            cos_z = math.cos(self.rotation_z)
            sin_z = math.sin(self.rotation_z)
            x, y = x * cos_z - y * sin_z, x * sin_z + y * cos_z
        
        return x, y, z
    
    def draw_line_3d(self, screen, point1, point2, color=(255, 255, 255)):
        """Draw a line between two 3D points"""
        p1_2d = self.project_point(point1)
        p2_2d = self.project_point(point2)
        
        # Only draw if both points are in front of camera
        if p1_2d[2] > 0 and p2_2d[2] > 0:
            pygame.draw.line(screen, color, p1_2d[:2], p2_2d[:2], 2)
    
    def draw_polygon_3d(self, screen, points, color=(100, 100, 200), outline_color=(255, 255, 255)):
        """Draw a filled polygon in 3D"""
        projected_points = []
        avg_z = 0
        
        for point in points:
            p_2d = self.project_point(point)
            projected_points.append(p_2d[:2])
            avg_z += p_2d[2]
        
        avg_z /= len(points)
        
        # Only draw if polygon is in front of camera
        if avg_z > 0 and len(projected_points) >= 3:
            # Draw filled polygon
            pygame.draw.polygon(screen, color, projected_points)
            # Draw outline
            pygame.draw.polygon(screen, outline_color, projected_points, 2)
        
        return avg_z  # Return for depth sorting

class Mesh3D:
    """A 3D mesh object"""
    
    def __init__(self, vertices, faces, colors=None):
        self.vertices = vertices  # List of (x, y, z) points
        self.faces = faces  # List of vertex indices forming faces
        self.colors = colors or [(100, 100, 200)] * len(faces)
        self.position = [0, 0, 0]
        self.rotation = [0, 0, 0]
        self.scale = 1.0
    
    def get_transformed_vertices(self):
        """Get vertices after applying transformations"""
        transformed = []
        for vertex in self.vertices:
            # Apply scale
            x = vertex[0] * self.scale
            y = vertex[1] * self.scale
            z = vertex[2] * self.scale
            
            # Apply rotation (simplified)
            if self.rotation[1]:  # Y rotation only for simplicity
                cos_y = math.cos(self.rotation[1])
                sin_y = math.sin(self.rotation[1])
                x, z = x * cos_y + z * sin_y, -x * sin_y + z * cos_y
            
            # Apply position
            x += self.position[0]
            y += self.position[1]
            z += self.position[2]
            
            transformed.append([x, y, z])
        
        return transformed
    
    def draw(self, screen, engine):
        """Draw the mesh using the 3D engine"""
        transformed_vertices = self.get_transformed_vertices()
        
        # Create face list with depth values for sorting
        face_list = []
        for i, face in enumerate(self.faces):
            # Calculate average Z for depth sorting
            avg_z = sum(transformed_vertices[v][2] for v in face) / len(face)
            face_list.append((avg_z, i, face))
        
        # Sort faces by depth (painter's algorithm)
        face_list.sort(reverse=True)
        
        # Draw faces from back to front
        for avg_z, face_index, face in face_list:
            face_vertices = [transformed_vertices[v] for v in face]
            color = self.colors[face_index] if face_index < len(self.colors) else (100, 100, 200)
            engine.draw_polygon_3d(screen, face_vertices, color)

# Predefined 3D shapes
def create_cube(size=1):
    """Create a cube mesh"""
    vertices = [
        [-size, -size, -size], [size, -size, -size],
        [size, size, -size], [-size, size, -size],
        [-size, -size, size], [size, -size, size],
        [size, size, size], [-size, size, size]
    ]
    
    faces = [
        [0, 1, 2, 3],  # Back
        [4, 7, 6, 5],  # Front
        [0, 4, 5, 1],  # Bottom
        [2, 6, 7, 3],  # Top
        [0, 3, 7, 4],  # Left
        [1, 5, 6, 2]   # Right
    ]
    
    colors = [
        (200, 100, 100),  # Red
        (100, 200, 100),  # Green
        (100, 100, 200),  # Blue
        (200, 200, 100),  # Yellow
        (200, 100, 200),  # Magenta
        (100, 200, 200)   # Cyan
    ]
    
    return Mesh3D(vertices, faces, colors)

def create_pyramid(size=1):
    """Create a pyramid mesh"""
    vertices = [
        [-size, 0, -size], [size, 0, -size],
        [size, 0, size], [-size, 0, size],
        [0, -size * 2, 0]  # Apex
    ]
    
    faces = [
        [0, 1, 2, 3],  # Base
        [0, 1, 4],     # Front
        [1, 2, 4],     # Right
        [2, 3, 4],     # Back
        [3, 0, 4]      # Left
    ]
    
    colors = [
        (150, 150, 150),  # Gray base
        (200, 150, 100),  # Sandy front
        (180, 130, 80),   # Sandy right
        (160, 110, 60),   # Sandy back
        (140, 90, 40)     # Sandy left
    ]
    
    return Mesh3D(vertices, faces, colors)

def create_spaceship(size=1):
    """Create a simple spaceship mesh"""
    vertices = [
        [0, 0, -size * 2],      # Nose
        [-size, 0, size],       # Left wing
        [size, 0, size],        # Right wing
        [0, size * 0.5, size],  # Top back
        [0, -size * 0.5, size], # Bottom back
        [0, 0, 0]               # Center
    ]
    
    faces = [
        [0, 1, 5],      # Left side
        [0, 5, 2],      # Right side
        [0, 3, 5],      # Top
        [0, 5, 4],      # Bottom
        [1, 2, 3, 4]    # Back
    ]
    
    colors = [
        (150, 150, 200),  # Blue-gray left
        (150, 150, 200),  # Blue-gray right
        (200, 200, 220),  # Light top
        (100, 100, 120),  # Dark bottom
        (255, 100, 100)   # Red engines
    ]
    
    return Mesh3D(vertices, faces, colors)

# Example game with 3D graphics
class Game3D:
    def __init__(self):
        pygame.init()
        self.screen = pygame.display.set_mode((800, 600))
        pygame.display.set_caption("PyGame 3D Demo - Use Arrow Keys to Rotate")
        self.clock = pygame.time.Clock()
        self.running = True
        
        # Initialize 3D engine
        self.engine = Simple3D(800, 600)
        
        # Create 3D objects
        self.objects = [
            create_cube(1),
            create_pyramid(1),
            create_spaceship(0.7)
        ]
        
        # Position objects
        self.objects[0].position = [-3, 0, 2]
        self.objects[1].position = [0, 0, 2]
        self.objects[2].position = [3, 0, 2]
        
        # Animation variables
        self.time = 0
    
    def handle_events(self):
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                self.running = False
        
        # Keyboard controls for camera
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.engine.rotation_y -= 0.05
        if keys[pygame.K_RIGHT]:
            self.engine.rotation_y += 0.05
        if keys[pygame.K_UP]:
            self.engine.rotation_x -= 0.05
        if keys[pygame.K_DOWN]:
            self.engine.rotation_x += 0.05
        if keys[pygame.K_q]:
            self.engine.camera_z += 0.2
        if keys[pygame.K_e]:
            self.engine.camera_z -= 0.2
    
    def update(self):
        self.time += 0.02
        
        # Rotate objects
        for obj in self.objects:
            obj.rotation[1] = self.time
        
        # Bob the spaceship
        self.objects[2].position[1] = math.sin(self.time * 2) * 0.5
    
    def draw(self):
        self.screen.fill((20, 20, 40))  # Dark blue background
        
        # Draw coordinate axes
        origin = self.engine.project_point([0, 0, 0])
        x_axis = self.engine.project_point([2, 0, 0])
        y_axis = self.engine.project_point([0, 2, 0])
        z_axis = self.engine.project_point([0, 0, 2])
        
        if origin[2] > 0:
            pygame.draw.line(self.screen, (255, 0, 0), origin[:2], x_axis[:2], 2)  # X - Red
            pygame.draw.line(self.screen, (0, 255, 0), origin[:2], y_axis[:2], 2)  # Y - Green
            pygame.draw.line(self.screen, (0, 0, 255), origin[:2], z_axis[:2], 2)  # Z - Blue
        
        # Draw 3D objects
        for obj in self.objects:
            obj.draw(self.screen, self.engine)
        
        # Draw instructions
        font = pygame.font.Font(None, 24)
        instructions = [
            "Arrow Keys: Rotate camera",
            "Q/E: Zoom in/out",
            "ESC: Quit"
        ]
        y = 10
        for instruction in instructions:
            text = font.render(instruction, True, (200, 200, 200))
            self.screen.blit(text, (10, y))
            y += 25
        
        pygame.display.flip()
    
    def run(self):
        while self.running:
            self.handle_events()
            self.update()
            self.draw()
            self.clock.tick(60)
        
        pygame.quit()

# Run the demo
if __name__ == "__main__":
    game = Game3D()
    game.run()
`;

export const gltfLoaderCode = `# GLTF/GLB Loader for PyGame
# Load and render 3D models from GLTF files

import json
import struct
import base64
import pygame
from io import BytesIO

class GLTFLoader:
    """Load GLTF 2.0 models for use in pygame"""
    
    def __init__(self, filename):
        self.filename = filename
        self.data = None
        self.buffers = []
        self.meshes = []
        self.vertices = []
        self.indices = []
        self.load()
    
    def load(self):
        """Load GLTF/GLB file"""
        if self.filename.endswith('.gltf'):
            self.load_gltf()
        elif self.filename.endswith('.glb'):
            self.load_glb()
    
    def load_gltf(self):
        """Load ASCII GLTF file"""
        with open(self.filename, 'r') as f:
            self.data = json.load(f)
        self.parse_buffers()
        self.parse_meshes()
    
    def load_glb(self):
        """Load binary GLB file"""
        with open(self.filename, 'rb') as f:
            # Read GLB header
            magic = f.read(4)
            if magic != b'glTF':
                raise ValueError("Not a valid GLB file")
            
            version = struct.unpack('<I', f.read(4))[0]
            if version != 2:
                raise ValueError("Only GLTF 2.0 is supported")
            
            length = struct.unpack('<I', f.read(4))[0]
            
            # Read JSON chunk
            chunk_length = struct.unpack('<I', f.read(4))[0]
            chunk_type = f.read(4)
            json_data = f.read(chunk_length)
            self.data = json.loads(json_data)
            
            # Read binary chunk if present
            if f.tell() < length:
                bin_chunk_length = struct.unpack('<I', f.read(4))[0]
                bin_chunk_type = f.read(4)
                bin_data = f.read(bin_chunk_length)
                self.buffers.append(bin_data)
    
    def parse_buffers(self):
        """Parse buffer data from GLTF"""
        if 'buffers' not in self.data:
            return
        
        for buffer in self.data['buffers']:
            if 'uri' in buffer:
                if buffer['uri'].startswith('data:'):
                    # Embedded base64 data
                    header, data = buffer['uri'].split(',', 1)
                    self.buffers.append(base64.b64decode(data))
                else:
                    # External file
                    with open(buffer['uri'], 'rb') as f:
                        self.buffers.append(f.read())
    
    def parse_meshes(self):
        """Extract mesh data from GLTF"""
        if 'meshes' not in self.data:
            return
        
        for mesh in self.data['meshes']:
            for primitive in mesh.get('primitives', []):
                # Get vertex positions
                if 'POSITION' in primitive['attributes']:
                    accessor_idx = primitive['attributes']['POSITION']
                    vertices = self.get_accessor_data(accessor_idx)
                    
                    # Get indices if available
                    indices = []
                    if 'indices' in primitive:
                        indices = self.get_accessor_data(primitive['indices'])
                    
                    self.meshes.append({
                        'vertices': vertices,
                        'indices': indices
                    })
    
    def get_accessor_data(self, accessor_index):
        """Get data from an accessor"""
        accessor = self.data['accessors'][accessor_index]
        buffer_view = self.data['bufferViews'][accessor['bufferView']]
        buffer = self.buffers[buffer_view['buffer']]
        
        offset = buffer_view.get('byteOffset', 0)
        if 'byteOffset' in accessor:
            offset += accessor['byteOffset']
        
        count = accessor['count']
        component_type = accessor['componentType']
        type_str = accessor['type']
        
        # Determine format string for struct.unpack
        formats = {
            5120: 'b',  # BYTE
            5121: 'B',  # UNSIGNED_BYTE
            5122: 'h',  # SHORT
            5123: 'H',  # UNSIGNED_SHORT
            5125: 'I',  # UNSIGNED_INT
            5126: 'f'   # FLOAT
        }
        
        if component_type not in formats:
            return []
        
        format_char = formats[component_type]
        
        # Determine number of components
        component_counts = {
            'SCALAR': 1,
            'VEC2': 2,
            'VEC3': 3,
            'VEC4': 4
        }
        
        components = component_counts.get(type_str, 1)
        
        # Read data
        data = []
        for i in range(count):
            values = struct.unpack_from(
                '<' + format_char * components,
                buffer,
                offset + i * struct.calcsize(format_char) * components
            )
            if components == 1:
                data.append(values[0])
            else:
                data.append(list(values))
        
        return data
    
    def to_pygame_mesh(self):
        """Convert to a format suitable for pygame rendering"""
        pygame_meshes = []
        
        for mesh in self.meshes:
            vertices = mesh['vertices']
            indices = mesh['indices']
            
            # Create faces from indices
            faces = []
            if indices:
                for i in range(0, len(indices), 3):
                    if i + 2 < len(indices):
                        faces.append([indices[i], indices[i+1], indices[i+2]])
            
            pygame_meshes.append({
                'vertices': vertices,
                'faces': faces
            })
        
        return pygame_meshes

# Example usage
def load_3d_model(filename):
    """Load a 3D model and prepare it for pygame"""
    try:
        loader = GLTFLoader(filename)
        meshes = loader.to_pygame_mesh()
        
        # Convert to Mesh3D objects
        from simple_3d import Mesh3D
        
        result = []
        for mesh_data in meshes:
            if mesh_data['vertices'] and mesh_data['faces']:
                mesh = Mesh3D(
                    vertices=mesh_data['vertices'],
                    faces=mesh_data['faces']
                )
                result.append(mesh)
        
        return result
    except Exception as e:
        print(f"Error loading 3D model: {e}")
        # Return a simple cube as fallback
        from simple_3d import create_cube
        return [create_cube()]
`;
