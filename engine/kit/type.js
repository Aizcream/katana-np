/* kit/type.js — KINETIC TYPOGRAPHY family of the Katana NP kit. API reference: engine/kit/docs/type.md
     K.kit.words        word-by-word lines from markup ("Webs que cargan *rápido.*", "{box}desde cero{/}", "[img:a.jpg]")
     K.kit.headline     one XL word auto-fit, punch-in ('fill' | 'stroke' | 'stretch'), optional impact shake
     K.kit.ghost        giant outlined background word, slow drift, optional repeated rows
     K.kit.morph        per-letter glyph-swap morph A → B through serif / italic / mono faces, width interpolates
     K.kit.letterSwap   a word with one letter replaced by a slot (ring loader, logo, image, builder); zoom-through hook
     K.kit.typeOn       letter-by-letter wordmark build (pop) or caret typing (type), re-centres while it grows
     K.kit.stickerWords stacked boxed words, stamp-in one by one, slight rotations, hard shadow
     K.kit.captions     word-synced captions from a transcript ('karaoke' | 'pop' | 'bold')
     K.kit.counter      rolling odometer digits from → to with speed blur, separators, prefix / suffix
     K.kit.sliced       a word cut in N horizontal slices that slide in from alternating sides and lock
   Every factory(parent, opts) → { el, update(lt), cues(), dur }. update(lt) is a pure function of scene-local time:
   it only writes styles. All layout is measured once at build (fonts are loaded then). Layout trick used everywhere:
   each word / glyph is an inline-block with line-height:0 — baselines of mixed faces align, the line box never
   moves, and the element box sits on the optical middle of the cap height (transform-origin '50% 0' = visual centre). */
(function () {
  const K = window.K; if (!K) return;
  const E = K.E, clamp = K.clamp, lerp = K.lerp, P = K.p, H = K.hash;
  K.kit = K.kit || {};

  K.css('kt', `
.kt{position:absolute;left:0;top:0;pointer-events:none}
.kt-ln{position:absolute;left:0;top:0;white-space:nowrap}
.kt-i{display:inline-block;position:relative;line-height:0;white-space:pre;text-align:left;transform-origin:50% 0;isolation:isolate}
.kt-g{display:inline-block;position:relative;line-height:0;white-space:pre;transform-origin:50% 0}
.kt-z{display:inline-block;position:relative;width:0;line-height:0;white-space:pre;transform-origin:30% 0}
.kt-box{position:absolute;left:-.13em;right:-.1em;top:-.56em;bottom:-.5em;border-radius:.13em;z-index:-1;transform-origin:0 50%}
`);

  /* ------------------------------------------------------------------ faces, metrics, sizing */
  const FACE = {
    display: { v: 'display', w: 800, st: 'normal', tr: -.045 },
    serif: { v: 'serif', w: 400, st: 'italic', tr: -.01, fixed: true },     // Instrument Serif italic (emphasis)
    roman: { v: 'serif', w: 400, st: 'normal', tr: -.02, fixed: true },     // Instrument Serif upright
    mono: { v: 'mono', w: 500, st: 'normal', tr: -.03 },
    wide: { v: 'wide', w: 800, st: 'normal', tr: -.015, fs: '125%' },       // Archivo expanded
    cond: { v: 'wide', w: 800, st: 'normal', tr: -.01, fs: '62%' },         // Archivo condensed
  };
  const faceCss = (name, o = {}) => {
    const f = FACE[name] || FACE.display;
    return `font-family:var(--k-${f.v});font-weight:${f.fixed ? f.w : (o.weight ?? f.w)};font-style:${f.st};` +
      `letter-spacing:${o.tracking ?? f.tr}em;font-stretch:${o.stretch ?? f.fs ?? '100%'}`;
  };
  const cssVar = (n) => getComputedStyle(K.film || document.documentElement).getPropertyValue('--k-' + n).trim();
  const MET = {};
  // em metrics of a face from canvas: x-height, cap height, font ascent / descent (used for optical size matching)
  const metrics = (name) => {
    const f = FACE[name] || FACE.display, key = name + '|' + cssVar(f.v);
    if (MET[key]) return MET[key];
    const c = document.createElement('canvas').getContext('2d');
    c.font = `${f.st} ${f.w} 200px ${cssVar(f.v) || 'sans-serif'}`;
    const mx = c.measureText('x'), mh = c.measureText('H');
    const m = { xh: mx.actualBoundingBoxAscent / 200 || .52, cap: mh.actualBoundingBoxAscent / 200 || .72,
      asc: (mh.fontBoundingBoxAscent || 190) / 200, desc: (mh.fontBoundingBoxDescent || 50) / 200 };
    return (MET[key] = m);
  };
  // size factor that makes `name` optically match `ref` (x-height match, or cap height with by='cap')
  const faceScale = (name, ref = 'display', by = 'xh') => (name === ref || name === 'display' || name === 'wide' || name === 'cond' ? 1
    : clamp(metrics(ref)[by] / metrics(name)[by], .85, 1.45));
  const S = () => Math.min(K.W, K.H);
  const tall = () => K.H > K.W * 1.2;
  const defSize = (k) => Math.round(S() * k);
  const defMaxW = () => (tall() ? K.W - 2 * K.safe().right : Math.round(K.W * .8));   // 9:16: 820 px, centred text ends inside the Reels right rail
  const defX = (align, maxW) => (align === 'left' ? (K.W - maxW) / 2 : align === 'right' ? (K.W + maxW) / 2 : K.W / 2);
  const defY = () => Math.round(K.H * (tall() ? .45 : .5));
  const place = (el, x, y, w, h, align, valign) => {
    el.style.left = (x - (align === 'center' ? w / 2 : align === 'right' ? w : 0)).toFixed(1) + 'px';
    el.style.top = (y - (valign === 'top' ? 0 : valign === 'bottom' ? h : h / 2)).toFixed(1) + 'px';
    el.style.width = w + 'px'; el.style.height = h.toFixed(1) + 'px';
  };
  // largest font size (≤ max) at which `text` fits `maxW` in the given css (measured at 200 px)
  const fitSize = (host, text, css, maxW, max) => {
    const m = K.el('span', css + ';position:absolute;left:0;top:0;visibility:hidden;white-space:pre;font-size:200px', host);
    m.textContent = text; const w = m.offsetWidth; m.remove();
    return Math.max(8, Math.min(max, Math.floor(200 * maxW / Math.max(1, w) * .985)));
  };
  // word start times: explicit times → beats (offsets from `at`, in beats) → step (or per-item duration fn)
  const timesFor = (n, o, at, per) => {
    const step = o.step ?? K.spb() / 2, T = [];
    for (let i = 0; i < n; i++) {
      if (o.times && i < o.times.length) T.push(o.times[i]);
      else if (o.beats && i < o.beats.length) T.push(at + o.beats[i] * K.spb());
      else T.push(i === 0 ? at : T[i - 1] + (per ? per(i - 1) : step));
    }
    return T;
  };
  // write a pose (b === null leaves the filter alone; sy = extra vertical scale factor)
  const pose = (el, x, y, s, r, b, op, sy = 1) => {
    const st = el.style;
    if (Math.abs(s - 1) < 5e-4) s = 1; if (Math.abs(r) < .02) r = 0;   // settle tails end exactly at rest (Chrome rasters
    // near-identity transforms differently depending on the previous frame's transform → seek-order differences)
    let tf = '';
    if (x || y) tf += `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) `;
    if (r) tf += `rotate(${r.toFixed(2)}deg) `;
    if (s !== 1 || sy !== 1) tf += sy !== 1 ? `scale(${s.toFixed(4)},${(s * sy).toFixed(4)})` : `scale(${s.toFixed(4)})`;
    st.transform = tf;
    if (b !== null) st.filter = b > .2 ? `blur(${b.toFixed(2)}px)` : '';
    st.opacity = op >= .999 ? '' : Math.max(0, op).toFixed(3);
  };
  const show = (el, v) => { const w = v ? '' : 'hidden'; if (el.style.visibility !== w) el.style.visibility = w; };
  // outline text without the overlap seams of variable fonts (-webkit-text-stroke draws every contour): the filled
  // glyphs are dilated by r px and the original shape is cut out → a clean outer outline in the text colour.
  const OUTL = {};
  const outline = (w) => {
    const r = Math.max(.5, Math.round(w * 2) / 2), id = 'kto' + String(r).replace('.', '_');
    if (!OUTL[id]) {
      const NS = 'http://www.w3.org/2000/svg', f = document.createElementNS(NS, 'filter');
      f.setAttribute('id', id); f.setAttribute('x', '-4%'); f.setAttribute('y', '-35%'); f.setAttribute('width', '108%'); f.setAttribute('height', '170%');
      f.setAttribute('color-interpolation-filters', 'sRGB');
      f.innerHTML = `<feMorphology in="SourceGraphic" operator="dilate" radius="${r}" result="d"/><feComposite in="d" in2="SourceAlpha" operator="out"/>`;
      K.svgDefs().appendChild(f); OUTL[id] = 1;
    }
    return `url(#${id})`;
  };
  // shared exits: progress e (0→1, already eased) → pose deltas
  const exitPose = (kind, e, i, size) => {
    switch (kind) {
      case 'up': return { y: -.5 * size * e, b: .14 * size * e, op: 1 - e };
      case 'down': return { y: .5 * size * e, b: .14 * size * e, op: 1 - e };
      case 'blur': return { s: 1 + .1 * e, b: .24 * size * e, op: 1 - e };
      case 'scatter': { const a = H(i * 3.71 + .5) * 6.2832; return { x: Math.cos(a) * 1.6 * size * e, y: Math.sin(a) * 1.2 * size * e, r: (H(i * 1.93 + 2) - .5) * 150 * e, b: .1 * size * e, op: 1 - e * e }; }
      case 'zoom': return { s: Math.exp(Math.log(3.4) * e), b: .07 * size * e, op: 1 - clamp(e * 1.7 - .7) };
      case 'drop': return { y: 1.5 * size * e * e, r: (H(i * 5.3) - .5) * 50 * e, op: 1 - clamp(e * 1.5 - .5) };
      case 'cut': return { op: e > 0 ? 0 : 1 };
      default: return null;
    }
  };
  const EXIT_EASE = E.in(2.2);
  const addExit = (st, d) => { if (!d) return; st.X += d.x || 0; st.Y += d.y || 0; st.R += d.r || 0; st.Sc *= d.s || 1; st.B += d.b || 0; st.Op *= d.op ?? 1; };

  /* ------------------------------------------------------------------ word items + line flow (words, captions) */
  const CLS = {
    serif: { face: 'serif' }, italic: { face: 'serif' }, roman: { face: 'roman' }, mono: { face: 'mono' }, wide: { face: 'wide' },
    display: { face: 'display' }, cond: { face: 'cond' },
    accent: { color: 'var(--k-accent)' }, accent2: { color: 'var(--k-accent2)' }, accent3: { color: 'var(--k-accent3)' },
    muted: { color: 'var(--k-muted)' }, fg: { color: 'var(--k-fg)' }, bg: { color: 'var(--k-bg)' }, white: { color: '#fff' },
    box: { box: true }, stroke: { stroke: true },
  };
  const styleOf = (tok, ctx) => {
    const st = { face: ctx.face, color: ctx.color, box: false, stroke: false };
    const merge = (name) => { const d = (ctx.classes && ctx.classes[name]) || CLS[name]; if (d) Object.assign(st, d); };
    if (tok.em) [].concat(ctx.em).forEach(merge);
    if (tok.cls) merge(tok.cls);
    return st;
  };
  const textItem = (parent, text, st, ctx) => {
    const sc = st.face === ctx.face ? 1 : faceScale(st.face, ctx.face);
    const txt = ctx.upper && st.face !== 'serif' ? text.toUpperCase() : text;
    const color = st.box ? (st.boxText || ctx.boxText) : st.color;
    const css = (st.face === ctx.face ? '' : faceCss(st.face) + ';') + `font-size:${(ctx.size * sc).toFixed(2)}px;color:${color}`;
    const e = K.el('span', css, parent); e.className = 'kt-i';
    let box = null;
    if (st.box) { box = K.el('span', `background:${st.boxColor || ctx.boxColor}`, e); box.className = 'kt-box'; }
    let host = e;
    if (st.stroke) {   // padded inline-block (negative margins keep the line box) so the filter region has a real height
      host = K.el('span', `display:inline-block;position:relative;line-height:0;white-space:pre;padding:.65em .12em;margin:-.65em -.12em;filter:${outline(Math.max(1.5, ctx.size * .016))}`, e);
    }
    let glyphs = null;
    if (ctx.split) glyphs = [...txt].map((ch) => { const g = K.el('span', '', host); g.className = 'kt-g'; g.textContent = ch; return g; });
    else host.appendChild(document.createTextNode(txt));
    return { el: e, kind: 'text', text: txt, box, glyphs, st, color, sc };
  };
  // Photos are painted into a <canvas> (pure function of t), not shown as <img>: Chrome resamples an <img> whose drawn
  // scale changes between seeks with history-dependent quality (decode-cache mip reuse / low-quality-while-resizing), so
  // the same frame differed by seek order (determinism check). draw(z) repaints only when the zoom value changes.
  //   fit 'cover' | 'contain' | 'fill' · pos [fx, fy] (object-position as fractions) · crop [x, y, w, h] (fractions of the
  //   source image) · z = extra zoom about the centre (Ken Burns settle)
  const parsePos = (p) => (Array.isArray(p) ? p : String(p || '50% 50%').split(/\s+/).map((v) => (v === 'left' || v === 'top' ? 0 : v === 'right' || v === 'bottom' ? 1 : v === 'center' ? .5 : parseFloat(v) / 100)).concat([.5]).slice(0, 2));
  const photo = (box, src, w, h, { fit = 'cover', pos = [.5, .5], crop = null } = {}) => {
    const dpr = window.devicePixelRatio || 1, c = K.el('canvas', 'position:absolute;left:0;top:0;width:100%;height:100%;display:block', box);
    c.width = Math.max(1, Math.round(w * dpr)); c.height = Math.max(1, Math.round(h * dpr));
    const g = c.getContext('2d'), P2 = parsePos(pos);
    K.preload(src);
    let last = null;
    return {
      el: c,
      prepare: () => K.preload(src),
      draw(z = 1) {
        const key = z.toFixed(4); if (key === last) return;
        const im = K.cached(src); if (!im || !im.naturalWidth) return;
        const [cx, cy, cw, ch] = crop ? [crop[0] * im.naturalWidth, crop[1] * im.naturalHeight, crop[2] * im.naturalWidth, crop[3] * im.naturalHeight] : [0, 0, im.naturalWidth, im.naturalHeight];
        const W = c.width, Hh = c.height;
        let dw, dh;
        if (fit === 'fill') { dw = W * z; dh = Hh * z; } else { const k = (fit === 'contain' ? Math.min : Math.max)(W / cw, Hh / ch) * z; dw = cw * k; dh = ch * k; }
        g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, Hh);
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
        const ox = fit === 'fill' || z !== 1 ? .5 : P2[0], oy = fit === 'fill' || z !== 1 ? .5 : P2[1];
        g.drawImage(im, cx, cy, cw, ch, (W - dw) * ox, (Hh - dh) * oy, dw, dh);
        last = key;
      },
    };
  };
  const imgItem = (parent, spec, ctx) => {
    const [src, label] = spec.split('|').map((s) => s.trim());
    const size = ctx.size, shape = label ? 'pill' : (ctx.imgShape || 'tile');
    const e = K.el('span', '', parent, '​'); e.className = 'kt-i';
    let w, h, tile, img;
    if (shape === 'pill') {          // r1 "Pick a (photo)": dark pill, round thumbnail + label
      h = .9 * size; const d = Math.round(.72 * size);
      tile = K.div(e, `left:0;top:${(-h / 2).toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:${h / 2}px;background:${ctx.pillBg || 'var(--k-fg)'};` +
        `display:flex;align-items:center;padding:0 ${(.3 * size).toFixed(1)}px 0 ${(.09 * size).toFixed(1)}px;white-space:pre;box-shadow:0 ${(.05 * size).toFixed(1)}px ${(.16 * size).toFixed(1)}px rgba(0,0,0,.2)`);
      const c = K.el('div', `position:relative;width:${d.toFixed(1)}px;height:${d.toFixed(1)}px;border-radius:50%;overflow:hidden;flex:none;background:#bbb`, tile);
      img = photo(c, src, d, d);
      K.el('span', faceCss('display', { weight: 800, tracking: -.035 }) + `;font-size:${(.64 * size).toFixed(1)}px;line-height:1;color:${ctx.pillText || 'var(--k-bg)'};margin-left:${(.13 * size).toFixed(1)}px`, tile, label);
      w = tile.offsetWidth;
    } else {                          // r2 "So [tile] much": rounded photo tile at cap height
      const ar = ctx.imgAspect ?? (shape === 'circle' ? 1 : shape === 'wide' ? 1.45 : .74);
      h = Math.round((ctx.imgHeight ?? (shape === 'circle' ? .8 : 1)) * size); w = Math.round(h * ar);
      tile = K.div(e, `left:0;top:${(-h / 2).toFixed(1)}px;width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;border-radius:${shape === 'circle' ? '50%' : (.12 * size).toFixed(1) + 'px'};` +
        `overflow:hidden;background:#c9cacf;box-shadow:0 ${(.07 * size).toFixed(1)}px ${(.2 * size).toFixed(1)}px rgba(0,0,0,.24)`);
      img = photo(tile, src, w, h);
    }
    e.style.width = w.toFixed(1) + 'px';
    return { el: e, kind: 'img', tile, img, w, rot: (H(spec.length * 1.7 + w) > .5 ? 1 : -1) * 14 };
  };
  // greedy line breaking of measured items → explicit line divs; fills it.x, it.w, it.adv, ln.x0, ln.w, ln.top
  const flow = (el, items, { maxW, LH, align }) => {
    const meas = K.div(el, `left:0;top:0;white-space:nowrap;line-height:${LH}px;visibility:hidden`);
    for (const it of items) { meas.appendChild(it.el); meas.appendChild(document.createTextNode(' ')); }
    const a = K.el('span', 'white-space:pre', meas, 'x x'), b = K.el('span', 'white-space:pre', meas, 'xx');
    const spW = a.offsetWidth - b.offsetWidth;
    for (const it of items) it.w = it.el.offsetWidth;
    const lines = []; let cur = null, para = -1;
    for (const it of items) {
      if (!cur || it.para !== para || (cur.items.length && cur.w + spW + it.w > maxW)) { cur = { items: [], w: 0 }; lines.push(cur); }
      cur.w += (cur.items.length ? spW : 0) + it.w; cur.items.push(it); para = it.para;
    }
    meas.remove();
    lines.forEach((ln, j) => {
      ln.el = K.div(el, `top:${(j * LH).toFixed(1)}px;width:${maxW}px;height:${LH.toFixed(1)}px;line-height:${LH.toFixed(1)}px;text-align:${align}`);
      ln.el.className = 'kt-ln'; ln.top = j * LH;
      ln.items.forEach((it, k) => { if (k) ln.el.appendChild(document.createTextNode(' ')); ln.el.appendChild(it.el); it.line = j; });
    });
    for (const ln of lines) {
      ln.items.forEach((it, k) => { it.x = it.el.offsetLeft; it.w = it.el.offsetWidth; const pv = ln.items[k - 1]; it.adv = pv ? it.x + it.w - (pv.x + pv.w) : it.w; });
      const f = ln.items[0], l = ln.items[ln.items.length - 1];
      ln.x0 = f.x; ln.w = l.x + l.w - f.x;
      ln.items.forEach((it, k) => {          // consecutive {box} words share one continuous highlight
        const nx = ln.items[k + 1];
        if (!it.box || !nx || !nx.box) return;
        it.box.style.right = (-(nx.x - it.x - it.w) - 1).toFixed(1) + 'px';
        it.box.style.borderTopRightRadius = it.box.style.borderBottomRightRadius = '0';
        it.boxNext = nx; it.boxExt = nx.x - it.x - it.w + 1;          // words: the bridge opens when nx arrives
        nx.box.style.left = '0'; nx.box.style.borderTopLeftRadius = nx.box.style.borderBottomLeftRadius = '0';
      });
    }
    return lines;
  };

  /* ================================================================== 1. words */
  const ENTER_DUR = { pop: .3, rise: .55, blur: .5, slide: .34, drop: .5, type: .2, scatter: .55 };
  const WS = { display: .1, cond: .08, wide: .04, mono: 0, serif: .04, roman: .04 };   // default extra word spacing (em) per base face
  K.kit.words = (parent, o = {}) => {
    const at = o.at ?? 0, enter = o.enter || 'pop', exit = o.exit || 'up', layout = o.layout || 'final';
    const align = o.align || 'center', valign = o.valign || 'center', face = o.font || 'display';
    const size = o.size ?? defSize(.15), maxW = o.maxWidth ?? defMaxW();
    const LH = (o.lineHeight ?? .95) * size;
    const x = o.x ?? defX(align, maxW), y = o.y ?? defY();
    const split = o.split ?? ['rise', 'type', 'scatter'].includes(enter);
    const ctx = { size, face, color: o.color || 'var(--k-fg)', em: o.em || 'serif', boxColor: o.boxColor || 'var(--k-accent)',
      boxText: o.boxText || '#fff', upper: !!o.upper, split, imgShape: o.imgShape, imgAspect: o.imgAspect, imgHeight: o.imgHeight,
      classes: o.classes, pillBg: o.pillBg, pillText: o.pillText };
    // word gap: the display faces have a narrow space (.19 em) and the negative tracking eats it twice (space + the last
    // glyph of the word) → add word-spacing so the ink gap reads ≈ .27 em, like the Katana references
    const el = K.div(parent, faceCss(face, o) + `;font-size:${size}px;color:${ctx.color};word-spacing:${o.wordSpace ?? WS[face] ?? .1}em` + (o.z != null ? `;z-index:${o.z}` : ''));
    el.className = 'kt';
    if (o.shadow) el.style.textShadow = o.shadow === true ? '0 .03em .2em rgba(0,0,0,.35)' : o.shadow;
    const items = [];
    String(o.text ?? '').split('\n').forEach((para, pi) => K.tokens(para).forEach((tok) => {
      if (tok.space) return;
      const it = tok.img ? imgItem(el, tok.img, ctx) : textItem(el, tok.text, styleOf(tok, ctx), ctx);
      it.para = pi; items.push(it);
    }));
    const lines = flow(el, items, { maxW, LH, align });
    const blockH = lines.length * LH;
    place(el, x, y, maxW, blockH, align, valign);
    const n = items.length, cps = o.cps ?? 18, ed = o.enterDur ?? ENTER_DUR[enter] ?? .3, gs = o.glyphStagger ?? (enter === 'scatter' ? .03 : .022);
    const auto = enter === 'type' && o.step == null && !o.times && !o.beats;
    const T = timesFor(n, o, at, auto ? (i) => ((items[i].glyphs ? items[i].glyphs.length : 2) + 1) / cps : null);
    items.forEach((it, i) => { it.t = T[i]; it.i = i; it.dx = 0; it.sgn = H(i * 7.31 + 3) > .5 ? 1 : -1; if (enter === 'slide' || enter === 'drop') it.db = K.dirBlur(); });
    for (const ln of lines) ln.first = ln.items.reduce((a, b) => (b.t < a.t ? b : a));
    const out = o.out, xd = o.exitDur ?? (exit === 'wipe' ? .45 : .32), xs = o.exitStagger ?? (exit === 'wipe' ? .08 : .035);
    const tEnd = out == null ? Infinity : exit === 'cut' ? out : out + xd + xs * ((exit === 'wipe' ? lines.length : n) - 1);
    const gd = o.growDur ?? .32;
    const glen = (it) => (it.glyphs ? it.glyphs.length : 1);
    const lastT = n ? T[n - 1] + ed + (split ? (enter === 'type' ? glen(items[n - 1]) / cps : glen(items[n - 1]) * gs) : 0) : at;
    const flash = o.typeColor || 'var(--k-accent)';
    const st = {};

    function update(lt) {
      if (!n || lt < T[0] - 1e-6 || lt >= tEnd) { show(el, false); return; }
      show(el, true);
      const life = lt - at;
      el.style.transform = o.drift || o.push ? `translate(0,${((o.drift || 0) * life).toFixed(2)}px) scale(${(1 + (o.push || 0) * life).toFixed(4)})` : '';
      // grow: lines re-centre as words arrive (horizontal), the block re-centres as lines arrive (vertical)
      // and an item that arrives after its right-hand neighbours opens its gap and pushes them aside (r2 "So [tile] much")
      if (layout === 'grow') {
        let Hp = 0;
        for (const ln of lines) {
          let pw = 0, gap = 0;
          for (const it of ln.items) {          // the first word to arrive in a line lands centred (full width at once)
            const g = it === ln.first ? 1 : E.snappy(clamp((lt - it.t) / gd));
            it.dx = -gap; pw += it.adv * g; gap += it.adv * (1 - g);
          }
          ln.sx = (ln.w - pw) * (align === 'center' ? .5 : align === 'right' ? 1 : 0);
          Hp += LH * E.snappy(clamp((lt - ln.first.t) / gd));
        }
        // whole px vertically: lines resting at fractional y raster differently by seek history (determinism check)
        const sy = o.vgrow === false ? 0 : Math.round((blockH - Hp) * (valign === 'center' ? .5 : valign === 'bottom' ? 1 : 0));
        for (const ln of lines) ln.el.style.transform = `translate(${ln.sx.toFixed(2)}px,${sy.toFixed(2)}px)`;
      }
      // wipe exit (per line, left → right)
      if (exit === 'wipe' && out != null) lines.forEach((ln, j) => {
        const e = E.inOut(3)(P(lt, out + j * xs, out + j * xs + xd));
        ln.el.style.clipPath = e > 0 ? `inset(${-LH}px ${-size}px ${-LH}px ${(ln.x0 - size * .3 + (ln.w + size * .6) * e).toFixed(1)}px)` : '';
      });
      for (const it of items) {
        const dt = lt - it.t, s = it.el.style;
        if (dt < 0) { show(it.el, false); continue; }
        show(it.el, true);
        st.X = it.dx; st.Y = 0; st.Sc = 1; st.R = 0; st.B = 0; st.Op = 1; let SY = 1, filt = true;
        if (it.kind === 'img') {
          const q = K.pop(dt, 0, .5);
          st.Sc = .3 + .7 * q; st.R = it.rot * (1 - Math.min(1, q)); st.Op = clamp(dt / .05); st.B = (1 - clamp(dt / .16)) * .08 * size;
          it.img.draw(1.3 - .3 * E.soft(clamp(dt / .8)));
        } else switch (enter) {
          case 'pop': default: {
            const q = E.snappy(clamp(dt / ed));
            st.Y = (1 - q) * .19 * size; st.Sc = 1 + .14 * (1 - q); st.B = (1 - q) * .1 * size; st.Op = clamp(dt / .07);
            break;
          }
          case 'blur': {
            const q = E.soft(clamp(dt / ed));
            st.Sc = 1 + .1 * (1 - q); st.B = (1 - q) * .22 * size; st.Op = E.out(2)(clamp(dt / (ed * .6)));
            break;
          }
          case 'slide': {
            const q = E.snappy(clamp(dt / ed)), dir = o.dir ?? 1;
            st.X += dir * (1 - q) * .75 * size; st.Op = clamp(dt / .06); filt = false;
            it.db(it.el, (1 - q) * .2 * size, 0);
            break;
          }
          case 'drop': {
            const T1 = .2, h0 = 1.15 * size;
            if (dt < T1) st.Y = -h0 * (1 - (dt / T1) ** 2);
            else { const u = dt - T1; st.Y = u < .16 ? -h0 * .2 * Math.sin(Math.PI * u / .16) : u < .25 ? -h0 * .05 * Math.sin(Math.PI * (u - .16) / .09) : 0; if (u < .07) SY = 1 - .1 * Math.sin(Math.PI * u / .07); }
            st.R = it.sgn * 9 * (1 - E.out(2)(clamp(dt / (T1 + .25)))); st.Op = clamp(dt / .05); filt = false;
            it.db(it.el, 0, dt < T1 ? .09 * size * (dt / T1) : 0);
            break;
          }
          case 'rise': {
            const gl = it.glyphs, L = gl.length;
            for (let g = 0; g < L; g++) { const q = E.soft(clamp((dt - g * gs) / ed)); gl[g].style.transform = q >= 1 ? '' : `translateY(${((1 - q) * 1.3).toFixed(4)}em)`; }
            s.clipPath = dt < ed + L * gs ? 'inset(-.75em -.3em -.62em -.3em)' : '';
            break;
          }
          case 'type': {
            const gl = it.glyphs;
            for (let g = 0; g < gl.length; g++) {
              const dg = lt - K.TQ(it.t + g / cps), gst = gl[g].style;
              if (dg < -1e-6) { gst.visibility = 'hidden'; continue; }
              gst.visibility = '';
              const q = E.snappy(clamp(dg / ed));
              gst.transform = q >= 1 ? '' : `translate(${((1 - q) * .3).toFixed(4)}em,0) scale(${(1 + (1 - q) * .25).toFixed(4)})`;
              gst.filter = q < .97 ? `blur(${((1 - q) * .07 * size).toFixed(2)}px)` : '';
              gst.opacity = dg < .04 ? clamp(dg / .04 + .25).toFixed(3) : '';
              gst.color = q < 1 ? `color-mix(in srgb, ${flash} ${(100 * (1 - q)).toFixed(1)}%, ${it.color})` : '';
            }
            break;
          }
          case 'scatter': {
            const gl = it.glyphs;
            for (let g = 0; g < gl.length; g++) {
              const sd = it.i * 13.1 + g * 1.37, q = E.snappy(clamp((dt - g * gs) / ed)), a = H(sd) * 6.2832, d = (.6 + .9 * H(sd + 4.2)) * 1.3;
              const gst = gl[g].style;
              gst.transform = q >= 1 ? '' : `translate(${(Math.cos(a) * d * (1 - q)).toFixed(4)}em,${(Math.sin(a) * d * .7 * (1 - q)).toFixed(4)}em) rotate(${((H(sd + 9.9) - .5) * 160 * (1 - q)).toFixed(2)}deg)`;
              gst.filter = q < .97 ? `blur(${((1 - q) * .1 * size).toFixed(2)}px)` : '';
              gst.opacity = clamp((dt - g * gs) / .06).toFixed(3);
            }
            break;
          }
        }
        if (it.box) {
          const q = E.snappy(clamp((dt + .03) / (ed * 1.25)));
          it.box.style.transform = q >= 1 ? '' : `scaleX(${q.toFixed(4)})`;
          if (it.boxNext) {                   // merged bar: the bridge to the next {box} word grows when that word arrives
            const g = E.snappy(clamp((lt - it.boxNext.t + .03) / (ed * 1.25)));
            it.box.style.right = (-it.boxExt * g).toFixed(1) + 'px';
            it.box.style.borderTopRightRadius = it.box.style.borderBottomRightRadius = g > 0 ? '0' : '';
          }
        }
        if (out != null && exit !== 'wipe') {
          const ts = out + it.i * xs;
          if (lt >= ts) { const d = exitPose(exit, EXIT_EASE(clamp((lt - ts) / xd)), it.i, size); addExit(st, d); if (d && d.b) filt = true; }
        }
        // rotated (unscaled) words go on their own compositor layer: Chrome's CPU raster of rotated glyphs reuses
        // glyph work from the previous, differently rotated frame, so the same frame differed by seek order
        const wc = st.R !== 0 && st.Sc === 1 && SY === 1 ? 'transform' : '';
        if (s.willChange !== wc) s.willChange = wc;
        pose(it.el, st.X, st.Y, st.Sc, st.R, filt ? st.B : null, st.Op, SY);
      }
    }
    return {
      el, update, items, lines, times: T, size, dur: Math.max(0, lastT - at),
      prepare: items.some((it) => it.kind === 'img') ? () => Promise.all(items.filter((it) => it.kind === 'img').map((it) => it.img.prepare())) : undefined,
      cues() {
        if (o.cue === false) return [];
        const c = [];
        for (const it of items) {
          if (enter === 'type' && it.glyphs) it.glyphs.forEach((g, k) => c.push({ kind: 'tick', t: K.TQ(it.t + k / cps), gain: .28 }));
          else c.push({ kind: it.kind === 'img' ? 'pop' : (o.cue || 'pop'), t: it.t, gain: it.kind === 'img' ? .9 : (o.cueGain ?? .55) });
        }
        if (out != null && exit !== 'cut') c.push({ kind: exit === 'wipe' ? 'swoosh' : 'whoosh', t: out, gain: .4 });
        return c;
      },
    };
  };

  /* ================================================================== 2. headline */
  K.kit.headline = (parent, o = {}) => {
    const at = o.at ?? 0, mode = o.mode || 'fill', face = o.font || (mode === 'stretch' ? 'wide' : 'display');
    const align = o.align || 'center', valign = o.valign || 'center';
    const maxW = o.maxWidth ?? (tall() ? K.W - 2 * K.safe().right : Math.round(K.W * .84));
    const sFrom = o.stretchFrom ?? 62, sTo = o.stretchTo ?? 125;
    const text = o.upper ? String(o.text ?? '').toUpperCase() : String(o.text ?? '');
    const color = o.color || 'var(--k-fg)';
    const el = K.div(parent, o.z != null ? `z-index:${o.z}` : ''); el.className = 'kt';
    const css = faceCss(face, { weight: o.weight ?? 900, tracking: o.tracking ?? ({ wide: -.02, cond: -.02, serif: -.02, roman: -.025, mono: -.04 }[face] ?? -.04), stretch: mode === 'stretch' ? sTo + '%' : undefined });
    const size = o.size ?? fitSize(el, text, css, maxW, o.maxSize ?? defSize(tall() ? .36 : .42));
    const LH = size * (o.lineHeight ?? .9);
    const x = o.x ?? defX(align, maxW), y = o.y ?? defY();
    place(el, x, y, maxW, LH, align, valign);
    const pw = K.div(el, 'left:0;top:0;width:100%;height:100%');            // pose target
    const tcss = `${css};font-size:${size}px;line-height:${LH.toFixed(1)}px;white-space:pre;text-align:${align}`;
    const inner = K.div(pw, `left:0;top:0;width:100%;height:100%;${tcss};color:${color}`);
    inner.textContent = text;
    const sw = o.strokeWidth ?? Math.max(2, size * .012);
    let fill = null, fillBot = 0;
    if (mode === 'stroke') {
      inner.style.filter = outline(sw);
      if (o.fillAt != null) {
        const pad = size * .3;
        fill = K.div(pw, `left:0;top:${-pad}px;width:100%;height:${LH + 2 * pad}px;padding-top:${pad}px;box-sizing:border-box;${tcss};color:${o.fillColor || color}`);
        fill.textContent = text;
        const mt = metrics(face); fillBot = pad + LH / 2 + (mt.asc - mt.desc) / 2 * size + size * .03;   // baseline (+ a hair) in fill-layer px
      }
    }
    const pd = o.punchDur ?? .42, punch = o.punch ?? 1.25;
    const out = o.out, exit = o.exit || 'blur', xd = o.exitDur ?? .35;
    const tEnd = out == null ? Infinity : exit === 'cut' ? out : out + xd;
    const shakeAmp = o.shake ? (o.shake === true ? .03 : o.shake) * size : 0;
    const st = {};
    function update(lt) {
      const dt = lt - at;
      if (dt < 0 || lt >= tEnd) { show(el, false); return; }
      show(el, true);
      const q = K.pop(dt, 0, pd);
      st.Sc = punch - (punch - 1) * q; st.B = (1 - E.out(2)(clamp(dt / .22))) * .12 * size; st.Op = clamp(dt / .05); st.X = 0; st.Y = 0; st.R = 0;
      // impact shake in whole px, cut once its envelope < 8 % (~.32 s): a sub-px / sub-degree tail on a huge word is
      // invisible but rasters differently by seek history (determinism check)
      if (shakeAmp && Math.exp(-8 * (lt - at - .05)) > .08) { st.X = Math.round(K.settleShake(lt, at + .05, shakeAmp, 6.5, 8)); st.Y = Math.round(K.settleShake(lt, at + .05, shakeAmp * .7, 8.3, 8)); st.R = K.settleShake(lt, at + .05, 1.2, 5, 8); }
      if (mode === 'stretch') inner.style.fontStretch = lerp(sFrom, sTo, E.snappy(P(dt, .02, o.stretchDur ?? .75))).toFixed(2) + '%';
      if (fill) { const f = E.inOut(3)(P(lt, o.fillAt, o.fillAt + (o.fillDur ?? .4))); fill.style.clipPath = `inset(${((1 - f) * fillBot).toFixed(1)}px 0 0 0)`; show(fill, f > 0); }
      if (out != null && lt >= out) addExit(st, exitPose(exit, EXIT_EASE(clamp((lt - out) / xd)), 0, size));
      pose(pw, st.X, st.Y, st.Sc, st.R, st.B, st.Op);
    }
    return { el, update, size, dur: pd + (mode === 'stretch' ? .75 : 0), cues: () => (o.cue === false ? [] : [{ kind: o.shake ? 'hit' : 'popxl', t: at, gain: 1 }].concat(out != null && exit !== 'cut' ? [{ kind: 'whoosh', t: out, gain: .5 }] : [])) };
  };

  /* ================================================================== 3. ghost */
  K.kit.ghost = (parent, o = {}) => {
    const at = o.at ?? 0, rows = o.rows ?? 1, face = o.font || 'display', upper = o.upper ?? true;
    const text = upper ? String(o.text ?? '').toUpperCase() : String(o.text ?? '');
    const size = o.size ?? Math.round(tall() ? K.H * .2 : K.H * .38);
    const LH = size * (o.lineHeight ?? .9), gap = o.gap ?? size * .04;
    const blockH = rows * LH + (rows - 1) * gap;
    const y = o.y ?? defY(), x = o.x ?? K.W / 2;          // behind the default text line
    const repeat = o.repeat ?? rows > 1;
    const color = o.color || 'var(--k-fg)', sw = o.strokeWidth ?? Math.max(1.5, size * .0065);
    const el = K.div(parent, `left:0;top:${(y - blockH / 2).toFixed(1)}px;width:${K.W}px;height:${blockH.toFixed(1)}px` + (o.z != null ? `;z-index:${o.z}` : ''));
    el.className = 'kt';
    const css = faceCss(face, { weight: o.weight ?? 800, tracking: o.tracking ?? -.03 }) + `;font-size:${size}px;line-height:${LH.toFixed(1)}px;white-space:pre;` +
      (o.fill ? `color:${o.fill}` : `color:${color};filter:${outline(sw)}`);
    const unitTxt = repeat ? text + (o.sep ?? '  ') : text;
    const m = K.el('span', css + ';position:absolute;visibility:hidden', el); m.textContent = unitTxt; const uw = m.offsetWidth || 1; m.remove();
    const reps = repeat ? Math.ceil(K.W / uw) + 2 : 1;
    const R = [];
    for (let r = 0; r < rows; r++) {
      const row = K.div(el, css + `;left:0;top:${(r * (LH + gap)).toFixed(1)}px`);
      row.textContent = unitTxt.repeat(reps);
      R.push({ el: row, dir: (o.alt ?? true) && r % 2 ? -1 : 1, ph: (r * .37 % 1) * uw });
    }
    const drift = o.drift ?? 26, op = o.opacity ?? .16, out = o.out, ed = o.enterDur ?? .8, xd = o.exitDur ?? .5;
    function update(lt) {
      if (lt < at || (out != null && lt >= out + xd)) { show(el, false); return; }
      show(el, true);
      const q = E.soft(P(lt, at, at + ed)), e = out != null ? E.in(2)(P(lt, out, out + xd)) : 0, life = lt - at;
      el.style.opacity = (op * q * (1 - e)).toFixed(4);
      el.style.transform = `translate(0,${((o.driftY || 0) * life).toFixed(2)}px) scale(${(1.07 - .07 * q + .05 * e).toFixed(4)})`;
      el.style.filter = q < .98 ? `blur(${((1 - q) * 10).toFixed(2)}px)` : '';
      for (const r of R) {
        const d = r.dir * drift * life;
        const xx = repeat ? -((((d + r.ph) % uw) + uw) % uw) - uw * .5 : x - uw / 2 - d;
        r.el.style.transform = `translate(${xx.toFixed(2)}px,0)`;
      }
    }
    return { el, update, size, dur: ed, cues: () => [] };
  };

  /* ================================================================== 4. morph */
  const SCR = 'ABCDEFGHJKMNPRSTUVWXYZabdeghkmnpqrstuwxyz#%&?*';
  K.kit.morph = (parent, o = {}) => {
    const A = [...String(o.from ?? '')], B = [...String(o.to ?? '')];
    const at = o.at ?? 0, mAt = o.morphAt ?? at + .9, md = o.morphDur ?? .5, seed = o.seed ?? 1;
    const align = o.align || 'center', valign = o.valign || 'center', face = o.font || 'display';
    const maxW = o.maxWidth ?? defMaxW();
    const el = K.div(parent, o.z != null ? `z-index:${o.z}` : ''); el.className = 'kt';
    const base = faceCss(face, { weight: o.weight ?? 850, tracking: o.tracking ?? -.05 });
    const cap = o.maxSize ?? defSize(tall() ? .17 : .15);
    const size = o.size ?? Math.min(fitSize(el, A.join(''), base, maxW, cap), fitSize(el, B.join(''), base, maxW, cap));
    const LH = size * .95;
    el.style.cssText += `;${base};font-size:${size}px;color:${o.color || 'var(--k-fg)'}`;
    const x = o.x ?? defX(align, maxW), y = o.y ?? defY();
    place(el, x, y, maxW, LH, align, valign);
    const adv = (chars) => {
      if (!chars.length) return [];
      const m = K.div(el, 'left:0;top:0;white-space:pre;visibility:hidden');
      const sp = chars.map((c) => K.el('span', '', m, c)); const xs = sp.map((s) => s.offsetLeft); const tw = m.offsetWidth; m.remove();
      return chars.map((c, i) => (i + 1 < chars.length ? xs[i + 1] : tw) - xs[i]);
    };
    const ws = (o.wordSpace ?? WS[face] ?? .1) * size;          // extra word gap (see words)
    const wA = adv(A).map((w, i) => w + (A[i] === ' ' ? ws : 0)), wB = adv(B).map((w, i) => w + (B[i] === ' ' ? ws : 0));
    const line = K.div(el, `width:${maxW}px;height:${LH}px;line-height:${LH}px;text-align:${align}`); line.className = 'kt-ln';
    const faces = o.faces || ['roman', 'serif', 'serif', 'roman', 'mono', 'serif'];
    const n = Math.max(A.length, B.length), slots = [];
    const mk = (s, ch, fname) => {
      if (ch == null) return null;
      const g = K.el('span', fname === face ? '' : faceCss(fname) + `;font-size:${(size * (fname === 'roman' ? faceScale('roman', face, 'cap') * 1.04 : faceScale(fname, face))).toFixed(2)}px`, s);
      g.className = 'kt-z'; g.textContent = ch; return g;
    };
    for (let i = 0; i < n; i++) {
      const s = K.el('span', '', line); s.className = 'kt-i';
      const sp = B[i] === ' ' || B[i] == null;
      const tf = sp ? face : faces[Math.floor(H(i * 4.71 + seed * 1.3) * faces.length) % faces.length];
      const a = mk(s, A[i], face), m = mk(s, B[i], tf), b = mk(s, B[i], face);
      let wT = 0; if (m) { m.style.width = 'auto'; wT = m.offsetWidth; m.style.width = ''; }
      if (B[i] === ' ') wT += ws;
      const u = n > 1 ? i / (n - 1) : 0, j = (H(i * 2.31 + seed * 7) - .5) * .16;
      const tA = mAt + md * clamp(.42 * u + j * .6, 0, .5);
      const tB = Math.max(tA + 2.5 / K.fps, mAt + md * (.5 + .45 * u + j * .4));
      slots.push({ el: s, a, m, b, ch: B[i], tf, wA: wA[i] ?? 0, wB: wB[i] ?? 0, wT, tA, tB, i });
    }
    const out = o.out, exit = o.exit || 'up', xd = o.exitDur ?? .3, xs = o.exitStagger ?? .025;
    const tEnd = out == null ? Infinity : exit === 'cut' ? out : out + xd + xs * (n - 1);
    const enterA = o.enter ?? (mAt - at > .25 ? 'pop' : 'none');
    const sf = o.scrambleFrames ?? 2;
    const st = {};
    function update(lt) {
      if (lt < at || lt >= tEnd) { show(el, false); return; }
      show(el, true);
      for (const sl of slots) {
        const { a, m, b, tA, tB } = sl;
        let w;
        if (lt < tA) { w = sl.wA; if (a) show(a, true); if (m) show(m, false); if (b) show(b, false); }
        else if (lt < tB) {
          w = lerp(sl.wA, sl.wT, E.width(P(lt, tA, tA + .14)));
          if (a) show(a, lt < tA + 1.5 / K.fps);
          if (b) show(b, false);
          if (m) {
            show(m, true);
            const f = Math.floor((K.TQ(lt) - K.TQ(tA)) * K.fps + 1e-6);
            const ch = o.scramble !== false && f < sf && sl.ch !== ' ' ? SCR[Math.floor(H(sl.i * 9.1 + f * 3.3 + seed) * SCR.length)] : sl.ch;
            if (m.textContent !== ch) m.textContent = ch;
            const q = E.snappy(P(lt, tA, tA + .14));
            pose(m, 0, 0, 1 + .22 * (1 - q), 0, (1 - q) * .06 * size, 1);
          }
        } else {
          const wm = lerp(sl.wA, sl.wT, E.width(P(tB, tA, tA + .14)));
          w = lerp(wm, sl.wB, E.width(P(lt, tB, tB + .16)));
          if (a) show(a, false); if (m) show(m, false);
          if (b) { show(b, true); const q = E.snappy(P(lt, tB, tB + .12)); pose(b, 0, 0, 1 + .08 * (1 - q), 0, (1 - q) * .04 * size, 1); }
        }
        sl.el.style.width = Math.max(0, w).toFixed(2) + 'px';
        st.X = 0; st.Y = 0; st.Sc = 1; st.R = 0; st.B = 0; st.Op = 1;
        if (enterA === 'pop') { const d0 = lt - at - sl.i * .03, q = E.snappy(clamp(d0 / .3)); st.Y = (1 - q) * .19 * size; st.Sc = 1 + .14 * (1 - q); st.B = (1 - q) * .1 * size; st.Op = clamp(d0 / .07); }
        if (out != null && lt >= out + sl.i * xs) addExit(st, exitPose(exit, EXIT_EASE(clamp((lt - out - sl.i * xs) / xd)), sl.i, size));
        pose(sl.el, st.X, st.Y, st.Sc, st.R, st.B, st.Op);
      }
    }
    return { el, update, size, dur: mAt + md + .2 - at, cues: () => (o.cue === false ? [] : [{ kind: 'glitch', t: mAt, gain: .35 }, { kind: 'pop', t: mAt + md * .55, gain: .5 }].concat(enterA === 'pop' ? [{ kind: 'pop', t: at, gain: .5 }] : [])) };
  };

  /* ================================================================== 5. letterSwap */
  let RID = 0;
  const ringSlot = (box, D, o) => {
    const id = 'ktr' + (RID++), c = o.ringColor || 'var(--k-accent)';
    const txt = String(o.ringText || 'LOADING · LOADING · LOADING · ').toUpperCase();
    const ext = 1.36, Wp = D * ext;
    box.innerHTML = `<svg viewBox="-68 -68 136 136" width="${Wp.toFixed(1)}" height="${Wp.toFixed(1)}" style="position:absolute;left:${(-(Wp - D) / 2).toFixed(1)}px;top:${(-(Wp - D) / 2).toFixed(1)}px;overflow:visible">
<defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb, ${c} 40%, white)"/><stop offset=".5" style="stop-color:${c}"/><stop offset="1" style="stop-color:color-mix(in srgb, ${c} 62%, black)"/></linearGradient>
<radialGradient id="${id}h" cx=".32" cy=".26" r=".62"><stop offset="0" style="stop-color:#fff;stop-opacity:.9"/><stop offset=".55" style="stop-color:#fff;stop-opacity:0"/></radialGradient>
<path id="${id}p" d="M0,-59 A59,59 0 1,1 0,59 A59,59 0 1,1 0,-59"/></defs>
<g class="tor"><circle r="34" fill="none" stroke="url(#${id}g)" stroke-width="31"/>
<g class="gap"><circle r="34" fill="none" stroke="#fff" stroke-opacity=".62" stroke-width="31" stroke-dasharray="44 170"/></g>
<circle r="34" fill="none" stroke="url(#${id}h)" stroke-width="31"/></g>
<g class="txt"><text style="font-family:var(--k-mono);font-size:8.6px;font-weight:500;letter-spacing:1.5px;fill:${c}"><textPath href="#${id}p" textLength="368" lengthAdjust="spacing">${txt}</textPath></text></g></svg>`;
    const gap = box.querySelector('.gap'), tx = box.querySelector('.txt'), tor = box.querySelector('.tor');
    let rv = null;
    if (o.reveal) { const r = D * .19; rv = K.div(box, `left:${(D / 2 - r).toFixed(1)}px;top:${(D / 2 - r).toFixed(1)}px;width:${(2 * r).toFixed(1)}px;height:${(2 * r).toFixed(1)}px;border-radius:50%;background:${o.reveal};background-size:cover;background-position:center`); box.insertBefore(rv, box.firstChild); }
    return { hole: 18.5 / 100, update(lt, spin, z) {
      gap.setAttribute('transform', `rotate(${(lt * (o.gapSpin ?? 300) + spin * 3).toFixed(2)})`); tx.setAttribute('transform', `rotate(${(lt * (o.spin ?? 50) + spin).toFixed(2)})`);
      tor.style.filter = z > 0 ? 'none' : `drop-shadow(0 6px 7px color-mix(in srgb, ${c} 38%, transparent))`;   // a scaled shadow would tint the hole
      if (rv) { const q = o.revealAlways ? 1 : clamp(z * 4); rv.style.opacity = q.toFixed(3); rv.style.transform = `scale(${(.6 + .4 * q).toFixed(4)})`; }
    } };
  };
  K.kit.letterSwap = (parent, o = {}) => {
    const text = String(o.text ?? 'Nothing'), chars = [...text];
    let idx = o.index ?? chars.findIndex((c) => /[oO0]/.test(c)); if (idx < 0) idx = 0;
    const at = o.at ?? 0, align = o.align || 'center', valign = o.valign || 'center', face = o.font || 'display';
    const maxW = o.maxWidth ?? defMaxW();
    const el = K.div(parent, o.z != null ? `z-index:${o.z}` : ''); el.className = 'kt';
    const base = faceCss(face, { weight: o.weight ?? 900, tracking: o.tracking ?? -.045 });
    const m = metrics(face), Dk = o.slotSize ?? m.cap * 1.06, sk = o.slotPad ?? .035;
    let size = o.size;
    if (size == null) {                       // fit: text width − replaced letter + slot width
      const f0 = fitSize(el, text, base, 1000, 1e4), f1 = fitSize(el, chars[idx], base, 1000, 1e4);
      const wEm = 1000 / f0 - 1000 / f1 + Dk + 2 * sk + (o.ringText === false || o.slot && o.slot !== 'ring' ? 0 : Dk * .3);
      size = Math.max(8, Math.min(o.maxSize ?? defSize(tall() ? .3 : .26), Math.floor(maxW / wEm)));
    }
    const LH = size * .95;
    el.style.cssText += `;${base};font-size:${size}px;color:${o.color || 'var(--k-fg)'}`;
    const x = o.x ?? defX(align, maxW), y = o.y ?? defY();
    place(el, x, y, maxW, LH, align, valign);
    const zw = K.div(el, 'left:0;top:0;width:100%;height:100%;transform-origin:0 0');
    const line = K.div(zw, `width:${maxW}px;height:${LH}px;line-height:${LH}px;text-align:${align}`); line.className = 'kt-ln';
    const D = Dk * size, sb = sk * size;
    const L = chars.map((ch, i) => {
      const s = K.el('span', '', line); s.className = 'kt-i';
      if (i !== idx) { s.textContent = ch; return { el: s, i }; }
      s.textContent = '​'; s.style.width = (D + 2 * sb).toFixed(1) + 'px';
      const box = K.div(s, `left:${sb.toFixed(1)}px;top:${(-D / 2 + (o.slotDy ?? 0) * size).toFixed(1)}px;width:${D.toFixed(1)}px;height:${D.toFixed(1)}px;transform-origin:50% 50%`);
      return { el: s, i, box };
    });
    const sl = L[idx];
    let api = null, hole = .5, pslot = null;
    const slot = o.slot ?? 'ring';
    if (slot === 'ring') { api = ringSlot(sl.box, D, o); hole = api.hole; }
    else if (typeof slot === 'function') api = slot(sl.box, D) || null;
    else if (slot && slot.img) {
      sl.box.style.cssText += `;border-radius:${slot.radius ?? '50%'};overflow:hidden;background:${slot.bg || 'transparent'}`;
      if (slot.css) K.img(sl.box, slot.img, `left:0;top:0;width:100%;height:100%;object-fit:${slot.fit || 'cover'};object-position:${slot.position || '50% 50%'};${slot.css}`);
      else pslot = photo(sl.box, slot.img, D, D, { fit: slot.fit || 'cover', pos: slot.position, crop: slot.crop });   // canvas: seek-order safe
      hole = slot.hole ?? .5;
    }
    const cx = line.offsetLeft + sl.el.offsetLeft + sb + D / 2, cy = LH / 2 + (o.slotDy ?? 0) * size;
    const zAt = o.zoomAt, zd = o.zoomDur ?? .55;
    const zMax = o.zoomTo ?? (Math.hypot(K.W, K.H) / 2 * 1.12) / Math.max(1, hole * D);
    const out = o.out, exit = o.exit || 'up', xd = o.exitDur ?? .3;
    const tEnd = zAt != null ? zAt + zd : out == null ? Infinity : exit === 'cut' ? out : out + xd + .02 * chars.length;
    const stg = o.stagger ?? .035, tSlot = at + (o.slotDelay ?? idx * stg + .1);
    const st = {};
    function update(lt) {
      if (lt < at || lt >= tEnd) { show(el, false); return; }
      show(el, true);
      for (const l of L) {
        const t0 = l.box ? tSlot : at + l.i * stg, dt = lt - t0;
        st.X = 0; st.Y = 0; st.Sc = 1; st.R = 0; st.B = 0; st.Op = 1;
        if (l.box) {
          const q = K.pop(dt, 0, .55); st.Sc = Math.max(0, q); st.R = -110 * (1 - Math.min(1, E.soft(clamp(dt / .6)))) + (o.slotSpin || 0) * Math.max(0, dt); st.Op = clamp(dt / .04);
          show(l.el, dt >= 0);
        } else if (o.enter !== 'none') {
          const q = E.snappy(clamp(dt / .32)); st.Y = (1 - q) * .2 * size; st.Sc = 1 + .16 * (1 - q); st.B = (1 - q) * .1 * size; st.Op = clamp(dt / .07);
          show(l.el, dt >= 0);
        }
        if (out != null && zAt == null && lt >= out + l.i * .02) addExit(st, exitPose(exit, EXIT_EASE(clamp((lt - out - l.i * .02) / xd)), l.i, size));
        pose(l.box || l.el, st.X, st.Y, st.Sc, st.R, st.B, st.Op);
      }
      let spin = 0, zp = 0;
      if (zAt != null && lt >= zAt) {
        zp = P(lt, zAt, zAt + zd);
        zw.style.transform = K.about(cx, cy, K.zoom(lt, zAt, zAt + zd, 1, zMax, E.in(3)));
        spin = 140 * E.in(2)(zp);
      } else zw.style.transform = '';
      if (api && api.update) api.update(lt, spin, zp);
      if (pslot) pslot.draw(1);
    }
    return { el, update, prepare: pslot ? () => pslot.prepare() : undefined, size, slot: sl.box, center: { x: parseFloat(el.style.left) + cx, y: parseFloat(el.style.top) + cy }, dur: (tSlot - at) + .55,
      cues: () => (o.cue === false ? [] : [{ kind: 'pop', t: at, gain: .5 }, { kind: 'popxl', t: tSlot, gain: .8 }].concat(zAt != null ? [{ kind: 'zoom', t: zAt + zd, gain: .9 }] : [])) };
  };

  /* ================================================================== 6. typeOn */
  K.kit.typeOn = (parent, o = {}) => {
    const mode = o.mode || 'pop', at = o.at ?? 0;
    const chars = [...(o.upper ? String(o.text ?? '').toUpperCase() : String(o.text ?? ''))];
    const face = o.font || 'display', align = o.align || 'center', valign = o.valign || 'center';
    const maxW = o.maxWidth ?? defMaxW();
    const el = K.div(parent, o.z != null ? `z-index:${o.z}` : ''); el.className = 'kt';
    const base = faceCss(face, { weight: o.weight ?? (mode === 'pop' ? 900 : 600), tracking: o.tracking ?? (mode === 'pop' ? -.045 : -.025) });
    const size = o.size ?? (mode === 'pop' ? fitSize(el, chars.join(''), base, maxW, o.maxSize ?? defSize(tall() ? .3 : .26)) : Math.min(defSize(.075), fitSize(el, chars.join(''), base, maxW, 999)));
    const LH = size * (o.lineHeight ?? .95);
    el.style.cssText += `;${base};font-size:${size}px;color:${o.color || 'var(--k-fg)'}`;
    const x = o.x ?? defX(align, maxW), y = o.y ?? defY();
    place(el, x, y, maxW, LH, align, valign);
    const line = K.div(el, `width:${maxW}px;height:${LH}px;line-height:${LH}px;text-align:${align}`); line.className = 'kt-ln';
    const L = chars.map((ch) => { const s = K.el('span', ch === ' ' ? `padding-right:${o.wordSpace ?? .07}em` : '', line); s.className = 'kt-i'; s.textContent = ch; return { el: s, ch }; });
    L.forEach((l) => { l.x = l.el.offsetLeft; l.w = l.el.offsetWidth; });
    L.forEach((l, i) => { l.adv = i + 1 < L.length ? L[i + 1].x - l.x : l.w; });
    const x0 = L.length ? L[0].x : 0, W = L.reduce((a, l) => a + l.adv, 0);
    const cps = o.cps ?? (mode === 'pop' ? 7 : 16);
    let T;
    if (o.times) T = chars.map((c, i) => o.times[i] ?? (o.times[o.times.length - 1] + (i - o.times.length + 1) / cps));
    else if (o.beats) T = chars.map((c, i) => at + (o.beats[i] ?? (o.beats[o.beats.length - 1] + (i - o.beats.length + 1) / 2)) * K.spb());
    else if (o.cadence) T = K.cadence(chars.join(''), at, at + (o.cadence === true ? chars.length / cps : o.cadence), o.seed ?? 4242);
    else T = chars.map((c, i) => at + i / cps);
    T = T.map((t) => K.TQ(t));
    const tDone = T.length ? T[T.length - 1] : at;
    const grow = o.grow ?? align !== 'left';
    const caret = o.caret ?? mode === 'type';
    const ch = metrics(face).cap * 1.28 * size;
    const cEl = caret ? K.div(line, `left:0;top:${(LH / 2 - ch / 2).toFixed(1)}px;width:${Math.max(3, size * .07).toFixed(1)}px;height:${ch.toFixed(1)}px;border-radius:${(size * .02).toFixed(1)}px;background:${o.caretColor || 'var(--k-accent)'}`) : null;
    const out = o.out, exit = o.exit || (mode === 'type' ? 'delete' : 'up'), xd = o.exitDur ?? .3;
    const dcps = o.deleteCps ?? cps * 1.8, cFrom = o.caretFrom ?? at, hz = o.blink ?? 1.7;
    const tEnd = out == null ? Infinity : exit === 'cut' ? out : exit === 'delete' ? out + chars.length / dcps + .3 : out + xd + .02 * chars.length;
    const gd = mode === 'pop' ? .28 : .16;
    const st = {};
    function update(lt) {
      const tq = K.TQ(lt);
      if (lt < Math.min(cFrom, at) - 1e-6 || lt >= tEnd) { show(el, false); return; }
      show(el, true);
      let keep = L.length;
      if (out != null && exit === 'delete' && lt >= out) keep = Math.max(0, L.length - Math.floor((tq - K.TQ(out)) * dcps + 1e-6));
      let pw = 0, pc = 0;
      L.forEach((l, i) => {
        const dt = lt - T[i], vis = tq >= T[i] - 1e-6 && i < keep;
        show(l.el, vis);
        if (!vis) return;
        pw += l.adv * E.snappy(clamp(dt / gd)); pc += l.adv;
        st.X = 0; st.Y = 0; st.Sc = 1; st.R = 0; st.B = 0; st.Op = 1;
        if (mode === 'pop') { const q = K.pop(dt, 0, .45); st.Sc = 1 + .5 * (1 - q); st.B = (1 - clamp(dt / .12)) * .1 * size; st.Op = clamp(dt / .035); st.Y = -(1 - E.snappy(clamp(dt / .3))) * .08 * size; }
        else st.Sc = 1 + .14 * (1 - E.snappy(clamp(dt / .1)));
        if (out != null && exit !== 'delete' && lt >= out + i * .02) addExit(st, exitPose(exit, EXIT_EASE(clamp((lt - out - i * .02) / xd)), i, size));
        pose(l.el, st.X, st.Y, st.Sc, st.R, st.B, st.Op);
      });
      const sx = grow ? (W - pw) * (align === 'center' ? .5 : align === 'right' ? 1 : 0) : 0;
      line.style.transform = sx ? `translate(${sx.toFixed(2)}px,0)` : '';
      if (cEl) {
        const deleting = out != null && exit === 'delete' && lt >= out && keep > 0;
        const on = lt < T[0] ? K.caretOn(lt, cFrom, hz) : (lt < tDone + .05 || deleting) ? 1 : K.caretOn(lt, tDone + .05, hz);
        cEl.style.opacity = on ? '' : '0';
        cEl.style.transform = `translate(${(x0 + pc + size * .04).toFixed(2)}px,0)`;
      }
    }
    return { el, update, size, times: T, dur: tDone - at + .45,
      cues: () => (o.cue === false ? [] : T.map((t, i) => (chars[i] === ' ' ? null : { kind: mode === 'pop' ? 'pop' : 'key', t, gain: mode === 'pop' ? .7 : .45 })).filter(Boolean)) };
  };

  /* ================================================================== 7. stickerWords */
  K.kit.stickerWords = (parent, o = {}) => {
    const lines = (o.lines || String(o.text ?? '').split('\n')).map((l) => (typeof l === 'string' ? { text: l } : l));
    const at = o.at ?? 0, step = o.step ?? .2, face = o.font || 'wide', upper = o.upper ?? true;
    const pal = o.colors || [{ bg: 'var(--k-accent)', fg: '#fff' }, { bg: 'var(--k-fg)', fg: 'var(--k-bg)' }, { bg: 'var(--k-accent2)', fg: 'var(--k-fg)' }, { bg: 'var(--k-accent3)', fg: '#fff' }];
    const rots = o.rot || [-4, 3, -2.2, 2.6, -3];
    const maxW = o.maxWidth ?? (tall() ? K.W - 2 * K.safe().right : Math.round(K.W * .6));
    const el = K.div(parent, o.z != null ? `z-index:${o.z}` : ''); el.className = 'kt';
    const base = faceCss(face, { weight: o.weight ?? 900, tracking: o.tracking ?? -.015 });
    const widest = lines.reduce((a, l) => (l.text.length > a.length ? l.text : a), '');
    const size = o.size ?? fitSize(el, (upper ? widest.toUpperCase() : widest) + 'M', base, maxW, o.maxSize ?? defSize(.21));
    el.style.cssText += `;${base};font-size:${size}px`;
    // box = cap height + padY above and below, the caps optically centred (Archivo's em box is not centred on its caps);
    // lowercase lines (upper:false) get room for descenders
    const mt = metrics(face), padX = (o.padX ?? .2) * size, padY = o.padY ?? .16;
    const padT = (o.padTop ?? padY) * size, padB = (o.padBottom ?? padY) * size + (upper ? 0 : mt.desc * .85 * size);
    const capH = mt.cap * size, Lb = capH + padT + padB, dy = padT + capH - (Lb + (mt.asc - mt.desc) * size) / 2;
    const clr = (o.clearance ?? .1) * size, so = (o.shadowOffset ?? .06) * size, sc = o.shadowColor || 'rgba(12,12,14,.92)';
    const x = o.x ?? K.W / 2, y = o.y ?? defY();
    const B = lines.map((l, i) => {
      const p = pal[i % pal.length];
      const b = K.div(el, `left:0;top:0;height:${Lb.toFixed(1)}px;padding:0 ${padX.toFixed(1)}px;line-height:${Lb.toFixed(1)}px;white-space:pre;border-radius:${(size * .05).toFixed(1)}px;` +
        `background:${l.bg || p.bg};color:${l.color || p.fg};transform-origin:50% 55%`);
      K.el('span', `position:relative;top:${dy.toFixed(2)}px`, b, '').textContent = upper ? l.text.toUpperCase() : l.text;
      return { el: b, w: b.offsetWidth, h: Lb, r: l.r ?? rots[i % rots.length], dir: i % 2 ? 1 : -1, t: at + i * step, i, db: K.dirBlur() };
    });
    // stack: each box tucks up under the one above as far as it can without covering that line's letters (rotations
    // included) — the overlap is in the padding, never on the text
    const yAt = (b, px, py) => b.y + .55 * b.h + (px - b.w / 2) * Math.sin(b.r * Math.PI / 180) + (py - .55 * b.h) * Math.cos(b.r * Math.PI / 180);
    let top = 0, bot = 0;
    B.forEach((b, i) => {
      b.x = x - b.w / 2 + (o.jitter ?? .12) * size * (i % 2 ? 1 : -1) * (i === 0 ? .5 : 1);
      if (!i) { b.y = 0; top = 0; bot = b.h; return; }
      const a = B[i - 1], base = padT + capH + (upper ? 0 : mt.desc * .8 * size);
      let x0 = Math.max(a.x + padX, b.x), x1 = Math.min(a.x + a.w - padX, b.x + b.w);
      if (x0 > x1) { x0 = a.x + padX; x1 = a.x + a.w - padX; }
      b.y = -Infinity;
      for (const gx of [x0, x1]) {
        const need = yAt(a, gx - a.x, base) + clr;               // lowest text point of the line above at gx
        b.y = Math.max(b.y, need - (yAt({ ...b, y: 0 }, gx - b.x, 0)));
      }
      top = Math.min(top, b.y); bot = Math.max(bot, b.y + b.h);
    });
    const off = y - (top + bot) / 2;
    B.forEach((b) => { b.y += off; b.el.style.left = b.x.toFixed(1) + 'px'; b.el.style.top = b.y.toFixed(1) + 'px'; });
    const out = o.out, exit = o.exit || 'pop', xd = o.exitDur ?? .26;
    const tEnd = out == null ? Infinity : exit === 'cut' ? out : out + xd + .06 * (B.length - 1);
    const shake = o.shake ?? true, amp = .035 * size;
    function update(lt) {
      if (lt < at || lt >= tEnd) { show(el, false); return; }
      show(el, true);
      let sx = 0, sy = 0;
      for (const b of B) {
        const dt = lt - b.t;
        if (dt < 0) { show(b.el, false); continue; }
        show(b.el, true);
        if (shake) { sx += K.settleShake(lt, b.t + .1, amp, 9, 11); sy += K.settleShake(lt, b.t + .1, amp * .8, 11, 11); }
        const q = K.pop(dt, 0, .45), qs = E.snappy(clamp(dt / .26));
        let X = b.dir * (1 - qs) * .9 * size, Y = 0, Sc = 1 + .32 * (1 - q), R = b.r + b.dir * 12 * (1 - qs), Op = clamp(dt / .04);
        let bx = (1 - qs) * .22 * size;
        if (out != null && lt >= out + (B.length - 1 - b.i) * .06) {
          const e = EXIT_EASE(clamp((lt - out - (B.length - 1 - b.i) * .06) / xd));
          if (exit === 'pop') { Sc *= 1 - e; R += b.dir * 18 * e; Op *= 1 - clamp(e * 2 - 1); }
          else { const d = exitPose(exit, e, b.i, size); if (d) { X += d.x || 0; Y += d.y || 0; R += d.r || 0; Sc *= d.s || 1; Op *= d.op ?? 1; bx += d.b || 0; } }
        }
        pose(b.el, X, Y, Sc, R, null, Op);
        b.db(b.el, bx, 0);
        const sh = so * clamp(q);
        b.el.style.boxShadow = sh > .5 && o.shadow !== false ? `${sh.toFixed(1)}px ${sh.toFixed(1)}px 0 ${sc}` : '';
      }
      sx = Math.round(sx); sy = Math.round(sy);          // whole px: rotated text at sub-px offsets rasters differently by seek history
      el.style.transform = sx || sy ? `translate(${sx}px,${sy}px)` : '';
    }
    return { el, update, size, dur: (B.length - 1) * step + .45, cues: () => (o.cue === false ? [] : B.map((b) => ({ kind: 'hit', t: b.t + .05, gain: .55 + .15 * (b.i === B.length - 1) }))) };
  };

  /* ================================================================== 8. captions */
  K.kit.captions = (parent, o = {}) => {
    const style = o.style || 'karaoke', off = o.at ?? 0;
    const W = (o.words || o.transcript || []).map((w) => ({ text: String(w.text ?? w.word ?? ''), start: (+w.start) + off, end: (+(w.end ?? w.start + .3)) + off }));
    const bold = style === 'bold';
    const maxWords = o.maxWords ?? (bold ? 3 : 4), maxChars = o.maxChars ?? (bold ? 18 : 24);
    const size = o.size ?? defSize(bold ? .085 : .068), face = o.font || 'display';
    const upper = o.upper ?? bold;
    const maxW = o.maxWidth ?? defMaxW();
    const LH = (o.lineHeight ?? 1.05) * size;
    const color = o.color || '#fff', hi = o.highlight || (bold ? '#fff' : 'var(--k-accent2)');
    const boxColor = o.boxColor || 'var(--k-accent)';
    const x = o.x ?? K.W / 2, y = o.y ?? Math.round(K.H * (tall() ? .62 : .8));
    const el = K.div(parent, faceCss(face, { weight: o.weight ?? (bold ? 900 : 800), tracking: o.tracking ?? (bold ? -.03 : -.035) }) +
      `;font-size:${size}px;color:${color};word-spacing:${o.wordSpace ?? WS[face] ?? .1}em` + (o.z != null ? `;z-index:${o.z}` : ''));
    el.className = 'kt';
    const shadow = o.shadow ?? '0 .04em .28em rgba(0,0,0,.5)';
    if (shadow) el.style.textShadow = shadow;
    if (o.stroke) { el.style.webkitTextStroke = `${o.stroke}px ${o.strokeColor || '#000'}`; el.style.paintOrder = 'stroke fill'; }
    const C = []; let cur = null;
    W.forEach((w, i) => {
      const prev = W[i - 1];
      const brk = !cur || cur.words.length >= maxWords || cur.chars + w.text.length + 1 > maxChars || (prev && /[.?!,;:]$/.test(prev.text)) || (prev && w.start - prev.end > (o.gap ?? .6));
      if (brk) { cur = { words: [], chars: 0 }; C.push(cur); }
      cur.words.push(w); cur.chars += w.text.length + 1;
    });
    const hold = o.hold ?? .4;
    for (const c of C) c.start = c.words[0].start;
    C.forEach((c, k) => {
      const last = c.words[c.words.length - 1].end, nx = C[k + 1];
      c.end = nx ? Math.min(nx.start, last + hold) : last + hold;
      c.cont = !!nx && nx.start <= c.end + 1e-6;
      c.el = K.div(el, 'left:0;top:0'); c.el.className = 'kt';
      const ctx = { size, face, color, em: 'accent', boxColor, boxText: '#fff', upper, split: false };
      const items = c.words.map((w) => { const it = textItem(c.el, w.text, { face, color, box: false, stroke: false }, ctx); it.para = 0; it.w0 = w; return it; });
      if (bold) { c.box = K.div(c.el, `left:0;top:0;border-radius:${(size * .12).toFixed(1)}px;background:${boxColor};z-index:0;transform-origin:50% 50%`); c.el.insertBefore(c.box, c.el.firstChild); }
      c.lines = flow(c.el, items, { maxW, LH, align: 'center' });
      c.items = items; c.h = c.lines.length * LH;
      place(c.el, x, y, maxW, c.h, 'center', 'center');
      c.el.style.transformOrigin = '50% 50%';
      if (bold) for (const it of items) { const ln = c.lines[it.line]; it.bx = it.x - size * .14; it.bw = it.w + size * .24; it.by = ln.top + LH / 2 - size * .5; it.bh = size; }
    });
    function update(lt) {
      let any = false;
      for (const c of C) {
        const vis = lt >= c.start - 1e-6 && lt < c.end;
        show(c.el, vis);
        if (!vis) continue;
        any = true;
        const dt = lt - c.start, q = E.snappy(clamp(dt / .2));
        const xe = !c.cont && c.end - lt < .12 ? 1 - clamp((c.end - lt) / .12) : 0;
        if (style === 'pop') pose(c.el, 0, xe * .2 * size, 1, 0, xe * .1 * size, 1 - xe);
        else pose(c.el, 0, (1 - q) * .14 * size + xe * .2 * size, 1.06 - .06 * q, 0, (1 - q) * .06 * size + xe * .1 * size, clamp(dt / .05) * (1 - xe));
        let a = -1; c.items.forEach((it, i) => { if (lt >= it.w0.start - 1e-6) a = i; });
        c.items.forEach((it, i) => {
          const w = it.w0, s = it.el.style;
          if (style === 'pop') {
            const d = lt - w.start;
            if (d < 0) { show(it.el, false); return; }
            show(it.el, true);
            const qp = K.pop(d, 0, .35);
            pose(it.el, 0, (1 - E.snappy(clamp(d / .2))) * .15 * size, .55 + .45 * qp, 0, (1 - clamp(d / .1)) * .06 * size, clamp(d / .04));
            s.color = i === a && o.highlightActive !== false ? hi : '';
          } else if (style === 'karaoke') {
            const on = i === a, qa = E.snappy(clamp((lt - w.start) / .1));
            s.color = on ? hi : '';
            s.opacity = i > a ? String(o.dim ?? .5) : '';
            s.transform = on ? `scale(${(1 + (o.activeScale ?? .06) * qa).toFixed(4)})` : '';
          } else {
            const on = i === a;
            s.color = on ? hi : '';
            s.transform = on ? `scale(${(1 + .06 * (1 - E.snappy(clamp((lt - w.start) / .14)))).toFixed(4)})` : '';
          }
        });
        if (c.box) {
          if (a < 0) show(c.box, false);
          else {
            show(c.box, true);
            const it = c.items[a], pv = c.items[Math.max(0, a - 1)], k = a === 0 ? 1 : E.snappy(clamp((lt - it.w0.start) / .12));
            const pop = a === 0 ? K.pop(lt - it.w0.start, 0, .3) : 1;
            c.box.style.left = lerp(pv.bx, it.bx, k).toFixed(1) + 'px'; c.box.style.top = lerp(pv.by, it.by, k).toFixed(1) + 'px';
            c.box.style.width = lerp(pv.bw, it.bw, k).toFixed(1) + 'px'; c.box.style.height = it.bh.toFixed(1) + 'px';
            c.box.style.transform = `rotate(${(o.boxRot ?? -2).toFixed(2)}deg) scale(${pop.toFixed(4)})`;
          }
        }
      }
      show(el, any);
    }
    const last = C.length ? C[C.length - 1].end : off;
    return { el, update, chunks: C, dur: last - off, cues: () => (o.cue ? W.map((w) => ({ kind: o.cue === true ? 'tick' : o.cue, t: w.start, gain: .25 })) : []) };
  };

  /* ================================================================== 9. counter */
  K.kit.counter = (parent, o = {}) => {
    const from = +(o.from ?? 0), to = +(o.to ?? 100), at = o.at ?? 0, delay = o.delay ?? .12, dur = o.dur ?? 1.2;
    const ease = typeof o.ease === 'function' ? o.ease : E[o.ease || 'smooth'] || E.smooth;
    const dec = o.decimals ?? 0, sep = o.sep ?? ',', dp = o.dec ?? '.';
    const align = o.align || 'center', valign = o.valign || 'center', face = o.font || 'display';
    const size = o.size ?? defSize(tall() ? .3 : .26);
    const LH = size * (o.lineHeight ?? .95);
    const color = o.color || 'var(--k-fg)';
    const el = K.div(parent, faceCss(face, { weight: o.weight ?? 900, tracking: o.tracking ?? -.04 }) + `;font-size:${size}px;color:${color};font-variant-numeric:tabular-nums` + (o.z != null ? `;z-index:${o.z}` : ''));
    el.className = 'kt';
    const maxW = o.maxWidth ?? K.W;
    const x = o.x ?? defX(align, maxW), y = o.y ?? defY();
    place(el, x, y, maxW, LH, align, valign);
    const line = K.div(el, `width:${maxW}px;height:${LH.toFixed(1)}px;line-height:${LH.toFixed(1)}px;text-align:${align};transform-origin:50% 50%`); line.className = 'kt-ln';
    const zm = K.el('span', '', line, '0'); const cellW = zm.offsetWidth; zm.remove();
    const intD = Math.max(o.minDigits ?? 1, String(Math.floor(Math.max(Math.abs(from), Math.abs(to)))).length);
    const winH = Math.round(size * 1.12);           // whole px: a digit at rest sits on the pixel grid (sub-px raster differs by seek history)
    const mkText = (txt, scale, gap) => { if (!txt) return null; const s = K.el('span', (scale && scale !== 1 ? `font-size:${scale}em;` : '') + gap, line); s.className = 'kt-i'; s.textContent = txt; return s; };
    mkText(o.prefix, o.prefixScale, `margin-right:${(size * (o.prefixGap ?? .02)).toFixed(1)}px`);
    const cols = [], seps = [];
    const N = intD + dec;
    for (let c = N - 1; c >= 0; c--) {                   // c = power of ten in the scaled integer (0 = rightmost)
      const ki = c - dec;                                  // integer column index (≥0) or decimal (<0)
      if (c === dec - 1 && dec > 0) { const s = K.el('span', '', line); s.className = 'kt-i'; s.textContent = dp; seps.push({ el: s, k: -1, w: 0 }); }
      const col = K.el('span', `width:${cellW}px`, line, '​'); col.className = 'kt-i';
      const win = K.div(col, `left:0;top:${(-winH / 2).toFixed(1)}px;width:${cellW}px;height:${winH.toFixed(1)}px;overflow:hidden;` +
        `-webkit-mask-image:linear-gradient(transparent,#000 17%,#000 83%,transparent);mask-image:linear-gradient(transparent,#000 17%,#000 83%,transparent)`);
      const strip = K.div(win, `left:0;top:0;width:${cellW}px;line-height:${winH.toFixed(1)}px;text-align:center;white-space:pre`);
      strip.textContent = '0\n1\n2\n3\n4\n5\n6\n7\n8\n9\n0';
      cols.push({ el: col, strip, c, ki, db: K.dirBlur(), f: 1 });
      if (ki > 0 && ki % 3 === 0 && sep) { const s = K.el('span', '', line); s.className = 'kt-i'; s.textContent = sep; seps.push({ el: s, k: ki, w: s.offsetWidth, col: cols[cols.length - 1] }); }
    }
    mkText(o.suffix, o.suffixScale, `margin-left:${(size * (o.suffixGap ?? .04)).toFixed(1)}px`);
    const pw = 10 ** dec;
    const val = (lt) => from + (to - from) * ease(P(lt, at + delay, at + delay + dur));
    const scaled = (v) => Math.round(Math.abs(v) * pw * 1e6) / 1e6;
    const posOf = (V, c, mech) => {                        // unwrapped column position (in digits)
      const p = 10 ** c;
      if (!mech || c === 0) return V / p;
      const lower = V % p, carry = clamp(lower - (p - 1));
      return Math.floor(V / p) + carry;
    };
    const mech = (o.roll || 'mech') === 'mech', tLand = at + delay + dur, hk = .5 / K.fps;
    const out = o.out, xd = o.exitDur ?? .3;
    const st = {};
    function update(lt) {
      if (lt < at || (out != null && lt >= out + xd)) { show(el, false); return; }
      show(el, true);
      const v = val(lt), V = scaled(v), V1 = scaled(val(lt + hk)), V0 = scaled(val(lt - hk)), iv = Math.abs(v);
      for (const col of cols) {
        const pos = posOf(V, col.c, mech), wrap = ((pos % 10) + 10) % 10;
        col.strip.style.transform = `translateY(${(-wrap * winH).toFixed(2)}px)`;
        const vel = Math.abs(posOf(V1, col.c, mech) - posOf(V0, col.c, mech)) / (2 * hk);   // digits / s
        col.db(col.strip, 0, o.blur === false ? 0 : Math.min(.1 * size, vel * winH / K.fps * .3));
        let f = 1;
        if (col.ki >= 1 && col.ki >= (o.minDigits ?? 1)) f = E.smooth(clamp(iv - (10 ** col.ki - 1)));
        col.el.style.width = (cellW * f).toFixed(2) + 'px';
        col.el.style.opacity = f < 1 ? f.toFixed(3) : '';
        col.f = f;
      }
      for (const s of seps) if (s.k > 0) { const f = s.col.f; s.el.style.width = (s.w * f).toFixed(2) + 'px'; s.el.style.opacity = f < 1 ? f.toFixed(3) : ''; }
      const dt = lt - at, q = E.snappy(clamp(dt / .3));
      st.Sc = 1 + .12 * (1 - q); st.Y = (1 - q) * .12 * size; st.B = (1 - q) * .08 * size; st.Op = clamp(dt / .06); st.X = 0; st.R = 0;
      const u = lt - tLand;
      if (o.land !== false && u > 0) st.Sc *= 1 + .08 * (1 - Math.exp(-u * 60)) * Math.exp(-u * 9) * Math.cos(u * 16);
      if (o.landColor) el.style.color = u >= 0 ? o.landColor : color;
      if (out != null && lt >= out) addExit(st, exitPose(o.exit || 'up', EXIT_EASE(clamp((lt - out) / xd)), 0, size));
      pose(line, st.X, st.Y, st.Sc, st.R, st.B, st.Op);
    }
    return {
      el, update, size, dur: delay + dur + .4,
      cues() {
        if (o.cue === false) return [];
        const c = [{ kind: 'pop', t: at, gain: .5 }]; let last = Math.floor(scaled(from)), t0 = -1;
        for (let t = at + delay; t <= tLand + 1e-6; t += 1 / K.fps) { const d = Math.floor(scaled(val(t))); if (d !== last && t - t0 >= .055) { c.push({ kind: 'tick', t: +t.toFixed(4), gain: .3 }); t0 = t; } last = d; }
        c.push({ kind: 'popxl', t: tLand, gain: .8 });
        return c;
      },
    };
  };

  /* ================================================================== 10. sliced */
  K.kit.sliced = (parent, o = {}) => {
    const at = o.at ?? 0, N = Math.max(2, o.slices ?? 6), sd = o.dur ?? .42, stg = o.stagger ?? .035;
    const face = o.font || 'display', align = o.align || 'center', valign = o.valign || 'center';
    const text = o.upper ? String(o.text ?? '').toUpperCase() : String(o.text ?? '');
    const maxW = o.maxWidth ?? (tall() ? K.W - 140 : Math.round(K.W * .8));
    const el = K.div(parent, o.z != null ? `z-index:${o.z}` : ''); el.className = 'kt';
    const base = faceCss(face, { weight: o.weight ?? 900, tracking: o.tracking ?? (face === 'wide' ? -.02 : -.03) });
    const size = o.size ?? fitSize(el, text, base, maxW, o.maxSize ?? defSize(tall() ? .3 : .28));
    const LH = size * .95, m = metrics(face);
    el.style.cssText += `;${base};font-size:${size}px;color:${o.color || 'var(--k-fg)'}`;
    const x = o.x ?? defX(align, maxW), y = o.y ?? defY();
    place(el, x, y, maxW, LH, align, valign);
    // glyph band in line coordinates: content centre at LH/2, baseline = centre + (asc − desc)/2
    const bl = LH / 2 + (m.asc - m.desc) / 2 * size, top = bl - m.cap * size - size * .03, bot = bl + size * .02;
    const SL = [];
    for (let i = 0; i < N; i++) {
      const s = K.div(el, `left:0;top:0;width:${maxW}px;height:${LH.toFixed(1)}px;line-height:${LH.toFixed(1)}px;text-align:${align};white-space:pre`);
      s.textContent = text;
      const a = i === 0 ? -LH : top + (bot - top) * i / N, b = i === N - 1 ? 2 * LH : top + (bot - top) * (i + 1) / N;
      s.style.clipPath = `inset(${a.toFixed(2)}px -${size}px ${(LH - b).toFixed(2)}px -${size}px)`;
      SL.push({ el: s, dir: i % 2 ? 1 : -1, t: at + i * stg, db: K.dirBlur(), i });
    }
    // at rest the word is drawn whole: abutting clip bands leave anti-aliased hairline seams across the glyphs
    const whole = K.div(el, `left:0;top:0;width:${maxW}px;height:${LH.toFixed(1)}px;line-height:${LH.toFixed(1)}px;text-align:${align};white-space:pre`);
    whole.textContent = text;
    const dist = o.dist ?? K.W * .75, out = o.out, xd = o.exitDur ?? .36;
    const tLock = at + (N - 1) * stg + sd;
    const tEnd = out == null ? Infinity : out + xd + (N - 1) * stg;
    const ease = o.ease || E.out(4);
    function update(lt) {
      if (lt < at || lt >= tEnd) { show(el, false); return; }
      show(el, true);
      let rest = true;
      for (const sl of SL) {
        const q = ease(clamp((lt - sl.t) / sd)), q1 = ease(clamp((lt + 1 / K.fps - sl.t) / sd));
        let X = sl.dir * dist * (1 - q), v = Math.abs(q1 - q) * dist;
        if (out != null && lt >= out + sl.i * stg) {
          const e = E.in(3)(clamp((lt - out - sl.i * stg) / xd)), e1 = E.in(3)(clamp((lt + 1 / K.fps - out - sl.i * stg) / xd));
          X += -sl.dir * dist * e; v += Math.abs(e1 - e) * dist;
        }
        sl.X = X; sl.v = v;
        if (lt < sl.t || Math.abs(X) > .05) rest = false;
      }
      show(whole, rest);
      for (const sl of SL) {
        show(sl.el, !rest && lt >= sl.t);
        if (rest) continue;
        sl.el.style.transform = `translate(${sl.X.toFixed(2)}px,0)`;
        sl.db(sl.el, o.blur === false ? 0 : Math.min(.35 * size, sl.v * .35), 0);
      }
      const u = lt - tLock;
      let Sc = u > 0 ? 1 + .045 * (1 - Math.exp(-u * 70)) * Math.exp(-u * 10) : 1;
      if (Sc - 1 < .002) Sc = 1;                         // the punch tail ends exactly at rest (see pose)
      el.style.transform = Sc !== 1 ? `scale(${Sc.toFixed(4)})` : '';
    }
    return { el, update, size, dur: tLock - at,
      cues: () => (o.cue === false ? [] : [{ kind: 'whoosh', t: at, gain: .6 }, { kind: 'hit', t: tLock, gain: .8 }].concat(out != null ? [{ kind: 'whoosh', t: out, gain: .5 }] : [])) };
  };

  K.kit._type = { FACE, faceCss, metrics, faceScale, fitSize };   // internals for other families (read-only use)
})();
