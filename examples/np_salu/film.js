/* np_salu v7 — North Pearl in the language of the "Salu" reference (refs/x_2110462034311856383.mp4, refs/analysis/salu).
   Rebuilt after reading EVERY reference frame (refs/analysis/salu/pages): the reference does not slide, it ANIMATES —
   the hook card turns over in perspective, question cards peel off like stickers, a chip morphs into the flying cursor,
   backgrounds flood from the action point, scenes open through rings, stamps slam in from the camera.
   Same size (1920×1080), fps (30), length (531 frames) and event frames as the reference; times are written as the
   reference's own frame numbers through F(). Check: ./katana match refs/x_2110462034311856383.mp4 <render> --every 0.5 */
(function () {
  K.setFormat('16x9');
  const { E, p, div, el, scene, lerp, clamp } = K, A = K.anim;
  const W = 1920, H = 1080, F = (f) => f / 30;

  /* ---------- constants: copy, colours ---------- */
  const C = { FIELD: '#FF6225', PAPER: '#F4EFE6', POP: '#12B5A6', INK: '#10201F', WHITE: '#FFFDF8' };
  const COPY = {
    hook: 'Toda web\ntiene una primera\nimpresión.', hola: 'Hola.', day: 'segundo uno',
    build: [['Rediseñamos'], ['la', 'tuya'], ['paso', 'a', 'paso.']], react: ['¡Así sí!', 'Perfecta.'],
    chipsTitle: ['¿Para qué la', 'quieres?'],
    chips: ['Tienda', 'Catálogo', 'Portafolio', 'Blog', 'Landing', 'Citas', 'Menú', 'Reservas'], chipGlyphs: ['$', '#', '★', 'Aa', '↗', '@', 'ñ', '✓'],
    qa: [
      { q: '¿Y carga\nrápido?', a: 'De 81\na 94.', label: 'RENDIMIENTO · LIGHTHOUSE', seal: ['caso', 'real'] },
      { q: '¿Me encuentra\nGoogle?', a: 'SEO:\n100.', label: 'LIGHTHOUSE · SEO', seal: ['caso', 'real'] },
      { q: '¿Y en el\ncelular?', a: 'Igual\nde bien.', label: 'MÓVIL · TABLET · PC', seal: ['móvil', 'y PC'] },
    ],
    code: '<h1>Hola, mundo</h1>', codeBubble: 'Hecha a medida.',
    ticket: { label: 'INFORME · LIGHTHOUSE', big: 'Aprobada.', sub: 'Caso real · 4 de 4 en verde', pill: 'Las cuatro en verde.', side: 'CASO REAL', no: 'N.º 001', before: [81, 87, 92, 100], after: [94, 100, 96, 100] },
    why: 'Cada sección\ntiene su\nporqué.', whyTags: ['título claro', 'botón a la vista'],
    stampsTitle: 'Lo que lleva una buena web', stamps: ['A+', 'SEO', '</>', '100', 'Aa', '↗', '@', 'ñ', '#', '¿?', '★', '∞', '1s', '✓'], stampsPill: 'sin relleno',
    pill: { label: 'NORTH PEARL · STACK', text: 'Hecha con Astro.' },
    tag: 'Webs que se entienden a la primera.', cta: 'Escríbenos',
  };
  K.bpm = 120; K.beatOffset = .054;
  K.theme = { bg: C.FIELD, fg: C.INK, accent: C.FIELD, display: '"Bricolage Grotesque", "Inter Tight", sans-serif', mono: '"Geist Mono", ui-monospace, monospace' };
  K.fonts = ['800 100px "Bricolage Grotesque"', '700 100px "Bricolage Grotesque"', '600 100px "Bricolage Grotesque"', '500 100px "Geist Mono"', '600 100px "Geist Mono"'];
  K.lens = false;                                                     // the reference is clean die-cut vector
  K.music = { src: 'projects/np_salu/audio/ref_track.wav', gain: 0 };   // the reference's own track: comparison only
  K.BG = C.FIELD;                                                     // every scene paints its own background (floods need layers)

  /* ---------- die-cut sticker filters (round dilate = blur + alpha threshold) ---------- */
  const mkStk = (id, ring, line, sh) => `<filter id="${id}" x="-25%" y="-35%" width="150%" height="170%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceAlpha" stdDeviation="${ring / 2}" result="b"/>
    <feComponentTransfer in="b" result="fat"><feFuncA type="linear" slope="60" intercept="-1.2"/></feComponentTransfer>
    <feFlood flood-color="${C.WHITE}"/><feComposite in2="fat" operator="in" result="white"/>
    <feGaussianBlur in="fat" stdDeviation="${line / 2}" result="b2"/>
    <feComponentTransfer in="b2" result="fat2"><feFuncA type="linear" slope="60" intercept="-1.2"/></feComponentTransfer>
    <feFlood flood-color="${C.INK}"/><feComposite in2="fat2" operator="in" result="ink"/>
    <feGaussianBlur in="fat2" stdDeviation="${sh}"/><feOffset dy="${sh * 1.2}" result="s0"/>
    <feComponentTransfer in="s0" result="shadow"><feFuncA type="linear" slope=".2"/></feComponentTransfer>
    <feMerge><feMergeNode in="shadow"/><feMergeNode in="ink"/><feMergeNode in="white"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  K.svgDefs().innerHTML += mkStk('stk', 10, 3, 7) + mkStk('stkS', 6, 2.4, 4);
  K.css('npsalu', `.d{font-family:var(--k-display);font-weight:800;letter-spacing:-.025em;line-height:.98;color:${C.INK};white-space:pre}
    .m{font-family:var(--k-mono);font-weight:500;letter-spacing:.22em;color:${C.INK};white-space:pre;text-transform:uppercase}
    .stk{filter:url(#stk)} .stkS{filter:url(#stkS)}`);

  /* ---------- builders ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const wrap = (root) => div(root, `left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`);
  const bg = (parent, color) => div(parent, `left:0;top:0;width:${W}px;height:${H}px;background:${color}`);
  const put = (parent, x, y, html, css = '', cls = '') => { const e = div(parent, `left:${x}px;top:${y}px;transform-origin:50% 50%;${css}`, html); if (cls) e.className = cls; return e; };
  const svg = (w, h, inner) => `<svg width="${w}" height="${h}" viewBox="${-w / 2} ${-h / 2} ${w} ${h}" style="display:block;overflow:visible">${inner}</svg>`;
  const pop = A.pop;
  const idle = (e, t, i = 0, amp = 9, rot = 2.2, hz = 1.15) => { if (e.style.visibility === 'hidden') return; const ph = i * 1.7;
    e.style.transform += ` translate(${(Math.sin(t * hz * 6.283 * .83 + ph) * amp * .5).toFixed(2)}px,${(Math.sin(t * hz * 6.283 + ph * 1.3) * amp).toFixed(2)}px) rotate(${(Math.sin(t * hz * 6.283 * 1.21 + ph) * rot).toFixed(3)}deg)`; };
  const cardCss = (fill, r = 48) => `box-sizing:border-box;background:${fill};border:5px solid ${C.INK};border-radius:${r}px;box-shadow:0 0 0 10px ${C.WHITE},0 26px 46px rgba(16,32,31,.22),inset 0 14px 22px rgba(255,255,255,.5),inset 0 -14px 24px rgba(0,0,0,.07)`;
  const sheetCss = (r = 48) => `box-sizing:border-box;background:${C.WHITE};border:5px solid ${C.INK};border-radius:${r}px;box-shadow:0 0 0 9px ${C.WHITE},0 14px 26px rgba(16,32,31,.14);transform-origin:50% 50%`;
  const card = (parent, { x, y, w, h, fill = C.WHITE, r = 48 }) => div(parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;${cardCss(fill, r)}`);
  const sealPath = (r, n = 14, a = .085) => { let d = ''; const N = n * 14; for (let i = 0; i <= N; i++) { const th = i / N * Math.PI * 2, rr = r * (1 + a * Math.cos(n * th)); d += (i ? 'L' : 'M') + (rr * Math.cos(th)).toFixed(1) + ',' + (rr * Math.sin(th)).toFixed(1); } return d + 'Z'; };
  const seal = (parent, x, y, r, fill, lines, color = C.INK) => put(parent, x, y, svg(r * 2.4, r * 2.4,
    `<path d="${sealPath(r)}" fill="${fill}" stroke="${C.INK}" stroke-width="4.5"/>` + lines.map((s, i) => `<text x="0" y="${(i - (lines.length - 1) / 2) * r * .46 + r * .15}" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="${r * (lines.length > 1 ? .44 : .62)}" fill="${color}" letter-spacing="-.5">${esc(s)}</text>`).join('')), '', 'stkS');
  const ticks = (parent, x, y, r, n = 9) => put(parent, x, y, svg(r * 3, r * 3, Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 + .3, c = Math.cos(a), s = Math.sin(a), k = 1 + .12 * K.hash(i * 3.1 + r); return `<line x1="${c * r * 1.08}" y1="${s * r * 1.08}" x2="${c * r * 1.3 * k}" y2="${s * r * 1.3 * k}" stroke="${C.INK}" stroke-width="4" stroke-linecap="round"/>`; }).join('')));
  const tickPop = (e, t, t0) => { pop(e, t, t0, { r0: 26, from: .55, d: .26, sq: 0 }); if (t >= t0) e.style.opacity = (1 - .75 * p(t, t0 + .2, t0 + .5)).toFixed(3); };   // radiating ticks flare, then stay faint
  const spark = (parent, x, y, s, color) => put(parent, x, y, svg(60, 60, `<path d="M0,-24 C3,-7 7,-3 24,0 C7,3 3,7 0,24 C-3,7 -7,3 -24,0 C-7,-3 -3,-7 0,-24Z" fill="${color}" stroke="${C.INK}" stroke-width="3.5" stroke-linejoin="round" transform="scale(${s})"/>`));
  const CUR = 'M-22,-34 L-22,30 L-6,15 L6,42 L19,36 L7,10 L28,10 Z';
  const cursor = (parent, x, y, s = 1, fill = C.WHITE) => put(parent, x, y, svg(90 * s, 110 * s, `<path d="${CUR}" fill="${fill}" stroke="${C.INK}" stroke-width="${5 / s}" stroke-linejoin="round" transform="scale(${s})"/>`), '', 'stkS');
  const browserDoodle = (parent, x, y, s = 1, fill = C.WHITE) => put(parent, x, y, svg(230 * s, 180 * s, `<g transform="scale(${s})"><rect x="-100" y="-74" width="200" height="148" rx="22" fill="${fill}" stroke="${C.INK}" stroke-width="5"/><path d="M-100,-36 H100" stroke="${C.INK}" stroke-width="5"/>
    <circle cx="-76" cy="-55" r="7" fill="${C.FIELD}" stroke="${C.INK}" stroke-width="3"/><circle cx="-54" cy="-55" r="7" fill="${C.POP}" stroke="${C.INK}" stroke-width="3"/><rect x="-78" y="-14" width="96" height="16" rx="8" fill="${C.INK}"/><rect x="-78" y="14" width="150" height="12" rx="6" fill="${C.INK}" opacity=".35"/><rect x="-78" y="36" width="64" height="24" rx="12" fill="${C.POP}" stroke="${C.INK}" stroke-width="3.5"/></g>`), '', 'stkS');
  const bolt = (s, fill) => `<path d="M6,-34 L-20,4 L-3,4 L-10,34 L20,-8 L3,-8 Z" fill="${fill}" stroke="${C.INK}" stroke-width="${4.5 / s}" stroke-linejoin="round" transform="scale(${s})"/>`;
  const bubblePath = (w, h, tail = 'r') => { const r = Math.min(h * .42, 70), x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2, tx = tail === 'r' ? x1 - w * .28 : x0 + w * .28, td = tail === 'r' ? 1 : -1, bA = Math.max(tx + td * 46, tx - td * 6), bB = Math.min(tx + td * 46, tx - td * 6);
    return `M${x0 + r},${y0} H${x1 - r} Q${x1},${y0} ${x1},${y0 + r} V${y1 - r} Q${x1},${y1} ${x1 - r},${y1} H${bA} L${tx + td * 62},${y1 + h * .26} L${bB},${y1} H${x0 + r} Q${x0},${y1} ${x0},${y1 - r} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0}Z`; };
  const bubbleSvg = (w, h, fill, tail = 'r', dots = false) => svg(w + 40, h * 1.6 + 40, `<path d="${bubblePath(w, h, tail)}" fill="${fill}" stroke="${C.INK}" stroke-width="5" stroke-linejoin="round"/>` + (dots ? [-1, 0, 1].map((i) => `<circle cx="${i * h * .26}" cy="0" r="${h * .075}" fill="${C.INK}"/>`).join('') : ''));
  const talk = (parent, x, y, w, h, fill, tail, text, size, cls = 'stk') => put(parent, x, y, `<div style="position:relative">${bubbleSvg(w, h, fill, tail)}<div class="d" style="position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;font-size:${size}px">${esc(text)}</div></div>`, '', cls);
  const typingDots = (e, t) => e.querySelectorAll('circle').forEach((c, i) => { c.setAttribute('cy', (-Math.max(0, Math.sin(t * 9 - i * .9)) * 9).toFixed(1)); });   // the "…" bubble keeps typing
  const squig = (parent, x, y, w, color = C.POP, sw = 11) => { const n = Math.max(2, Math.round(w / 46)), seg = w / n; let d = `M0,0 q${seg / 2},${-12} ${seg},0`; for (let i = 1; i < n; i++) d += ` t${seg},0`;
    const e = div(parent, `left:${x}px;top:${y}px`, `<svg width="${w + 20}" height="40" viewBox="-10 -20 ${w + 20} 40" style="display:block;overflow:visible"><path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/></svg>`); e.path = e.querySelector('path'); e.style.visibility = 'hidden'; return e; };
  const draw = (sq, t, t0, t1) => { sq.style.visibility = t < t0 ? 'hidden' : 'visible'; K.drawOn(sq.path, E.soft(p(t, t0, t1))); };
  const arrowDoodle = (parent, d) => { const e = div(parent, 'left:0;top:0', `<svg width="10" height="10" style="display:block;overflow:visible"><path d="${d}" fill="none" stroke="${C.INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`); e.path = e.querySelector('path'); e.style.visibility = 'hidden'; return e; };
  const pillEl = (parent, x, y, text, { fill = C.WHITE, color = C.INK, size = 44, padX = 34, padY = 14, mono = false } = {}) => put(parent, x, y,
    `<div class="${mono ? 'm' : 'd'}" style="font-size:${size}px;color:${color};background:${fill};border:4.5px solid ${C.INK};border-radius:999px;padding:${padY}px ${padX}px;${mono ? '' : 'letter-spacing:-.02em;'}">${esc(text)}</div>`, '', 'stkS');
  const glyph = (parent, x, y, text, color, size = 130) => put(parent, x, y, `<div class="d" style="font-size:${size}px;color:${color}">${esc(text)}</div>`, '', 'stk');
  const tile = (parent, x, y, text, fill, size = 86) => put(parent, x, y, `<div style="width:${size}px;height:${size}px;border-radius:${size * .24}px;background:${fill};border:4px solid ${C.INK};box-sizing:border-box;display:flex;align-items:center;justify-content:center"><span class="d" style="font-size:${size * (text.length > 1 ? .4 : .56)}px">${esc(text)}</span></div>`, '', 'stkS');
  const confetti = (parent, x, y, n, seed) => { const bits = []; for (let i = 0; i < n; i++) { const a = K.hash(i * 7.3 + seed) * Math.PI * 2, v = 260 + 520 * K.hash(i * 3.7 + seed + 1), s = 10 + 16 * K.hash(i * 5.1 + seed), col = [C.INK, C.POP, C.WHITE, C.FIELD][i % 4];
    bits.push({ e: div(parent, `left:${x}px;top:${y}px;width:${s}px;height:${s * .6}px;background:${col};border:2.5px solid ${C.INK};border-radius:3px;visibility:hidden`), a, v, w: 300 + 900 * K.hash(i + seed * 2) }); }
    return (t, t0) => bits.forEach((b) => { const dt = t - t0; if (dt < 0 || dt > 1.1) { b.e.style.visibility = 'hidden'; return; } b.e.style.visibility = 'visible';
      const k = 1 - Math.exp(-4.2 * dt), dx = Math.cos(b.a) * b.v * k, dy = Math.sin(b.a) * b.v * k * .8 + 420 * dt * dt;
      b.e.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${(b.w * dt).toFixed(1)}deg) scale(${(1 - p(dt, .7, 1.1)).toFixed(3)})`; }); };
  const phone = (parent, x, y, w, h, src) => { const g = div(parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-origin:50% 50%`);
    div(g, `inset:0;background:${C.WHITE};border:6px solid ${C.INK};border-radius:${w * .15}px;box-shadow:0 0 0 10px ${C.WHITE},0 0 0 13px ${C.INK},0 30px 50px rgba(16,32,31,.22)`);
    const scr = div(g, `left:20px;top:20px;right:20px;bottom:20px;border-radius:${w * .11}px;overflow:hidden;background:#fff;border:4px solid ${C.INK}`);
    g.img = K.img(scr, src, 'left:0;top:0;width:100%;height:auto;transform-origin:0 0');
    div(g, `left:50%;top:34px;width:${w * .26}px;height:22px;margin-left:${-w * .13}px;background:${C.INK};border-radius:20px`);
    return g; };
  const measure = (parent, text, size) => { const sp = el('span', `position:absolute;visibility:hidden;font-size:${size}px`, parent, esc(text)); sp.className = 'd'; const v = sp.offsetWidth; sp.remove(); return v; };
  // a sticker peels in 6–7 frames, on the reference's own poses: corner lifts (f0), 25 %, 56 %, 88 %, off — then it flies.
  // The fold is held still inside each frame (K.TQ), so every pose is a crisp folded sticker, as in the reference;
  // a fold that travels during the shutter smears into a white wipe and stops reading as paper. The fly-off does blur.
  const PEEL = [.035, .25, .56, .88, 1];
  const peelAt = (P, t, f0, hint) => { const n = Math.round(K.TQ(t) * 30) - f0, f = n < 0 ? 0 : n === 0 && hint ? hint : PEEL[Math.min(n, 4)] * P.U; P.set(f, p(t, F(f0 + 3.4), F(f0 + 6.8))); };
  // a slanted panel edge sweeps the frame (the reference's wedge wipe): clips `e` and moves the ink lines that ride on it
  const wedge = (e, lines, q, dir = -1, slant = 260) => { q = clamp(q); const xm = dir < 0 ? lerp(W + slant / 2 + 150, -slant / 2 - 150, q) : lerp(-slant / 2 - 150, W + slant / 2 + 150, q), xt = xm + slant / 2, xb = xm - slant / 2;
    e.style.clipPath = q >= 1 ? 'none' : dir < 0 ? `polygon(${xt}px 0px,${W + 10}px 0px,${W + 10}px ${H}px,${xb}px ${H}px)` : `polygon(-10px 0px,${xt}px 0px,${xb}px ${H}px,-10px ${H}px)`;
    lines.forEach((ln, i) => { ln.style.visibility = q > 0 && q < 1 ? 'visible' : 'hidden'; ln.style.transform = `translate(${xm - dir * i * 46}px,${H / 2}px) rotate(${Math.atan2(slant, H) * 180 / Math.PI}deg) translate(-3px,-${H}px)`; }); };
  const edgeLines = (parent, n = 2) => Array.from({ length: n }, () => div(parent, `left:0;top:0;width:6px;height:${2 * H}px;background:${C.INK};transform-origin:0 0;visibility:hidden`));

  /* ====================================================================================================
     A · f0–63 · HOOK — the stack types the hook; the top card TURNS OVER (f37–43) and its back says "Hola." */
  const HX = 250, HY = 125, HW = 1420, HH = 840, BUB = [HX + 600, HY + 430];   // hook card; centre of the "Hola." bubble (the iris opens there)
  let SA = {};
  scene({ id: 'hook', t0: 0, t1: F(63), post: .14,
    build(root) {
      const w = SA.w = wrap(root); bg(w, C.FIELD); SA.paper = bg(w, C.PAPER);
      SA.bd = browserDoodle(w, 190, 900, 1.25);
      SA.sh = [div(w, `left:${HX}px;top:${HY}px;width:${HW}px;height:${HH}px;${sheetCss()}`), div(w, `left:${HX}px;top:${HY}px;width:${HW}px;height:${HH}px;${sheetCss()}`)];
      SA.shG = glyph(SA.sh[1], HW - 70, 250, 'ñ', C.POP, 150);
      SA.sp2 = spark(w, 1760, 640, 1.2, C.POP);
      const fl = SA.flip = A.flip(w, { x: HX, y: HY, w: HW, h: HH });
      // front: the cream card
      const f = card(fl.front, { x: 0, y: 0, w: HW, h: HH, fill: C.WHITE });
      SA.t = put(f, 130, 290, '', 'font-size:108px', 'd');
      SA.tile = put(f, 1150, 200, `<div style="width:210px;height:250px;background:${C.FIELD};border:5px solid ${C.INK};border-radius:38px;display:flex;align-items:center;justify-content:center">${svg(120, 130, `<path d="${CUR}" fill="${C.WHITE}" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round" transform="scale(1.5)"/>`)}</div>`, '', 'stkS');
      SA.sealT = ticks(f, 1020, 250, 74, 10); SA.seal = seal(f, 1020, 250, 66, C.POP, ['SEG. 1']);
      SA.bub = put(f, 1090, 640, bubbleSvg(180, 116, C.PAPER, 'r', true), '', 'stkS'); SA.sp1 = spark(f, 880, 720, 1.1, C.FIELD);
      // back: the field-coloured card with the greeting
      const b = card(fl.back, { x: 0, y: 0, w: HW, h: HH, fill: C.FIELD });
      SA.dots = put(b, 1130, 190, bubbleSvg(190, 120, C.WHITE, 'r', true), '', 'stkS');
      SA.sp3 = spark(b, 760, 150, 1.1, C.WHITE); SA.sp4 = spark(b, 250, 250, .8, C.WHITE);
      SA.es = pillEl(b, 1210, 690, 'ES', { fill: C.POP, size: 34, padX: 20, padY: 12 });
      SA.ring = put(b, 600, 430, svg(620, 620, `<circle r="280" fill="none" stroke="${C.INK}" stroke-width="4" stroke-dasharray="2 22" stroke-linecap="round"/>`));
      SA.tk = ticks(b, 600, 430, 250, 14);
      SA.arrow = arrowDoodle(b, 'M1150,690 C1000,720 930,650 880,560 M880,560 l34,8 M880,560 l-6,34');
      SA.hola = talk(b, 600, 430, 560, 260, C.POP, 'l', COPY.hola, 158);
      SA.day = pillEl(w, 1600, 985, COPY.day, { size: 40 });
    },
    update(lt, t) {
      // the stack breathes; the right sheet slides out with a sticker (f24–36)
      const sl = E.soft(p(t, F(24), F(36)));
      SA.sh.forEach((s, i) => { const k = E.soft(p(t, -.25 + i * .07, .3 + i * .07)) + .12 * Math.sin(t * 4.2 + i * 2); s.style.transform = `rotate(${((i ? 5 + 2 * sl : -7) * k).toFixed(3)}deg) translate(${((i ? 44 + 130 * sl : -30) * k).toFixed(1)}px,${((i ? 18 : 26) * k).toFixed(1)}px)`; });
      pop(SA.shG, t, F(24), { rot: 12, r0: -40 }); idle(SA.shG, t, 4, 6, 3);
      // front face
      A.ghostType(SA.t, COPY.hook, t, 0, F(14), { seed: 7 });
      pop(SA.tile, t, -.2, { rot: 5 }); pop(SA.seal, t, F(1), { rot: -14, r0: 40, from: .2 }); tickPop(SA.sealT, t, F(3)); pop(SA.bub, t, -.2, { rot: 4 }); pop(SA.sp1, t, F(5), { r0: 60 }); pop(SA.sp2, t, F(9), { r0: -80 });
      typingDots(SA.bub, t); [SA.tile, SA.seal, SA.bub, SA.sp1, SA.sp2].forEach((e, i) => idle(e, t, i, 7, 2.2));
      pop(SA.bd, t, -.2, { rot: -8 }); idle(SA.bd, t, 6, 5, 2);
      // THE TURN: anticipation (f36–37), 180° about the vertical axis (f38–41), overshoot and settle (to f46); it comes towards the camera
      const q = p(t, F(35.6), F(46)), turn = A.anticipate(q, .05, .05), mid = Math.sin(Math.PI * clamp(turn));
      SA.flip.set(180 * turn, { z: 190 * mid, tilt: lerp(-3, 2.6, clamp(turn)), s: 1 });
      SA.paper.style.visibility = t >= F(38) ? 'visible' : 'hidden';        // the field swaps under the turning card, as in the reference
      // back face
      pop(SA.dots, t, F(42), { rot: 3 }); typingDots(SA.dots, t); idle(SA.dots, t, 3, 7, 2.5);
      pop(SA.sp3, t, F(43), { r0: 60 }); pop(SA.sp4, t, F(44), { r0: -60 }); pop(SA.es, t, F(43.5), { rot: -6 });
      pop(SA.hola, t, F(46.4), { d: .36, rot: -4, r0: -14, from: .1, sq: .2 }); idle(SA.hola, t, 0, 5, 1.2);
      pop(SA.ring, t, F(48.5), { d: .4, r0: 30, from: .6, sq: 0 }); if (t >= F(48.5)) SA.ring.style.transform += ` rotate(${(t * 16).toFixed(2)}deg)`;
      tickPop(SA.tk, t, F(49.5)); pop(SA.day, t, F(52.6), { rot: -5, from: .2 }); idle(SA.day, t, 2, 5, 1.6);
      draw(SA.arrow, t, F(55), F(58));
    } });

  /* B · f63–121 · BUILD — opens through a ring from the bubble (f61–65), the bubble is carried and thrown away;
     sticker words land one by one, the phone slides in, the field floods to paper from the phone's foot (f98–103) */
  let SB = {};
  scene({ id: 'build', t0: F(63), t1: F(121), pre: .08, post: .1,
    build(root) {
      const all = SB.all = wrap(root), w = SB.clip = wrap(all), over = SB.over = wrap(all);
      bg(w, C.FIELD); SB.flood = A.flood(w, { x: 1560, y: 1010, colors: [C.PAPER, C.FIELD, C.PAPER], ink: C.INK, gap: .16 });
      SB.iris = A.iris(w, { x: BUB[0], y: BUB[1], over, rings: [{ c: C.POP, w: 14 }, { c: C.INK, w: 5, off: 16 }] });
      SB.pin = cursor(w, 560, 190, 1.3, C.POP); SB.words = [];
      COPY.build.forEach((line, li) => { let x = 110; line.forEach((wd) => { const e = put(w, x, 400 + li * 138, `<span class="d" style="font-size:128px">${wd}</span>`, 'transform-origin:0 50%', 'stk'); SB.words.push({ e, sp: e.firstChild, li }); x += e.offsetWidth + 40; }); });
      const last = SB.words.filter((o) => o.li === 2), x1 = last[last.length - 1].e.offsetLeft + last[last.length - 1].e.offsetWidth;
      SB.sq = squig(w, 110, 400 + 2 * 138 + 78, x1 - 110, C.POP, 13);
      SB.ph = phone(w, 1180, 40, 520, 1040, '../assets/img/site_mobile.jpg');
      SB.r1 = talk(w, 1250, 600, 300, 100, C.FIELD, 'r', COPY.react[0], 50, 'stkS'); SB.r2 = talk(w, 1640, 800, 320, 100, C.WHITE, 'l', COPY.react[1], 50, 'stkS');
      SB.bdT = ticks(w, 1060, 560, 120, 11); SB.bd = browserDoodle(w, 1060, 560, 1.15);
      SB.tag = pillEl(w, 1760, 990, 'MÓVIL · WEB', { size: 30, mono: true }); SB.st = glyph(w, 1800, 870, 'ñ', C.POP, 150);
      SB.carry = talk(w, BUB[0], BUB[1], 560, 260, C.POP, 'l', COPY.hola, 158);            // the bubble, carried across the cut…
      SB.arc = A.arc(BUB[0], BUB[1], 1500, -320, -.22);                                    // …and thrown out on an arc
    },
    update(lt, t) {
      SB.iris.set(p(t, F(60.6), F(65.6)));
      const x = -E.in(3)(p(t, F(118.6), F(121.6))) * W * .5; SB.all.style.transform = x ? `translate(${x.toFixed(1)}px,0)` : 'none';
      const ck = p(t, F(62.5), F(67.5)), c = SB.arc(E.in(1.6)(ck)); SB.carry.style.visibility = t < F(67.6) ? 'visible' : 'hidden';
      SB.carry.style.left = c.x + 'px'; SB.carry.style.top = c.y + 'px'; SB.carry.style.transform = `translate(-50%,-50%) rotate(${(-4 + 250 * E.in(1.5)(ck)).toFixed(1)}deg) scale(${lerp(1, .7, ck).toFixed(3)})`;
      const WT = [F(61), F(66), F(68), F(69.5), F(70.3), F(72)];                            // reference frames of each word
      SB.words.forEach((o, i) => { pop(o.e, t, WT[i], { c: false, extra: 'translateY(-50%) ', rot: (i % 2 ? 1.2 : -1.2), r0: -7, from: .45, d: .3 }); o.sp.style.color = t < WT[i] + .075 ? C.POP : C.INK; });
      draw(SB.sq, t, F(76), F(81));
      const inP = E.out(3)(p(t, F(63.4), F(68.5)));
      SB.ph.style.transform = `translate(${((1 - inP) * 760).toFixed(1)}px,0) rotate(${(3 - 2 * inP + 1.2 * Math.sin(Math.PI * inP)).toFixed(3)}deg)`;
      SB.ph.img.style.transform = `translateY(${(-K.tw(t, F(70), F(121), 0, 1500, E.glide)).toFixed(1)}px)`;
      pop(SB.pin, t, F(64), { rot: -8, r0: 40 }); idle(SB.pin, t, 1, 7, 3);
      pop(SB.tag, t, F(67), { rot: -4 }); pop(SB.st, t, F(69), { rot: 9, r0: -30 }); idle(SB.st, t, 2, 7, 3);
      pop(SB.r1, t, F(82), { rot: -3, r0: -14, from: .2 }); idle(SB.r1, t, 3, 5, 1.6); pop(SB.r2, t, F(114), { rot: 3, r0: 14, from: .2 }); idle(SB.r2, t, 4, 5, 1.6);
      SB.flood.set(p(t, F(97.5), F(104)));
      pop(SB.bd, t, F(110), { rot: -6, r0: -30, from: .15 }); tickPop(SB.bdT, t, F(113)); idle(SB.bd, t, 5, 5, 2);
    } });

  /* C · f121–168 · CHIPS — enters behind a slanted edge (f121–124); the title is typed, "quieres?" slams in; a sticker
     lands on every chip in a wave (f131–163); the picked chip's corner lifts (f163–165) and it is carried to the centre */
  const CH_W = 410, CH_H = 170, chipXY = (i) => [85 + (i % 4) * 447 + CH_W / 2, 440 + Math.floor(i / 4) * 215 + CH_H / 2], PICK = 7;
  const chipHtml = (name, i, fill) => `<div style="width:${CH_W}px;height:${CH_H}px;box-sizing:border-box;background:${fill};border:5px solid ${C.INK};border-radius:36px;display:flex;align-items:center;gap:22px;padding:0 26px">
    <div style="width:104px;height:104px;flex:none;border-radius:24px;background:${fill === C.POP ? C.WHITE : i % 3 === 1 ? C.WHITE : C.FIELD};border:4px solid ${C.INK};box-sizing:border-box"></div>
    <div><div class="m" style="font-size:19px;opacity:.6">WEB · 0${i + 1}</div><div class="d" style="font-size:${name.length > 8 ? 46 : 54}px;margin-top:8px">${name}</div></div></div>`;
  let SC = {};
  scene({ id: 'chips', t0: F(121), t1: F(168), post: .12,
    build(root) {
      const all = wrap(root), w = SC.w = wrap(all); SC.lines = edgeLines(all); bg(w, C.FIELD); SC.grid = wrap(w); SC.chips = []; SC.st = [];
      SC.t1 = put(w, 0, 215, '', 'font-size:140px;transform-origin:0 50%;transform:translateY(-50%)', 'd');
      SC.t2 = put(w, 0, 215, `<span class="d" style="font-size:164px;color:${C.POP};font-style:italic;display:inline-block;transform:skewX(-8deg)">${COPY.chipsTitle[1]}</span>`, 'white-space:nowrap;transform-origin:0 50%', 'stk');
      const w1 = measure(w, COPY.chipsTitle[0], 140), tx = (W - (w1 + 34 + SC.t2.offsetWidth)) / 2; SC.t1.style.left = tx + 'px'; SC.t2.style.left = (tx + w1 + 34) + 'px';
      COPY.chips.forEach((name, i) => { const [cx, cy] = chipXY(i); SC.chips.push(i === PICK ? null : put(SC.grid, cx, cy, chipHtml(name, i, C.PAPER), '', 'stkS')); });
      // the picked chip is a real sticker: a layer that can peel, on a dark bed
      const [px, py] = chipXY(PICK), g = SC.pick = div(SC.grid, `left:0;top:0;width:${W}px;height:${H}px;transform-origin:${px}px ${py}px`);
      div(g, `left:${px - CH_W / 2}px;top:${py - CH_H / 2}px;width:${CH_W}px;height:${CH_H}px;box-sizing:border-box;border-radius:36px;border:5px solid ${C.INK};background:${C.INK};box-shadow:0 0 0 6px ${C.WHITE}`);
      SC.top = div(g, `left:0;top:0;width:${W}px;height:${H}px`); put(SC.top, px, py, chipHtml(COPY.chips[PICK], PICK, C.POP), 'transform:translate(-50%,-50%)', 'stkS');
      COPY.chipGlyphs.forEach((gl, i) => { const [cx, cy] = chipXY(i); SC.st.push(tile(i === PICK ? SC.top : SC.grid, cx - CH_W / 2 + 78, cy, gl, [C.WHITE, C.POP, C.FIELD, C.WHITE][i % 4], 92)); });
      SC.peel = A.peel(g, { el: SC.top, x: px - CH_W / 2, y: py - CH_H / 2, w: CH_W, h: CH_H, angle: 215, r: 36, ink: C.INK, back: C.WHITE, line: 5 });
      SC.tk = ticks(w, px + CH_W / 2 - 20, py + CH_H / 2 - 10, 60, 8);
    },
    update(lt, t) {
      wedge(SC.w, SC.lines, p(t, F(121), F(124.2)), -1);
      const sx = (1 - E.out(3)(p(t, F(121.5), F(128)))) * 1100; SC.grid.style.transform = sx > .1 ? `translate(${sx.toFixed(1)}px,0)` : 'none';
      SC.t1.style.visibility = t < F(127.5) ? 'hidden' : 'visible'; A.ghostType(SC.t1, COPY.chipsTitle[0], t, F(127.6), F(131.4), { seed: 4 });
      pop(SC.t2, t, F(131.6), { c: false, extra: 'translateY(-50%) ', rot: -3, r0: 16, from: 1.7, d: .3, sq: .1 });
      SC.chips.forEach((e, i) => { if (!e) return; e.style.transform = `translate(-50%,-50%) rotate(${i % 2 ? .8 : -.8}deg)`; idle(e, t, i, 3, .7, 1.3); });
      SC.st.forEach((e, i) => A.slamTo(e, t, F(131 + i * 4.3), { from: 2.1, rot: i % 2 ? 22 : -22, rest: (K.hash(i * 3.3) - .5) * 14 }));   // one sticker per chip, in a wave
      tickPop(SC.tk, t, F(163.4));
      SC.peel.set(lerp(0, 66, E.out(2)(p(t, F(162.6), F(165.4)))));                                                            // the corner lifts: it is a sticker
      const k = E.inOut(2.2)(p(t, F(165.5), F(169.5))), [px, py] = chipXY(PICK);
      SC.pick.style.transform = k > 0 ? `translate(${((960 - px) * k).toFixed(1)}px,${((540 - py) * k).toFixed(1)}px) rotate(${(-6 * Math.sin(Math.PI * k)).toFixed(2)}deg) scale(${(1 + .25 * Math.sin(Math.PI * k)).toFixed(4)})` : 'none';
    } });

  /* D · f168–181 · FLY — opens through a rounded box from the right (f166–169); the chip MORPHS into the cursor
     (f169–172), which loops on a dotted trail (f172–179) and dives at a target */
  const CHIP_D = `M${-CH_W / 2 + 36},${-CH_H / 2} H${CH_W / 2 - 36} Q${CH_W / 2},${-CH_H / 2} ${CH_W / 2},${-CH_H / 2 + 36} V${CH_H / 2 - 36} Q${CH_W / 2},${CH_H / 2} ${CH_W / 2 - 36},${CH_H / 2} H${-CH_W / 2 + 36} Q${-CH_W / 2},${CH_H / 2} ${-CH_W / 2},${CH_H / 2 - 36} V${-CH_H / 2 + 36} Q${-CH_W / 2},${-CH_H / 2} ${-CH_W / 2 + 36},${-CH_H / 2}Z`;
  const CUR_BIG = 'M-57,-88 L-57,78 L-16,39 L16,109 L49,94 L18,26 L73,26 Z';
  let SD = {};
  scene({ id: 'fly', t0: F(168), t1: F(181), pre: .08, post: .1,
    build(root) {
      const all = wrap(root), w = SD.clip = wrap(all), over = wrap(all); bg(w, C.PAPER);
      SD.flood = A.flood(w, { x: 960, y: 540, colors: [C.FIELD, C.PAPER], ink: C.INK, gap: .34 });   // default radius: the last ring's outline ends outside the frame
      SD.iris = A.iris(w, { x: 1500, y: 560, over, box: [1.5, 1], round: .44, rings: [{ c: C.POP, w: 14 }, { c: C.INK, w: 5, off: 16 }] });
      SD.dots = Array.from({ length: 16 }, (_, i) => div(w, `left:0;top:0;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;background:${i % 2 ? C.POP : C.FIELD};border:3px solid ${C.INK};box-sizing:border-box;visibility:hidden`));
      SD.target = put(w, 990, 950, svg(260, 260, `<circle r="92" fill="${C.WHITE}" stroke="${C.POP}" stroke-width="16"/><circle r="92" fill="none" stroke="${C.INK}" stroke-width="4"/><circle r="26" fill="${C.FIELD}" stroke="${C.INK}" stroke-width="4"/>` + Array.from({ length: 8 }, (_, i) => { const a = i / 8 * 6.283; return `<line x1="${Math.cos(a) * 40}" y1="${Math.sin(a) * 40}" x2="${Math.cos(a) * 58}" y2="${Math.sin(a) * 58}" stroke="${C.INK}" stroke-width="5" stroke-linecap="round"/>`; }).join('')), '', 'stkS');
      SD.g = put(w, 960, 540, `<svg width="10" height="10" style="display:block;overflow:visible"><path fill="${C.POP}" stroke="${C.INK}" stroke-width="5" stroke-linejoin="round"/></svg>`, '', 'stk'); SD.path = SD.g.querySelector('path');
      SD.lab = put(w, 960, 540, `<div class="d" style="font-size:54px">${COPY.chips[PICK]}</div>`, 'transform:translate(-50%,-50%)');
      SD.m = A.morph(CHIP_D, CUR_BIG);
      // flight: a loop, then a dive — one closed-form path for the cursor and its trail
      SD.pos = (u) => { const a = lerp(.9, 7.8, E.inOut(1.4)(clamp(u / .78))), R = 190, cx = 960 + 110 * u, cy = 400 - 40 * Math.sin(u * 3);
        const x = cx + R * Math.sin(a) - R * Math.sin(.9) * (1 - clamp(u * 6)), y = cy + R * Math.cos(a) * .82 + (540 - 400 - R * Math.cos(.9) * .82) * (1 - clamp(u * 6)), d = E.in(2.4)(clamp((u - .76) / .24));
        return [lerp(x, 990, d), lerp(y, 960, d)]; };
    },
    update(lt, t) {
      SD.iris.set(p(t, F(165.8), F(170)), E.out(1.4)); SD.flood.set(p(t, F(166.6), F(171.5)));
      const m = E.inOut(2)(p(t, F(168.8), F(172.2))), u = p(t, F(171), F(181.4));
      SD.path.setAttribute('d', SD.m(m)); SD.lab.style.opacity = (1 - p(t, F(168.6), F(170))).toFixed(3);
      const [x, y] = u > 0 ? SD.pos(u) : [960, 540], [x2, y2] = SD.pos(Math.min(1, u + .012)), ang = u > 0 ? Math.atan2(y2 - y, x2 - x) * 180 / Math.PI + 118 : 0;
      SD.g.style.left = x + 'px'; SD.g.style.top = y + 'px';
      SD.g.style.transform = `translate(-50%,-50%) rotate(${(ang * E.out(2)(p(u, 0, .12))).toFixed(1)}deg) scale(${(lerp(1, .9, m) * (1 + 1.3 * E.in(3)(p(u, .8, 1)))).toFixed(4)})`;
      SD.dots.forEach((d, i) => { const ui = .05 + i * .045, age = u - ui;                     // the trail is LEFT behind: each dot is a fixed point the cursor has passed
        if (age <= .02 || ui > .76) { d.style.visibility = 'hidden'; return; } const [dx, dy] = SD.pos(ui); d.style.visibility = 'visible'; d.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${(K.pop(age, .02, .08) * (1 - p(age, .3, .55))).toFixed(3)})`; });
      pop(SD.target, t, F(178.6), { from: .1, r0: 60, d: .2 });
    } });

  /* E, F, G · question card (a white sticker) → it PEELS off (6.5 frames) → the answer is underneath.
     Cards tumble in from the camera; the field floods from under the card; back sheets, seal, check and confetti land. */
  const qaScene = (id, f0, fPeel, f1, cp, o) => {
    const S = {}, X = 430, Y = 235, CW = 1060, CH = 610, PAD = 90, gw = CW + 2 * PAD, gh = CH + 2 * PAD;
    scene({ id, t0: F(f0), t1: F(f1), pre: .06, post: .06,
      build(root) {
        const w = S.w = wrap(root); bg(w, o.base);
        if (o.flood) S.flood = A.flood(w, { x: o.flood[1], y: o.flood[2], colors: [C.POP, C.FIELD], ink: C.INK, gap: .12 });
        S.paper = bg(w, C.PAPER); S.bd = browserDoodle(w, 250, 880, 1.2, o.seed % 2 ? C.WHITE : C.PAPER); S.conf0 = confetti(w, X + CW * .5, Y + CH * .55, 14, o.seed + 5);
        S.move = div(w, `left:0;top:0;width:${W}px;height:${H}px;transform-origin:${X + CW / 2}px ${Y + CH / 2}px`);
        S.g = div(S.move, `left:${X - PAD}px;top:${Y - PAD}px;width:${gw}px;height:${gh}px;transform-origin:50% 50%`);
        S.sh = [0, 1].map(() => div(S.g, `left:${PAD}px;top:${PAD}px;width:${CW}px;height:${CH}px;visibility:hidden;${sheetCss()}`));
        S.aW = div(S.g, 'inset:0;visibility:hidden'); const a = S.a = card(S.aW, { x: PAD, y: PAD, w: CW, h: CH, fill: C.FIELD });
        put(a, 80, 66, 'NORTH PEARL · NOTA', 'font-size:24px;opacity:.75', 'm');
        put(a, 76, 130, esc(cp.a), 'font-size:176px;line-height:.95', 'd');
        S.sq = squig(a, 80, 130 + 2 * 167 + 20, measure(a, cp.a.split('\n').pop(), 176), C.POP, 15);
        put(a, 80, 540, cp.label, 'font-size:22px;opacity:.75', 'm');
        S.tk = ticks(S.aW, PAD + CW - 110, PAD + 60, 96, 11); S.se = seal(S.aW, PAD + CW - 110, PAD + 60, 86, C.WHITE, cp.seal);
        S.gl = glyph(S.aW, PAD + CW + 6, PAD + 240, '✓', C.POP, 120);
        S.qW = div(S.g, 'inset:0'); const q = card(S.qW, { x: PAD, y: PAD, w: CW, h: CH, fill: C.WHITE });
        put(q, 80, 70, 'CLIENTE', 'font-size:24px;opacity:.65', 'm'); put(q, 78, 160, esc(cp.q), 'font-size:128px', 'd');
        S.qb = put(q, 870, 125, bubbleSvg(170, 104, C.FIELD, 'r', true), '', 'stkS'); S.qs = seal(q, 950, 500, 50, C.POP, ['?']);
        S.peel = A.peel(S.g, { el: S.qW, x: PAD, y: PAD, w: CW, h: CH, angle: 35, r: 48, ink: C.INK, back: C.WHITE });
        S.conf = confetti(w, X + CW - 60, Y + 40, 16, o.seed);
      },
      update(lt, t) {
        // in: tumbling from the camera (top-left) or from one side; out: thrown to one side
        const k = E.out(3)(p(t, F(f0 - 1.6), F(f0 + 3.2))), u = 1 - k, k2 = E.in(3)(p(t, F(f1 - 1.2), F(f1 + 1.7))), od = o.out === 'r' ? 1 : -1;
        const ex = o.enter === 'r' ? u * 1040 : u * -780, ey = o.enter === 'tl' ? u * -560 : u * -60, er = o.enter === 'r' ? u * 22 : u * -36, es = 1 + u * (o.enter === 'tl' ? .5 : .22);
        S.move.style.transform = `translate(${(ex + od * k2 * 860).toFixed(1)}px,${(ey + k2 * 40).toFixed(1)}px) rotate(${(er + od * k2 * 10).toFixed(2)}deg) scale(${es.toFixed(4)})`;
        S.g.style.transform = `rotate(${K.tw(t, F(f0), F(f1), -2.4, -1.2, E.glide).toFixed(3)}deg)`;
        if (S.flood) S.flood.set(p(t, F(o.flood[0]), F(o.flood[0] + 4.6)));
        S.conf0(t, F(f0 + 3)); pop(S.bd, t, F(f0 + 4), { rot: -7, r0: -24, d: .3, from: .15 }); idle(S.bd, t, 3, 5, 2);
        pop(S.qb, t, F(f0 + 2.5), { rot: 4 }); typingDots(S.qb, t); pop(S.qs, t, F(f0 + 3.5), { rot: -10, r0: 30 }); idle(S.qs, t, 1, 4, 3);
        // the peel
        S.aW.style.visibility = t >= F(fPeel - .6) ? 'visible' : 'hidden'; peelAt(S.peel, t, fPeel);
        S.paper.style.visibility = t >= F(fPeel + 4.5) ? 'visible' : 'hidden';
        const a0 = F(fPeel + 5);
        S.sh.forEach((s, i) => { const q = E.out(3)(p(t, F(fPeel + 2.6 + i * .8), F(fPeel + 7 + i * .8))); s.style.visibility = q > 0 ? 'visible' : 'hidden'; s.style.transform = `rotate(${((i ? -5 : 4) * q).toFixed(2)}deg) translate(${((i ? -34 : 40) * q).toFixed(1)}px,${((i ? 22 : 16) * q).toFixed(1)}px) scale(${(1.22 - .22 * q).toFixed(4)})`; });
        pop(S.se, t, a0, { rot: 10, r0: -50, d: .3, from: .1 }); idle(S.se, t, 2, 4, 2.5); tickPop(S.tk, t, a0 + .07); pop(S.gl, t, a0 + .1, { rot: 8, r0: -30, d: .3 }); idle(S.gl, t, 4, 6, 3);
        draw(S.sq, t, a0, a0 + .13); S.conf(t, a0);
        S.a.style.transform = `scale(${(1 + .035 * (1 - K.pop(t, F(fPeel + 3), .36))).toFixed(4)})`;
      } });
  };
  qaScene('qa1', 181, 193, 213, COPY.qa[0], { enter: 'tl', base: C.PAPER, flood: [183.6, 960, 540], out: 'l', seed: 11 });
  qaScene('qa2', 213, 224, 241, COPY.qa[1], { enter: 'r', base: C.FIELD, out: 'l', seed: 23 });
  qaScene('qa3', 241, 253, 271, COPY.qa[2], { enter: 'tl', base: C.PAPER, flood: [243, 1250, 560], out: 'r', seed: 37 });

  /* H · f271–332 · CODE → TICKET — a line of code on paper (enters from the left, the field floods from that side),
     thrown out to the left while a cursor crosses; the report swings in like a door (f300–303) */
  let SH = {};
  scene({ id: 'report', t0: F(271), t1: F(332), pre: .06, post: .14,
    build(root) {
      const w = SH.w = wrap(root); bg(w, C.PAPER); SH.flood = A.flood(w, { x: 120, y: 540, colors: [C.POP, C.FIELD], ink: C.INK, gap: .14 });
      const a = SH.a = wrap(w); a.style.transformOrigin = '960px 540px';
      SH.flags = div(a, 'left:300px;top:70px', `<svg width="1320" height="170" style="display:block;overflow:visible"><path d="M0,10 Q660,150 1320,10" fill="none" stroke="${C.INK}" stroke-width="4"/>${Array.from({ length: 13 }, (_, i) => { const u = (i + .5) / 13, x = 1320 * u, y = 10 + 280 * u * (1 - u); return `<path d="M${x - 26},${y} L${x + 26},${y} L${x},${y + 52}Z" fill="${[C.WHITE, C.POP, C.PAPER][i % 3]}" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round"/>`; }).join('')}</svg>`);
      SH.sheet = div(a, `left:300px;top:215px;width:1320px;height:640px;${sheetCss()}`);
      const c1 = card(a, { x: 300, y: 215, w: 1320, h: 640, fill: C.WHITE });
      put(c1, 96, 96, 'CÓDIGO · ASTRO', 'font-size:28px;opacity:.65', 'm');
      SH.code = put(c1, 92, 240, '', `font-family:var(--k-mono);font-weight:600;font-size:94px;letter-spacing:-.03em;color:${C.INK};white-space:pre`);
      SH.sq1 = squig(c1, 96, 384, 900, C.INK, 8); SH.arrow = arrowDoodle(a, 'M1010,640 C1090,700 1130,720 1180,726 M1180,726 l-30,-18 M1180,726 l-26,22');
      SH.plT = ticks(a, 420, 250, 70, 9); SH.pl = pillEl(a, 420, 250, '</>', { fill: C.POP, size: 46 });
      SH.bub = talk(a, 1330, 760, 720, 190, C.POP, 'l', COPY.codeBubble, 82);
      SH.cur = cursor(w, 0, 0, 1.6, C.POP); SH.curArc = A.arc(-120, 210, 2040, 120, -.12);
      // ticket: a two-faced body so it can swing in for real
      const tk = COPY.ticket, fl = SH.flip = A.flip(w, { x: 200, y: 250, w: 1520, h: 590, persp: 2400 }), t = card(fl.front, { x: 0, y: 0, w: 1520, h: 590, fill: C.PAPER, r: 40 });
      div(fl.back, `inset:0;${cardCss(C.WHITE, 40)}`);
      put(t, 90, 78, tk.label, 'font-size:26px;opacity:.7', 'm'); put(t, 84, 140, tk.big, 'font-size:196px', 'd');
      put(t, 92, 356, tk.sub, 'font-size:44px;font-weight:600;letter-spacing:-.01em;opacity:.8', 'd');
      const X = (i) => 110 + i * 190, Y = (v) => 540 - (v - 78) * 3.6, line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join(' ');
      const ch = div(t, 'left:0;top:0', `<svg width="900" height="590" style="display:block;overflow:visible">
        <path class="l1" d="${line(tk.before)}" fill="none" stroke="${C.INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>
        <path class="l2" d="${line(tk.after)}" fill="none" stroke="${C.POP}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="l3" d="${line(tk.after)}" fill="none" stroke="${C.INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${tk.after.map((v, i) => `<circle class="dot" cx="${X(i)}" cy="${Y(v)}" r="13" fill="${C.POP}" stroke="${C.INK}" stroke-width="4.5"/>`).join('')}</svg>`);
      SH.l1 = ch.querySelector('.l1'); SH.l2 = ch.querySelector('.l2'); SH.l3 = ch.querySelector('.l3'); SH.cd = [...ch.querySelectorAll('.dot')];
      put(t, 110, 432, '— ANTES     — DESPUÉS', 'font-size:20px;opacity:.7', 'm');
      div(t, `left:1170px;top:28px;bottom:28px;width:0;border-left:5px dashed ${C.INK};opacity:.55`);
      [-34, 561].forEach((y) => div(t, `left:1140px;top:${y}px;width:64px;height:64px;border-radius:50%;background:${C.FIELD};border:5px solid ${C.INK};box-sizing:border-box`));
      put(t, 1262, 300, tk.side, 'font-size:30px;transform:translate(-50%,-50%) rotate(-90deg)', 'm'); put(t, 1300, 500, tk.no, 'font-size:26px;opacity:.75', 'm');
      SH.b = wrap(w); SH.se = seal(SH.b, 1150, 300, 92, C.FIELD, ['94']); SH.tk = ticks(SH.b, 1620, 250, 96, 11);
      SH.gl = put(SH.b, 1620, 250, `<div style="width:150px;height:150px;border-radius:50%;background:${C.WHITE};border:5px solid ${C.INK};display:flex;align-items:center;justify-content:center"><span class="d" style="font-size:96px;color:${C.POP}">✓</span></div>`, '', 'stkS');
      SH.smear = div(SH.b, `left:1250px;top:720px;width:900px;height:110px;margin:-55px 0 0 -100px;border-radius:60px;background:linear-gradient(90deg,${C.POP},rgba(18,181,166,0));visibility:hidden`);
      SH.pill = pillEl(SH.b, 1250, 720, tk.pill, { fill: C.POP, size: 58, padX: 44, padY: 18 });
    },
    update(lt, t) {
      // half 1 · code card
      const k = E.out(3)(p(t, F(269.6), F(274.4))), o = E.in(2.4)(p(t, F(290.6), F(299.4)));
      SH.a.style.visibility = t < F(299.6) ? 'visible' : 'hidden';
      SH.a.style.transform = `translate(${((1 - k) * -1300 - o * 1900).toFixed(1)}px,${(o * 30).toFixed(1)}px) rotate(${((1 - k) * -10 - 2 + o * -6).toFixed(2)}deg)`;
      SH.sheet.style.transform = `rotate(${(5 * k).toFixed(2)}deg) translate(${(36 * k).toFixed(1)}px,${(18 * k).toFixed(1)}px)`;
      SH.flood.set(p(t, F(273.4), F(277)));
      SH.flags.style.transform = `translateY(${((1 - E.soft(p(t, F(272), F(277)))) * -220).toFixed(1)}px) rotate(${(Math.sin(t * 5) * 1.6).toFixed(2)}deg)`;
      A.ghostType(SH.code, COPY.code, t, F(274), F(283), { seed: 5 }); draw(SH.sq1, t, F(283), F(288));
      pop(SH.bub, t, F(275), { rot: -5, r0: 14, from: .1, d: .34, sq: .18 }); idle(SH.bub, t, 1, 7, 1.6);
      draw(SH.arrow, t, F(281), F(284)); pop(SH.pl, t, F(283), { rot: -8, r0: -30, from: .15 }); tickPop(SH.plT, t, F(286)); idle(SH.pl, t, 2, 5, 3);
      const c = SH.curArc(p(t, F(292), F(299.5))); SH.cur.style.visibility = t >= F(292) && t < F(299.6) ? 'visible' : 'hidden';
      SH.cur.style.left = c.x + 'px'; SH.cur.style.top = c.y + 'px'; SH.cur.style.transform = `translate(-50%,-50%) rotate(${(c.a + 118).toFixed(1)}deg)`;
      // half 2 · the ticket swings in about its vertical axis and settles with a small overshoot
      const sw = p(t, F(299.4), F(306)), ang = -96 * (1 - E.out(3)(clamp(sw * 1.6))) + 7 * Math.sin(sw * Math.PI) * (1 - sw);
      SH.flip.el.style.visibility = t >= F(299.4) ? 'visible' : 'hidden'; SH.flip.set(ang, { tilt: K.tw(t, F(300), F(332), -3, -1.6, E.glide), z: 0 });
      SH.b.style.visibility = t >= F(302) ? 'visible' : 'hidden';
      K.drawOn(SH.l1, E.soft(p(t, F(303.5), F(308)))); const d2 = E.soft(p(t, F(304), F(309))); K.drawOn(SH.l2, d2); K.drawOn(SH.l3, d2);
      SH.cd.forEach((d, i) => d.setAttribute('r', (13 * K.pop(t, F(304.5 + i * 1.2), .3)).toFixed(2)));
      pop(SH.se, t, F(308.6), { rot: -10, r0: -150, from: .1, d: .34 }); idle(SH.se, t, 1, 5, 4);
      // the pill arrives as a smear: stretched along its travel, then it snaps to shape
      const sm = E.out(3)(p(t, F(311.4), F(313.6))); SH.pill.style.visibility = t >= F(311.4) ? 'visible' : 'hidden';
      SH.pill.style.transform = `translate(-50%,-50%) translate(${((1 - sm) * 620).toFixed(1)}px,0) rotate(-6deg) scale(${(1 + (1 - sm) * 1.3).toFixed(3)},${(1 - (1 - sm) * .25).toFixed(3)})`; idle(SH.pill, t, 0, 6, 1.6);
      SH.smear.style.visibility = t >= F(311.4) && t < F(314) ? 'visible' : 'hidden'; SH.smear.style.opacity = (1 - sm).toFixed(3);
      pop(SH.gl, t, F(319), { rot: 6, r0: -40, from: .1 }); tickPop(SH.tk, t, F(322)); idle(SH.gl, t, 2, 6, 4);
    } });

  /* I · f332–362 · WHY — opens through concentric rings from the check sticker (f331–335); on the phone a sticker
     pops and PEELS off to show the note under it (f346–352) */
  let SI = {};
  scene({ id: 'why', t0: F(332), t1: F(362), pre: .06, post: .12,
    build(root) {
      const all = wrap(root), w = SI.clip = wrap(all), over = wrap(all); bg(w, C.PAPER);
      SI.iris = A.iris(w, { x: 1620, y: 250, over, rings: [{ c: C.POP, w: 14 }, { c: C.INK, w: 5, off: 16 }, { c: C.POP, w: 10, off: -110 }, { c: C.INK, w: 4, off: -96 }, { c: C.INK, w: 4, off: -200 }] });
      SI.r = div(w, `left:900px;top:-500px;width:1700px;height:1700px;border:5px solid ${C.INK};border-radius:50%;box-sizing:border-box`);
      SI.t = put(w, 130, 300, '', 'font-size:112px;line-height:1.02', 'd'); SI.sq = squig(w, 132, 300 + 3 * 114 + 6, measure(w, 'porqué.', 112), C.POP, 13);
      SI.ph = phone(w, 1010, 60, 500, 1000, '../assets/img/site_mobile.jpg');
      // sticker on the phone: the note is underneath
      const g = div(w, `left:0;top:0;width:${W}px;height:${H}px`), bx = 1080, by = 560, bw = 400, bh = 130;
      SI.note = put(g, bx + bw / 2, by + bh / 2, `<div class="d" style="width:${bw}px;height:${bh}px;box-sizing:border-box;border-radius:40px;border:5px solid ${C.INK};background:${C.FIELD};display:flex;align-items:center;justify-content:center;font-size:50px">${COPY.whyTags[0]}</div>`, 'transform:translate(-50%,-50%)', 'stkS');
      SI.top = div(g, `left:0;top:0;width:${W}px;height:${H}px`);
      SI.cover = put(SI.top, bx + bw / 2, by + bh / 2, `<div class="d" style="width:${bw}px;height:${bh}px;box-sizing:border-box;border-radius:40px;border:5px solid ${C.INK};background:${C.POP};display:flex;align-items:center;justify-content:center;font-size:56px">· · ·</div>`, '', 'stkS');
      SI.peel = A.peel(g, { el: SI.top, x: bx, y: by, w: bw, h: bh, angle: 205, r: 40, ink: C.INK, back: C.WHITE, flyDist: 700 });
      SI.glT = ticks(w, 1000, 250, 84, 10); SI.gl = glyph(w, 1000, 250, 'ñ', C.POP, 120);
      SI.n2 = talk(w, 1650, 800, 450, 110, C.WHITE, 'l', COPY.whyTags[1], 46, 'stkS');
      SI.top2 = put(w, 1250, 170, bubbleSvg(260, 150, C.FIELD, 'r', true), '', 'stk');
    },
    update(lt, t) {
      SI.iris.set(p(t, F(330.4), F(335.6)));
      A.ghostType(SI.t, COPY.why, t, F(335.6), F(343), { seed: 9 }); draw(SI.sq, t, F(352), F(356));
      SI.ph.style.transform = `rotate(${K.tw(t, F(332), F(362), 2.5, 1, E.glide).toFixed(3)}deg)`; SI.ph.img.style.transform = `translateY(${(-K.tw(t, F(332), F(362), 1700, 2400, E.glide)).toFixed(1)}px)`;
      SI.note.style.visibility = t >= F(346.4) ? 'visible' : 'hidden';
      pop(SI.cover, t, F(345.6), { rot: 0, r0: -10, from: .1, d: .2, sq: .2 }); peelAt(SI.peel, t, 347, 40);
      pop(SI.gl, t, F(349), { rot: 8, r0: -30, from: .1 }); tickPop(SI.glT, t, F(352)); idle(SI.gl, t, 1, 6, 4);
      pop(SI.n2, t, F(355), { rot: 4, r0: 16, from: .2 }); idle(SI.n2, t, 2, 6, 1.8);
      pop(SI.top2, t, F(359.4), { rot: -4, r0: -20, from: .1, d: .22, sq: .2 }); typingDots(SI.top2, t);
      SI.r.style.transform = `scale(${K.tw(t, F(332), F(362), 1.05, 1, E.glide).toFixed(4)})`;
    } });

  /* J · f362–391 · STAMPS — opens through a rounded box from the bubble (f361–364); the title is typed; eleven stamps
     are in the album and the last three SLAM in from the camera (f368, f371, f379); the pill unrolls (f382–388) */
  let SJ = {};
  scene({ id: 'stamps', t0: F(362), t1: F(391), pre: .06, post: .14,
    build(root) {
      const all = wrap(root), w = SJ.clip = wrap(all), over = wrap(all); bg(w, C.FIELD); SJ.tiles = [];
      SJ.iris = A.iris(w, { x: 1250, y: 170, over, box: [1.5, 1], round: .44, rings: [{ c: C.POP, w: 14 }, { c: C.INK, w: 5, off: 16 }, { c: C.INK, w: 4, off: -70 }] });
      SJ.t = put(w, 0, 130, '', 'font-size:100px;transform:translateY(-50%)', 'd'); SJ.t.style.left = ((W - measure(w, COPY.stampsTitle, 100)) / 2) + 'px';
      SJ.g = div(w, 'left:215px;top:235px;width:1490px;height:620px;transform-origin:50% 50%');
      SJ.sheet = div(SJ.g, `inset:0;${sheetCss()}`); const b = card(SJ.g, { x: 0, y: 0, w: 1490, h: 620, fill: C.PAPER });
      put(b, 70, 548, 'NORTH PEARL · ÁLBUM', 'font-size:22px;opacity:.6', 'm');
      COPY.stamps.forEach((s, i) => { const col = i % 7, row = Math.floor(i / 7), fill = [C.FIELD, C.WHITE, C.POP, C.WHITE, C.FIELD, C.POP, C.WHITE][(i * 3 + row) % 7], x = 145 + col * 200, y = 160 + row * 208;
        div(b, `left:${x - 85}px;top:${y - 85}px;width:170px;height:170px;box-sizing:border-box;border-radius:38px;border:4px dashed ${C.INK};opacity:.25`);   // the empty slot
        SJ.tiles.push(put(b, x, y, `<div style="width:170px;height:170px;border-radius:38px;background:${fill};border:5px solid ${C.INK};box-sizing:border-box;display:flex;align-items:center;justify-content:center"><span class="d" style="font-size:${s.length > 2 ? 58 : 78}px">${esc(s)}</span></div>`, '', 'stkS')); });
      SJ.pillW = div(w, 'left:960px;top:930px;transform-origin:0 0;overflow:hidden;border-radius:999px');
      SJ.pill = el('div', `font-size:68px;color:${C.INK};background:${C.POP};border:4.5px solid ${C.INK};border-radius:999px;padding:18px 54px;letter-spacing:-.02em;display:inline-block;box-sizing:border-box`, SJ.pillW, esc(COPY.stampsPill)); SJ.pill.className = 'd';
      SJ.pw = SJ.pill.offsetWidth; SJ.ph = SJ.pill.offsetHeight;
    },
    update(lt, t) {
      SJ.iris.set(p(t, F(360.4), F(365)), E.out(1.3));
      A.ghostType(SJ.t, COPY.stampsTitle, t, F(364), F(371), { seed: 6 });
      const k = E.out(3)(p(t, F(361.6), F(367.4))); SJ.g.style.transform = `rotate(${(-1.6 + (1 - k) * -5).toFixed(2)}deg) scale(${(.78 + .22 * k).toFixed(4)})`; SJ.sheet.style.transform = `rotate(${(3.2 * k).toFixed(2)}deg) translate(${(30 * k).toFixed(1)}px,${(16 * k).toFixed(1)}px)`;
      const SLAM = { 11: 368, 12: 371.4, 13: 379 };                            // the three that slam in, on the reference's frames
      SJ.tiles.forEach((e, i) => { if (SLAM[i]) A.slamTo(e, t, F(SLAM[i]), { from: 2.2, rot: i % 2 ? -24 : 24, d: .14, rest: (K.hash(i * 2.3) - .5) * 9 });
        else { pop(e, t, F(361.4 + (i % 7) * .3 + Math.floor(i / 7) * .5), { rot: (K.hash(i * 2.3) - .5) * 9, r0: i % 2 ? 22 : -22, from: .2, d: .26 }); idle(e, t, i, 3, 1.4, 1.5); } });
      // the pill unrolls from its left end
      const u = E.out(2.4)(p(t, F(381.6), F(388.4))), wv = Math.max(SJ.ph, SJ.pw * u); SJ.pillW.style.visibility = t >= F(381.6) ? 'visible' : 'hidden';
      SJ.pillW.style.width = wv.toFixed(1) + 'px'; SJ.pillW.style.height = SJ.ph + 'px'; SJ.pillW.style.transform = `translate(${(-SJ.pw / 2).toFixed(1)}px,${(-SJ.ph / 2).toFixed(1)}px) rotate(-3deg)`;
    } });

  /* K · f391–419 · PILL — enters behind a slanted edge (f391–394); the pill swings in turning and overshoots; a small
     cursor flies a dashed loop and LANDS in the pill (f400–405); stickers pop above; the icon closes into a ring */
  let SK = {};
  scene({ id: 'pill', t0: F(391), t1: F(419), pre: .07,
    build(root) {
      const all = wrap(root), w = SK.w = wrap(all); SK.lines = edgeLines(all); bg(w, C.PAPER);
      SK.arcSvg = div(w, 'left:0;top:0', `<svg width="${W}" height="${H}" style="display:block"><path d="M150,470 C330,120 620,90 700,250 C760,380 560,400 600,250 C660,60 1250,120 1520,500" fill="none" stroke="${C.INK}" stroke-width="7" stroke-dasharray="2 24" stroke-linecap="round"/></svg>`); SK.arc = SK.arcSvg.querySelector('path'); SK.len = SK.arc.getTotalLength();
      SK.p = put(w, 960, 560, `<div style="width:1340px;height:230px;box-sizing:border-box;border-radius:999px;background:${C.FIELD};border:6px solid ${C.INK};display:flex;align-items:center;gap:40px;padding:0 50px 0 36px">
        <div class="ic" style="width:160px;height:160px;flex:none;border-radius:50%;background:${C.WHITE};border:5px solid ${C.INK};box-sizing:border-box;display:flex;align-items:center;justify-content:center"><div class="bo">${svg(110, 110, bolt(1.5, C.FIELD))}</div></div>
        <div><div class="m" style="font-size:24px;opacity:.75">${COPY.pill.label}</div><div class="d" style="font-size:108px;margin-top:8px">${COPY.pill.text}</div></div></div>`, '', 'stk');
      SK.ic = SK.p.querySelector('.ic'); SK.bo = SK.p.querySelector('.bo');
      SK.cur = cursor(w, 0, 0, 1.5, C.POP);
      SK.s1 = glyph(w, 700, 330, '★', C.FIELD, 130); SK.s2 = spark(w, 940, 350, 1.6, C.POP); SK.tk = ticks(w, 1180, 330, 84, 10); SK.s3 = seal(w, 1180, 330, 74, C.POP, ['rápida']);
    },
    update(lt, t) {
      wedge(SK.w, SK.lines, p(t, F(389.2), F(393.4)), 1);
      const q = p(t, F(389.8), F(397.6)), e1 = E.out(3)(clamp(q * 1.5)), os = Math.sin(q * Math.PI) * (1 - q);
      SK.p.style.transform = `translate(-50%,-50%) translate(${((1 - e1) * -1500).toFixed(1)}px,${((1 - e1) * 170).toFixed(1)}px) rotate(${(-2 + (1 - e1) * -20 + os * 7).toFixed(2)}deg) scale(${(1 + os * .04).toFixed(4)})`;
      // the cursor flies the dashed loop and lands at the pill's right end with a squash
      const u = E.inOut(1.5)(p(t, F(392), F(402.5))), pt = SK.arc.getPointAtLength(SK.len * u), p2 = SK.arc.getPointAtLength(Math.min(SK.len, SK.len * u + 8)), hit = t >= F(402.5) ? 1 - K.pop(t, F(402.5), .3) : 0;
      SK.cur.style.visibility = t >= F(392) ? 'visible' : 'hidden'; SK.cur.style.left = pt.x + 'px'; SK.cur.style.top = pt.y + 'px';
      SK.cur.style.transform = `translate(-50%,-50%) rotate(${(u < 1 ? Math.atan2(p2.y - pt.y, p2.x - pt.x) * 180 / Math.PI + 118 : 20).toFixed(1)}deg) scale(${(1 + .25 * hit).toFixed(3)},${(1 - .3 * hit).toFixed(3)})`;
      SK.arcSvg.style.clipPath = `inset(0 ${(100 - (pt.x + 30) / W * 100).toFixed(2)}% 0 0)`; SK.arcSvg.style.opacity = (1 - p(t, F(403), F(408))).toFixed(3);
      pop(SK.s1, t, F(406), { rot: 10, r0: -40, from: .1 }); pop(SK.s2, t, F(410), { r0: 70, from: .1 }); pop(SK.s3, t, F(414), { rot: -9, r0: 30, from: .1 }); tickPop(SK.tk, t, F(416));
      [SK.s1, SK.s2, SK.s3].forEach((e, i) => idle(e, t, i, 7, 4));
      const r = E.inOut(2)(p(t, F(415.6), F(418.6)));                                       // bolt → ring: the icon closes
      SK.bo.style.transform = `scale(${(1 - r).toFixed(3)}) rotate(${(r * 90).toFixed(1)}deg)`; SK.ic.style.background = r > .5 ? C.FIELD : C.WHITE; SK.ic.style.boxShadow = `inset 0 0 0 ${(r * 26).toFixed(1)}px ${C.WHITE}`;
    } });

  /* L · f419–531 · LOGO — one clean field frame, then the wordmark lands as a sticker with echo outlines and ticks;
     the line is typed, stickers arrive, the button lands on the reference's frame; nothing ever sits still */
  let SL = {};
  scene({ id: 'logo', t0: F(419), t1: 17.7,
    build(root) {
      const w = SL.w = wrap(root); bg(w, C.FIELD);
      const BX = 960, BY = 400, BW = 1040, BH = 330;
      SL.echo = [0, 1].map((i) => put(w, BX, BY, svg(BW + 40, BH * 1.6 + 40, `<path d="${bubblePath(BW, BH, 'l')}" fill="none" stroke="${i ? C.INK : C.POP}" stroke-width="${i ? 5 : 12}" stroke-linejoin="round"/>`)));
      SL.tk = ticks(w, BX, BY, 470, 22);
      SL.b2 = put(w, BX + 470, BY - 190, bubbleSvg(300, 190, C.WHITE, 'r', true), '', 'stkS');                    // the second bubble sits BEHIND the wordmark's bubble, clear of the logo
      SL.bub = put(w, BX, BY, `<div style="position:relative">${bubbleSvg(BW, BH, C.INK, 'l')}<img src="../assets/img/np_logo_horizontal.svg" style="position:absolute;left:50%;top:50%;width:720px;transform:translate(-50%,-50%)"></div>`, '', 'stk');
      K.images.push(SL.bub.querySelector('img'));
      SL.dot = put(w, BX + 440, BY + 100, `<div style="width:54px;height:54px;border-radius:50%;background:${C.POP};border:5px solid ${C.INK};box-sizing:border-box"></div>`);
      SL.b1 = put(w, 300, 230, bubbleSvg(190, 120, C.WHITE, 'r', true), '', 'stkS'); SL.g1 = seal(w, 270, 520, 84, C.WHITE, ['hola']); SL.g2 = cursor(w, 1680, 600, 1.9, C.WHITE);
      SL.tag = put(w, 0, 770, '', 'font-size:86px;transform:translateY(-50%)', 'd'); const tw = measure(w, COPY.tag, 86), uw = measure(w, 'a la primera.', 86); SL.tag.style.left = (960 - tw / 2) + 'px';
      SL.sq = squig(w, 960 + tw / 2 - uw, 828, uw, C.INK, 10);
      SL.conf = confetti(w, BX, BY - 260, 18, 91); SL.conf2 = confetti(w, 1580, 1000, 12, 57);
      SL.ctaT = ticks(w, 1580, 950, 170, 12); SL.cta = pillEl(w, 1580, 950, COPY.cta, { fill: C.POP, size: 70, padX: 56, padY: 20 });
    },
    update(lt, t) {
      const q = E.out(3)(p(t, F(419.7), F(425))), on = t >= F(419.7);
      SL.bub.style.visibility = on ? 'visible' : 'hidden';
      SL.bub.style.transform = `translate(-50%,-50%) translate(${(Math.sin(t * 2.9) * 5).toFixed(2)}px,${(Math.sin(t * 4.1) * 11).toFixed(2)}px) rotate(${(-3 + (1 - q) * 9 + Math.sin(t * 3.3) * 1.1).toFixed(3)}deg) scale(${(lerp(1.75, 1, q) * (1 + .012 * Math.sin(t * 5.2))).toFixed(4)})`;
      SL.bub.style.filter = q < .98 ? `url(#stk) blur(${((1 - q) * 20).toFixed(1)}px)` : 'url(#stk)';
      SL.echo.forEach((e, i) => { const k = p(t, F(420.4 + i * .7), F(425.5 + i * .7)); e.style.visibility = k > 0 && k < 1 ? 'visible' : 'hidden'; e.style.transform = `translate(-50%,-50%) rotate(-3deg) scale(${lerp(1, 2.5 + i * .3, E.out(2)(k)).toFixed(4)})`; e.style.opacity = (1 - k).toFixed(3); });
      pop(SL.dot, t, F(423), { from: .05, d: .24 }); if (t >= F(423)) SL.dot.style.transform += ` translate(${(Math.sin(t * 2.9) * 5).toFixed(2)}px,${(Math.sin(t * 4.1) * 11).toFixed(2)}px)`;
      pop(SL.b2, t, F(424), { rot: 8, r0: 30, from: .1, sq: .2 }); typingDots(SL.b2, t); idle(SL.b2, t, 1, 9, 3);
      tickPop(SL.tk, t, F(424.5)); SL.conf(t, F(427));
      SL.tag.style.visibility = t < F(429) ? 'hidden' : 'visible'; A.ghostType(SL.tag, COPY.tag, t, F(429), F(446), { seed: 3 }); draw(SL.sq, t, F(448), F(455));
      pop(SL.b1, t, F(458), { rot: -8, r0: -30, from: .1 }); typingDots(SL.b1, t); pop(SL.g1, t, F(462), { rot: -12, r0: -40, from: .1 }); pop(SL.g2, t, F(466), { rot: 12, r0: 40, from: .1 });
      [SL.b1, SL.g1, SL.g2].forEach((e, i) => idle(e, t, i + 2, 12, 4.5, 1.05 + i * .11));
      pop(SL.cta, t, F(479), { rot: -4, r0: 14, from: .1, d: .4, sq: .2 }); tickPop(SL.ctaT, t, F(482)); SL.conf2(t, F(480));
      if (t > F(493)) SL.cta.style.transform += ` scale(${(1 + .045 * Math.sin((t - F(493)) * 7.2)).toFixed(4)}) rotate(${(Math.sin((t - F(493)) * 3.6) * 1.6).toFixed(3)}deg)`;
    } });

  K.start({ format: '16x9', fps: 30, dur: 17.7 });
})();
