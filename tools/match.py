#!/usr/bin/env python3
"""match — same-timecode comparison sheets: the reference frame on top, ours below, at identical times.

The reference-first check: when a film keeps the reference's timing, every pair must agree in layout, letterforms,
materials, layering and motion phase. `katana compare` gives a side-by-side VIDEO; this gives pages you can read.

usage:
  match.py <ref.mp4> <ours.mp4> [--every 0.5] [--from s] [--to s] [--region top|bottom|left|right|x:y:w:h]
           [--offset s] [--cols 6] [--rows 3] [--w 320] [--out DIR]
  --region  crop of the REFERENCE (split-screen comparison posts: top)
  --offset  seconds added to OUR time (ours starts later than the reference: positive)
  --out     folder for match_01.jpg, match_02.jpg … (default: <ours stem>_match/ next to our video)
Needs ffmpeg/ffprobe + Pillow.
"""
import argparse, json, math, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw


def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=width,height,avg_frame_rate:format=duration', '-of', 'json', path],
                       capture_output=True, text=True, check=True)
    d = json.loads(r.stdout); s = d['streams'][0]
    n, den = (int(x) for x in s['avg_frame_rate'].split('/'))
    return int(s['width']), int(s['height']), (n / den if den else 30.0), float(d['format']['duration'])


def crop_filter(region, W, H):
    if not region: return None
    named = {'top': (0, 0, W, H // 2), 'bottom': (0, H // 2, W, H - H // 2), 'left': (0, 0, W // 2, H), 'right': (W // 2, 0, W - W // 2, H)}
    x, y, w, h = named[region] if region in named else (int(v) for v in region.split(':'))
    return f'crop={w}:{h}:{x}:{y}'


def grab(path, t, w, crop, out):
    """One frame at time t (seek to the frame that is on screen at t), scaled to width w."""
    vf = ','.join(f for f in [crop, f'scale={w}:-2:flags=lanczos'] if f)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{max(0, t):.4f}', '-i', path, '-frames:v', '1', '-vf', vf, '-q:v', '3', out], check=False)
    return Image.open(out).convert('RGB') if os.path.exists(out) else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ref'); ap.add_argument('ours')
    ap.add_argument('--every', type=float, default=.5); ap.add_argument('--from', dest='t0', type=float, default=0.0)
    ap.add_argument('--to', dest='t1', type=float, default=None); ap.add_argument('--region', default=None)
    ap.add_argument('--offset', type=float, default=0.0); ap.add_argument('--cols', type=int, default=6)
    ap.add_argument('--rows', type=int, default=3); ap.add_argument('--w', type=int, default=320); ap.add_argument('--out', default=None)
    a = ap.parse_args()
    rw, rh, rfps, rdur = probe(a.ref); ow, oh, ofps, odur = probe(a.ours)
    crop = crop_filter(a.region, rw, rh)
    end = min(rdur, odur - a.offset) if a.t1 is None else a.t1
    n = max(1, int(math.floor((end - a.t0) / a.every + 1e-6)) + 1)
    # sample mid-frame so a time on a cut shows the incoming shot in both videos
    times = [a.t0 + i * a.every for i in range(n) if a.t0 + i * a.every < end - 1e-3]
    out = a.out or os.path.splitext(a.ours)[0] + '_match'
    os.makedirs(out, exist_ok=True)
    tmp = tempfile.mkdtemp(prefix='kmatch_')
    pairs = []
    for i, t in enumerate(times):
        r = grab(a.ref, t + .5 / rfps, a.w, crop, os.path.join(tmp, f'r_{i:04d}.jpg'))
        o = grab(a.ours, t + a.offset + .5 / ofps, a.w, None, os.path.join(tmp, f'o_{i:04d}.jpg'))
        pairs.append((t, r, o))
    rh2 = max((p[1].size[1] for p in pairs if p[1]), default=180); oh2 = max((p[2].size[1] for p in pairs if p[2]), default=180)
    cw, ch, lab = a.w + 8, rh2 + oh2 + 30, 22
    per = a.cols * a.rows; pages = []
    for pg in range(0, len(pairs), per):
        chunk = pairs[pg:pg + per]; rows = (len(chunk) + a.cols - 1) // a.cols
        S = Image.new('RGB', (a.cols * cw, rows * ch), (24, 24, 26)); D = ImageDraw.Draw(S)
        for k, (t, r, o) in enumerate(chunk):
            x, y = (k % a.cols) * cw + 4, (k // a.cols) * ch
            D.text((x, y + 5), f'{t:6.2f}s   REF ↑   OURS ↓', fill=(255, 220, 60))
            if r: S.paste(r, (x, y + lab))
            if o: S.paste(o, (x, y + lab + rh2 + 4))
        p = os.path.join(out, f'match_{len(pages) + 1:02d}.jpg'); S.save(p, quality=88); pages.append(p)
    print(f'match: {len(pairs)} pairs every {a.every}s ({a.t0:.2f}–{end:.2f}s), ref {rw}x{rh}@{rfps:.2f} vs ours {ow}x{oh}@{ofps:.2f}')
    if abs(rdur - (odur - a.offset)) > 1.5 / min(rfps, ofps):
        print(f'  ! durations differ: ref {rdur:.3f}s vs ours {odur - a.offset:.3f}s (a film that keeps the reference timing must match)')
    for p in pages: print('  ' + p)


if __name__ == '__main__':
    main()
