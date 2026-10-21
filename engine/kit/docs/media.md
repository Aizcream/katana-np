# Kit · media — footage, photos, stickers and 3D card arrangements

`engine/kit/media.js` → `K.kit.clip · photo · cutout · cardWall · carousel · fan · grid · textMask · spin · beforeAfter · splitScreen`.
Demo: `engine/demos/media.html` (one scene per component, North Pearl content; `?fmt=16x9` for landscape; `?set=b` shows
the other options: boxed clip with a slide exit, items grid flipping in, fan shuffle from the bottom, cascading wall with
`from`/`to` travel, boxed vertical before/after, x-axis sticker spin).

```js
K.scene({ id: 's3', t0: 4, t1: 7, build(root, add) {
  const w = K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px;overflow:hidden`);   // never style the scene root
  const c = add(K.kit.clip(w, { clip: 'assets/clips/hero', ramp: [[0, 2.4], [1, .3]] }));
  K.addCues(c, 4);                                                                       // suggested SFX at scene t0
} });
```

Every component is `K.kit.name(parent, opts) → { el, update(lt), prepare?(lt), cues(), dur }` (see `CONTRACT.md`). Add it
with the scene's `add()` so `prepare` (frame decoding) and `update` are driven for you. Everything is invisible before `at`.

## Conventions shared by all components

**Media spec** — anywhere a picture goes (`src`, `clip`, `items[]`, `a`, `b`, `back`):

| form | meaning |
|---|---|
| `'path/a.jpg'` (any image extension) | still image |
| `'path/clipdir'` (no extension) | frame sequence made by `katana clip` (dir with `_clip.json`) |
| `{ src }` / `{ clip, in, rate, ramp, loop, freezeAt, blend, focus, fit }` | per-item settings |

**Footage time** (any clip): media seconds = `in + rate·(lt − at)`, or `in + K.ramp(lt − at, ramp)` with
`ramp: [[t, rate], …]` (t after `at`, rates eased over 0.12 s). `freezeAt: s` holds the frame from `at + s` on.
`loop: true` wraps, otherwise the last frame holds. `blend` (default on): when |rate| < 0.75 the two neighbouring source
frames are cross-faded so slow motion does not stutter (`blend: false` = hard frame steps). Under the capture motion-blur
shutter footage holds ONE source frame (`K.heldTime`), so no double blur. These keys can sit on the component opts too
(`K.kit.clip(w, { clip, rate: .5 })`) or per item (`items: [{ clip: 'x', in: 1.2 }]`).

**Keyframable values** (marked *kf*): a constant, a function `(t) => v`, or keys `[[t, v], [t, v, ease], …]` evaluated with
`K.kf` where **t = seconds after the component's `at`** and `ease` is the ease INTO that key (default `E.smooth`).
Vectors work too: `pan: [[0, [0, 0]], [3, [-60, 0]]]`.

**Common options**: `at` (0, scene-local start), `out` (exit start, optional), `exit` (preset, default = `enter`),
`exitDur` (0.4), `enter` (preset), `enterDur` (0.5; `pop` 0.6), `z` (z-index). Positions `x, y` are the CENTRE of the
component in film px unless noted. Sizes default from `K.W/K.H` (`MIN` below = `min(K.W, K.H)`, 1080 in both 9:16 and 16:9).

**Entrance/exit presets** (`enter` / `exit`) for clip, photo, beforeAfter, spin, carousel (stage), textMask (canvas):
`none` · `scale` (1.16→1 + blur 16) · `zoom` (0.3→1 + blur 20, grows from a point) · `rise` (from +8.5 % H + blur) ·
`drop` (from above) · `left` / `right` / `up` / `down` (full-frame slide with directional smear; the exit continues the
direction) · `pop` (`K.pop` overshoot) · `wipe` (left→right reveal) · `wipeUp` · `iris` (circle). Entrances use `E.snappy`
(fast attack, long settle), exits `E.in(2.2)`. None of them is opacity-only.

**Shadow** values: `true` (card on a table), a number (strength, 0.5 subtle … 1.5 lifted), a CSS box-shadow string, `false`.

**Suggested SFX** (`cues()` → use `K.addCues(comp, sceneT0)`): kinds from `sfx/` — `whoosh`, `whip`, `zoom`, `pop`, `tick`,
`hit`, and the synth `swoosh`. Listed per component below.

---

## 1. `K.kit.clip(parent, o)` — footage

Full-frame by default; give `w`/`h` for a framed card.

| option | default | notes |
|---|---|---|
| `clip` (or `src`) | — | media spec (frame-sequence dir) |
| `in`, `rate`, `ramp`, `loop`, `freezeAt`, `blend` | 0, 1, —, false, —, on | footage time, see conventions |
| `x`, `y` *kf* | `K.W/2`, `K.H/2` | centre |
| `w`, `h` | `K.W`, `K.H` | box size |
| `fit` | `'cover'` | or `'contain'` (shows `bg`) |
| `focus` | `[.5, .5]` | crop anchor AND zoom pivot (fraction of the frame) |
| `zoom` *kf* | 1 | scale of the picture inside the box |
| `push` | 0.04 | extra slow push-in: +4 % per 5 s on top of `zoom` (0 = off) |
| `pan` *kf* | `[0, 0]` | px; clamped so a cover crop never shows an edge (`clampPan: false` to allow) |
| `scale`, `rot` *kf* | 1, 0 | the whole box |
| `full` *kf* | — | 0 = the box above, 1 = the whole frame: the card GROWS into full-frame footage (x/y/w/h/radius/rot interpolate). E.g. `full: [[2, 0], [2.8, 1, E.inOut(3)]]` |
| `drift` | `[0, 0]` | px/s of the whole box (parallax) |
| `radius` | 0 | px |
| `shadow` | false | see conventions |
| `bg` | `'#0d0d0f'` | behind a `contain` fit |
| `enter` | `'none'` full-frame, `'scale'` boxed | preset |

Returns also `img` (the `<img>`), `dur` (natural length in s, honouring in/rate/ramp; undefined when looping),
`mediaTime(lt)` (media seconds at lt). Cues: `whoosh` at `at` (if it has an entrance) and at `out`.

```js
// fast → slow-mo on the drop, punch-in on the cut, then a slow glide
add(K.kit.clip(w, { clip: 'assets/clips/c3293', ramp: [[0, 2.4], [1.0, .28], [2.5, .28], [2.9, 1.3]],
  zoom: [[0, 1.4], [1.0, 1.06, E.snappy], [4.2, 1.14, E.glide]], focus: [.5, .42] }));
// framed footage card that pops in and leaves to the right
add(K.kit.clip(w, { clip: 'assets/clips/c3294', w: 760, h: 1000, radius: 36, shadow: 1, enter: 'pop', at: .3, out: 2.6, exit: 'right' }));
```

## 2. `K.kit.photo(parent, o)` — still with Ken Burns

Same box/options as `clip` (x, y, w, h, fit, focus, scale, rot, drift, radius, shadow, bg, enter…) plus:

| option | default | notes |
|---|---|---|
| `src` | — | image |
| `from` | `{ s: 1, x: 0, y: 0 }` | Ken Burns start: picture scale + pan px |
| `to` | `{ s: 1.12, x: 0, y: 0 }` | Ken Burns end |
| `dur` | 6 | seconds of the Ken Burns move (after `at`) |
| `ease` | `E.sine` | Ken Burns ease |
| `zoom` / `pan` *kf* | — | override the Ken Burns completely |
| `full` *kf* | — | grow the card to the full frame (see clip) |
| `push` | 0 | |
| `enter` | `'none'` full-frame, `'rise'` boxed | |

Cues: like clip (`pop` instead of `whoosh` when `enter: 'pop'`).

```js
add(K.kit.photo(w, { src: 'assets/img/np_3294_6s.jpg', w: K.W * .7, h: K.H * .5, y: K.H * .52, radius: 34, shadow: 1,
  from: { s: 1.18 }, to: { s: 1.02, y: -30 }, dur: 3.4, drift: [0, -10] }));
add(K.kit.photo(w, { src: 'assets/media/web_despues.jpg', x: K.W * .6, y: K.H * .74, w: 780, h: 540, radius: 28,
  shadow: 1.2, rot: 3, enter: 'pop', at: .55, drift: [-6, -22], full: [[1.95, 0], [2.75, 1, E.inOut(3)]] }));   // pops in, then becomes the frame
```

## 3. `K.kit.cutout(parent, o)` — sticker from a transparent PNG

Thick rounded outline (SVG dilate → soften → threshold → flood), a drop shadow that follows the sticker's height (big and
soft while lifted, tight on landing), a stamp/pop/drop entrance, idle float and a gloss sweep after landing.
Make PNGs with `tools/bin/cutout in.jpg out.png --crop` (macOS Vision).

| option | default | notes |
|---|---|---|
| `src` | — | PNG with alpha |
| `x`, `y` *kf* | centre of the film | sticker centre (height comes from the PNG aspect) |
| `w` | `MIN·0.6` | width px |
| `outline` | `round(6 + w·0.022)` | outline px (0 = none) |
| `outlineColor` | `'#fff'` | |
| `rot` | −4 | resting rotation (deg) |
| `enter` | `'stamp'` | `'stamp'` (1.5→1 slam + rotation + squash), `'pop'` (K.pop from 0), `'drop'` (falls from above, bounces), `'none'` |
| `enterDur` | stamp .42 · pop .6 · drop .7 | landing at 62 % / 25 % / 55 % of it |
| `from` | 1.5 | stamp start scale |
| `spin` | stamp 18 · drop −24 | extra rotation at the start (deg) |
| `float` | 1 | idle bob amplitude multiplier (0 = still) |
| `shine` | true | gloss band sweeps across after landing |
| `shineAt` | 0.12 | s after landing |
| `shadow` | on | `false` removes the drop shadow |
| `res` | 1 | the PNG is rasterised once (in `prepare`) into a canvas of `w·res` px — keeps edges identical whatever was rendered before; 1.5 = crisper during the 1.5× stamp |
| `out`, `exit`, `exitDur` | —, `'pop'`, .35 | exits: `'pop'` (swell then shrink), `'fly'` (up and away), `'none'` (cut) |
| `smear` | 1 | vertical smear multiplier while it falls (`drop`) or flies out (`fly`): σ ≈ ¼ of the per-frame travel, capped at 22 px |
| `z` | — | z-index |

Cues: `pop` on landing (`hit` for drop), `whoosh` at `out`.

```js
add(K.kit.cutout(w, { src: 'assets/img/np_laptop_cutout.png', w: 700, at: .15, rot: -5 }));
add(K.kit.cutout(w, { src: 'assets/media/sticker_94.png', x: K.W * .74, y: K.H * .27, w: 330, at: .8, enter: 'pop', rot: 8 }));
add(K.kit.cutout(w, { src: 'assets/media/np_logo_dark.png', x: K.W * .3, y: K.H * .72, w: 300, at: 1.3, enter: 'drop' }));
```

## 4. `K.kit.cardWall(parent, o)` — 3D poster wall with a camera (r2 "scroll.")

A rows × cols wall of rounded image cards in perspective; the camera travels along it. Depth-of-field per card, a
directional smear from the camera speed, optional highlight of one card (lifts towards the camera, scales, ring),
off-screen cards culled. Items are spread so no card repeats its left/top neighbour.

| option | default | notes |
|---|---|---|
| `items` | — | media specs, cycled over the wall (clips work but cost decode time per visible card) |
| `rows`, `cols` | 7 portrait / 5 landscape, 14 | |
| `card` | `[MIN·0.26, ·1.42]` | card `[w, h]` px |
| `gap` | `cw·0.1` | px |
| `radius` | `cw·0.065` | card corner px |
| `perspective` | `max(W,H)·0.7` | px (smaller = stronger distortion) |
| `tilt` | `{ rx: 4, ry: 42, rz: −3 }` | wall rotation in deg, each *kf*. `ry > 0`: the right side recedes |
| `cam` *kf* | dolly-in then glide (below) | `[x, y, z]`: wall point at the screen centre (wall px, origin = grid centre; x+ = right along the wall) and dolly `z` (negative = farther) |
| `from`, `to`, `travel`, `ease` | —, —, `[0, 5]`, `E.glide` | shorthand for `cam` (used when `cam` is not given): the camera travels `from` → `to` over `travel = [t0, t1]`. Here x, y are in **card pitches** (`[2, 0, -700]` = two cards right of centre, 700 px back) and z in px |
| `offset` | 0 | brick offset of odd rows (fraction of a card pitch) |
| `seed` | 7 | item layout |
| `shadow` | 0.5 | card shadow |
| `depthBlur` | 13 | blur px per 1000 px of depth away from the focus plane |
| `maxBlur` | 14 | px |
| `focusZ` | 0 | focus plane offset (px, + = nearer) |
| `highlight` | — | `[[t, card, dur?], …]` or `[{ t, i, dur }]`; `card` = index, `[row, col]` or `'center'` (the card nearest the screen centre ~0.4 s into the highlight — the wall keeps travelling, so it passes the centre while lifted); dur 1.2. The highlighted card racks focus (its depth blur goes to 0) |
| `lift` | 1 | highlight strength (90 px toward camera, +13 % scale) |
| `ring` | false | colour of a ring on the highlighted card, e.g. `'var(--k-accent)'` |
| `dim` | 0.18 | other cards darken by this while a highlight is up |
| `enter` | `'none'` | `'cascade'`: cards fly in from the camera, centre first (`stagger` .035) |
| `smear` | 1 | multiplier of the camera-speed smear (`false` = off) |
| `x, y, w, h` | full frame | the stage (clips the wall) |
| `bg` | — | stage background (default: the scene shows between cards) |

Default `cam` (pitch `px = cw + gap`, `py = ch + gap`): `[[0, [-3.6px, .2py, -1100]], [.85, [-2.3px, 0, 0], E.soft], [5, [2.8px, 0, 0], E.sine]]`
— the wall arrives (needle dolly) then glides right. A camera that changes speed abruptly will show it: ease every key.
Returns also `pitch` (`[px, py]`, to write `cam` keys in cards). Cues: `whoosh` at `at`, `tick` per highlight.

```js
add(K.kit.cardWall(w, { items: [...stills, ...siteCards], highlight: [[2.5, 'center', 1.3]], ring: 'var(--k-accent)' }));
// slower, flatter wall for a background plate behind type
add(K.kit.cardWall(w, { items, tilt: { rx: 0, ry: 18, rz: 0 }, cam: [[0, [0, 0, -300]], [6, [900, 0, -300], E.lin]], depthBlur: 6 }));
// travel shorthand: from 2 cards right (700 px back) to 1.5 cards left over 3.4 s, cards cascading in, left side receding
add(K.kit.cardWall(w, { items, enter: 'cascade', tilt: { rx: 6, ry: -30, rz: 2 }, from: [2, 0, -700], to: [-1.5, .3, -150], travel: [0, 3.4],
  highlight: [[1.6, 'center', 1.2]], ring: 'var(--k-accent2)', bg: '#111214' }));
```

## 5. `K.kit.carousel(parent, o)` — 3D ring of cards (r3 3d-cards)

| option | default | notes |
|---|---|---|
| `items` | — | media specs, cycled over `count` cards |
| `count` | `max(8, items.length)` | |
| `card` | `[MIN·0.4 (16:9: MIN·0.36), w·1.32]` | card `[w, h]` px; on 9:16 the neighbours of the front card reach the frame edges |
| `radius` | `max(cw·n/2π·1.16, 9:16 MIN·0.4 / 16:9 W·0.34)` | ring radius px (front card sits at depth 0 = natural size) |
| `shadow` | 0.45 | card shadow |
| `cardRadius` | `cw·0.07` | corner px |
| `x`, `y` | centre | ring centre |
| `perspective` | `max(W,H)·1.05` | |
| `tilt` *kf* | −9 | rotateX deg (negative = seen from above) |
| `speed` | 34 | deg/s spin before the first focus (negative = other way) |
| `focus` | — | `[[t, i], …]`: at t the ring spins (forward, ≥ 40°) to bring card i to the front, continuous with the current speed |
| `focusDur` | 0.85 | s per focus move |
| `drift` | 5 | deg/s after a focus |
| `focusScale` | 1.14 | front card scale (+80 px toward camera) once focusing |
| `depthBlur` | 5 | px of blur on the back cards (they also darken to 62 %) |
| `enter` | `'spin'` | ring spins up (+140° decelerating) while cards grow; `'none'`, or any preset applied to the whole stage |
| `enterTurn`, `enterDur` | 140, 1.1 | |
| `smear` | 1 | horizontal smear ∝ angular speed (σ ≤ 26 px; `false` = off) — a focus whip blurs the ring for 3–4 frames, like a real whip pan |
| `out`, `exit` | —, `'scale'` | |

Cues: `whoosh` at `at`, `whip` on every focus.

```js
add(K.kit.carousel(w, { items: projectCards, y: K.H * .55, focus: [[1.5, 2], [2.8, 6]] }));
```

## 6. `K.kit.fan(parent, o)` — cards fly in and arrange themselves (r2 "Knows your taste")

Cards fly from scattered off-screen positions (rotation overshoots with `K.pop`, smear ∝ speed) into a layout, can morph
between layouts, and explode outwards at `out`.

| option | default | notes |
|---|---|---|
| `items` | — | media specs (one card each, later items on top) |
| `card` | `[MIN·0.36, ·1.32]` | card size at scale 1 (grid/row/fan shrink to fit `bounds`) |
| `x`, `y` | centre | layout centre |
| `layout` | `'stack'` | `'stack'` (messy pile) · `'fan'` (hand of cards) · `'grid'` · `'row'` · `'col'` · `'scatter'` (loose on a table) · `'shuffle'`, `'shuffle:2'`… (the grid with cards trading places). Or keys `[[t, name], …]` (t after `at`; the first one is the fly-in target) |
| `cols` | auto (≈√n) | grid columns |
| `gap` | `cw·0.07` | grid gap |
| `spread` | 44 | fan angle (deg) |
| `fanRadius` | 1.5 | radius of the fan arc in card heights (smaller = tighter hand, bigger cards after fitting `bounds`) |
| `bounds` | safe area width × 86 % of its height | `[w, h]` the grid/row/fan must fit in |
| `from` | `'scatter'` | start positions: `'scatter'` (all around) · `'bottom'` · `'top'` · `'left'` · `'right'` |
| `seed` | 3 | |
| `stagger` | 0.07 | s between cards |
| `flyDur` | 0.75 | fly-in seconds per card |
| `morphDur` | 0.7 | layout change seconds per card |
| `out`, `exitDur` | —, 0.55 | explode outwards (radial, spinning, accelerating) |
| `radius`, `shadow`, `smear` | `cw·0.06`, 0.7, 1 | |
| `push` | 0.03 | slow zoom of the whole arrangement (+3 % / 3 s) so holds stay alive (0 = off) |

Returns also `cards` (the card elements). Cues: `whoosh` at `at`, `pop` when the last card lands, `swoosh` per layout
change, `whip` at `out`.

```js
add(K.kit.fan(w, { items: cards8, y: K.H * .55, layout: [[0, 'stack'], [1.35, 'grid'], [2.6, 'fan']], out: 3.95 }));
add(K.kit.fan(w, { items: cards8, layout: [[0, 'grid'], [1.2, 'shuffle'], [2.0, 'shuffle:2']], from: 'bottom' }));
```

## 7. `K.kit.grid(parent, o)` — tiled grid with a cascade reveal (r3 grid-mask)

Mosaic mode (`src`/`clip`): ONE picture split into tiles that assemble (each tile also zooms its content into place).
Items mode (`items`): one picture per tile (rounded cards with shadows).

| option | default | notes |
|---|---|---|
| `src` / `clip` | — | mosaic source (+ footage keys) |
| `items` | — | items mode |
| `cols`, `rows` | mosaic 4×8 portrait / 8×4 landscape; items 3 (4 landscape) × ⌈n/cols⌉ | |
| `x, y, w, h` | mosaic full frame; items: safe-area width (+50 px on 9:16), height from `tileH` | centre + size; an items grid taller than the safe area is scaled down to fit it |
| `tileH` | items: `tileW·1.25` (0.75 landscape) | |
| `gap`, `radius` | mosaic 0, 0 · items `MIN·0.018`, `MIN·0.022` | |
| `order` | `'diagonal'` | `'diagonal'` · `'antidiagonal'` · `'rows'` · `'cols'` · `'center'` (outwards) · `'random'` (`seed` 5) |
| `spread` | 0.6 | seconds from first to last tile (or set `stagger` per rank step) |
| `tileDur` | 0.55 | |
| `style` | `'scale'` | `'scale'` (0.42→1 + blur) · `'flip'` (rotateY 92°→0) · `'drop'` (falls in) · `'iris'` (circle) |
| `zoom` *kf* | 1 | content zoom (mosaic) |
| `fill` | false | items mode: cycle items to fill every cell |
| `align` | `'center'` | items mode: an incomplete last row is centred; `'left'` keeps it flush left |
| `bg`, `shadow`, `focus` | —, 0.45, `[.5,.5]` | |
| `out`, `exitDur` | —, 0.45 | tiles leave in the same order |

Cues: `swoosh` at `at`, `tick` mid-cascade, `swoosh` at `out`.

```js
add(K.kit.grid(w, { clip: 'assets/clips/c3294', out: 2.85 }));                       // mosaic of a clip
add(K.kit.grid(w, { items: shots9, style: 'flip', order: 'center' }));               // 3×3 cards flipping in
```

## 8. `K.kit.textMask(parent, o)` — picture inside huge text, zoom-through

Drawn on a full-frame canvas (deterministic, crisp at any zoom). The picture stays fixed to the screen while the letters
move, so zooming the text "flies into" the footage; the zoom origin is snapped INTO a glyph stroke so a large zoom fills
the frame with the picture (it then opens fully and the clip keeps playing — a transition into the footage).

| option | default | notes |
|---|---|---|
| `text` | `'WEB'` | `\n` for lines |
| `src` / `clip` | — | picture/footage inside (+ footage keys, e.g. `in`) |
| `x`, `y` | centre | text block centre |
| `w` | `K.W − 2·max(safe.left, 5 %)` | max text width |
| `size` | auto: fits `w`, ≤ `maxSize` | px |
| `maxSize` | single line 0.34·H (9:16) / 0.5·H (16:9); multi-line 0.2·H / 0.3·H | |
| `font`, `weight`, `tracking`, `leading` | `--k-display`, 900, −0.05 em, 0.84 | |
| `enter` | `'rise'` | letters rise through a baseline mask (`stagger` .06, E.snappy). Other presets animate the whole canvas |
| `zoom` *kf* | 1 | text scale about the origin; ≥ ~30 opens to the full picture |
| `focus` | `[.5, .5]` | zoom origin as a fraction of the text block, snapped into a stroke (`snap: false` to keep it exact) |
| `mediaZoom` *kf* | slow push (+5 % / 3 s, `push`) | picture scale |
| `mediaFocus` | `[.5, .5]` | picture crop anchor |
| `bg` | transparent | colour outside the letters |
| `stroke`, `strokeWidth` | —, `size·0.012` | thin outline of the letters on top |
| `out`, `exit` | —, `'scale'` | |

Returns also `origin` ([x, y] of the zoom origin). Cues: `hit` on the reveal, `zoom` where the zoom keys pass 4×.

```js
add(K.kit.textMask(w, { text: 'WEB', clip: 'assets/clips/c3293', in: .5, stroke: 'rgba(255,255,255,.35)',
  zoom: [[0, 1], [1.7, 1.07, E.glide], [2.7, 60, E.expoIn]] }));   // hold, then fly into the footage on the beat
```

## 9. `K.kit.spin(parent, o)` — 3D flip / product spin

| option | default | notes |
|---|---|---|
| `src` / `clip` | — | |
| `cutout` | false | true: transparent PNG product (contain fit, no card, both sides = the same picture) |
| `x`, `y` | centre | |
| `w`, `h` | card `MIN·0.5 × w·1.3` · cutout `MIN·0.62` square | |
| `radius` | card `w·0.07`, cutout 0 | |
| `thickness` | card `max(4, w·0.022)`, cutout 0 | px; drawn as stacked edge slices (visible at 90°) |
| `edge` | `'#c9cacd'` | edge colour |
| `back` | `'same'` | back face: `'same'` picture, `'#hex'` colour, or another media spec |
| `spins` | `[[0, turns, dur]]` | `[[t, turns, dur, ease], …]`; the first one (default ease `E.out(3)`: enters at full speed and decelerates to face front) ends facing front; later ones default `E.inOut(3)`. Half turns allowed |
| `turns`, `dur` | 1, 1.2 | shorthand for the first spin |
| `angle` *kf* | — | override: rotation in deg |
| `axis` | `'y'` | `'x'` flips vertically |
| `tilt` *kf* | 0 | rotateX deg |
| `sheen` | true | specular band that crosses as it turns |
| `floor` | true | floor shadow under the DRAWN picture (a contain-fitted cut-out's real bottom, not its box) that narrows with the projected width |
| `floorGap` | 0.3 | floor centre below the picture's bottom, in floor heights (floor height = `w·0.14`) |
| `float` | 1 | idle bob |
| `outline`, `outlineColor` | —, `'#fff'` | sticker outline for cut-outs |
| `smear` | 1 | horizontal smear ∝ angular speed (multiplier, `false` = off) |
| `scale` *kf*, `perspective`, `shadow` | 1, `3.4·max(w,h)`, 0.3 | |
| `enter` | `'zoom'` | preset on the whole object |

Cues: `whip` at every spin start.

```js
add(K.kit.spin(w, { src: 'assets/img/np_laptop_cutout.png', cutout: true, w: 620, y: K.H * .42, spins: [[0, 1, 1.2], [2.3, 1, .9]] }));
add(K.kit.spin(w, { src: 'assets/media/lh_despues.jpg', w: 300, h: 400, y: K.H * .755, at: .45, back: '#111214', focus: [.5, .15] }));
```

## 10. `K.kit.beforeAfter(parent, o)` — antes / después divider

`a` (antes) on the left/top, `b` (después) revealed as the divider moves from position 1 (all antes) to 0 (all después).

| option | default | notes |
|---|---|---|
| `a` / `before`, `b` / `after` | — | media specs (clips allowed) |
| `x, y, w, h` | full frame | box; boxed → `radius MIN·0.03`, shadow, `enter: 'scale'` |
| `dir` | `'x'` | `'x'` vertical divider sliding sideways; `'y'` horizontal divider (a on top) |
| `wipe` *kf* | `[[0, 1], [.3, 1], [1.15, .5, E.smooth], [2.15, .5], [2.85, 0, E.smooth]]` | divider position 0…1 (beyond = off the edge) |
| `slant` | 0 | divider angle in deg (6–10 looks dynamic) |
| `labels` | `['ANTES', 'DESPUÉS']` | `false` = none. Pills in the top corners (inside the 9:16 safe zone when full-frame), clipped with their side; antes dark, después accent |
| `labelPos`, `labelSize` | `'top'`, `MIN·0.04` (boxed 0.032) | |
| `handle`, `handleAt`, `handleIn` | true, 0.5, 0.1 | round handle with ‹ ›: position along the line, pop-in time |
| `lineColor` | `'#fff'` | |
| `focus`, `focusA`, `focusB` | `[.5,.5]` | crop anchors |
| `push` | 0.05 | slow push-in of both pictures (+5 % / 4 s) |

Cues: `whoosh` at every divider move, `pop` for the labels (+ entrance cues).

```js
add(K.kit.beforeAfter(w, { a: 'assets/img/np_3292_2s.jpg', b: 'assets/img/np_3294_2s.jpg', slant: 7, focus: [.5, .4] }));
add(K.kit.beforeAfter(w, { a: 'assets/media/web_antes.jpg', b: 'assets/media/web_despues.jpg', w: 960, h: 640, dir: 'x',
  wipe: [[0, .85], [1.2, .15, E.smooth], [2.2, .5, E.smooth]] }));
```

## 10b. `K.kit.splitScreen(parent, o)` — 2–3 panels

Panels slide in from alternating sides with smear; the picture inside counter-moves (parallax); the exit continues the
same direction.

| option | default | notes |
|---|---|---|
| `items` | — | 2–3 media specs |
| `dir` | `'y'` on 9:16 (stacked rows), `'x'` on 16:9 (columns) | |
| `x, y, w, h` | full frame | |
| `gap`, `radius`, `shadow` | `MIN·0.012`, 0, — | |
| `stagger`, `dur` | 0.12, 0.65 | per panel |
| `labels` | — | e.g. `['Antes', 'Después', 'Lighthouse 94']`; pills (last one accent), kept inside the safe zone. An entry can be `{ text, align, pos }` to override `labelAlign` / `labelPos` for that panel, or `null` for no label |
| `labelAlign` | `'side'` | `'side'`: the corner on the side the panel slides in from (zig-zag: panel 0 left, 1 right, 2 left) · `'left'` · `'right'` · `'center'` |
| `labelPos` | `'top'` | `'top'` or `'bottom'` of each panel |
| `labelSize` | `MIN·0.036` | |
| `focus` | — | per-panel crop anchors `[[fx, fy], …]` |
| `push` | 0.04 | |
| `out`, `exitDur` | —, 0.45 | |

Cues: `whip` per panel, `whoosh` at `out`.

```js
add(K.kit.splitScreen(w, { items: ['assets/media/web_antes.jpg', 'assets/media/web_despues.jpg', 'assets/media/lh_despues.jpg'],
  labels: ['Antes', 'Después', 'Lighthouse 94'], labelAlign: 'right', focus: [[.35, .4], [.45, .55], [.5, 0]], out: 3.15 }));
// put labels where the pictures are calm: screenshots usually carry their headline top-left
```

---

## Assets ready for demos and films (`engine/demos/assets/media/`)

All demo content shows "Aurora Café" (`auroracafe.co`), a fictional coffee shop drawn in code — no client material.
`web_antes.jpg` / `web_despues.jpg` (its old / new site, 1600 px) · `lh_antes.jpg` / `lh_despues.jpg` (Lighthouse
panels 81→94) · `card_*.jpg` (600×900 portrait crops for walls/fans) · `sticker_94.png` / `sticker_81.png` (round gauge
stickers with alpha) · `np_logo_dark.png` (dark logo with alpha, for stickers on light backgrounds). Desk-scene stills
`engine/demos/assets/img/np_*.jpg` (laptop showing the site; 3292 = old site, 3293–3295 = new site), cut-out laptop
`np_laptop_cutout.png`, clips `engine/demos/assets/clips/c3293` (old site) `|c3294` (new site scrolling).

## Notes and limits
- Determinism: settled transforms are rounded so they become exact (scale `1.0000`), and stickers are pre-rasterised to
  canvases — near-identity transforms and downscaled hard-edged PNGs otherwise rasterise differently depending on what the
  page rendered before (seek order). Do the same in film code: when an entrance has settled write `transform: none`, and
  never put `will-change: transform` on text.
- Card walls / carousels / fans with **clips** on many cards decode one frame per visible card per frame: fine for a few,
  slow for a whole wall. Prefer stills on walls and one clip as the hero.
- Smears are stylised directional blurs so drafts read; the final `--mb` capture adds true motion blur on top (both are
  fine together; pass `smear: .5` to soften).
- `K.media` exposes internals (`source`, `mspec`, `mtime`, `shadowCss`, `outlineFilter`, `project`) for other families.
