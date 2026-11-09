---
site_uuid: 9a0c681c-fa36-4763-a31d-95d3425d65a8
hex_code: e39cci
title: "Astro Knots MCP and Plugins: First Release"
lede: "One repo, one set of guardrails, three front doors: a link anyone can add, a Claude Code plugin, and a Codex plugin."
summary: >-
  Scopes the first shippable astro-knots-mcp, narrowed from the parked
  exploration for three real first users (one on Claude Code on a Mac, two on
  Codex). Records which open questions it answers, what OpenAI's Codex docs
  changed about the design, and what is deliberately left out. Read before
  writing any code in this repo. Awaiting sign-off.
type: Specs
publish: false
date_created: 2026-11-09
date_modified: 2026-11-09
date_authored_initial_draft: 2026-11-09
date_authored_current_draft: 2026-11-09
date_authored_final_draft:
authors:
  - Michael P. Staton
augmented_with:
  - Claude Code on Claude Opus 5.5
at_semantic_version: 0.0.0.1
tags:
  - Spec
  - Astro-Knots
  - MCP
  - Claude-Code-Plugin
  - Codex-Plugin
status: In-Discussion
---

# Astro Knots MCP and Plugins: First Release

<!-- developing: appended during discussion, narrative pass comes after sign-off -->

## Summary

Someone with a coding agent should be able to start an Astro Knots site, and
have it come out following our patterns, without reading our docs. This is the
smallest version that does that for three real people: one on Claude Code on a
Mac, and two collaborators on Codex.

It narrows [[Exploring-an-MCP-so-Anyone-can-be-an-Astro-Knot]].

> **Spike built 2026-11-09**, before sign-off, to test the shape: see
> `changelog/2026-11-09_01.md`. Its calibration raised one open question
> below (fragments).

## Goals

- A public **link MCP**, added by URL, modeled on event-hog's Worker and
  copy-a-prompt landing page.
- A **Claude Code plugin** and a **Codex plugin** from the same repo, modeled
  on context-vigilance-kit's manifests and hooks.
- A **`knot-check`** core that every front door calls, so each guardrail lives
  once.
- One starter site that passes `knot-check` as shipped.
- **Share and SEO from the first commit.** The starter ships a `MetaTags`
  component, an SEO registry, a tall and a wide banner, sitemap, `robots.txt`
  and `llms.txt`, wired and passing. See *Share and SEO* below.
- **A section on `astro-knots/splash`**, not a splash of its own: what this
  is, the copy-a-prompt connect block, and the two plugin installs.
- **Setup that leaves the agent able to keep generating images.**
  `get_started` walks the person through an Ideogram API key, saved as
  `IDEOGRAM_API_KEY` in their environment, never in the repo, and adds the
  Ideogram MCP server to their agent. Optional: setup says what it costs and
  continues without it.
- **Recommendations for large content:** the GitHub Content API or Cloudflare
  Artifacts, served as guidance by `get_skill`. See *Recommended, not
  enforced* below.

## Non-goals (this release)

- Scaffold tools that write a failing test first (`add_component` and friends).
- Hosting anyone's site, or any server-side state (exploration Option C).
- Accounts, keys or OAuth. The server only serves public material.
- The recommended tier as checks, the GitHub Action, evals.
- A `splash/` in this repo. The MCP is presented on `astro-knots/splash`.
- Moving skills to resolve [[Astro-Knots-Skills-Live-in-Two-Places-and-Will-Diverge]].
- Public listing in the OpenAI plugin directory: plugins with lifecycle hooks
  aren't eligible, so ours install from the repo marketplace.

## Decisions so far

| Exploration question | Answer here | Status |
|---|---|---|
| 1. Who is first | One Claude Code user on a Mac, two Codex users | Decided 2026-11-09 |
| 3. Which starter | One, from `lossless-toolkit-site`, with Vitest wiring from `twf_site` | Default, // TBD confirm |
| 4. Where sites live | Each person's own GitHub and Cloudflare | Default, // TBD confirm |
| 6. Windows | Out of scope until a Codex user needs it | // TBD Codex users' OS |
| 8. What success is | See Done when | // TBD confirm |
| Nix | Ship the flake only once tested; optional this release | Proposed |
| 2. OG and SEO required? | Yes, from the first commit; one `og:image` per response, chosen per app, tall by default | Decided 2026-11-09 |
| Starter's host | Cloudflare Workers with static assets, so per-app share cards work | Proposed, follows from the above |
| Splash | A section on `astro-knots/splash`, no splash in this repo | Decided 2026-11-09 |
| Design system | Spike freely, then refactor back into components and the theme; `knot-check components` warns, `component-refactorer` agent does the refactor | Decided 2026-11-09 |

Changes from the exploration: Codex is a full plugin target rather than an
MCP-only client, and remote is the primary MCP rather than local stdio.

## Design

### One repo, three front doors

```
astro-knots-mcp/
├── plugin.json                    # portable manifest (Codex reads this first)
├── mcp.json                       # portable MCP config: type "streamable-http"
├── .claude-plugin/
│   ├── plugin.json                # Claude Code manifest, "skills": "./skills/"
│   └── marketplace.json           # /plugin marketplace add
├── .agents/plugins/marketplace.json  # codex plugin marketplace add
├── .mcp.json                      # Claude Code MCP config: type "http"
├── skills/                        # built from canonical sources, never edited here
├── hooks/hooks.json               # shared by both harnesses
├── hooks/knot-hook.mjs            # reads either payload, calls knot-check
├── packages/knot-check/           # the guardrails: library + CLI
├── worker/                        # the link MCP
├── templates/starter/
└── scripts/bundle-kit.mjs         # skills + starter into the Worker
```

### What differs between Claude Code and Codex

From OpenAI's [hooks](https://learn.chatgpt.com/docs/hooks) and
[plugin packaging](https://developers.openai.com/plugins/build/plugins) docs,
read 2026-11-09.

| Concern | Claude Code | Codex | Consequence |
|---|---|---|---|
| Edit hook matcher | `Write\|Edit\|MultiEdit` | `apply_patch`, also matches `Edit` or `Write` | One matcher works for both |
| Edit hook payload | `tool_input.file_path` | Patch text in `tool_input.command`, no `file_path` | Hook must parse both. CVK's hook would silently pass everything on Codex |
| Plugin root variable | `CLAUDE_PLUGIN_ROOT` | `PLUGIN_ROOT`, and sets `CLAUDE_PLUGIN_ROOT` too | Use `CLAUDE_PLUGIN_ROOT` |
| Blocking feedback | Exit 2, reason on stderr | Exit 2, reason on stderr | Same |
| Hook trust | Runs once the plugin is enabled | Skipped until reviewed in `/hooks`, and again after any plugin update | The setup prompt must walk Codex users through this |
| Slash commands | `/knot:check` | Not documented for plugins | Workflows live in skills so both get them |
| Where it runs | CLI | CLI and ChatGPT desktop app, **not the IDE extension** | Codex users can't use plugins from the IDE extension |

OpenAI says to treat tool hooks as "a useful guardrail, not a complete
enforcement boundary", so `knot-check` is also run explicitly before a deploy.

### `knot-check`, required tier only

Fails on: React or other banned framework dependencies; JSX patterns in
`.astro` files (`className=`, `htmlFor=`, camelCase handlers, `style={{`,
fragments); `.jsx` or `.tsx` components; `workspace:` dependencies; LFM missing
or unwired; Vitest missing or failing; `astro check` failing.

Also fails, checked on the built site (`dist/`): a page with no `og:image` or
more than one; missing image tags (the six `og:image` properties, plus
`twitter:card` and `twitter:image`); relative image or canonical URLs; an
image file whose real size or type doesn't match its tags, or that isn't JPEG
or PNG; no canonical URL; no sitemap or `robots.txt`. It warns on an
`og:image` that isn't the tall banner, and on images over 500 KB.

Every finding names the file and line, what the `.astro` way is, and the
pattern that explains it. Hooks run only the fast per-file checks, and must
fail open: a crash in the hook never blocks work.

Calibrate on our own sites before anyone else runs it.

### Share and SEO

Share previews in iMessage and WhatsApp come first, and both can use taller
proportions. Feeds like LinkedIn crop tall images. So the starter serves
**the card that fits the app it's shared in**:

- **Every response has exactly one `og:image`.** Two `og:image` tags produce
  a mixed preview on iPhone
  ([[iPhone-Share-Previews-Conflate-the-Tall-and-Wide-Banners]]).
- **The built page defaults to the tall banner** (3:4, 1200 × 1600), with the
  wide banner (1200 × 630) in `twitter:image` for X. That's what any host
  serves, and what unknown crawlers get.
- **On Cloudflare, an edge layer picks per app.** The starter deploys as a
  Worker with static assets. The Worker runs first, reads the crawler's user
  agent, and swaps in the wide `og:image` set for feed apps (LinkedIn,
  Facebook, X, Slack, Discord), leaving tall for chat apps (iMessage,
  WhatsApp). iMessage identifies as both Facebook and X, so it's matched
  first. Swapped responses carry `Vary: User-Agent`. The crawler table and
  the reasoning are in the issue.
- JPEG, absolute URLs, declared size and type matching the bytes.
- One `MetaTags` component reading an SEO registry; canonical URL on every
  page; JSON-LD on articles; `@astrojs/sitemap` with the non-HTML filter;
  `robots.txt` with an absolute `Sitemap:` line; `llms.txt`.
- Banners made with `generate-consistent-og-images` from the site's
  `DESIGN.md`, so they match the site.

`knot-check share <url>` requests the deployed page as each crawler in the
table and fails if any response has more than one `og:image`, or the wrong
shape for that app.

// TBD before the starter ships: confirm on an iPhone that iMessage takes the
tall `og:image` and ignores `twitter:image` (the issue's first check).
// TBD: the edge layer as a published package (shared logic, like LFM) or as
a starter pattern extracted later.

### Recommended, not enforced

**Ideogram for images.** It's our preferred tool for agent image generation
(the image-generation reference in `open-graph-share-seo-geo` already names it).

- **Setup step:** get a key from Ideogram, set a spending cap, and save it as
  `IDEOGRAM_API_KEY` in the shell environment (`~/.zshrc` or `~/.zshenv` on
  a Mac), never in `.env` or anywhere in the repo. Restart the agent so it
  picks the key up.
- **The Ideogram MCP server** reads that variable. The plugins declare it, so
  installing the plugin and having the key is enough.
- **The doctor** (`knot-check doctor`) warns when the key is missing, and says
  what it turns on.
- For younger collaborators, the key and its cap belong to an adult.

// TBD: which Ideogram MCP server to bundle. Our image-generation reference
names `@takeshijuan/ideogram-mcp-server`; this machine runs a local shim of
it, so check why before shipping it to others. Also verify how a Codex
plugin's MCP config passes an environment variable through.

**Large content collections**, kept out of the site repo and fetched at
build time:

| | GitHub Content API | Cloudflare Artifacts |
|---|---|---|
| Best when | Content is written by people, in repos they already use | The site is on Cloudflare, or agents and apps write the content |
| Needs | `GITHUB_TOKEN` at build (60 requests an hour without one) | The Artifacts binding on the site's Worker |
| Prior art | `Context-V-GitHub-Fetcher-for-Multi-Repo-Content-Aggregation` (astro-knots) | event-hog-mcp, one repo per event |

### The link MCP

One Cloudflare Worker with no bindings, no storage and no auth. Tools:
`get_started`, `list_skills`, `get_skill`, `get_starter`, `explain_check`.
Skills and the starter are bundled at build time, as event-hog does. The bundle
reads from the skills' canonical homes, so nothing is copied by hand.

The server can't see anyone's files, so through the link alone every check is
only requested. The plugins are the recommended install.

### Enforced versus asked

**Enforced, in plugins:** JSX patterns on each edit; banned dependencies.
**Enforced, by running `knot-check`:** the full required tier.
**Asked of the model:** running `knot-check` before deploying, using the skills,
writing tests first, design taste.

## Done when

- [ ] `knot-check` passes on the starter and has been run on at least three of
      our own sites, with false alarms fixed.
- [ ] From a clean machine, a Claude Code user installs the plugin, builds a
      page, and is corrected when a JSX pattern is written.
- [ ] The same is true for a Codex user, including the `/hooks` trust step.
- [ ] The link connects from Claude Code and Codex and serves a skill.
- [ ] Proposed bar: a new person gets from nothing to a deployed site passing
      `knot-check` in under an hour, without reading our docs. // TBD

## Open questions

- [ ] Fragments (`<>`): the exploration prohibits them, but our canonical
      `packages/lfm-astro/components/AstroMarkdown.astro` uses them, so a hard
      rule fails every site built from it. Rewrite the renderer and make the
      rule an error, or keep it a warning? (A warning in the spike.)

- [ ] Do the Codex users work in the CLI or the ChatGPT desktop app, and on
      what OS?
- [ ] Whose accounts do the two younger collaborators deploy under?
- [ ] What URL does the Worker live at?
- [ ] Does `knot-check` publish to npm, or ship inside the plugin only?
- [ ] Verify on a real Codex install: the patch format the hook must parse, and
      whether a marketplace `source.path` of `./` is accepted for a plugin at
      the repo root.

## Related

- [[Exploring-an-MCP-so-Anyone-can-be-an-Astro-Knot]]
- [[Astro-Knots-Skills-Live-in-Two-Places-and-Will-Diverge]]
- event-hog-mcp: `src/landing.ts`, `src/skills.ts`, `scripts/bundle-kit.mjs`
- context-vigilance-kit: `.claude-plugin/`, `hooks/`
