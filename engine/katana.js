/* KATANA — deterministic timeline engine for code-built motion edits (DOM/CSS/SVG scenes; canvas allowed inside scenes).
   North Pearl's own "Katana": a reference edit is analysed (tools/analyze_ref.py), rebuilt as scenes + kit components,
   captured frame-exact by tools/capture.mjs (headless Chrome, sub-frame motion blur) and encoded by ./katana render.
   Evolved from the FILM engine of higgsfield-motion-saas (window.FILM is kept as an alias, so its recipes still apply).

   Contract with tools/capture.mjs
     window.__comp = {width, height, fps, duration}; window.__seek(t) draws frame t — a PURE function of t
     (no rAF clocks, no CSS transitions/animations, no Date.now, no Math.random: use K.rand(seed) / K.hash(x)).
     window.__ready resolves when fonts + preloaded images are decoded. window.__errors() → scene errors.
     window.__cues → {fps, duration, bpm, beatOffset, cuts, hard, cues:[{kind, t, gain, pan, name}], music, voice} for ./katana mix.
     K.voice = {src, at, gain} — a voice-over (e.g. `katana voice say`): mixed on its own bus, music ducks under it.

   Film = scenes on a timeline. A scene owns a root <div> (RESERVED for transitions: never style it in a scene; build
   inside a child). Scenes overlap through pre/post or through transitions. Kit components (engine/kit/*.js) are
   factories K.kit.<name>(parent, opts) → { el, update(lt) } driven by the scene-local time lt.

   Motion grammar (from 6 shipped launch films + the Katana references):
     · the speed peak sits ON the cut; zoom direction (sign of d ln s/dt) never flips across a cut;
     · overlap the next move at ≈0.45 of the current; extra motion on a parent wrapper (the "null");
     · cuts land on the beat grid (K.beat) — bursts of 4–6-frame cuts, then 1–2 s holds on the hero;
     · nothing important appears or leaves by opacity alone — it is carried, grown, pushed, wiped, morphed or cut.
   Query: ?t=3.2 (open at a time) · ?play=1 (realtime preview player with scrubber) · ?only=s1,s2 · ?nocam=1 · ?guides=1 */
(function () {
  const Q = new URLSearchParams(location.search);
  const FORMATS = { '9x16': [1080, 1920], '16x9': [1920, 1080], '1x1': [1080, 1080], '4x5': [1080, 1350], '4x3': [1440, 1080] };
  const K = window.K = window.FILM = {
    W: 1080, H: 1920, fps: 30, dur: 15, format: '9x16', scenes: [], errors: [], cuts: [], cues: [], transitions: [], post: [],
    fonts: [], images: [], CAM: [], BG: null, bpm: 120, beatOffset: 0, music: null, voice: null, theme: {}, kit: {}, trans: {}, looks: {},
    nocam: Q.has('nocam'), FORMATS,
  };

  /* ---------------- math ---------------- */
  const clamp = K.clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = K.lerp = (a, b, p) => a + (b - a) * p;
  K.p = (t, t0, t1) => (t1 === t0 ? (t >= t1 ? 1 : 0) : clamp((t - t0) / (t1 - t0)));
  K.rand = (seed) => { let s = (seed >>> 0) || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };
  K.hash = (x) => { const s = Math.sin(x * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  K.noise = (x, seed = 0) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(K.hash(i + seed * 97.1), K.hash(i + 1 + seed * 97.1), u) * 2 - 1; };
  K.TQ = (t) => Math.round(t * K.fps) / K.fps;   // quantise DISCRETE events (typed chars, swaps) so sub-frame blur never doubles them
  K.frame = (t) => Math.round(t * K.fps);
  K.vw = (x) => x * K.W; K.vh = (y) => y * K.H;

  /* ---------------- beat grid ---------------- */
  // K.beat(n) = time of beat n (quarter notes; n may be fractional: 0.5 = eighth). K.bar(n) = 4 beats. K.snap(t, div=2)
  // snaps a time to the nearest 1/div beat. Set K.bpm / K.beatOffset from the reference analysis or the music.
  K.spb = () => 60 / K.bpm;
  K.beat = (n) => K.beatOffset + n * K.spb();
  K.bar = (n) => K.beat(n * 4);
  K.snap = (t, div = 2) => { const g = K.spb() / div; return K.beatOffset + Math.round((t - K.beatOffset) / g) * g; };

  /* ---------------- easing ---------------- */
  const bez = (x1, y1, x2, y2) => (x) => {                 // CSS cubic-bezier(x1,y1,x2,y2)
    if (x <= 0) return 0; if (x >= 1) return 1;
    let lo = 0, hi = 1, u = x;
    for (let i = 0; i < 28; i++) { const cx = 3 * x1 * u * (1 - u) ** 2 + 3 * x2 * u * u * (1 - u) + u ** 3; if (cx < x) lo = u; else hi = u; u = (lo + hi) / 2; }
    return 3 * y1 * u * (1 - u) ** 2 + 3 * y2 * u * u * (1 - u) + u ** 3;
  };
  const E = K.E = {
    lin: (p) => p,
    in: (k = 3) => (p) => p ** k,                   // accelerate INTO a cut — speed max at p=1
    out: (k = 3) => (p) => 1 - (1 - p) ** k,        // decelerate OUT of a cut — speed max at p=0
    inOut: (k = 3) => (p) => (p < .5 ? (2 * p) ** k / 2 : 1 - (2 - 2 * p) ** k / 2),
    soft: bez(.16, 1, .3, 1),        // entrances: long expo-like settle (= expoOut)
    smooth: bez(.5, 0, .1, 1),       // pose → pose with a long settle
    glide: bez(.45, 0, .55, 1),      // drifts, camera, cursors
    sine: bez(.37, 0, .63, 1),
    expoIn: bez(.7, 0, .84, 0),      // swing / whip out of a scene
    needle: bez(.95, 0, .05, 1),     // zoom at a cut (influence 95/95): midpoint on the cut
    into: bez(.5, 0, .85, .625),     // still accelerating on the cut frame
    settle: bez(.2, .7, .05, 1),     // after a cut
    morph1: bez(.66, 0, .9, .1),     // UI morph outgoing (+18 % into the cut)
    morph2: bez(.07, .44, .16, 1),   // UI morph incoming (from −18 %)
    width: bez(.75, 0, .25, 1),      // entrance width / button spin
    snappy: bez(.2, 0, 0, 1),        // kinetic type: fast attack, long settle (Katana word pops)
    back: (s = 1.2) => (p) => 1 + (s + 1) * (p - 1) ** 3 + s * (p - 1) ** 2,   // ≤2–5 % overshoot, chips/pills only
    bez,
  };
  K.tw = (t, t0, t1, a, b, e) => a + (b - a) * (e || E.lin)(K.p(t, t0, t1));
  // keyframes [[t, v], [t, v, easeIntoThisKey], …]; numbers or arrays
  K.kf = (t, keys) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [t1, v1, e] = keys[i], [t0, v0] = keys[i - 1];
      if (t <= t1) { const q = (e || E.smooth)(K.p(t, t0, t1)); return Array.isArray(v0) ? v0.map((a, j) => a + (v1[j] - a) * q) : v0 + (v1 - v0) * q; }
    }
    return keys[keys.length - 1][1];
  };
  K.zoom = (t, t0, t1, a, b, e) => Math.exp(lerp(Math.log(a), Math.log(b), (e || E.smooth)(K.p(t, t0, t1))));   // log space
  K.needle = (t, cut, a, b, h = .2) => K.zoom(t, cut - h, cut + h - 1 / K.fps, a, b, E.needle);
  K.pop = (t, t0, d = .5) => { const x = (t - t0) / d; if (x <= 0) return 0; if (x >= 1) return 1; return 1 - Math.exp(-6.5 * x) * Math.cos(10.5 * x); };   // ≈6 % overshoot
  K.soft = (t, t0, d = .6) => { const x = t - t0; if (x <= 0) return 0; if (x >= d) return 1; const k = 7 / d; return 1 - (1 + k * x) * Math.exp(-k * x); };
  K.spring = (t, t0, { k = 170, c = 14, overshootOnly = false } = {}) => {   // critically-ish damped spring 0→1 (mass 1)
    const x = t - t0; if (x <= 0) return 0; const w = Math.sqrt(k), z = c / (2 * w);
    if (z >= 1) return 1 - (1 + w * x) * Math.exp(-w * x);
    const wd = w * Math.sqrt(1 - z * z); return 1 - Math.exp(-z * w * x) * (Math.cos(wd * x) + z * w / wd * Math.sin(wd * x));
  };
  K.bounce = (dt, v, amp = .0375, freq = 1.8, decay = 3.2) => (dt <= 0 ? 0 : v * amp * Math.sin(freq * dt * 2 * Math.PI) / Math.exp(decay * dt));
  K.rise = (dt, dist, v = 1860) => { const T = dist / v; if (dt < 0) return dist; if (dt < T) return dist * (1 - dt / T); return -K.bounce(dt - T, v); };
  K.settleShake = (t, t0, amp = 16, hz = 5, decay = 9) => (t < t0 ? 0 : amp * Math.sin((t - t0) * hz * 2 * Math.PI) * Math.exp(-(t - t0) * decay));
  // speed ramp: maps film time → media time for a clip that runs at `rates` between keys (time remap, integrated)
  // K.ramp(lt, [[0, 1], [0.8, 0.25], [1.2, 3]]) → media seconds; rate changes are eased over `blend` seconds.
  K.rampRate = (x, keys, blend = .12) => {
    let r = keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const tk = keys[i][0], rk = keys[i][1], rp = keys[i - 1][1];
      if (x <= tk - blend / 2) break;
      r = x >= tk + blend / 2 ? rk : lerp(rp, rk, E.sine(K.p(x, tk - blend / 2, tk + blend / 2)));
    }
    return r;
  };
  K.ramp = (lt, keys, blend = .12) => {
    let m = 0, t = 0; const step = 1 / 240;
    while (t + step <= lt) { m += K.rampRate(t + step / 2, keys, blend) * step; t += step; }
    return m + K.rampRate(t, keys, blend) * Math.max(0, lt - t);
  };

  /* ---------------- type ---------------- */
  K.type = (s, t, t0, cps = 30) => s.slice(0, clamp(Math.floor((K.TQ(t) - t0) * cps + 1e-6), 0, s.length));
  K.cadence = (s, T0, T1, seed = 4242) => {
    const r = K.rand(seed), d = [];
    for (let i = 1; i < s.length; i++) { let v = .55 + .9 * r(); if (s[i] === ' ' || s[i - 1] === ',') v *= 1.3; d.push(v); }
    const sum = d.reduce((a, b) => a + b, 0) || 1, out = [T0]; d.forEach((v, i) => out.push(out[i] + v / sum * (T1 - T0))); return out;
  };
  K.typedN = (times, t) => { t = K.TQ(t); let n = 0; while (n < times.length && times[n] <= t + 1e-6) n++; return n; };
  K.caretOn = (t, tEnd, hz = 2) => (t < tEnd ? 1 : (Math.floor((t - tEnd) * hz * 2) % 2 === 0 ? 1 : 0));
  const SCR = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#$%&*+<>/\\=';
  K.scramble = (s, k, t, seed = 0) => {
    if (k >= 1) return s; if (k <= 0) return ''; let out = '';
    for (let i = 0; i < s.length; i++) {
      const th = i / s.length * .55 + K.hash(i * 1.7 + seed) * .25;
      out += s[i] === ' ' ? ' ' : k >= th + .2 ? s[i] : k >= th ? SCR[Math.floor(K.hash(i * 9.1 + Math.floor(K.TQ(t) * 28) + seed) * SCR.length)] : ' ';
    }
    return out;
  };

  /* ---------------- DOM helpers ---------------- */
  K.el = (tag, css, parent, html) => { const e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; };
  K.div = (parent, css, html) => K.el('div', 'position:absolute;' + (css || ''), parent, html);
  // K.css(id, text): inject a stylesheet once (kit modules keep their CSS next to their code)
  K.css = (id, text) => { if (document.getElementById('kcss-' + id)) return; const s = document.createElement('style'); s.id = 'kcss-' + id; s.textContent = text; document.head.appendChild(s); };
  K.glyphs = (parent, text) => [...text].map((ch) => {
    const w = K.el('span', 'display:inline-block;clip-path:inset(-60% -30% -0.14em -30%)', parent);
    return K.el('span', 'display:inline-block', w, ch === ' ' ? '&nbsp;' : ch);
  });
  K.riseGlyphs = (els, t, t0, st = .035, d = .55, dist = 110) => els.forEach((e, i) => {
    const q = E.soft(K.p(t, t0 + i * st, t0 + i * st + d)); e.style.transform = `translateY(${(1 - q) * dist}%)`;
  });
  K.drawOn = (path, p) => { if (!path.__len) { path.__len = path.getTotalLength(); path.style.strokeDasharray = path.__len + ' ' + path.__len; } path.style.strokeDashoffset = path.__len * (1 - clamp(p)); };
  K.tf = (o) => `translate(${o.x || 0}px,${o.y || 0}px) rotate(${o.r || 0}deg) scale(${o.s == null ? 1 : o.s})`;
  // scale about a pivot (px,py) in film space: use as a parent wrapper's transform (the "null")
  K.about = (px, py, s, dx = 0, dy = 0, r = 0) => `translate(${px + dx}px,${py + dy}px) rotate(${r}deg) scale(${s}) translate(${-px}px,${-py}px)`;
  // directional motion blur for DOM layers (SVG feGaussianBlur x/y). Returns (el, bx, by) => void. Stylised smear —
  // real motion blur comes from the capture shutter (--mb); use this for whips/smears that must read even in drafts.
  let defs = null, nf = 0;
  K.svgDefs = () => { if (!defs) { const svg = K.el('div', 'position:absolute;width:0;height:0;overflow:hidden', document.body, '<svg width="0" height="0"><defs></defs></svg>'); defs = svg.querySelector('defs'); } return defs; };
  K.dirBlur = () => {
    const d = K.svgDefs(), id = 'db' + (nf++), NS = 'http://www.w3.org/2000/svg', f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id); f.setAttribute('x', '-30%'); f.setAttribute('y', '-30%'); f.setAttribute('width', '160%'); f.setAttribute('height', '160%');
    const g = document.createElementNS(NS, 'feGaussianBlur'); f.appendChild(g); d.appendChild(f);
    return (el, bx, by) => { if (bx < .3 && by < .3) { el.style.filter = 'none'; return; } g.setAttribute('stdDeviation', bx.toFixed(2) + ' ' + by.toFixed(2)); el.style.filter = `url(#${id})`; };
  };
  // images: K.img(parent, src, css) creates an <img> registered for preload/decoding (capture waits for decode)
  K.img = (parent, src, css) => { const i = K.el('img', 'position:absolute;display:block;' + (css || ''), parent); i.decoding = 'sync'; i.src = src; K.images.push(i); return i; };
  // decoded-image cache for canvas looks and frame sequences: await K.preload(src) → HTMLImageElement (decoded).
  // K.cached(src) → the decoded image or null (sync, for update()). LRU-bounded (K.cacheMax, default 400).
  const IMC = new Map(); K.cacheMax = 400;
  K.preload = (src) => {
    let e = IMC.get(src);
    if (e) { IMC.delete(src); IMC.set(src, e); return e.p; }
    const im = new Image(); im.decoding = 'async'; im.src = src;
    e = { im, ok: false, p: im.decode().then(() => { e.ok = true; return im; }, () => { K.errors.push('image failed: ' + src.split('/').slice(-3).join('/')); return im; }) };
    IMC.set(src, e);
    while (IMC.size > K.cacheMax) IMC.delete(IMC.keys().next().value);
    return e.p;
  };
  K.cached = (src) => { const e = IMC.get(src); return e && e.ok ? e.im : null; };
  // frame-sequence metadata (tools: `katana clip` writes <dir>/_clip.json): K.clipInfo(dir) → {frames, fps, width, height, pattern}
  const CLIPS = new Map();
  K.clipInfo = (dir) => {
    if (CLIPS.has(dir)) return CLIPS.get(dir);
    let info = null;
    try { const x = new XMLHttpRequest(); x.open('GET', dir.replace(/\/$/, '') + '/_clip.json', false); x.send(); if (x.status === 200 || (x.status === 0 && x.responseText)) info = JSON.parse(x.responseText); } catch (e) { /* reported below */ }
    if (!info) K.errors.push('clip not found: ' + dir + '/_clip.json');
    CLIPS.set(dir, info); return info;
  };
  K.clipFrame = (dir, sec, { loop = false } = {}) => {     // URL of the frame at clip-seconds `sec` (clamped, or looped)
    const c = K.clipInfo(dir); if (!c) return null;
    let i = Math.floor(sec * c.fps + 1e-6); i = loop ? ((i % c.frames) + c.frames) % c.frames : clamp(i, 0, c.frames - 1);
    const pat = c.pattern || 'f_%04d.jpg', first = c.first || 0;
    return dir.replace(/\/$/, '') + '/' + pat.replace(/%0(\d)d/, (_, n) => String(i + first).padStart(+n, '0'));
  };
  // motion-blur shutter: while capture renders sub-frames of one output frame, footage should hold ONE source frame
  // K.loadJSON('../assets/voice_words.json') → parsed JSON (sync, at build time; e.g. the output of `katana transcribe`)
  K.loadJSON = (url) => {
    try { const x = new XMLHttpRequest(); x.open('GET', url, false); x.send(); if (x.status === 200 || (x.status === 0 && x.responseText)) return JSON.parse(x.responseText); }
    catch (e) { /* reported below */ }
    K.errors.push('json not found: ' + url); return null;
  };
  K.heldTime = (t) => (typeof window.__mbBase === 'number' && t >= window.__mbBase - 1e-6 && t < window.__mbBase + 1 / K.fps ? window.__mbBase : t);
  K.heldLt = (lt) => lt + (K.heldTime(K.t) - K.t);   // scene-local version (components only get lt; K.t is set first in __seek)
  // suggested SFX of a component (comp.cues() → [{kind, t(local), gain}]) placed at a scene offset: K.addCues(comp, t0)
  // K.addCues(comp, t0, { skip: ['pop'], only: ['hit'], gain: .8 }) — filter a component's suggestions (e.g. a doubled entrance pop)
  K.addCues = (comp, t0 = 0, f = {}) => { const list = typeof comp === 'function' ? comp() : comp && comp.cues ? comp.cues() : comp || [];
    for (const c of list) { if (f.skip && f.skip.includes(c.kind)) continue; if (f.only && !f.only.includes(c.kind)) continue; K.cue(c.kind, t0 + c.t, { ...c, gain: (c.gain ?? 1) * (f.gain ?? 1) }); } };
  // markup for kinetic lines: "Stick it on *everything.*" → [{text:'Stick',em:false},…,{text:'everything.',em:true}];
  // "\n" → {br:true} (line break);
  // "[img:assets/a.jpg]" → {img:'assets/a.jpg'}; "{accent}word{/}" → {text:'word', cls:'accent'}
  K.tokens = (s) => {
    const out = []; let em = false, cls = null;
    const re = /\[img:([^\]]+)\]|\*|\{\/\}|\{([\w-]+)\}|(\n)|(\s+)|([^\s*\[{]+|\[|\{)/g; let m;
    while ((m = re.exec(s))) {
      if (m[1]) out.push({ img: m[1].trim() });
      else if (m[3]) out.push({ br: true });
      else if (m[0] === '*') em = !em;
      else if (m[0] === '{/}') cls = null;
      else if (m[2]) cls = m[2];
      else if (m[4]) out.push({ space: true });
      else out.push({ text: m[5], em, cls });
    }
    return out.filter((t, i, a) => !(t.space && (i === 0 || a[i - 1].space || a[i - 1].br)));
  };

  /* ---------------- scenes ---------------- */
  // def: { id, t0, t1, pre, post, build(root), update(lt, t, root), zoom?(lt) }   lt = t − t0
  // build() receives the scene root: create ONE child wrapper and put everything in it (root belongs to transitions).
  // Kit components added with add() (the 2nd argument of build) are driven automatically: their async prepare(lt) is
  // awaited before the frame, then update(lt) runs in insertion order, then the scene's own update (if any).
  //   K.scene({ id: 's1', t0: 0, t1: 2, build(root, add) { const w = K.div(root, 'inset:0'); add(K.kit.words(w, {...})); } });
  K.scene = (def) => {
    const own = def.update, ownPrep = def.prepare;
    def.comps = def.comps || [];
    def.add = (c) => { def.comps.push(c); return c; };
    def.prepare = async (lt, t, root) => { if (ownPrep) await ownPrep(lt, t, root); const ps = []; for (const c of def.comps) if (c.prepare) ps.push(c.prepare(lt)); if (ps.length) await Promise.all(ps); };
    def.update = (lt, t, root) => { for (const c of def.comps) c.update(lt); if (own) own(lt, t, root); };
    K.scenes.push(def); return def;
  };
  K.cue = (kind, t, opts = {}) => K.cues.push({ kind, t: +(+t).toFixed(4), gain: opts.gain ?? 1, pan: opts.pan ?? 0, name: opts.name || null, dur: opts.dur || null });

  /* ---------------- transitions (registry; implementations in engine/kit/transitions.js) ---------------- */
  // def: { type, at, before, after, a, b, apply(t, ctx) }  ctx = { A, B (scene roots or null), p (0→1 over the window),
  //        lt (t − at), fx (overlay layer above everything), W, H }. Scene a is kept visible until at+after and b from
  //        at−before even when their own windows do not cover it. Roots are reset (transform/filter/opacity/clip/zIndex)
  //        every frame before scenes update, so apply() is stateless.
  K.transition = (def) => { def.before = def.before ?? .2; def.after = def.after ?? .2; K.transitions.push(def); return def; };
  K.addPost = (fn) => K.post.push(fn);   // fn(t, fxLayer) runs after transitions every frame (overlays, flashes, global looks)

  /* ---------------- camera (optional world camera, in-scene depth only) ---------------- */
  K.cs = (o) => Object.assign({ cx: K.W / 2, cy: K.H / 2, s: 1, rx: 0, ry: 0, rz: 0 }, o || {});
  K.camAt = (t) => {
    const C = K.CAM; if (!C.length || K.nocam) return K.cs();
    let g = C.find((c) => t >= c.t0 && t < c.t1); if (!g) g = t < C[0].t0 ? { a: C[0].a, b: C[0].a, t0: 0, t1: 1 } : { a: C[C.length - 1].b, b: C[C.length - 1].b, t0: 0, t1: 1 };
    const q = (g.ease || E.glide)(K.p(t, g.t0, g.t1)), a = K.cs(g.a), b = K.cs(g.b), o = {};
    for (const k in a) o[k] = a[k] + (b[k] - a[k]) * q; return o;
  };

  /* ---------------- background: flat colour per time range, or a function (t) → css background ---------------- */
  // K.BG = '#F2F2EF' | [[t0, '#hex'], [t1, '#hex'], …] (hard switches — colour-block cuts) | (t) => 'css background'
  function drawBG(t, film) {
    const B = K.BG; if (!B) return;
    let v = B;
    if (Array.isArray(B)) { v = B[0][1]; for (const [tt, c] of B) if (t >= tt) v = c; }
    else if (typeof B === 'function') v = B(t);
    if (film.__bg !== v) { film.style.background = v; film.__bg = v; }
  }

  /* ---------------- fonts + theme ---------------- */
  // Local fonts in /fonts/fonts.css: "Inter Tight" 400–900 (+italic), "Instrument Serif" (+italic), "Geist Mono" 400–700,
  // "Archivo" (wdth 62–125, wght 100–900, +italic), "Bricolage Grotesque" (opsz/wdth/wght). Spanish glyphs included.
  K.fonts = ['900 100px "Inter Tight"', '800 100px "Inter Tight"', '600 100px "Inter Tight"', 'italic 400 100px "Instrument Serif"',
    '400 100px "Instrument Serif"', '500 100px "Geist Mono"', '800 100px "Archivo"'];
  K.loadFonts = async () => {
    try { await Promise.all(K.fonts.map((f) => document.fonts.load(f, 'Aa ÁáÉéÍíÓóÚúÑñ¿¡ 0123 ×→✦'))); } catch (e) { K.errors.push('fonts: ' + e.message); }
    await document.fonts.ready;
  };
  // theme tokens → CSS variables on #film (components read var(--k-*) so a film re-themes them all at once)
  K.THEME = { bg: '#F2F2EF', fg: '#111214', muted: '#8A8C90', accent: '#2B4BFF', accent2: '#D6FF3D', accent3: '#FF4D2E',
    display: '"Inter Tight", "Helvetica Neue", Arial, sans-serif', serif: '"Instrument Serif", Georgia, serif',
    mono: '"Geist Mono", ui-monospace, Menlo, monospace', wide: '"Archivo", "Inter Tight", sans-serif', radius: 28 };
  K.applyTheme = (film) => { const T = K.theme = Object.assign({}, K.THEME, K.theme); for (const k in T) film.style.setProperty('--k-' + k, typeof T[k] === 'number' ? T[k] + 'px' : T[k]); };

  /* ---------------- safe zones (Instagram Reels / TikTok UI) ---------------- */
  // Keep text and faces inside: top ~220 px (status + header), bottom ~420 px (caption, audio, buttons), right ~130 px
  // (like/comment/share rail) on 1080×1920. ?guides=1 draws them.
  // K.setFormat('16x9') at the TOP of film.js when not 9:16, so K.W/K.H are right while scenes are defined (K.start also sets it)
  K.setFormat = (f) => { if (FORMATS[f]) { [K.W, K.H] = FORMATS[f]; K.format = f; } return K; };
  K.safe = () => (K.format === '9x16' ? { top: 220, bottom: 420, left: 60, right: 130 } : { top: 60, bottom: 60, left: 80, right: 80 });

  /* ---------------- QA: zoom direction + speed across cuts ---------------- */
  window.__qa = () => {
    const out = [], d = 1 / K.fps, sc = K.scenes.filter((s) => s.zoom);
    for (let i = 1; i < K.scenes.length; i++) {
      const A = K.scenes[i - 1], B = K.scenes[i], c = B.t0; if (!A.zoom || !B.zoom) continue;
      const va = (Math.log(A.zoom(c - A.t0 - d)) - Math.log(A.zoom(c - A.t0 - 2 * d))) / d;
      const vb = (Math.log(B.zoom(d)) - Math.log(B.zoom(0))) / d;
      const flip = Math.abs(va) > .3 && Math.abs(vb) > .3 && Math.sign(va) !== Math.sign(vb);
      out.push(`cut ${c.toFixed(2)} ${A.id}→${B.id}: dlns/dt ${va.toFixed(2)} → ${vb.toFixed(2)}${flip ? '  ✗ ZOOM DIRECTION FLIPS' : ''}`);
    }
    return out.length ? out : [`no zoom() on adjacent scenes (${sc.length} scenes define zoom)`];
  };

  /* ---------------- preview player (?play=1) ---------------- */
  function player() {
    const bar = K.el('div', 'position:fixed;left:0;right:0;bottom:0;height:44px;background:rgba(10,10,12,.86);color:#fff;font:13px/44px ui-monospace,Menlo,monospace;display:flex;gap:12px;align-items:center;padding:0 12px;z-index:99;user-select:none', document.body);
    const btn = K.el('button', 'font:inherit;background:#fff;color:#000;border:0;border-radius:6px;padding:2px 10px;cursor:pointer', bar, '❚❚');
    const rng = K.el('input', 'flex:1', bar); rng.type = 'range'; rng.min = 0; rng.max = K.dur; rng.step = 1 / K.fps; rng.value = 0;
    const lab = K.el('span', 'min-width:150px;text-align:right', bar);
    let playing = true, t = parseFloat(Q.get('t') || 0), last = performance.now(), busy = false;
    btn.onclick = () => { playing = !playing; btn.textContent = playing ? '❚❚' : '▶'; last = performance.now(); };
    rng.oninput = () => { t = parseFloat(rng.value); playing = false; btn.textContent = '▶'; };
    document.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); btn.click(); } if (e.code === 'ArrowRight') { t = Math.min(K.dur - 1e-4, t + 1 / K.fps); playing = false; } if (e.code === 'ArrowLeft') { t = Math.max(0, t - 1 / K.fps); playing = false; } });
    const fit = () => { const f = document.getElementById('film'), s = Math.min(innerWidth / K.W, (innerHeight - 44) / K.H); f.style.transformOrigin = '0 0'; f.style.transform = `translate(${(innerWidth - K.W * s) / 2}px,0) scale(${s})`; };
    addEventListener('resize', fit); fit();
    const loop = async (now) => {
      if (playing) { t += (now - last) / 1000; if (t >= K.dur) t = 0; }
      last = now;
      if (!busy) { busy = true; await window.__seek(t); busy = false; rng.value = t; lab.textContent = `${t.toFixed(2)}s  f${K.frame(t)}  ${K.bpm ? 'b' + ((t - K.beatOffset) / K.spb()).toFixed(1) : ''}`; }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ---------------- start ---------------- */
  K.start = async (opts = {}) => {
    if (opts.format && FORMATS[opts.format]) { [K.W, K.H] = FORMATS[opts.format]; }
    Object.assign(K, opts);
    if (!opts.format) { const r = K.W / K.H; K.format = Object.keys(FORMATS).find((k) => Math.abs(FORMATS[k][0] / FORMATS[k][1] - r) < .01) || 'custom'; }
    const film = document.getElementById('film'), world = document.getElementById('world');
    let fx = document.getElementById('fx'); if (!fx) fx = K.el('div', '', film); fx.id = 'fx';
    film.style.cssText += `;position:relative;overflow:hidden;width:${K.W}px;height:${K.H}px`;
    world.style.cssText += `;position:absolute;left:0;top:0;width:${K.W}px;height:${K.H}px;transform-origin:0 0;transform-style:preserve-3d`;
    fx.style.cssText = `position:absolute;left:0;top:0;width:${K.W}px;height:${K.H}px;pointer-events:none;z-index:50;overflow:hidden`;
    K.fx = fx; K.film = film; K.world = world;
    K.applyTheme(film);
    if (!K.BG) K.BG = K.theme.bg;
    await K.loadFonts();
    const only = Q.get('only'), keep = only ? only.split(',') : null;
    K.scenes.sort((a, b) => a.t0 - b.t0);
    K.cuts = K.scenes.map((s) => s.t0).filter((t) => t > 0);
    K.scenes.forEach((s, i) => {
      s.z = s.z != null ? s.z : i + 1;   // def.z overrides the stacking (e.g. a scene revealed THROUGH a hole of the previous one)
      s.skip = keep && !keep.includes(s.id);
      s.root = K.el('div', `position:absolute;left:0;top:0;width:${K.W}px;height:${K.H}px;transform-style:preserve-3d;z-index:${s.z}`, world);
      s.root.dataset.scene = s.id;
      if (s.skip) { s.root.style.display = 'none'; return; }
      try { s.build && s.build(s.root, s.add); } catch (e) { K.errors.push(s.id + ' build: ' + e.message); }   // root visible → layout is measurable
      s.root.style.display = 'none';
    });
    const byId = Object.fromEntries(K.scenes.map((s) => [s.id, s]));
    for (const tr of K.transitions) { tr.A = byId[tr.a] || null; tr.B = byId[tr.b] || null; if ((tr.a && !tr.A) || (tr.b && !tr.B)) K.errors.push(`transition ${tr.type || ''}@${tr.at}: unknown scene ${!tr.A ? tr.a : tr.b}`); }
    const hard = K.scenes.filter((s, i) => i > 0 && !s.pre && !K.scenes[i - 1].post && s.t0 > 0 && !K.transitions.some((tr) => Math.abs(tr.at - s.t0) < 1e-3)).map((s) => s.t0);
    window.__cues = { fps: K.fps, duration: K.dur, bpm: K.bpm, beatOffset: K.beatOffset, cuts: K.cuts, hard,
      transitions: K.transitions.map((tr) => ({ type: tr.type || null, at: tr.at })), cues: K.cues.slice().sort((a, b) => a.t - b.t), music: K.music, voice: K.voice };
    if (Q.has('guides')) {
      const s = K.safe(), g = K.el('div', `position:absolute;left:${s.left}px;top:${s.top}px;right:${s.right}px;bottom:${s.bottom}px;outline:3px dashed rgba(255,0,90,.85);z-index:98;pointer-events:none`, film);
      K.el('div', 'position:absolute;left:4px;top:4px;font:22px ui-monospace,Menlo;color:rgba(255,0,90,.9)', g, 'safe');
    }
    const reset = (r) => { const st = r.style; st.transform = ''; st.filter = ''; st.opacity = ''; st.clipPath = ''; st.zIndex = r.__z; st.mixBlendMode = ''; st.transformOrigin = ''; st.webkitBoxReflect = ''; st.webkitMaskImage = ''; };
    K.scenes.forEach((s) => { s.root.__z = String(s.z); });
    window.__seek = async (t) => {
      t = clamp(t, 0, K.dur - 1e-4);
      K.t = t;
      const c = K.camAt(t);
      world.style.transform = K.CAM.length ? `translate(${K.W / 2}px,${K.H / 2}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) scale(${c.s}) translate(${-c.cx}px,${-c.cy}px)` : '';
      K.camNow = c;
      drawBG(t, film);
      const active = K.transitions.filter((tr) => t >= tr.at - tr.before && t < tr.at + tr.after);
      const visible = [];
      for (const s of K.scenes) {
        if (s.skip) continue;
        let vis = t >= s.t0 - (s.pre || 0) && t < s.t1 + (s.post || 0);
        if (!vis) vis = active.some((tr) => tr.A === s || tr.B === s);
        if (s.root.__vis !== vis) { s.root.style.display = vis ? 'block' : 'none'; s.root.__vis = vis; }
        reset(s.root);
        if (vis) visible.push(s);
      }
      // async preparation (decode the footage frames / images this frame needs) BEFORE the synchronous updates
      await Promise.all(visible.filter((s) => s.prepare).map((s) => Promise.resolve().then(() => s.prepare(t - s.t0, t, s.root)).catch((e) => { K.errors.push(s.id + ' prepare: ' + e.message); })));
      for (const s of visible) { try { s.update(t - s.t0, t, s.root); } catch (e) { const m = s.id + '@' + t.toFixed(2) + ': ' + e.message; if (K.errors.length < 30 && !K.errors.includes(m)) K.errors.push(m); } }
      for (const el of fx.children) if (!el.__keep) el.style.display = 'none';   // overlays show only while a transition/post draws them
      for (const tr of active) {
        try { tr.apply(t, { A: tr.A && tr.A.root, B: tr.B && tr.B.root, p: K.p(t, tr.at - tr.before, tr.at + tr.after), lt: t - tr.at, fx, W: K.W, H: K.H, tr }); }
        catch (e) { const m = `transition ${tr.type || ''}@${tr.at}: ${e.message}`; if (K.errors.length < 30 && !K.errors.includes(m)) K.errors.push(m); }
      }
      for (const fn of K.post) { try { fn(t, fx); } catch (e) { const m = 'post: ' + e.message; if (K.errors.length < 30 && !K.errors.includes(m)) K.errors.push(m); } }
      const g = document.getElementById('grain');               // grain seeded per FRAME: every sub-frame of a frame shares it
      if (g) { const r = K.rand(Math.round(t * K.fps) * 7919 + 13); g.style.transform = `translate(${Math.round(r() * 200 - 100)}px,${Math.round(r() * 200 - 100)}px)`; }
      // wait for any visible <img> to be decoded (capture must never grab a half-loaded frame)
      const pend = [];
      for (const s of K.scenes) if (s.root.__vis) for (const im of s.root.getElementsByTagName('img')) if (im.src && !(im.complete && im.naturalWidth)) pend.push(im.decode().catch(() => { K.errors.push('image failed: ' + im.src.split('/').slice(-2).join('/')); }));
      for (const im of fx.getElementsByTagName('img')) if (im.src && !(im.complete && im.naturalWidth)) pend.push(im.decode().catch(() => {}));
      if (pend.length) await Promise.all(pend);
    };
    window.__errors = () => K.errors;
    window.__comp = { width: K.W, height: K.H, fps: K.fps, duration: K.dur };
    window.__ready = Promise.all(K.images.map((i) => i.decode().catch(() => K.errors.push('image failed: ' + i.src)))).then(() => true);
    await window.__ready;
    if (Q.has('play')) player();
    else if (Q.has('t')) window.__seek(parseFloat(Q.get('t')));
    else window.__seek(0);
  };
})();
