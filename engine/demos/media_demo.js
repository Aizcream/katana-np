/* media_demo.js — demo of the MEDIA family (engine/kit/media.js). One scene per component, North Pearl content.
   ./katana gallery engine/demos/media.html <times>   ·   ?fmt=16x9 for landscape   ·   ?play=1 realtime player */
(function () {
  const Q = new URLSearchParams(location.search);
  const { E, p: P } = K;
  const IMG = 'assets/img/', MED = 'assets/media/', CL = 'assets/clips/';
  const NP = ['np_3292_2s', 'np_3292_6s', 'np_3292_10s', 'np_3293_2s', 'np_3293_6s', 'np_3293_10s', 'np_3294_2s', 'np_3294_6s', 'np_3294_10s', 'np_3295_2s', 'np_3295_6s', 'np_3295_10s'].map((f) => IMG + f + '.jpg');
  const CARDS = ['card_planta', 'card_hero', 'card_campo', 'card_site_old', 'card_latte', 'card_lh94', 'card_lh81'].map((f) => MED + f + '.jpg');
  const MIX = [CARDS[0], NP[3], CARDS[5], NP[7], CARDS[1], NP[10], CARDS[3], NP[1], CARDS[2], NP[5], CARDS[4], NP[9], CARDS[6], NP[4], NP[0], NP[8]];
  K.theme = { bg: '#F2F2EF', accent: '#2B4BFF' };

  // demo-only kinetic caption (the type family owns the real ones): words pop in (rise + scale + blur)
  const cap = (root, add, text, { y, size = 120, color = 'var(--k-fg)', at = 0, step = .1, out = null }) => {
    const line = K.div(root, `left:0;right:0;top:${y}px;text-align:center;font-size:${size}px;line-height:.92;color:${color};z-index:30;padding:0 70px`);
    line.className = 'k-display';
    const ws = text.split(' ').map((w, i) => {
      const em = w.startsWith('*'), s = K.el('span', 'display:inline-block;margin:0 .09em', line, w.replace(/\*/g, ''));
      if (em) s.className = 'k-serif';
      return { s, t0: at + i * step };
    });
    add({ update(lt) {
      ws.forEach(({ s, t0 }) => {
        let q = E.snappy(P(lt, t0, t0 + .38)); if (out != null) q *= 1 - E.in(2)(P(lt, out, out + .3));
        s.style.opacity = lt < t0 || q <= 0 ? 0 : Math.min(1, q * 3);
        s.style.transform = q > .999 ? 'none' : `translateY(${(1 - q) * size * .3}px) scale(${1.14 - .14 * q})`;
        s.style.filter = q < .98 ? `blur(${(1 - q) * 14}px)` : 'none';
      });
    } });
    return line;
  };
  const label = (root, txt) => K.div(root, '', txt).className = 'demo-label';
  const land = () => K.W > K.H;
  const BG = [];
  let T = 0;
  const S = (id, dur, bg, build) => { BG.push([T, bg]); K.scene({ id, t0: T, t1: T + dur, build(root, add) { const w = K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px;overflow:hidden`); build(w, add); label(w, 'K.kit.' + id); } }); T += dur; };

  if (Q.get('set') === 'b') {   // ?set=b — second pass over the options the main demo does not show (QA of the API)
    S('clipBox', 3.0, '#F2F2EF', (w, add) => {
      add(K.kit.clip(w, { clip: CL + 'c3294', y: K.H * (land() ? .58 : .53), w: land() ? 500 : 760, h: land() ? 720 : 1000, radius: 36, shadow: 1, enter: 'pop', at: .2, out: 2.3, exit: 'right', rate: .5 }));
      cap(w, add, 'en *cámara lenta*', { y: land() ? 60 : 240, size: land() ? 100 : 110, at: .3, out: 2.3 });
    });
    S('gridItems', 3.2, '#F2F2EF', (w, add) => {
      add(K.kit.grid(w, { items: CARDS.slice(0, 6), style: 'flip', order: 'center', y: K.H * .56, out: 2.5 }));
      cap(w, add, 'seis *proyectos*', { y: land() ? 50 : 230, size: land() ? 100 : 110, at: .1, out: 2.45 });
    });
    S('fanShuffle', 3.4, '#F2F2EF', (w, add) => {
      add(K.kit.fan(w, { items: [CARDS[0], NP[4], CARDS[5], NP[7], CARDS[1], NP[1]], from: 'bottom', y: K.H * .56, layout: [[0, 'grid'], [1.2, 'shuffle'], [2.0, 'shuffle:2']], out: 2.8 }));
      cap(w, add, 'a tu *gusto.*', { y: land() ? 50 : 230, size: land() ? 100 : 110, at: .1, out: 2.75 });
    });
    S('wallCascade', 3.4, '#111214', (w, add) => {
      add(K.kit.cardWall(w, { items: MIX, enter: 'cascade', tilt: { rx: 6, ry: -30, rz: 2 }, from: [2, 0, -700], to: [-1.5, .3, -150], travel: [0, 3.4], highlight: [[1.6, 'center', 1.2]], ring: 'var(--k-accent2)' }));
    });
    S('baBox', 3.4, '#2B4BFF', (w, add) => {
      add(K.kit.beforeAfter(w, { a: MED + 'lh_antes.jpg', b: MED + 'lh_despues.jpg', w: land() ? 620 : 800, h: land() ? 900 : 1240, dir: 'y', focus: [.5, 0], at: .1,
        wipe: [[0, .9], [.4, .9], [1.3, .1, E.smooth], [2.2, .45, E.smooth]], labels: ['81', '94'] }));
    });
    S('spinX', 3.0, '#D6FF3D', (w, add) => {
      add(K.kit.spin(w, { src: MED + 'sticker_94.png', cutout: true, axis: 'x', w: land() ? 520 : 640, outline: 14, spins: [[0, 1, 1.1], [1.8, .5, .6], [2.4, .5, .5]] }));
    });
    K.BG = BG; K.start({ format: Q.get('fmt') || '9x16', fps: 30, dur: T }); return;
  }

  // 1 · clip — fast → slow-mo ramp on the drop, zoom keys
  S('clip', 4.2, '#0d0d0f', (w, add) => {
    add(K.kit.clip(w, { clip: CL + 'c3293', ramp: [[0, 2.4], [1.0, .28], [2.5, .28], [2.9, 1.3]], zoom: [[0, 1.4], [1.0, 1.06, E.snappy], [4.2, 1.14, E.glide]], focus: [.5, .42] }));
    K.div(w, `left:0;top:${K.H * .55}px;width:${K.W}px;height:${K.H * .45}px;background:linear-gradient(rgba(0,0,0,0),rgba(0,0,0,.6));z-index:5`);
    cap(w, add, 'webs que cargan *rápido*', { y: land() ? K.H * .62 : K.H * .6, size: land() ? 120 : 132, color: '#fff', at: 1.0 });
  });
  // 2 · photo — two stills, Ken Burns + parallax drift, rise / pop entrances
  S('photo', 3.4, '#F2F2EF', (w, add) => {
    const L = land();
    add(K.kit.photo(w, { src: IMG + 'np_3294_6s.jpg', x: L ? K.W * .36 : K.W * .44, y: L ? K.H * .54 : K.H * .52, w: L ? 560 : K.W * .7, h: L ? 760 : K.H * .5, radius: 34, shadow: 1,
      from: { s: 1.18 }, to: { s: 1.02, y: -30 }, dur: 3.4, drift: [0, -10], at: .05, focus: [.55, .5] }));
    add(K.kit.photo(w, { src: MED + 'web_despues.jpg', x: L ? K.W * .66 : K.W * .6, y: L ? K.H * .44 : K.H * .74, w: L ? 760 : K.W * .72, h: L ? 520 : K.W * .5, radius: 28, shadow: 1.2,
      rot: 3, from: { s: 1.1 }, to: { s: 1 }, dur: 3, drift: [L ? -10 : -6, -22], enter: 'pop', at: .55, focus: [.45, .6], full: [[1.95, 0], [2.75, 1, E.inOut(3)]] }));
    cap(w, add, 'rediseño con *Astro*', { y: L ? 70 : 240, size: L ? 110 : 120, at: .25, out: 2.45 });
  });
  // 3 · cutout — stickers: stamp, pop, drop
  S('cutout', 3.2, '#D6FF3D', (w, add) => {
    const L = land(), ol = K.div(w, `left:-40px;right:-40px;top:${K.H * .1}px;font-size:${L ? 420 : 330}px;line-height:.86;color:transparent;-webkit-text-stroke:3px rgba(17,18,20,.16);text-align:center;white-space:nowrap`, '¡NUEVA!<br>¡NUEVA!<br>¡NUEVA!');
    ol.className = 'k-display';
    add(K.kit.cutout(w, { src: IMG + 'np_laptop_cutout.png', x: K.W * (L ? .42 : .5), y: K.H * (L ? .52 : .5), w: L ? 560 : 700, at: .15, rot: -5 }));
    add(K.kit.cutout(w, { src: MED + 'sticker_94.png', x: K.W * (L ? .7 : .74), y: K.H * (L ? .3 : .27), w: L ? 300 : 330, at: .8, enter: 'pop', rot: 8 }));
    add(K.kit.cutout(w, { src: MED + 'np_logo_dark.png', x: K.W * (L ? .76 : .3), y: K.H * (L ? .72 : .72), w: L ? 250 : 300, at: 1.3, enter: 'drop', rot: -8 }));
  });
  // 4 · cardWall — "scroll." poster wall with dolly in, glide and a highlighted card
  S('cardWall', 4.8, '#F2F2EF', (w, add) => {
    add(K.kit.cardWall(w, { items: MIX, highlight: [[2.5, 'center', 1.3]], ring: 'var(--k-accent)' }));
    const band = K.div(w, `left:0;right:0;top:${K.H * (land() ? .8 : .78)}px;height:${land() ? 64 : 70}px;background:#111214;z-index:20;overflow:hidden`);
    const tick = K.div(band, `left:0;top:0;white-space:nowrap;font:600 ${land() ? 30 : 32}px/${land() ? 64 : 70}px "Geist Mono",monospace;color:#fff;letter-spacing:.06em`, ('SIGUE BAJANDO · ').repeat(18));
    add({ update(lt) { tick.style.transform = `translateX(${-((lt * 220) % 600)}px)`; } });
    // caption above the centre so the highlighted card (it lifts at the screen centre) stays readable under it
    const cy = K.H * (land() ? .15 : .27);
    K.div(w, `left:${K.W * .5 - 520}px;top:${cy + 100 - 260}px;width:1040px;height:520px;background:radial-gradient(closest-side,rgba(242,242,239,.92),rgba(242,242,239,0));z-index:25`);
    cap(w, add, 'scroll.', { y: cy, size: land() ? 230 : 210, at: 1.15 });
  });
  // 5 · carousel — 3D ring, focus events bring cards to the front
  S('carousel', 4.2, '#F2F2EF', (w, add) => {
    add(K.kit.carousel(w, { items: [CARDS[0], NP[3], CARDS[5], NP[6], CARDS[1], NP[10], CARDS[2], NP[0], CARDS[4]], y: K.H * (land() ? .58 : .55), focus: [[1.5, 2], [2.8, 6]] }));
    cap(w, add, 'proyectos *reales*', { y: land() ? 70 : 250, size: land() ? 110 : 116, at: .3 });
  });
  // 6 · fan — fly in → stack, morph to grid, then a fan, explode out
  S('fan', 4.8, '#F2F2EF', (w, add) => {
    add(K.kit.fan(w, { items: [CARDS[0], NP[4], CARDS[5], NP[7], CARDS[1], NP[1], CARDS[2], NP[9]], y: K.H * (land() ? .57 : .55), layout: [[0, 'stack'], [1.35, 'grid'], [2.6, 'fan']], out: 3.95 }));
    cap(w, add, 'tu web, *a medida.*', { y: land() ? 60 : 240, size: land() ? 104 : 112, at: .2, out: 3.9 });
  });
  // 7 · grid — one clip split into tiles, diagonal cascade in and out
  S('grid', 3.6, '#111214', (w, add) => {
    add(K.kit.grid(w, { clip: CL + 'c3294', out: 2.85 }));
    cap(w, add, 'cada *detalle*', { y: K.H * (land() ? .78 : .76), size: land() ? 120 : 130, color: '#fff', at: .7, out: 2.8 });
  });
  // 8 · textMask — footage through "WEB", per-letter rise, zoom-through into the clip
  S('textMask', 4.0, '#111214', (w, add) => {
    add(K.kit.textMask(w, { text: 'WEB', clip: CL + 'c3293', in: .5, zoom: [[0, 1], [1.7, 1.07, E.glide], [2.7, 60, E.expoIn]], focus: [.5, .55], stroke: 'rgba(255,255,255,.35)' }));
  });
  // 9 · spin — product spin of the laptop cut-out with smear + floor shadow, a second spin later; a card spin beside it
  S('spin', 3.6, '#2B4BFF', (w, add) => {
    const L = land();
    add(K.kit.spin(w, { src: IMG + 'np_laptop_cutout.png', cutout: true, x: K.W * (L ? .34 : .5), y: K.H * (L ? .55 : .42), w: L ? 540 : 620, spins: [[0, 1, 1.2], [2.3, 1, .9]] }));
    add(K.kit.spin(w, { src: MED + 'lh_despues.jpg', x: K.W * (L ? .74 : .5), y: K.H * (L ? .52 : .755), w: L ? 340 : 300, h: L ? 500 : 400, at: .45, turns: 1, dur: 1.1, back: '#111214', focus: [.5, .15] }));
    cap(w, add, 'rinde *94*', { y: L ? 60 : 230, size: L ? 120 : 130, color: '#fff', at: .9 });
  });
  // 10 · beforeAfter — antes / después divider wipe with a slant
  S('beforeAfter', 4.0, '#111214', (w, add) => {
    add(K.kit.beforeAfter(w, { a: IMG + 'np_3292_2s.jpg', b: IMG + 'np_3294_2s.jpg', slant: 7, focus: [.5, .4] }));
  });
  // 11 · splitScreen — 3 panels slide in from alternating sides with labels
  S('splitScreen', 3.8, '#111214', (w, add) => {
    add(K.kit.splitScreen(w, { items: [MED + 'web_antes.jpg', MED + 'web_despues.jpg', MED + 'lh_despues.jpg'], labels: ['Antes', 'Después', land() ? null : 'Lighthouse 94'], out: 3.15,   // 16:9: the full Lighthouse column speaks for itself
      labelAlign: 'right', focus: [[.35, .4], [.45, .55], [.5, 0]] }));
  });

  K.BG = BG;
  K.start({ format: Q.get('fmt') || '9x16', fps: 30, dur: T });
})();
