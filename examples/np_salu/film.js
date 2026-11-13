/* np_salu — North Pearl in the language of the "Salu" reference (refs/x_2110462034311856383.mp4, refs/analysis/salu).
   Reference-first test: SAME size (1920×1080), fps (30), length (17.7 s = 531 frames) and cut frames as the reference;
   only the subject, copy and palette are North Pearl's. Bespoke scene code (paper cards, die-cut stickers, page peel,
   whips); the kit is not used as a mould. Check: ./katana match refs/x_2110462034311856383.mp4 <render> --every 0.5 */
(function () {
  K.setFormat('16x9');
  const { E, p, div, el, scene } = K;
  const W = 1920, H = 1080;

  /* ---------- constants: copy, colours, cut times (the reference's own frames) ---------- */
  const C = { FIELD: '#FF6225', PAPER: '#F4EFE6', POP: '#12B5A6', INK: '#10201F', WHITE: '#FFFDF8', SOFT: '#E4DDD0' };
  const T = { hook: 0, hola: 1.467, build: 2.1, chips: 4.033, fly: 5.6, q1: 6.033, a1: 6.633, q2: 7.1, a2: 7.6, q3: 8.033,
    a3: 8.6, code: 9.033, ticket: 10.0, why: 11.067, stamps: 12.067, pill: 13.033, logo: 13.967, end: 17.7 };
  const COPY = {
    hook: 'Toda web\ntiene una primera\nimpresión.',
    hola: 'Hola.',
    build: [['Rediseñamos'], ['la', 'tuya'], ['paso', 'a', 'paso.']],
    chipsTitle: ['¿Para qué la', 'quieres?'],
    chips: ['Tienda', 'Reservas', 'Catálogo', 'Portafolio', 'Blog', 'Landing', 'Citas', 'Menú'],
    qa: [
      { q: '¿Y carga\nrápido?', a: 'De 81\na 94.', label: 'RENDIMIENTO · LIGHTHOUSE', seal: ['caso', 'real'] },
      { q: '¿Me encuentra\nGoogle?', a: 'SEO:\n100.', label: 'LIGHTHOUSE · SEO', seal: ['caso', 'real'] },
      { q: '¿Y en el\ncelular?', a: 'Igual\nde bien.', label: 'MÓVIL · TABLET · PC', seal: ['móvil', 'y PC'] },
    ],
    code: '<h1>Hola, mundo</h1>', codeBubble: 'Hecha a medida.',
    ticket: { label: 'INFORME · LIGHTHOUSE', big: 'Aprobada.', sub: 'Caso real · 4 de 4 en verde', pill: 'Las cuatro en verde.', side: 'CASO REAL', no: 'N.º 001',
      before: [81, 87, 92, 100], after: [94, 100, 96, 100] },
    why: 'Cada sección\ntiene su\nporqué.', whyTags: ['título claro', 'botón a la vista'],
    stampsTitle: 'Lo que lleva una buena web',
    stamps: ['A+', 'SEO', '</>', '100', 'Aa', '↗', '@', 'ñ', '#', '¿?', '★', '∞', '1s', '✓'], stampsPill: 'sin relleno',
    pill: { label: 'NORTH PEARL · STACK', text: 'Hecha con Astro.' },
    tag: 'Webs que se entienden a la primera.', cta: 'Escríbenos',
  };

  K.bpm = 120; K.beatOffset = .054;                              // refs/analysis/salu: 119.9 BPM, 8th-grid phase 54 ms
  K.theme = { bg: C.PAPER, fg: C.INK, accent: C.FIELD, display: '"Bricolage Grotesque", "Inter Tight", sans-serif', mono: '"Geist Mono", ui-monospace, monospace' };
  K.fonts = ['800 100px "Bricolage Grotesque"', '700 100px "Bricolage Grotesque"', '600 100px "Bricolage Grotesque"', '500 100px "Geist Mono"', '600 100px "Geist Mono"'];
  K.lens = false;                                                // the reference is clean die-cut vector: depth comes from rings, bevels and shadows
  K.music = { src: 'projects/np_salu/audio/ref_track.wav', gain: 0 };   // the reference's own track (comparison test only: not ours to publish)
  K.BG = [[0, C.FIELD], [T.build, C.PAPER], [T.chips, C.FIELD], [T.fly, C.PAPER], [T.q1, C.FIELD], [T.a1 - .067, C.PAPER], [T.q2, C.FIELD], [T.a2 - .067, C.PAPER],
    [T.q3, C.FIELD], [T.a3 - .067, C.PAPER], [T.code, C.FIELD], [T.why, C.PAPER], [T.stamps, C.FIELD], [T.pill, C.PAPER], [T.logo, C.FIELD]];

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

  /* ---------- small builders ---------- */
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const wrap = (root) => div(root, `left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`);
  const put = (parent, x, y, html, css = '', cls = '') => { const e = div(parent, `left:${x}px;top:${y}px;transform-origin:50% 50%;${css}`, html); if (cls) e.className = cls; return e; };
  const svg = (w, h, inner, extra = '') => `<svg width="${w}" height="${h}" viewBox="${-w / 2} ${-h / 2} ${w} ${h}" style="display:block;overflow:visible" ${extra}>${inner}</svg>`;
  const pop = (e, lt, t0, { d = .38, rot = 0, r0 = -10, from = .35, c = true, extra = '' } = {}) => {
    if (lt < t0) { e.style.visibility = 'hidden'; return 0; }
    e.style.visibility = 'visible';
    const k = K.pop(lt, t0, d), q = E.soft(p(lt, t0, t0 + d));
    e.style.transform = `${c ? 'translate(-50%,-50%) ' : ''}${extra}rotate(${(rot + r0 * (1 - q)).toFixed(3)}deg) scale(${(from + (1 - from) * k).toFixed(4)})`;
    return q;
  };
  const card = (parent, { x, y, w, h, fill = C.WHITE, stack = 0, r = 48 }) => {
    const g = div(parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-origin:50% 50%`);
    g.sheets = [];
    for (let i = stack; i >= 1; i--) g.sheets.push(div(g, `inset:0;background:${C.WHITE};border:5px solid ${C.INK};border-radius:${r}px;box-shadow:0 0 0 9px ${C.WHITE},0 14px 26px rgba(16,32,31,.14);transform-origin:50% 50%`));
    g.main = div(g, `inset:0;background:${fill};border:5px solid ${C.INK};border-radius:${r}px;box-shadow:0 0 0 10px ${C.WHITE},0 26px 46px rgba(16,32,31,.22),inset 0 14px 22px rgba(255,255,255,.5),inset 0 -14px 24px rgba(0,0,0,.07)`);
    return g;
  };
  const sealPath = (r, n = 14, a = .085) => { let d = ''; const N = n * 14; for (let i = 0; i <= N; i++) { const th = i / N * Math.PI * 2, rr = r * (1 + a * Math.cos(n * th)); d += (i ? 'L' : 'M') + (rr * Math.cos(th)).toFixed(1) + ',' + (rr * Math.sin(th)).toFixed(1); } return d + 'Z'; };
  const seal = (parent, x, y, r, fill, lines, color = C.INK) => put(parent, x, y, svg(r * 2.4, r * 2.4,
    `<path d="${sealPath(r)}" fill="${fill}" stroke="${C.INK}" stroke-width="4.5"/>` + lines.map((s, i) => `<text x="0" y="${(i - (lines.length - 1) / 2) * r * .46 + r * .15}" text-anchor="middle" font-family="Bricolage Grotesque" font-weight="800" font-size="${r * (lines.length > 1 ? .44 : .62)}" fill="${color}" letter-spacing="-.5">${esc(s)}</text>`).join('')), '', 'stkS');
  const ticks = (parent, x, y, r, n = 9) => put(parent, x, y, svg(r * 3, r * 3, Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2 + .3, c = Math.cos(a), s = Math.sin(a), k = 1 + .12 * K.hash(i * 3.1 + r); return `<line x1="${c * r * 1.08}" y1="${s * r * 1.08}" x2="${c * r * 1.3 * k}" y2="${s * r * 1.3 * k}" stroke="${C.INK}" stroke-width="4" stroke-linecap="round"/>`; }).join('')));
  const spark = (parent, x, y, s, color) => put(parent, x, y, svg(60, 60, `<path d="M0,-24 C3,-7 7,-3 24,0 C7,3 3,7 0,24 C-3,7 -7,3 -24,0 C-7,-3 -3,-7 0,-24Z" fill="${color}" stroke="${C.INK}" stroke-width="3.5" stroke-linejoin="round" transform="scale(${s})"/>`));
  const cursor = (parent, x, y, s = 1, fill = C.WHITE) => put(parent, x, y, svg(90 * s, 110 * s, `<path d="M-22,-34 L-22,30 L-6,15 L6,42 L19,36 L7,10 L28,10 Z" fill="${fill}" stroke="${C.INK}" stroke-width="${5 / s}" stroke-linejoin="round" transform="scale(${s})"/>`), '', 'stkS');
  const browserDoodle = (parent, x, y, s = 1, fill = C.WHITE) => put(parent, x, y, svg(230 * s, 180 * s, `<g transform="scale(${s})"><rect x="-100" y="-74" width="200" height="148" rx="22" fill="${fill}" stroke="${C.INK}" stroke-width="5"/><path d="M-100,-36 H100" stroke="${C.INK}" stroke-width="5"/>
    <circle cx="-76" cy="-55" r="7" fill="${C.FIELD}" stroke="${C.INK}" stroke-width="3"/><circle cx="-54" cy="-55" r="7" fill="${C.POP}" stroke="${C.INK}" stroke-width="3"/><rect x="-78" y="-14" width="96" height="16" rx="8" fill="${C.INK}"/><rect x="-78" y="14" width="150" height="12" rx="6" fill="${C.INK}" opacity=".35"/><rect x="-78" y="36" width="64" height="24" rx="12" fill="${C.POP}" stroke="${C.INK}" stroke-width="3.5"/></g>`), '', 'stkS');
  const bolt = (s, fill) => `<path d="M6,-34 L-20,4 L-3,4 L-10,34 L20,-8 L3,-8 Z" fill="${fill}" stroke="${C.INK}" stroke-width="${4.5 / s}" stroke-linejoin="round" transform="scale(${s})"/>`;
  const bubbleSvg = (w, h, fill, tail = 'r', dots = false) => { const r = Math.min(h * .42, 70), x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2, tx = tail === 'r' ? x1 - w * .28 : x0 + w * .28, td = tail === 'r' ? 1 : -1;
    const bA = Math.max(tx + td * 46, tx - td * 6), bB = Math.min(tx + td * 46, tx - td * 6);   // tail base, walked right → left
    const d = `M${x0 + r},${y0} H${x1 - r} Q${x1},${y0} ${x1},${y0 + r} V${y1 - r} Q${x1},${y1} ${x1 - r},${y1} H${bA} L${tx + td * 62},${y1 + h * .26} L${bB},${y1} H${x0 + r} Q${x0},${y1} ${x0},${y1 - r} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0}Z`;
    return svg(w + 40, h * 1.6 + 40, `<path d="${d}" fill="${fill}" stroke="${C.INK}" stroke-width="5" stroke-linejoin="round"/>` + (dots ? [-1, 0, 1].map((i) => `<circle cx="${i * h * .26}" cy="0" r="${h * .075}" fill="${C.INK}"/>`).join('') : '')); };
  const squig = (parent, x, y, w, color = C.POP, sw = 11) => { const n = Math.max(2, Math.round(w / 46)), seg = w / n; let d = `M0,0 q${seg / 2},${-12} ${seg},0`; for (let i = 1; i < n; i++) d += ` t${seg},0`;
    const e = div(parent, `left:${x}px;top:${y}px`, `<svg width="${w + 20}" height="40" viewBox="-10 -20 ${w + 20} 40" style="display:block;overflow:visible"><path d="${d}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round"/></svg>`); e.path = e.querySelector('path'); return e; };
  const pillEl = (parent, x, y, text, { fill = C.WHITE, color = C.INK, size = 44, padX = 34, padY = 14, mono = false } = {}) => put(parent, x, y,
    `<div class="${mono ? 'm' : 'd'}" style="font-size:${size}px;color:${color};background:${fill};border:4.5px solid ${C.INK};border-radius:999px;padding:${padY}px ${padX}px;${mono ? '' : 'letter-spacing:-.02em;'}">${esc(text)}</div>`, '', 'stkS');
  // confetti: n paper bits thrown from (x,y) at t0 — closed form, no state
  const confetti = (parent, x, y, n, seed) => { const bits = []; for (let i = 0; i < n; i++) { const a = K.hash(i * 7.3 + seed) * Math.PI * 2, v = 260 + 520 * K.hash(i * 3.7 + seed + 1), s = 10 + 16 * K.hash(i * 5.1 + seed), col = [C.INK, C.POP, C.WHITE, C.FIELD][i % 4];
    bits.push({ e: div(parent, `left:${x}px;top:${y}px;width:${s}px;height:${s * .6}px;background:${col};border:2.5px solid ${C.INK};border-radius:3px`), a, v, w: 300 + 900 * K.hash(i + seed * 2) }); }
    return (lt, t0) => bits.forEach((b) => { const dt = lt - t0; if (dt < 0 || dt > 1.1) { b.e.style.visibility = 'hidden'; return; } b.e.style.visibility = 'visible';
      const k = 1 - Math.exp(-4.2 * dt), dx = Math.cos(b.a) * b.v * k, dy = Math.sin(b.a) * b.v * k * .8 + 420 * dt * dt;
      b.e.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${(b.w * dt).toFixed(1)}deg) scale(${(1 - p(dt, .7, 1.1)).toFixed(3)})`; }); };
  const phone = (parent, x, y, w, h, src) => { const g = div(parent, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;transform-origin:50% 50%`);
    div(g, `inset:0;background:${C.WHITE};border:6px solid ${C.INK};border-radius:${w * .15}px;box-shadow:0 0 0 10px ${C.WHITE},0 0 0 13px ${C.INK},0 30px 50px rgba(16,32,31,.22)`);
    const scr = div(g, `left:20px;top:20px;right:20px;bottom:20px;border-radius:${w * .11}px;overflow:hidden;background:#fff;border:4px solid ${C.INK}`);
    g.img = K.img(scr, src, `left:0;top:0;width:100%;height:auto;transform-origin:0 0`);
    div(g, `left:50%;top:34px;width:${w * .26}px;height:22px;margin-left:${-w * .13}px;background:${C.INK};border-radius:20px`);
    return g; };
  // rect ∩ {x + y ≥ c} (keep = +1) or ≤ c (keep = −1) as a CSS polygon — the diagonal page-peel wipe
  const half = (w, h, c, keep) => { const V = [[0, 0], [w, 0], [w, h], [0, h]], out = [], f = (v) => (v[0] + v[1] - c) * keep;
    for (let i = 0; i < 4; i++) { const a = V[i], b = V[(i + 1) % 4], fa = f(a), fb = f(b); if (fa >= 0) out.push(a); if ((fa >= 0) !== (fb >= 0)) { const t = fa / (fa - fb); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); } }
    return out.length ? 'polygon(' + out.map((v) => `${v[0].toFixed(1)}px ${v[1].toFixed(1)}px`).join(',') + ')' : 'polygon(0 0,0 0,0 0)'; };
  // idle life for a sticker already driven by pop(): bob + sway, phase from its index (amplitude ≈ 2× what looks right in a still)
  const idle = (e, lt, i = 0, amp = 9, rot = 2.2, hz = 1.15) => { if (e.style.visibility === 'hidden') return; const ph = i * 1.7;
    e.style.transform += ` translate(${(Math.sin(lt * hz * 6.283 * .83 + ph) * amp * .5).toFixed(2)}px,${(Math.sin(lt * hz * 6.283 + ph * 1.3) * amp).toFixed(2)}px) rotate(${(Math.sin(lt * hz * 6.283 * 1.21 + ph) * rot).toFixed(3)}deg)`; };
  const WHIP = .16;   // whip travel as a share of the frame width. The reference's whips last 5 frames and it has only two real pans:
  // long whole-frame whips on every cut measured 4–9× its pan and shake rates (./katana energy), so cuts are short whips, dives or peels
  const typed = (e, text, lt, t0, t1, seed = 7) => { if (!e.__t) e.__t = K.cadence(text, t0, t1, seed); const n = K.typedN(e.__t, lt); e.innerHTML = esc(text.slice(0, n)); return n; };
  // whip grammar: accelerate out to the left, the next shot decelerates in from the right (speed peak on the cut)
  const whipX = (lt, dur, { inD = .13, outD = .1, i = true, o = true } = {}) => (i ? (1 - E.out(3)(p(lt, 0, inD))) * W * WHIP : 0) - (o ? E.in(3)(p(lt, dur - outD, dur)) * W * WHIP : 0);

  /* =====================================================================================================
     A · 0.00–2.10 · HOOK — a stack of paper cards types the hook; the card swaps and says "Hola."; dive into the bubble */
  let A = {};
  scene({ id: 'hook', t0: 0, t1: T.build,
    build(root) {
      const w = A.w = wrap(root);
      A.c1 = card(w, { x: 250, y: 125, w: 1420, h: 840, fill: C.WHITE, stack: 2 });
      A.t = put(A.c1.main, 130, 290, '', 'font-size:108px', 'd');
      A.tile = put(A.c1.main, 1150, 200, `<div style="width:210px;height:250px;background:${C.FIELD};border:5px solid ${C.INK};border-radius:38px;display:flex;align-items:center;justify-content:center">${svg(120, 130, `<path d="M-22,-34 L-22,30 L-6,15 L6,42 L19,36 L7,10 L28,10 Z" fill="${C.WHITE}" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round" transform="scale(1.5)"/>`)}</div>`, '', 'stkS');
      A.seal = seal(A.c1.main, 1020, 250, 66, C.POP, ['SEG. 1']);
      A.bub = put(A.c1.main, 1090, 640, bubbleSvg(180, 116, C.PAPER, 'r', true), '', 'stkS');
      A.sp1 = spark(A.c1.main, 880, 720, 1.1, C.FIELD); A.sp2 = spark(w, 1700, 660, 1.2, C.POP); A.bd = browserDoodle(w, 190, 900, 1.25);
      A.c2 = card(w, { x: 400, y: 170, w: 1120, h: 740, fill: C.FIELD, stack: 2 });
      A.dots = put(A.c2.main, 930, 120, bubbleSvg(150, 96, C.WHITE, 'r', true), '', 'stkS');
      A.ring = put(A.c2.main, 560, 380, svg(560, 560, `<circle r="250" fill="none" stroke="${C.INK}" stroke-width="4" stroke-dasharray="2 22" stroke-linecap="round"/>`));
      A.tk = ticks(A.c2.main, 560, 380, 220, 12);
      A.hola = put(A.c2.main, 560, 380, `<div style="position:relative">${bubbleSvg(520, 250, C.POP, 'l')}<div class="d" style="position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;font-size:150px">${COPY.hola}</div></div>`, '', 'stk');
      A.day = pillEl(w, 1560, 960, 'segundo uno', { size: 40 });
    },
    update(lt) {
      const swap = T.hola - .2, q1 = E.in(3)(p(lt, swap, T.hola)), q2 = E.out(3)(p(lt, T.hola - .06, T.hola + .26));
      // stack 1: fans in, then leaves down-left with a turn
      const in1 = K.pop(lt, -.3, .5);
      A.c1.style.transform = `translate(${-q1 * 1500}px,${q1 * 500 + (1 - in1) * 260}px) rotate(${-3 + (1 - in1) * 9 - q1 * 22}deg) scale(${.82 + .18 * in1})`;
      A.c1.sheets.forEach((s, i) => { const k = E.soft(p(lt, -.25 + i * .07, .3 + i * .07)) + .16 * Math.sin(lt * 4.2 + i * 2); s.style.transform = `rotate(${(i ? -7 : 6) * k}deg) translate(${(i ? -30 : 44) * k}px,${(i ? 26 : 18) * k}px)`; });
      if (typed(A.t, COPY.hook, lt, .0, .48) >= COPY.hook.length && K.caretOn(lt, .48, 2.6)) A.t.innerHTML += `<span style="color:${C.FIELD}">▍</span>`;
      pop(A.tile, lt, .16, { rot: 5 }); pop(A.seal, lt, .5, { rot: -14, r0: 30 }); pop(A.bub, lt, .72, { rot: 4 }); pop(A.sp1, lt, .92, { r0: 60 }); pop(A.sp2, lt, .36, { r0: -80 });
      [A.tile, A.seal, A.bub, A.sp1, A.sp2].forEach((e, i) => idle(e, lt, i, 8, 2.4)); pop(A.bd, lt, -.2, { rot: -8, r0: -30 }); A.bd.style.transform += ` translate(${(-q1 * 700).toFixed(1)}px,${(q1 * 300).toFixed(1)}px)`;
      // stack 2: arrives from the right, already moving on the cut
      A.c2.style.visibility = lt < swap ? 'hidden' : 'visible';
      A.c2.style.transform = `translate(${(1 - q2) * 1300}px,${(1 - q2) * -260}px) rotate(${3.5 + (1 - q2) * 16}deg)`;
      A.c2.sheets.forEach((s, i) => { s.style.transform = `rotate(${i ? -6 : 5}deg) translate(${i ? -26 : 40}px,${i ? 22 : 16}px)`; });
      const h0 = T.hola + .12;
      pop(A.dots, lt, T.hola + .05, { rot: 3 }); idle(A.dots, lt, 3, 8, 3); pop(A.hola, lt, h0, { d: .42, rot: -4, r0: -16, from: .15 }); pop(A.ring, lt, h0 + .05, { d: .5, r0: 40, from: .6 }); pop(A.tk, lt, h0 + .1, { d: .4, r0: 25, from: .7 }); pop(A.day, lt, h0 + .16, { rot: -5 });
      A.ring.style.transform += ` rotate(${lt * 14}deg)`;
      // dive into the bubble: ×9 about its centre, still accelerating on the cut
      const z = K.zoom(lt, T.build - .17, T.build, 1, 9, E.in(3));
      A.w.style.transform = z > 1.0005 ? K.about(960, 550, z) : 'none';
    } });

  /* B · 2.10–4.03 · BUILD — sticker words + the phone with the site; we land farther away and ease in; whip out left */
  let B = {};
  scene({ id: 'build', t0: T.build, t1: T.chips,
    build(root) {
      const w = B.w = wrap(root); B.words = [];
      B.r1 = div(w, `left:-560px;top:-420px;width:1500px;height:1500px;border:5px solid ${C.INK};border-radius:50%;box-sizing:border-box`);
      B.r2 = div(w, `left:-900px;top:-300px;width:1500px;height:1500px;border:5px solid ${C.INK};border-radius:50%;box-sizing:border-box`);
      B.pin = cursor(w, 560, 190, 1.3, C.POP);
      COPY.build.forEach((line, li) => { let x = 110; line.forEach((wd) => { const e = put(w, x, 400 + li * 138, `<span class="d" style="font-size:128px">${wd}</span>`, 'transform-origin:0 50%', 'stk'); B.words.push({ e, li }); x += e.offsetWidth + 40; }); });
      const last = B.words.filter((o) => o.li === 2); const x0 = 110, x1 = last[last.length - 1].e.offsetLeft + last[last.length - 1].e.offsetWidth;
      B.sq = squig(w, x0, 400 + 2 * 138 + 78, x1 - x0, C.POP, 13);
      B.ph = phone(w, 1180, 40, 520, 1040, '../assets/img/site_mobile.jpg');
      B.tag = pillEl(w, 1760, 990, 'MÓVIL · WEB', { size: 30, mono: true });
      B.st = put(w, 1790, 870, `<div class="d" style="font-size:150px;color:${C.POP}">ñ</div>`, '', 'stk');
    },
    update(lt) {
      const dur = T.chips - T.build, z = K.zoom(lt, 0, .42, .5, 1, E.out(3)), x = -E.in(3)(p(lt, dur - .1, dur)) * W * WHIP;
      B.w.style.transform = (z < .9995 || x) ? `translate(${x.toFixed(1)}px,0) ` + K.about(960, 540, z) : 'none';
      const dr = 1 + .03 * (1 - E.glide(p(lt, 0, dur)));
      B.r1.style.transform = `scale(${dr})`; B.r2.style.transform = `scale(${2 - dr})`;
      B.words.forEach((o, i) => pop(o.e, lt, -.04 + i * .085, { c: false, extra: 'translateY(-50%) ', rot: (i % 2 ? 1.2 : -1.2), r0: -7, from: .5, d: .34 }));
      K.drawOn(B.sq.path, E.soft(p(lt, .56, .92))); B.sq.style.visibility = lt < .56 ? 'hidden' : 'visible';
      const inP = E.soft(p(lt, -.12, .42));
      B.ph.style.transform = `translate(0,${(1 - inP) * 620}px) rotate(${3 - 2 * inP}deg)`;
      B.ph.img.style.transform = `translateY(${-K.tw(lt, .5, dur, 0, 1500, E.glide)}px)`;
      pop(B.pin, lt, .5, { rot: -8, r0: 40 }); pop(B.tag, lt, .95, { rot: -4 }); pop(B.st, lt, 1.08, { rot: 9, r0: -30 });
    } });

  /* C · 4.03–5.60 · CHIPS — "¿Para qué la quieres?": a cursor picks one; dive into the picked chip */
  let Cc = {};
  scene({ id: 'chips', t0: T.chips, t1: T.fly,
    build(root) {
      const w = Cc.w = wrap(root); Cc.chips = [];
      Cc.t1 = put(w, 960, 215, `<span class="d" style="font-size:140px">${COPY.chipsTitle[0]}</span>`, 'transform-origin:100% 50%;white-space:nowrap');
      Cc.t2 = put(w, 960, 215, `<span class="d" style="font-size:164px;color:${C.POP};font-style:italic;display:inline-block;transform:skewX(-8deg)">${COPY.chipsTitle[1]}</span>`, 'white-space:nowrap', 'stk');
      const tw = Cc.t1.offsetWidth + 34 + Cc.t2.offsetWidth, tx = (W - tw) / 2; Cc.t1.style.left = tx + 'px'; Cc.t2.style.left = (tx + Cc.t1.offsetWidth + 34) + 'px';
      COPY.chips.forEach((name, i) => { const cx = 85 + (i % 4) * 447, cy = 440 + Math.floor(i / 4) * 215;
        const e = put(w, cx + 205, cy + 85, `<div style="width:410px;height:170px;box-sizing:border-box;background:${C.PAPER};border:5px solid ${C.INK};border-radius:36px;display:flex;align-items:center;gap:22px;padding:0 26px">
          <div style="width:104px;height:104px;flex:none;border-radius:24px;background:${i % 3 === 1 ? C.WHITE : C.FIELD};border:4px solid ${C.INK};box-sizing:border-box"></div>
          <div><div class="m" style="font-size:19px;opacity:.6">WEB · 0${i + 1}</div><div class="d" style="font-size:${name.length > 8 ? 46 : 54}px;margin-top:8px">${name}</div></div></div>`, '', 'stkS');
        Cc.chips.push({ e, cx: cx + 205, cy: cy + 85 }); });
      Cc.pick = 1; const P = Cc.chips[Cc.pick]; Cc.box = P.e.firstChild;
      Cc.cur = cursor(w, 0, 0, 1.5);
    },
    update(lt) {
      const dur = T.fly - T.chips, P = Cc.chips[Cc.pick], tClick = .86;
      const z = K.zoom(lt, dur - .18, dur, 1, 10, E.in(3)), x = (1 - E.out(3)(p(lt, 0, .13))) * W * WHIP;
      Cc.w.style.transform = (z > 1.0005 || x > .05) ? `translate(${x.toFixed(1)}px,0) ` + K.about(P.cx, P.cy, z) : 'none';
      pop(Cc.t1, lt, -.08, { c: false, extra: 'translateY(-50%) ', r0: -4, from: .6 }); pop(Cc.t2, lt, .04, { c: false, extra: 'translateY(-50%) ', rot: -3, r0: 14, from: .4 });
      Cc.chips.forEach((o, i) => pop(o.e, lt, -.04 + i * .04, { rot: (i % 2 ? .8 : -.8), r0: (i % 2 ? 8 : -8), from: .5, d: .34 }));
      const on = lt >= tClick; Cc.box.style.background = on ? C.POP : C.PAPER;
      if (on) Cc.chips.forEach((o, i) => { const dt = lt - tClick - .035 * Math.abs(i - Cc.pick) - .02 * Math.abs(Math.floor(i / 4) - Math.floor(Cc.pick / 4)); if (dt > 0) o.e.style.transform += ` scale(${(1 + (i === Cc.pick ? .1 : .055) * Math.exp(-5 * dt) * Math.sin(19 * dt)).toFixed(4)}) rotate(${(Math.exp(-4 * dt) * Math.sin(15 * dt) * (i % 2 ? 2 : -2)).toFixed(3)}deg)`; });
      const k = E.smooth(p(lt, .46, tClick)), cx = K.lerp(1500, P.cx + 120, k) + (on ? Math.sin((lt - tClick) * 9) * 7 + (lt - tClick) * 40 : 0), cy = K.lerp(1180, P.cy + 56, k) - Math.sin(k * Math.PI) * 120 + (on ? (lt - tClick) * 46 : 0);
      Cc.cur.style.left = cx + 'px'; Cc.cur.style.top = cy + 'px'; Cc.cur.style.visibility = lt < .4 ? 'hidden' : 'visible';
      Cc.cur.style.transform = `translate(-50%,-50%) rotate(-8deg) scale(${1 - .1 * p(lt, tClick, tClick + .07) + .1 * p(lt, tClick + .07, tClick + .25)})`;
    } });

  /* D · 5.60–6.03 · FLY — out of the chip: a cursor crosses on a dotted arc (the "click") */
  let D = {};
  scene({ id: 'fly', t0: T.fly, t1: T.q1,
    build(root) {
      const w = D.w = wrap(root);
      D.arc = div(w, 'left:0;top:0', `<svg width="${W}" height="${H}" style="display:block"><path d="M200,900 Q960,-120 1760,620" fill="none" stroke="${C.INK}" stroke-width="9" stroke-dasharray="2 30" stroke-linecap="round"/></svg>`).querySelector('path');
      D.len = D.arc.getTotalLength(); D.cur = cursor(w, 0, 0, 2.6, C.POP);
      D.ring = div(w, `left:${960 - 700}px;top:${540 - 700}px;width:1400px;height:1400px;border:6px solid ${C.INK};border-radius:50%;box-sizing:border-box`);
    },
    update(lt) {
      const dur = T.q1 - T.fly, z = K.zoom(lt, 0, .3, .45, 1, E.out(3)) * K.zoom(lt, dur - .14, dur, 1, 2.6, E.in(3));   // out through the ring, no whip
      D.w.style.transform = K.about(960, 540, z);
      const k = E.glide(p(lt, -.08, dur + .05)), pt = D.arc.getPointAtLength(D.len * k), p2 = D.arc.getPointAtLength(Math.min(D.len, D.len * k + 6));
      D.cur.style.left = pt.x + 'px'; D.cur.style.top = pt.y + 'px';
      D.cur.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(p2.y - pt.y, p2.x - pt.x) * 180 / Math.PI + 60}deg)`;
      D.arc.style.strokeDasharray = '2 30'; D.arc.style.clipPath = `inset(0 ${(100 - k * 100 * .97).toFixed(2)}% 0 0)`;
      D.ring.style.transform = `scale(${K.tw(lt, 0, dur, .6, 1.25, E.out(2))})`;
    } });

  /* E, F, G · question card → page peel → answer card (cut on the peel), whips between pairs */
  const qaScene = (id, t0, tCut, t1, cp, seed, first) => {
    const S = {};
    scene({ id, t0, t1,
      build(root) {
        const w = S.w = wrap(root), X = 430, Y = 235, CW = 1060, CH = 610, PAD = 90;
        S.g = div(w, `left:${X - PAD}px;top:${Y - PAD}px;width:${CW + 2 * PAD}px;height:${CH + 2 * PAD}px;transform-origin:50% 50%`);
        S.qW = div(S.g, 'inset:0'); S.aW = div(S.g, 'inset:0'); S.dim = [CW + 2 * PAD, CH + 2 * PAD];
        const q = S.q = card(S.qW, { x: PAD, y: PAD, w: CW, h: CH, fill: C.WHITE, stack: 1 });
        put(q.main, 80, 70, 'CLIENTE', 'font-size:24px;opacity:.65', 'm');
        put(q.main, 78, 160, esc(cp.q), 'font-size:128px', 'd');
        S.qb = put(q.main, 870, 125, bubbleSvg(170, 104, C.FIELD, 'r', true), '', 'stkS');
        S.qs = seal(q.main, 950, 500, 50, C.POP, ['?']);
        const a = S.a = card(S.aW, { x: PAD, y: PAD, w: CW, h: CH, fill: C.FIELD, stack: 0 });
        put(a.main, 80, 66, 'NORTH PEARL · NOTA', 'font-size:24px;opacity:.75', 'm');
        S.at = put(a.main, 76, 130, esc(cp.a), 'font-size:176px;line-height:.95', 'd');
        const lastW = (() => { const sp = el('span', 'position:absolute;visibility:hidden;font-size:176px', a.main, esc(cp.a.split('\n').pop())); sp.className = 'd'; const v = sp.offsetWidth; sp.remove(); return v; })();
        S.sq = squig(a.main, 80, 130 + 2 * 167 + 20, lastW, C.POP, 15);
        put(a.main, 80, 540, cp.label, 'font-size:22px;opacity:.75', 'm');
        S.sealW = div(S.aW, `left:${PAD + CW - 110}px;top:${PAD + 60}px`);
        S.tk = ticks(S.sealW, 0, 0, 96, 11); S.se = seal(S.sealW, 0, 0, 86, C.WHITE, cp.seal);
        S.gl = put(S.aW, PAD + CW + 6, PAD + 240, `<div class="d" style="font-size:120px;color:${C.POP}">✓</div>`, '', 'stk');
        S.curl = div(S.g, `left:0;top:0;width:2600px;height:10px;transform-origin:0 0;background:linear-gradient(180deg,#fff 0%,#FBF9F4 38%,#E6DFD2 80%,#BDB5A6 95%,#fff 100%);box-shadow:0 -34px 54px rgba(16,32,31,.3);border-top:5px solid ${C.INK};border-radius:60px 60px 0 0`);
        S.conf = confetti(w, X + CW - 60, Y + 40, 16, seed); S.bd = browserDoodle(w, 250, 880, 1.2, seed % 2 ? C.WHITE : C.PAPER);
      },
      update(lt) {
        const dur = t1 - t0, cut = tCut - t0, [gw, gh] = S.dim;
        const x = (first ? 0 : (1 - E.out(3)(p(lt, 0, .13))) * W * WHIP) - E.in(3)(p(lt, dur - .1, dur)) * W * WHIP;
        const zin = first ? K.zoom(lt, 0, .22, .55, 1, E.out(3)) : 1;   // the first pair continues the push-in of the previous shot
        S.w.style.transform = (Math.abs(x) > .05 || zin < .9995) ? `translate(${x.toFixed(1)}px,0) ` + K.about(960, 540, zin) : 'none';
        S.g.style.transform = `rotate(${K.tw(lt, 0, dur, -2.4, -1.2, E.glide)}deg)`;
        pop(S.qb, lt, .1, { rot: 4 }); pop(S.qs, lt, .16, { rot: -10, r0: 30 });
        // peel: a diagonal line x + y = c sweeps the card in 6 frames; the curled sheet rides on it
        const q = E.inOut(2)(p(lt, cut - .2, cut)), c = K.lerp(-60, gw + gh + 60, q), on = q > 0 && q < 1;
        S.qW.style.clipPath = q <= 0 ? 'none' : half(gw, gh, c, 1); S.qW.style.visibility = q >= 1 ? 'hidden' : 'visible';
        S.aW.style.clipPath = q >= 1 ? 'none' : half(gw, gh, c, -1); S.aW.style.visibility = q <= 0 ? 'hidden' : 'visible';
        S.curl.style.visibility = on ? 'visible' : 'hidden';
        if (on) { const wc = 90 + 520 * Math.sin(Math.PI * q); S.curl.style.height = wc + 'px'; S.curl.style.transform = `translate(${(c + 900).toFixed(1)}px,${-900}px) rotate(135deg) translate(-200px,${-wc}px)`; }
        const a0 = cut - .03;
        pop(S.se, lt, a0, { rot: 10, r0: -40, d: .34 }); pop(S.tk, lt, a0 + .05, { r0: 30, from: .6, d: .3 }); pop(S.gl, lt, a0 + .09, { rot: 8, r0: -30, d: .32 });
        K.drawOn(S.sq.path, E.soft(p(lt, a0 + .04, a0 + .26))); S.conf(lt, a0); pop(S.bd, lt, a0 + .02, { rot: -7, r0: -24, d: .32 });
        S.a.style.transform = `scale(${1 + .035 * (1 - K.pop(lt, cut - .1, .36))})`;
      } });
  };
  qaScene('qa1', T.q1, T.a1, T.q2, COPY.qa[0], 11, true);
  qaScene('qa2', T.q2, T.a2, T.q3, COPY.qa[1], 23, false);
  qaScene('qa3', T.q3, T.a3, T.code, COPY.qa[2], 37, false);

  /* H · 9.03–11.07 · CODE → TICKET — a line of code on paper, whip, then the report as a ticket */
  let Hh = {};
  scene({ id: 'report', t0: T.code, t1: T.why,
    build(root) {
      const w = Hh.w = wrap(root), a = Hh.a = div(w, `left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`), b = Hh.b = div(w, `left:0;top:0;width:${W}px;height:${H}px;transform-origin:0 0`);
      const c1 = Hh.c1 = card(a, { x: 300, y: 215, w: 1320, h: 640, fill: C.WHITE, stack: 1 });
      put(c1.main, 96, 96, 'CÓDIGO · ASTRO', 'font-size:28px;opacity:.65', 'm');
      Hh.code = put(c1.main, 92, 240, '', `font-family:var(--k-mono);font-weight:600;font-size:94px;letter-spacing:-.03em;color:${C.INK};white-space:pre`);
      Hh.sq1 = squig(c1.main, 96, 384, 900, C.INK, 8);
      Hh.pl = pillEl(c1.main, 1170, 110, '</>', { fill: C.POP, size: 46 });
      Hh.bub = put(a, 1330, 760, `<div style="position:relative">${bubbleSvg(720, 190, C.POP, 'l')}<div class="d" style="position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;font-size:82px">${COPY.codeBubble}</div></div>`, '', 'stk');
      Hh.flags = div(a, 'left:310px;top:70px', `<svg width="1300" height="170" style="display:block;overflow:visible"><path d="M0,10 Q650,150 1300,10" fill="none" stroke="${C.INK}" stroke-width="4"/>${Array.from({ length: 13 }, (_, i) => { const u = (i + .5) / 13, x = 1300 * u, y = 10 + 2 * 70 * 2 * u * (1 - u); return `<path d="M${x - 26},${y} L${x + 26},${y} L${x},${y + 52}Z" fill="${[C.WHITE, C.POP, C.PAPER][i % 3]}" stroke="${C.INK}" stroke-width="4" stroke-linejoin="round"/>`; }).join('')}</svg>`);
      // ticket
      const tk = COPY.ticket, t = Hh.t = card(b, { x: 200, y: 250, w: 1520, h: 590, fill: C.PAPER, stack: 0, r: 40 });
      put(t.main, 90, 78, tk.label, 'font-size:26px;opacity:.7', 'm');
      Hh.big = put(t.main, 84, 140, tk.big, 'font-size:196px', 'd');
      put(t.main, 92, 356, tk.sub, 'font-size:44px;font-weight:600;letter-spacing:-.01em;opacity:.8', 'd');
      const X = (i) => 110 + i * 190, Y = (v) => 540 - (v - 78) * 3.6, line = (arr) => arr.map((v, i) => `${i ? 'L' : 'M'}${X(i)},${Y(v)}`).join(' ');
      const ch = div(t.main, 'left:0;top:0', `<svg width="900" height="590" style="display:block;overflow:visible">
        <path class="l1" d="${line(tk.before)}" fill="none" stroke="${C.INK}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" opacity=".45"/>
        <path class="l2" d="${line(tk.after)}" fill="none" stroke="${C.POP}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
        <path class="l3" d="${line(tk.after)}" fill="none" stroke="${C.INK}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        ${tk.after.map((v, i) => `<circle class="dot" cx="${X(i)}" cy="${Y(v)}" r="13" fill="${C.POP}" stroke="${C.INK}" stroke-width="4.5"/>`).join('')}</svg>`);
      Hh.l1 = ch.querySelector('.l1'); Hh.l2 = ch.querySelector('.l2'); Hh.l3 = ch.querySelector('.l3'); Hh.dots = [...ch.querySelectorAll('.dot')];
      put(t.main, 110, 432, '— ANTES     — DESPUÉS', 'font-size:20px;opacity:.7', 'm');
      div(t.main, `left:1170px;top:28px;bottom:28px;width:0;border-left:5px dashed ${C.INK};opacity:.55`);
      [[-34], [561]].forEach(([y]) => div(t.main, `left:1140px;top:${y}px;width:64px;height:64px;border-radius:50%;background:${C.FIELD};border:5px solid ${C.INK};box-sizing:border-box`));
      put(t.main, 1262, 300, tk.side, 'font-size:30px;transform:translate(-50%,-50%) rotate(-90deg)', 'm');
      put(t.main, 1300, 500, tk.no, 'font-size:26px;opacity:.75', 'm');
      Hh.se = seal(b, 1150, 300, 92, C.FIELD, ['94']); Hh.tk = ticks(b, 1620, 250, 80, 10);
      Hh.gl = put(b, 1620, 250, `<div style="width:150px;height:150px;border-radius:50%;background:${C.WHITE};border:5px solid ${C.INK};display:flex;align-items:center;justify-content:center"><span class="d" style="font-size:96px;color:${C.POP}">✓</span></div>`, '', 'stkS');
      Hh.pill = pillEl(b, 1250, 720, tk.pill, { fill: C.POP, size: 58, padX: 44, padY: 18 });
    },
    update(lt) {
      const dur = T.why - T.code, sw = T.ticket - T.code;         // whip between the two halves at 0.97 s
      const xa = (1 - E.out(3)(p(lt, 0, .13))) * W * WHIP - E.in(3)(p(lt, sw - .1, sw)) * W * .3;
      const xb = (1 - E.out(3)(p(lt, sw - .02, sw + .16))) * W * .3 - E.in(3)(p(lt, dur - .1, dur)) * W * WHIP;
      Hh.a.style.visibility = lt < sw + .02 ? 'visible' : 'hidden'; Hh.b.style.visibility = lt < sw - .03 ? 'hidden' : 'visible';
      Hh.a.style.transform = `translate(${xa.toFixed(1)}px,0)`; Hh.b.style.transform = `translate(${xb.toFixed(1)}px,0)`;
      Hh.c1.style.transform = `rotate(${K.tw(lt, 0, sw, -2.6, -1.4, E.glide)}deg)`; Hh.c1.sheets[0].style.transform = 'rotate(5deg) translate(36px,18px)';
      typed(Hh.code, COPY.code, lt, .0, .36, 5); K.drawOn(Hh.sq1.path, E.soft(p(lt, .36, .58))); Hh.sq1.style.visibility = lt < .36 ? 'hidden' : 'visible';
      pop(Hh.pl, lt, .12, { rot: 6 }); pop(Hh.bub, lt, .34, { rot: -5, r0: 14, from: .2, d: .4 });
      Hh.flags.style.transform = `translateY(${(1 - E.soft(p(lt, .05, .5))) * -200}px) rotate(${Math.sin(lt * 5) * 1.6}deg)`; idle(Hh.bub, lt, 1, 9, 2); idle(Hh.pl, lt, 2, 6, 4);
      const b0 = sw + .12;
      Hh.t.style.transform = `rotate(${K.tw(lt, sw, dur, -3, -1.6, E.glide)}deg)`;
      K.drawOn(Hh.l1, E.soft(p(lt, b0, b0 + .3))); const d2 = E.soft(p(lt, b0 + .08, b0 + .5)); K.drawOn(Hh.l2, d2); K.drawOn(Hh.l3, d2);
      Hh.dots.forEach((d, i) => { const k = K.pop(lt, b0 + .1 + i * .09, .3); d.setAttribute('r', (13 * k).toFixed(2)); });
      pop(Hh.se, lt, b0 + .1, { rot: -10, r0: 40 }); pop(Hh.gl, lt, b0 + .2, { rot: 6, r0: -30 }); pop(Hh.tk, lt, b0 + .26, { r0: 30, from: .6 });
      pop(Hh.pill, lt, b0 + .34, { rot: -6, r0: 12, from: .3, d: .42 }); idle(Hh.pill, lt, 0, 7, 1.8); idle(Hh.se, lt, 1, 6, 5); idle(Hh.gl, lt, 2, 7, 4);
    } });

  /* I · 11.07–12.07 · WHY — plain text left, the phone scrolls and two notes land on real sections */
  let I = {};
  scene({ id: 'why', t0: T.why, t1: T.stamps,
    build(root) {
      const w = I.w = wrap(root);
      I.r = div(w, `left:900px;top:-500px;width:1700px;height:1700px;border:5px solid ${C.INK};border-radius:50%;box-sizing:border-box`);
      I.t = put(w, 130, 300, '', 'font-size:112px;line-height:1.02', 'd');
      const lw = (() => { const sp = el('span', 'position:absolute;visibility:hidden;font-size:112px', w, 'porqué.'); sp.className = 'd'; const v = sp.offsetWidth; sp.remove(); return v; })();
      I.sq = squig(w, 132, 300 + 3 * 114 + 6, lw, C.POP, 13);
      I.ph = phone(w, 1010, 60, 500, 1000, '../assets/img/site_mobile.jpg');
      I.n1 = put(w, 1030, 300, `<div style="position:relative">${bubbleSvg(390, 110, C.FIELD, 'r')}<div class="d" style="position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;font-size:46px">${COPY.whyTags[0]}</div></div>`, '', 'stkS');
      I.n2 = put(w, 1640, 720, `<div style="position:relative">${bubbleSvg(450, 110, C.POP, 'l')}<div class="d" style="position:absolute;left:0;right:0;top:50%;transform:translateY(-52%);text-align:center;font-size:46px">${COPY.whyTags[1]}</div></div>`, '', 'stkS');
      I.sp = spark(w, 1720, 250, 1.4, C.FIELD);
    },
    update(lt) {
      const dur = T.stamps - T.why, x = whipX(lt, dur, { o: false }), z = K.zoom(lt, dur - .13, dur, 1, 5, E.in(3));   // dive into the second note
      I.w.style.transform = (Math.abs(x) > .05 || z > 1.0005) ? `translate(${x.toFixed(1)}px,0) ` + K.about(1640, 720, z) : 'none';
      typed(I.t, COPY.why, lt, .0, .38, 9); K.drawOn(I.sq.path, E.soft(p(lt, .4, .66))); I.sq.style.visibility = lt < .4 ? 'hidden' : 'visible';
      I.ph.style.transform = `rotate(${K.tw(lt, 0, dur, 2.5, 1, E.glide)}deg)`; I.ph.img.style.transform = `translateY(${-K.tw(lt, 0, dur, 1700, 2500, E.glide)}px)`;
      idle(I.sp, lt, 0, 6, 8); pop(I.n1, lt, .26, { rot: -5, r0: -16, from: .3 }); idle(I.n1, lt, 1, 8, 2); pop(I.n2, lt, .46, { rot: 4, r0: 16, from: .3 }); pop(I.sp, lt, .3, { r0: 70 });
      I.r.style.transform = `scale(${K.tw(lt, 0, dur, 1.05, 1, E.glide)})`;
    } });

  /* J · 12.07–13.03 · STAMPS — an album of what a good site carries; tiles land in a wave */
  let J = {};
  scene({ id: 'stamps', t0: T.stamps, t1: T.pill,
    build(root) {
      const w = J.w = wrap(root); J.tiles = [];
      J.t = put(w, 960, 130, `<span class="d" style="font-size:100px">${COPY.stampsTitle}</span>`, 'white-space:nowrap');
      J.board = card(w, { x: 215, y: 235, w: 1490, h: 620, fill: C.PAPER, stack: 1, r: 48 });
      put(J.board.main, 70, 548, 'NORTH PEARL · ÁLBUM', 'font-size:22px;opacity:.6', 'm');
      COPY.stamps.forEach((s, i) => { const col = i % 7, row = Math.floor(i / 7), fill = [C.FIELD, C.WHITE, C.POP, C.WHITE, C.FIELD, C.POP, C.WHITE][(i * 3 + row) % 7];
        const e = put(J.board.main, 145 + col * 200, 160 + row * 208, `<div style="width:170px;height:170px;border-radius:38px;background:${fill};border:5px solid ${C.INK};box-sizing:border-box;display:flex;align-items:center;justify-content:center"><span class="d" style="font-size:${s.length > 2 ? 58 : 78}px">${esc(s)}</span></div>`, '', 'stkS');
        J.tiles.push(e); });
      J.pill = pillEl(w, 960, 930, COPY.stampsPill, { fill: C.POP, size: 68, padX: 54, padY: 18 });
    },
    update(lt) {
      const dur = T.pill - T.stamps, z = K.zoom(lt, 0, .45, .62, 1, E.out(3)) * K.zoom(lt, dur - .12, dur, 1, 1.12, E.in(3));   // land from the dive, lean into the cut
      J.w.style.transform = Math.abs(z - 1) > .0005 ? K.about(960, 540, z) : 'none';
      pop(J.t, lt, -.1, { r0: -3, from: .7 }); J.board.style.transform = `rotate(${K.tw(lt, 0, dur, -1.6, -.6, E.glide)}deg)`; J.board.sheets[0].style.transform = 'rotate(3.2deg) translate(30px,16px)';
      J.tiles.forEach((e, i) => pop(e, lt, .04 + (i % 7) * .035 + Math.floor(i / 7) * .08, { rot: (K.hash(i * 2.3) - .5) * 9, r0: (i % 2 ? 22 : -22), from: .2, d: .32 }));
      pop(J.pill, lt, .46, { rot: -3, r0: 10, from: .3, d: .4 }); idle(J.pill, lt, 0, 7, 2); J.tiles.forEach((e, i) => idle(e, lt, i, 3.5, 1.6, 1.6));
    } });

  /* K · 13.03–13.97 · PILL — "Hecha con Astro." slides in turning, a cursor leaves a dotted trail */
  let Kk = {};
  scene({ id: 'pill', t0: T.pill, t1: T.logo,
    build(root) {
      const w = Kk.w = wrap(root);
      Kk.p = put(w, 960, 560, `<div style="width:1340px;height:230px;box-sizing:border-box;border-radius:999px;background:${C.FIELD};border:6px solid ${C.INK};display:flex;align-items:center;gap:40px;padding:0 50px 0 36px">
        <div style="width:160px;height:160px;flex:none;border-radius:50%;background:${C.WHITE};border:5px solid ${C.INK};box-sizing:border-box;display:flex;align-items:center;justify-content:center">${svg(110, 110, bolt(1.5, C.FIELD))}</div>
        <div><div class="m" style="font-size:24px;opacity:.75">${COPY.pill.label}</div><div class="d" style="font-size:108px;margin-top:8px">${COPY.pill.text}</div></div></div>`, '', 'stk');
      Kk.arc = div(w, 'left:0;top:0', `<svg width="${W}" height="${H}" style="display:block"><path d="M120,420 Q520,60 1000,250" fill="none" stroke="${C.INK}" stroke-width="7" stroke-dasharray="2 24" stroke-linecap="round"/></svg>`).querySelector('path');
      Kk.len = Kk.arc.getTotalLength(); Kk.cur = cursor(w, 0, 0, 1.6, C.POP);
      Kk.s1 = put(w, 1560, 330, `<div class="d" style="font-size:130px;color:${C.FIELD}">★</div>`, '', 'stk'); Kk.s2 = spark(w, 380, 800, 1.5, C.POP); Kk.s3 = seal(w, 1480, 800, 70, C.POP, ['rápida']);
    },
    update(lt) {
      const dur = T.logo - T.pill, x = -E.in(3)(p(lt, dur - .15, dur)) * W * .3, z = K.zoom(lt, dur - .2, dur, 1, 1.5, E.in(3));
      Kk.w.style.transform = (x || z > 1.0005) ? `translate(${x.toFixed(1)}px,0) ` + K.about(960, 560, z) : 'none';
      const q = E.out(3)(p(lt, -.06, .24));
      Kk.p.style.transform = `translate(-50%,-50%) translate(${(1 - q) * -1300}px,${(1 - q) * 160}px) rotate(${-2 + (1 - q) * -16}deg)`;
      const k = E.smooth(p(lt, .1, .62)), pt = Kk.arc.getPointAtLength(Kk.len * k);
      Kk.cur.style.left = pt.x + 'px'; Kk.cur.style.top = pt.y + 'px'; Kk.cur.style.transform = `translate(-50%,-50%) rotate(${30 + 20 * k}deg)`; Kk.cur.style.visibility = lt < .1 ? 'hidden' : 'visible';
      Kk.arc.style.clipPath = `inset(0 ${(100 - (120 + (1000 - 120) * k) / W * 100).toFixed(2)}% 0 0)`;
      pop(Kk.s1, lt, .36, { rot: 10, r0: -40 }); pop(Kk.s2, lt, .44, { r0: 70 }); pop(Kk.s3, lt, .5, { rot: -9, r0: 30 }); [Kk.s1, Kk.s2, Kk.s3].forEach((e, i) => idle(e, lt, i, 8, 5));
    } });

  /* L · 13.97–17.70 · LOGO — the wordmark lands as a sticker, the line types, the button arrives, hold */
  let L = {};
  scene({ id: 'logo', t0: T.logo, t1: T.end,
    build(root) {
      const w = L.w = wrap(root);
      L.bub = put(w, 960, 420, `<div style="position:relative">${bubbleSvg(1040, 330, C.INK, 'l')}<img src="../assets/img/np_logo_horizontal.svg" style="position:absolute;left:50%;top:50%;width:760px;margin-left:-380px;margin-top:-174px"></div>`, '', 'stk');
      L.img = L.bub.querySelector('img'); K.images.push(L.img);
      L.dot = put(w, 1420, 505, `<div style="width:54px;height:54px;border-radius:50%;background:${C.POP};border:5px solid ${C.INK};box-sizing:border-box"></div>`);
      L.b1 = put(w, 470, 190, bubbleSvg(190, 120, C.WHITE, 'r', true), '', 'stkS'); L.b2 = put(w, 1470, 180, bubbleSvg(160, 100, C.POP, 'l', true), '', 'stkS');
      L.g1 = seal(w, 300, 520, 84, C.WHITE, ['hola']); L.g2 = cursor(w, 1640, 470, 1.9, C.WHITE);
      L.tag = put(w, 960, 770, '', 'font-size:86px;transform:translate(-50%,-50%);white-space:pre;text-align:center', 'd');
      const m = el('span', 'position:absolute;visibility:hidden;font-size:86px', w, esc(COPY.tag)); m.className = 'd'; const tw = m.offsetWidth; const m2 = el('span', 'position:absolute;visibility:hidden;font-size:86px', w, 'a la primera.'); m2.className = 'd'; const uw = m2.offsetWidth; m.remove(); m2.remove();
      L.tag.style.width = tw + 'px'; L.tag.style.textAlign = 'left';
      L.sq = squig(w, 960 + tw / 2 - uw, 828, uw, C.INK, 10);
      L.conf = confetti(w, 1580, 930, 14, 91); L.conf2 = confetti(w, 520, 300, 12, 57);
      L.cta = pillEl(w, 1580, 950, COPY.cta, { fill: C.POP, size: 70, padX: 56, padY: 20 });
    },
    update(lt) {
      const q = E.out(4)(p(lt, 0, .42)), s = K.lerp(3.2, 1, q);
      L.w.style.transform = 'none';
      L.bub.style.transform = `translate(-50%,-50%) translate(${(Math.sin(lt * 2.9) * 6).toFixed(2)}px,${(Math.sin(lt * 4.1) * 13).toFixed(2)}px) rotate(${(-3 + (1 - q) * 10 + Math.sin(lt * 3.3) * 1.3).toFixed(3)}deg) scale(${(s * (1 + .012 * Math.sin(lt * 5.2))).toFixed(4)})`;
      L.bub.style.filter = q < .98 ? `url(#stk) blur(${((1 - q) * 22).toFixed(1)}px)` : 'url(#stk)';
      pop(L.dot, lt, .5, { from: .1 });
      pop(L.b1, lt, .5, { rot: -8, r0: -30 }); pop(L.b2, lt, .62, { rot: 9, r0: 30 }); pop(L.g1, lt, 1.5, { rot: -12, r0: -40 }); pop(L.g2, lt, 1.62, { rot: 12, r0: 40 });
      [L.b1, L.b2, L.g1, L.g2].forEach((e, i) => idle(e, lt, i, 13, 5, 1.05 + i * .11)); idle(L.dot, lt, 5, 3, 0, 2.2);
      L.tag.style.visibility = lt < .5 ? 'hidden' : 'visible'; typed(L.tag, COPY.tag, lt, .52, 1.0, 3);
      K.drawOn(L.sq.path, E.soft(p(lt, 1.05, 1.4))); L.sq.style.visibility = lt < 1.05 ? 'hidden' : 'visible';
      pop(L.cta, lt, 1.95, { rot: -4, r0: 14, from: .2, d: .45 }); if (lt > 2.4) L.cta.style.transform += ` scale(${(1 + .045 * Math.sin((lt - 2.4) * 7.2)).toFixed(4)}) rotate(${(Math.sin((lt - 2.4) * 3.6) * 1.6).toFixed(3)}deg)`;
      L.conf(lt, 2.0); L.conf2(lt, 2.9);
    } });

  K.start({ format: '16x9', fps: 30, dur: 17.7 });
})();
