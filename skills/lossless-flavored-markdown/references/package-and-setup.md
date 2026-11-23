# LFM Package & Setup

Installing `@lossless-group/lfm` (npm, JSR, or the GitHub Packages mirror), rendering it in a browser page with no build step, configuring `remarkLfm`, and the trigger-map override pattern. Read this when adding LFM to a new site, upgrading it, or showing LFM output in a Claude artifact or other no-build page.

## The two packages

| Package                       | What it does                                                | Required?                  |
| ----------------------------- | ----------------------------------------------------------- | -------------------------- |
| `@lossless-group/lfm`         | The remark plugin and AST normaliser                        | Yes                        |
| `@lossless-group/lfm-astro`   | Astro integration — wires the plugin and ships components   | Yes for Astro Knots sites  |

For non-Astro consumers (rare; e.g. a Svelte/Solid site), use `@lossless-group/lfm` directly with your `unified` pipeline and ship your own components.

## Registries: npm, JSR, and a GitHub Packages mirror

From **0.11.0** (2026-11-21), `@lossless-group/lfm` is on three registries, all published from the same tag:

| Registry | Name | Auth to install | Feeds the public CDNs? | Use it for |
| --- | --- | --- | --- | --- |
| **npm** ([npmjs.com](https://www.npmjs.com/package/@lossless-group/lfm)) | `@lossless-group/lfm` | none | **yes**: jsDelivr, unpkg, esm.sh | plain `pnpm add`, and any page that imports LFM by URL |
| **JSR** ([jsr.io](https://jsr.io/@lossless-group/lfm)) | `@lossless-group/lfm` | none | no | Deno, and sites already on the `npm:@jsr/…` shim |
| GitHub Packages | `@lossless-group/lfm` | GitHub token | no | internal mirror only |

Versions before 0.11.0 are on JSR and GitHub Packages only. `@lossless-group/lfm-astro` is not published anywhere yet (copy its components; see `SKILL.md`).

### Install from npm (simplest)

```bash
pnpm add @lossless-group/lfm
```

No `.npmrc`, no tokens. **Watch for one trap:** if the repo's or your user `.npmrc` maps the scope to GitHub Packages (`@lossless-group:registry=https://npm.pkg.github.com`), that line wins and the install goes to the mirror, which needs a token. Remove the line, or override it for one install with `--@lossless-group:registry=https://registry.npmjs.org`.

### Install from JSR

```bash
pnpm dlx jsr add @lossless-group/lfm
pnpm dlx jsr add @lossless-group/lfm-astro
```

Or in `package.json` directly:

```json
{
  "dependencies": {
    "@lossless-group/lfm":       "npm:@jsr/lossless-group__lfm@^0.x",
    "@lossless-group/lfm-astro": "npm:@jsr/lossless-group__lfm-astro@^0.x"
  }
}
```

(The `npm:@jsr/…` syntax is JSR's npm-compat shim. `pnpm dlx jsr add` writes it for you.)

JSR install needs no auth tokens, no `.npmrc`, no GitHub credentials. Open-source contributors can clone a downstream site and `pnpm install` immediately.

### GitHub Packages (mirror — internal use only)

Only reach for this when working inside the Lossless private toolchain that already requires a GitHub token, *and* npm and JSR are unsuitable for some reason. For everything else, npm or JSR.

```bash
# .npmrc at repo root
@lossless-group:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}
```

```bash
pnpm add @lossless-group/lfm @lossless-group/lfm-astro
```

Token needs `read:packages` scope.

## In the browser, with no build step

`@lossless-group/lfm/browser` (0.11.0+) is LFM with nothing that needs Node: the parser, the `remarkLfm` preset and every plugin, hex-code citations included. Use it for a Claude artifact, a CodePen, a plain HTML file, or client-side code in a bundled app (a live preview, an editor).

What it leaves out:

- **Open Graph fetching** (`lfmOgFetcher`, `OGDispatcher`, `OGCache`) keeps a cache file on disk, so it isn't there. The `ogFetch` option is ignored with a warning. Fetch link previews at build time with the root entry.
- **Syntax highlighting** stays on `@lossless-group/lfm/highlight`, so parsing doesn't download Shiki.
- **Code-fence formats** on `/formats` are browser-safe, except `/formats/plantuml` (it imports `node:zlib`).

### Load it from a CDN

Always pin an exact version. Claude artifacts can load scripts only from cdnjs, jsDelivr and unpkg, so use jsDelivr there.

| CDN | URL |
| --- | --- |
| jsDelivr (preferred) | `https://cdn.jsdelivr.net/npm/@lossless-group/lfm@0.11.0/browser/+esm` |
| esm.sh | `https://esm.sh/@lossless-group/lfm@0.11.0/browser` |
| unpkg | `https://unpkg.com/@lossless-group/lfm@0.11.0/dist/browser.js` (raw file; its dependencies need an import map) |

jsDelivr's `+esm` reads the package's `exports` map and bundles LFM's dependencies for the browser, so one import is enough.

### Render to HTML: two steps, never one chain

LFM produces an MDAST. To get HTML, parse with LFM first, then convert:

```html
<div id="out"></div>
<script type="module">
  import { unified } from 'https://cdn.jsdelivr.net/npm/unified@11.0.5/+esm';
  import remarkRehype from 'https://cdn.jsdelivr.net/npm/remark-rehype@11.1.2/+esm';
  import rehypeStringify from 'https://cdn.jsdelivr.net/npm/rehype-stringify@10.0.1/+esm';
  import { parseMarkdown } from 'https://cdn.jsdelivr.net/npm/@lossless-group/lfm@0.11.0/browser/+esm';

  const tree = await parseMarkdown(markdown);               // every LFM transform runs here
  const hast = await unified().use(remarkRehype).run(tree); // MDAST to HTML tree
  let html = unified().use(rehypeStringify).stringify(hast);

  // LFM takes footnote definitions out of the tree and hands them over in
  // citation order, so the page renders its own sources list. The ids match
  // the links remark-rehype puts on each [^hex].
  const esc = (s) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  html += '<ol class="sources">' + tree.data.citations.ordered.map((c) =>
    `<li id="user-content-fn-${esc(c.identifier)}">` +
    (c.url ? `<a href="${esc(c.url)}">${esc(c.title ?? c.url)}</a>` : esc(c.raw)) +
    '</li>').join('') + '</ol>';

  document.querySelector('#out').innerHTML = html;
</script>
```

- **Citations are numbered by first appearance.** `[^a3f9b2]` cited first renders as 1, whatever order the definitions are in. Never write or invent citation numbers in the markdown; the hex keys are the source of truth. Each entry in `tree.data.citations.ordered` has `index`, `identifier`, `title`, `url`, `source` and any `publishedDate`.
- **Don't chain** `unified().use(remarkParse).use(remarkLfm).use(remarkRehype)`. The preset's plugins attach after `remark-rehype` and run on the HTML tree, so callouts and citations are silently skipped. Logged in the LFM repo as `context-v/issues/Preset-Transforms-Run-After-Later-Plugins.md`.
- LFM ships no CSS. Style the output (callouts, the sources list) in the page.

The full guide, with a runnable example, is `docs-v/browser.md` in the LFM repo.

### With a bundler

```ts
import { parseMarkdown, remarkLfm } from '@lossless-group/lfm/browser';
```

Use this subpath for client-side code so the bundle doesn't pull in the Node-only modules the root entry re-exports.

## Astro integration

### Minimum config

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import lfm from '@lossless-group/lfm-astro';

export default defineConfig({
  integrations: [lfm()],
});
```

### Full config (annotated)

```js
import { defineConfig } from 'astro/config';
import lfm from '@lossless-group/lfm-astro';

export default defineConfig({
  integrations: [
    lfm({
      // Trigger-map sources, layered (later overrides earlier)
      triggers: [
        '@lossless-group/lfm/triggers/default.yaml',  // built-ins (always first)
        'src/config/lfm-triggers.yaml',                // site-specific
      ],

      // Variants
      variants: 'src/config/lfm-variants.yaml',
      strictVariantAttributes: 'error',  // 'error' | 'warn' | 'silent'

      // Build-time OG fetch (for popovers, link previews, citations)
      ogFetch: {
        enabled: true,
        timeout: 5000,           // 5s — never bump above 10s
        maxConcurrent: 10,
        cacheDir: '.lfm-cache/',
        cacheTtl: '7d',
        userAgent: 'lfm/1.x (+https://lossless.group)',
        fallback: 'graceful',    // missing OG → render link without preview
      },

      // Citation system
      citations: {
        format: 'hex',           // 'hex' (recommended) | 'numeric' (legacy)
        sourceCatalogue: 'src/content/sources/*.md',  // optional
      },

      // Code-fence syntax highlighting (Shiki)
      shiki: {
        theme: 'catppuccin-frappe',
        // …or themes: { light: 'github-light', dark: 'github-dark' }
      },

      // Mermaid (auto-render fenced ```mermaid blocks)
      mermaid: { enabled: true, theme: 'forest' },

      // Wikilinks (Beta)
      wikilinks: {
        enabled: true,
        collections: ['posts', 'sources'],   // resolve against these
        unresolved: 'warn',                   // 'warn' | 'error' | 'silent'
      },
    }),
  ],
});
```

## The trigger-map override pattern

The trigger map is a layered config. The package ships defaults; sites override only what they need.

### `@lossless-group/lfm/triggers/default.yaml` (built-in, never edit)

Defines the ~20 stable triggers (callout, link-preview, image, etc.). Treat as read-only.

### `src/config/lfm-triggers.yaml` (site-specific)

Add new triggers, override built-ins, or disable them:

```yaml
triggers:
  # Add a new component
  - name: pricing-table
    syntax:
      - pattern: ':::pricing-table{$attrs}\n$children\n:::'
    component: PricingTable
    component_path: src/components/lfm/PricingTable.astro
    props:
      tiers: { required: true, type: number }

  # Override a built-in's component (e.g. swap the default Callout)
  - name: callout
    component_path: src/components/lfm/CustomCallout.astro
    # syntax and props inherited from default.yaml

  # Disable a built-in (rare)
  - name: card-carousel
    enabled: false
```

The override semantics:

- **Identity match** by `name`. A site entry with the same `name` as a built-in *replaces* the built-in (not merges, unless you use the explicit `extends:` pattern).
- **`extends:`** lets a site entry layer onto the built-in:

```yaml
- name: callout
  extends: '@lossless-group/lfm:callout'   # explicit reference to the built-in
  component_path: src/components/lfm/CustomCallout.astro
  # everything else (syntax, props) inherited
```

## CLI commands

```bash
# Validate the trigger map and frontmatter against schemas
pnpm lfm:check

# Pre-build OG cache (useful before a deploy)
pnpm lfm:fetch-og

# Validate citation hex codes (uniqueness, format)
pnpm lfm:check-citations

# Render a single file to HTML for preview
pnpm lfm:render src/content/posts/some-article.md
```

These are exposed via `@lossless-group/lfm-astro`'s package scripts. If they're not available, your version is stale — upgrade.

## Upgrading

LFM follows semver-ish versioning (the four-part `epoch.major.minor.patch` for the *spec*; standard semver for the package).

```bash
# Minor / patch — usually safe
pnpm update @lossless-group/lfm @lossless-group/lfm-astro

# Major / epoch — read the changelog first
cat node_modules/@lossless-group/lfm/CHANGELOG.md
```

The package's `CHANGELOG.md` follows the [changelog-conventions skill](../../../../../changelog-conventions/) — `publish: true`, `lede`, ISO dates, etc.

## Co-developing LFM itself

When you (the agent or team member) are working *on* LFM rather than just consuming it, the source lives at:

```
lossless-monorepo/astro-knots/packages/lfm/         # the remark plugin / parser
lossless-monorepo/astro-knots/packages/lfm-astro/   # the Astro integration
```

If the team has graduated LFM to its own repo by the time you read this, check `astro-knots/CANDIDATES.md` or the lossless-skills `README.md` for the new home.

### Local development workflow

```bash
# In astro-knots/
pnpm install                 # workspace-aware
pnpm --filter @lossless-group/lfm build
pnpm --filter @lossless-group/lfm test
pnpm --filter @lossless-group/lfm-astro build

# Run the docs/playground site against the local package
pnpm --filter astro-knots-playground dev
```

The workspace `pnpm-workspace.yaml` already points at `packages/*` so the playground / consumer sites resolve `@lossless-group/lfm` to the in-tree source. No `pnpm link` dance.

### Testing changes against an external site

For consumers outside the workspace (e.g. a separate `lossless-monorepo/some-site` repo):

```bash
# Build a JSR tarball locally
cd astro-knots/packages/lfm
pnpm dlx jsr publish --dry-run --allow-dirty   # validate
pnpm pack                                        # tarball

# In the consumer site
pnpm add file:/path/to/lossless-group-lfm-0.x.tgz
```

Avoid `pnpm link --global` for cross-repo testing — it introduces version-resolution surprises that JSR-installed users won't hit.

## Publishing (maintainers only)

> **Current as of 0.11.0 (2026-11-21).** LFM now lives in its own repo: `lossless-monorepo/lfm/`, GitHub `lossless-group/lossless-flavored-markdown-package`. The `astro-knots/packages/lfm` paths in the co-development section above predate the move.

One tag publishes to npm and JSR, each from its own workflow. GitHub Packages is published by hand.

1. Bump `version` in **both** `package.json` and `deno.json`. Keep them in lockstep, and never reuse a version already on any registry: npm and JSR can't overwrite a version, and two registries holding different code under one number is worse than a skipped number.
2. Write release notes in `changelog/releases/<version>.md` (see the prior release for the frontmatter: `release_tag`, `prior_release_version`, …), following the [changelog-conventions skill](../../../../../changelog-conventions/).
3. Validate:
   ```bash
   pnpm install && pnpm test                       # test builds first
   pnpm lfm:npm --dry-run                          # what npm would get
   ```
4. Tag the release commit and push the tag (`v`, not `lfm-v`):
   ```bash
   git tag -a vX.Y.Z -m "X.Y.Z: <headline>"
   git push origin vX.Y.Z
   ```
5. On a `v*` tag, CI runs `publish-jsr.yml` (JSR, provenance via OIDC) and `publish-npm.yml` (npm via `scripts/publish-npm.sh --provenance`). Both skip a version that's already published, so re-running is safe. Both also have `workflow_dispatch`, to re-run from a branch when a tag's run failed for a reason unrelated to the package.
6. Optional mirror: `pnpm lfm:gh` (uses `gh auth token`).

Local scripts, each skipping an already-published version:

```bash
pnpm lfm:npm        # npm; needs `npm login --registry=https://registry.npmjs.org`
pnpm lfm:jsr        # JSR; needs jsr login locally
pnpm lfm:gh         # GitHub Packages mirror
pnpm lfm:publish    # all three
```

**npm setup, done once.** The `@lossless-group` npm org is free (public packages only); the operator's npm account is its owner. Version 0.11.0 was published by hand to create the package. CI then publishes through **npm trusted publishing**: on npmjs.com, package → Settings → Trusted Publisher → GitHub Actions, organization `lossless-group`, repository `lossless-flavored-markdown-package`, workflow `publish-npm.yml`. Until that is set, CI falls back to the `NPM_TOKEN` secret.

**CI pins pnpm 9; maintainers run pnpm 12.** Anything in `pnpm-workspace.yaml` must work on both. pnpm 9 requires a `packages` field there, and pnpm 12 blocks dependency build scripts unless they're allowed. So the file holds both:

```yaml
packages:
  - '.'

allowBuilds:
  esbuild: true      # tsup needs esbuild's install script
```

## Troubleshooting

| Symptom                                      | Likely cause                                          | Fix                                                       |
| -------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------- |
| `401 Unauthorized` from `npm.pkg.github.com` | Missing or expired GitHub token                       | Check `.npmrc` and `GITHUB_PACKAGES_TOKEN` env var       |
| Build hangs for 30+ seconds                  | OG fetch timeout too high                             | Drop `timeout` to 5000 in `ogFetch` config                |
| Popovers empty                               | OG fetch disabled or cache-miss without network       | Run `pnpm lfm:fetch-og` to pre-populate                   |
| Variant attribute typo passes silently       | `strictVariantAttributes: 'silent'`                   | Set to `'error'` in CI config                             |
| Wikilinks 404                                | Target collection not in `wikilinks.collections`      | Add the collection name to the array                      |
| Mermaid blocks render as code                | `mermaid.enabled: false` or Mermaid.js not loaded     | Enable in config; check the integration is included       |
| Callouts and citations missing in browser HTML | `remarkLfm` and `remarkRehype` chained in one processor | Parse with `parseMarkdown` first, then convert (see "In the browser") |
| `ogFetch is ignored` warning                 | Using `/browser`, which has no Open Graph fetching     | Fetch link previews at build time with the root entry     |
| `pnpm add @lossless-group/lfm` asks for a token | `.npmrc` maps `@lossless-group` to GitHub Packages   | Remove that line, or pass `--@lossless-group:registry=https://registry.npmjs.org` |
| `npm publish` fails with **404 Not Found** on `PUT …/@lossless-group%2flfm` | npm login expired; npm reports an unauthorized scoped publish as 404 | `npm login --registry=https://registry.npmjs.org`, check `npm whoami`, retry |
| `ERR_PNPM_IGNORED_BUILDS` (esbuild)          | pnpm 12 blocks build scripts not allowed              | Keep `allowBuilds: esbuild: true` in `pnpm-workspace.yaml` |
| CI: `packages field missing or empty`        | `pnpm-workspace.yaml` has no `packages` (CI is pnpm 9) | Add `packages: ['.']`                                   |
| CDN 404 right after publishing               | npm still processing the new version (a few minutes)  | Wait, then retry; jsDelivr follows npm                    |
