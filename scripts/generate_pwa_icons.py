import zlib
import struct
import math

def write_png(filename, width, height, pixels):
    """
    pixels: list of RGBA tuples (r, g, b, a) of length width * height
    """
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type None
        for x in range(width):
            r, g, b, a = pixels[y * width + x]
            raw_data.extend([r, g, b, a])
    
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xffffffff
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', crc)

    header = b'\x89PNG\r\n\x1a\n'
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw_data), 9)

    with open(filename, 'wb') as f:
        f.write(header)
        f.write(chunk(b'IHDR', ihdr))
        f.write(chunk(b'IDAT', idat))
        f.write(chunk(b'IEND', b''))

def draw_icon(size, is_maskable=False):
    width = height = size
    pixels = []
    
    # Brand colors
    # Navy: #012871 -> (1, 40, 113)
    # Orange: #f35500 -> (243, 85, 0)
    # White: (255, 255, 255)
    
    scale = size / 512.0
    # Center and scaling
    cx = width / 2.0
    cy = height / 2.0
    
    for y in range(height):
        for x in range(width):
            # Background
            r, g, b, a = 1, 40, 113, 255
            
            # Distance from center
            dx = x - cx
            dy = y - cy
            dist = math.sqrt(dx*dx + dy*dy)
            
            # Mountain peak / Triangle
            # Normalized coords
            nx = (x - cx) / scale
            ny = (y - cy) / scale
            
            # Draw Stylized Mountain & Compass Peak
            # Peak 1: Triangle from top (0, -180) to (-130, 70), (130, 70)
            in_triangle = False
            if ny >= -180 and ny <= 70:
                half_w = (ny + 180) * (130.0 / 250.0)
                if abs(nx) <= half_w:
                    in_triangle = True
                    r, g, b = 243, 85, 0 # Orange
                    
                    # Inner white peak highlight
                    if ny >= -120 and ny <= 50:
                        inner_w = (ny + 120) * (85.0 / 170.0)
                        if abs(nx) <= inner_w:
                            r, g, b = 255, 255, 255
                            
            # Compass Circle at bottom: cy + 130
            c_dy = ny - 130
            c_dist = math.sqrt(nx*nx + c_dy*c_dy)
            
            if c_dist <= 45:
                r, g, b = 243, 85, 0
                # Diamond compass needle
                if (abs(nx) + abs(c_dy)) <= 22:
                    r, g, b = 255, 255, 255
                if c_dist <= 15:
                    r, g, b = 1, 40, 113
                    
            pixels.append((r, g, b, a))
            
    return pixels

def main():
    print("Generating PWA PNG icons...")
    write_png('public/pwa-192x192.png', 192, 192, draw_icon(192))
    write_png('public/pwa-512x512.png', 512, 512, draw_icon(512))
    write_png('public/pwa-maskable-512x512.png', 512, 512, draw_icon(512, is_maskable=True))
    write_png('public/apple-touch-icon.png', 180, 180, draw_icon(180))
    write_png('public/favicon.ico', 64, 64, draw_icon(64))
    print("PWA PNG icons generated successfully!")

if __name__ == '__main__':
    main()
