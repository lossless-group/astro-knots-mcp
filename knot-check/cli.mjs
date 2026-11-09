#!/usr/bin/env node
// knot-check: does this site follow the Astro Knots patterns?
//
//   knot-check [dir]            source checks: stack, JSX patterns, LFM, Vitest
//   knot-check [dir] --full     also runs vitest, astro check and the build, then checks dist/
//   knot-check components [dir] the design system: /design-system coverage, open @spike markers,
//                               oversized pages, raw colors and fonts outside the theme
//   knot-check dist [dir]       share, SEO and llms.txt checks on an existing dist/
//   knot-check share <url>      fetch a deployed page as each app's crawler
//   knot-check file <paths...>  the fast per-file checks (what the plugin hook runs)
//   knot-check doctor           is this machine set up?
//   --json                      machine-readable output

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { checkComponents, checkDist, checkFile, checkProject, checkShare } from "./checks.mjs";
import { RULES } from "./rules.mjs";

const args = process.argv.slice(2);
const json = args.includes("--json");
const full = args.includes("--full");
const positional = args.filter((a) => !a.startsWith("--"));

function run(cmd, cmdArgs, cwd) {
  const r = spawnSync(cmd, cmdArgs, { cwd, stdio: json ? "pipe" : "inherit", encoding: "utf8" });
  return r.status === 0;
}

function has(cmd) {
  return spawnSync(cmd, ["--version"], { encoding: "utf8" }).status === 0;
}

export function format(findings, title) {
  const errors = findings.filter((f) => RULES[f.rule]?.level === "error");
  const warns = findings.filter((f) => RULES[f.rule]?.level !== "error");
  const lines = [title];
  if (!findings.length) lines.push("  All clear.");
  const byRule = new Map();
  for (const f of [...errors, ...warns]) byRule.set(f.rule, [...(byRule.get(f.rule) ?? []), f]);
  for (const [id, fs] of byRule) {
    const r = RULES[id] ?? { level: "warn", title: id, fix: "" };
    lines.push("", `${r.level === "error" ? "✗" : "!"} ${r.title}  [${id}]`);
    for (const f of fs.slice(0, 8)) {
      const where = [f.file, f.line].filter(Boolean).join(":");
      lines.push(`    ${[where, f.detail].filter(Boolean).join("  ")}`.trimEnd());
    }
    if (fs.length > 8) lines.push(`    …and ${fs.length - 8} more`);
    lines.push(`    Fix: ${r.fix}`, `    Why: ${r.why}  (skill: ${r.pattern})`);
  }
  lines.push("", `${errors.length} error(s), ${warns.length} warning(s).`);
  return lines.join("\n");
}

function report(findings, title) {
  if (json) console.log(JSON.stringify({ findings }, null, 2));
  else console.log(format(findings, title));
  return findings.some((f) => RULES[f.rule]?.level === "error") ? 1 : 0;
}

async function main() {
  const [cmd, ...rest] = positional;

  if (cmd === "file") {
    const findings = rest.flatMap((p) => checkFile(resolve(p)));
    return report(findings, "knot-check: changed files");
  }

  if (cmd === "components") {
    const dir = resolve(rest[0] ?? ".");
    return report(checkComponents(dir), `knot-check: components and the /design-system catalog (${dir})`);
  }

  if (cmd === "dist") {
    const dir = resolve(rest[0] ?? ".");
    const dist = existsSync(resolve(dir, "dist")) ? resolve(dir, "dist") : dir;
    return report(checkDist(dist), `knot-check: built site (${dist})`);
  }

  if (cmd === "share") {
    if (!rest[0]) { console.error("Usage: knot-check share <url>"); return 2; }
    const { findings, rows } = await checkShare(rest[0]);
    if (!json) {
      console.log(`Share cards for ${rest[0]}\n`);
      for (const r of rows) {
        console.log(r.error ? `  ${r.app.padEnd(17)} error: ${r.error}` : `  ${r.app.padEnd(17)} ${String(r.count).padStart(1)} og:image  ${r.got.padEnd(7)}${r.want ? ` (best: ${r.want})` : ""}`);
      }
      console.log("");
    }
    return report(findings, "knot-check: share");
  }

  if (cmd === "doctor") {
    const findings = [];
    const major = Number(process.versions.node.split(".")[0]);
    if (major < 20) findings.push({ rule: "node-version", detail: `found ${process.versions.node}` });
    if (!has("pnpm")) findings.push({ rule: "pnpm" });
    if (!process.env.IDEOGRAM_API_KEY) findings.push({ rule: "ideogram-key" });
    if (!json) {
      console.log(`Node ${process.versions.node}, pnpm ${has("pnpm") ? "yes" : "no"}, nix ${has("nix") ? "yes" : "no (optional)"}, GITHUB_TOKEN ${process.env.GITHUB_TOKEN ? "set" : "not set (only for large GitHub content collections)"}\n`);
    }
    return report(findings, "knot-check: doctor");
  }

  const dir = resolve(cmd ?? ".");
  const findings = checkProject(dir);
  if (full) {
    if (!run("pnpm", ["exec", "vitest", "run"], dir)) findings.push({ rule: "tests-failing" });
    if (!run("pnpm", ["exec", "astro", "check"], dir)) findings.push({ rule: "astro-check-failing" });
    if (!run("pnpm", ["build"], dir)) findings.push({ rule: "build-failing" });
    else findings.push(...checkDist(resolve(dir, "dist")));
  }
  return report(findings, `knot-check: ${dir}${full ? " (full)" : ""}`);
}

// exitCode, not exit(): exit() can cut off large output still being written to a pipe.
main().then((code) => { process.exitCode = code; }, (err) => {
  console.error(err);
  process.exitCode = 2;
});
