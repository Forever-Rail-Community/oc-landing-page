# Draws the live maps' backgrounds: made-up terrain (contour lines, with the railroad running along the valley floors),
# two rivers, and the rails over them. Everything is worked out once for the whole drawing, so every map of the route
# shows the same hills and rivers, then drawn as lines at each map's own size (at twice the size and scaled down, to
# smooth their edges), with the rails from public/track.webp scaled up and sharpened over them. Fixed seed, so it draws
# the same every time.
#   python3 tools/draw-map.py
# Makes public/route.webp (the whole route, behind the opening), public/route-tall.webp (the same on its side, for
# phones), public/map.webp ("Watch it run") and public/map-join.webp (behind the call to join).
# Needs numpy, scipy, scikit-image and Pillow.
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage import measure

SMOOTHING = 2  # lines are drawn at this many times the size, then scaled down
BG = (24, 26, 30)
CONTOUR, CONTOUR_STRONG = (36, 42, 40), (50, 58, 54)
RIVER = (30, 50, 66)
RAIL = (164, 168, 174)
# Each map: its place in the drawing's coordinates (x, y, width and height), and pixels per drawing unit. The maps
# drawn larger on the page get more.
MAPS = {
    'public/route.webp': ((0, 0, 1440, 900), 2),
    'public/map.webp': ((0, 310, 960, 590), 4),
    'public/map-join.webp': ((680, 220, 760, 340), 4),
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

def rails_at(view, scale):
    # The rails for a view at its size: the drawing scaled up smoothly, then its soft edges firmed up, so they're sharp
    # however large the map is drawn. Returned as how much rail covers each pixel, 0 to 1.
    x0, y0, vw, vh = view
    crop = Image.fromarray(gray.astype(np.uint8)).crop((x0 * 2, y0 * 2, (x0 + vw) * 2, (y0 + vh) * 2))
    up = np.asarray(crop.resize((round(vw * scale), round(vh * scale)), Image.BICUBIC), dtype=float)
    return np.clip((up - 55) / (135 - 55), 0, 1)[..., None]

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

def draw(view, scale):
    x0, y0, vw, vh = view
    k = scale * SMOOTHING
    img = Image.new('RGB', (round(vw * k), round(vh * k)), BG)
    pen = ImageDraw.Draw(img)
    def line(points, color, width):
        p = (np.asarray(points) - (x0, y0)) * k
        if not ((p[:, 0] > -50).any() and (p[:, 0] < img.width + 50).any() and (p[:, 1] > -50).any() and (p[:, 1] < img.height + 50).any()):
            return
        pen.line([tuple(q) for q in p], fill=color, width=max(1, round(width * k)), joint='curve')
    for strong, c in contours:
        line(c, CONTOUR_STRONG if strong else CONTOUR, 1.2 if strong else 0.8)
    for river in rivers:
        line(river, RIVER, 5.5)
    terrain = np.asarray(img.resize((round(vw * scale), round(vh * scale)), Image.LANCZOS), dtype=float)
    cover = rails_at(view, scale)
    return Image.fromarray((terrain * (1 - cover) + np.array(RAIL) * cover).round().astype(np.uint8))

for out, (view, scale) in MAPS.items():
    img = draw(view, scale)
    img.save(out, quality=82, method=6)
    if out == 'public/route.webp':
        img.rotate(90, expand=True).save('public/route-tall.webp', quality=82, method=6)
    print(out, img.size)
