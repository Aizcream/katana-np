# The brief: the prompt that builds the film

The brief is the biggest lever on the result. The same engine gives a flat film from a vague brief and a showreel piece
from a precise one. Two public data points:

- Higgsfield published the brief behind its 24 s "LOUD ONE" 3D film (`presets/loud-one/brief.md`, verbatim): about
  2,000 words for 24 seconds, every beat with its objects, exact copy, camera move and hold.
- The opposite style also circulates: a four-line prompt ("take this video as reference and use the same visual
  style, research <brand>, make a dynamic 30-second motion graphics video like it's your showreel, go all out"). It
  works only because the model then writes the long brief for itself. Its useful parts are the three verbs:
  **download and study the reference, research the subject, treat it as a showreel piece.**

Katana NP always writes the long brief, whatever the user typed. The user approves a short Spanish summary of it; the
full brief (English) is the document the build follows and the next session reads.

## From the user's words to the brief

1. **Do the work the user did not do.** Analyse the reference (`./katana analyze`, read every page). Research the
   subject: its site (`node tools/webshot.mjs <url> out.png --full`), real product name, real claims and numbers, palette,
   logo, tone. Never invent facts about the user's product; ask or leave them out.
2. **Ask once.** Whatever cannot be found goes into ONE grouped question (missing logo or footage, copy that must stay
   word for word, format). At most two decisions. Everything else is decided from the reference and written down.
3. **Keep the ambition line.** `<direction>` opens with what the piece is for and the bar it must clear ("launch film
   for the home page; it must hold up next to the reference at the same timecodes").
4. **Map meaning, not pixels.** For each thing the reference shows, write what it MEANS there and what carries that
   meaning for our subject (their dial → our logo glyph; their "DROP IT" → our CTA). A remix is a new film in the
   reference's language; identity, product and copy are the user's.

## Format

Six tagged sections, in this order. File: `projects/<name>/brief.md`.

```
<inputs>      what is fixed before design starts
<direction>   the idea and the look, as checkable statements
<structure>   the timed beats
<build>       numbered engineering constraints
<gotchas>     the ways THIS film goes wrong
<start>       the gates, in order
```

### `<inputs>`
Product or brand name · size · fps · **exact seconds and exact frame count** · output language · the subject described
physically (what it is made of, its parts, its colours) · every asset with its path and role · copy that is locked
word for word vs copy that may be rewritten · what is artwork and not real (a CTA with no working link, sample data) ·
the soundtrack (reference track, the user's track, or "the user adds music in Instagram": then SFX only).

### `<direction>`
- **One sentence** with the central idea, then the journey as three words (`HUM → SHAPE → DROP`, `LENTO → MEDIDO →
  RÁPIDO`). Every beat must belong to one of the three.
- **The world:** where everything lives, what holds the pieces together (a mast, a desk, one app window, a paper
  table), and what is NOT there (no floor, no horizon, no editor chrome).
- **Materials and surfaces** in nouns (polished plastic, brushed metal, torn paper, dot grid), not adjectives.
- **Palette** as a hex list with roles, marked "approximate, refine against the reference" when read by eye.
- **Light** (2D too: where the highlight sits, how shadows fall, whether there is glow).
- **Camera language** in verbs (close pass, orbit, tilt, whip between stations) and when it slows down: "slow down when
  a message must be read".
- **Typography:** where type lives (on objects, on cards, free in the frame), which face and treatment per role, how it
  appears. One line per role.
- **Persistent elements** (badge, watermark, progress) and how they behave when the camera moves.
- **Avoid-list:** the specific cheap moves this reference tempts you into.

### `<structure>`
One block per beat, `m:ss.s–m:ss.s / NAME IN CAPS` (2–4 s each; the name is the beat's verb). In each block, in this
order:
1. what the frame opens on and from which angle or distance;
2. the objects on screen **with their parts** (at least three physical details each);
3. the exact on-screen copy in quotes, with its line breaks, and how it appears (typed, flipped, popped, stamped);
4. the camera or layout move, with where it starts and where it ARRIVES;
5. what holds still, and for how long, so the copy can be read;
6. what carries the viewer into the next beat (a passing edge, a whip, an object that continues).

The first beat is the hook. The last beat is a held, readable hero with the CTA: "the final hold is part of the film;
do not spend every second moving and leave the CTA for one frame".

### `<build>`
Numbered constraints the code must satisfy. Typical lines:
1. Renderer per scene: DOM/SVG (`kit`), Canvas 2D, or real 3D (`scene3d`). No flat screenshots pretending to be 3D.
2. A reusable asset library (list the pieces) before any scene is polished.
3. Product name, messages, colours and beat times centralised at the top of `film.js`.
4. One master time function, N frames at F fps, seeded randomness, every frame seekable in any order.
5. Attachment rules (cables stay in their ports, labels stay glued to their surface, text never slides on its screen).
6. Text rendering rules (dot-grid LED text, crisp message swaps instead of unreadable morphs).
7. Motion blur on fast travel; full clarity on every text hold. Focus per subject.
8. Overlays (badge, captions) in screen space: no scene blur, perspective or exposure on them.
9. Sound plan: accents and what they sit on (recording click, dial tick, a stronger hit on the payoff beat).
10. Preview first: the whole route and every text hold are checked before final-quality light and export.
11. Deliverables with file names (MP4, source, a no-sound version when the user adds music).

### `<gotchas>`
Concrete, observable failure modes for this film, each one a sentence a reviewer can check on a still:
"keep the dial on the same side of the device throughout", "the speech-bubble display needs readable front-facing
moments", "fast camera movement must connect destinations; no spins without an arrival". Add the general ones that have
bitten Katana NP before (list in SKILL.md, "Known gotchas").

### `<start>`
The gates, so nobody builds for an hour in the wrong direction:
1. Inspect the reference; collect missing assets in one question.
2. Show: asset list, camera or layout route, timing map, and N stills of the hold poses (one per beat that carries
   copy), rendered with the real engine, plus the time estimate and the cost estimate.
3. Blocking pass (flat materials, final timing and camera): review movement and readability.
4. Finish materials, light, type detail, sound.
5. Final render, QA gate, delivery.

## Calibration: what "specific enough" means

- **Density:** 60–90 words of brief per film second. A beat paragraph that fits on one line is not a beat yet.
- **Every adjective has a witness:** a hex, a size, a duration, a named object. "Premium" is not a direction; "cream
  housing, brushed-metal ring, one soft highlight top-left" is.
- **Prohibitions are written down.** What must not appear is as useful as what must.
- **Measured vs guessed is marked.** Anything read by eye from the reference says "approximate; refine against the
  reference", and the QA gate refines it (`./katana match`).
- **Holds are budgeted.** Each line of copy gets `max(1.0 s, 0.35 s × words + 0.5 s)` of readable screen time.
- **The copy is final in the brief.** Spanish with correct accents and ¿¡; no placeholder text reaches the build.

## What the user sees

Send, in Spanish and short: the idea in one sentence, the three-word journey, the beat list (time · what is seen ·
exact copy), what will be generated with a paid model and its cost (see `routes-costs.md`), the time estimate, and the
stills. Wait for the OK. After the OK, build exactly that: no silent swaps of copy, order or look.
