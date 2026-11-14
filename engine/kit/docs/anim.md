# Kit · anim — animation that is more than a transform

`engine/kit/anim.js` → `K.anim.*`. Load it after `looks.js` (the project template does).

Why it exists: the first reference-first test (np_salu v1–v6) matched its reference's cut frames and still looked
wrong, because every transition had been reduced to slides, whips and zooms. The reference peeled stickers, turned a
card over in perspective, morphed a chip into a paper plane, flooded backgrounds from the action point and slammed
stamps in from the camera. **A transform moves a thing; animation changes it.** These are the pieces for that.

Everything is a pure function of the value you pass (no state, no clocks). Worked film: `examples/np_salu`.

## Pick by what the reference does

| The reference… | Use | Not |
|---|---|---|
| peels / unsticks / turns a page | `peel` | a diagonal wipe with a band on it |
| turns a card, coin, panel or door | `flip` | `scaleX(0→1)` or a whip |
| turns one object INTO another | `morph` | a cross-fade or a swap on a cut |
| changes the background colour | `flood` from the action point | a hard `K.BG` switch (unless the reference cuts hard) |
| opens the next scene through a shape | `iris` (+ carry one object across) | a whip or a zoom |
| drops things onto a surface one by one | `slamTo` | simultaneous pops |
| types a line | `ghostType` | all characters at full weight |
| makes anything appear | `pop` (squash, stretch, late rotation) | a scale tween |

## `K.anim.peel(parent, {el, x, y, w, h, angle, r, …}) → {el, U, set(f, fly)}`
A sticker folds over itself and leaves; whatever lies under `el` in the DOM shows through (put the next card there).
- `el`: the sticker layer, already in `parent` and positioned in the parent's frame (a full-size layer is simplest).
  `{x, y, w, h}`: its card rectangle in parent px; `r`: corner radius.
- `angle` (deg, default 35): direction the fold travels. 35 = from the top-left corner to the bottom-right; 215 = from
  the bottom-right corner.
- `back`, `ink`, `line`, `shade`: paper colour of the back, outline colour and width, crease/shadow strength.
- `set(f, fly = 0)`: `f` px of travel (0 = stuck; `U` = the whole sticker is folded over). `fly` 0..1 lifts the folded
  sticker towards the camera and out along the same direction (`flyDist`, default 1500 px).
- The stuck part is clipped with a moving half-plane; a mirrored back (outline, crease gradient, soft shadow) lies over
  it. The sticker is hidden with an empty clip, never `visibility` (children may set their own).
- Timing that matched the reference (30 fps): one pose per frame — corner lift (3.5 % of `U`), 25 %, 56 %, 88 %, off —
  then `fly` from frame 3.4 to 6.8. **Hold the fold still inside each frame** (compute it from `K.TQ(t)`): a fold that
  travels during the shutter smears into a white wipe and stops reading as paper; the reference's poses are crisp.
  Let the fly-off blur. A small `f` held for a few frames (40–70 px) is the "this is a sticker" hint.

## `K.anim.flip(parent, {x, y, w, h, persp}) → {el, body, front, back, set(deg, {axis, z, tilt, s})}`
A two-faced body in real perspective. Build each side into `.front` / `.back` (cards, labels, anything).
`set(180)` shows the back. `axis: 'Y' | 'X'`, `z` px towards the camera, `tilt` deg in the plane.
- A turn that reads: anticipation the other way (5 %), the turn, an overshoot, a settle:
  `flip.set(180 * K.anim.anticipate(p, .05, .05), { z: 190 * Math.sin(Math.PI * p) })`.
- A door / ticket swinging in: `set(-96 → 0)` on an ease-out with a small damped overshoot.
- Things that pop on the back face are children of `.back`; they stay glued through the turn.

## `K.anim.morph(dA, dB, n = 144) → (p) => d`
Blends two SVG outlines. Both are resampled by length, wound the same way and rotated to the closest start. Author both
around the same centre; set the result on a `<path d>` every frame. Hide labels before the morph starts; change fill
and scale on the same clock. Unlike shapes with very different point counts look best in 3–5 frames.

## `K.anim.flood(parent, {x, y, colors, ink, line, gap, R}) → {els, set(q)}`
The background changes from where the action is: concentric discs grow from `(x, y)`. `colors` go from the first ring
to the last and **the last one is the colour the frame ends on** (`[to, from, to]` = a ripple of bands). Put it right
above the scene's base background. 5–6 frames is the reference's speed.

## `K.anim.iris(el, {x, y, over, rings, box, round, R}) → {rings, set(q, ease)}`
Reveals `el` (the incoming layer) through a growing circle, or a rounded box with `box: [w, h]` (aspect) and `round`.
`rings: [{c, w, off}]` are outlines drawn in `over` (a sibling layer that is not clipped); negative `off` gives
concentric rings inside the opening. Give the incoming scene `pre` and the outgoing one `post` so both exist while it
opens, and **carry one object across** (the same thing at the same place in both scenes) — then throw it away on an arc.

## Principles as functions
| Principle | In code |
|---|---|
| Squash and stretch | `pop(e, lt, t0, {sq})` stretches on the way up and squashes on arrival; `squash(k)` gives an area-preserving scale; `slam` squashes on the hit |
| Anticipation | `anticipate(p, a, o)`: back first, then through, overshoot, settle |
| Staging | one event at a time; the hold after it is long enough to read (`craft.md` §3) |
| Follow-through and overlap | rotation settles later than scale in `pop`; `follow(fn, lag)` evaluates a child late; ticks flare after the sticker lands |
| Slow in and slow out | never linear: `K.E.out` into a pose, `K.E.in` out of it |
| Arcs | `arc(x0, y0, x1, y1, bulge)` → position and tangent; flying things rotate along the tangent |
| Secondary action | typing dots keep typing, confetti leaves the seal, a ring turns behind the bubble |
| Timing | the reference's own frames: write times as `F(frame)` |
| Exaggeration | `slam` falls from 2× size; pops overshoot 6 %; idle amplitude is twice what looks right in a still |
| Solid drawing | outlines, die-cut rings, contact shadows, a visible back to every sticker |
| Appeal | every object does one small thing of its own while it waits |

`K.anim.pop(e, lt, t0, {d, rot, r0, from, c, extra, sq})` — `from` < 1 grows in; `from` > 1 lands from larger.
`K.anim.slamTo(e, lt, t0, {from, d, rot, rest, sq})` — sets visibility, opacity and transform of a centred element.
`K.anim.ghostType(el, text, lt, t0, t1, {seed, ghost, alpha})` — the newest characters are pale until the next lands.

## Gotchas
- `peel` and `iris` write `clip-path` on the element you give them: do not set a clip on it yourself.
- `flip` needs its perspective: do not put `overflow: hidden` or a `filter` on an ancestor between the stage and the
  scene root (they flatten 3D).
- A scene that opens through an `iris` paints its own background; keep `K.BG` constant and let scenes own their fields.
- Read the reference's frames before choosing: a detected "cut" is usually where one of these ENDS.
