#!/usr/bin/env python3
"""outline-text.py FONT.ttf "Text" SIZE [--tracking EM] [--fill COLOR]

Print an SVG of the text drawn as paths, with its viewBox cropped to the ink.
HarfBuzz (`hb-shape`) does the shaping, so kerning and ligatures match a
browser; fontTools draws the glyphs. A mark built from this has no live
<text>, so it renders the same in an <img>, a favicon or a slide.

--tracking is extra space after each glyph in em, like CSS letter-spacing.
"""
import argparse
import json
import subprocess
import sys

from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont


def shape(font_path, text):
    out = subprocess.run(["hb-shape", "--output-format=json", "--no-glyph-names", font_path, text],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def outline(font_path, text, size, tracking_em=0.0):
    """Return (path d, (x0, y0, x1, y1) ink box) with the baseline at y=0."""
    font = TTFont(font_path)
    glyphs, order = font.getGlyphSet(), font.getGlyphOrder()
    scale = size / font["head"].unitsPerEm
    tracking = tracking_em * size
    pen = SVGPathPen(glyphs, ntos=lambda v: ("%.2f" % v).rstrip("0").rstrip(".") or "0")
    box = [float("inf"), float("inf"), float("-inf"), float("-inf")]
    x = 0.0
    for g in shape(font_path, text):
        glyph = glyphs[order[g["g"]]]
        ox = x + g.get("dx", 0) * scale
        oy = -g.get("dy", 0) * scale
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, ox, oy)))
        bp = BoundsPen(glyphs)
        glyph.draw(bp)
        if bp.bounds:
            gx0, gy0, gx1, gy1 = bp.bounds
            box = [min(box[0], ox + gx0 * scale), min(box[1], oy - gy1 * scale),
                   max(box[2], ox + gx1 * scale), max(box[3], oy - gy0 * scale)]
        x += g["ax"] * scale + tracking
    return pen.getCommands(), box


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[1])
    ap.add_argument("font")
    ap.add_argument("text")
    ap.add_argument("size", type=float)
    ap.add_argument("--tracking", type=float, default=0.0, help="em, like CSS letter-spacing")
    ap.add_argument("--fill", default="currentColor")
    a = ap.parse_args()
    d, (x0, y0, x1, y1) = outline(a.font, a.text, a.size, a.tracking)
    if x0 == float("inf"):
        sys.exit("outline-text: no ink (empty text, or glyphs missing from the font)")
    pad = a.size * 0.04
    w, h = x1 - x0 + 2 * pad, y1 - y0 + 2 * pad
    print(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0 - pad:.2f} {y0 - pad:.2f} {w:.2f} {h:.2f}">\n'
          f'  <title>{a.text}</title>\n'
          f'  <path fill="{a.fill}" d="{d}"/>\n'
          f'</svg>')


if __name__ == "__main__":
    main()
