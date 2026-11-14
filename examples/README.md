# Ejemplos

Código real de películas hechas con Katana NP (sin sus recursos pesados): úsalos como patrón.

- `np_salu/` — **el ejemplo del método v2 (referencia primero):** 17,7 s con los mismos tamaños, duración y cuadros de corte que la referencia «Salu», escenas escritas a la medida con `K.anim` (tarjeta que gira en perspectiva, calcomanías que se despegan, ficha que se transforma en cursor, fondos que se inundan), el registro de eventos de la referencia en `events.md` y su guion en `brief.md`. Recursos: `engine/demos/assets/ui/site_mobile.jpg` y `engine/demos/assets/img/np_logo_horizontal.svg` → `projects/<nombre>/assets/img/`.
- `snap_hybrid/` — una escena de snapcn renderizada por Remotion (`./katana remotion snap_hybrid NP-GatherLockup gather`) dentro de una película de Katana: al terminar, el cuadro entero se despega como calcomanía y entra la tarjeta de North Pearl. Necesita el proyecto de Remotion con esa composición.
- `snap_gather/` — la misma escena de snapcn (Gather Lockup, MIT) portada a mano al motor de Katana, como prueba de equivalencia; necesita `gather_data.js` (las tablas de snapcn compiladas) y 15 imágenes.
- `np_3d/` — escena 3D real (`scene3d`): 2.500 fichas en la paleta de North Pearl que caen, se apilan y se abren alrededor de tres palabras. No necesita recursos. Render: `./katana render <nombre> --final --mb 16`.
- `np_demo/` — reel de 20 s recreando el preset app-launch-dusk (12 escenas, muro 3D, buscador, Lighthouse, cierre).
- `voice_test/` — locución de ElevenLabs que manda los cortes y los subtítulos (`K.voice`, `voz_words.json`).
- `captions_test/` — subtítulos palabra por palabra desde una transcripción (`katana transcribe`).

Para volver a renderizarlos haz un proyecto con `./katana new <nombre>`, copia el `film.js` y pon los recursos que usa en `projects/<nombre>/assets/`.
