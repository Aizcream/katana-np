# type.js — kinetic typography (K.kit.*)

Word-by-word lines, XL headlines, glyph morphs, letter swaps, typing, sticker stacks, captions, odometers and sliced
words: the type layer of a Katana NP film. Demo / test page: `engine/demos/type.html` (`?fmt=16x9` for landscape).

```
./katana gallery engine/demos/type.html 1.6,4.7,7.4,11,13,15.5,17.5,20.45,21.3,23.8,25.32,27.5,30.6,34,38.5,40.8,44.1
```

## Conventions (all ten components)

* Factory: `const c = K.kit.<name>(parent, opts)` → `{ el, update(lt), cues(), dur, size, … }` (+ `prepare(lt)` when it
  paints photos: `words` with `[img:]`, `letterSwap` with an image slot). Inside a scene pass it to `add()` (it is then
  driven automatically, `prepare` awaited) and register its sounds with `K.addCues(c, scene.t0)`:
  ```js
  K.scene({ id: 'hook', t0: 0, t1: 3, build(root, add) {
    const w = K.div(root, 'inset:0');                                   // never style the scene root itself
    const c = add(K.kit.words(w, { text: 'Webs que cargan *rápido.*', at: .2, layout: 'grow', out: 2.5 }));
    K.addCues(c, 0);                                                     // 0 = this scene's t0
  } });
  ```
* **Times are scene-local seconds** (`lt`). `at` = start (default 0). Before `at` the component is `visibility:hidden`.
  `out` = time the exit starts (no `out` → stays until the scene ends). `dur` (returned) = natural length of the
  entrance after `at`.
* **Position**: `x`, `y` are the anchor in film pixels. `align` `'center'|'left'|'right'` decides what `x` is (centre /
  left edge / right edge of the text block); `valign` `'center'|'top'|'bottom'` decides what `y` is (vertical centre /
  top / bottom of the block). Defaults: `x` = frame centre (`left` → `(K.W − maxWidth)/2`), `y` = `0.45·K.H` on 9:16,
  `0.5·K.H` otherwise. The text block's visual centre sits on `y` (line boxes are built so the cap-height middle of a
  single line is exactly at `y`).
* **Sizes** derive from `S = min(K.W, K.H)` (1080 for both 1080×1920 and 1920×1080). `maxWidth` default: `K.W − 2·K.safe().right`
  on 9:16 (820 px — centred text ends inside the Reels right rail), `0.8·K.W` on 16:9. Components marked *auto-fit* pick the largest size
  that fits `maxWidth`, capped by `maxSize`.
* **Theme**: colours default to `var(--k-fg)`, accents to `var(--k-accent / accent2 / accent3)`; fonts to the theme
  faces (`--k-display` Inter Tight, `--k-serif` Instrument Serif, `--k-mono` Geist Mono, `--k-wide` Archivo). Any CSS
  colour string works for colour options.
* **Faces** (`font` option): `'display'` (800, tracking −.045 em), `'serif'` (Instrument Serif *italic*), `'roman'`
  (Instrument Serif upright), `'mono'`, `'wide'` (Archivo 125 % width), `'cond'` (Archivo 62 %). Serif/mono emphasis is
  optically matched: its font size is scaled so its x-height equals the display x-height (≈ ×1.25).
* **Word spacing** (`wordSpace`, em, on `words`, `captions`, `morph`): extra CSS word-spacing added to every space.
  The display faces have a narrow space (.19 em) and negative tracking eats it twice, so without it words run together
  ("¿Tuwebes"). Defaults per base face: `display` .1 · `cond` .08 · `wide` .04 · `serif`/`roman` .04 · `mono` 0 — the
  ink gap then reads ≈ .27 em, like the Katana references. `wordSpace: 0` = the font's own space.
* **Tracking defaults** are chosen so heavy glyphs never touch (L|I, P|I, R|T at weight 900): `words` −.045 (800),
  `headline` −.04, `letterSwap` / `typeOn` pop −.045, `sliced` −.03, `counter` −.04 (all 900). Go tighter only on
  short words without those pairs.
* **Shared exits** (`exit` option, wherever an exit exists): `'up'` (rise + blur + fade), `'down'`, `'blur'` (blur +
  scale 1.1), `'scatter'` (each word/letter flies off rotated), `'zoom'` (scale ×3.4 through camera), `'drop'` (falls
  with rotation), `'cut'` (hard off at `out`). Exits accelerate (`E.in(2.2)`) so the speed peak lands on the cut.
* All animation is a pure function of `lt` (no timers, no CSS transitions). The full seek-order determinism check
  (`--check-determinism`, 191 stills) passes on 9:16. Settle tails end exactly at rest, shakes / digit rolls / vertical
  re-centring land on whole pixels and photos are painted on canvas because Chrome rasters near-identical transforms,
  rotated glyphs and resized `<img>` differently depending on the previous frame. Residual: on 16:9 a few single
  glyph-edge pixels of very large static words differ (≤ 61/255, 1–2 px) — Chrome's GPU path-atlas reuse; they vanish
  with the browser flag `--disable-gpu-rasterization`.
* **Outlines** (`headline` stroke mode, `ghost`, the `{stroke}` class) are drawn with an SVG dilate filter, not
  `-webkit-text-stroke`: the variable fonts have overlapping contours, which text-stroke would show as seams inside
  R, A, Á, K… The outline sits outside the glyph (width = `strokeWidth`) in the text colour.
* `cues()` returns `[{kind, t, gain}]` in scene-local time. Kinds used: `pop`, `popxl`, `tick`, `key`, `hit`, `whoosh`,
  `swoosh`, `zoom`, `glitch`. Every component accepts `cue: false` to return no cues.

---

## 1 · `K.kit.words(parent, opts)` — word-by-word lines (the workhorse)

Markup in `text`:

| markup | result |
|---|---|
| `*everything.*` | emphasis — `em` style (default `'serif'`: Instrument Serif italic, optically matched) |
| `{accent}rápido{/}` | class span. Built-in classes: `serif` `italic` `roman` `mono` `wide` `cond` `display` (faces) · `accent` `accent2` `accent3` `muted` `fg` `bg` `white` (colours) · `box` (highlight pill behind the word, consecutive box words merge into one bar) · `stroke` (outlined — see *Outlines* below) · plus your own via `classes` |
| `[img:assets/img/a.jpg]` | inline rounded photo **tile** at cap height that pops in like a word (r2 "So [tile] much"); the photo settles from a 1.3× zoom. Photos are painted on a canvas (decoded in the component's `prepare`) so frames are identical in any seek order |
| `[img:assets/img/a.jpg\|con Astro]` | inline **pill**: dark pill, round thumbnail + label (r1 "Pick a (photo)") |
| `\n` | forced line break (otherwise lines wrap greedily at `maxWidth`) |

Every word, image or pill is one *item* with its own start time.

| option | default | meaning |
|---|---|---|
| `text` | `''` | markup above |
| `at` | `0` | first word |
| `step` | `K.spb()/2` (0.25 s at 120 bpm) | seconds between word starts |
| `times` | — | explicit start time per item (scene-local s); items beyond the list continue with `step` |
| `beats` | — | per-item offsets **in beats from `at`**: item i starts at `at + beats[i]·K.spb()` (snap `at` to the grid: `at: K.beat(8) − scene.t0`) |
| `enter` | `'pop'` | `'pop'` scale 1.14→1 + blur 0.1 em→0 + rise 0.19 em, `E.snappy` · `'rise'` letters rise inside a mask (staggered) · `'blur'` long blur-in + scale 1.1→1 · `'slide'` from the right with horizontal smear (`dir: -1` from the left) · `'drop'` falls from above, bounces twice, squash on landing · `'type'` letters type in (each slides 0.3 em + flashes `typeColor`) · `'scatter'` letters fly in from random directions with rotation (r2 "watch.") |
| `enterDur` | pop .3 · rise .55 · blur .5 · slide .34 · drop .5 · type .2 (per letter) · scatter .55 | entrance length per word |
| `glyphStagger` | .022 (scatter .03) | letter stagger for `rise` / `scatter` |
| `cps` | `18` | letters/s for `enter:'type'`; with no `step/times/beats`, words are timed continuously from the letter count |
| `typeColor` | `var(--k-accent)` | flash colour of a freshly typed letter |
| `layout` | `'final'` | `'final'`: words appear at their final positions · `'grow'`: each line re-centres smoothly as words arrive (Katana "Stick it" → "Stick it on" → "Stick it on *everything.*") and the block re-centres vertically as lines arrive; the first item to arrive in a line lands centred, and an item that arrives **after** its right-hand neighbours (via `times`) opens its gap and pushes them aside — r2 "So [tile] much": `times` with the tile later than the next word |
| `growDur` | `.32` | re-centring glide per word |
| `vgrow` | `true` | vertical re-centring in `grow` (false = lines stay put) |
| `size` | `0.15·S` = 162 px | font size (px) |
| `maxWidth` | 900 (9:16) / 0.8·K.W | wrap width |
| `lineHeight` | `.95` | × size |
| `font` · `weight` · `tracking` | `'display'` · 800 · −.045 | base face |
| `wordSpace` | per face (display .1 em) | extra word spacing, see *Conventions* |
| `split` | `true` for `rise` / `type` / `scatter` | build per-letter spans (needed by the letter entrances) |
| `color` | `var(--k-fg)` | text colour |
| `upper` | `false` | uppercase (serif words keep their case) |
| `em` | `'serif'` | class (or array of classes) applied to `*…*` words, e.g. `'accent'`, `['serif','accent']`, `'box'` |
| `classes` | — | custom classes `{ hot: { face:'serif', color:'#FF4D2E', box:true, boxColor:'#111', boxText:'#fff', stroke:false } }` |
| `boxColor` · `boxText` | `var(--k-accent)` · `#fff` | highlight pill colours for `{box}` (the pill wipes in from the left with the word; consecutive box words share one bar whose bridge grows when the next word arrives) |
| `imgShape` | `'tile'` | inline images: `'tile'` (portrait 0.74:1, 1 em tall) · `'circle'` (0.8 em) · `'wide'` (1.45:1) |
| `imgAspect` · `imgHeight` | — | override tile aspect / height (em) |
| `pillBg` · `pillText` | `var(--k-fg)` · `var(--k-bg)` | pill colours |
| `shadow` | — | `true` (soft text shadow for footage) or a CSS `text-shadow` |
| `drift` · `push` | `0` · `0` | slow block motion after `at`: px/s vertical (negative = up) · scale growth per second (e.g. `.02`) |
| `out` · `exit` | — · `'up'` | exit start · shared exits + `'wipe'` (each line erased left → right) |
| `exitDur` · `exitStagger` | .32 (wipe .45) · .035 s per word (wipe .08 per line) | |
| `cue` · `cueGain` | `'pop'` · .55 | cue kind per word (`false` = none) |
| `x y align valign z` | see conventions | |

Returns `{ el, update, cues, dur, size, items, lines, times }` — `items[i].t` is each word's start (use it to sync
other things), `items[i].el` the word span.

Cues: one `pop` per word (`.9` for images), `tick` per letter with `enter:'type'`, `whoosh` (or `swoosh` for wipe) at `out`.

```js
// hook line that builds and re-centres, serif emphasis, exits up
add(K.kit.words(w, { text: 'Webs que cargan *rápido.*', at: .2, layout: 'grow', out: 2.45 }));
// inline photo tile + pill + highlight box; scatter exit. grow + times: the tile (item 1) lands after "web," (item 2)
// and pushes it aside (r2 "So [tile] much"). Items = words, images and pills in reading order.
add(K.kit.words(w, { text: 'Tu [img:assets/img/np_3292_2s.jpg] web,\nrediseñada [img:assets/img/np_3294_6s.jpg|con Astro]\n{box}desde cero.{/}',
  layout: 'grow', times: [.15, .62, .37, .86, 1.08, 1.34, 1.5], exit: 'scatter', out: 2.4 }));
// left-aligned paragraph, glyph-mask rise, wipe out, white on a colour block (K.BG)
add(K.kit.words(w, { text: 'Rediseño completo:\nmás rápido,\nmejor *SEO.*', enter: 'rise', align: 'left', color: '#fff', step: .16, exit: 'wipe', out: 2.3 }));
// on the beat: words on beats 0, ½, 1, 2 after `at` (t0 = this scene's t0; `at` is scene-local)
add(K.kit.words(w, { text: 'link en la bio', at: K.beat(16) - t0, beats: [0, .5, 1, 2], enter: 'drop' }));
```

## 2 · `K.kit.headline(parent, opts)` — one XL word, punch-in (auto-fit)

| option | default | meaning |
|---|---|---|
| `text` | — | one word / short phrase (single line) |
| `mode` | `'fill'` | `'fill'` solid · `'stroke'` outline only · `'stretch'` Archivo width axis animates `stretchFrom`→`stretchTo` |
| `at` | 0 | punch start |
| `punch` · `punchDur` | 1.25 · .42 | start scale → 1 with `K.pop` overshoot (≈1.5 % undershoot), blur 0.12 em → 0 over .22 s |
| `shake` | `false` | `true` (= .03·size) or an amplitude (fraction of size): decaying impact shake + slight rotation on landing |
| `font` · `weight` · `tracking` | `'display'` (`'wide'` for stretch) · 900 · −.04 (wide/cond/serif −.02, roman −.025, mono −.04) | |
| `upper` | false | |
| `size` | auto-fit to `maxWidth`, capped by `maxSize` | |
| `maxWidth` | K.W − 140 (9:16) / 0.84·K.W | |
| `maxSize` | 0.36·S (9:16) / 0.42·S | |
| `lineHeight` | .9 | |
| `color` | `var(--k-fg)` | fill or stroke colour |
| `strokeWidth` | max(2, .012·size) | stroke mode |
| `fillAt` · `fillDur` · `fillColor` | — · .4 · color | stroke mode: the fill wipes up from the bottom at `fillAt` |
| `stretchFrom` · `stretchTo` · `stretchDur` | 62 · 125 · .75 | stretch mode (% width axis, `E.snappy`) |
| `out` · `exit` · `exitDur` | — · `'blur'` · .35 | shared exits (`'zoom'` is great into a cut) |

Cues: `popxl` at `at` (`hit` when `shake`), `whoosh` at `out`. Returns `size` (the fitted px).

```js
add(K.kit.headline(w, { text: 'RÁPIDO', at: .1, shake: true }));
add(K.kit.headline(w, { text: 'SEO', mode: 'stroke', color: '#D6FF3D', fillAt: .45, exit: 'zoom', out: .95 }));
add(K.kit.headline(w, { text: 'ASTRO', mode: 'stretch', at: .1 }));
```

## 3 · `K.kit.ghost(parent, opts)` — giant outlined background word

Thin-stroke, muted, slowly drifting; put it first in the scene (behind everything). Optional repeated rows that
drift in alternating directions (r3 "POP!" wall). Uses opacity on purpose (it is texture, not content).

| option | default | meaning |
|---|---|---|
| `text` | — | word (uppercased by default, `upper: false` to keep) |
| `rows` | 1 | number of rows |
| `repeat` | `rows > 1` | repeat the word along each row (seamless loop); `false` = one centred word |
| `sep` | `'  '` | separator between repeats (e.g. `' ✦ '`) |
| `size` | 0.2·K.H (9:16) / 0.38·K.H | |
| `font` · `weight` · `tracking` | `'display'` · 800 · −.03 | `'wide'` gives the r3 look |
| `lineHeight` · `gap` | .9 · .04·size | row pitch |
| `y` · `x` | 0.45·K.H (9:16) / 0.5·K.H · K.W/2 | block centre — by default exactly behind the default text line of the other components (`x` only for a single non-repeating word; a single word at the default size is wider than a 9:16 frame and bleeds off both edges on purpose, like r2's "SCROLL") |
| `color` · `strokeWidth` | `var(--k-fg)` · max(1.5, .0065·size) | outline |
| `fill` | — | a colour → solid muted fill instead of outline |
| `opacity` | .16 | final opacity |
| `drift` · `alt` · `driftY` | 26 px/s · true · 0 | horizontal drift, alternate row direction, vertical parallax px/s |
| `at` · `enterDur` | 0 · .8 | fade/scale/blur in |
| `out` · `exitDur` | — · .5 | fade out |

No cues.

```js
add(K.kit.ghost(w, { text: 'SEO ✦', rows: 5, font: 'wide', drift: 40, opacity: .3, size: 300 }));
add(K.kit.ghost(w, { text: 'lenta', opacity: .12 }));   // one giant word behind a line
```

## 4 · `K.kit.morph(parent, opts)` — glyph-swap morph A → B (single line)

Per letter slot, left → right with jitter: the new letter appears over the old one in a transit face (upright serif,
serif italic or mono — r2 "So much" → "Nothing"), for `scrambleFrames` frames it shows random glyphs, then each slot
snaps back to the display face; every slot's width interpolates smoothly (`E.width`), so the line re-flows and stays
centred. Kerning of both words is preserved.

| option | default | meaning |
|---|---|---|
| `from` · `to` | — | the two strings (any lengths; extra slots grow from / shrink to 0 width) |
| `at` | 0 | A appears (pop per letter) |
| `enter` | `'pop'` if `morphAt − at > .25`, else `'none'` | entrance of A |
| `morphAt` · `morphDur` | at + .9 · .5 | morph window (transit faces in the first half, display faces in the second) |
| `faces` | `['roman','serif','serif','roman','mono','serif']` | transit faces picked per slot (deterministic by `seed`) |
| `scramble` · `scrambleFrames` · `seed` | true · 2 · 1 | random-glyph frames at the start of each slot's swap |
| `font` · `weight` · `tracking` | `'display'` · 850 · −.05 | |
| `wordSpace` | per face (display .1 em) | extra width of space slots, see *Conventions* |
| `size` | auto-fit (both strings) to `maxWidth`, capped `maxSize` = .17·S (9:16) / .15·S | |
| `color`, `x y align valign` | | |
| `out` · `exit` · `exitDur` · `exitStagger` | — · `'up'` · .3 · .025 | |

Cues: `pop` at `at`, `glitch` at `morphAt`, `pop` at `morphAt + .55·morphDur`. Chain A → B → C with two morphs:
the first gets `out: t, exit: 'cut'`, the second `from: B, to: C, at: t, enter: 'none'`.

```js
add(K.kit.morph(w, { from: 'Web lenta.', to: 'Web rápida.', at: .15, morphAt: 1.25, morphDur: .55 }));
add(K.kit.morph(w, { from: 'Antes', to: 'Después', font: 'mono', weight: 500, size: 70, color: '#2B4BFF', y: 1100, morphAt: 1.6 }));
```

## 5 · `K.kit.letterSwap(parent, opts)` — a word with one letter replaced by a slot

The letter at `index` (default: first `o`/`O`/`0`) becomes a slot sitting on the baseline like an "o" (r2 "N◎thing"):
a glossy **ring loader** with circular text (default), an **image/logo**, or your own **builder**. Optional
**zoom-through**: from `zoomAt` the whole word scales about the slot centre (log-space, accelerating, speed peak at the
end) until the ring's hole covers the frame — cut to the next shot at `zoomAt + zoomDur`.

| option | default | meaning |
|---|---|---|
| `text` · `index` | `'Nothing'` · first o | |
| `slot` | `'ring'` | `'ring'` · `{ img, fit: 'cover'\|'contain'\|'fill', position: '50% 50%', crop: [x, y, w, h] (source rect as fractions of the image, e.g. to cut a logo symbol out of a lock-up), radius: '50%', bg, hole: .5 }` — painted on a canvas (seek-order safe); legacy `css: '…'` (extra CSS on an `<img>`) still works but Chrome may resample that `<img>` differently depending on seek order · `(box, D) => ({ update(lt, spin, zoomP) {} })` (build into `box`, a D×D px div centred on the slot) |
| `ringText` · `ringColor` | `'LOADING · LOADING · LOADING · '` · `var(--k-accent)` | circular mono text (always uppercased) and ring colour |
| `spin` · `gapSpin` | 50 · 300 deg/s | circular text rotation · light "loading" arc rotation |
| `slotSize` · `slotPad` · `slotDy` | cap·1.06 em · .035 em · 0 em | slot diameter, side bearing, vertical nudge |
| `slotDelay` · `slotSpin` | index·stagger + .1 · 0 | slot pops (K.pop + −110° spin) after the letters; constant spin deg/s (image slots) |
| `at` · `stagger` · `enter` | 0 · .035 · `'pop'` | letters pop in left → right (`'none'` = static) |
| `font` · `weight` · `tracking` | display · 900 · −.045 | |
| `size` | auto-fit incl. slot + ring text, capped .3·S (9:16) / .26·S | |
| `zoomAt` · `zoomDur` · `zoomTo` | — · .55 · auto (hole ≥ frame diagonal) | zoom-through |
| `reveal` · `revealAlways` | — · false | CSS background painted inside the ring's hole (fades in as the zoom starts): use the next scene's colour/image (`'#2B4BFF'`, `'url(assets/img/x.jpg)'`) so the hole becomes the next shot |
| `out` · `exit` · `exitDur` | — · `'up'` · .3 | ignored when `zoomAt` is set |

Returns `center` ({x, y} slot centre in film px — e.g. to start a match-cut there) and `slot` (the slot element).
Cues: `pop` at `at`, `popxl` when the slot lands, `zoom` at `zoomAt + zoomDur`.

```js
add(K.kit.letterSwap(w, { text: 'Cargando', ringText: 'CARGANDO · CARGANDO · CARGANDO · ', at: .15, zoomAt: 2.3, zoomDur: .6, reveal: '#2B4BFF' }));
// the O of NORTH = the North Pearl symbol (top part of the vertical logo, cut out with crop; white logo → dark scene)
add(K.kit.letterSwap(w, { text: 'NORTH', color: '#fff', slotSize: .84, slot: { img: 'assets/img/np_logo_vertical.png', fit: 'fill', radius: 0, crop: [.2094, 0, .5882, .5225] } }));
```

## 6 · `K.kit.typeOn(parent, opts)` — letter-by-letter build / caret typing (single line)

`mode:'pop'`: wordmark build (r1 P → PE → PEEL): each letter slams in (scale 1.5 → 1 with overshoot, blur, small
drop) and the word re-centres smoothly as it grows. `mode:'type'`: plain typing (letters appear on the frame, tiny
pop), blinking caret, optional human cadence, exit by deleting.

| option | default | meaning |
|---|---|---|
| `text` · `mode` | — · `'pop'` | |
| `at` · `cps` | 0 · 7 (pop) / 16 (type) | letters per second (spaces count) |
| `times` · `beats` | — | per-letter times (local s) · per-letter offsets in beats from `at` |
| `cadence` · `seed` | — · 4242 | `true` or a duration (s): human rhythm via `K.cadence` (longer gaps at spaces) |
| `grow` | `align !== 'left'` | re-centre while growing |
| `caret` · `caretColor` · `caretFrom` · `blink` | `mode==='type'` · `var(--k-accent)` · at · 1.7 Hz | caret blinks before typing, solid while typing / deleting, blinks after |
| `font` · `weight` · `tracking` · `wordSpace` | display · 900 (pop) / 600 (type) · −.045 / −.025 · .07 em | extra width added to spaces |
| `lineHeight` | .95 | |
| `upper` | false | |
| `size` | pop: auto-fit to `maxWidth`, cap `maxSize` .3·S (9:16) / .26·S · type: min(.075·S, fit) | |
| `out` · `exit` · `deleteCps` · `exitDur` | — · `'delete'` (type) / `'up'` (pop) · cps·1.8 · .3 | `'delete'` removes letters from the end (caret follows) |

Cues: `pop` per letter (pop mode) / `key` per letter (type mode).

```js
add(K.kit.typeOn(w, { text: 'NORTH PEARL', at: .15, cps: 9, color: '#fff' }));
add(K.kit.typeOn(w, { text: 'webs que cargan rápido', mode: 'type', at: 1.35, cadence: 1.1, y: 1040, out: 2.85, deleteCps: 40 }));
```

## 7 · `K.kit.stickerWords(parent, opts)` — stacked boxed words (r3 "MOTION / DESIGN / SKILLS")

Each line in a coloured box with a slight rotation; boxes stamp in one by one (slide from alternating sides with
horizontal smear, scale 1.32 → 1 overshoot, rotation settles, the hard shadow grows as it lands), the stack shakes on
each landing. Each box is the cap height + `padY` above and below with the caps optically centred; each box tucks up
under the one above as far as it can **without covering that line's letters** (rotations included) — the boxes
overlap in their padding, never on the text, and later lines sit on top.

| option | default | meaning |
|---|---|---|
| `lines` | — | `['Webs','que','venden']` or `[{ text, bg, color, r }]`; or `text` with `\n` |
| `at` · `step` | 0 · .2 | |
| `colors` | `[{bg:accent, fg:#fff}, {bg:fg, fg:bg}, {bg:accent2, fg:fg}, {bg:accent3, fg:#fff}]` | palette cycled per line |
| `rot` | `[-4, 3, -2.2, 2.6, -3]` | degrees per line |
| `font` · `weight` · `tracking` · `upper` | `'wide'` · 900 · −.015 · true | |
| `size` | auto-fit: the line with the most characters + one "M" (room for the padding) fits `maxWidth` (K.W − 200 on 9:16, .6·K.W), capped by `maxSize` .21·S | |
| `padX` · `padY` | .2 · .16 em | box padding: sides · above the cap height and below the baseline (`upper:false` adds room for descenders) |
| `padTop` · `padBottom` | `padY` · `padY` | override the top / bottom margin separately |
| `clearance` · `jitter` | .1 em · .12 em | closest a box may come to the letters of the line above (keeps Q tails clear) · alternating horizontal offset |
| `shadow` · `shadowOffset` · `shadowColor` | true · .06 em · `rgba(12,12,14,.92)` | hard offset shadow |
| `shake` | true | landing shake of the stack |
| `x` · `y` | K.W/2 · 0.45·K.H (9:16) / 0.5·K.H | stack centre (the stack's bounding box is centred on `y`) |
| `out` · `exit` · `exitDur` | — · `'pop'` (shrink away, last line first) · .26 | or any shared exit |

Cues: `hit` per line.

```js
add(K.kit.stickerWords(w, { lines: ['Webs', 'que', 'venden'], at: .2, out: 2.5 }));
```

## 8 · `K.kit.captions(parent, opts)` — word-synced captions

Transcript words `[{ text, start, end }]` (seconds, relative to `at`) are chunked (≤ `maxWords`, ≤ `maxChars`, break
after `.?!,;:` and after silences > `gap`). One chunk on screen at a time; chunks pop in (scale 1.06 → 1, blur, rise)
and cut to the next one; after a long silence the last chunk drops out.

| option | default | meaning |
|---|---|---|
| `words` (or `transcript`) | — | `[{text, start, end}]` (`word` accepted for `text`) |
| `at` | 0 | offset added to all times |
| `style` | `'karaoke'` | `'karaoke'`: chunk shown whole, active word in `highlight` + scale 1 + `activeScale`, upcoming words dimmed · `'pop'`: each word pops (scale .55 → 1, overshoot) when spoken, active word highlighted · `'bold'`: uppercase heavy, a box slides & resizes from word to word behind the active word |
| `maxWords` · `maxChars` · `gap` · `hold` | 4 / 3 (bold) · 24 / 18 · .6 · .4 | chunking; `hold` = how long the last chunk stays after its last word |
| `size` | .068·S (73 px) / .085·S (92 px, bold) | |
| `font` · `weight` · `tracking` · `upper` | display · 800 / 900 · −.035 / −.03 · bold only | |
| `color` · `highlight` · `dim` | `#fff` · `var(--k-accent2)` (bold: `#fff`) · .5 | |
| `activeScale` | .06 | karaoke: extra scale of the active word |
| `wordSpace` | per face (display .1 em) | extra word spacing, see *Conventions* |
| `boxColor` · `boxRot` | `var(--k-accent)` · −2° | bold style box |
| `highlightActive` | true | pop style |
| `shadow` · `stroke` · `strokeColor` | `'0 .04em .28em rgba(0,0,0,.5)'` · — · `#000` | legibility over footage (`shadow: false` to remove; `stroke` px outline painted under the fill) |
| `x` · `y` · `maxWidth` · `lineHeight` | K.W/2 · .62·K.H (9:16, inside the Reels safe zone) / .8·K.H · default · 1.05 | `y` = centre of the caption block |

Cues: none (the voice is the sound); `cue: true` → a soft `tick` per word, or `cue: 'pop'`. Returns `chunks`.

```js
const TR = [{ text: 'Tu', start: 0, end: .2 }, { text: 'web', start: .22, end: .42 }, /* … */];
add(K.kit.captions(w, { words: TR, at: .2, style: 'bold' }));
// from real speech: ./katana transcribe voice.wav --out projects/<p>/assets/voice_words.json  (whisper.cpp, Spanish)
const TR2 = K.loadJSON('../assets/voice_words.json').words;          // same {text, start, end} shape
add(K.kit.captions(w, { words: TR2, style: 'karaoke', y: 1380, stroke: 6 }));   // over bright footage: lower + outline
```

## 9 · `K.kit.counter(parent, opts)` — rolling odometer

Digit columns roll (mechanical carry: a column only moves while the one to its right passes 9 → 0), each column gets
a vertical speed blur proportional to its speed, columns for leading digits grow in as the number reaches them,
thousands separators follow; the number pops in at `at` and punches (and optionally changes colour) when it lands.

| option | default | meaning |
|---|---|---|
| `from` · `to` | 0 · 100 | non-negative numbers |
| `at` · `delay` · `dur` · `ease` | 0 · .12 · 1.2 · `'smooth'` | counting runs `at+delay → at+delay+dur`; `ease` = any `K.E` name or a function |
| `decimals` · `sep` · `dec` | 0 · `','` · `'.'` | Spanish: `sep: '.', dec: ','` (`sep: ''` for none) |
| `prefix` · `suffix` · `prefixScale` · `suffixScale` · `prefixGap` · `suffixGap` | — · — · 1 · 1 · .02 · .04 (× size) | e.g. `prefix: '+'`, `suffix: '%'`, `suffix: ' visitas', suffixScale: .42` |
| `roll` | `'mech'` | `'smooth'` = every column rolls continuously |
| `blur` · `land` · `landColor` | true · true · — | speed blur · landing punch · colour after landing |
| `minDigits` | 1 | keep leading zero columns |
| `size` · `font` · `weight` · `tracking` | .3·S (9:16) / .26·S · display · 900 · −.04 | tabular digits |
| `maxWidth` · `lineHeight` | K.W · .95 | layout box (the number is aligned inside it with `align`) |
| `out` · `exit` · `exitDur` | — · `'up'` · .3 | |

Cues: `pop` at `at`, `tick` per integer change (≥ 55 ms apart), `popxl` on landing.

```js
add(K.kit.counter(w, { from: 81, to: 94, at: .2, delay: .35, dur: 1.3, landColor: '#2B4BFF' }));
add(K.kit.counter(w, { from: 0, to: 12500, prefix: '+', suffix: ' visitas', suffixScale: .42, sep: '.', size: 120, y: 1190, ease: 'soft' }));
```

## 10 · `K.kit.sliced(parent, opts)` — word in horizontal slices (auto-fit)

N copies of the word, each clipped to a horizontal band of the cap height; band i slides in from alternating sides
(`E.out(4)`, horizontal smear ∝ speed), staggered; when all lock, a tiny scale punch. `out` reverses it (slices fly
out to the opposite sides, accelerating). While every slice is at rest the word is drawn whole (no hairline seams
between the bands).

| option | default | meaning |
|---|---|---|
| `text` · `upper` | — · false | |
| `at` · `slices` · `dur` · `stagger` · `dist` · `ease` | 0 · 6 · .42 (per slice) · .035 · .75·K.W · `E.out(4)` | |
| `font` · `weight` · `tracking` | display · 900 · −.03 (wide −.02) | `'wide'` works well too |
| `size` | auto-fit to `maxWidth` (K.W − 140 / .8·K.W), cap .3·S / .28·S | |
| `color` · `blur` | `var(--k-fg)` · true | |
| `out` · `exitDur` | — · .36 | |

Cues: `whoosh` at `at`, `hit` on lock, `whoosh` at `out`.

```js
add(K.kit.sliced(w, { text: 'LISTO.', at: .15, color: '#fff', out: 1.85 }));
```

---

## Recipes (Katana grammar)

* **Hook**: `ghost` (giant outlined word, opacity .12) + `words` with `layout:'grow'` and one `*serif*` word; cut on
  the beat into a `headline` with `shake` on a colour block (`K.BG`).
* **"So much → Nothing"**: `words` with an inline `[img:]` tile, then `morph` A → B at the cut, then `letterSwap`
  of B with `zoomAt` + `reveal` = next scene colour: the hole becomes the next shot.
* **Proof**: `counter` 81 → 94 (`landColor` accent) under a small muted `words` label; `sliced` for the verdict.
* **CTA**: `stickerWords` stack, then `typeOn` (pop) of the brand, then `words` "link en la bio" with `enter:'drop'`.
* One idea per frame: never more than ~3 type components visible at once; keep text inside `K.safe()` on 9:16
  (default `maxWidth`/`y` already do).

## Internals exposed

`K.kit._type = { FACE, faceCss(name, {weight, tracking, stretch}), metrics(name) → {xh, cap, asc, desc} (em),
faceScale(name, ref, 'xh'|'cap'), fitSize(host, text, css, maxW, max) }` — read-only helpers for other families
(e.g. to size a label like the kit does).
