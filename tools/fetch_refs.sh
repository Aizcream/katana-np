#!/usr/bin/env bash
# fetch_refs — downloads the three Higgsfield Katana reference videos used by presets/ (public posts on X, read through the
# fxtwitter JSON API) into refs/ and analyses them into refs/analysis/. They are not in the repository (they are
# Higgsfield's videos): each machine fetches them for study. ~50 MB, ~2 min.
#   ./katana refs            fetch what is missing + analyse
#   ./katana refs <url>      fetch any X post's video into refs/ (prints the local path) — e.g. a new reference
set -uo pipefail
KROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$KROOT"
case "${1:-}" in -h|--help) sed -n 2,6p "$0" | sed 's/^# \{0,1\}//'; exit 0;; esac
LOGD="${TMPDIR:-/tmp}"; LOGD="${LOGD%/}/katana"; mkdir -p "$LOGD"
PY="$KROOT/.venv/bin/python"; [[ -x "$PY" ]] || PY=python3
mkdir -p refs/analysis
fetch() {  # fetch <status id> <out.mp4>
  local id=$1 out=$2 json url
  [[ -s "$out" ]] && { echo "  ✓ $(basename "$out") (ya está)"; return 0; }
  json=$(curl -fsSL "https://api.fxtwitter.com/status/$id" 2>/dev/null) || true
  [[ -n "$json" ]] || { echo "  ✗ no pude contactar api.fxtwitter.com (¿sin internet?)"; return 1; }
  url=$(printf '%s' "$json" | "$PY" -c "
import json,sys
d=json.load(sys.stdin); v=(d.get('tweet',{}).get('media') or {}).get('videos') or []
best=max((f for x in v for f in x.get('formats',[]) if f.get('container')=='mp4'), key=lambda f: f.get('bitrate') or 0, default=None)
print(best['url'] if best else (v[0]['url'] if v else ''))" 2>/dev/null) || true
  [[ -n "$url" ]] || { echo "  ✗ no encontré un video en el post $id"; return 1; }
  curl -fsSL -o "$out.part" "$url" && mv "$out.part" "$out" && echo "  ✓ $(basename "$out")" || { rm -f "$out.part"; echo "  ✗ la descarga de $(basename "$out") falló"; return 1; }
}
if [[ $# -ge 1 ]]; then
  [[ "$1" =~ /status/([0-9]+) ]] || { echo "katana refs: pega un enlace de X como https://x.com/usuario/status/123…"; exit 2; }
  id="${BASH_REMATCH[1]}"; out="refs/x_$id.mp4"
  fetch "$id" "$out" && echo "$KROOT/$out"; exit $?
fi
echo "Referencias de los presets:"
fetch 2110416209019871420 refs/r1_truejigga_claude_vs_katana.mp4
fetch 2110457314583159230 refs/r2_higgsfield_app_launch.mp4
fetch 2108324694256664795 refs/r3_zainoldinn_katana_launch.mp4
echo "Análisis (cortes, beats, OCR, energía, páginas cuadro a cuadro):"
an() {  # an <video> <label> <outdir> [region args]
  local v=$1 lab=$2 out=$3; shift 3
  if [[ -f "$out/analysis.json" ]]; then echo "  ✓ $lab (ya analizado)"; return 0; fi
  local log="$LOGD/refs_$(basename "$out").log"
  if "$PY" tools/analyze_ref.py "$v" "$@" --out "$out" >"$log" 2>&1; then echo "  ✓ $lab"; else echo "  ✗ $lab: el análisis falló → open \"$log\""; return 1; fi
}
an refs/r2_higgsfield_app_launch.mp4 "r2 (app-launch-dusk)" refs/analysis/r2_katana --region top
an refs/r1_truejigga_claude_vs_katana.mp4 "r1 (product-launch-peel)" refs/analysis/r1_katana --region top
an refs/r3_zainoldinn_katana_launch.mp4 "r3 (styles-explainer)" refs/analysis/r3
mkdir -p refs/sheets
bad=0
for f in r1_truejigga_claude_vs_katana r2_higgsfield_app_launch r3_zainoldinn_katana_launch; do
  [[ -f refs/sheets/${f}_2fps.jpg ]] || ./katana sheet refs/$f.mp4 --fps 2 --w 320 --cols 10 --out refs/sheets/${f}_2fps.jpg >/dev/null 2>&1 || { echo "  ✗ hoja de contacto de $f"; bad=1; }
done
[[ $bad == 0 ]] && echo "  ✓ hojas de contacto en refs/sheets/"
