/* transitions_demo.js — every K.trans.* transition chained between simple North Pearl scenes (bold colour + one big
   word each, one photo scene, a logo end card). ?fmt=16x9 for landscape · ?set=b non-default options · ?set=cuts every
   transition replaced by a hard cut (debug baseline). The magenta label names the transition nearest to the current
   time. Scenes use only the core (K.div / K.img) so the demo never depends on other families. Scene text sits on whole
   pixels, rises by translation only and stays < 256 px at 16:9 (GPU path-rendered glyphs break the determinism check). */
(function () {
  const Q = new URLSearchParams(location.search);
  const { E } = K;
  K.theme = { bg: '#0E0F12', fg: '#0E0F12', accent: '#2B4BFF', accent2: '#D6FF3D', accent3: '#FF4D2E' };
  const C = { blue: '#2B4BFF', lime: '#D6FF3D', orange: '#FF4D2E', pink: '#FF5CA8', ink: '#0E0F12', paper: '#F2F2EF', navy: '#16183F', white: '#FFFFFF' };
  const IMG = '../demos/assets/img/';

  // ---------- scene builder: full-bleed colour, kicker, one headline block (lines; *x* = serif italic emphasis) ----------
  const refs = {};
  function slide(id, spec) {
    return (root) => {
      const W = K.W, H = K.H, port = W < H, s = K.safe();
      const w = K.div(root, `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden;background:${spec.bg}`);
      if (spec.img) { const im = K.img(w, IMG + spec.img, `left:0;top:0;width:100%;height:100%;object-fit:cover;object-position:${spec.focus || '50% 50%'}`); im.style.filter = 'saturate(1.08) contrast(1.04)'; K.div(w, 'left:0;top:0;width:100%;height:100%;background:linear-gradient(180deg,rgba(0,0,0,.25) 0%,rgba(0,0,0,0) 30%,rgba(0,0,0,0) 45%,rgba(0,0,0,.72) 100%)'); }
      const kick = K.div(w, `left:${s.left}px;right:${s.right}px;top:${s.top}px;display:flex;justify-content:space-between;font-size:${port ? 28 : 24}px;color:${spec.fg};opacity:.78`, `<span class="k-mono">NORTH PEARL</span><span class="k-mono">${spec.n}</span>`);
      kick.style.letterSpacing = '.06em';
      const block = K.div(w, `left:0;width:${W}px;text-align:center;color:${spec.fg}`);
      const maxW = W * (port ? .84 : .62), cap = (port ? (spec.cap || .2) : Math.min(spec.cap || .21, .21)) * H;   // 16:9: ≤ 227 px lines (serif em ≤ 254 px)
      const lines = spec.lines.map((txt, li) => {
        const ln = K.el('div', 'white-space:nowrap;line-height:.9;display:block', block);
        const parts = txt.split(/(\*[^*]+\*)/).filter(Boolean);
        for (const p of parts) {
          const it = p.startsWith('*'), sp = K.el('span', '', ln, '');
          sp.className = it ? 'k-serif' : 'k-display';
          if (it) { sp.style.color = spec.em || spec.fg; sp.style.letterSpacing = '-.03em'; sp.style.fontSize = '1.12em'; }
          sp.textContent = it ? p.slice(1, -1) : p;
          if (spec.dot && !it && li === spec.lines.length - 1 && p === parts[parts.length - 1]) {          // the accent dot (zoom pivots)
            const d = K.el('span', `display:inline-block;width:.2em;height:.2em;border-radius:50%;margin-left:.05em;background:${spec.dot};vertical-align:baseline`, ln);
            refs[id + '_dot'] = d;
          }
        }
        ln.style.fontSize = '100px'; ln.style.display = 'inline-block';
        const nat = Math.max(1, ln.getBoundingClientRect().width); ln.style.display = 'block';
        ln.style.fontSize = Math.round(Math.min(cap, 100 * maxW / nat)) + 'px';
        return ln;
      });
      if (spec.sub) { const sb = K.el('div', `margin-top:${port ? 40 : 28}px;font-size:${port ? 34 : 28}px;letter-spacing:.04em;opacity:.85`, block, spec.sub); sb.className = 'k-mono'; lines.push(sb); }
      if (spec.logo) {                         // inline SVG (vector, painted with the layer: no image-raster cache history)
        const lw = port ? W * .74 : W * .4, x = new XMLHttpRequest(); x.open('GET', IMG + 'np_logo_horizontal.svg', false); x.send();
        const lg = K.el('div', `position:relative;margin:0 auto ${port ? 70 : 50}px;width:${lw}px;height:${(lw * 367 / 2167).toFixed(1)}px`, block, x.responseText);
        const sv = lg.querySelector('svg'); if (sv) { sv.setAttribute('width', '100%'); sv.setAttribute('height', '100%'); sv.style.display = 'block'; }
        lines.unshift(lg);
      }
      const bh = block.offsetHeight, cy = port ? (s.top + (H - s.bottom)) / 2 + 10 : H / 2;
      block.style.top = Math.round(cy - bh / 2) + 'px';                      // whole pixels (stable text raster)
      refs[id] = { w, lines, block };
    };
  }
  // in-scene life: a slow drift and each line rising 34 px into place — no opacity fades
  function life(id, dur) {
    return (lt) => {
      const r = refs[id]; if (!r) return;
      // slow drift by whole-pixel translation only: a continuously changing scale or sub-pixel offset on big text makes
      // Chrome reuse glyph rasters history-dependently → 1–2 px differences in the determinism check
      r.block.style.transform = `translateY(${Math.round(-26 * E.glide(K.p(lt, -.3, dur + .3)))}px)`;
      r.lines.forEach((ln, i) => { const q = E.soft(K.p(lt, -.12 + i * .07, .6 + i * .07)); ln.style.transform = q > .995 ? '' : `translateY(${Math.round((1 - q) * 34)}px)`; });
    };
  }

  // ---------- the chain ----------
  const S = [
    { bg: C.blue, fg: C.white, lines: ['Tu web,', '*rediseñada.*'], d: 1.25 },
    { bg: C.lime, fg: C.ink, lines: ['¡Rápida!'], sub: 'CARGA EN 0,8 s', d: 1.15 },
    { bg: C.ink, fg: C.white, lines: ['Hecha con', 'Astro'], dot: C.orange, d: 1.2 },
    { bg: C.orange, fg: C.white, lines: ['81 → 94'], sub: 'LIGHTHOUSE · RENDIMIENTO', cap: .3, d: 1.2 },
    { bg: C.paper, fg: C.ink, em: C.blue, lines: ['Mejor', '*SEO.*'], d: 1.15 },
    { bg: C.pink, fg: C.ink, lines: ['Más', '*tráfico*'], sub: 'DESDE GOOGLE', d: 1.15 },
    { bg: C.navy, fg: C.lime, lines: ['Diseño', '*único.*'], d: 1.2 },
    { bg: C.lime, fg: C.ink, lines: ['Código', '*limpio.*'], d: 1.15 },
    { bg: C.blue, fg: C.white, lines: ['Página', '*nueva.*'], d: 1.15 },
    { bg: C.paper, fg: C.ink, em: C.orange, lines: ['¿Tu web', 'es la', '*próxima?*'], d: 1.25 },
    { bg: C.orange, fg: C.ink, lines: ['Búsquedas', '*en Google*'], d: 1.2 },
    { bg: '#000', fg: C.white, img: 'np_3294_6s.jpg', focus: '50% 60%', lines: ['Así', '*quedó.*'], sub: 'AURORA CAFÉ · ASTRO', d: 1.45 },
    { bg: C.ink, fg: C.white, em: C.lime, lines: ['Lighthouse', '*94*'], cap: .2, d: 1.2 },
    { bg: C.pink, fg: C.white, lines: ['Escríbenos'], sub: 'HOLA@NORTHPEARL.CO', d: 1.2 },
    { bg: C.blue, fg: C.white, lines: ['Link', '*en la bio*'], d: 1.15 },
    { bg: C.lime, fg: C.ink, lines: ['¡Ya!'], cap: .34, d: 1.1 },
    { bg: C.ink, fg: C.white, lines: [], logo: true, sub: 'WEBS QUE CARGAN RÁPIDO', d: 1.7 },
  ];
  const ids = S.map((_, i) => 's' + String(i + 1).padStart(2, '0'));
  // ?set=b swaps every transition to a variant (non-default options) — same scenes, same cut times
  const VAR = Q.get('set') === 'b';
  const TR = VAR ? [
    ['cut', "cut({flash: 1, color: lime})", (o) => K.trans.cut({ ...o, flash: 1, color: C.lime })],
    ['whip', "whip({dir: 'up', distance: .45})", (o) => K.trans.whip({ ...o, dir: 'up', distance: .45 })],
    ['zoomThrough', "zoomThrough({portal, scale: 16})", (o) => K.trans.zoomThrough({ ...o, target: () => refs.s03_dot, scale: 16, from: .3, portal: true })],
    ['zoomOut', "zoomOut({keep: false, x, y})", (o) => K.trans.zoomOut({ ...o, keep: false, x: K.W * .7, y: K.H * .45 })],
    ['push', "push({dir: 'right'})", (o) => K.trans.push({ ...o, dir: 'right' })],
    ['cover', "cover({dir: 'down', shadow: .7})", (o) => K.trans.cover({ ...o, dir: 'down', shadow: .7 })],
    ['slice', "slice({n: 7, dir: 'h', from: 'alt', order: 'center'})", (o) => K.trans.slice({ ...o, n: 7, dir: 'h', from: 'alt', order: 'center' })],
    ['flash', "flash({frames: 1, color: orange})", (o) => K.trans.flash({ ...o, frames: 1, color: C.orange })],
    ['colorBurst', "colorBurst({frames: 3, serif})", (o) => K.trans.colorBurst({ ...o, frames: 3, serif: true, colors: [C.ink, C.lime], words: ['SEO', 'Astro'] })],
    ['iris', "iris({shape: 'roundrect', ring: null})", (o) => K.trans.iris({ ...o, shape: 'roundrect', ring: null })],
    ['gridMask', "gridMask({order: 'center', color: pink})", (o) => K.trans.gridMask({ ...o, order: 'center', color: C.pink })],
    ['glitch', "glitch({amount: 1.4, seed: 7})", (o) => K.trans.glitch({ ...o, amount: 1.4, seed: 7 })],
    ['liquid', "liquid({color: orange})", (o) => K.trans.liquid({ ...o, color: C.orange, blobs: 9, seed: 11 })],
    ['spin3d', "spin3d({mode: 'flip', dir: 'up'})", (o) => K.trans.spin3d({ ...o, mode: 'flip', dir: 'up' })],
    ['punch', "punch({scale: 1.3, shake: .04})", (o) => K.trans.punch({ ...o, scale: 1.3, shake: .04 })],
    ['smear', "smear({streaks: false, x, y})", (o) => K.trans.smear({ ...o, streaks: false, x: K.W * .5, y: K.H * .4 })],
  ] : [
    ['cut', "cut({flash: 2, punch: .06})", (o) => K.trans.cut({ ...o, flash: 2, punch: .06 })],
    ['whip', "whip({dir: 'left'})", (o) => K.trans.whip({ ...o, dir: 'left' })],
    ['zoomThrough', "zoomThrough({target: dot, scale: 16})", (o) => K.trans.zoomThrough({ ...o, target: () => refs.s03_dot, scale: 16, from: .3 })],
    ['zoomOut', "zoomOut({scale: 8})", (o) => K.trans.zoomOut({ ...o })],
    ['push', "push({dir: 'up'})", (o) => K.trans.push({ ...o, dir: 'up' })],
    ['cover', "cover({dir: 'left'})", (o) => K.trans.cover({ ...o, dir: 'left' })],
    ['slice', "slice({n: 5, dir: 'v', color})", (o) => K.trans.slice({ ...o, n: 5, dir: 'v', color: C.orange })],
    ['flash', "flash({frames: 2})", (o) => K.trans.flash({ ...o })],
    ['colorBurst', "colorBurst({words})", (o) => K.trans.colorBurst({ ...o, items: [{ color: C.orange, word: 'RÁPIDA' }, { color: C.lime, word: 'LIMPIA' }, { color: C.pink, word: 'ÚNICA' }], frames: 2 })],
    ['iris', "iris({shape: 'circle'})", (o) => K.trans.iris({ ...o, x: K.W * .5, y: K.H * .62 })],
    ['gridMask', "gridMask({order: 'diag'})", (o) => K.trans.gridMask({ ...o })],
    ['glitch', "glitch()", (o) => K.trans.glitch({ ...o })],
    ['liquid', "liquid({color: lime, color2: blue})", (o) => K.trans.liquid({ ...o, x: K.W * .28, y: K.H * .7, color: C.lime, color2: C.blue })],
    ['spin3d', "spin3d({mode: 'cube'})", (o) => K.trans.spin3d({ ...o, dir: 'left' })],
    ['punch', "punch({flash: 1})", (o) => K.trans.punch({ ...o, flash: 1 })],
    ['smear', "smear()", (o) => K.trans.smear({ ...o })],
  ];
  let t = 0; const marks = [];
  S.forEach((sp, i) => {
    sp.id = ids[i]; sp.n = String(i + 1).padStart(2, '0') + ' / ' + S.length; sp.t0 = t; sp.t1 = Math.round((t + sp.d) * 30) / 30; t = sp.t1;
    if (i < TR.length && TR[i][0] === 'colorBurst') t = Math.round(t * 30 + 6) / 30;            // the burst sits between the scenes (6 frames)
  });
  // transitions are defined before K.start: set K.W/K.H to the final format first so numeric x/y below are right
  // (targets and default pivots are measured lazily anyway)
  const fmt = Q.get('fmt') || '9x16';
  const [FW, FH] = K.FORMATS[fmt] || K.FORMATS['9x16'];
  K.W = FW; K.H = FH;                                                          // so x/y below see the final format
  S.forEach((sp, i) => {
    K.scene({ id: sp.id, t0: sp.t0, t1: sp.t1, build: slide(sp.id, sp), update: life(sp.id, sp.d) });
    if (i < TR.length) {
      const [name, label, fn] = TR[i], at = sp.t1;
      // ?set=cuts (debugging aid): every transition replaced by a plain hard cut at the same time
      const d = Q.get('set') === 'cuts' ? K.trans.cut({ at, a: sp.id, b: ids[i + 1] }) : fn({ at, a: sp.id, b: ids[i + 1] });
      K.addCues(d);
      marks.push({ at, label: `${String(i + 1).padStart(2, '0')} · ${label}`, name });
    }
  });
  // label: the transition nearest to t
  let lab = null;
  K.addPost((tt) => {
    if (!lab) { lab = K.el('div', '', K.film); lab.className = 'demo-label'; }
    let best = marks[0]; for (const m of marks) if (Math.abs(m.at - tt) < Math.abs(best.at - tt)) best = m;
    const txt = best.label + `  @${best.at.toFixed(2)}s`;
    if (lab.textContent !== txt) lab.textContent = txt;
  });
  window.__demoMarks = marks;
  K.start({ format: fmt, fps: 30, dur: +t.toFixed(3) });
})();
