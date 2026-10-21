#!/usr/bin/env python3
"""mix — the film's soundtrack from its cue list: SFX samples on cues, an optional music bed, loudness-mastered.

usage: mix.py <pageinfo.json> <out.wav> [--sfx DIR] [--root DIR] [--lufs -14] [--no-music] [--music-gain dB] [--sfx-gain dB]

Reads window.__cues (written by tools/pageinfo.mjs):
  cues  [{kind, t, gain, pan, name}]   kind → a sample from the SFX library (round-robin per kind, deterministic);
                                        name → an exact file in the library (e.g. "pop_xl_2"); unknown kinds → synth
  music {src, at=0, from=0, gain=0 (dB), fadeIn=0, fadeOut=.6, until=null}   src relative to --root (the Katana folder)
        e.g. the reference MP4 itself — Katana's default is "keep the reference soundtrack".
     or {synth: 'beat', bpm, offset, gain=-6, sections: [[t, 'intro'|'full'|'break'|'drop'|'off'], …]} — a placeholder
        kick/hat/clap/sub bed on the film's grid (the real track is usually added in Instagram/TikTok).
  voice {src, at=0, gain=0}   a voice-over on its own bus: never ducked; the music ducks ~9 dB under it (sidechain with a
        120 ms release) and SFX sit 3 dB lower while it speaks.
Kinds in the library (sfx/*.wav, prefix match): whoosh · whip · zoom · bars · pop · popxl · tick · hit · impact · riser
(placed so it ENDS on t) · sting · ding · zip · cta. Synth kinds: click · key · glitch · swoosh · boom · blip · thump.
Master: sum → soft clip → two-pass ffmpeg loudnorm to --lufs (-14 LUFS, -1 dBTP: Instagram/TikTok). 48 kHz stereo WAV.
"""
import argparse, json, os, subprocess, sys
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
KROOT = os.path.dirname(HERE)

PREFIX = {
    'whoosh': ['whoosh_whip_', 'whoosh_zoom_', 'whoosh_bars_'], 'whip': ['whoosh_whip_'], 'zoom': ['whoosh_zoom_'],
    'bars': ['whoosh_bars_'], 'swipe': ['whoosh_bars_'], 'pop': ['pop_xl_', 'pop_'], 'popxl': ['pop_xl_'], 'cta': ['pop_cta'],
    'tick': ['tick_'], 'hit': ['hit_', 'impact_'], 'impact': ['impact_', 'hit_'], 'riser': ['riser_'], 'sting': ['sting_'],
    'ding': ['ding_'], 'zip': ['zip_'],
}


def decode(path, start=0.0, dur=None):
    cmd = ['ffmpeg', '-v', 'error', '-ss', f'{max(0.0, start):.4f}', '-i', path]
    if dur:
        cmd += ['-t', f'{dur:.4f}']
    cmd += ['-vn', '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-']
    r = subprocess.run(cmd, capture_output=True)
    if r.returncode != 0:
        sys.exit(f'mix: cannot decode {path}: {r.stderr.decode()[:300]}')
    a = np.frombuffer(r.stdout, dtype=np.float32).copy()
    return a.reshape(-1, 2)


# ---------------------------------------------------------------- tiny synth (fallback kinds)
rng = np.random.default_rng(11)


def _t(d): return np.arange(int(d * SR)) / SR


def _env(t, a, d): return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / d)


def _hp(x, a=.97):
    y = np.empty_like(x); prev_x = prev_y = 0.0
    for i, v in enumerate(x):
        prev_y = a * (prev_y + v - prev_x); prev_x = v; y[i] = prev_y
    return y


def synth(kind, dur=None):
    if kind == 'click':
        t = _t(.03); s = rng.standard_normal(len(t)) * _env(t, .0005, .004); s = _hp(s) * .8
    elif kind == 'key':
        t = _t(.05); s = (rng.standard_normal(len(t)) * _env(t, .0005, .006) + np.sin(2 * np.pi * 180 * t) * _env(t, .001, .01) * .5) * .5
    elif kind == 'glitch':
        d = dur or .25; t = _t(d); n = rng.standard_normal(len(t))
        gate = (np.floor(t * 60) % 3 != 0).astype(float); crush = np.round(n * 4) / 4
        s = crush * gate * _env(t, .002, d * .5) * .5
    elif kind == 'swoosh':
        d = dur or .4; t = _t(d); n = rng.standard_normal(len(t)); env = np.sin(np.pi * t / d) ** 2
        s = np.convolve(n, np.ones(6) / 6, mode='same') * env * .6
    elif kind == 'boom':
        t = _t(1.2); f = 40 + 90 * np.exp(-t * 8); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(t, .002, .45) * .9
    elif kind == 'blip':
        t = _t(.08); s = np.sin(2 * np.pi * 1400 * t) * _env(t, .001, .02) * .4
    elif kind == 'thump':
        t = _t(.35); f = 60 + 120 * np.exp(-t * 30); s = np.sin(2 * np.pi * np.cumsum(f) / SR) * _env(t, .001, .09) * .9
    else:
        return None
    return np.stack([s, s], axis=1).astype(np.float32)


# ---------------------------------------------------------------- synthesised beat bed (placeholder music on the film's grid)
def _kick(g=1.0):
    t = _t(.45); f = 45 + 110 * np.exp(-t * 28); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.tanh(1.8 * np.sin(ph) * np.exp(-t * 7.5)) * .9 + rng.standard_normal(len(t)) * np.exp(-t * 300) * .15
    return s * g


def _hat(g=.25, d=.035):
    t = _t(d * 4); n = rng.standard_normal(len(t)); n = n - np.convolve(n, np.ones(3) / 3, mode='same')
    return n * np.exp(-t / d) * g


def _clap(g=.5):
    t = _t(.25); n = rng.standard_normal(len(t)); env = np.zeros(len(t))
    for o in (0, .011, .022):
        i = int(o * SR); env[i:] += np.exp(-(t[: len(t) - i]) * 60) * .6
    env += np.exp(-t * 14) * .25
    n = n - np.convolve(n, np.ones(8) / 8, mode='same')
    return n * env * g


def _bass(f, d, g=.32):
    t = _t(d); ph = 2 * np.pi * f * t
    s = np.tanh(2.2 * (np.sin(ph) + .35 * np.sin(2 * ph))) * np.minimum(1, t / .005) * np.exp(-t * 3.2)
    return s * g


def synth_beat(n, bpm=120, offset=0.0, sections=None, gain_db=-6.0, seed=3):
    """Kick / hats / clap / sub on the film's beat grid. sections: [[t, 'intro'|'full'|'break'|'drop'|'off'], …]."""
    out = np.zeros(n, np.float32); spb = 60 / bpm; dur = n / SR
    secs = sorted(sections or [[0, 'full']])
    mode_at = lambda t: next((m for tt, m in reversed(secs) if t >= tt - 1e-6), secs[0][1])
    roots = [55.0, 55.0, 65.41, 49.0]  # A1 A1 C2 G1, one per bar
    k = 0
    while True:
        t = offset + k * spb / 2   # 8th notes
        if t >= dur: break
        if t >= 0:
            m = mode_at(t); beat = k / 2; on = k % 2 == 0; bar = int(beat // 4)
            def put(sig, tt=t, gg=1.0):
                i = int(tt * SR); L = min(len(sig), n - i)
                if L > 0: out[i:i + L] += sig[:L] * gg
            if m in ('full', 'drop'):
                if on: put(_kick())
                if on and int(beat) % 4 in (1, 3): put(_clap())
                put(_hat(.22 if on else .32))
                if on: put(_bass(roots[bar % 4] * (2 if int(beat) % 4 == 3 else 1), spb * .9))
                if m == 'drop' and abs(t - next(tt for tt, mm in reversed(secs) if t >= tt - 1e-6)) < 1e-3: put(synth('boom')[:, 0], t, 1.0)
            elif m == 'intro':
                if on and int(beat) % 2 == 0: put(_kick(.7))
                put(_hat(.12 if on else .2))
            elif m == 'break':
                if not on: put(_hat(.14))
        k += 1
    out = np.tanh(out * 1.1) * 10 ** (gain_db / 20)
    return np.stack([out, out], axis=1)


# ---------------------------------------------------------------- library
class Library:
    def __init__(self, d):
        self.dir = d
        self.files = sorted(f for f in os.listdir(d) if f.lower().endswith(('.wav', '.aif', '.aiff', '.mp3', '.m4a'))) if os.path.isdir(d) else []
        self.cache, self.count = {}, {}

    def get(self, path):
        if path not in self.cache:
            self.cache[path] = decode(path)
        return self.cache[path]

    def pick(self, kind, name=None):
        if name:
            for f in self.files:
                if os.path.splitext(f)[0] == name or f == name:
                    return self.get(os.path.join(self.dir, f)), f
        for pre in PREFIX.get(kind, [kind + '_']):
            cand = [f for f in self.files if f.startswith(pre)]
            if cand:
                i = self.count.get(kind, 0); self.count[kind] = i + 1
                f = cand[i % len(cand)]
                return self.get(os.path.join(self.dir, f)), f
        return None, None


def place(bus, sig, t0, gain_db=0.0, pan=0.0):
    i = int(round(t0 * SR))
    if i < 0:
        sig = sig[-i:]; i = 0
    if i >= len(bus) or len(sig) == 0:
        return
    n = min(len(sig), len(bus) - i)
    g = 10 ** (gain_db / 20)
    l, r = (1 - max(0, pan)), (1 + min(0, pan))
    bus[i:i + n, 0] += sig[:n, 0] * g * l
    bus[i:i + n, 1] += sig[:n, 1] * g * r


def loudnorm(src, dst, lufs):
    f1 = f'loudnorm=I={lufs}:TP=-1.0:LRA=11:print_format=json'
    r = subprocess.run(['ffmpeg', '-hide_banner', '-i', src, '-af', f1, '-f', 'null', '-'], capture_output=True, text=True)
    txt = r.stderr; j = txt[txt.rfind('{'): txt.rfind('}') + 1]
    try:
        m = json.loads(j)
        if float(m['input_i']) < -70:   # silence: nothing to normalise
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-c:a', 'pcm_s16le', '-ar', str(SR), dst], check=True); return None
        f2 = (f"loudnorm=I={lufs}:TP=-1.0:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:"
              f"measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true")
    except Exception:
        f2 = f'loudnorm=I={lufs}:TP=-1.0:LRA=11'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', src, '-af', f2, '-ar', str(SR), '-c:a', 'pcm_s16le', dst], check=True)
    return m.get('input_i') if isinstance(m, dict) else None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('info'); ap.add_argument('out')
    ap.add_argument('--sfx', default=os.path.join(KROOT, 'sfx'))
    ap.add_argument('--root', default=KROOT)
    ap.add_argument('--lufs', type=float, default=-14)
    ap.add_argument('--no-music', action='store_true')
    ap.add_argument('--music-gain', type=float, default=0.0)
    ap.add_argument('--sfx-gain', type=float, default=-3.0)
    a = ap.parse_args()

    info = json.load(open(a.info))
    cues = info.get('cues') or {}
    dur = float(info['comp']['duration'])
    n = int(round(dur * SR))
    music_bus = np.zeros((n, 2), np.float32); sfx_bus = np.zeros((n, 2), np.float32)
    lib = Library(a.sfx)
    log = []

    m = cues.get('music')
    if m and m.get('synth') and not a.no_music:
        bpm = float(m.get('bpm') or cues.get('bpm') or 120); off = float(m.get('offset', cues.get('beatOffset') or 0))
        music_bus += synth_beat(n, bpm, off, m.get('sections'), float(m.get('gain', -6)) + a.music_gain)
        log.append(f'music: synth beat {bpm:.1f} BPM, sections {m.get("sections") or "full"}')
    elif m and m.get('src') and not a.no_music:
        src = m['src'] if os.path.isabs(m['src']) else os.path.join(a.root, m['src'])
        at, frm = float(m.get('at', 0)), float(m.get('from', 0))
        until = float(m.get('until') or dur)
        sig = decode(src, frm, max(0.01, until - at))
        fi, fo = float(m.get('fadeIn', 0)), float(m.get('fadeOut', .6))
        L = len(sig); tt = np.arange(L) / SR
        env = np.ones(L, np.float32)
        if fi > 0: env *= np.clip(tt / fi, 0, 1)
        if fo > 0: env *= np.clip((L / SR - tt) / fo, 0, 1)
        place(music_bus, sig * env[:, None], at, float(m.get('gain', 0)) + a.music_gain)
        log.append(f'music {os.path.basename(src)} from {frm:.2f}s at {at:.2f}s → {until:.2f}s')

    voice_bus = np.zeros((n, 2), np.float32)
    v = cues.get('voice')
    if v and v.get('src'):
        src = v['src'] if os.path.isabs(v['src']) else os.path.join(a.root, v['src'])
        sig = decode(src)
        place(voice_bus, sig, float(v.get('at', 0)), float(v.get('gain', 0)))
        log.append(f'voice {os.path.basename(src)} at {float(v.get("at", 0)):.2f}s ({len(sig) / SR:.2f} s)')

    for c in cues.get('cues', []):
        kind, t = c['kind'], float(c['t'])
        sig, f = lib.pick(kind, c.get('name'))
        if sig is None:
            sig = synth(kind, c.get('dur')); f = 'synth:' + kind
        if sig is None:
            log.append(f'  ? {t:6.2f}s {kind}: no sample and no synth — skipped'); continue
        t0 = t - len(sig) / SR if kind == 'riser' else t
        gain = 20 * np.log10(max(1e-4, float(c.get('gain', 1)))) + a.sfx_gain
        place(sfx_bus, sig, t0, gain, float(c.get('pan', 0)))
        log.append(f'  {t:6.2f}s {kind:8s} {f}')

    if np.any(voice_bus):
        # sidechain: music −9 dB and SFX −3 dB while the voice speaks (fast attack, ~120 ms release)
        e = np.abs(voice_bus).mean(axis=1); k = int(SR * .03)
        e = np.convolve(e, np.ones(k) / k, mode='same'); act = (e > max(1e-4, e.max() * .04)).astype(np.float32)
        rel = int(SR * .12); act = np.convolve(act, np.ones(rel), mode='full')[:n].clip(0, 1)   # hold ~120 ms after each word
        music_bus *= (1 - (1 - 10 ** (-9 / 20)) * act)[:, None]
        sfx_bus *= (1 - (1 - 10 ** (-3 / 20)) * act)[:, None]
    elif np.any(music_bus):
        # no voice: duck the music under dense SFX a little (keeps the hits readable)
        e = np.abs(sfx_bus).mean(axis=1); k = int(SR * .08)
        e = np.convolve(e, np.ones(k) / k, mode='same'); d = 1 - .35 * np.clip(e / (e.max() + 1e-9) * 2, 0, 1)
        music_bus *= d[:, None]
    mixb = music_bus + sfx_bus + voice_bus
    peak = np.abs(mixb).max()
    if peak > 0.95:
        mixb = np.tanh(mixb / peak * 1.4) / np.tanh(1.4) * .95
    tmp = a.out + '.raw.wav'
    pcm = (np.clip(mixb, -1, 1) * 32767).astype('<i2')
    import wave
    with wave.open(tmp, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    li = loudnorm(tmp, a.out, a.lufs)
    os.remove(tmp)
    print(f'mix: {len(cues.get("cues", []))} cues, {dur:.2f} s → {a.out}  (input {li} LUFS → {a.lufs})')
    for l in log:
        print(l)


if __name__ == '__main__':
    main()
