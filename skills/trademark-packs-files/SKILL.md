---
name: trademark-packs-files
description: The files every Lossless project ships as its trademark pack, what each is for, how to name, build and link them, and how to check them. The pack is a favicon, an appIcon, a wordmark and a trademark lockup as SVGs, plus a multi-size favicon.ico and a 180px apple-touch-icon.png, because Vercel's project avatar, crawlers, RSS readers and older tools only ask for /favicon.ico, and iOS ignores an SVG home-screen icon. Use when a site, splash or app needs a favicon, logo, wordmark, app icon or brand marks; when a tab, a Vercel project, a link preview or a tracking-site row shows Astro's logo, a globe or a stand-in; when /favicon.ico returns 404; when a mark contains live <text>; when scaffolding a new site or splash; or when the user says "trademark pack", "brand pack", "appIcon", "wordmark", "favicon.ico" or "apple-touch-icon". Ships scripts that outline font text into SVG paths and render the .ico and apple-touch PNG from the SVGs.
---

# Trademark pack files

A **trademark pack** is the set of mark files one brand ships, so every
surface that shows the brand (a browser tab, a home screen, a Vercel project
list, a row on a tracking site, a header, a slide) gets the right file
instead of a default.

## The files

| File | What it is | Where it shows |
|---|---|---|
| `favicon.svg` | The mark reduced to read at 16px: fewer parts, thicker strokes | Browser tabs; a pop of brand on a row in a list |
| `favicon.ico` | 16, 32, 48 and 256px renders of `favicon.svg` in one file | Anything that only asks for `/favicon.ico`: Vercel's project avatar, crawlers, RSS readers, older browsers and tools |
| `apple-touch-icon.png` | The appIcon at 180×180, opaque | iOS home screen and share sheets, which ignore SVG here |
| `appIcon__<Brand>.svg` | The full mark on an opaque square tile | App Store and Google Play squares; the source for the PNG |
| `wordmark__<Brand>[--Dark-Mode\|--Light-Mode].svg` | The name, set in a chosen font and outlined to paths, with one distinctive tweak | Headers, footers, decks |
| `trademark__<Brand>[--Dark-Mode\|--Light-Mode].svg` | appIcon and wordmark locked up in one SVG | Anywhere the brand appears once, in full |

The `.ico` is not optional. Without it, `/favicon.ico` returns 404, and
those tools show a framework logo (Vercel shows Astro's) or nothing.

**Naming:** `<kind>__<Brand>[--Variant].svg`, with the brand in
Title-Kebab-Case: `appIcon__Lossless-Toolkit.svg`,
`wordmark__Lossless-Changelog--Dark-Mode.svg`. `favicon.svg`, `favicon.ico`
and `apple-touch-icon.png` keep their bare names, because tools request those
paths without being told.

**Where they live:** `public/` at the root of a site. For a repo with a
splash page, `splash/public/` (or a `brand/` folder inside it). The served
root must hold `favicon.ico` and `apple-touch-icon.png`.

**Modes:** a mark with one fixed palette that reads on both grounds needs one
file. Make `--Dark-Mode` and `--Light-Mode` variants only when the ink has to
change, usually for a wordmark in a single flat colour.

## Link them

In the `<head>` of every layout, in this order:

```html
<link rel="icon" href="/favicon.ico" sizes="32x32" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
```

The `.ico` comes first with `sizes="32x32"`, so browsers that can read SVG
still pick the SVG.

## Build them

1. **appIcon first.** Draw the mark on a 64×64 viewBox, on an opaque
   rounded tile (`rx` around 12 to 14) in the brand's surface colour. Keep
   artwork inside roughly 85% of the tile: app stores and iOS crop the
   corners.
2. **favicon from the appIcon,** simplified until it reads at 16px. Keep the
   tile if the mark falls apart on a light tab bar without it.
3. **wordmark:** pick a font from the brand's own stack (the header's face,
   weight and letter-spacing are usually the right answer), then outline it
   with `scripts/outline-text.py`. Add one deliberate tweak, such as an
   accent-coloured character or a rule, so it is a mark and not just a
   typed name. Crop the viewBox to the ink.
4. **trademark:** place the appIcon and the wordmark side by side in one SVG,
   with the wordmark about half to nine-tenths of the icon's height and a
   gap of about a quarter of the icon. Prefix every `id` with the brand
   slug, so gradients from the two parts can't collide.
5. **favicon.ico and apple-touch-icon.png:**
   `scripts/make-icons.sh favicon.svg appIcon__<Brand>.svg public/ "#tile"`.
   The tile colour fills the PNG's corners, because iOS draws its own.

## Rules that prevent the usual failures

- **No live `<text>` in a mark.** An SVG loaded through `<img>` or as a
  favicon can't load web fonts, so the text falls back to a system font.
  Outline it.
- **Check it in Chrome, not ImageMagick.** ImageMagick renders masks and some
  gradients as black squares. `make-icons.sh` renders through headless
  Chrome for that reason.
- **Gradients on thin or zero-width shapes need `gradientUnits="userSpaceOnUse"`
  with explicit coordinates.** An `objectBoundingBox` gradient on a vertical
  line has zero width and paints nothing.
- **Prefer an even-odd hole to a `<mask>` for cut-outs.** Some renderers drop
  masks.
- **Replace scaffold favicons.** A fresh Astro project ships Astro's logo as
  `public/favicon.svg` (and sometimes `favicon.ico`). If the layout links
  another file, the stock one is still served at `/favicon.svg`. Overwrite it
  with the real mark.
- **Use the canonical version.** For Lossless-branded projects the v3 marks
  are canonical: `site/public/favicon__Lossless--v3.svg`, its `favicon.ico`
  and `apple-touch-icon.png`, and `site/public/visuals/wordmark__The-Lossless-Group.svg`.
  Older `appIcon__Lossless_Record*` copies persist in other repos; don't copy
  them into new work.
- **Client marks belong to the client.** Vectorize or export what they gave
  you; don't invent a mark for them, and never put one client's mark on
  another project's row.
- **Under 64KB per SVG.** The tracking sites' sync scripts reject larger
  files, and a favicon that big is carrying an embedded raster.

## A sub-brand from a house wordmark

To make a product wordmark from a parent's, re-set only the word that
changes, in the parent's own face. Identify the face by overlaying candidate
fonts on the parent's outlines, then the weight by the ratio of stem width
to cap height. Measure the parent's letter-spacing from its existing word.
Outline the new word with `outline-text.py` at that face, size and tracking,
on the same baseline and right edge, inside the same gradient or mask.
Example: `wordmark__The-Lossless-Toolkit.svg` re-sets "Group." from The
Lossless Group wordmark as "Toolkit." in JetBrains Mono ExtraBold.

## The tracking sites

changelog.lossless.group and the context-v-corpus splash show each
project's mark on its row. Both read
`lossless-changelog/src/config/streams.yaml`:

- `icon: public/favicon.svg` points a stream at a file in its repo.
- `icon_from: <slug>` borrows another stream's mark, for a component that
  shares its parent's brand.

After adding or changing a favicon, run `pnpm sync:icons` in
lossless-changelog and `python3 scripts/sync-icons.py` in context-v-corpus,
then commit both.

## Check it

```bash
for p in /favicon.ico /favicon.svg /apple-touch-icon.png; do
  curl -s -o /dev/null -w "$p %{http_code} %{content_type}\n" https://<host>$p
done
curl -s https://<host>/ | grep -o '<link rel="\(icon\|apple-touch-icon\)"[^>]*>'
```

Expect `200` with `image/vnd.microsoft.icon`, `image/svg+xml` and `image/png`,
and all three links in the head. Then look at `favicon.svg` rendered at 16px
on both a dark and a light ground. If it reads as a smudge, simplify it.

## Scripts

- `scripts/outline-text.py FONT.ttf "Text" SIZE [--tracking EM] [--fill COLOR]`
  prints an SVG of the text as paths, its viewBox cropped to the ink. It
  shapes with HarfBuzz (`hb-shape`, from `brew install harfbuzz`) so kerning
  and ligatures match the browser, and draws glyphs with fontTools
  (`pip install fonttools`). Get static TTFs from the Google Fonts CSS API:
  request `https://fonts.googleapis.com/css2?family=<Family>:wght@<w>` with
  an old User-Agent such as `Mozilla/4.0`, and the CSS links `.ttf` files.
- `scripts/make-icons.sh FAVICON.svg APPICON.svg OUTDIR TILE_HEX` writes
  `OUTDIR/favicon.ico` and `OUTDIR/apple-touch-icon.png`. It needs Google
  Chrome (or Chromium) and Python with Pillow.
