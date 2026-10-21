/* captions_test — word-synced Spanish captions from `katana transcribe` over North Pearl footage.
   0–6.3 s karaoke style (active word in accent), 6.3–12.5 s bold style (box slides word to word). */
(function () {
  const { E } = K;
  const A = '../assets/';
  K.theme = { bg: '#0d0d0f', accent: '#FF6225', accent2: '#FF6225' };
  K.music = { src: 'projects/captions_test/assets/voice.wav', at: 0, gain: 0, fadeOut: .2 };   // the voice is the soundtrack

  const TR = (K.loadJSON(A + 'voice_words.json') || { words: [] }).words;
  const first = TR.filter((w) => w.start < 6.3), second = TR.filter((w) => w.start >= 6.3);

  K.scene({ id: 'cap', t0: 0, t1: 12.5,
    build(root, add) {
      const w = K.div(root, 'inset:0');
      add(K.kit.clip(w, { clip: A + 'clips/lap', focus: [.5, .45], zoom: [[0, 1.12], [12.5, 1.02, E.glide]] }));
      K.div(w, 'inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,0) 30%,rgba(0,0,0,.15) 55%,rgba(0,0,0,.55))');
      // y 1380: below the bright laptop screen, above the Reels bottom safe line (1500)
      add(K.kit.captions(w, { words: first, style: 'karaoke', highlight: '#FF6225', y: 1380, stroke: 6 }));
      add(K.kit.captions(w, { words: second, style: 'bold', boxColor: '#FF6225', y: 1380, stroke: 6 }));
    } });
  K.start({ format: '9x16', fps: 30, dur: 12.5 });
})();
