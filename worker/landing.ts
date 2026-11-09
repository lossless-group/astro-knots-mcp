// The Worker's own front door: copy one prompt, paste it into your agent.
// The fuller version lives on the astro-knots splash
// (lossless-group.github.io/astro-knots/#build-a-site); keep the two in step.

export function connectPrompt(mcpUrl: string): string {
  return [
    "Set me up with Astro Knots, so you can help me build a website that follows The Lossless Group's patterns: Astro with Svelte, Lossless Flavored Markdown, tests, three color modes, and share images and SEO done right.",
    "",
    "Step 1. Install the Astro Knots plugin (its skills, plus a check that runs on every edit). Use whichever applies:",
    "- Claude Code: run  claude plugin marketplace add lossless-group/astro-knots-mcp  and then  claude plugin install astro-knots@astro-knots-mcp  then tell me to restart the session.",
    "- Codex: run  codex plugin marketplace add lossless-group/astro-knots-mcp  then tell me to open /plugins and install Astro Knots, then open /hooks and trust its hook (Codex skips plugin hooks until they're trusted).",
    "",
    `Step 2. Also add the Astro Knots MCP server, a remote server with no sign-in, at ${mcpUrl}`,
    `- Claude Code: claude mcp add --transport http astro-knots ${mcpUrl}`,
    `- Codex: add  [mcp_servers.astro-knots]  with  url = "${mcpUrl}"  to ~/.codex/config.toml`,
    "- Claude or ChatGPT apps: walk me through adding it as a custom connector.",
    "",
    'Step 3. Call Astro Knots\' get_started tool (or load the start-an-astro-knot skill) and follow it. Ask me what the site is for first. If the tools don\'t show up in this chat, tell me to start a new one and say "Use Astro Knots: get started".',
  ].join("\n");
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function landingPage(mcpUrl: string): Response {
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Astro Knots MCP</title>
<meta name="description" content="Build a website with your coding agent, following The Lossless Group's Astro Knots patterns.">
<style>
  :root { color-scheme: light dark; --ink: #17151c; --muted: #5e5a66; --paper: #f7f5f1; --card: #fff; --line: #e3dfd6; --accent: #6d28d9; }
  @media (prefers-color-scheme: dark) { :root { --ink: #eeeaf5; --muted: #a39fae; --paper: #121016; --card: #1b1820; --line: #2f2b36; --accent: #a78bfa; } }
  body { margin: 0; font: 16px/1.55 ui-sans-serif, system-ui, -apple-system, sans-serif; background: var(--paper); color: var(--ink); }
  main { max-width: 720px; margin: 0 auto; padding: 48px 16px 64px; }
  h1 { font-size: 36px; line-height: 1.1; margin: 0 0 8px; }
  p { color: var(--muted); }
  textarea { width: 100%; box-sizing: border-box; min-height: 300px; font: 13px/1.5 ui-monospace, monospace; padding: 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); color: var(--ink); }
  button { font: inherit; font-weight: 600; border: 0; border-radius: 999px; padding: 12px 22px; margin-top: 12px; cursor: pointer; background: var(--accent); color: #fff; }
  code { overflow-wrap: anywhere; }
</style></head>
<body><main>
<h1>Astro Knots</h1>
<p>Build a website with your coding agent, following patterns honed across twenty sites. Copy this prompt and paste it into Claude Code or Codex.</p>
<textarea id="prompt" readonly>${esc(connectPrompt(mcpUrl))}</textarea>
<button id="copy">Copy this prompt</button>
<p>MCP server: <code>${esc(mcpUrl)}</code>. No sign-in, and it stores nothing about you. More at <a href="https://lossless-group.github.io/astro-knots/">lossless-group.github.io/astro-knots</a>.</p>
<script>
  document.getElementById("copy").onclick = async (e) => {
    const t = document.getElementById("prompt");
    try { await navigator.clipboard.writeText(t.value); } catch (_) { t.select(); document.execCommand("copy"); }
    e.target.textContent = "Copied. Now paste it into your agent.";
  };
</script>
</main></body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
