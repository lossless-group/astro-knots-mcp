// Copy the canonical Astro Knots skills into skills/, so the plugins (which
// install from this repo) and the Worker (which bundles skills/) carry them.
//
// The copies are generated: never edit them here. Edit the skill in
// lossless-agent-skills and run `pnpm sync-skills` again. Skills authored in
// this repo (start-an-astro-knot, knot-check) aren't in the list and are
// never touched.
//
// Source: SKILLS_SOURCE, or the lossless-monorepo's context-v/agent-skills.

import { cpSync, existsSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const source = resolve(process.env.SKILLS_SOURCE ?? join(root, "../../../context-v/agent-skills"));

export const SYNCED = [
  "write-site-narrative",
  "build-a-moodboard",
  "astro-knots",
  "theme-system",
  "lossless-flavored-markdown",
  "open-graph-share-seo-geo",
  "generate-consistent-og-images",
  "maintain-design-md",
  "maintain-design-system-page",
  "spike-then-refactor-into-components",
  "changelog-conventions",
  "git-conventions",
];

if (!existsSync(source)) {
  console.error(`sync-skills: no skills at ${source}. Set SKILLS_SOURCE to a lossless-agent-skills checkout.`);
  process.exit(1);
}

for (const name of SYNCED) {
  const from = join(source, name);
  if (!existsSync(join(from, "SKILL.md"))) {
    console.error(`sync-skills: ${name} has no SKILL.md at ${from}`);
    process.exit(1);
  }
  const to = join(root, "skills", name);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true, filter: (p) => !p.split("/").some((s) => s === ".DS_Store" || s === "node_modules") });
}

const count = (dir) => readdirSync(dir).reduce((n, f) => n + (statSync(join(dir, f)).isDirectory() ? count(join(dir, f)) : 1), 0);
writeFileSync(
  join(root, "skills", "SYNCED.md"),
  `# Generated skills\n\nThese folders are copied from [lossless-agent-skills](https://github.com/lossless-group/lossless-agent-skills) by \`pnpm sync-skills\`. Don't edit them here: edit the original and sync again.\n\n${SYNCED.map((n) => `- \`${n}\``).join("\n")}\n\nAuthored in this repo: \`start-an-astro-knot\`, \`knot-check\`.\n`,
);
console.log(`sync-skills: ${SYNCED.length} skills (${SYNCED.reduce((n, s) => n + count(join(root, "skills", s)), 0)} files) from ${source}`);
