/* type_demo.js — demo / test page of the kinetic-typography family (engine/kit/type.js). ?fmt=16x9 for landscape.
   One scene per component (some components get two scenes for their modes). North Pearl copy, Spanish accents. */
(function () {
  const Q = new URLSearchParams(location.search);
  const { E } = K;
  K.bpm = 120; K.beatOffset = 0;
  const IMG = 'assets/img/';
  const bgs = [];
  const label = (root, txt) => { const l = K.div(root, ''); l.className = 'demo-label'; l.textContent = txt; };
  // demo scene helper: build(w) returns component list; scene local time
  const S = (id, t0, t1, bg, name, build) => {
    bgs.push([t0, bg]);
    K.scene({ id, t0, t1, build(root, add) { const w = K.div(root, 'inset:0'); label(w, name); for (const c of [].concat(build(w))) { add(c); K.addCues(c, t0); } } });
  };
  const OFF = '#F2F2EF', INK = '#111214', BLUE = '#2B4BFF', LIME = '#D6FF3D', RED = '#FF4D2E';

  // 1 · words — grow layout, pop, serif emphasis (Katana "Stick it" → "Stick it on" → "Stick it on everything.")
  S('words-grow', 0, 3, OFF, 'words · pop · grow', (w) => K.kit.words(w, { text: 'Webs que cargan *rápido.*', at: .2, layout: 'grow', out: 2.45 }));
  // 2 · words — inline image tile + pill, box emphasis, scatter exit; grow + times: the tile arrives after "web," and
  //     pushes it aside (r2 "So [tile] much")
  S('words-img', 3, 6, OFF, 'words · [img] push · {box}', (w) => K.kit.words(w, {
    text: `Tu [img:${IMG}np_3292_2s.jpg] web,\nrediseñada [img:${IMG}np_3294_6s.jpg|con Astro]\n{box}desde cero.{/}`, layout: 'grow',
    times: [.15, .62, .37, .86, 1.08, 1.34, 1.5], exit: 'scatter', out: 2.4,
  }));
  // 3 · words — glyph-mask rise, left aligned paragraph on a colour block, wipe exit
  S('words-rise', 6, 9, BLUE, 'words · rise · wipe', (w) => K.kit.words(w, {
    text: 'Rediseño completo:\nmás rápido,\nmejor *SEO.*', at: .15, enter: 'rise', align: 'left', color: '#fff', step: .16, exit: 'wipe', out: 2.3, size: K.H > K.W ? 132 : 150,
  }));
  // 4 · words — type (letters) + blur + drop + slide variants
  S('words-type', 9, 12, INK, 'words · type / blur / drop / slide', (w) => [
    K.kit.words(w, { text: '¿Tu web es *la próxima?*', at: .1, enter: 'type', color: '#fff', y: K.H * (K.H > K.W ? .3 : .26), size: K.H > K.W ? 104 : 110, typeColor: LIME }),
    K.kit.words(w, { text: 'Escríbenos.', at: 1.15, enter: 'blur', color: LIME, y: K.H * (K.H > K.W ? .45 : .48), size: K.H > K.W ? 150 : 140, exit: 'blur', out: 2.5 }),
    K.kit.words(w, { text: 'link en la bio', at: 1.5, enter: 'drop', step: .12, color: '#fff', y: K.H * (K.H > K.W ? .58 : .68), size: 84, font: 'display' }),
    K.kit.words(w, { text: '{mono}north-pearl.co{/}', at: 1.9, enter: 'slide', color: 'rgba(255,255,255,.7)', y: K.H * (K.H > K.W ? .66 : .82), size: 54 }),
  ]);
  // 5 · headline — fill + impact shake / stroke + fill wipe / stretch
  S('headline-fill', 12, 13.2, OFF, 'headline · fill · shake', (w) => K.kit.headline(w, { text: 'RÁPIDO', at: .1, shake: true }));
  S('headline-stroke', 13.2, 14.4, INK, 'headline · stroke · fillAt', (w) => K.kit.headline(w, { text: 'SEO', at: .05, mode: 'stroke', color: LIME, fillAt: .45, exit: 'zoom', out: .95 }));
  S('headline-stretch', 14.4, 16, LIME, 'headline · stretch', (w) => K.kit.headline(w, { text: 'ASTRO', at: .1, mode: 'stretch', color: INK }));
  // 6 · ghost — giant outlined rows behind a line
  S('ghost', 16, 19, LIME, 'ghost · rows + words', (w) => [
    K.kit.ghost(w, { text: 'SEO ✦', rows: 5, font: 'wide', at: 0, drift: 40, opacity: .3, size: K.H > K.W ? 300 : 240 }),
    K.kit.words(w, { text: 'Mejor *posicionamiento*\nen Google.', at: .3, step: .2, size: K.H > K.W ? 118 : 120 }),
  ]);
  // 7 · morph — "Web lenta." → "Web rápida." through serif / italic / mono faces
  S('morph', 19, 22.5, OFF, 'morph · A → B', (w) => [
    K.kit.ghost(w, { text: 'lenta', at: 0, opacity: .12, drift: 30 }),
    K.kit.morph(w, { from: 'Web lenta.', to: 'Web rápida.', at: .15, morphAt: 1.25, morphDur: .55 }),
    K.kit.morph(w, { from: 'Antes', to: 'Después', at: .15, morphAt: 1.6, morphDur: .5, size: K.H > K.W ? 70 : 64, font: 'mono', y: K.H * (K.H > K.W ? .57 : .66), color: BLUE, weight: 500, tracking: -.02 }),
  ]);
  // 8 · letterSwap — the o of "Cargando" is a spinning ring with circular text; zoom through the hole into the next scene
  S('letterswap', 22.5, 25.4, OFF, 'letterSwap · ring · zoom-through', (w) => K.kit.letterSwap(w, { text: 'Cargando', at: .15, ringText: 'CARGANDO · CARGANDO · CARGANDO · ', zoomAt: 2.3, zoomDur: .6, reveal: BLUE }));
  // 9 · typeOn — wordmark build + caret typing with delete exit
  S('typeon', 25.4, 29, BLUE, 'typeOn · pop / type', (w) => [
    K.kit.typeOn(w, { text: 'NORTH PEARL', at: .15, cps: 9, color: '#fff' }),
    K.kit.typeOn(w, { text: 'webs que cargan rápido', mode: 'type', at: 1.35, cadence: 1.1, color: '#fff', caretColor: LIME, y: K.H * (K.H > K.W ? .54 : .7), out: 2.85, deleteCps: 40 }),
  ]);
  // 10 · stickerWords — stacked boxed words stamp in
  S('stickers', 29, 32, OFF, 'stickerWords', (w) => K.kit.stickerWords(w, { lines: ['Webs', 'que', 'venden'], at: .2, out: 2.5 }));
  // 11 · captions — three styles over footage
  const TR = [['Tu', 0], ['web', .22], ['carga', .44], ['en', .8], ['menos', .95], ['de', 1.25], ['un', 1.37], ['segundo,', 1.5], ['y', 2.0], ['Google', 2.12], ['lo', 2.5], ['nota.', 2.62]]
    .map(([text, start], i, a) => ({ text, start, end: (a[i + 1] ? a[i + 1][1] : start + .5) - .02 }));
  S('captions', 32, 36, INK, 'captions · karaoke / pop / bold', (w) => {
    K.img(w, IMG + 'np_3293_6s.jpg', 'left:0;top:0;width:100%;height:100%;object-fit:cover;filter:brightness(.55) saturate(.8)');
    const tall = K.H > K.W;
    return [
      K.kit.captions(w, { words: TR, at: .2, style: 'karaoke', y: K.H * (tall ? .3 : .22) }),
      K.kit.captions(w, { words: TR, at: .2, style: 'pop', y: K.H * (tall ? .46 : .48) }),
      K.kit.captions(w, { words: TR, at: .2, style: 'bold', y: K.H * (tall ? .62 : .76) }),
    ];
  });
  // 12 · counter — 81 → 94 odometer + thousands separator (Spanish '.')
  S('counter', 36, 39.5, OFF, 'counter · odometer', (w) => {
    const tall = K.H > K.W;
    return [
      K.kit.words(w, { text: 'Rendimiento', at: .1, size: 70, y: K.H * (tall ? .33 : .25), color: 'var(--k-muted)', font: 'display' }),
      K.kit.counter(w, { from: 81, to: 94, at: .2, delay: .35, dur: 1.3, landColor: BLUE }),
      K.kit.counter(w, { from: 0, to: 12500, at: .6, delay: .2, dur: 1.6, prefix: '+', suffix: ' visitas', suffixScale: .42, sep: '.', size: tall ? 120 : 110, y: K.H * (tall ? .62 : .75), ease: 'soft' }),
    ];
  });
  // 13 · sliced — slices lock together, then fly out
  S('sliced', 39.5, 42, RED, 'sliced', (w) => [
    K.kit.sliced(w, { text: 'LISTO.', at: .15, color: '#fff', out: 1.85 }),
  ]);

  // 14 · words — scatter entrance (letters fly in rotated, r2 "watch."), accent class, drop exit
  S('words-scatter', 42, 44.5, INK, 'words · scatter · {accent}', (w) => K.kit.words(w, {
    text: 'Más {accent2}tráfico{/}\n*desde Google.*', at: .15, enter: 'scatter', step: .3, color: '#fff', exit: 'drop', out: 1.9,
  }));

  // 15 · option coverage: image slot (logo symbol cropped by css), {stroke} class + em array + beats, decimal counter
  S('misc', 44.5, 47.5, INK, 'letterSwap img · {stroke} · beats · decimals', (w) => {
    const tall = K.H > K.W;
    return [
      K.kit.letterSwap(w, { text: 'NORTH', color: '#fff', slot: { img: IMG + 'np_logo_vertical.png', fit: 'fill', radius: 0, crop: [.2094, 0, .5882, .5225] }, slotSize: .84, at: .1, y: K.H * (tall ? .3 : .25), size: tall ? 190 : 170 }),
      K.kit.words(w, { text: '{stroke}TRÁFICO{/} *orgánico*', em: ['serif', 'accent2'], at: .5, beats: [0, 1], color: '#fff', y: K.H * (tall ? .47 : .52), size: tall ? 130 : 140 }),
      K.kit.words(w, { text: 'carga en', at: 1.0, size: 64, color: 'rgba(255,255,255,.6)', y: K.H * (tall ? .6 : .72) }),
      K.kit.counter(w, { from: 4.2, to: .8, decimals: 1, dec: ',', suffix: 's', suffixScale: .6, at: 1.1, delay: .1, dur: 1.1, size: tall ? 200 : 170, color: '#fff', landColor: LIME, y: K.H * (tall ? .7 : .85) }),
    ];
  });

  K.BG = bgs;
  K.start({ format: Q.get('fmt') || '9x16', fps: 30, dur: 47.5 });
})();
