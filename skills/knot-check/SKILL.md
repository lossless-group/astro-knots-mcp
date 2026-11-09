---
name: knot-check
description: Check an Astro site against the Astro Knots guardrails (no React or JSX patterns, LFM, Vitest, share images, canonical URLs, sitemap, robots.txt) and fix what fails. Use before committing, before deploying, after a big change, when a share preview looks wrong, or when someone asks "does this follow our patterns?"
---

# knot-check

Run it from the site's folder:

| Command | What it checks |
|---|---|
| `knot-check .` | Source: banned frameworks, JSX patterns in `.astro`, `workspace:` links, LFM, Vitest |
| `knot-check . --full` | All of that, then runs `vitest run`, `astro check` and the build, then checks `dist/` |
| `knot-check dist .` | The built pages: every content page has a body (not a title over nothing), one `og:image` each, its six tags, `twitter:` tags, absolute URLs, the image file matching its tags, canonical, sitemap, `robots.txt`, `llms.txt` |
| `knot-check share <url>` | Fetches a deployed page as iMessage, WhatsApp, X, LinkedIn, Facebook, Slack, Discord and a browser, and shows which card each one gets |
| `knot-check doctor` | Node, pnpm, and whether `IDEOGRAM_API_KEY` is set |

Prefix each with `pnpm dlx --package=github:lossless-group/astro-knots-mcp`
unless the plugin's copy is on the PATH. Add `--json` for machine-readable
output.

## Reading the results

- **✗ errors** fail the check. Each says where (file and line), how to fix it,
  why the rule exists, and which skill explains the pattern. Fix them all.
- **! warnings** are advice. The common one, `share-not-tall`, means the
  page's `og:image` is the wide banner; the tall one looks much better in
  iMessage and WhatsApp.

The plugin also runs the fast checks after every edit you make, and stops
you when an edit adds `className=`, `onClick={...}`, `style={{...}}`, a
`<>` fragment, a `.jsx`/`.tsx` component, React, or a `workspace:` link.
That's the same rule list, caught earlier.

The MCP tool `explain_check` returns any rule's full explanation by its id.
