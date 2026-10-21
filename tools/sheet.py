#!/usr/bin/env python3
"""sheet — labelled contact sheet of extracted frames (this ffmpeg has no drawtext). usage: sheet.py <dir s_*.jpg> <out.jpg> <fps> <cols>"""
import sys, os
from PIL import Image, ImageDraw
d, out, fps, cols = sys.argv[1], sys.argv[2], float(sys.argv[3]), int(sys.argv[4])
t0 = float(sys.argv[5]) if len(sys.argv) > 5 else 0.0
fs = sorted(x for x in os.listdir(d) if x.startswith('s_'))
ims = [Image.open(os.path.join(d, x)).convert('RGB') for x in fs]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (w + 4), rows * (h + 4)), 'white')
for k, im in enumerate(ims):
    D = ImageDraw.Draw(im); t = t0 + k / fps
    lab = f'{t:.2f}s' if fps > 2 else f'{t:.1f}s'
    D.rectangle([2, 2, 8 + 7 * len(lab), 16], fill=(0, 0, 0)); D.text((5, 3), lab, fill=(255, 230, 0))
    S.paste(im, ((k % cols) * (w + 4), (k // cols) * (h + 4)))
S.save(out, quality=86)
print('sheet:', out, f'({len(ims)} frames)')
