---
name: katana
description: North Pearl's own Katana — reference-first motion-graphics films and edits rendered from code (kinetic type word by word, app/product launch films, UI mockups, real 3D scenes with three.js, sticker/paper/dot-matrix looks, 3D card walls, Lighthouse score reels) with headless Chrome + motion blur, any format (9:16 Reels first), Spanish copy, SFX mixed, MP4 out. Quotes time and USD cost first when a reference needs generated video or images (Sunra, Sume, Higgsfield API). Replaces the paid Higgsfield Katana. Use whenever the user asks for /katana, "un video como este", "recrea esta edición", "motion graphics", "un reel dinámico", "video de lanzamiento", a launch/promo video in code, gives a reference video or link to copy with their own product/footage, or asks what a reference would cost to reproduce — even if they don't name the skill.
---

# Katana NP — the reference decides, the code obeys

Tool folder (`KR` below) — resolve it first, in every new shell:
`KR="$(cat "${KATANA_CONFIG_DIR:-$HOME/.config/katana}/home" 2>/dev/null || (cd -P ~/.claude/skills/katana/../.. 2>/dev/null && pwd) || echo "$HOME/Katana")"`
(written by `install.sh`; this skill is a symlink into that folder). CLI: `"$KR/katana" <cmd>`, run from `KR`. The user's input
files (footage, logos, reference videos) go in `"$KR/entrada/"` — ask for them there. X/Twitter links download with
`./katana refs <url>`; for Instagram/TikTok/YouTube references ask the user to save the file into `entrada/`. If `KR` has no
`katana` file, Katana NP is not installed on this Mac: point the user to INSTALL.md. If a command fails on a missing tool, run
`"$KR/katana" doctor`. Users: North Pearl (web/software studio, Bogotá) and collaborators — talk to them in their language
(usually Spanish, plain words); internal docs stay English.

## The method (v2, 2026-11) and why

Version 1 pushed every reference through the kit's 69 components and its own house look, so films looked like Katana NP
instead of like the reference. Higgsfield's Katana does the opposite (its workflow documents, read through the Higgsfield
MCP connector on 2026-11-13): for designed-graphics references it keeps the reference's event timing, soundtrack and the
visual treatment of every graphic, writes the film's code to measure, and compares the result with the reference at
identical timecodes. Its showcase films are code, iterated for one to five hours each. So:

1. **Reference first.** Rhythm, hierarchy, material richness, camera language and finish come from the reference. The kit
   is a toolbox, never a mould: when a component cannot reproduce the reference's treatment, write the scene's own code
   (DOM/SVG/Canvas, or `scene3d` for real 3D) with the engine's helpers.
2. **Show before building.** A brief written to the standard of `references/brief.md`, stills of the hold poses rendered
   with the real engine, a time estimate and a cost quote. Then wait for the OK and build exactly that.
3. **Prove it against the reference.** `./katana match` pages at the same timecodes, energy rates, three motion reviews.
   If our frame is emptier, flatter or slower than the reference frame above it, it is not done.

## Read when you reach that step

| File (in `references/`) | Read it before |
|---|---|
| `brief.md` | writing any brief: format, how specific, what the user sees |
| `routes-costs.md` | deciding what is code vs generated; quoting; spending (providers, price table, rules) |
| `craft.md` | building: cut grammar, the numbers that passed, rhythm, density, type, photographed look, 3D, characters |
| `qa.md` | rendering a draft or a final: the gate and what "matches the reference" means |
| `$KR/engine/kit/docs/<family>.md` | using a component (`anim`, `scene3d`, `type`, `ui`, `media`, `transitions`, `looks`) |
| `$KR/engine/kit/docs/anim.md` | ALWAYS before building: peel, flip, morph, flood, iris, slam, and the principles of animation as functions |
| `$KR/presets/<slug>/brief.md` | reusing an analysed reference (`loud-one` is Higgsfield's own published brief) |
| `references/engines.md` | the brief calls for a ready-made scene (logo lockup, text reveal, announce title, chart, device shot) or the user mentions snapcn, Remotion or HyperFrames |

## Layout
| Path | What |
|---|---|
| `katana` | CLI: refs · analyze · new · clip · remotion · stills · preview · render · mix · match · compare · energy · sheet · qa · gallery · renderpage · transcribe · voice |
| `engine/katana.js` | core (global `K`): timeline, scenes, beat grid, easing, transitions registry, safe zones, preview player, cues, `K.lens` |
| `engine/kit/{anim,type,ui,media,transitions,looks,scene3d}.js` | components and helpers; contract in `engine/kit/CONTRACT.md` |
| `engine/vendor/` | three.js bundle for `scene3d` (local, no network) |
| `engine/demos/*.html` | one demo page per family (`./katana gallery engine/demos/type.html 1,2,3`) |
| `tools/` | analyze_ref.py · energy.py · match.py · compare.py · capture.mjs/cdp.mjs (frame capture, `--mb`) · lens.py · mix.py · bin/ocr · bin/cutout |
| `presets/<slug>/` | analysed references: `preset.json` + `brief.md` |
| `refs/` | reference videos + `refs/analysis/<name>/` (pages/, sheet.jpg, shots.jpg, cuts/, timeline.png, analysis.json, energy.json, breakdown.json) |
| `sfx/`, `fonts/` | SFX library · local fonts (Inter Tight, Poppins, Instrument Serif, Playfair Display, Geist Mono, Archivo, Bricolage Grotesque, Anton) |
| `projects/<name>/` | film/ (index.html, film.js) · assets/ · audio/ · renders/ · stills/ · qa/ · brief.md |

## Workflow

0. **Intake.** Sort what the user gave: reference video(s), subject material (logo, product, footage, site), words. A
   reference plus a subject is a production request even with no text. Only a request to analyse stays analysis. Say in
   the first reply what you will do and the toolchain (code, no generation unless quoted).
1. **Take the reference apart.** `./katana refs <x url>` or the file in `entrada/`, then `./katana analyze ref.mp4
   [--region top]` (split-screen comparison posts: the half that is the reference).
   - `sheet.jpg` + `timeline.png` for structure, then **every page in `pages/`, in order** (every frame at native fps).
     This is a gate, not advice: the first test of this method skipped the pages, built from the overview sheet, and
     missed a card turning over, stickers peeling, a chip morphing into a plane and a background colour — while every
     automatic check stayed green. Do not write a brief or a line of film code until every page has been read.
   - While reading, write `refs/analysis/<ref>/events.md`: one line per event with its FRAME numbers and its TYPE —
     what bends, turns, morphs, peels, floods, lands, is typed, is carried across a cut. Name the device, not the
     impression ("f193–199 sticker peel from the top-left corner, back of the sticker white, flies off right", not
     "transition"). Enlarge the frames of anything you cannot name (`ffmpeg -vf "select='between(n,A,B)',tile=3x3"`).
   - Detectors only propose: correct the cut list by eye (cuts hide inside whips, burns and flashes), and remember a
     detected cut is usually where a transition ENDS.
   - Write the **trick line** first: "The trick of this ref is <device> on <timing> so that <what the viewer feels>".
   - Fill `breakdown.json` while reading: per shot its content and role, transitions with frames, every text event
     (frame in / full / out, size, face class, animation), layers, palette.
   - Note the finish at native size: grain, colour fringes, bloom, vignette, depth of field. That becomes `K.lens`.
   - `energy.json` gives camera moves, shakes, flashes, cuts and hits per second: the remix carries the same rates.
     Check the BPM by hand (×2, ×½, ×¾ are common errors).
2. **Route and quote** (`references/routes-costs.md`). Family, then shot by shot: code, still, or video. List every paid
   job and its price in two tiers. Most motion-graphics references cost USD 0 in generation; say so.
3. **Research the subject.** The user's site (`node tools/webshot.mjs <url> out.png --full`), product, real claims,
   palette, logo, tone. Missing things go into ONE grouped question.
4. **Brief** (`references/brief.md`) → `projects/<name>/brief.md`, six sections `<inputs> <direction> <structure>
   <build> <gotchas> <start>`, 60–90 words per film second. Output target: the user's format (9:16 unless told
   otherwise; re-lay out a 16:9 reference, never crop it), the reference's duration, event timing and soundtrack
   unless the user asked for another length or track.
5. **Storyboard gate.** `./katana new <p> --format 9x16 --fps 30 --dur N`, block the scenes roughly, then
   `./katana stills <p> t1,t2,…` at each hold pose. Send in Spanish, short: the idea, the beat list with exact copy,
   the stills sheet, the time estimate, the cost quote. **Wait for the OK.** First visible result within about 15
   minutes of starting.
6. **Assets.** Footage → `./katana clip <p> <video> <id> --from s --to s` (HDR iPhone footage must be SDR first).
   A ready-made Remotion / snapcn scene → `./katana remotion <p> <composition> <id>` (renders it natively and brings it
   in as a clip, about 10 s; see `references/engines.md`).
   Cut-outs → `tools/bin/cutout in.jpg out.png --crop`. Speech → `./katana transcribe <media> --out
   projects/<p>/assets/voice_words.json` then `K.kit.captions`. Voice-over → `./katana voice say "<guion>" --voice <id>
   --out projects/<p>/assets/voz` (estimates first; `--yes` generates voz.wav + exact word timings; `K.voice = {src}`).
   Generated stills or video only as quoted and approved.
7. **Build** (`references/craft.md`, kit docs). `film/film.js`: constants first (copy, colours, beat times), `K.bpm /
   K.beatOffset` from the reference, `K.theme`, `K.lens`, scenes `K.scene({id, t0, t1, build(root, add), update(lt)})`,
   transitions `K.trans.*`, SFX `K.cue(kind, t)`, `K.start({format, fps, dur})`. Blocking pass first (final timing and
   camera, flat look), then materials, type detail and sound. One persistent hero object; something new every
   0.5–0.6 s; holds long enough to read. Each event in `events.md` is built with the device the reference uses
   (`engine/kit/docs/anim.md`: "pick by what the reference does"); write times as the reference's frames, `F(193)`.
   Things animate, they do not just move: squash and stretch, anticipation, follow-through, arcs, secondary action.
8. **Look early and often.** `./katana stills` (2-frame steps around every cut), `./katana preview <p>` (realtime
   player URL for the browser pane), `./katana render <p> --draft` (20 s of 9:16 ≈ 30–60 s).
9. **Final + gate** (`references/qa.md`). `./katana render <p> --final [--mb 8] [--name x]` applies sub-frame motion blur
   and the film's `K.lens`; then `./katana qa`, `./katana match <ref> <mp4> --every 0.5`, `./katana energy <mp4> --vs
   refs/analysis/<ref>/energy.json`, the three motion reviews, the gate log. Fix and re-render only what changed.
10. **Deliver.** The MP4 path, the match pages or `./katana compare` video, a short beat list, the real spend next to
    the quote, remaining flaws with timecodes. Revisions change only what was named.

## Kit at a glance (API in `engine/kit/docs/<family>.md`; read before using)
- **anim** (animation that is more than a transform): `peel` (a sticker folds over itself and leaves) · `flip` (a
  two-faced body turning in perspective) · `morph` (one outline becomes another) · `flood` (the background changes from
  the action point) · `iris` (the next scene opens through a ring or rounded box, one object carried across) · `slamTo`
  (dropped from the camera, squash on the hit) · `pop` (squash, stretch, late rotation) · `ghostType` · `anticipate` ·
  `follow` · `arc`. A slide, whip or zoom is the LAST choice: use it only where the reference does.
- **type**: `words` (word by word: `*serif em*`, `{accent}…{/}`, `{box}`, `[img:src]` pills; enters pop/rise/blur/slide/
  drop/type/scatter) · `headline` · `ghost` · `morph` · `letterSwap` · `typeOn` · `stickerWords` · `captions` · `counter` · `sliced`.
- **ui**: `phone` · `browser` · `laptop` · `searchBar` · `cursor` · `chip` · `chipCloud` · `card` · `ticker` · `badge` ·
  `label` · `lighthouse` · `notification` · `player` · `button`.
- **media**: `clip` (speed ramps) · `photo` · `cutout` · `cardWall` · `carousel` · `fan` · `grid` · `textMask` · `spin` ·
  `beforeAfter` · `splitScreen`.
- **scene3d** (real 3D, three.js): `K.kit.scene3d(parent, { bg, env, lights, dof, camera: [keys], build(ctx), frame(lt,
  ctx, state) })` + helpers `K.three.*`: materials (`mat.plastic/gloss/matte/chrome…`), `rbox/pill/disc/ring`, `tube`
  cables, `instances` + `pile` (floods of thousands of pieces that pour, settle and part around labels), `points`
  particles with shape samplers, `ledPanel` (dot-matrix text with Spanish glyphs and a cursor), `label` and `card` on
  surfaces, `project()` to pin DOM on 3D points. Declare faces used on 3D canvases in `K.fonts` before `K.start`;
  render floods with `--mb 16`; demo layouts are 16:9. Worked scene: `examples/np_3d`.
- **transitions** (`K.trans.*({at, a, b, …, sfx:true})`): cut · whip · push · cover · slice · flash · colorBurst · iris ·
  gridMask · liquid · spin3d · glitch · punch · zoomThrough · zoomOut · smear.
- **looks**: media `ascii` · `glitchVhs` · `stickerPop` · `liquid` · `gridReveal` · `halftone` · `duotone` · `pixelate` ·
  `rgbSplit`; global `grade` · `vignette` · `scanlines` · `lightLeak` · `letterbox` · `cornerBadge` · `filmBurn`.
- The kit's defaults (big 800–900 grotesque, one serif-italic word, colour blocks) are ONE look, right only when the
  reference has it or the user gives no reference. With a reference, override faces, sizes, colours and motion to
  its values, or write the scene directly.

## Rules
- Every frame is a pure function of t: no `Math.random`, `Date`, CSS animations or timers; `K.hash`, `K.rand(seed)`;
  discrete events through `K.TQ`.
- Copy in Spanish with correct accents and ¿¡, final in the brief, checked at phone size. 9:16 safe zones: top 220,
  bottom 420, right 130 px (`K.safe()`, `?guides=1`).
- A remix is a new film in the reference's language: never the reference's brand, logo, product name or footage.
- Matching the cut frames is not matching the film. If the reference peels, turns, morphs or floods and ours slides,
  it is wrong even with every number green: the gate includes naming each transition's device next to the reference's.
- Never draw another company's logo; never invent facts or numbers about the user's product.
- Spending: nothing is generated without a quote in USD and an explicit OK for those jobs (`references/routes-costs.md`).
  Credentials never appear in files, commands shown to the user, or logs.
- Music: the reference's track, the user's track or stock. A synthesised beat is a draft placeholder. If the user adds
  the song in Instagram, deliver SFX-only plus a no-sound file. Audio is measured, not listened to: say so.
- Honest reporting: what was checked, what is still wrong, with timecodes. Never claim a match you did not look at.
- Known gotchas: kit components are hidden before their own `at` (content that must show in a transition's pre-roll
  needs a negative `at`); filter doubled entrance SFX with `K.addCues(c, t0, {skip:['pop']})`; `morph` uses one face for
  both words; `lighthouse` keeps Lighthouse's own colours; do not edit the `katana` script while a render is running
  (bash reads it as it goes).
- Worked examples (code + brief): `examples/np_salu` (the reference-first method end to end: same cut frames as its
  reference, bespoke scenes, brief, gate log numbers), `examples/np_3d` (a `scene3d` flood in a brand palette),
  `examples/np_demo` (kit film, 12 scenes), `examples/captions_test`, `examples/voice_test`.
