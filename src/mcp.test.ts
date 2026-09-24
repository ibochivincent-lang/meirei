import { describe, it, expect } from "vitest";
import { POST, GET } from "../app/api/mcp/route";
import { NextRequest } from "next/server";

describe("/api/mcp JSON-RPC Protocol Endpoint", () => {
  it("responds to GET with MCP server discovery information", async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.name).toBe("meirei_mcp_server");
    expect(data.chain.id).toBe(196);
    expect(data.tools.length).toBeGreaterThan(0);
  });

  it("handles tools/list method via POST", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.jsonrpc).toBe("2.0");
    expect(data.id).toBe(1);
    expect(Array.isArray(data.result.tools)).toBe(true);
    expect(data.result.tools.some((t: { name: string }) => t.name === "meirei_xstock_quote")).toBe(true);
  });

  it("handles tools/call with meirei_xstock_quote", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "meirei_xstock_quote",
          arguments: { ticker: "NVDAx", amount_usdg: 100 },
        },
        id: 2,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.id).toBe(2);
    expect(data.result.content[0].type).toBe("text");
    const quotePayload = JSON.parse(data.result.content[0].text);
    expect(quotePayload.ticker).toBe("NVDAx");
    expect(quotePayload.chain_id).toBe(196);
  });

  it("returns JSON-RPC error -32601 for unknown tool name", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "non_existent_tool_xyz",
          arguments: {},
        },
        id: 3,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe(-32601);
  });

  it("returns JSON-RPC error -32600 for unsupported method", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "unsupported/method",
        id: 4,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.error).toBeDefined();
    expect(data.error.code).toBe(-32600);
  });
});
