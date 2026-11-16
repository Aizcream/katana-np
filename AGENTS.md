# Katana NP — Agent Rules & Operating Protocol (`AGENTS.md` / `CLAUDE.md`)

You are working inside **Katana NP**, North Pearl's reference-first deterministic motion-graphics video engine (macOS, Headless Chrome capture + sub-frame motion blur + FFmpeg BT.709 + Swift OCR/QA).

Whenever the user asks to create, clone, remix, or edit a motion-graphics video in this repository, you **MUST** read and follow:
1. `REGLAS_USO_IA.md` (complete Spanish operating rules and 6-phase workflow)
2. `skills/katana/SKILL.md` (core Katana NP skill)
3. `skills/katana/references/brief.md`, `skills/katana/references/craft.md`, `skills/katana/references/qa.md`, `skills/katana/references/routes-costs.md`, and `engine/kit/docs/anim.md`

## Mandatory Rules for Every AI Model

1. **Reference First (`analyze` + `closeup`):**
   - Never invent layouts or motion from memory. Run `./katana analyze <ref.mp4> --out refs/analysis/<ref>` and inspect **every** contact sheet page in `refs/analysis/<ref>/pages/ef_*.jpg`.
   - Run the native-size pass (`./katana closeup frames`, `closeup text`, `closeup box`, `closeup blobs`) and write exact frame numbers `F(frame)`, bounding boxes `(x, y, w, h)`, font sizes, and scale curves into `refs/analysis/<ref>/events.md` and `refs/analysis/<ref>/native_pass.md` **before** writing scene code.
2. **100% Deterministic Frame Seeking (`window.__seek(t)`):**
   - Every frame is captured across parallel workers and sub-frame motion-blur samples. Scene state in `update(lt, t)` **must** be a pure function of `t` (`f = t * FPS`).
   - **Forbidden:** `Math.random()`, `Date.now()`, `performance.now()`, `setTimeout`, `setInterval`, custom `requestAnimationFrame` loops, or CSS `transition:` / `@keyframes`.
   - **Required:** Use `K.hash(x)`, `K.rand(seed)`, `K.noise(x, seed)`, and `K.TQ(t)` (quantize discrete typing/counters so sub-frame motion blur never duplicates characters).
3. **Exact Reference Frame Timing (`F = f => f / FPS`):**
   - Express all scene boundaries and keyframes in the reference's exact frame numbers (`F(72)`, `F(240)`, `F(504)`), never approximate seconds.
4. **Studio Motion Grammar:**
   - Nothing important enters or leaves by `opacity` alone: carry, scale with overshoot (`1.13 → 1.04 → 1.00`), peel (`K.anim.peel`), 3D flip (`K.anim.flip3d`), morph (`K.anim.morph`), draw on (`K.drawOn`), or hard-cut at peak velocity.
   - Zoom direction (`sign(d ln scale / dt)`) must never flip across a cut.
   - Use fixed canvas pixels (`px` on `1920×1080` or `1080×1920`), never `vw`, `vh`, or `%`.
   - Inside `build(root)`, always create a child wrapper `div` (`const wrap = K.div(root, 'inset:0;overflow:hidden')`); `root` itself is reserved for transitions.
5. **Cost & Paid API Gate:**
   - For code-driven graphics (Family F6: UI, typography, vector diagrams, Canvas 2D, Three.js 3D), external API cost is **USD 0.00**.
   - Before calling paid APIs (**ElevenLabs** via `./katana voice say` or **Higgsfield** via `skills/higgsfield-api`), always estimate the cost in USD and get explicit user confirmation.
6. **Mandatory Verification & QA Gate:**
   - Verify key poses and cuts first with `./katana stills <project> <t1,t2,...>` (`0 errors`) and visually inspect `sheet.jpg`.
   - Render `--draft`, run `./katana match <ref.mp4> <draft.mp4> --every 1.0`, inspect `match_01.jpg`…, and fix any visual discrepancies.
   - Render `--final`, and run `./katana qa`, `./katana energy --vs refs/analysis/<ref>/energy.json`, `./katana match`, and `./katana compare`, logging the results in `projects/<project>/qa/gate_v1.md`.
