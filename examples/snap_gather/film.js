/* snap_gather — snapcn's free "Gather Lockup" scene (MIT, https://snapcn.dev/docs/scenes/gather-lockup) ported to the
   Katana engine as an engine test (2026-11-13). gather_data.js is snapcn's own data.ts compiled as-is (pose tables
   measured at 24 fps); this file is a line-for-line port of its ~120-line React renderer. The same scene rendered by
   Remotion lives in NP_Remotion (composition NP-GatherLockup). Compare: ./katana match <remotion.mp4> <ours.mp4> --every 0.125 */
(function () {
  K.setFormat('16x9');
  const { TILES, WORDS, LOGO, FRAMES, RATE } = GATHER, NP = { ink: '#071315', cream: '#EFE4CF', orange: '#FF6225' };
  const LINES = [['Lanza'], ['tu', 'web'], ['en', 'código']], WORDMARK = 'northpearl', TRACK = -0.03;
  const CAPTIONS = ['Rediseño', 'Tienda', 'Landing', 'Reservas', 'Portafolio', 'Catálogo', 'Blog'];
  const IMAGES = Array.from({ length: 15 }, (_, i) => `../assets/img/g${String(i + 1).padStart(2, '0')}.jpg`), UNIT = 2000;
  K.fonts = ['600 100px "Inter Tight"', '500 100px "Inter Tight"']; K.theme = { bg: NP.ink }; K.BG = NP.ink; K.lens = false;
  const pose = (keys, f) => { let hit; for (const k of keys) if ((k[0] ?? 0) <= f) hit = k; return hit; };
  const reveal = (word, n, split) => { const shown = n >= 6 ? word.length : n >= 4 ? word.length - 1 : Math.ceil(word.length / 3); return split ? [word.slice(0, shown - 1), word.slice(shown - 1, shown)] : [word.slice(0, shown), '']; };
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let S = {};
  K.scene({ id: 'gather', t0: 0, t1: 2.5,
    build(root) {
      const w = K.div(root, 'left:0;top:0;width:1920px;height:1080px;overflow:hidden');
      S.tiles = TILES.map((tile) => { const box = K.div(w, `left:0;top:0;width:${UNIT}px;overflow:hidden;opacity:${tile.opacity};transform-origin:0 0`), imgs = {};
        for (const k of tile.keys) if (!imgs[k[1]]) imgs[k[1]] = K.img(box, IMAGES[k[1] % IMAGES.length], 'max-width:none;object-fit:cover;display:none');
        return { box, imgs }; });
      S.svg = K.div(w, 'left:0;top:0;width:1920px;height:1080px');
    },
    update(lt) {
      const frame = Math.min(FRAMES - 1, Math.floor(lt * RATE + 1e-6)), words = LINES.flat(); let h = '';
      TILES.forEach((tile, i) => { const k = pose(tile.keys, frame), T = S.tiles[i];
        if (!k || frame > tile.until) { T.box.style.display = 'none'; return; }
        const [, pic = 0, x = 0, y = 0, tw = 0, th = 0, bx = 0, by = 0, bw = 0, bh = 0] = k;
        T.box.style.display = 'block'; T.box.style.height = (UNIT * th / tw) + 'px'; T.box.style.transform = `translate(${x}px, ${y}px) scale(${tw / UNIT})`;
        for (const p in T.imgs) { const im = T.imgs[p]; if (+p !== pic) { im.style.display = 'none'; continue; }
          im.style.cssText = `position:absolute;display:block;max-width:none;object-fit:cover;left:${(bx - x) / tw * 100}%;top:${(by - y) / th * 100}%;width:${bw / tw * 100}%;height:${bh / th * 100}%`; }
        if (pic <= 6) h += `<g opacity="${tile.opacity}"><circle cx="${x + 6}" cy="${y + th + 18}" r="4.5" fill="${NP.cream}" opacity=".5"/><text x="${x + 19}" y="${y + th + 23}" fill="${NP.cream}" opacity=".45" style="font-family:'Inter Tight';font-size:15px;font-weight:500;text-rendering:geometricPrecision">${esc(CAPTIONS[i])}</text></g>`; });
      WORDS.forEach((wd, i) => { const k = pose(wd.keys, frame), word = words[i]; if (!k || !word || frame > wd.until) return;
        h += `<text x="${k[1]}" y="${k[2]}" text-anchor="${wd.anchor}" fill="${NP.cream}" style="font-family:'Inter Tight';font-weight:600;font-size:${k[3]}px;letter-spacing:-0.02em;text-rendering:geometricPrecision">${esc(word)}</text>`; });
      const mark = pose(LOGO.mark, frame), word = pose(LOGO.word, frame), shift = -0.28 * LOGO.wordSize * (WORDMARK.length - 6);
      if (mark) h += `<g transform="translate(${mark[1] + shift} ${mark[2]}) scale(${LOGO.size / 100})"><path d="${NP_MARK_PATH}" fill="${NP.orange}" fill-rule="evenodd"/></g>`;
      if (word) { const [head, tail] = reveal(WORDMARK, word[1] ?? 0, word[2] ?? 0);
        h += `<text x="${word[3] + shift}" y="${word[4]}" fill="${NP.cream}" style="font-family:'Inter Tight';font-weight:600;font-size:${LOGO.wordSize}px;letter-spacing:${TRACK}em;text-rendering:geometricPrecision">${esc(head)}${tail ? `<tspan dx="${LOGO.gap}">${esc(tail)}</tspan>` : ''}</text>`; }
      S.svg.innerHTML = `<svg viewBox="0 0 1920 1080" width="1920" height="1080" style="position:absolute;inset:0">${h}</svg>`;
    } });
  K.start({ format: '16x9', fps: 24, dur: 2.5 });
})();
