# Finds where rails branch in the rails drawing (the switches), within the "Watch it run" picture's view, and prints
# them for MapShot.astro's data-points.
#   python3 tools/find-switches.py
# Needs numpy, scipy, scikit-image and Pillow.
import numpy as np
from PIL import Image
from scipy import ndimage
from skimage.morphology import skeletonize

X0, Y0, X1, Y1 = 0, 310, 960, 900  # the view, in the drawing's coordinates (the image is twice that)

gray = np.asarray(Image.open('public/track.webp').convert('L'), dtype=float)
rails = skeletonize(gray > np.median(gray) + 40)
neighbors = ndimage.convolve(rails.astype(int), np.ones((3, 3), int), mode='constant') - 1
forks = rails & (neighbors >= 3)
groups, count = ndimage.label(ndimage.binary_dilation(forks, iterations=4))  # one switch per cluster of fork pixels
points = [(x / 2, y / 2) for y, x in ndimage.center_of_mass(forks, groups, range(1, count + 1))]
print(' '.join(f'{x:.0f},{y:.0f}' for x, y in points if X0 <= x <= X1 and Y0 <= y <= Y1))
