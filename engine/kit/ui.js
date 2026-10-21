/* kit/ui.js — product / UI mockups (family "ui"). API reference: engine/kit/docs/ui.md
   K.kit.phone · browser · laptop · searchBar · cursor · chip · chipCloud · card · ticker · badge · label · lighthouse ·
   notification · player · button.   Every component: (parent, opts) → { el, update(lt), prepare?, cues(), dur, … }.
   Pure functions of scene-local time lt; no clocks, no CSS transitions; discrete events through K.TQ.
   Animatable numeric options accept a number, keyframes [[t, v], [t, v, ease]…] (scene-local, K.kf) or a fn(lt) → v. */
(function () {
  const K = window.K, E = K.E;
  const NS = 'http://www.w3.org/2000/svg';
  const PORT = () => K.H >= K.W;
  const V = (v, lt, d) => (v == null ? d : typeof v === 'function' ? v(lt) : Array.isArray(v) && Array.isArray(v[0]) ? K.kf(lt, v) : v);
  const vis = (el, on) => { if (el.__on === on) return; el.__on = on; el.style.display = on ? (el.__disp || '') : 'none'; };
  const svgEl = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const mix = (c, a) => `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // tiny markup: "Hecha con *Astro*" → serif-italic emphasis (the Katana one-word italic)
  const rich = (s) => esc(s).replace(/\*([^*]+)\*/g, '<span class="k-serif" style="font-size:1.08em;letter-spacing:-.01em">$1</span>');
  const life = (lt, at, out, od) => (lt < at || (out != null && lt >= out + od) ? null : { a: lt - at, x: out == null ? 0 : K.clamp((lt - out) / od) });
  const bump = (d, up = .07, rel = .38) => (d < 0 ? 0 : d < up ? d / up : 1 - K.pop(d, up, rel));   // press curve 0→1→0 (small overshoot below 0)
  const even = (v) => Math.round(v / 2) * 2;   // even px sizes → centred boxes land on whole pixels (crisp edges, seek-order stable)
  const blurF = (b) => (b > .25 ? `blur(${b.toFixed(2)}px)` : 'none');
  // Determinism guard: inside the engine's preserve-3d world, an element whose transform alternates between scaled and
  // PURE-translation matrices renders history-dependently (Chrome reuses a stale raster) → seek-order diffs. Every
  // transform we write carries this invisible 1e-5 scale so it is never a pure translation.
  const SC = ' scale(1.00001)';
  let uid = 0;
  // measuring span inside #film (theme vars apply); build-time only
  let MS = null;
  const measure = (html, css) => {
    if (!MS) MS = K.el('span', '', K.film || document.body);
    MS.style.cssText = 'position:absolute;left:-30000px;top:0;white-space:pre;visibility:hidden;' + css;
    MS.innerHTML = html; return MS.getBoundingClientRect().width;
  };

  K.css('ui', `
    .kui-ui{font-family:var(--k-display);-webkit-font-smoothing:antialiased}
    .kui-ui svg{display:block}
    .kui-tab{font-variant-numeric:tabular-nums}
  `);

  /* ------------------------------------------------------------------ entrance / exit poses (objects) */
  const geo = (x, y, w, h) => ({ down: K.H - y + h * .62 + 60, up: y + h * .62 + 60, right: K.W - x + w * .62 + 60, left: x + w * .62 + 60, w, h });
  const ENTER = {
    rise: (a, g) => { const sp = K.spring(a, 0, { k: 75, c: 12.5 }), q = E.soft(K.p(a, 0, .95)); return { dy: (1 - sp) * g.down, rx: (1 - q) * 34, rz: (1 - q) * -5, s: K.lerp(.9, 1, q) }; },
    drop: (a, g) => { const sp = K.spring(a, 0, { k: 75, c: 12.5 }), q = E.soft(K.p(a, 0, .95)); return { dy: -(1 - sp) * g.up, rx: (1 - q) * -28, rz: (1 - q) * 6, s: K.lerp(.92, 1, q) }; },
    pop: (a) => { const k = K.pop(a, 0, .55), q = E.soft(K.p(a, 0, .7)); return { s: K.lerp(.2, 1, k), rz: (1 - q) * -9, blur: Math.max(0, 1 - a / .16) * 14 }; },
    flip: (a) => { const q = E.soft(K.p(a, 0, .9)); return { ry: (1 - q) * -120, s: K.lerp(.82, 1, q), blur: Math.max(0, 1 - a / .14) * 10 }; },
    'slide-left': (a, g) => { const sp = K.spring(a, 0, { k: 85, c: 13.5 }), q = E.soft(K.p(a, 0, .9)); return { dx: -(1 - sp) * g.left, ry: (1 - q) * 40, rz: (1 - q) * -3 }; },
    'slide-right': (a, g) => { const sp = K.spring(a, 0, { k: 85, c: 13.5 }), q = E.soft(K.p(a, 0, .9)); return { dx: (1 - sp) * g.right, ry: (1 - q) * -40, rz: (1 - q) * 3 }; },
    zoom: (a) => { const q = E.soft(K.p(a, 0, .75)); return { s: K.zoom(a, 0, .75, 2.1, 1, E.soft), blur: (1 - q) * 26 }; },
    deal: (a, g, o) => { const sp = K.spring(a, 0, { k: 80, c: 12 }), q = E.soft(K.p(a, 0, .9)), sg = o.dealSide || 1; return { dy: (1 - sp) * g.down, dx: (1 - sp) * g.w * .45 * sg, rz: (1 - q) * 22 * sg, rx: (1 - q) * 18 }; },
    none: () => ({}),
  };
  ENTER.slide = ENTER['slide-right'];
  const EXIT = {
    fall: (x, g) => { const q = E.in(2.3)(x); return { dy: q * g.down, rx: q * -24, rz: q * 7 }; },
    rise: (x, g) => { const q = E.in(2.3)(x); return { dy: -q * g.up, rx: q * 22, rz: q * -5 }; },
    pop: (x) => { const q = E.in(3)(x); return { s: 1 - q * .995, blur: q * 12 }; },
    zoom: (x) => ({ s: K.zoom(x, 0, 1, 1, 7, E.expoIn), blur: E.in(3)(x) * 22 }),
    'slide-left': (x, g) => { const q = E.in(2.4)(x); return { dx: -q * g.left, ry: q * 32 }; },
    'slide-right': (x, g) => { const q = E.in(2.4)(x); return { dx: q * g.right, ry: q * -32 }; },
    none: () => ({}),
  };
  EXIT.slide = EXIT['slide-left'];
  const pose = (o, L, g, dEn, dEx) => {
    const a = L.a * (o.enterSpeed || 1);
    const e = (ENTER[o.enter || dEn] || ENTER[dEn])(a, g, o), x = L.x > 0 ? (EXIT[o.exit || dEx] || EXIT[dEx])(L.x, g, o) : null;
    const r = { dx: e.dx || 0, dy: e.dy || 0, s: e.s ?? 1, rx: e.rx || 0, ry: e.ry || 0, rz: e.rz || 0, blur: e.blur || 0 };
    if (x) { r.dx += x.dx || 0; r.dy += x.dy || 0; r.s *= x.s ?? 1; r.rx += x.rx || 0; r.ry += x.ry || 0; r.rz += x.rz || 0; r.blur = Math.max(r.blur, x.blur || 0); }
    return r;
  };
  const floatOf = (o, a, h) => {
    if (!o.float) return { y: 0, rz: 0, ry: 0, rx: 0 };
    const f = o.float === true ? {} : o.float, amp = f.amp ?? h * .014, hz = f.hz ?? .32, w = 2 * Math.PI * hz * a;
    return { y: Math.sin(w) * amp, rz: Math.sin(w * .8 + 1.1) * (f.rot ?? .7), ry: Math.sin(w * .6 + .4) * (f.rot ?? .7) * 2.2, rx: Math.cos(w * .7) * (f.rot ?? .7) * 1.4 };
  };

  /* ------------------------------------------------------------------ media: image / frame sequence / builder (+ scroll) */
  // media(box, o, w, h) fills `box` (w×h) with o.src | o.clip (+clipAt, clipIn, rate, loop, clipTime(lt)) | o.build(el,{w,h}).
  // Tall content (o.scroll [[t, frac]] / o.scrollPx [[t, px]]) is laid at width w and scrolled; o.scrollBlur smears it.
  function media(box, o, w, h) {
    const scrolls = !!(o.scroll || o.scrollPx);
    const page = K.div(box, `left:0;top:0;width:${w}px;${scrolls ? '' : `height:${h}px;`}`);
    const fn = o.build || o.content;
    let img = null, r = null, builtH = h;
    if (typeof fn === 'function') { r = fn(page, { w, h }) || {}; if (scrolls) builtH = page.offsetHeight || h; }
    else if (o.clip || o.src) {
      const fp = (o.focus || [.5, .5]).map((v) => v * 100 + '%').join(' ');
      img = K.el('img', `position:absolute;left:0;top:0;display:block;width:${w}px;` + (scrolls ? 'height:auto' : `height:${h}px;object-fit:${o.fit || 'cover'};object-position:${fp}`), page);
      img.decoding = 'sync';
      const first = o.src || K.clipFrame(o.clip, o.clipIn || 0);
      if (first) { img.src = first; img.__src = first; K.images.push(img); }
    } else page.style.background = o.screenBg || o.bg || '#111';
    const clipT = (lt) => (o.clipTime ? o.clipTime(lt) : ((lt - (K.t - K.heldTime(K.t))) - (o.clipAt || 0)) * (o.rate || 1) + (o.clipIn || 0));
    const url = (lt) => K.clipFrame(o.clip, clipT(lt), { loop: !!o.loop });
    const fullH = () => (img ? (img.naturalWidth ? w * img.naturalHeight / img.naturalWidth : h) : builtH);
    const sv = (lt) => {
      if (o.scrollPx) return K.kf(lt, o.scrollPx.map((k) => [k[0], k[1], k[2] || o.scrollEase]));
      if (o.scroll) return Math.max(0, fullH() - h) * K.kf(lt, o.scroll.map((k) => [k[0], k[1], k[2] || o.scrollEase]));
      return 0;
    };
    const db = scrolls && (o.scrollBlur ?? .5) > 0 ? K.dirBlur() : null;
    return {
      el: page, scrollY: sv, fullH,
      prepare: o.clip ? async (lt) => { const u = url(lt); if (u) await K.preload(u); } : r && r.prepare ? (lt) => r.prepare(lt) : null,
      update(lt) {
        if (o.clip && img) { const u = url(lt); if (u && img.__src !== u) { img.src = u; img.__src = u; } }
        if (scrolls) {
          const y = sv(lt); page.style.transform = `translate(0px,${(-y).toFixed(2)}px)` + SC;
          if (db) { const v = Math.abs(y - sv(lt - 1 / K.fps)); db(page, 0, Math.min(28, v * .25 * (o.scrollBlur ?? .5))); }
        }
        if (r && r.update) r.update(lt);
      },
    };
  }

  /* ------------------------------------------------------------------ icons */
  const ICON = {
    signal: '<svg viewBox="0 0 18 12" width="100%" height="100%"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>',
    wifi: '<svg viewBox="0 0 16 12" width="100%" height="100%"><path d="M8 11.6 5.7 9.2a3.3 3.3 0 0 1 4.6 0Z" fill="currentColor"/><path d="M3.5 7a6.4 6.4 0 0 1 9 0l-1.4 1.4a4.4 4.4 0 0 0-6.2 0Z" fill="currentColor"/><path d="M1.2 4.7a9.6 9.6 0 0 1 13.6 0l-1.4 1.4a7.6 7.6 0 0 0-10.8 0Z" fill="currentColor"/></svg>',
    battery: '<svg viewBox="0 0 27 13" width="100%" height="100%"><rect x=".6" y=".6" width="23" height="11.8" rx="3.6" fill="none" stroke="currentColor" stroke-opacity=".45" stroke-width="1.1"/><rect x="2.4" y="2.4" width="19.4" height="8.2" rx="2.1" fill="currentColor"/><path d="M25 4.4v4.2c.9-.3 1.5-1.1 1.5-2.1s-.6-1.8-1.5-2.1Z" fill="currentColor" fill-opacity=".45"/></svg>',
    lock: '<svg viewBox="0 0 12 15" width="100%" height="100%"><rect x="1" y="6.4" width="10" height="8" rx="2" fill="currentColor"/><path d="M3.2 6.6V4.6a2.8 2.8 0 0 1 5.6 0v2" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>',
    reload: '<svg viewBox="0 0 16 16" width="100%" height="100%"><path d="M13 8a5 5 0 1 1-1.6-3.7M13 2.6v3.2H9.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevL: '<svg viewBox="0 0 16 16" width="100%" height="100%"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chevR: '<svg viewBox="0 0 16 16" width="100%" height="100%"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sparkle: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 1.5c.5 4.6 2.6 8.4 10 10.5-7.4 2.1-9.5 5.9-10 10.5-.5-4.6-2.6-8.4-10-10.5 7.4-2.1 9.5-5.9 10-10.5Z" fill="currentColor"/><path d="M19.5 1.5c.2 1.7.9 2.8 3 3.4-2.1.6-2.8 1.7-3 3.4-.2-1.7-.9-2.8-3-3.4 2.1-.6 2.8-1.7 3-3.4Z" fill="currentColor" opacity=".55"/></svg>',
    search: '<svg viewBox="0 0 24 24" width="100%" height="100%"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="2.6"/><path d="m15.5 15.5 5 5" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"/></svg>',
    arrowUp: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4.5 12h15M13 5.5l6.5 6.5-6.5 6.5" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    play: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M7 4.6c0-1 1.1-1.6 2-1.1l11 6.9c.8.5.8 1.7 0 2.2L9 19.5c-.9.5-2-.1-2-1.1Z" fill="currentColor"/></svg>',
    pause: '<svg viewBox="0 0 24 24" width="100%" height="100%"><rect x="5.5" y="4" width="4.6" height="16" rx="1.4" fill="currentColor"/><rect x="13.9" y="4" width="4.6" height="16" rx="1.4" fill="currentColor"/></svg>',
    volume: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 9.2h3.4L12 5v14l-4.6-4.2H4Z" fill="currentColor"/><path d="M15.5 8.6a5 5 0 0 1 0 6.8M18.3 6a8.6 8.6 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    full: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    link: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>',
    whatsapp: '<svg viewBox="0 0 24 24" width="100%" height="100%"><path d="M12 2.2a9.7 9.7 0 0 0-8.4 14.6L2.3 21.7l5-1.3A9.7 9.7 0 1 0 12 2.2Z" fill="currentColor"/><path d="M8.6 7.2c.2-.4.4-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 1.9c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.2.3 0 .6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.3 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.6-.1l1.9.9c.3.1.4.2.5.3.1.2.1.8-.2 1.5-.3.8-1.6 1.4-2.2 1.5-.6.1-1.3.1-2.1-.1-.5-.2-1.1-.4-1.900-.7-3.3-1.4-5.4-4.8-5.6-5-.2-.2-1.3-1.8-1.3-3.4 0-1.6.8-2.4 1.1-2.7Z" fill="#fff"/></svg>',
  };
  const iconHTML = (ic, fs, color) => {
    if (!ic) return '';
    if (typeof ic === 'object' && ic.img) return `<img src="${ic.img}" style="width:${fs * 1.3}px;height:${fs * 1.3}px;border-radius:50%;object-fit:cover;display:block;flex:none">`;
    if (ic === 'dot') return `<span style="display:block;flex:none;width:${fs * .42}px;height:${fs * .42}px;border-radius:50%;background:${color || 'var(--k-accent)'};box-shadow:0 0 0 ${fs * .13}px ${mix(color || 'var(--k-accent)', .16)}"></span>`;
    if (ICON[ic]) return `<span style="display:block;flex:none;width:${fs * .95}px;height:${fs * .95}px;color:${color || 'currentColor'}">${ICON[ic]}</span>`;
    if (typeof ic === 'string' && ic.trim().startsWith('<svg')) return `<span style="display:block;flex:none;width:${fs}px;height:${fs}px">${ic}</span>`;
    return `<span style="display:block;flex:none;font-size:${fs * 1.02}px;line-height:1">${esc(ic)}</span>`;
  };

  /* ================================================================== 1. PHONE */
  const FINISH = {
    black: ['#5a5a60', '#1b1b1e', '#3e3e43', '#141416', '#4d4d52'],
    silver: ['#f5f5f7', '#b9babe', '#e8e8eb', '#a3a4a8', '#dcdde0'],
    titanium: ['#dcd6cc', '#8f8981', '#c4beb4', '#7a756e', '#d0cabf'],
    blue: ['#68758c', '#2a3240', '#4b5669', '#222935', '#5a667c'],
    white: ['#ffffff', '#d9d9dc', '#f2f2f4', '#c8c8cc', '#ececee'],
  };
  const metal = (c, ang = 145) => `linear-gradient(${ang}deg,${c[0]} 0%,${c[1]} 22%,${c[2]} 48%,${c[3]} 74%,${c[4]} 100%)`;

  K.kit.phone = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const w = o.w || o.size || (P ? K.W * .5 : K.H * .34), h = w * 2.06;
    const R = w * .16, ring = w * .012, bez = w * .03, ins = ring + bez, sw = w - 2 * ins, sh = h - 2 * ins, sr = R - ins;
    const fin = FINISH[o.color || o.finish || 'black'] || FINISH.black;
    const el = K.div(parent, `left:0;top:0;width:0;height:0;perspective:${o.perspective || w * 5}px;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const shOp = o.shadow ?? .5;
    const shadow = K.div(el, `left:${-w * .42}px;top:${-h * .45}px;width:${w * .84}px;height:${h * .9}px;border-radius:${R}px;background:rgba(12,14,24,${shOp});filter:blur(${w * .075}px)`);
    const contact = K.div(el, `left:${-w * .46}px;top:${-h * .48}px;width:${w * .92}px;height:${h * .96}px;border-radius:${R}px;background:rgba(12,14,24,${shOp * .55});filter:blur(${w * .02}px)`);
    const body = K.div(el, `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;transform-style:preserve-3d`);
    const depth = w * .105, N = 7, side = metal(fin, 90);
    for (let i = N; i >= 1; i--) K.div(body, `inset:0;border-radius:${R}px;background:${side};box-shadow:inset 0 0 0 1px rgba(0,0,0,.28);transform:translateZ(${(-depth * i / N).toFixed(2)}px)`);
    const btn = (left, y0, len) => K.div(body, `left:${left ? -w * .011 : w - w * .007}px;top:${h * y0}px;width:${w * .018}px;height:${h * len}px;border-radius:${w * .007}px;background:${side};transform:translateZ(${-depth * .5}px)`);
    btn(true, .175, .045); btn(true, .255, .085); btn(true, .355, .085); btn(false, .285, .13);
    const front = K.div(body, `inset:0;border-radius:${R}px;background:${metal(fin)};box-shadow:inset 0 0 ${ring * .8}px rgba(255,255,255,.35)`);
    K.div(front, `left:${ring}px;top:${ring}px;right:${ring}px;bottom:${ring}px;border-radius:${R - ring}px;background:#040405`);
    const screen = K.div(front, `left:${ins}px;top:${ins}px;width:${sw}px;height:${sh}px;border-radius:${sr}px;overflow:hidden;background:${o.screenBg || '#000'};transform:translateZ(0)`);
    const md = media(screen, o, sw, sh);
    const scrolling = !!(o.scroll || o.scrollPx);
    const sbMode = o.statusBar ?? (scrolling ? 'dark' : 'light'), sbc = sbMode === 'dark' ? '#0b0b0c' : '#fff';
    const sbBg = o.statusBg ?? (scrolling ? 'rgba(248,248,250,.94)' : null);
    if (sbBg && o.statusBar !== false) K.div(screen, `left:0;top:0;width:${sw}px;height:${sw * .135}px;background:${sbBg};backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);z-index:2`);
    if (o.statusBar !== false) {
      const sb = K.div(screen, `left:0;top:0;width:${sw}px;height:${sw * .135}px;display:flex;align-items:center;justify-content:space-between;box-sizing:border-box;padding:0 ${sw * .085}px 0 ${sw * .115}px;color:${sbc};font:600 ${sw * .045}px/1 var(--k-display);letter-spacing:-.01em;z-index:3`);
      sb.__disp = 'flex';
      K.el('span', '', sb, esc(o.time || '9:41'));
      const ic = K.el('span', `display:flex;align-items:center;gap:${sw * .014}px`, sb);
      K.el('span', `display:block;width:${sw * .05}px;height:${sw * .033}px`, ic, ICON.signal);
      K.el('span', `display:block;width:${sw * .045}px;height:${sw * .034}px`, ic, ICON.wifi);
      K.el('span', `display:block;width:${sw * .07}px;height:${sw * .034}px`, ic, ICON.battery);
    }
    const isl = K.div(screen, `left:${(sw - sw * .315) / 2}px;top:${sw * .03}px;width:${sw * .315}px;height:${sw * .093}px;border-radius:${sw * .05}px;background:#000;z-index:4`);
    K.div(isl, `right:${sw * .03}px;top:${sw * .028}px;width:${sw * .037}px;height:${sw * .037}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#2b3550 0,#0b0e18 55%,#000 100%)`);
    if (o.homeBar !== false) K.div(screen, `left:${sw * .33}px;bottom:${sw * .022}px;width:${sw * .34}px;height:${sw * .013}px;border-radius:${sw}px;background:${sbc};opacity:.85;z-index:3`);
    const glare = K.div(screen, `inset:0;z-index:5;pointer-events:none;opacity:${o.glare ?? 1};background:linear-gradient(115deg,rgba(255,255,255,0) 36%,rgba(255,255,255,.15) 47%,rgba(255,255,255,.04) 54%,rgba(255,255,255,0) 62%);background-size:280% 100%`);
    const outDur = o.outDur || .5;
    return {
      el, body, screen, w, h, sw, sh, media: md,
      // film coords of a point on the SCREEN given as fractions (ignores tilt/entrance; for cursor/finger targeting)
      pointAt: (fx, fy, lt = 1e9) => [V(o.x, lt, K.W / 2) - sw / 2 + fx * sw, V(o.y, lt, K.H / 2) - sh / 2 + fy * sh],
      prepare: md.prepare,
      dur: 1,
      cues: () => [{ kind: 'whoosh', t: at, gain: .8 }].concat(o.out != null ? [{ kind: 'whoosh', t: o.out, gain: .7 }] : []),
      update(lt) {
        const L = life(lt, at, o.out, outDur); vis(el, !!L); if (!L) return;
        const x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        const p = pose(o, L, geo(x, y, w, h), 'rise', 'fall'), f = floatOf(o, L.a, h);
        const rx = V(o.rx, lt, 0) + p.rx + f.rx, ry = V(o.ry, lt, 0) + p.ry + f.ry, rz = V(o.rz, lt, 0) + p.rz + f.rz, s = V(o.s, lt, 1) * p.s;
        el.style.transform = `translate(${(x + p.dx).toFixed(2)}px,${(y + p.dy + f.y).toFixed(2)}px)` + SC;
        el.style.filter = blurF(p.blur);
        body.style.transform = `rotateZ(${rz.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${s.toFixed(4)})` + SC;
        const cx = Math.abs(Math.cos(ry * Math.PI / 180)), cy = Math.abs(Math.cos(rx * Math.PI / 180)), lift = -f.y;
        shadow.style.transform = `translate(${(w * .04 - ry * w * .002).toFixed(1)}px,${(h * .045 + lift * .8 + rx * h * .0012).toFixed(1)}px) rotate(${rz.toFixed(2)}deg) scale(${(s * cx).toFixed(3)},${(s * cy).toFixed(3)})` + SC;
        shadow.style.opacity = K.clamp(1 - lift / (h * .1) * .3, .4, 1).toFixed(3);
        contact.style.transform = `translate(${(w * .01).toFixed(1)}px,${(h * .012 + lift * .3).toFixed(1)}px) rotate(${rz.toFixed(2)}deg) scale(${(s * cx).toFixed(3)},${(s * cy).toFixed(3)})` + SC;
        glare.style.backgroundPosition = `${(50 + ry * 1.6 + rz * 1.2 + rx * .6).toFixed(2)}% 0`;
        md.update(lt);
      },
    };
  };

  /* ================================================================== 2. BROWSER (+ shared window) and LAPTOP */
  function browserWin(win, o, w, h) {
    const dark = (o.theme || 'light') === 'dark', chrome = o.chrome !== false;
    // chrome is drawn ~2× real macOS scale so the URL reads on a phone (9:16: 950 px window → 26 px URL text)
    const barH = chrome ? (o.barH || K.clamp(w * (PORT() ? .085 : .072), 36, 100)) : 0;
    const muted = dark ? '#a1a1a6' : '#86868b';
    let urlSpan = null, caret = null, loadBar = null;
    const url = o.url ?? 'auroracafe.co';
    if (chrome) {
      const bar = K.div(win, `left:0;top:0;width:${w}px;height:${barH}px;background:${dark ? '#2a2a2d' : '#f2f2f4'};border-bottom:1px solid ${dark ? 'rgba(255,255,255,.07)' : 'rgba(0,0,0,.08)'};z-index:2`);
      const d = barH * .24, gap = d * .62;
      ['#FF5F57', '#FEBC2E', '#28C840'].forEach((c, i) => K.div(bar, `left:${barH * .4 + i * (d + gap)}px;top:${(barH - d) / 2}px;width:${d}px;height:${d}px;border-radius:50%;background:${c};box-shadow:inset 0 0 0 .5px rgba(0,0,0,.18)`));
      const nx = barH * .4 + 3 * (d + gap) + barH * .3;
      K.div(bar, `left:${nx}px;top:${barH * .3}px;width:${barH * .4}px;height:${barH * .4}px;color:${muted}`, ICON.chevL);
      K.div(bar, `left:${nx + barH * .5}px;top:${barH * .3}px;width:${barH * .4}px;height:${barH * .4}px;color:${muted};opacity:.5`, ICON.chevR);
      const pw = Math.min(w * .5, w - 2 * (nx + barH * 1.2)), ph = barH * .62;
      const pill = K.div(bar, `left:${(w - pw) / 2}px;top:${(barH - ph) / 2}px;width:${pw}px;height:${ph}px;border-radius:${ph * .32}px;background:${dark ? '#3a3a3d' : '#fff'};box-shadow:${dark ? 'none' : '0 0 0 1px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.05)'};display:flex;align-items:center;justify-content:center;gap:${ph * .18}px;color:${dark ? '#f2f2f2' : '#1d1d1f'};font:500 ${ph * .52}px/1 var(--k-display);letter-spacing:-.01em;white-space:nowrap`);
      pill.__disp = 'flex';
      K.el('span', `display:block;width:${ph * .3}px;height:${ph * .38}px;color:${muted}`, pill, ICON.lock);
      const uw = K.el('span', 'position:relative;display:block', pill);
      urlSpan = K.el('span', '', uw, esc(url));
      caret = K.div(uw, `right:${-ph * .06}px;top:${-ph * .02}px;width:${Math.max(1.5, ph * .045)}px;height:${ph * .52}px;background:var(--k-accent);display:none`);
      K.div(pill, `right:${ph * .3}px;top:${ph * .28}px;width:${ph * .44}px;height:${ph * .44}px;color:${muted}`, ICON.reload);
      loadBar = K.div(bar, `left:0;bottom:-1px;height:${Math.round(Math.max(3, barH * .065))}px;width:${w}px;background:var(--k-accent);transform-origin:0 50%;transform:scaleX(0);z-index:3`);
    }
    const vh = h - barH;
    const vp = K.div(win, `left:0;top:${barH}px;width:${w}px;height:${vh}px;overflow:hidden;background:${o.pageBg || '#fff'}`);
    const load = o.load;   // [t0, t1]
    // skeleton (grey placeholder blocks + a shimmer) while the page loads — never a dead white window
    let skel = null, shim = null;
    if (load && o.skeleton !== false) {
      const darkPage = dark && !!o.pageBg;   // the page is white unless pageBg says otherwise (theme only styles the chrome)
      const c = o.skeletonColor || (darkPage ? 'rgba(255,255,255,.09)' : 'rgba(17,18,40,.075)'), u = w / 100, R = Math.max(6, u * 1.6);
      skel = K.div(vp, `left:0;top:0;width:${w}px;height:${vh}px;overflow:hidden`);
      const blk = (l, t, bw, bh, r = R) => K.div(skel, `left:${(l * u).toFixed(1)}px;top:${(t * u).toFixed(1)}px;width:${(bw * u).toFixed(1)}px;height:${(bh * u).toFixed(1)}px;border-radius:${r}px;background:${c}`);
      blk(6, 4, 14, 3.2, u); blk(52, 4.4, 9, 2.4, u); blk(64, 4.4, 9, 2.4, u); blk(76, 4.4, 18, 2.4, u);   // nav
      const hero = Math.min(vh / u * .42, 46);
      blk(6, 11, 88, hero);                                                                              // hero
      blk(6, 15 + hero, 62, 4.6, u); blk(6, 21.5 + hero, 44, 4.6, u); blk(6, 28.5 + hero, 70, 2.4, u);   // headline + copy
      [0, 1, 2].forEach((i) => blk(6 + i * 30, 35 + hero, 27, 30));                                      // cards
      shim = K.div(skel, `left:0;top:0;width:${w * .5}px;height:${vh}px;background:linear-gradient(100deg,rgba(255,255,255,0) 0%,${darkPage ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.75)'} 50%,rgba(255,255,255,0) 100%)`);
    }
    // the page lives in a non-scrolling reveal box (clip-path on the scrolled page itself would use its 0-px box)
    const rev = K.div(vp, `left:0;top:0;width:${w}px;height:${vh}px;overflow:hidden`);
    const md = media(rev, o, w, vh);
    const typeAt = o.typeUrl, ut = typeAt != null ? K.cadence(url, typeAt, typeAt + Math.max(.4, url.length / 15), 31) : null;
    return {
      barH, vp, media: md, prepare: md.prepare,
      update(lt) {
        if (ut && urlSpan) {
          const n = K.typedN(ut, lt), last = ut[ut.length - 1];
          urlSpan.textContent = url.slice(0, n) || '​';
          caret.style.display = lt >= typeAt - .3 && (lt < last + .25 || (load && lt < load[0])) && K.caretOn(lt, last, 2.2) ? 'block' : 'none';
        }
        if (load && loadBar) {
          const [t0, t1] = load, q = K.p(lt, t0, t1);
          const prog = lt < t0 ? 0 : K.lerp(.06, 1, E.out(2.2)(q) * .85 + q * .15);
          loadBar.style.transform = `scaleX(${prog.toFixed(4)})` + SC;
          loadBar.style.opacity = lt < t0 ? 0 : (1 - K.p(lt, t1 + .05, t1 + .3)).toFixed(3);
          const rv = E.snappy(K.p(lt, t1 - .05, t1 + .5));
          rev.style.clipPath = rv >= 1 ? 'none' : `inset(0 0 ${((1 - rv) * 100).toFixed(2)}% 0)`;
          if (skel) {
            vis(skel, rv < 1);
            if (rv < 1) shim.style.transform = `translate(${(((lt * .9) % 1) * w * 1.6 - w * .55).toFixed(1)}px,0px)` + SC;
          }
        }
        md.update(lt);
      },
    };
  }

  K.kit.browser = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const w = even(o.w || (P ? K.W * .88 : K.W * .62)), h = even(o.h || (P ? w * 1.3 : w * .6));
    const rad = o.radius ?? Math.max(10, w * .022);
    const el = K.div(parent, `left:0;top:0;width:0;height:0;perspective:${o.perspective || w * 3.2}px;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const body = K.div(el, `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;transform-style:preserve-3d`);
    const sh = o.shadow ?? 1;
    const win = K.div(body, `inset:0;border-radius:${rad}px;overflow:hidden;background:#fff;box-shadow:0 ${w * .06}px ${w * .12}px ${-w * .035}px rgba(12,16,32,${.42 * sh}),0 ${w * .016}px ${w * .03}px ${-w * .01}px rgba(12,16,32,${.22 * sh}),0 0 0 1px rgba(0,0,0,.07)`);
    const bw = browserWin(win, o, w, h);
    const outDur = o.outDur || .5;
    return {
      el, body, win, viewport: bw.vp, media: bw.media, w, h, barH: bw.barH, prepare: bw.prepare, dur: 1,
      // film coords of a point on the WINDOW (fractions of w/h; fy = 0 is the top of the chrome bar). urlAt = URL pill centre.
      pointAt: (fx, fy, lt = 1e9) => [V(o.x, lt, K.W / 2) - w / 2 + fx * w, V(o.y, lt, K.H / 2) - h / 2 + fy * h],
      urlAt: (lt = 1e9) => [V(o.x, lt, K.W / 2), V(o.y, lt, K.H / 2) - h / 2 + bw.barH / 2],
      cues: () => {
        const c = [{ kind: 'whoosh', t: at, gain: .8 }], S = o.scroll || o.scrollPx;
        if (S) S.slice(1).forEach((k, i) => { if (Math.abs(k[1] - S[i][1]) > 1e-6) c.push({ kind: 'swipe', t: S[i][0], gain: .5 }); });
        if (o.typeUrl != null) c.push({ kind: 'key', t: o.typeUrl, gain: .4 });
        if (o.load) c.push({ kind: 'ding', t: o.load[1], gain: .5 });
        return c;
      },
      update(lt) {
        const L = life(lt, at, o.out, outDur); vis(el, !!L); if (!L) return;
        const x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        const p = pose(o, L, geo(x, y, w, h), 'rise', 'fall'), f = floatOf(o, L.a, h);
        const rx = V(o.rx, lt, 0) + p.rx * .6 + f.rx, ry = V(o.ry, lt, 0) + p.ry + f.ry, rz = V(o.rz, lt, 0) + p.rz * .6 + f.rz, s = V(o.s, lt, 1) * p.s;
        el.style.transform = `translate(${(x + p.dx).toFixed(2)}px,${(y + p.dy + f.y).toFixed(2)}px)` + SC;
        el.style.filter = blurF(p.blur);
        body.style.transform = `rotateZ(${rz.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${s.toFixed(4)})` + SC;
        bw.update(lt);
      },
    };
  };

  K.kit.laptop = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const w = o.w || (P ? K.W * .9 : K.W * .46), lh = w * .655;
    const rim = w * .006, bzS = w * .017, bzT = w * .021, bzB = w * .03;
    const sx = rim + bzS, sy = rim + bzT, sw = w - 2 * sx, sh = lh - sy - rim - bzB;
    const depth = w * .66, lipH = w * .02;
    const space = o.color === 'space' || o.color === 'black';
    const fin = space ? ['#5b5d62', '#34363a', '#4a4c51', '#2a2b2e', '#55575c'] : ['#f1f2f4', '#c5c7cb', '#e3e4e7', '#b6b8bc', '#dcdde0'];
    const deckBg = space ? 'linear-gradient(180deg,#3b3d42,#46484d 30%,#3e4045)' : 'linear-gradient(180deg,#cfd1d5,#dfe0e3 30%,#d4d6d9)';
    const el = K.div(parent, `left:0;top:0;width:0;height:0;perspective:${o.perspective || w * 3}px;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const body = K.div(el, `left:${-w / 2}px;top:${-lh / 2}px;width:${w}px;height:${lh}px;transform-style:preserve-3d`);
    // deck (keyboard plane) hinged at the lid's bottom edge, extending toward the viewer
    const deck = K.div(body, `left:0;top:${lh}px;width:${w}px;height:${depth}px;transform-origin:50% 0;transform:rotateX(90deg);transform-style:preserve-3d;border-radius:${w * .012}px ${w * .012}px ${w * .035}px ${w * .035}px;background:${deckBg};box-shadow:inset 0 ${w * .004}px 0 rgba(255,255,255,.35)`);
    K.div(deck, `left:${-w * .05}px;top:${-depth * .02}px;width:${w * 1.1}px;height:${depth * 1.12}px;border-radius:${w * .06}px;background:rgba(10,12,22,${.5 * (o.shadow ?? 1)});filter:blur(${w * .035}px);transform:translateZ(${-lipH * 1.05}px)`);
    const kb = K.div(deck, `left:${w * .085}px;top:${depth * .075}px;width:${w * .83}px;height:${depth * .4}px;border-radius:${w * .01}px;background:${space ? '#202124' : '#a9abb0'};box-shadow:inset 0 0 ${w * .004}px rgba(0,0,0,.35);padding:${w * .005}px;box-sizing:border-box;display:flex;flex-direction:column;gap:${w * .004}px`);
    const rows = [[14, .55], [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5], 1], [[1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1], 1], [[1.8, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.8], 1], [[2.3, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.3], 1], [[1, 1, 1, 1.3, 5.6, 1.3, 1, 1, 1, 1], 1]];
    rows.forEach(([ks, hh]) => {
      const r = K.el('div', `display:flex;gap:${w * .004}px;flex:${hh}`, kb);
      (Array.isArray(ks) ? ks : Array(ks).fill(1)).forEach((k) => K.el('div', `flex:${k};border-radius:${w * .0035}px;background:${space ? '#0f1012' : '#1c1d20'};box-shadow:inset 0 ${-w * .0012}px 0 rgba(255,255,255,.08)`, r));
    });
    K.div(deck, `left:${w * .29}px;top:${depth * .53}px;width:${w * .42}px;height:${depth * .37}px;border-radius:${w * .014}px;background:${space ? '#3a3c41' : '#d3d5d8'};box-shadow:inset 0 0 0 ${Math.max(1, w * .0012)}px rgba(0,0,0,.12)`);
    const lip = K.div(deck, `left:0;top:${depth}px;width:${w}px;height:${lipH}px;transform-origin:50% 0;transform:rotateX(-90deg);background:linear-gradient(180deg,${fin[0]},${fin[3]});border-radius:0 0 ${w * .03}px ${w * .03}px`);
    K.div(lip, `left:${w * .44}px;top:0;width:${w * .12}px;height:${lipH * .45}px;border-radius:0 0 ${w * .02}px ${w * .02}px;background:${space ? '#26272a' : '#aeb0b4'}`);
    // lid (screen) — hinged at its bottom edge, leaning back o.lean degrees
    const lid = K.div(body, `left:0;top:0;width:${w}px;height:${lh}px;transform-origin:50% 100%;transform-style:preserve-3d`);
    K.div(lid, `inset:0;border-radius:${w * .028}px ${w * .028}px ${w * .01}px ${w * .01}px;background:${metal(fin)};transform:translateZ(${-w * .006}px)`);
    K.div(lid, `left:${rim}px;top:${rim}px;width:${w - 2 * rim}px;height:${lh - 2 * rim}px;border-radius:${w * .024}px ${w * .024}px ${w * .006}px ${w * .006}px;background:#060607`);
    const screen = K.div(lid, `left:${sx}px;top:${sy}px;width:${sw}px;height:${sh}px;overflow:hidden;background:#000;border-radius:${w * .006}px ${w * .006}px 0 0`);
    const notch = o.notch !== false;
    const mbH = notch ? w * .02 : 0;
    if (notch) {
      const mb = K.div(screen, `left:0;top:0;width:${sw}px;height:${mbH}px;background:${o.theme === 'dark' ? '#1d1d1f' : '#ececee'};display:flex;align-items:center;gap:${mbH * .9}px;padding-left:${mbH * .8}px;box-sizing:border-box;font:600 ${mbH * .55}px/1 var(--k-display);color:${o.theme === 'dark' ? '#eee' : '#222'};white-space:nowrap`);
      mb.__disp = 'flex';
      mb.innerHTML = '<span>●</span><span>Safari</span><span style="font-weight:500">Archivo</span><span style="font-weight:500">Edición</span><span style="font-weight:500">Visualización</span>';
      K.div(screen, `left:${(sw - w * .1) / 2}px;top:0;width:${w * .1}px;height:${mbH * 1.05}px;background:#060607;border-radius:0 0 ${w * .012}px ${w * .012}px;z-index:4`);
    }
    const winEl = K.div(screen, `left:0;top:${mbH}px;width:${sw}px;height:${sh - mbH}px;overflow:hidden;background:#fff`);
    const bw = browserWin(winEl, Object.assign({ barH: K.clamp(sw * .046, 26, 70) }, o), sw, sh - mbH);
    const glare = K.div(screen, `inset:0;z-index:5;pointer-events:none;opacity:${o.glare ?? .9};background:linear-gradient(118deg,rgba(255,255,255,0) 30%,rgba(255,255,255,.12) 44%,rgba(255,255,255,.03) 52%,rgba(255,255,255,0) 60%);background-size:260% 100%`);
    const outDur = o.outDur || .55;
    return {
      el, body, lid, deck, screen, viewport: bw.vp, media: bw.media, w, h: lh, sw, sh, prepare: bw.prepare, dur: 1.2,
      cues: () => [{ kind: 'whoosh', t: at, gain: .8 }].concat(o.enter === 'open' ? [{ kind: 'hit', t: at + .55, gain: .5 }] : []),
      update(lt) {
        const L = life(lt, at, o.out, outDur); vis(el, !!L); if (!L) return;
        const x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H * (P ? .45 : .44));
        const opening = o.enter === 'open';
        const p = pose(opening ? Object.assign({}, o, { enter: 'rise' }) : o, L, geo(x, y, w, lh + depth * .5), 'rise', 'fall'), f = floatOf(o, L.a, lh);
        const rx = V(o.rx, lt, -16) + p.rx * .5 + f.rx, ry = V(o.ry, lt, 0) + p.ry + f.ry, rz = V(o.rz, lt, 0) + p.rz * .6 + f.rz, s = V(o.s, lt, 1) * p.s;
        let lean = V(o.lean, lt, 6);
        if (opening) { const sp = K.spring(L.a, .12, { k: 60, c: 10 }); lean = K.lerp(-90, lean, sp); }
        lid.style.transform = `rotateX(${lean.toFixed(3)}deg)` + SC;
        el.style.transform = `translate(${(x + p.dx).toFixed(2)}px,${(y + p.dy + f.y).toFixed(2)}px)` + SC;
        el.style.filter = blurF(p.blur);
        body.style.transform = `rotateZ(${rz.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${s.toFixed(4)})` + SC;
        glare.style.backgroundPosition = `${(50 + ry * 1.5 + rz).toFixed(2)}% 0`;
        bw.update(lt);
      },
    };
  };

  /* ================================================================== 5. CHIP (used by searchBar / chipCloud) */
  const CHIP = {
    light: 'background:#fff;color:var(--k-fg);box-shadow:0 .32em .8em -.32em rgba(20,24,60,.38),0 .05em .14em rgba(20,24,60,.10),inset 0 0 0 1px rgba(0,0,0,.04)',
    dark: 'background:var(--k-fg);color:#fff;box-shadow:0 .32em .8em -.32em rgba(0,0,0,.55)',
    accent: 'background:var(--k-accent);color:#fff;box-shadow:0 .32em .8em -.3em color-mix(in srgb,var(--k-accent) 75%,transparent)',
    lime: 'background:var(--k-accent2);color:var(--k-fg);box-shadow:0 .32em .8em -.32em rgba(20,24,60,.35)',
    hot: 'background:var(--k-accent3);color:#fff;box-shadow:0 .32em .8em -.3em color-mix(in srgb,var(--k-accent3) 70%,transparent)',
    outline: 'background:transparent;color:var(--k-fg);box-shadow:inset 0 0 0 .07em currentColor',
    glass: 'background:rgba(255,255,255,.16);color:#fff;backdrop-filter:blur(14px) saturate(1.6);-webkit-backdrop-filter:blur(14px) saturate(1.6);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3),0 .32em .8em -.32em rgba(0,0,0,.45)',
  };
  K.kit.chip = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0, fs = o.size || (P ? 44 : 32);
    const el = K.div(parent, `left:0;top:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const hasIc = !!o.icon, img = o.icon && typeof o.icon === 'object' && o.icon.img;
    const pill = K.div(el, `display:flex;align-items:center;gap:${fs * .34}px;white-space:nowrap;padding:${img ? fs * .2 : fs * .36}px ${fs * .74}px ${img ? fs * .2 : fs * .36}px ${hasIc ? (img ? fs * .2 : fs * .5) : fs * .74}px;border-radius:${fs * 3}px;font:600 ${fs}px/1.06 var(--k-display);letter-spacing:-.022em;${CHIP[o.style || 'light'] || CHIP.light}`);
    pill.__disp = 'flex';
    pill.innerHTML = iconHTML(o.icon, fs, o.color) + `<span>${rich(o.text || '')}</span>`;
    if (img) K.images.push(pill.querySelector('img'));
    const pw = pill.offsetWidth, ph = pill.offsetHeight;
    pill.style.left = -pw / 2 + 'px'; pill.style.top = -ph / 2 + 'px';
    let lab = null;
    if (o.label) lab = K.div(el, `left:${-pw / 2 + fs * .5}px;top:${(o.labelSide === 'top' ? -ph / 2 - fs * .75 : ph / 2 + fs * .32)}px;font:500 ${fs * .4}px/1 var(--k-mono);letter-spacing:.14em;color:var(--k-muted);white-space:nowrap;text-transform:uppercase`, esc(o.label));
    const rot0 = o.rot || 0, sg = K.hash(at * 13.1 + (o.text || '').length) > .5 ? 1 : -1;
    const enter = o.enter || 'pop', od = o.outDur || .28;
    return {
      el, pill, w: pw, h: ph, dur: .5,
      cues: () => [{ kind: 'pop', t: at, gain: .6 }],
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const a = L.a, x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        let s = 1, dy = 0, dx = 0, rot = rot0, b = 0;
        if (enter === 'pop') { s = K.lerp(.3, 1, K.pop(a, 0, .5)); rot += (1 - E.soft(K.p(a, 0, .6))) * -11 * sg; dy = (1 - E.snappy(K.p(a, 0, .4))) * fs * .5; b = Math.max(0, 1 - a / .15) * 10; }
        else if (enter === 'rise') { const q = E.snappy(K.p(a, 0, .45)); s = K.lerp(1.12, 1, q); dy = (1 - q) * fs * 1.1; b = (1 - q) * 14; }
        else if (enter === 'slide') { const q = E.snappy(K.p(a, 0, .45)); dx = (1 - q) * -fs * 2.4; b = (1 - q) * 12; s = K.lerp(.9, 1, q); }
        else if (enter === 'stamp') { const q = E.in(2.2)(K.p(a, 0, .14)); s = a < .14 ? K.lerp(1.9, 1, q) : 1; rot += a < .14 ? (1 - q) * 8 * sg : K.settleShake(a, .14, 3, 6, 10); b = (1 - q) * 6; }
        if (L.x > 0) { const q = E.in(3)(L.x); s *= 1 - q * .99; b = Math.max(b, q * 10); }
        s *= V(o.s, lt, 1);
        el.style.transform = `translate(${(x + dx).toFixed(2)}px,${(y + dy).toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${s.toFixed(4)})` + SC;
        el.style.filter = blurF(b);
        if (lab) lab.style.opacity = K.p(a, .12, .35).toFixed(3);
      },
    };
  };

  // dashed/solid draw-on for an SVG path: p 0..1, dash [d, g] or null
  const drawLine = (path, p, dash) => {
    if (!path.__len) path.__len = path.getTotalLength();
    const L = path.__len, shown = L * K.clamp(p);
    if (!dash) { path.style.strokeDasharray = `${shown.toFixed(2)} ${(L + 10).toFixed(2)}`; return; }
    const [d, g] = dash, arr = []; let acc = 0;
    while (acc + d < shown) { arr.push(d, g); acc += d + g; }
    arr.push(Math.max(0, Math.min(d, shown - acc)), L + 10);
    path.style.strokeDasharray = arr.map((v) => v.toFixed(1)).join(' ');
  };

  /* ================================================================== 3. SEARCH BAR */
  K.kit.searchBar = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const w = even(o.w || (P ? K.W * .84 : K.W * .5)), h = even(o.h || (P ? 132 : 112));
    const fs = o.size || h * .34, dark = o.theme === 'dark';
    const text = o.text || '', ph = o.placeholder ?? '¿Qué necesita tu web?';
    const typeAt = o.typeAt ?? at + .85, typeDur = o.typeDur ?? Math.max(.5, text.length / (o.cps || 16));
    const times = text ? K.cadence(text, typeAt, typeAt + typeDur, o.seed || 7) : [];
    const typeEnd = times.length ? times[times.length - 1] : typeAt;
    const submitAt = o.submitAt === false ? null : (o.submitAt ?? typeEnd + .45);
    const chips = (o.chips || []).map((c) => (typeof c === 'string' ? { text: c } : c));
    const chipsAt = o.chipsAt ?? (submitAt ?? typeEnd) + .18, cst = o.chipStagger ?? .16;
    const clearAt = o.clear === false || (!chips.length && o.clear !== true) ? null : (submitAt ?? typeEnd) + .05;
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const lines = svgEl('svg', { width: 1, height: 1, style: 'position:absolute;left:0;top:0;overflow:visible' }, el);
    const chipLayer = K.div(el, 'left:0;top:0;width:0;height:0');
    const ring = K.div(el, `left:0;top:0;width:0;height:0;border-radius:50%;border:${h * .03}px solid var(--k-accent);display:none`);
    const pillSh = `0 ${h * .32}px ${h * .7}px ${-h * .3}px rgba(28,36,90,.32),0 ${h * .05}px ${h * .12}px rgba(28,36,90,.08),inset 0 ${-h * .03}px ${h * .08}px rgba(28,36,90,.04)`;
    const hair = dark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.05)', bw0 = Math.max(2, Math.round(h * .017));
    const pill = K.div(el, `top:${-h / 2}px;height:${h}px;border-radius:${h / 2}px;overflow:hidden;background:${dark ? '#1c1c20' : '#fff'};box-shadow:${pillSh},inset 0 0 0 1px ${hair}`);
    const inner = K.div(pill, `left:0;top:0;width:${w}px;height:${h}px`);
    const icS = h * .3, ic = o.icon === false || o.icon === 'none' ? null : K.div(inner, `left:${h / 2 - icS / 2}px;top:${(h - icS) / 2}px;width:${icS}px;height:${icS}px;color:var(--k-accent)`, ICON[o.icon || 'sparkle'] || o.icon);
    const btnLabel = typeof o.button === 'string' && !ICON[o.button] ? o.button : null;
    const hasBtn = o.button !== false;
    let bw = 0, btn = null;
    const bh = h * .7;
    if (hasBtn) {
      bw = btnLabel ? measure(esc(btnLabel), `font:700 ${fs * .9}px var(--k-display);letter-spacing:-.02em`) + bh * .9 : bh;
      btn = K.div(inner, `left:${w - (h - bh) / 2 - bw}px;top:${(h - bh) / 2}px;width:${bw}px;height:${bh}px;border-radius:${bh / 2}px;background:var(--k-accent);color:#fff;display:flex;align-items:center;justify-content:center;font:700 ${fs * .9}px/1 var(--k-display);letter-spacing:-.02em;box-shadow:0 ${bh * .18}px ${bh * .4}px ${-bh * .16}px color-mix(in srgb,var(--k-accent) 80%,transparent),inset 0 ${bh * .04}px 0 rgba(255,255,255,.25)`);
      btn.__disp = 'flex';
      btn.innerHTML = btnLabel ? esc(btnLabel) : `<span style="display:block;width:${bh * .46}px;height:${bh * .46}px">${ICON[o.button] || ICON.arrowUp}</span>`;
    }
    const tx = ic ? h * .9 : h * .45, avail = w - tx - (hasBtn ? bw + (h - bh) / 2 + h * .2 : h * .45);
    const field = K.div(inner, `left:${tx}px;top:0;width:${avail}px;height:${h}px;overflow:hidden`);
    // auto-fit: shrink the type (down to 72 %) so the whole query fits the field, then it scrolls like a real input
    const fitFs = (s) => (o.fit === false || !s ? fs : Math.max(fs * .72, Math.min(fs, fs * (avail - fs * .5) / measure(esc(s), `font:500 ${fs}px var(--k-display);letter-spacing:-.012em`))));
    const tfs = fitFs(text), pfs = fitFs(ph);
    const tcss = `font:500 ${tfs}px/${h}px var(--k-display);letter-spacing:-.012em;white-space:pre`;
    const phEl = K.div(field, `left:0;top:0;font:500 ${pfs}px/${h}px var(--k-display);letter-spacing:-.012em;white-space:pre;color:${dark ? '#8a8a92' : '#9b9da6'}`, esc(ph));
    const tEl = K.div(field, `left:0;top:0;${tcss};padding-right:.12em;color:${dark ? '#f4f4f6' : 'var(--k-fg)'}`);
    const caret = K.div(field, `left:0;top:${(h - tfs * 1.18) / 2}px;width:${Math.max(2, tfs * .075)}px;height:${tfs * 1.18}px;border-radius:2px;background:var(--k-accent)`);
    const PW = [0]; for (let i = 1; i <= text.length; i++) PW.push(measure(esc(text.slice(0, i)), tcss));
    // chip positions (relative to the bar centre): alternate top / bottom, spread across the width
    const gapY = o.chipGap ?? h * 1.15, sides = chips.map((c, i) => c.side || (i % 2 ? 'bottom' : 'top'));
    const made = chips.map((c, i) => {
      const side = sides[i], m = sides.filter((s) => s === side).length, k = sides.slice(0, i).filter((s) => s === side).length;
      const fx = m === 1 ? (side === 'top' ? -.2 : .22) : K.lerp(-.3, .3, k / (m - 1));
      const cx = c.dx ?? (fx * w + (K.hash(i * 7.7 + 3) - .5) * h * .5), sg = side === 'top' ? -1 : 1;
      const cy = c.dy ?? sg * (h / 2 + gapY + (K.hash(i * 3.3 + 1) - .5) * h * .45);
      const tc = chipsAt + i * cst;
      const chip = K.kit.chip(chipLayer, Object.assign({ size: o.chipSize || fs * 1.05, style: o.chipStyle || 'light', icon: 'dot' }, c, { x: cx, y: cy, at: tc + .2, label: c.label ?? (o.chipLabel ? `${o.chipLabel} ${String(i + 1).padStart(2, '0')}` : null), labelSide: side === 'top' ? 'top' : 'bottom', out: c.out ?? o.chipsOut }));
      const bx = K.clamp(cx * .55, -w / 2 + h * .8, w / 2 - h * .8), by = sg * h / 2, ey = cy - sg * chip.h / 2, my = (by + ey) / 2;
      const path = svgEl('path', { d: `M${bx.toFixed(1)} ${by.toFixed(1)} V${my.toFixed(1)} H${cx.toFixed(1)} V${ey.toFixed(1)}`, fill: 'none', stroke: o.lineColor || (dark ? 'rgba(255,255,255,.4)' : 'rgba(17,18,20,.32)'), 'stroke-width': Math.max(1.5, h * .016), 'stroke-linejoin': 'round' }, lines);
      const dot = svgEl('circle', { cx: bx, cy: by, r: 0, fill: 'var(--k-accent)' }, lines);
      return { chip, path, dot, tc };
    });
    made.forEach((m) => drawLine(m.path, 0));
    const od = o.outDur || .5;
    return {
      el, pill, w, h, chips: made.map((m) => m.chip), typeAt, typeEnd, submitAt, chipsAt,
      // film coords of the submit button centre (for a cursor click at submitAt); follows x, y, s, rz
      buttonAt: (lt = 1e9) => {
        const S = V(o.s, lt, 1), a = V(o.rz, lt, 0) * Math.PI / 180, d = (w / 2 - (h - bh) / 2 - bw / 2) * S;
        return [V(o.x, lt, K.W / 2) + d * Math.cos(a), V(o.y, lt, K.H / 2) + d * Math.sin(a)];
      },
      dur: (made.length ? chipsAt + made.length * cst + .6 : (submitAt ?? typeEnd) + .5) - at,
      cues: () => {
        const c = [{ kind: 'pop', t: at, gain: .7 }];
        times.forEach((t, i) => { if (text[i] !== ' ') c.push({ kind: 'key', t, gain: .32 }); });
        if (submitAt != null) c.push({ kind: 'click', t: submitAt, gain: .9 });
        made.forEach((m) => c.push({ kind: 'pop', t: m.tc + .2, gain: .55 }));
        return c;
      },
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const a = L.a, x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        let s = K.lerp(.3, 1, K.pop(a, 0, .45)), wq = E.bez(.6, 0, .1, 1)(K.p(a, .18, .78)), b = Math.max(0, 1 - a / .16) * 10;
        if (L.x > 0) { wq *= 1 - E.in(2)(K.p(L.x, 0, .55)); s *= 1 - E.in(3)(K.p(L.x, .5, 1)) * .99; b = Math.max(b, K.p(L.x, .5, 1) * 10); }
        const d = submitAt == null ? -1 : lt - submitAt, pr = bump(d, .07, .4);
        const cw = K.lerp(h, w, wq);
        pill.style.width = cw.toFixed(2) + 'px'; pill.style.left = (-cw / 2).toFixed(2) + 'px';
        const S = V(o.s, lt, 1), rz = V(o.rz, lt, 0);
        el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` + (rz ? ` rotate(${rz.toFixed(3)}deg)` : '') + (S !== 1 ? ` scale(${S.toFixed(4)})` : '') + SC;
        pill.style.transform = `scale(${(s * (1 - pr * .018)).toFixed(4)},${(s * (1 - pr * .035)).toFixed(4)})` + SC;
        pill.style.filter = blurF(b);
        const cq = E.snappy(K.p(a, .5, .9));
        if (ic) ic.style.transform = `scale(${K.lerp(.6, 1, K.pop(a, .05, .45)).toFixed(3)}) rotate(${((1 - E.soft(K.p(a, 0, .8))) * -90).toFixed(2)}deg)` + SC;
        field.style.opacity = cq.toFixed(3);
        field.style.transform = `translateY(${((1 - cq) * h * .22).toFixed(2)}px)` + SC;
        field.style.filter = blurF((1 - cq) * 8);
        if (btn) {
          btn.style.transform = `scale(${(K.pop(a, .55, .45) * (1 - pr * .2)).toFixed(4)})` + SC;
          btn.style.filter = submitAt != null && d >= 0 && d < .4 ? `brightness(${(1 + .25 * (1 - d / .4)).toFixed(3)})` : 'none';
          if (submitAt != null && d >= 0 && d < .55) {
            const q = E.out(3)(d / .55), R = K.lerp(bh * .5, bh * 1.25, q), bcx = cw / 2 - (h - bh) / 2 - bw / 2;
            ring.style.display = 'block'; ring.style.left = (bcx - R).toFixed(1) + 'px'; ring.style.top = (-R).toFixed(1) + 'px';
            ring.style.width = ring.style.height = (2 * R).toFixed(1) + 'px'; ring.style.opacity = (1 - q).toFixed(3); ring.style.borderWidth = (h * .03 * (1 - q) + 1).toFixed(2) + 'px';
          } else ring.style.display = 'none';
        }
        // typing
        const n = K.typedN(times, lt), shift = Math.max(0, PW[n] - avail + tfs * .3);
        tEl.textContent = text.slice(0, n);
        phEl.style.display = n > 0 || (clearAt != null && lt >= clearAt) ? 'none' : 'block';
        let cx = PW[n] - shift + tfs * .06;
        if (clearAt != null && lt >= clearAt) {
          const q = E.in(2)(K.p(lt, clearAt, clearAt + .3));
          tEl.style.transform = `translate(${(-shift).toFixed(2)}px,${(-q * h * .4).toFixed(2)}px)` + SC; tEl.style.opacity = (1 - q).toFixed(3); tEl.style.filter = blurF(q * 10);
          if (q >= 1) cx = tfs * .06;
        } else { tEl.style.transform = `translateX(${(-shift).toFixed(2)}px)` + SC; tEl.style.opacity = 1; tEl.style.filter = 'none'; }
        const typing = n > 0 && n < text.length;
        const blinkOn = Math.floor(Math.max(0, lt - (text && n >= text.length ? typeEnd : at)) * 2.2 * 2) % 2 === 0;
        caret.style.left = cx.toFixed(2) + 'px';
        caret.style.display = a > .7 && (typing || blinkOn) ? 'block' : 'none';
        // focus: crisp accent border (the r2 look) + soft accent halo, while typing
        const focus = o.focusRing === false ? 0 : K.p(lt, typeAt - .3, typeAt) * (1 - (clearAt != null ? K.p(lt, clearAt + .4, clearAt + .9) : 0));
        const fq = Math.round(focus * 20) / 20;   // quantised: the shadow string only changes in 5 % steps
        if (pill.__fq !== fq) {
          pill.__fq = fq;
          pill.style.boxShadow = fq > 0 ? `${pillSh},inset 0 0 0 ${bw0}px color-mix(in srgb,var(--k-accent) ${(fq * 62).toFixed(0)}%,${dark ? '#2a2a30' : '#e4e5ea'}),0 0 0 ${(h * .07).toFixed(1)}px color-mix(in srgb,var(--k-accent) ${(fq * 9).toFixed(1)}%,transparent)` : `${pillSh},inset 0 0 0 1px ${hair}`;
        }
        made.forEach((m) => {
          drawLine(m.path, E.inOut(2)(K.p(lt, m.tc, m.tc + .3)));
          m.chip.update(lt);
          m.dot.setAttribute('r', (h * .035 * K.pop(lt, m.tc, .35)).toFixed(2));
          m.path.style.display = lt < m.tc ? 'none' : 'block';
          if (o.chipsOut != null) { const q = K.p(lt, o.chipsOut, o.chipsOut + .25); m.path.style.opacity = (1 - q).toFixed(3); m.dot.style.opacity = (1 - q).toFixed(3); }
        });
      },
    };
  };

  /* ================================================================== 4. CURSOR */
  const CUR_ARROW = '<svg viewBox="0 0 24 24" width="100%" height="100%" style="overflow:visible"><path d="M3.2 1.6v18.1l4.5-4.3 2.9 6.5 3.2-1.4-2.8-6.3h6.2Z" fill="#0b0b0c" stroke="#fff" stroke-width="1.6" stroke-linejoin="round" paint-order="stroke"/></svg>';
  const CUR_HAND = '<svg viewBox="0 0 24 24" width="100%" height="100%" style="overflow:visible"><path d="M9.2 2.6c0-.95.72-1.6 1.6-1.6s1.6.65 1.6 1.6v6.1c.1-.8.75-1.35 1.55-1.35.85 0 1.5.6 1.5 1.45v.7c.12-.75.75-1.25 1.5-1.25.85 0 1.5.6 1.5 1.45v1c.13-.7.72-1.15 1.42-1.15.82 0 1.45.62 1.45 1.45v4.6c0 3.9-2.75 6.9-6.45 6.9h-2.1c-2.05 0-3.55-.85-4.75-2.5l-3.35-4.75c-.55-.78-.4-1.8.35-2.32.74-.52 1.75-.35 2.3.4l1.27 1.75Z" fill="#fff" stroke="#0b0b0c" stroke-width="1.35" stroke-linejoin="round"/><path d="M12.4 9.2v4.1M15.45 9.8v3.6M18.45 10.8v2.8" stroke="#0b0b0c" stroke-width="1.15" stroke-linecap="round"/></svg>';
  K.kit.cursor = (parent, o = {}) => {
    const P = PORT(), path = o.path || [[o.at || 0, o.x ?? K.W / 2, o.y ?? K.H / 2]], at = o.at ?? path[0][0];
    const size = o.size || (P ? 80 : 58), clicks = o.clicks || [];
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z ?? 40}`); el.className = 'kui-ui';
    const rings = clicks.map(() => [0, 1].map(() => K.div(el, `left:0;top:0;width:0;height:0;box-sizing:border-box;border-radius:50%;border:${size * .05}px solid ${o.ringColor || 'var(--k-accent)'};background:${mix(o.ringColor || 'var(--k-accent)', .12)};display:none`)));
    const cur = K.div(el, 'left:0;top:0;width:0;height:0');
    const arrow = K.div(cur, `left:${-size * 3.2 / 24}px;top:${-size * 1.6 / 24}px;width:${size}px;height:${size}px;transform-origin:${3.2 / 24 * 100}% ${1.6 / 24 * 100}%;filter:drop-shadow(0 ${size * .05}px ${size * .06}px rgba(0,0,0,.32))`, CUR_ARROW);
    const hand = K.div(cur, `left:${-size * 10.8 / 24}px;top:${-size * 1 / 24}px;width:${size}px;height:${size}px;transform-origin:${10.8 / 24 * 100}% ${1 / 24 * 100}%;filter:drop-shadow(0 ${size * .05}px ${size * .06}px rgba(0,0,0,.32))`, CUR_HAND);
    // 'touch': the iOS-style finger indicator for phone demos (translucent disc, hotspot = centre)
    const td = even(size * .82);
    const touch = K.div(cur, `left:${-td / 2}px;top:${-td / 2}px;width:${td}px;height:${td}px;background:radial-gradient(circle closest-side,rgba(40,42,56,.34) 0,rgba(40,42,56,.26) 74%,rgba(255,255,255,.96) 79%,rgba(255,255,255,.96) 89%,rgba(10,12,30,.22) 93%,rgba(10,12,30,0) 100%);display:none`);
    const ease = o.ease || E.bez(.5, 0, .12, 1), arcK = o.arc ?? .12;
    const pos = (lt) => {
      if (lt <= path[0][0]) return [path[0][1], path[0][2]];
      for (let i = 1; i < path.length; i++) {
        const b = path[i]; if (lt > b[0]) continue;
        const a = path[i - 1], q = (b[3] || ease)(K.p(lt, a[0], b[0])), dx = b[1] - a[1], dy = b[2] - a[2], len = Math.hypot(dx, dy) || 1;
        const off = Math.sin(Math.PI * q) * arcK * len * (i % 2 ? 1 : -1);
        return [a[1] + dx * q - dy / len * off, a[2] + dy * q + dx / len * off];
      }
      const z = path[path.length - 1]; return [z[1], z[2]];
    };
    const shapeAt = (lt) => { let s = o.shape || 'arrow'; for (const [t, sh] of (o.shapes || [])) if (K.TQ(lt) >= t) s = sh; return s; };
    const od = o.outDur || .25;
    return {
      el, pos, dur: path[path.length - 1][0] - at,
      cues: () => clicks.map((t) => ({ kind: 'click', t, gain: 1 })),
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const [x, y] = pos(lt), [x0] = pos(lt - 1 / K.fps), vx = (x - x0) * K.fps;
        let s = o.enter === 'none' ? 1 : K.lerp(.2, 1, K.pop(L.a, 0, .35));
        for (const tc of clicks) s *= 1 - bump(lt - tc, .06, .32) * .2;
        if (L.x > 0) s *= 1 - E.in(3)(L.x) * .99;
        const rot = K.clamp(vx / 2600 * 7, -7, 7) * (o.tilt ?? 1);
        const sh = shapeAt(lt);
        arrow.style.display = sh === 'arrow' || (sh !== 'hand' && sh !== 'touch') ? 'block' : 'none'; hand.style.display = sh === 'hand' ? 'block' : 'none'; touch.style.display = sh === 'touch' ? 'block' : 'none';
        let sw = 1; for (const [t] of (o.shapes || [])) sw *= 1 + Math.max(0, bump(lt - t, .05, .3)) * .12;
        cur.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${rot.toFixed(2)}deg)` + SC;
        arrow.style.transform = hand.style.transform = touch.style.transform = `scale(${(s * sw).toFixed(4)})` + SC;
        clicks.forEach((tc, i) => rings[i].forEach((r, k) => {
          const d = lt - tc - k * .09;
          if (d < 0 || d > .55) { r.style.display = 'none'; return; }
          const [cx, cy] = pos(tc), q = E.out(3)(d / .55), R = K.lerp(size * .1, size * (k ? .95 : .7), q);
          r.style.display = 'block'; r.style.left = (cx - R).toFixed(1) + 'px'; r.style.top = (cy - R).toFixed(1) + 'px';
          r.style.width = r.style.height = (2 * R).toFixed(1) + 'px'; r.style.opacity = ((1 - q) * (k ? .6 : 1)).toFixed(3);
        }));
      },
    };
  };

  /* ================================================================== chipCloud */
  K.kit.chipCloud = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0, items = (o.items || []).map((c) => (typeof c === 'string' ? { text: c } : c));
    const n = items.length, layout = o.layout || 'radial', stg = o.stagger ?? .14;
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const svg = svgEl('svg', { width: 1, height: 1, style: 'position:absolute;left:0;top:0;overflow:visible' }, el);
    const layer = K.div(el, 'left:0;top:0;width:0;height:0');
    const rx = o.rx ?? (P ? K.W * .3 : K.W * .25), ry = o.ry ?? (P ? K.H * .16 : K.H * .3), seed = o.seed || 1;
    const pts = items.map((c, i) => {
      if (c.dx != null) return [c.dx, c.dy || 0];
      if (layout === 'chain') { const sg = i % 2 ? 1 : -1; return [sg * rx * .55, K.lerp(-ry, ry, n > 1 ? i / (n - 1) : .5)]; }
      if (layout === 'row') return [K.lerp(-rx, rx, n > 1 ? i / (n - 1) : .5), (i % 2 ? 1 : -1) * ry * .25];
      const ang = -Math.PI / 2 + (o.rotate || 0) * Math.PI / 180 + i * 2 * Math.PI / n + (K.hash(i * 3.1 + seed) - .5) * .45, rr = .86 + K.hash(i * 5.3 + seed) * .18;
      return [Math.cos(ang) * rx * rr, Math.sin(ang) * ry * rr];
    });
    let center = null; const c0 = o.center;
    if (c0 === 'dot') center = { el: K.div(layer, `left:-14px;top:-14px;width:28px;height:28px;border-radius:50%;background:var(--k-accent);box-shadow:0 0 0 10px ${mix('var(--k-accent)', .15)},0 0 30px ${mix('var(--k-accent)', .5)}`) };
    else if (c0) center = { chip: K.kit.chip(layer, Object.assign({ style: 'dark', size: (o.size || (P ? 44 : 32)) * 1.12 }, typeof c0 === 'string' ? { text: c0 } : c0, { x: 0, y: 0, at })) };
    const t0 = at + (center ? .25 : 0);
    const stroke = o.lineColor || mix('var(--k-fg)', .28), lw = o.lineWidth || (P ? 2.6 : 2);
    const made = items.map((c, i) => {
      const [x, y] = pts[i], tc = t0 + i * stg;
      const from = layout === 'chain' && i > 0 ? pts[i - 1] : [0, 0];
      const showLine = o.lines !== false && !(layout === 'chain' && i === 0 && !center);
      const mx = (from[0] + x) / 2, my = (from[1] + y) / 2, dx = x - from[0], dy = y - from[1], cv = (o.curve ?? .18) * (i % 2 ? 1 : -1);
      const path = showLine ? svgEl('path', { d: `M${from[0].toFixed(1)} ${from[1].toFixed(1)} Q${(mx - dy * cv).toFixed(1)} ${(my + dx * cv).toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}`, fill: 'none', stroke, 'stroke-width': lw, 'stroke-linecap': 'round' }, svg) : null;
      const dot = showLine ? svgEl('circle', { cx: from[0], cy: from[1], r: 0, fill: o.dotColor || 'var(--k-accent)' }, svg) : null;
      const chip = K.kit.chip(layer, Object.assign({ size: o.size, style: o.style || 'light' }, c, { x, y, at: tc + (showLine ? .2 : 0), out: c.out ?? o.out }));
      if (path) drawLine(path, 0);
      return { chip, path, dot, tc };
    });
    const dash = o.dashed ? [lw * 3.2, lw * 2.6] : null;
    return {
      el, chips: made.map((m) => m.chip), dur: t0 - at + n * stg + .6,
      cues: () => [].concat(center ? [{ kind: 'pop', t: at, gain: .8 }] : [], made.map((m) => ({ kind: 'pop', t: m.tc + .2, gain: .55 }))),
      update(lt) {
        const L = life(lt, at, o.out, .3); vis(el, !!L); if (!L) return;
        const x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2), drift = o.drift ?? 0;
        el.style.transform = `translate(${x.toFixed(2)}px,${(y + Math.sin(L.a * 1.3) * 7 * drift).toFixed(2)}px)` + SC;
        if (center) {
          if (center.chip) center.chip.update(lt);
          else center.el.style.transform = `scale(${(K.pop(lt, at, .45) * (L.x > 0 ? 1 - L.x : 1)).toFixed(4)})` + SC;
        }
        const ox = L.x > 0 ? 1 - E.in(2)(L.x) : 1;
        made.forEach((m) => {
          if (m.path) { drawLine(m.path, E.inOut(2)(K.p(lt, m.tc, m.tc + .3)), dash); m.path.style.display = lt < m.tc ? 'none' : 'block'; m.path.style.opacity = ox.toFixed(3); m.dot.setAttribute('r', (lw * 2.2 * K.pop(lt, m.tc, .4) * ox).toFixed(2)); }
          m.chip.update(lt);
        });
      },
    };
  };

  /* ================================================================== 6. CARD */
  K.kit.card = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const w = even(o.w || (P ? K.W * .6 : K.W * .22));
    const layout = o.layout || (o.title || o.meta ? 'stack' : 'image');
    const ratio = o.ratio ?? (layout === 'stack' ? .78 : layout === 'overlay' ? 1.3 : 1.25), coverH = w * ratio;
    const rad = o.radius ?? w * .06, pad = w * .07, tfs = o.titleSize || w * .1, mfs = o.metaSize || Math.max(14, w * .032);
    const dark = o.theme === 'dark';
    const el = K.div(parent, `left:0;top:0;width:0;height:0;perspective:${o.perspective || w * 4}px;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const body = K.div(el, `left:${-w / 2}px;top:0;width:${w}px;transform-style:preserve-3d`);
    const sh = o.shadow ?? 1;
    const card = K.el('div', `position:relative;width:${w}px;border-radius:${rad}px;overflow:hidden;background:${dark ? '#17181b' : '#fff'};box-shadow:0 ${w * .09}px ${w * .16}px ${-w * .06}px rgba(14,18,40,${.48 * sh}),0 ${w * .02}px ${w * .04}px ${-w * .01}px rgba(14,18,40,${.2 * sh})${dark ? '' : ',inset 0 0 0 1px rgba(0,0,0,.04)'}`, body);
    const cover = K.el('div', `position:relative;width:${w}px;height:${coverH}px;overflow:hidden;background:#222`, card);
    const kb = K.div(cover, `left:0;top:0;width:${w}px;height:${coverH}px;transform-origin:50% 50%`);
    const md = media(kb, o, w, coverH);
    if (o.tag) K.div(cover, `left:${pad * .7}px;top:${pad * .7}px;padding:${mfs * .55}px ${mfs * .9}px;border-radius:${mfs * 3}px;background:rgba(255,255,255,.92);color:#111;font:600 ${mfs * 1.05}px/1 var(--k-display);letter-spacing:-.01em;white-space:nowrap;box-shadow:0 6px 18px -8px rgba(0,0,0,.4);z-index:2`, rich(o.tag));
    if (layout === 'stack' && (o.title || o.meta)) {
      const tb = K.el('div', `padding:${pad * .85}px ${pad}px ${pad}px;color:${dark ? '#fff' : 'var(--k-fg)'}`, card);
      if (o.meta) K.el('div', `font:500 ${mfs}px/1.2 var(--k-mono);letter-spacing:.12em;text-transform:uppercase;color:${dark ? '#9a9ca3' : 'var(--k-muted)'};margin-bottom:${mfs * .7}px`, tb, esc(o.meta));
      if (o.title) K.el('div', `font:800 ${tfs}px/.98 var(--k-display);letter-spacing:-.04em`, tb, rich(o.title));
    } else if (layout === 'overlay' && (o.title || o.meta)) {
      K.div(cover, `left:0;right:0;bottom:0;height:${coverH * .55}px;background:linear-gradient(180deg,transparent,rgba(0,0,0,.72))`);
      const tb = K.div(cover, `left:${pad}px;right:${pad}px;bottom:${pad}px;color:#fff`);
      if (o.meta) K.el('div', `font:500 ${mfs}px/1.2 var(--k-mono);letter-spacing:.12em;text-transform:uppercase;opacity:.8;margin-bottom:${mfs * .6}px`, tb, esc(o.meta));
      if (o.title) K.el('div', `font:800 ${tfs}px/.98 var(--k-display);letter-spacing:-.04em`, tb, rich(o.title));
    }
    const H = card.offsetHeight; body.style.top = -H / 2 + 'px'; body.style.height = H + 'px';
    const od = o.outDur || .45;
    return {
      el, body, card, w, h: H, media: md, prepare: md.prepare, dur: .9,
      cues: () => [{ kind: o.enter === 'pop' ? 'pop' : 'whoosh', t: at, gain: .7 }],
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        const p = pose(o, L, geo(x, y, w, H), 'rise', 'fall'), f = floatOf(o, L.a, H);
        const rx = V(o.rx, lt, 0) + p.rx + f.rx, ry = V(o.ry, lt, 0) + p.ry + f.ry, rz = V(o.rz ?? o.rot, lt, 0) + p.rz + f.rz, s = V(o.s, lt, 1) * p.s;
        el.style.transform = `translate(${(x + p.dx).toFixed(2)}px,${(y + p.dy + f.y).toFixed(2)}px)` + SC;
        el.style.filter = blurF(p.blur);
        body.style.transform = `rotateZ(${rz.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${s.toFixed(4)})` + SC;
        if (o.kenburns !== false) kb.style.transform = `scale(${K.lerp(1.14, 1, E.soft(K.p(L.a, 0, 2.2))).toFixed(4)})` + SC;
        md.update(lt);
      },
    };
  };

  /* ================================================================== 7. TICKER */
  K.kit.ticker = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const fs = o.size || (P ? 34 : 26), bh = o.h || fs * 2.15, rot = o.rot ?? 0, speed = o.speed ?? 170, dir = o.dir ?? -1;
    // build-time geometry uses the largest |angle| when rot is animated (keyframes) or ~8° for a function
    const rotRef = typeof rot === 'number' ? rot : Array.isArray(rot) ? rot.reduce((m, k) => (Math.abs(k[1]) > Math.abs(m) ? k[1] : m), 0) : 8;
    const Lb = o.len || (rotRef ? Math.hypot(K.W, K.H) * 1.06 : K.W + 8);
    const FONT = {
      mono: `font:600 ${fs}px/1 var(--k-mono);letter-spacing:.09em;text-transform:uppercase`,
      wide: `font:800 ${fs}px/1 var(--k-wide);font-stretch:125%;letter-spacing:-.01em;text-transform:uppercase`,
      display: `font:800 ${fs}px/1 var(--k-display);letter-spacing:-.03em`,
      serif: `font:400 ${fs * 1.15}px/1 var(--k-serif);font-style:italic;letter-spacing:-.01em`,
    };
    const items = Array.isArray(o.text) ? o.text : [o.text || 'NUEVA WEB'];
    const sep = o.sep ?? '•', sepC = o.sepColor || 'currentColor';
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const band = K.div(el, `left:${-Lb / 2}px;top:${-bh / 2}px;width:${Lb}px;height:${bh}px;background:${o.bg || 'var(--k-fg)'};overflow:hidden;${o.border ? `box-shadow:inset 0 ${fs * .07}px 0 ${o.border},inset 0 ${-fs * .07}px 0 ${o.border};` : ''}`);
    const track = K.div(band, `left:0;top:0;height:${bh}px;display:flex;align-items:center;white-space:nowrap;color:${o.color || '#fff'};${FONT[o.font || 'mono'] || FONT.mono}`);
    const seg = items.map((s) => `<span>${rich(s)}</span><span style="margin:0 .75em;color:${sepC}">${esc(sep)}</span>`).join('');
    const first = K.el('div', 'display:flex;align-items:center;flex:none', track, seg);
    const segW = first.getBoundingClientRect().width || 400;
    const copies = Math.ceil(Lb / segW) + 2;
    for (let i = 1; i < copies; i++) track.appendChild(first.cloneNode(true));
    const span = rotRef ? Math.min(Lb, K.W / Math.max(.2, Math.abs(Math.cos(rotRef * Math.PI / 180)))) : Lb, s0 = Math.max(0, (Lb - span) / 2 / Lb);
    const od = o.outDur || .45, enter = o.enter || 'wipe';
    return {
      el, band, segW, dur: .5,
      cues: () => [{ kind: 'swipe', t: at, gain: .6 }],
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const x = V(o.x, lt, K.W / 2), y = V(o.y, lt, P ? K.H * .74 : K.H * .8);
        const off = ((lt - at) * speed % segW + segW) % segW;
        track.style.transform = `translate(${(dir < 0 ? -off : off - segW).toFixed(2)}px,0px)` + SC;
        let sy = 1, clip = 'none';
        const q = E.snappy(K.p(L.a, 0, .55));
        if (enter === 'wipe' && q < 1) clip = `inset(0 ${((1 - K.lerp(s0, 1 - s0, q)) * 100).toFixed(3)}% 0 0)`;
        else if (enter === 'grow') sy = q;
        if (L.x > 0) { const xq = E.in(2.4)(L.x); clip = xq >= 1 ? 'inset(0 0 0 100%)' : `inset(0 0 0 ${(K.lerp(s0, 1 - s0, xq) * 100).toFixed(3)}%)`; }
        band.style.clipPath = clip;
        el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) rotate(${V(rot, lt, 0)}deg) scaleY(${sy.toFixed(4)})` + SC;
      },
    };
  };

  /* ================================================================== 8. BADGE (rotating circular text) */
  K.kit.badge = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const r = o.r || (P ? 150 : 118), fs = o.size || r * .19, box = (r + fs * 1.4) * 2;
    const unit = (o.text || 'NUEVO • NORTH PEARL • ').toUpperCase();
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const acc = o.color || 'var(--k-accent)';
    const halo = o.halo !== false ? K.div(el, `left:${-r * 1.25}px;top:${-r * 1.25}px;width:${r * 2.5}px;height:${r * 2.5}px;border-radius:50%;background:radial-gradient(circle,${mix(acc, .14)} 0,transparent 68%)`) : null;
    const spin = K.div(el, `left:${-box / 2}px;top:${-box / 2}px;width:${box}px;height:${box}px`);
    const id = 'kbp' + (++uid), c = box / 2;
    const svg = svgEl('svg', { width: box, height: box, viewBox: `0 0 ${box} ${box}`, style: 'overflow:visible;display:block' }, spin);
    svgEl('path', { id, d: `M${c} ${c - r} A${r} ${r} 0 1 1 ${c} ${c + r} A${r} ${r} 0 1 1 ${c} ${c - r}`, fill: 'none' }, svgEl('defs', {}, svg));
    const txt = svgEl('text', { 'font-family': o.font === 'display' ? 'Inter Tight' : 'Geist Mono', 'font-weight': o.font === 'display' ? 800 : 600, 'font-size': fs, fill: acc, 'letter-spacing': fs * .12, 'dominant-baseline': 'central' }, svg);
    const tp = svgEl('textPath', { href: '#' + id }, txt);
    tp.textContent = unit;
    const C = 2 * Math.PI * r, ul = txt.getComputedTextLength() || unit.length * fs * .62, reps = Math.max(1, Math.round(C / ul));
    tp.textContent = unit.repeat(reps);
    tp.setAttribute('textLength', (C - fs * .12).toFixed(2)); tp.setAttribute('lengthAdjust', 'spacing');
    if (o.track) svgEl('circle', { cx: c, cy: c, r: r + fs * .95, fill: 'none', stroke: acc, 'stroke-width': 1.5, opacity: .35 }, svg);
    const ctr = K.div(el, 'left:0;top:0;width:0;height:0');
    const cen = o.center ?? 'dot';
    if (cen === 'dot') K.div(ctr, `left:${-r * .13}px;top:${-r * .13}px;width:${r * .26}px;height:${r * .26}px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff 0,${acc} 32%,color-mix(in srgb,${acc} 70%,#000) 100%);box-shadow:0 0 ${r * .25}px ${mix(acc, .55)}`);
    else if (cen === 'ring') {
      // glossy 3D torus (r2 "N·O·thing"): thick tube (hole = 48 % of the outer radius), light from the top-left,
      // tube shading across the cross-section, a specular streak and a soft coloured contact shadow
      const C = o.centerColor || '#2B4BFF', d = even(r * 1.46), hole = 48;
      const tint = (p) => `color-mix(in srgb,${C} ${p}%,#fff)`, shade = (p) => `color-mix(in srgb,${C} ${p}%,#000)`;
      const ringMask = `radial-gradient(circle closest-side,transparent ${hole - .8}%,#000 ${hole}%,#000 98.6%,transparent 100%)`;
      K.div(ctr, `left:${-d / 2}px;top:${-d / 2}px;width:${d}px;height:${d}px;background:radial-gradient(circle closest-side,transparent ${hole - 6}%,${mix(C, .42)} ${hole + 14}%,${mix(C, .28)} 82%,transparent 100%);filter:blur(${(r * .1).toFixed(1)}px);transform:translateY(${(r * .12).toFixed(1)}px) scale(1.04)`);
      K.div(ctr, `left:${-d / 2}px;top:${-d / 2}px;width:${d}px;height:${d}px;` +
        `background:radial-gradient(ellipse 15% 7% at 31% 19%,rgba(255,255,255,.95),rgba(255,255,255,0) 100%),` +
        `radial-gradient(ellipse 9% 5% at 76% 82%,rgba(255,255,255,.45),rgba(255,255,255,0) 100%),` +
        `radial-gradient(circle closest-side,rgba(0,0,30,.5) ${hole}%,rgba(0,0,30,0) ${hole + 12}%,rgba(255,255,255,.22) ${hole + 27}%,rgba(255,255,255,0) ${hole + 38}%,rgba(0,0,30,.38) 100%),` +
        `linear-gradient(135deg,${tint(22)} 0%,${tint(55)} 24%,${C} 52%,${shade(78)} 78%,${shade(52)} 100%);` +
        `-webkit-mask:${ringMask};mask:${ringMask}`);
    } else if (cen === 'play') {
      // glossy extruded play button (r2 "dusk"): darker extrusion offset down-right, gradient face, soft top-left gloss
      const d = r * 1.05, C = o.centerColor || '#2B4BFF';
      const tri = 'M30 18c0-6 6.5-9.8 11.7-6.8l44 26c5.2 3 5.2 10.6 0 13.6l-44 26C36.5 79.8 30 76 30 70Z';
      K.div(ctr, `left:${-d / 2}px;top:${-d / 2}px;width:${d}px;height:${d}px;filter:drop-shadow(0 ${(r * .1).toFixed(1)}px ${(r * .14).toFixed(1)}px ${mix(C, .45)})`,
        `<svg viewBox="0 0 100 100" width="100%" height="100%"><defs><linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:color-mix(in srgb,${C} 45%,#fff)"/><stop offset=".5" style="stop-color:${C}"/><stop offset="1" style="stop-color:color-mix(in srgb,${C} 60%,#000)"/></linearGradient><linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient></defs><path d="${tri}" transform="translate(-3 9)" style="fill:color-mix(in srgb,${C} 55%,#000)"/><path d="${tri}" transform="translate(-6 6)" fill="url(#${id}g)"/><path d="${tri}" transform="translate(-6 6)" fill="url(#${id}h)"/></svg>`);
    } else if (cen && typeof cen === 'object' && cen.img) { const d = cen.size || r * 1.1; K.img(ctr, cen.img, `left:${-d / 2}px;top:${-d / 2}px;width:${d}px;height:${d}px;object-fit:contain`); }
    else if (typeof cen === 'function') cen(ctr, { r });
    const speed = o.speed ?? 42, dirn = o.dir ?? 1, od = o.outDur || .4;
    return {
      el, dur: .9,
      cues: () => [{ kind: 'pop', t: at + .1, gain: .7 }],
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const a = L.a, x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        const q = E.soft(K.p(a, 0, .9)), rev = E.inOut(2)(K.p(a, .02, .62));
        let s = K.lerp(.55, 1, q) * V(o.s, lt, 1), cs = K.pop(a, .08, .55);
        if (L.x > 0) { const xq = E.in(3)(L.x); s *= 1 - xq * .99; cs *= 1 - xq; }
        const ang = (o.rot0 || 0) + dirn * speed * a - (1 - q) * 140 * dirn;
        el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` + SC;
        spin.style.transform = `rotate(${ang.toFixed(3)}deg) scale(${s.toFixed(4)})` + SC;
        const deg = rev * 360;
        spin.style.webkitMaskImage = spin.style.maskImage = rev >= 1 ? 'none' : `conic-gradient(#000 ${deg.toFixed(2)}deg, transparent ${(deg + .01).toFixed(2)}deg)`;
        ctr.style.transform = `scale(${cs.toFixed(4)}) rotate(${((1 - E.soft(K.p(a, .08, .9))) * (cen === 'ring' ? -35 : -60)).toFixed(2)}deg)` + SC;   // lit centres settle still (the text ring keeps spinning)
        if (halo) halo.style.transform = `scale(${(s * (1 + Math.sin(a * 2.2) * .03)).toFixed(4)})` + SC;
      },
    };
  };

  /* ================================================================== 9. LABEL (mono micro label, decode + count) */
  const fmtNum = (v, dec = 0, sep = '.', dsep) => {
    dsep = dsep || (sep === '.' ? ',' : '.');
    const neg = v < 0, f = Math.abs(v).toFixed(dec), [i, d] = f.split('.');
    return (neg ? '−' : '') + i.replace(/\B(?=(\d{3})+(?!\d))/g, sep) + (d ? dsep + d : '');
  };
  K.kit.label = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0, fs = o.size || (P ? 28 : 21);
    const tpl = o.text || '', style = o.style || 'box', anchor = o.anchor || 'center';
    const cnt = o.count ? Object.assign({}, o.count) : o.to != null ? { from: o.from || 0, to: o.to } : null;
    if (cnt) { cnt.from = cnt.from || 0; cnt.at = cnt.at ?? at + .2; cnt.dur = cnt.dur ?? 1.3; cnt.ease = cnt.ease || E.out(3); cnt.dec = cnt.decimals ?? cnt.dec ?? 0; cnt.sep = cnt.sep ?? o.sep ?? '.'; }
    const fill = (n) => (cnt ? tpl.replace('{n}', fmtNum(n, cnt.dec, cnt.sep)) : tpl);
    const upper = o.upper !== false;
    const fin = fill(cnt ? (Math.abs(cnt.to) >= Math.abs(cnt.from) ? cnt.to : cnt.from) : 0), finalS = upper ? fin.toUpperCase() : fin;
    const col = o.color || (style === 'tag' ? '#fff' : 'var(--k-fg)');
    const el = K.div(parent, `left:0;top:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const ST = {
      box: `border-radius:${fs * .32}px;box-shadow:inset 0 0 0 ${Math.max(1.2, fs * .055)}px ${mix(o.color || 'var(--k-fg)', .32)};padding:${fs * .42}px ${fs * .72}px;background:${o.bg || 'transparent'}`,
      tag: `border-radius:${fs * .32}px;padding:${fs * .42}px ${fs * .72}px;background:${o.bg || 'var(--k-fg)'}`,
      plain: '', dot: '',
    };
    const box = K.div(el, `display:flex;align-items:center;gap:${fs * .55}px;white-space:pre;color:${col};font:${o.weight || 500} ${fs}px/1 var(--k-mono);letter-spacing:${o.tracking ?? .14}em;${ST[style] ?? ''}`);
    box.__disp = 'flex';
    let dot = null;
    if (style === 'dot' || o.dot) dot = K.el('span', `display:block;flex:none;width:${fs * .42}px;height:${fs * .42}px;border-radius:50%;background:${o.dotColor || 'var(--k-accent3)'}`, box);
    const t = K.el('span', `display:block;min-width:${[...finalS].length}ch;text-align:${anchor === 'right' ? 'right' : anchor === 'left' ? 'left' : 'center'}`, box);
    t.className = 'kui-tab'; t.textContent = finalS;
    const bw = box.offsetWidth, bh = box.offsetHeight;
    box.style.left = (anchor === 'left' ? 0 : anchor === 'right' ? -bw : -bw / 2) + 'px'; box.style.top = -bh / 2 + 'px';
    const dec = o.decode ?? .55, od = o.outDur || .35, seed = o.seed ?? (tpl.length * 7 + 3);
    return {
      el, w: bw, h: bh, dur: Math.max(dec, cnt ? cnt.at + cnt.dur - at : 0),
      cues: () => [{ kind: 'blip', t: at, gain: .45 }].concat(cnt ? [{ kind: 'tick', t: cnt.at, gain: .4 }, { kind: 'tick', t: cnt.at + cnt.dur * .5, gain: .3 }] : []),
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const a = L.a, x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        const n = cnt ? K.lerp(cnt.from, cnt.to, cnt.ease(K.p(K.TQ(lt), cnt.at, cnt.at + cnt.dur))) : 0;
        let s = fill(cnt && !cnt.dec ? Math.round(n) : n); if (upper) s = s.toUpperCase();
        const k = Math.min(K.p(a, 0, dec), L.x > 0 ? 1 - L.x : 1);
        t.textContent = K.scramble(s, k, lt, seed) || '​';
        const q = E.snappy(K.p(a, 0, .38)), xq = L.x > 0 ? E.in(2)(K.p(L.x, .3, 1)) : 0;
        box.style.clipPath = style === 'box' || style === 'tag' ? (q >= 1 && xq <= 0 ? 'none' : `inset(-2px ${((1 - q) * 100).toFixed(2)}% -2px ${(xq * 100).toFixed(2)}% round ${fs * .32}px)`) : 'none';
        el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px)` + SC;
        if (dot) dot.style.transform = `scale(${(K.pop(a, .05, .4) * (1 + .28 * Math.max(0, Math.sin(a * 2 * Math.PI * 1.1)))).toFixed(3)})` + SC;
      },
    };
  };

  /* ================================================================== 10. LIGHTHOUSE gauges */
  const LHC = { pass: '#0CCE6B', avg: '#FFA400', fail: '#FF4E42' };
  const LHT = { light: { pass: '#008800', avg: '#C33300', fail: '#CC0000' }, dark: { pass: '#0CCE6B', avg: '#FFA400', fail: '#FF4E42' } };
  const lhClass = (v) => (v >= 90 ? 'pass' : v >= 50 ? 'avg' : 'fail');
  // gauge arc (viewBox 120, r 56) from 12 o'clock clockwise, as explicit geometry (dash path effects are not seek-order stable)
  const arcD = (q) => {
    if (q <= 0) return 'M60 4';
    if (q >= .9999) return 'M60 4A56 56 0 1 1 60 116A56 56 0 1 1 60 4';
    const a = (q * 360 - 90) * Math.PI / 180, x = 60 + 56 * Math.cos(a), y = 60 + 56 * Math.sin(a);
    return `M60 4A56 56 0 ${q > .5 ? 1 : 0} 1 ${x.toFixed(3)} ${y.toFixed(3)}`;
  };
  K.kit.lighthouse = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const scores = o.scores || [94, 100, 96, 100], from = o.from || null, n = scores.length;
    const labels = o.labels || ['Rendimiento', 'Accesibilidad', 'Prácticas recomendadas', 'SEO'];
    const layout = o.layout || (n === 1 ? 'single' : P && n >= 4 ? 'grid' : 'row'), dark = o.theme === 'dark', card = o.card ?? true;
    const w = even(o.w || (layout === 'single' ? (P ? K.W * .62 : K.W * .3) : layout === 'grid' ? (P ? K.W * .82 : K.W * .4) : P ? K.W * .9 : K.W * .6));
    const cols = layout === 'grid' ? 2 : layout === 'single' ? 1 : n, rows = Math.ceil(n / cols);
    const pad = card ? w * (layout === 'row' ? .05 : .08) : 0, cellW = (w - 2 * pad) / cols;
    const r = o.r || (layout === 'single' ? cellW * .36 : cellW * (layout === 'grid' ? .3 : .34));
    const lfs = o.labelSize || Math.max(layout === 'single' ? r * .2 : r * .27, P ? 22 : 18);
    const titleH = o.title ? lfs * 2.6 : 0;
    const cellH = 2 * r + r * .28 + lfs * 2.5;
    const H = even(2 * pad + titleH + rows * cellH);
    const stg = o.stagger ?? .12, dur = o.dur ?? 1.35;
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    if (card) K.div(el, `left:${-w / 2}px;top:${-H / 2}px;width:${w}px;height:${H}px;border-radius:${o.radius ?? Math.min(w, H) * .07}px;background:${dark ? '#202124' : '#fff'};box-shadow:0 ${w * .06}px ${w * .12}px ${-w * .04}px rgba(14,18,40,${dark ? .6 : .35}),0 0 0 1px ${dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)'}`);
    if (o.title) K.div(el, `left:${-w / 2}px;top:${-H / 2 + pad * .9}px;width:${w}px;text-align:center;font:500 ${lfs * .85}px/1 var(--k-mono);letter-spacing:.16em;text-transform:uppercase;color:${dark ? '#9aa0a6' : '#5f6368'}`, esc(o.title));
    const G = scores.map((to, i) => {
      const col = i % cols, row = Math.floor(i / cols), inRow = Math.min(cols, n - row * cols);
      const cx = -w / 2 + pad + (col + .5) * cellW + (cols - inRow) * cellW / 2, cy = -H / 2 + pad + titleH + row * cellH + r;
      const g = K.div(el, `left:${cx}px;top:${cy}px;width:0;height:0`);
      const sv = K.div(g, `left:${-r * 1.5}px;top:${-r * 1.5}px;width:${3 * r}px;height:${3 * r}px`, `<svg viewBox="-30 -30 180 180" width="100%" height="100%"><circle cx="60" cy="60" r="56" class="bg"/><path class="arc" fill="none" stroke-width="${o.stroke || 8}" stroke-linecap="round" d=""/><circle cx="60" cy="60" r="56" class="flash" fill="none" stroke-width="3" opacity="0"/></svg>`);
      const bg = sv.querySelector('.bg'), arc = sv.querySelector('.arc'), flash = sv.querySelector('.flash');
      const num = K.div(g, `left:${-r}px;top:${-r}px;width:${2 * r}px;height:${2 * r}px;display:flex;align-items:center;justify-content:center;font:600 ${r * (String(to).length > 2 ? .56 : .66)}px/1 var(--k-mono);letter-spacing:-.04em`);
      num.className = 'kui-tab';
      const lab = K.div(g, `left:${-cellW * .48}px;top:${r * 1.26}px;width:${cellW * .96}px;text-align:center;font:500 ${lfs}px/1.16 var(--k-display);letter-spacing:-.01em;color:${dark ? '#e8eaed' : '#3c4043'}`, rich(labels[i] || ''));
      const f0 = from ? from[i] : null;
      const ti = at + i * stg, c0 = from ? (o.countAt ?? at + .75 + n * stg) + i * (o.countStagger ?? stg) : ti + .12;
      const val = (lt) => {
        if (f0 == null) return to * E.out(3)(K.p(lt, c0, c0 + dur));
        if (lt < c0) return f0 * E.out(3)(K.p(lt, ti + .08, ti + .65));
        return K.lerp(f0, to, E.inOut(2.2)(K.p(lt, c0, c0 + dur)));
      };
      let tc = null;
      if (f0 != null && lhClass(f0) !== lhClass(to)) for (let t = c0; t <= c0 + dur + 1e-6; t += 1 / 240) if (lhClass(Math.round(val(t))) === lhClass(to)) { tc = t; break; }
      let delta = null;
      if (f0 != null && o.delta !== false && to !== f0) delta = K.div(g, `left:${r * .5}px;top:${-r * 1.18}px;padding:${r * .07}px ${r * .14}px;border-radius:${r}px;background:${to > f0 ? LHC.pass : LHC.fail};color:#fff;font:700 ${r * .24}px/1 var(--k-mono);letter-spacing:-.02em;white-space:nowrap;box-shadow:0 ${r * .06}px ${r * .14}px -${r * .04}px rgba(0,0,0,.3)`, (to > f0 ? '+' : '−') + Math.abs(to - f0));
      return { g, bg, arc, flash, num, lab, val, ti, c0, tc, delta };
    });
    const od = o.outDur || .4;
    return {
      el, w, h: H, dur: G[n - 1].c0 + dur - at,
      cues: () => {
        const c = [{ kind: 'whoosh', t: at, gain: .6 }];
        G.forEach((g) => c.push({ kind: 'pop', t: g.ti, gain: .45 }));
        if (from) c.push({ kind: 'riser', t: G[n - 1].c0 + dur, gain: .45 });   // risers END on t (mix.py)
        G.forEach((g) => { if (g.tc != null) c.push({ kind: 'ding', t: g.tc, gain: .7 }); });
        return c;
      },
      update(lt) {
        const L = life(lt, at - .05, o.out, od); vis(el, !!L); if (!L) return;
        const x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        const a = L.a, sp = K.spring(a, 0, { k: 110, c: 14 });
        let s = K.lerp(.86, 1, sp), dy = (1 - E.snappy(K.p(a, 0, .5))) * H * .18, b = Math.max(0, 1 - a / .16) * 10;
        if (L.x > 0) { const xq = E.in(2.5)(L.x); s *= 1 - xq * .5; dy += xq * H * .3; b = Math.max(b, xq * 16); }
        s *= V(o.s, lt, 1);
        el.style.transform = `translate(${x.toFixed(2)}px,${(y + dy).toFixed(2)}px) scale(${s.toFixed(4)})` + SC;
        el.style.filter = blurF(b);
        G.forEach((g) => {
          const v = g.val(lt), vn = Math.round(g.val(K.TQ(lt))), cl = lhClass(vn), sc = LHC[cl];
          const gs = K.lerp(.35, 1, K.pop(lt, g.ti, .55));
          const kick = g.tc != null && lt >= g.tc ? bump(lt - g.tc, .08, .5) * .12 : 0;
          g.g.style.display = lt < g.ti ? 'none' : 'block';
          g.g.style.transform = `scale(${(gs * (1 + kick)).toFixed(4)})` + SC;
          g.g.style.filter = blurF(Math.max(0, 1 - (lt - g.ti) / .18) * 10);
          g.arc.style.stroke = sc; g.arc.setAttribute('d', arcD(K.clamp(v / 100)));
          g.bg.style.fill = mix(sc, dark ? .16 : .1);
          g.num.style.color = LHT[dark ? 'dark' : 'light'][cl]; g.num.textContent = vn;
          g.lab.style.opacity = K.p(lt, g.ti + .1, g.ti + .4).toFixed(3);
          g.lab.style.transform = `translateY(${((1 - E.snappy(K.p(lt, g.ti + .1, g.ti + .45))) * r * .25).toFixed(2)}px)` + SC;
          if (g.tc != null && lt >= g.tc && lt < g.tc + .6) { const q = E.out(3)(K.p(lt, g.tc, g.tc + .6)); g.flash.setAttribute('r', (56 + q * 26).toFixed(2)); g.flash.style.stroke = sc; g.flash.style.opacity = (1 - q).toFixed(3); }
          else g.flash.style.opacity = 0;
          if (g.delta) { const dt = g.c0 + dur - .15; g.delta.style.transform = `scale(${K.pop(lt, dt, .45).toFixed(4)})` + SC; g.delta.style.display = lt < dt ? 'none' : 'block'; }
        });
      },
    };
  };

  /* ================================================================== 11. NOTIFICATION (iOS banner) */
  K.kit.notification = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const w = o.w || (P ? K.W - 72 : K.W * .34), dark = o.theme === 'dark';
    const ic = w * .108, pd = w * .036, rad = o.radius ?? w * .055;
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z ?? 30}`); el.className = 'kui-ui';
    const mat = dark ? 'background:rgba(36,36,40,.78);color:#fff' : 'background:rgba(246,246,248,.84);color:#111214';
    const ghosts = [];
    for (let k = Math.min(2, o.stack || 0); k >= 1; k--) ghosts.push(K.div(el, `left:${-w / 2}px;top:0;width:${w}px;border-radius:${rad}px;${mat};backdrop-filter:blur(24px) saturate(1.8);-webkit-backdrop-filter:blur(24px) saturate(1.8);box-shadow:0 ${w * .03}px ${w * .06}px -${w * .02}px rgba(0,0,0,.25);transform-origin:50% 100%`));
    const card = K.div(el, `left:${-w / 2}px;top:0;width:${w}px;box-sizing:border-box;padding:${pd}px;border-radius:${rad}px;display:flex;gap:${pd * .9}px;align-items:center;${mat};backdrop-filter:blur(26px) saturate(1.8);-webkit-backdrop-filter:blur(26px) saturate(1.8);box-shadow:0 ${w * .05}px ${w * .1}px -${w * .035}px rgba(0,0,0,.38),0 0 0 1px ${dark ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.6)'} inset`);
    card.__disp = 'flex';
    const icon = K.el('div', `flex:none;width:${ic}px;height:${ic}px;border-radius:${ic * .235}px;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${o.iconBg || 'var(--k-fg)'};color:#fff;font:800 ${ic * .5}px/1 var(--k-display);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)`, card);
    const I = o.icon;
    if (I && typeof I === 'object' && I.img) { const im = K.el('img', `width:${I.fit === 'contain' ? '72%' : '100%'};height:${I.fit === 'contain' ? '72%' : '100%'};object-fit:${I.fit || 'cover'};display:block`, icon); im.decoding = 'sync'; im.src = I.img; K.images.push(im); }
    else icon.textContent = I || (o.app || o.title || 'N')[0];
    const col = K.el('div', 'flex:1;min-width:0', card);
    const r1 = K.el('div', `display:flex;align-items:baseline;justify-content:space-between;gap:${pd}px`, col);
    K.el('div', `font:650 ${w * .037}px/1.15 var(--k-display);letter-spacing:-.015em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis`, r1, rich(o.title || o.app || 'North Pearl'));
    K.el('div', `flex:none;font:400 ${w * .03}px/1 var(--k-display);color:${dark ? 'rgba(255,255,255,.55)' : 'rgba(17,18,20,.5)'}`, r1, esc(o.time || 'ahora'));
    K.el('div', `margin-top:${w * .006}px;font:400 ${w * .035}px/1.25 var(--k-display);letter-spacing:-.01em;display:-webkit-box;-webkit-line-clamp:${o.lines || 2};-webkit-box-orient:vertical;overflow:hidden;opacity:.92`, col, rich(o.body || ''));
    const ch = card.offsetHeight;
    ghosts.forEach((gEl, i) => { gEl.style.height = ch + 'px'; gEl.__k = ghosts.length - i; });
    const od = o.outDur || .38;
    return {
      el, w, h: ch, dur: .7,
      cues: () => [{ kind: 'ding', t: at + .06, gain: .75 }].concat(o.out != null ? [{ kind: 'swoosh', t: o.out, gain: .4 }] : []),
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const a = L.a, x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.safe().top + (P ? 20 : 0));
        const travel = y + ch + 80, sp = K.spring(a, 0, { k: 170, c: 17 });
        let dy = -(1 - sp) * travel, b = Math.max(0, 1 - a / .14) * 8;
        const s = K.lerp(.94, 1, E.soft(K.p(a, 0, .6)));
        if (L.x > 0) { const q = E.expoIn(L.x); dy -= q * travel; b = Math.max(b, q * 8); }
        el.style.transform = `translate(${x.toFixed(2)}px,${(y + dy).toFixed(2)}px) scale(${s.toFixed(4)})` + SC;
        el.style.filter = blurF(b);
        ghosts.forEach((gEl) => { const k = gEl.__k, gq = E.soft(K.p(a, .12 + k * .06, .6 + k * .06)); gEl.style.transform = `translateY(${(ch * .07 * k * gq).toFixed(2)}px) scale(${(1 - .05 * k).toFixed(3)})` + SC; gEl.style.opacity = (gq * (1 - k * .25)).toFixed(3); });
      },
    };
  };

  /* ================================================================== 12. PLAYER (video chrome over media) */
  const fmtTime = (s, total) => { s = Math.max(0, Math.floor(s)); const hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60; return (total >= 3600 ? hh + ':' + String(mm).padStart(2, '0') : mm) + ':' + String(ss).padStart(2, '0'); };
  K.kit.player = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0;
    const w = even(o.w || (P ? K.W * .9 : K.W * .58)), h = even(o.h || w * (o.ratio ?? 9 / 16)), rad = o.radius ?? w * .035;
    const u = w / 100, total = o.duration ?? 112, T0 = o.start ?? 0;
    const tog = [...(o.pauseAt || []).map((t) => [t, 0]), ...(o.playAt || []).map((t) => [t, 1])].sort((a, b) => a[0] - b[0]);
    const vt = (lt) => { let pl = o.playing !== false ? 1 : 0, t = at, acc = T0; if (lt < at) return T0; for (const [te, st] of tog) { if (te >= lt) break; if (te < at) { pl = st; continue; } if (pl) acc += te - t; t = te; pl = st; } if (pl) acc += lt - t; return Math.min(acc, total); };
    const playingAt = (lt) => { let pl = o.playing !== false ? 1 : 0; for (const [te, st] of tog) if (K.TQ(lt) >= te) pl = st; return pl; };
    const el = K.div(parent, `left:0;top:0;width:0;height:0;perspective:${w * 3.2}px;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const body = K.div(el, `left:${-w / 2}px;top:${-h / 2}px;width:${w}px;height:${h}px;transform-style:preserve-3d`);
    const fr = K.div(body, `inset:0;border-radius:${rad}px;overflow:hidden;background:#000;box-shadow:0 ${w * .06}px ${w * .12}px ${-w * .04}px rgba(10,12,30,.5),0 ${w * .015}px ${w * .03}px ${-w * .01}px rgba(10,12,30,.25)`);
    const md = media(fr, Object.assign({}, o, { clipTime: o.clip ? (lt) => vt(lt - (K.t - K.heldTime(K.t))) - T0 + (o.clipIn || 0) : null }), w, h);
    const grad = K.div(fr, `left:0;right:0;bottom:0;height:${h * .55}px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.38) 45%,rgba(0,0,0,.72))`);
    const fsz = Math.max(14, u * 2.4);
    const tag = o.tag ? K.div(fr, `left:${u * 3.2}px;top:${u * 3.2}px;display:flex;align-items:center;gap:${u * .9}px;padding:${u * 1.1}px ${u * 1.8}px;border-radius:${u * 5}px;background:rgba(14,16,30,.55);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:#fff;font:600 ${fsz}px/1 var(--k-display);letter-spacing:-.01em;white-space:nowrap;box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);transform-origin:0 50%`, `<span style="display:block;width:${fsz}px;height:${fsz}px;color:var(--k-accent2)">${ICON.sparkle}</span>${rich(o.tag)}`) : null;
    if (tag) tag.__disp = 'flex';
    const pb = u * 3.6, ctrlH = Math.round(u * 3.4 / 2) * 2, trkH = Math.max(4, Math.round(u * .75 / 2) * 2), ctrlY = Math.round(h - pb - ctrlH);
    const info = K.div(fr, `left:${pb}px;right:${pb}px;bottom:${pb + u * 6.4}px;color:#fff`);
    if (o.meta) K.el('div', `font:500 ${u * 2.1}px/1.2 var(--k-mono);letter-spacing:.14em;text-transform:uppercase;opacity:.75;margin-bottom:${u * 1.2}px`, info, esc(o.meta));
    if (o.title) K.el('div', `font:800 ${o.titleSize || u * 5.2}px/.95 var(--k-display);letter-spacing:-.035em`, info, rich(o.title));
    const ctrl = K.div(fr, `left:${Math.round(pb)}px;right:${Math.round(pb)}px;top:${ctrlY}px;height:${ctrlH}px;display:flex;align-items:center;gap:${Math.round(u * 2)}px;color:#fff`);
    ctrl.__disp = 'flex';
    const ppB = K.el('div', `position:relative;flex:none;width:${u * 3.2}px;height:${u * 3.2}px`, ctrl);
    const icPause = K.div(ppB, 'inset:0', ICON.pause), icPlay = K.div(ppB, 'inset:0', ICON.play);
    const trk = K.el('div', `position:relative;flex:1;height:${trkH}px;border-radius:${trkH}px;background:rgba(255,255,255,.28)`, ctrl);
    const fill = K.div(trk, `left:0;top:0;height:100%;width:0;border-radius:${trkH}px;background:${o.color || 'var(--k-accent3)'}`);
    const knob = K.div(trk, `left:0;top:50%;width:${u * 2}px;height:${u * 2}px;margin:${-u}px 0 0 ${-u}px;border-radius:50%;background:#fff;box-shadow:0 0 0 ${u * .5}px ${mix(o.color || 'var(--k-accent3)', .35)}`);
    const tim = K.el('div', `flex:none;font:500 ${u * 2.2}px/1 var(--k-mono);letter-spacing:.02em;min-width:${u * 11}px;text-align:right`, ctrl); tim.className = 'kui-tab';
    K.el('div', `flex:none;width:${u * 3}px;height:${u * 3}px`, ctrl, ICON.volume);
    K.el('div', `flex:none;width:${u * 2.8}px;height:${u * 2.8}px`, ctrl, ICON.full);
    const flash = K.div(fr, `left:${w / 2 - u * 7}px;top:${h / 2 - u * 7}px;width:${u * 14}px;height:${u * 14}px;border-radius:50%;background:rgba(10,12,24,.45);backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px);color:#fff;display:none`);
    const fIc = K.div(flash, `left:${u * 3.8}px;top:${u * 3.8}px;width:${u * 6.4}px;height:${u * 6.4}px`);
    const od = o.outDur || .45;
    return {
      el, body, frame: fr, w, h, media: md, prepare: md.prepare, videoTime: vt, dur: .9,
      cues: () => [{ kind: 'whoosh', t: at, gain: .7 }].concat(tog.map(([t]) => ({ kind: 'click', t, gain: .8 }))),
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const a = L.a, x = V(o.x, lt, K.W / 2), y = V(o.y, lt, K.H / 2);
        const p = pose(o, L, geo(x, y, w, h), 'rise', 'fall');
        const rx = V(o.rx, lt, 0) + p.rx * .5, ry = V(o.ry, lt, 0) + p.ry, rz = V(o.rz, lt, 0) + p.rz * .5, s = V(o.s, lt, 1) * p.s;
        el.style.transform = `translate(${(x + p.dx).toFixed(2)}px,${(y + p.dy).toFixed(2)}px)` + SC;
        el.style.filter = blurF(p.blur);
        body.style.transform = `rotateZ(${rz.toFixed(3)}deg) rotateY(${ry.toFixed(3)}deg) rotateX(${rx.toFixed(3)}deg) scale(${s.toFixed(4)})` + SC;
        const cq = E.snappy(K.p(a, .3, .75)), pq = E.snappy(K.p(a, .42, .95));
        info.style.transform = `translateY(${((1 - cq) * u * 5).toFixed(2)}px)` + SC; info.style.opacity = cq.toFixed(3); info.style.filter = blurF((1 - cq) * 8);
        grad.style.opacity = K.p(a, .2, .6).toFixed(3);
        ctrl.style.opacity = K.p(a, .4, .7).toFixed(3);
        if (tag) { tag.style.transform = `scale(${K.lerp(.4, 1, K.pop(a, .5, .5)).toFixed(4)})` + SC; tag.style.opacity = K.p(a, .5, .62).toFixed(3); }
        const v = vt(lt), prog = K.clamp(v / total) * pq;
        fill.style.width = (prog * 100).toFixed(3) + '%'; knob.style.left = (prog * 100).toFixed(3) + '%';
        tim.textContent = (o.showTime === 'elapsed' ? '' : '-') + fmtTime(o.showTime === 'elapsed' ? v : total - v, total);
        const pl = playingAt(lt);
        icPause.style.display = pl ? 'block' : 'none'; icPlay.style.display = pl ? 'none' : 'block';
        let last = null; for (const [te] of tog) if (lt >= te) last = te;
        if (last != null && lt < last + .6) {
          const q = K.p(lt, last, last + .6); flash.style.display = 'block';
          flash.style.transform = `scale(${K.lerp(.7, 1.25, E.out(2)(q)).toFixed(4)})` + SC; flash.style.opacity = (1 - E.in(2)(q)).toFixed(3);
          const want = pl ? 'play' : 'pause'; if (fIc.__ic !== want) { fIc.innerHTML = ICON[want]; fIc.__ic = want; }
          ppB.style.transform = `scale(${(1 + Math.max(0, bump(lt - last, .05, .35)) * .25).toFixed(3)})` + SC;
        } else { flash.style.display = 'none'; ppB.style.transform = 'none'; }
        md.update(lt);
      },
    };
  };

  /* ================================================================== 13. BUTTON (CTA) */
  const BTN = {
    accent: { bg: 'var(--k-accent)', fg: '#fff', ib: '#fff', ic: 'var(--k-accent)', glow: 'var(--k-accent)' },
    dark: { bg: 'var(--k-fg)', fg: '#fff', ib: 'var(--k-accent2)', ic: 'var(--k-fg)', glow: '#000' },
    light: { bg: '#fff', fg: 'var(--k-fg)', ib: 'var(--k-fg)', ic: '#fff', glow: '#1a2050' },
    lime: { bg: 'var(--k-accent2)', fg: 'var(--k-fg)', ib: 'var(--k-fg)', ic: 'var(--k-accent2)', glow: '#3a4a00' },
    hot: { bg: 'var(--k-accent3)', fg: '#fff', ib: '#fff', ic: 'var(--k-accent3)', glow: 'var(--k-accent3)' },
    whatsapp: { bg: '#25D366', fg: '#fff', ib: '#fff', ic: '#128C4A', glow: '#128C4A' },
    outline: { bg: 'transparent', fg: 'var(--k-fg)', ib: 'var(--k-fg)', ic: '#fff', glow: 'transparent' },
  };
  K.kit.button = (parent, o = {}) => {
    const P = PORT(), at = o.at || 0, fs = o.size || (P ? 70 : 46);
    const st = BTN[o.style || 'accent'] || BTN.accent, icon = o.icon === undefined ? 'arrow' : o.icon;
    const ph = fs * 1.95, isz = ph * .72;
    const el = K.div(parent, `left:0;top:0;width:0;height:0;z-index:${o.z || 0}`); el.className = 'kui-ui';
    const ring = K.div(el, `left:0;top:0;box-sizing:border-box;border-radius:${ph}px;border:${fs * .06}px solid ${st.bg === 'transparent' ? 'var(--k-fg)' : st.bg};display:none`);
    const btn = K.div(el, `top:${-ph / 2}px;height:${ph}px;border-radius:${ph / 2}px;overflow:hidden;background:${st.bg};box-shadow:0 ${fs * .45}px ${fs * .95}px ${-fs * .38}px ${mix(st.glow, .75)},0 ${fs * .08}px ${fs * .16}px ${-fs * .04}px ${mix(st.glow, .3)},inset 0 ${fs * .05}px 0 rgba(255,255,255,.28),inset 0 ${-fs * .06}px ${fs * .12}px rgba(0,0,0,.12)${o.style === 'outline' ? `,inset 0 0 0 ${fs * .07}px var(--k-fg)` : ''}`);
    const content = K.div(btn, `left:0;top:0;height:${ph}px;display:flex;align-items:center;gap:${fs * .42}px;white-space:nowrap;box-sizing:border-box;padding:0 ${icon ? (ph - isz) / 2 : fs * .9}px 0 ${fs * .9}px;color:${st.fg};font:800 ${fs}px/1 var(--k-display);letter-spacing:-.035em`);
    content.__disp = 'flex';
    const label = K.el('span', `display:block;padding:0 .08em;margin:0 -.08em;word-spacing:${o.wordSpace ?? .12}em`, content, rich(o.text || 'Escríbenos'));
    let ib = null, iin = null;
    if (icon) {
      ib = K.el('span', `position:relative;display:block;flex:none;width:${isz}px;height:${isz}px;background:radial-gradient(circle closest-side,${st.ib} calc(100% - 1.2px),transparent 100%);color:${st.ic}`, content);
      const ihtml = ICON[icon] ? ICON[icon] : typeof icon === 'string' && icon.trim().startsWith('<svg') ? icon : `<span style="display:flex;width:100%;height:100%;align-items:center;justify-content:center;font-size:${isz * .55}px">${esc(icon)}</span>`;
      iin = K.el('span', `position:absolute;left:${isz * .22}px;top:${isz * .22}px;width:${isz * .56}px;height:${isz * .56}px;display:block`, ib, ihtml);
    }
    const shine = K.div(btn, `top:${-ph * .2}px;height:${ph * 1.4}px;width:${fs * 1.5}px;left:0;background:linear-gradient(90deg,rgba(255,255,255,0),rgba(255,255,255,.5),rgba(255,255,255,0));display:none`);
    const pw = content.offsetWidth;
    const presses = o.pressAt == null ? [] : [].concat(o.pressAt);
    const shines = o.shine === false ? [] : Array.isArray(o.shine) ? o.shine.slice() : [at + .75];
    if (o.shineEvery) for (let t = at + .75 + o.shineEvery; t < at + 60; t += o.shineEvery) shines.push(t);
    const enter = o.enter || 'grow', od = o.outDur || .45;
    const bx = (lt) => V(o.x, lt, K.W / 2), by = (lt) => V(o.y, lt, P ? K.H * .66 : K.H * .7);
    return {
      el, w: pw, h: ph, dur: .8,
      // film coords of the icon circle centre (or the pill centre without icon) — aim a cursor click here
      iconAt: (lt = 1e9) => [bx(lt) + (icon ? (pw / 2 - ph / 2) * V(o.s, lt, 1) : 0), by(lt)],
      cues: () => [{ kind: 'pop', t: at, gain: .8 }].concat(presses.map((t) => ({ kind: 'click', t, gain: 1 })), presses.map((t) => ({ kind: 'cta', t: t + .02, gain: .7 }))),
      update(lt) {
        const L = life(lt, at, o.out, od); vis(el, !!L); if (!L) return;
        const a = L.a, x = bx(lt), y = by(lt);
        let s = K.lerp(.25, 1, K.pop(a, 0, .5)), wq = enter === 'grow' ? E.bez(.6, 0, .1, 1)(K.p(a, .14, .66)) : 1;
        const b = Math.max(0, 1 - a / .14) * 10;
        if (enter === 'pop') s = K.lerp(.2, 1, K.pop(a, 0, .55));
        if (L.x > 0) { wq *= 1 - E.in(2)(K.p(L.x, 0, .55)); s *= 1 - E.in(3)(K.p(L.x, .45, 1)) * .99; }
        if (o.pulse) s *= 1 + .028 * Math.sin((a - .8) * 2 * Math.PI * 1.1) * K.p(a, .8, 1.2);
        s *= V(o.s, lt, 1);
        let pr = 0, prT = null; for (const t of presses) { const v = bump(lt - t, .07, .42); if (Math.abs(v) > Math.abs(pr)) { pr = v; prT = t; } }
        const cw = K.lerp(ph, pw, wq);
        btn.style.width = cw.toFixed(2) + 'px'; btn.style.left = (-cw / 2).toFixed(2) + 'px';
        content.style.left = (icon ? cw - pw : (cw - pw) / 2).toFixed(2) + 'px';   // with an icon: the icon leads (visible in the circle), the label is revealed behind it
        el.style.transform = `translate(${x.toFixed(2)}px,${y.toFixed(2)}px) scale(${(s * (1 - pr * .05)).toFixed(4)},${(s * (1 - pr * .1)).toFixed(4)})` + SC;
        el.style.filter = blurF(b);
        const lq = E.snappy(K.p(a, .3, .75));
        label.style.transform = `translateY(${((1 - lq) * fs * .45).toFixed(2)}px)` + SC; label.style.filter = blurF((1 - lq) * 8); label.style.opacity = lq.toFixed(3);
        if (ib) { ib.style.transform = `scale(${K.lerp(.3, 1, K.pop(a, .05, .45)).toFixed(4)})` + SC; iin.style.transform = `translateX(${(Math.max(0, pr) * isz * .22).toFixed(2)}px)` + SC; }
        let sh = null; for (const t of shines) if (lt >= t && lt < t + .6) sh = t;
        if (sh != null) { const q = E.inOut(2)(K.p(lt, sh, sh + .6)); shine.style.display = 'block'; shine.style.transform = `translateX(${K.lerp(-fs * 2, cw + fs * .5, q).toFixed(2)}px) skewX(-20deg)` + SC; }
        else shine.style.display = 'none';
        if (prT != null && lt >= prT && lt < prT + .55) {
          const q = E.out(3)(K.p(lt, prT, prT + .55)), gw = cw + q * fs * 1.2, gh = ph + q * fs * 1.2;
          ring.style.display = 'block'; ring.style.left = (-gw / 2).toFixed(1) + 'px'; ring.style.top = (-gh / 2).toFixed(1) + 'px';
          ring.style.width = gw.toFixed(1) + 'px'; ring.style.height = gh.toFixed(1) + 'px'; ring.style.opacity = (1 - q).toFixed(3);
        } else ring.style.display = 'none';
      },
    };
  };

  // every ui component accepts { cue: false } → cues() returns [] (silence one instance without touching the others)
  ['phone', 'browser', 'laptop', 'searchBar', 'cursor', 'chip', 'chipCloud', 'card', 'ticker', 'badge', 'label', 'lighthouse', 'notification', 'player', 'button'].forEach((n) => {
    const f = K.kit[n];
    K.kit[n] = (parent, o = {}) => { const c = f(parent, o); if (o.cue === false) c.cues = () => []; return c; };
  });
  K.kit.uiHelpers = { media, rich, fmtNum, ICON };   // internals, exposed for other families (not a component)
})();
