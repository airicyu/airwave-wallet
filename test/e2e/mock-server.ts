/**
 * Local stand-in for Helius activity, Jupiter token search, OpenRouter
 * single-turn chat and decisions, and the idle cluster's isBlockhashValid.
 * Runtime bodies: synthetic JSON under test/e2e/fixtures (override with
 * AIRWAVE_E2E_FIXTURES only). Does not mock Solana JSON-RPC for the active
 * cluster — that is solana-test-validator.
 * Run: bun test/e2e/mock-server.ts
 */
import path from "node:path";

const e2eDir = import.meta.dir;
const fixturesDir = path.resolve(
  process.env.AIRWAVE_E2E_FIXTURES || path.join(e2eDir, "fixtures"),
);
const port = Number(process.env.PORT || 8787);
const MOCK_BLOCKHASH = "11111111111111111111111111111111111111111111";

type RpcPayload = {
  id?: unknown;
  method?: unknown;
  params?: unknown[];
};

async function loadBody(rel: string): Promise<unknown> {
  const parsed = await Bun.file(path.join(fixturesDir, rel)).json();
  if (parsed && typeof parsed === "object" && "body" in parsed) {
    return (parsed as { body: unknown }).body;
  }
  return parsed;
}

const cors = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function rpcResult(id: unknown, result: unknown) {
  return { jsonrpc: "2.0", id: id ?? 1, result };
}

Bun.serve({
  hostname: "127.0.0.1",
  port,
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return json(204, {});
    try {
      if (req.method === "GET" && url.pathname === "/health") {
        return json(200, { ok: true, fixtures: "test/e2e/fixtures" });
      }
      if (req.method === "GET" && url.pathname === "/tokens/v2/search") {
        return json(200, await loadBody("jupiter/tokens-v2-search.json"));
      }
      if (req.method === "GET" && /^\/v0\/addresses\/([^/]+)\/transactions$/.test(url.pathname)) {
        const rel = url.searchParams.get("before")
          ? "helius/address-transactions-page2.json"
          : "helius/address-transactions-page1.json";
        return json(200, await loadBody(rel));
      }
      if (req.method === "POST" && url.pathname === "/api/v1/chat/completions") {
        return json(200, await loadBody("openrouter/chat-completions.json"));
      }
      if (req.method === "POST" && url.pathname === "/api/alpha/decisions") {
        return json(200, await loadBody("openrouter/decisions.json"));
      }
      if (req.method === "POST") {
        const payload = (await req.json().catch(() => null)) as RpcPayload | null;
        const method = payload?.method;
        const id = payload?.id;
        if (method === "isBlockhashValid") {
          const blockhash = payload?.params?.[0];
          return json(200, rpcResult(id, { value: blockhash === MOCK_BLOCKHASH }));
        }
        if (method === "getLatestBlockhash") {
          return json(200, rpcResult(id, {
            context: { slot: 1 },
            value: { blockhash: MOCK_BLOCKHASH, lastValidBlockHeight: 999 },
          }));
        }
        return json(404, { error: "mock has no handler for this JSON-RPC method", method });
      }
      return json(404, { error: "no mock", path: url.pathname });
    } catch (error) {
      return json(500, {
        error: error instanceof Error ? error.message : "mock failed",
        fixtures: "test/e2e/fixtures",
      });
    }
  },
});

console.log(`airwave e2e mock http://127.0.0.1:${port}`);
console.log("fixtures test/e2e/fixtures (or AIRWAVE_E2E_FIXTURES)");
console.log(`mock blockhash ${MOCK_BLOCKHASH}`);
