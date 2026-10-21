#!/usr/bin/env bash
# install.sh — instala Katana NP en este Mac (idempotente: se puede volver a correr sin riesgo).
#
#   ./install.sh                 instalación completa (≈ 5–15 min la primera vez; descarga ~600 MB)
#   ./install.sh --no-whisper    sin transcripción (no instala whisper.cpp ni descarga el modelo de 570 MB)
#   ./install.sh --with-higgsfield   además instala la skill higgsfield-api (generaciones con la API de Higgsfield)
#   ./install.sh --with-whisper / --no-higgsfield   deshace una opción recordada (las opciones se recuerdan entre ejecuciones)
#   ./install.sh --quick         no reinstala nada que ya exista (lo usa `katana update`)
#   ./install.sh --no-doctor     no corre la prueba final
#
# Qué hace: revisa Homebrew y las Command Line Tools de Xcode · instala con brew lo que falte (ffmpeg, node, python,
# whisper.cpp, Google Chrome) · crea .venv con numpy + Pillow · compila tools/bin/{ocr,cutout,fdiff} · descarga los
# modelos de whisper a models/ · enlaza la skill /katana en ~/.claude/skills · guarda la ruta en ~/.config/katana/home ·
# corre `katana doctor` (renderiza un video de 2 s para comprobar que todo funciona).
set -uo pipefail
KROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$KROOT"
NO_WHISPER=0; WITH_HF=0; QUICK=0; NO_DOCTOR=0
_cfg="${KATANA_CONFIG_DIR:-$HOME/.config/katana}"
for f in $(cat "$_cfg/flags" 2>/dev/null); do [[ $f == --no-whisper ]] && NO_WHISPER=1; [[ $f == --with-higgsfield ]] && WITH_HF=1; done   # opciones recordadas
for a in "$@"; do case "$a" in
  --no-whisper) NO_WHISPER=1;; --with-whisper) NO_WHISPER=0;; --with-higgsfield) WITH_HF=1;; --no-higgsfield) WITH_HF=0;;
  --quick) QUICK=1;; --no-doctor) NO_DOCTOR=1;;
  -h|--help) sed -n 2,14p "$0" | sed 's/^# \{0,1\}//'; exit 0;;
  *) echo "opción desconocida: $a"; exit 2;; esac; done
SKILLS_DIR="${KATANA_SKILLS_DIR:-$HOME/.claude/skills}"        # (las pruebas aisladas lo cambian)
CONFIG_DIR="${KATANA_CONFIG_DIR:-$HOME/.config/katana}"
LOGD="${TMPDIR:-/tmp}"; LOGD="${LOGD%/}/katana"; mkdir -p "$LOGD" "$CONFIG_DIR"   # logs por usuario (en un Mac compartido /tmp es de todos)
printf '%s\n' "$( [[ $NO_WHISPER == 1 ]] && printf -- '--no-whisper ' )$( [[ $WITH_HF == 1 ]] && printf -- '--with-higgsfield' )" > "$CONFIG_DIR/flags"

B=$'\033[1m'; G=$'\033[32m'; Y=$'\033[33m'; R=$'\033[31m'; N=$'\033[0m'
[[ -t 1 ]] || { B=; G=; Y=; R=; N=; }        # sin colores al copiar la salida (| pbcopy)
ok() { echo "  ${G}✓${N} $*"; }
warn() { echo "  ${Y}⚠${N} $*"; }
fail() { echo "  ${R}✗${N} $*"; }
step() { echo; echo "${B}$*${N}"; }
FAILED=0

echo "${B}Katana NP — instalación${N}  ($KROOT)"
[[ "$(uname)" == "Darwin" ]] || { fail "Katana NP necesita macOS (usa Chrome, ffmpeg y herramientas de Apple)."; exit 1; }

# ---------------------------------------------------------------- 1. Homebrew
step "1/8 Homebrew"
if ! command -v brew >/dev/null 2>&1; then
  for p in /opt/homebrew/bin/brew /usr/local/bin/brew; do [[ -x $p ]] && eval "$($p shellenv)"; done
fi
if command -v brew >/dev/null 2>&1; then ok "brew $(brew --version | head -1 | awk '{print $2}')"
else
  fail "Falta Homebrew. Sigue el paso 2 de INSTALL.md (instalar Homebrew y luego el comando de 'brew shellenv') y vuelve a ejecutar ./install.sh"
  exit 1
fi

# ---------------------------------------------------------------- 2. Xcode Command Line Tools (para compilar OCR, recorte y QA)
step "2/8 Herramientas de Apple (swiftc)"
if xcode-select -p >/dev/null 2>&1 && command -v swiftc >/dev/null 2>&1; then ok "Command Line Tools ($(swiftc --version 2>&1 | head -1 | sed 's/.*Swift version \([0-9.]*\).*/Swift \1/'))"
else
  warn "Faltan las Command Line Tools de Xcode. Se abre una ventana para instalarlas: acepta, espera a que termine y vuelve a correr ./install.sh."
  warn "(Sin ellas Katana funciona, pero sin OCR de referencias, sin recorte de fondo y sin el escáner de QA.)"
  xcode-select --install >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------- 3. paquetes de Homebrew
step "3/8 Programas (ffmpeg, Node, Python, whisper.cpp, Chrome)"
need_brew=()
command -v ffmpeg >/dev/null 2>&1 && command -v ffprobe >/dev/null 2>&1 && ok "ffmpeg $(ffmpeg -version | head -1 | awk '{print $3}')" || need_brew+=(ffmpeg)
nodev=$(node -v 2>/dev/null | sed 's/v//;s/\..*//'); if [[ -n "$nodev" && "$nodev" -ge 22 ]]; then ok "node $(node -v)"; else need_brew+=(node); fi
command -v python3 >/dev/null 2>&1 && ok "python $(python3 --version | awk '{print $2}')" || need_brew+=(python)
if [[ $NO_WHISPER == 0 ]]; then command -v whisper-cli >/dev/null 2>&1 && ok "whisper.cpp $(brew list --versions whisper.cpp 2>/dev/null | awk '{print $2}')" || need_brew+=(whisper.cpp); fi
if (( ${#need_brew[@]} )); then
  echo "  instalando con brew: ${need_brew[*]}"
  brew install "${need_brew[@]}" || { fail "brew install falló (mira el mensaje de arriba; si dice 'not writable', ver INSTALL.md → Problemas frecuentes)"; FAILED=1; }
  hash -r
  for c in ffmpeg ffprobe python3; do command -v $c >/dev/null 2>&1 || { fail "$c no aparece después de instalarlo → cierra y abre la Terminal y vuelve a ejecutar ./install.sh"; FAILED=1; }; done
  [[ $NO_WHISPER == 0 ]] && ! command -v whisper-cli >/dev/null 2>&1 && { fail "whisper-cli no aparece → brew install whisper.cpp"; FAILED=1; }
  nv=$(node -v 2>/dev/null | sed 's/v//;s/\..*//')
  if [[ -z "$nv" ]]; then fail "Node no aparece en esta Terminal → ciérrala, abre una nueva y vuelve a ejecutar ./install.sh"; FAILED=1
  elif (( nv < 22 )); then fail "Esta Terminal usa Node $(node -v) (viejo). Si usas nvm: nvm install 22 && nvm alias default 22"; FAILED=1; fi
fi
browser=""
for app in "/Applications/Google Chrome.app" "$HOME/Applications/Google Chrome.app" "/Applications/Brave Browser.app" "/Applications/Chromium.app" "/Applications/Microsoft Edge.app"; do
  [[ -d "$app" ]] && { browser="$app"; break; }; done
if [[ -n "$browser" ]]; then ok "navegador para renderizar: $(basename "$browser" .app)"
else echo "  instalando Google Chrome (lo usa Katana para dibujar cada cuadro, en segundo plano)"; brew install --cask google-chrome || { fail "no pude instalar Chrome: instálalo desde google.com/chrome"; FAILED=1; }; fi

# ---------------------------------------------------------------- 4. Python (.venv con numpy y Pillow)
step "4/8 Entorno de Python"
if [[ ! -x .venv/bin/python ]] || [[ $QUICK == 0 && ! -f .venv/.katana-ok ]]; then
  python3 -m venv .venv && .venv/bin/python -m pip install -q --upgrade pip && .venv/bin/python -m pip install -q numpy pillow \
    && touch .venv/.katana-ok && ok ".venv listo (numpy, Pillow)" || { fail "no pude crear .venv (python3 -m venv)"; FAILED=1; }
else ok ".venv ya existe"; fi
.venv/bin/python -c 'import numpy, PIL' 2>/dev/null || { fail ".venv sin numpy/Pillow: borra la carpeta .venv y vuelve a correr ./install.sh"; FAILED=1; }

# ---------------------------------------------------------------- 5. herramientas compiladas (macOS)
step "5/8 OCR, recorte de fondo y QA (Swift)"
mkdir -p tools/bin
if command -v swiftc >/dev/null 2>&1; then
  for t in ocr cutout fdiff; do
    if [[ -x tools/bin/$t && tools/bin/$t -nt tools/$t.swift ]]; then ok "$t (ya compilado)"
    elif swiftc -O "tools/$t.swift" -o "tools/bin/$t" >"$LOGD/swift_$t.log" 2>&1; then ok "$t compilado"
    else warn "no se pudo compilar $t → abre el registro: open \"$LOGD/swift_$t.log\" (Katana sigue funcionando sin él)"; fi
  done
else warn "sin swiftc: se omiten OCR, recorte y QA (instala las Command Line Tools y vuelve a correr)"; fi

# ---------------------------------------------------------------- 6. modelos de whisper
step "6/8 Modelos de transcripción"
mkdir -p models
dl() {  # dl <url> <file> <sha256>
  local url=$1 f=$2 sum=$3
  if [[ -f "$f" ]] && [[ "$(shasum -a 256 "$f" | awk '{print $1}')" == "$sum" ]]; then ok "$(basename "$f") (ya descargado)"; return 0; fi
  echo "  descargando $(basename "$f")…"
  if curl -fL --progress-bar -o "$f.part" "$url" && [[ "$(shasum -a 256 "$f.part" | awk '{print $1}')" == "$sum" ]]; then mv "$f.part" "$f"; ok "$(basename "$f")"
  else rm -f "$f.part"; fail "descarga fallida o incompleta: $(basename "$f") — vuelve a correr ./install.sh"; FAILED=1; fi
}
if [[ $NO_WHISPER == 0 ]]; then
  dl https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large-v3-turbo-q5_0.bin models/ggml-large-v3-turbo-q5_0.bin 394221709cd5ad1f40c46e6031ca61bce88931e6e088c188294c6d5a55ffa7e2
  dl https://huggingface.co/ggml-org/whisper-vad/resolve/main/ggml-silero-v5.1.2.bin models/ggml-silero-v5.1.2.bin 29940d98d42b91fbd05ce489f3ecf7c72f0a42f027e4875919a28fb4c04ea2cf
else warn "omitido (--no-whisper): 'katana transcribe' no estará disponible"; fi

# ---------------------------------------------------------------- 7. skill /katana para Claude Code
step "7/8 Skill /katana para Claude Code"
mkdir -p "$SKILLS_DIR" "$CONFIG_DIR" projects refs entrada
printf '%s\n' "$KROOT" > "$CONFIG_DIR/home"
link_skill() {  # link_skill <name>
  local src="$KROOT/skills/$1" dst="$SKILLS_DIR/$1"
  if [[ -L "$dst" ]]; then rm "$dst"
  elif [[ -e "$dst" ]]; then local bk="$CONFIG_DIR/backup"; mkdir -p "$bk"; mv "$dst" "$bk/$1-$(date +%Y%m%d%H%M%S)"; warn "había una skill '$1' propia: la guardé en $bk (fuera de las skills, para que Claude no cargue dos)"; fi
  ln -s "$src" "$dst" && ok "/$1 → $src"
}
link_skill katana
[[ $WITH_HF == 1 ]] && link_skill higgsfield-api
chmod +x katana install.sh 2>/dev/null || true        # (git ya guarda los permisos de los demás scripts)
ok "ruta guardada en $CONFIG_DIR/home"

# ---------------------------------------------------------------- 8. diagnóstico
step "8/8 Diagnóstico"
if [[ $NO_DOCTOR == 0 ]]; then ./katana doctor || FAILED=1; else warn "omitido (--no-doctor)"; fi

echo
if [[ $FAILED == 0 ]]; then
  echo "${G}${B}Katana NP está listo.${N}"
  echo "  · Abre Claude (app de escritorio) → pestaña Code → entorno Local → carpeta Katana, y escribe:  /katana"
  echo "  · Pon tus videos, logos y referencias en:  $KROOT/entrada"
  echo "  · Voces con ElevenLabs (opcional):   ./katana keys elevenlabs"
  echo "  · Referencias de los presets (opcional, 2 min):   ./katana refs"
  [[ $WITH_HF == 1 ]] || echo "  · Generaciones con Higgsfield (opcional):   ./install.sh --with-higgsfield --no-doctor && ./katana keys higgsfield"
  echo "  · Actualizar más adelante:   ./katana update"
else
  echo "${R}${B}La instalación terminó con errores.${N} Corrige lo indicado con ✗ arriba y vuelve a ejecutar ./install.sh"
  echo "  (para pedir ayuda: ./katana doctor 2>&1 | pbcopy  — y pega el resultado en un mensaje)"
  exit 1
fi
