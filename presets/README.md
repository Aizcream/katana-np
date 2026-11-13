# Presets

A preset = a reference edit taken apart: `preset.json` (reference video, region, analysis folder, BPM, duration, fps, inputs it
needs, tags) + `brief.md`, a reconstruction brief in Katana's own prompt format (`<inputs> <direction> <structure> <build>
<gotchas>`) with every beat timed and mapped to kit components.

Add one from any video (an Instagram reel, a launch film, a Higgsfield preset preview):

    ./katana analyze refs/new.mp4 --out refs/analysis/new        # cuts, beats, OCR, sheets
    mkdir presets/<slug>  → write preset.json + brief.md by reading refs/analysis/new/{sheet,shots}.jpg, cuts/, blueprint.md

Then a film is the brief re-cast with the client's assets and copy (see the katana skill).

## Presets

| Slug | What | Renderer | Paid generation |
|---|---|---|---|
| `product-launch-peel` | product launch, colour-block bursts and spins | kit (DOM) | none |
| `app-launch-dusk` | app launch | kit (DOM) | none |
| `styles-explainer` | styles explainer | kit (DOM) | none |
| `loud-one` | 3D product film, stations around a mast; the brief is Higgsfield's own published prompt | `scene3d` | none |

Analysed on 2026-11-13 without a preset brief yet (fetch with `./katana refs <url>`, analyses in `refs/analysis/<name>`):
`salu` (paper cards and stickers, x.com/higgsfield_ai/status/2110462034311856383; worked example in `examples/np_salu`),
`bodytask` (SaaS launch with 3D floods and particles, x.com/higgsfield/status/2110378916963876908),
`dotmatrix` (black and white dot-matrix launch, x.com/axultan/status/2108339788701126724),
`blip` (LED mascots, x.com/higgsfield_ai/status/2108322424492339297),
`aura` (performer edit: generated footage, the expensive family; x.com/higgsfield_ai/status/2108708094226362771).
