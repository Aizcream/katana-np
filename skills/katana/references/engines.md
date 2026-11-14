# Engines: Katana, Remotion + snapcn, HyperFrames — which one draws what

Tested on 2026-11-13 with one scene in all three (snapcn's free "Gather Lockup", North Pearl content, 1920×1080, 24 fps).
All three render a web page frame by frame in Chrome; they differ in what comes ready-made and in what is built around
the renderer. The measured result:

| | Remotion + snapcn | Katana NP | HyperFrames |
|---|---|---|---|
| The same scene, with our content | one 25-line composition file, render 10.7 s | a 40-line port (possible because this scene is pose tables), render 8 s, same poses frame for frame | no equivalent block; the closest (`logo-outro`) is a generic logo reveal |
| Ready-made scenes | snapcn: 61 free (MIT) + 81 Pro, measured frame by frame, high polish | none: every look is built by hand | about 450 blocks, uneven polish; they load GSAP and fonts from CDNs |
| Bending / turning / morphing devices | none ready (would be written as React) | `K.anim`: peel, flip, morph, flood, iris, slam | none in the catalog (searched: sticker peel, page curl, card flip) |
| Real motion blur | wrappers only (`@remotion/motion-blur`) | adaptive sub-frame shutter | page motion blur option |
| Reference tooling | none | analyze, match, energy, qa (they work on ANY mp4, including Remotion's) | measure / diff commands |
| Preview and editing | Remotion Studio: timeline, props panel | a simple player | studio / desktop app |
| Strings attached | Remotion is not MIT: free for individuals and companies of up to 3 people; above that a Company License (USD 25 per seat per month for creators; remotion.dev/docs/license/pricing, read 2026-11-13). snapcn Pro components are paid | ours | CLI is open; some features need a HeyGen sign-in |

## The rule

- **A ready-made scene fits the beat** (logo lockup, text reveal, announce title, chart, device shot): use the snapcn
  component in Remotion, untouched or forked, and bring it into the film as a clip. Do not rebuild by hand what a
  measured component already does.
- **The reference does something specific** (a sticker peels, a card turns, a shape morphs, a background floods, 3D):
  build it in Katana with `K.anim` / `scene3d`.
- **Assembly, QA against the reference, motion blur on our own scenes, sound:** Katana.
- **A narrated reel that is mostly footage plus snapcn-style type** (the ChatGPT-prices kind): it can stay in Remotion
  end to end; Katana's `match`, `energy` and `qa` still check its mp4.
- HyperFrames: a catalogue to look at for ideas (`npx hyperframes catalog --query "…"` is local and free); not part of
  the pipeline today.

## The bridge

```bash
# once: the snapcn component into the Remotion project (it prompts if a shared file exists: copy the two files from
# https://snapcn.dev/r/<name>.json instead of overwriting src/lib/snap-cn-ui)
cd "<NP_Remotion>" && npx shadcn@latest add @snapcn/<name>
# a composition with our content → a clip inside the Katana project (near-lossless, any codec settings of the project ignored)
./katana remotion <project> <CompositionId> <clip-id> [--dir "<NP_Remotion>"] [--props '{"k":"v"}']
```
```js
S.top = K.div(w, 'left:0;top:0;width:1920px;height:1080px');
add(K.kit.clip(S.top, { clip: '../assets/clips/<clip-id>', push: 0 }));        // the Remotion scene
S.peel = K.anim.peel(w, { el: S.top, x: 0, y: 0, w: 1920, h: 1080, angle: 30, r: 0 });   // …and Katana animates it
```
`--dir` is remembered in `~/.config/katana/remotion_home`. Worked film: `examples/snap_hybrid` (the snapcn lockup
plays, the whole frame peels off like a sticker, a field floods, a line is typed, the button slams in).

Limits of the bridge: the Remotion scene arrives as pixels (to change its copy, edit the composition and run the
command again: about 10 s); frames are JPEG without alpha, so it is a full-frame or boxed clip, not a transparent
overlay; snapcn tables are measured at their own frame rate (24 or 30): keep the Katana film at that rate or hold frames.

## Gotchas met
- snapcn scenes are tuned for their sample copy: word positions are fixed, so keep words about as long as the sample's.
- `shadcn add` stops on "file already exists" without a terminal; never pass `--overwrite` on the shared `snap-cn-ui`.
- A Remotion project that sets a CRF in its config rejects ProRes; the bridge renders H.264 4:4:4 at CRF 5 instead.
- Porting a snapcn scene to Katana is only cheap when it is data (pose tables, like Gather Lockup). Text Reveal and
  Announce Title are 26–43 KB of React logic: use them natively.
