import { describe, expect, it } from "vitest";
import worker from "../worker/index";

const rpc = async (method: string, params: unknown = {}, id: number | null = 1) => {
  const res = await worker.fetch(
    new Request("https://knots.test/mcp", {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json, text/event-stream" },
      body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
    }),
  );
  return { status: res.status, body: res.status === 202 ? null : ((await res.json()) as any) };
};

const toolText = async (name: string, args: Record<string, unknown> = {}) =>
  (await rpc("tools/call", { name, arguments: args })).body.result;

describe("link MCP", () => {
  it("initializes with instructions and the requested protocol", async () => {
    const { body } = await rpc("initialize", { protocolVersion: "2025-06-18" });
    expect(body.result.protocolVersion).toBe("2025-06-18");
    expect(body.result.serverInfo.name).toBe("astro-knots");
    expect(body.result.instructions).toContain("get_started");
  });

  it("answers notifications with 202 and no body", async () => {
    expect((await rpc("notifications/initialized", {}, null)).status).toBe(202);
  });

  it("lists its tools", async () => {
    const { body } = await rpc("tools/list");
    expect(body.result.tools.map((t: any) => t.name)).toEqual(["get_started", "list_skills", "get_skill", "explain_check", "share_cards"]);
  });

  it("serves the getting-started playbook without its frontmatter", async () => {
    const r = await toolText("get_started");
    expect(r.content[0].text).toMatch(/^# Start an Astro Knot/);
  });

  it("serves synced and local skills, and their reference files", async () => {
    const list = (await toolText("list_skills")).content[0].text;
    for (const name of ["astro-knots", "theme-system", "open-graph-share-seo-geo", "knot-check", "start-an-astro-knot"]) expect(list).toContain(`- ${name}:`);
    expect((await toolText("get_skill", { name: "knot-check" })).content[0].text).toContain("# knot-check");
    expect((await toolText("get_skill", { name: "open-graph-share-seo-geo", file: "references/unfurler-matrix.md" })).content[0].text).toContain("iMessage");
  });

  it("says what exists when a skill or file is missing", async () => {
    const r = await toolText("get_skill", { name: "nope" });
    expect(r.isError).toBe(true);
    expect(r.content[0].text).toContain("astro-knots");
  });

  it("explains a rule, and lists them all", async () => {
    expect((await toolText("explain_check", { rule: "og-image-count" })).content[0].text).toContain("exactly one og:image");
    expect((await toolText("explain_check")).content[0].text).toContain("- jsx-classname (error)");
  });

  it("serves the share-card table with iMessage tall", async () => {
    expect((await toolText("share_cards")).content[0].text).toContain("- iMessage: tall");
  });

  it("serves the copy-a-prompt page at / with its own MCP URL", async () => {
    const res = await worker.fetch(new Request("https://knots.test/"));
    const html = await res.text();
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(html).toContain("claude mcp add --transport http astro-knots https://knots.test/mcp");
    expect(html).toContain("claude plugin install astro-knots@astro-knots-mcp");
  });
});
