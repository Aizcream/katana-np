# Kit · transitions — scene-to-scene moves (`K.trans.*`)

`engine/kit/transitions.js` → `K.trans.cut · whip · push · cover · slice · flash · colorBurst · iris · gridMask · liquid ·
spin3d · glitch · punch · zoomThrough · zoomOut · smear` (+ `K.trans.blur`, `K.trans.util`).
Demo: `engine/demos/transitions.html` — 17 North Pearl scenes chained with all 16 transitions, the magenta label names the
nearest one (`?fmt=16x9` for landscape, `?set=b` swaps every transition to a non-default variant: whip up/distance .45,
zoomThrough portal, zoomOut keep:false, slice 'h' alt/center, iris roundrect, gridMask center, spin3d flip, …;
`?set=cuts` replaces them all with plain hard cuts — a debugging baseline).
Cut times in the demo (9:16 and 16:9 alike):
cut 1.267 · whip 2.433 · zoomThrough 3.633 · zoomOut 4.833 · push 5.967 · cover 7.133 · slice 8.333 · flash 9.5 ·
colorBurst 10.667 · iris 12.133 · gridMask 13.333 · glitch 14.8 · liquid 16.0 · spin3d 17.2 · punch 18.333 · smear 19.433.

```js
// scene a ends ON the cut, scene b starts ON the cut — the transition keeps both visible across its own window
K.scene({ id: 's1', t0: 0,   t1: 2.4, build(root) { const w = K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px;background:#2B4BFF`); /* … */ } });
K.scene({ id: 's2', t0: 2.4, t1: 4,   build(root) { /* full-bleed background first, then content */ } });
const tr = K.trans.whip({ at: 2.4, a: 's1', b: 's2', dir: 'left' });
K.addCues(tr);                                   // suggested SFX (absolute times) — or pass sfx: true
```

## How transitions work (read once)

- A transition is a `K.transition(def)` registered at definition time; it styles the two **scene roots** (`A` = scene
  `a`, `B` = scene `b`) every frame inside its window `[at − before, at + after)` and draws overlays in `K.fx`.
  The engine resets the roots each frame, keeps `a` visible until `at + after` and `b` from `at − before`, so the usual
  layout is **`a.t1 = at = b.t0`** (no `pre`/`post` needed). `a` or `b` may be `null` (from / into the film background).
- **Scenes must paint their own full-frame background** (a full-bleed child div/img). Every transition overlaps A and B;
  a transparent scene shows the other one through it.
- **Speed peak on the cut.** Every move accelerates into `at` (E.in-type) and leaves it with a speed-matched decelerating
  curve or spring, so the cut (or the half-way point of a continuous move) hides inside the fastest frame. Zoom direction is
  preserved across the cut (zoomThrough: both grow; zoomOut: both shrink; smear: both grow).
- **Stylised motion blur** is drawn by SVG filters (directional gaussian, radial zoom blur, per-strip blur) so motion
  reads in stills and drafts. Blurred roots keep opaque edges (the film background never leaks at frame edges), except
  the **upper** of two adjacent moving scenes (whip, push, cover, slice): its edges fade like a real shutter smear over
  the lower scene, so the seam between A and B is a soft smear, never a crisp line across blurred content.
  `K.trans.blur` (default `1`) scales all of it — set `K.trans.blur = .5` for `--mb` finals if the result looks doubled.
- Do not let two transition windows overlap on the same scene (both write `transform`/`filter`; the later one wins).
  Keep scenes ≥ the sum of the halves of their two transitions (≈ 0.7 s is plenty for every default).
- Pivots: `x`, `y` in film px (default: frame centre) **or** `target: element | () => element` (its centre, measured every
  frame, so it follows the scene's own motion; `dx`/`dy` add an offset). Measure-free and format-safe — prefer `target`.
- Everything is a pure function of `t`. Discrete events (flash frames, glitch seeds, colour blocks) are quantised to frames.
  Determinism: see the bottom of this page (the demo passes at 9:16 and 16:9).
  Film-side caveat found while testing: a `scale()` that keeps changing on a big text layer (a slow push-in, a 1.045→1
  settle on every line) or text placed on a half pixel makes Chrome reuse glyph rasters history-dependently → isolated
  1–5 px glyph-edge differences (max ≈ 60/255) that fail the determinism check even with plain hard cuts. Place text
  blocks on whole pixels and drift them by whole-pixel translation; keep scale changes on text short.


> **Content in B at the cut.** B's root is visible from `at − before`, but kit components inside B stay hidden until their own
> `at`. For B to show content during the pre-roll (zoomOut, zoomThrough, smear…), give those components a NEGATIVE `at`
> (e.g. `at: -.3`), i.e. start them before the scene's `t0`. Entrance SFX of such components: filter with
> `K.addCues(comp, t0, { skip: ['pop'] })`.

## Common options (every transition)

| option | default | meaning |
|---|---|---|
| `at` | — (required) | the cut, film seconds (put it on the frame grid / beat: `K.beat(n)`) |
| `a`, `b` | `null` | outgoing / incoming scene ids |
| `dur` | per transition | whole window; split into `before`/`after` by a per-transition ratio |
| `before`, `after` | from `dur` | explicit window halves (s before / after `at`) |
| `blur` | per transition | multiplier on that transition's stylised blur (`0` = none) |
| `cue` | — | `false` = no suggested SFX; a string replaces the default kind |
| `sfx` | `false` | `true` → `K.addCues(def)` immediately |

Returned def (also what `K.transition` returns): `{type, at, a, b, before, after, apply, dur, end, opts, cues()}`.
`def.cues()` → `[{kind, t, gain}]` with **absolute** film times → `K.addCues(def)` (t0 = 0).
`def.end` = `at + after` (for colorBurst: when scene `b` should start).

---

## cut — hard cut, optional flash frames and punch

```js
K.trans.cut({ at: 1.267, a: 's1', b: 's2', flash: 2, punch: .06 })
```
| option | default | |
|---|---|---|
| `flash` | `0` | 0–3 full-colour frames starting on the cut (frame 1 at 100 %, the rest at 55 %) |
| `color` | `'#fff'` | flash colour |
| `punch` | `0` | B starts at scale `1 + punch` and decays (e^−14t) — e.g. `.06` |

Window: `before` 1/240 s, `after` = max((flash+1)/fps, punch ? .4 : 0). SFX: `hit` on the cut (only with flash/punch).

## whip — fast camera whip with directional blur

```js
K.trans.whip({ at, a, b, dir: 'left' })            // content flies left, B arrives from the right
```
| option | default | |
|---|---|---|
| `dir` | `'left'` | direction the content moves: `left` · `right` · `up` · `down` |
| `distance` | `1` | `1`: A and B adjacent on one strip, the seam (a soft smear) crosses the centre on the cut. `< 1` (e.g. `.45`): A is thrown `distance` frames, hard swap on the cut, B is caught from the opposite side; the side each one uncovers is filled with its own mirror image (`-webkit-box-reflect`), so no background ever shows |
| `dur` | `.36` | split 50 / 50 |
| `k` | `3.2` | ease exponent (higher = sharper speed peak) |
| `blur` | `1` | |

SFX: `whip` at `at − .12`.

## push — both scenes move, B lands on a spring

```js
K.trans.push({ at, a, b, dir: 'up' })
```
| option | default | |
|---|---|---|
| `dir` | `'left'` | direction both scenes move |
| `dur` | `.72` | split 34 % before / 66 % after |
| `k` | `2.4` | acceleration exponent into the cut (the seam is mid-frame on the cut) |
| `w`, `z` | `17`, `.6` | spring angular frequency / damping ratio (≈ 2 % overshoot; the exposed edge is mirrored) |
| `blur` | `.8` | |

SFX: `whoosh` at `at − .14`.

## cover — B slides over A with a shadow, A drifts and dims

```js
K.trans.cover({ at, a, b, dir: 'left', parallax: .28 })
```
| option | default | |
|---|---|---|
| `dir` | `'up'` | direction B travels (it enters from the opposite side) |
| `dur` | `.62` | split 32 / 68 |
| `parallax` | `.28` | A moves this fraction of B's travel, same direction |
| `dim` | `.45` | A brightness drops by this much at full cover |
| `shadow` | `.5` | opacity of B's soft drop shadow ahead of its leading edge (0 = none) |
| `k` | `2.4` | |
| `blur` | `.7` | |

SFX: `swipe` (bars whoosh) at `at − .12`.

## slice — n strips, each strip of B pushes A's strip out, staggered

```js
K.trans.slice({ at, a, b, n: 5, dir: 'v', from: 'top', color: '#FF4D2E' })
```
| option | default | |
|---|---|---|
| `n` | `5` | number of strips |
| `dir` | `'v'` | `'v'`: vertical strips (columns) moving vertically · `'h'`: horizontal strips (rows) moving sideways |
| `from` | `'top'` / `'left'` | where B comes from: `'top'`/`'bottom'` (v), `'left'`/`'right'` (h), or `'alt'` (alternating) |
| `order` | `'lr'` | stagger order across strips: `'lr'` (first strip first), `'rl'`, `'center'` (middle first) |
| `stagger` | `.05` | s between neighbouring strips (the middle strip crosses on the cut) |
| `strip` | `.46` | one strip's travel time |
| `color` | `null` | a bar of this colour rides each seam, glued to the leading edge of B's strip (gap grows and closes with the move; at speed the bar also stretches back over B's smeared edge) |
| `gap` | `.03` | bar thickness at rest-speed, fraction of the travel axis (only with `color`; + 0.9 × the strip's blur while moving) |
| `blur` | `.6` | per-strip blur along the travel, from each strip's own speed |

Window: `before = after = strip/2 + max|rank|·stagger` (n 5, lr → .33 s each side). SFX: `bars` at `at − .14`.
Implementation: per-strip displacement (two-stage feDisplacementMap, sub-pixel exact) — no DOM cloning, any content.

## flash — burn up, white frames, burn down

```js
K.trans.flash({ at, a, b, frames: 2, color: '#fff' })
```
| option | default | |
|---|---|---|
| `frames` | `2` | full-colour frames from the cut (frame 2+ at 85 %) |
| `color` | `'#fff'` | |
| `gain` | `1.6` | extra brightness at the peak (A burns up to 1+gain, B burns down from it) |
| `dur` | `.34` | split 40 / 60 |

SFX: `hit` on the cut.

## colorBurst — 2–3-frame full-frame colour blocks between A and B (the r1 burst)

```js
const cb = K.trans.colorBurst({ at: 10.667, a: 's9', b: 's10', frames: 2,
  items: [{ color: '#FF4D2E', word: 'RÁPIDA' }, { color: '#D6FF3D', word: 'LIMPIA' }, { color: '#FF5CA8', word: 'ÚNICA' }] });
K.scene({ id: 's10', t0: cb.end, /* … */ });      // b starts when the burst ends (cb.end = at + n·frames/fps)
```
| option | default | |
|---|---|---|
| `items` | — | `[{color, word?, fg?}]` one per block (`fg` auto: ink on light, white on dark) |
| `colors` / `words` | `[accent, accent2, accent3]` / `[]` | alternative to `items` (theme `var(--k-*)` allowed) |
| `frames` | `2` | frames per block (2–3) |
| `size` | auto | word font-size px (auto-fit, measured in the word's own face — display, italic serif or `font`: 84 % of the width on 9:16, 60 % on 16:9, ≤ 32 % of the height) |
| `font` | display face | CSS font-family override |
| `serif` | `false` | odd blocks use the italic serif |

The burst starts ON `at` (A's last frame is the one before) and lasts `def.dur`. Scene `b` may also start at `at`: it stays
hidden under the blocks (its local time keeps running). Words get a 2-frame scale settle and ±2° tilt. SFX: `tick` per block.

## iris — B grows out of a point (circle / rounded rect) with a ring

```js
K.trans.iris({ at, a, b, x: K.W * .5, y: K.H * .62, shape: 'circle', ring: '#D6FF3D' })
```
| option | default | |
|---|---|---|
| `x`, `y` / `target` | centre | where the iris opens |
| `shape` | `'circle'` | `'circle'` or `'roundrect'` (frame-aspect rectangle, 30 % corner radius) |
| `ring` | `'var(--k-accent2)'` | ring colour on the edge; `null` = no ring |
| `ringWidth` | `.02` | × min(W, H) |
| `dur` | `.62` | split 55 / 45 |
| `mid` | `.42` | fraction of the radius reached on the cut |
| `k` | `2.6` | |

A pushes in (×1.1) behind; B settles from ×0.9 to 1 inside the opening. SFX: `zoom` at `at − .2`.

## gridMask — tiles flash the accent, then open onto B (the r3 grid-mask)

```js
K.trans.gridMask({ at, a, b, order: 'diag', color: '#D6FF3D' })
```
| option | default | |
|---|---|---|
| `cols`, `rows` | 4 × 7 on 9:16, 7 × 4 on 16:9 | grid (rows default to square tiles) |
| `order` | `'diag'` | `'diag'` · `'rows'` · `'center'` (outward) · `'random'` (with `seed`) |
| `stagger` | `.028` | s per rank step (the middle rank opens on the cut) |
| `tile` | `.22` | one tile's open time |
| `color` | `'var(--k-accent2)'` | accent tile colour (leads B in each tile); `null` = straight reveal |
| `seed` | `0` | for `order: 'random'` |

Each tile: the colour square grows from its centre (ease-out over 0.75·tile), then B opens inside it, leaving a colour
ring that closes onto the tile edge at speed — a ring wave runs across the grid and leaves no hairlines behind.
A recedes (×0.95) and dims behind. Window: `before` = half the real stagger spread + 0.8·tile, `after` = half the spread
+ 0.7·tile, computed for the widest of the current, 9:16 and 16:9 grids (`K.start` may set the format after the
transition is defined); default diag 4 × 7 → ≈ .30 s / .28 s. SFX: `bars` at `at − .2`, `tick` at `at − .06` and `at + .08`.

## liquid — metaball flood in a colour, then a blob-shaped hole opens onto B (the r3 liquid)

```js
K.trans.liquid({ at, a, b, x: K.W * .28, y: K.H * .7, color: '#D6FF3D', color2: '#2B4BFF' })
```
| option | default | |
|---|---|---|
| `x`, `y` / `target` | centre | where the blob starts |
| `color` | `'var(--k-accent2)'` | flood colour (and the rim around the opening hole) |
| `color2` | `null` | a second colour flooding inside the first (cover colour on the cut; B opens through it with a `color` rim) |
| `blobs` | `7` | satellites around the main blob (bulges + droplets) |
| `seed` | `3` | blob layout |
| `dur` | `1.1` | split 50 / 50 (the flood is the slow part) |

The cut is the frame of full cover. SFX: `swoosh` at `at − .32`, `pop` on the cut.

## spin3d — cube turn (or card flip)

```js
K.trans.spin3d({ at, a, b, dir: 'left', mode: 'cube' })
```
| option | default | |
|---|---|---|
| `dir` | `'left'` | turn direction (`left`/`right` turn about Y, `up`/`down` about X) |
| `mode` | `'cube'` | `'cube'`: A and B are two faces (45° on the cut) · `'flip'`: A turns edge-on, cut, B turns in (scale dip .86; the edge-on instant falls half a frame before the cut, so no frame is an empty card — the frames either side show A at ≈ 78° and B at ≈ 77°) |
| `perspective` | `2.1` | × max(W, H) px |
| `dur` | `.7` | split 44 / 56 (B settles on a spring) |
| `blur` | `.6` | |

Faces darken as they turn away. The film background shows around the cube's far edges (set `K.BG` to taste).
SFX: `whip` at `at − .14`.

## glitch — digital breakup (the r3 glitch-vhs)

```js
K.trans.glitch({ at, a, b, amount: 1 })
```
| option | default | |
|---|---|---|
| `amount` | `1` | intensity (slice displacement 16 % W, RGB split 2.2 % W, jitter 1.6 % W at peak) |
| `seed` | `1` | |
| `colors` | `['#00FF6A','#FF2BD6','#2B4BFF','#FFFFFF']` | neon bars cycling per frame |
| `dur` | `.3` | split 40 / 60 (≈ 9 frames, the strong part ≈ 6 around the cut) |

Blocky horizontal slice displacement + RGB split per frame, A/B interleaved in random bands on the frames next to the cut,
scanlines + neon bars in fx. SFX: `glitch` (synth) at `at − .08`.

## punch — impact: scale punch + decaying shake on B

```js
K.trans.punch({ at, a, b, flash: 1 })            // cut into an impact
K.trans.punch({ at: 5.2, b: 's4', scale: 1.1 })  // in-scene impact on s4 (no a: nothing is hidden)
```
| option | default | |
|---|---|---|
| `scale` | `1.18` | B's starting scale (decays e^−12t) |
| `shake` | `.024` | shake amplitude × min(W, H) (7 Hz x / 6 Hz y, decaying) |
| `rot` | `1.6` | tilt shake, degrees |
| `flash` | `0` | flash frames on the impact (90 % then 45 %) |
| `color` | `'#fff'` | flash colour |
| `x`, `y` / `target` | centre | punch pivot |
| `before`, `after` | `.16` (with a) / `.6` | A smears + burns into the cut (no scale, edges stay covered) |
| `blur` | `1` | radial blur strength |

B is over-scaled while shaking so no edge is ever exposed. SFX: `impact` on the cut.

## zoomThrough — fly INTO a point of A, B emerges from it

```js
K.trans.zoomThrough({ at, a, b, target: () => refs.dot, scale: 16, from: .3 })
```
| option | default | |
|---|---|---|
| `x`, `y` / `target` | centre | the point you fly into (a dot, the hole of an "O", a logo) |
| `scale` | `8` | A's scale on the cut (6–10 for busy frames; enough to make the target fill the frame, e.g. 16 for a period) |
| `from` | `.35` | B's scale on the cut (.3–.4); B appears as a rounded card nested in the target |
| `center` | `true` | the camera pans the target to the frame centre while zooming (and back out as B settles) |
| `portal` | `false` | `true`: B is visible before the cut as a tiny growing window inside the target |
| `radius` | `.05` | B card corner radius while small, × min(W, H) |
| `k` | `3` | log-space ease exponent (E.in into the cut, speed-matched E.out after) |
| `dur` | `.62` | split 48 / 52 (≈ .30 s before, .32 s after) |
| `blur` | `1` | radial zoom blur |

A keeps growing behind B (same log-velocity) until B covers the frame. SFX: `zoom` at `at − .24`.

## zoomOut — the reverse: A shrinks into a dot while B pulls back from huge

```js
K.trans.zoomOut({ at, a, b, scale: 8 })
```
| option | default | |
|---|---|---|
| `x`, `y` / `target` | centre | pivot |
| `scale` | `8` | B's scale on the cut (B pulls back from here to 1) |
| `to` | `.35` | A's scale on the cut (it turns into a rounded card, then a pill/dot) |
| `keep` | `true` | A keeps shrinking into a dot after the cut (r2 "cards shrink to a point"); `false` = A disappears on the cut |
| `k` | `3` | |
| `dur` | `.62` | split 50 / 50 |
| `blur` | `1` | |

SFX: `zoom` at `at − .24`.

## smear — radial smear: A rushes in, B arrives out of the same blur

```js
K.trans.smear({ at, a, b })
```
| option | default | |
|---|---|---|
| `x`, `y` / `target` | centre | smear centre |
| `scale` | `1.55` | A's scale on the cut |
| `from` | `.8` | B's scale on the cut (still growing → direction preserved; the blur covers the margin) |
| `streaks` | `true` | radial light streaks + bloom in fx (screen blend) |
| `color` | `'#fff'` | streak / bloom colour |
| `seed` | `0` | streak layout |
| `dur` | `.5` | split 50 / 50 |
| `blur` | `1` | |

Both sides burn brighter (+50 %) at the cut; after the cut the streaks/bloom clear within ≈ 4 frames (`(1 − p)^2.4` over
0.6·after) so a dark scene b is not left under a grey veil. SFX: `zoom` at `at − .22`, `hit` on the cut (gain .7).

---

## Choosing (Katana grammar)

| beat | use |
|---|---|
| fast list / rhythm cuts | `cut` (± `flash: 1–2`, `punch: .05`), `colorBurst` between ideas, `whip` |
| a reveal of a product / footage | `zoomThrough` into a dot or letter, `gridMask`, `iris`, `liquid` |
| stepping back / summary | `zoomOut` (A becomes a dot inside B) |
| calm hand-off between two statements | `push`, `cover`, `slice` |
| hype / drop | `smear`, `punch`, `glitch`, `flash` |
| 3D card look | `spin3d` |

Speed/duration cheat-sheet (defaults): whip .36 · glitch .3 · flash .34 · iris .62 · cover .62 · zoomThrough .62 ·
zoomOut .62 · slice ≈ .66 · spin3d .7 · push .72 · gridMask ≈ .58 · liquid 1.1 · smear .5 · punch .76 (with a) · colorBurst
frames × blocks (2 × 3 = 6 frames). Put `at` on the beat; bursts of 4–6-frame cuts, then 1–2 s holds.

## Utilities

`K.trans.util = { ramp(lt, before, after, mid, k) → {p, v}, springFrom(lt, D0, v0, after, w, z) → {p, v},
sigma(pxPerSecond, cap), about(px, py, s), pivot(opts), dirBlur(clip) → (bx, by, soft) → css (soft = no edge alpha boost: for the upper of two moving layers), zoomBlur() →
(px, py, amt) → css }` —
the same timing curves and SVG blurs, for custom transitions written with `K.transition` directly.

## Cost

Heaviest per frame: `zoomThrough`, `zoomOut`, `smear`, `punch` (8-copy radial blur on two full-frame roots), `slice`
(displacement + per-strip blur), `glitch`. All render in well under a second per frame in headless Chrome on the M4.

## Determinism (measured on the demo, `node tools/capture.mjs … --check-determinism`)

| run | result |
|---|---|
| 9:16, default set | pass — worst 2/255 (86 stills × forward / reverse / shuffled) |
| 9:16, `?set=b` | pass — worst 2/255 |
| 16:9, CPU raster (Chrome `--disable-gpu-rasterization`) | pass — worst 2/255 |
| 16:9, default GPU raster (Metal) | 1–4 isolated px per still (max 60/255, mean 0) on two stills groups: the colorBurst word (≈ 345 px glyphs at 16:9) and the inline-SVG logo of the end card |

The 16:9 GPU residue is not transition state: Skia draws glyphs larger than ≈ 256 device px (and big SVG paths) with a
GPU path renderer whose choice depends on what was drawn before, so one anti-aliased pixel where two glyphs overlap can
differ with seek order. Evidence: with the earlier demo scenes (lines settling from scale 1.045, blocks on half pixels)
it reproduced even with every transition replaced by a hard cut (`?set=cuts`); frames during cover / gridMask were
enough history to flip pixels in scene 1 until the 16:9 headlines were capped below 256 px; CPU raster removes all of it. Practical rules: keep headline glyphs ≤ ≈ 250 px where determinism matters (the
demo caps 16:9 headlines at 21 % of H), or capture with CPU raster (suggested core option for `tools/cdp.mjs`).
