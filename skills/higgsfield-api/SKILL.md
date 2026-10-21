---
name: higgsfield-api
description: Generate Higgsfield images and videos (Soul, Seedance 2.5, Kling 3.0, Wan, Cinema Studio, MiniMax, Recraft, Ideogram…) through the Higgsfield REST API with the user's prepaid API balance, using scripts/hf-api.mjs. Use whenever higgsfield-motion-core or higgsfield-motion-saas calls for a Higgsfield generation (footage, character or location sheets, product stills, b-roll) — this replaces the Higgsfield MCP generation tools in this setup — and whenever the user asks to generate with Higgsfield, check API cost, or use their API credits.
---

# Higgsfield API: generations on the user's API balance

The money is on each user's own **Higgsfield API balance** (console / open.higgsfield.ai billing), separate from any higgsfield.ai web subscription credits. The Higgsfield MCP spends account credits, so **do not generate through the MCP** (its read-only tools such as `models_list` are fine for browsing). Every generation goes through `scripts/hf-api.mjs`.

## The client

`H=~/.claude/skills/higgsfield-api/scripts/hf-api.mjs` (executable; call it as `"$H" …` so it works in zsh and bash)

| Need | Command |
|---|---|
| Verify the key (free) | `"$H" check` |
| Find an endpoint | `"$H" models seedance` · full list in `references/models.tsv` |
| Exact parameters | `"$H" schema bytedance/seedance-2.5/image-to-video` (reads the official docs page; never guess fields) |
| Cost of one call (free) | `"$H" estimate <endpoint> '<json>'` → `{"credits","usd"}` |
| Local file → URL input | `"$H" upload still.png` → `public_url` for `image_url` / `image_urls` / `video_url` … |
| Generate | `"$H" submit <endpoint> @params.json --yes --wait --out assets/gen` |
| Resume / check | `"$H" wait <id> --out assets/gen` · `"$H" status <id>` · `"$H" cancel <id>` (queued only, refunded) |

Credentials load from `~/.config/higgsfield/credentials.env` (`HF_KEY_ID`, `HF_KEY_SECRET`). Never print, log, or put them in a URL or project file. `submit` without `--yes` only estimates. Run `submit` from the project folder: each submission is written to `./hf-ledger.jsonl`.

## Spending rules (assume a small prepaid balance unless the user says otherwise)

1. **Estimate before every new kind of call** and give the cost in USD. Fixed-price estimates (`credits`/`usd`) already include the account discount. Token-priced models (Seedance 2.x) return a per-second rate **before** the discount: multiply it by the duration, then apply the discount shown in the console (15% on 2026-10-14). Prices after discount, checked 2026-10-14 (they match the console's "from" prices):
   - Seedance 2.5: ≈ $0.175/s at 480p, $0.39/s at 720p, $0.97/s at 1080p.
   - Wan 3.0 Prime (60% off): $0.027/s at 480p, $0.056/s at 720p, $0.112/s at 1080p. It is the cheapest good video model; audio on or off does not change its price.
   - Kling 3.0 Standard: $0.071/s with `sound: "off"` and $0.107/s with sound on. Kling 3.0 Turbo: $0.095/s.
   - MiniMax H3: $0.11/s. A Soul image costs ≈ $0.004.
   - Defaults are often the expensive tier (Wan's default is 1080p; Kling's sound is on by default). Always set resolution and audio explicitly. Before a batch, give the total: number of calls × estimate, plus a ~30% reshoot reserve. Get the user's explicit OK, then submit. An approved plan covers its listed calls, not new ones.
2. **Cheapest settings that answer the question:** draft at 480p/720p with short durations (4–5 s) and `generate_audio: false` unless sound is needed. Go to 1080p only for approved shots.
3. **One variant first.** Ask before making extra variants.
4. Failed and NSFW requests are refunded. `403` means the API balance is exhausted: stop and tell the user.
5. Outputs expire after 7 days. Always pass `--out` so files land in the project at once.
6. Report the spend after each batch, from the ledger estimates.

## Mapping from the motion skills (which were written for the MCP)

| Motion skill says | Use on the API |
|---|---|
| `get_cost` | `estimate` |
| `media_upload` / `media_confirm` | `upload` (jpeg/png/webp/gif/wav/mp4 only; convert others first, e.g. `sips -s format png`) |
| `generate_video` + `jobs_wait` | `submit … --wait`; for parallel jobs, submit several without `--wait`, then `wait` each id |
| Seedance 2.5, `omni_reference`, cast in `image_references` | `bytedance/seedance-2.5/reference-to-video` (`image_urls`, `video_urls`, `audio_urls`) |
| Seedance with `start_image` | `bytedance/seedance-2.5/image-to-video` |
| Soul 2 (identity / cast sheets) | `higgsfield-ai/soul/v2/standard` |
| Soul Cinema (location sheets) | `higgsfield-ai/soul/cinema` |
| Nano Banana / Seedream / GPT Image (stills, edits) | not on the API: use Soul V2, `alibaba/qwen-image-3/edit` for edits, `recraft/v4.1/…` or `ideogram/v4.0` for graphic/text-heavy stills, `xai/grok-imagine-image-2.0` |
| Cinema Studio video | `higgsfield/cinema-studio/4.0` |
| Kling 3.0 | `kling-video/v3.0/{std,pro,turbo,4k}/…` |
| Voices / narration / dialogue | no TTS endpoint is documented on the API. Say so, then offer a code-synthesised score, or have the user supply the VO |
| Presets (`declined_preset_id`) | MCP-only; the API has none |

The briefs' prompt craft still applies (anti-slop, casting, the Seedance scene-director format, stills as identity references, QC of every clip). Check the parameter names with `schema` once per endpoint per project. The API's names differ from the MCP's (`image_urls`, not `image_references`).
