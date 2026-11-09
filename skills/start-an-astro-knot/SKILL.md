---
name: start-an-astro-knot
description: Set someone up to build an Astro Knots website with their coding agent, from an empty folder to a deployed site that passes knot-check. Use when someone says "get started", "set me up", "start a new site", "make me a website", or connects Astro Knots for the first time. Covers the machine, the plugin, image generation, the site's stack, share images and SEO, and the first deploy.
---

# Start an Astro Knot

The person you're helping may not be a developer. Do the work yourself, explain
in one plain sentence what each step is for, and ask only for what you can't
decide or do for them. Keep moving.

## 0. Find out what they're making

Ask, in one message:
1. What's the site for, and who is it for?
2. Is there a name, and a domain they already own?
3. A brand, a site they like the look of, or a feeling it should have?

If they're improving an existing Astro site, skip to step 4 and run
`knot-check` first to see where it stands.

## 1. The machine

Check, and fix what's missing (on a Mac, Homebrew installs anything below):

- **Node 20 or newer** (`node -v`; 22 is best) and **pnpm** (`pnpm -v`;
  `corepack enable pnpm`). Always pnpm, never npm or yarn.
- **git**, and **gh** logged in (`gh auth status`) if the site will live on
  GitHub.
- Optional: **Nix**. If it's installed, run commands through
  `nix develop --command <cmd>` so every tool is pinned to the project.

## 2. The plugin (the guardrails)

The plugin checks every edit you make for React and JSX habits, and loads the
Astro Knots skills. Install it once:

- **Claude Code:** `claude plugin marketplace add lossless-group/astro-knots-mcp`
  then `claude plugin install astro-knots@astro-knots-mcp`. Restart the session.
- **Codex:** `codex plugin marketplace add lossless-group/astro-knots-mcp`, then
  `/plugins` to install Astro Knots, then **`/hooks` to review and trust its
  hook**. Codex skips plugin hooks until they're trusted, and again after each
  plugin update. Plugins work in the Codex CLI and the ChatGPT desktop app,
  not the IDE extension.

## 3. Images (recommended)

Astro Knots sites use **Ideogram** for images the agent makes: share banners,
heroes, section art, all matching the site's `DESIGN.md`. Set it up now so
every later session can keep generating:

1. They make an account at ideogram.ai and **set a spending cap**: images cost
   money. For a young collaborator, an adult owns the key and the cap.
2. They create an API key. You add `export IDEOGRAM_API_KEY=...` to their
   shell profile (`~/.zshrc` on a Mac). **Never** put it in the repo, `.env`
   or any file that's committed.
3. Add the Ideogram MCP server to their agent with that variable, then restart
   the agent.

They can skip this and come back later; say what it turns on.

## 4. The site

Build it **test first**: for every loader, schema and component, write a
failing Vitest test, then the code, and finish when it passes.

```bash
pnpm create astro@latest <folder> -- --template minimal --yes
cd <folder>
pnpm astro add svelte sitemap --yes
echo "@jsr:registry=https://npm.jsr.io" >> .npmrc
pnpm add @lossless-group/lfm@npm:@jsr/lossless-group__lfm@^0.7.0
pnpm add -D vitest
```

Then, loading the matching skill before each part:

| Part | Skill |
|---|---|
| Stack rules: Astro pages, Svelte only for interactivity, no React or JSX | `astro-knots` |
| `vitest.config.ts` with `getViteConfig()` from `astro/config`, tests beside the code | `astro-knots` |
| Markdown content rendered through LFM (`parseMarkdown` and `AstroMarkdown`), code colored by `@lossless-group/lfm/highlight`, components copied from `packages/lfm-astro/components/` | `lossless-flavored-markdown` (its "Rendering: the hard rules") |
| `DESIGN.md` from what they told you in step 0 | `maintain-design-md` |
| Two-tier tokens and three modes (light, dark, vibrant), pre-paint mode script | `theme-system` |
| One `MetaTags` component, an SEO registry, sitemap, `robots.txt`, `llms.txt` | `open-graph-share-seo-geo` |
| Share banners: tall (1200x1600) **and** wide (1200x630), JPEG | `generate-consistent-og-images` |

**Content renders through LFM, always.** Never hand a markdown body to
Astro's `render()` alone: a custom loader stores no HTML, so the page builds
and shows a title over nothing. Parse with `parseMarkdown`, render with
`AstroMarkdown`, color code with `highlightCode`. Then open a built page and
confirm its body has text; `knot-check dist` fails one that doesn't.

**The design system: spike, then refactor.** For anything creative (a new
page, a new feature, a redesign), build it freely first, without worrying
about the component library or the theme, and mark its files `@spike <name>`.
Once they approve it, refactor it back into components and back onto the
theme's tokens, and catalog the components on `/design-system` (with
`/brand-kit` for the theme). Tell them that's the plan, so the second half
isn't forgotten. Skills: `spike-then-refactor-into-components`,
`maintain-design-system-page`. In Claude Code, hand the refactor to the
`component-refactorer` agent.

**Share images, tall first.** Each page has exactly one `og:image`: the tall
banner, with all six image tags. The wide banner goes only in
`twitter:image`. Never emit two `og:image` tags: iMessage mixes them.

Recommended too: a `context-v/` folder of living docs and a `changelog/`
(the Context Vigilance plugin: `/plugin install cv@context-vigilance-kit`).
For large content collections, keep them out of the site repo and fetch them
at build time from the GitHub Content API or Cloudflare Artifacts.

## 5. Check it

```bash
pnpm dlx --package=github:lossless-group/astro-knots-mcp knot-check . --full
```

That runs the source checks, Vitest, `astro check` and the build, then checks
the built pages for share images, canonical URLs, sitemap and `robots.txt`.
Fix every error (each one says how) and run it again. Warnings are advice.

## 6. Deploy

Default: their own **Cloudflare** account, as a Worker serving the built site.

```bash
pnpm add -D wrangler
pnpm exec wrangler login
```

`wrangler.jsonc`: `"name"`, `"compatibility_date"`, and
`"assets": { "directory": "./dist" }`. Then `pnpm build && pnpm exec wrangler deploy`.
**Ask before deploying**: it publishes the site. Then check the share cards
the way each app will see them:

```bash
pnpm dlx --package=github:lossless-group/astro-knots-mcp knot-check share <url>
```

and send the link to themselves in iMessage or WhatsApp. Re-share with `?v=2`
after changing an image: apps cache previews per URL for days.

## When you're done

Tell them, in plain words: where the site lives, how to change it (ask you),
how to check it (`knot-check`), and what to do next. Commit with a clear
message and add a `changelog/` entry for what was built.
