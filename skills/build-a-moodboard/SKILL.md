---
name: build-a-moodboard
description: How to help someone find the look of a new site or brand before anything is designed, by building a mood board of 2 to 4 reference "worlds" with real images, each linked to its source and credited. Use after a site's narrative is agreed and before the brand kit, theme or any UI; whenever someone says "mood board", "moodboard", "inspiration", "what should it look like", "I don't know what style I want", "show me some directions", or is new to design and needs help ideating; and when a brand kit is being started from nothing. Encodes the cluster shape (name, how it reads, what to steal, 10 to 16 pins), where to find usable images, how to check every image loads, the single-file HTML template with its JSON board data, and the hand-off from board to brand kit.
---

# Build a mood board

Most people can't say what they want a site to look like, but they can point at
things and say "that, not that". A mood board gives them things to point at. It
comes after the narrative (what the site says) and before the brand kit (what
the site looks like), and it's where a beginner does most of their deciding.

The output is one HTML file: a wall of reference images, grouped into 2 to 4
**worlds** (clusters), each headed in that world's own lettering, each pin
linking to where the image came from. The board's data is a JSON block at the
top of the file, so anyone can edit it and the page re-renders.

## 1. Start from the narrative

Read `context-v/narratives/` first (see `write-site-narrative`). A board built
from an agreed story finds worlds that fit what the site says. A board built
from nothing finds whatever is popular this year.

If there is no narrative yet, ask three questions before searching:

1. Who is it for, and how should they feel in the first five seconds?
2. Name two or three things they already love: a place, a shop, a hobby, an
   era, a film, a sport, a brand, a person.
3. What should it never look like?

## 2. Pick the worlds

A world is a real place or tradition with a visual language of its own, not an
adjective. "Custom motorcycle garages" is a world; "edgy" is not. Good boards
usually have **one world that sharpens and one that softens**, and a third that
says who the brand is (the reference board pairs a chop shop, a laughing monk,
and photographers who sign their work).

Propose the worlds in one short message before searching ("I'm thinking chop
shop, laughing Buddha, and photographers' signatures. Want to swap one?"). It
costs a sentence and saves a board.

For each world, write:

| Field | What it is |
|---|---|
| `name` | Two or three words, the world's own name for itself |
| `sub` | What it is, in a phrase |
| `read` | How it feels and what it does for this brand, one or two sentences |
| `steal` | 3 to 5 specific moves to borrow: a lettering style, a lockup, a palette, a texture. Specific enough to brief a designer |
| `heading` | A CSS `font` shorthand in that world's lettering, from Google Fonts |
| `color`, `tilt` | Optional: the heading's color, and a small rotation for hand-made worlds |

## 3. Find the images

Aim for 10 to 16 pins per world, mixing kinds (`photo`, `logo`, `type`,
`print`, `object`, `shop`, `graffiti`, whatever fits). Every pin needs a title,
a credit, the image URL and the page it came from.

Where to look, roughly in order of how usable the results are:

- **Unsplash** (photos): free to use. Image URLs take `?w=900&q=70&auto=format&fit=crop`.
- **Museum open-access collections** (prints, objects, paintings): the Art
  Institute of Chicago's IIIF images (`/full/843,/0/default.jpg`), the Met,
  Rijksmuseum, Smithsonian. Mostly public domain.
- **Wikimedia Commons** (anything historical or place-specific).
- **Dribbble and Behance** (logos, lettering, brand work): reference only. These
  are other designers' work; credit the designer and never lift it into the
  final brand. Dribbble URLs take `?resize=800x0`; the template falls back to
  `400x0` when the large one is refused.
- **Shops and makers' own sites**, for the real thing in the wild.

Search with whatever web tools the harness has (a search tool, then scrape the
page for its real image URL). Don't guess image URLs or build them from
patterns: a made-up URL is a broken tile.

**Check every image loads** before writing the board:

```bash
curl -sIL -o /dev/null -w '%{http_code} %{content_type}\n' "<img url>"
```

Keep pins that return `200` with an `image/*` type. Some hosts refuse hotlinks
from a browser even when curl succeeds; the template shows a "didn't load, open
source" tile for those, so the board still works.

## 4. Write the board

Copy `templates/moodboard.html` and fill in its JSON block: `kicker`, `title`,
`title_em`, `intro`, `fonts` (one Google Fonts URL carrying every heading font
plus Barlow and Barlow Condensed), `footer`, and the clusters. Don't touch the
CSS or the script; the board's look comes from the data.

Save it in the site's repo at `design/moodboard/index.html`. It's a working
document, not a page of the site, so it stays out of `src/pages/` and carries
`noindex`. When the person wants to share it, publish it somewhere private (a
claude.ai Artifact works) rather than deploying it with the site.

Keep the footer honest: reference only, everything belongs to its credited
maker, nothing on the board is cleared for the final brand.

## 5. Decide, then hand off

Ask the person to react, world by world: keep, drop, or "more like this one
pin". Iterate on the JSON. Then write down what was decided, in their words,
at the top of the narrative or in a short note beside the board:

- The worlds that stayed, and the one move from each the brand will use
- Colors pulled from the pins they liked (name them; they become the named
  tier of the theme's tokens, see `theme-system`)
- The lettering direction for the wordmark and headings

That note is the brief for the brand kit (`/brand-kit`, see
`maintain-design-system-page`) and the first draft of the site's `DESIGN.md`
(see `maintain-design-md`). The board itself never ships.

## Anti-patterns

- **Adjectives instead of worlds.** "Modern, clean, bold" finds stock photos.
- **One world.** With nothing to contrast, a board can't show a direction.
- **Unchecked image URLs.** Half-broken boards make beginners think the idea was bad.
- **Copying a pin into the brand.** Dribbble pins are someone's paid work.
- **Skipping the decision note.** A board nobody summarized is forgotten by the next session.
