import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { changedFiles } from "../hooks/knot-hook.mjs";

const HOOK = fileURLToPath(new URL("../hooks/knot-hook.mjs", import.meta.url));

function project() {
  const dir = mkdtempSync(join(tmpdir(), "hook-"));
  mkdirSync(join(dir, "src/pages"), { recursive: true });
  writeFileSync(join(dir, "src/pages/bad.astro"), '<div className="x">Hi</div>\n');
  writeFileSync(join(dir, "src/pages/good.astro"), '<div class="x">Hi</div>\n');
  writeFileSync(join(dir, "package.json"), JSON.stringify({ dependencies: { react: "^19" } }));
  return dir;
}

function runHook(payload) {
  return spawnSync("node", [HOOK], { input: JSON.stringify(payload), encoding: "utf8" });
}

describe("which files an edit touched", () => {
  it("reads Claude Code's file_path", () => {
    expect(changedFiles({ cwd: "/p", tool_name: "Edit", tool_input: { file_path: "src/a.astro" } })).toEqual(["/p/src/a.astro"]);
  });

  it("reads Codex's apply_patch text", () => {
    const command = "*** Begin Patch\n*** Add File: src/a.astro\n+<div/>\n*** Update File: src/b.astro\n*** Move to: src/c.astro\n@@\n-x\n+y\n*** End Patch";
    expect(changedFiles({ cwd: "/p", tool_name: "apply_patch", tool_input: { command } })).toEqual(["/p/src/a.astro", "/p/src/b.astro", "/p/src/c.astro"]);
  });

  it("checks package.json after a package install, and ignores other shell commands", () => {
    expect(changedFiles({ cwd: "/p", tool_name: "Bash", tool_input: { command: "pnpm add react" } })).toEqual(["/p/package.json"]);
    expect(changedFiles({ cwd: "/p", tool_name: "Bash", tool_input: { command: "ls -la" } })).toEqual([]);
  });
});

describe("the hook, end to end", () => {
  it("blocks a Claude Code edit that adds className= (exit 2, reason on stderr)", () => {
    const dir = project();
    const r = runHook({ cwd: dir, hook_event_name: "PostToolUse", tool_name: "Write", tool_input: { file_path: join(dir, "src/pages/bad.astro") } });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("className=");
    expect(r.stderr).toContain("src/pages/bad.astro:1");
  });

  it("blocks the same edit arriving as a Codex patch", () => {
    const dir = project();
    const r = runHook({ cwd: dir, tool_name: "apply_patch", tool_input: { command: "*** Begin Patch\n*** Update File: src/pages/bad.astro\n*** End Patch" } });
    expect(r.status).toBe(2);
  });

  it("blocks pnpm add react", () => {
    const dir = project();
    const r = runHook({ cwd: dir, tool_name: "Bash", tool_input: { command: "pnpm add react" } });
    expect(r.status).toBe(2);
    expect(r.stderr).toContain("No React");
  });

  it("doesn't block on warnings (a <> fragment)", () => {
    const dir = project();
    writeFileSync(join(dir, "src/pages/frag.astro"), "<>Hi</>\n");
    expect(runHook({ cwd: dir, tool_name: "Edit", tool_input: { file_path: join(dir, "src/pages/frag.astro") } }).status).toBe(0);
  });

  it("lets clean edits and broken input through", () => {
    const dir = project();
    expect(runHook({ cwd: dir, tool_name: "Edit", tool_input: { file_path: join(dir, "src/pages/good.astro") } }).status).toBe(0);
    expect(spawnSync("node", [HOOK], { input: "not json", encoding: "utf8" }).status).toBe(0);
  });
});
