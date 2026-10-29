---
title: "Exploring an MCP so Anyone can be an Astro Knot"
type: Explorations
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
at_semantic_version: 0.0.1.0
tags:
  - Exploration
  - Astro-Knots
  - MCP
  - Vibe-Coding
  - Guardrails
status: Parked
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

> **Parked 2026-10-29.** A long-held idea, thought through in one sitting.
> Decided so far: who it's for (non-developers with a coding agent), what
> every site must get (Vitest TDD, LFM, no React/JSX) and should get
> (Context Vigilance), where skills live, MCP and plugin from one repo, and
> `nix develop` for setup. To pick it back up, start at
> [Questions to answer before a spec](#questions-to-answer-before-a-spec):
> 3 (which starter), 4 (whose GitHub/Cloudflare), and 8 (what success is)
> decide the spec. Nothing is built yet.

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
- **Some guardrails are mechanical, some are taste.** "No React" and "no
  JSX patterns, even in `.astro` files" can be checked by a script. "Diverge in shape, not just in hue" can't.
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
| Astro, with Svelte for interactivity; no React, Preact, Solid or Angular | `astro-knots` skill, `Preferred-Stack` | Yes: dependencies, integrations in `astro.config`, file extensions |
| **No JSX patterns, even inside `.astro` files.** Astro tolerates JSX-style expressions for compatibility, and they cause problems: `className=`, `htmlFor=`, camelCase handlers like `onClick={…}`, `style={{ … }}` objects, fragments `<>…</>`, `.jsx`/`.tsx` components, helpers that return markup from `.ts`. Use real HTML in `.astro` syntax | `astro-knots` skill (hard prohibition), `references/tech-stack.md` | Yes: a lint pass over `.astro`, `.ts` and `.tsx` files. Models trained on React write these by reflex, so this check will fire most |
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

## Decided: what every Astro Knot gets

Three tiers. `knot_check` **fails** on the first, **warns** on the second,
and can only prompt for the third.

### Required (enforced)

- **Test-driven, with Vitest.** Vitest runs on Vite, which Astro is built
  on, so it works out of the box: `vitest.config.ts` with
  `getViteConfig()` from `astro/config`, and Astro's Container API to
  render `.astro` components to HTML in a test. Tests cover the parts that
  break quietly: content loaders and their lenient schemas, LFM output,
  utilities, and rendered components.
  - *Checked:* Vitest is configured, `vitest run` passes, and there are
    tests for loaders, schemas and components.
  - *Imposed by the tools, not only checked:* in Options B and C, a tool
    that adds something (`add_component`, `add_collection`, `add_page`)
    writes the **failing test first**, then the implementation, and is
    only done when the test passes. The MCP's tool order is the red-green
    loop, so TDD doesn't depend on the model remembering to do it.
  - Prior notes: the astro-knots spec `Maintain-a-Rigorous-Test-Suite`
    (status Idea) and the CI blueprint's `test.yml` shape.
- **LFM (Lossless Flavored Markdown)** for all markdown content.
  `@lossless-group/lfm` is a dependency, content collections render
  through its pipeline, and callouts, citations and extended code fences
  work.
  - *Checked:* the package is present and wired, and a fixture document
    with a callout, a citation and a diagram fence renders as expected
    (itself a Vitest test the template ships with).
- Everything in the table above marked "Yes", **especially no React and
  no JSX patterns**.

### Highly recommended (non-strict)

- **Context Vigilance**, from [context-v.dev](https://context-v.dev/)
  (the `context-vigilance-kit` repo). A new site starts with the kit's
  **starter `context-v/`**: the folders, an `index.md` per folder, an
  `AGENTS.md` pointer, and a `changelog/`. The MCP pulls the starter from
  the kit at scaffold time rather than carrying its own copy, so new sites
  get the current version. People who use Claude Code can add the kit as
  a plugin (`/plugin install cv@context-vigilance-kit`) and get its
  commands, like `/cv:explore` and `/cv:reflect`.
- **The skills that go with it:** `changelog-conventions` (an entry for
  every meaningful change), `git-conventions` (structured commit
  messages), plus `maintain-design-md`, `theme-system`,
  `lossless-flavored-markdown`, `open-graph-share-seo-geo` and
  `maintain-splash-pages` where they apply.
  - *Checked as warnings:* `context-v/` exists with indexes, a changelog
    entry is newer than the last meaningful commit, and commit headers
    follow the convention. Each warning says how to fix it, and none
    blocks a publish.

### Where the skills live: `context-v/agent-skills/`, linked in

Decided: a new site **ships its starter skills** in
`context-v/agent-skills/<name>/SKILL.md`: the recommended ones above,
plus `astro-knots` and the testing and LFM skills the required tier
depends on. By convention:

- **They stay there.** `context-v/agent-skills/` is the one real copy in
  the repo. Nothing copies skills anywhere else.
- **They evolve there.** When the site's people (or their agents) learn
  something, they edit the skill in `context-v/agent-skills/`, commit it,
  and log it. A site's skills are allowed to drift from ours; that's the
  point. One that proves useful beyond the site can be offered back to
  `lossless-agent-skills`.
- **Agents reach them through symlinks.** Each harness looks for skills
  in its own folder, so the repo commits **relative** links, one per
  skill, per harness:

  ```
  .claude/skills/<name>  -> ../../context-v/agent-skills/<name>   # Claude Code
  .agents/skills/<name>  -> ../../context-v/agent-skills/<name>   # Codex, Cursor, Pi, others
  ```

  A clone has working skills straight away, an edit to the real file is
  live in every harness at once, and nothing depends on what's in a
  person's home folder.
- **Why repo-level links, not home-folder links:** links in `~/.claude/skills`
  are shared by every repo on the machine, so two repos with a skill of
  the same name fight over one link. We've been bitten by exactly that:
  the anchor's sync script once pointed `context-vigilance` and
  `changelog-conventions` at a stale copy in another repo.
- **`knot_check` warns** when a skill in `context-v/agent-skills/` has no
  link in a harness folder, or a link points somewhere else.

The starter's `AGENTS.md` tells agents all of this. Draft of the section
it ships with:

> ## Agent skills
>
> This repo's skills live in `context-v/agent-skills/`, one folder per
> skill with a `SKILL.md`. That folder is the only real copy.
>
> - **Use them.** Load the matching skill before working on what it
>   covers: `astro-knots` for any code, `lossless-flavored-markdown` for
>   content, `context-vigilance` for anything in `context-v/`,
>   `changelog-conventions` and `git-conventions` before committing.
> - **Your tool finds them through links.** `.claude/skills/` and
>   `.agents/skills/` hold relative symlinks into `context-v/agent-skills/`.
>   If your tool reads skills from another folder, add links there the
>   same way: `ln -s ../../context-v/agent-skills/<name> <your-folder>/<name>`.
>   Never copy a skill instead of linking it.
> - **Improve them here.** When you learn something a skill should say,
>   edit it in `context-v/agent-skills/`, not in a harness folder or your
>   home folder, and say what changed in the changelog.
> - **Adding a skill:** create `context-v/agent-skills/<name>/SKILL.md`,
>   then add its links in every harness folder in the same commit.

### Taste (prompted for, never enforced)

Design posture, voice, divergence from sibling sites. A design-review
step can ask for it; no check can decide it.

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
- **The JSX check matters most for vibe coding.** Models learned web
  development mostly from React, so they slip `className`, `style={{}}`
  and fragments into `.astro` files without being asked. Astro often
  accepts them, so the build passes and the problem shows up later. A
  check that catches these, and says what the `.astro` way is, does more
  for consistency than any instruction.
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
   mechanical guardrails from the table, with two levels (fail for the
   required tier, warn for the recommended one), each finding linked to
   the pattern that explains it. `vitest run` is one of its checks. Run it on our own sites first; where it
   fails on a site we like, the rule or the site is wrong.
2. **Option A's knowledge tools**, reading skills and blueprints live
   from their repos.
3. **Option B** for developers: templates plus `knot_check` as tools, so
   a coding agent builds, checks and fixes in a loop.
4. **Option C** later, if and when non-developers are the real audience,
   on the same checker, starting with free writes and a gated publish.

Still open; this is a lean, not a decision.

## Both an MCP and a plugin, from one repo

Wanted: ship astro-knots-mcp as an **MCP server** (works in any client)
and as a **Claude Code plugin** (skills, commands and hooks on top), and
keep both in this repo.

That works, because a Claude Code plugin can bundle MCP servers. Our
`context-vigilance-kit` is the precedent for the plugin half: a
`.claude-plugin/plugin.json`, a `marketplace.json` so it installs straight
from the GitHub repo, `"skills"` pointed at a folder of our choosing, and
a `hooks/` folder.

### What each half is for

| | MCP server | Claude Code plugin |
|---|---|---|
| Reaches | Claude (web, desktop), Claude Code, Codex, Cursor, ChatGPT, anything that speaks MCP | Claude Code only |
| Gives | Tools (`knot_check`, `new_site`, `add_component`, `get_skill`…), prompts | Skills that load themselves, slash commands (`/knot:new`, `/knot:check`), **hooks**, and the MCP server, wired up |
| Enforces through | Tool design: test first, gated publish, constrained inputs | Hooks as well: they run on every edit, whether or not the model calls a tool |

**Hooks are the strongest guardrail we have, in Claude Code.** A
`PostToolUse` hook on edits to `.astro` files can run the JSX-pattern
check and hand the failure straight back to the model. A `PreToolUse`
hook can refuse to add `react` as a dependency. The MCP can only check
when it's asked; a hook checks every time. Other clients get the same
checks, but only through the MCP's tools and in CI.

### One repo, one core

```
astro-knots-mcp/
├── .claude-plugin/
│   ├── plugin.json           # the plugin: skills, commands, hooks, MCP
│   └── marketplace.json      # installable straight from GitHub
├── .mcp.json                 # how the plugin starts the MCP server
├── packages/
│   ├── knot-check/           # THE CORE: the guardrail checks, a library + CLI
│   └── mcp/                  # the MCP server (stdio for local use; maybe a
│                             #   remote Worker entry later for chat clients)
├── agent-skills/             # skills both halves serve (see the corpus issue)
├── commands/                 # /knot:* slash commands (plugin only)
├── hooks/                    # call knot-check on edits (plugin only)
├── templates/                # starter sites, extracted from real ones
├── action.yml                # knot-check as a GitHub Action, for CI
├── context-v/  changelog/  splash/
└── README.md, LICENSE, NOTICE
```

The rule that keeps it maintainable: **every guardrail lives once, in
`packages/knot-check/`.** The MCP tool, the plugin hook, the slash command
and the GitHub Action all call it. They differ only in when they run.
The same goes for skills: one folder, read by the plugin and served by
the MCP's `get_skill`. Where that folder lives is tied to
[[Astro-Knots-Skills-Live-in-Two-Places-and-Will-Diverge]].

## Leaning: a remote MCP, with the coding agent doing the local work

Michael's picture (2026-10-29): a **remote** MCP, and the coding agent
installs and runs whatever is needed on the person's machine. That splits
the work cleanly:

| The remote MCP does | The coding agent does, locally |
|---|---|
| Serves the skills, blueprints and reminders | Loads them, writes the code |
| Hands out templates and the starter (`context-v/`, skills, flake) | Writes them into the repo, `direnv allow` |
| Says which checks apply and how to run them | Runs `npx @lossless-group/knot-check`, `vitest run`, `astro check` |
| Explains a failed check and the pattern behind it | Fixes it and runs the check again |

Consequences:
- **The checks run locally, not on the server.** A remote server can't
  see the person's files, so `knot-check` ships as an npm CLI the agent
  runs (and as a GitHub Action, and as the plugin's hooks). The MCP's job
  is to make sure the agent runs it and to explain the results.
- **Probably no auth at all.** If the remote server only serves our public
  patterns and templates, and holds nothing of anyone's, it can be
  authless. That's the easiest kind to add to Claude, ChatGPT or Cursor.
  Auth only arrives with Option C (hosting people's sites).
- **The guarantee comes from local tooling, not the server**: hooks in
  Claude Code, `knot-check` in CI everywhere. A server that can't see the
  files can only ask for checks to be run.

## Setup: a Nix flake and its dev shell

Decided direction: every Astro Knot gets a **reproducible dev shell**. The
starter ships a `flake.nix`, and **every command runs inside it with
`nix develop`**, so every tool is on the PATH at pinned versions, for the
person and for their coding agent alike.

**Strongly recommended: `nix develop`, not direnv** (decided 2026-10-29).
We don't know the person or their computer, so we change as little about
it as possible:

- `nix develop`, run in the project folder, reads `flake.nix` and opens
  its dev shell (`devShells.default`): a subshell with every tool the
  flake lists on the PATH. `exit` leaves it, and the tools are off the
  PATH again.
- A person working in a terminal runs `nix develop` once and works
  inside that shell.
- The agent runs each command as `nix develop --command <cmd>`
  (`nix develop --command pnpm dev`, `nix develop --command vitest run`):
  the same dev shell, opened for that one command and closed when it
  ends, so no shell is left behind for the agent to lose track of.
- (`nix shell nixpkgs#<pkg>` is the other "temporary" one: a one-off tool
  without a flake. The starter doesn't need it.)
- Nothing edits their shell config (`~/.zshrc`), nothing needs approving
  per folder, and nothing is installed globally. Tools live in
  `/nix/store`, which nothing else on the machine reads; `nix store gc`
  clears the unused ones.
- direnv stays optional: the starter can include a `.envrc` (`use flake`)
  for people who already use direnv, but no step depends on it.

The starter's `AGENTS.md` says this in one line: *run every command
through `nix develop --command`.* The plugin's hooks and `knot-check`
can warn when a command ran outside it.

**What goes in it**, from what our skills actually call:

| Tool | Why |
|---|---|
| `nodejs_22`, `pnpm` | Build and run the site |
| `imagemagick` | Resize, convert and compress images (`prep-images-for-embed`, OG images) |
| `ghostscript` | Shrink and normalize PDFs (decks, datarooms) |
| `ffmpeg` | PNG→JPEG for share images, video posters |
| `exiftool` | Strip location and camera metadata from photos |
| `libwebp` | `cwebp`, where WebP is still wanted |
| `gh`, `git`, `jq`, `yq` | Repos, PRs, JSON and YAML frontmatter |
| `python3` | The context-vigilance-kit's frontmatter check needs it |

Left out on purpose, following the root flake's `js` aspect: Playwright's
browsers (huge, and they don't run on NixOS; use a system browser).

**Who it's for: non-developers, through their coding agent.** Nobody
should have to know what Node or ImageMagick is. The agent installs Nix
and direnv once (the Determinate Systems installer is one command), then
everything else comes from the flake. That's also why Nix: **no
dependency collisions.** Each site gets its own pinned Node, pnpm and
tools inside its folder; nothing is installed globally, nothing fights
with another project or with what's already on the machine, and deleting
the folder removes it all.

**It's Astro Knots' own flake, not ours.** The root of our tree has a
flake too, but that one sets up Michael's machine (editors, Rust, Python,
the `machine` aspect) and lives in a private repo; it's not a model for
this. The Astro Knot flake is purpose-built and small: only what an Astro
Knots site and our skills need, kept in this repo as part of the starter,
and versioned with the MCP. Keeping npm's global prefix and caches inside
the project (as environment variables in the flake) closes the last
place a collision could happen.

To decide when it's built: one flake for every site, or a flake that
takes options (with or without the media tools, say). Leaning: one, kept
small, until a site needs otherwise.

### Bootstrap: getting Nix onto the machine

Homebrew can't be part of the flake: Nix *is* the package manager there,
and it installs the site's tools itself. The machine's own package
manager has two smaller jobs: getting **Nix and direnv** installed once,
and being the **fallback** when Nix isn't allowed. The coding agent does
all of it; the person only approves.

**Step 0, the agent works out the OS.** `uname -s` (Darwin or Linux); on
Linux, the `ID` and `ID_LIKE` lines of `/etc/os-release`; on Windows,
it's running in PowerShell or inside WSL.

| OS | Package manager | Bootstrap |
|---|---|---|
| **macOS** | **Homebrew** (not built in). Install: `/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"`; it asks for Xcode's Command Line Tools first | Nix via the Determinate Systems installer, then `brew install direnv` |
| **Debian, Ubuntu, Mint, Pop!_OS** | `apt` | Nix via the installer, then `sudo apt install direnv` |
| **Fedora, RHEL, CentOS** | `dnf` | same, `sudo dnf install direnv` |
| **Arch, Manjaro** | `pacman` | same, `sudo pacman -S direnv` |
| **openSUSE** | `zypper` | same, `sudo zypper install direnv` |
| **Windows** | **winget** (built into Windows 10 and 11) | `wsl --install` gives a Linux (Ubuntu by default), then follow the Ubuntu row inside it. Nix doesn't run on Windows itself |

The Nix installer is the same everywhere it runs (macOS, Linux, WSL):
`curl -fsSL https://install.determinate.systems/nix | sh -s -- install`.

**That's the whole bootstrap: Nix, once.** direnv isn't needed, since
commands run through `nix develop`. The direnv commands in the table
above are only for people who choose it, and then it's
`eval "$(direnv hook zsh)"` in `~/.zshrc` and `direnv allow` in the
folder. So on a Mac, Homebrew is only needed for the no-Nix fallback.

**The no-Nix fallback** uses the same managers to install the tools in
the flake's table directly: Homebrew on macOS, the distro's manager on
Linux, winget on Windows (the agent finds exact IDs with `winget search`).
It works, but tools land globally, so the no-collisions promise is gone.
`knot-check` should say so when it detects this mode.

The tool-to-package mapping for each manager belongs in `knot-check`'s
"doctor" output, not in this doc, so there's one list to keep current.

**Two follow-ons:**
- **Make the skills portable.** `generate-consistent-og-images` uses
  macOS's `sips` and `qlmanage`, which don't exist on Linux or in a Nix
  shell. With ImageMagick in the flake, the skills should prefer it.
- **Without Nix.** Some machines won't allow it (locked-down work
  laptops). The flake doubles as the list of what's needed: `knot-check`
  warns about any missing tool, and the agent can install it another way,
  at the cost of the isolation.
- **Windows.** Nix needs WSL2 there. Worth deciding whether Windows is in
  scope for the first version.

## What else to consider when building an MCP or a plugin

- **Local or remote.** A local MCP (stdio, started with `npx`) can read
  and write the person's files and run `vitest` and `astro check`; that's
  what Option B needs. A remote MCP (HTTP on a Worker) is the only kind
  that chat apps can use, but it can't touch a local folder. We probably
  ship local first and add remote for the knowledge tools.
- **Auth, for anything remote.** Claude's custom connectors expect OAuth
  (or no auth). event-hog's key-in-the-URL works, but the URL is the
  password; hubspot-mcp-wrap's OAuth front door is the better precedent.
  A local server needs none.
- **Tools are prompts.** The model chooses tools by their names and
  descriptions, and every tool's definition costs context in every chat.
  Fewer, task-shaped tools (`add_component`, not `write_file` plus five
  helpers), descriptions that say when to use them and when not, outputs
  short enough to read, and errors that say how to fix the problem.
- **Enforced versus asked.** Write down, for each rule, whether a tool or
  hook guarantees it or an instruction only asks for it, as event-hog's
  README does. That list is what a reviewer checks.
- **Safety of a server that writes and runs things.** Keep writes inside
  the project folder, never echo secrets (`.env`), treat fetched content
  (a client's website, a design file) as data rather than instructions,
  and confirm before anything destructive or public (deploys, new repos).
- **Works across clients.** Skills follow the Agent Skills spec, so any
  harness can read them. Slash commands and hooks are Claude Code only;
  everything essential has to be reachable through the MCP's tools too,
  or Codex and Cursor users get a weaker product.
- **Versions and updates.** The plugin and the MCP package should share
  one version number and one changelog. A plugin pins the MCP version it
  starts, so they can't drift apart. Updates have to reach people: a
  marketplace update for the plugin, a new npm version for `npx`.
- **Testing, in three layers.** Vitest unit tests for each check and each
  tool (our own TDD rule applies to us first); the MCP Inspector for
  protocol behaviour; and evals, "given this request, does the model call
  the right tool and does the site pass `knot_check`?". Claude Code has
  `claude plugin eval` for plugin eval suites.
- **Distribution.** npm for the MCP package, the GitHub repo as the
  plugin marketplace, a listing in MCP registries later. The splash
  explains both installs, the way context-v.dev does.
- **License, data and trust.** Apache-2.0 with a NOTICE, like event-hog.
  A local server sends nothing anywhere, which is worth saying plainly; a
  remote one needs a data policy.
- **Observability.** For a local tool, none by default. For a remote
  one, enough logging to debug, and no content from people's sites.

## Questions to answer before a spec

1. ~~**Who is the first "anyone"?**~~ Answered 2026-10-29:
   **non-developers vibe coding with a coding agent** (Claude Code, Codex,
   Cursor). Not Michael, and not people in a chat-only app. The agent has
   a shell, so it does the local work; the person doesn't install or
   configure anything themselves.
2. ~~**How rigid?**~~ Partly answered: required (Vitest TDD, LFM, the
   mechanical stack rules), highly recommended (Context Vigilance and its
   skills), taste. Still open: which of the remaining "Yes" rows are
   required and which are recommended (search by default? OG images?).
3. **Which site is the template?** One canonical starter, or several
   (content site, splash, deck, portfolio)?
4. **Where do their sites live and deploy?** Their GitHub and their
   Cloudflare, or ours? If ours, the event-hog data-policy questions come
   with it.
5. **How do evolved skills meet upstream updates?** A site edits its
   `changelog-conventions`; we later improve ours. Does the MCP (or
   `/cv:upgrade`) offer a merge, show a diff, or leave the site's copy
   alone? Leaning: never overwrite, offer a diff.
6. **Windows.** Committed symlinks need `core.symlinks` on Windows. Is a
   fallback (a script that recreates the links) worth it for v1?
7. **How do we review taste?** A design-review prompt with screenshots,
   human review, or simply out of scope?
8. **What does success look like?** A proposal: a stranger with a coding
   agent goes from nothing to a deployed site that passes `knot_check` in
   under an hour, without reading our docs.

## Outcome

(Parked 2026-10-29, not ended. Fill in when this ends: a link to the spec it produced, or "decided
not to pursue, and why".)

## Related

- [[Using-MCP-Servers-to-Speed-up-Astro-Development]] (lost-in-public)
- [[Astro-Knots-is-not-a-True-Monorepo]]
- [[Continuous-Integration-for-Astro-Knots-Sites]]
- [[Guarantee-Text-Wrapping-and-No-Horizontal-Bleed-at-Any-Width]]
- [[Maintain-Themes-Mode-Across-CSS-Tailwind]]
- event-hog-mcp README, "What the server guarantees, and what it only asks Claude to do"
- Astro Docs MCP: <https://mcp.docs.astro.build/mcp>
