#!/usr/bin/env python3
"""compare — reference and our version in one video (the "Claude Motion vs Katana" split the references use).

usage: compare.py <ref.mp4> <ours.mp4> [--region top|bottom|x:y:w:h] [--out f.mp4] [--layout h|v] [--labels 'REFERENCIA,KATANA NP']
                  [--height 1280] [--audio ref|ours]
Each side is scaled to the same height (h layout) or width (v layout), letterboxed on black, labelled with a pill
(rendered with Pillow: this ffmpeg has no drawtext), cut to the shorter duration. Audio from --audio (default: ours).
"""
import argparse, json, os, subprocess, sys, tempfile
from PIL import Image, ImageDraw, ImageFont


def probe(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration',
                        '-of', 'json', p], capture_output=True, text=True, check=True)
    d = json.loads(r.stdout); s = d['streams'][0]
    return s['width'], s['height'], float(d['format']['duration'])


def has_audio(p):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', p], capture_output=True, text=True)
    return bool(r.stdout.strip())


def pill(text, path, scale=1.0):
    try:
        f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', int(30 * scale))
    except Exception:
        f = ImageFont.load_default()
    d0 = ImageDraw.Draw(Image.new('RGBA', (10, 10)))
    w = int(d0.textlength(text, font=f)) + int(36 * scale); h = int(48 * scale)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=h // 2, fill=(214, 255, 61, 255))
    d.text((int(18 * scale), int(8 * scale)), text, font=f, fill=(10, 10, 10, 255))
    im.save(path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ref'); ap.add_argument('ours')
    ap.add_argument('--region'); ap.add_argument('--out'); ap.add_argument('--layout', default='h')
    ap.add_argument('--labels', default='REFERENCIA,KATANA NP'); ap.add_argument('--height', type=int, default=1280)
    ap.add_argument('--audio', default='ours')
    a = ap.parse_args()
    rw, rh, rd = probe(a.ref); ow, oh, od = probe(a.ours)
    crop = ''
    if a.region:
        named = {'top': (0, 0, rw, rh // 2), 'bottom': (0, rh // 2, rw, rh - rh // 2), 'left': (0, 0, rw // 2, rh), 'right': (rw // 2, 0, rw - rw // 2, rh)}
        x, y, w, h = named.get(a.region) or tuple(int(v) for v in a.region.split(':'))
        crop = f'crop={w}:{h}:{x}:{y},'; rw, rh = w, h
    dur = min(rd, od)
    H = a.height
    if a.layout == 'h':
        sw = lambda w, h: int(round(w * H / h / 2) * 2)
        fr = f'[0:v]{crop}scale={sw(rw, rh)}:{H},setsar=1[a];[1:v]scale={sw(ow, oh)}:{H},setsar=1[b];[a][b]hstack=inputs=2[s]'
        lx2 = sw(rw, rh) + 24
        pos = [(24, 24), (lx2, 24)]
    else:
        Wd = int(round(H * 9 / 16 / 2) * 2) * 2
        sh = lambda w, h: int(round(h * Wd / w / 2) * 2)
        fr = f'[0:v]{crop}scale={Wd}:{sh(rw, rh)},setsar=1[a];[1:v]scale={Wd}:{sh(ow, oh)},setsar=1[b];[a][b]vstack=inputs=2[s]'
        pos = [(24, 24), (24, sh(rw, rh) + 24)]
    labels = [s.strip() for s in a.labels.split(',')][:2]
    tmp = tempfile.mkdtemp(prefix='kcmp_')
    pills = []
    for i, lab in enumerate(labels):
        p = os.path.join(tmp, f'l{i}.png'); pill(lab, p, H / 1280); pills.append(p)
    inputs = ['-i', a.ref, '-i', a.ours] + sum((['-i', p] for p in pills), [])
    fr += f';[s][2:v]overlay={pos[0][0]}:{pos[0][1]}[s1];[s1][3:v]overlay={pos[1][0]}:{pos[1][1]}[v]'
    out = a.out or os.path.splitext(a.ours)[0] + '_vs_ref.mp4'
    cmd = ['ffmpeg', '-v', 'error', '-y'] + inputs + ['-filter_complex', fr, '-map', '[v]']
    src = 1 if a.audio == 'ours' else 0
    if has_audio([a.ref, a.ours][src]):
        cmd += ['-map', f'{src}:a', '-c:a', 'aac', '-b:a', '192k']
    cmd += ['-t', f'{dur:.3f}', '-c:v', 'libx264', '-crf', '18', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out]
    subprocess.run(cmd, check=True)
    print('compare:', out)


if __name__ == '__main__':
    main()
