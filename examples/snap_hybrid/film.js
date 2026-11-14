/* snap_hybrid — engine test (2026-11-13): a snapcn scene rendered by Remotion (`./katana remotion snap_hybrid
   NP-GatherLockup gather`) used as a clip inside a Katana film, with Katana's own animation on top of it:
   the whole snapcn frame is a sticker that PEELS off; a field floods underneath; a line is typed; the button slams in. */
(function () {
  K.setFormat('16x9');
  const { E, p, div, lerp } = K, A = K.anim, W = 1920, H = 1080, FPS = 24, F = (f) => f / FPS;
  const NP = { ink: '#071315', cream: '#EFE4CF', orange: '#FF6225', teal: '#79C5BE', deep: '#1F6F72' };
  K.fonts = ['500 100px "Poppins"', '600 100px "Poppins"', 'italic 400 100px "Instrument Serif"'];
  K.theme = { bg: NP.orange }; K.BG = NP.orange; K.lens = false;
  const PEEL = [.03, .2, .46, .74, .93, 1], F0 = 54;                        // peel poses per frame, starting at frame 54 (2.25 s)
  let S = {};
  K.scene({ id: 'hybrid', t0: 0, t1: 5,
    build(root, add) {
      const w = div(root, `left:0;top:0;width:${W}px;height:${H}px;overflow:hidden`);
      // underneath: North Pearl's own card
      const u = S.under = div(w, `left:0;top:0;width:${W}px;height:${H}px;background:${NP.orange}`);
      S.flood = A.flood(u, { x: 420, y: 300, colors: [NP.cream, NP.orange, NP.cream], ink: NP.ink, line: 6, gap: .18 });
      S.t = div(u, `left:150px;top:330px;font:500 150px/1.02 "Poppins";letter-spacing:-.05em;color:${NP.ink};white-space:pre`);
      S.em = div(u, `left:150px;top:640px;font:italic 400 170px/1 "Instrument Serif";letter-spacing:-.02em;color:${NP.deep};white-space:pre;transform-origin:0 60%`, 'a la medida.');
      S.cta = div(u, `left:1500px;top:860px;transform-origin:50% 50%`, `<div style="font:600 64px 'Poppins';letter-spacing:-.04em;color:${NP.cream};background:${NP.ink};border-radius:999px;padding:26px 60px;white-space:nowrap">Escríbenos</div>`);
      // on top: the snapcn scene, as a sticker
      S.top = div(w, `left:0;top:0;width:${W}px;height:${H}px`);
      S.clip = add(K.kit.clip(S.top, { clip: '../assets/clips/gather', push: 0 }));
      S.peel = A.peel(w, { el: S.top, x: 0, y: 0, w: W, h: H, angle: 30, r: 0, back: NP.cream, ink: NP.ink, line: 4, shade: .34, flyDist: 2600 });
    },
    update(lt) {
      const n = Math.round(K.TQ(lt) * FPS) - F0;                              // the fold is held still inside each frame: crisp poses
      S.peel.set(n < 0 ? 0 : PEEL[Math.min(n, PEEL.length - 1)] * S.peel.U, p(lt, F(F0 + 4.6), F(F0 + 9)));
      S.flood.set(p(lt, F(F0 + 5), F(F0 + 13)));
      S.t.style.visibility = lt < F(F0 + 8) ? 'hidden' : 'visible'; A.ghostType(S.t, 'Tu web,\nhecha', lt, F(F0 + 8), F(F0 + 20), { seed: 3 });
      const q = A.pop(S.em, lt, F(F0 + 22), { c: false, from: 1.5, r0: -6, d: .36, sq: .12 }); void q;
      A.slamTo(S.cta, lt, F(F0 + 34), { from: 2.4, rot: -18, rest: -4, d: .15 });
      if (lt > F(F0 + 44)) S.cta.style.transform += ` scale(${(1 + .04 * Math.sin((lt - F(F0 + 44)) * 7)).toFixed(4)})`;
    } });
  K.start({ format: '16x9', fps: 24, dur: 5 });
})();
