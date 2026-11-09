# astro-knots-mcp

Build a website with your coding agent, and have it come out following the
patterns The Lossless Group honed across twenty Astro sites: Astro with Svelte
for interactivity, no React or JSX, Lossless Flavored Markdown, Vitest, three
color modes, and share images and SEO done right from the first commit.

**[lossless-group.github.io/astro-knots](https://lossless-group.github.io/astro-knots/#build-a-site)** has the copy-a-prompt setup.

> **Status: spike (0.1.0).** Built and tested locally on 2026-11-09. The link
> MCP isn't deployed yet, the Codex path hasn't been run on a real Codex
> install, and the starter site template isn't extracted yet. See
> [the spec](context-v/specs/Astro-Knots-MCP-and-Plugins-First-Release.md).

## Three front doors, one set of guardrails

| | Claude Code plugin | Codex plugin | Link MCP |
|---|---|---|---|
| Install | `/plugin marketplace add lossless-group/astro-knots-mcp` then `/plugin install astro-knots@astro-knots-mcp` (or in one step on Claude Code 2.1.275+: `/plugin install astro-knots --marketplace lossless-group/astro-knots-mcp`) | `codex plugin marketplace add lossless-group/astro-knots-mcp`, then `/plugins` to install, then **`/hooks` to trust its hook** | Add `https://<worker>/mcp` as a remote MCP server (no sign-in) |
| Skills | Yes, load themselves | Yes | Through `get_skill` |
| Checks every edit | Yes (hook) | Yes, once trusted (hook) | No: it can't see your files |
| Works in | Claude Code | Codex CLI, ChatGPT desktop (not the IDE extension) | Any MCP client |

Every guardrail lives once, in [`knot-check/`](knot-check/). The hook, the CLI
and the MCP's `explain_check` all read the same [rules](knot-check/rules.mjs).

## knot-check

```bash
pnpm dlx --package=github:lossless-group/astro-knots-mcp knot-check . --full
```

| Command | Checks |
|---|---|
| `knot-check [dir]` | Banned frameworks, JSX patterns in `.astro`, `.jsx`/`.tsx` files, `workspace:` links, LFM installed and used, Vitest set up |
| `knot-check [dir] --full` | Also runs `vitest run`, `astro check` and the build, then checks `dist/` |
| `knot-check dist [dir]` | Built pages: every content page has a body (no title over an empty page), exactly one `og:image` with its six tags, `twitter:` tags, absolute URLs, the image file matching its declared size and type, canonical, sitemap, `robots.txt`, `llms.txt`. Skips `noindex` pages |
| `knot-check share <url>` | Fetches a live page as iMessage, WhatsApp, Telegram, X, LinkedIn, Facebook, Slack, Discord and a browser, and shows the card each gets |
| `knot-check doctor` | Node, pnpm, `IDEOGRAM_API_KEY` |

## What the hook guarantees, and what is only asked

**Enforced on every edit** (Claude Code; Codex once trusted): no `className=`,
`htmlFor=`, camelCase handlers or `style={{}}` in `.astro` templates, no
`.jsx`/`.tsx` files, no React/Preact/Solid/Angular, no `workspace:` links
(including after `pnpm add`). Fragments (`<>`) are a warning for now.

**Enforced when `knot-check` runs:** everything in the table above.

**Asked of the model:** running `knot-check` before deploying, loading the
skills, writing tests first, design taste. OpenAI calls hooks "a useful
guardrail, not a complete enforcement boundary", and the same is true here.

## The link MCP

One Cloudflare Worker, no bindings, no storage, no keys. Tools: `get_started`,
`list_skills`, `get_skill`, `explain_check`, `share_cards`. `GET /` is a
copy-a-prompt page.

```bash
pnpm install
pnpm exec wrangler login
pnpm run deploy                          # prints the Worker's URL
pnpm set-mcp-url https://<worker>/mcp    # points both plugins at it
```

Until `set-mcp-url` runs, the plugins carry skills and hooks only, so nobody
gets a broken server entry.

## Skills

`skills/` holds `start-an-astro-knot` and `knot-check` (written here) and eight
skills copied from [lossless-agent-skills](https://github.com/lossless-group/lossless-agent-skills)
by `pnpm sync-skills` (listed in [skills/SYNCED.md](skills/SYNCED.md)). Edit
those in lossless-agent-skills, never here.

## Developing

```bash
pnpm install
pnpm test        # vitest: rules, checks, the hook (both payload shapes), the Worker
pnpm check       # bundle skills into the Worker and type-check it
claude plugin validate .
```

## License

Apache-2.0. See [LICENSE](LICENSE). Keep [NOTICE](NOTICE) in any copy or fork.
