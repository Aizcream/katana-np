/* scene3d_demo.js — demo of the SCENE3D family (engine/kit/scene3d.js): real 3D with three.js, 16:9, 12 s.
   a · flood    2,500 glossy discs pour in, pile up and part around three sticker labels
   b · hardware a cobalt device with an orange dial and an LED panel hangs from two cables next to a chrome mast
   c · orbit    a ring of UI cards orbits a particle heart; one card comes forward, a DOM sticker is pinned to it
   ./katana gallery engine/demos/scene3d.html 0.5,1.5,…   ·   ?play=1 realtime   ·   ?fmt=9x16 vertical   ·   ?set=b QA scenes
   Invented brands only ("Tarareo", "Pulso"). */
(function () {
  const Q = new URLSearchParams(location.search);
  const { E, p: P, lerp, clamp } = K, N = K.three, T = N.THREE, TAU = Math.PI * 2;
  K.setFormat(Q.get('fmt') || '16x9');
  K.fonts.push('700 100px "Poppins"', '600 100px "Poppins"', '500 100px "Poppins"', '500 100px "Geist Mono"');   // faces used on 3D canvases: declared so they are measured at build
  K.theme = { bg: '#0b0b10' };
  const POP = '"Poppins", "Inter Tight", sans-serif', land = K.W > K.H, wide = (a, b) => (land ? a : b);
  const full = (root) => K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px;overflow:hidden`);

  /* ------------------------------------------------------------------ a · flood */
  const PAL = ['#27c795', '#2f62f5', '#f4514f', '#f9bd2b', '#9a7df7', '#1d2140', '#f77fb0', '#f2ede4'];
  const floodScene = (t0, dur) => K.scene({ id: 'flood', t0, t1: t0 + dur, build(root, add) {
    const w = full(root);
    K.div(w, 'inset:0;background:#e9e4f3');                                             // DOM below the canvas
    add(K.kit.scene3d(w, {
      env: 'studio', lights: { preset: 'top', key: { dir: [-.62, .78, .74], i: 2.7 }, env: .62 }, shadow: { area: 13, res: 4096, soft: .9 }, fov: 32,
      camera: wide(
        [{ t: 0, pos: [-.5, -1.1, 18.2], look: [0, 0, 0], roll: -5 }, { t: 1.5, pos: [0, -.8, 15.6], look: [0, .05, 0], roll: -1.5 }, { t: 4, pos: [.45, -.5, 13.9], look: [0, .1, 0], roll: 1 }],
        [{ t: 0, pos: [-.4, -1.4, 34], look: [0, 0, 0], roll: -5 }, { t: 1.5, pos: [0, -1, 30], look: [0, 0, 0], roll: -1.5 }, { t: 4, pos: [.3, -.6, 27.5], look: [0, 0, 0], roll: 1 }]),
      build(ctx) {
        const floor = new T.Mesh(new T.PlaneGeometry(60, 60), N.mat.matte('#f1edf8')); floor.receiveShadow = true; ctx.add(floor);
        // three sticker words: sizes come from the labels themselves, the pile parts around their footprints
        const L = [
          { text: 'Deja que', bg: '#8d6bf6', color: '#ffffff', h: 1.32, rot: -.055, at: 1.62 },
          { text: 'la IA', bg: '#2f62f5', color: '#ffffff', h: 1.32, rot: .045, at: 2.02 },
          { text: 'lo resuelva', bg: '#fbfaf7', color: '#1d2140', h: 1.5, rot: -.025, at: 2.42 },
        ].map((d) => Object.assign(d, { mesh: N.label(d.text, { h: d.h, font: POP, weight: 700, bg: d.bg, color: d.color, side: d.bg, radius: .24, depth: .12, rough: .55, glow: .12 }) }));
        const gap = .34, rowW = L[0].mesh.userData.w + gap + L[1].mesh.userData.w, sc = wide(1, .92);
        if (land) { L[0].x = -rowW / 2 + L[0].mesh.userData.w / 2 - .25; L[1].x = rowW / 2 - L[1].mesh.userData.w / 2 - .25; L[0].y = L[1].y = 1.02; L[1].y += .1; L[2].x = .35; L[2].y = -.72; }
        else { L[0].x = -.5; L[0].y = 2.1; L[1].x = .9; L[1].y = .35; L[2].x = 0; L[2].y = -1.5; }
        L.forEach((d) => { d.x *= sc; d.y *= sc; d.mesh.scale.setScalar(sc); ctx.add(d.mesh); });
        const pile = N.pile({ count: 2500, seed: 7, w: wide(27, 19), h: wide(16, 30), r: .45, thick: .21, pour: [.05, 1.3], fall: .62, height: 12, from: [.12, 1], throw: 7, spin: 4.6, margin: .36, band: 1.9,
          part: L.map((d) => ({ x: d.x, y: d.y, w: (d.mesh.userData.w + .12) * sc, h: (d.h + .12) * sc, r: .38, rot: d.rot, at: d.at - .1, dur: .55 })) });
        const SH = PAL.map((c) => Array.from({ length: pile.layers }, (_, l) => new T.Color(c).multiplyScalar(lerp(.5, 1, Math.pow((l + 1) / pile.layers, 1.4)))));   // lower layers darker: cheap ambient occlusion
        const dark = '#1d2140', glyphs = ['@', '+', '?', '!', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', '#', '&',
          (g, x, y, s) => { g.lineWidth = s * .2; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - s * .38, y + s * .02); g.lineTo(x - s * .1, y + s * .3); g.lineTo(x + s * .42, y - s * .3); g.stroke(); },
          (g, x, y, s) => { g.lineWidth = s * .2; g.lineCap = g.lineJoin = 'round'; g.beginPath(); g.moveTo(x - s * .4, y); g.lineTo(x + s * .4, y); g.moveTo(x + s * .08, y - s * .32); g.lineTo(x + s * .4, y); g.lineTo(x + s * .08, y + s * .32); g.stroke(); },
          (g, x, y, s) => { g.lineWidth = s * .2; g.lineCap = 'round'; g.beginPath(); g.moveTo(x - s * .3, y - s * .3); g.lineTo(x + s * .3, y + s * .3); g.moveTo(x + s * .3, y - s * .3); g.lineTo(x - s * .3, y + s * .3); g.stroke(); },
          (g, x, y, s) => { g.lineWidth = s * .17; g.beginPath(); g.arc(x, y, s * .34, 0, TAU); g.stroke(); g.beginPath(); g.arc(x, y, s * .1, 0, TAU); g.fill(); }];
        const n = glyphs.length, atlas = N.atlas([...glyphs.map((t) => ({ text: t, color: '#ffffff' })), ...glyphs.map((t) => ({ text: t, color: dark }))], { cell: 128, cols: 8, font: `700 1px ${POP}`, scale: .5 });
        const discs = N.instances(N.disc(.45, .21, { bevel: .09, seg: 36 }), N.mat.gloss('#ffffff', { roughness: .26, clearcoatRoughness: .12 }), pile.count, (i, lt, m) => {
          pile(i, lt, m);
          const c = Math.floor(N.rnd(i, 40, 7) * PAL.length); m.color(SH[c][pile.layer(i)]).cell((c === 3 || c === 7 ? n : 0) + Math.floor(N.rnd(i, 41, 7) * n));
        }, { atlas });
        ctx.add(discs);
        return { L };
      },
      frame(lt, ctx, s) {
        s.L.forEach((d, k) => {
          const q = K.pop(lt, d.at, .55), drop = E.soft(P(lt, d.at, d.at + .5)), m = d.mesh;
          m.visible = lt >= d.at; if (!m.visible) return;
          m.position.set(d.x, d.y + (1 - drop) * .35, lerp(4.4, .62, drop));
          m.rotation.set((1 - drop) * -.5, (1 - drop) * (k % 2 ? -.4 : .4), d.rot + (1 - drop) * (k % 2 ? .22 : -.22));
          m.scale.setScalar(wide(1, .92) * (.55 + .45 * q));
        });
      },
    }));
  } });

  /* ------------------------------------------------------------------ b · hardware */
  const hardwareScene = (t0, dur) => K.scene({ id: 'hardware', t0, t1: t0 + dur, build(root, add) {
    const w = full(root), sky = ['#a9cdfb', '#dfeafc 52%', '#fde6d3'];
    K.div(w, `inset:0;background:linear-gradient(${sky.join(',')})`);                    // sky gradient: plain DOM under a transparent canvas
    const s3 = add(K.kit.scene3d(w, {
      env: { preset: 'sky', top: '#8fbdf7', bottom: '#fbe3cf' }, lights: { preset: 'product', target: [0, 0, 0], env: .95 }, shadow: { area: 7, res: 2048, soft: 1.3 }, fov: 30,
      dof: { focus: 'look', aperture: .12, maxBlur: 20 },
      camera: wide(
        [{ t: 0, pos: [-3.05, .95, 2.7], look: [-1.75, .02, .8], roll: -9 }, { t: .75, pos: [-1.6, 1.1, 4.3], look: [-.9, .05, .75], roll: -4 },
          { t: 1.85, pos: [2.7, .95, 8.1], look: [.5, .02, .4], roll: 0 }, { t: 4, pos: [3.5, .75, 8.7], look: [.58, .02, .4], roll: .6 }],
        [{ t: 0, pos: [-2.9, .95, 2.9], look: [-1.75, .02, .8], roll: -9 }, { t: .95, pos: [-1.6, 1.3, 6], look: [-.95, .05, .75], roll: -4 },
          { t: 2.0, pos: [3.4, 1.4, 19.5], look: [.3, .6, .4], roll: 0 }, { t: 4, pos: [4.6, 1.2, 20.6], look: [.3, .6, .4], roll: .6 }]),
      build(ctx) {
        const M = N.mat, dev = new T.Group(), mesh = (g, m, x = 0, y = 0, z = 0, parent = dev) => { const o = new T.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o; };
        const cobalt = M.plastic('#1f44dd', { roughness: .38, clearcoat: .45 }), orange = M.gloss('#ff6418', { roughness: .2, clearcoatRoughness: .06 }), white = M.plastic('#f3efe8'), dark = M.rubber('#15161b');
        mesh(N.rbox(5.5, 2.36, 1.5, .46, 8), cobalt);
        mesh(N.slab(5.02, 1.9, .3, .07), M.plastic('#1a3bc8', { roughness: .5, clearcoat: .2 }), 0, 0, .755);                 // face plate
        // dial
        const dial = new T.Group(); dial.position.set(-1.72, 0, .8); dev.add(dial);
        mesh(N.disc(.93, .09, { axis: 'z', bevel: .03 }), M.metal('#e3e5ea', { roughness: .2 }), 0, 0, 0, dial);
        const knob = new T.Group(); dial.add(knob);
        mesh(N.disc(.8, .46, { axis: 'z', bevel: .13, seg: 64 }), orange, 0, 0, .27, knob);
        knob.add(N.instances(N.pill(.017, .2, { axis: 'z', radial: 8, seg: 3 }), orange, 60, (i, lt, m) => m.pos(Math.sin(i / 60 * TAU) * .8, Math.cos(i / 60 * TAU) * .8, .23)));   // knurled grip
        mesh(N.disc(.36, .06, { axis: 'z', bevel: .025, dish: .03 }), M.gloss('#ef5a0e', { roughness: .32 }), 0, 0, .5, knob);
        mesh(N.pill(.045, .3, { axis: 'y' }), white, 0, .55, .5, knob);
        for (let i = 0; i < 28; i++) { const a = i / 28 * TAU; mesh(N.pill(.012, .07, { axis: 'y' }), white, Math.sin(a) * 1.02, Math.cos(a) * 1.02, -.04, dial).rotation.z = -a; }   // tick marks on the plate
        // display
        mesh(N.slab(3.3, 1.2, .14, .09), M.gloss('#07080b', { roughness: .16 }), .98, .22, .8);
        const led = N.ledPanel({ cols: 80, rows: 23, pitch: .0385, px: 18, on: '#ffb13b', off: '#2c2119', bg: '#08080a', glow: .6, intensity: 1.25,
          screens: [{ at: .7, lines: [{ text: 'tararea algo…', color: '#ffb13b' }], type: { cps: 11 }, cursor: true },
            { at: 2.5, in: 'wipe', dur: .26, lines: [{ text: 'CADA ÉXITO', color: '#fff0d8' }, { text: 'EMPIEZA ASÍ.', color: '#ff7a2c' }] }] });
        led.position.set(.98, .22, .852); dev.add(led);
        // keys, status light, speaker grille
        [[-.2, white], [.42, white], [1.04, M.gloss('#ff6a1c')]].forEach(([x, m]) => mesh(N.pill(.105, .44, { axis: 'x' }), m, x, -.68, .8));
        mesh(new T.SphereGeometry(.05, 20, 12), M.emissive('#58f29b', 2.2), 2.42, .68, .8).castShadow = false;
        const holes = N.instances(N.disc(.036, .02, { axis: 'z', seg: 12 }), dark, 33, (i, lt, m) => m.pos(1.62 + (i % 11) * .095, -.56 - Math.floor(i / 11) * .095, .796), { shadow: false }); dev.add(holes);
        // hooks on top, with anchors the cables read every frame
        const anchors = [-1.95, 1.95].map((x) => { mesh(N.disc(.13, .14, { bevel: .04 }), M.chrome(), x, 1.22, 0); const a = new T.Object3D(); a.position.set(x, 1.3, 0); dev.add(a); return a; });
        const plug = new T.Object3D(); plug.position.set(2.7, -.35, -.2); dev.add(plug); mesh(N.disc(.1, .2, { axis: 'x', bevel: .03 }), dark, 2.76, -.35, -.2);
        ctx.add(dev);
        // mast + boom (chrome), cables
        const rig = new T.Group(); ctx.add(rig);
        mesh(new T.CylinderGeometry(.12, .12, 22, 40), M.chrome(), -3.75, -3, -.9, rig);
        mesh(N.pill(.085, 7.4, { axis: 'x' }), M.chrome(), -.6, 5.5, -.9, rig);
        mesh(N.disc(.22, .34, { bevel: .06 }), M.metal('#b9bdc6'), -3.75, 5.5, -.9, rig);
        [-1.95, 1.95].forEach((x, k) => { mesh(N.pill(.05, .95, { axis: 'z' }), M.chrome(), x, 5.5, -.45, rig);
          ctx.add(N.tube([[x, 5.5, 0], anchors[k]], .028, { sway: { amp: .012, freq: .7 }, material: M.rubber('#101116'), seed: 3 + k })); });
        ctx.add(N.tube([plug, [3.5, -.75, -.25], [3.75, -2.6, -.5], [3.2, -6.5, -.9]], .05, { sway: { amp: .14, freq: .32 }, material: M.plastic('#ff6a1c', { roughness: .55 }), segments: 64, seed: 9 }));
        // a small satellite speaker further back: out of focus, it gives the void its depth
        const spk = new T.Group(); spk.position.set(3.6, 1.5, -6.5); ctx.add(spk);
        mesh(N.rbox(1.5, 1.5, .8, .3, 6), white, 0, 0, 0, spk); mesh(N.disc(.5, .06, { axis: 'z' }), dark, 0, 0, .4, spk); mesh(N.ring(.56, .035, { axis: 'z' }), orange, 0, 0, .41, spk);
        const sa = new T.Object3D(); sa.position.set(0, .75, 0); spk.add(sa); ctx.add(N.tube([[3.6, 7.5, -6.5], sa], .024, { material: M.rubber('#101116'), seed: 5 }));
        return { dev, knob, spk };
      },
      frame(lt, ctx, s) {                                             // a slow pendulum; cables follow because they read the anchors
        s.dev.rotation.set(.012 * Math.sin(lt * 1.1 + 1), .05 * Math.sin(lt * .8 + .4), .016 * Math.sin(lt * 1.3));
        s.dev.position.set(.05 * Math.sin(lt * 1.3 + .3), .02 * Math.sin(lt * 2.1), 0);
        s.knob.rotation.z = -lerp(-.9, .55, E.inOut(2.2)(P(lt, .1, 2.3)));
        s.spk.rotation.set(0, -.5 + .12 * Math.sin(lt * .7), .03 * Math.sin(lt * 1.2 + 2));
      },
    }));
    // DOM above the canvas: a word mark pinned under the device with project()
    const tag = K.div(w, `left:0;top:0;font:600 ${wide(30, 34)}px/1 "Geist Mono",monospace;letter-spacing:.08em;color:#17244f;white-space:nowrap;z-index:5`, 'TARAREO&nbsp;·&nbsp;M-1');
    add({ update(lt) { const q = E.snappy(P(lt, 2.2, 2.7)), a = s3.project([-2.6, -1.72, 0]); tag.style.opacity = q <= 0 ? 0 : Math.min(1, q * 2.5);
      tag.style.transform = `translate(${Math.round(a.x)}px,${Math.round(a.y + (1 - q) * 26)}px)`; tag.style.filter = q < .98 ? `blur(${((1 - q) * 8).toFixed(2)}px)` : 'none'; } });
  } });

  /* ------------------------------------------------------------------ c · orbit */
  const TASKS = ['Lavandería', 'Pagar renta', 'Cita dentista', 'Regar plantas', 'Súper', 'Llamar a mamá', 'Gimnasio', 'Reunión equipo', 'Leer 20 min', 'Enviar factura', 'Clase de yoga', 'Cocinar', 'Revisar correo', 'Pasear al perro', 'Dormir 8 h', 'Meditar'];
  const CARD = ['#bfe8d4', '#cbc3ff', '#ffdc8f', '#ffb7b0', '#badcff', '#f5f2ec'], INK = '#1b1d33';
  const drawCard = (k) => (g, W, H) => {
    const u = W / 100, bg = CARD[k % CARD.length], rr = (x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = INK; g.globalAlpha = .55; g.font = `500 ${7.5 * u}px "Geist Mono", monospace`; g.textBaseline = 'top'; g.fillText(`${String(8 + (k * 5) % 11).padStart(2, '0')}:${k % 2 ? '30' : '00'}`, 9 * u, 9 * u); g.globalAlpha = 1;
    g.fillStyle = 'rgba(27,29,51,.12)'; rr(W - 27 * u, 8 * u, 18 * u, 10 * u, 5 * u); g.fill(); g.fillStyle = k % 3 ? INK : '#fff'; g.beginPath(); g.arc(W - (k % 3 ? 14 : 22) * u, 13 * u, 3.6 * u, 0, TAU); g.fill();
    g.fillStyle = INK; g.font = `600 ${12.5 * u}px ${POP}`; g.letterSpacing = `${-.3 * u}px`; const words = TASKS[k % TASKS.length].split(' '); let line = '', y = 28 * u;
    words.forEach((wd) => { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > 82 * u && line) { g.fillText(line, 9 * u, y); y += 15 * u; line = wd; } else line = t; }); g.fillText(line, 9 * u, y);
    g.letterSpacing = '0px'; g.fillStyle = 'rgba(27,29,51,.14)'; rr(9 * u, H - 34 * u, 82 * u, 5 * u, 2.5 * u); g.fill(); g.fillStyle = INK; rr(9 * u, H - 34 * u, (20 + (k * 23) % 60) * u, 5 * u, 2.5 * u); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = i <= k % 3 ? INK : 'rgba(27,29,51,.2)'; g.beginPath(); g.arc((12.5 + i * 10) * u, H - 15 * u, 3.4 * u, 0, TAU); g.fill(); }
    g.fillStyle = 'rgba(27,29,51,.55)'; g.font = `500 ${6.5 * u}px "Geist Mono", monospace`; g.textAlign = 'right'; g.fillText(['hoy', 'mañana', 'vie'][k % 3], W - 9 * u, H - 19 * u); g.textAlign = 'left';
  };
  const orbitScene = (t0, dur) => K.scene({ id: 'orbit', t0, t1: t0 + dur, build(root, add) {
    const w = full(root), NC = 16, RAD = 4.6, OM = .3, HERO = 14, heroAt = 1.55, RY = -1.35, HY = 1.3, HS = 2.0, NP = 18000;
    K.div(w, 'inset:0;background:radial-gradient(ellipse 70% 62% at 50% 46%,#1c1033 0%,#0d0a17 50%,#07070b 100%)');
    const beat = (lt) => { const f = (lt / .86) % 1, g = (f + .7) % 1; return Math.exp(-9 * f) + .55 * Math.exp(-9 * g); };
    const s3 = add(K.kit.scene3d(w, {
      env: 'night', lights: { preset: 'night', key: { i: 1.9 }, target: [0, -.6, 0] }, shadow: { area: 9, soft: 1.5 }, fov: 32, exposure: 1.05,
      dof: { aperture: .085, maxBlur: 14, focus: (lt, ctx, s) => lerp(ctx.camera.position.length() - RAD + 1.2, ctx.camera.position.distanceTo(s.cards[HERO].position), E.inOut(2)(P(lt, heroAt, heroAt + .7))) },
      camera: wide(
        [{ t: 0, pos: [-1.2, .5, 14], look: [0, .25, 0], roll: 1.5 }, { t: 1.6, pos: [-.25, 1.5, 13.3], look: [0, .2, 0] }, { t: 4, pos: [1.3, 3.1, 12.4], look: [.25, .1, 0], roll: -1 }],
        [{ t: 0, pos: [-1.6, 1.4, 27], look: [0, .4, 0], roll: 1.5 }, { t: 1.6, pos: [-.3, 3, 25.5], look: [0, .3, 0] }, { t: 4, pos: [1.8, 6, 24], look: [.2, .2, 0], roll: -1 }]),
      build(ctx) {
        const cards = Array.from({ length: NC }, (_, k) => ctx.add(N.card(drawCard(k), 1.42, 1.9, .17, { depth: .06, side: CARD[k % CARD.length], back: '#1b1830', rough: .42, glow: .46, res: 300, fonts: [`600 40px ${POP}`, '500 40px "Geist Mono"'] })));
        const glow = new T.PointLight('#ff4d86', 30, 12, 1.8); glow.position.set(0, HY - .2, 0); ctx.add(glow);
        // heart: a puffy shell of small points (normal blending keeps the pinks saturated), a brighter contour, additive
        // sparks and a few huge faint sprites for the glow inside; it beats (pure function of lt)
        const NS = 900, hp = new Float32Array(NP * 3), sp = new Float32Array(NS * 3), hc = ['#ff2b63', '#ff5c9d', '#e0358a', '#a86bff', '#ff9a8a'].map((c) => new T.Color(c));
        for (let i = 0; i < NP; i++) hp.set(N.shape.heart(i, 3, { fill: .14, depth: .46, rim: .24 }), i * 3);
        for (let i = 0; i < NS; i++) sp.set(i < 240 ? N.shape.heart(i, 5, { fill: 1, depth: .3, rim: 0 }).map((v) => v * .78) : N.shape.heart(i, 5, { fill: .1, depth: .5, rim: .5 }), i * 3);
        const wob = (i, lt, p, src, j) => { const b = HS * (1 + .07 * beat(lt - N.rnd(i, 7, 3) * .04)), a = lt * (.5 + N.rnd(i, 8, 3)) + N.rnd(i, 9, 3) * TAU;
          p.pos(src[i * 3] * b + Math.sin(a) * j, src[i * 3 + 1] * b + Math.cos(a * 1.3) * j, src[i * 3 + 2] * b + Math.sin(a * .7) * j); return a; };
        const heart = new T.Group(); ctx.add(heart);
        heart.add(N.points(NP, (i, lt, p) => { const a = wob(i, lt, p, hp, .02), k = N.rnd(i, 10, 3), c = hc[k < .4 ? 0 : k < .66 ? 1 : k < .82 ? 2 : k < .94 ? 3 : 4];
          p.rgb(c.r, c.g, c.b); p.size = .03 + .03 * N.rnd(i, 12, 3); p.alpha = .92 * (.72 + .28 * Math.sin(a * 2.3)); }, { soft: .5, blend: 'normal' }));
        heart.add(N.points(NS, (i, lt, p) => { const a = wob(i, lt, p, sp, .03);
          if (i < 240) { p.rgb(hc[0].r, hc[0].g, hc[0].b); p.size = 1 + .5 * N.rnd(i, 12, 5); p.alpha = .045 * (1 + .6 * beat(lt)); }
          else { p.rgb(1, .72, .8); p.size = .05 + .06 * N.rnd(i, 12, 5); p.alpha = .55 * Math.max(0, Math.sin(a * 3.1)); } }, { soft: .85 }));
        heart.position.y = HY;
        const proxy = ctx.add(N.depthProxy(new T.SphereGeometry(1.5, 24, 16))); proxy.position.y = HY; proxy.scale.set(1.25, 1.15, .5);
        return { cards, glow, heart, proxy };
      },
      frame(lt, ctx, s) {
        const f = E.snappy(P(lt, heroAt, heroAt + .8)), cam = ctx.camera.position;
        s.cards.forEach((c, k) => {
          const th = k / NC * TAU + OM * lt + .16, bob = .07 * Math.sin(lt * 1.4 + k * 1.7);
          c.position.set(Math.sin(th) * RAD, RY + bob, Math.cos(th) * RAD); c.rotation.set(0, th, 0); c.scale.setScalar(1);
          if (k === HERO && f > 0) {                                  // the hero card leaves the ring and faces the camera
            const tx = wide(-1.95, -.75), ty = wide(.72, -1.3), tz = RAD + wide(.95, 3.2);
            c.position.set(lerp(c.position.x, tx, f), lerp(c.position.y, ty, f), lerp(c.position.z, tz, f));
            c.rotation.set(lerp(0, -.1, f), lerp(th > Math.PI ? th - TAU : th, Math.atan2(cam.x - tx, cam.z - tz) * .7 + .12, f), lerp(0, -.04, f)); c.scale.setScalar(lerp(1, 1.18, f));
          }
        });
        s.heart.rotation.y = .45 * Math.sin(lt * .45 + .3); s.proxy.rotation.y = s.heart.rotation.y;
        s.glow.intensity = 24 + 26 * beat(lt);
      },
    }));
    // DOM over the 3D: status line + a two-line sticker pinned to the hero card with project()
    const fs = wide(36, 40), top = K.div(w, `left:0;right:0;top:${wide(70, 250)}px;text-align:center;font:500 ${fs}px/1 ${POP};color:#ff7d9c;letter-spacing:-.01em;z-index:5`, '<span style="display:inline-block;width:.42em;height:.42em;border-radius:50%;background:#ff5a84;margin-right:.5em;vertical-align:.12em"></span>Ritmo alto. Hora de pausar.');
    const st = K.div(w, 'left:0;top:0;z-index:6;transform-origin:0 0'), s1 = K.div(st, `left:0;top:0;white-space:nowrap;font:600 ${wide(44, 44)}px/1 ${POP};letter-spacing:-.02em;color:#fff;background:#8d6bf6;padding:.34em .6em .38em;border-radius:.38em .38em .38em 0`, 'Según tu energía');
    const s2 = K.div(st, `left:0;top:${wide(68, 68)}px;white-space:nowrap;font:700 ${wide(76, 70)}px/1 ${POP};letter-spacing:-.03em;color:#fff;background:#f4514f;padding:.22em .5em .3em;border-radius:0 .34em .34em .34em`, 'Prioridad');
    add({ update(lt) {
      const q = E.snappy(P(lt, .35, .8)); top.style.opacity = q <= 0 ? 0 : Math.min(1, q * 2.5); top.style.transform = q > .999 ? 'none' : `translateY(${((1 - q) * 22).toFixed(2)}px)`; top.style.filter = q < .98 ? `blur(${((1 - q) * 10).toFixed(2)}px)` : 'none';
      const hero = s3.state.cards[HERO], a = s3.project(hero.localToWorld(new T.Vector3(.78, .1, .05)));
      [[s1, heroAt + .45], [s2, heroAt + .6]].forEach(([e, t]) => { const k = K.pop(lt, t, .5); e.style.visibility = lt < t ? 'hidden' : 'visible'; e.style.transformOrigin = '0 50%'; e.style.transform = k > .9995 ? 'none' : `scale(${(.6 + .4 * k).toFixed(4)})`; });
      st.style.transform = `translate(${Math.round(a.x)}px,${Math.round(a.y)}px) rotate(-3deg)`;
    } });
  } });

  /* ------------------------------------------------------------------ ?set=b · QA scenes */
  if (Q.get('set') === 'b') {
    // blocks: chunky rounded blocks over a floor with a contact shadow; DOM chips pinned with project(); a second, small
    // scene3d (chrome ring, transparent) sits over a DOM headline — two components share the one renderer.
    K.scene({ id: 'blocks', t0: 0, t1: 4, build(root, add) {
      const w = full(root); K.div(w, 'inset:0;background:linear-gradient(#f6f1ff,#e8f6ef)');
      const cols = ['#27c795', '#f9bd2b', '#f4514f', '#2f62f5', '#9a7df7', '#1d2140'];
      const head = K.div(w, `left:${wide(90, 70)}px;top:${wide(70, 230)}px;font:700 ${wide(120, 104)}px/.95 ${POP};letter-spacing:-.04em;color:#1d2140;z-index:1`, 'Productividad');
      const s3 = add(K.kit.scene3d(w, { env: 'soft', lights: 'soft', shadow: { area: 8, soft: 1.6, opacity: .8 }, fov: 30, z: 2,
        camera: [{ t: 0, pos: wide([5.5, 4.2, 9.5], [7, 6, 15]), look: [0, .9, 0] }, { t: 4, pos: wide([3.2, 3.4, 10.4], [4, 5, 16]), look: [0, 1, 0] }],
        build(ctx) {
          const floor = new T.Mesh(new T.PlaneGeometry(40, 40).rotateX(-Math.PI / 2), N.mat.shadow(.3, '#3a2a66')); floor.receiveShadow = true; ctx.add(floor);
          ctx.add(N.contactShadow({ w: 12, d: 12, y: .004, far: 3.5, blur: 3, opacity: .75, color: '#2a1c55' }));
          const blocks = [[2.2, 1, 1.2], [1.1, 2.1, 1.1], [1.4, .8, 2.2], [1, 1, 1], [2.4, .7, .9], [.9, 1.5, .9]].map((d, k) => { const m = new T.Mesh(N.rbox(d[0], d[1], d[2], .16, 6), N.mat.plastic(cols[k])); m.castShadow = m.receiveShadow = true; ctx.add(m); return { m, d }; });
          return { blocks };
        },
        frame(lt, ctx, s) {
          const rest = [[-1.6, .5, 0], [.2, 1.05, -.4], [1.9, .4, .3], [-.3, .5, 1.5], [-1.2, 1.37, -.1], [1.7, 1.56, .2]];
          s.blocks.forEach(({ m, d }, k) => { const q = E.soft(P(lt, .15 + k * .14, .9 + k * .14)), fl = .22 * Math.sin(lt * 1.2 + k * 1.3);
            m.position.set(rest[k][0], rest[k][1] + (1 - q) * 5 + (k > 3 ? .5 + fl : 0), rest[k][2]); m.rotation.set((1 - q) * 1.2, k * .5 + (1 - q) * 2 + (k > 3 ? lt * .25 : 0), (1 - q) * .8); });
        } }));
      const s3b = add(K.kit.scene3d(w, { x: wide(K.W - 520, K.W - 420), y: wide(40, 60), w: 420, h: 420, z: 3, env: 'studio', lights: 'product', shadow: false, fov: 30,
        build(ctx) { const g = new T.Group(); g.add(new T.Mesh(N.ring(1.5, .22), N.mat.chrome()), new T.Mesh(N.disc(.7, .3, { bevel: .12 }), N.mat.gloss('#f4514f'))); ctx.add(g); return { g }; },
        frame(lt, ctx, s) { ctx.cam([0, 1.5, 7], [0, 0, 0]); s.g.rotation.set(.9 + .3 * Math.sin(lt * 1.1), lt * 1.4, .2); } }));
      const chips = ['Súper', 'Dentista', 'Renta'].map((t, k) => K.div(w, `left:0;top:0;font:600 30px/1 ${POP};color:#fff;background:${cols[[3, 2, 5][k]]};padding:.36em .7em .4em;border-radius:99px;white-space:nowrap;z-index:4`, t));
      add({ update(lt) { chips.forEach((c, k) => { const b = s3.state.blocks[[0, 4, 5][k]], a = s3.project(b.m.localToWorld(new T.Vector3(0, b.d[1] / 2 + .25, 0))); c.style.transform = `translate(${Math.round(a.x - c.offsetWidth / 2)}px,${Math.round(a.y - 40)}px)`; c.style.opacity = lt > .9 + k * .14 ? 1 : 0; }); void head; void s3b; } });
    } });
    if (K.trans && K.trans.push) try { hardwareScene(4, 3); K.trans.push({ at: 4, a: 'blocks', b: 'hardware', dur: .5 }); } catch (e) { K.errors.push('set b transition: ' + e.message); }
    K.BG = '#0b0b10'; K.start({ format: Q.get('fmt') || '16x9', fps: 30, dur: K.scenes.length > 1 ? 7 : 4 }); return;
  }

  floodScene(0, 4); hardwareScene(4, 4); orbitScene(8, 4);
  K.BG = '#0b0b10';
  K.start({ format: Q.get('fmt') || '16x9', fps: 30, dur: 12 });
})();
