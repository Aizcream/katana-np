/* np_3d — the 3D layer with North Pearl's brand: the "flood" device of the BodyTask reference (refs/analysis/bodytask,
   12.6–16.2 s: thousands of printed discs pour in, pile up and part around sticker words) in copper-orange, teal and cream.
   Real 3D (K.kit.scene3d, three.js), every frame a pure function of t. Render: ./katana render np_3d --final --mb 16 */
(function () {
  K.setFormat('16x9');
  const { E, p: P, lerp } = K, N = K.three, T = N.THREE, TAU = Math.PI * 2;
  const C = { FIELD: '#FF6225', POP: '#12B5A6', PAPER: '#F4EFE6', INK: '#10201F', DEEP: '#0E4B4D', MINT: '#8FDCD2', COPPER: '#C96A36' };
  const COPY = [
    { text: 'Tu web,', bg: C.INK, color: '#FFFFFF', h: 1.36, rot: -.05, at: 1.6 },
    { text: 'más rápida', bg: C.PAPER, color: C.INK, h: 1.36, rot: .04, at: 2.0 },
    { text: 'y más clara.', bg: C.POP, color: C.INK, h: 1.54, rot: -.022, at: 2.4 },
  ];
  const POP = '"Poppins", "Inter Tight", sans-serif';
  K.fonts.push('700 100px "Poppins"');                     // faces drawn on 3D canvases must be declared before K.start
  K.theme = { bg: '#EFE8DC' };
  K.lens = { bloom: .22, ca: .8, k: .015, grain: .012, vig: 0 };   // the reference shot has soft highlights and faint fringes; no vignette
  const PAL = [C.FIELD, C.POP, C.PAPER, C.INK, C.DEEP, C.MINT, C.COPPER, C.FIELD];

  K.scene({ id: 'flood', t0: 0, t1: 5, build(root, add) {
    const w = K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px;overflow:hidden`);
    K.div(w, 'inset:0;background:#EFE8DC');
    add(K.kit.scene3d(w, {
      env: 'studio', lights: { preset: 'top', key: { dir: [-.62, .78, .74], i: 2.7 }, env: .62 }, shadow: { area: 13, res: 4096, soft: .9 }, fov: 32,
      camera: [{ t: 0, pos: [-.5, -1.1, 18.2], look: [0, 0, 0], roll: -5 }, { t: 1.5, pos: [0, -.8, 15.6], look: [0, .05, 0], roll: -1.5 }, { t: 5, pos: [.55, -.4, 13.4], look: [0, .1, 0], roll: 1.2 }],
      build(ctx) {
        const floor = new T.Mesh(new T.PlaneGeometry(60, 60), N.mat.matte('#F1EBE0')); floor.receiveShadow = true; ctx.add(floor);
        const L = COPY.map((d) => Object.assign({}, d, { mesh: N.label(d.text, { h: d.h, font: POP, weight: 700, bg: d.bg, color: d.color, side: d.bg, radius: .24, depth: .12, rough: .55, glow: .1 }) }));
        const gap = .34, rowW = L[0].mesh.userData.w + gap + L[1].mesh.userData.w;
        L[0].x = -rowW / 2 + L[0].mesh.userData.w / 2 - .2; L[1].x = rowW / 2 - L[1].mesh.userData.w / 2 - .2; L[0].y = 1.02; L[1].y = 1.12; L[2].x = .3; L[2].y = -.74;
        L.forEach((d) => ctx.add(d.mesh));
        const pile = N.pile({ count: 2500, seed: 11, w: 27, h: 16, r: .45, thick: .21, pour: [.05, 1.3], fall: .62, height: 12, from: [.12, 1], throw: 7, spin: 4.6, margin: .36, band: 1.9,
          part: L.map((d) => ({ x: d.x, y: d.y, w: d.mesh.userData.w + .12, h: d.h + .12, r: .38, rot: d.rot, at: d.at - .1, dur: .55 })) });
        const SH = PAL.map((c) => Array.from({ length: pile.layers }, (_, l) => new T.Color(c).multiplyScalar(lerp(.5, 1, Math.pow((l + 1) / pile.layers, 1.4)))));
        const stroke = (fn) => (g, x, y, s) => { g.lineWidth = s * .2; g.lineCap = g.lineJoin = 'round'; g.beginPath(); fn(g, x, y, s); g.stroke(); };
        const glyphs = ['@', '#', '/', 'A+', '94', '100', 'SEO', '1s', 'ñ', '?',
          stroke((g, x, y, s) => { g.moveTo(x - s * .38, y + s * .02); g.lineTo(x - s * .1, y + s * .3); g.lineTo(x + s * .42, y - s * .3); }),                       // check
          stroke((g, x, y, s) => { g.moveTo(x - s * .4, y); g.lineTo(x + s * .4, y); g.moveTo(x + s * .08, y - s * .32); g.lineTo(x + s * .4, y); g.lineTo(x + s * .08, y + s * .32); }),   // arrow
          stroke((g, x, y, s) => { g.moveTo(x - s * .12, y - s * .32); g.lineTo(x - s * .42, y); g.lineTo(x - s * .12, y + s * .32); g.moveTo(x + s * .12, y - s * .32); g.lineTo(x + s * .42, y); g.lineTo(x + s * .12, y + s * .32); })];   // < >
        const n = glyphs.length, atlas = N.atlas([...glyphs.map((t) => ({ text: t, color: '#ffffff' })), ...glyphs.map((t) => ({ text: t, color: C.INK }))], { cell: 128, cols: 8, font: `700 1px ${POP}`, scale: .46 });
        const light = (c) => c === 2 || c === 5;                 // cream and mint discs take the dark print
        ctx.add(N.instances(N.disc(.45, .21, { bevel: .09, seg: 36 }), N.mat.gloss('#ffffff', { roughness: .26, clearcoatRoughness: .12 }), pile.count, (i, lt, m) => {
          pile(i, lt, m);
          const c = Math.floor(N.rnd(i, 40, 11) * PAL.length); m.color(SH[c][pile.layer(i)]).cell((light(c) ? n : 0) + Math.floor(N.rnd(i, 41, 11) * n));
        }, { atlas }));
        return { L };
      },
      frame(lt, ctx, s) {
        s.L.forEach((d, k) => {
          const q = K.pop(lt, d.at, .55), drop = E.soft(P(lt, d.at, d.at + .5)), m = d.mesh;
          m.visible = lt >= d.at; if (!m.visible) return;
          const bob = lt > d.at + .6 ? Math.sin((lt - d.at) * 2.3 + k) * .03 : 0;      // the words keep breathing through the hold
          m.position.set(d.x, d.y + (1 - drop) * .35 + bob, lerp(4.4, .62, drop));
          m.rotation.set((1 - drop) * -.5, (1 - drop) * (k % 2 ? -.4 : .4), d.rot + (1 - drop) * (k % 2 ? .22 : -.22) + bob * .3);
          m.scale.setScalar(.55 + .45 * q);
        });
      },
    }));
  } });
  K.start({ format: '16x9', fps: 30, dur: 5 });
})();
