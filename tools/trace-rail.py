# Follows one rail in the rails drawing and prints it as an SVG path, for the trains' tracks.
#   python3 tools/trace-rail.py public/track.webp X Y HEADING
# X and Y are a point on the rail in the drawing's 1440 x 900 coordinates (the image is drawn at twice that), and
# HEADING is the way to go in degrees (0 is right, 90 is down). It keeps as straight as the rail allows, so at a switch
# it stays on the straight route. Needs numpy and Pillow.
import sys, math, json
import numpy as np
from PIL import Image
IM = np.asarray(Image.open(sys.argv[1]).convert('L'), dtype=float)
H, W = IM.shape

def sample(x, y):
    if not (0 <= x < W - 1 and 0 <= y < H - 1): return 0.0
    x0, y0 = int(x), int(y); fx, fy = x - x0, y - y0
    a = IM[y0, x0]*(1-fx)*(1-fy) + IM[y0, x0+1]*fx*(1-fy) + IM[y0+1, x0]*(1-fx)*fy + IM[y0+1, x0+1]*fx*fy
    return a

BG = float(np.median(IM))

def trace(x, y, deg, steps=4000, step=2.0, keep=0.0):
    d = (math.cos(math.radians(deg)), math.sin(math.radians(deg)))
    pts = [(x, y)]
    misses = 0
    for _ in range(steps):
        best, bd = -1e9, d
        for t in np.arange(-10, 10.5, 0.5):
            r = math.radians(t)
            c = (d[0]*math.cos(r) - d[1]*math.sin(r), d[0]*math.sin(r) + d[1]*math.cos(r))
            v = sum(sample(x + c[0]*k, y + c[1]*k) for k in (4, 7, 10, 14, 18)) - abs(t) * keep
            if v > best: best, bd = v, c
        nx, ny = x + bd[0]*step, y + bd[1]*step
        # Center on the rail.
        n = (-bd[1], bd[0]); ws = [(o, sample(nx + n[0]*o, ny + n[1]*o) - BG) for o in np.arange(-2, 2.01, 0.25)]
        tot = sum(max(0, w) for _, w in ws)
        if tot > 0:
            off = sum(o*max(0, w) for o, w in ws) / tot; nx += n[0]*off; ny += n[1]*off
        if sample(nx, ny) - BG < 15: misses += 1
        else: misses = 0
        if misses > 6 or not (2 < nx < W - 2 and 2 < ny < H - 2): break
        nd = (nx - x, ny - y); L = math.hypot(*nd); d = (nd[0]/L, nd[1]/L)
        x, y = nx, ny; pts.append((x, y))
    return pts

def simplify(pts, tol):
    # Drops points the path doesn't need (Ramer-Douglas-Peucker).
    if len(pts) < 3: return pts
    a, b = np.array(pts[0]), np.array(pts[-1]); ab = b - a; L = np.hypot(*ab) or 1
    dists = [abs(ab[0]*(p[1]-a[1]) - ab[1]*(p[0]-a[0])) / L for p in pts[1:-1]]
    i = int(np.argmax(dists)) + 1
    if dists[i-1] > tol: return simplify(pts[:i+1], tol)[:-1] + simplify(pts[i:], tol)
    return [pts[0], pts[-1]]

if __name__ == '__main__':
    x, y, deg = (float(v) for v in sys.argv[2:5])
    keep = float(sys.argv[5]) if len(sys.argv) > 5 else 2.0
    pts = trace(x*2, y*2, deg, keep=keep)
    s = simplify([(px/2, py/2) for px, py in pts], 0.35)
    print('M' + ' L'.join(f'{px:.1f} {py:.1f}' for px, py in s))
