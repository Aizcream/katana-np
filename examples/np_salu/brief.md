# np_salu — North Pearl in the language of the "Salu" reference

**Trick:** the trick of this ref is a deck of die-cut paper cards that asks in one "language" and answers in another
with a 6-frame page peel, cut on every beat of a 120 BPM track, so that a list of features feels like flipping through
a travel notebook. Family: F6 (designed graphics), all code, no paid generation.

Reference: `refs/x_2110462034311856383.mp4` (Higgsfield Katana, "Salu" language-app launch). Analysis: `refs/analysis/salu/`.
Energy to carry: cuts 0.85/s · camera moves 0.34/s · hits 0.34/s · flashes 0 · 16 shots, the shortest 0.43 s.

<inputs>
Brand: North Pearl (web and software studio). 1920 × 1080 · 30 fps · exactly 17.7 s and 531 frames: the reference's own
size, length and cut frames, because this film is the reference-first test (`./katana match` compares frame for frame).
Assets: `assets/img/np_logo_horizontal.svg` (white wordmark, used only on the end card), `assets/img/site_mobile.jpg`
(the fictional "Aurora Café" demo site, as the phone's screen). Soundtrack: the reference's own track
(`audio/ref_track.wav`), for comparison only; a published version needs our own music.
Copy is locked as written in `<structure>
Times are the reference's frames (30 fps); field = orange, paper = cream.
f0–36 / SALUDAR — field. A stack of three cream cards, in place on frame 0. "Toda web / tiene una primera /
impresión." typed (108 px). Tile with a cursor, seal "SEG. 1" with ticks, typing bubble, sparkles; the right sheet
slides out with a "ñ" sticker (f24–36). Browser sticker bottom-left.
f36–46 / GIRO — the top card turns over about its vertical axis (anticipation, turn f38–41, overshoot, settle); its
back is the orange card; field swaps to paper under it at f38.
f46–63 / HOLA — "Hola." bubble pops (f46) with a turning dashed ring and ticks; pill "segundo uno" (f53); arrow doodle.
f61–121 / CONSTRUIR — opens through a ring from the bubble (f61–65); the bubble is carried and thrown out on an arc.
Field. Sticker words land on f61, 66, 68, 69.5, 70, 72: "Rediseñamos / la tuya / paso a paso."; underline f76–81.
Phone slides in (f63–68), the site scrolls; "¡Así sí!" (f82), "Perfecta." (f114). Field floods to paper from the
phone's foot (f98–104). Browser sticker with ticks (f110).
f121–168 / ELEGIR — enters behind a slanted edge (f121–124). "¿Para qué la" typed (f128–131), "quieres?" lands from
large (f132). Eight chips; a sticker slams onto each, one every 4 frames (f131–161). "Reservas" (teal) lifts a corner
(f163–165) and is carried to the centre.
f166–181 / CLIC — opens through a rounded box (f166–170). The chip morphs into the cursor (f169–172), which loops on a
dotted trail and dives at a target (f172–181).
f181–213 / PREGUNTA 1 — "¿Y carga rápido?" tumbles in on paper; paper floods to field (f184–188); the card peels
(f192.5–199) to "De 81 a 94." (label RENDIMIENTO · LIGHTHOUSE, seal "caso real", check, confetti, back sheets).
f213–241 / PREGUNTA 2 — "¿Me encuentra Google?" arrives from the right; peels (f223.5–230) to "SEO: 100.".
f241–271 / PREGUNTA 3 — "¿Y en el celular?" tumbles in; paper floods to field (f243–248); peels (f252.5–259) to
"Igual de bien." (label MÓVIL · TABLET · PC).
f271–300 / CÓDIGO — a white card enters from the left, the field floods from that side; `<h1>Hola, mundo</h1>` typed;
bunting; bubble "Hecha a medida."; thrown left while a cursor crosses (f291–299).
f300–332 / INFORME — the ticket swings in (f300–306): "INFORME · LIGHTHOUSE", "Aprobada.", "Caso real · 4 de 4 en
verde", chart antes/después (f304–309), seal "94" spins in, pill "Las cuatro en verde." arrives as a smear (f311–313),
check sticker (f319).
f331–362 / PORQUÉ — opens through concentric rings from the check. "Cada sección / tiene su / porqué." typed; on the
phone a teal sticker pops and peels off (f346–353) to show "título claro"; "botón a la vista" (f355); a bubble pops (f359).
f361–391 / ÁLBUM — opens through a rounded box from that bubble. "Lo que lleva una buena web" typed; eleven stamps in
the album, three slam in (f368, 371, 379); pill "sin relleno" unrolls (f382–388).
f390–419 / STACK — enters behind a slanted edge. Orange pill "NORTH PEARL · STACK — Hecha con Astro." swings in and
overshoots; a small cursor flies a dashed loop and lands in it (f392–405); star, sparkle and seal "rápida" pop; the
icon closes into a ring.
f419–531 / FIRMA — one clean field frame; the North Pearl wordmark lands as an ink speech-bubble sticker with two
outline echoes and ticks; the logo is centred in the bubble and the second bubble sits behind it, clear of the logo.
"Webs que se entienden a la primera." typed (f429–446), underline; small stickers (f458–466); teal button
"Escríbenos" lands on f479. Hold: everything keeps bobbing, the button pulses.
</structure>

<build>
1. One file, `film/film.js`; constants first (palette `C`, cut times `T` = the reference's cut frames, all copy in `COPY`).
2. Bespoke builders in the film (card, seal, pill, bubble, squiggle, ticks, cursor, phone, confetti) plus `K.anim`
   (peel, flip, morph, flood, iris, slam, pop, ghostType). Die-cut rings come from two SVG filters (blur + alpha
   threshold = round dilate), never `-webkit-text-stroke`.
3. Every scene paints its own background (floods and irises need layers); `K.BG` stays constant. Scenes that open
   through an iris have `pre`, the ones under them `post`.
4. Every element is a pure function of time; times are written as reference frames through `F()`.
5. Question cards are sticker layers over the answer: `K.anim.peel` clips the sticker along the fold and lays its
   mirrored back over it (6.5 frames).
6. `K.lens = false` (clean reference). Final with `--mb 8`.
7. Deliver the MP4, the match pages and the gate log.
</build>

<gotchas>
The reference was first rebuilt from its overview sheet and came out as slides and whips (v1–v6): read every page.
The first frame is already a composed pose: the reference never opens on an empty field.
Holds are 8–11 frames inside the question/answer pairs: two lines of copy at most, big.
Nothing is smaller than its counterpart in the reference at the same timecode (chips, board and cards fill the frame).
Confetti must not land on text (it once read as a wrong accent on "bien").
The wordmark is the real logo file; no AI-drawn or re-typed logo.
The reference's track is for comparison only.
</gotchas>

<start>
Read every page of the reference and write `events.md` → stills of the hold poses AND of each device mid-way (turn,
peel, morph, flood, iris) → `./katana match` against the reference, asking "same device?" for every pair → final with
motion blur → gate log.
</start>
