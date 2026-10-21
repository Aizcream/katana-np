# Kit · looks — Katana "styles": ascii, glitch-VHS, sticker-pop, liquid, grid reveal + global grade/overlays

`engine/kit/looks.js` → `K.looks.*`. Demo: `engine/demos/looks.html` (every look on North Pearl stills/clips, labelled;
`?fmt=16x9` for landscape, `?variants=1` = same timeline with the non-default options of every look). Reference: `refs/sheets/r3_zainoldinn_katana_launch_2fps.jpg` (the six Katana `/styles`).

Two kinds of look:

| kind | call | what it is | time base |
|---|---|---|---|
| **media look** | `K.looks.name(parent, opts)` → component | a box (canvas or DOM grid) that RE-RENDERS a picture: `ascii · glitchVhs · stickerPop · liquid · gridReveal · halftone · duotone · pixelate · rgbSplit` | scene-local `lt` (like every kit component) |
| **global look** | `K.looks.name(opts)` → handle | registers one `K.addPost` that draws full-frame overlays on `#film` or filters `K.world`: `grade · vignette · scanlines · lightLeak · letterbox · cornerBadge · filmBurn` | **film seconds** `t` |

```js
// a media look is the scene's plate: add it with add() so prepare (frame decoding) + update are driven for you
K.scene({ id: 'old', t0: 2.0, t1: 4.4, build(root, add) {
  const w = K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px`);           // never style the scene root
  const g = add(K.looks.glitchVhs(w, { clip: 'assets/clips/c3293', word: 'ANTES', bursts: [1.2] }));
  K.addCues(g, 2.0);                                                                 // suggested SFX at the scene t0
  // other kit components (type.js words, ui.js cards…) go into `w` AFTER the look so they sit on top of it
} });
// global looks: call once (before or after K.start), film-time windows
K.looks.grade({ contrast: 1.1, saturate: 1.15, warm: .35, lift: .05 });
K.looks.cornerBadge({ line1: 'NORTH PEARL', line2: 'KATANA', at: .2 });
K.looks.filmBurn({ at: 4.4 });                                                       // peak ON the cut at 4.4 s
```

---------------------------------------------------------------------------------------------------------------------------

## Media looks — shared options

Every media look accepts these (defaults in brackets) plus its own options below.

| option | default | meaning |
|---|---|---|
| `src` | — | image URL (`.jpg/.png/.webp…`, relative to the page). A `src` **without** an image extension is treated as a clip dir |
| `clip` | — | frame-sequence dir made by `katana clip` (has `_clip.json`) |
| `in` (alias `clipIn`) | `0` | clip seconds at `at` |
| `rate` | `1` | footage speed. Footage seconds = `in + rate·(lt − at)` |
| `ramp` | — | `[[t, rate], …]` speed ramp (t after `at`) → `in + K.ramp(lt − at, ramp)` |
| `time` | — | `(lt) => clipSeconds` full override |
| `loop` | `true` | wrap the clip (false = hold the last frame) |
| `focus` | `[.5, .5]` | which part of the picture survives the cover crop (0 = left/top, 1 = right/bottom) |
| `zoom` | `1` | extra scale on top of cover |
| `push` | `0` | slow push-in: zoom grows ×e^(push·lt) (`.03` ≈ +3 %/s) |
| `fit` | `'cover'` | `'cover'` or `'contain'` |
| `x, y` | `0, 0` | **top-left** of the look's box, film px |
| `w, h` | `K.W, K.H` | box size (default full frame) — e.g. split screens: two looks with `h: K.H/2` |
| `z` | — | z-index of the box |
| `at` | `0` | entrance start (scene-local s). Invisible before |
| `out` | — | exit start; the look animates out over `outDur` and is hidden after |
| `inDur` / `outDur` | per look | entrance / exit lengths |

- Under the capture motion-blur shutter footage AND per-frame glitch randomness hold one value per output frame
  (`K.heldTime`), so glitches step like real video and never smear into mush.
- Every look's first frame already shows content (no dead frame on the cut), then its entrance finishes.
- `comp.cues()` → suggested SFX (local times); `comp.dur` → entrance length.
- Box sizes, cells, strokes, fonts scale with `U = min(K.W, K.H) / 1080` (1 in both 9:16 and 16:9).
- **Big words** (`glitchVhs`, `liquid`, `gridReveal` `word`) are centred and auto-fitted to `min(frac·W, W − 2·max(safe.left,
  safe.right))` → 820 px on 9:16 (clear of the Reels like/comment rail), ~.88–.9·W on 16:9. Pass `wordWidth` (fraction
  of the box) or `wordSize` (px) to force a size. All OSD / prompt / pill text sits inside `K.safe()`.

---------------------------------------------------------------------------------------------------------------------------

## `K.looks.ascii(parent, opts)` — live green-terminal ASCII

Re-renders the picture as glyphs on a dark CRT: luminance → glyph density + brightness (10 levels, top levels bloom
white), quarter-res bloom, scanlines, vignette, a slow rolling band. Entrance: a bright scan line sweeps top→bottom and
cells resolve through scrambled glyphs. Exit: random dissolve through scramble. Optional typed terminal window.

| option | default | |
|---|---|---|
| `color` | theme `accent2` (lime `#D6FF3D`) | glyph colour |
| `bg` | `'#060902'` | screen colour |
| `cell` | `10·U` | cell width px (height = `cell·aspect`) — smaller = denser/more legible picture (≈108 columns on 9:16) |
| `aspect` | `1.6` | cell height / width |
| `ramp` | 70-char ramp `" .'`^",:;Il!i><~+_-?][}{1)(|\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"` | sparse → dense |
| `levels` | `10` | brightness levels |
| `autoLevels` | `true` | stretch the frame's 2–98.5 % luminance range first (dark/flat footage stays legible) |
| `contrast` / `gamma` / `bright` | `1.25` / `.92` / `0` | luminance shaping before mapping (gamma < 1 lifts mid-tones) |
| `floor` | `.1` | minimum luminance (keeps a dim glyph texture in blacks, like the reference) |
| `dim` | `.2` | alpha of the darkest level |
| `glow` | `.7` | bloom amount (0 = off) |
| `flicker` | `.03` | fraction of cells that swap glyph each frame |
| `invert` | `false` | |
| `scanlines` | `true` | |
| `prompt` | `null` | e.g. `'npm create astro@latest'` → a lime-bordered terminal window types `$ npm create astro@latest` |
| `promptAt` | `at + .35` | window wipes in; typing starts `+.3 s` at `cps` |
| `cps` | `22` | typing speed |
| `promptSize` | `30` (×U) | font px |
| `promptY` | `safe.top + 150·U` | window top (px in the box) — clears a corner badge |
| `promptTitle` | `'north-pearl — zsh'` | title bar text |
| `inDur` / `outDur` | `.6` / `.4` | |

Cues: `glitch` at `at`, `key` every 2nd typed char. Cost ≈ 15 ms/frame JS (≈13 k glyph blits on 9:16 at the default cell).

```js
add(K.looks.ascii(w, { clip: 'assets/clips/c3294', prompt: 'npm create astro@latest', focus: [.5, .4] }));
```

## `K.looks.glitchVhs(parent, opts)` — RGB split, slice displacement, VHS tracking, OSD

Saturated soft VHS picture → per-channel RGB split → horizontal slice displacement (some slices tinted
magenta/cyan/lime) → a wavy tracking band with horizontal static drifting up → head-switching noise on the bottom edge →
static bars on strong hits → grain, scanlines, vignette. On top: VCR OSD (`PLAY ▶` top-left, date + ticking clock
bottom-left, `h:mm:ss:ff` timecode bottom-right, all inside the safe zone, RGB-fringed). Glitch intensity = base noise +
a strong burst at `at` + a burst on every `bursts` time + random spikes (+ a ramp into `out`). Optional BIG word drawn
INTO the picture (so it is split/sliced like the reference "GLITCH").

| option | default | |
|---|---|---|
| `intensity` | `.45` | base glitch level (0 calm VHS … 1 heavy) |
| `bursts` | `[]` | scene-local times of extra glitch hits (put them on beats) |
| `split` | `6·U` | base channel offset px (grows with intensity) |
| `saturate` | `1.4` | VHS colour |
| `tracking` | `true` | tracking band |
| `seed` | `3` | |
| `word` | `null` | e.g. `'RÁPIDA'` — Archivo 900 expanded with a hard dark extruded shadow, auto-fitted to the safe width (see *Big words*), max `.3·H` |
| `wordAt` | `at + .3` | slams in (scale 1.32 → 1, E.snappy) with its own glitch burst |
| `wordY` | `.6` | centre, fraction of box height |
| `wordWidth` / `wordSize` | min(.88·W, safe width) / auto | `wordWidth` is a fraction of the box width |
| `wordColor` | lime | |
| `date` | `"SEP 18 '96"` | OSD line 1 (any text, e.g. `"ENE 15 '26"`) |
| `clock` | `'PM 11:58:00'` | OSD line 2; an `h:mm:ss` inside it ticks with time |
| `play` | `'PLAY'` | text before the ▶ triangle; `false` hides it |
| `timecode` | `true` | bottom-right counter from `at` (+`tcStart` s) |
| `osdSize` | `50` (×U) | OSD font px (Geist Mono 700) |
| `inDur` / `outDur` | `.5` / `.3` | the exit is a glitch blow-out then cut |

Cues: `glitch` at `at` and on each burst, `hit` at `wordAt`. Cost ≈ 6 ms JS + ~10 full-frame canvas ops.

```js
add(K.looks.glitchVhs(w, { clip: 'assets/clips/c3293', word: 'ANTES', bursts: [1.7], date: "SEP 18 '96" }));
```

## `K.looks.stickerPop(parent, opts)` — Y2K sticker on a lime "POP!" pattern

A cut-out PNG (alpha) gets a baked white sticker outline + soft shadow and POPS in (K.pop overshoot, swings from −18° to
`rot`, rises), then floats. Background: lime with a dot grid, rows of huge outlined pattern words + outlined 4-point stars
drifting in alternate directions, white sparkles that pop and twinkle. Optional word sticker (white, ink outline, hard
shadow, e.g. `¡WOW!`) and a black CTA pill with a lime star. Exit: everything shrinks/spins away (E.in).

| option | default | |
|---|---|---|
| `src` | **required** | cut-out PNG with alpha (e.g. `assets/img/np_laptop_cutout.png`); a clip is not supported here |
| `bg` | lime | background colour |
| `pattern` | `'POP!'` | repeated outlined word (`'¡WOW!'`, `'NEW'`…) |
| `patternSize` | `.3` (9:16) / `.26` (16:9) | font px = `patternSize × min(W,H)` (16:9: `× 1.1` more) |
| `patternColor` | `'rgba(24,32,0,.3)'` | outline + dot colour |
| `dots` | `true` | dot grid |
| `drift` | `44` (×U px/s) | pattern row drift (alternate rows in opposite directions) |
| `sx, sy` | `W·.5, H·.5` (16:9: `.52`) | sticker centre px |
| `fitW` / `size` | `.86W, .56H` (16:9: `.46W, .78H`) | max sticker width / height |
| `rot` | `-5` | resting angle (deg) |
| `outline` | `16` (×U) | white outline px |
| `sparkles` | 4 preset | `[[x, y, r], …]` (x,y fractions, r px ×U) |
| `word` | `null` | word sticker text, e.g. `'¡WOW!'` (italic 900 expanded, white, ink outline, hard shadow) |
| `wordAt` / `wordX` / `wordY` / `wordRot` | `at+.32` / `W·.42` / `H·.27` / `-9` | centre px (16:9 `W·.28`, `H·.26`) |
| `wordWidth` / `wordSize` / `wordColor` / `wordInk` | `.56` (16:9 `.36`) / auto / `#fff` / `#141A05` | |
| `pill` | `null` | CTA text, e.g. `'Escríbenos'` (a lime ✦ is appended; `pillStar: false` removes it) |
| `pillAt` / `pillY` / `pillRot` / `pillSize` | `at+.5` / `min(.8H, H − safe.bottom − 50U)` / `-3` / `44` (×U) | |
| `hits` | `[]` | scene-local beat times: damped scale kick (+ a small twist) on the sticker / word / pill |
| `outDur` | `.3` | |

Cues: `popxl` at `at+.06`, `pop` at `wordAt`, `pop` at `pillAt`, `pop` (gain .6) per `hits` time. The outline is baked once (first `prepare`).

```js
add(K.looks.stickerPop(w, { src: 'assets/img/np_laptop_cutout.png', word: '¡WOW!', pill: 'Escríbenos', hits: [1.5, 2.0] }));
```

## `K.looks.liquid(parent, opts)` — gooey lime metaballs + lens reveal + warped word

The picture (dimmed outside) is framed by lime metaball blobs that grow in with overshoot from the edges and drift on
noise, each with three stepped echo halos (darker lime, offset like a trail); a gooey "lens" (main disc + two orbiting
satellites) shows the picture undimmed and magnified inside a lime ring. Crisp vector edges (marching squares on a field,
not blur+threshold). "On the beat": after the entrance, blobs, lens and ring swell on every beat of the film grid
(`K.bpm` / `K.beatOffset`, read from film time) and harder on explicit `pulses`. Optional big word, lavender-white with a blue edge copy, sine-warped (big warp on entrance,
settling to a liquid wobble). Exit: blobs and lens shrink, word warps out.

| option | default | |
|---|---|---|
| `color` | lime | blobs + ring |
| `bg` | `'#050505'` | |
| `dim` | `.5` | brightness of the picture outside the lens |
| `lens` | `{ x: .54, y: .42, r: .34 }` (16:9 `y .48, r .36`) | centre (fractions of the box) + radius (× min(W,H)); `false` = no lens |
| `lensZoom` | `1.08` | magnification inside the lens |
| `ring` | `12` (×U) | lens ring width |
| `blobs` | 9 preset (edges + drops) | `[[x, y, r], …]` x,y fractions of the box, r × min(W,H) |
| `echo` | `3` | halo steps (0 = none) |
| `speed` | `1` | drift speed (blobs wander ±10 % W / ±7 % H on noise) |
| `pulse` | `.1` | beat swell (fraction of radius); `0` = off |
| `beatEvery` | `1` | pulse every N beats of `K.bpm` |
| `pulses` | `[]` | scene-local times of extra, stronger swells (1.8 × `pulse`) |
| `seed` | `7` | |
| `res` | `7·U` | field grid px (smaller = smoother/slower) |
| `word` | `null` | e.g. `'DISEÑO'` (Archivo 900 expanded, fitted to the safe width, ≤ `.34·min(W,H)`) |
| `wordAt` / `wordY` / `wordWidth` | `at+.4` / `.5` / min(.86·W, safe width) | |
| `warp` | `16` (×U) | idle warp amplitude px |
| `wordColor` / `wordEdge` | `'#F2EEFF'` / theme `accent` | |
| `sparkles` | 3 preset | `[[x, y, r], …]` |
| `outDur` | `.4` | |

Cues: `whoosh` at `at`, `pop` at `at+.15`, `hit` at `wordAt`, `pop` per `pulses` time. Cost ≈ 11 ms/frame JS.

```js
add(K.looks.liquid(w, { src: 'assets/img/np_3293_2s.jpg', word: 'DISEÑO', lens: { x: .6, y: .53, r: .31 }, lensZoom: 1.12, pulses: [1.9] }));
```

## `K.looks.gridReveal(parent, opts)` — tile-by-tile 3D flip reveal + outlined big word

A grid of lime tiles (mono labels `R2·C3` / `X545 Y276`, black 4-point stars on ~30 %) flips in real 3D perspective
(rotateY 0→180°, lifting toward camera mid-flip) to reveal the picture cell by cell; dark gaps stay as grid lines,
each picture cell carries a small chip (`B2`). Like the reference `/grid-mask`, a few lime tiles (`keep`, weighted toward
the edges so the subject stays clear) STAY after the reveal, and the grid keeps "shuffling": every `shuffleEvery` s one
tile flips over, alternately covering a picture cell and uncovering a lime one (constant density). Optional big
OUTLINED word (white stroke over a dark offset stroke, Archivo 800 expanded) wipes on left→right with a scale settle
(reference "MOVE"). Exit: every picture face flips back to lime in reverse order (with `from: 'none'` cells turn
edge-on and vanish); the word wipes off. Shuffles scheduled at/after `out` are skipped.

| option | default | |
|---|---|---|
| `cols` × `rows` | `4×7` (9:16) / `6×4` (16:9) | |
| `gap` | `10·U` | grid line px (shows `bg`) |
| `radius` | `6·U` | tile corner radius |
| `bg` | `'#09090A'` | |
| `from` | `'tile'` | `'tile'` = lime tiles flip to picture · `'none'` = picture cells flip in from nothing (scene below shows; no `keep`, shuffles are 360° spins) |
| `tile` | lime | tile colour |
| `labels` / `stars` | `true` / `.3` | tile labels / fraction of tiles with a star |
| `order` | `'random'` | `'random' · 'diagonal' · 'rows' · 'center'` |
| `axis` | `'y'` | `'y'` or `'x'` |
| `revealDur` / `flipDur` | `1.1` / `.42` | whole reveal / one tile |
| `keep` | `.2` | share of lime tiles that stay after the reveal (edge-weighted; `0` = full reveal). Tile mode only |
| `shuffle` | `8` | number of post-reveal tile flips (first at `revealDur + .12` s after `at`) |
| `shuffleEvery` | `.3` | seconds between shuffle flips |
| `seed` | `5` | |
| `word` | `null` | e.g. `'ASTRO'`, fitted to min(.9·W, safe width) (`wordWidth` overrides), ≤ `.42·min(W,H)` |
| `wordAt` / `wordY` / `stroke` / `wordColor` | `at + revealDur/2` / `.5` / `6` (×U) / `#fff` | |
| `wordShadow` | `true` | dark offset under-stroke (legible on lime tiles and on bright footage) |
| `outDur` | `.6` | |

Cues: `swipe` at `at`, 5 `tick`s through the reveal, `hit` at `wordAt`, a soft `tick` (gain .28) per shuffle flip. DOM + 3D
transforms (cheap JS); the picture is drawn into per-cell canvases only when the source frame changes.

```js
add(K.looks.gridReveal(w, { src: 'assets/img/np_3294_2s.jpg', word: 'ASTRO', order: 'diagonal' }));
```

## `K.looks.halftone(parent, opts)` — print dot screen

Rotated dot screen sampled from the picture; dots grow in on a diagonal sweep while the screen re-rasterises from coarse
to fine (stepped). Exit: dots shrink and coarsen.

| option | default | |
|---|---|---|
| `mode` | `'mono'` | `'mono'` = ink dots on paper (dot ∝ darkness) · `'color'` = dots coloured by the picture on black (dot ∝ brightness) |
| `color` | theme `fg` | ink (mono) |
| `bg` | theme `bg` (mono) / `'#0A0A0A'` (color) | paper |
| `cell` | `18·U` | dot pitch px |
| `angle` | `45` | screen angle (deg) |
| `contrast` / `gamma` / `invert` / `autoLevels` | `1.2` / `1` / `false` / `true` | |
| `resolve` | `2.6` | entrance starts at `cell×resolve` |
| `saturate` | `1.5` | colour mode dot saturation |
| `inDur` / `outDur` | `.8` / `.4` | |

Cue: `swipe` at `at`.

```js
add(K.looks.halftone(w, { src: 'assets/img/np_3292_2s.jpg', mode: 'color', cell: 14 }));
```

## `K.looks.duotone(parent, opts)` — two-ink map

Luminance → gradient `dark → (mid) → light`. Entrance: a light-coloured bar sweeps the colour photo into duotone
(diagonal wipe); exit sweeps it back. Recomputed only when the source frame changes (stills: once).

| option | default | |
|---|---|---|
| `dark` / `light` / `mid` | `'#1A1F7A'` / lime / — | |
| `contrast` / `gamma` | `1.25` / `1` | |
| `wipe` | `true` | `false` = cut straight to duotone |
| `wipeAngle` | `18` | deg |
| `bar` | `46` (×U) | width of the light wipe bar (a thin trailing line follows it); `0` = no bar |
| `inDur` / `outDur` | `.7` / `.45` | |

Cue: `swipe` at `at`. Cost ≈ 11 ms per NEW source frame (full-res pixel pass); 0 for stills after the first frame.

## `K.looks.pixelate(parent, opts)` — mosaic in/out

Block size steps from `from` px down to `to` (resolve) on entrance and from `to` up to `outTo` on exit — discrete steps,
blocks centred, averaging downsample + nearest-neighbour upsample.

| option | default | |
|---|---|---|
| `from` / `to` / `outTo` | `72·U` / `1` / `from` | block px |
| `steps` | `7` | discrete block sizes per transition |
| `hold` | `0` | constant block px (disables in/out animation) |
| `grid` | `false` | faint lines between blocks (≥ 8 px) |
| `inDur` / `outDur` | `.6` / `.5` | |

Cue: `glitch` at `at`. Typical: `{ out: sceneDur − .45, outDur: .45 }` to break up into the next cut.

## `K.looks.rgbSplit(parent, opts)` — chromatic aberration

R / B channels offset in opposite directions along `angle`, with a slight opposite scale (radial fringe). Burst on
entrance, extra bursts on `pulses`, per-frame jitter, blow-out on exit.

| option | default | |
|---|---|---|
| `amount` | `10·U` | base offset px |
| `angle` | `0` | deg (0 = horizontal) |
| `burst` | `5` | entrance/pulse multiplier (decays e^-7t) |
| `pulses` | `[]` | scene-local beat hits |
| `jitter` | `.35` | per-frame wobble |
| `zoom2` | `.006` | channel scale difference |
| `inDur` / `outDur` | `.5` / `.3` | |

Cues: `glitch` at `at`, `hit` per pulse.

---------------------------------------------------------------------------------------------------------------------------

## Global looks

They return a handle `{ kind, o, cues?() }`; their nodes are direct children of `#film` created on the first frame:
z 54 grade overlays + lightLeak · 55 vignette/scanlines · 56 letterbox + filmBurn · 57 cornerBadge (`#fx` transitions
are z 50, `#grain` z 60). So they sit above every scene AND above transition overlays, and their blend modes reach the
whole picture. Window options shared by `grade`, `vignette`, `scanlines`, `cornerBadge`: `t0` (0), `t1` (∞, film s),
`fadeIn`, `fadeOut` (s), `mix` (0–1 strength). For a look that changes per section, call it several times with
its own window. Several `grade` handles COMPOSE: their filters are concatenated on `K.world` while their windows are
open (non-overlapping windows = a per-section grade; overlapping ones stack, e.g. a base grade + a short `fadeIn`/`fadeOut`
punch).

### `K.looks.grade(opts)` — colour grade
`contrast` 1.08 · `saturate` 1.12 · `brightness` 1 · `hue` 0 (deg) → CSS `filter` on **`K.world`**; `warm` 0 (−1…1; >0
soft-light wash of `warmColor` `#FF8A2E`, <0 of `coolColor` `#2E7BFF`) and `lift` 0 (0–.25, raises blacks: screen of
`liftColor` `#FFEEDC`×lift) are overlays. `target: 'backdrop'` puts the filter on a backdrop-filter overlay instead of
`K.world` (also grades `#fx` overlays; keeps world 3D).
**Cost:** a filter on `K.world` forces the browser to re-raster the whole world every frame (~+15–40 % capture time) and
FLATTENS `K.world`'s `preserve-3d` — scenes no longer intersect each other in 3D and a world-level `K.CAM` 3D move is
applied to the flattened picture (3D inside a scene root still works). Keep values gentle; reference look:
`{ contrast: 1.1, saturate: 1.15, warm: .3, lift: .05 }`.

### `K.looks.vignette(opts)`
`amount` .55 (edge opacity) · `size` .5 (clear radius, fraction of farthest corner) · `color` `#000` · `cy` .5 · window.

### `K.looks.scanlines(opts)`
`gap` 4 (×U px period) · `thickness` .5 (of the period) · `opacity` .2 · `blend` `'multiply'` · `roll` true (a soft
bright band rolling down, `rollOpacity` .07, `rollSpeed` .25 screens/s) · `flicker` .12 · window.

### `K.looks.lightLeak(opts)` — warm leaks (screen blend)
Three big radial blobs (`colors` `['#FF5A1F', '#FFB347', '#FF2E6A']`, `blobs` 3, `size` .95 × max(W,H)) drift on
noise near `side` (`'left' | 'right' | 'top' | 'bottom' | 'tl' | 'tr' | 'bl' | 'br'`), `intensity` .85, `speed` .5,
`seed` 1. Either a **window** `t0`/`t1` with `fade` .5 (breathes) or a **pulse** `at` + `dur` 1.4 (rises to `at`,
falls after). Cue (pulse): `whoosh`.

### `K.looks.letterbox(opts)` — animated bars
Bars slide in at `at` (E.snappy, `inDur` .5) and out at `out` (E.in, `outDur` .4). Size: `size` px, or `ratio` = visible
window W/H (e.g. 2.39); default 11 % of H each on 9:16, 2.39:1 on 16:9. `color` `#000`, `edge` (optional accent line
colour on the inner edge). Cue: `bars` at `at`.

### `K.looks.cornerBadge(opts)` — "NORTH PEARL / KATANA" tag
Two stacked boxes, italic heavy caps (Archivo 900 italic): `line1` `'NORTH PEARL'` black on lime (`color`, `ink`),
`line2` `'KATANA'` white on black (`color2`, `ink2`), right-aligned, line 2 nudged left. Fixed in the safe zone:
`pos` `'tr'` (also `'tl' | 'br' | 'bl'`), `dx`/`dy` offsets. `size` 52 (×U px, line 1), `ratio2` .84 (line 2 size / line 1),
`scale` 1, `stretch` 84 (% — condensed, like the reference `HIGGSFIELD / CLAUDE MOTION` tag; 100 = normal width),
`outline` (true = 3 px black ring — use it on lime scenes), `counter` (small mono line, e.g. `'01 / 06'`,
`counterColor` theme `accent3`). Entrance at `at` (.15): each box wipes in from its edge with a skew settle (70 ms
stagger); `out` wipes it away; `hits: [t…]` = small scale pulses on beats. Shown inside the window (`t0`/`t1`).
Cue: `swipe` at `at`. Note: `glitchVhs` puts its OSD in the top-left, bottom-left and bottom-right safe corners — keep the
badge at `'tr'` over a glitch scene (or move it with `dy`).

### `K.looks.filmBurn(opts)` — warm burn that hides a cut
Peak (near-white warm flash) exactly ON `at` (film s, put it on the cut); `dur` .6 total (45 % before, 55 % after);
blobs sweep across `from` `'left'` (`'right' | 'center'`); `colors` `['#FF4A12', '#FF9A3C', '#FFD27A']`, `core`
`#FFF6E2`, `intensity` 1. Use for a soft, warm transition between two scenes with a hard cut at `at`. Cues: `whoosh` at
`at − .3·dur`, `hit` at `at` — `K.addCues(K.looks.filmBurn({ at }))`.

---------------------------------------------------------------------------------------------------------------------------

## Recipes (North Pearl)

- **Antes / después**: old site as `glitchVhs({ word: 'ANTES' })` → `filmBurn` on the cut → new site as
  `liquid({ word: 'DESPUÉS' })` or `gridReveal({ word: 'ASTRO' })`.
- **Hook on lime**: `stickerPop({ src: cutout, pattern: '¡NUEVA!', word: '¡WOW!', pill: 'Escríbenos' })` +
  `cornerBadge({ outline: true })`.
- **Code beat**: `ascii({ clip, prompt: 'npm create astro@latest' })`, 1.5–2.5 s, cut on the end of typing.
- **Data punch**: `duotone` or `halftone` plate under big type (type.js) for "81 → 94".
- **Whole film**: one `grade` + `vignette({ amount: .4 })` + `cornerBadge` + `lightLeak` pulses on 2–3 section changes.

## Gotchas

- Add media looks with the scene's `add()` (or call `await comp.prepare(lt)` yourself before `update`) — without it the
  picture is not decoded and the canvas stays empty.
- Images must be same-origin over http (capture `--serve`): canvases read pixels.
- Put the look FIRST in the scene wrapper; other components after it render on top.
- Do not set `will-change: transform` on anything you scale over time: Chrome keeps the old raster scale and the frame
  then depends on seek order (breaks `--check-determinism`).
- Fonts used: Archivo 900 / italic 900 (expanded via `font-stretch`), Geist Mono — looks.js adds them to `K.fonts`, so
  load looks.js before `K.start`.
