// The checks. Each returns findings: { rule, file?, line?, detail? }.
// Pure functions where possible, so the hook, the CLI and the tests share them.

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { CRAWLERS } from "./crawlers.mjs";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", ".vercel", ".wrangler", ".netlify"]);

export function walk(dir, keep = () => true, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, keep, out);
    else if (keep(full)) out.push(full);
  }
  return out;
}

// ---------------------------------------------------------------- source files

// Blank out frontmatter, <script> and <style> contents, and HTML comments,
// keeping newlines so line numbers still point at the real line.
function templateOnly(text) {
  const blank = (s) => s.replace(/[^\n]/g, " ");
  let t = text;
  const fm = t.match(/^---\r?\n[\s\S]*?\r?\n---/);
  if (fm) t = blank(fm[0]) + t.slice(fm[0].length);
  t = t.replace(/(<script\b[^>]*>)([\s\S]*?)(<\/script>)/gi, (_, a, b, c) => a + blank(b) + c);
  t = t.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_, a, b, c) => a + blank(b) + c);
  t = t.replace(/<!--[\s\S]*?-->/g, blank);
  return t;
}

const JSX_PATTERNS = [
  ["jsx-classname", /\bclassName=/],
  ["jsx-htmlfor", /\bhtmlFor=/],
  ["jsx-camel-handler", /\son[A-Z][A-Za-z]*=\{/],
  ["jsx-style-object", /\bstyle=\{\{/],
  ["jsx-fragment", /<>|<\/>/],
];

/** JSX patterns in an .astro file's template (not its frontmatter, scripts or styles). */
export function checkAstroSource(text, file) {
  const findings = [];
  templateOnly(text).split("\n").forEach((line, i) => {
    for (const [rule, re] of JSX_PATTERNS) {
      const m = line.match(re);
      if (m) findings.push({ rule, file, line: i + 1, detail: text.split("\n")[i].trim().slice(0, 120) });
    }
  });
  return findings;
}

const BANNED = [
  "react", "react-dom", "@astrojs/react", "preact", "@astrojs/preact",
  "solid-js", "@astrojs/solid-js", "@angular/core", "@analogjs/astro-angular",
];

/** Banned frameworks and workspace: links in a package.json. */
export function checkPackageJson(pkg, file = "package.json") {
  const findings = [];
  const all = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies };
  for (const [name, spec] of Object.entries(all)) {
    if (BANNED.includes(name)) findings.push({ rule: "banned-framework", file, detail: name });
    if (String(spec).startsWith("workspace:")) findings.push({ rule: "workspace-dep", file, detail: `${name}: ${spec}` });
  }
  return findings;
}

/** The fast per-file checks the hook runs after every edit. */
export function checkFile(path, root = process.cwd()) {
  const rel = relative(root, path) || path;
  const ext = extname(path);
  if (ext === ".jsx" || ext === ".tsx") return [{ rule: "jsx-file", file: rel }];
  if (!existsSync(path)) return [];
  if (ext === ".astro") return checkAstroSource(readFileSync(path, "utf8"), rel);
  if (path.endsWith("package.json") && !path.includes("node_modules")) {
    try {
      return checkPackageJson(JSON.parse(readFileSync(path, "utf8")), rel);
    } catch {
      return [];
    }
  }
  return [];
}

// ---------------------------------------------------------------- the theme

// Where raw values belong: the theme and token files themselves.
const THEME_FILE = /(^|\/)(theme|tokens?|fonts?)[\w.-]*\.css$/i;
const RAW_VALUES = [
  /:\s*[^;{}]*#[0-9a-fA-F]{3,8}\b/, // color: #c2410c (a value, not an #id selector)
  /\b(rgba?|hsla?|oklch|oklab|lab|lch)\(\s*[\d.]/, // rgb(12 34 56), oklch(0.7 ...)
  /\bfont-family\s*:\s*(?!\s*(var\(|inherit|initial|unset|revert))/, // font-family: 'Inter', sans-serif
];

/** Lines of CSS in a file: a whole .css file, or an .astro/.svelte file's <style> blocks and style="" attributes. */
export function styleLines(text, file) {
  const lines = text.split("\n");
  if (file.endsWith(".css")) return lines.map((l, i) => [i + 1, l]);
  const out = [];
  let inStyle = false;
  lines.forEach((l, i) => {
    if (/<style\b/i.test(l)) inStyle = true;
    if (inStyle) out.push([i + 1, l]);
    else for (const m of l.matchAll(/\bstyle=["']([^"']*)["']/g)) out.push([i + 1, m[1]]);
    if (/<\/style>/i.test(l)) inStyle = false;
  });
  return out;
}

/** Hard-coded colors and fonts outside the theme files: design debt to refactor onto tokens. */
export function checkTheme(root) {
  const findings = [];
  const src = join(root, "src");
  for (const f of walk(src, (p) => /\.(astro|svelte|css)$/.test(p))) {
    const rel = relative(root, f);
    if (THEME_FILE.test(rel)) continue;
    for (const [line, css] of styleLines(readFileSync(f, "utf8"), f)) {
      if (/^\s*(\/\/|\/\*|\*)/.test(css)) continue;
      // var(--token, #fff) reads a token; its fallback isn't the debt we're after.
      const bare = css.replace(/var\((?:[^()]|\([^()]*\))*\)/g, "var()");
      if (RAW_VALUES.some((re) => re.test(bare))) findings.push({ rule: "raw-design-value", file: rel, line, detail: css.trim().slice(0, 100) });
    }
  }
  return findings;
}

// ---------------------------------------------------------------- components

const PAGE_LINES_LIMIT = 250;
const CATALOG = /(^|\/)(design-system|brand-kit)(\/|\.astro$)|(^|\/)component-library\.astro$/;

/** The component library against its catalog: missing /design-system, uncatalogued components, open spikes, oversized pages. */
export function checkComponents(root) {
  const findings = [];
  const src = join(root, "src");
  const pagesDir = join(src, "pages");
  const catalogFiles = walk(pagesDir, (p) => /\.(astro|md|mdx|ts)$/.test(p)).filter((p) => CATALOG.test(relative(pagesDir, p)));
  const components = walk(join(src, "components"), (p) => /\.(astro|svelte)$/.test(p));

  if (!catalogFiles.some((p) => /design-system|component-library/.test(p))) {
    if (components.length) findings.push({ rule: "design-system-page", detail: `${components.length} components, no catalog page` });
  } else {
    const catalog = catalogFiles.map((p) => readFileSync(p, "utf8")).join("\n");
    for (const c of components) {
      const name = c.split("/").pop().replace(/\.(astro|svelte)$/, "");
      if (!catalog.includes(name)) findings.push({ rule: "design-system-coverage", file: relative(root, c) });
    }
  }

  for (const f of walk(src, (p) => /\.(astro|svelte|ts|mjs|js|md|mdx|css)$/.test(p))) {
    const lines = readFileSync(f, "utf8").split("\n");
    const i = lines.findIndex((l) => l.includes("@spike"));
    if (i >= 0) findings.push({ rule: "open-spike", file: relative(root, f), line: i + 1, detail: lines[i].replace(/^[\s/*<!-]+|[-!>*/\s]+$/g, "").slice(0, 100) });
  }

  for (const p of walk(pagesDir, (x) => x.endsWith(".astro"))) {
    if (CATALOG.test(relative(pagesDir, p))) continue;
    const text = readFileSync(p, "utf8");
    if (text.includes("@spike")) continue;
    const lines = templateOnly(text).split("\n").filter((l) => l.trim()).length;
    if (lines > PAGE_LINES_LIMIT) findings.push({ rule: "refactor-candidate", file: relative(root, p), detail: `${lines} template lines` });
  }
  return [...findings, ...checkTheme(root)];
}

/** Every source check across a project: the stack rules, without running anything. */
export function checkProject(root) {
  const findings = [...checkComponents(root)];
  const src = join(root, "src");
  for (const f of walk(src, (p) => /\.(astro|jsx|tsx)$/.test(p))) findings.push(...checkFile(f, root));

  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) return findings;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  findings.push(...checkPackageJson(pkg));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  if (!deps["@lossless-group/lfm"]) findings.push({ rule: "lfm-missing", file: "package.json" });
  else {
    const uses = walk(src, (p) => /\.(astro|ts|mjs|js)$/.test(p)).some((f) => readFileSync(f, "utf8").includes("@lossless-group/lfm"));
    if (!uses) findings.push({ rule: "lfm-unwired" });
  }

  const vitestConfig = readdirSync(root).some((n) => /^vitest\.config\.(ts|mts|js|mjs)$/.test(n));
  if (!deps.vitest || !vitestConfig) {
    findings.push({ rule: "vitest-missing", detail: !deps.vitest ? "vitest isn't a dependency" : "no vitest.config.ts" });
  }
  return findings;
}

// ---------------------------------------------------------------- built site

/** Attributes of every <meta> and <link> tag in an HTML document. */
export function headTags(html) {
  const tags = [];
  for (const m of html.matchAll(/<(meta|link)\b([^>]*)>/gi)) {
    const attrs = {};
    for (const a of m[2].matchAll(/([a-zA-Z:_-]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) {
      attrs[a[1].toLowerCase()] = (a[3] ?? a[4] ?? "").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
    }
    tags.push({ tag: m[1].toLowerCase(), ...attrs });
  }
  return tags;
}

const prop = (tags, name) => tags.filter((t) => t.tag === "meta" && (t.property === name || t.name === name)).map((t) => t.content ?? "");

/** The share tags of one page, as the app reading them would see them. */
export function shareInfo(html) {
  const tags = headTags(html);
  const ogImages = prop(tags, "og:image");
  const width = Number(prop(tags, "og:image:width")[0]);
  const height = Number(prop(tags, "og:image:height")[0]);
  return {
    tags,
    ogImages,
    width,
    height,
    shape: width && height ? (height > width ? "tall" : "wide") : "unknown",
    type: prop(tags, "og:image:type")[0],
    twitterImage: prop(tags, "twitter:image")[0],
    twitterCard: prop(tags, "twitter:card")[0],
    canonical: tags.find((t) => t.tag === "link" && t.rel === "canonical")?.href,
  };
}

/** Real pixel size and type of a JPEG or PNG, from its bytes. */
export function imageInfo(buf) {
  if (buf.length > 24 && buf[0] === 0x89 && buf.toString("ascii", 1, 4) === "PNG") {
    return { type: "image/png", width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i + 1];
      const len = buf.readUInt16BE(i + 2);
      const isSOF = marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker);
      if (isSOF) return { type: "image/jpeg", height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + len;
    }
    return { type: "image/jpeg" };
  }
  if (buf.length > 12 && buf.toString("ascii", 0, 4) === "RIFF" && buf.toString("ascii", 8, 12) === "WEBP") return { type: "image/webp" };
  return { type: "unknown" };
}

// The local file an absolute image URL points at, trying the path with and
// without its leading segments (a GitHub Pages base path, say).
function localFile(dist, url) {
  let path;
  try { path = decodeURIComponent(new URL(url).pathname); } catch { return null; }
  const parts = path.split("/").filter(Boolean);
  for (let i = 0; i < parts.length; i++) {
    const candidate = join(dist, ...parts.slice(i));
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

/** Share, SEO and model-facing checks over a built site's dist/ folder. */
export function checkDist(dist) {
  const findings = [];
  const pages = walk(dist, (p) => p.endsWith(".html")).filter((p) => !/(^|\/)404(\/index)?\.html$/.test(relative(dist, p)));
  const checkedImages = new Set();

  for (const page of pages) {
    const file = relative(dist, page);
    const s = shareInfo(readFileSync(page, "utf8"));
    // Pages kept out of search (brand kit, design system, OG render targets)
    // aren't meant to be shared or indexed, so they don't need share tags.
    if (s.tags.some((t) => t.tag === "meta" && t.name === "robots" && /noindex/i.test(t.content ?? ""))) continue;

    if (s.ogImages.length !== 1) {
      findings.push({ rule: "og-image-count", file, detail: `${s.ogImages.length} og:image tags` });
    }
    const missing = ["og:image:secure_url", "og:image:type", "og:image:width", "og:image:height", "og:image:alt"]
      .filter((n) => prop(s.tags, n).length === 0);
    if (s.ogImages.length && missing.length) findings.push({ rule: "og-image-tags", file, detail: `missing ${missing.join(", ")}` });
    if (!s.twitterCard || !s.twitterImage) findings.push({ rule: "twitter-tags", file });
    if (!s.canonical) findings.push({ rule: "canonical", file });

    const urls = [...s.ogImages, s.twitterImage, s.canonical].filter(Boolean);
    const relativeUrls = urls.filter((u) => !/^https:\/\//.test(u));
    if (relativeUrls.length) findings.push({ rule: "absolute-urls", file, detail: relativeUrls.join(", ") });

    if (s.ogImages.length === 1 && s.shape === "wide") findings.push({ rule: "share-not-tall", file });

    const img = s.ogImages[0];
    if (img && !checkedImages.has(img)) {
      checkedImages.add(img);
      const local = localFile(dist, img);
      if (local) {
        const buf = readFileSync(local);
        const real = imageInfo(buf);
        if (real.type === "image/webp") findings.push({ rule: "og-image-format", file, detail: img });
        const sizeOff = real.width && (real.width !== s.width || real.height !== s.height);
        const typeOff = s.type && real.type !== "unknown" && s.type !== real.type;
        if (sizeOff || typeOff) {
          findings.push({ rule: "og-image-mismatch", file, detail: `declared ${s.width}x${s.height} ${s.type ?? "?"}, file is ${real.width}x${real.height} ${real.type}` });
        }
        if (buf.length > 500 * 1024) findings.push({ rule: "og-image-heavy", file, detail: `${Math.round(buf.length / 1024)} KB` });
      }
    }
  }

  if (!existsSync(join(dist, "sitemap-index.xml")) && !existsSync(join(dist, "sitemap.xml"))) findings.push({ rule: "sitemap" });
  const robots = join(dist, "robots.txt");
  if (!existsSync(robots) || !/^Sitemap:\s*https:\/\//im.test(readFileSync(robots, "utf8"))) findings.push({ rule: "robots" });
  if (!existsSync(join(dist, "llms.txt"))) findings.push({ rule: "llms-txt" });
  return findings;
}

// ---------------------------------------------------------------- deployed site

/** Fetch a page as each app's crawler and report the card each one gets. */
export async function checkShare(url, fetchImpl = fetch) {
  const findings = [];
  const rows = [];
  const visitors = [...CRAWLERS, { app: "Browser / search", card: null, sample: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15" }];
  for (const c of visitors) {
    let s;
    try {
      const res = await fetchImpl(url, { headers: { "user-agent": c.sample }, redirect: "follow" });
      s = shareInfo(await res.text());
    } catch (err) {
      rows.push({ app: c.app, error: String(err?.message ?? err) });
      continue;
    }
    rows.push({ app: c.app, want: c.card, got: s.shape, count: s.ogImages.length, image: s.ogImages[0] });
    if (s.ogImages.length !== 1) findings.push({ rule: "og-image-count", detail: `${c.app} got ${s.ogImages.length} og:image tags` });
    else if (c.card && s.shape !== c.card) findings.push({ rule: "share-per-app", detail: `${c.app} got the ${s.shape} card; it shows ${c.card} best` });
  }
  return { findings, rows };
}
