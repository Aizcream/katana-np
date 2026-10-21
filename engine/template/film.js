/* film.js — the edit. Times in seconds; cuts on the beat grid (K.beat). One K.scene per shot; transitions between them.
   This template only uses the core so it renders even without the kit: replace it with your scenes. */
(function () {
  const { E, p, div, scene, cue, beat } = K;
  K.bpm = 120; K.beatOffset = 0;                       // from the reference / music analysis
  K.theme = { bg: '#F2F2EF', accent: '#2B4BFF' };
  K.BG = [[0, '#F2F2EF'], [beat(4), '#2B4BFF'], [beat(6), '#F2F2EF']];   // colour-block switches on beats

  // word-by-word line: each word pops in on its own beat-subdivision (scale from 1.12 + blur → sharp), rises 24 px
  const words = (root, list, { y, size = 150, color = 'var(--k-fg)', step = .25, at = 0 }) => {
    const line = div(root, `left:0;right:0;top:${y}px;text-align:center;font-size:${size}px;color:${color}`);
    line.className = 'k-display';
    return list.map((w, i) => {
      const s = K.el('span', 'display:inline-block;margin:0 .12em', line, w);
      s.className = w.startsWith('*') ? 'k-serif' : '';
      if (w.startsWith('*')) s.textContent = w.replace(/\*/g, '');
      return { s, t0: at + i * step };
    });
  };
  const drive = (ws, lt) => ws.forEach(({ s, t0 }) => {
    const q = E.snappy(p(lt, t0, t0 + .32));
    s.style.opacity = lt < t0 ? 0 : 1;
    s.style.transform = `translateY(${(1 - q) * 24}px) scale(${1.12 - .12 * q})`;
    s.style.filter = q < .98 ? `blur(${(1 - q) * 14}px)` : 'none';
  });

  let A = {}, B = {}, C = {};
  scene({ id: 's1', t0: 0, t1: beat(4),
    build(root) { A.w = div(root, 'inset:0'); A.ws = words(A.w, ['So', 'much', 'to', '*watch.*'], { y: 820, at: .1 }); },
    update(lt) { drive(A.ws, lt); A.w.style.transform = K.about(540, 900, K.zoom(lt, 0, beat(4), 1, 1.06, E.glide)); } });
  scene({ id: 's2', t0: beat(4), t1: beat(6),
    build(root) { B.w = div(root, 'inset:0'); B.ws = words(B.w, ['Nothing', '*to watch.*'], { y: 840, color: '#fff', step: .2, at: 0 }); },
    update(lt) { drive(B.ws, lt); } });
  scene({ id: 's3', t0: beat(6), t1: 5,
    build(root) { C.w = div(root, 'inset:0'); C.ws = words(C.w, ['Katana', '*NP.*'], { y: 840, size: 190, step: .25 }); },
    update(lt) { drive(C.ws, lt); C.w.style.transform = K.about(540, 940, K.zoom(lt, 0, 2, 1.08, 1, E.soft)); } });

  cue('pop', .1); cue('pop', .35); cue('pop', .6); cue('pop', .85);
  cue('whip', beat(4)); cue('hit', beat(6)); cue('sting', beat(6) + .3);
  K.start({ format: '9x16', fps: 30, dur: 5 });
})();
