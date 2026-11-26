# Draws the live maps' backgrounds: made-up terrain (contour lines, with the railroad running along the valley floors),
# two rivers, and the rails from public/track.webp over them. The terrain is drawn once for the whole drawing, so every
# map of the route shows the same hills and rivers, then saved whole and cut into each map's view. Fixed seed, so it
# draws the same every time.
#   python3 tools/draw-map.py
# Makes public/route.webp (the whole route, behind the opening), public/route-tall.webp (the same on its side, for
# phones), public/map.webp ("Watch it run") and public/map-join.webp (behind the call to join).
# Needs numpy, scipy, scikit-image and Pillow.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from skimage import measure

S = 2  # pixels per drawing unit (the drawing is 1440 x 900)
BG = (24, 26, 30)
VIEWS = {  # x, y, width and height in the drawing
    'public/map.webp': (0, 310, 960, 590),
    'public/map-join.webp': (680, 220, 760, 340),
}
# Rivers, drawn by hand through the drawing's coordinates, each passing under the main line, then smoothed and given a
# little wander. Cold Creek runs past the junction; Kessler Run past Kessler.
RIVERS = [
    [(470, -20), (520, 150), (560, 300), (610, 400), (668, 480), (700, 550), (742, 630), (790, 710), (812, 790), (850, 920)],
    [(1080, -20), (1120, 120), (1150, 210), (1200, 280), (1240, 340), (1270, 390), (1320, 460), (1380, 570), (1460, 700)],
]
rng = np.random.default_rng(31)

rails = Image.open('public/track.webp').convert('RGB')
gray = np.asarray(rails.convert('L'), dtype=float)
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
    river *= S
    rivers.append(river)
    ImageDraw.Draw(river_mask).line([tuple(p) for p in river], fill=255, width=4)
on_river = np.asarray(river_mask) > 0

# Height: smooth rolling hills (about 120, 55 and 25 drawing units across), pulled down to a valley floor wherever the
# railroad or a river runs, and higher ground away to the top.
def noise(across, amp):
    cells = max(2, round(900 / across))
    small = rng.standard_normal((cells, round(cells * w / h) + 1))
    return amp * ndimage.zoom(ndimage.gaussian_filter(small, 1), (h / small.shape[0], w / small.shape[1]), order=3)[:h, :w]
height = noise(120, 1.0) + noise(55, 0.45) + noise(25, 0.15)
height += np.linspace(1.2, -0.6, h)[:, None]
height -= 1.4 * np.exp(-((ndimage.distance_transform_edt(~on_rail) / S / 70) ** 2))
height -= 1.0 * np.exp(-((ndimage.distance_transform_edt(~on_river) / S / 45) ** 2))

img = Image.new('RGB', (w, h), BG)
draw = ImageDraw.Draw(img)
levels = np.linspace(height.min(), height.max(), 40)[1:-1]
for i, level in enumerate(levels):
    strong = i % 5 == 0
    for c in measure.find_contours(height, level):
        if len(c) < 30: continue
        draw.line([(x, y) for y, x in c[::2]], fill=(48, 56, 52) if strong else (36, 42, 40), width=3 if strong else 2)
for river in rivers:
    draw.line([tuple(p) for p in river], fill=(30, 50, 66), width=12, joint='curve')
img = img.filter(ImageFilter.GaussianBlur(0.6))

# The rails over the terrain, saved whole, on its side, and cut into each view.
route = Image.fromarray(np.maximum(np.asarray(img), np.asarray(rails)))
route.save('public/route.webp', quality=85, method=6)
route.rotate(90, expand=True).save('public/route-tall.webp', quality=85, method=6)
for out, (x, y, vw, vh) in VIEWS.items():
    route.crop((x * S, y * S, (x + vw) * S, (y + vh) * S)).save(out, quality=88, method=6)
print('drew', ['public/route.webp', 'public/route-tall.webp', *VIEWS])
