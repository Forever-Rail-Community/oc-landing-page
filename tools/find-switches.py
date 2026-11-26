# Finds where rails branch in the rails drawing (the switches) within a view, and prints them for a live map's
# data-points. The view is x, y, width and height in the drawing's coordinates.
#   python3 tools/find-switches.py 0 310 960 590
# Needs numpy, scipy, scikit-image and Pillow.
import sys
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize

X0, Y0, W, H = (float(v) for v in sys.argv[1:5])  # the image is twice the drawing's coordinates
X1, Y1 = X0 + W, Y0 + H

gray = np.asarray(Image.open('public/track.webp').convert('L'), dtype=float)
rails = skeletonize(gray > np.median(gray) + 40)
neighbors = ndimage.convolve(rails.astype(int), np.ones((3, 3), int), mode='constant') - 1
forks = rails & (neighbors >= 3)
groups, count = ndimage.label(ndimage.binary_dilation(forks, iterations=4))  # one switch per cluster of fork pixels
points = [(x / 2, y / 2) for y, x in ndimage.center_of_mass(forks, groups, range(1, count + 1))]
print(' '.join(f'{x:.0f},{y:.0f}' for x, y in points if X0 <= x <= X1 and Y0 <= y <= Y1))
