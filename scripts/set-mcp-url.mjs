// After deploying the Worker, write its MCP URL into both plugins' MCP config:
//   .mcp.json  (Claude Code, "type": "http")
//   mcp.json   (Codex and other Agent Plugins hosts, "type": "streamable-http")
// Until this runs, the plugins carry skills and hooks only, so nobody gets a
// broken server entry.
//
//   pnpm set-mcp-url https://astro-knots-mcp.<subdomain>.workers.dev/mcp

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const url = process.argv[2];
if (!url || !/^https:\/\/.+\/mcp$/.test(url)) {
  console.error("Usage: pnpm set-mcp-url https://<host>/mcp");
  process.exit(1);
}
const root = fileURLToPath(new URL("..", import.meta.url));
const write = (file, obj) => writeFileSync(join(root, file), JSON.stringify(obj, null, 2) + "\n");

write(".mcp.json", { mcpServers: { "astro-knots": { type: "http", url } } });
write("mcp.json", {
  $schema: "https://agent-plugins.org/schemas/1.0.0/mcp.schema.json",
  mcpServers: { "astro-knots": { type: "streamable-http", url } },
});
console.log(`set-mcp-url: .mcp.json and mcp.json now point at ${url}`);
