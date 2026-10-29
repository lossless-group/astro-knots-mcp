---
title: "Exploring an MCP so Anyone can be an Astro Knot"
lede: "Our sites follow patterns honed across twenty builds. Could an MCP hand those patterns, and their guardrails, to anyone vibe coding a site?"
publish: false
date_created: 2026-10-29
date_modified: 2026-10-29
date_authored_initial_draft: 2026-10-29
date_authored_current_draft: 2026-10-29
date_authored_final_draft:
authors:
  - Michael P. Staton
augmented_with:
  - Claude Code on Claude Opus 5.5 (1M context)
at_semantic_version: 0.0.0.1
tags:
  - Exploration
  - Astro-Knots
  - MCP
  - Vibe-Coding
  - Guardrails
status: Open
site_uuid: 1560bc57-5488-42d5-b2f8-e30c132663c7
hex_code: owcbcd
summary: >-
  Opening exploration for astro-knots-mcp. Frames who "anyone" is (a
  developer with a coding agent, or a non-developer in a chat app), maps
  four shapes the MCP could take (a knowledge server, a local scaffold-and-
  check server, a hosted studio, or no MCP at all), and leans toward a
  layered build whose core is a deterministic "knot check" of our
  guardrails. Read before deciding scope or writing the spec.
---

# Exploring an MCP so Anyone can be an Astro Knot

## The question

Can we build an MCP server that lets **anyone** vibe code an Astro Knots
site, and have it come out consistent with our honed patterns, practices
and guardrails?

"Consistent" is the hard word. A model can be told our rules; it will
follow most of them most of the time. The question is how much of the
consistency the MCP can **guarantee**, how much it can only **ask for**, and
what shape of server gets the most guarantee for the least machinery.

## Why we don't already know

- **"Anyone" splits into two very different people.** A developer in
  Claude Code, Cursor or Codex has a filesystem, a terminal and git. A
  non-developer in Claude or ChatGPT on the web has a chat box and nothing
  else. One MCP shape can't serve both well.
- **Our patterns live in prose, not code.** The `astro-knots` skill, its
  playbooks, ~26 blueprints, ~15 reminders, `theme-system`,
  `maintain-design-md`, `lossless-flavored-markdown`,
  `maintain-splash-pages`, `generate-consistent-og-images`. Agents read
  them well in our monorepo, where every skill is loaded. Nobody outside
  the monorepo has them.
- **Some guardrails are mechanical, some are taste.** "No React, no JSX"
  can be checked by a script. "Diverge in shape, not just in hue" can't.
  We haven't sorted ours into the two piles.
- **We've learned this lesson once already.** event-hog's README separates
  *what the server guarantees* from *what it only asks the model to do*,
  and the asked-for half is where it slipped (0 of 21 contacts reached the
  CRM because a step depended on the model remembering it).

## What "honed patterns" means, concretely

A first inventory of what a site made through the MCP should inherit. The
right-hand column is the important one.

| Pattern | Source | Checkable by a script? |
|---|---|---|
| Astro, with Svelte for interactivity; no React, JSX, Angular | `astro-knots` skill, `Preferred-Stack` | Yes: dependencies and file extensions |
| Two-tier tokens, three modes (light / dark / vibrant), pre-paint mode script | `theme-system`, `Maintain-Themes-Mode-Across-CSS-Tailwind` | Mostly: token names exist, `data-mode` set, no FOUC script missing |
| A `DESIGN.md` in Google Stitch's spec | `maintain-design-md` | Yes: file exists, frontmatter groups present |
| Lenient frontmatter schemas, never throw | `YAML-Frontmatter-Parsing-Must-Be-Lenient`, `Rule-to-Assure-Collection-Schema-is-Flexible` | Partly: schema uses preprocessors; build doesn't fail on sample bad frontmatter |
| Extended markdown through LFM | `lossless-flavored-markdown` | Yes: package present, pipeline wired |
| Text wraps, no horizontal bleed at any width | `Guarantee-Text-Wrapping-and-No-Horizontal-Bleed-at-Any-Width` | Yes, with a headless browser at 3–4 widths |
| OG images, sitemap, robots, llms.txt | `open-graph-share-seo-geo`, `Maintain-an-Elegant-Open-Graph-System` | Yes: tags present, image is JPEG, absolute URLs |
| `changelog/` and `context-v/` at the root | `changelog-conventions`, `context-vigilance` | Yes |
| Search by default (Pagefind) | `Include-Full-Search-as-a-Default` | Yes |
| `astro check` passes before deploy | `Continuous-Integration-for-Astro-Knots-Sites` | Yes |
| Train-Case tags, UTC dates at rest | reminders | Yes |
| Each site deploys on its own, no runtime dependency on the monorepo | `Astro-Knots-is-not-a-True-Monorepo` | Yes: no workspace imports |
| Design that diverges in shape, a voice, a posture | `maintain-splash-pages` (visual identity) | **No.** Taste. Can only be prompted for and reviewed |

The first finding: **most of our guardrails are mechanical.** That makes a
deterministic checker the most valuable single piece of any option below.

## Options

### Option A: a knowledge server (read-only)

A remote MCP that serves our patterns as tools: `list_patterns`,
`get_pattern`, `get_skill`, `get_blueprint`, `get_tokens_template`, plus
prompts like "start a new site". The agent writes all the code. Pairs with
Astro's official docs MCP (`https://mcp.docs.astro.build/mcp`) for the
framework itself.

**Pros:**
- Small. A Worker reading markdown, the same shape as event-hog's
  `list_skills` / `get_skill`.
- Works in every client, coding agent or chat.
- Patterns stay in one place: the server reads them from
  `lossless-agent-skills` and `astro-knots/context-v`, so there's nothing
  to keep in sync by hand.

**Cons:**
- Everything is *asked*, nothing *guaranteed*.
- Useless to a non-developer, who has nowhere for the code to go.

### Option B: a local scaffold-and-check server (for coding agents)

A package people run locally (`npx astro-knots-mcp`, stdio transport) that
works on the folder they're in. Tools that **make** things from our
templates (`new_site`, `add_page`, `add_collection`, `add_component`,
`set_brand_tokens`, `add_splash`) and tools that **verify** (`knot_check`:
runs `astro check`, the build, and the guardrail checks from the table
above, then returns what failed and which pattern explains it).

**Pros:**
- Real guarantees: a site that passes `knot_check` follows every
  mechanical rule, whoever or whatever wrote it.
- Templates carry the hard parts (token wiring, mode script, LFM, OG,
  Pagefind), so the model only writes content and components.
- Uses the developer's own git, editor and deploy.

**Cons:**
- Developers only.
- Templates drift from our live sites unless they're generated from them,
  or tested against them.
- A local package is versioned and installed: updates don't reach people
  until they upgrade.

### Option C: a hosted studio (for anyone, event-hog shaped)

A remote MCP on Cloudflare that owns the whole loop. Each site is a git
repo (Cloudflare Artifacts, or a GitHub repo made for the person), the
server applies changes, builds, runs `knot_check`, and returns a **preview
URL**. `publish` deploys to Cloudflare (Workers static assets or Pages)
with their domain. The person never sees a file.

Two ways to constrain what the model writes:
- **Constrained tools:** `set_brand`, `add_section(kind, content)`,
  `write_page(markdown)`. The model can only pick from our component
  library and write markdown. Very consistent; less freedom.
- **Free writes, gated publish:** the model may write any file, but
  `publish` refuses unless `knot_check` passes. More freedom, same floor.

**Pros:**
- The only option that truly serves "anyone".
- Guarantees enforced by construction: what fails the check never ships.
- Reuses what we already run: event-hog's Artifacts-per-workspace,
  per-person keys and commit attribution, plus Cloudflare deploys.

**Cons:**
- By far the most to build: builds on the server (Astro in a Worker is
  not trivial; likely a build queue on a container or CI), previews,
  domains, accounts.
- We'd be hosting other people's sites: the same "whose account, whose
  data" questions event-hog is working through, plus abuse.
- The taste half of our patterns still isn't enforceable.

### Option D: no MCP, a template plus skills

A starter repo generated from a well-kept Astro Knots site, plus the
skills pack (`lossless-agent-skills` is already public), plus Astro's
docs MCP. "Clone this, load these skills, start your agent."

**Pros:**
- Almost free; most of it exists.
- Honest baseline to measure the others against.

**Cons:**
- Skills only load in harnesses that support them, and only if installed.
- Nothing is checked. Same weakness as Option A, with more setup.

## Findings

- **The checker is the asset.** It's what turns "asked" into
  "guaranteed", it's needed by B and C, and it's useful on its own in CI
  for our own twenty sites. Building it first pays off whichever shape
  wins.
- **Serving skills over MCP is proven.** event-hog serves a kit of
  skills through `list_skills` / `get_skill` and bundles them at build
  time. The single-source-of-truth rule (edit skills only in
  `lossless-agent-skills`) means this server should *read* them, not copy
  them, or it inherits the drift problem the anchor's AGENTS.md warns
  about.
- **Astro already covers the framework.** The official docs MCP answers
  "how does Astro do X". Ours only needs to answer "how do *we* do X" and
  "did you do it our way".
- **Prior idea, not yet acted on:** `lost-in-public` has
  "Using MCP Servers to Speed-up Astro Development" (2025-08, To-Implement),
  which lists MCP ideas for our own velocity (content, citations,
  toolkit). This exploration is the outward-facing version of it.
- **Templates should come from real sites.** Several skills already know
  how to stand up a site (`setup-new-dddecks-workspace`, the
  new-site-setup playbook, `generate-site-design-variants`). A template
  extracted from a live site, and rebuilt when that site changes, stays
  honest; a hand-written one rots.

## Tentative direction

Layered, so each layer is useful before the next exists:

1. **`knot_check`** as a standalone package and a GitHub Action: the
   mechanical guardrails from the table, each failure linked to the
   pattern that explains it. Run it on our own sites first; where it
   fails on a site we like, the rule or the site is wrong.
2. **Option A's knowledge tools**, reading skills and blueprints live
   from their repos.
3. **Option B** for developers: templates plus `knot_check` as tools, so
   a coding agent builds, checks and fixes in a loop.
4. **Option C** later, if and when non-developers are the real audience,
   on the same checker, starting with free writes and a gated publish.

Still open; this is a lean, not a decision.

## Questions to answer before a spec

1. **Who is the first "anyone"?** A developer friend in Claude Code, a
   client's marketing lead in Claude, or a stranger on the internet? It
   decides between B and C.
2. **How rigid?** Must a site pass every check to count as an Astro Knot,
   or are there core rules and optional ones?
3. **Which site is the template?** One canonical starter, or several
   (content site, splash, deck, portfolio)?
4. **Where do their sites live and deploy?** Their GitHub and their
   Cloudflare, or ours? If ours, the event-hog data-policy questions come
   with it.
5. **How do we review taste?** A design-review prompt with screenshots,
   human review, or simply out of scope?
6. **What does success look like?** A proposal: a stranger with a coding
   agent goes from nothing to a deployed site that passes `knot_check` in
   under an hour, without reading our docs.

## Outcome

(Open. Fill in when this ends: a link to the spec it produced, or "decided
not to pursue, and why".)

## Related

- [[Using-MCP-Servers-to-Speed-up-Astro-Development]] (lost-in-public)
- [[Astro-Knots-is-not-a-True-Monorepo]]
- [[Continuous-Integration-for-Astro-Knots-Sites]]
- [[Guarantee-Text-Wrapping-and-No-Horizontal-Bleed-at-Any-Width]]
- [[Maintain-Themes-Mode-Across-CSS-Tailwind]]
- event-hog-mcp README, "What the server guarantees, and what it only asks Claude to do"
- Astro Docs MCP: <https://mcp.docs.astro.build/mcp>
