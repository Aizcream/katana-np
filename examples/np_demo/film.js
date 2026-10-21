/* np_demo — "Tu web tarda demasiado" · North Pearl × preset app-launch-dusk (refs/r2, top half).
   9:16 · 30 fps · 20 s · 120 BPM (beat = .5 s, 8th = .25 s). Off-white #F2F1EE + ONE accent (North Pearl orange #FF6225).
   Scenes: hook 0–2 · wall 2–4.5 · pide 4.5–7.5 · rediseño 7.5–9 · astro 9–10.5 · números 10.5–13.5 ·
   tres palabras 13.5–15 · cierre 15–20.
   Rhythm pass (v3): every cut and every word hit sits on the 8th-note grid (multiples of .25 s); cuts carry motion across
   (no frozen frames at 4.5), every scene has a live camera, the incoming scene always has content at the cut. */
(function () {
  const { E, beat } = K;
  K.bpm = 120; K.beatOffset = 0;
  const BG = '#F2F1EE', INK = '#111214', OR = '#FF6225';
  K.theme = { bg: BG, fg: INK, muted: '#8A8C90', accent: OR, accent2: OR, accent3: OR };
  K.BG = BG;
  const A = '../assets/', WEB = A + 'web/', IMG = A + 'img/', CL = A + 'clips/';
  const T = K.kit._type;

  // every scene paints its own full-frame off-white plate (transitions overlap scenes)
  const plate = (root, extra = '') => K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px;background:${BG};overflow:hidden;${extra}`);
  // a wrapper we can move as a "camera null" (centre origin math via K.about)
  const nul = (parent, z) => K.div(parent, `left:0;top:0;width:${K.W}px;height:${K.H}px;transform-origin:0 0${z != null ? ';z-index:' + z : ''}`);
  const cues = (c, t0) => { K.addCues(c, t0); return c; };
  // register a component's suggested SFX minus the kinds listed in `drop` (doubles with a transition / another cue)
  const cuesBut = (c, t0, drop) => { c.cues().forEach((q) => { if (!drop.includes(q.kind)) K.cue(q.kind, t0 + q.t, { gain: q.gain }); }); return c; };

  /* ============================================================ 1 · HOOK 0–2.0 */
  // 8ths: Tu 0 · web .25 · [tile] .5 · tarda .75 · demasiado. 1.0 · morph 1.25 · ring 1.5 · zoom-through cut 2.0
  const S1 = { t0: 0, t1: 2.0 };
  const R1 = {};
  K.scene({ id: 'hook', t0: S1.t0, t1: S1.t1, build(root, add) {
    const w = plate(root), cam = nul(w);
    R1.cam = cam;
    add(K.kit.ghost(cam, { text: 'LENTO', at: 0, opacity: .1, drift: 30, y: 860 }));
    const dof = K.div(cam, `left:0;top:0;width:${K.W}px;height:${K.H}px;filter:blur(3px)`);
    add(K.kit.photo(dof, { src: WEB + 'tile_p06.jpg', w: 250, h: 360, x: 985, y: 330, radius: 22, shadow: 1, rot: 13, at: .25, enter: 'rise', drift: [-16, 12], from: { s: 1.1 }, to: { s: 1 }, dur: 2 }));
    add(K.kit.photo(dof, { src: WEB + 'tile_p13.jpg', w: 230, h: 330, x: 95, y: 1400, radius: 22, shadow: 1, rot: -11, at: .5, enter: 'rise', drift: [14, -14], from: { s: 1.1 }, to: { s: 1 }, dur: 2 }));
    cues(add(K.kit.words(cam, { text: `Tu [img:${WEB}tile_p01.jpg] web\ntarda`, layout: 'grow', size: 172, y: 742,
      times: [0, .5, .25, .75] })), S1.t0);
    cues(add(K.kit.words(cam, { text: '*demasiado.*', at: 1.0, size: 150, y: 992, out: 1.25, exit: 'cut' })), S1.t0);
    // measure "cargando" so the ring word picks up exactly where the morph lands (left edges match)
    const SZ = 168, css = T.faceCss('display', { weight: 900, tracking: -.045 });
    const pr = K.el('span', `${css};font-size:${SZ}px;position:absolute;white-space:pre;visibility:hidden`, cam, 'cargando');
    const wc = pr.offsetWidth; pr.remove();
    // the morph is already ~25 % in when it becomes visible (hides the serif → display jump inside the scramble)
    add(K.kit.morph(cam, { from: 'demasiado.', to: 'cargando', at: 1.25, enter: 'none', morphAt: 1.17, morphDur: .33,
      size: SZ, weight: 900, tracking: -.045, x: 540 - 22, y: 992, out: 1.5, exit: 'cut', cue: false }));
    K.cue('glitch', 1.25, { gain: .35 });
    const ls = add(K.kit.letterSwap(cam, { text: 'cargando', at: 1.5, enter: 'none', slotDelay: 0, size: SZ, align: 'left',
      x: Math.round((K.W - wc) / 2) - 22, y: 992, ringText: 'CARGANDO • CARGANDO • CARGANDO • ', ringColor: OR }));
    cuesBut(ls, S1.t0, ['pop']);                                   // only the popxl of the ring landing (no doubled pop)
    R1.ls = ls;
    // the one stat of the hook: an ink tag big enough to read on a phone (was a 30 px hairline box)
    cues(add(K.kit.label(cam, { at: 1.0, y: 1185, text: '{n} s DE CARGA', upper: false, size: 46, style: 'tag', decode: .3,
      count: { from: 0, to: 4.8, decimals: 1, dur: .5 } })), S1.t0);
  }, update(lt) {
    // slow push-in (the camera never stops)
    const s = K.zoom(lt, 0, 1.7, 1, 1.035, E.lin);
    R1.cam.style.transform = K.about(540, 900, s);
  } });

  /* ============================================================ 2 · SE VAN 2.0–4.5 */
  const S2 = { t0: 2.0, t1: 4.5 };
  const TILES = ['p01', 'p05', 'p02', 'p13', 'p06', 'p14', 'p03', 'p17', 'p04', 'p19', 'p08', 'p20', 'p09', 'p16', 'p12', 'p21', 'p15', 'p07', 'p18', 'p22', 'p23']
    .map((n) => WEB + 'tile_' + n + '.jpg').concat([IMG + 'np_3294_6s.jpg', IMG + 'np_3292_2s.jpg', WEB + 'northpearl_mobile.png']);
  // "¿Sigues esperando?" is ONE object carried over the 4.5 cut: it rides up on a single eased move whose speed peak
  // sits on the cut (both scenes evaluate the same function of film time → no frozen frames, no jump).
  const QRIDE = [4.2, 4.85];
  const qRide = (T) => Math.round(-250 * E.inOut(2.2)(K.p(T, QRIDE[0], QRIDE[1])));
  const R2 = {};
  K.scene({ id: 'wall', t0: S2.t0, t1: S2.t1, build(root, add) {
    const w = plate(root);
    const cw = Math.round(K.W * .27), ch = Math.round(cw * 1.45), gap = Math.round(cw * .1), px = cw + gap, py = ch + gap;
    // camera: needle dolly arrival → one long glide that keeps accelerating into the wash (no mid-scene stop)
    const wall = add(K.kit.cardWall(w, { items: TILES, card: [cw, ch], gap, rows: 7, cols: 16, tilt: { rx: 4, ry: 40, rz: -3 },
      cam: [[0, [-3.4 * px, .25 * py, -1500]], [.62, [-2.0 * px, 0, 0], E.soft], [2.5, [2.4 * px, -.2 * py, -900], E.in(1.7)]],
      highlight: [[1.0, 'center', .9]], ring: OR, depthBlur: 14, maxBlur: 16 }));
    cuesBut(wall, S2.t0, ['whoosh']);                              // the zoom-through already whooshes into the wall
    // the wall recedes into a bright blur at the end (it is background: the type carries the cut)
    R2.wash = K.div(w, `left:0;top:0;width:${K.W}px;height:${K.H}px;background:${BG};opacity:0;z-index:5`);
    cues(add(K.kit.cursor(w, { shape: 'hand', path: [[.3, 900, 1380], [1.2, 600, 1230], [1.7, 420, 1290]], clicks: [1.25], out: 1.75, z: 20 })), S2.t0);
    // "y se van." stamps 3× on the beats, each in a new place
    const spots = [[.5, 380, 620, 'left'], [1.0, 700, 1010, 'right'], [1.5, 540, 780, 'center']];
    spots.forEach(([at, x, y, align]) => { add(K.kit.words(w, { text: 'y se *van.*', at, size: 172, x: align === 'left' ? 110 : align === 'right' ? 930 : 520,
      y, align, color: '#fff', shadow: '0 .03em .35em rgba(0,0,0,.55)', step: .03, enterDur: .18, out: at + .5, exit: 'cut', z: 12, cue: false })); K.cue('popxl', S2.t0 + at, { gain: .9 }); });
    // ticker under the wash (it washes out with the wall instead of vanishing on the cut)
    cues(add(K.kit.ticker(w, { at: .25, y: 1430, text: ['TUS CLIENTES SE VAN'], bg: INK, color: '#fff', sepColor: OR, size: 42, speed: 240, z: 4 })), S2.t0);
    R2.q = nul(w, 12);
    cues(add(K.kit.words(R2.q, { text: '¿Sigues *esperando?*', at: 2.0, size: 120, y: 780, step: .25 })), S2.t0);
  }, update(lt) {
    const q = E.inOut(2)(K.p(lt, 1.7, 2.47));
    R2.wash.style.opacity = q.toFixed(3);
    const y = qRide(S2.t0 + lt);
    R2.q.style.transform = y ? `translate(0px,${y}px)` : '';
  } });
  K.trans.zoomThrough({ at: S2.t0, a: 'hook', b: 'wall', target: () => R1.ls.slot, scale: 46, from: .32, blur: 0, sfx: true });
  // radial zoom blur on the hook ONLY (the kit's blur on B renders the 3D wall blank in sequential capture)
  const zbA = K.trans.util.zoomBlur(), ZB = .62 * .48, lnZ = Math.log(46);
  K.transition({ type: 'ringBlur', at: S2.t0, a: 'hook', b: null, before: ZB, after: .001, apply(t, { A, lt }) {
    if (!A || lt >= 0) return;
    const [x, y] = K.trans.util.pivot({ target: R1.ls.slot }), u = (lt + ZB) / ZB, v = lnZ * 3 * u * u / ZB;
    A.style.filter = zbA(x, y, Math.min(.7, Math.expm1(v * .5 / K.fps) * .9));
  } });

  /* ============================================================ 3 · PIDE 4.5–7.5 */
  // 8ths: bar 4.75 · typing 5.25–6.0 · submit 6.0 · chips 6.25 / 6.375 / 6.5 / 6.625 (16ths) · button 6.75 · click 7.25 · cut 7.5
  const S3 = { t0: 4.5, t1: 7.5 };
  const R3 = {};
  K.scene({ id: 'pide', t0: S3.t0, t1: S3.t1, build(root, add) {
    const w = plate(root), cam = nul(w);
    R3.cam = cam;
    // (no ghost word here: its outline crossed the bar, the chips and their connector lines)
    // the question carried over the cut (same words, same timing as the wall copy → identical frame on the cut)
    R3.q = nul(cam);
    add(K.kit.words(R3.q, { text: '¿Sigues *esperando?*', at: -.5, size: 120, y: 780, step: .25, out: 1.5, exit: 'up', cue: false }));
    // the r2 push-in while typing: the bar grows ×1.6 (small → big), then keeps creeping while the chips spawn
    const sb = add(K.kit.searchBar(cam, { at: .25, x: 515, y: 960, w: 760, h: 136, s: [[.5, .7], [1.5, 1.0], [2.75, 1.13]], rz: [[.5, -1.5], [2.0, 0]],
      placeholder: '¿Qué necesita tu web?', text: 'una web que venda más', typeAt: .75, cps: 30, submitAt: 1.5,
      chipsAt: 1.55, chipStagger: .125, chipLabel: 'IDEA', clear: false,
      chips: [{ text: 'Astro', icon: 'dot', dx: -225 }, { text: 'SEO', icon: 'dot', dx: -235 }, { text: 'a medida', icon: 'dot', dx: 175 }, { text: 'carga en 1 s', icon: 'dot', dx: 150 }] }));
    cues(sb, S3.t0);
    R3.sb = sb;
    const bt = add(K.kit.button(cam, { at: 2.25, x: 515, y: 1370, text: 'Rediseñar', icon: 'sparkle', style: 'accent', size: 58, pressAt: [2.75] }));
    cues(bt, S3.t0);
    R3.bt = bt;
    const [bx, by] = bt.iconAt(2.75);
    add(K.kit.cursor(cam, { shape: 'hand', path: [[2.05, 930, 1620], [2.62, bx + 6, by + 10]], clicks: [2.75], z: 30, cue: false }));
  }, update(lt) {
    const y = qRide(S3.t0 + lt);
    R3.q.style.transform = y ? `translate(0px,${y}px)` : '';
    // live camera: slow push + drift up while the bar types (no dead frames during the typing)
    R3.cam.style.transform = K.about(540, 960, K.zoom(lt, 0, 3, 1, 1.03, E.lin), 0, Math.round(-22 * lt));
  } });

  /* ============================================================ 4 · REDISEÑO 7.5–9.0 */
  // 8ths: Un 7.5 (inside the emerging card) · rediseño. 7.75 · laptop lands 8.25 · whip 9.0
  const S4 = { t0: 7.5, t1: 9.0 };
  const R4 = {};
  K.scene({ id: 'rediseno', t0: S4.t0, t1: S4.t1, build(root, add) {
    const w = plate(root), cam = nul(w);
    R4.cam = cam;
    add(K.kit.ghost(cam, { text: 'NUEVA', at: 0, opacity: .08, drift: 34, y: 1150 }));
    cues(add(K.kit.words(cam, { text: 'Un *rediseño.*', at: 0, size: 160, y: 520, layout: 'grow', step: .25 })), S4.t0);
    // stamp lands at 62 % of .42 s → at .49 lands on 8.25
    cues(add(K.kit.cutout(cam, { src: IMG + 'np_laptop_cutout.png', w: 720, x: 560, y: 1150, at: .49, rot: -5, outline: 14, res: 1.5 })), S4.t0);
  }, update(lt) {
    // push-in + upward drift that accelerates into the whip-up (direction preserved across the cut)
    const dy = -110 * E.in(2.2)(K.p(lt, .75, 1.5));
    R4.cam.style.transform = K.about(540, 960, K.zoom(lt, 0, 1.5, 1, 1.07, E.lin), 0, Math.round(dy));
  } });
  K.trans.zoomThrough({ at: S4.t0, a: 'pide', b: 'rediseno', target: () => R3.bt.el, scale: 9, from: .34, sfx: true });

  /* ============================================================ 5 · ASTRO 9.0–10.5 */
  // 8ths: Hecha 9.25 · con 9.5 · Astro. 9.75 · the camera pulls back all along (flows into the zoom-out)
  const S5 = { t0: 9.0, t1: 10.5 };
  const R5 = {};
  K.scene({ id: 'astro', t0: S5.t0, t1: S5.t1, build(root, add) {
    const w = plate(root), cam = nul(w);
    R5.cam = cam;
    const br = add(K.kit.browser(cam, { at: 0, enter: 'none', y: 1150, w: 900, h: 1150, src: WEB + 'northpearl_full.png', url: 'northpearl.co',
      load: [0, .25], scroll: [[.5, 0], [1.35, .2]], rx: 3 }));
    cuesBut(br, S5.t0, ['whoosh']);                                // the whip already whooshes on the cut
    R5.br = br;
    cues(add(K.kit.words(cam, { text: 'Hecha con *Astro.*', at: .25, size: 140, y: 380, step: .25 })), S5.t0);
  }, update(lt) {
    R5.cam.style.transform = K.about(540, 1100, K.zoom(lt, 0, 1.5, 1.05, 1, E.lin));
  } });
  K.trans.whip({ at: S5.t0, a: 'rediseno', b: 'astro', dir: 'up', sfx: true });

  /* ============================================================ 6 · NÚMEROS 10.5–13.5 */
  // the gauges are already there when the zoom-out lands (B pulls back from the Rendimiento gauge, not from a blank plate)
  // 8ths: Los 10.75 · números 11.0 · no 11.25 · mienten. 11.5 · count 11.6 → all land 12.5 (hit + punch) · push into the slice 13.5
  const S6 = { t0: 10.5, t1: 13.5 };
  const R6 = {};
  const LH = { y: 1140 };   // (labels stay at the auto 30 px: at 34 'Prácticas recomendadas' wraps to two lines)
  K.scene({ id: 'numeros', t0: S6.t0, t1: S6.t1, build(root, add) {
    const w = nul(plate(root));
    R6.cam = w;
    add(K.kit.ghost(w, { text: '100', at: 0, opacity: .07, drift: 22, y: 1150 }));
    cues(add(K.kit.words(w, { text: 'Los números\n*no mienten.*', at: .25, size: 136, x: 520, y: 480, layout: 'grow', step: .25 })), S6.t0);
    const lh = add(K.kit.lighthouse(w, { at: -.7, y: LH.y, stagger: .06, dur: .9, countAt: 1.1, countStagger: 0,
      scores: [94, 100, 96, 100], from: [81, 87, 92, 100], title: 'LIGHTHOUSE · ANTES → DESPUÉS' }));
    // SFX: one ding (both crossings happen together), riser ENDS on the landing, hit on the landing
    const dings = lh.cues().filter((q) => q.kind === 'ding');
    if (dings.length) K.cue('ding', S6.t0 + dings[0].t, { gain: .7 });
    K.cue('riser', 12.5, { gain: .4 });
    K.cue('hit', 12.5, { gain: .6 });
  }, update(lt) {
    // slow push, then the camera accelerates into the slice cut (speed peak on the cut)
    const s = lt < 2.0 ? K.zoom(lt, 0, 2.0, 1, 1.04, E.lin) : K.zoom(lt, 2.0, 3.0, 1.04, 1.17, E.in(2.2));
    R6.cam.style.transform = K.about(540, LH.y, s);
  } });
  // pivot = the Rendimiento gauge (top-left): the site shrinks INTO its score
  K.trans.zoomOut({ at: S6.t0, a: 'astro', b: 'numeros', x: 354, y: 962, scale: 6, sfx: true });
  K.trans.punch({ at: 12.5, b: 'numeros', scale: 1.035, shake: .006, rot: .4, after: .45, cue: false });

  /* ============================================================ 7 · TRES PALABRAS 13.5–15.0 */
  const W3 = [
    { id: 'w1', t0: 13.5, text: 'rápida.', font: 'display', media: { clip: CL + 'c3294', in: .4 }, rot: -4 },
    { id: 'w2', t0: 14.0, text: '{roman}bonita.{/}', media: { src: WEB + 'tile_p06.jpg' }, rot: 3 },
    { id: 'w3', t0: 14.5, text: '*tuya.*', media: { clip: CL + 'c3293', in: 1.2 }, rot: -2, color: OR },
  ];
  W3.forEach((d) => K.scene({ id: d.id, t0: d.t0, t1: d.t0 + .5, build(root, add) {
    const w = plate(root);
    const m = d.media.clip
      ? K.kit.clip(w, { clip: d.media.clip, in: d.media.in, w: 520, h: 640, y: 1160, radius: 34, shadow: 1, rot: d.rot, enter: 'pop', enterDur: .35, push: 0 })
      : K.kit.photo(w, { src: d.media.src, w: 520, h: 640, y: 1160, radius: 34, shadow: 1, rot: d.rot, enter: 'pop', enterDur: .35, from: { s: 1.15 }, to: { s: 1.02 }, dur: .6 });
    add(m);
    cues(add(K.kit.words(w, { text: d.text, at: 0, size: 230, y: 640, enterDur: .2, color: d.color || INK, cueGain: .8 })), d.t0);
  } }));
  const sl = (at, a, b) => K.trans.slice({ at, a, b, n: 4, dir: 'v', from: 'alt', strip: .2, stagger: .02, color: OR, sfx: true });
  sl(13.5, 'numeros', 'w1'); sl(14.0, 'w1', 'w2'); sl(14.5, 'w2', 'w3');

  /* ============================================================ 8 · CIERRE 15.0–20.0 */
  // 8ths: Deja de 15.0 (out of the smear) · esperar. 15.25 · morphs 16.0 / 16.25 · tagline glides 16.75–17.3 ·
  // logo lands 17.5 (hit + sting + punch) · button 17.75 · link + ticker 18.0 · hold to 20.0
  const S8 = { t0: 15.0, t1: 20.0 };
  const R8 = {};
  K.scene({ id: 'cierre', t0: S8.t0, t1: S8.t1, build(root, add) {
    const w = nul(plate(root));
    R8.cam = w;
    // tagline group (morphs + viewfinder brackets) → shrinks under the logo at the lockup
    const g = K.div(w, `left:0;top:0;width:${K.W}px;height:${K.H}px;transform-origin:0 0`);
    R8.g = g;
    cues(add(K.kit.morph(g, { from: 'Deja de', to: 'Empieza a', at: 0, morphAt: 1.0, morphDur: .5, size: 150, weight: 900, tracking: -.045, y: 700 })), S8.t0);
    cues(add(K.kit.morph(g, { from: 'esperar.', to: 'crecer.', at: .25, morphAt: 1.25, morphDur: .5, font: 'serif', size: 190, weight: 400, tracking: -.01, y: 860, seed: 4 })), S8.t0);
    // viewfinder brackets
    const BX = [150, 930], BY = [560, 990], L = 70, TH = 7;
    R8.br = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([i, j]) => {
      const c = K.div(g, `left:${BX[i] - (i ? L : 0)}px;top:${BY[j] - (j ? L : 0)}px;width:${L}px;height:${L}px;` +
        `border-${j ? 'bottom' : 'top'}:${TH}px solid ${INK};border-${i ? 'right' : 'left'}:${TH}px solid ${INK};transform-origin:${i ? '100%' : '0'} ${j ? '100%' : '0'}`);
      return { c, i, j };
    });
    // lockup — ONE mark: the vertical logo (symbol over NORTH / PEARL) is the hero. The orange ring badge that sat on
    // top of the horizontal wordmark is gone: two brand marks plus a spinning "loader" on the end card after
    // "Deja de esperar." read as clutter. Stack: logo 335–785 · tagline ~870–1030 · CTA 1110–1240 · link 1302 · ticker 1420.
    // stamp lands at 62 % of .42 s → at 2.24 lands on 17.5 (its pop is replaced by hit + sting below)
    cuesBut(add(K.kit.cutout(w, { src: IMG + 'np_logo_vertical_dark.png', w: 400, x: 540, y: 560, at: 2.24, rot: 0, outline: 0, shadow: false, shine: false, float: 0, from: 1.25, spin: 0, res: 1.5 })), S8.t0, ['pop']);
    // CTA: the verb is the button (big, one word), "link en la bio" is its caption
    cues(add(K.kit.button(w, { at: 2.75, y: 1175, text: 'Escríbenos', icon: 'arrow', style: 'accent', size: 66, shineEvery: 1.4 })), S8.t0);
    cues(add(K.kit.label(w, { at: 3.0, y: 1302, text: 'LINK EN LA BIO', style: 'dot', size: 44, decode: .3 })), S8.t0);
    cues(add(K.kit.ticker(w, { at: 3.0, y: 1420, text: ['WEBS QUE CARGAN RÁPIDO', 'SEO', 'ASTRO'], bg: INK, color: '#fff', sepColor: OR, size: 36, speed: 170 })), S8.t0);
  }, update(lt) {
    // brackets snap in with "Deja", hunt focus, then open out as the lockup forms
    const qi = K.pop(lt, 0, .5), qo = E.in(2)(K.p(lt, 1.85, 2.2));
    R8.br.forEach(({ c, i, j }) => {
      const br = 9 * Math.sin(Math.max(0, lt - .4) * 2 * Math.PI * 1.0) * (1 - qo);   // viewfinder 'hunting' focus (1 Hz = every 2 beats)
      const dx = (i ? 1 : -1) * (24 * (1 - qi) + 60 * qo + br), dy = (j ? 1 : -1) * (24 * (1 - qi) + 60 * qo + br);
      c.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${Math.max(0, qi * (1 - qo)).toFixed(4)})`;
    });
    // tagline: slow push while it is read, then glides down and shrinks under the logo (done before the logo's stamp
    // reaches it: 16.75–17.3, the logo slams in 17.24–17.5 above it)
    const q = E.smooth(K.p(lt, 1.75, 2.3));
    const sp = K.zoom(Math.min(lt, 1.75), 0, 1.75, 1, 1.055, E.lin);
    const s = K.lerp(sp, .58, q), ty = K.lerp(0, 955 - 780, q);
    R8.g.style.transform = K.about(540, 780, s, 0, ty);
    R8.cam.style.transform = K.about(540, 900, K.zoom(lt, 0, 5, 1.0, 1.08, E.lin));
  } });
  K.trans.smear({ at: S8.t0, a: 'w3', b: 'cierre', sfx: true });
  K.cue('riser', S8.t0, { gain: .8 });                              // riser ENDS on the 15.0 drop (mix places it)
  K.trans.punch({ at: S8.t0 + 2.5, b: 'cierre', scale: 1.05, shake: .01, rot: .6, after: .5, cue: false });
  K.cue('hit', S8.t0 + 2.5, { gain: .9 });
  K.cue('sting', S8.t0 + 2.5, { gain: .8 });

  K.looks.vignette({ amount: .14, size: .58 });
  K.music = { synth: 'beat', sections: [[0, 'intro'], [2.0, 'drop'], [13.5, 'break'], [15.0, 'drop']] };
  K.start({ format: '9x16', fps: 30, dur: 20 });
})();
