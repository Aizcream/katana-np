# QA gate: nothing is sent before this passes

A successful render proves nothing. Each check below produces something you LOOK at or a number you compare; write
the result in `projects/<p>/qa/gate_vN.md` (what was checked, what failed, what was fixed, what remains). At most two
repair passes per version, then ship with the remaining flaws listed honestly, with timecodes.

## Before rendering the final

| # | Check | How | Fails when |
|---|---|---|---|
| 1 | Page health | `./katana stills <p> <times>` prints page errors; `node tools/capture.mjs … --check-determinism` on a new component | any page error; a frame differs by seek order |
| 2 | Cut grammar | open the page and run `window.__qa()`; stills at cut − 1 frame, cut, cut + 1 frame for every cut | zoom direction flips; an empty or half-built frame on a cut |
| 3 | Hold poses | one still per beat that carries copy | copy clipped, outside the safe zone, unreadable at phone width, or wrong (accents, ¿¡) |
| 4 | Motion in the small | stills every 2 frames for ±0.5 s around each entrance and each character idle | pops, linear moves, dead idle, doubled elements |

## On the rendered file

| # | Check | How | Fails when |
|---|---|---|---|
| 5 | Technical | `./katana qa <mp4>` | frame count ≠ target, wrong fps or size, no audio when there should be, loudness far from −14 LUFS, true peak above −1 dBTP, freezes ≥ 6 frames or frame-difference spikes that are not cuts |
| 6 | **Against the reference** (when the film keeps its timing) | `./katana match <ref.mp4> <mp4> --every 0.5 [--region top]`, read every page | at the same timecode: a different beat, a later entrance, weaker hierarchy, thinner materials, missing layer, type that reads cheaper than the reference |
| 7 | Every frame seen | `./katana sheet <mp4> --fps <film fps> --cols 10` in ranges, or the 2-frame sheets of check 4 on the encoded file | anything you would not sign: flicker, a one-frame flash of the wrong scene, banding, a stuck sub-frame |
| 8 | Dead air | scan the sheet at 2 fps | nothing new for more than 0.6 s outside the listed reads |
| 9 | Energy | `./katana energy <mp4> --vs refs/analysis/<ref>/energy.json` | any measure the reference uses is below 0.6× (flat) or shake is far above it (noisy) |
| 10 | Sound sync | cue times vs picture hits in `audio/pageinfo.json`; listen is not possible, so state "measured, not listened" | an accent more than one frame off its picture event |

## Three motion reviews (each with frame evidence, not "looks good" three times)

1. **Timing and rhythm:** entrances, holds, speed changes, where each transition starts, peaks and ends relative to the
   beat grid or the reference's frames.
2. **Space and continuity:** camera path, scale, screen direction and what stays continuous across every cut.
3. **Detail and polish:** easing, texture, type motion, sound accents, and whether the reference's energy came through.

Run them on the plan (before building), on the draft and on the final. Reuse what still holds. Keeping a good decision
unchanged is a valid result; do not invent three changes to justify three reviews.

## Pairs at a readable size (when the film keeps the reference's timing)

`match` pages are for the whole film; they are too small to judge an entrance. For every stretch where something enters,
leaves, is typed or beats: `./katana closeup frames <ours.mp4> <dir>` then `./katana closeup pairs <ref full dir> <dir>
out.jpg f1,f2,…` (the reference above ours, same frame numbers, 384 px a frame) and read them. Then check the numbers the
native-size pass produced, on OUR render, with the same tool: the big words' widths frame by frame (`closeup box`), the
hero object's position and size (`closeup blobs`), the captions' left edge and height (`closeup text`). The gate log
carries those numbers next to the reference's. np_puntos v5: word pop 1.130 · 1.040 · 1 against 1.129 · 1.038 · 1;
hero dot within 2 px of the reference on every sampled frame of the first scene.

## What "matches the reference" means

A remix is a new film in the reference's language: the user's product, copy and identity; the reference's rhythm,
hierarchy, material richness and energy. At equal timecodes a stranger should say "same studio, different client".
If our frame is emptier, flatter or slower than the reference frame above it, it fails, even when every other check
is green.

## Delivery

The MP4 (H.264 High, yuv420p, BT.709, AAC 256 kbps), a no-sound version when the user adds music in Instagram, the
match pages or the side-by-side (`./katana compare`), a short beat list, the real spend next to the quote, and the
remaining flaws with timecodes.
