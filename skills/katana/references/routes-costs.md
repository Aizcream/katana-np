# Where every shot comes from, and what it costs

Decide this after the reference analysis and BEFORE the brief goes to the user: the brief carries the quote.

## 1. Classify the reference (families, as Higgsfield Katana names them)

| Family | How to recognise it | Route | Paid generation |
|---|---|---|---|
| **F6 designed graphics** | type, numbers, UI, charts, icons, shapes, particles, 3D objects built for the film; photos only as inserted assets | **code**: one page, `render(t)`; `scene3d` for real 3D | none (optional stills) |
| **F5 photo series / stop motion** | locked camera, one detail changes every 1–2 frames | stills + code; never video | stills only |
| **F7 product hero** | an object is the star (packshot, in hand) | supplied photos or prepared stills, moved in code; a video model only if the shot needs continuous new motion | stills, sometimes video |
| **F4 the user's own footage** | the user gives clips to cut like the reference | edit only (`./katana clip`, speed ramps, overlays) | none |
| **F3 real events / people** | sport, news, archive | edit of genuine footage; never generate fake documentary shots | none |
| **F2 performer under styled overlays** ("aura" edits) | a person performs; graphics, grade and cuts on top | generated footage of the user's hero + code overlays | **video, the expensive family** |

Mixed references are common: route shot by shot. The family only sets the default.

## 2. Route each shot (first rule that fits)

1. Exact things (text, numbers, UI, charts, icons, vector logos) → **code**. Never generate a graphic scene as
   video: models blur text and drift off the timing.
2. Objects and worlds that can be modelled from primitives (devices, cards, blocks, beads, mascots) → **code, 3D**
   (`scene3d`) or Canvas.
3. Photographic or organic elements (people in a card, product photos, textures) → the user's files first; otherwise a
   **generated still**, cut out and animated in code. Ask for a transparent or flat chroma background and verify it.
4. A 3D object too organic to model in code → an image-to-3D model (Tripo / Meshy / Hunyuan3D on Sunra). Untested in
   Katana NP as of 2026-11: run one cheap test and say so in the quote.
5. Live motion that code cannot produce (a person moving, liquid, cloth) → a **video model**, one shot at a time, drawn
   into the page as a frame sequence (`./katana clip`).

## 3. Quote before spending (always, even for one image)

1. **List every paid job:** shot id · what it is for · model · seconds and resolution (or image size) · provider.
2. **Price it** from the table below (dated) or live: `hf-api.mjs estimate <endpoint> '<json>'` is free on the Higgsfield
   API. If a price is unknown (Sunra does not publish per-second prices), say "unknown" and offer to run ONE cheapest
   job to read the bill. Never quote a pre-authorisation hold as the price.
3. **Two tiers, in USD:** `barato` (draft model or resolution that still answers the question) and `fiel` (what matches
   the reference). Add a 30 % retry reserve to each. Example line for the user:
   "Aura de 35 s: unas 12 tomas, 48 s generados. Barato ≈ USD 4 (Kling 3 estándar). Fiel ≈ USD 19 (Seedance 2.5 720p)."
4. **Explicit OK** in the chat. The OK covers the listed jobs and that ceiling, nothing else. A new job means a new
   line and a new OK.
5. **Order of spending:** free analysis → stills → ONE canary video (the hardest shot of the plan) → inspect it at full
   size → the rest in parallel. At most 3 attempts per still and 1 retry per video. Record every job in the project
   ledger (`hf-ledger.jsonl`, or `gen-ledger.jsonl` for other providers: date, model, params, cost, file).
6. **Never:** top up or subscribe, raise the ceiling silently, switch provider to get around a refusal, generate
   variants nobody asked for. A failed or blocked job stops that shot and is reported.
7. After the batch: report the real spend next to the quote.

## 4. Providers (keys live outside the repo; never print them)

| Provider | Use it for | Notes |
|---|---|---|
| **Sume** (`~/.config/sume/key`) | images only (GPT Image, Nano Banana, Seedream via its image router) | reference images must be public https URLs |
| **Sunra** (`~/.config/sunra/key`) | video (Seedance, Kling, Wan, Veo…), image-to-3D, music, images | queue API; model schemas at `platform.sunra.ai/models/<owner>/<model>/<op>/llms.txt`; bills in units, 1,000 units = USD 1 |
| **Higgsfield API** (skill `higgsfield-api`) | Seedance 2.5, Soul stills, Kling, Wan | free `estimate`; never the Higgsfield MCP generation tools (they spend account credits) |
| **ElevenLabs** (`./katana voice`) | voice-over with exact word timings | about 1 credit per character; estimate first |

## 5. Price table (USD; re-check when older than a month)

| Item | Price | Where / when checked |
|---|---|---|
| Seedance 2.5 video | 0.175 /s at 480p · 0.39 /s at 720p · 0.97 /s at 1080p | Higgsfield API after account discount, 2026-10-14 |
| Wan 3.0 video | 0.027 /s at 480p · 0.056 /s at 720p · 0.112 /s at 1080p | Higgsfield API, 2026-10-14 |
| Kling 3.0 standard video | 0.071 /s without sound (Higgsfield API) · 0.084 /s image-to-video (Sunra) | 2026-10-14 · 2026-11-03 |
| MiniMax H3 video | 0.11 /s | Higgsfield API, 2026-10-14 |
| Seedance 2.5 on Sunra | unknown (not published) | measure with the first job |
| Nano Banana 2.1 image, 2K | 0.05 | Sunra and Sume, 2026-11 |
| GPT Image 2.6 Sunburst, 2K high | 0.098 | Sume, 2026-11-05 |
| Nano Banana Pro image | 0.134 | Sume, 2026-11-05 |
| Midjourney 8.2, 4 images | 0.038 | Sunra, 2026-11-05 |
| Soul still | 0.004 | Higgsfield API, 2026-10-14 |
| Music, one track up to 75 s (MiniMax Music 3) | about 0.16 | Sunra, 2026-11-04 |

## 6. Typical totals by kind of reference

| Reference | Generation cost | What costs instead |
|---|---|---|
| 2D motion graphics (stickers, cards, UI, kinetic type), 15–30 s | USD 0 | 1–2 h of build and review rounds |
| 3D film in code (devices, beads, cards), 15–45 s | USD 0 | 2–5 h; the reference films of this kind took their makers hours too |
| Either, plus AI photos inside cards | USD 0.05–0.18 per image | |
| Either, plus a music track | about USD 0.16 | |
| "Aura" performer edit, 35 s (45–50 s generated with retries) | barato ≈ USD 3–4 (Wan 3.0 720p or Kling 3 standard) · fiel ≈ USD 18–20 (Seedance 2.5 720p) · 1080p ≈ USD 44–49 | plus 5–10 stills |

Say the time as well as the money: the user plans around both.
