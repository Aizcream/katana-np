# Kit · scene3d — real 3D (three.js) inside a film

`engine/kit/scene3d.js` → `K.kit.scene3d` (the component) and `K.three.*` (helpers). Needs `engine/vendor/three.katana.js`
(three.js r170 + RoundedBoxGeometry, RoomEnvironment, mergeGeometries as ONE classic script → `window.THREE`, no network).
Demo: `engine/demos/scene3d.html` — flood of 2,500 printed discs that parts around sticker labels · hanging hardware with an
LED panel, cables and a chrome mast · ring of UI cards around a particle heart (`?fmt=9x16` vertical, `?set=b` QA scenes:
blocks + contact shadow + pinned DOM chips + a second small scene3d + a kit transition).

A page that uses it loads two more scripts after `looks.js` (the template already does):

```html
<script src="../../../engine/vendor/three.katana.js"></script>
<script src="../../../engine/kit/scene3d.js"></script>
```

```js
K.fonts.push('700 100px "Poppins"');                    // faces drawn on 3D canvases (labels, cards): declare them before K.start
K.scene({ id: 'hero', t0: 0, t1: 4, build(root, add) {
  const w = K.div(root, `left:0;top:0;width:${K.W}px;height:${K.H}px;overflow:hidden`);   // never style the scene root
  const N = K.three, T = N.THREE;
  const s3 = add(K.kit.scene3d(w, {
    bg: ['#a9cdfb', '#fde6d3'], env: 'sky', lights: 'product', fov: 30, dof: { aperture: .1 },
    camera: [{ t: 0, pos: [-3, 1, 3], look: [-1.7, 0, .8], roll: -8 }, { t: 2, pos: [2.7, 1, 8.3], look: [.4, 0, .4] }, { t: 4, pos: [3.5, .8, 8.9], look: [.5, 0, .4] }],
    build(ctx) {                                         // once: create objects, return whatever frame() needs
      const body = new T.Mesh(N.rbox(5.5, 2.4, 1.5, .46), N.mat.plastic('#1f44dd')); body.castShadow = body.receiveShadow = true;
      const led = N.ledPanel({ cols: 80, rows: 23, pitch: .0385, screens: [{ at: .7, lines: ['tararea algo…'], type: 11, cursor: true }] });
      led.position.set(1, .2, .76); body.add(led);       // children stay glued to their parent
      return { body: ctx.add(body) };
    },
    frame(lt, ctx, s) { s.body.rotation.z = .016 * Math.sin(lt * 1.3); },   // PURE function of lt — set, never increment
  }));
  const tag = K.div(w, 'left:0;top:0;font:600 30px "Geist Mono";z-index:5', 'M-1');           // DOM above the canvas…
  add({ update() { const a = s3.project([-2.6, -1.7, 0]); tag.style.transform = `translate(${Math.round(a.x)}px,${Math.round(a.y)}px)`; } });   // …pinned to a 3D point
} });
```

`K.kit.scene3d(parent, opts) → { el, update(lt), prepare(lt), project(p), ctx, scene, camera, state, cues() }` (see
`CONTRACT.md`). Add it with the scene's `add()`. `el` is a `<canvas>`; it is hidden — and nothing is rendered — before
`at`, from `out` on, and whenever its scene is not visible.

## How it works (and why it is deterministic)

- **One WebGLRenderer per page**, on a canvas that is not in the DOM. Each component owns a 2D `<canvas>` (`el`): `update(lt)`
  evaluates the camera rig → your `frame(lt)` → the helpers' updaters (instances, particles, cables, LED panels) →
  renders synchronously → copies the pixels into `el` with `drawImage`. When `__seek` resolves the frame is on screen.
  Any number of components and scenes share the renderer (the shared canvas only grows; each one draws into its corner).
- **Every frame is rebuilt from `lt`.** No simulation, no accumulated state, no clocks. Randomness is `K.three.rnd(i, k, seed)`
  (integer hash). Moving geometry (instances, particles, cables) is never frustum-culled and carries a FIXED bounding
  sphere: three computes one lazily from the first frame it draws and uses its centre as the depth-sort key, so the draw
  order of blended objects depended on which frame a tab rendered first. If you animate vertices of your own geometry, do
  the same (`geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity); mesh.frustumCulled = false`).
- **Texture canvases are CPU-backed** (labels, cards, atlases, LED panels). A GPU-backed 2D canvas rasterises text through a
  glyph cache that depends on what the tab drew before; the uploaded texture then differed by one grey level between seek
  orders. If you hand your own `<canvas>` to `K.three.card`, create its context with `{ willReadFrequently: true }`.
- **Fonts and images** used by labels/cards are awaited in `prepare()`; capture never grabs a fallback font. Declare the
  faces in `K.fonts` before `K.start` so label widths are exact at build time (otherwise the label is re-measured and its
  geometry rebuilt when the font arrives — pixels are right, but a layout you computed from `userData.w` at build is not).
- **Valid premultiplied alpha.** Particles write premultiplied colour with alpha ≥ every channel, also when additive.
  Your own additive materials on a transparent canvas should too (`premultipliedAlpha: true`), or give the component a `bg`.
- Result: the WebGL frame is bit-identical whatever was rendered before (forward, reverse, shuffled, repeated), in GPU
  mode and with `KATANA_CPU_RASTER=1`; `--check-determinism` passes in both.

Your side of the contract: `frame()` SETS transforms from `lt` (`obj.rotation.y = lt * .4`, never `+= .01`); discrete
events (typed characters, swaps) go through `K.TQ(lt)`; no `Math.random`, `Date`, `THREE.Clock`, `AnimationMixer.update(delta)`.

## Component options

| option | default | |
|---|---|---|
| `at` | `0` | start (scene-local s). **`lt` given to `camera`, `frame` and every helper is seconds after `at`.** |
| `out` | – | hide (and stop rendering) from this scene-local time; animate exits yourself in `frame` or with a kit transition |
| `x, y, w, h` | `0, 0, K.W, K.H` | canvas rect in film px (top-left anchor); the camera aspect is `w / h` |
| `z` | – | CSS z-index of the canvas (DOM siblings can sit below and above it) |
| `bg` | `null` | `null` transparent (the DOM shows behind) · `'#hex'` · `['#top', '#mid 52%', '#bottom']` CSS gradient stops (a sky). Drawn as the canvas' CSS background: exact colours, never tone-mapped or blurred |
| `env` | `'studio'` | image-based light built in code: `'studio'` (softboxes + dark flags on grey) · `'soft'` (bright, diffuse) · `'sky'` (blue → peach dome; takes `bg`'s first/last colour when `bg` is a gradient) · `'night'` (dark, cool + pink strips) · `{ preset, top, bottom, sky, boxes, rotation, intensity }` · `null` |
| `lights` | `'soft'` | rig: `'soft'` · `'product'` (stronger rim, darker fill) · `'top'` (for tabletop / flood views) · `'night'` · `'none'` · `{ preset, key, fill, rim, env, target }` where each light is `{ dir: [x,y,z] from target to light, color, i }` or `false` · `null` |
| `envIntensity` | from the rig | strength of the environment light (rigs: soft .85, product .7, top .9, night .5) |
| `shadow` | on | `{ area: 10, res: 2048, soft: 1, opacity: 1, bias: -.0006, center }` or `false`. Only the key casts. `area` = half-size (world units) of the square around the light target that gets shadows — keep it tight; `soft` = size of the light (1 ≈ 9°): contact-hardening soft shadows |
| `fov` | `35` | vertical field of view (deg); `near: .1`, `far: 200` |
| `exposure` | `1` | number or `(lt) => number` |
| `tone` | `'neutral'` | tone mapping: `'neutral'` (keeps saturated colours, rolls highlights off) · `'aces'` · `'agx'` · `'reinhard'` · `'none'` |
| `dof` | `null` | `{ focus: 'look', aperture: .12, maxBlur: 18, quality: 1, on }` — see below |
| `ss` | `1` | supersampling (1.5–2 for finals with thin geometry; 4× MSAA is always on) |
| `camera` | – | keyed rig, evaluated before `frame()` — see below |
| `build(ctx)` | – | once; returns your state (also on `comp.state`) |
| `frame(lt, ctx, state)` | – | every frame, pure function of `lt` |
| `cues` | `[]` | your own `[{ kind, t }]` list, returned by `cues()` |

`ctx`: `THREE`, `three` (= `K.three`), `scene`, `camera`, `renderer`, `add(...objs)` (to the scene root, returns the first),
`lights: { key, fill, rim, target }`, `look` (Vector3 the rig looks at), `cam(pos, look, { fov, roll })` (place the camera
from `frame()`), `project(p)`, `w`, `h`, `lt`, `focalPx`.

`comp.project(p)` (`p` = `[x,y,z]` | `Vector3` | `Object3D`) → `{ x, y, visible, depth, scale }` in **film px** (`scale` =
px per world unit at that depth). It uses the camera of the last `update`, so add the scene3d component BEFORE the DOM
component that reads it. Use `obj.localToWorld(new THREE.Vector3(x, y, z))` to pin to a corner of a moving object.

### Camera rig

```js
camera: [ { t: 0, pos: [x,y,z], look: [x,y,z], fov: 30, roll: -8 }, { t: 2, pos, look }, { t: 4, pos, look, ease: K.E.soft } ]
```
- Position, look-at point, `fov` and `roll` (deg) pass exactly through the keys on a **velocity-continuous, shape-preserving
  spline**: fast → slow keys decelerate without overshoot, and the camera never stops at a key. Omitted values carry over.
- `ease` on a key = pose-to-pose for the segment INTO that key (straight line, any `K.E.*`); neighbours pick up its end
  velocity. `hold: true` = zero speed at that key.
- Outside the keyed range the camera keeps drifting with its end velocity (up to 2 s): cuts and transitions never land on
  a frozen camera. To hold, end with `hold: true`. Text holds: put two keys close in space, not a stop.
- `K.three.track(keys, prop, def)` is the same interpolator for anything else: `const p = K.three.track([{ t: 0, v: [0,0,0] }, { t: 1, v: [2,1,0] }], 'v'); obj.position.fromArray(p(lt));`

### Depth of field

A post pass (the scene is rendered with depth, then a 1-pass disc blur that keeps the focused foreground sharp against a
blurred background and lets blurred foregrounds spread). Deterministic; ships because it passes the seek-order check.
- `focus`: `'look'` (distance to the rig's look point, default) · a distance · a point / `Object3D` · `(lt, ctx, state) => distance | point`.
- `aperture`: lens diameter in world units (`.08` gentle … `.2` macro) or `(lt) => number`; `maxBlur`: cap in px at 1080 p; `quality`: 1 (≈150 taps) … 2; `on(lt)` to enable per time.
- Particles (`K.three.points`) write no depth: without help they blur like the far background. Put a
  `K.three.depthProxy(geometry)` where the cloud is. The `bg` is CSS and is not blurred (use a smooth gradient).
- Limits: it blurs tone-mapped colour (no bright bokeh discs), and a thin sharp object in FRONT of a very blurred one can
  show a faint halo. For a filmic lens (bloom, chromatic aberration, vignette) on the whole frame use `tools/lens.py` after capture.

Motion blur is never faked here: it comes from the capture shutter (`--mb`), which re-renders the 3D at sub-frame times.

## `K.three` helpers

All helpers are plain three.js objects; the ones that move carry `userData.k3update(lt, ctx)`, which the component calls
after `frame()` for everything in its scene.

**Materials** `K.three.mat.<name>(color, overrides)` → MeshPhysical/StandardMaterial: `plastic` (satin injection-moulded) ·
`gloss` (candy / piano) · `clay` · `matte` · `rubber` (default near-black) · `chrome` · `metal` (brushed) ·
`emissive(color, intensity = 1.4)` · `screen(map)` (glossy black glass with an emissive picture) · `shadow(opacity = .3, color)`
(invisible floor that only shows shadows). Remember `mesh.castShadow = mesh.receiveShadow = true` on your own meshes.

**Geometry** `rbox(w, h, d, r = .1, seg = 5)` rounded box · `pill(r, len, { axis: 'y' })` capsule (`len` = total length) ·
`disc(r, h, { bevel, dish, seg = 40, axis: 'y' })` coin / knob / button with a rounded rim (its +axis face has 0–1 UVs
for prints) · `ring(R, r, { axis: 'y' })` torus · `slab(w, h, r, depth, bevel)` rounded-rectangle plate facing +z
(material slots: 0 back, 1 sides, 2 front; planar UVs). Bevels are what catch the light: keep them.

**Cables** `tube(points, radius = .04, { sag: 0, sway: 0 | { amp, freq: .45 }, segments: 40, radial: 10, material, gravity: [0,-1,0], seed })`
→ Mesh (add it to the scene root). `points`: 2+ of `[x,y,z]` | `Vector3` | `Object3D` (its world position, read every
frame) | `() => point`; more than two make a smooth curve through them. The END POINTS are exact, `sag` droops the span
(world units at mid-span), `sway` swings it sideways with a `sin(π·u)` envelope as a pure function of `lt`. Ends are open:
bury them in a plug.

**Instances** `instances(geometry, material, count, fn, { atlas, shadow: true })` → InstancedMesh.
`fn(i, lt, m, ctx)` places instance `i`: `m.pos(x,y,z)` · `m.rot(rx,ry,rz)` · `m.quat(q)` · `m.scale(s | x,y,z)` ·
`m.color(c)` · `m.cell(k)` · `m.hide()` (raw `m.p / m.q / m.s`). `atlas: K.three.atlas(glyphs, { cell: 128, cols, font: '800 1px "Inter Tight"', color, scale: .46 })`
prints one atlas cell per instance on the +axis face of `disc` geometry — `glyphs` are strings, `{ text, color }` or draw
functions `(g, cx, cy, size)`; the print replaces the instance colour where it is opaque.

**Flood** `pile(opts)` → `fn(i, lt, m)` for `instances`: pieces POUR in (free fall, tumbling, entering from `from`),
SETTLE with a short bounce into a layered pile, and PART around regions. Closed form per instance. The pile lies in the
local XY plane and grows towards +z (the camera side); rotate the InstancedMesh to lay it on a floor.

| option | default | |
|---|---|---|
| `count, seed` | `2500, 1` | |
| `w, h` | `24, 14` | extent; make it larger than the frame |
| `r, thick` | `.45, .21` | piece radius and thickness (match the geometry) |
| `spacing` | `1.06` | pitch / diameter inside one layer (≥ 1: pieces of a layer never touch). Layers are hexagonal lattices shifted against each other, so the pile is dense from above and pieces rest on — never cut through — each other |
| `layers` | auto | as many as `count` needs (the top one is partly filled) |
| `tilt, jitter, warp` | `.15, 1, .6` | resting tilt (rad), positional noise, low-frequency bending of the rows |
| `pour` | `[0, 1.5]` | landing window (s); lower layers land first |
| `fall, height` | `.6, 10` | seconds in the air and drop height: pieces start near the camera and recede |
| `from, throw` | `[0, 1], 6` | lateral entry direction (pile XY) and distance travelled while falling |
| `spin, bounce, size` | `5, 1, [.94, 1.06]` | tumbling (rad), landing bounce, random scale range |
| `part` | `[]` | `[{ x, y, w, h, r, rot, at, dur: .55, ease: K.E.soft, until, back: .6 }]` rounded rectangles (or `{ x, y, R, at }` circles) the pieces leave from `at` and return to from `until` |
| `margin, band, lift` | `r + .06, 4r, 1.3·thick` | clear distance from a region border, width of the ring that absorbs the displaced pieces, extra height of that ring |

`fn.rest(i)`, `fn.land(i)`, `fn.layer(i)`, `fn.layers`, `fn.count`, `fn.top`. Recipe (demo scene a): make the labels
first, then `part: labels.map(l => ({ x, y, w: l.userData.w + .12, h: l.userData.h + .12, rot, at: popTime - .1 }))`; darken
`m.color` by `fn.layer(i)` for a cheap ambient occlusion; one glossy `disc` + an `atlas` of prints sells the scale.

**Particles** `points(count, fn, { size: .05, soft: .5, blend: 'add' | 'normal', depthTest: true })` → Points.
`fn(i, lt, p, ctx)`: `p.pos(x,y,z)` · `p.color(c)` | `p.rgb(r,g,b)` (linear) · `p.size` (world units) · `p.alpha`. Round
soft sprites, perspective-sized. Use `'normal'` for saturated bodies (additive clouds wash out to white where dense) and
`'add'` for sparks and glows. Shape samplers `K.three.shape.<name>(i, seed, opts)` → `[x, y, z]`, unit-sized, from the
index: `heart(i, seed, { fill: .2, depth: .42, rim: .2 })` · `sphere` · `ball` · `box` · `ring(i, seed, tube)` · `blob`
(brain-ish). Sample once at build into a Float32Array, animate in `fn`.

**LED dot-matrix** `ledPanel(opts)` → Mesh (a plane `cols·pitch × rows·pitch` facing +z; `userData.w/h`). Mount it on any
object. 5×7 font written for the kit: A–Z a–z 0–9, `á é í ó ú ü ñ ¿ ¡`, accented capitals (`Á É Í Ó Ú Ü Ñ` draw their mark
in the two rows above the line), punctuation, `… → ← ↑ ↓ ♥ ♪ ✓ × • ° € █`.

| option | default | |
|---|---|---|
| `cols, rows, pitch` | `48, 16, .05` | LEDs and their spacing (world units). A character is 5 + 1 columns; a line 7 rows |
| `lines` | – | `['TEXT', { text, color, align }]` or `(lt) => lines`; with `type` / `cursor` on the panel options |
| `screens` | – | `[{ at, lines, type: cps | { cps, delay }, cursor: true | 'block' | 'bar', in: 'cut' | 'wipe' | 'scan', dur: .3, color, align }]` — each replaces the previous at `at` |
| `draw(lt, g)` | – | full control: `g.clear()` · `g.text(str, col, row, color)` → next column · `g.dot(col, row, color)` · `g.fill(c0, r0, c1, r1, color)` · `g.width(str)` · `g.cols/rows` |
| `on, off, bg` | `'#ffb347', '#2a2019', '#0b0a0a'` | lit colour (default per line), unlit dots, panel |
| `dot, glow, intensity` | `.7, .5, 1.15` | dot diameter / pitch, halo, emissive strength |
| `gap, align, margin` | `3, 'center', 2` | rows between lines (≥ 3 with accented capitals), alignment, side margin for left/right |
| `px, blink` | `16, 2` | texture px per LED, cursor blink (Hz, after typing ends) |

Typing and blinking are quantised to frames (`K.TQ`), so motion blur never doubles a character. Text wider than the panel
is clipped: `g.width(str) = 6·chars − 1` columns.

**Labels and cards**
- `label(text, { h: 1, font, weight: 800, serif, color: '#fff', bg: '#7b61ff', radius: .26, pad: .36, depth: .1, size: .56, tracking: -.035, res: 240, rough, coat, glow, emColor })`
  → Mesh: a rounded sticker slab `h` world units tall and as wide as its text (`userData.w`). Markup `"la *IA*"` sets the
  starred word in the theme serif italic. `radius`, `pad`, `depth`, `size` are fractions of `h`. `glow` (0–1) mixes the
  face into the emissive so it stays readable in shadow.
- `card(src, w = 1.2, h = 1.6, radius = .1, { depth: .04, side, back, res: 256, rough, coat, glow, fit: 'cover', fonts })`
  → Mesh: a rounded card. `src`: image URL (preloaded) · `<canvas>` · `<img>` · `(g, W, H) => …` canvas-2D draw at `res`
  px per unit (list the faces it uses in `fonts: ['600 40px "Poppins"']` so it is redrawn if one was missing).

**Shadows under floating objects** `contactShadow({ w: 10, d: 10, y: 0, far: 4, blur: 2.5, opacity: .55, color, res: 512 })`
→ Group on the XZ plane at `y`: everything within `far` above it darkens the floor, softer the higher it floats. Pair it
with a `mat.shadow()` floor a hair below for the key light's cast shadow. Flag objects that must not cast with
`userData.noContact = true`.

**Other** `depthProxy(geometry)` (see depth of field) · `canvasTexture(canvas)` · `rnd(i, k, seed)` → [0, 1) ·
`font5x7` · `envPresets`, `lightRigs` (edit or extend) · `renderer()`.

## Look notes (what made the demo read as photographed)

- Big soft sources: keep the `studio`/`sky` softboxes, a key with `shadow.soft` ≥ 1, the rim on. Chrome needs the dark
  flags in the environment — on a uniform sky it turns flat grey.
- Gloss ≠ mirror: `gloss` for hero plastics (roughness .2–.3), `plastic` for bodies, `matte`/`clay` for floors. Flat
  glossy faces only show a sheen if something large sits in their reflection (the presets have a low front card).
- One saturated family + neutrals; colours as sRGB hex (three converts). `tone: 'neutral'` keeps them; ACES greys them.
- Rounded everything (`rbox`, `disc` bevels, `slab` bevels). Add small real details: tick marks, a knurl
  (`instances` of thin pills), speaker holes, a status LED.
- Depth: something out of focus behind (a satellite object, the far side of a ring) + `dof`. Keep text at the focus.
- Text on objects: `label`/`card` textures hold up to ~1.5× their `res`; raise `res` for a card that fills the frame.

## Suggested SFX

No automatic cues (the component cannot know your choreography). By hand: flood → `K.cue('whoosh', t0)` at the pour and
`pop` on each label; camera fly-through → `whoosh`/`zoom` at the speed peak; LED typing → `tick` per character
(`K.cue('tick', at + i / cps, { gain: .35 })`); card or block landing → `hit`.

## Speed (Mac, Apple M4 Pro, 1920×1080, headless Chrome ANGLE/Metal)

Render cost of one frame inside the page (`__seek` + forcing the GPU to finish), measured over 60 frames per scene:

| demo scene | what is in it | ms / frame | worst |
|---|---|---|---|
| a · flood | 2,500 instanced printed discs (5 layers), 3 labels, 4096² soft shadow map | **11** | 16 |
| b · hardware | ~60 small meshes, 93 instances, 4 cables, LED panel (80×23), 2048² shadows, depth of field | **13** | 19 |
| c · orbit | 16 textured cards, 18,900 particles, point light, 2048² shadows, depth of field | **8** | 9 |

`KATANA_CPU_RASTER=1` does not change these (WebGL always runs on the GPU; the flag only moves DOM raster to the CPU).
What you wait for is capture, not 3D: one worker writing PNG stills does 2.4 / 3.0 / 3.2 fps on the three scenes
(≈ 420 / 330 / 310 ms per frame, almost all of it Chrome's screenshot + PNG encoding; 2.4 / 2.7 / 3.1 fps with CPU raster).
The whole 12 s demo as a master with `--mb 8` (4,000 sub-frame renders, 6 workers) takes about 2 minutes.

## Limitations

- WebGL only (no WebGPU), one shadow-casting light per rig, no screen-space AO or bloom, no transmission/glass preset.
- The soft-shadow shader replaces three's `PCFShadowMap` branch for every material on the page; your own extra
  shadow-casting lights get the same filter (`light.shadow.radius` = penumbra growth, see `scene3d.js`).
- `pile` is choreography, not physics: pieces can overlap slightly at the rim of a parted region and near the frame edge.
- GLTF models: the loader is not in the vendor bundle (add it to the bundle if a film needs a model).
- A film page without `three.katana.js` reports `scene3d: … not loaded` in the capture errors and renders nothing.
