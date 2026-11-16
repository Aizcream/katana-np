# Katana NP — Claude Code Instructions (`CLAUDE.md`)

Lee y sigue siempre `AGENTS.md`, `REGLAS_USO_IA.md` y `skills/katana/SKILL.md` al trabajar en este repositorio.

- **Comando rápido:** Escribe `/katana` o sigue el flujo de 6 pasos de `REGLAS_USO_IA.md`.
- **Regla #1 (Referencia primero):** Desarma siempre la referencia con `./katana analyze` y mide a tamaño real con `./katana closeup` (`events.md` + `native_pass.md`) antes de escribir `brief.md` o código en `film/`.
- **Regla #2 (Determinismo puro):** Todo estado en `update(lt, t)` debe ser función pura de `t` (`const f = t * FPS`). Prohibido `Math.random()`, `Date.now()` o transiciones CSS. Usa `K.hash`, `K.rand(seed)` y `K.TQ(t)`.
- **Regla #3 (QA obligatorio):** Verifica con `./katana stills`, luego `./katana render <proyecto> --draft` + `./katana match`, corrige desviaciones visuales y cierra con `./katana render <proyecto> --final` + `./katana qa` + `./katana energy` + `./katana compare` + `qa/gate_v1.md`.
