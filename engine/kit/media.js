/* kit/media.js — MEDIA family of Katana NP: footage, photos, cut-out stickers and 3D arrangements of image cards.
     K.kit.clip · photo · cutout · cardWall · carousel · fan · grid · textMask · spin · beforeAfter · splitScreen
   Full API with every default: engine/kit/docs/media.md. Contract: engine/kit/CONTRACT.md — update(lt) is a PURE function of
   scene-local time, footage frames are decoded in prepare(lt), a motion-blur shutter holds ONE source frame (K.heldTime).

   A "media spec" is accepted wherever a picture goes:
     'assets/img/a.jpg'                     still image (the extension decides)
     'assets/clips/c3293'                   frame-sequence dir with _clip.json (no extension)
     { src } | { clip, in, rate, ramp, loop, freezeAt, blend, focus, fit }
   Keyframable options (zoom, pan, x, y, scale, rot, cam, wipe, angle …) take a number/vector, a function (t) => v, or keys
   [[t, v], [t, v, ease], …] with t in seconds AFTER the component's `at`. */
(function () {
  const K = window.K; if (!K) return;
  const E = K.E, clamp = K.clamp, lerp = K.lerp, P = K.p, NS = 'http://www.w3.org/2000/svg', D2R = Math.PI / 180;
  const MIN = () => Math.min(K.W, K.H);
  const r2 = (n) => Math.round(n * 100) / 100;
  const isKeys = (v) => Array.isArray(v) && v.length > 0 && Array.isArray(v[0]) && typeof v[0][0] === 'number';
  const V = (v, t, d) => (v == null ? d : typeof v === 'function' ? v(t) : isKeys(v) ? K.kf(t, v) : v);
  const shown = (el, on) => { if (el.__on !== on) { el.style.display = on ? 'block' : 'none'; el.__on = on; } };
  const held = (lt) => (typeof K.t === 'number' ? lt + (K.heldTime(K.t) - K.t) : lt);
  const join = (...a) => a.filter(Boolean).join(' ') || 'none';
  const blurF = (b) => (b > .35 ? `blur(${r2(b)}px)` : '');
  const setS = (el, k, v) => { if (el['__' + k] !== v) { el.style[k] = v; el['__' + k] = v; } };   // skip redundant style writes
  const zcss = (o) => (o.z != null ? `z-index:${o.z};` : '');

  /* ---------------- shared looks ---------------- */
  // soft real shadow: true | strength number (1 = card on a table) | css string | false
  const shadowCss = (sh, lift = 1) => {
    if (!sh) return 'none'; if (typeof sh === 'string') return sh;
    const k = (sh === true ? 1 : +sh) * lift, u = MIN() / 1080;
    return `0 ${r2(30 * k * u)}px ${r2(70 * k * u)}px ${r2(-18 * k * u)}px rgba(0,0,0,${r2(clamp(.4 * k, 0, .62))}),` +
      `0 ${r2(6 * k * u)}px ${r2(16 * k * u)}px rgba(0,0,0,${r2(clamp(.13 * k, 0, .3))})`;
  };
  // directional smear (SVG blur x/y) that RETURNS the filter string so it can be composed with other filters
  let nSm = 0;
  const smear = () => {
    const f = document.createElementNS(NS, 'filter'), id = 'kmsm' + (nSm++);
    f.setAttribute('id', id); f.setAttribute('x', '-60%'); f.setAttribute('y', '-60%'); f.setAttribute('width', '220%'); f.setAttribute('height', '220%');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    const g = document.createElementNS(NS, 'feGaussianBlur'); f.appendChild(g); K.svgDefs().appendChild(f);
    let last = '';
    return (bx, by) => {
      bx = Math.min(40, Math.abs(bx)); by = Math.min(40, Math.abs(by)); if (bx < .6 && by < .6) return '';
      const v = bx.toFixed(1) + ' ' + by.toFixed(1); if (v !== last) { g.setAttribute('stdDeviation', v); last = v; } return `url(#${id})`;
    };
  };
  // sticker outline: alpha dilate → soften → threshold → flood colour, under the source (rounded, not boxy, corners)
  const OUTL = {};
  const outlineFilter = (r, color) => {
    const key = r + '|' + color; if (OUTL[key]) return OUTL[key];
    const id = 'kmol' + Object.keys(OUTL).length, f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id); f.setAttribute('x', '-25%'); f.setAttribute('y', '-25%'); f.setAttribute('width', '150%'); f.setAttribute('height', '150%');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML = `<feMorphology in="SourceAlpha" operator="dilate" radius="${r}" result="d"/>` +
      `<feGaussianBlur in="d" stdDeviation="${r2(Math.max(.8, r * .22))}" result="b"/>` +
      `<feComponentTransfer in="b" result="m"><feFuncA type="linear" slope="3.2" intercept="-.75"/></feComponentTransfer>` +
      `<feFlood flood-color="${color}" result="c"/><feComposite in="c" in2="m" operator="in" result="o"/>` +
      `<feMerge><feMergeNode in="o"/><feMergeNode in="SourceGraphic"/></feMerge>`;
    K.svgDefs().appendChild(f); return (OUTL[key] = `url(#${id})`);
  };
  // label pill (ANTES / DESPUÉS, panel tags)
  const pill = (parent, text, { bg = 'rgba(17,18,20,.88)', fg = '#fff', size = Math.round(MIN() * .034) } = {}) =>
    K.div(parent, `font:800 ${size}px/1 var(--k-display);letter-spacing:-.005em;color:${fg};background:${bg};padding:${r2(size * .46)}px ${r2(size * .78)}px ${r2(size * .42)}px;` +
      `border-radius:999px;white-space:nowrap;text-transform:uppercase;box-shadow:0 8px 24px rgba(0,0,0,.22);transform-origin:50% 50%`, text);

  // give a pill an INTEGER box (measured at build; hosts are shown for the measure): a right/centre-anchored label with a
  // fractional width lands on sub-pixel x, and text there rasterises differently depending on seek order
  const fixBox = (p, hosts) => {
    const was = hosts.map((h) => h.style.display); hosts.forEach((h) => { h.style.display = 'block'; });
    const w = p.offsetWidth + 1, h = p.offsetHeight; hosts.forEach((hh, k) => { hh.style.display = was[k]; });
    if (w > 1) { p.style.width = w + 'px'; p.style.height = h + 'px'; p.style.boxSizing = 'border-box'; p.style.textAlign = 'center'; }
    return w;
  };
  // pop scale of a label → transform; snaps to none once within 1.2 % (settled text must not keep a near-identity transform)
  const popTf = (q, pre = '') => (Math.abs(q - 1) < .012 ? (pre || 'none') : pre + `scale(${r2(Math.max(0, q))})`);

  /* ---------------- media specs + sources ---------------- */
  const IMG = /\.(jpe?g|png|webp|gif|avif|svg|bmp)(\?.*)?$/i;
  const mspec = (s, o) => {
    const m = typeof s === 'string' ? (IMG.test(s) ? { src: s } : { clip: s }) : Object.assign({}, s || {});
    if (o) for (const k of ['in', 'rate', 'ramp', 'loop', 'freezeAt', 'blend']) if (m[k] === undefined && o[k] !== undefined) m[k] = o[k];
    return m;
  };
  // media seconds for x seconds after the media started (ramp keys = [[t, rate], …], t after start)
  const mtime = (m, x) => { x = Math.max(0, x); if (m.freezeAt != null) x = Math.min(x, m.freezeAt); return (m.in || 0) + (m.ramp ? K.ramp(x, m.ramp) : x * (m.rate == null ? 1 : m.rate)); };
  const mrate = (m, x) => (m.freezeAt != null && x > m.freezeAt ? 0 : m.ramp ? K.rampRate(Math.max(0, x), m.ramp) : m.rate == null ? 1 : m.rate);
  // one wrapper (zoom/pan target) with an <img> showing a still or the current clip frame. Slow motion (|rate| < .75)
  // crossfades the two neighbouring source frames (blend:false turns it off). Capture waits for <img> decode.
  function source(parent, m, o = {}) {
    const fit = m.fit || o.fit || 'cover', fo = m.focus || o.focus || [.5, .5], pos = `${r2(fo[0] * 100)}% ${r2(fo[1] * 100)}%`;
    const wrap = K.div(parent, (o.css || 'left:0;top:0;width:100%;height:100%;') + `transform-origin:${pos};`);
    const icss = `left:0;top:0;width:100%;height:100%;object-fit:${fit};object-position:${pos};` + (o.icss || '');
    const S = { el: wrap, m, clip: !!m.clip, focus: fo };
    if (!m.clip) { S.img = K.img(wrap, m.src, icss); S.img.alt = ''; S.prepare = () => null; S.show = () => {}; return S; }
    S.info = K.clipInfo(m.clip);
    const img = S.img = K.el('img', 'position:absolute;display:block;' + icss, wrap); img.decoding = 'sync'; img.alt = '';
    let b = null;
    const frames = (sec, rate) => {
      const c = S.info; if (!c) return [null, null, 0];
      const lp = { loop: !!m.loop }, u = K.clipFrame(m.clip, sec, lp);
      if (m.blend === false || !(Math.abs(rate) < .75)) return [u, null, 0];
      const f = sec * c.fps + 1e-6, fr = f - Math.floor(f);
      if (fr < .04) return [u, null, 0];
      const u2 = K.clipFrame(m.clip, sec + 1 / c.fps, lp);
      return u2 === u ? [u, null, 0] : [u, u2, fr];
    };
    S.prepare = (sec, rate) => {
      const [u, u2] = frames(sec, rate); if (!u) return null;
      const c = S.info, st = Math.max(.3, Math.abs(rate)) / c.fps;
      for (let k = 2; k <= 4; k++) K.preload(K.clipFrame(m.clip, sec + k * st, { loop: !!m.loop }));   // warm the next frames
      return u2 ? Promise.all([K.preload(u), K.preload(u2)]) : K.preload(u);
    };
    S.show = (sec, rate) => {
      const [u, u2, fr] = frames(sec, rate);
      if (u && img.__u !== u) { img.src = u; img.__u = u; }
      if (u2) {
        if (!b) { b = K.el('img', 'position:absolute;display:block;' + icss, wrap); b.decoding = 'sync'; b.alt = ''; }
        if (b.__u !== u2) { b.src = u2; b.__u = u2; }
        b.style.display = 'block'; b.style.opacity = r2(fr);
      } else if (b) b.style.display = 'none';
    };
    return S;
  }
  const clipDur = (m) => {   // natural length (s) of a clip spec, honouring in/rate/ramp
    const c = m.clip ? K.clipInfo(m.clip) : null; if (!c || m.loop) return undefined;
    const left = c.frames / c.fps - (m.in || 0); if (!m.ramp) return left / Math.max(.01, Math.abs(m.rate == null ? 1 : m.rate));
    let x = 0, s = 0; while (s < left && x < 120) { s += K.rampRate(x, m.ramp) / 60; x += 1 / 60; } return x;
  };

  /* ---------------- entrances / exits ---------------- */
  // q: 0 hidden → 1 settled. ex = exit (direction continues). Never opacity alone.
  const FX = {
    none: () => ({}),
    scale: (q) => ({ s: 1.16 - .16 * q, blur: 16 * (1 - q), o: clamp(q * 2.5) }),
    zoom: (q) => ({ s: .3 + .7 * q, blur: 20 * (1 - q), o: clamp(q * 3) }),
    rise: (q, ex) => ({ y: (ex ? -1 : 1) * K.H * .085 * (1 - q), s: 1.04 - .04 * q, blur: 14 * (1 - q), o: clamp(q * 2.5) }),
    drop: (q, ex) => ({ y: (ex ? 1 : -1) * K.H * .085 * (1 - q), blur: 14 * (1 - q), o: clamp(q * 2.5) }),
    left: (q, ex) => ({ x: (ex ? 1 : -1) * K.W * 1.05 * (1 - q), sm: 1 }),
    right: (q, ex) => ({ x: (ex ? -1 : 1) * K.W * 1.05 * (1 - q), sm: 1 }),
    up: (q, ex) => ({ y: (ex ? -1 : 1) * K.H * 1.05 * (1 - q), sm: 1 }),
    down: (q, ex) => ({ y: (ex ? 1 : -1) * K.H * 1.05 * (1 - q), sm: 1 }),
    pop: (q) => ({ s: Math.max(0, q), o: clamp(q * 4) }),
    wipe: (q, ex) => ({ clip: ex ? [0, 0, 0, 1 - q] : [0, 1 - q, 0, 0] }),
    wipeUp: (q, ex) => ({ clip: ex ? [0, 0, 1 - q, 0] : [1 - q, 0, 0, 0] }),
    iris: (q) => ({ iris: q, s: 1.12 - .12 * q }),
  };
  const mergeFx = (a, b) => ({ s: (a.s ?? 1) * (b.s ?? 1), x: (a.x || 0) + (b.x || 0), y: (a.y || 0) + (b.y || 0), r: (a.r || 0) + (b.r || 0),
    blur: (a.blur || 0) + (b.blur || 0), o: (a.o ?? 1) * (b.o ?? 1), clip: b.clip || a.clip, iris: b.iris ?? a.iris, sm: a.sm || b.sm });
  // entrance/exit state of a component at local time lt → fx object, or null while hidden (before at / after the exit)
  function life(o, lt, def) {
    const at = o.at || 0; if (lt < at) return null;
    const en = o.enter || def, ed = o.enterDur ?? (en === 'pop' ? .6 : .5);
    const q = en === 'none' ? 1 : en === 'pop' ? K.pop(lt, at, ed) : E.snappy(P(lt, at, at + ed));
    const f = (FX[en] || FX.scale)(q, false);
    if (o.out != null && lt >= o.out) {
      const ex = o.exit || en, xd = o.exitDur ?? .4;
      if (ex === 'none' || lt >= o.out + xd) return null;
      return mergeFx(f, (FX[ex] || FX.scale)(1 - E.in(2.2)(P(lt, o.out, o.out + xd)), true));
    }
    return f;
  }
  const lifeEnd = (o) => (o.out != null ? o.out + (o.exitDur ?? .4) : Infinity);
  const clipCss = (f, R) => (f.clip ? `inset(${f.clip.map((v) => r2(v * 100) + '%').join(' ')} round ${R}px)` : f.iris != null ? `circle(${r2(f.iris * 72)}% at 50% 50%)` : 'none');
  const enterCues = (o, def) => {
    const c = [], en = o.enter || def;
    if (en !== 'none') c.push({ kind: en === 'pop' ? 'pop' : 'whoosh', t: o.at || 0, gain: .7 });
    if (o.out != null && (o.exit || en) !== 'none') c.push({ kind: 'whoosh', t: o.out, gain: .6 });
    return c;
  };

  /* ---------------- boxed media (clip + photo) ---------------- */
  function boxed(parent, o, m, defEnter, push0) {
    const W0 = o.w ?? K.W, H0 = o.h ?? K.H, R = o.radius ?? 0, at = o.at || 0;
    const el = K.div(parent, `left:0;top:0;width:${W0}px;height:${H0}px;display:none;transform-origin:50% 50%;border-radius:${R}px;box-shadow:${shadowCss(o.shadow)};` + zcss(o));
    const inner = K.div(el, `left:0;top:0;width:100%;height:100%;overflow:hidden;border-radius:${R}px;background:${o.bg || '#0d0d0f'}`);
    const src = source(inner, m, o), sm = smear(), push = o.push ?? push0;
    const fo = src.focus, cover = (m.fit || o.fit || 'cover') === 'cover';
    const update = (lt) => {
      const f = life(o, lt, defEnter); shown(el, !!f); if (!f) return;
      const t = lt - at, dr = o.drift || [0, 0], fq = clamp(V(o.full, t, 0));   // full: 0 = the box, 1 = the whole frame
      const Wc = r2(lerp(W0, K.W, fq)), Hc = r2(lerp(H0, K.H, fq)), Rc = r2(lerp(R, 0, fq));
      const x = lerp(V(o.x, t, K.W / 2) + dr[0] * t, K.W / 2, fq) + (f.x || 0), y = lerp(V(o.y, t, K.H / 2) + dr[1] * t, K.H / 2, fq) + (f.y || 0);
      const s = lerp(V(o.scale, t, 1), 1, fq) * (f.s ?? 1), r = lerp(V(o.rot, t, 0), 0, fq) + (f.r || 0);
      if (o.full != null) { setS(el, 'width', Wc + 'px'); setS(el, 'height', Hc + 'px'); setS(el, 'borderRadius', Rc + 'px'); setS(inner, 'borderRadius', Rc + 'px'); }
      el.style.transform = `translate(${r2(x - Wc / 2)}px,${r2(y - Hc / 2)}px) rotate(${r2(r)}deg) scale(${s.toFixed(4)})`;
      let sx = '';
      if (f.sm) { const g = life(o, lt - 1 / K.fps, defEnter) || f; sx = sm(((f.x || 0) - (g.x || 0)) * .35, ((f.y || 0) - (g.y || 0)) * .35); }
      setS(el, 'filter', join(blurF(f.blur || 0), sx));
      setS(el, 'opacity', f.o == null ? '1' : String(r2(f.o)));
      setS(el, 'clipPath', clipCss(f, Rc));
      const z = Math.max(.05, V(o.zoom, t, 1) * (1 + push * Math.max(0, t) / 5));
      let pn = V(o.pan, t, null) || [0, 0];
      if (cover && o.clampPan !== false && z >= 1) pn = [clamp(pn[0], -(1 - fo[0]) * Wc * (z - 1), fo[0] * Wc * (z - 1)), clamp(pn[1], -(1 - fo[1]) * Hc * (z - 1), fo[1] * Hc * (z - 1))];
      src.el.style.transform = `translate(${r2(pn[0])}px,${r2(pn[1])}px) scale(${z.toFixed(4)})`;
      if (src.clip) { const x2 = held(lt) - at; src.show(mtime(m, x2), mrate(m, x2)); }
    };
    const prepare = src.clip ? (lt) => { if (lt < at - .001 || lt > lifeEnd(o)) return null; const x2 = held(lt) - at; return src.prepare(mtime(m, x2), mrate(m, x2)); } : undefined;
    return { el, inner, src, img: src.img, update, prepare };
  }

  // 1. clip — footage from a frame-sequence dir: speed ramps, freeze, loop, zoom/pan keys, framing box, radius, shadow
  K.kit.clip = (parent, o = {}) => {
    const m = mspec(o.clip || o.src, o), full = o.w == null && o.h == null, def = full ? 'none' : 'scale';
    const C = boxed(parent, o, m, def, .04);
    return { el: C.el, img: C.img, update: C.update, prepare: C.prepare, dur: clipDur(m),
      mediaTime: (lt) => mtime(m, held(lt) - (o.at || 0)), cues: () => enterCues(o, def) };
  };

  // 2. photo — still with Ken Burns (from → to over dur), entrances, parallax drift
  K.kit.photo = (parent, o = {}) => {
    const m = mspec(o.src || o.clip, o), full = o.w == null && o.h == null, def = full ? 'none' : 'rise';
    const from = Object.assign({ s: 1, x: 0, y: 0 }, o.from), to = Object.assign({ s: 1.12, x: 0, y: 0 }, o.to);
    const kd = o.dur ?? 6, ke = o.ease || E.sine, oo = Object.assign({}, o);
    if (o.zoom == null) oo.zoom = (t) => lerp(from.s, to.s, ke(P(t, 0, kd)));
    if (o.pan == null) oo.pan = (t) => { const q = ke(P(t, 0, kd)); return [lerp(from.x, to.x, q), lerp(from.y, to.y, q)]; };
    const C = boxed(parent, oo, m, def, 0);
    return { el: C.el, img: C.img, update: C.update, prepare: C.prepare, dur: kd, cues: () => enterCues(o, def) };
  };

  // 3. cutout — transparent PNG subject as a sticker: thick outline, real drop shadow that follows its height, stamp entrance
  K.kit.cutout = (parent, o = {}) => {
    const at = o.at || 0, w = o.w ?? Math.round(MIN() * .6), u = w / 600;
    const olw = o.outline ?? Math.round(6 + w * .022), olc = o.outlineColor || '#fff';
    const rot = o.rot ?? -4, en = o.enter || 'stamp', ed = o.enterDur ?? (en === 'stamp' ? .42 : en === 'drop' ? .7 : .6);
    const outer = K.div(parent, `left:0;top:0;width:${w}px;display:none;transform-origin:50% 50%;` + zcss(o));
    const mid = K.el('div', 'position:relative;width:100%;transform-origin:50% 50%', outer);
    // the PNG is rasterised ONCE into CPU canvases at display size (prepare): a hard-edged graphic shown downscaled through
    // <img> was resampled differently depending on Chrome's decode-cache state (seek-order dependent edges)
    const img = K.el('canvas', 'position:relative;display:block;width:100%;height:auto;' + (olw > 0 ? `filter:${outlineFilter(olw, olc)};` : ''), mid);
    let shine = null, drawn = null;
    if (o.shine !== false) {
      const band = 'linear-gradient(112deg,transparent 0%,transparent 44%,#000 50%,transparent 56%,transparent 100%)';
      shine = K.el('canvas', `position:absolute;display:block;left:0;top:0;width:100%;height:100%;opacity:0;-webkit-mask-image:${band};mask-image:${band};` +
        '-webkit-mask-size:300% 100%;mask-size:300% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat', mid);
    }
    const raster = () => drawn || (drawn = K.preload(o.src).then((im) => {
      const cw = Math.max(1, Math.round(w * (o.res ?? 1))), chh = Math.max(1, Math.round(cw * (im.naturalHeight || 1) / (im.naturalWidth || 1)));
      for (const c of shine ? [img, shine] : [img]) {
        c.width = cw; c.height = chh; const g = c.getContext('2d', { willReadFrequently: true });
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, cw, chh);
        if (c === shine) { g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, cw, chh); }
      }
    }));
    const land = en === 'stamp' ? ed * .62 : en === 'drop' ? ed * .55 : en === 'pop' ? ed * .25 : 0;
    const fl = o.float ?? 1;
    const pose = (lt) => {   // → {s, r, x, y, blur, o, lift}
      const t = lt - at;
      let s = 1, r = rot, x = 0, y = 0, blur = 0, op = 1, lift = 0;
      if (en === 'stamp') {
        const q = P(t, 0, land), qe = E.in(2.2)(q);
        s = lerp(o.from ?? 1.5, 1, qe); r = lerp(rot + (o.spin ?? 18), rot, E.out(2)(q)); blur = (1 - q) * 9; op = clamp(q * 3.5); lift = 1 - qe;
        if (t > land) { const k = t - land; s *= 1 - .065 * Math.exp(-k * 9) * Math.sin(k * 2 * Math.PI * 3.4); r += K.settleShake(t, land, 2.4, 5.5, 9); }
      } else if (en === 'pop') {
        const q = K.pop(t, 0, ed); s = Math.max(0, q); r = rot - 14 * (1 - q); op = clamp(q * 4); lift = clamp(1 - q) * .6;
      } else if (en === 'drop') {
        const q = P(t, 0, land), qe = E.in(2)(q);
        y = -K.H * .7 * (1 - qe); r = rot + (o.spin ?? -24) * (1 - qe); blur = (1 - q) * 6; lift = (1 - qe) * .8;
        if (t > land) { y -= K.settleShake(t, land, 22 * u, 4, 8); r += K.settleShake(t, land, 3, 4, 8); s = 1 - .05 * Math.exp(-(t - land) * 10) * Math.sin((t - land) * 2 * Math.PI * 3); }
      }
      const tf = t - (land + .5);
      if (fl && tf > 0) { const k = clamp(tf / .6); y += Math.sin(tf * 2 * Math.PI * .42) * 7 * u * fl * k; r += Math.sin(tf * 2 * Math.PI * .31 + 1.3) * 1.1 * fl * k; }
      if (o.out != null && lt >= o.out) {
        const ex = o.exit || 'pop', xd = o.exitDur ?? .35, q = E.in(2.4)(P(lt, o.out, o.out + xd));
        if (ex === 'pop') { s *= Math.max(0, 1 + .12 * Math.sin(Math.min(1, q * 2.2) * Math.PI) * (q < .45 ? 1 : 0) - q); r += 22 * q; }
        else if (ex === 'fly') { y -= K.H * .9 * q; r -= 30 * q; blur += 10 * q; }
      }
      return { s, r, x, y, blur, o: op, lift };
    };
    const sm = smear();
    return {
      el: outer, img, dur: ed + .3,
      prepare: () => raster(),
      update(lt) {
        const end = o.out != null ? (o.exit === 'none' ? o.out : o.out + (o.exitDur ?? .35)) : Infinity;
        const vis = lt >= at && lt < end; shown(outer, vis); if (!vis) return;
        const t = lt - at, p = pose(lt), x = V(o.x, t, K.W / 2) + p.x, y = V(o.y, t, K.H / 2) + p.y;
        outer.style.transform = `translate(${r2(x)}px,${r2(y)}px) translate(-50%,-50%) rotate(${r2(p.r)}deg) scale(${Math.max(0, p.s).toFixed(4)})`;
        const sh = o.shadow === false ? '' : `drop-shadow(0 ${r2((10 + 70 * p.lift) * u)}px ${r2((12 + 46 * p.lift) * u)}px rgba(0,0,0,${r2(.34 - .2 * p.lift)}))`;
        // smear ≈ a 180° shutter (σ ≈ ¼ of the per-frame travel), capped so the sticker still reads while it falls
        let sx = ''; if (en === 'drop' || o.exit === 'fly') { const q = pose(lt - 1 / K.fps); sx = sm(0, Math.min(22, Math.abs(p.y - q.y) * .22 * (o.smear ?? 1))); }
        outer.style.filter = join(sh, sx);
        setS(mid, 'filter', join(blurF(p.blur)));
        outer.style.opacity = r2(p.o);
        if (shine) {
          const st = at + land + (o.shineAt ?? .12), q = P(lt, st, st + .55);
          shine.style.opacity = q > 0 && q < 1 ? .55 : 0;
          if (q > 0 && q < 1) { const mp = r2(lerp(92, 8, E.sine(q))) + '% 0'; shine.style.webkitMaskPosition = mp; shine.style.maskPosition = mp; }
        }
      },
      cues: () => [{ kind: en === 'drop' ? 'hit' : 'pop', t: at + land, gain: .9 }].concat(o.out != null && o.exit !== 'none' ? [{ kind: 'whoosh', t: o.out, gain: .5 }] : []),
    };
  };

  /* ---------------- 3D helpers ---------------- */
  // CSS order translate3d(cx,cy,z) rotateX rotateY rotateZ translate(-x,-y): screen position + depth of wall point (X,Y,Z0)
  const project = (X, Y, Z0, c, Pp, cx, cy) => {
    const px = X - c.x, py = Y - c.y, sz = Math.sin(c.rz), cz = Math.cos(c.rz), sy = Math.sin(c.ry), cyy = Math.cos(c.ry), sx = Math.sin(c.rx), cxx = Math.cos(c.rx);
    const x1 = px * cz - py * sz, y1 = px * sz + py * cz, z1 = Z0;
    const x2 = x1 * cyy + z1 * sy, z2 = -x1 * sy + z1 * cyy, y2 = y1;
    const y3 = y2 * cxx - z2 * sx, z3 = y2 * sx + z2 * cxx, x3 = x2;
    const Z = z3 + c.z, k = Pp / Math.max(1, Pp - Z);
    return { X: cx + x3 * k, Y: cy + y3 * k, Z, k };
  };
  const pickItems = (n, rows, cols, seed) => {   // index grid with no equal neighbours (left / up)
    const g = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      let k = Math.floor(K.hash(r * 17.31 + c * 3.97 + seed * 1.37) * n) % n;
      const l = c > 0 ? g[r * cols + c - 1] : -1, up = r > 0 ? g[(r - 1) * cols + c] : -1;
      for (let q = 0; q < n && n > 2 && (k === l || k === up); q++) k = (k + 1) % n;
      g.push(k);
    }
    return g;
  };
  const cardEl = (parent, cw, ch, R, sh, extra = '') =>
    K.div(parent, `left:${r2(-cw / 2)}px;top:${r2(-ch / 2)}px;width:${cw}px;height:${ch}px;border-radius:${R}px;overflow:hidden;background:#cfd0d2;box-shadow:${shadowCss(sh)};display:none;` + extra);

  // 4. cardWall — 3D perspective wall of cards the camera dollies/pans along (r2 "scroll." poster wall)
  K.kit.cardWall = (parent, o = {}) => {
    const at = o.at || 0, items = (o.items && o.items.length ? o.items : []).map((s) => mspec(s, o)), n = Math.max(1, items.length);
    const W0 = o.w ?? K.W, H0 = o.h ?? K.H, rows = o.rows ?? (K.W > K.H ? 5 : 7), cols = o.cols ?? 14;
    const cw = (o.card && o.card[0]) || Math.round(MIN() * .26), ch = (o.card && o.card[1]) || Math.round(cw * 1.42);
    const gap = o.gap ?? Math.round(cw * .1), R = o.radius ?? Math.round(cw * .065), pxs = cw + gap, pys = ch + gap;
    const Pp = o.perspective ?? Math.round(Math.max(K.W, K.H) * .7);
    const tilt = Object.assign({ rx: 4, ry: 42, rz: -3 }, o.tilt);
    // camera: explicit keys (cam), or the spec shorthand travel from → to over [t0, t1] (x/y in card pitches, z in px)
    const cv = (v) => [v[0] * pxs, v[1] * pys, v[2] || 0], tr = o.travel || [0, 5];
    const cam = o.cam || (o.from && o.to ? [[tr[0], cv(o.from)], [tr[1], cv(o.to), o.ease || E.glide]]
      : [[0, [-3.6 * pxs, .2 * pys, -1100]], [.85, [-2.3 * pxs, 0, 0], E.soft], [5, [2.8 * pxs, 0, 0], E.sine]]);
    const camAt = (t) => { const v = V(cam, t, [0, 0, 0]); return { x: v[0], y: v[1], z: v[2] || 0, rx: V(tilt.rx, t, 0) * D2R, ry: V(tilt.ry, t, 0) * D2R, rz: V(tilt.rz, t, 0) * D2R }; };
    const stage = K.div(parent, `left:${r2((o.x ?? K.W / 2) - W0 / 2)}px;top:${r2((o.y ?? K.H / 2) - H0 / 2)}px;width:${W0}px;height:${H0}px;display:none;overflow:hidden;` +
      `perspective:${Pp}px;perspective-origin:50% 50%;transform-origin:50% 50%;` + (o.bg ? `background:${o.bg};` : '') + zcss(o));
    const wall = K.div(stage, 'left:0;top:0;width:0;height:0;transform-style:preserve-3d;transform-origin:0 0');
    const seed = o.seed ?? 7, grid = pickItems(n, rows, cols, seed);
    const cards = grid.map((k, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const el = cardEl(wall, cw, ch, R, o.shadow ?? .5, o.ring ? `outline:0 solid ${o.ring};` : '');
      const src = items.length ? source(el, items[k], { fit: 'cover' }) : null;
      return { el, src, m: items[k], i, r, c, X: (c - (cols - 1) / 2) * pxs + (r % 2 ? (o.offset ?? 0) * pxs : 0), Y: (r - (rows - 1) / 2) * pys };
    });
    // highlight events: [[t, card, dur]] or [{t, i, dur}]; card = index | [row, col] | 'center' (card nearest the centre at t)
    const hls = (o.highlight || []).map((h) => (Array.isArray(h) ? { t: h[0], i: h[1], dur: h[2] } : Object.assign({}, h))).map((h) => {
      let i = h.i;
      if (Array.isArray(i)) i = i[0] * cols + i[1];
      else if (i == null || i === 'center') {   // the card nearest the screen centre half-way through the highlight (the wall keeps travelling)
        const c = camAt(h.t + Math.min(h.dur ?? 1.2, 1.2) * .4); let best = 1e18;
        for (const cd of cards) { const p = project(cd.X, cd.Y, 0, c, Pp, W0 / 2, H0 / 2), d = Math.hypot(p.X - W0 / 2, p.Y - H0 / 2); if (d < best) { best = d; i = cd.i; } }
      }
      return { t: h.t, i, dur: h.dur ?? 1.2 };
    });
    const hl = (i, t) => { let e = 0; for (const h of hls) if (h.i === i && t >= h.t) e = Math.max(e, K.pop(t, h.t, .5) * (1 - E.smooth(P(t, h.t + h.dur, h.t + h.dur + .45)))); return e; };
    const anyHl = (t) => { let e = 0; for (const h of hls) if (t >= h.t) e = Math.max(e, clamp(K.pop(t, h.t, .5)) * (1 - E.smooth(P(t, h.t + h.dur, h.t + h.dur + .45)))); return e; };
    const cx0 = (cols - 1) / 2, cy0 = (rows - 1) / 2;
    const visCard = (cd, c, h) => {
      const p = project(cd.X, cd.Y, 90 * h, c, Pp, W0 / 2, H0 / 2), mx = cw * p.k * .9, my = ch * p.k * .9;
      return { p, vis: p.Z < Pp - 60 && p.X > -mx && p.X < W0 + mx && p.Y > -my && p.Y < H0 + my };
    };
    const sm = smear(), lift = o.lift ?? 1, dimK = o.dim ?? .18;
    return {
      el: stage, dur: isKeys(cam) ? cam[cam.length - 1][0] : 5, pitch: [pxs, pys],
      prepare(lt) {
        if (lt < at || lt > lifeEnd(o) || !cards.some((cd) => cd.src && cd.src.clip)) return null;
        const t = lt - at, c = camAt(t), ps = [];
        for (const cd of cards) if (cd.src && cd.src.clip && visCard(cd, c, 0).vis) { const x = held(lt) - at; ps.push(cd.src.prepare(mtime(cd.m, x), mrate(cd.m, x))); }
        return Promise.all(ps);
      },
      update(lt) {
        const f = life(o, lt, 'none'); shown(stage, !!f); if (!f) return;
        const t = lt - at, c = camAt(t), ah = anyHl(t);
        wall.style.transform = `translate3d(${r2(W0 / 2)}px,${r2(H0 / 2)}px,${r2(c.z)}px) rotateX(${r2(c.rx / D2R)}deg) rotateY(${r2(c.ry / D2R)}deg) rotateZ(${r2(c.rz / D2R)}deg) translate(${r2(-c.x)}px,${r2(-c.y)}px)`;
        for (const cd of cards) {
          const h = hls.length ? hl(cd.i, t) : 0, { p, vis } = visCard(cd, c, h);
          shown(cd.el, vis); if (!vis) continue;
          let ez = 0, eo = 1;
          if (o.enter === 'cascade') { const d = (Math.abs(cd.c - cx0) * .5 + Math.abs(cd.r - cy0)) * (o.stagger ?? .035), q = E.snappy(P(t, d, d + .55)); ez = (1 - q) * 700; eo = clamp(q * 3); }
          // depth of field; a highlighted card pulls focus (racks to sharp while it is lifted)
          const db = Math.min(o.maxBlur ?? 14, Math.abs(p.Z - c.z - (o.focusZ || 0)) * (o.depthBlur ?? 13) / 1000) * (1 - clamp(h));
          cd.el.style.transform = `translate3d(${r2(cd.X)}px,${r2(cd.Y)}px,${r2(90 * h * lift + ez)}px) scale(${(1 + .13 * h * lift).toFixed(4)})`;
          setS(cd.el, 'filter', join(blurF(Math.round(db * 2) / 2), ah > .01 && h < .5 && dimK ? `brightness(${r2(1 - dimK * ah)})` : ''));
          setS(cd.el, 'opacity', String(r2(eo * (f.o ?? 1))));
          setS(cd.el, 'boxShadow', h > .02 ? shadowCss((o.shadow ?? .5) + 1.1 * clamp(h)) : shadowCss(o.shadow ?? .5));
          if (o.ring) setS(cd.el, 'outlineWidth', h > .02 ? r2(6 * clamp(h) * MIN() / 1080) + 'px' : '0px');
          if (cd.src && cd.src.clip) { const x = held(lt) - at; cd.src.show(mtime(cd.m, x), mrate(cd.m, x)); }
        }
        let sx = '';
        if (o.smear !== false) { const c0 = camAt(t - 1 / K.fps), p0 = project(c.x, c.y, 0, c0, Pp, W0 / 2, H0 / 2); sx = sm((p0.X - W0 / 2) * .28 * (o.smear ?? 1), (p0.Y - H0 / 2) * .28 * (o.smear ?? 1)); }
        setS(stage, 'filter', join(blurF(f.blur || 0), sx));
        stage.style.transform = f.s != null && f.s !== 1 ? `scale(${f.s.toFixed(4)})` : '';
      },
      cues() {
        const c = [{ kind: 'whoosh', t: at, gain: .8 }];
        for (const h of hls) c.push({ kind: 'tick', t: at + h.t, gain: .8 });
        return c;
      },
    };
  };

  // 5. carousel — 3D ring of cards rotating; focus events bring a card to the front (r2 "Knows your taste", r3 3d-cards)
  K.kit.carousel = (parent, o = {}) => {
    const at = o.at || 0, items = (o.items || []).map((s) => mspec(s, o)), n = o.count ?? Math.max(8, items.length);
    const cw = (o.card && o.card[0]) || Math.round(MIN() * (K.W > K.H ? .36 : .4)), ch = (o.card && o.card[1]) || Math.round(cw * 1.32);
    const step = 360 / n, Rr = o.radius ?? Math.round(Math.max(cw * n / (2 * Math.PI) * 1.16, K.W > K.H ? K.W * .34 : MIN() * .4));
    const x0 = o.x ?? K.W / 2, y0 = o.y ?? K.H / 2, Pp = o.perspective ?? Math.round(Math.max(K.W, K.H) * 1.05), tilt = o.tilt ?? -9;
    const R = o.cardRadius ?? Math.round(cw * .07), speed = o.speed ?? 34, fd = o.focusDur ?? .85, drift = o.drift ?? 5;
    const en = o.enter || 'spin';
    const stage = K.div(parent, `left:0;top:0;width:${K.W}px;height:${K.H}px;display:none;perspective:${Pp}px;perspective-origin:${r2(x0)}px ${r2(y0 - ch * .25)}px;transform-origin:${r2(x0)}px ${r2(y0)}px;` + zcss(o));
    const ring = K.div(stage, `left:${r2(x0)}px;top:${r2(y0)}px;width:0;height:0;transform-style:preserve-3d;transform-origin:0 0`);
    const cards = Array.from({ length: n }, (_, i) => {
      const m = items.length ? items[i % items.length] : null, el = cardEl(ring, cw, ch, R, o.shadow ?? .45);
      return { el, m, src: m ? source(el, m, { fit: 'cover' }) : null };
    });
    const focus = (o.focus || []).map((f) => (Array.isArray(f) ? f : [f.t, f.i])).sort((a, b) => a[0] - b[0]);
    const enterSpin = (t) => (en === 'spin' ? -(o.enterTurn ?? 140) * (1 - E.out(3)(P(t, 0, o.enterDur ?? 1.1))) : 0);
    const angle = (t) => {   // ring rotation (deg) after at
      let a = speed * Math.min(t, focus.length ? focus[0][0] : t), v = speed, tp = focus.length ? focus[0][0] : 0;
      for (let k = 0; k < focus.length; k++) {
        const [tk, idx] = focus[k];
        if (k > 0) { if (t < tk) return a + drift * (t - tp) + enterSpin(t); a += drift * (tk - tp); v = drift; }
        let d = ((-idx * step - a) % 360 + 360) % 360; if (speed < 0) d -= 360; if (Math.abs(d) < 40) d += speed < 0 ? -360 : 360;
        if (t < tk + fd) { const u = P(t, tk, tk + fd); return a + d * E.smooth(u) + v * fd * (u * u * u - 2 * u * u + u) + enterSpin(t); }
        a += d; tp = tk + fd;
      }
      return (focus.length ? a + drift * (t - tp) : speed * t) + enterSpin(t);
    };
    const sm = smear(), fs = o.focusScale ?? 1.14, lo = Object.assign({}, o, { enter: en === 'spin' ? 'none' : en, exit: o.exit || 'scale' });
    return {
      el: stage, dur: focus.length ? focus[focus.length - 1][0] + fd : 3,
      prepare(lt) {
        if (lt < at || lt > lifeEnd(o)) return null;
        const ps = []; for (const cd of cards) if (cd.src && cd.src.clip) { const x = held(lt) - at; ps.push(cd.src.prepare(mtime(cd.m, x), mrate(cd.m, x))); }
        return ps.length ? Promise.all(ps) : null;
      },
      update(lt) {
        const f = life(lo, lt, 'none'); shown(stage, !!f); if (!f) return;
        const t = lt - at, a = angle(t), fon = focus.length ? clamp(P(t, focus[0][0], focus[0][0] + fd * .6)) : 0;
        ring.style.transform = `translate3d(0,0,${r2(-Rr)}px) rotateX(${r2(V(tilt, t, 0))}deg) rotateY(${r2(a)}deg)`;
        cards.forEach((cd, i) => {
          shown(cd.el, true);
          const th = (a + i * step) * D2R, cf = Math.cos(th), front = (cf + 1) / 2, w = fon * Math.pow(Math.max(0, cf), 14);
          const ce = en === 'spin' ? E.snappy(P(t, .04 * i, .04 * i + .7)) : 1;
          cd.el.style.transform = `rotateY(${r2(i * step)}deg) translateZ(${r2(Rr + 80 * w)}px) scale(${((1 + (fs - 1) * w) * lerp(.35, 1, ce)).toFixed(4)})`;
          setS(cd.el, 'filter', join(blurF(Math.round((1 - front) * (o.depthBlur ?? 5) * 2) / 2), `brightness(${r2(.62 + .38 * front)})`));
          if (cd.src && cd.src.clip) { const x = held(lt) - at; cd.src.show(mtime(cd.m, x), mrate(cd.m, x)); }
        });
        const v = Math.abs(a - angle(t - 1 / K.fps)) * D2R * Rr;
        stage.style.transform = `translate(${r2(f.x || 0)}px,${r2(f.y || 0)}px) scale(${(f.s ?? 1).toFixed(4)})`;
        setS(stage, 'filter', join(blurF(f.blur || 0), o.smear === false ? '' : sm(Math.min(26, v * .16 * (o.smear ?? 1)), 0)));
        setS(stage, 'opacity', String(r2(f.o ?? 1)));
      },
      cues() { const c = [{ kind: 'whoosh', t: at, gain: .7 }]; for (const [tk] of focus) c.push({ kind: 'whip', t: at + tk, gain: .8 }); return c; },
    };
  };

  // 6. fan — cards fly in from scattered off-screen positions into stack | fan | grid | row | scatter, morph, explode out
  K.kit.fan = (parent, o = {}) => {
    const at = o.at || 0, items = (o.items || []).map((s) => mspec(s, o)), n = items.length;
    const cw = (o.card && o.card[0]) || Math.round(MIN() * .36), ch = (o.card && o.card[1]) || Math.round(cw * 1.32);
    const x0 = o.x ?? K.W / 2, y0 = o.y ?? K.H / 2, gap = o.gap ?? Math.round(cw * .07), R = o.radius ?? Math.round(cw * .06);
    const layouts = !o.layout || typeof o.layout === 'string' ? [[0, o.layout || 'stack']] : o.layout;
    const seed = o.seed ?? 3, stg = o.stagger ?? .07, fly = o.flyDur ?? .75, morph = o.morphDur ?? .7, spread = o.spread ?? 44;
    const sf = K.safe(), bnd = o.bounds || [K.W - sf.left - sf.right, (K.H - sf.top - sf.bottom) * .86], availW = bnd[0], availH = bnd[1];
    const jit = (i, k) => K.hash(seed * 7.13 + i * 3.71 + k * 11.3) * 2 - 1;
    const L = (name, i) => {
      if (name === 'stack') return { x: jit(i, 1) * cw * .06, y: jit(i, 2) * ch * .045, r: i === n - 1 ? jit(i, 3) * 2.5 : jit(i, 3) * 9, s: 1 };
      if (name === 'fan') {
        const a = n > 1 ? lerp(-spread / 2, spread / 2, i / (n - 1)) : 0, Rf = ch * (o.fanRadius ?? 1.5), fit = Math.min(1, availW / (2 * Rf * Math.sin(spread / 2 * D2R) + cw * 1.1));
        return { x: Rf * Math.sin(a * D2R) * fit, y: (Rf * (1 - Math.cos(a * D2R)) - Rf * (1 - Math.cos(spread / 2 * D2R)) * .45) * fit, r: a, s: fit };
      }
      if (name === 'scatter') return { x: jit(i, 4) * availW * .3, y: jit(i, 5) * availH * .28, r: jit(i, 6) * 14, s: .82 };
      if (name.startsWith('shuffle')) {   // the grid with cards trading places ('shuffle', 'shuffle:2', … = different orders)
        const sd = +(name.split(':')[1] || 1), perm = items.map((_, k) => k).sort((p, q) => K.hash(p * 7.7 + sd * 31.3 + seed) - K.hash(q * 7.7 + sd * 31.3 + seed));
        return L('grid', perm[i]);
      }
      const cols = name === 'row' ? n : name === 'col' ? 1 : (o.cols ?? Math.ceil(Math.sqrt(n * (K.W > K.H ? 1.8 : .75)))), rows = Math.ceil(n / cols);
      const gw = cols * cw + (cols - 1) * gap, gh = rows * ch + (rows - 1) * gap, s = Math.min(1, availW / gw, availH / gh);
      const c = i % cols, r = Math.floor(i / cols), inRow = r === rows - 1 ? n - r * cols : cols;
      return { x: (c - (inRow - 1) / 2) * (cw + gap) * s, y: (r - (rows - 1) / 2) * (ch + gap) * s, r: 0, s };
    };
    const from = o.from || 'scatter';
    const start = (i) => {
      const D = Math.hypot(K.W, K.H) * .72;
      if (from === 'bottom') return { x: jit(i, 7) * K.W * .4, y: K.H * .8 + Math.abs(jit(i, 9)) * 200, r: jit(i, 8) * 40, s: 1.1 };
      if (from === 'top') return { x: jit(i, 7) * K.W * .4, y: -K.H * .8 - Math.abs(jit(i, 9)) * 200, r: jit(i, 8) * 40, s: 1.1 };
      if (from === 'left' || from === 'right') return { x: (from === 'left' ? -1 : 1) * (K.W * .8 + Math.abs(jit(i, 9)) * 200), y: jit(i, 7) * K.H * .3, r: jit(i, 8) * 40, s: 1.1 };
      const ang = (K.hash(seed + i * 5.17) + i / Math.max(1, n)) * Math.PI * 2;
      return { x: Math.cos(ang) * D, y: Math.sin(ang) * D, r: jit(i, 8) * 75, s: 1.15 };
    };
    const mix = (a, b, q, qr) => ({ x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), r: lerp(a.r, b.r, qr ?? q), s: lerp(a.s, b.s, q) });
    const xd = o.exitDur ?? .55;
    const stateAt = (i, lt) => {
      const ti = at + i * stg; if (lt < ti) return null;
      let st = mix(start(i), L(layouts[0][1], i), E.snappy(P(lt, ti, ti + fly)), K.pop(lt, ti, fly * 1.15));
      for (let k = 1; k < layouts.length; k++) { const tk = at + layouts[k][0] + i * stg * .5; if (lt < tk) break; st = mix(st, L(layouts[k][1], i), E.smooth(P(lt, tk, tk + morph))); }
      if (o.out != null && lt >= o.out) {
        const te = o.out + (n - 1 - i) * stg * .35, q = E.in(2.6)(P(lt, te, te + xd)); if (lt >= te + xd) return null;
        const ang = Math.atan2(st.y + jit(i, 10) * 40, st.x + jit(i, 11) * 40), D = Math.hypot(K.W, K.H) * .85;
        st = { x: st.x + Math.cos(ang) * D * q, y: st.y + Math.sin(ang) * D * q, r: st.r + jit(i, 12) * 110 * q, s: st.s * (1 + .25 * q) };
      }
      return st;
    };
    const wrap = K.div(parent, 'left:0;top:0;width:0;height:0;display:none;' + zcss(o));
    const cards = items.map((m, i) => {
      const el = cardEl(wrap, cw, ch, R, o.shadow ?? .7, `z-index:${i + 1};`);
      return { el, m, src: source(el, m, { fit: 'cover' }), sm: smear() };
    });
    return {
      el: wrap, cards: cards.map((c) => c.el), dur: (n - 1) * stg + fly,
      prepare(lt) {
        if (lt < at) return null; const ps = [];
        cards.forEach((cd, i) => { if (cd.src.clip && stateAt(i, lt)) { const x = held(lt) - at; ps.push(cd.src.prepare(mtime(cd.m, x), mrate(cd.m, x))); } });
        return ps.length ? Promise.all(ps) : null;
      },
      update(lt) {
        shown(wrap, lt >= at); if (lt < at) return;
        const pz = 1 + (o.push ?? .03) * Math.max(0, lt - at) / 3;   // keeps holds alive
        wrap.style.transform = pz === 1 ? 'none' : K.about(x0, y0, pz.toFixed(4));
        cards.forEach((cd, i) => {
          const st = stateAt(i, lt); shown(cd.el, !!st); if (!st) return;
          cd.el.style.transform = `translate(${r2(x0 + st.x)}px,${r2(y0 + st.y)}px) rotate(${r2(st.r)}deg) scale(${st.s.toFixed(4)})`;
          const pv = stateAt(i, lt - 1 / K.fps) || start(i);
          setS(cd.el, 'filter', join(o.smear === false ? '' : cd.sm((st.x - pv.x) * .28 * (o.smear ?? 1), (st.y - pv.y) * .28 * (o.smear ?? 1))));
          if (cd.src.clip) { const x = held(lt) - at; cd.src.show(mtime(cd.m, x), mrate(cd.m, x)); }
        });
      },
      cues() {
        const c = [{ kind: 'whoosh', t: at, gain: .8 }, { kind: 'pop', t: at + (n - 1) * stg + fly * .45, gain: .6 }];
        for (let k = 1; k < layouts.length; k++) c.push({ kind: 'swoosh', t: at + layouts[k][0], gain: .7 });
        if (o.out != null) c.push({ kind: 'whip', t: o.out, gain: .9 });
        return c;
      },
    };
  };

  // 7. grid — tiled grid with a cascade reveal; one picture split into tiles (mosaic) or one item per tile
  K.kit.grid = (parent, o = {}) => {
    const at = o.at || 0, mosaic = !(o.items && o.items.length), m = mosaic ? mspec(o.clip || o.src, o) : null;
    const items = mosaic ? [] : o.items.map((s) => mspec(s, o)), land = K.W > K.H;
    const cols = o.cols ?? (mosaic ? (land ? 8 : 4) : land ? 4 : 3), rowsI = mosaic ? 0 : Math.ceil(items.length / cols), rows = o.rows ?? (mosaic ? (land ? 4 : 8) : Math.max(1, rowsI));
    const gap = o.gap ?? (mosaic ? 0 : Math.round(MIN() * .018)), R = o.radius ?? (mosaic ? 0 : Math.round(MIN() * .022));
    const sf = K.safe(), W0 = o.w ?? (mosaic ? K.W : K.W - sf.left - sf.right + (land ? 0 : 50));
    const tw = (W0 - gap * (cols - 1)) / cols;
    let th = o.tileH ?? (mosaic ? 0 : tw * (land ? .75 : 1.25)), H0 = o.h ?? (mosaic ? K.H : rows * th + gap * (rows - 1));
    if (!mosaic && o.h == null && H0 > K.H - sf.top - sf.bottom) { const k = (K.H - sf.top - sf.bottom) / H0; th *= k; H0 *= k; }
    if (mosaic || o.h != null) th = (H0 - gap * (rows - 1)) / rows;
    const x0 = o.x ?? K.W / 2, y0 = o.y ?? K.H / 2;
    const box = K.div(parent, `left:${r2(x0 - W0 / 2)}px;top:${r2(y0 - H0 / 2)}px;width:${r2(W0)}px;height:${r2(H0)}px;display:none;` + zcss(o));
    const order = o.order || 'diagonal', seed = o.seed ?? 5, style = o.style || 'scale';
    const rank = (r, c) => (order === 'rows' ? r * cols + c : order === 'cols' ? c * rows + r : order === 'center' ? Math.hypot(r - (rows - 1) / 2, c - (cols - 1) / 2)
      : order === 'random' ? K.hash(r * 13.1 + c * 7.7 + seed) * (rows + cols) : order === 'antidiagonal' ? r + (cols - 1 - c) : r + c);
    let maxRank = 0; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) maxRank = Math.max(maxRank, rank(r, c));
    const stg = o.stagger ?? (o.spread ?? .6) / Math.max(1, maxRank), td = o.tileDur ?? .55;
    const tiles = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const i = r * cols + c; if (!mosaic && i >= items.length && !o.fill) continue;
      // items mode: an incomplete last row is centred (align: 'left' keeps it flush left)
      const inRow = !mosaic && !o.fill && r === rows - 1 ? Math.min(cols, items.length - r * cols) : cols;
      const off = o.align === 'left' ? 0 : Math.round((cols - inRow) * (tw + gap) / 2);
      const tx = Math.round(c * (tw + gap)) + off, ty = Math.round(r * (th + gap)), tW = Math.round((c + 1) * (tw + gap) - gap) + off - tx, tH = Math.round((r + 1) * (th + gap) - gap) - ty;
      const el = K.div(box, `left:${tx}px;top:${ty}px;width:${tW}px;height:${tH}px;overflow:hidden;border-radius:${R}px;display:none;transform-origin:50% 50%;` +
        (mosaic ? (o.bg ? `background:${o.bg};` : '') : `background:#cfd0d2;box-shadow:${shadowCss(o.shadow ?? .45)};`));
      const src = mosaic ? source(el, m, { fit: 'cover', css: `left:${-tx}px;top:${-ty}px;width:${r2(W0)}px;height:${r2(H0)}px;`, focus: o.focus })
        : source(el, items[i % items.length], { fit: 'cover' });
      tiles.push({ el, src, r, c, d: rank(r, c) * stg, mm: mosaic ? m : items[i % items.length] });
    }
    const tileFx = (q) => {
      if (style === 'flip') return { tf: `perspective(${Math.round(tw * 4)}px) rotateY(${r2((1 - q) * -92)}deg)`, o: clamp(q * 4), cz: 1 };
      if (style === 'drop') return { tf: `translateY(${r2(-(1 - q) * th * .7)}px) scale(${(1.08 - .08 * q).toFixed(4)})`, blur: 12 * (1 - q), o: clamp(q * 3), cz: 1 + .15 * (1 - q) };
      if (style === 'iris') return { tf: `scale(${(1.06 - .06 * q).toFixed(4)})`, clip: `circle(${r2(q * 72)}% at 50% 50%)`, cz: 1 + .2 * (1 - q) };
      return { tf: `scale(${(.42 + .58 * q).toFixed(4)})`, blur: 14 * (1 - q), o: clamp(q * 2.5), cz: 1 + .28 * (1 - q) };
    };
    const xd = o.exitDur ?? .45;
    return {
      el: box, dur: maxRank * stg + td,
      prepare(lt) {
        if (lt < at || lt > lifeEnd(o) + maxRank * stg) return null;
        const x = held(lt) - at;
        if (mosaic) return m.clip ? tiles[0].src.prepare(mtime(m, x), mrate(m, x)) : null;
        const ps = tiles.filter((tl) => tl.src.clip).map((tl) => tl.src.prepare(mtime(tl.mm, x), mrate(tl.mm, x)));
        return ps.length ? Promise.all(ps) : null;
      },
      update(lt) {
        const vis = lt >= at && !(o.out != null && lt >= o.out + maxRank * stg * .7 + xd); shown(box, vis); if (!vis) return;
        const t = lt - at;
        for (const tl of tiles) {
          let q = E.snappy(P(t, tl.d, tl.d + td));
          if (o.out != null && lt >= o.out) q *= 1 - E.in(2.2)(P(lt, o.out + tl.d * .7, o.out + tl.d * .7 + xd));
          shown(tl.el, q > .001); if (q <= .001) continue;
          const f = tileFx(q);
          tl.el.style.transform = f.tf;
          setS(tl.el, 'filter', join(blurF(f.blur || 0)));
          setS(tl.el, 'opacity', String(r2(f.o ?? 1)));
          setS(tl.el, 'clipPath', f.clip || 'none');
          tl.src.el.style.transform = `scale(${(f.cz * V(o.zoom, t, 1)).toFixed(4)})`;
          if (tl.src.clip) { const x = held(lt) - at; tl.src.show(mtime(tl.mm, x), mrate(tl.mm, x)); }
        }
      },
      cues() { const c = [{ kind: 'swoosh', t: at, gain: .8 }, { kind: 'tick', t: at + maxRank * stg * .5, gain: .5 }]; if (o.out != null) c.push({ kind: 'swoosh', t: o.out, gain: .6 }); return c; },
    };
  };

  // 8. textMask — image or footage seen through huge text ("WEB"), per-letter rise, zoom-through into the picture
  K.kit.textMask = (parent, o = {}) => {
    const at = o.at || 0, text = String(o.text ?? 'WEB'), lines = text.split('\n'), m = mspec(o.clip || o.src, o);
    const cvs = K.el('canvas', `position:absolute;left:0;top:0;width:${K.W}px;height:${K.H}px;display:none;transform-origin:50% 50%;` + zcss(o), parent);
    cvs.width = K.W; cvs.height = K.H;
    const ctx = cvs.getContext('2d');
    const fam = o.font || (getComputedStyle(K.film).getPropertyValue('--k-display') || '').trim() || '"Inter Tight", sans-serif';
    const wt = o.weight ?? 900, trk = o.tracking ?? -.05, lh = o.leading ?? .84, sf = K.safe();
    const x0 = o.x ?? K.W / 2, y0 = o.y ?? K.H / 2, maxW = o.w ?? (K.W - 2 * Math.max(sf.left, K.W * .05));
    const setFont = (sz) => { ctx.font = `${wt} ${sz}px ${fam}`; ctx.letterSpacing = `${r2(trk * sz)}px`; };
    setFont(100);
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width - trk * 100));
    const size = o.size ?? Math.min(o.maxSize ?? K.H * (lines.length > 1 ? (K.W > K.H ? .3 : .2) : K.W > K.H ? .5 : .34), 100 * maxW / Math.max(1, widest));
    setFont(size);
    const capH = ctx.measureText('H').actualBoundingBoxAscent || size * .72, step = size * lh;
    const glyphs = [];   // per char: x (left), baseline y, index
    lines.forEach((ln, li) => {
      const lw = ctx.measureText(ln).width - trk * size, bx = x0 - lw / 2, by = y0 - (lines.length - 1) * step / 2 + capH / 2 + li * step;
      [...ln].forEach((ch, j) => glyphs.push({ ch, x: bx + ctx.measureText(ln.slice(0, j)).width, y: by, li, k: glyphs.length }));
    });
    const blockW = Math.min(maxW, widest * size / 100), blockH = (lines.length - 1) * step + capH;
    // zoom origin: focus [fx, fy] of the text block, snapped INTO a glyph stroke so a zoom-through fills the frame
    let ox = x0 + ((o.focus ? o.focus[0] : .5) - .5) * blockW, oy = y0 + ((o.focus ? o.focus[1] : .5) - .5) * blockH;
    if (o.snap !== false) {
      const sc = .25, oc = document.createElement('canvas'); oc.width = Math.ceil(K.W * sc); oc.height = Math.ceil(K.H * sc);
      const g = oc.getContext('2d'); g.scale(sc, sc); g.font = ctx.font; g.letterSpacing = ctx.letterSpacing; g.fillStyle = '#000';
      for (const gl of glyphs) g.fillText(gl.ch, gl.x, gl.y);
      const d = g.getImageData(0, 0, oc.width, oc.height).data, Wc = oc.width, Hc = oc.height, inside = (x, y) => x >= 0 && y >= 0 && x < Wc && y < Hc && d[(y * Wc + x) * 4 + 3] > 200;
      const tx = Math.round(ox * sc), ty = Math.round(oy * sc), rad = Math.max(2, Math.round(size * sc * .06)); let best = 1e18, bx = tx, by = ty;
      for (let y = Math.max(0, ty - 160); y < Math.min(Hc, ty + 160); y++) for (let x = Math.max(0, tx - 240); x < Math.min(Wc, tx + 240); x++) {
        if (!inside(x, y) || !inside(x - rad, y) || !inside(x + rad, y) || !inside(x, y - rad) || !inside(x, y + rad)) continue;
        const dd = (x - tx) ** 2 + (y - ty) ** 2; if (dd < best) { best = dd; bx = x; by = y; }
      }
      if (best < 1e18) { ox = bx / sc; oy = by / sc; }
    }
    const zFull = 2.6 * Math.max(K.W, K.H) / (size * .13);
    let im0 = null; if (!m.clip && m.src) K.preload(m.src).then((im) => { im0 = im; });
    const en = o.enter || 'rise', cssEn = en === 'rise' ? 'none' : en, stg = o.stagger ?? .06;
    const mfo = o.mediaFocus || m.focus || [.5, .5];
    const frameUrl = (lt) => (m.clip ? K.clipFrame(m.clip, mtime(m, held(lt) - at), { loop: !!m.loop }) : m.src);
    const drawMedia = (im, t) => {
      if (!im) return; const iw = im.naturalWidth, ih = im.naturalHeight; if (!iw) return;
      const zf = V(o.mediaZoom, t, 1 + (o.push ?? .05) * Math.max(0, t) / 3), s = Math.max(K.W / iw, K.H / ih) * zf, dw = iw * s, dh = ih * s;
      ctx.drawImage(im, (K.W - dw) * mfo[0], (K.H - dh) * mfo[1], dw, dh);
    };
    const lo = Object.assign({}, o, { enter: cssEn, exit: o.exit || 'scale' });
    return {
      el: cvs, dur: (glyphs.length - 1) * stg + .6, origin: [ox, oy],
      async prepare(lt) { if (lt < at || lt > lifeEnd(o)) return; const u = frameUrl(lt); if (u) await K.preload(u); },
      update(lt) {
        const f = life(lo, lt, 'none'); shown(cvs, !!f); if (!f) return;
        const t = lt - at, z = V(o.zoom, t, 1), full = clamp((z - zFull * .5) / (zFull * .5));
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.clearRect(0, 0, K.W, K.H);
        ctx.fillStyle = '#000';
        if (full < 1) {
          ctx.save(); ctx.translate(ox, oy); ctx.scale(z, z); ctx.translate(-ox, -oy); setFont(size); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
          for (const g of glyphs) {
            if (en === 'rise') {
              const q = E.snappy(P(t, g.k * stg, g.k * stg + .6)); if (q <= 0) continue;
              ctx.save(); ctx.beginPath(); ctx.rect(g.x - size, g.y - capH * 1.45, size * 3, capH * 1.45 + size * .3); ctx.clip();
              ctx.fillText(g.ch, g.x, g.y + (1 - q) * size * 1.05); ctx.restore();
            } else ctx.fillText(g.ch, g.x, g.y);
          }
          ctx.restore();
        }
        if (full > 0) { ctx.globalAlpha = full; ctx.fillRect(0, 0, K.W, K.H); ctx.globalAlpha = 1; }
        ctx.globalCompositeOperation = 'source-in';
        drawMedia(K.cached(frameUrl(lt)) || im0, t);
        if (o.bg) { ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = o.bg; ctx.fillRect(0, 0, K.W, K.H); }
        if (o.stroke && full < 1) {
          ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(ox, oy); ctx.scale(z, z); ctx.translate(-ox, -oy); setFont(size);
          ctx.strokeStyle = o.stroke; ctx.lineWidth = (o.strokeWidth ?? Math.max(2, size * .012)) / z; ctx.globalAlpha = 1 - full;
          for (const g of glyphs) if (en !== 'rise' || t >= g.k * stg + .3) ctx.strokeText(g.ch, g.x, g.y);
          ctx.restore(); ctx.globalAlpha = 1;
        }
        cvs.style.transform = `translate(${r2(f.x || 0)}px,${r2(f.y || 0)}px) scale(${(f.s ?? 1).toFixed(4)})`;
        setS(cvs, 'filter', join(blurF(f.blur || 0)));
        setS(cvs, 'opacity', String(r2(f.o ?? 1)));
      },
      cues() {
        const c = [{ kind: 'hit', t: at + (en === 'rise' ? .05 : 0), gain: .8 }];
        if (isKeys(o.zoom)) { const k = o.zoom.findIndex((kk, i) => i > 0 && kk[1] > 4); if (k > 0) c.push({ kind: 'zoom', t: at + o.zoom[k - 1][0], gain: .9 }); }
        return c;
      },
    };
  };

  // 9. spin — 3D flip/spin of an image card or a cut-out with smear ∝ angular speed, sheen and floor shadow (product spins)
  K.kit.spin = (parent, o = {}) => {
    const at = o.at || 0, cut = !!o.cutout, m = mspec(o.src || o.clip, o);
    const w = o.w ?? Math.round(MIN() * (cut ? .62 : .5)), h = o.h ?? Math.round(cut ? w : w * 1.3);
    const x0 = o.x ?? K.W / 2, y0 = o.y ?? K.H / 2, R = o.radius ?? (cut ? 0 : Math.round(w * .07)), th = o.thickness ?? (cut ? 0 : Math.max(4, Math.round(w * .022)));
    const fh = r2(w * .14);   // floor shadow: centred on the box bottom, moved to the DRAWN content's bottom in update()
    const floor = o.floor !== false ? K.div(parent, `left:${r2(x0 - w / 2)}px;top:${r2(y0 + h / 2 - fh / 2)}px;width:${w}px;height:${fh}px;display:none;border-radius:50%;` +
      'background:radial-gradient(closest-side,rgba(0,0,0,.42),rgba(0,0,0,0));filter:blur(8px);transform-origin:50% 50%;' + zcss(o)) : null;
    const stage = K.div(parent, `left:${r2(x0 - w / 2)}px;top:${r2(y0 - h / 2)}px;width:${w}px;height:${h}px;display:none;perspective:${o.perspective ?? Math.round(Math.max(w, h) * 3.4)}px;transform-origin:50% 50%;` + zcss(o));
    const body = K.div(stage, 'left:0;top:0;width:100%;height:100%;transform-style:preserve-3d;transform-origin:50% 50%');
    const backSame = o.back == null || o.back === 'same', backColor = typeof o.back === 'string' && o.back[0] === '#';
    const face = (css) => K.div(body, `left:0;top:0;width:100%;height:100%;border-radius:${R}px;` + css);
    const front = face(`overflow:${cut ? 'visible' : 'hidden'};transform:translateZ(${r2(th / 2)}px);backface-visibility:${cut && backSame ? 'visible' : 'hidden'};` + (cut ? '' : `background:#ddd;box-shadow:${shadowCss(o.shadow ?? .3)};`));
    const fs = source(front, m, { fit: cut ? 'contain' : 'cover', icss: cut && o.outline ? `filter:${outlineFilter(o.outline, o.outlineColor || '#fff')};` : '' });
    let bs = null;
    if (!(cut && backSame)) {
      const back = face(`overflow:hidden;transform:rotateY(180deg) translateZ(${r2(th / 2)}px);backface-visibility:hidden;background:${backColor ? o.back : '#111'};`);
      if (backSame) bs = source(back, m, { fit: cut ? 'contain' : 'cover' });
      else if (!backColor) bs = source(back, mspec(o.back), { fit: cut ? 'contain' : 'cover' });
    }
    const ns = th > 0 ? Math.max(2, Math.ceil(th / 2)) : 0;
    for (let k = 0; k < ns; k++) face(`background:${o.edge || '#c9cacd'};transform:translateZ(${r2(-th / 2 + (k + .5) * th / ns)}px)`);
    let sheen = null;
    if (o.sheen !== false) {
      if (cut) {
        if (!m.clip) sheen = K.img(front, m.src, 'left:0;top:0;width:100%;height:100%;object-fit:contain;filter:brightness(0) invert(1);opacity:0;' +
          '-webkit-mask-image:linear-gradient(105deg,transparent 30%,#000 50%,transparent 70%);mask-image:linear-gradient(105deg,transparent 30%,#000 50%,transparent 70%);' +
          '-webkit-mask-size:250% 100%;mask-size:250% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat');
      } else sheen = K.div(front, 'left:0;top:0;width:100%;height:100%;background:linear-gradient(105deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.6) 50%,rgba(255,255,255,0) 70%);background-size:250% 100%;background-repeat:no-repeat;opacity:0;mix-blend-mode:screen');
    }
    const spins = o.spins || [[0, o.turns ?? 1, o.dur ?? 1.2]], base = 360 * spins[0][1];
    const angle = (t) => {
      if (o.angle != null) return V(o.angle, t, 0);
      let a = -base; spins.forEach(([ts, tu, d, e], k) => { a += 360 * tu * (e || (k === 0 ? E.out(3) : E.inOut(3)))(P(t, ts, ts + (d ?? 1))); }); return a;
    };
    const sm = smear(), tilt = o.tilt ?? 0, fl = o.float ?? 1;
    // size of the picture as drawn in the box (a cut-out is contain-fitted: the shadow must sit under the object, not the box)
    let dbox = null;
    const drawn = () => {
      if (dbox) return dbox; if (!cut) return (dbox = [w, h]);
      const im = fs.img; if (!im || !im.naturalWidth) return [w, h];
      const ar = im.naturalWidth / im.naturalHeight; return (dbox = ar > w / h ? [w, w / ar] : [h * ar, h]);
    };
    return {
      el: stage, dur: spins.reduce((mx, s) => Math.max(mx, s[0] + (s[2] ?? 1)), 0),
      prepare(lt) { if (lt < at || lt > lifeEnd(o) || !m.clip) return null; const x = held(lt) - at; return Promise.all([fs.prepare(mtime(m, x), mrate(m, x)), bs && bs.clip ? bs.prepare(mtime(m, x), mrate(m, x)) : null]); },
      update(lt) {
        const f = life(o, lt, 'zoom'); shown(stage, !!f); if (floor) shown(floor, !!f); if (!f) return;
        const t = lt - at, a = angle(t), da = a - angle(t - 1 / K.fps), fy = fl ? Math.sin(t * 2 * Math.PI * .45) * 8 * fl * clamp(t - .8) : 0;
        body.style.transform = `translateY(${r2(fy)}px) rotateX(${r2(V(tilt, t, 0))}deg) rotate${o.axis === 'x' ? 'X' : 'Y'}(${r2(a)}deg)`;
        stage.style.transform = `translate(${r2(f.x || 0)}px,${r2(f.y || 0)}px) scale(${(V(o.scale, t, 1) * (f.s ?? 1)).toFixed(4)})`;
        const v = Math.abs(da) * D2R * (o.axis === 'x' ? h : w) / 2;
        const k = o.smear === false ? 0 : (o.smear === true || o.smear == null ? 1 : o.smear) * .22, bv = Math.min(34, v * k);
        setS(stage, 'filter', join(blurF(f.blur || 0), o.axis === 'x' ? sm(0, bv) : sm(bv, 0)));
        setS(stage, 'opacity', String(r2(f.o ?? 1)));
        if (floor) {
          const c = Math.abs(Math.cos(a * D2R)), sc = V(o.scale, t, 1) * (f.s ?? 1), [dw, dh] = drawn();
          const dy = (dh / 2 - h / 2) * sc + fh * (o.floorGap ?? .3) * sc;
          floor.style.transform = `translate(${r2(f.x || 0)}px,${r2((f.y || 0) + dy)}px) scale(${r2((.3 + .7 * (o.axis === 'x' ? 1 : c)) * sc * dw / w)},${r2(sc)})`;
          floor.style.opacity = r2((f.o ?? 1) * (1 - clamp(-fy / 30)) * .9);
        }
        if (sheen) {
          const sa = Math.sin(a * D2R), op = Math.min(.85, Math.pow(Math.abs(sa), .7) * .85), pos = r2((sa * .5 + .5) * 100) + '% 0';
          sheen.style.opacity = r2(op);
          if (cut) { sheen.style.webkitMaskPosition = pos; sheen.style.maskPosition = pos; } else sheen.style.backgroundPosition = pos;
        }
        if (m.clip) { const x = held(lt) - at; fs.show(mtime(m, x), mrate(m, x)); if (bs && bs.clip) bs.show(mtime(m, x), mrate(m, x)); }
      },
      cues() { return spins.map(([ts]) => ({ kind: 'whip', t: at + ts, gain: .85 })); },
    };
  };

  // 10. beforeAfter — antes / después with a sliding divider (slant optional) and labels; dir 'x' (default) or 'y'
  K.kit.beforeAfter = (parent, o = {}) => {
    const at = o.at || 0, W0 = o.w ?? K.W, H0 = o.h ?? K.H, full = o.w == null && o.h == null, R = o.radius ?? (full ? 0 : Math.round(MIN() * .03));
    const dir = o.dir || 'x', ma = mspec(o.a || o.before, o), mb = mspec(o.b || o.after, o), def = full ? 'none' : 'scale';
    const el = K.div(parent, `left:0;top:0;width:${W0}px;height:${H0}px;display:none;transform-origin:50% 50%;border-radius:${R}px;box-shadow:${shadowCss(o.shadow ?? !full)};` + zcss(o));
    const inner = K.div(el, `left:0;top:0;width:100%;height:100%;overflow:hidden;border-radius:${R}px;background:#111`);
    const LA = K.div(inner, 'left:0;top:0;width:100%;height:100%;overflow:hidden'), LB = K.div(inner, 'left:0;top:0;width:100%;height:100%;overflow:hidden');
    const sa = source(LA, ma, { focus: o.focusA || o.focus }), sb = source(LB, mb, { focus: o.focusB || o.focus });
    const sf = K.safe(), pad = Math.round(MIN() * .035), padT = full ? sf.top + 10 : pad, padB = full ? sf.bottom + 10 : pad;
    const labels = o.labels === false ? null : o.labels || ['ANTES', 'DESPUÉS'], lsz = o.labelSize ?? Math.round(MIN() * (full ? .04 : .032));
    let la = null, lb = null;
    if (labels) {
      const bot = o.labelPos === 'bottom';
      la = pill(LA, labels[0], { size: lsz, bg: 'rgba(17,18,20,.86)' }); lb = pill(LB, labels[1], { size: lsz, bg: 'var(--k-accent)' });
      fixBox(la, [el]); fixBox(lb, [el]);
      if (dir === 'x') {
        la.style.cssText += `;left:${full ? sf.left : pad}px;${bot ? 'bottom:' + padB : 'top:' + padT}px`;
        lb.style.cssText += `;right:${full ? sf.right : pad}px;${bot ? 'bottom:' + padB : 'top:' + padT}px`;
      } else {
        la.style.cssText += `;left:${full ? sf.left : pad}px;top:${padT}px`;
        lb.style.cssText += `;left:${full ? sf.left : pad}px;bottom:${padB}px`;
      }
    }
    const slant = (o.slant ?? 0) * D2R, L = dir === 'x' ? W0 : H0, Sd = dir === 'x' ? H0 : W0, ext = Math.abs(Math.tan(slant)) * Sd / 2;
    const hs = Math.round(MIN() * .095), lw = Math.max(4, Math.round(MIN() * .0065)), hx = hs / 2 + ext + lw;
    const grp = K.div(inner, 'left:0;top:0;width:100%;height:100%;pointer-events:none');
    const line = K.div(grp, `left:0;top:0;width:${dir === 'x' ? lw : W0 + 2 * Sd}px;height:${dir === 'x' ? H0 + 2 * Sd : lw}px;background:${o.lineColor || '#fff'};box-shadow:0 0 22px rgba(0,0,0,.35);transform-origin:50% 50%`);
    const handle = o.handle === false ? null : K.div(grp, `left:0;top:0;width:${hs}px;height:${hs}px;border-radius:50%;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.3),0 2px 6px rgba(0,0,0,.2);` +
      'display:flex;align-items:center;justify-content:center;transform-origin:50% 50%',
      `<svg viewBox="0 0 48 48" width="${Math.round(hs * .56)}" height="${Math.round(hs * .56)}" style="transform:rotate(${dir === 'x' ? 0 : 90}deg)"><path d="M18 13 L7 24 L18 35 M30 13 L41 24 L30 35" stroke="#111" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
    const wipe = o.wipe || [[0, 1], [.3, 1], [1.15, .5, E.smooth], [2.15, .5], [2.85, 0, E.smooth]];
    const hy = o.handleAt ?? .5, sm = smear();
    const cpos = (t) => lerp(-hx, L + hx, clamp(V(wipe, t, .5), -.2, 1.2));
    return {
      el,
      dur: isKeys(wipe) ? wipe[wipe.length - 1][0] : 3,
      prepare(lt) {
        if (lt < at || lt > lifeEnd(o)) return null; const x = held(lt) - at, ps = [];
        if (sa.clip) ps.push(sa.prepare(mtime(ma, x), mrate(ma, x))); if (sb.clip) ps.push(sb.prepare(mtime(mb, x), mrate(mb, x)));
        return ps.length ? Promise.all(ps) : null;
      },
      update(lt) {
        const f = life(o, lt, def); shown(el, !!f); if (!f) return;
        const t = lt - at, x = V(o.x, t, K.W / 2) + (f.x || 0), y = V(o.y, t, K.H / 2) + (f.y || 0);
        el.style.transform = `translate(${r2(x - W0 / 2)}px,${r2(y - H0 / 2)}px) scale(${(f.s ?? 1).toFixed(4)})`;
        setS(el, 'filter', join(blurF(f.blur || 0))); setS(el, 'opacity', String(r2(f.o ?? 1))); setS(el, 'clipPath', clipCss(f, R));
        const c = cpos(t), tn = Math.tan(slant) * Sd / 2, c0 = c - tn, c1 = c + tn;
        LB.style.clipPath = dir === 'x' ? `polygon(${r2(c0)}px 0,${W0 + 2}px 0,${W0 + 2}px ${H0 + 2}px,${r2(c1)}px ${H0 + 2}px)` : `polygon(0 ${r2(c0)}px,${W0 + 2}px ${r2(c1)}px,${W0 + 2}px ${H0 + 2}px,0 ${H0 + 2}px)`;
        const pz = 1 + (o.push ?? .05) * Math.max(0, t) / 4;
        sa.el.style.transform = `scale(${pz.toFixed(4)})`; sb.el.style.transform = `scale(${pz.toFixed(4)})`;
        if (dir === 'x') line.style.transform = `translate(${r2(c - lw / 2)}px,${r2(-Sd)}px) rotate(${r2(-slant / D2R)}deg)`;
        else line.style.transform = `translate(${r2(-Sd)}px,${r2(c - lw / 2)}px) rotate(${r2(slant / D2R)}deg)`;
        if (handle) {
          const along = (hy - .5) * Sd, hc = c + Math.tan(slant) * along, hq = Math.max(0, K.pop(t, o.handleIn ?? .1, .5));
          handle.style.transform = (dir === 'x' ? `translate(${r2(hc - hs / 2)}px,${r2(H0 * hy - hs / 2)}px)` : `translate(${r2(W0 * hy - hs / 2)}px,${r2(hc - hs / 2)}px)`) + ` scale(${r2(hq)})`;
        }
        const v = c - cpos(t - 1 / K.fps);
        setS(grp, 'filter', join(dir === 'x' ? sm(v * .4, 0) : sm(0, v * .4)));
        if (la) la.style.transform = popTf(K.pop(t, .15, .55));
        if (lb) lb.style.transform = popTf(K.pop(t, .3, .55));
        if (sa.clip) { const xx = held(lt) - at; sa.show(mtime(ma, xx), mrate(ma, xx)); }
        if (sb.clip) { const xx = held(lt) - at; sb.show(mtime(mb, xx), mrate(mb, xx)); }
      },
      cues() {
        const c = enterCues(o, def); if (labels) c.push({ kind: 'pop', t: at + .15, gain: .5 });
        if (isKeys(wipe)) for (let k = 1; k < wipe.length; k++) if (wipe[k][1] !== wipe[k - 1][1]) c.push({ kind: 'whoosh', t: at + wipe[k - 1][0], gain: .75 });
        return c;
      },
    };
  };

  // 10b. splitScreen — 2–3 panels slide in from alternating sides (counter-parallax inside), exit continues the direction
  K.kit.splitScreen = (parent, o = {}) => {
    const at = o.at || 0, items = (o.items || []).map((s) => mspec(s, o)), n = items.length, dir = o.dir || (K.H > K.W ? 'y' : 'x');
    const W0 = o.w ?? K.W, H0 = o.h ?? K.H, gap = o.gap ?? Math.round(MIN() * .012), R = o.radius ?? 0, stg = o.stagger ?? .12, d = o.dur ?? .65;
    const x0 = (o.x ?? K.W / 2) - W0 / 2, y0 = (o.y ?? K.H / 2) - H0 / 2, L = ((dir === 'y' ? H0 : W0) - gap * (n - 1)) / n;
    const box = K.div(parent, `left:${r2(x0)}px;top:${r2(y0)}px;width:${W0}px;height:${H0}px;display:none;` + zcss(o));
    const sf = K.safe(), lsz = o.labelSize ?? Math.round(MIN() * .036), pad = Math.round(MIN() * .03);
    const panels = items.map((m, i) => {
      const pw = dir === 'y' ? W0 : Math.round(L), ph = dir === 'y' ? Math.round(L) : H0, px = dir === 'y' ? 0 : Math.round(i * (L + gap)), py = dir === 'y' ? Math.round(i * (L + gap)) : 0;
      const el = K.div(box, `left:${px}px;top:${py}px;width:${pw}px;height:${ph}px;border-radius:${R}px;overflow:hidden;background:#111;display:none;` + (o.shadow ? `box-shadow:${shadowCss(o.shadow)};` : ''));
      const src = source(el, m, { fit: 'cover', focus: o.focus && o.focus[i] });
      let lab = null, labTf = '';
      const side = i % 2 ? 1 : -1;   // panel 0 enters from the left, 1 from the right, …
      if (o.labels && o.labels[i]) {
        const L = typeof o.labels[i] === 'string' ? { text: o.labels[i] } : o.labels[i];   // 'text' | { text, align, pos }
        lab = pill(el, L.text, { size: lsz, bg: i === n - 1 ? 'var(--k-accent)' : 'rgba(17,18,20,.86)' });
        // corner on the side the panel comes from (zig-zag), kept inside the Reels safe zone
        const al = L.align || o.labelAlign || 'side', h = al === 'side' ? (side < 0 ? 'left' : 'right') : al, bot = (L.pos || o.labelPos) === 'bottom';
        const gT = y0 + py, gB = y0 + py + ph, gL = x0 + px, gR = x0 + px + pw;
        const vy = bot ? `bottom:${Math.max(pad, gB > K.H - sf.bottom ? gB - (K.H - sf.bottom) + 10 : 0)}px` : `top:${Math.max(pad, gT < sf.top ? sf.top - gT + 10 : 0)}px`;
        const bw = fixBox(lab, [box, el]);
        const vx = h === 'center' ? `left:${Math.round((pw - bw) / 2)}px` : h === 'right' ? `right:${Math.max(pad, gR > K.W - sf.right ? gR - (K.W - sf.right) : 0)}px` : `left:${Math.max(pad, gL < sf.left ? sf.left - gL : 0)}px`;
        lab.style.cssText += `;${vx};${vy}`;
      }
      return { el, src, m, lab, labTf, side, sm: smear() };
    });
    const xd = o.exitDur ?? .45;
    const off = (i, lt) => {
      const pn = panels[i], ti = at + i * stg, span = dir === 'y' ? W0 + 60 : H0 + 60;
      if (lt < ti) return null;
      let v = pn.side * span * (1 - E.snappy(P(lt, ti, ti + d)));
      if (o.out != null && lt >= o.out) { const te = o.out + i * stg * .6; if (lt >= te + xd) return null; v -= pn.side * span * E.in(2.4)(P(lt, te, te + xd)); }
      return v;
    };
    return {
      el: box, dur: (n - 1) * stg + d,
      prepare(lt) {
        if (lt < at) return null; const ps = [];
        panels.forEach((pn) => { if (pn.src.clip) { const x = held(lt) - at; ps.push(pn.src.prepare(mtime(pn.m, x), mrate(pn.m, x))); } });
        return ps.length ? Promise.all(ps) : null;
      },
      update(lt) {
        shown(box, lt >= at); if (lt < at) return;
        const t = lt - at;
        panels.forEach((pn, i) => {
          const v = off(i, lt); shown(pn.el, v != null); if (v == null) return;
          const pv = off(i, lt - 1 / K.fps), dv = pv == null ? 0 : v - pv;
          pn.el.style.transform = dir === 'y' ? `translateX(${r2(v)}px)` : `translateY(${r2(v)}px)`;
          const z = 1.06 + (o.push ?? .04) * t / 4;
          pn.src.el.style.transform = (dir === 'y' ? `translateX(${r2(-v * .35)}px)` : `translateY(${r2(-v * .35)}px)`) + ` scale(${z.toFixed(4)})`;
          setS(pn.el, 'filter', join(dir === 'y' ? pn.sm(dv * .35, 0) : pn.sm(0, dv * .35)));
          if (pn.lab) pn.lab.style.transform = popTf(K.pop(lt, at + i * stg + d * .55, .5), pn.labTf);
          if (pn.src.clip) { const x = held(lt) - at; pn.src.show(mtime(pn.m, x), mrate(pn.m, x)); }
        });
      },
      cues() { const c = panels.map((_, i) => ({ kind: 'whip', t: at + i * stg, gain: .7 })); if (o.out != null) c.push({ kind: 'whoosh', t: o.out, gain: .7 }); return c; },
    };
  };

  K.media = { source, mspec, mtime, shadowCss, outlineFilter, project };   // internals other families may reuse (read-only)
})();
