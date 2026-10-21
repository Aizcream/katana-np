/* kit/transitions.js — scene-to-scene transitions for Katana NP (K.trans.*).
   Every transition registers K.transition({type, at, a, b, before, after, apply}) and returns that def, extended with
     .cues()  → [{kind, t (ABSOLUTE film s), gain}]   suggested SFX — K.addCues(def) places them (t0 = 0)
     .dur     → before + after (s) · .end → at + after · .opts → the options it was built with
   Grammar: the speed peak sits on the cut (lt = 0); zoom direction never flips across a cut; content is carried,
   pushed, wiped or cut — never faded. Stylised motion blur (directional gaussian, radial zoom blur, strip blur) is
   drawn by SVG filters so motion reads in stills/drafts too; K.trans.blur scales all of it (e.g. .5 for --mb finals).
   Scenes should paint their own full-frame background (a full-bleed child): transitions overlap A and B.
   Common options: at (cut time, film s, required) · a, b (scene ids; either may be null) · dur (window, split by
   each transition into before/after) · before / after (override the split) · blur (multiplier) · cue (false = no
   SFX, or a kind string to replace the default kind) · sfx (true → K.addCues(def) right away).
   Docs: engine/kit/docs/transitions.md */
(function () {
  const K = window.K; if (!K) return;
  const { E, clamp, lerp } = K;
  const NS = 'http://www.w3.org/2000/svg';
  const T = K.trans;
  T.blur = 1;                                   // global multiplier for every stylised blur drawn by transitions

  /* ------------------------------------------------------------------ helpers */
  let uid = 0;
  const hide = (el) => { if (el) el.style.opacity = '0'; };
  const fmt = (v) => (Math.abs(v) < 1e-4 ? '0' : v.toFixed(3));
  const tr = (x, y) => `translate(${fmt(x)}px,${fmt(y)}px)`;
  // scale s about film point (px,py) for an element whose transform-origin is its centre (scene roots are)
  const about = (px, py, s) => (Math.abs(s - 1) < 1e-3 ? '' : `translate(${fmt((px - K.W / 2) * (1 - s))}px,${fmt((py - K.H / 2) * (1 - s))}px) scale(${s.toFixed(5)})`);   // near-identity → identity (stable text raster)
  const DIRS = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const dirv = (d) => DIRS[d] || DIRS.left;
  const filmFps = () => K.fps || 30;
  const css = (el, o) => { for (const k in o) el.style[k] = o[k]; };
  const joinF = (...f) => f.filter(Boolean).join(' ');

  // progress through a cut: E.in(k) from 0 to `mid` over [-b, 0], then a speed-matched E.out to 1 over [0, a].
  // Returns {p, v} (v = dp/dt, 1/s). The speed peak is exactly on the cut.
  function ramp(lt, b, a, mid = .5, k = 3) {
    if (lt <= -b) return { p: 0, v: 0 };
    if (lt < 0) { const u = (lt + b) / b; return { p: mid * u ** k, v: mid * k * u ** (k - 1) / b }; }
    const v0 = mid * k / b, k2 = Math.max(1.15, v0 * a / (1 - mid));
    if (lt >= a) return { p: 1, v: 0 };
    const u = lt / a; return { p: mid + (1 - mid) * (1 - (1 - u) ** k2), v: (1 - mid) * k2 * (1 - u) ** (k2 - 1) / a };
  }
  // damped spring from remaining distance D0 (progress units) with speed v0 toward the target; lands exactly on the
  // target at lt = a. Returns {p: 1 − remaining, v}.
  function springFrom(lt, D0, v0, a, w = 17, z = .62) {
    if (lt <= 0) return { p: 1 - D0, v: v0 };
    if (lt >= a) return { p: 1, v: 0 };
    const wd = w * Math.sqrt(1 - z * z), B = (z * w * D0 - v0) / wd;
    const rem = (x) => Math.exp(-z * w * x) * (D0 * Math.cos(wd * x) + B * Math.sin(wd * x)) * (1 - E.smooth(K.p(x, a * .72, a)));
    const h = 1e-3, r = rem(lt);
    return { p: 1 - r, v: -(rem(lt + h) - r) / h };
  }
  // speed (px/s) → gaussian sigma (px) of a stylised 180° shutter smear
  const sigma = (pxPerS, cap) => Math.min(cap, Math.abs(pxPerS) * (.5 / filmFps()) * .42) * T.blur;

  /* ---------------- SVG filters (one instance per transition × root, in K.svgDefs()) ---------------- */
  function svgFilter(inner, region) {
    const f = document.createElementNS(NS, 'filter'); f.id = 'ktr' + (uid++);
    const at = { filterUnits: 'userSpaceOnUse', primitiveUnits: 'userSpaceOnUse', 'color-interpolation-filters': 'sRGB' };
    for (const k in at) f.setAttribute(k, at[k]);
    setRegion(f, region || [-.25 * K.W, -.25 * K.H, 1.5 * K.W, 1.5 * K.H]);
    f.innerHTML = inner; K.svgDefs().appendChild(f); return f;
  }
  const setRegion = (f, [x, y, w, h]) => { f.setAttribute('x', x); f.setAttribute('y', y); f.setAttribute('width', w); f.setAttribute('height', h); };
  // alpha boost: a blurred full-frame root keeps opaque edges (never shows the film background at its borders)
  const BOOST = '<feComponentTransfer><feFuncA type="linear" slope="26" intercept="0"/></feComponentTransfer>';
  // clip: limit the result to the element's own box (3D faces: the boosted edge must not poke past a cube edge)
  // soft (3rd arg): NO alpha boost — the layer's edges fade like a real shutter smear. Two adjacent moving layers use
  // soft on the UPPER one and the boost on the lower one: the seam between them is then a smooth smear (the lower
  // layer's boosted edge fills under the upper one's fade) instead of a crisp line across blurred content.
  function dirBlur(clip) {
    const F = {};
    return (bx, by, soft) => {
      if (bx < .35 && by < .35) return '';
      const key = soft ? 's' : 'b';
      if (!F[key]) F[key] = svgFilter('<feGaussianBlur stdDeviation="0"/>' + (soft ? '' : BOOST), clip ? [0, 0, K.W, K.H] : null);
      F[key].firstChild.setAttribute('stdDeviation', `${bx.toFixed(2)} ${by.toFixed(2)}`);
      return `url(#${F[key].id})`;
    };
  }
  // stacking: is B painted above A? (scene roots carry their z in style.zIndex; B is normally the later scene)
  const zOf = (el) => +(el && el.style.zIndex) || 0;
  const bOnTop = (A, B) => !A || (!!B && zOf(B) >= zOf(A));
  // radial zoom blur about a film point: ZN copies at scales 1 … 1+amt (amt < 0: 1 … 1/(1+|amt|)) averaged. Copies
  // come from feDisplacementMap over a linear-ramp map (one data-URL image, centred on the frame) + feOffset (pivot).
  // Filters are created when the transition is DEFINED so the map is decoded long before the first frame.
  const RAMP = 'data:image/svg+xml;base64,' + btoa(`<svg xmlns="${NS}" width="256" height="256" viewBox="0 0 256 256" preserveAspectRatio="none"><defs>` +
    '<linearGradient id="x" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#f00"/></linearGradient>' +
    '<linearGradient id="y" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#000"/><stop offset="1" stop-color="#0f0"/></linearGradient></defs>' +
    '<rect width="256" height="256" fill="url(#x)"/><rect width="256" height="256" fill="url(#y)" style="mix-blend-mode:screen"/></svg>');
  try { K.preload(RAMP); } catch (e) { /* not fatal */ }
  const ZN = 8;
  function zoomBlur() {
    let h = `<feImage href="${RAMP}" preserveAspectRatio="none" result="map"/>`;
    for (let i = 0; i < ZN; i++) h += `<feDisplacementMap in="SourceGraphic" in2="map" scale="0" xChannelSelector="R" yChannelSelector="G"/><feOffset dx="0" dy="0" result="d${i}"/>`;
    let lvl = [...Array(ZN)].map((_, i) => 'd' + i), c = 0;
    while (lvl.length > 1) { const nx = []; for (let i = 0; i < lvl.length; i += 2) { const r = 'm' + (c++); h += `<feComposite in="${lvl[i]}" in2="${lvl[i + 1]}" operator="arithmetic" k2=".5" k3=".5" result="${r}"/>`; nx.push(r); } lvl = nx; }
    h += '<feGaussianBlur stdDeviation="0"/>' + BOOST;
    const f = svgFilter(h), img = f.querySelector('feImage'), dms = [...f.querySelectorAll('feDisplacementMap')], offs = [...f.querySelectorAll('feOffset')], gb = f.querySelector('feGaussianBlur');
    let sized = '';
    return (px, py, amt) => {
      amt *= T.blur;
      if (Math.abs(amt) < .006) return '';
      const L = 1.3 * Math.max(K.W, K.H), cx = K.W / 2, cy = K.H / 2;
      if (sized !== K.W + 'x' + K.H) {
        sized = K.W + 'x' + K.H; setRegion(f, [-.1 * K.W, -.1 * K.H, 1.2 * K.W, 1.2 * K.H]);
        img.setAttribute('x', cx - L / 2); img.setAttribute('y', cy - L / 2); img.setAttribute('width', L); img.setAttribute('height', L);
      }
      for (let i = 0; i < ZN; i++) {
        const q = i / (ZN - 1), m = amt > 0 ? 1 + amt * q : 1 / (1 + -amt * q), sc = -L * (1 - 1 / m);   // copy ×m about the frame centre…
        dms[i].setAttribute('scale', sc.toFixed(2));
        offs[i].setAttribute('dx', ((1 - m) * (px - cx)).toFixed(2));                                      // …moved to scale about the pivot
        offs[i].setAttribute('dy', ((1 - m) * (py - cy)).toFixed(2));
      }
      gb.setAttribute('stdDeviation', (Math.min(.6, Math.abs(amt)) * Math.min(K.W, K.H) * .012 + .4).toFixed(2));
      return `url(#${f.id})`;
    };
  }
  // per-strip displacement: n strips across, each shifted along its own length. Two stages of flood-coloured
  // subregions → feDisplacementMap (coarse 16 px steps, then fine 0.16 px), then a per-strip blur along the strip.
  // (offs[], sigma | sigmas[]) → css filter.
  function stripShift(n, vertical) {
    const SC = 4080, SF = 40;                           // SC = 510·8: the neutral 128 channel shifts content by 8.08 px
    const inst = {};                                    // one filter per edge mode (boosted / soft, see dirBlur)
    const api = (offs, sig, soft) => {
      const key = soft ? 's' : 'b', I = inst[key] || (inst[key] = { f: null, fc: [], ff: [], gb: null });
      let { f, gb } = I; const { fc, ff } = I;
      if (!f) {
        const w = K.W, h = K.H; let s = '';
        for (const tag of ['c', 'f']) {
          for (let i = 0; i < n; i++) {
            const e0 = i === 0 ? 80 : 0, e1 = i === n - 1 ? 80 : 0;
            const r = vertical ? [i * w / n - e0, -h, w / n + e0 + e1, 3 * h] : [-w, i * h / n - e0, 3 * w, h / n + e0 + e1];
            s += `<feFlood x="${r[0].toFixed(2)}" y="${r[1].toFixed(2)}" width="${r[2].toFixed(2)}" height="${r[3].toFixed(2)}" flood-color="rgb(128,128,0)" result="${tag}${i}"/>`;
          }
          s += `<feMerge result="${tag}m">` + [...Array(n)].map((_, i) => `<feMergeNode in="${tag}${i}"/>`).join('') + '</feMerge>';
        }
        s += `<feDisplacementMap in="SourceGraphic" in2="cm" scale="${SC}" xChannelSelector="R" yChannelSelector="G" result="d1"/>`;
        s += `<feDisplacementMap in="d1" in2="fm" scale="${SF}" xChannelSelector="R" yChannelSelector="G" result="d2"/>`;
        for (let i = 0; i < n; i++) {                   // per-strip blur: each strip smears with its own speed
          const e0 = i === 0 ? 80 : 0, e1 = i === n - 1 ? 80 : 0;
          const r = vertical ? [i * w / n - e0, -h, w / n + e0 + e1, 3 * h] : [-w, i * h / n - e0, 3 * w, h / n + e0 + e1];
          s += `<feGaussianBlur in="d2" x="${r[0].toFixed(2)}" y="${r[1].toFixed(2)}" width="${r[2].toFixed(2)}" height="${r[3].toFixed(2)}" stdDeviation="0" result="b${i}"/>`;
        }
        s += '<feMerge>' + [...Array(n)].map((_, i) => `<feMergeNode in="b${i}"/>`).join('') + '</feMerge>' + (soft ? '' : BOOST);
        f = I.f = svgFilter(s, [-40, -40, K.W + 80, K.H + 80]);
        const fl = [...f.querySelectorAll('feFlood')]; fc.push(...fl.slice(0, n)); ff.push(...fl.slice(n)); gb = I.gb = [...f.querySelectorAll('feGaussianBlur')];
      }
      for (let i = 0; i < n; i++) {
        const o = offs[i];                               // content moves +o along the strip
        const cc = clamp(Math.round((.5 - o / SC) * 255), 0, 255), oc = -SC * (cc / 255 - .5);
        const cf = clamp(Math.round((.5 - (o - oc) / SF) * 255), 0, 255);
        const col = (v) => (vertical ? `rgb(128,${v},0)` : `rgb(${v},128,0)`);
        fc[i].setAttribute('flood-color', col(cc)); ff[i].setAttribute('flood-color', col(cf));
      }
      for (let i = 0; i < n; i++) { const g = Array.isArray(sig) ? sig[i] : sig; gb[i].setAttribute('stdDeviation', vertical ? `0 ${g.toFixed(2)}` : `${g.toFixed(2)} 0`); }
      return `url(#${f.id})`;
    };
    api.cross = (SC + SF) * (128 / 255 - .5);           // cancel with a translate of +cross on the cross axis
    return api;
  }
  // VHS/digital glitch: blocky horizontal slice displacement (turbulence → discrete table) + RGB split
  function glitchFilter() {
    let f = null, turb, tabR, dm, oR, oB;
    return (fr, amp, rgb, seed) => {
      if (!f) {
        f = svgFilter('<feTurbulence type="fractalNoise" baseFrequency="0 0.02" numOctaves="1" seed="1" result="n"/>' +
          '<feComponentTransfer in="n" result="bands"><feFuncR type="discrete" tableValues=".5"/><feFuncG type="table" tableValues=".5 .5"/><feFuncA type="table" tableValues="1 1"/></feComponentTransfer>' +
          '<feDisplacementMap in="SourceGraphic" in2="bands" scale="0" xChannelSelector="R" yChannelSelector="G" result="d"/>' +
          '<feColorMatrix in="d" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0"/><feOffset dx="0" result="r"/>' +
          '<feColorMatrix in="d" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="g"/>' +
          '<feColorMatrix in="d" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0"/><feOffset dx="0" result="b"/>' +
          '<feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg"/><feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1"/>' + BOOST,
        [-.1 * K.W, -.1 * K.H, 1.2 * K.W, 1.2 * K.H]);
        turb = f.querySelector('feTurbulence'); tabR = f.querySelector('feFuncR'); dm = f.querySelector('feDisplacementMap');
        const o = f.querySelectorAll('feOffset'); oR = o[0]; oB = o[1];
      }
      const r = K.rand(fr * 7919 + seed * 131 + 17);
      turb.setAttribute('seed', String(1 + ((fr * 13 + seed * 7) % 997)));
      turb.setAttribute('baseFrequency', `0 ${(.004 + r() * .02).toFixed(4)}`);
      const tv = []; for (let i = 0; i < 12; i++) tv.push(r() < .5 ? .5 : r().toFixed(3));
      tabR.setAttribute('tableValues', tv.join(' '));
      dm.setAttribute('scale', (amp * (.6 + .8 * r())).toFixed(1));
      oR.setAttribute('dx', (rgb * (.6 + .4 * r())).toFixed(1)); oB.setAttribute('dx', (-rgb * (.6 + .4 * r())).toFixed(1));
      return `url(#${f.id})`;
    };
  }

  /* ---------------- -webkit-box-reflect fills an edge exposed by a spring overshoot (not reset by the engine:
     a post hook clears it on every root it was not set on this frame) ---------------- */
  const reflected = new Map();
  const reflect = (el, side) => { if (!el) return; if (el.style.webkitBoxReflect !== side) el.style.webkitBoxReflect = side; reflected.set(el, K.t); };
  K.addPost((t) => { for (const [el, stamp] of reflected) if (stamp !== t) { el.style.webkitBoxReflect = ''; reflected.delete(el); } });
  const REFL = { left: 'right', right: 'left', up: 'below', down: 'above' };   // motion dir → side B came from
  const SIDE = { left: 'left', right: 'right', up: 'above', down: 'below' };   // motion dir → the side ahead of it

  /* ---------------- fx overlays (created lazily, display:block every frame they draw) ---------------- */
  const fxDiv = (holder, key, cssText) => { if (!holder[key]) holder[key] = K.div(K.fx, cssText || 'left:0;top:0;width:100%;height:100%'); holder[key].style.display = 'block'; return holder[key]; };
  const fxSvg = (holder, key, inner) => {
    if (!holder[key]) {
      const d = K.div(K.fx, `left:0;top:0;width:${K.W}px;height:${K.H}px`);
      d.innerHTML = `<svg xmlns="${NS}" width="${K.W}" height="${K.H}" viewBox="0 0 ${K.W} ${K.H}" style="position:absolute;left:0;top:0;overflow:visible">${inner || ''}</svg>`;
      holder[key] = d;
    }
    holder[key].style.display = 'block'; return holder[key];
  };
  // film point: o.target (element or () => element; its centre, measured every frame so it follows the scene's own
  // motion; + o.dx/o.dy) or o.x/o.y (default frame centre)
  function pivot(o) {
    const el = typeof o.target === 'function' ? o.target() : o.target;
    if (el && el.getBoundingClientRect) {
      const r = el.getBoundingClientRect(), f = K.film.getBoundingClientRect(), k = f.width / K.W || 1;
      return [(r.left + r.width / 2 - f.left) / k + (o.dx || 0), (r.top + r.height / 2 - f.top) / k + (o.dy || 0)];
    }
    return [o.x ?? K.W / 2, o.y ?? K.H / 2];
  }
  const luma = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return .5; const n = parseInt(m[1], 16); return (.2126 * ((n >> 16) & 255) + .7152 * ((n >> 8) & 255) + .0722 * (n & 255)) / 255; };
  const themeColor = (c) => { if (!c || !/^var\(/.test(c)) return c; const v = getComputedStyle(K.film).getPropertyValue(c.slice(4, -1).trim()).trim(); return v || c; };

  // registration: before/after split, cues(), dur/end, sfx
  function make(type, o, b, a, apply, cues) {
    if (o.at == null) K.errors.push(`K.trans.${type}: missing 'at'`);
    const before = o.before ?? b, after = o.after ?? a;
    const d = K.transition({ type, at: o.at, a: o.a ?? null, b: o.b ?? null, before, after, apply: (t, c) => apply(t, c, d) });
    d.opts = o; d.dur = before + after; d.end = o.at + after;
    d.cues = () => (o.cue === false ? [] : (cues ? cues(d) : []).map((c) => ({ kind: typeof o.cue === 'string' ? o.cue : c.kind, t: +c.t.toFixed(4), gain: c.gain ?? 1 })));
    if (o.sfx) K.addCues(d);
    return d;
  }
  const split = (o, dflt, fb) => { const d = o.dur ?? dflt; return [o.before ?? d * fb, o.after ?? d * (1 - fb)]; };

  /* ================================================================== transitions ================================== */

  // cut — hard cut; optional 1–2 flash frames (full colour, the 2nd at 55 %) and an optional scale punch on B.
  T.cut = (o = {}) => {
    const n = clamp(Math.round(o.flash || 0), 0, 3), col = o.color || '#fff', punch = o.punch || 0, fx = {};
    return make('cut', o, 1 / 240, Math.max((n + 1) / filmFps(), punch ? .4 : 0), (t, { A, B, lt }) => {
      if (lt < 0) { hide(B); return; }
      hide(A);
      const fi = Math.round(lt * K.fps - 1e-6);
      if (n && fi < n) { const d = fxDiv(fx, 'f'); d.style.background = col; d.style.opacity = fi === 0 ? '1' : '.55'; }
      if (B && punch) B.style.transform = `scale(${(1 + punch * Math.exp(-lt * 14)).toFixed(5)})`;
    }, () => (n || punch ? [{ kind: 'hit', t: o.at }] : []));
  };

  // whip — fast camera whip. distance 1 (default): A and B adjacent on one strip, the seam crosses the frame centre on
  // the cut. distance < 1: A is thrown `distance` frames, hard swap on the cut, B is caught from the opposite side.
  T.whip = (o = {}) => {
    const d = DIRS[o.dir] ? o.dir : 'left', [b, a] = split(o, .36, .5), [dx, dy] = dirv(d), dist = o.distance ?? 1, k = o.k ?? 3.2;
    const bA = dirBlur(), bB = dirBlur(), bm = o.blur ?? 1;
    return make('whip', o, b, a, (t, { A, B, lt }) => {
      const L = dx ? K.W : K.H, { p, v } = ramp(lt, b, a, .5, k), top = bOnTop(A, B);
      if (dist >= .999) {
        const s = sigma(v * L, .12 * L) * bm, bx = dx ? s : 0, by = dy ? s : 0;
        if (A) { if (p >= 1) hide(A); else css(A, { transform: tr(dx * p * L, dy * p * L), filter: bA(bx, by, !top) }); }
        if (B) { if (p <= 0) hide(B); else css(B, { transform: tr(dx * (p - 1) * L, dy * (p - 1) * L), filter: bB(bx, by, top) }); }
      } else {
        // thrown / caught: each scene is alone in frame, so the side it uncovers is filled with its own mirror image
        // (-webkit-box-reflect) — under this much smear it reads as the same plate still rushing past
        const s = sigma(2 * v * dist * L, .12 * L) * bm, bx = dx ? s : 0, by = dy ? s : 0;
        if (lt < 0) { hide(B); const q = p * 2; if (A) { css(A, { transform: tr(dx * q * dist * L, dy * q * dist * L), filter: bA(bx, by) }); if (q > 1e-3) reflect(A, REFL[d]); } }
        else { hide(A); const q = 1 - (p - .5) * 2; if (B) { css(B, { transform: tr(-dx * q * dist * L, -dy * q * dist * L), filter: bB(bx, by) }); if (q > 1e-3) reflect(B, SIDE[d]); } }
      }
    }, () => [{ kind: 'whip', t: o.at - .12 }]);
  };

  // push — A and B move together (adjacent), accelerating into the cut; B lands with a spring (≈2 % overshoot, the
  // edge it exposes is mirrored so no background shows).
  T.push = (o = {}) => {
    const [b, a] = split(o, .72, .34), d = o.dir || 'left', [dx, dy] = dirv(d);
    const bA = dirBlur(), bB = dirBlur(), bm = o.blur ?? .8, k = o.k ?? 2.4, w = o.w ?? 17, z = o.z ?? .6;
    return make('push', o, b, a, (t, { A, B, lt }) => {
      const L = dx ? K.W : K.H, r = lt < 0 ? ramp(lt, b, a, .5, k) : springFrom(lt, .5, .5 * k / b, a, w, z), P = r.p;
      const s = sigma(r.v * L, .1 * L) * bm, bx = dx ? s : 0, by = dy ? s : 0, top = bOnTop(A, B);
      if (A) { if (P >= 1) hide(A); else css(A, { transform: tr(dx * P * L, dy * P * L), filter: bA(bx, by, !top) }); }
      if (B) { css(B, { transform: tr(dx * (P - 1) * L, dy * (P - 1) * L), filter: bB(bx, by, top && P < 1) }); if (P > 1) reflect(B, REFL[d]); }
    }, () => [{ kind: 'whoosh', t: o.at - .14, gain: .9 }]);
  };

  // cover — B slides OVER A with a soft shadow ahead of its leading edge; A drifts the same way (parallax) and dims.
  T.cover = (o = {}) => {
    const [b, a] = split(o, .62, .32), d = o.dir || 'up', [dx, dy] = dirv(d);
    const bB = dirBlur(), bm = o.blur ?? .7, par = o.parallax ?? .28, dim = o.dim ?? .45, sh = o.shadow ?? .5, k = o.k ?? 2.4;
    return make('cover', o, b, a, (t, { A, B, lt }) => {
      const L = dx ? K.W : K.H, r = lt < 0 ? ramp(lt, b, a, .5, k) : springFrom(lt, .5, .5 * k / b, a, 18, .78), P = r.p;
      const s = sigma(r.v * L, .08 * L) * bm;
      if (A) { if (P >= 1) hide(A); else css(A, { transform: tr(dx * P * L * par, dy * P * L * par), filter: `brightness(${(1 - dim * Math.min(1, P)).toFixed(3)})` }); }
      if (B) {
        const sd = Math.round(L * .025), shadow = sh > 0 && P < 1 ? `drop-shadow(${dx * sd}px ${dy * sd}px ${Math.round(L * .045)}px rgba(0,0,0,${sh}))` : '';
        css(B, { transform: tr(dx * (P - 1) * L, dy * (P - 1) * L), filter: joinF(bB(dx ? s : 0, dy ? s : 0, bOnTop(A, B) && P < 1), shadow) });
        if (P > 1) reflect(B, REFL[d]);
      }
    }, () => [{ kind: 'swipe', t: o.at - .12, gain: .9 }]);
  };

  // slice — the frame splits into n strips; each strip of B pushes the matching strip of A out, staggered (the
  // middle strip on the cut). dir 'v': vertical strips moving down (from 'top') / up ('bottom') / alternating ('alt');
  // dir 'h': horizontal strips moving sideways (from 'left' | 'right' | 'alt'). color: a bar rides each seam.
  T.slice = (o = {}) => {
    const n = o.n ?? 5, vert = (o.dir || 'v') !== 'h', st = o.stagger ?? .05, from = o.from || (vert ? 'top' : 'left');
    const ph = o.strip ?? .46, half = (n - 1) / 2, order = o.order || 'lr';
    const ranks = [...Array(n)].map((_, i) => (order === 'center' ? Math.abs(i - half) - half / 2 : order === 'rl' ? half - i : i - half));
    const spread = Math.max(...ranks.map((r) => Math.abs(r))) * st;
    const b = o.before ?? ph * .5 + spread, a = o.after ?? ph * .5 + spread, bm = o.blur ?? .6;
    const fA = stripShift(n, vert), fB = stripShift(n, vert), fx = {}, col = o.color || null, gap = col ? (o.gap ?? .03) : 0;
    return make('slice', o, b, a, (t, { A, B, lt }) => {
      const L = vert ? K.H : K.W, oa = [], ob = [], ps = [], sg2 = [];
      for (let i = 0; i < n; i++) {
        const sg = from === 'alt' ? (i % 2 ? -1 : 1) : (from === 'bottom' || from === 'right') ? -1 : 1;
        const r = ramp(lt - ranks[i] * st, ph * .5, ph * .5, .5, 3);
        sg2.push(sigma(r.v * L, .05 * L) * bm); ps.push(r.p);
        const g = gap * L * Math.sin(Math.PI * r.p);           // seam gap carrying the colour bar
        oa.push(sg * (r.p * L + g / 2)); ob.push(sg * ((r.p - 1) * L - g / 2));
      }
      const cr = fA.cross, crossT = vert ? tr(cr, 0) : tr(0, cr), top = bOnTop(A, B);
      if (A) { if (ps.every((q) => q >= 1)) hide(A); else css(A, { transform: crossT, filter: fA(oa, sg2, !top) }); }
      if (B) { if (ps.every((q) => q <= 0)) hide(B); else css(B, { transform: crossT, filter: fB(ob, sg2, top) }); }
      if (col) {
        const box = fxDiv(fx, 'bars');
        if (!fx.list) fx.list = [...Array(n)].map(() => K.div(box, ''));
        fx.list.forEach((el, i) => {
          // the bar fills the gap and stretches back over the upper strip's smeared edge (speed stretch)
          let g = Math.abs(oa[i] - ob[i]) - L, pos = (oa[i] > ob[i] ? ob[i] : oa[i]) + L;
          const vis = ps[i] > 0 && ps[i] < 1 && g > .5, ext = .9 * sg2[i], bFirst = (ob[i] < oa[i]) === top;
          g += ext; if (bFirst) pos -= ext;
          el.style.display = vis ? 'block' : 'none';
          if (vis) css(el, Object.assign({ background: col }, vert ? { left: `${(i * K.W / n - .5).toFixed(1)}px`, width: `${(K.W / n + 1).toFixed(1)}px`, top: `${pos.toFixed(1)}px`, height: `${g.toFixed(1)}px` } : { top: `${(i * K.H / n - .5).toFixed(1)}px`, height: `${(K.H / n + 1).toFixed(1)}px`, left: `${pos.toFixed(1)}px`, width: `${g.toFixed(1)}px` }));
        });
      }
    }, () => [{ kind: 'bars', t: o.at - .14 }]);
  };

  // flash — A burns up (exposure + saturation), `frames` full-colour frames on the cut, B burns back down.
  T.flash = (o = {}) => {
    const [b, a] = split(o, .34, .4), col = o.color || '#fff', n = o.frames ?? 2, gain = o.gain ?? 1.6, fx = {};
    return make('flash', o, b, a, (t, { A, B, lt }) => {
      const d = fxDiv(fx, 'f'); d.style.background = col;
      if (lt < 0) {
        hide(B);
        const q = E.in(2.4)(K.p(lt, -b, 0));
        if (A) css(A, { filter: `brightness(${(1 + gain * q).toFixed(3)}) saturate(${(1 + .6 * q).toFixed(3)})`, transform: `scale(${(1 + .035 * q).toFixed(5)})` });
        d.style.opacity = (E.in(4)(K.p(lt, -b, 0)) * .5).toFixed(3);
        return;
      }
      hide(A);
      const fi = Math.round(lt * K.fps - 1e-6), q = 1 - E.out(3)(K.p(lt, n / K.fps, a));
      if (B) css(B, { filter: q > .001 ? `brightness(${(1 + gain * q).toFixed(3)})` : '', transform: `scale(${(1 + .04 * q).toFixed(5)})` });
      d.style.opacity = fi < n ? (fi === 0 || n === 1 ? '1' : '.85') : (q * .35).toFixed(3);
    }, () => [{ kind: 'hit', t: o.at }]);
  };

  // colorBurst — 2–3-frame full-frame colour blocks between A and B, each optionally carrying one big word. The burst
  // starts ON `at` and lasts n·frames/fps (= def.dur); start scene b at def.end (b stays hidden under the blocks
  // anyway). items: [{color, word, fg}] or colors[] + words[].
  let mctx = null;
  function fitSize(word, maxW, maxH, font) {      // font-size fitting `word` in maxW (display face, tracking −0.045 em)
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    mctx.font = `800 100px ${font || '"Inter Tight"'}`;
    const w = mctx.measureText(word).width - .045 * 100 * Math.max(0, [...word].length - 1);
    return Math.round(Math.min(maxH, 100 * maxW / Math.max(1, w)));
  }
  T.colorBurst = (o = {}) => {
    const fr = o.frames ?? 2, cols = o.colors || ['var(--k-accent)', 'var(--k-accent2)', 'var(--k-accent3)'], words = o.words || [];
    const items = o.items || cols.map((c, i) => ({ color: c, word: words[i] || null }));
    const n = items.length, dur = n * fr / filmFps(), fx = {};
    return make('colorBurst', o, 1 / 240, dur, (t, { A, B, lt }) => {
      hide(A);
      const idx = Math.floor((K.TQ(t) - o.at) * K.fps / fr + 1e-6);
      if (idx >= n || idx < 0) return;
      hide(B);
      const box = fxDiv(fx, 'box');
      if (!fx.blocks) {
        fx.blocks = items.map((it, i) => {
          const el = K.div(box, 'left:0;top:0;width:100%;height:100%;display:none;overflow:hidden'), c = themeColor(it.color);
          el.style.background = c;
          if (it.word) {
            const fg = it.fg || (luma(c) > .55 ? '#0E0F12' : '#FFFFFF');
            const w = K.div(el, `left:0;right:0;top:50%;text-align:center;white-space:nowrap;color:${fg};line-height:.9`);
            const sp = K.el('span', 'display:inline-block', w); sp.textContent = it.word;
            w.className = o.serif && i % 2 ? 'k-serif' : 'k-display'; if (o.font) w.style.fontFamily = o.font;
            let size = o.size;
            if (!size) {                         // fit in its OWN face (display / italic serif / font override): measure the DOM
              el.style.display = 'block'; w.style.fontSize = '100px';
              const nat = sp.offsetWidth; el.style.display = 'none';
              size = nat > 0 ? Math.round(Math.min(K.H * .32, 100 * K.W * (K.W < K.H ? .84 : .6) / nat)) : fitSize(it.word, K.W * (K.W < K.H ? .84 : .6), K.H * .32, o.font);
            }
            w.style.fontSize = size + 'px'; el.__w = w;
          }
          return el;
        });
      }
      fx.blocks.forEach((el, i) => { el.style.display = i === idx ? 'block' : 'none'; });
      const el = fx.blocks[idx];
      if (el.__w) { const q = E.out(2)(K.p(K.TQ(t) - o.at - idx * fr / K.fps, 0, fr / K.fps)); el.__w.style.transform = `translateY(-50%) scale(${(1.06 - .06 * q).toFixed(4)}) rotate(${idx % 2 ? 2 : -2}deg)`; }
    }, () => items.map((it, i) => ({ kind: 'tick', t: o.at + i * fr / filmFps(), gain: .8 })));
  };

  // iris — B grows out of a point inside a circle / rounded rect with a ring on its edge; A pushes in behind.
  const rrect = (x, y, w, h, r) => { r = Math.max(0, Math.min(r, w / 2, h / 2)); const f = (v) => v.toFixed(2); return `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x)} ${f(y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${f(x + r)} ${f(y)}Z`; };
  T.iris = (o = {}) => {
    const [b, a] = split(o, .62, .55), shape = o.shape || 'circle', ring = o.ring === undefined ? 'var(--k-accent2)' : o.ring, fx = {};
    const rw = o.ringWidth ?? .02, k = o.k ?? 2.6;
    return make('iris', o, b, a, (t, { A, B, lt }) => {
      const [x, y] = pivot(o), { p } = ramp(lt, b, a, o.mid ?? .42, k), RW = rw * Math.min(K.W, K.H);
      const Rx = Math.max(x, K.W - x), Ry = Math.max(y, K.H - y), R = Math.hypot(Rx, Ry) + RW;
      if (A) { if (p >= 1) hide(A); else A.style.transform = about(x, y, 1 + .1 * E.in(2)(Math.min(1, p))); }
      if (!B) return;
      if (p <= 0) { hide(B); return; }
      const sB = .9 + .1 * E.out(2)(p);
      B.style.transform = about(x, y, sB);                      // the pivot is a fixed point: clip geometry stays at (x, y)
      let path = '';
      if (shape === 'circle') {
        const r = R * p; B.style.clipPath = p >= 1 ? '' : `circle(${(r / sB).toFixed(2)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`;
        if (ring && p < 1) path = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(r + RW * .45).toFixed(2)}" fill="none" stroke-width="${(RW * (1 - .5 * p)).toFixed(2)}"/>`;
      } else {
        const hw = (Rx * 1.14 + RW) * p, hh = (Ry * 1.14 + RW) * p, cr = Math.min(hw, hh) * .3;
        B.style.clipPath = p >= 1 ? '' : `path('${rrect(x - hw / sB, y - hh / sB, 2 * hw / sB, 2 * hh / sB, cr / sB)}')`;
        if (ring && p < 1) path = `<path d="${rrect(x - hw - RW * .45, y - hh - RW * .45, 2 * hw + RW * .9, 2 * hh + RW * .9, cr + RW * .45)}" fill="none" stroke-width="${(RW * (1 - .5 * p)).toFixed(2)}"/>`;
      }
      if (path) { const svg = fxSvg(fx, 'ring').firstChild; svg.innerHTML = path; svg.firstChild.style.stroke = ring; }
    }, () => [{ kind: 'zoom', t: o.at - .2, gain: .8 }]);
  };

  // gridMask — a grid of tiles; each tile flashes the accent colour, then opens onto B (staggered by `order`).
  T.gridMask = (o = {}) => {
    const fx = {}, col = o.color === undefined ? 'var(--k-accent2)' : o.color, st = o.stagger ?? .028, ord = o.order || 'diag', td = o.tile ?? .22;
    let grid = null;
    const tilesFor = (W, H) => {
      const cols = o.cols ?? (W < H ? 4 : 7), tw = W / cols, rows = o.rows ?? Math.max(1, Math.round(H / tw)), th = H / rows, tiles = [];
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const rank = ord === 'rows' ? r + c * .3 : ord === 'center' ? Math.hypot((c - (cols - 1) / 2) * tw, (r - (rows - 1) / 2) * th) / tw : ord === 'random' ? K.hash(r * 31.7 + c * 7.3 + (o.seed || 0)) * (cols + rows) * .6 : c + r;
        tiles.push({ x: c * tw, y: r * th, w: tw, h: th, rank });
      }
      return tiles;
    };
    const build = () => {
      const tiles = tilesFor(K.W, K.H), mx = Math.max(...tiles.map((q) => q.rank));
      tiles.forEach((q) => { q.t = (q.rank - mx / 2) * st; });
      grid = { tiles };
    };
    // window = half the real stagger spread + one tile. K.W/K.H may not be final yet when the transition is defined
    // (K.start sets the format), so take the widest of the current, 9:16 and 16:9 grids.
    const spread = (W, H) => Math.max(...tilesFor(W, H).map((q) => q.rank));
    const est = Math.max(spread(K.W, K.H), spread(1080, 1920), spread(1920, 1080)) * st / 2;
    const b = o.before ?? est + td * .8, a = o.after ?? est + td * .7;
    return make('gridMask', o, b, a, (t, { A, B, lt }) => {
      if (!grid) build();
      let inner = '', ring = '', all = true, none = true;
      const rect = (x, y, w, h) => `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(1)}v${h.toFixed(1)}h${(-w).toFixed(1)}Z`;
      for (const q of grid.tiles) {
        // qi saturates at 94 % of its ease: the opening closes onto the tile edge at speed (no slow hairline tail)
        const qo = E.out(3)(K.p(lt, q.t - td * .7, q.t + td * .05)), qi = Math.min(1, E.out(3)(K.p(lt, q.t - td * .3, q.t + td * .7)) / .94);
        const cx = q.x + q.w / 2, cy = q.y + q.h / 2;
        if (qi > 0) { none = false; const w = q.w * qi + 1.2, h = q.h * qi + 1.2; inner += rect(cx - w / 2, cy - h / 2, w, h); }
        if (qi < 1) all = false;
        // accent ring between the colour tile and the opening; dropped once it is thinner than ~1 px (no hairline grid
        // left over the revealed B). The hole matches B's clip (+1.2 px) so no sliver of colour lingers inside it.
        if (col && (qo - qi) * Math.min(q.w, q.h) > 3.5) { const w = q.w * qo, h = q.h * qo, wi = q.w * qi + 1.2, hi = q.h * qi + 1.2; ring += rect(cx - w / 2, cy - h / 2, w, h) + (qi > 0 ? rect(cx - wi / 2, cy - hi / 2, wi, hi) : ''); }
      }
      const pA = K.p(lt, -b, a);
      if (A) { if (all) hide(A); else css(A, { transform: `scale(${(1 - .05 * E.inOut(2)(pA)).toFixed(5)})`, filter: `brightness(${(1 - .3 * pA).toFixed(3)})` }); }
      if (B) { if (none) hide(B); else B.style.clipPath = all ? '' : `path('${inner}')`; }
      if (ring) { const pth = fxSvg(fx, 'g', '<path fill-rule="evenodd"/>').firstChild.firstChild; pth.setAttribute('d', ring); pth.style.fill = col; }
    }, () => [{ kind: 'bars', t: o.at - .2, gain: .8 }, { kind: 'tick', t: o.at - .06, gain: .6 }, { kind: 'tick', t: o.at + .08, gain: .6 }]);
  };

  // liquid — an organic metaball blob of `color` floods out of a point and covers A (cut on full cover), then a
  // blob-shaped hole opens onto B with a liquid rim (rim = color, outer = color2 || color).
  T.liquid = (o = {}) => {
    const [b, a] = split(o, 1.1, .5), c1 = o.color || 'var(--k-accent2)', c2 = o.color2 || null, nb = o.blobs ?? 7, seed = o.seed ?? 3, fx = {};
    let made = false;
    return make('liquid', o, b, a, (t, { A, B, lt }) => {
      const [x, y] = pivot(o), R = Math.hypot(Math.max(x, K.W - x), Math.max(y, K.H - y)), m = Math.min(K.W, K.H);
      if (!made) {
        made = true; const g = 'kg' + (uid++), m1 = 'km' + (uid++), m2 = 'km' + (uid++);
        fxSvg(fx, 's', `<defs><filter id="${g}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB"><feGaussianBlur stdDeviation="${(m * .028).toFixed(1)}"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -10"/></filter>` +
          `<mask id="${m1}" maskUnits="userSpaceOnUse" x="0" y="0" width="${K.W}" height="${K.H}"><rect width="${K.W}" height="${K.H}" fill="#fff"/><g filter="url(#${g})" fill="#000" class="h1"></g></mask>` +
          `<mask id="${m2}" maskUnits="userSpaceOnUse" x="0" y="0" width="${K.W}" height="${K.H}"><rect width="${K.W}" height="${K.H}" fill="#fff"/><g filter="url(#${g})" fill="#000" class="h2"></g></mask></defs>` +
          `<g filter="url(#${g})" class="p1"></g><g filter="url(#${g})" class="p2"></g>` +
          `<rect class="r1" width="${K.W}" height="${K.H}" mask="url(#${m1})"/><rect class="r2" width="${K.W}" height="${K.H}" mask="url(#${m2})"/>`);
      }
      const svg = fxSvg(fx, 's').firstChild, q = (s) => svg.querySelector(s);
      const blobs = (rad, wob) => {                                    // main disc + satellites bulging out of its rim
        if (rad <= 0) return '';
        let s = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(1)}"/>`;
        for (let j = 0; j < nb; j++) {
          const h1 = K.hash(j * 3.1 + seed), h2 = K.hash(j * 7.7 + seed * 2), h3 = K.hash(j * 1.9 + seed * 5);
          const ang = (j / nb) * Math.PI * 2 + h1 * 1.2 + .5 * Math.sin(wob * 3 + j);
          const dd = rad * (.8 + .3 * h2 + .06 * Math.sin(wob * 5 + j * 2)), rr = rad * (.24 + .2 * h3) + m * .02;
          s += `<circle cx="${(x + Math.cos(ang) * dd).toFixed(1)}" cy="${(y + Math.sin(ang) * dd).toFixed(1)}" r="${rr.toFixed(1)}"/>`;
          if (h3 > .5) s += `<circle cx="${(x + Math.cos(ang + .3) * (dd + rr * 1.7)).toFixed(1)}" cy="${(y + Math.sin(ang + .3) * (dd + rr * 1.7)).toFixed(1)}" r="${(rr * .4).toFixed(1)}"/>`;
        }
        return s;
      };
      const f1 = themeColor(c1), f2 = themeColor(c2 || c1), rimW = m * .07;
      for (const c of ['.p1', '.p2', '.r1', '.r2']) q(c).style.display = 'none';
      if (lt < 0) {
        hide(B);
        const u = E.in(2)(K.p(lt, -b, 0)), r1 = R * 1.22 * u;
        const p1 = q('.p1'); p1.style.display = ''; p1.style.fill = f1; p1.innerHTML = blobs(r1, lt);
        if (c2) { const p2 = q('.p2'); p2.style.display = ''; p2.style.fill = f2; p2.innerHTML = blobs(Math.max(0, r1 - rimW * 1.8 - R * .1 * (1 - u)), lt + .3); }
        if (A) A.style.transform = about(x, y, 1 + .06 * u);
        return;
      }
      hide(A);
      const u = E.out(1.9)(K.p(lt, 0, a)), rh = R * 1.3 * u;
      if (u >= 1) return;
      const r1 = q('.r1'), r2 = q('.r2');
      r1.style.display = ''; r1.style.fill = f1; q('.h1').innerHTML = blobs(Math.max(0, rh - rimW), -lt);
      r2.style.display = ''; r2.style.fill = f2; q('.h2').innerHTML = blobs(rh, -lt + .15);
      if (B) B.style.transform = about(x, y, 1.08 - .08 * u);
    }, () => [{ kind: 'swoosh', t: o.at - .32 }, { kind: 'pop', t: o.at + .02, gain: .7 }]);
  };

  // spin3d — 3D turn. mode 'cube' (default): A and B are two faces of a cube turning `dir`; 'flip': A turns edge-on,
  // cut, B turns in. Faces darken as they turn away; the speed peak (45° / edge-on) is on the cut.
  T.spin3d = (o = {}) => {
    const [b, a] = split(o, .7, .44), d = o.dir || 'left', mode = o.mode || 'cube', persp = o.perspective ?? 2.1, bm = o.blur ?? .6;
    const [dx, dy] = dirv(d), bA = dirBlur(true), bB = dirBlur(true), k = o.k ?? 2.6;
    return make('spin3d', o, b, a, (t, { A, B, lt }) => {
      const L = dx ? K.W : K.H, P = persp * Math.max(K.W, K.H);
      // flip: the edge-on instant falls half a frame BEFORE the cut, so no frame shows an empty (edge-on) card
      if (mode === 'flip') lt += .5 / K.fps;
      const r = lt < 0 ? ramp(lt, b, a, .5, k) : springFrom(lt, .5, .5 * k / b, a, 16, .72), p = r.p;
      const rot = (deg) => (dx ? `rotateY(${(dx * deg).toFixed(3)}deg)` : `rotateX(${(-dy * deg).toFixed(3)}deg)`);
      const s = sigma(r.v * Math.PI / 4 * L, .05 * L) * bm, bx = dx ? s : 0, by = dy ? s : 0;
      if (mode === 'flip') {
        const q = lt < 0 ? p * 2 : (p - .5) * 2, dip = 1 - .14 * Math.sin(Math.PI * clamp(p));
        if (lt < 0) { hide(B); if (A) css(A, { transform: `perspective(${P}px) scale(${dip.toFixed(4)}) ${rot(90 * q)}`, filter: joinF(bA(bx, by), `brightness(${(1 - .5 * q).toFixed(3)})`) }); }
        else { hide(A); if (B) css(B, { transform: `perspective(${P}px) scale(${dip.toFixed(4)}) ${rot(-90 * (1 - q))}`, filter: joinF(bB(bx, by), `brightness(${(1 - .5 * clamp(1 - q)).toFixed(3)})`) }); }
        return;
      }
      const h = L / 2, th = 90 * p, face = (deg) => `perspective(${P}px) translateZ(${-h}px) ${rot(deg)} translateZ(${h}px)`;
      if (A) { if (p >= 1) hide(A); else css(A, { transform: face(th), filter: joinF(bA(bx, by), `brightness(${(1 - .55 * clamp(p)).toFixed(3)})`) }); }
      if (B) { if (p <= 0) hide(B); else css(B, { transform: face(th - 90), filter: joinF(bB(bx, by), p < 1 ? `brightness(${(.45 + .55 * p).toFixed(3)})` : '') }); }
    }, () => [{ kind: 'whip', t: o.at - .14, gain: .9 }]);
  };

  // glitch — ~6 frames of digital breakup around the cut: blocky slice displacement + RGB split + jitter, A/B
  // interleaved in random bands on the frames next to the cut, neon bars + scanlines in fx.
  T.glitch = (o = {}) => {
    const [b, a] = split(o, .3, .4), amt = o.amount ?? 1, seed = o.seed ?? 1, fA = glitchFilter(), fB = glitchFilter(), fx = {};
    const bars = o.colors || ['#00FF6A', '#FF2BD6', '#2B4BFF', '#FFFFFF'];
    const bands = (r, n) => { let s = ''; for (let i = 0; i < n; i++) { const y = r() * K.H, h = (.03 + r() * .14) * K.H; s += `M-60 ${y.toFixed(0)}H${K.W + 60}V${(y + h).toFixed(0)}H-60Z`; } return s; };
    return make('glitch', o, b, a, (t, { A, B, lt }) => {
      const fr = Math.round(t * K.fps), lf = Math.round(lt * K.fps);
      const g = Math.pow(clamp(1 - Math.abs(lt) / (lt < 0 ? b : a)), .6) * amt, r = K.rand(fr * 977 + seed * 31 + 5);
      const amp = K.W * .16 * g, rgb = K.W * .022 * g, jit = K.W * .016 * g;
      const jt = () => `translate(${((r() - .5) * 2 * jit).toFixed(1)}px,${((r() - .5) * jit * .6).toFixed(1)}px) scale(${(1 + (r() < .3 ? .035 * g : 0)).toFixed(4)})`;
      if (lt < 0) {
        if (A) css(A, { transform: jt(), filter: fA(fr, amp, rgb, seed) });
        if (B) { if (lf >= -1 && g > .2) css(B, { transform: jt(), filter: fB(fr + 3, amp, rgb, seed), clipPath: `path('${bands(r, 3)}')` }); else hide(B); }
      } else {
        if (B) css(B, { transform: jt(), filter: g > .02 ? fB(fr, amp, rgb, seed) : '' });
        if (A) { if (lf <= 0 && g > .2) css(A, { transform: jt(), filter: fA(fr + 5, amp, rgb, seed), clipPath: `path('${bands(r, 3)}')`, zIndex: String(+(B ? B.style.zIndex || 0 : 0) + 1) }); else hide(A); }
      }
      if (g > .05) {
        const box = fxDiv(fx, 'box');
        if (!fx.bars) { fx.bars = [0, 1, 2].map(() => K.div(box, '')); fx.scan = K.div(box, 'left:0;top:0;width:100%;height:100%;background:repeating-linear-gradient(0deg,rgba(0,0,0,.3) 0 2px,transparent 2px 5px)'); }
        fx.bars.forEach((el, i) => {
          const on = r() < .7 * g + .1, y = r() * K.H, h = (.012 + r() * .06) * K.H;
          css(el, { display: on ? 'block' : 'none', left: `${(-r() * .2 * K.W).toFixed(0)}px`, width: `${(K.W * (.7 + r() * .6)).toFixed(0)}px`, top: `${y.toFixed(0)}px`, height: `${h.toFixed(0)}px`, background: bars[(fr + i) % bars.length], mixBlendMode: i === 0 ? 'difference' : 'normal', opacity: (.6 + .4 * r()).toFixed(2) });
        });
        fx.scan.style.opacity = (g * .8).toFixed(3);
      }
    }, () => [{ kind: 'glitch', t: o.at - .08 }]);
  };

  // punch — impact on B: hard cut (if `a` is given, A smears/burns into it) into B scaled up (`scale`) under a radial
  // blur, settling with a decaying shake + tilt; optional flash frames. Without `a`: an in-scene impact on b at `at`.
  T.punch = (o = {}) => {
    const b = o.before ?? (o.a ? .16 : 1 / 240), a = o.after ?? .6, S = o.scale ?? 1.18, shake = o.shake ?? .024, rot = o.rot ?? 1.6;
    const n = o.flash ?? 0, col = o.color || '#fff', zA = zoomBlur(), zB = zoomBlur(), fx = {}, bm = o.blur ?? 1;
    return make('punch', o, b, a, (t, { A, B, lt }) => {
      const [x, y] = pivot(o);
      if (lt < 0) {
        if (o.a) hide(B);
        if (A) { const q = E.in(3)(K.p(lt, -b, 0)); css(A, { filter: joinF(zA(x, y, -.1 * q * bm), `brightness(${(1 + .25 * q).toFixed(3)})`) }); }   // wind-up: smear + burn, no scale (edges stay covered)
        return;
      }
      if (o.a) hide(A);
      const dec = Math.exp(-lt * 12), m = Math.min(K.W, K.H);
      const sx = K.settleShake(lt, 0, shake * m, 7, 7.5), sy = K.settleShake(lt + .04, 0, shake * m * .7, 6, 7.5), r = K.settleShake(lt + .02, 0, rot, 5, 7);
      const cover = 1 + 2.4 * Math.max(Math.abs(sx), Math.abs(sy)) / m + Math.abs(r) * .012;   // never expose the frame edge
      if (B) css(B, { transform: `${tr(sx, sy)} rotate(${r.toFixed(3)}deg) ${about(x, y, (1 + (S - 1) * dec) * cover)}`, filter: zB(x, y, -(S - 1) * 1.6 * dec * bm) });
      const fi = Math.round(lt * K.fps - 1e-6);
      if (n && fi < n) { const d = fxDiv(fx, 'f'); d.style.background = col; d.style.opacity = fi === 0 ? '.9' : '.45'; }
    }, () => [{ kind: 'impact', t: o.at }]);
  };

  // zoomThrough — fly INTO a point of A: A scales ×`scale` (6–10, log space, E.in) about the pivot; on the cut B
  // appears at ×`from` (.3–.4) nested in A's pivot as a rounded card and settles to 1 with a speed-matched E.out.
  // Zoom direction is preserved (both grow). portal:true also shows B as a growing window before the cut.
  T.zoomThrough = (o = {}) => {
    const [b, a] = split(o, .62, .48), S = o.scale ?? 8, F = o.from ?? .35, k = o.k ?? 3, zA = zoomBlur(), zB = zoomBlur(), bm = o.blur ?? 1;
    const lnS = Math.log(S), lnF = Math.log(F), v0 = lnS * k / b, k2 = clamp(v0 * a / -lnF, 1.5, 7), rad = o.radius ?? .05, center = o.center ?? true;
    return make('zoomThrough', o, b, a, (t, { A, B, lt }) => {
      const [x, y] = pivot(o), sh = .5 / K.fps;
      let lsA, lsB, v;
      if (lt < 0) { const u = (lt + b) / b; lsA = lnS * u ** k; lsB = lnF + lsA - lnS; v = lnS * k * u ** (k - 1) / b; }
      else { const u = Math.min(1, lt / a); lsB = lnF * (1 - u) ** k2; lsA = lnS + lsB - lnF; v = -lnF * k2 * (1 - u) ** (k2 - 1) / a; }
      const amt = Math.min(.7, Math.expm1(v * sh) * .9) * bm, sA = Math.exp(lsA), sB = Math.exp(lsB);
      const wc = center ? E.inOut(2)(clamp(lsA / lnS)) * (lt < 0 ? 1 : clamp(lsB / lnF)) : 0;   // camera pans the pivot to the centre…
      const pan = tr((K.W / 2 - x) * wc, (K.H / 2 - y) * wc);                                // …and back out with B's settle
      if (A) { if (lt >= 0 && sB >= .9995) hide(A); else css(A, { transform: pan + ' ' + about(x, y, sA), filter: zA(x, y, amt) }); }
      if (B) {
        if (lt < 0 && !o.portal) { hide(B); return; }
        const r = Math.min(K.W, K.H) * rad * clamp((1 - sB) / (1 - F)) / sB;
        css(B, { transform: pan + ' ' + about(x, y, sB), filter: zB(x, y, amt), clipPath: sB < .9995 ? `inset(0 round ${r.toFixed(1)}px)` : '' });
      }
    }, () => [{ kind: 'zoom', t: o.at - .24 }]);
  };

  // zoomOut — the reverse flight: A shrinks into the pivot (log space, E.in), becoming a rounded card and then a dot,
  // while B — huge behind it — pulls back from ×`scale` to 1 (speed-matched E.out). Direction preserved (both shrink).
  T.zoomOut = (o = {}) => {
    const [b, a] = split(o, .62, .5), S = o.scale ?? 8, F = o.to ?? .35, k = o.k ?? 3, zA = zoomBlur(), zB = zoomBlur(), bm = o.blur ?? 1;
    const lnS = Math.log(S), lnF = Math.log(F), v0 = -lnF * k / b, k2 = clamp(v0 * a / lnS, 1.5, 7), keep = o.keep ?? true;
    return make('zoomOut', o, b, a, (t, { A, B, lt }) => {
      const [x, y] = pivot(o), sh = .5 / K.fps;
      let lsA, lsB, v;
      if (lt < 0) { const u = (lt + b) / b; lsA = lnF * u ** k; lsB = lnS + lsA - lnF; v = -lnF * k * u ** (k - 1) / b; }
      else { const u = Math.min(1, lt / a); lsB = lnS * (1 - u) ** k2; lsA = lnF + lsB - lnS; v = lnS * k2 * (1 - u) ** (k2 - 1) / a; }
      const amt = -Math.min(.6, Math.expm1(v * sh) * .9) * bm, sA = Math.exp(lsA), sB = Math.exp(lsB);
      if (B) css(B, { transform: about(x, y, sB), filter: zB(x, y, amt) });
      if (A) {
        if (lt >= 0 && (!keep || sA < .015)) { hide(A); return; }
        const q = clamp((1 - sA) / (1 - F * .3)), m = Math.min(K.W, K.H), end = lt >= 0 ? 1 - E.in(3)(K.p(lt, a * .5, a)) : 1;
        css(A, { transform: about(x, y, Math.max(1e-3, sA * end)), filter: zA(x, y, amt), clipPath: `inset(0 round ${(m * .5 * E.in(1.6)(q) / sA).toFixed(1)}px)`, zIndex: String(+(B ? B.style.zIndex || 0 : 0) + 1) });
      }
    }, () => [{ kind: 'zoom', t: o.at - .24 }]);
  };

  // smear — zoom/radial smear: A rushes in (×`scale`) under a strong radial blur and burns brighter; B arrives from
  // ×`from` (< 1, still growing: direction preserved) out of the same blur; light streaks + bloom in fx.
  T.smear = (o = {}) => {
    const [b, a] = split(o, .5, .5), S = o.scale ?? 1.55, F = o.from ?? .8, k = o.k ?? 3, zA = zoomBlur(), zB = zoomBlur(), fx = {};
    const lnS = Math.log(S), lnF = Math.log(F), v0 = lnS * k / b, k2 = clamp(v0 * a / -lnF, 1.5, 6), streaks = o.streaks ?? true, col = o.color || '#fff', bm = o.blur ?? 1;
    return make('smear', o, b, a, (t, { A, B, lt }) => {
      const [x, y] = pivot(o), sh = .5 / K.fps;
      let s, v;
      if (lt < 0) { const u = (lt + b) / b; s = Math.exp(lnS * u ** k); v = lnS * k * u ** (k - 1) / b; }
      else { const u = Math.min(1, lt / a); s = Math.exp(lnF * (1 - u) ** k2); v = -lnF * k2 * (1 - u) ** (k2 - 1) / a; }
      // light envelope: builds into the cut, then clears fast on B (a lingering screen-white veil greys a dark scene)
      const env = lt < 0 ? E.in(2)(K.p(lt, -b, 0)) : (1 - K.p(lt, 0, a * .6)) ** 2.4;
      let amt = Math.min(1, Math.expm1(v * sh) * 2.2) * bm;
      if (lt >= 0) amt = Math.max(amt, 1 / s - 1 + .03);                  // the largest copy always covers the frame
      if (lt < 0) { hide(B); if (A) css(A, { transform: about(x, y, s), filter: joinF(zA(x, y, amt), `brightness(${(1 + .5 * env).toFixed(3)})`) }); }
      else { hide(A); if (B) css(B, { transform: about(x, y, s), filter: joinF(zB(x, y, amt), env > .01 ? `brightness(${(1 + .5 * env).toFixed(3)})` : '') }); }
      if (streaks && env > .02) {
        const svg = fxSvg(fx, 's', '<g></g><circle/>').firstChild, g = svg.querySelector('g'), c = svg.querySelector('circle'), R = Math.hypot(K.W, K.H), m = Math.min(K.W, K.H);
        let d = ''; const N = 46, rr = K.rand(7 + (o.seed || 0));
        for (let i = 0; i < N; i++) {
          const ang = (i / N + rr() * .02) * Math.PI * 2 + lt * .4, w = (.004 + rr() * .012) * Math.PI, r0 = R * (.16 + rr() * .2) * (1 - .4 * env), r1 = R * (.75 + rr() * .4);
          const pt = (r, an) => `${(x + Math.cos(an) * r).toFixed(1)} ${(y + Math.sin(an) * r).toFixed(1)}`;
          d += `M${pt(r0, ang)}L${pt(r1, ang - w)}L${pt(r1, ang + w)}Z`;
        }
        g.innerHTML = `<path d="${d}"/>`; css(g.firstChild, { fill: col, opacity: (.5 * env).toFixed(3) }); css(g, { filter: `blur(${(m * .006).toFixed(1)}px)`, mixBlendMode: 'screen' });
        c.setAttribute('cx', x.toFixed(1)); c.setAttribute('cy', y.toFixed(1)); c.setAttribute('r', (m * (.25 + .4 * env)).toFixed(1));
        css(c, { fill: col, opacity: (.45 * (lt < 0 ? env : env * env)).toFixed(3), filter: `blur(${(m * .12).toFixed(0)}px)`, mixBlendMode: 'screen' });   // bloom: gone even faster on B
      }
    }, () => [{ kind: 'zoom', t: o.at - .22 }, { kind: 'hit', t: o.at, gain: .7 }]);
  };

  // shared timing/filters for other kit files and films
  T.util = { ramp, springFrom, sigma, about, pivot, dirBlur, zoomBlur };
})();
