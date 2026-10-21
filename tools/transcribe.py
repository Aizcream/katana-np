#!/usr/bin/env python3
"""transcribe — word-level timestamps (Spanish by default) for word-synced captions, with whisper.cpp on the Mac's GPU.

usage: transcribe.py <video|audio> [--out words.json] [--lang es] [--prompt "North Pearl, Astro"] [--from s] [--to s]
                     [--model models/ggml-large-v3-turbo-q5_0.bin] [--vad] [--no-snap] [--srt out.srt] [--max-words 4]

Output JSON (feeds K.kit.captions directly: `words`):
  {language, model, duration, text, words: [{text, start, end, p}], segments: [{text, start, end}]}
Times in seconds from the start of the media (or from --from). Pipeline:
  1. ffmpeg → 16 kHz mono WAV (only the --from/--to window);
  2. whisper-cli: large-v3-turbo (q5_0), --dtw large.v3.turbo with flash attention OFF (DTW needs it off), -sns,
     --prompt = vocabulary (brand names spelled right: "North Pearl", "Astro"); a prompt with Spanish punctuation keeps ¿?.
     NO VAD by default: measured 2026-10-20 (whisper.cpp 1.9.5), --vad shifts every later timestamp EARLY, cumulatively
     (−1.6 s after 17 s of speech with pauses). --vad is opt-in for long silent recordings where only the text matters;
  3. tokens → words (a token starting with a space starts a word; punctuation attaches to the previous word);
  4. start: measured on ground-truth tracks, the token offset lands 0–0.36 s EARLY and the DTW time 0.2–0.41 s LATE
     (Katana's notes: Whisper ~0.27 s late on TTS), so the true onset lies between them → --snap (default) takes the
     EARLIEST strong rise of the speech-energy envelope inside [min(offset, dtw−.32)−.04, dtw+.04]; a snap farther than
     --onset-guard (0.2 s) from dtw−0.29 is rejected for dtw−0.29. End = next word's start, cut at the first silence
     ≥ 120 ms. Words lying entirely in silence drop; Silero VAD gates "no speech at all"; known Spanish hallucinations
     ("Gracias por ver el video", "Suscríbete", "Subtítulos realizados por…") and 30-s-for-5-words segments drop.
  Accuracy (2026-10-20, two Spanish voices, 108 words with known starts): median start error 2–4 ms; separated words
  ~93 % within one 30-fps frame; run-together words ~70 % within a frame, 90th percentile ≤ 0.19 s.
  Voice over music: transcribe the DRY voice track when you have it (music onsets can pull the snap).
Needs: brew install whisper.cpp (whisper-cli) + the model in Katana/models (see README).
"""
import argparse, json, os, re, subprocess, sys, tempfile, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
KROOT = os.path.dirname(HERE)
MODEL = os.path.join(KROOT, 'models', 'ggml-large-v3-turbo-q5_0.bin')
VAD = os.path.join(KROOT, 'models', 'ggml-silero-v5.1.2.bin')
SR = 16000
DTW_LAG = .29          # measured 2026-10-20 on a ground-truth track: DTW times are 0.20–0.41 s late (mean 0.29)
HALLUCINATIONS = re.compile(r'gracias por (ver|su atenci|mirar)|suscr[ií]bete|subt[ií]tulos (realizados|por|de)|amara\.org|'
                            r'no olvides suscribirte|dale like|nos vemos en el pr[oó]ximo', re.I)
PUNCT = re.compile(r'^[\s.,;:!?¡¿…"\'»«)\]-]+$')


def to_wav(src, dst, t0=None, t1=None):
    cmd = ['ffmpeg', '-v', 'error', '-y']
    if t0: cmd += ['-ss', f'{t0:.3f}']
    cmd += ['-i', src]
    if t1: cmd += ['-t', f'{(t1 - (t0 or 0)):.3f}']
    cmd += ['-vn', '-ac', '1', '-ar', str(SR), '-c:a', 'pcm_s16le', dst]
    subprocess.run(cmd, check=True)
    with wave.open(dst) as w:
        return np.frombuffer(w.readframes(w.getnframes()), dtype='<i2').astype(np.float32) / 32768.0


def envelope(y, hop=0.005):
    """Speech-band energy envelope (dB) every 5 ms."""
    h = int(SR * hop); n = len(y) // h
    if n == 0: return np.zeros(0)
    fr = y[: n * h].reshape(n, h)
    # pre-emphasis-ish: first difference favours consonant onsets over low rumble
    d = np.diff(fr, axis=1, prepend=fr[:, :1])
    return 10 * np.log10((d ** 2).mean(axis=1) + 1e-10)


def snap_start(t, env, hop=0.005, win=0.08):
    """Move t to the steepest energy rise within ±win (only if a real rise exists)."""
    i0, i1 = max(1, int((t - win) / hop)), min(len(env) - 1, int((t + win) / hop))
    if i1 <= i0: return t
    rise = env[i0 + 1:i1 + 1] - env[i0 - 1:i1 - 1]
    k = int(np.argmax(rise))
    return round((i0 + k) * hop, 3) if rise[k] > 6 else t


def window_onset_earliest(env, lo, hi, hop=0.005):
    """The EARLIEST strong rise inside [lo, hi] (then the peak of that rise), or None."""
    i0, i1 = max(2, int(lo / hop)), min(len(env) - 1, int(hi / hop))
    if i1 <= i0: return None
    rise = env[i0:i1] - env[i0 - 2:i1 - 2]
    m = float(rise.max())
    if m <= 8: return None
    k = int(np.argmax(rise >= max(8.0, .6 * m)))
    while k + 1 < len(rise) and rise[k + 1] > rise[k]: k += 1
    return round((i0 + k - 1) * hop, 3)


def window_onset(env, lo, hi, expect, hop=0.005):
    """The energy rise (dB per 10 ms) inside [lo, hi] closest to `expect` among the strong ones, or None."""
    i0, i1 = max(2, int(lo / hop)), min(len(env) - 1, int(hi / hop))
    if i1 <= i0: return None
    rise = env[i0:i1] - env[i0 - 2:i1 - 2]
    m = float(rise.max())
    if m <= 8: return None
    thr = max(8.0, .5 * m)
    peaks = [k for k in range(len(rise)) if rise[k] >= thr and (k == 0 or rise[k] >= rise[k - 1]) and (k + 1 == len(rise) or rise[k] >= rise[k + 1])]
    if not peaks: return None
    k = min(peaks, key=lambda q: abs((i0 + q - 1) * hop - expect))
    return round((i0 + k - 1) * hop, 3)


def speech_mask(env, floor_db=None):
    floor = np.percentile(env, 10) if floor_db is None else floor_db
    return env > floor + 12


def _core(t):
    return re.sub(r'[^\w]', '', t.lower())


def merge_punctuation(words, plain):
    """Copy leading ¿¡ and trailing .,;:?! from the unprompted pass onto the matching words of the prompted pass."""
    import difflib
    sm = difflib.SequenceMatcher(a=[_core(w['text']) for w in words], b=[_core(w['text']) for w in plain], autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag != 'equal': continue
        for k in range(i2 - i1):
            w, q = words[i1 + k], plain[j1 + k]
            lead = re.match(r'^[¿¡]*', q['text']).group(0); trail = re.search(r'[.,;:?!…]*$', q['text']).group(0)
            core = re.sub(r'^[¿¡]+', '', re.sub(r'[.,;:?!…]+$', '', w['text']))
            w['text'] = lead + core + trail


def resegment(words, segs):
    """Segment texts rebuilt from the merged words (same time spans)."""
    out = []
    for s in segs:
        ws = [w['text'] for w in words if s['start'] - .05 <= w['_off'] <= s['end'] + .05]
        out.append({**s, 'text': ' '.join(ws) if ws else s['text']})
    return out


def vad_segments(wav):
    """Number of speech segments Silero finds (None if the tool/model is missing). Used ONLY as a speech/no-speech gate:
    its timestamps drift like --vad's, so they never set word times."""
    if not os.path.exists(VAD): return None
    r = subprocess.run(['whisper-vad-speech-segments', '-vm', VAD, '-f', wav, '-np'], capture_output=True, text=True)
    m = re.search(r'Detected (\d+) speech segments', r.stdout + r.stderr)
    return int(m.group(1)) if m else None


def run_whisper(wav, a, prompt=None, sns=True, dtw=True):
    out = tempfile.mktemp(prefix='kasr_')
    cmd = ['whisper-cli', '-m', a.model, '-l', a.lang, '-ojf', '-of', out, '-np', '-f', wav]
    if dtw: cmd += ['-nfa', '--dtw', 'large.v3.turbo']      # DTW token times need flash attention off
    if prompt: cmd += ['--prompt', prompt]
    if sns: cmd += ['-sns']          # suppress non-speech tokens — it also suppresses ¿ ¡, so the punctuation pass runs without it
    if a.vad and os.path.exists(VAD): cmd += ['--vad', '-vm', VAD]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(out + '.json'):
        sys.exit('transcribe: whisper-cli failed:\n' + (r.stderr or r.stdout)[-1500:])
    d = json.load(open(out + '.json')); os.remove(out + '.json')
    return d


def words_from(d, dur):
    words, segs = [], []
    for s in d.get('transcription', []):
        segs.append({'text': s['text'].strip(), 'start': s['offsets']['from'] / 1000, 'end': s['offsets']['to'] / 1000})
        for t in s.get('tokens', []):
            txt = t['text']
            if txt.startswith('[_') or not txt.strip():
                continue
            t_dtw = t.get('t_dtw', -1)
            off_t = t['offsets']['from'] / 1000
            ts = (t_dtw / 100) if t_dtw is not None and t_dtw >= 0 else off_t
            te = t['offsets']['to'] / 1000
            if PUNCT.match(txt) and words and not txt.strip() in ('¿', '¡'):
                words[-1]['text'] += txt.strip(); words[-1]['_end'] = max(words[-1]['_end'], te); continue
            if words and words[-1].get('_open'):              # "¿" / "¡" glue to the token that follows
                w = words[-1]; w['text'] += txt.strip(); w['_end'] = max(w['_end'], te); w['p'].append(t.get('p', 1))
                w['_open'] = False; w['start'] = w['_dtw'] = ts; w['_off'] = off_t   # time the word by its first letter
            elif txt.startswith(' ') or not words:
                w = {'text': txt.strip(), 'start': ts, '_dtw': ts, '_off': off_t, '_end': te, 'p': [t.get('p', 1)]}
                w['_open'] = txt.strip() in ('¿', '¡')        # an opening mark glues to the next token
                words.append(w)
            else:
                words[-1]['text'] += txt; words[-1]['_end'] = max(words[-1]['_end'], te); words[-1]['p'].append(t.get('p', 1))
                words[-1]['_open'] = False
    return words, segs


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('media'); ap.add_argument('--out'); ap.add_argument('--lang', default='es')
    ap.add_argument('--prompt', default='¿Qué tal? Somos North Pearl: webs con Astro, SEO y Lighthouse.')
    ap.add_argument('--model', default=MODEL); ap.add_argument('--vad', action='store_true', help='Silero VAD (text only: shifts timestamps early)'); ap.add_argument('--no-snap', action='store_true')
    ap.add_argument('--onset', default=os.environ.get('KATANA_ONSET', 'earliest'), choices=['nearest', 'earliest'])
    ap.add_argument('--onset-guard', type=float, default=float(os.environ.get('KATANA_GUARD', '0.2')))
    ap.add_argument('--from', dest='t0', type=float); ap.add_argument('--to', dest='t1', type=float)
    ap.add_argument('--srt'); ap.add_argument('--max-words', type=int, default=4)
    ap.add_argument('--single-pass', action='store_true', help='skip the unprompted punctuation pass')
    a = ap.parse_args()
    if not os.path.exists(a.model):
        sys.exit(f'transcribe: model not found: {a.model}\n  curl -L -o "{MODEL}" https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin')
    tmp = tempfile.mktemp(prefix='kasr_', suffix='.wav')
    y = to_wav(a.media, tmp, a.t0, a.t1)
    dur = len(y) / SR
    d = run_whisper(tmp, a, a.prompt)
    # any --prompt makes the decoder drop Spanish opening marks (¿ ¡) and turn ? into , (measured): a second pass WITHOUT
    # the prompt supplies the punctuation, the prompted pass supplies the words (brand names spelled right)
    d_plain = run_whisper(tmp, a, None, sns=False, dtw=False) if a.prompt and not a.single_pass else None
    speech_segments = vad_segments(tmp)
    os.remove(tmp)
    dropped = []
    if speech_segments == 0:
        dropped = [s['text'] for s in d.get('transcription', [])]
        d['transcription'] = []
    else:
        keep = []
        for sg in d.get('transcription', []):
            n_w = len(sg['text'].split()); span = max(.01, (sg['offsets']['to'] - sg['offsets']['from']) / 1000)
            if HALLUCINATIONS.search(sg['text']) or (span > 8 and n_w / span < .6):
                dropped.append(sg['text'].strip())
            else:
                keep.append(sg)
        d['transcription'] = keep
    words, segs = words_from(d, dur)
    if d_plain is not None and words:
        merge_punctuation(words, words_from(d_plain, dur)[0])
        segs = resegment(words, segs)
    env = envelope(y); sp = speech_mask(env)
    # starts: the onset lies between the (early) token offset and the (late) DTW time → steepest energy rise in that window
    for i, w in enumerate(words):
        dtw, off = w['_dtw'], w['_off']
        expect = max(dtw - DTW_LAG, off - .06)                  # DTW lands ~0.29 s late (measured), never far before the offset
        st = None
        if a.onset == 'earliest':
            lo, hi = min(off, dtw - .32) - .04, dtw + .04
            if i: lo = max(lo, words[i - 1]['start'] + .05)
            if not a.no_snap and len(env) and hi > lo: st = window_onset_earliest(env, lo, hi)
            if a.onset_guard and st is not None and abs(st - expect) > a.onset_guard: st = None   # implausible snap → calibrated DTW
            w['start'] = st if st is not None else max(lo, expect if a.onset_guard else dtw - .25)
        else:
            lo, hi = expect - .15, expect + .12
            if i: lo = max(lo, words[i - 1]['start'] + .08)
            if not a.no_snap and len(env) and hi > lo: st = window_onset(env, lo, hi, expect)
            w['start'] = st if st is not None else max(lo, expect)
        if i and w['start'] < words[i - 1]['start'] + .03:
            w['start'] = round(words[i - 1]['start'] + .03, 3)
    # drop hallucinated words that sit entirely in silence
    if len(sp):
        keep = []
        for w in words:
            a0, a1 = int(w['start'] / .005), int(max(w['_end'], w['start'] + .1) / .005) + 1
            if sp[a0:a1].any(): keep.append(w)
        words = keep
    # ends: next start, but stop at the first silence (≥ 120 ms) after the word's own end estimate
    for i, w in enumerate(words):
        nxt = words[i + 1]['start'] if i + 1 < len(words) else dur
        e = min(nxt, max(w['_end'], w['start'] + .08))
        j = int(e / .005)
        if len(sp):
            k = int(w['start'] / .005) + 4
            run = 0
            while k < min(len(sp), int(nxt / .005)):
                run = run + 1 if not sp[k] else 0
                if run >= 24: e = min(e, (k - 23) * .005); break
                k += 1
        w['end'] = round(max(w['start'] + .06, min(e, nxt)), 3)
        w['start'] = round(w['start'], 3)
        w['p'] = round(float(np.mean(w['p'])), 3)
        for k in ('_end', '_open', '_dtw', '_off'): w.pop(k, None)
    off = a.t0 or 0
    if off:
        for w in words: w['start'] = round(w['start'] + off, 3); w['end'] = round(w['end'] + off, 3)
        for s in segs: s['start'] += off; s['end'] += off
    res = {'language': a.lang, 'model': os.path.basename(a.model), 'duration': round(dur, 3), 'offset': off,
           'speech_segments': speech_segments, 'dropped_hallucinations': dropped,
           'text': ' '.join(s['text'] for s in segs), 'words': words, 'segments': segs}
    out = a.out or os.path.splitext(a.media)[0] + '_words.json'
    json.dump(res, open(out, 'w'), ensure_ascii=False, indent=1)
    if a.srt:
        def ts(x):
            h, r = divmod(x, 3600); m, s = divmod(r, 60); return f'{int(h):02d}:{int(m):02d}:{s:06.3f}'.replace('.', ',')
        L, chunk, n = [], [], 1
        for i, w in enumerate(words):
            chunk.append(w)
            brk = len(chunk) >= a.max_words or w['text'][-1:] in '.?!,;:' or (i + 1 < len(words) and words[i + 1]['start'] - w['end'] > .6)
            if brk or i == len(words) - 1:
                L += [str(n), f'{ts(chunk[0]["start"])} --> {ts(chunk[-1]["end"])}', ' '.join(c['text'] for c in chunk), '']
                n += 1; chunk = []
        open(a.srt, 'w').write('\n'.join(L))
    lowp = [w['text'] for w in words if w['p'] < .5]
    print(f'transcribe: {len(words)} words, {dur:.2f} s → {out}' + (f'  (low confidence: {", ".join(lowp[:12])})' if lowp else ''))
    if dropped: print('  dropped (no speech / hallucination): ' + ' | '.join(dropped[:4]))
    print(res['text'] or '(no speech)')


if __name__ == '__main__':
    main()
