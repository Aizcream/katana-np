/* voice_test — ElevenLabs voice-over (katana voice say) driving a short North Pearl reel.
   Every cut and accent sits on a word of assets/voz_words.json (exact per-character timings from ElevenLabs). */
(function () {
  const { E } = K;
  const A = '../assets/';
  const W = (K.loadJSON(A + 'voz_words.json') || { words: [] }).words;
  const at = (txt) => { const w = W.find((x) => x.text.replace(/[^\wáéíóúñ]/gi, '').toLowerCase() === txt); return w ? w.start : 0; };
  const T = { en: at('en'), astro: at('astro'), paso: at('pasó'), n81: at('81'), n94: at('94'), escr: at('escríbenos'), link: at('link') };
  const C1 = 2.0, C2 = 5.3, C3 = 8.6, DUR = 12.3;

  K.theme = { bg: '#F2F1EE', accent: '#FF6225', accent2: '#FF6225' };
  K.voice = { src: 'projects/voice_test/assets/voz.wav', at: 0, gain: 0 };
  K.BG = [[0, '#0d0d0f'], [C1, '#F2F1EE']];

  // s1 · ¿Tu web tarda en cargar? — footage, slow push, a "loading" tag
  K.scene({ id: 's1', t0: 0, t1: C1,
    build(root, add) {
      const w = K.div(root, 'inset:0');
      add(K.kit.clip(w, { clip: A + 'clips/lap1', focus: [.5, .5], zoom: [[0, 1.18], [C1, 1.06, E.glide]] }));
      K.div(w, 'inset:0;background:linear-gradient(180deg,rgba(0,0,0,.35),rgba(0,0,0,0) 35%,rgba(0,0,0,.55))');
      add(K.kit.label(w, { text: '4,8 s DE CARGA', at: .45, y: 420, style: 'tag' }));
    } });

  // s2 · En North Pearl la rediseñamos con Astro — browser loads northpearl.co and scrolls
  K.scene({ id: 's2', t0: C1, t1: C2,
    build(root, add) {
      const w = K.div(root, 'inset:0');
      add(K.kit.browser(w, { at: 0, y: 760, w: 900, h: 1000, src: A + 'img/northpearl_full.png', url: 'northpearl.co',
        load: [T.en - C1 + .05, T.en - C1 + .5], scroll: [[1.1, 0], [2.2, .22], [3.2, .4]], rx: 4, enter: 'rise' }));
      add(K.kit.label(w, { text: 'HECHA CON ASTRO', at: T.astro - C2 + (C2 - C1) - .02, y: 1330, style: 'tag' }));
    } });

  // s3 · pasó de 81 a 94 en rendimiento — one big gauge that is AT 81 when "81" is said and lands on 94 with "94"
  K.scene({ id: 's3', t0: C2, t1: C3,
    build(root, add) {
      const w = K.div(root, 'inset:0;transform-origin:0 0');      // camera null: slow push so the hold stays alive
      add({ update(lt) { w.style.transform = K.about(540, 800, K.zoom(lt, 0, C3 - C2, 1, 1.09, E.glide)); } });
      const lh = add(K.kit.lighthouse(w, { at: 0, y: 800, scores: [94], from: [81], labels: ['Rendimiento'],
        countAt: T.n81 - C2 + .12, dur: T.n94 - T.n81 + .1, layout: 'single' }));
      K.addCues(lh, C2, { skip: ['riser', 'whoosh'] });
    } });

  // s4 · Escríbenos, el link está en la bio — logo lockup, the button is pressed on "Escríbenos", the label on "link"
  K.scene({ id: 's4', t0: C3, t1: DUR,
    build(root, add) {
      const w = K.div(root, 'inset:0;transform-origin:0 0');      // camera null: slow push + drift on the end lockup
      add({ update(lt) { w.style.transform = K.about(540, 820, K.zoom(lt, 0, DUR - C3, 1.04, 1.12, E.lin), 0, -18 * lt); } });
      const logo = K.img(w, A + 'img/np_logo_vertical_dark.png', 'left:340px;top:380px;width:400px;transform-origin:50% 50%');
      add({ update(lt) { const q = K.pop(lt, .0, .55); logo.style.transform = `scale(${.6 + .4 * q})`; logo.style.opacity = lt < 0 ? 0 : 1; } });
      add(K.kit.button(w, { text: 'Escríbenos', at: .05, y: 1050, pressAt: T.escr - C3 + .15 }));
      add(K.kit.label(w, { text: 'LINK EN LA BIO', at: T.link - C3, y: 1190, style: 'dot' }));
    } });

  // captions: one overlay scene above everything, white over footage, ink on the light scenes
  K.scene({ id: 'caps', t0: 0, t1: C3, z: 100,
    build(root, add) {
      const w = K.div(root, 'inset:0');
      add(K.kit.captions(w, { words: W.filter((x) => x.start < C1), style: 'bold', boxColor: '#FF6225', y: 1400, stroke: 6 }));
      add(K.kit.captions(w, { words: W.filter((x) => x.start >= C1 && x.start < C3), style: 'bold', boxColor: '#FF6225', color: '#111214',
        shadow: false, y: 1430 }));
    } });

  K.trans.whip({ at: C1, a: 's1', b: 's2', dir: 'left', sfx: true });
  K.trans.push({ at: C2, a: 's2', b: 's3', dir: 'up', sfx: true });
  K.trans.slice({ at: C3, a: 's3', b: 's4', n: 5, dir: 'v', color: '#FF6225', sfx: true });
  K.cue('hit', T.n94 + .05, { gain: .7 });
  K.start({ format: '9x16', fps: 30, dur: DUR });
})();
