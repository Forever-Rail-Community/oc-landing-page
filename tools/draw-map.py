# Draws the live maps' backgrounds: made-up terrain (contour lines, with the railroad running along the valley floors),
# two rivers, and the rails. Everything is worked out once for the whole drawing, so every map of the route shows the
# same hills and rivers.
#   python3 tools/draw-map.py
# The contour lines and rivers are saved as lines (src/data/terrain.json, drawn by Terrain.astro), so they're sharp at
# any size. The rails are saved as pictures with a see-through background (public/maps/rails-*.webp), scaled up from
# public/track.webp and firmed up, at several widths, so a browser can fetch the one that suits the screen instead of
# shrinking a huge one; src/data/maps.json lists each map's view and widths for LiveMap.astro and the puzzle.
# Needs numpy, scipy, scikit-image and Pillow.
import json
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage import measure

RAIL = (164, 168, 174)
# Each map: its place in the drawing's coordinates (x, y, width and height), and the widths to save its rails at.
MAPS = {
    'route': ((0, 0, 1440, 900), [1440, 2160, 2880, 4320]),  # the whole drawing, behind the opening (and on its side)
    'map': ((0, 310, 960, 590), [640, 960, 1280, 1920, 2560, 3840]),  # "Watch it run"
    'join': ((680, 220, 760, 340), [800, 1280, 1920, 2560, 3040]),  # behind the call to join
}
# Rivers, drawn by hand through the drawing's coordinates, each passing under the main line, then smoothed and given a
# little wander. Cold Creek runs past the junction; Kessler Run past Kessler.
RIVERS = [
    [(470, -20), (520, 150), (560, 300), (610, 400), (668, 480), (700, 550), (742, 630), (790, 710), (812, 790), (850, 920)],
    [(1080, -20), (1120, 120), (1150, 210), (1200, 280), (1240, 340), (1270, 390), (1320, 460), (1380, 570), (1460, 700)],
]
rng = np.random.default_rng(31)

# The rails drawing is at 2 pixels per unit.
gray = np.asarray(Image.open('public/track.webp').convert('L'), dtype=float)
on_rail = gray > np.median(gray) + 40
h, w = gray.shape

def smooth(points, per=40):
    p = np.array(points, dtype=float)
    p = np.vstack([p[0], p, p[-1]])
    out = []
    for i in range(1, len(p) - 2):  # Catmull-Rom
        for t in np.linspace(0, 1, per, endpoint=False):
            t2, t3 = t * t, t * t * t
            out.append(0.5 * ((2 * p[i]) + (-p[i - 1] + p[i + 1]) * t + (2 * p[i - 1] - 5 * p[i] + 4 * p[i + 1] - p[i + 2]) * t2
                              + (-p[i - 1] + 3 * p[i] - 3 * p[i + 1] + p[i + 2]) * t3))
    out.append(p[-2])
    return np.array(out)

rivers = []
river_mask = Image.new('L', (w, h), 0)
for points in RIVERS:
    river = smooth(points)
    river[:, 0] += ndimage.gaussian_filter1d(rng.standard_normal(len(river)), 12) * 30
    rivers.append(river)  # in units
    ImageDraw.Draw(river_mask).line([tuple(p * 2) for p in river], fill=255, width=4)
on_river = np.asarray(river_mask) > 0

# Height, at 2 pixels per unit: smooth rolling hills (about 120, 55 and 25 units across), pulled down to a valley floor
# wherever the railroad or a river runs, and higher ground away to the top. Its contour lines, in units.
def noise(across, amp):
    cells = max(2, round(900 / across))
    small = rng.standard_normal((cells, round(cells * w / h) + 1))
    return amp * ndimage.zoom(ndimage.gaussian_filter(small, 1), (h / small.shape[0], w / small.shape[1]), order=3)[:h, :w]
height = noise(120, 1.0) + noise(55, 0.45) + noise(25, 0.15)
height += np.linspace(1.2, -0.6, h)[:, None]
height -= 1.4 * np.exp(-((ndimage.distance_transform_edt(~on_rail) / 2 / 70) ** 2))
height -= 1.0 * np.exp(-((ndimage.distance_transform_edt(~on_river) / 2 / 45) ** 2))
contours = []
for i, level in enumerate(np.linspace(height.min(), height.max(), 40)[1:-1]):
    for c in measure.find_contours(height, level):
        if len(c) >= 30: contours.append((i % 5 == 0, c[:, ::-1] / 2))

def rails_at(view, width):
    # The rails for a view at a width, as a picture with a see-through background: the drawing scaled up smoothly, then
    # its soft edges firmed up, so they're sharp however large the map is drawn.
    x0, y0, vw, vh = view
    size = (width, round(width * vh / vw))
    crop = Image.fromarray(gray.astype(np.uint8)).crop((x0 * 2, y0 * 2, (x0 + vw) * 2, (y0 + vh) * 2))
    up = np.asarray(crop.resize(size, Image.BICUBIC if width >= vw * 2 else Image.LANCZOS), dtype=float)
    cover = np.clip((up - 55) / (135 - 55), 0, 1)
    rgba = np.dstack([np.broadcast_to(np.array(RAIL, dtype=np.uint8), cover.shape + (3,)), (cover * 255).round().astype(np.uint8)])
    return Image.fromarray(rgba, 'RGBA')

def path(points, tolerance):
    p = measure.approximate_polygon(np.asarray(points), tolerance)
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in p)

os.makedirs('public/maps', exist_ok=True)
for old in os.listdir('public/maps'):
    os.remove(os.path.join('public/maps', old))
manifest = {}
for name, (view, widths) in MAPS.items():
    for width in widths:
        img = rails_at(view, width)
        img.save(f'public/maps/rails-{name}-{width}.webp', quality=90, method=6)
        if name == 'route':  # on its side too, named by its long side like the rest
            img.rotate(90, expand=True).save(f'public/maps/rails-route-tall-{width}.webp', quality=90, method=6)
    manifest[name] = {'view': list(view), 'widths': widths}
    print(name, widths)
with open('src/data/maps.json', 'w') as f:
    json.dump(manifest, f, indent=2)
    f.write('\n')

# The contour lines (every fifth is drawn stronger) and rivers, for the whole drawing.
terrain = {
    'contours': [{'strong': strong, 'd': path(c, 0.25)} for strong, c in contours],
    'rivers': [path(r, 0.3) for r in rivers],
}
with open('src/data/terrain.json', 'w') as f:
    json.dump(terrain, f, separators=(',', ':'))
print('src/data/terrain.json', len(terrain['contours']), 'contours')
