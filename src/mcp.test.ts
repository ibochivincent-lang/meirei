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

  it("handles tools/call with meirei_create_mandate and varies with input", async () => {
    const req1 = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "meirei_create_mandate",
          arguments: {
            strategy: "drift_rebalance",
            target_weights: { NVDAx: 70, AAPLx: 30 },
            threshold_pct: 4.5,
          },
        },
        id: 10,
      }),
    });

    const res1 = await POST(req1);
    const data1 = await res1.json();
    expect(res1.status).toBe(200);
    const mandate1 = JSON.parse(data1.result.content[0].text);
    expect(mandate1.mandate_id).toBeDefined();
    expect(mandate1.target_weights.NVDAx).toBe(70);
    expect(mandate1.target_weights.AAPLx).toBe(30);
    expect(mandate1.threshold_pct).toBe(4.5);

    const req2 = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "meirei_create_mandate",
          arguments: {
            strategy: "circuit_breaker",
            target_weights: { TSLAx: 50, MSFTx: 50 },
            max_drawdown_pct: 8.0,
          },
        },
        id: 11,
      }),
    });

    const res2 = await POST(req2);
    const data2 = await res2.json();
    const mandate2 = JSON.parse(data2.result.content[0].text);
    expect(mandate2.mandate_id).toBeDefined();
    expect(mandate2.mandate_id).not.toBe(mandate1.mandate_id);
    expect(mandate2.target_weights.TSLAx).toBe(50);
    expect(mandate2.strategy).toBe("circuit_breaker");
  });

  it("handles tools/call with meirei_check_drift and calculates real drift", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "meirei_check_drift",
          arguments: {
            wallet_address: "0x7f1710ec42211604a441be5e947a1be34d5ea4e4",
            target_weights: { NVDAx: 50, AAPLx: 50 },
            threshold_pct: 2.0,
          },
        },
        id: 12,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    const result = JSON.parse(data.result.content[0].text);
    expect(result.target_weights.NVDAx).toBe(50);
    expect(result.target_weights.AAPLx).toBe(50);
    expect(result.threshold_pct).toBe(2.0);
    expect(typeof result.max_drift_pct).toBe("number");
    expect(Array.isArray(result.legs)).toBe(true);
  });

  it("handles tools/call with meirei_execute_rebalance", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "meirei_execute_rebalance",
          arguments: {
            wallet_address: "0x7f1710ec42211604a441be5e947a1be34d5ea4e4",
            trades: [
              { from_token: "USDG", to_token: "NVDAx", amount_usdg: 25 },
            ],
          },
        },
        id: 13,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    const result = JSON.parse(data.result.content[0].text);
    expect(result.status).toBe("intent_calldata_ready");
    expect(result.trades_count).toBe(1);
    expect(result.total_notional_usd).toBe(25);
    expect(result.router_address).toBe("0x4ae4E9B8D0d5248A31A980998F4aA3F631167BA4");
    expect(result.approval_signing_url).toContain("/app?action=sign");
  });

  it("handles tools/call with meirei_circuit_breaker", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "meirei_circuit_breaker",
          arguments: {
            wallet_address: "0x7f1710ec42211604a441be5e947a1be34d5ea4e4",
            max_drawdown_pct: 5.0,
          },
        },
        id: 14,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    const result = JSON.parse(data.result.content[0].text);
    expect(result.circuit_breaker_status).toBeDefined();
    expect(result.max_allowable_drawdown_pct).toBe(5.0);
    expect(typeof result.breached).toBe("boolean");
  });

  it("handles tools/call with meirei_get_portfolio", async () => {
    const req = new NextRequest("http://localhost:3000/api/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "tools/call",
        params: {
          name: "meirei_get_portfolio",
          arguments: {
            wallet_address: "0x7f1710ec42211604a441be5e947a1be34d5ea4e4",
          },
        },
        id: 15,
      }),
    });

    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    const result = JSON.parse(data.result.content[0].text);
    expect(result.chain_id).toBe(196);
    expect(result.network).toBe("OKX X Layer");
    expect(Array.isArray(result.holdings)).toBe(true);
    expect(typeof result.total_portfolio_value_usdg).toBe("number");
  });
});
