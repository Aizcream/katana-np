# Craft rules: motion, camera, rhythm, density, look

Where these come from: the frame-by-frame studies and client feedback tables shipped with the `higgsfield-motion-saas`
and `higgsfield-motion-core` skills (six launch films, October 2026), Higgsfield Katana's own workflow documents, and
Katana NP's first films. The numbers are the ones that passed review. When both motion skills are installed, their
`references/` hold the long recipes (`transitions.md`, `code-engine.md`, `client-taste.md`); this page is the part
every film needs.

## 1. Cuts hide inside speed

- At an event the speed is never zero; **at a cut it is at its maximum.** Accelerate into the cut (`K.E.in(3–5)`,
  `K.E.expoIn`), decelerate out of it (`K.E.out(3)`, `K.E.settle`), or put a needle on it (`K.needle`).
- **Direction survives the cut.** A camera that dives into something lands in a shot that starts farther away and
  eases in; it never starts zoomed in and shrinks. Check with `window.__qa()` (prints the sign of d ln scale / dt on
  both sides of every cut).
- Keep **one thing continuous** across a cut (an object's geometry, its direction and relative speed, the UI state or
  a colour) and hard-cut everything else.
- **Nothing important appears or leaves by opacity alone.** It is carried, grown, pushed, wiped, morphed, flipped or
  cut. Opacity is for small details.
- Strong curves belong to transitions only. Inside a scene everything is soft.
- **Camera moves live inside scenes and have a visible cause:** follow the caret, lean in on the click, crane back when
  results land, push in when a card grows, pull out on export. During a transition window the camera is neutral and
  the transition is carried by an object, fast.
- A morph is geometric: map the source's own points into the target. A reveal opens from the SOURCE's centre.
- Anything that spans the frame survives every camera move: overscan it (about +360 px per side) or keep the camera
  still in that scene.

## 2. Numbers that passed

| What | Value |
|---|---|
| In-scene entrance | 0.45–0.7 s on `K.E.soft`; scale from ≥ 0.9; UI travel ≤ 40–70 px; overshoot ≤ 2–4 % |
| Move between poses | ≥ 0.5 s on `K.E.smooth` / `K.E.glide`; staggers 50–80 ms (letters 30–60 ms) |
| Text entrance | rise from a baseline mask, or rise 24 px + blur 12 → 0 px (+ scale 0.96 → 1) |
| Exit | mirror of the entrance on a cubic-in, shorter |
| Overlap | start the next move at about 0.45 of the current one, on a parent wrapper, so speeds add |
| Cursor | 0.6–0.9 s per move on a 5–15 % arc; click squash 0.92 in 0.12 s, release 0.2 s; enters and leaves from off-frame |
| Typing | ≤ 50–60 characters per second with a seeded human cadence (`K.cadence`) |
| Cut swing | out `expoIn` 0.36 s over ~300 px, in `expoOut` 0.7 s over ~600 px (equal slope on the cut) |
| Fly-through | zoom ×6–12 on `E.in(4–5)` about the object; next shot from ×0.26–0.4 on `E.out(3)` |
| Camera blur in DOM films | 180° shutter of the camera's screen travel × 0.32, max 44 px |
| Minimum visibility | nothing appears or vanishes in < 0.2 s outside a motion-blurred transition; no full-frame flashes longer than 2 frames; ≤ 3 flashes per second |

## 3. Rhythm

- **No dead air:** something new every 0.5–0.6 s. Still frames only as listed reads: status line 1.0 s · name + check
  0.6–0.7 s · three numbers 1.2 s · list item 0.8 s · end lockup ≥ 1.5–2 s.
- Reading time for a line seen while things move: `max(1.0 s, 0.35 s × words + 0.5 s)`.
- Cuts on the reference's beat grid (`K.bpm`, `K.beat(n)`); when the film keeps the reference soundtrack, events sit
  on the reference's own frames.
- Alternate sparse and dense shots every one or two cuts. Short bursts up front, a short punch before each hit, varied
  shot lengths.
- **One persistent hero object** travels through the film (a logo glyph, a device, a prompt bar, a mascot). It is the
  cheapest way to make eight shots read as one film, and it gives every transition something to carry.
- The energy of the reference is part of its language: camera moves, shake bursts, flashes and hits per second come
  through at the same rates (`./katana energy <mp4> --vs refs/analysis/<ref>/energy.json`; below 0.6× reads flat).

## 4. Density and honesty

- One focal idea per frame. Richness comes from ONE coherent source: a world layer, the real product UI, the
  product's own output, or identity line work. Never decorative fragments.
- 6–12 small TRUE details near the hero (meta rows, status dots, rulers, dimension pills, a cursor click). Texture,
  never clutter.
- Product demos show ONE believable app the camera travels through (sidebar, top bar, real lists from one dataset),
  not a floating card under a headline per scene.
- Banned: decoration that comes from neither the product nor the identity (HUD rows, corner marks, chip clouds, ring
  text, fake counters).
- Honest product states only: no fake progress, no invented numbers, counters run monotonically, labels match counts.
- No other company's logo is drawn; write the name as plain text.
- The end card is clean: wordmark, one line, CTA. Hold it.

## 5. Type

- The typeface class comes from the reference (grotesque, condensed, serif, mono, pixel, hand): pick the closest face in
  `fonts/` or add an openly licensed one, render a specimen in the film's real copy, and compare glyphs with the
  reference at native size. Never the kit default by inertia.
- Effective size = CSS size × every ancestor and camera scale. Check legibility on the sheet at phone width.
- Pixel or LED text is drawn as real dots or squares on a stable grid, not a pixel font scaled up.
- Text over a busy background: darken the background's exposure (`brightness(.42) saturate(.9)`), no dark plate under
  the text, unless the reference itself uses plates.
- Spanish: accents, ¿ and ¡ present in the chosen face (some display fonts lack them and fall back silently).

## 6. The photographed look

Flat, perfectly clean vector reads cheap. The finish is taken from the reference, at its intensity, and only where it
uses it:

- `K.lens = { bloom, ca, k, grain, vig }` in `film.js`, read by `./katana render --final` (tools/lens.py). Look at the
  reference at native size: bloom on highlights? colour fringes toward the edges? barrel bulge? grain? vignette? Set
  each one or leave it at 0. House defaults when the reference is clean but lit: `{ bloom: .3, ca: 1, k: .02,
  grain: .015, vig: 0 }`. `K.lens = false` for a deliberately flat graphic look.
- Grain ≤ .02–.04 and luma-only, or none. Visible noise has been rejected more than once.
- Materials get a rim light, a specular highlight and a contact shadow. Pure-white bloom cores read cheap: tint them.
- Motion blur is real (sub-frame, `--mb 8`, adaptive up to 32). For extreme needles use `--mb 16` or more. Never fake
  it in CSS on finals.

## 7. Real 3D (`K.kit.scene3d`, API in `engine/kit/docs/scene3d.md`)

- One world. All stations live in a shared scene; the camera travels between them. Plan the camera route before
  polishing any object, and show a **blocking pass** (flat materials, final camera and timing) first.
- Objects are rigid and attached: cable ends stay in their ports, labels stay glued, the dial stays on its side.
- Type lives on surfaces and gets front-facing, readable holds. A beautiful extreme angle is useless if the sentence
  cannot be read.
- Fast travel connects destinations; no spin without an arrival. Slow down when a message must be read.
- Matte or softly glossy forms in a clean void, big soft light sources, bright highlights that keep detail.
- Focus follows the subject; do not keep the whole installation equally sharp.
- 3D is for objects and worlds. Do not tilt flat UI into 3D to fake depth: depth in a UI scene is a motivated camera
  over a designed flat layout.

## 7b. What the first reference-first test taught (np_salu vs the Salu reference, 2026-11-13)

Each of these looked fine on our own stills and was only caught by `./katana match`, `./katana energy --vs` or
`./katana qa` against the reference:

- **A detected cut is where a transition ENDS.** The reference's 6-frame page peel finished on the cut frame; ours
  was centred on it and ran 3 frames late in every pair.
- **Scenes never open empty.** On the cut frame the reference already shows the next scene's content in motion; ours
  showed a bare field until the first pop. Start entrances before the scene's t0.
- **Whole-frame whips on every cut are not the reference's energy.** It used two real pans in 17.7 s; ours measured
  4–9× its pan and shake rates. Match the transition TYPE per cut (peel, dive, short object whip of ~300 px).
- **Dives sit on the last 4–5 frames**, not the last 10.
- **Holds are alive.** The reference had 0.2 s of dead air in total; ours had 2.9 s until every sticker got idle motion
  (bob, sway, a blinking caret, a ripple after the click).
- **Nothing smaller than its counterpart.** Chips, boards and cards had to grow 20–40 % to fill the frame as the
  reference does.

## 7c. Animate, do not just move (np_salu v7, after the user's review of v6)

v6 matched the reference's cut frames, energy and dead-air numbers and was still rejected in one look: "the original
peels like a sticker, the card turns 360, ours just swaps". Every transition had become a slide, whip or zoom.

- **Name the device of every event** in `events.md` before building, from the every-frame pages, and build that device
  (`engine/kit/docs/anim.md`): peel, flip, morph, flood, iris with a carried object, slam, typed ghost text.
- **The twelve principles are the checklist** for anything that appears or leaves: squash and stretch, anticipation,
  staging, follow-through and overlap, slow in / slow out, arcs, secondary action, timing, exaggeration, solid drawing,
  appeal (the table in `anim.md` maps each to a function).
- **Backgrounds are objects too:** in the reference they flooded from the action point or swapped under a turning card;
  they never just cut.
- **Carry something across every scene change** (the bubble through the ring, the chip into the cursor), then get rid
  of it with an action (thrown on an arc, morphed, landed).
- **Entrances come from the camera or from an object**, not from the frame edge: cards tumble in rotating, stamps fall
  from 2× size, a ticket swings in like a door.
- Numbers cannot see this. The match pages can, but only if you read them asking "is it the same DEVICE?".

## 8. Characters

Idle amplitude about twice what looks right in a still; each character has a motion signature (frequency, squash,
eye saccades, secondary lag) and phase offsets so a cast never moves in sync. Judge on 2-frame-step sheets: stills
hide dead motion.

## 9. Sound

Accents sit on visible events (a click on the click, a hit on the payoff). Prefer recorded sounds and real music (the
reference track, the user's track or stock); a synthesised beat is a draft placeholder only. When the user adds the
song in Instagram, deliver SFX-only plus a no-sound version. Say plainly that the mix was measured, not listened to.

## 10. Revisions

Back up the approved version, change only what the feedback names, re-render only what changed. Never restyle
approved copy, order or look. "As in the reference" means: sample that range densely (every 0.08 s) and copy its
motion grammar beat by beat, in the user's palette and type.
