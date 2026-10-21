/* looks demo — every look of engine/kit/looks.js on North Pearl stills / clips, labelled. ?fmt=16x9 for landscape.
   Media looks first (one per segment), then the global looks over plain plates; the corner badge runs throughout. */
(function () {
  const K = window.K, L = K.looks, Q = new URLSearchParams(location.search);
  const fmt = Q.get('fmt') || '9x16', [FW, FH] = K.FORMATS[fmt] || K.FORMATS['9x16'];
  const IMG = 'assets/img/', CLIP = 'assets/clips/';
  const P = FH > FW, u = Math.min(FW, FH) / 1080;
  // ?variants=1 → the same timeline with alternative options (exercises the non-default paths of every look)
  const V = Q.has('variants'), vo = (base, alt) => Object.assign({}, base, V ? alt : {});
  let T = 0;
  const seg = (dur) => { const t0 = T; T += dur; return [t0, T]; };

  K.css('looks-demo', `.ld-desc{display:block;font:500 ${Math.round(19 * u)}px/1.25 "Geist Mono",monospace;color:#222;margin-top:6px;max-width:${Math.round(560 * u)}px;letter-spacing:0}
    .ld-hl{position:absolute;font:900 ${Math.round((P ? 112 : 104) * u)}px/.9 "Inter Tight",sans-serif;letter-spacing:-.05em;color:#fff;text-shadow:0 ${8 * u}px ${40 * u}px rgba(0,0,0,.35)}
    .ld-hl em{font:italic 400 1.08em/0 "Instrument Serif",serif;letter-spacing:-.02em}`);
  function label(w, name, desc) {
    const l = K.el('div', '', w); l.className = 'demo-label'; l.textContent = name;
    if (desc) { const d = K.el('span', '', l); d.className = 'ld-desc'; d.textContent = desc; }
  }
  // demo-only helpers (plates + a headline) so global looks have something to act on
  function plate(w, add, src, push = .035) {
    const im = K.img(w, IMG + src, `left:0;top:0;width:${FW}px;height:${FH}px;object-fit:cover;transform-origin:50% 45%`);
    add({ el: im, update(lt) { im.style.transform = `scale(${(1.03 + lt * push).toFixed(4)})`; } });
  }
  function headline(w, add, markup, at = .25, y = P ? .58 : .55) {          // markup: "Webs que cargan *rápido*"
    const S = K.safe(), el = K.div(w, `left:${S.left}px;right:${S.right}px;top:${FH * y}px`); el.className = 'ld-hl';
    const words = K.tokens(markup).filter((t) => t.text).map((t) => { const s = K.el('span', 'display:inline-block;margin-right:.22em', el); if (t.em) K.el('em', '', s, t.text); else s.textContent = t.text; return s; });
    add({ el, update(lt) { words.forEach((s, i) => { const q = K.E.snappy(K.p(lt, at + i * .07, at + i * .07 + .5)); s.style.transform = `translateY(${((1 - q) * 60 * u).toFixed(1)}px) scale(${(1.12 - .12 * q).toFixed(4)})`; s.style.filter = q < 1 ? `blur(${((1 - q) * 14 * u).toFixed(1)}px)` : 'none'; s.style.opacity = Math.min(1, q * 2.5).toFixed(3); }); } });
  }
  function look(id, dur, name, desc, make) {
    const [t0, t1] = seg(dur);
    K.scene({ id, t0, t1, build(root, add) { const w = K.div(root, `left:0;top:0;width:${FW}px;height:${FH}px`); const c = make(w, add); if (c) { add(c); K.addCues(c, t0); } label(w, name, desc); } });
    return [t0, t1];
  }

  /* ---- media looks ---- */
  look('ascii', 2.8, '/ascii', 'Cualquier toma como ASCII en vivo, look de terminal',
    (w) => L.ascii(w, vo({ clip: CLIP + 'c3294', prompt: 'npm create astro@latest --diseño rápido', promptAt: .45, focus: [.5, .4] }, { src: IMG + 'np_3295_2s.jpg', prompt: null, color: '#7CFF6B', cell: 9 * u, invert: false, glow: .4, out: 2.3 })));
  look('glitch', 2.8, '/glitch-vhs', 'RGB split, cortes desplazados y ruido de tracking VHS',
    (w) => L.glitchVhs(w, vo({ clip: CLIP + 'c3293', word: 'RÁPIDA', bursts: [1.7], focus: [.5, .45] }, { clip: undefined, src: IMG + 'np_3292_2s.jpg', word: null, intensity: .9, date: "ENE 15 '26", clock: 'AM 09:41:07', play: 'REW', out: 2.4 })));
  look('sticker', 2.8, '/sticker-pop', 'Recorta tu producto y lo suelta como sticker Y2K',
    (w) => L.stickerPop(w, vo({ src: IMG + 'np_laptop_cutout.png', word: '¡WOW!', pill: 'Escríbenos', hits: [1.5, 2.0] }, { pattern: '¡NUEVA!', bg: '#FF4D9A', word: null, pill: 'Link en la bio', pillStar: false, rot: 6, out: 2.3 })));
  look('liquid', 2.8, '/liquid', 'Metaballs líquidos que revelan al sujeto, al ritmo',
    (w) => L.liquid(w, vo({ src: IMG + 'np_3293_2s.jpg', word: 'DISEÑO', lens: { x: .6, y: .53, r: P ? .31 : .34 }, lensZoom: 1.12, push: .03, pulses: [1.9] }, { lens: false, echo: 0, color: '#FF4D2E', word: 'FLUIDO', out: 2.2 })));
  look('grid', 2.8, '/grid-reveal', 'Revela la toma con baldosas que giran y se barajan',
    (w) => L.gridReveal(w, vo({ src: IMG + 'np_3294_2s.jpg', word: 'ASTRO', order: 'random', wordY: P ? .44 : .5 }, { from: 'none', order: 'center', axis: 'x', labels: false, cols: 3, rows: 5, out: 2.0 })));
  look('halftone', 2.6, '/halftone', 'Trama de puntos: mono (arriba) y color (abajo)', (w, add) => {
    const a = L.halftone(w, vo({ src: IMG + 'np_3292_2s.jpg', h: P ? FH / 2 : FH, w: P ? FW : FW / 2, focus: [.5, .45], push: .03 }, { invert: true, angle: 15, color: '#2B4BFF', bg: '#D6FF3D', out: 2.0 }));
    const b = L.halftone(w, { src: IMG + 'np_3292_2s.jpg', mode: 'color', x: P ? 0 : FW / 2, y: P ? FH / 2 : 0, h: P ? FH / 2 : FH, w: P ? FW : FW / 2, cell: 14 * u, at: .12, focus: [.5, .4], push: .03 });
    add(a); add(b); return null;
  });
  look('duotone', 2.6, '/duotone', 'Dos tintas: sombras índigo, luces lima',
    (w) => L.duotone(w, vo({ src: IMG + 'np_3295_2s.jpg', push: .02 }, { clip: CLIP + 'c3293', src: undefined, dark: '#140A2E', mid: '#FF4D2E', light: '#FFF1C9', out: 2.0 })));
  look('pixelate', 2.6, '/pixelate', 'Mosaico que resuelve (entrada) y se rompe (salida)',
    (w) => L.pixelate(w, vo({ clip: CLIP + 'c3294', out: 2.1, outDur: .45 }, { hold: 24 * u, grid: true, rate: .5 })));
  look('rgb', 2.6, '/rgb-split', 'Aberración cromática con golpes en el beat',
    (w) => L.rgbSplit(w, vo({ src: IMG + 'np_3293_6s.jpg', pulses: [1.2, 1.7], push: .03 }, { angle: 90, amount: 6 * u, out: 2.2 })));

  /* ---- global looks (film time) ---- */
  let [a, b] = seg(2.8);
  K.scene({ id: 'g-grade', t0: a, t1: b, build(root, add) { const w = K.div(root, `left:0;top:0;width:${FW}px;height:${FH}px`); plate(w, add, 'np_3293_10s.jpg'); headline(w, add, 'Webs que cargan *rápido*'); label(w, 'grade (off → on @1.2 s)', 'contrast · saturate · warm · lift, filtro CSS sobre K.world'); } });
  L.grade(vo({ t0: a + 1.2, t1: b, contrast: 1.18, saturate: 1.3, warm: .55, lift: .07, fadeIn: .3 }, { target: 'backdrop', warm: -.6, hue: 10 }));
  [a, b] = seg(2.6);
  K.scene({ id: 'g-vig', t0: a, t1: b, build(root, add) { const w = K.div(root, `left:0;top:0;width:${FW}px;height:${FH}px`); plate(w, add, 'np_3292_10s.jpg'); headline(w, add, 'Rediseño con *Astro*'); label(w, 'vignette + scanlines', 'overlays globales (post), sin tocar la escena'); } });
  L.vignette({ t0: a, t1: b, amount: .7 }); L.scanlines({ t0: a, t1: b, opacity: .22 });
  [a, b] = seg(2.6);
  K.scene({ id: 'g-leak', t0: a, t1: b, build(root, add) { const w = K.div(root, `left:0;top:0;width:${FW}px;height:${FH}px`); plate(w, add, 'np_3294_10s.jpg'); headline(w, add, 'Lighthouse *81 → 94*'); label(w, 'lightLeak', 'manchas cálidas animadas en screen'); } });
  L.lightLeak(vo({ t0: a, t1: b, side: 'left', intensity: .8 }, { t0: undefined, t1: undefined, at: a + 1.3, dur: 1.6, side: 'tr' }));
  [a, b] = seg(2.6);
  K.scene({ id: 'g-box', t0: a, t1: b, build(root, add) { const w = K.div(root, `left:0;top:0;width:${FW}px;height:${FH}px`); plate(w, add, 'np_3295_6s.jpg'); headline(w, add, '¿Tu web es la *próxima?*', .45, P ? .44 : .42); label(w, 'letterbox', 'barras que entran y salen'); } });
  L.letterbox(vo({ at: a + .25, out: b - .55 }, { ratio: 1, edge: '#D6FF3D' }));
  [a, b] = seg(1.3); const burnAt = b;
  K.scene({ id: 'g-burn1', t0: a, t1: b, build(root, add) { const w = K.div(root, `left:0;top:0;width:${FW}px;height:${FH}px`); plate(w, add, 'np_3292_6s.jpg', .08); label(w, 'filmBurn (corte en el pico)', 'destello cálido que esconde el corte'); } });
  [a, b] = seg(1.5);
  K.scene({ id: 'g-burn2', t0: a, t1: b, build(root, add) { const w = K.div(root, `left:0;top:0;width:${FW}px;height:${FH}px`); plate(w, add, 'np_3295_2s.jpg', .05); headline(w, add, 'Escríbenos, *link en la bio*', .05); label(w, 'filmBurn (después)'); } });
  const burn = L.filmBurn(vo({ at: burnAt, dur: .7 }, { from: 'right', dur: .5 })); K.addCues(burn);

  const badge = L.cornerBadge(vo({ line1: 'NORTH PEARL', line2: 'KATANA', at: .2, counter: 'LOOKS / 16', outline: true, hits: [2.8, 5.6] }, { pos: 'bl', dy: 170, line1: 'ESCRÍBENOS', line2: 'LINK EN LA BIO', counter: null, out: 30, size: 44 }));
  K.addCues(badge);
  K.start({ format: fmt, fps: 30, dur: T });
})();
