# Presets

A preset = a reference edit taken apart: `preset.json` (reference video, region, analysis folder, BPM, duration, fps, inputs it
needs, tags) + `brief.md`, a reconstruction brief in Katana's own prompt format (`<inputs> <direction> <structure> <build>
<gotchas>`) with every beat timed and mapped to kit components.

Add one from any video (an Instagram reel, a launch film, a Higgsfield preset preview):

    ./katana analyze refs/new.mp4 --out refs/analysis/new        # cuts, beats, OCR, sheets
    mkdir presets/<slug>  → write preset.json + brief.md by reading refs/analysis/new/{sheet,shots}.jpg, cuts/, blueprint.md

Then a film is the brief re-cast with the client's assets and copy (see the katana skill).
