#!/usr/bin/env bash
# make-icons.sh FAVICON.svg APPICON.svg OUTDIR TILE_HEX
#
# Writes OUTDIR/favicon.ico (16, 32, 48 and 256px renders of FAVICON.svg) and
# OUTDIR/apple-touch-icon.png (APPICON.svg at 180px, flattened onto TILE_HEX,
# because iOS ignores transparency and rounds the corners itself).
#
# Renders through headless Chrome, which draws masks and gradients correctly
# where ImageMagick does not. Needs Google Chrome or Chromium, and Python 3
# with Pillow.
set -euo pipefail

if [ $# -ne 4 ]; then
  echo "usage: $0 FAVICON.svg APPICON.svg OUTDIR TILE_HEX" >&2
  exit 2
fi
fav=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
app=$(cd "$(dirname "$2")" && pwd)/$(basename "$2")
out=$3
tile=$4

chrome=""
for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
         "/Applications/Chromium.app/Contents/MacOS/Chromium" \
         google-chrome google-chrome-stable chromium chromium-browser; do
  if [ -x "$c" ] || command -v "$c" >/dev/null 2>&1; then chrome=$c; break; fi
done
[ -n "$chrome" ] || { echo "make-icons: no Chrome or Chromium found" >&2; exit 1; }

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

render() { # svg size out.png
  printf '<html><body style="margin:0;background:transparent"><img src="file://%s" width="%s" height="%s" style="display:block"></body></html>' \
    "$1" "$2" "$2" > "$tmp/r.html"
  "$chrome" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files \
    --default-background-color=00000000 --force-device-scale-factor=1 \
    --window-size="$2,$2" --screenshot="$3" "file://$tmp/r.html" >/dev/null 2>&1
}

for n in 16 32 48 256; do render "$fav" "$n" "$tmp/f-$n.png"; done
render "$app" 180 "$tmp/a-180.png"

python3 - "$tmp" "$out" "$tile" <<'PY'
import sys
from PIL import Image
tmp, out, tile = sys.argv[1:4]
frames = [Image.open(f"{tmp}/f-{n}.png").convert("RGBA") for n in (16, 32, 48, 256)]
frames[3].save(f"{out}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (256, 256)],
               append_images=frames[:3])
icon = Image.open(f"{tmp}/a-180.png").convert("RGBA")
rgb = tuple(int(tile.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
ground = Image.new("RGBA", icon.size, rgb + (255,))
ground.alpha_composite(icon)
ground.convert("RGB").save(f"{out}/apple-touch-icon.png", optimize=True)
print(f"{out}/favicon.ico\n{out}/apple-touch-icon.png")
PY
