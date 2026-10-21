# Preset · app-launch-dusk — reconstruction brief

**Trick:** The trick of this ref is a continuous camera that flies THROUGH type and UI (into the O of "Nothing", along the poster wall, search → pick → player) on a 120 BPM 8th-note grid, so that choosing becomes effortless and the app reads as the cure for endless scrolling. Family F6 (designed graphics + inserted footage).

Reference: `refs/r2_higgsfield_app_launch.mp4`, **top half** (`--region top`), Higgsfield Katana "dusk" streaming-app launch.
Analysis: `refs/analysis/r2_katana/` (sheet, shots, cuts/, timeline, analysis.json). 1920×1080 · 30 fps · 20.0 s · 120 BPM
(beat 0.4965 s, first beat ≈ 0.12 s) · 15 detected shots, but most "cuts" are hidden in continuous camera moves and type morphs.

<inputs>
Product name + logo (wordmark ends with a coloured dot), 1 hero visual (a cinematic shot of a person using the product, or footage),
8–30 small images (posters / screenshots / project thumbnails) for the wall and carousels, 1 search phrase, 3–4 chips, 3 one-word
feelings, tagline "Stop X. Start Y." (two lines with mirrored structure), optional short UI captures.
Keep: duration 20 s, 120 BPM grid. 9:16 rebuild: stack type in the upper-middle third, walls/carousels fill the frame vertically.
</inputs>

<direction>
Light, minimal, premium app launch. Off-white base #F2F2F0 with soft grey vignette, one cobalt accent #2B3FFF (the logo dot, the
loading ring, the play icon), pink/orange imagery supplies the colour. Display type: heavy grotesk (Inter Tight 800–900, tracking
−0.05 em) in sentence case, one emphasis word per line in italic serif (Instrument Serif) — "Still *deciding?*", "One *perfect*
pick.", "Watch *together.*", "Phone to *TV.*", "Knows your *taste.*", "Start *watching.*". Mono micro labels (Geist Mono, 14–18 px
on 1080p, letter-spaced caps): "13,419 TITLES", "0 PICKS", "98% YOUR MOOD", "NEW • STREAMING APP". Huge thin-outline ghost words
behind (SCROLL, MOOD). Camera: continuous, glides/dollies in 3D, depth of field on the poster wall, strong motion blur in every move.
Avoid: dark backgrounds, many colours at once, opacity fades, small type.
</direction>

<structure>
0:00.0–0:01.3 / SO MUCH TO WATCH — "So" alone, centre; then "So [img] much / to [img] watch." builds word by word, inline image
  pills (rounded, cap height) pop in between words; posters drift in from corners with blur; mono label "13,419 TITLES" under it;
  ghost word SCROLL behind. Kit: words (layout grow, inline [img:]), label, ghost, photo/fan drifting.
0:01.3–0:02.0 / NOTHING TO WATCH — "So much" morphs letter by letter into "Nothing" (letters flicker between sans and serif);
  the O of "Nothing" becomes a cobalt loading ring with circular text "LOADING • LOADING •" spinning; label → "0 PICKS".
  Kit: morph, letterSwap (ring + badge).
0:02.0–0:04.6 / SCROLL. — zoom THROUGH the O (needle, ×8) into an endless 3D poster wall seen at an angle, camera dollies along
  it; a hand cursor drags; the word "scroll." stamps in 3× at different places (each on a beat), a mono ticker band
  "STILL SCROLLING • STILL SCROLLING" runs along the bottom; "Still *deciding?*" types on as the wall recedes into blur.
  Kit: trans.zoomThrough, cardWall (travel + depth blur), cursor, words/headline "scroll." ×3, ticker.
0:04.6–0:07.6 / ASK — clean off-white; a search bar grows from a dot, types "rainy night, a little scary" with a caret over the
  ghost word MOOD; chips spawn joined by thin lines ("rainy night", "a little scary", "under 2 hours", "with popcorn"); a
  "Pick for me" pill gets clicked. Kit: searchBar (chips), chipCloud, cursor, button, ghost.
0:07.6–0:10.7 / ONE PERFECT PICK — the chips collapse into a card: "One *perfect* pick." + poster card + mono "98% YOUR MOOD" and
  the title "The Quiet Hour"; the card expands to full-frame hero footage (person on a sofa at night) with player chrome.
  Kit: words, card, label, clip/photo, player, trans.iris or uiMorph-style growth.
0:10.7–0:12.2 / WATCH TOGETHER · PHONE TO TV — three small screens on a dotted arc ("Watch *together.*", "3 WATCHING • IN SYNC"),
  then the same picture inside a phone that morphs into a TV frame ("Phone to *TV.*"). Kit: card ×3, phone, words.
0:12.2–0:13.4 / KNOWS YOUR TASTE — "Knows your *taste.*" fixed at top while a grid/carousel of posters re-shuffles three times on
  8th notes with a mood chip changing "cozy" → "epic" → "scary" (vertical slice transition between states).
  Kit: grid/carousel, chip, trans.slice.
0:13.4–0:14.9 / COLLAPSE → LOGO — the grid shrinks into a small disc, the disc becomes a dot (cobalt), white frame, a glossy 3D
  blue play icon enters big, "dusk." wordmark appears with "NEW • STREAMING APP" label. Kit: fan/grid collapse, headline/typeOn.
0:14.9–0:20.0 / STOP SCROLLING. START WATCHING. — feelings flash one word each with a thumbnail ("laugh." "scream." "feel." in
  different faces, coloured), "Stop scrolling." scrambles letter by letter into "Start *watching.*" inside viewfinder corner
  brackets, end lockup: play-icon badge with rotating circular text + "dusk." + "Stop scrolling. Start *watching.*" + a thin
  bottom ticker "NEW STREAMING • iOS • ANDROID • TV". Hold 2 s. Kit: words ×3 + photo, morph, badge, typeOn, ticker.
</structure>

<build>
Scenes on the 120 BPM grid (K.bpm = 120, K.beatOffset = 0.12); cuts and word hits on 8th notes. One persistent visual language:
off-white, one accent. Every move has speed at the cut (needle into the O, slice between grid states), motion blur on finals
(`--final`, mb 8). SFX: pop per word, whoosh/zoom on the needle, tick on the ticker/labels, click on the button, riser into the
logo, hit + sting on the lockup.
</build>

<gotchas>
The wall must read as 3D (perspective + depth blur), not a flat grid. Type morphs must stay legible at their key frames. Keep the
lockup simple and long enough to read (≥1.5 s). 9:16: type at y ≈ 30–45 %, keep the bottom 420 px clear of text.
</gotchas>
