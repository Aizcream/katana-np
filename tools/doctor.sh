#!/usr/bin/env bash
# doctor — comprueba que Katana NP funciona en este Mac y dice cómo arreglar lo que falte.
# Uso: ./katana doctor [--fast]   (--fast = sin el render de prueba ni la transcripción de prueba)
set -uo pipefail
KROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$KROOT"
FAST=0; case "${1:-}" in "") ;; --fast) FAST=1;; -h|--help) sed -n 2,3p "$0" | sed 's/^# \{0,1\}//'; exit 0;; *) echo "opción desconocida: $1 (usa --fast o --help)"; exit 2;; esac
SKILLS_DIR="${KATANA_SKILLS_DIR:-$HOME/.claude/skills}"; CONFIG_DIR="${KATANA_CONFIG_DIR:-$HOME/.config/katana}"
G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'
[[ -t 1 ]] || { G=; Y=; R=; N=; }        # sin colores al copiar la salida (| pbcopy)
LOGD="${TMPDIR:-/tmp}"; LOGD="${LOGD%/}/katana"; mkdir -p "$LOGD"   # logs por usuario
NO_WHISPER=0; grep -qs -- --no-whisper "$CONFIG_DIR/flags" && NO_WHISPER=1
ERR=0; WARN=0
ok() { echo "  ${G}✓${N} $*"; }; warn() { echo "  ${Y}⚠${N} $*"; WARN=$((WARN+1)); }; bad() { echo "  ${R}✗${N} $*"; ERR=$((ERR+1)); }
PY="$KROOT/.venv/bin/python"; [[ -x "$PY" ]] || PY=python3

echo "Katana NP — diagnóstico ($KROOT)"
# núcleo
v=$(node -v 2>/dev/null | sed 's/v//;s/\..*//')
if [[ -z "$v" ]]; then bad "Node no encontrado → brew install node (o: nvm install 22)"
elif (( v < 22 )); then bad "Node $(node -v) es viejo: Katana necesita 22 o más nuevo → brew install node (o: nvm install 22 && nvm alias default 22)"
else ok "Node $(node -v)"; fi
"$PY" -c 'import numpy, PIL' 2>/dev/null && ok "Python con numpy + Pillow ($PY)" || bad "Python sin numpy/Pillow → ./install.sh"
command -v ffmpeg >/dev/null && command -v ffprobe >/dev/null && ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')" || bad "ffmpeg no encontrado → brew install ffmpeg"
[[ -n "${HFT_BROWSER:-}" && ! -e "$HFT_BROWSER" ]] && bad "HFT_BROWSER apunta a '$HFT_BROWSER', que no existe → unset HFT_BROWSER (o corrige la ruta)"
br=""; for a in "${HFT_BROWSER:-}" "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app" "/Applications/Brave Browser.app" "/Applications/Chromium.app" "/Applications/Microsoft Edge.app"; do
  [[ -n "$a" && -e "$a" ]] && { br="$a"; break; }; done
[[ -n "$br" ]] && ok "navegador de render: $(basename "$br" .app)" || bad "no hay Chrome/Brave/Edge → brew install --cask google-chrome"
ls fonts/*.woff2 >/dev/null 2>&1 && [[ -f fonts/fonts.css ]] && ok "fuentes locales ($(ls fonts/*.woff2 | wc -l | tr -d ' ') archivos)" || bad "faltan las fuentes en fonts/ → vuelve a clonar el repositorio"
[[ -f engine/katana.js && -f engine/kit/type.js ]] && ok "motor y componentes" || bad "falta engine/ → vuelve a clonar el repositorio"
# opcionales
for t in ocr cutout fdiff; do [[ -x tools/bin/$t ]] && ok "tools/bin/$t" || warn "tools/bin/$t no está (OCR / recorte / QA) → instala las Command Line Tools (xcode-select --install) y corre ./install.sh"; done
if [[ $NO_WHISPER == 1 ]]; then echo "  · transcripción omitida (instalaste con --no-whisper; para activarla: ./install.sh --with-whisper)"
elif command -v whisper-cli >/dev/null && [[ -f models/ggml-large-v3-turbo-q5_0.bin ]]; then ok "transcripción (whisper.cpp + modelo)"; else warn "transcripción no instalada → ./install.sh --with-whisper"; fi
ls sfx/*.wav >/dev/null 2>&1 && ok "librería de SFX ($(ls sfx/*.wav | wc -l | tr -d ' ') sonidos)" || warn "sfx/ vacío: los efectos se sintetizan (pon tus .wav en sfx/, ver README)"
# skill + config
if [[ -L "$SKILLS_DIR/katana" && "$(readlink "$SKILLS_DIR/katana")" == "$KROOT/skills/katana" ]]; then ok "skill /katana enlazada"
else bad "la skill /katana no apunta a esta carpeta → ./install.sh"; fi
[[ "$(cat "$CONFIG_DIR/home" 2>/dev/null)" == "$KROOT" ]] && ok "ruta registrada ($CONFIG_DIR/home)" || bad "ruta no registrada → ./install.sh"
command -v claude >/dev/null && ok "Claude Code $(claude --version 2>/dev/null | awk '{print $1}')" || warn "no encuentro el comando 'claude' (si usas la app de escritorio está bien)"
# claves (sin mostrarlas)
[[ -s "$HOME/.config/elevenlabs/credentials.env" || -n "${ELEVENLABS_API_KEY:-}" ]] && ok "clave de ElevenLabs guardada" || warn "sin clave de ElevenLabs (opcional, para voces) → ./katana keys elevenlabs"
[[ -s "$HOME/.config/higgsfield/credentials.env" ]] && ok "clave de Higgsfield guardada" || echo "  · sin clave de Higgsfield (opcional, para generar escenas con IA)"

if [[ $FAST == 0 && $ERR == 0 ]]; then
  echo "  … prueba de render (2 s con audio)"
  P="projects/_doctor"; rm -rf "$P"
  mkdir -p "$P"/{film,assets,audio,renders}
  cp engine/template/index.html engine/template/film.js "$P/film/"
  sed -i '' "s/K.start({ format: '9x16', fps: 30, dur: 5 })/K.start({ format: '9x16', fps: 30, dur: 2 })/" "$P/film/film.js"
  if ./katana render _doctor --draft --workers 3 >"$LOGD/doctor_render.log" 2>&1; then
    f=$(ls "$P"/renders/*.mp4 2>/dev/null | head -1)
    d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null); a=$(ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$f" 2>/dev/null)
    if [[ -n "$f" && "${d%.*}" == "2" && "$a" == "aac" ]]; then ok "render de prueba: $(basename "$f") (${d}s, video + audio)"; else bad "el render de prueba salió mal → abre el registro: open \"$LOGD/doctor_render.log\""; fi
  else bad "el render de prueba falló → abre el registro: open \"$LOGD/doctor_render.log\" (casi siempre es Chrome: brew install --cask google-chrome)"; fi
  rm -rf "$P"
  if [[ $NO_WHISPER == 0 ]] && command -v whisper-cli >/dev/null && [[ -f models/ggml-large-v3-turbo-q5_0.bin ]] && command -v say >/dev/null; then
    tmpd=$(mktemp -d); say -v Paulina -o "$tmpd/t.aiff" "Hola, esto es una prueba de Katana." 2>/dev/null || say -o "$tmpd/t.aiff" "Hola, esto es una prueba de Katana."
    if "$PY" tools/transcribe.py "$tmpd/t.aiff" --out "$tmpd/t.json" >"$LOGD/doctor_asr.log" 2>&1 && "$PY" -c "import json,sys;w=json.load(open('$tmpd/t.json'))['words'];sys.exit(0 if len(w)>=4 else 1)"; then
      ok "transcripción de prueba: \"$("$PY" -c "import json;print(json.load(open('$tmpd/t.json'))['text'])")\""
    else warn "la transcripción de prueba falló → abre el registro: open \"$LOGD/doctor_asr.log\""; fi
    rm -rf "$tmpd"
  fi
fi
echo
if [[ $ERR == 0 ]]; then echo "  ${G}Todo listo${N}$([[ $WARN -gt 0 ]] && echo " ($WARN avisos opcionales arriba)")."; exit 0
else echo "  ${R}$ERR problema(s) por resolver${N} (✗ arriba)."; exit 1; fi
