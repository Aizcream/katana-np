# Katana kit — component contract

The kit is the look of Katana in reusable, deterministic pieces. A film (`projects/<p>/film/film.js`) is scenes on a
timeline; scenes are built from kit components. Read `engine/katana.js` (header + API) before writing a component.

## Core API you can rely on (engine/katana.js, global `K`, alias `FILM`)
- Time/math: `K.p(t,t0,t1)` (0–1 clamp), `K.lerp`, `K.clamp`, `K.tw(t,t0,t1,a,b,ease)`, `K.kf(t,[[t,v],[t,v,ease]])`,
  `K.zoom(t,t0,t1,a,b,ease)` (log space), `K.needle(t,cut,a,b,h)`, `K.pop(t,t0,d)` (≈6 % overshoot), `K.soft(t,t0,d)`,
  `K.spring(t,t0,{k,c})`, `K.rise(dt,dist)`, `K.settleShake`, `K.ramp(lt,[[t,rate],…])` (time remap), `K.TQ(t)` (quantise
  discrete events to frames), `K.hash(x)`, `K.rand(seed)`, `K.noise(x,seed)`.
- Easing `K.E`: `lin, in(k), out(k), inOut(k), soft, smooth, glide, sine, expoIn, needle, into, settle, morph1, morph2,
  width, snappy, back(s), bez(x1,y1,x2,y2)`.
- Beat grid: `K.bpm`, `K.beatOffset`, `K.beat(n)`, `K.bar(n)`, `K.snap(t,div)`, `K.spb()`.
- Text: `K.tokens(markup)` → `[{text, em, cls} | {img} | {space}]` for `"Stick it on *everything.*"`, `"[img:path]"`,
  `"{accent}word{/}"`. `K.type`, `K.cadence`, `K.typedN`, `K.caretOn`, `K.scramble(s,k,t,seed)`, `K.glyphs`, `K.riseGlyphs`.
- DOM: `K.el(tag,css,parent,html)`, `K.div(parent,css,html)` (position:absolute), `K.css(id,text)` (inject a stylesheet
  once), `K.img(parent,src,css)` (registered for preload), `K.about(px,py,s,dx,dy,r)`, `K.tf({x,y,r,s})`,
  `K.dirBlur()` → `(el,bx,by)`, `K.drawOn(path,p)`, `K.svgDefs()`.
- Media: `await K.preload(src)` → decoded Image (LRU cache), `K.cached(src)` (sync, decoded or null),
  `K.clipInfo(dir)` (reads `<dir>/_clip.json`: frames, fps, width, height, pattern), `K.clipFrame(dir, sec, {loop})` → URL,
  `K.heldTime(t)` / `K.heldLt(lt)` (hold one source frame across a motion-blur shutter), `K.loadJSON(url)` (sync, at build).
- Film: `K.W`, `K.H`, `K.fps`, `K.dur`, `K.format` ('9x16'…), `K.safe()` → {top,bottom,left,right} px, `K.theme`
  (tokens → CSS vars `--k-bg --k-fg --k-muted --k-accent --k-accent2 --k-accent3 --k-display --k-serif --k-mono --k-wide
  --k-radius`), classes `.k-display .k-serif .k-mono .k-wide` (kit.css), `K.fx` (overlay layer, z 50), `K.cue(kind,t,opts)`,
  `K.addCues(comp, t0)`, `K.transition(def)`, `K.addPost(fn)`.
- Scenes: `K.scene({id,t0,t1,pre,post,build(root, add),update(lt,t,root),prepare(lt,t,root)})`. Components passed to
  `add()` are driven automatically (prepare awaited, then update(lt)). Never style a scene root; build inside a child.

## Component contract (type.js, ui.js, media.js, looks.js media looks)
```js
K.kit.name = (parent, opts = {}) => {
  // build: create DOM once (fonts are loaded; layout is measurable here — measure here, never in update)
  return {
    el,                              // the component's outer element (absolute-positioned inside parent)
    update(lt) { … },                // PURE function of scene-local time lt (seconds). Sets styles only. Cheap.
    prepare: async (lt) => { … },    // optional: await K.preload(...) of what frame lt needs (footage frames, canvases)
    cues() { return [{ kind: 'pop', t: 0.3 }] },   // optional: suggested SFX (local times) → K.addCues(comp, sceneT0)
    dur,                             // optional: natural duration of the animation (s) after opts.at
  };
};
```
- Common opts every component accepts: `at` (start, scene-local s, default 0), `out` (optional exit start; the component
  animates OUT from there), `x`, `y` (px in film space, anchor documented per component), `w`/`size`, `color`, `z`.
  Defaults must look good in BOTH 1080×1920 (9:16, default) and 1920×1080 — derive sizes from `K.W/K.H` when omitted —
  and keep text inside `K.safe()` on 9:16.
- Before `at`: invisible (display:none or visibility hidden — do not leave layout-affecting ghosts unless documented).
- Determinism: no `Math.random`, `Date`, `performance.now`, CSS transitions/animations, rAF, setTimeout. Use `K.hash`,
  `K.rand(seed)`, `K.noise`. Discrete events (typed characters, swaps, scramble ticks) go through `K.TQ`.
- Colours and fonts come from theme variables / kit classes; options may override.
- Canvas is allowed (looks, ascii, glitch). Read pixels only from images decoded via `K.preload` (same origin, http).

## Transition contract (transitions.js)
```js
K.trans.name = ({ at, a, b, dur = .4, ...opts }) => K.transition({ type: 'name', at, a, b, before: dur/2, after: dur/2,
  apply(t, { A, B, p, lt, fx, W, H }) { … } });
```
- `A`/`B` are the outgoing/incoming scene roots (either may be null for a transition into/out of the background).
  The engine resets their transform/filter/opacity/clipPath/zIndex every frame, keeps A visible until `at+after` and B
  from `at-before`. Set styles on the roots only inside `apply`. Overlays go in `fx`: create them lazily once, keep a
  reference, and set `display:block` every frame you draw them (the engine hides fx children each frame).
- Grammar: the speed peak sits on the cut (`lt = 0`); direction survives the cut; nothing important by opacity alone.
- Return the def; also expose `cues()` with the obvious SFX (`whip`, `zoom`, `hit`…) if natural, or document them.

## Looks (looks.js)
- Media looks: `K.looks.name(parent, { src | clip, …opts })` → component (same contract), usually a canvas that
  processes the source each frame (ascii, glitch-vhs, halftone, duotone, sticker cut-out, liquid, grid-mask).
- Global looks: `K.looks.name({ … })` registers `K.addPost(fn)` overlays (vignette, scanlines, light leaks, corner badge,
  colour wash) or sets a filter on `K.world` (grade). Document which kind each look is.

## Quality bar — "Katana top half, not Claude Motion bottom half"
Study `refs/sheets/*.jpg` and `refs/analysis/*/cuts/*.jpg` / `shots.jpg` (Katana is the TOP half of r1/r2). Katana reads
as: BIG confident type (display 800–900, tracking −0.04…−0.06 em, tight leading .88–.95), one italic serif emphasis word,
crisp hierarchy, one idea per frame, saturated colour blocks or a clean off-white with one accent, objects with soft real
shadows, strong motion (fast attack 0.15–0.35 s, long settle; E.snappy / E.soft / K.pop), motion blur at speed, cuts on
the beat. Claude-Motion-bottom reads as: small timid type, muted grey colours, cluttered overlaps, slow linear fades.
Text never appears by opacity alone: combine scale (1.1→1), blur (10–20 px → 0), rise (20–40 px), mask/clip reveals.

## Files you own (one family per builder)
`engine/kit/<family>.js` · `engine/kit/docs/<family>.md` (API: every component, every option with default, a usage
snippet, suggested SFX) · `engine/demos/<family>.html` (copy of `_base.html`, last script → `<family>_demo.js`) ·
`engine/demos/<family>_demo.js` · `engine/demos/assets/<family>/` (extra assets). Do NOT edit `engine/katana.js`,
`kit.css`, other families' files or `tools/`; if you need a core change, describe it in your report.

## Testing
- Stills: `./katana gallery engine/demos/<family>.html 0.5,1.2,…` → `engine/demos/_stills/<family>/sheet.jpg` — LOOK at it.
- Motion: stills every 2 frames around entrances/transitions (e.g. `1.000,1.067,1.133,…`), or a video:
  `./katana renderpage engine/demos/<family>.html /tmp/x.mp4` then `./katana sheet /tmp/x.mp4 --fps 10`.
- Determinism: `node tools/capture.mjs engine/demos/<family>.html <dir> --serve . --check-determinism` (must pass).
- Page errors are printed by capture; zero errors is required.
- Demo assets: `engine/demos/assets/img/` (np_*.jpg desk-scene stills of a laptop showing "Aurora Café", a fictional
  coffee shop — never client material; np_laptop_cutout.png with alpha, np_logo_horizontal.png/.svg, np_logo_vertical.png,
  lighthouse_before/after.png), `engine/demos/assets/clips/c3293` (old site), `c3294` (new site) (4 s frame sequences,
  810×1440 @ 29.97).

## Determinism pitfalls (learned while building the kit — Chrome rasterises some things differently by seek history)
- Never `will-change: transform` on elements whose scale animates (Chrome keeps the old raster scale).
- Settled transforms must end EXACTLY at rest: write `transform: none` (or append an invisible `scale(1.00001)`) — a
  near-identity or sub-pixel tail renders differently depending on the previous frame. Snap label boxes to whole pixels.
- `<img>` whose drawn scale changes between seeks is resampled with history-dependent quality: for pops/zooms of photos and
  hard-edged PNGs (logos, stickers) draw them once into a canvas (media.js / type.js do) or pre-scale the asset.
- 2D `translate` (not translate3d) inside 3D-tilted parents; pad boxes so glyph/SVG overhang never leaves its own box.
- Outlined text: use an SVG dilate filter, not `-webkit-text-stroke` (seams on the variable fonts' overlapping contours).
- GPU raster draws glyphs > ~256 px and big SVG paths through a history-dependent path cache: finals and
  `--check-determinism` run with `KATANA_CPU_RASTER=1` (`katana render --final` sets it).
- `K.about()` assumes transform-origin 0 0; scene roots use a centre origin (transitions use their own centre-origin math).
- Components get scene-local lt: use `K.heldLt(lt)` to hold one source frame across a motion-blur shutter.
