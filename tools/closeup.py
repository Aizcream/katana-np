#!/usr/bin/env python3
"""closeup — read a reference at NATIVE size and measure it, frame by frame.

Why this exists (np_puntos, 2026-11-14): the every-frame pages of `katana analyze` show each frame about 200 px wide. At that
size a word that lands 13 % too big and settles in three frames looks like a hard cut, a dot that beats every half beat looks
still, a dotted outline looks solid and pixel type looks like a normal font. All of that was missed until the frames were
read at native size and MEASURED. Pages are for structure; entrances, pulses, settles and sizes are read here.

  closeup.py frames <video> <dir> [--crop x,y,w,h]             every frame as PNG (f0000.png …), cropped to the film area
  closeup.py sheet  <dir> <out.jpg> <a> <b> [--step 1] [--cols 4] [--w 480] [--crop x0,y0,x1,y1]
                                                                consecutive frames at a readable size, numbered
  closeup.py pairs  <refdir> <oursdir> <out.jpg> f1,f2,… [--cols 5] [--w 384]
                                                                the reference above ours, same frame numbers
  closeup.py text   <dir> [a] [b] [--all] [--skip REGEX]        what text is on screen in every frame and its box (OCR);
                                                                prints a frame only when the text or its box changes
  closeup.py box    <dir> <a> <b> [--band y0,y1] [--x x0,x1] [--k 13]
                                                                box of the strokes thicker than k px per frame: the SCALE
                                                                curve of a word (halftone and thin lines do not count)
  closeup.py blobs  <dir> <a> <b> [--min 26] [--max 600] [--roi x0,y0,x1,y1] [--n 8]
                                                                every solid shape per frame, biggest first: centre and size
                                                                (a dot's pulses, drops, settles; a pill growing from a dot)

Typical pass: frames → sheet over every busy stretch (20 frames a sheet) → text for all typing and captions → box for every
big word → blobs for the hero object. Write what you measure into refs/analysis/<ref>/native_pass.md as per-frame tables, and
put those tables in the film: the reference's own numbers, not an easing that looks similar.
"""
import argparse, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def _img():
    from PIL import Image, ImageDraw
    return Image, ImageDraw


def _gray(path, wm=None):
    import numpy as np
    Image, _ = _img()
    g = np.asarray(Image.open(path).convert('L')).astype(np.int16).copy()
    if wm:  # a corner watermark would count as ink: paint it with the field colour
        x0, y0, x1, y1 = wm; g[y0:y1, x0:x1] = g[min(g.shape[0] - 1, y1 + 120), 60]
    return g


def _mask(g):
    import numpy as np
    inv = np.median(g) > 128                       # paper field → the ink is dark
    return ((g < 100) if inv else (g > 155)), inv


def cmd_frames(a):
    os.makedirs(a.dir, exist_ok=True)
    vf = []
    if a.crop: x, y, w, h = a.crop.split(','); vf = ['-vf', f'crop={w}:{h}:{x}:{y}']
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.video, *vf, '-start_number', '0', os.path.join(a.dir, 'f%04d.png')], check=True)
    print(len([f for f in os.listdir(a.dir) if f.endswith('.png')]), 'frames →', a.dir)


def _cell(path, w, crop=None, label=None):
    Image, ImageDraw = _img()
    im = Image.open(path).convert('RGB')
    if crop: im = im.crop(crop)
    im = im.resize((w, round(w * im.height / im.width)), Image.LANCZOS)
    if label is not None:
        d = ImageDraw.Draw(im); d.rectangle([0, 0, 44, 15], fill=(255, 40, 40)); d.text((4, 2), str(label), fill=(255, 255, 255))
    return im


def cmd_sheet(a):
    Image, _ = _img()
    crop = tuple(int(v) for v in a.crop.split(',')) if a.crop else None
    ims = [_cell(os.path.join(a.dir, f'f{f:04d}.png'), a.w, crop, f) for f in range(a.a, a.b + 1, a.step)]
    rows = (len(ims) + a.cols - 1) // a.cols; ch = ims[0].height
    sh = Image.new('RGB', (a.cols * (a.w + 3), rows * (ch + 3)), (255, 0, 0))
    for i, im in enumerate(ims): sh.paste(im, ((i % a.cols) * (a.w + 3), (i // a.cols) * (ch + 3)))
    sh.save(a.out, quality=86); print(a.out, f'({len(ims)} frames)')


def cmd_pairs(a):
    Image, _ = _img()
    fr = [int(v) for v in a.frames.split(',')]; ch = None; cells = []
    for f in fr:
        r = _cell(os.path.join(a.ref, f'f{f:04d}.png'), a.w, None, f); o = _cell(os.path.join(a.ours, f'f{f:04d}.png'), a.w)
        ch = r.height; cells.append((r, o))
    rows = (len(fr) + a.cols - 1) // a.cols
    sh = Image.new('RGB', (a.cols * (a.w + 3), rows * (2 * ch + 9)), (255, 0, 0))
    for i, (r, o) in enumerate(cells):
        x, y = (i % a.cols) * (a.w + 3), (i // a.cols) * (2 * ch + 9); sh.paste(r, (x, y)); sh.paste(o, (x, y + ch + 3))
    sh.save(a.out, quality=86); print(a.out, f'({len(fr)} pairs: reference above, ours below)')


def cmd_text(a):
    ocr = os.path.join(HERE, 'bin', 'ocr')
    files = sorted(os.path.join(a.dir, f) for f in os.listdir(a.dir) if re.match(r'f\d+\.png$', f))
    files = [p for p in files if a.a <= int(re.search(r'f(\d+)\.png', p).group(1)) <= a.b]
    cache = os.path.join(a.dir, 'ocr.jsonl'); rows = {}
    if os.path.exists(cache):
        for ln in open(cache):
            r = json.loads(ln); rows[os.path.basename(r['file'])] = r
    todo = [p for p in files if os.path.basename(p) not in rows]
    for i in range(0, len(todo), 200):
        out = subprocess.run([ocr, *todo[i:i + 200]], capture_output=True, text=True).stdout
        with open(cache, 'a') as fh:
            for ln in out.splitlines():
                if ln.startswith('{'): r = json.loads(ln); rows[os.path.basename(r['file'])] = r; fh.write(ln + '\n')
    skip = re.compile(a.skip) if a.skip else None; prev = None
    for p in files:
        f = int(re.search(r'f(\d+)\.png', p).group(1)); r = rows.get(os.path.basename(p))
        if not r: continue
        ls = [(l['text'], *l['box']) for l in r['lines'] if len(re.findall(r'[A-Za-zÀ-ÿ0-9]', l['text'])) >= 2 and not (skip and skip.search(l['text']))]
        same = prev is not None and len(ls) == len(prev) and all(q[0] == s[0] and all(abs(q[i] - s[i]) <= 7 for i in range(1, 5)) for q, s in zip(ls, prev))
        if a.all or not same: print(f, ' | '.join(f'{t!r} {x},{y} {w}x{h}' for t, x, y, w, h in ls))
        prev = ls


def cmd_box(a):
    import numpy as np
    y0, y1 = (int(v) for v in a.band.split(',')); x0, x1 = (int(v) for v in a.x.split(',')); k = a.k
    for f in range(a.a, a.b + 1):
        m, inv = _mask(_gray(os.path.join(a.dir, f'f{f:04d}.png'))); m = m[y0:y1, x0:x1].astype(np.int32)
        ii = np.zeros((m.shape[0] + 1, m.shape[1] + 1), np.int32); ii[1:, 1:] = m.cumsum(0).cumsum(1)
        s = ii[k:, k:] - ii[:-k, k:] - ii[k:, :-k] + ii[:-k, :-k]; ys, xs = np.nonzero(s == k * k)
        if len(xs) < 20: print(f, '-'); continue
        L, R, T, B = xs.min() + x0, xs.max() + k + x0, ys.min() + y0, ys.max() + k + y0
        print(f, 'dark' if inv else 'light', f'x {L}-{R} w {R - L}  y {T}-{B} h {B - T}  centre {(L + R) / 2:.1f},{(T + B) / 2:.1f}')


def _blobs(m):
    """connected regions of a boolean mask, by runs: [x0, y0, x1, y1, area]"""
    import numpy as np
    par, box, prev = [], [], []
    def find(i):
        while par[i] != i: par[i] = par[par[i]]; i = par[i]
        return i
    for y in range(m.shape[0]):
        r = m[y]
        if not r.any(): prev = []; continue
        d = np.diff(np.concatenate(([0], r.view(np.int8), [0]))); st = np.nonzero(d == 1)[0].tolist(); en = np.nonzero(d == -1)[0].tolist()
        cur, j = [], 0
        for s, e in zip(st, en):
            lab = -1
            while j < len(prev) and prev[j][1] <= s: j += 1
            k = j
            while k < len(prev) and prev[k][0] < e:
                pl = find(prev[k][2])
                if lab < 0: lab = pl
                elif pl != lab: par[pl] = lab
                k += 1
            if lab < 0: lab = len(par); par.append(lab); box.append([s, y, e, y + 1, 0])
            b = box[lab]; b[0] = min(b[0], s); b[2] = max(b[2], e); b[3] = y + 1; b[4] += e - s
            cur.append((s, e, lab))
        prev = cur
    out = {}
    for i, b in enumerate(box):
        r = find(i); o = out.setdefault(r, box[r])
        if o is not b: o[0] = min(o[0], b[0]); o[1] = min(o[1], b[1]); o[2] = max(o[2], b[2]); o[3] = max(o[3], b[3]); o[4] += b[4]
    return list(out.values())


def cmd_blobs(a):
    import numpy as np
    roi = tuple(int(v) for v in a.roi.split(','))
    for f in range(a.a, a.b + 1):
        m, inv = _mask(_gray(os.path.join(a.dir, f'f{f:04d}.png'))); m = np.ascontiguousarray(m[roi[1]:roi[3], roi[0]:roi[2]])
        bs = [o for o in _blobs(m) if min(o[2] - o[0], o[3] - o[1]) >= a.min and max(o[2] - o[0], o[3] - o[1]) <= a.max]
        bs.sort(key=lambda o: -o[4])
        print(f, 'dark' if inv else 'light', ' '.join(f'[{(o[0] + o[2]) / 2 + roi[0]:.0f},{(o[1] + o[3]) / 2 + roi[1]:.0f} {o[2] - o[0]}x{o[3] - o[1]}]' for o in bs[:a.n]))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sp = ap.add_subparsers(dest='cmd', required=True)
    p = sp.add_parser('frames'); p.add_argument('video'); p.add_argument('dir'); p.add_argument('--crop'); p.set_defaults(fn=cmd_frames)
    p = sp.add_parser('sheet'); p.add_argument('dir'); p.add_argument('out'); p.add_argument('a', type=int); p.add_argument('b', type=int)
    p.add_argument('--step', type=int, default=1); p.add_argument('--cols', type=int, default=4); p.add_argument('--w', type=int, default=480); p.add_argument('--crop'); p.set_defaults(fn=cmd_sheet)
    p = sp.add_parser('pairs'); p.add_argument('ref'); p.add_argument('ours'); p.add_argument('out'); p.add_argument('frames')
    p.add_argument('--cols', type=int, default=5); p.add_argument('--w', type=int, default=384); p.set_defaults(fn=cmd_pairs)
    p = sp.add_parser('text'); p.add_argument('dir'); p.add_argument('a', type=int, nargs='?', default=0); p.add_argument('b', type=int, nargs='?', default=10 ** 6)
    p.add_argument('--all', action='store_true'); p.add_argument('--skip'); p.set_defaults(fn=cmd_text)
    p = sp.add_parser('box'); p.add_argument('dir'); p.add_argument('a', type=int); p.add_argument('b', type=int)
    p.add_argument('--band', default='0,1080'); p.add_argument('--x', default='0,1920'); p.add_argument('--k', type=int, default=13); p.set_defaults(fn=cmd_box)
    p = sp.add_parser('blobs'); p.add_argument('dir'); p.add_argument('a', type=int); p.add_argument('b', type=int)
    p.add_argument('--min', type=int, default=26); p.add_argument('--max', type=int, default=600); p.add_argument('--roi', default='0,0,1920,1080'); p.add_argument('--n', type=int, default=8); p.set_defaults(fn=cmd_blobs)
    a = ap.parse_args(); a.fn(a)


if __name__ == '__main__':
    main()
