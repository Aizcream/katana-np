#!/usr/bin/env python3
"""analyze_ref — take a reference edit apart so it can be rebuilt with other assets (the Katana idea: "start from a reference").

usage:
  analyze_ref.py <video> [--out DIR] [--region top|bottom|left|right|x:y:w:h] [--no-ocr] [--sheet-fps 2]

Writes to DIR (default: <video stem>_analysis/ next to the video):
  analysis.json   meta, shots (cuts), fast windows (where the cuts hide), motion energy per frame, audio tempo / beats /
                  strong accents / loudness, cut↔beat alignment, palette and luma per shot, on-screen text per shot (OCR).
  sheet.jpg       overview contact sheet (--sheet-fps frames per second, 10 per row).
  shots.jpg       one row per shot: first frame · middle · last frame, with its number and times.
  cuts/NN.jpg     9-frame strip around every cut and every fast window (t-4f … t+4f).
  timeline.png    motion energy (grey), cuts (red), beats (blue ticks), strong accents (orange) on one time axis.
  blueprint.md    a skeleton edit blueprint (one row per shot) to fill in: what happens, text, transition, asset.
  pages/ef_NNN.jpg EVERY frame at native fps, 48–50 per page, labelled with the ABSOLUTE frame index (red bar = proposed
                  cut, yellow = flash). The ground truth: detectors only propose (Katana: a 10 fps read once missed the
                  main 3–5-frame burn transition). Read every page, in order, before planning.
  energy.json     camera moves (pan/tilt/zoom/roll), shake bursts, flashes, cadence per shot, synced hits and their RATES
                  per second — carry the same rates into the remix (tools/energy.py; `katana energy <mp4> --vs` checks).
  breakdown.json  per-shot skeleton to complete while reading the pages: trick line, family, transitions, text events…

Needs: ffmpeg/ffprobe, numpy, Pillow. OCR uses tools/bin/ocr (macOS Vision) when present.
Split-screen comparison videos (1920x2160: Katana on top, Claude Motion below) → --region top.
"""
import argparse, json, math, os, subprocess, sys, shutil
import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OCR_BIN = os.path.join(HERE, 'bin', 'ocr')


# ---------------------------------------------------------------- probing / decoding
def probe(path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
                       capture_output=True, text=True, check=True)
    d = json.loads(r.stdout)
    v = next(s for s in d['streams'] if s['codec_type'] == 'video')
    a = next((s for s in d['streams'] if s['codec_type'] == 'audio'), None)
    num, den = (int(x) for x in v.get('avg_frame_rate', v['r_frame_rate']).split('/'))
    fps = num / den if den else 30.0
    dur = float(v.get('duration') or d['format']['duration'])
    return {'width': int(v['width']), 'height': int(v['height']), 'fps': round(fps, 4), 'fps_rational': f'{num}/{den}',
            'duration': round(dur, 3), 'frames': int(v.get('nb_frames') or round(dur * fps)),
            'codec': v['codec_name'], 'audio': bool(a), 'audio_codec': a['codec_name'] if a else None}


def region_filter(region, W, H):
    if not region:
        return None, (W, H)
    named = {'top': (0, 0, W, H // 2), 'bottom': (0, H // 2, W, H - H // 2),
             'left': (0, 0, W // 2, H), 'right': (W // 2, 0, W - W // 2, H)}
    if region in named:
        x, y, w, h = named[region]
    else:
        x, y, w, h = (int(v) for v in region.split(':'))
    return f'crop={w}:{h}:{x}:{y}', (w, h)


def decode_small(path, crop, size):
    """Every frame, small: (n, h, w, 3) uint8."""
    w, h = size
    vf = (crop + ',' if crop else '') + f'scale={w}:{h}:flags=area'
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', vf, '-an', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                       capture_output=True, check=True)
    a = np.frombuffer(r.stdout, dtype=np.uint8)
    n = a.size // (w * h * 3)
    return a[: n * w * h * 3].reshape(n, h, w, 3)


def decode_audio(path, sr=22050):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'],
                       capture_output=True)
    if r.returncode != 0 or not r.stdout:
        return None
    return np.frombuffer(r.stdout, dtype=np.float32).copy()


def grab(path, crop, t, width=None):
    vf = [crop] if crop else []
    if width:
        vf.append(f'scale={width}:-2')
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{max(0.0, t):.4f}', '-i', path, '-frames:v', '1']
    if vf:
        cmd += ['-vf', ','.join(vf)]
    cmd += ['-f', 'image2pipe', '-vcodec', 'png', '-']
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0 or not r.stdout:
        return None
    from io import BytesIO
    return Image.open(BytesIO(r.stdout)).convert('RGB')


# ---------------------------------------------------------------- picture analysis
def picture_metrics(fr):
    """Per frame: mad (mean |Δluma|), blockmax (largest 8x8-block mean |Δluma|), hist (colour-histogram distance)."""
    n = fr.shape[0]
    luma = (fr[..., 0] * 0.299 + fr[..., 1] * 0.587 + fr[..., 2] * 0.114).astype(np.float32)
    q = (fr // 32).astype(np.int32)  # 8 levels per channel → 512 bins
    idx = q[..., 0] * 64 + q[..., 1] * 8 + q[..., 2]
    hists = np.stack([np.bincount(i.ravel(), minlength=512) for i in idx]).astype(np.float32)
    hists /= hists.sum(axis=1, keepdims=True)
    mad = np.zeros(n, np.float32); blockmax = np.zeros(n, np.float32); hd = np.zeros(n, np.float32)
    h, w = luma.shape[1:]
    bh, bw = h // 8, w // 8
    for i in range(1, n):
        d = np.abs(luma[i] - luma[i - 1])
        mad[i] = d.mean()
        blockmax[i] = d[: bh * 8, : bw * 8].reshape(8, bh, 8, bw).mean(axis=(1, 3)).max()
        hd[i] = 0.5 * np.abs(hists[i] - hists[i - 1]).sum()  # 0..1 total variation
    return luma, mad, blockmax, hd


def local_median(x, rad):
    out = np.empty_like(x)
    for i in range(len(x)):
        out[i] = np.median(x[max(0, i - rad): i + rad + 1])
    return out


def detect_cuts(mad, hd, fps):
    """A cut = a colour-histogram jump well above its neighbourhood, or a luma jump that is a clear spike.
    Fast continuous motion (whip pans, zooms) raises the neighbourhood too, so it is not flagged — it becomes a
    'fast window' instead, which is where good edits hide their cuts."""
    rad = max(3, int(round(fps * 0.25)))
    hmed = local_median(hd, rad); mmed = local_median(mad, rad)
    cuts = []
    min_gap = max(2, int(round(fps * 0.12)))
    for i in range(1, len(hd)):
        is_cut = (hd[i] > 0.25 and hd[i] > 3.0 * max(hmed[i], 0.02)) or (mad[i] > 18 and mad[i] > 3.0 * max(mmed[i], 2))
        if is_cut and (not cuts or i - cuts[-1] >= min_gap):
            cuts.append(i)
        elif is_cut and cuts and hd[i] > hd[cuts[-1]]:
            cuts[-1] = i
    return cuts


def fast_windows(mad, fps, cuts):
    """Intervals whose motion energy is far above the film's typical level (transitions, whips, needles)."""
    k = max(1, int(round(fps * 0.1)))
    sm = np.convolve(mad, np.ones(k) / k, mode='same')
    base = np.median(sm); thr = max(base * 2.5, np.percentile(sm, 85), 6.0)
    win, start = [], None
    for i, v in enumerate(sm):
        if v > thr and start is None:
            start = i
        elif v <= thr and start is not None:
            if i - start >= 2:
                win.append((start, i))
            start = None
    if start is not None:
        win.append((start, len(sm)))
    return [{'from': round(a / fps, 3), 'to': round(b / fps, 3), 'peak': round(float(sm[a:b].max()), 1),
             'contains_cut': any(a <= c <= b for c in cuts)} for a, b in win]


def palette(frames, k=5):
    """k dominant colours of a stack of small frames (median-cut-ish: coarse bins, most populated first)."""
    px = frames.reshape(-1, 3)
    q = (px // 24).astype(np.int32)
    keys = q[:, 0] * 10000 + q[:, 1] * 100 + q[:, 2]
    uniq, inv, counts = np.unique(keys, return_inverse=True, return_counts=True)
    order = np.argsort(-counts)
    out = []
    for o in order:
        col = px[inv == o].mean(axis=0)
        if all(np.abs(col - np.array(c)).sum() > 60 for c in out):
            out.append(col.astype(int).tolist())
        if len(out) == k:
            break
    share = counts[order[: len(out)]] / len(px)
    return [{'hex': '#%02x%02x%02x' % tuple(c), 'share': round(float(s), 3)} for c, s in zip(out, share)]


# ---------------------------------------------------------------- audio analysis
def stft_mag(y, n_fft=2048, hop=512):
    win = np.hanning(n_fft).astype(np.float32)
    n = 1 + max(0, (len(y) - n_fft) // hop)
    frames = np.lib.stride_tricks.as_strided(y, shape=(n, n_fft), strides=(y.strides[0] * hop, y.strides[0]))
    return np.abs(np.fft.rfft(frames * win, axis=1)).astype(np.float32)


def audio_analysis(y, sr, hop=512):
    if y is None or len(y) < sr:
        return None
    S = stft_mag(y, hop=hop)
    logS = np.log1p(100 * S)
    flux = np.maximum(0, np.diff(logS, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    env = flux - np.convolve(flux, np.ones(16) / 16, mode='same')  # remove slow trend
    env = np.maximum(env, 0); env /= (env.max() or 1)
    fr = sr / hop  # envelope frames per second
    # a frame's flux jumps as soon as the onset ENTERS its window (log magnitude): envelope index i ≈ time i/fr − (n_fft − hop/2)/sr.
    # Measured on a click track: −82 ms without this correction.
    lag = (2048 - hop / 2) / sr
    # tempo: autocorrelation of the envelope, 70–180 BPM, gentle prior around 120 BPM
    ac = np.correlate(env, env, mode='full')[len(env) - 1:]
    lags = np.arange(len(ac)); bpm_of = lambda L: 60 * fr / L
    lo, hi = int(fr * 60 / 180), int(fr * 60 / 70)
    cand = lags[lo: hi + 1]
    score = ac[lo: hi + 1] * np.exp(-0.5 * (np.log2(bpm_of(cand) / 120) / 0.9) ** 2)
    L = int(cand[np.argmax(score)])
    # refine lag with parabolic interpolation
    if lo < L < hi:
        a, b, c = ac[L - 1], ac[L], ac[L + 1]
        Lf = L + 0.5 * (a - c) / (a - 2 * b + c) if (a - 2 * b + c) else L
    else:
        Lf = L
    bpm = float(bpm_of(Lf))
    # beat phase: the grid offset that collects the most onset energy
    period = Lf
    best, best_off = -1, 0.0
    for off in np.linspace(0, period, 48, endpoint=False):
        pos = np.arange(off, len(env), period).astype(int)
        s = env[pos[pos < len(env)]].sum()
        if s > best:
            best, best_off = s, off
    beats = [round(float(p / fr + lag), 3) for p in np.arange(best_off, len(env), period)]
    # strong accents: peaks of the envelope well above local level
    rad = int(fr * 0.15)
    peaks = []
    thr = np.percentile(env, 92)
    for i in range(1, len(env) - 1):
        if env[i] >= thr and env[i] == env[max(0, i - rad): i + rad + 1].max():
            peaks.append((round(i / fr + lag, 3), round(float(env[i]), 3)))
    # loudness curve (RMS dBFS, 0.1 s)
    w = int(sr * 0.1)
    rms = [round(float(20 * np.log10(np.sqrt(np.mean(y[i:i + w] ** 2)) + 1e-9)), 1) for i in range(0, len(y) - w, w)]
    # big drops / lifts: the largest jumps of the 0.1 s RMS
    jumps = sorted(((rms[i + 1] - rms[i], i) for i in range(len(rms) - 1)), reverse=True)[:5]
    return {'bpm': round(bpm, 2), 'beat_s': round(60 / bpm, 4), 'beats': beats,
            'accents': [{'t': t, 'strength': s} for t, s in peaks],
            'rms_db_100ms': rms, 'lifts': [{'t': round((i + 1) * 0.1, 2), 'db_jump': round(d, 1)} for d, i in jumps],
            'env_fps': fr, 'env': env, 'lag': lag}


# ---------------------------------------------------------------- drawing
def label(img, text, xy=(6, 4)):
    d = ImageDraw.Draw(img)
    x, y = xy
    tw = int(d.textlength(text)) + 8
    d.rectangle([x - 3, y - 2, x + tw, y + 13], fill=(0, 0, 0))
    d.text((x + 1, y), text, fill=(255, 230, 0))
    return img


def strip(path, crop, times, width, labels):
    ims = [grab(path, crop, t, width) for t in times]
    ims = [im for im in ims if im is not None]
    if not ims:
        return None
    w, h = ims[0].size
    out = Image.new('RGB', (w * len(ims) + 4 * (len(ims) - 1), h), 'white')
    for i, im in enumerate(ims):
        out.paste(label(im, labels[i]), (i * (w + 4), 0))
    return out


def timeline_png(path_out, dur, fps, mad, cuts, audio, fast):
    W, H = 2400, 360
    img = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(img)
    X = lambda t: int(40 + (W - 60) * t / dur)
    top, bot = 30, 230
    m = max(float(np.percentile(mad, 99.5)), 1)
    for f in fast:
        d.rectangle([X(f['from']), top, X(f['to']), bot], fill=(255, 236, 200))
    pts = [(X(i / fps), bot - (bot - top) * min(1, mad[i] / m)) for i in range(len(mad))]
    d.line(pts, fill=(90, 90, 90), width=2)
    for c in cuts:
        d.line([(X(c / fps), top), (X(c / fps), bot)], fill=(220, 30, 30), width=2)
    if audio:
        env = audio['env']; fr = audio['env_fps']
        e = [(X(i / fr + audio.get('lag', 0)), 330 - 80 * env[i]) for i in range(0, len(env))]
        d.line(e, fill=(60, 120, 220), width=1)
        for b in audio['beats']:
            if b <= dur:
                d.line([(X(b), 240), (X(b), 252)], fill=(40, 90, 230), width=2)
        for a in audio['accents']:
            if a['t'] <= dur:
                d.ellipse([X(a['t']) - 3, 252, X(a['t']) + 3, 258], fill=(255, 140, 0))
    for s in range(0, int(dur) + 1):
        d.line([(X(s), bot), (X(s), bot + 5)], fill=(0, 0, 0))
        d.text((X(s) - 4, 8), f'{s}', fill=(0, 0, 0))
    d.text((40, 340), 'grey: motion energy · red: cuts · peach: fast windows · blue: beats + onset envelope · orange: accents',
           fill=(0, 0, 0))
    img.save(path_out)


# ---------------------------------------------------------------- every-frame pages
def every_frame_pages(src, crop, W, H, fps, n, out, cutset, flashset):
    portrait = H > W
    cols, rows = (10, 5) if portrait else (8, 6)
    tw = 150 if portrait else 200
    th = max(2, int(round(tw * H / W / 2)) * 2)
    vf = (crop + ',' if crop else '') + f'scale={tw}:{th}:flags=area'
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', vf, '-an', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True)
    arr = np.frombuffer(r.stdout, dtype=np.uint8)
    m = arr.size // (tw * th * 3); arr = arr[: m * tw * th * 3].reshape(m, th, tw, 3)
    pdir = os.path.join(out, 'pages'); os.makedirs(pdir, exist_ok=True)
    for f in os.listdir(pdir):
        if f.startswith('ef_'): os.remove(os.path.join(pdir, f))
    per = cols * rows; pages = []
    for p0 in range(0, m, per):
        k = min(per, m - p0)
        pg = Image.new('RGB', (cols * (tw + 3) + 3, rows * (th + 3) + 3 + 22), (30, 30, 30))
        d = ImageDraw.Draw(pg)
        d.text((6, 4), f'frames {p0}-{p0 + k - 1}  ({p0 / fps:.2f}-{(p0 + k) / fps:.2f} s @ {fps} fps)   red = proposed cut, yellow = flash', fill=(255, 255, 255))
        for j in range(k):
            fi = p0 + j; x = 3 + (j % cols) * (tw + 3); y = 25 + (j // cols) * (th + 3)
            pg.paste(Image.fromarray(arr[fi]), (x, y))
            if fi in cutset: d.rectangle([x - 3, y, x - 1, y + th], fill=(230, 30, 30)); d.rectangle([x, y, x + tw, y + 2], fill=(230, 30, 30))
            if fi in flashset: d.rectangle([x, y + th - 3, x + tw, y + th], fill=(255, 220, 0))
            lab = f'f{fi}'
            d.rectangle([x, y, x + 6 * len(lab) + 4, y + 11], fill=(0, 0, 0)); d.text((x + 2, y), lab, fill=(255, 230, 0))
        fn = os.path.join(pdir, f'ef_{p0 // per:03d}.jpg'); pg.save(fn, quality=80)
        pages.append({'file': os.path.relpath(fn, out), 'f0': p0, 'f1': p0 + k - 1})
    return pages


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video')
    ap.add_argument('--out')
    ap.add_argument('--region')
    ap.add_argument('--no-ocr', action='store_true')
    ap.add_argument('--sheet-fps', type=float, default=2.0)
    ap.add_argument('--no-pages', action='store_true', help='skip the every-frame pages (NOT for a reference you will remix)')
    a = ap.parse_args()

    src = os.path.abspath(a.video)
    out = os.path.abspath(a.out or os.path.splitext(src)[0] + ('_' + a.region.replace(':', '-') if a.region else '') + '_analysis')
    os.makedirs(os.path.join(out, 'cuts'), exist_ok=True)
    meta = probe(src)
    crop, (W, H) = region_filter(a.region, meta['width'], meta['height'])
    fps = meta['fps']
    sw = 160; sh = max(2, int(round(sw * H / W / 2)) * 2)
    print(f'[analyze] {os.path.basename(src)}  {W}x{H} @ {fps} fps, {meta["duration"]} s  →  {out}', file=sys.stderr)

    fr = decode_small(src, crop, (sw, sh))
    n = fr.shape[0]
    luma, mad, blockmax, hd = picture_metrics(fr)
    cuts = detect_cuts(mad, hd, fps)
    fast = fast_windows(mad, fps, cuts)
    bounds = [0] + cuts + [n]
    shots = []
    for i in range(len(bounds) - 1):
        s, e = bounds[i], bounds[i + 1]
        seg = fr[s:e]
        mid = s + (e - s) // 2
        shots.append({'n': i + 1, 'start': round(s / fps, 3), 'end': round(e / fps, 3), 'dur': round((e - s) / fps, 3),
                      'frames': [s, e - 1], 'mean_luma': round(float(luma[s:e].mean()), 1),
                      'motion': round(float(mad[s + 1:e].mean()) if e - s > 1 else 0.0, 2),
                      'palette': palette(seg[:: max(1, len(seg) // 6)]), 'mid_t': round(mid / fps, 3), 'text': []})

    # audio
    y = decode_audio(src) if meta['audio'] else None
    au = audio_analysis(y, 22050) if y is not None else None
    if au:
        bs = au['beat_s']
        for sh_ in shots[1:]:
            t = sh_['start']
            nb = min(au['beats'], key=lambda b: abs(b - t)) if au['beats'] else None
            sh_['cut_to_beat_ms'] = round((t - nb) * 1000) if nb is not None else None
        offs = [abs(s['cut_to_beat_ms']) for s in shots[1:] if s.get('cut_to_beat_ms') is not None]
        on_beat = sum(1 for o in offs if o <= 1000 * min(0.07, bs / 6))
        au['cuts_on_beat'] = f'{on_beat}/{len(offs)} cuts within ±{round(1000 * min(0.07, bs / 6))} ms of a beat'
        # 8th-note grid (most motion edits cut on 8ths): best phase for the cuts themselves, and how many land within ±50 ms
        cts = [s['start'] for s in shots[1:]]
        if cts:
            half = bs / 2
            best = min((sum(min(abs(((c - ph) % half)), half - abs(((c - ph) % half))) for c in cts), ph) for ph in np.linspace(0, half, 60, endpoint=False))[1]
            dev = [min((c - best) % half, half - (c - best) % half) for c in cts]
            au['cut_grid_8th'] = {'phase_s': round(float(best), 3), 'within_50ms': f'{sum(1 for d in dev if d <= .05)}/{len(cts)}',
                                  'median_dev_ms': round(1000 * float(np.median(dev)))}

    # stills: overview sheet, per-shot rows, cut strips
    sheet_w = 320
    step = 1 / a.sheet_fps
    ts = list(np.arange(0, meta['duration'] - 1e-3, step))
    tmp_dir = os.path.join(out, '_frames'); os.makedirs(tmp_dir, exist_ok=True)
    vf = (crop + ',' if crop else '') + f'fps={a.sheet_fps},scale={sheet_w}:-2'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-vf', vf, os.path.join(tmp_dir, 's_%04d.png')], check=True)
    files = sorted(f for f in os.listdir(tmp_dir) if f.startswith('s_'))
    if files:
        im0 = Image.open(os.path.join(tmp_dir, files[0])); w, h = im0.size
        cols = 10; rows = math.ceil(len(files) / cols)
        sheet = Image.new('RGB', (cols * (w + 4), rows * (h + 4)), 'white')
        for i, f in enumerate(files):
            im = label(Image.open(os.path.join(tmp_dir, f)).convert('RGB'), f'{i * step:.1f}s')
            sheet.paste(im, ((i % cols) * (w + 4), (i // cols) * (h + 4)))
        sheet.save(os.path.join(out, 'sheet.jpg'), quality=85)
    shutil.rmtree(tmp_dir, ignore_errors=True)

    rows_img = []
    for s in shots:
        f0, f1 = s['frames']
        ts3 = [(f0 + min(1, f1 - f0)) / fps, s['mid_t'], max(f0, f1 - 1) / fps]
        r = strip(src, crop, ts3, 300, [f'#{s["n"]} {t:.2f}s' for t in ts3])
        if r:
            rows_img.append(r)
    if rows_img:
        Wm = max(r.size[0] for r in rows_img); Hs = sum(r.size[1] + 4 for r in rows_img)
        big = Image.new('RGB', (Wm, Hs), 'white'); yy = 0
        for r in rows_img:
            big.paste(r, (0, yy)); yy += r.size[1] + 4
        if big.size[1] > 12000:
            big = big.resize((int(big.size[0] * 12000 / big.size[1]), 12000))
        big.save(os.path.join(out, 'shots.jpg'), quality=82)

    events = [('cut', c / fps) for c in cuts] + [('fast', (f['from'] + f['to']) / 2) for f in fast if not f['contains_cut']]
    for k, (kind, t) in enumerate(sorted(events, key=lambda e: e[1])):
        times = [t + d / fps for d in range(-4, 5)]
        r = strip(src, crop, times, 240, [f'{kind} {tt:.2f}' for tt in times])
        if r:
            r.save(os.path.join(out, 'cuts', f'{k + 1:02d}_{kind}_{t:.2f}s.jpg'), quality=82)

    # OCR on 3 frames per shot (text animates in, so the middle alone misses words)
    if not a.no_ocr and os.path.exists(OCR_BIN):
        ocr_dir = os.path.join(out, '_ocr'); os.makedirs(ocr_dir, exist_ok=True)
        paths = []
        for s in shots:
            f0, f1 = s['frames']
            for j, t in enumerate([(f0 + (f1 - f0) * q) / fps for q in (0.25, 0.6, 0.95)]):
                im = grab(src, crop, t, 1280)
                if im is not None:
                    p = os.path.join(ocr_dir, f's{s["n"]:03d}_{j}.png'); im.save(p); paths.append((s, p))
        if paths:
            r = subprocess.run([OCR_BIN] + [p for _, p in paths], capture_output=True, text=True)
            res = {}
            for line in r.stdout.splitlines():
                try:
                    o = json.loads(line); res[o['file']] = o
                except Exception:
                    pass
            for s, p in paths:
                for ln in res.get(p, {}).get('lines', []):
                    if ln['conf'] >= 0.5 and ln['text'].strip() and ln['text'] not in [x['text'] for x in s['text']]:
                        s['text'].append({'text': ln['text'], 'hrel': ln['hrel'],
                                          'box_rel': [round(v / d, 3) for v, d in zip(ln['box'], (1280, 1280 * H / W, 1280, 1280 * H / W))]})
        shutil.rmtree(ocr_dir, ignore_errors=True)

    # energy map (camera, shake, flashes, cadence, hits) — tools/energy.py
    sys.path.insert(0, HERE)
    import energy as EN
    en = EN.energy_map(fr, fps, cuts, au['accents'] if au else None, au['beats'] if au else None)
    with open(os.path.join(out, 'energy.json'), 'w') as f:
        json.dump(en, f, indent=1)
    for c in en['cadence']:
        for s in shots:
            if s['frames'][0] == c['f0']:
                s['cadence'] = {k: c[k] for k in ('unique', 'of', 'pattern', 'effective_fps')}
    # BPM sanity check (Katana: auto-BPM is often doubled, halved or stuck in 3:4): cut intervals in beats at ×1 ×2 ×½ ×¾ ×4/3
    if au and len(cuts) >= 3:
        iv = np.diff([0] + cuts) / fps
        checks = []
        for mul in (1, 2, .5, .75, 4 / 3):
            b = au['bpm'] * mul; beats_iv = iv * b / 60
            frac = np.abs(beats_iv * 2 - np.round(beats_iv * 2)) / 2      # distance to the nearest half beat
            checks.append({'mult': round(mul, 3), 'bpm': round(b, 2), 'on_half_beats': round(float(np.mean(frac <= .08)), 2)})
        au['bpm_check'] = checks
        # Evidence for a HUMAN check (Katana: auto-BPM is often off by ~1, doubled, or stuck in 3:4 — verify by hand against
        # the cut intervals, and on chants against word starts). Detected cuts hidden in motion make this table noisy,
        # so it never overrides the tracker; read it next to the every-frame pages.
        au['bpm_suggested'] = None
    # every-frame pages
    pages = []
    if not a.no_pages:
        pages = every_frame_pages(src, crop, W, H, fps, n, out, set(cuts), {f['f0'] for f in en['flashes']})

    result = {'source': src, 'region': a.region, 'meta': {**meta, 'analysed_size': [W, H]},
              'summary': {'shots': len(shots), 'avg_shot_s': round(meta['duration'] / max(1, len(shots)), 2),
                          'cuts_per_10s': round(10 * len(cuts) / meta['duration'], 2), 'fast_windows': len(fast),
                          'bpm': au['bpm'] if au else None, 'cuts_on_beat': au['cuts_on_beat'] if au else None, 'cut_grid_8th': au.get('cut_grid_8th') if au else None,
                          'mean_luma': round(float(luma.mean()), 1), 'palette': palette(fr[:: max(1, n // 40)], 8),
                          'energy': en['rates'], 'bpm_suggested': au.get('bpm_suggested') if au else None},
              'pages': pages,
              'shots': shots, 'cuts_s': [round(c / fps, 3) for c in cuts], 'fast_windows': fast,
              'audio': {k: v for k, v in au.items() if k not in ('env', 'env_fps', 'lag')} if au else None,
              'motion_per_frame': {'mad': [round(float(v), 2) for v in mad], 'blockmax': [round(float(v), 1) for v in blockmax]}}
    with open(os.path.join(out, 'analysis.json'), 'w') as f:
        json.dump(result, f, ensure_ascii=False, indent=1)

    # breakdown skeleton (fill while reading the every-frame pages; mirrors the fields Katana's analysis records)
    bd = {'schema': 'katana-np.breakdown/1', 'source': src, 'region': a.region,
          'ref': {'width': W, 'height': H, 'fps': meta['fps_rational'], 'nb_frames': n, 'duration': meta['duration'], 'has_audio': meta['audio']},
          'trick': 'The trick of this ref is <device> on <timing/structure> so that <what the viewer feels>.',
          'trick_frames': [], 'family': 'F6 designed graphics | F2 performer + overlays | F3 real-footage montage | F4 user clips | F5 photo series | F7 product',
          'look': {'class': 'clean|stylised', 'grain': None, 'palette': result['summary']['palette']},
          'fonts': [], 'audio': {'bpm': au['bpm'] if au else None, 'bpm_suggested': au.get('bpm_suggested') if au else None,
                                 'bpm_check': au.get('bpm_check') if au else None, 'beat_phase_s': au['beats'][0] if au and au['beats'] else None,
                                 'cut_on_onset_share': en['rates']['cut_on_onset_share'], 'plan': 'reuse_ref_audio|user_track|stock_track'},
          'energy_rates': en['rates'], 'cuts': []}
    for s in shots:
        f0, f1 = s['frames']
        bd['cuts'].append({'id': f'c{s["n"]:02d}', 'f0': f0, 'f1': f1, 't0': s['start'], 't1': s['end'], 'content': '', 'role': '',
                           'shot_size': '', 'camera': [m for m in en['camera_moves'] if m['f0'] <= f1 and m['f1'] >= f0],
                           'cadence': s.get('cadence'), 'flashes': [x for x in en['flashes'] if f0 <= x['f0'] <= f1],
                           'transition_in': {'type': None, 'hides_cut': None}, 'transition_out': {'type': None, 'hides_cut': None},
                           'layers': [], 'text_events': [{'text': t['text'], 'size_pct_h': round(t['hrel'] * 100, 1),
                                                          'cx': round(t['box_rel'][0] + t['box_rel'][2] / 2, 3), 'cy': round(t['box_rel'][1] + t['box_rel'][3] / 2, 3),
                                                          'f_in': None, 'f_full': None, 'f_out': None, 'animation': '', 'font_class': ''} for t in s['text']],
                           'palette': s['palette'], 'mean_luma': s['mean_luma'], 'notes': ''})
    with open(os.path.join(out, 'breakdown.json'), 'w') as f:
        json.dump(bd, f, ensure_ascii=False, indent=1)

    # blueprint skeleton
    L = [f'# Blueprint — {os.path.basename(src)}' + (f' ({a.region})' if a.region else ''), '',
         f'{W}x{H} · {fps} fps · {meta["duration"]} s · {len(shots)} shots · '
         f'{result["summary"]["cuts_per_10s"]} cuts/10 s · BPM {result["summary"]["bpm"]} · {result["summary"]["cuts_on_beat"]}', '',
         '| # | in–out (s) | dur | luma | motion | on-screen text (OCR) | what happens | transition out | our asset |',
         '|---|---|---|---|---|---|---|---|---|']
    for s in shots:
        txt = ' / '.join(t['text'] for t in s['text'])[:80]
        L.append(f'| {s["n"]} | {s["start"]:.2f}–{s["end"]:.2f} | {s["dur"]:.2f} | {s["mean_luma"]:.0f} | {s["motion"]:.1f} | {txt} |  |  |  |')
    L += ['', 'Fast windows (where cuts hide): ' + ', '.join(f'{f["from"]:.2f}–{f["to"]:.2f}s' for f in fast)]
    r_ = en['rates']
    L += ['', f'Energy (carry these RATES into the remix): cuts {r_["cuts_per_s"]}/s · flashes {r_["flashes_per_s"]}/s · shake bursts '
          f'{r_["shake_bursts_per_s"]}/s · camera moving {round(100 * r_["camera_moving_share"])} % of frames · hits {r_["hits_per_s"]}/s · '
          f'cut-on-onset {r_["cut_on_onset_share"]}',
          'Camera moves: ' + ', '.join(f'{m["type"]} {m["t0"]:.2f}–{m["t1"]:.2f}s' for m in en['camera_moves'][:40]),
          'Flashes: ' + ', '.join(f'{x["type"]} f{x["f0"]}' + ('(hides cut)' if x['hides_cut'] else '') for x in en['flashes'][:40]),
          '', '**Trick line** (write after reading the pages): The trick of this ref is … on … so that …',
          f'Every-frame pages: {len(pages)} in pages/ (read ALL, in order).']
    with open(os.path.join(out, 'blueprint.md'), 'w') as f:
        f.write('\n'.join(L) + '\n')

    print(json.dumps(result['summary'], ensure_ascii=False, indent=1))
    print(f'[analyze] wrote {out}/(analysis.json, energy.json, breakdown.json, sheet.jpg, shots.jpg, timeline.png, cuts/, pages/, blueprint.md)', file=sys.stderr)


if __name__ == '__main__':
    main()
