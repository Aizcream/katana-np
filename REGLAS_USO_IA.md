# Reglas de Uso de Katana NP para Modelos y Agentes de IA

Esta guía establece las **reglas obligatorias**, el **flujo de trabajo paso a paso** y el **prompt maestro** para que cualquier integrante del equipo pueda utilizar **Katana NP** con su propio modelo o agente de IA (**Google Antigravity**, **Claude Code**, **Cursor**, **OpenAI Codex**, **Windsurf**, etc.) y obtener videos de motion graphics con fidelidad de estudio.

---

## 1. Cómo cargar estas reglas en tu Agente de IA

El repositorio de Katana NP ya incluye los archivos de configuración automática en la raíz. **Siempre abre la carpeta `Katana` como tu espacio de trabajo (Workspace) principal**:

| Herramienta / Agente | Archivo que carga automáticamente | Comando / Activación adicional |
|---|---|---|
| **Google Antigravity** | `.agents/rules/katana-np.md` y `AGENTS.md` | Skill `/katana` enlazada automáticamente al correr `./install.sh` |
| **Claude Code** (App o CLI) | `CLAUDE.md` | Escribe `/katana` en el chat |
| **Cursor** | `.cursorrules` y `AGENTS.md` | Abre la carpeta `Katana` como proyecto |
| **OpenAI Codex / Windsurf / Otros** | `AGENTS.md` | Si usas un chat externo, copia el **Prompt Maestro** de la Sección 5 |

> **Para actualizar tu Katana NP antes de empezar un proyecto:**
> Ejecuta en la Terminal:
> ```bash
> cd ~/Katana && ./katana update
> ```

---

## 2. Las 10 Reglas de Oro (Obligatorias para la IA)

Todo modelo de IA que trabaje con Katana NP **DEBE** cumplir estas 10 reglas sin excepción:

1. **La Referencia Manda (Prohibido inventar de memoria):**
   Nunca escribas código de escena sin haber desarmado primero el video de referencia con `./katana analyze` y leído **todas** las hojas cuadro a cuadro (`pages/ef_*.jpg`). Si no hay video de referencia del usuario, elige primero el preset más cercano en `presets/` y usa su referencia.
2. **Pase de Lupa a Tamaño Nativo (`./katana closeup`) antes del Brief:**
   Las hojas de contacto (`ef_*.jpg`) miden ~200 px de ancho y sirven para ver la estructura, pero no los micro-detalles. Antes de escribir código, el agente **debe** extraer cuadros a tamaño real (`./katana closeup frames`) y medir tipografía (`closeup text`), curvas de escala (`closeup box`) y trayectorias (`closeup blobs`), documentándolos en `refs/analysis/<ref>/native_pass.md`.
3. **Determinismo Absoluto (`render(t)` / `window.__seek(t)`):**
   Katana captura cada cuadro en paralelo con múltiples workers de Chrome y sub-frames de *motion blur*. Cada cuadro debe ser una **función matemática pura del tiempo `t`**:
   - **PROHIBIDO:** `Math.random()`, `Date.now()`, `performance.now()`, `setInterval`, `setTimeout`, `requestAnimationFrame` propios, o transiciones/animaciones CSS (`transition:`, `@keyframes`).
   - **OBLIGATORIO:** Usar `K.hash(x)`, `K.rand(seed)`, `K.noise(x, seed)` y `K.TQ(t)` (para cuantizar eventos discretos como letras tipeadas o contadores y evitar que el *motion blur* los duplique).
4. **Tiempos Expresados en Cuadros de la Referencia (`F(frame)`):**
   Define siempre `const F = (f) => f / FPS;` y escribe todos los tiempos de escena y keyframes usando los números de cuadro exactos medidos en la referencia (`F(72)`, `F(240)`, `F(504)`), nunca segundos aproximados a ojo.
5. **Nada Importante Aparece o Desaparece Solo por Opacidad (`opacity`):**
   En motion graphics de nivel estudio, ningún elemento protagonista entra o sale únicamente con un *fade*. Todo elemento se transporta, escala con overshoot (`1.13 → 1.04 → 1.00`), se despega (`K.anim.peel`), gira en perspectiva (`K.anim.flip3d`), hace *morph* (`K.anim.morph` / expansión de píldora), se dibuja (`K.drawOn`) o corta en seco sobre el pico de velocidad.
6. **La Dirección del Zoom Nunca se Invierte en un Corte:**
   El pico de velocidad ocurre **en** el corte (`K.E.in` al salir → `K.E.out` al entrar), y el signo de `d(ln scale)/dt` debe mantenerse entre planos adyacentes (verificable con `window.__qa()`).
7. **Unidades en Píxeles del Lienzo (`1920×1080` o `1080×1920`), Nunca `vw`/`vh`/`%`:**
   El escenario (`#film` / `#world`) tiene dimensiones fijas en píxeles. Usa siempre coordenadas y tamaños en `px` (`font-size: 72px`, `left: 960px`), nunca unidades relativas a la ventana del navegador.
8. **Presupuesto y Costo Transparente Antes de Usar APIs Pagas:**
   - Si la pieza es de **gráficos diseñados por código (Familia F6: UI, tipografía cinética, diagramas, vectores, Canvas 2D, 3D con Three.js)**, el costo externo es **USD 0.00** y el agente puede construir de principio a fin sin pausas innecesarias.
   - Si requiere **ElevenLabs** (`./katana voice`) o **Higgsfield** (`skills/higgsfield-api`), el agente **debe** estimar el costo en USD y pedir confirmación al usuario antes de hacer llamadas con costo.
9. **Verificación Temprana con `stills` antes de Renderizar Video:**
   Antes de lanzar un render completo, ejecuta `./katana stills <proyecto> <t1,t2,...>` sobre las poses clave y los bordes de cada corte (±2 cuadros) y verifica visualmente la hoja `sheet.jpg` asegurando `0 errors`.
10. **Puerta de Calidad Obligatoria (`qa` + `energy` + `match` + `compare`):**
    Ningún video se entrega sin haber corrido sobre el MP4 renderizado:
    - `./katana qa <mp4>` (`outliers: 0`, `mid-motion freezes: 0`, audio integrado `-14 LUFS`).
    - `./katana energy <mp4> --vs refs/analysis/<ref>/energy.json` (comparativa de cortes/s, movimiento de cámara y golpes).
    - `./katana match <ref.mp4> <mp4> --every 1.0` (inspección visual de las hojas `match_01.jpg`… comparando `REF` arriba vs. `OURS` abajo en el mismo segundo).
    - `./katana compare <ref.mp4> <mp4>` (video lado a lado para revisión final).

---

## 3. Flujo de Trabajo Paso a Paso (Los 6 Pasos del Agente)

Cuando un compañero le pide un video al agente de IA, el agente debe ejecutar exactamente esta secuencia:

### Paso 1 — Leer Documentación Base del Motor
El agente debe leer primero:
- `skills/katana/SKILL.md`
- `skills/katana/references/brief.md`
- `skills/katana/references/craft.md`
- `skills/katana/references/qa.md`
- `engine/kit/docs/anim.md`

### Paso 2 — Desarmar y Medir la Referencia (`analyze` + `closeup`)
```bash
# 1. Análisis automático (cortes, BPM, OCR, energía y hojas de todos los cuadros)
./katana analyze refs/<referencia>.mp4 --out refs/analysis/<ref>

# 2. Extracción a tamaño nativo 1920x1080 / 1080x1920
./katana closeup frames refs/<referencia>.mp4 refs/analysis/<ref>/full

# 3. Medición de textos, cajas y trayectorias cuadro a cuadro
./katana closeup text refs/analysis/<ref>/full 0 <ultimo_frame> > refs/analysis/<ref>/text_pass.txt
```
Con estos datos, el agente escribe:
1. `refs/analysis/<ref>/events.md` — Cada evento con su cuadro exacto de inicio y fin (`f0–f71`, `f72–f118`…) y el dispositivo visual exacto.
2. `refs/analysis/<ref>/native_pass.md` — Coordenadas `(x, y, w, h)`, tamaños de fuente en `px`, paleta hex y curvas medidas.

### Paso 3 — Crear el Proyecto y Escribir el `brief.md`
```bash
./katana new <nombre_proyecto> --format 16x9 --fps 30 --dur <duracion_exacta>
```
El agente redacta `projects/<nombre_proyecto>/brief.md` con las 6 secciones obligatorias:
`<inputs>`, `<direction>`, `<structure>`, `<build>`, `<gotchas>`, `<start>`.

### Paso 4 — Construir el Código Determinista en `projects/<proyecto>/film/`
- Dividir el código de forma modular si el video supera los 20 segundos (por ejemplo: `lib.js` para activos/paleta/helpers, `scenes_1.js`, `scenes_2.js`, `scenes_3.js` y `film.js`).
- En cada `K.scene({ id, t0, t1, build(root), update(lt, t, root) })`:
  - Crear siempre un `div` hijo dentro de `root` (`const wrap = K.div(root, 'inset:0;overflow:hidden');`) porque `root` lo reserva el motor para transiciones.
  - Guardar las referencias a elementos DOM/Canvas en una variable de clausura (`let els = {};`) y actualizar todo en `update(lt, t)` en función de `const f = t * FPS;`.

### Paso 5 — Capturas de Control (`stills`) y Render Borrador (`--draft`)
```bash
# 1. Verificar poses clave y cortes en segundos (tarda ~6-9 s)
./katana stills <proyecto> 1.0,2.5,5.0,8.0,12.0,16.0,20.0

# 2. Renderizar borrador completo a velocidad rápida (8 workers)
./katana render <proyecto> --draft --workers 8 --name draft_v1

# 3. Comparar cada segundo contra la referencia
./katana match refs/<referencia>.mp4 projects/<proyecto>/renders/draft_v1_*.mp4 --every 1.0
```
El agente **debe inspeccionar visualmente** las imágenes `match_01.jpg`, `match_02.jpg`… y corregir cualquier diferencia de escala, posición, legibilidad o timing antes de pasar al render final.

### Paso 6 — Render Final con Motion Blur (`--final`) y Gate de QA
```bash
# 1. Render final con motion blur de sub-cuadro y codificación BT.709 CRF 14
./katana render <proyecto> --final --mb 4 --workers 8 --name final_v1

# 2. Batería completa de control de calidad
./katana qa projects/<proyecto>/renders/final_v1_*.mp4
./katana energy projects/<proyecto>/renders/final_v1_*.mp4 --vs refs/analysis/<ref>/energy.json
./katana match refs/<referencia>.mp4 projects/<proyecto>/renders/final_v1_*.mp4 --every 1.0
./katana compare refs/<referencia>.mp4 projects/<proyecto>/renders/final_v1_*.mp4
```
Finalmente, el agente documenta los resultados en `projects/<proyecto>/qa/gate_v1.md`.

---

## 4. Errores Frecuentes que el Agente Debe Evitar (Gotchas)

- **Elementos fantasma entre cortes:** Cuando una escena cambia de sub-estado interno (por ejemplo, de un blueprint en `f0–f71` a un logo sólido en `f72`), oculta explícitamente (`el.style.display = 'none'`) el estado anterior cuando `f >= 72`. Recuerda que Katana puede buscar (`__seek`) hacia adelante y hacia atrás en cualquier orden durante la captura con múltiples workers.
- **Letras duplicadas en el *motion blur*:** Al animar texto máquina de escribir o contadores numéricos, usa siempre `K.type(str, t, t0, cps)` o cuantiza el tiempo con `K.TQ(t)` para que los sub-cuadros de un mismo frame muestren exactamente el mismo número o carácter.
- **Rutas de archivos de audio/imágenes:**
  - En `K.music = { src: 'projects/<proyecto>/audio/pista.wav', gain: 0.9 }`, la ruta es relativa a la raíz `Katana/`.
  - En etiquetas `<img>` o CSS dentro de `projects/<proyecto>/film/index.html`, las rutas son relativas a `film/` (ej. `../assets/logo.svg` o `../../../fonts/fonts.css`).
- **Zonas seguras:**
  - En formato vertical `9x16` (`1080×1920` para Reels/TikTok): deja libre `top: 220px`, `bottom: 420px`, `right: 130px`.
  - En formato horizontal `16x9` (`1920×1080`): deja un margen limpio de `60px` arriba/abajo y `80px` a los lados.

---

## 5. Prompt Maestro para Copiar y Pegar en Cualquier Modelo de IA

Si un compañero quiere iniciar un video nuevo en **Claude Code**, **Antigravity**, **Cursor** o **Codex**, solo debe copiar y pegar esta plantilla:

```markdown
Vamos a crear un video en Katana NP (ubicado en esta carpeta).
Antes de escribir código, lee y sigue estrictamente las reglas de:
1. `REGLAS_USO_IA.md` y `skills/katana/SKILL.md`
2. `skills/katana/references/brief.md`, `craft.md`, `qa.md` y `engine/kit/docs/anim.md`

### Datos del proyecto:
- **Video de referencia:** `entrada/[NOMBRE_ARCHIVO_REFERENCIA.mp4]`
- **Marca / Producto:** [Nombre de la marca y qué hace]
- **Activos / Logos / Figma:** [Ruta en `entrada/` o enlace de Figma MCP]
- **Nombre del proyecto Katana:** `np_[nombre]`
- **Idioma del texto en pantalla:** Español (cuidar tildes y ortografía)

### Instrucciones de ejecución:
1. Ejecuta `./katana analyze` y `./katana closeup` sobre el video de referencia, lee todas las hojas de cuadros (`pages/ef_*.jpg`) y escribe `events.md` y `native_pass.md` con tiempos en cuadros exactos `F(n)` y coordenadas medidas.
2. Crea el proyecto con `./katana new`, extrae o configura la pista de audio y redacta `brief.md` con las 6 secciones (`<inputs> <direction> <structure> <build> <gotchas> <start>`).
3. Construye todas las escenas en `film/` de forma 100% determinista (función pura de `t`, cero `Math.random` o transiciones CSS), replicando cada animación, transición, curva de cámara y densidad visual de la referencia con la identidad de nuestra marca.
4. Verifica con `./katana stills`, renderiza `--draft`, revisa las hojas de `./katana match` segundo a segundo, corrige cualquier desviación visual y finalmente genera el render `--final` junto con `./katana qa`, `./katana energy`, `./katana match`, `./katana compare` y el reporte `qa/gate_v1.md`.
```
