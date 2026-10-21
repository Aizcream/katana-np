/* ui_demo.js — demo of the ui family (engine/kit/ui.js). ?fmt=16x9 for landscape. One scene per component group.
   Gallery: ./katana gallery engine/demos/ui.html 1.6,2.9,4.9,6.3,9.8,13.6,15.32,16.9,20.6,25.6,27.6,32.5,34.8 */
(function () {
  const Q = new URLSearchParams(location.search), FMT = Q.get('fmt') || '9x16';
  const [FW, FH] = K.FORMATS[FMT] || K.FORMATS['9x16'];
  const P = FH >= FW, L = (p, l) => (P ? p : l);
  const { E, scene } = K;
  const A = 'assets/', IMG = A + 'img/', UI = A + 'ui/';
  K.theme = { bg: '#F2F2EF', accent: '#2B4BFF' };
  const T = { phone: 0, browser: 3.4, laptop: 6.9, search: 10.4, cards: 15.4, cloud: 18.6, lh: 21.8, notif: 26.0, chat: 29.4, cta: 32.6, end: 36.2 };
  K.BG = [[0, '#F2F2EF'], [T.laptop, '#2B4BFF'], [T.search, '#F2F2EF'], [T.cards, '#111214'], [T.cloud, '#F2F2EF'], [T.lh, '#2B4BFF'], [T.notif, '#F2F2EF'], [T.chat, '#FF4D2E'], [T.cta, '#D6FF3D']];

  // headline helper (demo only): word-by-word pop with scale + blur + rise, one serif italic emphasis (*word*)
  const head = (root, markup, o) => {
    const size = o.size || L(112, 104), box = K.div(root, `left:${o.x ?? 0}px;top:${o.y}px;width:${o.w ?? FW}px;text-align:${o.align || 'center'};font-size:${size}px;color:${o.color || 'var(--k-fg)'};line-height:.92`);
    box.className = 'k-display';
    const words = []; let i = 0;
    for (const tk of K.tokens(markup)) {
      if (tk.space) { K.el('span', '', box, ' '); continue; }
      if (tk.text === '/') { K.el('br', '', box); continue; }
      const s = K.el('span', 'display:inline-block;padding:0 .08em;margin:0 -.08em', box, tk.text);   // glyph overhang (negative tracking) stays inside the box
      if (tk.em) { s.className = 'k-serif'; s.style.fontSize = '1.1em'; s.style.padding = '0 .14em'; s.style.margin = '0 -.14em'; }   // italic overhang stays inside the box
      words.push({ s, t0: (o.at || 0) + (i++) * (o.step || .1) });
    }
    return { update(lt) { words.forEach(({ s, t0 }) => { const q = E.snappy(K.p(lt, t0, t0 + .38)); if (q >= 1) { s.style.transform = 'none'; s.style.filter = 'none'; s.style.opacity = ''; return; } s.style.opacity = lt < t0 ? 0 : Math.min(1, (lt - t0) / .06); s.style.transform = `translateY(${((1 - q) * size * .3).toFixed(1)}px) scale(${(1.14 - .14 * q + 1e-5).toFixed(5)})`; s.style.filter = q < .98 ? `blur(${((1 - q) * 16).toFixed(1)}px)` : 'none'; }); } };
  };
  const tag = (root, txt) => K.div(root, 'left:24px;top:24px', `<span class="demo-label" style="position:static">${txt}</span>`);

  /* 1 — PHONE: mobile site scrolling, chip + counting label */
  scene({ id: 'phone', t0: T.phone, t1: T.browser, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.phone · chip · label');
    add(head(w, 'Webs que / *cargan* rápido', { y: L(250, 300), x: L(0, 110), w: L(FW, 820), align: L('center', 'left'), at: .05 }));
    const ph = add(K.kit.phone(w, { at: .15, x: L(540, 1380), y: L(1230, 560), w: L(500, 330), src: UI + 'site_mobile.jpg', scroll: [[1.25, 0], [2.0, .16], [2.25, .16], [2.95, .3]], rz: -4, ry: 8, float: true }));
    // two finger swipes (cursor shape 'touch') in sync with the two scroll moves
    const A = ph.pointAt(.6, .8), B = ph.pointAt(.6, .46);
    [[1.1, 2.0], [2.12, 2.95]].forEach(([t0, t1]) => add(K.kit.cursor(w, { shape: 'touch', path: [[t0, A[0], A[1]], [t0 + .13, A[0], A[1]], [t1, B[0], B[1], E.smooth]], out: t1 - .02, outDur: .2, arc: .03, cue: false })));
    const ch = add(K.kit.chip(w, { at: 1.0, x: L(250, 1080), y: L(820, 300), text: 'Hecha con *Astro*', icon: '🚀', rot: -5 }));
    const lb = add(K.kit.label(w, { at: 1.3, x: L(790, 1090), y: L(600, 900), text: 'CARGA · {n} S', count: { from: 4.2, to: .8, decimals: 1, sep: '.', dur: 1.2 }, style: 'tag' }));
    K.addCues(ch, T.phone); K.addCues(lb, T.phone);
  } });

  /* 2 — BROWSER: URL typed, page loads, eased scroll, cursor clicks */
  scene({ id: 'browser', t0: T.browser, t1: T.laptop, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.browser · cursor');
    add(head(w, 'Rediseño con *Astro*', { y: L(240, 70), at: .05 }));
    const bx = L(540, 960), by = L(1060, 600), bw = L(950, 1240), bh = L(1180, 760);
    const b = add(K.kit.browser(w, { at: 0, x: bx, y: by, w: bw, h: bh, src: UI + 'site_desktop.jpg', url: 'auroracafe.co', typeUrl: .85, load: [1.65, 2.05], scroll: [[2.45, 0], [2.9, .2], [3.45, .38]], rx: 4 }));
    const [ux, uy] = b.urlAt(), p1 = b.pointAt(.8, .75), p2 = b.pointAt(.72, .55), p3 = b.pointAt(.66, .62);
    const c = add(K.kit.cursor(w, { path: [[.25, p1[0], p1[1]], [.72, ux + 30, uy + 6], [1.95, p2[0], p2[1]], [2.9, p3[0], p3[1]]], clicks: [.78], shapes: [[2.0, 'hand']] }));
    K.addCues(b, T.browser); K.addCues(c, T.browser);
  } });

  /* 3 — LAPTOP: lid opens, site scrolls; badge + ticker on a colour block */
  scene({ id: 'laptop', t0: T.laptop, t1: T.search, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.laptop · badge · ticker');
    add(head(w, 'Tu web, / *nueva*', { y: L(240, 140), x: L(0, 90), w: L(FW, 700), align: L('center', 'left'), color: '#fff', at: .1 }));
    const lp = add(K.kit.laptop(w, { at: 0, enter: 'open', x: L(540, 1180), y: L(1000, 470), w: L(940, 860), src: UI + 'site_desktop.jpg', url: 'auroracafe.co', scroll: [[1.4, 0], [2.3, .3], [3.2, .5]], ry: [[0, -14], [3.5, 10]], rx: -14 }));
    const bd = add(K.kit.badge(w, { at: .8, x: L(850, 1690), y: L(540, 250), r: L(112, 100), text: 'NUEVA WEB • NORTH PEARL • ', center: 'ring', color: '#D6FF3D', centerColor: '#D6FF3D' }));
    const tk = add(K.kit.ticker(w, { at: .5, y: L(1560, 960), rot: -4, text: ['WEBS QUE CARGAN RÁPIDO', 'DISEÑO + SEO', 'HECHO EN COLOMBIA'], bg: '#111214', color: '#fff', sepColor: '#D6FF3D', speed: 190 }));
    K.addCues(lp, T.laptop); K.addCues(bd, T.laptop); K.addCues(tk, T.laptop);
  } });

  /* 4 — SEARCH BAR: grows, types, submit press, chips spawn with connectors; cursor clicks the button */
  scene({ id: 'search', t0: T.search, t1: T.cards, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.searchBar · cursor');
    const sx = L(540, 960), sy = L(960, 540), sw = L(900, 960), sh = L(132, 112);
    const sb = add(K.kit.searchBar(w, { at: .1, x: sx, y: sy, w: sw, h: sh, s: [[.8, .9], [3.4, L(1.05, 1.12)]], placeholder: '¿Qué necesita tu web?', text: 'Rediseño con Astro que cargue rápido', chips: [{ text: 'Astro', icon: '🚀' }, { text: 'SEO', icon: '🔍' }, { text: 'Lighthouse 94', icon: 'dot', color: '#0CCE6B' }, { text: 'Más tráfico', icon: '📈' }], chipLabel: 'IDEA' }));
    const [btnX, btnY] = sb.buttonAt(sb.submitAt);
    const c = add(K.kit.cursor(w, { path: [[sb.typeEnd - .7, btnX + 160, btnY + 420], [sb.submitAt - .05, btnX + 4, btnY + 6]], clicks: [sb.submitAt], shape: 'hand', out: sb.submitAt + .9 }));
    K.addCues(sb, T.search); K.addCues(c, T.search);
  } });

  /* 5 — CARDS: dealt portfolio cards on a dark block */
  scene({ id: 'cards', t0: T.cards, t1: T.cloud, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.card');
    add(head(w, 'Proyectos que *inspiran*', { y: L(230, 60), color: '#fff', at: .05, size: L(96, 92) }));
    const cw = L(470, 380), xs = L([300, 790, 520], [540, 960, 1380]), ys = L([800, 900, 1450], [620, 580, 640]);
    const specs = [
      { src: UI + '_tile_a.jpg', title: 'Aurora Café', meta: 'CAFÉ · ASTRO · 2026', tag: 'Nueva web', rz: -7, dealSide: -1 },
      { src: UI + '_tile_b.jpg', layout: 'overlay', title: 'Café *filtrado*', meta: 'LANDING · SEO', rz: 5, dealSide: 1 },
      { src: UI + '_hero_m.jpg', title: 'Tienda *online*', meta: 'E-COMMERCE · 0.8 S', rz: -2, dealSide: 0 },
    ];
    specs.forEach((s, i) => { const c = add(K.kit.card(w, Object.assign({ at: .3 + i * .18, x: xs[i], y: ys[i], w: cw, enter: 'deal', theme: 'dark', float: { amp: 9, hz: .28 + i * .05, rot: .8 } }, s))); K.addCues(c, T.cards); });
  } });

  /* 6 — CHIP CLOUD around a centre node */
  scene({ id: 'cloud', t0: T.cloud, t1: T.lh, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.chipCloud');
    add(head(w, L('Todo lo que tu web / *necesita*', 'Todo lo que tu web *necesita*'), { y: L(250, 70), at: .05, size: L(104, 92) }));
    const cc = add(K.kit.chipCloud(w, { at: .3, y: L(1030, 600), center: { text: 'North Pearl', icon: 'sparkle', color: '#D6FF3D' }, items: [{ text: 'Carga rápida', icon: '⚡' }, { text: 'SEO', icon: '🔍' }, { text: 'Mobile first', icon: '📱' }, { text: 'Astro', icon: '🚀', style: 'accent' }, { text: 'Más tráfico', icon: '📈' }, { text: 'Diseño', icon: '✨', style: 'lime' }], dashed: true }));
    K.addCues(cc, T.cloud);
    add(K.kit.label(w, { at: 1.6, y: L(1480, 990), text: '6 RAZONES · {n}% MÁS TRÁFICO', count: { from: 0, to: 38, dur: 1.1 } }));
  } });

  /* 7 — LIGHTHOUSE 81 → 94 on a blue block */
  scene({ id: 'lh', t0: T.lh, t1: T.notif, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.lighthouse');
    add(head(w, 'Los números / no *mienten*', { y: L(290, 90), color: '#fff', at: .05 }));
    const lh = add(K.kit.lighthouse(w, { at: .35, y: L(1060, 640), theme: 'dark', title: 'Lighthouse · auroracafe.co', scores: [94, 100, 96, 100], from: [81, 87, 92, 100] }));
    K.addCues(lh, T.lh);
    add(K.kit.label(w, { at: 1.0, y: L(565, 960), text: 'ANTES → DESPUÉS', style: 'tag', bg: '#111214' }));
  } });

  /* 8 — PLAYER + iOS NOTIFICATION */
  scene({ id: 'notif', t0: T.notif, t1: T.chat, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.player · notification');
    const pl = add(K.kit.player(w, { at: 0, y: L(1080, 600), w: L(900, 1000), ratio: L(1.15, 9 / 16), clip: A + 'clips/c3294', focus: [.5, .45], tag: 'Hecho por North Pearl', meta: 'Aurora Café · Astro · 2026', title: 'Así quedó *la web*', duration: 92, start: 21, pauseAt: [2.1], playAt: [2.8] }));
    const nt = add(K.kit.notification(w, { at: .9, out: 3.0, title: 'North Pearl', body: '¡Tu web nueva está lista! 🚀 Carga en 0,8 s.', icon: { img: IMG + 'np_logo_vertical.png', fit: 'contain' }, iconBg: '#111214', time: 'ahora', stack: 1 }));
    K.addCues(pl, T.notif); K.addCues(nt, T.notif);
  } });

  /* 9 — PHONE with a BUILDER screen (custom DOM chat that animates via the returned update) */
  const chatUI = (el, { w, h }) => {
    el.style.background = '#EFE7DE';
    const u = w / 100, hdr = K.div(el, `left:0;top:0;width:${w}px;height:${u * 30}px;background:#fff;box-shadow:0 1px 0 rgba(0,0,0,.08)`);
    K.div(hdr, `left:${u * 6}px;top:${u * 17}px;width:${u * 10}px;height:${u * 10}px;border-radius:50%;background:#111214 url(${IMG}np_logo_vertical.png) center/62% no-repeat`);
    K.div(hdr, `left:${u * 19}px;top:${u * 17.5}px;font:700 ${u * 4.6}px/1.1 var(--k-display);letter-spacing:-.02em;color:#111`, 'North Pearl');
    K.div(hdr, `left:${u * 19}px;top:${u * 23.2}px;font:500 ${u * 3.4}px/1 var(--k-display);color:#25A35A`, 'en línea');
    const msgs = [[0, '¡Hola! 👋 Vi su reel', .9], [1, '¡Hola! ¿En qué te ayudamos?', 1.4], [0, 'Quiero rediseñar mi web 🚀', 1.95], [1, 'Te enviamos la propuesta hoy ✨', 2.5]];
    let y = u * 38;
    const B = msgs.map(([me, txt, t0]) => {
      const b = K.div(el, `${me ? 'right' : 'left'}:${u * 5}px;top:${y}px;max-width:${u * 70}px;padding:${u * 2.6}px ${u * 4}px;border-radius:${u * 5}px;${me ? `border-bottom-right-radius:${u}px;background:#D9FDD3` : `border-bottom-left-radius:${u}px;background:#fff`};font:500 ${u * 6.2}px/1.22 var(--k-display);letter-spacing:-.01em;color:#111;box-shadow:0 1px 1px rgba(0,0,0,.08);transform-origin:${me ? '100%' : '0'} 100%`, txt);
      y += b.offsetHeight + u * 3; return { b, t0 };
    });
    return { update(lt) { B.forEach(({ b, t0 }) => { b.style.display = lt < t0 ? 'none' : 'block'; b.style.transform = `translateY(${((1 - E.snappy(K.p(lt, t0, t0 + .35))) * u * 6).toFixed(2)}px) scale(${(K.lerp(.5, 1, K.pop(lt, t0, .45)) + 1e-5).toFixed(5)})`; }); } };
  };
  scene({ id: 'chat', t0: T.chat, t1: T.cta, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.phone (build) · button');
    add(head(w, 'Escríbenos / por *WhatsApp*', { y: L(250, 300), x: L(0, 110), w: L(FW, 820), align: L('center', 'left'), color: '#fff', at: .05 }));
    const ph = add(K.kit.phone(w, { at: .1, enter: 'flip', x: L(540, 1380), y: L(1130, 560), w: L(520, 330), build: chatUI, statusBar: 'dark', color: 'silver', rz: 3, float: true }));
    const bt = add(K.kit.button(w, { at: 2.4, x: L(540, 520), y: L(1470, 760), text: 'Abrir chat', icon: 'whatsapp', style: 'whatsapp', size: L(52, 40) }));
    K.addCues(ph, T.chat); K.addCues(bt, T.chat);
  } });

  /* 10 — CTA BUTTON on lime: grow, shine, cursor press; label + ticker */
  scene({ id: 'cta', t0: T.cta, t1: T.end, build(root, add) {
    const w = K.div(root, 'inset:0'); tag(w, 'K.kit.button · badge · ticker');
    add(head(w, '¿Tu web es / la *próxima?*', { y: L(330, 120), at: .05 }));
    const by = L(1130, 600);
    const bt = add(K.kit.button(w, { at: .5, y: by, text: 'Escríbenos', style: 'dark', pressAt: [2.0], shineEvery: 1.6 }));
    const [ix, iy] = bt.iconAt();
    const c = add(K.kit.cursor(w, { path: [[1.2, L(900, 1300), L(1440, 860)], [1.92, ix + 4, iy + 10]], clicks: [2.0], shape: 'hand', out: 2.9 }));
    add(K.kit.label(w, { at: 1.0, y: by + L(150, 120), text: 'LINK EN LA BIO', style: 'dot' }));
    add(K.kit.badge(w, { at: .9, x: L(860, 1600), y: L(760, 320), r: L(105, 100), text: 'NORTH PEARL • WEB • ', center: 'play', color: '#111214' }));
    add(K.kit.ticker(w, { at: .3, y: L(1450, 990), rot: 0, text: ['LINK EN LA BIO', 'ESCRÍBENOS', 'NORTH PEARL'], bg: '#111214', sepColor: '#D6FF3D', font: 'wide', speed: 150 }));
    K.addCues(bt, T.cta); K.addCues(c, T.cta);
  } });

  K.start({ format: FMT, fps: 30, dur: T.end });
})();
