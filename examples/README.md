# Ejemplos

Código real de tres películas hechas con Katana NP (sin sus recursos pesados): úsalos como patrón.

- `np_demo/` — reel de 20 s recreando el preset app-launch-dusk (12 escenas, muro 3D, buscador, Lighthouse, cierre).
- `voice_test/` — locución de ElevenLabs que manda los cortes y los subtítulos (`K.voice`, `voz_words.json`).
- `captions_test/` — subtítulos palabra por palabra desde una transcripción (`katana transcribe`).

Para volver a renderizarlos haz un proyecto con `./katana new <nombre>`, copia el `film.js` y pon los recursos que usa en `projects/<nombre>/assets/`.
