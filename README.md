# Katana NP — el Katana propio de North Pearl

> **Instalación en un Mac nuevo:** sigue [INSTALL.md](INSTALL.md) (un comando: `./install.sh`).

Videos de motion graphics súper dinámicos al estilo de Higgsfield Katana, pero hechos aquí, sin suscripción.
Le das **una referencia** (un video cuyo ritmo y estilo te gusten) y **tus recursos** (tomas, capturas, logo, textos), y Claude
te devuelve **la misma edición con tu producto como protagonista**, en el formato que quieras (9:16 para Reels por defecto).

## Cómo funciona Higgsfield Katana (lo que copiamos)

Katana no es un editor aparte: es una *skill* oculta de Higgsfield que corre **dentro de Claude** a través de su conexión MCP, y
solo funciona con suscripción paga (tu API key no lo puede usar). Para motion design, Claude:

1. analiza la referencia (tomas, ritmo, música);
2. escribe un brief de reconstrucción con secciones `<inputs> <direction> <structure> <build> <gotchas>`;
3. programa el video como código (cada cuadro es una función del tiempo) y lo renderiza cuadro a cuadro.

No usa generación de video. Katana NP hace exactamente eso **en tu Mac**:

| Paso | Higgsfield Katana | Katana NP |
|---|---|---|
| Analizar la referencia | servidor de Higgsfield | `./katana analyze` (cortes, energía de movimiento, BPM, golpes, textos por OCR, hojas de contacto) |
| Brief | prompt oculto del preset | `presets/*/brief.md` + `projects/*/brief.md` (mismo formato) |
| Video como código | Claude en el sandbox de Higgsfield | Claude + `engine/` (núcleo + 69 componentes) |
| Render | Chromium + ffmpeg en la nube | Chrome sin interfaz en tu Mac, con desenfoque de movimiento real |
| Generaciones (opcional) | créditos de la suscripción | tu saldo de la API de Higgsfield (skill `higgsfield-api`, siempre con tu OK) |

## Lo que confirmamos del Katana original

El 20-10-2026 leímos, a través del conector de Higgsfield, la skill real de Katana (`katana`, con `motion-design.md`,
`analysis.md` y `creative-quality.md`). Katana NP replica su método:

- **Motion design = una página HTML con `render(t)`** determinista, fuentes locales y secuencias de imágenes para el video. Es igual a nuestro motor.
- **Leer la referencia cuadro a cuadro** (`pages/` en el análisis). Los detectores solo proponen.
- **La frase del truco**: "El truco de esta referencia es <recurso> sobre <ritmo> para que <efecto>".
- **Llevar la energía a la misma tasa**: cortes, destellos, sacudidas, movimientos de cámara y golpes por segundo. Se mide con `./katana energy video.mp4 --vs refs/analysis/<ref>/energy.json`.
- **Tres revisiones de movimiento**: ritmo; espacio y continuidad; detalle y pulido.
- **Remix, no copia**: una edición nueva en el lenguaje de la referencia, no plano por plano.

Diferencias a propósito:

- Katana corre en el sandbox de Higgsfield con su suscripción; el nuestro corre en tu Mac.
- Katana genera escenas con Seedance; nosotros solo cuando haga falta, y con tu API y tu OK.
- Katana prohíbe la música sintetizada; aquí es solo un marcador de borrador y lo preferido es tu pista o la de la referencia.

## Usarlo

En Claude Code: **`/katana`** (o simplemente "hazme un video como este" con el link o el archivo). Claude sigue el flujo:
referencia → análisis → brief (te lo muestra) → recursos → construcción → stills → borrador → revisión → final → comparación.

Comandos (desde esta carpeta):

```bash
./katana analyze refs/video.mp4                 # desarmar una referencia
./katana new mi_reel --format 9x16 --dur 15     # proyecto nuevo
./katana clip mi_reel toma.mp4 t1 --from 2 --to 6   # meter una toma (SDR) como secuencia de cuadros
./katana stills mi_reel 0.5,1.2,3                # fotos fijas para revisar rápido
./katana preview mi_reel                         # URL con reproductor en tiempo real
./katana render mi_reel --draft                  # borrador en segundos
./katana render mi_reel --final                  # final con desenfoque de movimiento (20 s ≈ 4–6 min)
./katana compare refs/video.mp4 projects/mi_reel/renders/final_*.mp4   # lado a lado con la referencia
./katana qa projects/mi_reel/renders/final_*.mp4                          # duración, fps, volumen, saltos, hoja de contacto
./katana transcribe voz.wav --out projects/mi_reel/assets/voz_words.json  # subtítulos: cada palabra con su tiempo (español)
./katana voice say "Tu web tarda demasiado…" --voice <voz> --out projects/mi_reel/assets/voz        # locución ElevenLabs: estima
./katana voice say "Tu web tarda demasiado…" --voice <voz> --out projects/mi_reel/assets/voz --yes  # …y genera voz + tiempos exactos
```

## Qué hay dentro

- `engine/katana.js`: el motor (línea de tiempo, rejilla de beats, transiciones, zonas seguras de Reels, reproductor).
- `engine/kit/`: los componentes, cada uno con su documentación en `docs/`.
  - **Tipografía cinética**: palabra por palabra, titulares XL, morph de letras, la O como anillo de carga, subtítulos sincronizados, contadores.
  - **UI**: iPhone, navegador con scroll, laptop, buscador, cursor, chips, tarjetas, ticker, badge giratorio, gauges de Lighthouse, botón CTA.
  - **Media**: tomas con rampas de velocidad, fotos, stickers recortados, muro 3D, carrusel, abanico, antes/después.
  - **Transiciones**: whip, zoom a través, slice, ráfaga de colores, iris, grid, líquido, cubo, glitch, punch, smear.
  - **Looks**: ascii, glitch VHS, sticker pop, líquido, grid reveal, halftone, duotono, pixelado, RGB split, grade, viñeta, light leaks, badge de esquina.
- `engine/demos/`: una página demo por familia (míralas con `./katana gallery engine/demos/type.html 1.6,4.7,7.4`).
- `presets/`: las 3 referencias de Higgsfield analizadas, con su brief de reconstrucción.
- `tools/`:
  - el analizador;
  - el capturador;
  - el mezclador: tus SFX de earshot, una pista rítmica sintetizada de marcador y volumen a −14 LUFS;
  - la comparación lado a lado;
  - `webshot`, para capturas de páginas web;
  - `cutout`, que quita el fondo con macOS Vision, offline;
  - OCR.
- `sfx/`: tus SFX. `fonts/`: Inter Tight, Instrument Serif, Geist Mono, Archivo y Bricolage Grotesque, todas locales y con tildes.

## Límites honestos

- La música de los demos es una pista sintetizada de marcador; la canción real la pones en Instagram (o pásame el archivo).
- Subtítulos de voz: `./katana transcribe` usa whisper.cpp (`brew install whisper.cpp`) con el modelo de `models/`
  (large-v3-turbo, ~570 MB). Precisión medida: error mediano de 2–4 ms en el inicio de cada palabra. Si hay música
  debajo, transcribe la voz sola. Las preguntas a veces salen sin «¿»: se corrige editando el texto en el JSON.
- Las tomas HDR del iPhone hay que pasarlas a SDR primero (como en el proyecto POV).
- Locución con ElevenLabs (tu cuenta, `./katana voice`): ~1 crédito por carácter, unos 300–400 por reel de 20 s. En el
  plan gratuito la API solo permite las voces "premade" (las de la biblioteca, como las latinas o colombianas, piden plan
  pago) y NO hay licencia comercial (exige "elevenlabs.io" en el título si publicas); para anuncios de North Pearl hace
  falta un plan pago (Starter, US$6/mes, incluye licencia y voces de la biblioteca). En la película: `K.voice = {src: …}`
  (la música baja sola cuando hay voz) y los cortes se sincronizan con `voz_words.json` (ejemplo: `examples/voice_test`).
- Lo que sea imposible en código (escenas fotorrealistas nuevas) se genera con tu API de Higgsfield, siempre con presupuesto y tu OK.
