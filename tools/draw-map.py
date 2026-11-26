# Draws public/map.webp, the "Watch it run" picture's background: made-up terrain (contour lines, with the railroad
# running along the valley floors), a river, and the rails from public/track.webp over them. Covers the picture's view
# of the drawing (x 0 to 960, y 310 to 900), at twice that size. Fixed seed, so it draws the same every time.
#   python3 tools/draw-map.py
# Needs numpy, scipy, scikit-image and Pillow.
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage
from skimage import measure

X0, Y0, W, H = 0, 310, 960, 590  # the view, in the drawing's coordinates
S = 2  # pixels per drawing unit
BG = (24, 26, 30)
rng = np.random.default_rng(31)

rails = Image.open('public/track.webp').convert('RGB').crop((X0 * S, Y0 * S, (X0 + W) * S, (Y0 + H) * S))
gray = np.asarray(rails.convert('L'), dtype=float)
on_rail = gray > np.median(gray) + 40

# A river, drawn by hand through the view's coordinates: in from the top, under the main line, and out to the bottom
# right, with a little wander. Smoothed through its points.
RIVER = [(560, -10), (610, 90), (668, 170), (700, 240), (742, 320), (790, 400), (812, 480), (850, 600)]
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
river = smooth(RIVER)
river += np.stack([ndimage.gaussian_filter1d(rng.standard_normal(len(river)), 12) * 30, np.zeros(len(river))], axis=1)
river *= S
river_mask = Image.new('L', (int(W * S), int(H * S)), 0)
ImageDraw.Draw(river_mask).line([tuple(p) for p in river], fill=255, width=4)
on_river = np.asarray(river_mask) > 0

# Height: smooth rolling hills, pulled down to a valley floor wherever the railroad runs.
h, w = gray.shape
def noise(cells, amp):
    small = rng.standard_normal((cells, int(cells * w / h) + 1))
    return amp * ndimage.zoom(ndimage.gaussian_filter(small, 1), (h / small.shape[0], w / small.shape[1]), order=3)[:h, :w]
height = noise(5, 1.0) + noise(11, 0.45) + noise(23, 0.15)
height += np.linspace(0.8, -0.4, h)[:, None]  # higher ground to the top of the view
valley = ndimage.distance_transform_edt(~on_rail) / S  # drawing units from the nearest rail
height -= 1.4 * np.exp(-((valley / 70) ** 2))
height -= 1.0 * np.exp(-((ndimage.distance_transform_edt(~on_river) / S / 45) ** 2))  # the river cuts its own valley

img = Image.new('RGB', (w, h), BG)
draw = ImageDraw.Draw(img)
levels = np.linspace(height.min(), height.max(), 26)[1:-1]
for i, level in enumerate(levels):
    strong = i % 5 == 0
    for c in measure.find_contours(height, level):
        if len(c) < 30: continue
        draw.line([(x, y) for y, x in c[::2]], fill=(48, 56, 52) if strong else (36, 42, 40), width=3 if strong else 2)

draw.line([tuple(p) for p in river], fill=(30, 50, 66), width=12, joint='curve')
img = img.filter(ImageFilter.GaussianBlur(0.6))

# The rails over the terrain.
out = Image.fromarray(np.maximum(np.asarray(img), np.asarray(rails)))
out.save('public/map.webp', quality=88, method=6)
print('public/map.webp', out.size)
