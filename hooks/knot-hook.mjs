#!/usr/bin/env node
// Plugin hook, shared by Claude Code and Codex: after the agent edits files,
// run knot-check's fast per-file checks on just those files and hand any
// failure straight back to the model (exit 2, reason on stderr).
//
// The two harnesses describe an edit differently:
//   Claude Code: Write/Edit/MultiEdit with tool_input.file_path
//   Codex:       apply_patch, the patch text in tool_input.command
//                ("*** Add File: <path>", "*** Update File: <path>", "*** Move to: <path>")
// After a shell command that adds packages, package.json is checked too.
//
// Fails open: anything unexpected lets the work through. This hook must never
// be the reason work can't happen.

import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { checkFile } from "../knot-check/checks.mjs";
import { RULES } from "../knot-check/rules.mjs";

export function changedFiles(payload) {
  const input = payload?.tool_input ?? {};
  const cwd = payload?.cwd || process.cwd();
  const tool = payload?.tool_name ?? "";
  if (typeof input.file_path === "string") return [resolve(cwd, input.file_path)];
  if (tool === "apply_patch" || /^\*\*\* Begin Patch/m.test(String(input.command ?? ""))) {
    const paths = [];
    for (const m of String(input.command ?? "").matchAll(/^\*\*\* (?:Add File|Update File|Move to): (.+)$/gm)) {
      paths.push(resolve(cwd, m[1].trim()));
    }
    return paths;
  }
  if (tool === "Bash" && /\b(pnpm|npm|yarn|bun)\b.*\b(add|install|i)\b/.test(String(input.command ?? ""))) {
    return [resolve(cwd, "package.json")];
  }
  return [];
}

export function message(findings) {
  const lines = ["Astro Knots check failed on the edit you just made:"];
  for (const f of findings) {
    const r = RULES[f.rule];
    lines.push(`- ${[f.file, f.line].filter(Boolean).join(":")} ${r.title}${f.detail ? `: ${f.detail}` : ""}`, `  Fix: ${r.fix}`);
  }
  lines.push("Fix these and carry on. (Load the astro-knots skill for the patterns behind them.)");
  return lines.join("\n");
}

async function main() {
  let raw = "";
  for await (const chunk of process.stdin) raw += chunk;
  const payload = JSON.parse(raw);
  const cwd = payload?.cwd || process.cwd();
  const findings = changedFiles(payload)
    .flatMap((p) => checkFile(p, cwd))
    .filter((f) => RULES[f.rule]?.level === "error");
  if (!findings.length) return 0;
  process.stderr.write(message(findings) + "\n");
  return 2;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().then((code) => process.exit(code), () => process.exit(0));
}
