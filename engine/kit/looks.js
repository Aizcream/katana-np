/* kit/looks.js — LOOKS: the "styles" of Katana NP (Higgsfield Katana's /styles, rebuilt in code). API: engine/kit/docs/looks.md
   MEDIA looks  K.looks.<name>(parent, { src | clip, … }) → component { el, update(lt), prepare(lt), cues(), dur }
     ascii · glitchVhs · stickerPop · liquid · gridReveal · halftone · duotone · pixelate · rgbSplit
     Each owns a box (x,y = top-left, w,h; default the full frame) holding a canvas (or a DOM grid) that re-renders an image
     (`src`, decoded through K.preload) or a frame sequence (`clip` dir, K.clipFrame) every frame — a pure function of lt.
   GLOBAL looks K.looks.<name>({ … }) → handle; each registers one K.addPost(fn) that draws overlays as direct children of
     #film (z 54–58: above #fx transitions, below #grain, so blend modes reach the whole picture) or sets a CSS filter on
     K.world (grade). Times of global looks are FILM seconds.
     grade · vignette · scanlines · lightLeak · letterbox · cornerBadge · filmBurn
   Deterministic: no Math.random/Date/rAF/CSS animation; per-frame randomness is keyed on the frame index (held across the
   motion-blur shutter, so sub-frames of one frame share it). */
(function () {
  const K = window.K; if (!K) return;
  const E = K.E, clamp = K.clamp, lerp = K.lerp;
  const LK = K.looks = K.looks || {};
  // faces the looks draw with (canvas text needs them decoded before build)
  K.fonts.push('italic 900 100px "Archivo"', '900 100px "Archivo"', '700 100px "Geist Mono"', '900 100px "Inter Tight"');

  /* ================================================================ shared helpers ================================ */
  const un = () => Math.min(K.W, K.H) / 1080;                       // 1 at a 1080 short side
  const th = (k, d) => (K.theme && K.theme[k]) || d;
  const LIME = () => th('accent2', '#D6FF3D');
  const MONO = () => th('mono', '"Geist Mono", ui-monospace, Menlo, monospace');
  const WIDE = '"Archivo", "Inter Tight", sans-serif';
  // lt held at the frame base while capture renders motion-blur sub-frames (footage + glitches step per frame)
  const held = (lt) => (typeof K.t === 'number' && typeof window.__mbBase === 'number' ? lt - (K.t - K.heldTime(K.t)) : lt);
  const frameIdx = (lt) => Math.round(held(lt) * K.fps);
  const hh = (a, b = 0) => K.hash(a * 1.6180339 + b * 31.7071 + 0.1234);   // 2-key hash → [0,1)
  const rgb = (c) => {
    if (Array.isArray(c)) return c; c = String(c).trim();
    if (c[0] === '#') { let h = c.slice(1); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); const n = parseInt(h.slice(0, 6), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
    const m = c.match(/[\d.]+/g); return m ? m.slice(0, 3).map(Number) : [0, 0, 0];
  };
  const rgba = (c, a) => { const [r, g, b] = rgb(c); return `rgba(${r},${g},${b},${a})`; };
  const show = (el, on) => { const v = on ? 'block' : 'none'; if (el.__d !== v) { el.style.display = v; el.__d = v; } };
  const setT = (el, v) => { if (el.__t !== v) { el.style.transform = v; el.__t = v; } };
  const setO = (el, v) => { v = +(+v).toFixed(4); if (el.__o !== v) { el.style.opacity = v; el.__o = v; } };
  const setS = (el, k, v) => { const key = '__' + k; if (el[key] !== v) { el.style[k] = v; el[key] = v; } };

  function box(parent, o, css) {
    const x = o.x ?? 0, y = o.y ?? 0, w = Math.round(o.w ?? K.W), h = Math.round(o.h ?? K.H);
    const el = K.div(parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;overflow:hidden;display:none;${o.z != null ? 'z-index:' + o.z + ';' : ''}${css || ''}`);
    el.__d = 'none'; el.dataset.look = o.__name || 'look';
    return { el, x, y, w, h, P: h > w * 1.05 };
  }
  function canvas(parent, w, h, css) {
    const c = K.el('canvas', `position:absolute;left:0;top:0;width:${w}px;height:${h}px;${css || ''}`, parent);
    c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c;
  }
  function off(w, h, read) {
    const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h));
    c.ctx = c.getContext('2d', read ? { willReadFrequently: true } : undefined); return c;
  }
  // safe-zone insets of the film, expressed inside a look's box (min pad m)
  function safeIn(B, m) {
    const S = K.safe();
    return { l: Math.max(S.left - B.x, m), t: Math.max(S.top - B.y, m), r: Math.max(S.right - (K.W - B.x - B.w), m), b: Math.max(S.bottom - (K.H - B.y - B.h), m) };
  }
  // default width for a big word: `frac` of the box, but never past the side safe zones (centred) on 9:16
  function wordW(B, o, frac) { if (o.wordWidth) return B.w * o.wordWidth; const S = safeIn(B, 0); return Math.min(B.w * frac, B.w - 2 * Math.max(S.l, S.r)); }
  // lifecycle: null before `at` / after the exit; else { a: lt−at, pi: entrance 0→1, po: exit 0→1 }
  function life(o, lt, inD, outD) {
    const at = o.at || 0; if (lt < at) return null;
    let po = 0; if (o.out != null && lt >= o.out) { po = K.p(lt, o.out, o.out + outD); if (po >= 1) return null; }
    return { a: lt - at, pi: K.p(lt, at, at + inD), po };
  }
  // media source (same convention as media.js): { src: 'a.jpg' } still image, or a frame sequence { clip: 'dir' } (or a
  // `src` without an image extension). Footage seconds = in + rate·(lt − at), or in + K.ramp(lt − at, ramp), or time(lt).
  const IMG_EXT = /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i;
  function media(o) {
    const cs = o.clip || (o.src && !IMG_EXT.test(o.src) ? o.src : null);
    const clip = cs ? String(cs).replace(/\/$/, '') : null;
    if (clip) K.clipInfo(clip);
    const url = (lt) => {
      if (!clip) return o.src || null;
      const h = held(lt), d = Math.max(0, h - (o.at || 0)), c0 = o.in ?? o.clipIn ?? 0;
      const sec = typeof o.time === 'function' ? o.time(h) : c0 + (o.ramp ? K.ramp(d, o.ramp) : d * (o.rate ?? 1));
      return K.clipFrame(clip, sec, { loop: o.loop !== false });
    };
    return {
      url, still: !clip,
      prepare: async (lt) => { const s = url(lt); if (s) await K.preload(s); },
      get: (lt) => { const s = url(lt); return s ? K.cached(s) : null; },
    };
  }
  // cover/contain geometry of an image in a w×h box (focus [0..1,0..1], zoom, push = zoom growth per second)
  function geom(img, w, h, o, lt) {
    const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
    const z = (o.zoom || 1) * Math.exp((o.push || 0) * Math.max(0, lt));
    const s = (o.fit === 'contain' ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih)) * z;
    const f = o.focus || [.5, .5], dw = iw * s, dh = ih * s;
    return { x: (w - dw) * f[0], y: (h - dh) * f[1], w: dw, h: dh, s, iw, ih };
  }
  function drawCover(ctx, img, w, h, o, lt) {
    if (!img || !(img.naturalWidth || img.width)) return null;
    const g = geom(img, w, h, o, lt); ctx.drawImage(img, g.x, g.y, g.w, g.h); return g;
  }
  // auto levels: luminance percentiles (lo, hi) of an RGBA buffer → remap fn (stretches dark / flat footage)
  function autoLevels(d, on, plo = .02, phi = .985) {
    if (!on) return (l) => l;
    const hist = new Uint32Array(64), n = d.length / 4;
    for (let i = 0; i < d.length; i += 4) hist[((d[i] * 77 + d[i + 1] * 150 + d[i + 2] * 29) >> 8) >> 2]++;
    let acc = 0, lo = 0, hi = 63; for (let k = 0; k < 64; k++) { acc += hist[k]; if (acc < n * plo) lo = k + 1; if (acc <= n * phi) hi = k + 1; }
    const a = lo / 64, z = Math.max(a + .25, Math.min(1, (hi + 1) / 64)); return (l) => clamp((l - a) / (z - a));
  }
  // shared textures
  let NOISE = null;
  const noiseTex = () => {
    if (NOISE) return NOISE;
    const c = off(512, 256, true), id = c.ctx.createImageData(512, 256), r = K.rand(9137);
    for (let i = 0; i < id.data.length; i += 4) { const v = Math.pow(r(), 1.4) * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; }
    c.ctx.putImageData(id, 0, 0); return (NOISE = c);
  };
  const scanPattern = (ctx, period, dark) => {
    const p = off(2, period); p.ctx.fillStyle = '#fff'; p.ctx.fillRect(0, 0, 2, period);
    p.ctx.fillStyle = `rgb(${dark},${dark},${dark})`; p.ctx.fillRect(0, 0, 2, Math.max(1, Math.round(period / 2)));
    return ctx.createPattern(p, 'repeat');
  };
  // RGB split: dst = Σ channels of src, each drawn (lighter) at its own offset / scale. tmp: scratch canvas of dst size.
  function splitRGB(dst, src, offs, tmp, scales) {
    const c = dst.ctx || dst.getContext('2d'), w = dst.width, h = dst.height, t = tmp.ctx;
    const m = Math.ceil(Math.max(...offs.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1]))))) + 2;
    c.save(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    const cols = ['#f00', '#0f0', '#00f'];
    for (let i = 0; i < 3; i++) {
      t.globalCompositeOperation = 'copy'; t.drawImage(src, 0, 0);
      t.globalCompositeOperation = 'multiply'; t.fillStyle = cols[i]; t.fillRect(0, 0, w, h);
      t.globalCompositeOperation = 'source-over';
      const s = scales ? scales[i] : 1, mw = (w + 2 * m) * s, mh = (h + 2 * m) * s;   // overscan → no empty borders
      c.globalCompositeOperation = 'lighter'; c.drawImage(tmp, (w - mw) / 2 + offs[i][0], (h - mh) / 2 + offs[i][1], mw, mh);
    }
    c.restore();
  }
  // 4-point sparkle (concave star) path centred on (x,y), radius r
  const starD = (x, y, r, k = .2) => `M${x},${y - r}Q${x + r * k},${y - r * k} ${x + r},${y}Q${x + r * k},${y + r * k} ${x},${y + r}Q${x - r * k},${y + r * k} ${x - r},${y}Q${x - r * k},${y - r * k} ${x},${y - r}Z`;
  const starPath = (x, y, r, k) => new Path2D(starD(x, y, r, k));
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  // fit a font size so `text` spans `width` px (canvas measure; fonts are loaded at build)
  const MC = document.createElement('canvas').getContext('2d');
  function fitSize(text, font, width, max, stretch) {
    MC.font = font.replace('{S}', '100px'); MC.fontStretch = stretch || 'normal';
    const w = MC.measureText(text).width || 1; return Math.min(max, 100 * width / w);
  }

  /* ================================================================ ascii ======================================= */
  const RAMP = " .'`^\",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$";
  LK.ascii = (parent, o = {}) => {
    o.__name = 'ascii';
    const U = un(), B = box(parent, o), W = B.w, H = B.h, M = media(o);
    const fg = o.color || LIME(), bg = o.bg || '#060902';
    B.el.style.background = `radial-gradient(ellipse 80% 70% at 50% 45%, ${rgba(fg, .07)} 0%, ${bg} 70%), ${bg}`;
    const cw = Math.max(5, Math.round(o.cell ?? 10 * U)), ch = Math.max(8, Math.round(cw * (o.aspect ?? 1.6)));
    const cols = Math.ceil(W / cw), rows = Math.ceil(H / ch), ox = Math.floor((W - cols * cw) / 2), oy = Math.floor((H - rows * ch) / 2);
    const ramp = o.ramp || RAMP, NG = ramp.length, LV = Math.max(2, o.levels ?? 10);
    const inD = o.inDur ?? .6, outD = o.outDur ?? .4, con = o.contrast ?? 1.25, gam = o.gamma ?? .92, flo = o.floor ?? .1, fl = o.flicker ?? .03;
    const cv = canvas(B.el, W, H), cx = cv.getContext('2d');
    const smp = off(cols, rows, true); smp.ctx.imageSmoothingQuality = 'high';
    // glyph atlas: NG glyphs × LV brightness levels (top levels bloom toward white)
    const atlas = off(NG * cw, LV * ch), ax = atlas.ctx, [fr, fgg, fb] = rgb(fg);
    ax.font = `500 ${Math.round(ch * .78)}px ${MONO()}`; ax.textAlign = 'center'; ax.textBaseline = 'middle';
    for (let l = 0; l < LV; l++) {
      const k = l / (LV - 1), a = lerp(o.dim ?? .2, 1, Math.pow(k, 1.1)), wh = Math.max(0, k - .72) * 1.5;
      ax.fillStyle = `rgba(${Math.round(lerp(fr, 255, wh))},${Math.round(lerp(fgg, 255, wh))},${Math.round(lerp(fb, 255, wh))},${a.toFixed(3)})`;
      for (let g = 1; g < NG; g++) ax.fillText(ramp[g], g * cw + cw / 2, l * ch + ch / 2 + 1);
    }
    const glow = o.glow ?? .7, gl = off(W / 4, H / 4);
    // CRT: scanlines + vignette + rolling band (static CSS + one transform)
    const sl = Math.max(1, Math.round(2 * U)), sp2 = Math.max(2, Math.round(4 * U));
    if (o.scanlines !== false) K.div(B.el, `inset:0;background:repeating-linear-gradient(to bottom, rgba(0,0,0,.32) 0 ${sl}px, transparent ${sl}px ${sp2}px)`);
    K.div(B.el, `inset:0;background:radial-gradient(ellipse 75% 65% at 50% 50%, transparent 55%, rgba(0,0,0,.6) 100%)`);
    const roll = K.div(B.el, `left:0;top:0;width:100%;height:${Math.round(H * .22)}px;background:linear-gradient(to bottom, transparent, ${rgba(fg, .07)} 50%, transparent);mix-blend-mode:screen`);
    const scan = K.div(B.el, `left:0;top:0;width:100%;height:${Math.round(60 * U)}px;background:linear-gradient(to bottom, transparent, ${rgba(fg, .55)} 48%, ${rgba('#ffffff', .85)} 50%, ${rgba(fg, .55)} 52%, transparent);mix-blend-mode:screen;display:none`);
    scan.__d = 'none';
    // optional terminal prompt window (typed command), like the reference "$ claude make motion --style ascii"
    let win = null, line = null, caret = null; const prompt = o.prompt || null;
    const pAt = o.promptAt ?? ((o.at || 0) + .35), cps = o.cps ?? 22;
    if (prompt) {
      const S = safeIn(B, 40 * U), fs = Math.round((o.promptSize ?? 30) * U), py = o.promptY ?? (S.t + 150 * U);
      win = K.div(B.el, `left:${S.l}px;top:${py}px;width:${Math.min(W - S.l - S.r, 900 * U)}px;background:rgba(6,10,2,.9);border:${Math.max(2, 3 * U)}px solid ${fg};border-radius:${14 * U}px;box-shadow:0 0 ${36 * U}px ${rgba(fg, .35)};font:500 ${fs}px/1.25 ${MONO()};color:${fg};padding:${16 * U}px ${22 * U}px ${22 * U}px;box-sizing:border-box;transform-origin:0 0;display:none`);
      win.__d = 'none';
      const bar = K.el('div', `display:flex;gap:${8 * U}px;align-items:center;margin-bottom:${14 * U}px;font-size:${Math.round(fs * .6)}px;color:${rgba(fg, .55)}`, win);
      for (let i = 0; i < 3; i++) K.el('span', `display:inline-block;width:${11 * U}px;height:${11 * U}px;border-radius:50%;background:${rgba(fg, .5 - i * .12)}`, bar);
      K.el('span', `margin-left:${10 * U}px`, bar, o.promptTitle || 'north-pearl — zsh');
      const row = K.el('div', 'white-space:pre;overflow:hidden', win);
      line = K.el('span', '', row); caret = K.el('span', `display:inline-block;width:.6em;height:1.1em;vertical-align:-.18em;background:${fg};margin-left:.08em`, row);
    }
    const lum = new Float32Array(cols * rows);
    return {
      el: B.el, dur: inD,
      prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, inD, outD); show(B.el, !!L); if (!L) return;
        const img = M.get(lt), s = smp.ctx, fi = frameIdx(lt);
        s.setTransform(1, 0, 0, 1, 0, 0); s.fillStyle = '#000'; s.fillRect(0, 0, cols, rows);
        if (img) { s.setTransform(1 / cw, 0, 0, 1 / ch, -ox / cw, -oy / ch); drawCover(s, img, W, H, o, held(lt)); s.setTransform(1, 0, 0, 1, 0, 0); }
        const d = s.getImageData(0, 0, cols, rows).data;
        const lev = autoLevels(d, o.autoLevels !== false);
        for (let i = 0, n = cols * rows; i < n; i++) {
          let l = lev((d[i * 4] * .299 + d[i * 4 + 1] * .587 + d[i * 4 + 2] * .114) / 255);
          l = clamp((l - .5) * con + .5 + (o.bright ?? 0)); l = Math.pow(l, gam); if (o.invert) l = 1 - l;
          lum[i] = flo + (1 - flo) * l;
        }
        cx.clearRect(0, 0, W, H);
        const front = .12 + E.out(1.6)(L.pi) * 1.2, band = .14;
        for (let r = 0; r < rows; r++) {
          const rr = r / rows;
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c, l = lum[i]; let g = Math.round(l * (NG - 1)), lv = Math.round(l * (LV - 1));
            if (L.pi < 1) {                                   // entrance: top→bottom scan, scrambled front
              const dd = front - (rr + hh(i, 3) * .16); if (dd < 0) continue;
              if (dd < band) { g = 1 + Math.floor(hh(i, fi) * (NG - 1)); lv = LV - 1 - Math.floor(hh(i, fi + 9) * 3); }
            }
            if (L.po > 0) { const hv = hh(i, 11); if (hv < L.po) continue; if (hv < L.po + .22) { g = 1 + Math.floor(hh(i, fi) * (NG - 1)); lv = LV - 1; } }
            if (fl > 0 && hh(i, fi * 1.37 + 5) < fl) g = Math.min(NG - 1, Math.max(1, g + 1 + Math.floor(hh(i, fi + 7) * 6) - 3));
            if (g <= 0) continue;
            cx.drawImage(atlas, g * cw, lv * ch, cw, ch, ox + c * cw, oy + r * ch, cw, ch);
          }
        }
        if (glow > 0) {                                        // cheap bloom: quarter-res blurred copy, added
          const gx = gl.ctx; gx.clearRect(0, 0, gl.width, gl.height); gx.filter = `blur(${Math.max(1, 2.5 * U)}px)`; gx.drawImage(cv, 0, 0, gl.width, gl.height); gx.filter = 'none';
          cx.save(); cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = glow; cx.drawImage(gl, 0, 0, W, H); cx.restore();
        }
        const ry = ((held(lt) * .22) % 1.3 - .25) * H; setT(roll, `translateY(${ry.toFixed(1)}px)`);
        if (L.pi < 1) { show(scan, true); setT(scan, `translateY(${((front - band * .5) * H - 30 * U).toFixed(1)}px)`); } else show(scan, false);
        if (win) {
          const wa = lt - pAt; show(win, wa >= 0 && L.po === 0);
          if (wa >= 0) {
            const q = E.snappy(K.p(wa, 0, .35));
            setT(win, `translateY(${((1 - q) * 30 * U).toFixed(1)}px) scale(${(.94 + .06 * q).toFixed(4)})`);
            setS(win, 'clipPath', `inset(0 ${((1 - q) * 100).toFixed(2)}% 0 0)`);
            const t0 = pAt + .3, txt = '$ ' + K.type(prompt, lt, t0, cps); if (line.__s !== txt) { line.textContent = txt; line.__s = txt; }
            setO(caret, K.caretOn(lt, t0 + prompt.length / cps));
          }
        }
      },
      cues() {
        const c = [{ kind: 'glitch', t: o.at || 0, gain: .7 }];
        if (prompt) { const t0 = pAt + .3; for (let i = 0; i < prompt.length; i += 2) c.push({ kind: 'key', t: +(t0 + i / cps).toFixed(3), gain: .35 }); }
        return c;
      },
    };
  };

  /* ================================================================ glitchVhs =================================== */
  LK.glitchVhs = (parent, o = {}) => {
    o.__name = 'glitchVhs';
    const U = un(), B = box(parent, o, 'background:#000'), W = B.w, H = B.h, M = media(o);
    const cv = canvas(B.el, W, H), cx = cv.getContext('2d');
    const base = off(W, H), comp = off(W, H), tmp = off(W, H), noise = noiseTex();
    const amt = o.split ?? 6 * U, inten = o.intensity ?? .45, seed = o.seed ?? 3, inD = o.inDur ?? .5, outD = o.outDur ?? .3;
    const bursts = o.bursts || [], at = o.at || 0;
    const scanP = scanPattern(cx, Math.max(2, Math.round(4 * U)), 168);
    const vg = cx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.hypot(W, H) * .55); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)');
    // big word (drawn INTO the picture, so it gets the split, slices and noise)
    let wfs = 0; const word = o.word || null, wfont = `900 {S} ${WIDE}`, wordAt = o.wordAt ?? at + .3;
    if (word) wfs = o.wordSize ?? fitSize(word, wfont, wordW(B, o, .88), H * .3, 'expanded');
    // OSD (VCR on-screen display)
    const S = safeIn(B, 36 * U), ofs = Math.round((o.osdSize ?? 50) * U);
    const shadow = `0 0 ${7 * U}px rgba(255,255,255,.55), ${2.5 * U}px 0 rgba(255,40,90,.6), ${-2.5 * U}px 0 rgba(40,220,255,.6)`;
    const osd = K.div(B.el, `inset:0;font:700 ${ofs}px/1.12 ${MONO()};color:#F4F4F0;letter-spacing:.02em;text-shadow:${shadow};text-transform:uppercase;white-space:pre`);
    const play = o.play === false ? null : K.div(osd, `left:${S.l}px;top:${S.t}px;display:flex;align-items:center;gap:${.35 * ofs}px`);
    if (play) { K.el('span', '', play, o.play || 'PLAY'); K.el('span', `display:inline-block;width:0;height:0;border-top:${.42 * ofs}px solid transparent;border-bottom:${.42 * ofs}px solid transparent;border-left:${.7 * ofs}px solid #F4F4F0;filter:drop-shadow(${2.5 * U}px 0 rgba(255,40,90,.6)) drop-shadow(${-2.5 * U}px 0 rgba(40,220,255,.6))`, play); }
    const date = o.date ?? "SEP 18 '96", clock = o.clock ?? 'PM 11:58:00';
    const dl = K.div(osd, `left:${S.l}px;bottom:${S.b}px`);
    const tcEl = o.timecode === false ? null : K.div(osd, `right:${S.r}px;bottom:${S.b}px;font-size:${Math.round(ofs * .8)}px`);
    const cm = /(\d+):(\d\d):(\d\d)/.exec(clock), clock0 = cm ? (+cm[1]) * 3600 + (+cm[2]) * 60 + (+cm[3]) : 0;
    const clockAt = (sec) => { if (!cm) return clock; const s = clock0 + Math.floor(sec), h2 = Math.floor(s / 3600) % 24, mm = Math.floor(s / 60) % 60, ss = s % 60; return clock.replace(cm[0], `${h2}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`); };
    const tc = (sec) => { const f = Math.round(sec * K.fps), fps = Math.round(K.fps), ff = f % fps, s = Math.floor(f / fps); return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(ff).padStart(2, '0')}`; };
    const gAt = (lq, fi, a) => {
      let v = inten * (.55 + .45 * (K.noise(lq * 3.1, seed) * .5 + .5));
      v += 1.7 * Math.exp(-Math.max(0, a) * 6.5);
      if (word && lq >= wordAt) v += 1.3 * Math.exp(-(lq - wordAt) * 8);
      for (const b of bursts) if (lq >= b) v += 1.25 * Math.exp(-(lq - b) * 9);
      if (hh(fi, seed + 1) > .93) v += .75;
      if (o.out != null && lq > o.out - .2) v += 2.4 * Math.pow(K.p(lq, o.out - .2, o.out + outD), 2);
      return v;
    };
    return {
      el: B.el, dur: inD, prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, inD, outD); show(B.el, !!L); if (!L) return;
        const fi = frameIdx(lt), lq = fi / K.fps, a = lq - at, G = gAt(lq, fi, a), img = M.get(lt);
        // 1 · base picture: VHS colour (saturated, soft) + word
        const b = base.ctx; b.globalCompositeOperation = 'source-over'; b.fillStyle = '#000'; b.fillRect(0, 0, W, H);
        b.filter = `saturate(${o.saturate ?? 1.4}) contrast(1.12) brightness(1.04) blur(${(.7 * U).toFixed(2)}px)`;
        if (img) drawCover(b, img, W, H, o, held(lt)); b.filter = 'none';
        if (word && lq >= wordAt) {
          const wa = lq - wordAt, s = lerp(1.32, 1, E.snappy(K.p(wa, 0, .3))) * (1 + .03 * Math.exp(-wa * 5) * Math.sin(wa * 40));
          b.save(); b.translate(W / 2 + (hh(fi, 21) - .5) * G * 14 * U, H * (o.wordY ?? .6)); b.scale(s, s);
          b.font = wfont.replace('{S}', wfs + 'px'); b.fontStretch = 'expanded'; b.textAlign = 'center'; b.textBaseline = 'middle';
          b.fillStyle = 'rgba(0,0,0,.3)'; for (let k = 4; k >= 1; k--) b.fillText(word, k * 2.6 * U, k * 3.4 * U);   // hard extruded shadow
          b.fillStyle = 'rgba(0,0,0,.35)'; b.fillText(word, 0, 3 * U);
          b.fillStyle = o.wordColor || LIME(); b.fillText(word, 0, 0); b.restore();
        }
        // 2 · RGB split
        const sp = amt * (1 + G * 2.4), jy = (hh(fi, 4) - .5) * G * 3 * U;
        splitRGB(comp, base, [[sp + hh(fi, 1) * G * 7 * U, jy], [0, 0], [-sp - hh(fi, 2) * G * 7 * U, -jy]], tmp);
        cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; cx.drawImage(comp, 0, 0);
        // 3 · slice displacement (+ tinted slices)
        const n = Math.floor(G * 8 + (hh(fi, 5) > .7 ? 2 : 0));
        for (let k = 0; k < n; k++) {
          const y = hh(fi * 7 + k, 11) * H, sh = (.004 + Math.pow(hh(fi * 7 + k, 12), 2) * .075) * H, dx = (hh(fi * 7 + k, 13) - .5) * 2 * Math.min(1.6, G) * .085 * W;
          cx.drawImage(comp, 0, y, W, sh, dx, y, W, sh);
          if (dx > 0) cx.drawImage(comp, W - dx, y, dx, sh, 0, y, dx, sh); else if (dx < 0) cx.drawImage(comp, 0, y, -dx, sh, W + dx, y, -dx, sh);
          if (hh(fi * 7 + k, 14) > .72) { cx.globalCompositeOperation = 'screen'; cx.fillStyle = ['rgba(255,0,140,.22)', 'rgba(0,230,255,.2)', rgba(LIME(), .2)][k % 3]; cx.fillRect(0, y, W, sh); cx.globalCompositeOperation = 'source-over'; }
        }
        // 4 · tracking band (wavy tear + horizontal static), drifting upward
        if (o.tracking !== false) {
          const bh = H * (.035 + .03 * Math.min(1.5, G)), ty = (1.15 - ((lq * .17 + hh(seed, 1)) % 1.3)) * H, st = Math.max(2, Math.round(3 * U));
          for (let yy = ty; yy < ty + bh; yy += st) { const dx = Math.sin(yy * .045 + lq * 37) * 16 * U * (1 + G); cx.drawImage(comp, 0, yy, W, st, dx, yy, W, st); }
          cx.globalCompositeOperation = 'screen'; cx.globalAlpha = .45;
          cx.drawImage(noise, (fi * 37) % 384, (fi * 53) % 192, 128, 48, 0, ty, W, bh);
          cx.globalAlpha = .7; cx.fillStyle = '#fff'; cx.fillRect(0, ty + bh * .55, W, Math.max(1, 2 * U));
          cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
        }
        // 5 · head-switching noise at the bottom edge
        const hs = Math.round(H * .022), hx = (18 + hh(fi, 31) * 22) * U;
        cx.drawImage(comp, 0, H - hs, W, hs, hx, H - hs, W, hs);
        cx.globalCompositeOperation = 'screen'; cx.globalAlpha = .5; cx.drawImage(noise, (fi * 91) % 384, 0, 128, 24, 0, H - hs, W, hs);
        // 6 · static bars on strong glitches
        if (G > .9) { cx.globalAlpha = Math.min(.75, (G - .9) * .8); const nb = 1 + Math.floor(hh(fi, 41) * 3); for (let k = 0; k < nb; k++) { const y = hh(fi + k * 13, 42) * H, sh = (.006 + hh(fi + k, 43) * .02) * H; cx.drawImage(noise, (fi * 17 + k * 50) % 384, (k * 70) % 200, 128, 24, 0, y, W, sh); } }
        // 7 · grain + scanlines + vignette
        cx.globalCompositeOperation = 'overlay'; cx.globalAlpha = .22; cx.drawImage(noise, (fi * 29) % 256, (fi * 47) % 128, 256, 128, 0, 0, W, H);
        cx.globalCompositeOperation = 'multiply'; cx.globalAlpha = 1; cx.fillStyle = scanP; cx.fillRect(0, 0, W, H);
        cx.globalCompositeOperation = 'source-over'; cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
        // OSD
        const jit = (hh(fi, 51) - .5) * Math.min(G, 1.5) * 10 * U;
        setT(osd, `translateX(${jit.toFixed(1)}px)`);
        const dtxt = date + '\n' + clockAt(Math.max(0, held(lt) - at)); if (dl.__s !== dtxt) { dl.textContent = dtxt; dl.__s = dtxt; }
        if (tcEl) { const s = tc(Math.max(0, held(lt) - at) + (o.tcStart || 0)); if (tcEl.__s !== s) { tcEl.textContent = s; tcEl.__s = s; } }
        if (play) setO(play, G > 1.4 && hh(fi, 61) > .5 ? .25 : 1);
      },
      cues() { const c = [{ kind: 'glitch', t: at, gain: .9 }]; if (word) c.push({ kind: 'hit', t: wordAt, gain: .8 }); for (const b of bursts) c.push({ kind: 'glitch', t: b, gain: .7 }); return c; },
    };
  };

  /* ================================================================ stickerPop ================================== */
  function makeSticker(img, dw, dh, ow) {
    dw = Math.round(dw); dh = Math.round(dh);
    const pad = Math.ceil(ow + 4), c = off(dw + 2 * pad, dh + 2 * pad), x = c.ctx;
    const sil = off(dw, dh, true); sil.ctx.drawImage(img, 0, 0, dw, dh);
    const id = sil.ctx.getImageData(0, 0, dw, dh), d = id.data;            // hard silhouette (alpha ≥ .45 → solid white)
    for (let i = 0; i < d.length; i += 4) { const a = d[i + 3] / 255, s = clamp((a - .3) / .3); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.round(s * 255); }
    sil.ctx.putImageData(id, 0, 0);
    const N = 40;
    for (const r of [ow, ow * .72, ow * .42]) for (let i = 0; i < N; i++) { const a = i / N * Math.PI * 2; x.drawImage(sil, pad + Math.cos(a) * r, pad + Math.sin(a) * r); }
    x.drawImage(img, pad, pad, dw, dh);
    return { c, pad };
  }
  LK.stickerPop = (parent, o = {}) => {
    o.__name = 'stickerPop';
    const U = un(), B = box(parent, o), W = B.w, H = B.h, P = B.P, at = o.at || 0, outD = o.outDur ?? .3;
    const bgc = o.bg || LIME(), pc = o.patternColor || 'rgba(24,32,0,.3)', S = safeIn(B, 40 * U);
    B.el.style.background = bgc;
    const stage = K.div(B.el, 'inset:0;transform-origin:50% 50%');
    if (o.dots !== false) K.div(stage, `left:${-60 * U}px;top:${-60 * U}px;right:${-60 * U}px;bottom:${-60 * U}px;background-image:radial-gradient(circle at center, ${pc} ${2.3 * U}px, transparent ${2.8 * U}px);background-size:${36 * U}px ${36 * U}px`);
    // repeating outlined words + outlined stars
    const pw = o.pattern ?? 'POP!', pfs = Math.round((o.patternSize ?? (P ? .3 : .26)) * Math.min(W, H) * (P ? 1 : 1.1));
    MC.font = `900 ${pfs}px ${WIDE}`; MC.fontStretch = 'expanded'; const ww = MC.measureText(pw).width, stW = pfs * .78, unit = ww + stW + pfs * .24;
    const svg = svgEl('svg', { width: W, height: H, viewBox: `0 0 ${W} ${H}`, style: 'position:absolute;left:0;top:0;overflow:visible' }, stage);
    const rowsN = Math.ceil(H / (pfs * 1.02)) + 1, rowG = [];
    for (let r = 0; r < rowsN; r++) {
      const g = svgEl('g', {}, svg), y = r * pfs * 1.02 + pfs * .48, n = Math.ceil(W / unit) + 3;
      for (let k = -1; k < n; k++) {
        const x0 = k * unit + (r % 2 ? -unit / 2 : 0);
        const t = svgEl('text', { x: x0, y, fill: 'none', stroke: pc, 'stroke-width': Math.max(1.5, 3 * U), 'stroke-linejoin': 'round', style: `font:900 ${pfs}px ${WIDE};font-stretch:125%;letter-spacing:-.01em` }, g); t.textContent = pw;
        svgEl('path', { d: starD(x0 + ww + pfs * .12 + stW / 2, y - pfs * .36, stW * .46, .2), fill: 'none', stroke: pc, 'stroke-width': Math.max(1.5, 3 * U), 'stroke-linejoin': 'round' }, g);
      }
      rowG.push(g);
    }
    // the sticker (white outline baked once the cut-out is decoded)
    const scx = o.sx ?? W * .5, scy = o.sy ?? H * (P ? .5 : .52), ow = (o.outline ?? 16) * U, rot = o.rot ?? -5;
    const fitW = o.fitW ?? W * (P ? .86 : .46), fitH = o.size ?? H * (P ? .56 : .78);
    const holder = K.div(B.el, `left:${scx}px;top:${scy}px;width:0;height:0`);
    const stEl = K.div(holder, 'left:0;top:0;transform-origin:0 0'); let sticker = null;
    const shadow = `drop-shadow(0 ${14 * U}px ${18 * U}px rgba(30,40,0,.35))`;
    // white sparkles
    const spark = svgEl('svg', { width: W, height: H, style: 'position:absolute;left:0;top:0;overflow:visible' }, B.el);
    const SP = (o.sparkles ?? (P ? [[.16, .2, 46], [.86, .36, 34], [.8, .7, 54], [.2, .74, 30]] : [[.2, .22, 46], [.8, .3, 34], [.74, .78, 50], [.3, .8, 28]])).map(([x, y, r], i) => {
      const p = svgEl('path', { d: starD(0, 0, r * U, .18), fill: '#fff', stroke: 'rgba(20,28,0,.85)', 'stroke-width': 3 * U, 'stroke-linejoin': 'round' }, spark); return { p, x: x * W, y: y * H, i };
    });
    // optional word sticker (white with ink outline + hard shadow) and CTA pill
    let wordG = null; const wordAt = o.wordAt ?? at + .32;
    if (o.word) {
      const wfs = o.wordSize ?? fitSize(o.word, `italic 900 {S} ${WIDE}`, W * (o.wordWidth ?? (P ? .56 : .36)), 320 * U, 'expanded');
      const wx = o.wordX ?? W * (P ? .42 : .28), wy = o.wordY ?? H * (P ? .27 : .26);
      wordG = K.div(B.el, `left:${wx}px;top:${wy}px;width:0;height:0`);
      const ws = svgEl('svg', { width: 10, height: 10, style: 'position:absolute;left:0;top:0;overflow:visible' }, wordG);
      const ink = o.wordInk || '#141A05';
      const mk = (dx, dy, fill, stroke, sw) => { const t = svgEl('text', { x: dx, y: dy, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill, stroke, 'stroke-width': sw, 'stroke-linejoin': 'round', 'paint-order': 'stroke', style: `font:italic 900 ${wfs}px ${WIDE};font-stretch:125%;letter-spacing:-.02em` }, ws); t.textContent = o.word; return t; };
      mk(9 * U, 12 * U, ink, ink, 16 * U); mk(0, 0, o.wordColor || '#fff', ink, 16 * U);
    }
    let pill = null; const pillAt = o.pillAt ?? at + .5;
    if (o.pill) {
      const pfs2 = Math.round((o.pillSize ?? 44) * U), py = o.pillY ?? Math.min(H * .8, H - S.b - 50 * U);
      pill = K.div(B.el, `left:${W / 2}px;top:${py}px;width:0;height:0`);
      const inner = K.div(pill, `left:0;top:0;transform:translate(-50%,-50%);white-space:nowrap;background:#0E0F0C;color:${LIME()};font:italic 900 ${pfs2}px/1 ${WIDE};font-stretch:112%;letter-spacing:-.01em;padding:${.42 * pfs2}px ${.8 * pfs2}px;border-radius:999px;box-shadow:0 ${10 * U}px 0 rgba(20,28,0,.35), inset 0 0 0 ${3 * U}px ${rgba(LIME(), .35)}`);
      inner.textContent = o.pill;
      if (o.pillStar !== false) inner.insertAdjacentHTML('beforeend', `<svg width="${.8 * pfs2}" height="${.8 * pfs2}" viewBox="-1 -1 2 2" style="display:inline-block;vertical-align:-.08em;margin-left:.32em"><path d="${starD(0, 0, 1, .2)}" fill="${LIME()}"/></svg>`);
    }
    return {
      el: B.el, dur: .9,
      prepare: async () => {
        if (sticker || !o.src) return; const img = await K.preload(o.src); if (sticker || !img || !img.naturalWidth) return;
        const s = Math.min(fitW / img.naturalWidth, fitH / img.naturalHeight), dw = img.naturalWidth * s, dh = img.naturalHeight * s;
        const st = makeSticker(img, dw, dh, ow); sticker = st.c;
        sticker.style.cssText = `position:absolute;left:${-sticker.width / 2}px;top:${-sticker.height / 2}px;filter:${shadow}`;
        stEl.appendChild(sticker);
      },
      update(lt) {
        const L = life(o, lt, .6, outD); show(B.el, !!L); if (!L) return;
        const a = L.a, ex = E.in(2)(L.po);
        // beat bumps (`hits`, scene-local s): damped scale kick on the sticker, word and pill (the pattern stays put: scaling
        // the big SVG pattern during a hold makes its raster depend on seek order)
        let bump = 0; for (const ht of o.hits || []) if (lt >= ht) bump += Math.exp(-(lt - ht) * 9) * Math.cos((lt - ht) * 26);
        setT(stage, `scale(${lerp(1.14, 1, E.snappy(K.p(a, 0, .45))).toFixed(4)})`);
        rowG.forEach((g, r) => { const dx = ((r % 2 ? 1 : -1) * (a * (o.drift ?? 44) * U)) % unit; g.setAttribute('transform', `translate(${dx.toFixed(1)},0)`); });
        // sticker: pop with overshoot, swing to its angle, then a gentle float
        const q = K.pop(a - .06, 0, .62), ty = (1 - E.snappy(K.p(a, .06, .5))) * H * .12;
        const wob = Math.sin(a * 2.2) * 1.8 * K.p(a, .5, 1.2), fy = Math.sin(a * 1.7) * 9 * U * K.p(a, .5, 1.2);
        const sc = q * (1 - ex) * (1 + .07 * bump), r = lerp(-18, rot, Math.min(1, q)) + wob + ex * 14 - 2.5 * bump;
        show(stEl, sc > .001); setT(stEl, `translate(0px,${(ty + fy).toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${sc.toFixed(4)})`);
        SP.forEach((s) => {
          const d = .32 + s.i * .07, k = K.pop(a, d, .5) * (1 - ex), tw = .78 + .22 * Math.abs(Math.sin(a * 3.1 + s.i * 1.7));
          s.p.setAttribute('transform', `translate(${s.x.toFixed(1)},${s.y.toFixed(1)}) rotate(${(a * 40 + s.i * 25).toFixed(1)}) scale(${(k * tw).toFixed(4)})`);
        });
        if (wordG) { const k = K.pop(lt - wordAt, 0, .55) * (1 - ex), kb = k * (1 + .1 * bump); show(wordG, k > .001); setT(wordG, `rotate(${(lerp(-26, o.wordRot ?? -9, Math.min(1, k)) + 3 * bump).toFixed(2)}deg) scale(${kb.toFixed(4)})`); }
        if (pill) { const k = K.pop(lt - pillAt, 0, .5) * (1 - ex); show(pill, k > .001); setT(pill, `translateY(${((1 - Math.min(1, k)) * 60 * U).toFixed(1)}px) rotate(${lerp(8, o.pillRot ?? -3, Math.min(1, k)).toFixed(2)}deg) scale(${(k * (1 + .05 * bump)).toFixed(4)})`); }
      },
      cues() { const c = [{ kind: 'popxl', t: at + .06 }]; if (o.word) c.push({ kind: 'pop', t: wordAt }); if (o.pill) c.push({ kind: 'pop', t: pillAt, gain: .8 }); for (const ht of o.hits || []) c.push({ kind: 'pop', t: ht, gain: .6 }); return c; },
    };
  };

  /* ================================================================ liquid ====================================== */
  // marching squares over a (gw+1)×(gh+1) scalar grid (cell = st px) → { fill: Path2D (inside > thr), edge: Path2D (contour) }
  function contour(F, gw, gh, st, thr, wantEdge) {
    const fill = new Path2D(), edge = wantEdge ? new Path2D() : null, n = gw + 1, P = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]], X = [null, null, null, null];
    for (let j = 0; j < gh; j++) {
      let run = -1; const y0 = j * st, y1 = y0 + st;
      for (let i = 0; i <= gw; i++) {
        let code = 0, a = 0, b = 0, c = 0, d = 0;
        if (i < gw) { a = F[j * n + i]; b = F[j * n + i + 1]; c = F[(j + 1) * n + i + 1]; d = F[(j + 1) * n + i]; code = (a > thr ? 8 : 0) | (b > thr ? 4 : 0) | (c > thr ? 2 : 0) | (d > thr ? 1 : 0); }
        if (code === 15) { if (run < 0) run = i; continue; }
        if (run >= 0) { fill.rect(run * st, y0, (i - run) * st, st); run = -1; }
        if (i === gw || code === 0) continue;
        const x0 = i * st, x1 = x0 + st;
        P[0][0] = x0; P[0][1] = y0; P[0][2] = a; P[1][0] = x1; P[1][1] = y0; P[1][2] = b; P[2][0] = x1; P[2][1] = y1; P[2][2] = c; P[3][0] = x0; P[3][1] = y1; P[3][2] = d;
        let first = true, nc = 0;
        for (let k = 0; k < 4; k++) {
          const p = P[k], q = P[(k + 1) & 3], pin = p[2] > thr, qin = q[2] > thr;
          if (pin) { if (first) { fill.moveTo(p[0], p[1]); first = false; } else fill.lineTo(p[0], p[1]); }
          if (pin !== qin) {
            const f = (thr - p[2]) / (q[2] - p[2]), xx = p[0] + (q[0] - p[0]) * f, yy = p[1] + (q[1] - p[1]) * f;
            if (first) { fill.moveTo(xx, yy); first = false; } else fill.lineTo(xx, yy);
            X[k] = [xx, yy]; nc++;
          } else X[k] = null;
        }
        fill.closePath();
        if (edge) {
          if (nc === 2) { let s = null; for (let k = 0; k < 4; k++) if (X[k]) { if (!s) { s = X[k]; edge.moveTo(s[0], s[1]); } else edge.lineTo(X[k][0], X[k][1]); } }
          else if (nc === 4) for (let k = 0; k < 4; k++) if (!(P[k][2] > thr)) { const e0 = X[(k + 3) & 3], e1 = X[k]; edge.moveTo(e0[0], e0[1]); edge.lineTo(e1[0], e1[1]); }
        }
      }
    }
    return { fill, edge };
  }
  // Wyvill kernel field of circles {x,y,r} (r = iso radius at thr .25); compact support → fast
  function field(F, gw, gh, st, blobs) {
    F.fill(0); const n = gw + 1;
    for (const bl of blobs) {
      if (bl.r <= .5) continue;
      const R = bl.r / .6084, R2 = R * R, i0 = Math.max(0, Math.floor((bl.x - R) / st)), i1 = Math.min(gw, Math.ceil((bl.x + R) / st)), j0 = Math.max(0, Math.floor((bl.y - R) / st)), j1 = Math.min(gh, Math.ceil((bl.y + R) / st));
      for (let j = j0; j <= j1; j++) { const dy = j * st - bl.y, dy2 = dy * dy; if (dy2 >= R2) continue; for (let i = i0; i <= i1; i++) { const dx = i * st - bl.x, q = 1 - (dx * dx + dy2) / R2; if (q > 0) F[j * n + i] += q * q * q; } }
    }
  }
  function warpWord(dst, src, A, ph, k1, k2, st) {          // 2-axis sine warp of a word canvas (strip copies)
    const w = src.width, h = src.height, t = dst.tmp || (dst.tmp = off(w, h)), tx = t.ctx, x = dst.ctx;
    tx.clearRect(0, 0, w, h); for (let y = 0; y < h; y += st) tx.drawImage(src, 0, y, w, st, Math.sin(y * k1 + ph) * A, y, w, st);
    x.clearRect(0, 0, w, h); for (let xx = 0; xx < w; xx += st) x.drawImage(t, xx, 0, st, h, xx, Math.sin(xx * k2 + ph * 1.3 + 1) * A * .8, st, h);
  }
  LK.liquid = (parent, o = {}) => {
    o.__name = 'liquid';
    const U = un(), B = box(parent, o, `background:${o.bg || '#050505'}`), W = B.w, H = B.h, P = B.P, M = media(o), at = o.at || 0, outD = o.outDur ?? .4;
    const cv = canvas(B.el, W, H), cx = cv.getContext('2d'), col = o.color || LIME(), Sm = Math.min(W, H);
    const st = Math.max(4, Math.round(o.res ?? 7 * U)), gw = Math.ceil(W / st), gh = Math.ceil(H / st), F = new Float32Array((gw + 1) * (gh + 1)), FL = new Float32Array((gw + 1) * (gh + 1));
    const seed = o.seed ?? 7, sp = o.speed ?? 1;
    // overlay blobs frame the subject from the edges (+ a few drops); lens = the gooey window with a lime ring
    const DEF = P
      ? [[-.04, .14, .3], [1.02, .06, .24], [1.06, .5, .2], [-.02, .86, .32], [.92, 1.0, .26], [.14, .58, .07], [.86, .3, .055], [.72, .82, .065], [.3, .97, .09]]
      : [[-.02, .1, .3], [1.0, .02, .26], [1.03, .62, .24], [.02, .95, .3], [.6, 1.05, .2], [.12, .5, .08], [.86, .4, .06], [.4, .88, .07]];
    const blobsDef = (o.blobs || DEF).map(([x, y, r], i) => ({ x, y, r, d: -.04 + hh(i, seed) * .2, i }));
    const lens = o.lens === false ? null : Object.assign({ x: .54, y: P ? .42 : .48, r: P ? .34 : .36 }, o.lens || {});
    const ringW = (o.ring ?? 12) * U, echo = o.echo ?? 3, dim = o.dim ?? .5;
    // "on the beat": blobs swell on every `beatEvery` beat of the film grid (K.bpm / K.beatOffset, film time) by `pulse`,
    // and harder on explicit `pulses` (scene-local s). Starts once the entrance has settled.
    const pulse = o.pulse ?? .1, every = o.beatEvery ?? 1, pulses = o.pulses || [];
    const kick = (d) => (d < 0 ? 0 : (1 - Math.exp(-d * 55)) * Math.exp(-d * 7.5));
    const swellAt = (lt, a) => {
      let s = 0;
      if (pulse > 0 && every > 0 && K.bpm > 0) { const ft = typeof K.t === 'number' ? K.t : lt, sb = K.spb() * every, ph = (((ft - K.beatOffset) % sb) + sb) % sb; s += pulse * kick(ph) * K.p(a, .7, 1.1); }
      for (const p of pulses) s += (pulse > 0 ? pulse : .1) * 1.8 * kick(lt - p);
      return s;
    };
    const blobsAt = (a, lq, ex, sw) => blobsDef.map((b) => {
      const g = K.pop(a, b.d, .7), tt = lq * .7 * sp;
      return { x: (b.x + K.noise(tt + b.i * 3.1, seed + b.i) * .1) * W, y: (b.y + K.noise(tt * .8 + b.i * 5.3, seed + 20 + b.i) * .07) * H, r: b.r * Sm * g * (1 + .1 * K.noise(tt * 1.3 + b.i, seed + 40)) * (1 + sw * (1 + .5 * hh(b.i, seed + 3))) * (1 - ex) };
    });
    const lensAt = (a, lq, ex, sw) => {
      if (!lens) return []; const g = K.pop(a, .03, .75) * (1 - ex) * (1 + sw * .45), tt = lq * .7 * sp, cxp = lens.x * W, cyp = lens.y * H, R = lens.r * Sm * g;
      return [{ x: cxp + K.noise(tt, seed + 61) * .02 * W, y: cyp, r: R },
        { x: cxp + Math.cos(tt * 1.3) * R * .92, y: cyp + Math.sin(tt * 1.3) * R * .8, r: R * .36 * K.pop(a, .2, .7) },
        { x: cxp - Math.cos(tt * .9 + 2) * R * .9, y: cyp + Math.sin(tt * 1.1 + 2) * R * .92, r: R * .3 * K.pop(a, .28, .7) }];
    };
    // warped word
    let wc = null, wcb = null, wd = null, wdb = null, wfs = 0; const wordAt = o.wordAt ?? at + .4;
    if (o.word) {
      wfs = o.wordSize ?? fitSize(o.word, `900 {S} ${WIDE}`, wordW(B, o, .86), Sm * .34, 'expanded');
      MC.font = `900 ${wfs}px ${WIDE}`; MC.fontStretch = 'expanded'; const tw = MC.measureText(o.word).width, pad = wfs * .4;
      const mk = (fill) => { const c = off(tw + pad * 2, wfs * 1.6), x = c.ctx; x.font = `900 ${wfs}px ${WIDE}`; x.fontStretch = 'expanded'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = fill; x.fillText(o.word, c.width / 2, c.height / 2); return c; };
      wc = mk(o.wordColor || '#F2EEFF'); wcb = mk(o.wordEdge || th('accent', '#2B4BFF')); wd = off(wc.width, wc.height); wdb = off(wc.width, wc.height);
    }
    const sparks = (o.sparkles ?? [[.2, .3, 26], [.8, .2, 18], [.7, .66, 22]]).map(([x, y, r], i) => ({ x: x * W, y: y * H, r: r * U, i }));
    return {
      el: B.el, dur: .9, prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, .9, outD); show(B.el, !!L); if (!L) return;
        const a = L.a, lq = held(lt), img = M.get(lt), ex = E.in(2)(L.po), sw = swellAt(lt, a);
        // 1 · picture, dimmed outside the lens
        cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; cx.fillStyle = o.bg || '#050505'; cx.fillRect(0, 0, W, H);
        cx.filter = `brightness(${dim}) saturate(.85)`; if (img) drawCover(cx, img, W, H, o, lq); cx.filter = 'none';
        // 2 · lens: undimmed + magnified picture inside, lime ring
        if (lens) {
          field(FL, gw, gh, st, lensAt(a, lq, ex, sw));
          const C = contour(FL, gw, gh, st, .25, true);
          cx.save(); cx.clip(C.fill);
          if (img) { const m = o.lensZoom ?? 1.08, lx = lens.x * W, ly = lens.y * H; cx.translate(lx, ly); cx.scale(m, m); cx.translate(-lx, -ly); cx.filter = 'saturate(1.12) contrast(1.06)'; drawCover(cx, img, W, H, o, lq); cx.filter = 'none'; }
          cx.restore();
          cx.lineWidth = ringW * (1 + sw * 2); cx.lineCap = 'round'; cx.lineJoin = 'round'; cx.strokeStyle = col; cx.stroke(C.edge);
        }
        // 3 · lime blobs with stepped echo halos (same field, lower thresholds, offset like a trail)
        field(F, gw, gh, st, blobsAt(a, lq, ex, sw));
        for (let k = echo; k >= 1; k--) {
          const C = contour(F, gw, gh, st, .25 * Math.pow(.55, k), false);
          cx.save(); cx.translate(-k * 7 * U, k * 9 * U); cx.fillStyle = rgba(col, .16 + .1 * (echo - k)); cx.fill(C.fill); cx.restore();
        }
        cx.fillStyle = col; cx.fill(contour(F, gw, gh, st, .25, false).fill);
        // 4 · warped word (blue edge copy under a lavender-white face)
        if (wc && lt >= wordAt) {
          const wa = lt - wordAt, q = E.snappy(K.p(wa, 0, .5)), A = lerp(80, o.warp ?? 16, q) * U * (1 - ex) + ex * 90 * U, ph = lq * 2.6 * sp;
          warpWord(wdb, wcb, A * 1.15, ph + .5, .016 / U, .009 / U, Math.max(2, Math.round(3 * U)));
          warpWord(wd, wc, A, ph, .016 / U, .009 / U, Math.max(2, Math.round(3 * U)));
          const s = lerp(1.25, 1, q) * (1 - .3 * ex), wx = W / 2, wy = H * (o.wordY ?? .5);
          cx.save(); cx.globalAlpha = Math.min(1, q * 3) * (1 - ex); cx.translate(wx, wy); cx.scale(s, s);
          cx.drawImage(wdb, -wd.width / 2 + 8 * U, -wd.height / 2 + 4 * U); cx.drawImage(wd, -wd.width / 2, -wd.height / 2); cx.restore();
        }
        // 5 · sparkles
        cx.fillStyle = '#fff';
        for (const s of sparks) { const k = K.pop(a, .35 + s.i * .1, .5) * (1 - ex) * (.75 + .25 * Math.sin(a * 4 + s.i * 2)); if (k <= .01) continue; cx.save(); cx.translate(s.x, s.y); cx.rotate(a * .8 + s.i); cx.scale(k, k); cx.fill(starPath(0, 0, s.r, .18)); cx.restore(); }
      },
      cues() { const c = [{ kind: 'whoosh', t: at, gain: .7 }, { kind: 'pop', t: at + .15, gain: .6 }]; if (o.word) c.push({ kind: 'hit', t: wordAt, gain: .7 }); for (const p of pulses) c.push({ kind: 'pop', t: p, gain: .5 }); return c; },
    };
  };

  /* ================================================================ gridReveal ================================== */
  LK.gridReveal = (parent, o = {}) => {
    o.__name = 'gridReveal';
    const U = un(), B = box(parent, o, `background:${o.bg || '#09090A'}`), W = B.w, H = B.h, P = B.P, M = media(o), at = o.at || 0;
    const cols = o.cols ?? (P ? 4 : 6), rows = o.rows ?? (P ? 7 : 4), gap = o.gap ?? Math.round(10 * U), rad = o.radius ?? 6 * U, seed = o.seed ?? 5;
    const lime = o.tile || LIME(), from = o.from || 'tile', axis = o.axis === 'x' ? 'X' : 'Y', order = o.order || 'random';
    const revD = o.revealDur ?? 1.1, flipD = o.flipDur ?? .42, outD = o.outDur ?? .6, inD = revD;
    const grid = K.div(B.el, `inset:0;perspective:${2400 * U}px;perspective-origin:50% 50%`);
    const cells = [], fs = Math.round(15 * U), cxm = (cols - 1) / 2, cym = (rows - 1) / 2;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = Math.round(c * (W - gap * (cols - 1)) / cols + c * gap), x2 = Math.round((c + 1) * (W - gap * (cols - 1)) / cols + c * gap);
      const y = Math.round(r * (H - gap * (rows - 1)) / rows + r * gap), y2 = Math.round((r + 1) * (H - gap * (rows - 1)) / rows + r * gap);
      const w = x2 - x, h = y2 - y, i = r * cols + c;
      const el = K.div(grid, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-style:preserve-3d`);
      if (from === 'tile') {
        const front = K.div(el, `inset:0;backface-visibility:hidden;background:${lime};border-radius:${rad}px;overflow:hidden;font:500 ${fs}px/1 ${MONO()};color:rgba(10,14,0,.6)`);
        if (o.labels !== false) { K.div(front, `left:${12 * U}px;top:${12 * U}px`, `R${r + 1}·C${c + 1}`); K.div(front, `right:${12 * U}px;bottom:${12 * U}px`, `X${x} Y${y}`); }
        if (hh(i, seed + 3) < (o.stars ?? .3)) { const sz = Math.min(w, h) * .3; front.insertAdjacentHTML('beforeend', `<svg width="${w}" height="${h}" style="position:absolute;left:0;top:0"><path d="${starD(w / 2, h / 2, sz / 2, .16)}" fill="#0E1203"/></svg>`); }
      }
      const back = K.div(el, `inset:0;backface-visibility:hidden;transform:rotate${axis}(180deg);overflow:hidden;border-radius:${rad}px;background:#111`);
      const cvs = canvas(back, w, h);
      if (o.labels !== false) K.div(back, `left:${10 * U}px;top:${10 * U}px;font:500 ${fs}px/1 ${MONO()};color:rgba(255,255,255,.85);background:rgba(0,0,0,.35);padding:${4 * U}px ${6 * U}px;border-radius:${5 * U}px`, `${String.fromCharCode(65 + (c % 26))}${r + 1}`);
      let ord;
      if (order === 'diagonal') ord = (c / Math.max(1, cols - 1) + r / Math.max(1, rows - 1)) / 2 * .85 + hh(i, seed) * .15;
      else if (order === 'rows') ord = (r + c / cols * .7) / rows;
      else if (order === 'center') ord = Math.min(1, Math.hypot((c - cxm) / (cols / 2), (r - cym) / (rows / 2)) / 1.42 * .8 + hh(i, seed) * .2);
      else ord = hh(i, seed);
      // `keep`: tiles that stay lime after the reveal (the reference /grid-mask keeps a graphic lime grid around the subject)
      //   weighted toward the edges so the subject in the middle stays visible
      const dn = clamp(Math.hypot((c - cxm) / Math.max(1, cols / 2), (r - cym) / Math.max(1, rows / 2)) / 1.2);
      const kept = from === 'tile' && hh(i, seed + 17) < (o.keep ?? .2) * (.2 + 1.3 * dn);
      cells.push({ el, cvs, cx: cvs.getContext('2d'), x, y, w, h, i, ord, kept, dn, key: '' });
    }
    // "shuffle" after the reveal: every `shuffleEvery` s one tile flips over. Tile mode alternates covering a picture cell
    // (→ lime) and uncovering a lime one (→ picture), so the grid keeps re-arranging at a constant density; from:'none':
    // a 360° spin. Planned at build (pure): a cell is never re-flipped while it is still turning.
    const shuf = [], ns = o.shuffle ?? 8, sEvery = o.shuffleEvery ?? .3, busy = {}, isLime = cells.map((c) => c.kept);
    for (let k = 0, j = 0; k < ns && j < ns * 12; j++) {
      const cell = Math.floor(hh(j, seed + 9) * cells.length), t = revD + .12 + k * sEvery;
      if (busy[cell] != null && t - busy[cell] < .7) continue;
      if (from === 'tile') { const wantLime = k % 2 === 0; if (isLime[cell] === wantLime || (wantLime && cells[cell].dn < .35 && j < ns * 8)) continue; isLime[cell] = !isLime[cell]; }
      busy[cell] = t; shuf.push({ cell, t }); k++;
    }
    // outlined big word (white stroke over a dark offset stroke, so it reads on lime tiles AND on the picture)
    let wsvg = null; const wordAt = o.wordAt ?? at + revD * .5, wY = o.wordY ?? .5;
    if (o.word) {
      const wfs = o.wordSize ?? fitSize(o.word, `800 {S} ${WIDE}`, wordW(B, o, .9), Math.min(W, H) * .42, 'expanded'), sw = Math.max(2, (o.stroke ?? 6) * U);
      wsvg = svgEl('svg', { width: W, height: H, style: `position:absolute;left:0;top:0;overflow:visible;display:none;transform-origin:50% ${wY * 100}%` }, B.el); wsvg.__d = 'none';
      const mk = (dx, dy, stroke, wdt) => { const t = svgEl('text', { x: W / 2 + dx, y: H * wY + dy, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: 'none', stroke, 'stroke-width': wdt, 'stroke-linejoin': 'round', style: `font:800 ${wfs}px ${WIDE};font-stretch:125%;letter-spacing:-.02em` }, wsvg); t.textContent = o.word; return t; };
      if (o.wordShadow !== false) mk(5 * U, 7 * U, 'rgba(8,10,0,.6)', sw * 1.5);
      mk(0, 0, o.wordColor || '#fff', sw);
    }
    const ease = E.inOut(2.6);
    return {
      el: B.el, dur: revD, prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, inD, outD); show(B.el, !!L); if (!L) return;
        const a = L.a, img = M.get(lt), g = img ? geom(img, W, H, o, held(lt)) : null;
        for (const c of cells) {
          // picture slice on the back face (redrawn only when the frame / zoom changes)
          if (img) { const key = img.src + '|' + g.s.toFixed(5); if (c.key !== key) { c.key = key; c.cx.drawImage(img, (c.x - g.x) / g.s, (c.y - g.y) / g.s, c.w / g.s, c.h / g.s, 0, 0, c.w, c.h); } }
          const d = c.ord * (revD - flipD), f = c.kept ? 0 : ease(K.p(a, d, d + flipD));
          let th2 = 180 * f, lift = Math.sin(f * Math.PI) * 70 * U;
          for (const s of shuf) {
            if (s.cell !== c.i || (o.out != null && at + s.t >= o.out) || a < s.t) continue;
            const e = ease(K.p(a, s.t, s.t + Math.max(.3, flipD))); th2 += (from === 'tile' ? 180 : 360) * e; lift += Math.sin(e * Math.PI) * 55 * U;
          }
          if (L.po > 0) {                                   // exit: picture faces flip back to lime (tile) / to edge-on (none)
            const dd = (1 - c.ord) * .45 * outD, fo = ease(K.p(L.po * outD, dd, dd + Math.min(flipD, outD * .55)));
            if (from !== 'tile') th2 -= 90 * fo; else if (Math.round(th2 / 180) % 2 === 1) th2 -= 180 * fo;
            lift += Math.sin(fo * Math.PI) * 40 * U;
          }
          setT(c.el, `translateZ(${lift.toFixed(1)}px) rotate${axis}(${(axis === 'Y' ? th2 : -th2).toFixed(2)}deg)`);
        }
        if (wsvg) {
          const wa = lt - wordAt; show(wsvg, wa >= 0);
          if (wa >= 0) {                                       // wipe on (left → right) + settle; wipes off on the exit
            const q = E.snappy(K.p(wa, 0, .45)) * (1 - E.in(2)(K.p(L.po, 0, .6))), s = lerp(1.1, 1, E.snappy(K.p(wa, 0, .6)));
            setS(wsvg, 'clipPath', `inset(-20% ${((1 - q) * 100).toFixed(2)}% -20% -5%)`); setT(wsvg, `scale(${s.toFixed(4)})`);
          }
        }
      },
      cues() {
        const c = [{ kind: 'swipe', t: at, gain: .6 }]; for (let k = 0; k < 5; k++) c.push({ kind: 'tick', t: +(at + k * (revD - flipD) / 4 + flipD * .5).toFixed(3), gain: .5 });
        if (o.word) c.push({ kind: 'hit', t: wordAt, gain: .7 });
        for (const s of shuf) if (o.out == null || at + s.t < o.out) c.push({ kind: 'tick', t: +(at + s.t + .1).toFixed(3), gain: .28 });
        return c;
      },
    };
  };

  /* ================================================================ halftone ==================================== */
  LK.halftone = (parent, o = {}) => {
    o.__name = 'halftone';
    const U = un(), mode = o.mode || 'mono', paper = o.bg || (mode === 'mono' ? th('bg', '#F2F2EF') : '#0A0A0A');
    const B = box(parent, o, `background:${paper}`), W = B.w, H = B.h, M = media(o), at = o.at || 0, inD = o.inDur ?? .8, outD = o.outDur ?? .4;
    const cv = canvas(B.el, W, H), cx = cv.getContext('2d'), ink = o.color || th('fg', '#111214');
    const cell0 = o.cell ?? 18 * U, ang = (o.angle ?? 45) * Math.PI / 180, con = o.contrast ?? 1.2, gam = o.gamma ?? 1, res = o.resolve ?? 2.6;
    const sw = Math.ceil(W / (6 * U)), sh = Math.ceil(H / (6 * U)), smp = off(sw, sh, true); smp.ctx.imageSmoothingQuality = 'high';
    const mask = mode === 'color' ? off(W, H) : null;
    return {
      el: B.el, dur: inD, prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, inD, outD); show(B.el, !!L); if (!L) return;
        const img = M.get(lt), a = L.a, s = smp.ctx;
        s.fillStyle = '#fff'; s.fillRect(0, 0, sw, sh);
        if (img) { s.save(); s.scale(sw / W, sh / H); drawCover(s, img, W, H, o, held(lt)); s.restore(); }
        const d = s.getImageData(0, 0, sw, sh).data, lev = autoLevels(d, o.autoLevels !== false);
        // cell size: resolves from `resolve`× bigger to its final size (stepped, like a print screen re-rasterising)
        const rq = Math.round(E.snappy(K.p(a, 0, inD)) * 6) / 6, cell = cell0 * lerp(res, 1, rq) * lerp(1, res, E.in(2)(L.po));
        const ca = Math.cos(ang), sa = Math.sin(ang), R = Math.hypot(W, H) / 2, n = Math.ceil(R / cell) + 1, cxw = W / 2, cyh = H / 2;
        const path = new Path2D(), sweep = lerp(.08, 1.25, E.soft(K.p(a, 0, inD)));
        for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
          const u = i * cell, v = j * cell, x = cxw + u * ca - v * sa, y = cyh + u * sa + v * ca;
          if (x < -cell || y < -cell || x > W + cell || y > H + cell) continue;
          const px = clamp(Math.floor(x / W * sw), 0, sw - 1), py = clamp(Math.floor(y / H * sh), 0, sh - 1), k = (py * sw + px) * 4;
          let l = lev((d[k] * .299 + d[k + 1] * .587 + d[k + 2] * .114) / 255); l = Math.pow(clamp((l - .5) * con + .5), gam);
          let v2 = mode === 'mono' ? 1 - l : l; if (o.invert) v2 = 1 - v2;
          const grow = clamp((sweep - (x / W * .35 + y / H * .65) + .25) / .25);   // diagonal grow-in
          const r = cell * .5 * Math.sqrt(v2) * 1.32 * grow * (1 - L.po * .4);
          if (r < .4) continue;
          path.moveTo(x + r, y); path.arc(x, y, r, 0, Math.PI * 2);
        }
        if (mode === 'color' && img) {
          const m = mask.ctx; m.globalCompositeOperation = 'source-over'; m.clearRect(0, 0, W, H); m.fillStyle = '#fff'; m.fill(path);
          m.globalCompositeOperation = 'source-in'; m.filter = `saturate(${o.saturate ?? 1.5}) brightness(1.15)`; drawCover(m, img, W, H, o, held(lt)); m.filter = 'none';
          cx.clearRect(0, 0, W, H); cx.drawImage(mask, 0, 0);
        } else { cx.clearRect(0, 0, W, H); cx.fillStyle = ink; cx.fill(path); }
      },
      cues() { return [{ kind: 'swipe', t: at, gain: .5 }]; },
    };
  };

  /* ================================================================ duotone ===================================== */
  LK.duotone = (parent, o = {}) => {
    o.__name = 'duotone';
    const B = box(parent, o, 'background:#000'), W = B.w, H = B.h, M = media(o), at = o.at || 0, inD = o.inDur ?? .7, outD = o.outDur ?? .45;
    const cv = canvas(B.el, W, H), cx = cv.getContext('2d'), orig = off(W, H, true), duo = off(W, H);
    const dark = rgb(o.dark || '#1A1F7A'), light = rgb(o.light || LIME()), mid = o.mid ? rgb(o.mid) : null, con = o.contrast ?? 1.25, gam = o.gamma ?? 1;
    const LUT = new Uint8ClampedArray(256 * 3);
    for (let i = 0; i < 256; i++) {
      const l = Math.pow(clamp((i / 255 - .5) * con + .5), gam);
      for (let c = 0; c < 3; c++) LUT[i * 3 + c] = mid ? (l < .5 ? lerp(dark[c], mid[c], l * 2) : lerp(mid[c], light[c], l * 2 - 1)) : lerp(dark[c], light[c], l);
    }
    let key = '', id = null;
    const ang = (o.wipeAngle ?? 18) * Math.PI / 180;
    return {
      el: B.el, dur: inD, prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, inD, outD); show(B.el, !!L); if (!L) return;
        const img = M.get(lt), hl = held(lt);
        const k2 = img ? img.src + '|' + (o.push ? hl.toFixed(3) : '') : '';
        if (img && k2 !== key) {                                    // recompute only when the source frame changes
          key = k2; const oc = orig.ctx; oc.fillStyle = '#000'; oc.fillRect(0, 0, W, H); drawCover(oc, img, W, H, o, hl);
          const src = oc.getImageData(0, 0, W, H), s = src.data; if (!id) id = duo.ctx.createImageData(W, H); const dd = id.data;
          for (let i = 0; i < s.length; i += 4) { const q = ((s[i] * 77 + s[i + 1] * 150 + s[i + 2] * 29) >> 8) * 3; dd[i] = LUT[q]; dd[i + 1] = LUT[q + 1]; dd[i + 2] = LUT[q + 2]; dd[i + 3] = 255; }
          duo.ctx.putImageData(id, 0, 0);
        }
        cx.drawImage(duo, 0, 0);
        // entrance: a light bar sweeps the colour photo into duotone; exit sweeps it back
        const p = o.wipe === false ? 1 : E.inOut(1.7)(K.p(L.a, 0, inD)) * (1 - E.inOut(1.7)(L.po));
        if (p < 1) {
          const ext = Math.hypot(W, H), bw = (o.bar ?? 46) * un(), hx = W / 2 * Math.abs(Math.cos(ang)) + H / 2 * Math.abs(Math.sin(ang)) + bw * 2.2, x0 = lerp(-hx, hx, p);
          cx.save(); cx.translate(W / 2, H / 2); cx.rotate(ang);
          cx.beginPath(); cx.rect(x0, -ext, ext * 2, ext * 2); cx.clip();
          cx.rotate(-ang); cx.translate(-W / 2, -H / 2); cx.drawImage(orig, 0, 0); cx.restore();
          if (bw > 0) {                                           // bold light bar + a thin trailing line (graphic wipe edge)
            cx.save(); cx.translate(W / 2, H / 2); cx.rotate(ang); cx.fillStyle = rgba(light, 1);
            cx.fillRect(x0 - bw, -ext, bw, ext * 2); cx.fillRect(x0 - bw * 1.75, -ext, bw * .22, ext * 2); cx.restore();
          }
        }
      },
      cues() { return [{ kind: 'swipe', t: at, gain: .6 }]; },
    };
  };

  /* ================================================================ pixelate ==================================== */
  LK.pixelate = (parent, o = {}) => {
    o.__name = 'pixelate';
    const U = un(), B = box(parent, o, 'background:#000'), W = B.w, H = B.h, M = media(o), at = o.at || 0;
    const inD = o.inDur ?? .6, outD = o.outDur ?? .5, from = o.from ?? 72 * U, to = o.to ?? 1, outTo = o.outTo ?? from, steps = o.steps ?? 7, hold = o.hold || 0;
    const cv = canvas(B.el, W, H), cx = cv.getContext('2d'), sm = off(Math.ceil(W / 2) + 4, Math.ceil(H / 2) + 4);
    const blockAt = (L) => {
      if (hold) return hold;
      let b = to;
      if (L.pi < 1) { const q = Math.floor(E.out(2)(L.pi) * steps) / steps; b = Math.exp(lerp(Math.log(from), Math.log(to), q)); }
      if (L.po > 0) { const q = Math.ceil(E.in(2)(L.po) * steps) / steps; b = Math.exp(lerp(Math.log(to), Math.log(outTo), q)); }
      return Math.max(1, Math.round(b));
    };
    return {
      el: B.el, dur: inD, prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, inD, outD); show(B.el, !!L); if (!L) return;
        const img = M.get(lt), b = blockAt(L);
        cx.imageSmoothingEnabled = true; cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
        if (!img) return;
        if (b <= 1) { drawCover(cx, img, W, H, o, held(lt)); return; }
        // centre-aligned blocks: downsample (averaging) then nearest-neighbour upsample
        const nx = Math.ceil(W / b / 2) * 2 + 2, ny = Math.ceil(H / b / 2) * 2 + 2, ox = (W - nx * b) / 2, oy = (H - ny * b) / 2, s = sm.ctx;
        s.imageSmoothingEnabled = true; s.imageSmoothingQuality = 'high'; s.fillStyle = '#000'; s.fillRect(0, 0, nx, ny);
        s.save(); s.scale(1 / b, 1 / b); s.translate(-ox, -oy); drawCover(s, img, W, H, o, held(lt)); s.restore();
        cx.imageSmoothingEnabled = false; cx.drawImage(sm, 0, 0, nx, ny, ox, oy, nx * b, ny * b); cx.imageSmoothingEnabled = true;
        if (o.grid && b >= 8) { cx.strokeStyle = 'rgba(0,0,0,.18)'; cx.lineWidth = 1; cx.beginPath(); for (let x = ox; x < W; x += b) { cx.moveTo(Math.round(x) + .5, 0); cx.lineTo(Math.round(x) + .5, H); } for (let y = oy; y < H; y += b) { cx.moveTo(0, Math.round(y) + .5); cx.lineTo(W, Math.round(y) + .5); } cx.stroke(); }
      },
      cues() { return [{ kind: 'glitch', t: at, gain: .5 }]; },
    };
  };

  /* ================================================================ rgbSplit ==================================== */
  LK.rgbSplit = (parent, o = {}) => {
    o.__name = 'rgbSplit';
    const U = un(), B = box(parent, o, 'background:#000'), W = B.w, H = B.h, M = media(o), at = o.at || 0, inD = o.inDur ?? .5, outD = o.outDur ?? .3;
    const cv = canvas(B.el, W, H), base = off(W, H), tmp = off(W, H), dst = { ctx: cv.getContext('2d'), width: W, height: H };
    const amt = o.amount ?? 10 * U, ang = (o.angle ?? 0) * Math.PI / 180, burst = o.burst ?? 5, zc = o.zoom2 ?? .006, jit = o.jitter ?? .35, pulses = o.pulses || [], seed = o.seed ?? 2;
    return {
      el: B.el, dur: inD, prepare: M.prepare,
      update(lt) {
        const L = life(o, lt, inD, outD); show(B.el, !!L); if (!L) return;
        const img = M.get(lt), fi = frameIdx(lt), a = L.a;
        const b = base.ctx; b.fillStyle = '#000'; b.fillRect(0, 0, W, H); if (img) drawCover(b, img, W, H, o, held(lt));
        let k = 1 + burst * Math.exp(-a * 7) + jit * (hh(fi, seed) - .5) * 2;
        for (const p of pulses) if (lt >= p) k += burst * .8 * Math.exp(-(lt - p) * 9);
        k += burst * 1.5 * E.in(2)(L.po);
        const d = amt * k, dx = Math.cos(ang) * d, dy = Math.sin(ang) * d, z = zc * k;
        splitRGB(dst, base, [[dx, dy], [0, 0], [-dx, -dy]], tmp, [1 + z, 1, 1 - z]);
      },
      cues() { const c = [{ kind: 'glitch', t: at, gain: .6 }]; for (const p of pulses) c.push({ kind: 'hit', t: p, gain: .6 }); return c; },
    };
  };

  /* ================================================================ GLOBAL looks ================================ */
  // overlay node: direct child of #film (not of #fx: fx is an isolated stacking context, blend modes would not reach the
  // picture). Created lazily on the first frame (K.film exists after K.start).
  function gNode(z, css) { const e = K.el('div', `position:absolute;left:0;top:0;width:${K.W}px;height:${K.H}px;pointer-events:none;z-index:${z};display:none;${css || ''}`, K.film); e.__d = 'none'; return e; }
  // window envelope for global looks: t0/t1 (film s, default whole film), fadeIn/fadeOut (s), mix (0–1)
  function env(o, t) {
    const t0 = o.t0 ?? 0, t1 = o.t1 ?? 1e9; if (t < t0 || t >= t1) return 0;
    let e = 1; if (o.fadeIn) e = Math.min(e, E.sine(K.p(t, t0, t0 + o.fadeIn))); if (o.fadeOut) e = Math.min(e, 1 - E.sine(K.p(t, t1 - o.fadeOut, t1)));
    return e * (o.mix ?? 1);
  }

  // grade: CSS filter on K.world (contrast/saturate/brightness/hue) + warm wash (soft-light) + lift (screen) overlays
  // Several grade() handles (e.g. one per section) COMPOSE: the first registered handle clears the shared filter list each
  // frame, every handle appends its own filter while its window is open, and K.world gets the joined list.
  const GRADES = [];
  LK.grade = (o = {}) => {
    const h = { kind: 'grade', o, nodes: {} }; GRADES.push(h);
    K.addPost((t) => {
      if (GRADES[0] === h) GRADES.parts = [];
      const m = env(o, t), c = 1 + ((o.contrast ?? 1.08) - 1) * m, s = 1 + ((o.saturate ?? 1.12) - 1) * m, b = 1 + ((o.brightness ?? 1) - 1) * m, hue = (o.hue ?? 0) * m;
      const f = m > 0 ? `contrast(${c.toFixed(3)}) saturate(${s.toFixed(3)}) brightness(${b.toFixed(3)})${hue ? ` hue-rotate(${hue.toFixed(1)}deg)` : ''}` : '';
      if (o.target === 'backdrop') {
        const n = h.nodes.bd || (h.nodes.bd = gNode(54, '')); show(n, m > 0); if (m > 0) { setS(n, 'backdropFilter', f); setS(n, 'webkitBackdropFilter', f); }
      } else {
        if (f) GRADES.parts.push(f);
        const all = GRADES.parts.join(' ');
        if (K.world.__lkf !== all) { K.world.style.filter = all; K.world.__lkf = all; }
      }
      const warm = o.warm || 0;
      if (warm) { const n = h.nodes.w || (h.nodes.w = gNode(54, `background:${warm > 0 ? (o.warmColor || '#FF8A2E') : (o.coolColor || '#2E7BFF')};mix-blend-mode:soft-light`)); show(n, m > 0); setO(n, Math.min(1, Math.abs(warm) * .6 * m)); }
      const lift = o.lift || 0;
      if (lift) { const tint = rgb(o.liftColor || '#FFEEDC'), n = h.nodes.l || (h.nodes.l = gNode(54, 'mix-blend-mode:screen')); show(n, m > 0); setS(n, 'background', `rgb(${tint.map((v) => Math.round(v * lift * m)).join(',')})`); }
    });
    return h;
  };

  LK.vignette = (o = {}) => {
    const h = { kind: 'vignette', o, el: null };
    K.addPost((t) => {
      if (!h.el) { const a = o.amount ?? .55, s = o.size ?? .5, c = o.color || '#000'; h.el = gNode(o.z ?? 55, `background:radial-gradient(ellipse farthest-corner at 50% ${(o.cy ?? .5) * 100}%, ${rgba(c, 0)} ${s * 100}%, ${rgba(c, a * .5)} ${(s + (1 - s) * .55) * 100}%, ${rgba(c, a)} 100%)`); }
      const m = env(o, t); show(h.el, m > 0); setO(h.el, m);
    });
    return h;
  };

  LK.scanlines = (o = {}) => {
    const h = { kind: 'scanlines', o, el: null, band: null };
    K.addPost((t) => {
      const U = un(), per = Math.max(2, Math.round((o.gap ?? 4) * U)), thk = Math.max(1, Math.round(per * (o.thickness ?? .5)));
      if (!h.el) {
        h.el = gNode(o.z ?? 55, `background:repeating-linear-gradient(to bottom, rgba(0,0,0,${o.opacity ?? .2}) 0 ${thk}px, transparent ${thk}px ${per}px);mix-blend-mode:${o.blend || 'multiply'}`);
        if (o.roll !== false) h.band = gNode(o.z ?? 55, `height:${Math.round(K.H * .2)}px;background:linear-gradient(to bottom, transparent, rgba(255,255,255,${o.rollOpacity ?? .07}), transparent);mix-blend-mode:overlay`);
      }
      const m = env(o, t), fi = Math.round(t * K.fps);
      show(h.el, m > 0); setO(h.el, m * (1 - (o.flicker ?? .12) * hh(fi, 77)));
      if (h.band) { show(h.band, m > 0); setO(h.band, m); setT(h.band, `translateY(${(((t * (o.rollSpeed ?? .25)) % 1.3 - .2) * K.H).toFixed(1)}px)`); }
    });
    return h;
  };

  // light leak: warm gradient blobs drifting on noise, screen blend. Window t0/t1 (breathing), or a pulse at `at` (dur).
  LK.lightLeak = (o = {}) => {
    const h = { kind: 'lightLeak', o, els: [] }, seed = o.seed ?? 1, side = o.side || 'left';
    const cols = o.colors || ['#FF5A1F', '#FFB347', '#FF2E6A'], n = o.blobs ?? 3;
    const anchor = { left: [.02, .38], right: [.98, .42], top: [.5, .02], bottom: [.5, .98], tl: [.04, .06], tr: [.96, .06], bl: [.04, .94], br: [.96, .94] }[side] || [.02, .38];
    const envAt = (t) => {
      if (o.at != null) { const d = o.dur ?? 1.4; return E.sine(K.p(t, o.at - d * .4, o.at)) * (1 - E.sine(K.p(t, o.at, o.at + d * .6))); }
      const t0 = o.t0 ?? 0, t1 = o.t1 ?? 1e9, f = o.fade ?? .5; if (t < t0 || t >= t1) return 0;
      return Math.min(E.sine(K.p(t, t0, t0 + f)), 1 - E.sine(K.p(t, t1 - f, t1))) * (.72 + .28 * (K.noise(t * .9, seed + 5) * .5 + .5));
    };
    K.addPost((t) => {
      const D = Math.max(K.W, K.H) * (o.size ?? .95);
      if (!h.els.length) for (let i = 0; i < n; i++) { const c = cols[i % cols.length]; h.els.push(gNode(o.z ?? 54, `width:${D}px;height:${D}px;border-radius:50%;background:radial-gradient(circle at 50% 50%, ${rgba(c, 1)} 0%, ${rgba(c, .78)} 18%, ${rgba(c, .32)} 40%, ${rgba(c, .08)} 58%, ${rgba(c, 0)} 70%);mix-blend-mode:screen`)); }
      const e = envAt(t) * (o.intensity ?? .85), sp = o.speed ?? .5;
      h.els.forEach((el, i) => {
        show(el, e > .002); if (e <= .002) return;
        const x = (anchor[0] + K.noise(t * sp + i * 3.7, seed + i) * .22 + (i - 1) * .06) * K.W - D / 2, y = (anchor[1] + K.noise(t * sp * .8 + i * 5.1, seed + 11 + i) * .26 + (i - 1) * .18) * K.H - D / 2;
        setT(el, `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${(.8 + .25 * (K.noise(t * sp * 1.3 + i, seed + 31) * .5 + .5) + i * .08).toFixed(4)})`);
        setO(el, Math.min(1, e * (i === 0 ? 1 : .8)));
      });
    });
    h.cues = () => (o.at != null ? [{ kind: 'whoosh', t: o.at - (o.dur ?? 1.4) * .3, gain: .4 }] : []);
    return h;
  };

  // letterbox: two bars that slide in at `at` (E.snappy) and out at `out`. size px, or ratio = visible window W/H.
  LK.letterbox = (o = {}) => {
    const h = { kind: 'letterbox', o, top: null, bot: null };
    K.addPost((t) => {
      const P = K.H > K.W * 1.05, bh = Math.round(o.size ?? (o.ratio ? Math.max(0, (K.H - K.W / o.ratio) / 2) : (P ? K.H * .11 : (K.H - K.W / 2.39) / 2)));
      if (!h.top) {
        const c = o.color || '#000';
        h.top = gNode(o.z ?? 56, `height:${bh}px;background:${c};${o.edge ? `border-bottom:${Math.max(2, Math.round(4 * un()))}px solid ${o.edge};box-sizing:border-box` : ''}`);
        h.bot = gNode(o.z ?? 56, `top:${K.H - bh}px;height:${bh}px;background:${c};${o.edge ? `border-top:${Math.max(2, Math.round(4 * un()))}px solid ${o.edge};box-sizing:border-box` : ''}`);
      }
      const at = o.at ?? 0, inD = o.inDur ?? .5, outD = o.outDur ?? .4;
      let q = E.snappy(K.p(t, at, at + inD)); if (o.out != null) q *= 1 - E.in(3)(K.p(t, o.out, o.out + outD));
      const vis = t >= at && q > .001; show(h.top, vis); show(h.bot, vis);
      setT(h.top, `translateY(${(-(1 - q) * (bh + 8)).toFixed(1)}px)`); setT(h.bot, `translateY(${((1 - q) * (bh + 8)).toFixed(1)}px)`);
    });
    h.cues = () => [{ kind: 'bars', t: o.at ?? 0, gain: .5 }];
    return h;
  };

  // corner badge: "NORTH PEARL / KATANA" — lime box over black box, italic heavy caps, top-right inside the safe zone
  LK.cornerBadge = (o = {}) => {
    const h = { kind: 'cornerBadge', o, el: null }, pos = o.pos || 'tr', right = pos.includes('r');
    K.addPost((t) => {
      const U = un() * (o.scale ?? 1), fs = Math.round((o.size ?? 52) * U), fs2 = Math.round(fs * (o.ratio2 ?? .84)), S = K.safe();
      if (!h.el) {
        const bottom = pos.includes('b');
        h.el = gNode(o.z ?? 57, `width:auto;height:auto;${right ? `right:${S.right + (o.dx || 0)}px;left:auto` : `left:${S.left + (o.dx || 0)}px`};${bottom ? `top:auto;bottom:${S.bottom + (o.dy || 0)}px` : `top:${S.top + (o.dy || 0)}px`};flex-direction:column;align-items:${right ? 'flex-end' : 'flex-start'};font:italic 900 ${fs}px/1 ${WIDE};font-stretch:${o.stretch ?? 84}%;letter-spacing:-.01em;word-spacing:.06em;text-transform:uppercase;transform-origin:${right ? '100% 0' : '0 0'}`);
        const ol = o.outline ? `box-shadow:0 0 0 ${Math.max(2, Math.round(3 * U))}px ${o.outline === true ? '#0B0B0B' : o.outline};` : '';
        const mk = (txt, bg, fg, mr, f) => { const b = K.el('div', `position:relative;font-size:${f}px;background:${bg};color:${fg};padding:${.09 * f}px ${.2 * f}px ${.04 * f}px ${.16 * f}px;white-space:nowrap;${ol}${right ? `margin-right:${mr}px` : `margin-left:${mr}px`}`, h.el); b.textContent = txt; return b; };
        h.b1 = mk(o.line1 ?? 'NORTH PEARL', o.color || LIME(), o.ink || '#0B0B0B', 0, fs);
        h.b2 = mk(o.line2 ?? 'KATANA', o.color2 || '#0B0B0B', o.ink2 || '#FFFFFF', .2 * fs, fs2);
        if (o.counter) { h.c = K.el('div', `font:500 ${Math.round(fs * .36)}px/1 ${MONO()};font-style:normal;letter-spacing:.04em;color:${o.counterColor || th('accent3', '#FF4D2E')};margin-top:${.22 * fs}px;${right ? `margin-right:${.2 * fs}px` : ''}`, h.el); h.c.textContent = o.counter; }
      }
      const at = o.at ?? .15, on = env(o, t) > 0 && t >= at;
      const dv = on ? 'flex' : 'none'; if (h.el.__d !== dv) { h.el.style.display = dv; h.el.__d = dv; } if (!on) return;
      [h.b1, h.b2, h.c].forEach((b, i) => {
        if (!b) return;
        let q = E.snappy(K.p(t, at + i * .07, at + i * .07 + .42)); if (o.out != null) q *= 1 - E.in(3)(K.p(t, o.out + (2 - i) * .05, o.out + (2 - i) * .05 + .3));
        setS(b, 'visibility', q > .002 ? 'visible' : 'hidden');   // the -10% clip margin would leave outline slivers at q = 0
        setS(b, 'clipPath', right ? `inset(-10% -10% -10% ${((1 - q) * 100).toFixed(2)}%)` : `inset(-10% ${((1 - q) * 100).toFixed(2)}% -10% -10%)`);
        setT(b, `translateX(${((right ? 1 : -1) * (1 - q) * 40 * U).toFixed(1)}px) skewX(${(-(1 - q) * 12).toFixed(2)}deg)`);
      });
      let k = 1; for (const ht of o.hits || []) if (t >= ht) k += .09 * Math.exp(-(t - ht) * 10) * Math.cos((t - ht) * 22);
      setT(h.el, `scale(${k.toFixed(4)})`);
    });
    h.cues = () => [{ kind: 'swipe', t: o.at ?? .15, gain: .35 }];
    return h;
  };

  // film burn: warm light blooms across the frame and peaks (near-white) ON `at` — hides a cut
  LK.filmBurn = (o = {}) => {
    const at = o.at ?? 1, dur = o.dur ?? .6, I = o.intensity ?? 1, from = o.from || 'left', h = { kind: 'filmBurn', o, els: null };
    const cols = o.colors || ['#FF4A12', '#FF9A3C', '#FFD27A'];
    K.addPost((t) => {
      const D = Math.max(K.W, K.H) * 1.25, t0 = at - dur * .45, t1 = at + dur * .55;
      if (!h.els) {
        h.els = cols.map((c) => gNode(o.z ?? 56, `width:${D}px;height:${D}px;border-radius:50%;background:radial-gradient(circle, ${rgba(c, 1)} 0%, ${rgba(c, .7)} 22%, ${rgba(c, .2)} 46%, ${rgba(c, 0)} 64%);mix-blend-mode:screen`));
        h.flash = gNode(o.z ?? 56, `background:radial-gradient(ellipse 80% 70% at 50% 50%, ${o.core || '#FFF6E2'} 0%, ${rgba(cols[1], .95)} 55%, ${rgba(cols[0], .9)} 100%);mix-blend-mode:screen`);
      }
      const vis = t >= t0 && t < t1; h.els.forEach((e) => show(e, vis)); show(h.flash, vis); if (!vis) return;
      const e = t < at ? E.in(2)(K.p(t, t0, at)) : 1 - E.out(2)(K.p(t, at, t1)), p = E.glide(K.p(t, t0, t1));
      const dir = from === 'right' ? -1 : 1;
      h.els.forEach((el, i) => {
        const x0 = from === 'center' ? .5 : (dir > 0 ? -.4 - i * .12 : 1.4 + i * .12), x1 = from === 'center' ? .5 : (dir > 0 ? 1.3 + i * .1 : -.3 - i * .1);
        const x = lerp(x0, x1, p) * K.W - D / 2, y = (.5 + (i - 1) * .22 + K.noise(t * 2 + i, 9 + i) * .08) * K.H - D / 2, s = .7 + e * .7 + i * .1;
        setT(el, `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) scale(${s.toFixed(4)})`); setO(el, Math.min(1, e * 1.3 * I));
      });
      setO(h.flash, Math.min(1, Math.pow(e, 2.2) * .95 * I));
    });
    h.cues = () => [{ kind: 'whoosh', t: at - dur * .3, gain: .6 }, { kind: 'hit', t: at, gain: .4 }];
    return h;
  };
})();
