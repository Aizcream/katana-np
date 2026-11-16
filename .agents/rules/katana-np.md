---
description: Reglas obligatorias para crear videos de motion graphics en Katana NP (análisis de referencia, lupa nativa, código determinista y QA gate).
---

# Reglas de Katana NP (Antigravity Workspace Rule)

Siempre que trabajes en este repositorio (`Katana`), sigue el protocolo completo definido en `REGLAS_USO_IA.md` y `skills/katana/SKILL.md`:

1. **Referencia Primero (`analyze` + `closeup`):** Ejecuta `./katana analyze` sobre la referencia, inspecciona todas las páginas `pages/ef_*.jpg`, ejecuta `./katana closeup` a tamaño nativo y documenta `events.md` y `native_pass.md` con cuadros exactos `F(frame)` antes de escribir código.
2. **Brief Completo:** Crea el proyecto con `./katana new` y escribe `projects/<proyecto>/brief.md` con las 6 secciones (`<inputs> <direction> <structure> <build> <gotchas> <start>`).
3. **Determinismo Absoluto:** En `projects/<proyecto>/film/`, cada cuadro debe ser una función pura de `t` (`f = t * FPS`). Prohibido usar `Math.random()`, `Date.now()`, `setTimeout` o transiciones CSS. Usa `K.hash`, `K.rand(seed)` y `K.TQ(t)`.
4. **Verificación y Gate de QA:** Prueba primero con `./katana stills` (`0 errors`), luego renderiza `--draft`, inspecciona las hojas de `./katana match` segundo a segundo, ajusta cualquier diferencia visual y finaliza con `./katana render --final`, `./katana qa`, `./katana energy`, `./katana match`, `./katana compare` y `projects/<proyecto>/qa/gate_v1.md`.
