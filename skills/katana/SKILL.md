---
name: katana
description: North Pearl's own Katana — reference-driven, super-dynamic motion-graphics edits (kinetic type word by word, app/product launch films, UI mockups, 3D card walls, colour-block bursts, glitch/ascii/liquid/sticker looks, Lighthouse score reels) rendered from code with headless Chrome + motion blur, any format (9:16 Reels first), Spanish copy, SFX mixed, MP4 out. Replaces the paid Higgsfield Katana (which only runs through the Higgsfield MCP subscription). Use whenever the user asks for /katana, "un video como este", "recrea esta edición", "motion graphics", "un reel dinámico", a launch/promo video in code, or gives a reference video to copy with their own product/footage — even if they don't name the skill.
---

# Katana NP — reference in, the same edit out (with your product as the star)

Tool folder (`KR` below) — resolve it first, in every new shell:
`KR="$(cat "${KATANA_CONFIG_DIR:-$HOME/.config/katana}/home" 2>/dev/null || (cd -P ~/.claude/skills/katana/../.. 2>/dev/null && pwd) || echo "$HOME/Katana")"`
(written by `install.sh`; this skill is a symlink into that folder). CLI: `"$KR/katana" <cmd>`, run from `KR`. The user's input
files (footage, logos, reference videos) go in `"$KR/entrada/"` — ask for them there. Only X/Twitter links can be downloaded
(`./katana refs <url>`); for Instagram/TikTok/YouTube references ask the user to save the file into `entrada/`. If `KR` has no
`katana` file, Katana NP is not installed on this Mac: point the user to INSTALL.md (`gh repo clone Aizcream/katana-np ~/Katana
&& cd ~/Katana && ./install.sh`). If a command fails on a missing tool, run `"$KR/katana" doctor` and follow what it says.
If a preset is used and `refs/analysis/<ref>/` is missing, run `./katana refs` first.
Users: North Pearl (web/software studio, Bogotá) and its collaborators — talk to them in their language (usually Spanish); keep internal docs English.

How Higgsfield's Katana works (researched 2026-10-20) and how this replicates it: Katana = Claude + a hidden per-preset skill +
Higgsfield MCP tools. It reads the reference's shots, pacing and audio, writes a structured reconstruction brief
(`<inputs> <direction> <structure> <build> <gotchas>`), then either regenerates shots with video models (aura/personalised edits)
or — for motion design ("0 % video generation") — Claude writes the film as deterministic code rendered frame by frame.
Katana NP does the same locally: `analyze` → brief → film code with the kit → `render` → QA. Generations (optional) go through
the `higgsfield-api` skill on the user's prepaid API balance, never the MCP.

## Layout
| Path | What |
|---|---|
| `katana` | CLI: analyze · new · clip · stills · preview · render · mix · compare · sheet · qa · gallery · renderpage |
| `engine/katana.js` | core (global `K`): timeline, scenes, beat grid, easing, transitions registry, safe zones, preview player, cues |
| `engine/kit/{type,ui,media,transitions,looks}.js` | components — **API in `engine/kit/docs/*.md` (read the ones you need before writing a film)**, contract in `engine/kit/CONTRACT.md` |
| `engine/demos/*.html` | one demo page per family (`./katana gallery engine/demos/type.html 1,2,3` to see them) |
| `engine/template/` | new-project template (index.html + film.js) |
| `tools/` | analyze_ref.py (cuts, motion energy, BPM/beats/accents, OCR, sheets, blueprint) · capture.mjs/cdp.mjs (frame capture, `--mb` motion blur) · mix.py (SFX library + synth beat + music → −14 LUFS) · compare.py · lens.py · pageinfo.mjs · bin/ocr · bin/cutout (macOS Vision background removal) |
| `presets/<slug>/` | analysed references: `preset.json` + `brief.md` (Katana-format reconstruction brief mapped to kit components) |
| `refs/` | reference videos + `refs/analysis/<name>/` (sheet.jpg, shots.jpg, cuts/, timeline.png, analysis.json, blueprint.md) |
| `sfx/` | the user's earshot SFX (whoosh_whip/zoom/bars, pop/pop_xl, tick, hit, impact, riser, sting, ding, zip, pop_cta) |
| `fonts/` | local Inter Tight, Instrument Serif, Geist Mono, Archivo (wdth 62–125), Bricolage Grotesque (Spanish glyphs OK) |
| `projects/<name>/` | film/ (index.html, film.js) · assets/ (clips/, img/) · audio/ · renders/ · stills/ · brief.md |

## Kit at a glance (full API in `engine/kit/docs/<family>.md` — read before using a component)
- **type**: `words` (word-by-word workhorse: markup `*serif em*`, `{accent}…{/}`, `{box}`, `[img:src]` pills, `\n`; enters pop/rise/blur/slide/drop/type/scatter; layout grow) · `headline` (XL auto-fit punch, fill/stroke/stretch) · `ghost` (giant outline word) · `morph` (A→B glyph swap) · `letterSwap` (O → ring/logo, zoom-through hole) · `typeOn` · `stickerWords` · `captions` (karaoke/pop/bold from a transcript) · `counter` (odometer) · `sliced`.
- **ui**: `phone` · `browser` (tall screenshot scroll) · `laptop` · `searchBar` (+chips) · `cursor` · `chip` · `chipCloud` · `card` · `ticker` · `badge` (circular text) · `label` (mono decode/count) · `lighthouse` (gauges, from→to) · `notification` · `player` · `button`.
- **media**: `clip` (footage, speed ramps) · `photo` (Ken Burns) · `cutout` (sticker outline) · `cardWall` (3D wall + dolly) · `carousel` · `fan` · `grid` · `textMask` · `spin` · `beforeAfter` · `splitScreen`.
- **transitions** (`K.trans.*({at, a, b, …, sfx:true})`): cut · whip · push · cover · slice · flash · colorBurst · iris · gridMask · liquid · spin3d · glitch · punch · zoomThrough · zoomOut · smear.
- **looks**: media `ascii` · `glitchVhs` · `stickerPop` · `liquid` · `gridReveal` · `halftone` · `duotone` · `pixelate` · `rgbSplit`; global `grade` · `vignette` · `scanlines` · `lightLeak` · `letterbox` · `cornerBadge` · `filmBurn`.
- Demo pages `engine/demos/<family>_demo.js` are working examples of every component.
- Extra tools: `./katana transcribe` (word timestamps for captions, see step 3) · `node tools/webshot.mjs <url> out.png [--full|--mobile]` (site screenshots for browser mockups/walls) ·
  `tools/bin/cutout in.jpg out.png --crop` · `./katana sheet x.mp4 --fps 10` (time-labelled contact sheet).

## Workflow
1. **Reference.** Video from the user (or a preset in `presets/`). If it is a URL on X, fetch the MP4 via `https://api.fxtwitter.com/status/<id>`
   (ask before downloading). `./katana analyze ref.mp4 [--region top]` (split-screen comparisons: top half). Then read it the way
   Higgsfield's own Katana does (its analysis.md, read 2026-10-20 via the Higgsfield MCP):
   - `sheet.jpg` + `timeline.png` for the structure, then **every page in `pages/`, in order** (every frame at native fps with
     absolute frame numbers). Detectors only propose: correct the cut list by eye (cuts hide inside burns, whips, flashes; text
     pops and grain fake cuts). Strips in `cuts/` show HOW each transition is done.
   - Write the **trick line** first: "The trick of this ref is <device> on <timing/structure> so that <what the viewer feels>"
     (+ the frames where it happens). Copying timing while losing the device misses the point.
   - Classify the family: F6 designed graphics (type/UI/charts → code page, our main case) · F2 performer + overlays · F3 real
     footage montage · F4 remake from the user's own clips · F5 photo series (locked camera, one detail changes per 1–2 frames
     → stills + code, not video) · F7 product.
   - `energy.json`: camera moves, shake bursts, flashes, cadence and synced hits as **rates per second** — the remix must carry
     the same rates (Katana's past remixes "felt flat" when camera motion fell to a third). Verify the BPM by hand with the
     `bpm_check` table (×2, ×½, ×¾, ×4/3 are common errors).
   - Fill `breakdown.json` (per shot: content, role, transitions in/out with frames, text events f_in/f_full/f_out, size, font
     class, animation, layers) while reading.
2. **Brief.** Write `projects/<name>/brief.md` in Katana format: `<inputs>` (format, fps, duration, BPM, the user's assets and exact
   copy), `<direction>` (palette hex, type system, camera language, avoid-list), `<structure>` (timed beats: picture · camera ·
   on-screen copy · transition out · SFX, each mapped to kit components), `<build>`, `<gotchas>`. Re-cast the reference with the
   user's product and Spanish copy; keep its rhythm (same BPM, same beat lengths). 16:9 references → re-lay out for 9:16, never crop.
   **Send the brief (short, in Spanish) and wait for OK** before building anything long. Ask at most 2 decision questions.
3. **Assets.** Footage → `./katana clip <p> <video> <id> --from s --to s` (frame sequence; HDR iPhone footage must be SDR first).
   Speech → `./katana transcribe <media> --out projects/<p>/assets/voice_words.json [--prompt "North Pearl, Astro"] [--srt x.srt]`
   (whisper.cpp large-v3-turbo on Metal, ~1 s per 10 s of audio; Spanish word starts: median error 2–4 ms, ~80–93 % within
   one frame; two passes: prompted for vocabulary, unprompted for punctuation; Silero gates "no speech" and Spanish
   hallucinations like "Gracias por ver el video" are dropped). In film.js: `const TR = K.loadJSON('../assets/voice_words.json').words;
   add(K.kit.captions(w, { words: TR, style: 'karaoke'|'pop'|'bold' }))`; the voice goes in `K.music = {src: 'projects/<p>/assets/voice.wav'}`.
   Fix a misheard word by editing its `text` in the JSON (times stay). Transcribe the DRY voice when there is music under it.
   Voice-over the user doesn't record → ElevenLabs on THEIR account (the user's choice, 2026-10-20): `./katana voice check`
   (credits), `./katana voice library --lang es --accent "latin american"` (pick a voice; `add` puts it in the account),
   `./katana voice say "<guion>" --voice <id|name> --out projects/<p>/assets/voz` (estimate) → same + `--yes` (generates
   voz.mp3 / voz.wav / voz_words.json with EXACT per-character timings — no transcription needed; ledger in
   ./elevenlabs-ledger.jsonl). ≈1 credit per character (Flash v2.5 ≈ 0.5); a 20 s reel ≈ 300–400 credits (measured: 133
   characters = 133 credits). Show the estimate before a batch. FREE plan: API allows only the PREMADE voices (library
   voices → 402 paid_plan_required; e.g. "Liam – Energetic, Social Media" TX3LPaxmHKxFdv7VOQHJ speaks clear Spanish with
   eleven_multilingual_v2 — whisper re-transcribed 26/26 words) and has NO commercial license (published content must
   credit "elevenlabs.io"): tell the user before anything is published commercially.
   In film.js: `K.voice = {src: 'projects/<p>/assets/voz.wav'}` (own bus: music ducks −9 dB under it, SFX −3 dB) and time
   cuts/accents on its words: `const W = K.loadJSON('../assets/voz_words.json').words` (worked example:
   `examples/voice_test` — the Lighthouse gauge reads 81 on "81" and lands on 94 on "94").
   Photos → `assets/img/`. Subject cut-outs → `tools/bin/cutout in.jpg out.png --crop`. Missing visuals → Higgsfield API via the
   `higgsfield-api` skill (estimate, give the USD cost, get an explicit OK, then submit; draft cheap).
4. **Build.** `./katana new <p> --format 9x16 --fps 30 --dur N`, then write `film/film.js`: `K.bpm/K.beatOffset`, `K.theme`, `K.BG`,
   scenes `K.scene({id, t0, t1, build(root, add) {...}})` with kit components added via `add(...)`, transitions `K.trans.*`,
   SFX `K.cue(kind, t)` / `K.addCues(comp, t0)`, music `K.music = {synth:'beat', sections:[…]}` or `{src, from, at}`,
   `K.start({format, fps, dur})`. Times on the beat grid (`K.beat(n)`). One idea per frame.
5. **Look early.** `./katana stills <p> 0.5,1.2,…` → read `stills/check/sheet.jpg`; 2-frame steps around every cut. `./katana preview <p>`
   gives an http URL with a realtime player (open it in the browser pane). Send the user a still sheet within ~15 min.
6. **Render.** Draft: `./katana render <p> --draft` (20 s 9:16 ≈ 30–60 s). Final: `./katana render <p> --final [--mb 8] [--lens]
   [--name x]` (sub-frame motion blur, GPU raster, 20 s ≈ 4–6 min; `--cpu` = bit-exact CPU raster, ~20× slower, only for
   determinism checks; `--keep` keeps the frames). Output `projects/<p>/renders/*.mp4` (H.264 High, yuv420p limited range,
   BT.709 tags, AAC 256k, −14 LUFS). Frames are deleted after encoding unless `--keep`.
7. **QA before sending.** `./katana qa <mp4>` (probe, loudness, frame-diff spikes/freezes, sheet), `./katana energy <mp4> --vs
   refs/analysis/<ref>/energy.json` (rates ≈ 1.0× the reference; under 0.6× = flat) and `./katana compare ref.mp4 <mp4>
   [--region top]` (side by side). Three separate motion reviews, each with frame evidence (not "looks good" ×3):
   (1) timing & rhythm — entrances, holds, accents, transition start/peak/end vs the beat; (2) space & continuity — camera
   path, scale, screen direction across every cut; (3) distinctive detail & polish — easing, texture, type motion, SFX
   accents, the reference's energy. Fix and re-render only what changed.
8. **Deliver**: path of the MP4 + compare video, a short beat list, honest remaining flaws. Revisions: change only what was named.

## Rules (the look depends on them)
- Every frame a pure function of t: no Math.random/Date/CSS animations; `K.hash`, `K.rand(seed)`; discrete events via `K.TQ`.
- Katana quality bar (`engine/kit/CONTRACT.md`): big confident type (800–900, tracking −0.05 em), one serif-italic emphasis word,
  one idea per frame, saturated colour blocks or off-white + one accent, fast attack / long settle, motion blur at speed, cuts on
  the beat, nothing important by opacity alone, zoom direction never flips across a cut.
- 9:16 safe zones: top 220, bottom 420, right 130 px (`K.safe()`, `?guides=1`).
- Text in Spanish with correct accents and ¿¡; check legibility at phone size.
- Never put the user's credentials anywhere; Higgsfield API spend only after an explicit OK (see `higgsfield-api`).
- Music: prefer real recordings — the user's track, the reference soundtrack (Katana's default when it fits) or stock; SFX
  from `sfx/` (the user's earshot recordings). The synth beat is only a draft placeholder; the user often adds the real song in
  Instagram — then deliver SFX-only. A remix is a NEW edit in the reference's language, not a shot-for-shot copy.
- Known kit gotchas (from the first film): kit components stay hidden before their own `at`, so content that must be visible in a
  transition's pre-roll needs a negative `at`; filter doubled entrance SFX with `K.addCues(c, t0, {skip:['pop']})`; `morph` uses
  one face for both words (split serif emphasis into its own morph); `lighthouse` colours are Lighthouse's own (no brand override).
- Worked examples (code + brief, no heavy assets): `examples/np_demo` (12 scenes, 20 s), `examples/captions_test`
  (transcript → karaoke/bold captions over footage), `examples/voice_test` (ElevenLabs voice drives cuts and captions).
