#!/usr/bin/env bash
# keys — guarda una API key desde el PORTAPAPELES (nunca se escribe ni se muestra) y la verifica.
#   ./katana keys elevenlabs     copia tu key de ElevenLabs (elevenlabs.io → Developers → API Keys) y corre esto
#   ./katana keys higgsfield     te pide copiar primero el KEY ID y luego el SECRET (cloud.higgsfield.ai → API keys)
#   ./katana keys status         qué claves hay guardadas (sin mostrarlas)
set -uo pipefail
KROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY="$KROOT/.venv/bin/python"; [[ -x "$PY" ]] || PY=python3
clip() { pbpaste | tr -d '[:space:]' | sed $'s/\x1b\\[[0-9;]*[A-Za-z~]//g'; }
case "${1:-status}" in
  elevenlabs)
    read -r -p "Copia tu API key de ElevenLabs (botón de copiar junto a la clave) y luego presiona Enter aquí… " _; k=$(clip)
    if [[ ! "$k" =~ ^sk_[0-9a-f]{48}$ ]]; then
      echo "El portapapeles no tiene una key de ElevenLabs (empiezan por sk_ y tienen 51 caracteres)."
      echo "Cópiala en elevenlabs.io → Developers → API Keys (permisos: Text to Speech, Voices → escribir, User → leer) y vuelve a correr esto."; exit 1; fi
    mkdir -p ~/.config/elevenlabs && printf 'ELEVENLABS_API_KEY=%s\n' "$k" > ~/.config/elevenlabs/credentials.env && chmod 600 ~/.config/elevenlabs/credentials.env
    unset k; printf '' | pbcopy
    echo "Guardada en ~/.config/elevenlabs/credentials.env (solo tu usuario puede leerla; el portapapeles quedó vacío)."
    "$PY" "$KROOT/tools/voice.py" check ;;
  higgsfield)
    read -r -p "1) Copia el KEY ID de Higgsfield y presiona Enter… " _; id=$(clip)
    read -r -p "2) Ahora copia el KEY SECRET y presiona Enter… " _; sec=$(clip)
    if [[ -z "$id" || -z "$sec" || "$id" == "$sec" ]]; then echo "No recibí dos valores distintos. Vuelve a intentarlo."; exit 1; fi
    mkdir -p ~/.config/higgsfield && printf 'HF_KEY_ID=%s\nHF_KEY_SECRET=%s\n' "$id" "$sec" > ~/.config/higgsfield/credentials.env && chmod 600 ~/.config/higgsfield/credentials.env
    unset id sec; printf '' | pbcopy
    echo "Guardadas en ~/.config/higgsfield/credentials.env."
    [[ -x "$KROOT/skills/higgsfield-api/scripts/hf-api.mjs" ]] && node "$KROOT/skills/higgsfield-api/scripts/hf-api.mjs" check || true ;;
  status)
    [[ -s ~/.config/elevenlabs/credentials.env ]] && echo "ElevenLabs: guardada" || echo "ElevenLabs: no"
    [[ -s ~/.config/higgsfield/credentials.env ]] && echo "Higgsfield: guardada" || echo "Higgsfield: no" ;;
  -h|--help) sed -n 2,5p "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *) sed -n 2,5p "$0" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
