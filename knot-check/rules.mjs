// Every guardrail knot-check knows, in one place. The CLI, the plugin hook and
// the MCP's explain_check all read this list, so a rule's wording lives once.
//
// level: "error" fails the check; "warn" is reported but never blocks.
// pattern: the skill or doc that explains why the rule exists.

export const RULES = {
  // ---------------------------------------------------------------- stack
  "banned-framework": {
    level: "error",
    title: "No React, Preact, Solid or Angular",
    why: "Astro Knots sites use Astro for pages and Svelte for interactivity. A second UI framework doubles the bundle and the patterns.",
    fix: "Remove the dependency and its Astro integration. Rewrite the component as an .astro component, or as Svelte if it needs client-side state.",
    pattern: "astro-knots",
  },
  "jsx-file": {
    level: "error",
    title: "No .jsx or .tsx components",
    why: "JSX components pull React-style patterns into the site.",
    fix: "Rewrite it as an .astro component (or .svelte for interactivity). Plain .ts helpers are fine.",
    pattern: "astro-knots",
  },
  "jsx-classname": {
    level: "error",
    title: "className= in an .astro template",
    why: "React habit. Astro accepts it today, but it's not HTML and breaks class:list and scoped styles in surprising ways.",
    fix: 'Use class="..." (or class:list={[...]} for conditional classes).',
    pattern: "astro-knots",
  },
  "jsx-htmlfor": {
    level: "error",
    title: "htmlFor= in an .astro template",
    why: "React habit. The HTML attribute is for.",
    fix: 'Use for="field-id".',
    pattern: "astro-knots",
  },
  "jsx-camel-handler": {
    level: "error",
    title: "camelCase event handler (onClick={...}) in an .astro template",
    why: "Astro renders HTML on the server; a JSX handler never runs in the browser.",
    fix: "Add a <script> that calls addEventListener, or move the interactive part into a Svelte component.",
    pattern: "astro-knots",
  },
  "jsx-style-object": {
    level: "error",
    title: "style={{ ... }} object in an .astro template",
    why: "React habit. Inline style objects bypass the theme tokens.",
    fix: 'Use a class and a scoped <style> block that reads semantic tokens, or style="..." as a string.',
    pattern: "theme-system",
  },
  // A warning, not an error, until a decision: our own canonical
  // AstroMarkdown.astro (packages/lfm-astro) uses fragments, so an error here
  // would fail every site built from our pattern.
  "jsx-fragment": {
    level: "warn",
    title: "<>...</> fragment in an .astro template",
    why: "React habit. Usually there's no need for a wrapper at all in Astro.",
    fix: "Remove it, or use <Fragment> when a wrapper is genuinely needed (for set:html).",
    pattern: "astro-knots",
  },
  "workspace-dep": {
    level: "error",
    title: "workspace: dependency",
    why: "A site must deploy from its own repo. workspace: links only resolve inside a monorepo.",
    fix: "Depend on the published package instead, e.g. LFM from JSR: \"@lossless-group/lfm\": \"npm:@jsr/lossless-group__lfm@^0.7.0\".",
    pattern: "astro-knots",
  },
  "lfm-missing": {
    level: "error",
    title: "LFM (Lossless Flavored Markdown) isn't a dependency",
    why: "All markdown content renders through LFM, so callouts, citations and extended code fences work the same on every site.",
    fix: "Add \"@lossless-group/lfm\": \"npm:@jsr/lossless-group__lfm@^0.7.0\" to dependencies, with an .npmrc line: @jsr:registry=https://npm.jsr.io",
    pattern: "lossless-flavored-markdown",
  },
  "lfm-unwired": {
    level: "error",
    title: "LFM is installed but nothing imports it",
    why: "Installed isn't the same as used: content would render through some other pipeline.",
    fix: "Render markdown with parseMarkdown() from @lossless-group/lfm and the AstroMarkdown component.",
    pattern: "lossless-flavored-markdown",
  },
  "code-unhighlighted": {
    level: "warn",
    title: "Code blocks render in one color",
    why: "Astro's built-in Shiki never sees LFM content: it goes LFM -> MDAST -> AstroMarkdown -> CodeBlock. LFM's own highlighter has to be called there.",
    fix: "In CodeBlock.astro: import { highlightCode } from '@lossless-group/lfm/highlight' and render <pre><code set:html={await highlightCode(code, language)} /></pre>. Copy packages/lfm-astro/components/CodeBlock.astro.",
    pattern: "lossless-flavored-markdown",
  },
  "vitest-missing": {
    level: "error",
    title: "Vitest isn't set up",
    why: "Sites are test-driven. Vitest runs on Vite, which Astro is built on, so it works with no extra tooling.",
    fix: "pnpm add -D vitest, then add vitest.config.ts using getViteConfig() from astro/config, and a test for each loader, schema and component.",
    pattern: "astro-knots",
  },
  "tests-failing": {
    level: "error",
    title: "vitest run failed",
    why: "A failing test is a broken promise about how the site behaves.",
    fix: "Run pnpm exec vitest run and fix what fails.",
    pattern: "astro-knots",
  },
  "astro-check-failing": {
    level: "error",
    title: "astro check failed",
    why: "Type errors that pass the build still break pages.",
    fix: "Run pnpm exec astro check and fix what it reports.",
    pattern: "astro-knots",
  },
  "build-failing": {
    level: "error",
    title: "The site doesn't build",
    why: "Nothing else can be checked until it builds.",
    fix: "Run pnpm build and fix the first error.",
    pattern: "astro-knots",
  },

  // ---------------------------------------------------------------- components and the catalog
  // All warnings: spiking freely is allowed. These keep the refactor from being forgotten.
  "design-system-page": {
    level: "warn",
    title: "No /design-system page",
    why: "The in-site component catalog replaces Storybook: components render in the real theme and modes, and agents read it before building.",
    fix: "Create src/pages/design-system/index.astro (theme and mode toggle at the top, noindex) and add each component.",
    pattern: "maintain-design-system-page",
  },
  "design-system-coverage": {
    level: "warn",
    title: "Component missing from /design-system",
    why: "A component that isn't cataloged gets rebuilt instead of reused, and nobody sees when it breaks in a mode.",
    fix: "Add an entry (name, purpose, live render, variants, props, CSS contract, usage) in the same change as the component. A stub beats nothing.",
    pattern: "maintain-design-system-page",
  },
  "open-spike": {
    level: "warn",
    title: "Open spike: not yet refactored into components",
    why: "Spiking freely is how new UI gets made fast. Forgetting to refactor it back into the library is what slows the team down later.",
    fix: "Once it's approved: lock behavior with a snapshot test, extract components (reuse or extend before creating), catalog them, remove the @spike marker.",
    pattern: "spike-then-refactor-into-components",
  },
  "raw-design-value": {
    level: "warn",
    title: "Raw color or font outside the theme",
    why: "The theme is part of the design system. A hard-coded value can't follow light, dark and vibrant modes, and a brand change then has to be made file by file.",
    fix: "Add it as a named token at the top of theme.css (--color__name, --font__name), point a semantic token at it, and read the semantic token (var(--color-accent)) in the component.",
    pattern: "theme-system",
  },
  "refactor-candidate": {
    level: "warn",
    title: "Large page: a candidate to refactor into components",
    why: "Long page templates usually hold sections and repeated markup that other pages will want.",
    fix: "If it's approved work, refactor it into components (spike-then-refactor-into-components); if it's still a spike, mark it @spike.",
    pattern: "spike-then-refactor-into-components",
  },

  // ---------------------------------------------------------------- share and SEO (built site)
  "og-image-count": {
    level: "error",
    title: "A page must have exactly one og:image",
    why: "With two, iMessage on iPhone mixes the tall and wide banners into one confused preview. With none, there's no preview image.",
    fix: "Keep one og:image (the tall 1200x1600 banner by default) with its six tags, and put the wide 1200x630 banner only in twitter:image.",
    pattern: "open-graph-share-seo-geo",
  },
  "og-image-tags": {
    level: "error",
    title: "The og:image is missing some of its tags",
    why: "Width, height and type let apps lay the card out without downloading the image; alt is read aloud and used as a caption.",
    fix: "Emit og:image, og:image:secure_url, og:image:type, og:image:width, og:image:height and og:image:alt, from one MetaTags component.",
    pattern: "open-graph-share-seo-geo",
  },
  "twitter-tags": {
    level: "error",
    title: "twitter:card or twitter:image is missing",
    why: "X reads its own tags. The wide banner belongs here.",
    fix: 'Add <meta name="twitter:card" content="summary_large_image"> and twitter:image with the wide banner.',
    pattern: "open-graph-share-seo-geo",
  },
  "absolute-urls": {
    level: "error",
    title: "Share and canonical URLs must be absolute",
    why: "Apps fetching a preview don't know your domain; a relative URL is dropped.",
    fix: "Build URLs from Astro.site and import.meta.env.BASE_URL, starting with https://.",
    pattern: "open-graph-share-seo-geo",
  },
  "og-image-mismatch": {
    level: "error",
    title: "The og:image file doesn't match its tags",
    why: "If the declared size or type differs from the real file, some apps skip the image or lay it out wrong.",
    fix: "Make og:image:width, og:image:height and og:image:type match the file exactly.",
    pattern: "open-graph-share-seo-geo",
  },
  "og-image-format": {
    level: "error",
    title: "The og:image must be JPEG or PNG",
    why: "WebP previews are silently dropped by iMessage and WhatsApp.",
    fix: "Export the banner as JPEG (ffmpeg -i in.webp out.jpg).",
    pattern: "open-graph-share-seo-geo",
  },
  "empty-article-body": {
    level: "error",
    title: "A page shows its header over an empty body",
    why: "Usually content from a custom loader passed to Astro's render(): the loader stores raw markdown and no HTML, so render() builds cleanly and returns nothing.",
    fix: "Render the body through LFM: const tree = await parseMarkdown(entry.body), then <AstroMarkdown node={tree} /> (and <Sources citations={...} /> for citations).",
    pattern: "lossless-flavored-markdown",
  },
  canonical: {
    level: "error",
    title: "No canonical URL",
    why: "Search engines and AI answers need one stable address per page.",
    fix: 'Add <link rel="canonical" href="https://..."> in MetaTags.',
    pattern: "open-graph-share-seo-geo",
  },
  sitemap: {
    level: "error",
    title: "No sitemap",
    why: "Search engines find pages through it.",
    fix: "Add @astrojs/sitemap with the filter that excludes llms.txt and 404.",
    pattern: "open-graph-share-seo-geo",
  },
  robots: {
    level: "error",
    title: "No robots.txt with an absolute Sitemap: line",
    why: "Crawlers read robots.txt first and follow its Sitemap: line.",
    fix: "Add public/robots.txt with User-agent: *, Allow: / and Sitemap: https://<site>/sitemap-index.xml",
    pattern: "open-graph-share-seo-geo",
  },
  "share-not-tall": {
    level: "warn",
    title: "The default og:image isn't the tall banner",
    why: "iMessage and WhatsApp show tall cards much bigger and better, and that's where links get shared most.",
    fix: "Make the tall 1200x1600 banner the page's og:image and keep the wide one in twitter:image.",
    pattern: "generate-consistent-og-images",
  },
  "og-image-heavy": {
    level: "warn",
    title: "The og:image is over 500 KB",
    why: "WhatsApp skips preview images over about 600 KB, and every app is slower to show big ones.",
    fix: "Re-export at JPEG quality 80 to 85.",
    pattern: "open-graph-share-seo-geo",
  },
  "llms-txt": {
    level: "warn",
    title: "No llms.txt",
    why: "It hands AI models the site's content in one fetch.",
    fix: "Add src/pages/llms.txt.ts that assembles src/llms/llms.md.",
    pattern: "open-graph-share-seo-geo",
  },
  "share-per-app": {
    level: "warn",
    title: "An app got a different card shape than it shows best",
    why: "Chat apps (iMessage, WhatsApp) look best with the tall card, feeds (LinkedIn, Facebook, X) with the wide one. A static host serves everyone the same card.",
    fix: "Host on Cloudflare with the share-card edge layer, or accept the static default.",
    pattern: "open-graph-share-seo-geo",
  },

  // ---------------------------------------------------------------- setup (doctor)
  "node-version": {
    level: "error",
    title: "Node 20 or newer is needed",
    why: "Astro and the tools here need a current Node.",
    fix: "Install Node 22 (nix develop, or brew install node@22).",
    pattern: "astro-knots",
  },
  pnpm: {
    level: "error",
    title: "pnpm isn't installed",
    why: "Astro Knots sites use pnpm only.",
    fix: "corepack enable pnpm, or brew install pnpm.",
    pattern: "astro-knots",
  },
  "ideogram-key": {
    level: "warn",
    title: "IDEOGRAM_API_KEY isn't set",
    why: "It lets your agent keep generating share banners and images that match the site's DESIGN.md.",
    fix: "Get a key at ideogram.ai (set a spending cap), then add export IDEOGRAM_API_KEY=... to ~/.zshrc, never to the repo, and restart your agent.",
    pattern: "generate-consistent-og-images",
  },
};

export function rule(id) {
  return RULES[id] ? { id, ...RULES[id] } : null;
}
