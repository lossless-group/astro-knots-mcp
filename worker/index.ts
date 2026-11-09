// astro-knots-mcp: the link MCP. A remote MCP server anyone can add by URL.
//
// It serves Astro Knots' patterns, not anyone's data: skills, the getting-
// started playbook, and the guardrail rules with their explanations. No
// storage, no keys, no sign-in. It can't see the person's files, so checks
// run locally (knot-check, the plugin hook); this server explains them.
//
// Skills are bundled at build time from skills/ (worker/kit.generated.ts), the
// same folder the Claude Code and Codex plugins install, so all three front
// doors serve the same text.

import { KIT } from "./kit.generated";
import { RULES } from "../knot-check/rules.mjs";
import { CRAWLERS } from "../knot-check/crawlers.mjs";
import { landingPage } from "./landing";

const SERVER = { name: "astro-knots", version: "0.1.0" };
const PROTOCOLS = ["2025-06-18", "2025-03-26", "2024-11-05"];

const INSTRUCTIONS = [
  "Astro Knots helps someone build a website with their coding agent, following patterns honed across twenty Lossless Group sites: Astro with Svelte for interactivity, no React or JSX, Lossless Flavored Markdown, Vitest, two-tier theme tokens with three modes, and share images and SEO done right from the first commit.",
  "First time, or when someone says \"get started\" or \"make me a site\": call get_started and follow it.",
  "Before doing a kind of work (theming, share images, markdown, design tokens), load the matching skill with get_skill. list_skills shows them all.",
  "This server can't see the person's files. Checks run on their machine: `pnpm dlx --package=github:lossless-group/astro-knots-mcp knot-check . --full`. When a check fails, explain_check gives the full reason and fix for its rule id.",
  "Never put API keys in the repo. Ask before deploying anything.",
].join("\n\n");

type Tool = { name: string; description: string; inputSchema: Record<string, unknown> };

function front(text: string): { data: Record<string, string>; body: string } {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { data: {}, body: text };
  const data: Record<string, string> = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-zA-Z_-]+):\s*(.*)$/);
    if (kv) data[kv[1]] = kv[2].replace(/^["']|["']$/g, "");
  }
  return { data, body: text.slice(m[0].length).trimStart() };
}

export function skills(): { name: string; description: string }[] {
  return Object.keys(KIT)
    .map((p) => p.match(/^skills\/([^/]+)\/SKILL\.md$/)?.[1])
    .filter((n): n is string => Boolean(n))
    .map((name) => ({ name, description: front(KIT[`skills/${name}/SKILL.md`]).data.description ?? "" }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

const TOOLS: Tool[] = [
  {
    name: "get_started",
    description: "The playbook for setting someone up to build an Astro Knots site with their agent, from an empty folder to a deployed site that passes knot-check. Call it first, and whenever someone says get started, set me up, or make me a site.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "list_skills",
    description: "The Astro Knots skills: name and one-line description each. Load one with get_skill before doing that kind of work.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_skill",
    description: "One skill's instructions (SKILL.md), or one of its reference files. Load before theming, share images, markdown rendering, design tokens, changelogs or commits.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Skill name, from list_skills." },
        file: { type: "string", description: "Optional path inside the skill, e.g. references/unfurler-matrix.md. Omit for SKILL.md." },
      },
      required: ["name"],
    },
  },
  {
    name: "explain_check",
    description: "What a knot-check rule means, why it exists, and how to fix it. Pass the rule id from a knot-check result, or omit it to list every rule.",
    inputSchema: { type: "object", properties: { rule: { type: "string", description: "Rule id, e.g. og-image-count or jsx-classname." } } },
  },
  {
    name: "share_cards",
    description: "Which share image (tall or wide) each app shows best when a link is shared: iMessage, WhatsApp, X, LinkedIn, Facebook, Slack, Discord. Use when setting up OpenGraph images or debugging a preview.",
    inputSchema: { type: "object", properties: {} },
  },
];

const text = (t: string) => ({ content: [{ type: "text", text: t }] });

function call(name: string, args: Record<string, any>) {
  switch (name) {
    case "get_started":
      return text(front(KIT["skills/start-an-astro-knot/SKILL.md"]).body);
    case "list_skills":
      return text(skills().map((s) => `- ${s.name}: ${s.description}`).join("\n"));
    case "get_skill": {
      const skill = String(args.name ?? "").replace(/[^a-z0-9-]/gi, "");
      const file = String(args.file ?? "SKILL.md").replace(/^\/+/, "");
      const body = KIT[`skills/${skill}/${file}`];
      if (body !== undefined) return text(body);
      const has = Object.keys(KIT).filter((p) => p.startsWith(`skills/${skill}/`)).map((p) => p.slice(`skills/${skill}/`.length));
      if (!has.length) throw new Error(`No skill called "${skill}". Skills: ${skills().map((s) => s.name).join(", ")}`);
      throw new Error(`"${skill}" has no ${file}. Files: ${has.join(", ")}`);
    }
    case "explain_check": {
      const all = RULES as Record<string, { level: string; title: string; why: string; fix: string; pattern: string }>;
      if (args.rule) {
        const r = all[String(args.rule)];
        if (!r) throw new Error(`No rule "${args.rule}". Rules: ${Object.keys(all).join(", ")}`);
        return text(`${r.title} [${args.rule}, ${r.level}]\n\nWhy: ${r.why}\n\nFix: ${r.fix}\n\nPattern: load the ${r.pattern} skill.`);
      }
      return text(Object.entries(all).map(([id, r]) => `- ${id} (${r.level}): ${r.title}`).join("\n"));
    }
    case "share_cards":
      return text(
        [
          "Every page has exactly one og:image. Two og:image tags make iMessage mix them into one confused preview.",
          "Default (any host): the tall banner (1200x1600 JPEG) as og:image with its six tags; the wide banner (1200x630) only in twitter:image.",
          "Each app's preview crawler names itself in its user agent, so an edge layer (a Cloudflare Worker in front of the site) can serve each app its best card:",
          "",
          ...CRAWLERS.map((c) => `- ${c.app}: ${c.card}`),
          "",
          "iMessage sends \"facebookexternalhit/1.1 Facebot Twitterbot/1.0\", so match it before X and Facebook. Check a deployed page with: knot-check share <url>",
        ].join("\n"),
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

const PROMPTS = [
  { name: "start-an-astro-knot", description: "Set me up to build an Astro Knots website.", text: "Use Astro Knots: call get_started and set me up to build a website." },
];

export async function handle(msg: any): Promise<any | null> {
  const { id, method, params } = msg ?? {};
  const isNotification = id === undefined || id === null;
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });
  const fail = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

  switch (method) {
    case "initialize": {
      const requested = params?.protocolVersion;
      return reply({
        protocolVersion: PROTOCOLS.includes(requested) ? requested : PROTOCOLS[0],
        capabilities: { tools: {}, prompts: {} },
        serverInfo: SERVER,
        instructions: INSTRUCTIONS,
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools: TOOLS });
    case "tools/call":
      try {
        return reply(call(params?.name, params?.arguments ?? {}));
      } catch (err: any) {
        return reply({ ...text(`Error: ${err?.message ?? String(err)}`), isError: true });
      }
    case "prompts/list":
      return reply({ prompts: PROMPTS.map(({ text: _t, ...p }) => p) });
    case "prompts/get": {
      const p = PROMPTS.find((x) => x.name === params?.name);
      if (!p) return fail(-32602, `Unknown prompt: ${params?.name}`);
      return reply({ description: p.description, messages: [{ role: "user", content: { type: "text", text: p.text } }] });
    }
    case "resources/list":
      return reply({ resources: [] });
    case "resources/templates/list":
      return reply({ resourceTemplates: [] });
    default:
      return isNotification ? null : fail(-32601, `Method not found: ${method}`);
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const mcpUrl = `${url.origin}/mcp`;

    if (url.pathname === "/" && request.method === "GET") return landingPage(mcpUrl);

    if (url.pathname === "/mcp") {
      if (request.method === "GET") {
        if ((request.headers.get("accept") ?? "").includes("text/html")) return landingPage(mcpUrl);
        return new Response("This MCP server doesn't stream; POST JSON-RPC to /mcp.", { status: 405, headers: { allow: "POST" } });
      }
      if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
      let body: any;
      try {
        body = await request.json();
      } catch {
        return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
      }
      const out = Array.isArray(body) ? (await Promise.all(body.map(handle))).filter(Boolean) : await handle(body);
      if (out === null || (Array.isArray(out) && !out.length)) return new Response(null, { status: 202 });
      return Response.json(out);
    }

    return new Response("Not found", { status: 404 });
  },
};
