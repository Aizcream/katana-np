#!/usr/bin/env python3
"""voice — ElevenLabs voice-over for Katana NP films, with EXACT word timings for captions (no transcription needed).

usage:
  voice.py check                                   plan, credits used / left, reset date (free call)
  voice.py voices [--search x]                      voices already in the account (name, id, accent, language)
  voice.py library [--lang es] [--accent latin american] [--gender female] [--use-case social_media] [--search x] [--limit 20]
                                                   ElevenLabs voice library (shared voices) — preview URLs to listen to
  voice.py add <public_owner_id> <voice_id> --name "Nombre"     add a library voice to the account (uses a voice slot)
  voice.py say "<texto>" --voice <id|name> --out projects/<p>/assets/voz [--model eleven_multilingual_v2] [--speed 1.0]
               [--stability .45] [--similarity .8] [--style .2] [--seed 7] [--file guion.txt] [--yes]
      WITHOUT --yes it only estimates the credits. With --yes it writes <out>.mp3 (as delivered), <out>.wav (48 kHz stereo,
      for `K.music`) and <out>_words.json ({words: [{text, start, end}]}, straight into K.kit.captions), and appends a line
      to ./elevenlabs-ledger.jsonl (time, characters, model, voice, credits before/after, outputs).

Words come from the /with-timestamps alignment: per-CHARACTER start/end times of the exact script, so captions show the
script as written (¿¡, accents, brand names) at the moment each word is spoken.
FREE plan via API: only the "premade" voices (library voices answer 402 paid_plan_required, measured 2026-10-20).
Credits (pricing page, 2026-10-20): Multilingual v2 / v3 / v4 ≈ 1 credit per character, Flash v2.5 ≈ 0.5. Free plan:
10,000 credits/month, NO commercial license (published content must credit "elevenlabs.io" in the title); paid plans
include a commercial license. The key is read from $ELEVENLABS_API_KEY or ~/.config/elevenlabs/credentials.env and is
never printed or put in a URL.
"""
import argparse, base64, json, os, re, subprocess, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://api.elevenlabs.io'
CRED = os.path.expanduser('~/.config/elevenlabs/credentials.env')
RATE = {'eleven_flash_v2_5': .5, 'eleven_turbo_v2_5': .5, 'eleven_flash_v2': .5}    # credits per character; others 1.0


def key():
    """$ELEVENLABS_API_KEY, else the first ElevenLabs key token (sk_ + 48 hex) found in the credentials file — whatever its
    layout (KEY=value, a bare key, stray terminal escapes). Never printed."""
    k = os.environ.get('ELEVENLABS_API_KEY')
    if not k and os.path.exists(CRED):
        raw = re.sub(r'\x1b\[[0-9;]*[A-Za-z~]', '', open(CRED, encoding='utf-8', errors='replace').read())
        m = re.search(r'sk_[0-9a-f]{48}', raw) or re.search(r'ELEVENLABS_API_KEY\s*=\s*["\']?([^"\'\s]+)', raw)
        if m: k = m.group(1) if m.groups() else m.group(0)
    if not k:
        sys.exit('voice: no hay clave de ElevenLabs → copia tu API key (elevenlabs.io → Developers → API Keys) y ejecuta: '
                 './katana keys elevenlabs')
    return k


def call(method, path, body=None, query=None, raw=False):
    url = API + path + ('?' + urllib.parse.urlencode(query) if query else '')
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={'xi-api-key': key(), 'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            payload = r.read(); hdr = dict(r.headers)
    except urllib.error.HTTPError as e:
        msg = e.read().decode('utf-8', 'replace')[:600]
        if e.code == 401: sys.exit(f'voice: 401 — the API key was rejected (check it or its permissions). {msg}')
        if 'paid_plan_required' in msg:
            sys.exit('voice: this needs a paid ElevenLabs plan — on the FREE plan the API only allows the "premade" voices '
                     '(`katana voice voices`, category premade), not library/professional voices. ' + msg)
        if e.code == 402 or 'quota' in msg.lower(): sys.exit(f'voice: not enough credits for this request. {msg}')
        sys.exit(f'voice: HTTP {e.code} on {method} {path}: {msg}')
    return (payload, hdr) if raw else (json.loads(payload) if payload else {})


def subscription():
    return call('GET', '/v1/user/subscription')


def fmt_sub(s):
    used, lim = s.get('character_count', 0), s.get('character_limit', 0)
    reset = s.get('next_character_count_reset_unix')
    when = time.strftime('%Y-%m-%d', time.localtime(reset)) if reset else '?'
    return f"plan {s.get('tier')} ({s.get('status')}) · used {used:,} / {lim:,} credits · left {lim - used:,} · resets {when} · voice slots {s.get('voice_slots_used')}/{s.get('voice_limit')}"


def cmd_check(a):
    s = subscription()
    print(fmt_sub(s))
    if str(s.get('tier', '')).lower() == 'free':
        print('note: the FREE plan has no commercial license — fine for drafts/tests; for published North Pearl ads use a paid plan '
              '(or credit "elevenlabs.io" in the title of non-commercial posts).')


def cmd_voices(a):
    q = {'page_size': 100}
    if a.search: q['search'] = a.search
    r = call('GET', '/v2/voices', query=q)
    for v in r.get('voices', []):
        lb = v.get('labels') or {}
        print(f"{v.get('name')[:28]:28s} {v.get('voice_id')}  {v.get('category', ''):12s} {lb.get('accent', '')} {lb.get('gender', '')} {lb.get('language', '') or ''} {lb.get('use_case', '') or lb.get('use case', '')}")


def cmd_library(a):
    q = {'page_size': min(100, a.limit), 'language': a.lang}
    for k in ('accent', 'gender', 'search', 'age'):
        if getattr(a, k): q[k] = getattr(a, k)
    if a.use_case: q['use_cases'] = a.use_case
    r = call('GET', '/v1/shared-voices', query=q)
    for v in r.get('voices', [])[: a.limit]:
        print(f"{v.get('name')[:30]:30s} {v.get('accent', '')[:16]:16s} {v.get('locale') or '':6s} {v.get('gender', ''):7s} {v.get('age', ''):12s} "
              f"{v.get('use_case', '')[:18]:18s} free={'y' if v.get('free_users_allowed') else 'n'} uses7d={v.get('usage_character_count_7d', 0):>9,}\n"
              f"    add: {v.get('public_owner_id')} {v.get('voice_id')}   preview: {v.get('preview_url')}\n    {(v.get('description') or '')[:150]}")
    print(f"({len(r.get('voices', []))} shown of {r.get('total_count', '?')})")


def cmd_add(a):
    r = call('POST', f'/v1/voices/add/{a.public_owner_id}/{a.voice_id}', body={'new_name': a.name})
    print('added to the account:', a.name, r.get('voice_id'))


def resolve_voice(v):
    if re.fullmatch(r'[A-Za-z0-9]{20}', v): return v
    r = call('GET', '/v2/voices', query={'page_size': 100, 'search': v})
    for x in r.get('voices', []):
        if x.get('name', '').lower() == v.lower() or v.lower() in x.get('name', '').lower():
            return x['voice_id']
    sys.exit(f'voice: no voice named "{v}" in the account (voice.py voices / library / add)')


def words_from_alignment(al):
    chars, st, en = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
    words, cur = [], None
    for c, s0, e0 in zip(chars, st, en):
        if c.isspace():
            if cur: words.append(cur); cur = None
            continue
        silent = c in '¿¡«"\'(“'
        if cur is None: cur = {'text': c, 'start': s0, 'end': e0, '_spoken': not silent}
        else:
            cur['text'] += c; cur['end'] = e0
            if not cur['_spoken'] and not silent: cur['start'] = s0; cur['_spoken'] = True
    if cur: words.append(cur)
    # a word "starts" at its first SPOKEN character: leading ¿ ¡ « " carry no sound
    for w in words:
        w.pop('_spoken', None)
        w['start'] = round(w['start'], 3); w['end'] = round(max(w['end'], w['start'] + .04), 3)
    return words


def cmd_say(a):
    text = open(a.file).read().strip() if a.file else a.text
    if not text: sys.exit('voice: empty text')
    model = a.model
    est = round(len(text) * RATE.get(model, 1.0))
    s = subscription(); left = s.get('character_limit', 0) - s.get('character_count', 0)
    print(f'{len(text)} characters · model {model} · ≈ {est} credits · {fmt_sub(s)}')
    if est > left: sys.exit(f'voice: needs ≈ {est} credits, only {left} left this period')
    if not a.yes:
        print('estimate only — add --yes to generate'); return
    vid = resolve_voice(a.voice)
    body = {'text': text, 'model_id': model,
            'voice_settings': {'stability': a.stability, 'similarity_boost': a.similarity, 'style': a.style, 'use_speaker_boost': True, 'speed': a.speed}}
    if a.seed is not None: body['seed'] = a.seed
    if a.language and model not in ('eleven_multilingual_v2',): body['language_code'] = a.language
    if a.previous: body['previous_text'] = a.previous
    if a.next: body['next_text'] = a.next
    r = call('POST', f'/v1/text-to-speech/{vid}/with-timestamps', body=body, query={'output_format': a.format})
    out = os.path.abspath(a.out); os.makedirs(os.path.dirname(out), exist_ok=True)
    mp3 = out + '.mp3'
    open(mp3, 'wb').write(base64.b64decode(r['audio_base64']))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp3, '-ar', '48000', '-ac', '2', out + '.wav'], check=True)
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out + '.wav'], capture_output=True, text=True).stdout or 0)
    al = r.get('alignment') or r.get('normalized_alignment')
    words = words_from_alignment(al) if al else []
    res = {'source': 'elevenlabs', 'model': model, 'voice_id': vid, 'text': text, 'duration': round(dur, 3), 'words': words}
    json.dump(res, open(out + '_words.json', 'w'), ensure_ascii=False, indent=1)
    s2 = subscription(); used = s2.get('character_count', 0) - s.get('character_count', 0)
    with open('elevenlabs-ledger.jsonl', 'a') as f:
        f.write(json.dumps({'t': time.strftime('%Y-%m-%dT%H:%M:%S'), 'chars': len(text), 'model': model, 'voice_id': vid, 'est_credits': est,
                            'credits_used': used, 'left': s2.get('character_limit', 0) - s2.get('character_count', 0), 'out': out}, ensure_ascii=False) + '\n')
    print(f'voice: {dur:.2f} s → {mp3} · {out}.wav · {out}_words.json ({len(words)} words) · credits used {used} (≈{est}) · left {s2.get("character_limit", 0) - s2.get("character_count", 0):,}')
    print(' '.join(f"{w['text']}@{w['start']:.2f}" for w in words[:16]) + (' …' if len(words) > 16 else ''))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest='cmd', required=True)
    sp.add_parser('check')
    v = sp.add_parser('voices'); v.add_argument('--search')
    l = sp.add_parser('library'); l.add_argument('--lang', default='es'); l.add_argument('--accent'); l.add_argument('--gender'); l.add_argument('--age')
    l.add_argument('--use-case'); l.add_argument('--search'); l.add_argument('--limit', type=int, default=20)
    d = sp.add_parser('add'); d.add_argument('public_owner_id'); d.add_argument('voice_id'); d.add_argument('--name', required=True)
    s = sp.add_parser('say'); s.add_argument('text', nargs='?', default=''); s.add_argument('--file'); s.add_argument('--voice', required=True)
    s.add_argument('--out', required=True); s.add_argument('--model', default='eleven_multilingual_v2'); s.add_argument('--language', default='es')
    s.add_argument('--speed', type=float, default=1.0); s.add_argument('--stability', type=float, default=.45); s.add_argument('--similarity', type=float, default=.8)
    s.add_argument('--style', type=float, default=.2); s.add_argument('--seed', type=int); s.add_argument('--format', default='mp3_44100_128')
    s.add_argument('--previous'); s.add_argument('--next'); s.add_argument('--yes', action='store_true')
    a = ap.parse_args()
    {'check': cmd_check, 'voices': cmd_voices, 'library': cmd_library, 'add': cmd_add, 'say': cmd_say}[a.cmd](a)


if __name__ == '__main__':
    main()
