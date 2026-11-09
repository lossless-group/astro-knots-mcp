#!/usr/bin/env bash
#
# ideogram-request.sh — canonical Ideogram v3 generate call for Lossless OG imagery.
#
# Reads every locked field from the target project's DESIGN.md `imagery:`
# block (color palette, negative prompt, style reference, seed, style type,
# rendering speed, magic_prompt flag), then varies only `prompt` and
# `aspect_ratio` per invocation.
#
# Usage:
#   ./ideogram-request.sh "<prompt>" <aspect_ratio> [<output_dir>]
#
# Example:
#   ./ideogram-request.sh "Isometric sprout growing from a stack of paper-cut tiles, lower third of the frame, top two-thirds open." 3x4 public/
#
# Requires:
#   - $IDEOGRAM_API_KEY in environment (from ~/.secrets)
#   - curl, jq
#   - Run from the target project root (where DESIGN.md and public/ live)
#
# Notes:
#   - Ideogram returns a temporary URL; this script downloads the bytes
#     immediately so the image survives URL expiry.
#   - Output is saved as a PNG (Ideogram's default). Convert to JPEG for
#     OG delivery per the open-graph-share-seo-geo skill:
#         ffmpeg -i out.png -q:v 2 out.jpg

set -euo pipefail

# ─── arg parsing ──────────────────────────────────────────────────────
if [[ $# -lt 2 ]]; then
  echo "Usage: $0 \"<prompt>\" <aspect_ratio> [<output_dir>]" >&2
  echo "Example: $0 \"<one-sentence subject + composition>\" 3x4 public/" >&2
  exit 2
fi

PROMPT="$1"
ASPECT_RATIO="$2"
OUTPUT_DIR="${3:-.}"

# ─── prerequisites ───────────────────────────────────────────────────
: "${IDEOGRAM_API_KEY:?IDEOGRAM_API_KEY not set. Source ~/.secrets first.}"

command -v curl >/dev/null || { echo "curl not found" >&2; exit 1; }
command -v jq   >/dev/null || { echo "jq not found"   >&2; exit 1; }

if [[ ! -f DESIGN.md ]]; then
  echo "DESIGN.md not found in cwd. Run from the project root." >&2
  exit 1
fi

# ─── extract locked values from DESIGN.md frontmatter ────────────────
# This is intentionally pragmatic — a real implementation would parse the
# YAML properly. For most projects the values below are fine to hard-code
# at the script level *as long as* they match what DESIGN.md says. If they
# diverge, the DESIGN.md wins; update this script.
#
# Reading the YAML correctly:
#   python3 -c "import yaml,re,sys; m=re.match(r'^---\n(.*?)\n---', open('DESIGN.md').read(), re.DOTALL); d=yaml.safe_load(m.group(1)); print(d['imagery']['defaults']['seed'])"
#
# Below: read the project's imagery: block via python3 + PyYAML when
# available, otherwise fall back to the canonical defaults.

read_imagery_field() {
  local key="$1"
  python3 - <<PYEOF 2>/dev/null || true
import re, sys, yaml
text = open('DESIGN.md').read()
m = re.match(r'^---\n(.*?)\n---', text, re.DOTALL)
if not m: sys.exit(1)
d = yaml.safe_load(m.group(1))
# walk dotted key path
node = d
for part in "$key".split('.'):
    if not isinstance(node, dict) or part not in node: sys.exit(1)
    node = node[part]
print(node if not isinstance(node, (list, dict)) else yaml.safe_dump(node).strip())
PYEOF
}

STYLE_REFERENCE_PATH="$(read_imagery_field imagery.style_reference.path)"
SEED="$(read_imagery_field imagery.defaults.seed)"
STYLE_TYPE="$(read_imagery_field imagery.defaults.style_type)"
MAGIC_PROMPT="$(read_imagery_field imagery.defaults.magic_prompt)"
RENDERING_SPEED="$(read_imagery_field imagery.defaults.rendering_speed)"
NEGATIVE_PROMPT="$(read_imagery_field imagery.negative_prompt)"

# Fallbacks to canonical Lossless defaults if DESIGN.md couldn't be read.
: "${STYLE_TYPE:=AUTO}"   # REQUIRED to be AUTO (or GENERAL) when style_reference_images is uploaded
: "${MAGIC_PROMPT:=OFF}"
: "${RENDERING_SPEED:=QUALITY}"
: "${SEED:=1138}"
: "${NEGATIVE_PROMPT:=text, typography, lettering, logos, watermarks, central subject filling frame, photorealistic human faces, saturated, rainbow, vibrant, oversized subject, subject in top half}"

if [[ -z "${STYLE_REFERENCE_PATH:-}" ]]; then
  echo "imagery.style_reference.path not set in DESIGN.md — cannot include a style reference." >&2
  echo "Continuing without one. Add the field to lock visual consistency." >&2
  STYLE_REF_FLAG=()
else
  if [[ ! -f "$STYLE_REFERENCE_PATH" ]]; then
    echo "Style reference declared at '$STYLE_REFERENCE_PATH' but file not found." >&2
    exit 1
  fi
  STYLE_REF_FLAG=( -F "style_reference_images=@${STYLE_REFERENCE_PATH}" )
fi

# Color palette is structurally complex; the canonical Lossless default is
# embedded inline here. A project with a different palette in its
# DESIGN.md should template that palette into this script or pre-flatten
# it into a JSON string passed via -F color_palette=...
#
# Default = Content Farm palette. Swap before using on other projects.
COLOR_PALETTE_JSON='{"members":[{"color_hex":"#0a0a0f","color_weight":0.45},{"color_hex":"#04e5e5","color_weight":0.20},{"color_hex":"#6fffd6","color_weight":0.15},{"color_hex":"#bf23f7","color_weight":0.10},{"color_hex":"#c8b893","color_weight":0.10}]}'

# ─── construct + send ────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_BASE="${OUTPUT_DIR%/}/ideogram-${ASPECT_RATIO//x/by}-${TIMESTAMP}"

echo "→ POST https://api.ideogram.ai/v1/ideogram-v3/generate"
echo "    prompt:          $PROMPT"
echo "    aspect_ratio:    $ASPECT_RATIO"
echo "    style_type:      $STYLE_TYPE"
echo "    magic_prompt:    $MAGIC_PROMPT"
echo "    rendering_speed: $RENDERING_SPEED"
echo "    seed:            $SEED"
echo "    style_ref:       ${STYLE_REFERENCE_PATH:-<none>}"

RESPONSE="$(curl -sS \
  -H "Api-Key: $IDEOGRAM_API_KEY" \
  -F "prompt=$PROMPT" \
  -F "aspect_ratio=$ASPECT_RATIO" \
  -F "style_type=$STYLE_TYPE" \
  -F "magic_prompt=$MAGIC_PROMPT" \
  -F "rendering_speed=$RENDERING_SPEED" \
  -F "seed=$SEED" \
  -F "negative_prompt=$NEGATIVE_PROMPT" \
  -F "color_palette=$COLOR_PALETTE_JSON" \
  "${STYLE_REF_FLAG[@]}" \
  https://api.ideogram.ai/v1/ideogram-v3/generate)"

# Surface API errors clearly.
if echo "$RESPONSE" | jq -e '.error // .detail // .message' >/dev/null 2>&1; then
  echo "Ideogram API returned an error:" >&2
  echo "$RESPONSE" | jq . >&2
  exit 1
fi

NUM_IMAGES="$(echo "$RESPONSE" | jq '.data | length')"
if [[ "$NUM_IMAGES" -lt 1 ]]; then
  echo "Unexpected response (no images):" >&2
  echo "$RESPONSE" | jq . >&2
  exit 1
fi

# Download each image immediately — Ideogram URLs expire.
for i in $(seq 0 $((NUM_IMAGES - 1))); do
  URL="$(echo "$RESPONSE" | jq -r ".data[$i].url")"
  SUFFIX=""
  [[ "$NUM_IMAGES" -gt 1 ]] && SUFFIX="-$i"
  OUT="${OUT_BASE}${SUFFIX}.png"
  echo "→ saving $OUT"
  curl -sS -L "$URL" -o "$OUT"
done

# Hand the response back too in case the caller wants the seed / prompt /
# resolution that came back (Ideogram echoes a normalized prompt and may
# adjust the resolution).
echo "$RESPONSE" | jq . > "${OUT_BASE}.json"
echo "→ metadata saved to ${OUT_BASE}.json"
echo "Done. Convert to JPEG for OG delivery: ffmpeg -i ${OUT_BASE}.png -q:v 2 ogimage__{Project}--{Format}.jpg"
