#!/usr/bin/env python3
"""energy — the reference's energy, measured: global camera motion (pan / tilt / zoom / roll from 4-quadrant phase
correlation), shake bursts, flashes and solid frames, per-shot cadence (unique frames), synchronised hits, and their
RATES per second. Higgsfield's Katana carries these rates into the remix; past remixes that dropped them (camera
movement at a third of the reference) "felt flat".

Library use (analyze_ref.py calls it): energy_map(frames_small_rgb, fps, cuts, audio_accents) → dict
CLI:  energy.py <video> [--region top] [--out energy.json]   (standalone, decodes the video itself)

Conventions: frame indices are absolute 0-based; pan dx > 0 = picture content moves right (camera pans left);
zoom > 0 = content grows (push-in / zoom-in), per second, in log-scale units (0.3 ≈ +35 %/s).
"""
import json, math, os, sys
import numpy as np


# ---------------------------------------------------------------- global motion
def _hann(h, w):
    return np.outer(np.hanning(h), np.hanning(w)).astype(np.float32)


def _shift(a, b, win):
    """Translation of content from a to b (dx, dy in px) + peak strength, sub-pixel by parabolic fit."""
    A = np.fft.rfft2((a - a.mean()) * win); B = np.fft.rfft2((b - b.mean()) * win)
    R = B * np.conj(A); R /= np.abs(R) + 1e-6
    r = np.fft.irfft2(R, s=a.shape)
    h, w = r.shape
    py, px = np.unravel_index(int(np.argmax(r)), r.shape)
    peak = float(r[py, px])

    def sub(c, m1, p1):
        d = m1 - 2 * c + p1
        return 0.0 if abs(d) < 1e-9 else 0.5 * (m1 - p1) / d
    ox = sub(r[py, px], r[py, (px - 1) % w], r[py, (px + 1) % w])
    oy = sub(r[py, px], r[(py - 1) % h, px], r[(py + 1) % h, px])
    dx = px + ox; dy = py + oy
    if dx > w / 2: dx -= w
    if dy > h / 2: dy -= h
    return float(dx), float(dy), peak


def global_motion(luma):
    """Per frame i (vs i−1): dx, dy (px of the analysed frame), zoom (relative scale change), roll (rad), confidence."""
    n, H, W = luma.shape
    h2, w2 = H // 2, W // 2
    win_q = _hann(h2, w2); win_f = _hann(H, W)
    out = np.zeros((n, 6), np.float32)
    for i in range(1, n):
        a, b = luma[i - 1], luma[i]
        q = {}
        for name, (ys, xs) in {'tl': (slice(0, h2), slice(0, w2)), 'tr': (slice(0, h2), slice(w2, 2 * w2)),
                               'bl': (slice(h2, 2 * h2), slice(0, w2)), 'br': (slice(h2, 2 * h2), slice(w2, 2 * w2))}.items():
            q[name] = _shift(a[ys, xs], b[ys, xs], win_q)
        dx, dy, pk = _shift(a, b, win_f)
        # divergence → zoom: right halves move right and bottom halves move down when the content grows
        zx = ((q['tr'][0] + q['br'][0]) - (q['tl'][0] + q['bl'][0])) / 2 / (W / 2)
        zy = ((q['bl'][1] + q['br'][1]) - (q['tl'][1] + q['tr'][1])) / 2 / (H / 2)
        # curl → roll (clockwise positive in image coordinates)
        rx = ((q['tr'][1] + q['br'][1]) - (q['tl'][1] + q['bl'][1])) / 2 / (W / 2)
        ry = ((q['bl'][0] + q['br'][0]) - (q['tl'][0] + q['tr'][0])) / 2 / (H / 2)
        conf = min(pk, *(v[2] for v in q.values()))
        # incoherence: how much the quadrants disagree beyond what zoom/roll explain (moving graphics, morphs, cuts)
        pred = {'tl': (-zx * W / 4 + ry * H / 4, -zy * H / 4 - rx * W / 4), 'tr': (zx * W / 4 + ry * H / 4, -zy * H / 4 + rx * W / 4),
                'bl': (-zx * W / 4 - ry * H / 4, zy * H / 4 - rx * W / 4), 'br': (zx * W / 4 - ry * H / 4, zy * H / 4 + rx * W / 4)}
        inc = np.mean([math.hypot(q[k][0] - dx - pred[k][0], q[k][1] - dy - pred[k][1]) for k in q])
        out[i] = (dx, dy, (zx + zy) / 2, (rx - ry) / 2, conf, inc)
    return out


def _smooth(x, k):
    if k <= 1: return x.copy()
    ker = np.ones(k) / k
    return np.convolve(np.pad(x, (k // 2, k - 1 - k // 2), mode='edge'), ker, mode='valid')


def _segments(mask, min_len):
    segs, s = [], None
    for i, v in enumerate(mask):
        if v and s is None: s = i
        elif not v and s is not None:
            if i - s >= min_len: segs.append((s, i - 1))
            s = None
    if s is not None and len(mask) - s >= min_len: segs.append((s, len(mask) - 1))
    return segs


# ---------------------------------------------------------------- energy map
def energy_map(frames, fps, cuts, accents=None, beats=None):
    """frames: (n, h, w, 3) uint8 small RGB; cuts: list of frame indices (new shot starts); accents: [{t, strength}]."""
    n, H, W, _ = frames.shape
    luma = (frames[..., 0] * .299 + frames[..., 1] * .587 + frames[..., 2] * .114).astype(np.float32)
    cutset = set(cuts)
    gm = global_motion(luma)
    for c in cuts:                     # motion across a cut is meaningless
        if 0 < c < n: gm[c, :4] = 0
    bad = (gm[:, 4] < .08) | (gm[:, 5] > 1.5)   # weak correlation peak or incoherent quadrants: not a camera move
    gm[bad, :4] = 0
    scale = 1080.0 / max(H, W)         # report pixels on a 1080-px long side, per second
    dx, dy = gm[:, 0] * scale * fps, gm[:, 1] * scale * fps
    zoom, roll = gm[:, 2] * fps, gm[:, 3] * fps
    k = max(3, int(round(fps * .2)))
    sdx, sdy, szoom, sroll = _smooth(dx, k), _smooth(dy, k), _smooth(zoom, k), _smooth(roll, k)
    # camera moves: sustained smoothed motion (≥ 0.25 s)
    min_len = max(3, int(round(fps * .25)))
    moves = []
    for kind, sig, thr in (('pan', sdx, 60), ('tilt', sdy, 60), ('zoom', szoom, .12), ('roll', sroll, .12)):
        for a, b in _segments(np.abs(sig) > thr, min_len):
            if any(a < c <= b for c in cutset):  # split at cuts
                pass
            seg = sig[a:b + 1]
            name = kind
            if kind == 'pan': name = 'pan_left' if seg.mean() > 0 else 'pan_right'
            if kind == 'tilt': name = 'tilt_up' if seg.mean() > 0 else 'tilt_down'
            if kind == 'zoom': name = 'push_in' if seg.mean() > 0 else 'pull_out'
            if kind == 'roll': name = 'roll_cw' if seg.mean() > 0 else 'roll_ccw'
            moves.append({'type': name, 'f0': int(a), 'f1': int(b), 't0': round(a / fps, 3), 't1': round((b + 1) / fps, 3),
                          'peak': round(float(np.abs(seg).max()), 3), 'mean': round(float(np.abs(seg).mean()), 3),
                          'unit': 'px/s' if kind in ('pan', 'tilt') else 'log-scale/s' if kind == 'zoom' else 'rad/s'})
    moves.sort(key=lambda m: (m['type'], m['f0']))
    merged = []
    for mv in moves:
        if merged and merged[-1]['type'] == mv['type'] and mv['f0'] - merged[-1]['f1'] <= max(3, int(fps * .12)):
            pm = merged[-1]; pm['f1'] = mv['f1']; pm['t1'] = mv['t1']; pm['peak'] = max(pm['peak'], mv['peak'])
        else:
            merged.append(dict(mv))
    moves = sorted(merged, key=lambda m: m['f0'])
    # shake: high-frequency residual of translation, RMS over ~0.3 s
    rx, ry = dx - sdx, dy - sdy
    w = max(4, int(round(fps * .3)))
    rms = np.sqrt(_smooth(rx ** 2 + ry ** 2, w))
    base = float(np.median(rms)) if n else 0.0
    shakes = []
    for a, b in _segments(rms > max(120.0, base * 3), max(3, int(round(fps * .12)))):
        if any(a <= c <= b for c in cutset) and b - a < fps * .2:
            continue                   # a cut, not a shake
        seg = np.concatenate([rx[a:b + 1], ry[a:b + 1]])
        flips = int(np.sum(np.diff(np.sign(rx[a:b + 1])) != 0) + np.sum(np.diff(np.sign(ry[a:b + 1])) != 0))
        if flips < 3 or float(np.mean(bad[a:b + 1])) > .4:
            continue                   # one-directional whip or unreliable estimates, not a shake
        shakes.append({'f0': int(a), 'f1': int(b), 't0': round(a / fps, 3), 't1': round((b + 1) / fps, 3), 'rms_px_s': round(float(rms[a:b + 1].max()), 1)})
    # flashes and solid frames
    m = luma.mean(axis=(1, 2)); sd = luma.std(axis=(1, 2))
    flashes = []
    i = 1
    while i < n - 1:
        lo = m[max(0, i - 4):i].mean() if i > 0 else m[i]
        jump = m[i] - m[i - 1]
        if abs(jump) > 45 or (sd[i] < 6 and abs(m[i] - lo) > 30):
            j = i
            while j + 1 < n and abs(m[j + 1] - m[i]) < 25 and j - i < 6: j += 1
            back = j + 1 < n and abs(m[j + 1] - lo) < abs(m[i] - lo) * .6
            kind = 'flash_white' if m[i] > lo else 'flash_black'
            if sd[i] < 6: kind = 'solid_white' if m[i] > 200 else 'solid_black' if m[i] < 40 else 'solid_color'
            if back or sd[i] < 6:
                flashes.append({'type': kind, 'f0': int(i), 'f1': int(j), 't': round(i / fps, 3), 'frames': int(j - i + 1), 'hides_cut': any(i <= c <= j + 1 for c in cutset)})
                i = j + 1; continue
        i += 1
    # cadence per shot: unique frames (a repeat = near-identical to the previous frame)
    diffs = np.zeros(n, np.float32)
    diffs[1:] = np.abs(np.diff(luma, axis=0)).mean(axis=(1, 2))
    bounds = [0] + sorted(c for c in cuts if 0 < c < n) + [n]
    cadence = []
    for a, b in zip(bounds[:-1], bounds[1:]):
        seg = diffs[a + 1:b]
        uniq = 1 + int((seg > .35).sum())
        of = b - a
        pat = 'native' if uniq >= of * .92 else 'freeze' if uniq <= max(1, of * .1) else 'stepped'
        cadence.append({'f0': a, 'f1': b - 1, 'unique': uniq, 'of': of, 'pattern': pat,
                        'effective_fps': round(fps * uniq / max(1, of), 1)})
    # hits: strong audio accents that land on a picture event (cut, flash, shake/move onset) within ±2 frames
    events = sorted(set(list(cuts) + [f['f0'] for f in flashes] + [s['f0'] for s in shakes] + [mv['f0'] for mv in moves]))
    hits = []
    if accents:
        strong = [a for a in accents if a.get('strength', 1) >= .35]
        for a in strong:
            fa = a['t'] * fps
            near = [e for e in events if abs(e - fa) <= 2.0]
            if near:
                e = min(near, key=lambda x: abs(x - fa))
                hits.append({'t': a['t'], 'frame': int(e), 'offset_frames': round(e - fa, 1),
                             'event': 'cut' if e in cutset else 'flash' if any(f['f0'] == e for f in flashes) else 'motion'})
    # cut-on-onset share (±2 frames), as the Katana reference workflow measures it
    on_share = None
    if accents and cuts:
        at = np.array([a['t'] for a in accents]) * fps
        ok = sum(1 for c in cuts if np.min(np.abs(at - c)) <= 2.0)
        on_share = round(ok / len(cuts), 3)
    dur = n / fps
    per_sec = []
    for s in range(int(math.ceil(dur))):
        f0, f1 = int(s * fps), min(n, int((s + 1) * fps))
        per_sec.append({'s': s, 'cuts': sum(1 for c in cuts if f0 <= c < f1), 'flashes': sum(1 for f in flashes if f0 <= f['f0'] < f1),
                        'shake': any(sh['f0'] < f1 and sh['f1'] >= f0 for sh in shakes),
                        'moving': round(float(np.mean([any(mv['f0'] <= i <= mv['f1'] for mv in moves) for i in range(f0, f1)])) if f1 > f0 else 0, 2),
                        'motion_mean': round(float(diffs[f0:f1].mean()) if f1 > f0 else 0, 2),
                        'hits': sum(1 for h in hits if f0 <= h['frame'] < f1)})
    moving_share = float(np.mean([any(mv['f0'] <= i <= mv['f1'] for mv in moves) for i in range(n)])) if n else 0
    rates = {'cuts_per_s': round(len(cuts) / dur, 3), 'flashes_per_s': round(len(flashes) / dur, 3),
             'shake_bursts_per_s': round(len(shakes) / dur, 3), 'camera_moves_per_s': round(len(moves) / dur, 3),
             'camera_moving_share': round(moving_share, 3), 'hits_per_s': round(len(hits) / dur, 3),
             'mean_abs_pan_px_s': round(float(np.abs(sdx).mean() + np.abs(sdy).mean()), 1),
             'mean_abs_zoom_per_s': round(float(np.abs(szoom).mean()), 4), 'cut_on_onset_share': on_share,
             'mean_motion': round(float(diffs.mean()), 2)}
    return {'schema': 'katana-np.energy/1', 'fps': fps, 'frames': n, 'duration': round(dur, 3), 'rates': rates,
            'camera_moves': moves, 'shake_bursts': shakes, 'flashes': flashes, 'cadence': cadence, 'hits': hits,
            'per_second': per_sec,
            'curves': {'pan_px_s': [round(float(v), 1) for v in sdx], 'tilt_px_s': [round(float(v), 1) for v in sdy],
                       'zoom_per_s': [round(float(v), 4) for v in szoom], 'shake_rms': [round(float(v), 1) for v in rms]}}


def compare_rates(ref, ours):
    """Rates of a render against the reference's: ratio per rate (1.0 = same energy). Used by `katana energy --vs`."""
    out = {}
    for k, v in ref['rates'].items():
        o = ours['rates'].get(k)
        if isinstance(v, (int, float)) and isinstance(o, (int, float)) and v:
            out[k] = {'ref': v, 'ours': o, 'ratio': round(o / v, 2)}
    return out


if __name__ == '__main__':
    import argparse, subprocess
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    import analyze_ref as A
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('video'); ap.add_argument('--region'); ap.add_argument('--out')
    ap.add_argument('--vs', help='a reference energy.json to compare this video against')
    a = ap.parse_args()
    meta = A.probe(a.video)
    crop, (W, H) = A.region_filter(a.region, meta['width'], meta['height'])
    sw = 160; sh = max(2, int(round(sw * H / W / 2)) * 2)
    fr = A.decode_small(a.video, crop, (sw, sh))
    _, mad, _, hd = A.picture_metrics(fr)
    cuts = A.detect_cuts(mad, hd, meta['fps'])
    y = A.decode_audio(a.video) if meta['audio'] else None
    au = A.audio_analysis(y, 22050) if y is not None else None
    e = energy_map(fr, meta['fps'], cuts, au['accents'] if au else None)
    out = a.out or os.path.splitext(a.video)[0] + '_energy.json'
    json.dump(e, open(out, 'w'), indent=1)
    print(json.dumps(e['rates'], indent=1))
    if a.vs:
        ref = json.load(open(a.vs))
        print('vs reference:'); print(json.dumps(compare_rates(ref, e), indent=1))
    print('energy:', out, file=sys.stderr)
