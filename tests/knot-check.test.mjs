import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkAstroSource, checkComponents, checkDist, checkPackageJson, checkProject, checkTheme, imageInfo, shareInfo, checkShare } from "../knot-check/checks.mjs";
import { classify, CRAWLERS } from "../knot-check/crawlers.mjs";
import { RULES } from "../knot-check/rules.mjs";

const rules = (fs) => fs.map((f) => f.rule).sort();

describe("JSX patterns in .astro", () => {
  it("catches each React habit in the template, with its line", () => {
    const src = [
      "---",
      "const x = 1;",
      "---",
      '<div className="card">',
      '<label htmlFor="name">Name</label>',
      "<button onClick={go}>Go</button>",
      "<p style={{ color: 'red' }}>Hi</p>",
      "<>",
      "</>",
    ].join("\n");
    const f = checkAstroSource(src, "src/pages/index.astro");
    expect(rules(f)).toEqual(["jsx-camel-handler", "jsx-classname", "jsx-fragment", "jsx-fragment", "jsx-htmlfor", "jsx-style-object"]);
    expect(f.find((x) => x.rule === "jsx-classname").line).toBe(4);
  });

  it("leaves frontmatter, scripts, styles and comments alone", () => {
    const src = [
      "---",
      "const el = { className: 'x' };",
      "---",
      '<div class="card" class:list={["a", { b: true }]}>',
      "<!-- className= in a comment -->",
      "<script>",
      "  document.body.className = 'x';",
      "  const f = () => <></>;",
      "</script>",
      "<style>.card { color: red; }</style>",
      "<Fragment set:html={html} />",
    ].join("\n");
    expect(checkAstroSource(src, "x.astro")).toEqual([]);
  });
});

describe("package.json", () => {
  it("flags banned frameworks and workspace links", () => {
    const f = checkPackageJson({ dependencies: { react: "^19", astro: "^6", "@knots/tokens": "workspace:*" }, devDependencies: { "@astrojs/react": "^4" } });
    expect(rules(f)).toEqual(["banned-framework", "banned-framework", "workspace-dep"]);
  });

  it("accepts svelte and LFM from JSR", () => {
    expect(checkPackageJson({ dependencies: { svelte: "^5", "@lossless-group/lfm": "npm:@jsr/lossless-group__lfm@^0.7.0" } })).toEqual([]);
  });
});

describe("project", () => {
  function site(pkg, files = {}) {
    const dir = mkdtempSync(join(tmpdir(), "knot-"));
    writeFileSync(join(dir, "package.json"), JSON.stringify(pkg));
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(join(dir, p, ".."), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    return dir;
  }

  it("requires LFM wired in and Vitest configured", () => {
    expect(rules(checkProject(site({ dependencies: { astro: "^6" } })))).toEqual(["lfm-missing", "vitest-missing"]);
    const unwired = site({ dependencies: { "@lossless-group/lfm": "x" }, devDependencies: { vitest: "x" } }, { "vitest.config.ts": "" });
    expect(rules(checkProject(unwired))).toEqual(["lfm-unwired"]);
  });

  it("passes a site that follows the patterns, and flags a .tsx component", () => {
    const good = {
      "vitest.config.ts": "",
      "src/lib/markdown.ts": "import { parseMarkdown } from '@lossless-group/lfm';",
      "src/pages/index.astro": '<h1 class="title">Hi</h1>',
    };
    const pkg = { dependencies: { "@lossless-group/lfm": "x", svelte: "^5" }, devDependencies: { vitest: "x" } };
    expect(checkProject(site(pkg, good)).filter((f) => RULES[f.rule].level === "error")).toEqual([]);
    expect(rules(checkProject(site(pkg, { ...good, "src/components/Card.tsx": "" })))).toEqual(["jsx-file"]);
  });
});

describe("the design system: components, catalog, theme", () => {
  function site(files) {
    const dir = mkdtempSync(join(tmpdir(), "ds-"));
    for (const [p, body] of Object.entries(files)) {
      mkdirSync(join(dir, p, ".."), { recursive: true });
      writeFileSync(join(dir, p), body);
    }
    return dir;
  }
  const only = (fs, rule) => fs.filter((f) => f.rule === rule);

  it("warns when there's no /design-system page", () => {
    const f = checkComponents(site({ "src/components/Card.astro": "<div/>" }));
    expect(rules(f)).toEqual(["design-system-page"]);
  });

  it("lists components no catalog page mentions", () => {
    const f = checkComponents(site({
      "src/components/Card.astro": "<div/>",
      "src/components/Badge.svelte": "<span/>",
      "src/pages/design-system/index.astro": "---\nimport Card from '../../components/Card.astro';\n---\n<Card />",
    }));
    expect(only(f, "design-system-coverage").map((x) => x.file)).toEqual(["src/components/Badge.svelte"]);
  });

  it("lists open @spike markers with their line", () => {
    const f = checkComponents(site({ "src/pages/pricing.astro": "---\n// @spike pricing-page: refactor once approved\n---\n<h1>Hi</h1>" }));
    expect(only(f, "open-spike")).toEqual([{ rule: "open-spike", file: "src/pages/pricing.astro", line: 2, detail: "@spike pricing-page: refactor once approved" }]);
  });

  it("flags a long page that isn't marked as a spike", () => {
    const long = Array.from({ length: 260 }, (_, i) => `<p>${i}</p>`).join("\n");
    expect(only(checkComponents(site({ "src/pages/about.astro": long })), "refactor-candidate")).toHaveLength(1);
    expect(only(checkComponents(site({ "src/pages/about.astro": `---\n// @spike about\n---\n${long}` })), "refactor-candidate")).toHaveLength(0);
  });

  it("finds raw colors and fonts outside the theme, and nowhere else", () => {
    const f = checkTheme(site({
      "src/styles/theme.css": ":root { --color__sienna: #c2410c; --font__inter: 'Inter', sans-serif; }",
      "src/styles/prose.css": "p { color: var(--color-text); }\n.x { color: rgb(12 34 56); }",
      "src/components/Card.astro": [
        '<div class="card" style="color: #fff">',
        "<style>",
        "  #main { color: var(--color-text); }",
        "  .card { background: oklch(0.7 0.1 30); }",
        "  .card h3 { font-family: 'Inter', sans-serif; }",
        "  .card p { font-family: var(--font-body); }",
        "  .card a { color: color-mix(in oklab, var(--color-accent) 40%, transparent); }",
        "  .card hr { border-color: var(--border, #333); color: var(--muted, rgba(0, 0, 0, 0.5)); }",
        "</style>",
      ].join("\n"),
    }));
    expect(f.map((x) => `${x.file}:${x.line}`).sort()).toEqual([
      "src/components/Card.astro:1",
      "src/components/Card.astro:4",
      "src/components/Card.astro:5",
      "src/styles/prose.css:2",
    ]);
  });
});

// A 1x1 PNG with its header rewritten to the size we want to declare.
function png(width, height) {
  const b = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write("IHDR", 12, "ascii");
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

// The smallest JPEG header that carries a size: SOI, then a SOF0 segment.
function jpeg(width, height) {
  const b = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  b.writeUInt16BE(height, 13);
  b.writeUInt16BE(width, 15);
  return b;
}

describe("image sizes from bytes", () => {
  it("reads PNG and JPEG dimensions", () => {
    expect(imageInfo(png(1200, 1600))).toEqual({ type: "image/png", width: 1200, height: 1600 });
    expect(imageInfo(jpeg(1200, 630))).toEqual({ type: "image/jpeg", width: 1200, height: 630 });
    expect(imageInfo(Buffer.from("RIFF\0\0\0\0WEBPVP8 ", "ascii")).type).toBe("image/webp");
  });
});

const SITE = "https://example.com/my-site";
function head({ images = [["tall.jpg", 1200, 1600]], twitter = true, canonical = true } = {}) {
  const og = images
    .map(([f, w, h]) => `<meta property="og:image" content="${SITE}/${f}"><meta property="og:image:secure_url" content="${SITE}/${f}"><meta property="og:image:type" content="image/jpeg"><meta property="og:image:width" content="${w}"><meta property="og:image:height" content="${h}"><meta property="og:image:alt" content="A banner">`)
    .join("");
  const tw = twitter ? `<meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${SITE}/wide.jpg">` : "";
  const can = canonical ? `<link rel="canonical" href="${SITE}/">` : "";
  return `<html><head>${og}${tw}${can}</head><body></body></html>`;
}

function dist(html, extra = {}) {
  const dir = mkdtempSync(join(tmpdir(), "dist-"));
  writeFileSync(join(dir, "index.html"), html);
  writeFileSync(join(dir, "tall.jpg"), jpeg(1200, 1600));
  writeFileSync(join(dir, "wide.jpg"), jpeg(1200, 630));
  writeFileSync(join(dir, "sitemap-index.xml"), "<sitemapindex/>");
  writeFileSync(join(dir, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap-index.xml\n`);
  writeFileSync(join(dir, "llms.txt"), "# Site");
  for (const [p, body] of Object.entries(extra)) writeFileSync(join(dir, p), body);
  return dir;
}

describe("built site: share and SEO", () => {
  it("passes one tall og:image with all its tags", () => {
    expect(checkDist(dist(head()))).toEqual([]);
  });

  it("fails two og:image tags: the FantasyGM case", () => {
    const f = checkDist(dist(head({ images: [["wide.jpg", 1200, 630], ["tall.jpg", 1200, 1600]] })));
    expect(rules(f)).toContain("og-image-count");
  });

  it("warns when the only og:image is the wide banner", () => {
    expect(rules(checkDist(dist(head({ images: [["wide.jpg", 1200, 630]] }))))).toEqual(["share-not-tall"]);
  });

  it("fails declared sizes that don't match the file", () => {
    const f = checkDist(dist(head({ images: [["tall.jpg", 1200, 630]] })));
    expect(rules(f)).toContain("og-image-mismatch");
  });

  it("fails missing twitter tags, canonical, sitemap and robots", () => {
    const d = dist(head({ twitter: false, canonical: false }));
    writeFileSync(join(d, "robots.txt"), "User-agent: *\n");
    const f = checkDist(d);
    expect(rules(f)).toEqual(expect.arrayContaining(["twitter-tags", "canonical", "robots"]));
  });

  it("skips noindex pages (brand kit, design system, OG render targets)", () => {
    const d = dist(head(), { "og.html": '<html><head><meta name="robots" content="noindex, nofollow"></head></html>' });
    expect(checkDist(d)).toEqual([]);
  });

  it("reads tags whatever order their attributes are in", () => {
    const s = shareInfo('<meta content="https://x.com/a.jpg" property="og:image"><meta content="1600" property="og:image:height"><meta property=\'og:image:width\' content=\'1200\'>');
    expect(s.ogImages).toEqual(["https://x.com/a.jpg"]);
    expect(s.shape).toBe("tall");
  });
});

describe("crawlers", () => {
  it("knows iMessage by its Facebook-and-X disguise, before matching X or Facebook", () => {
    const ua = CRAWLERS.find((c) => c.app === "iMessage").sample;
    expect(classify(ua)).toMatchObject({ app: "iMessage", card: "tall" });
    expect(classify("Twitterbot/1.0")).toMatchObject({ app: "X", card: "wide" });
    expect(classify("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toMatchObject({ app: "Facebook" });
    expect(classify("WhatsApp/2.23.20.0 A")).toMatchObject({ card: "tall" });
    expect(classify("Mozilla/5.0 Safari/605.1.15")).toBeNull();
  });

  it("checkShare reports the card each app gets from a static page", async () => {
    const page = head();
    const { rows, findings } = await checkShare("https://x.test/", async () => new Response(page));
    expect(rows.find((r) => r.app === "iMessage")).toMatchObject({ count: 1, got: "tall", want: "tall" });
    expect(findings.filter((f) => f.rule === "share-per-app").map((f) => f.detail.split(" ")[0])).toEqual(["X", "LinkedIn", "Facebook", "Slack", "Discord"]);
  });
});

describe("rules", () => {
  it("every rule has the fields the CLI, hook and MCP print", () => {
    for (const [id, r] of Object.entries(RULES)) {
      expect(["error", "warn"], id).toContain(r.level);
      for (const k of ["title", "why", "fix", "pattern"]) expect(r[k], `${id}.${k}`).toBeTruthy();
    }
  });
});
