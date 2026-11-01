/**
 * Local stand-in for Helius activity, Jupiter token search, OpenRouter
 * single-turn chat and decisions, and the idle cluster's isBlockhashValid.
 * Fixture files stay in the recordings tree (AIRWAVE_RECORDINGS).
 * Run: bun test/e2e/mock-server.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const recordings = path.resolve(
  process.env.AIRWAVE_RECORDINGS ||
    path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../airwave-wallet-api-recording"),
);
const port = Number(process.env.PORT || 8787);
const MOCK_BLOCKHASH = "11111111111111111111111111111111111111111111";

async function loadBody(rel) {
  const text = await Bun.file(path.join(recordings, rel)).text();
  const parsed = JSON.parse(text);
  if (parsed && typeof parsed === "object" && "body" in parsed) return parsed.body;
  return parsed;
}

const cors = {
  "content-type": "application/json",
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

function json(status, body) {
  return new Response(JSON.stringify(body), { status, headers: cors });
}

function rpcResult(id, result) {
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
        return json(200, { ok: true, recordings });
      }
      if (req.method === "GET" && url.pathname === "/tokens/v2/search") {
        return json(200, await loadBody("fixtures/jupiter/jupiter-tokens-v2-search__mainnet/response.json"));
      }
      if (req.method === "GET" && /^\/v0\/addresses\/([^/]+)\/transactions$/.test(url.pathname)) {
        const rel = url.searchParams.get("before")
          ? "fixtures/helius/helius-v0-addresses-transactions__page2__mainnet/response.json"
          : "fixtures/helius/helius-v0-addresses-transactions__mainnet/response.json";
        return json(200, await loadBody(rel));
      }
      if (req.method === "POST" && url.pathname === "/api/v1/chat/completions") {
        return json(200, await loadBody("fixtures/openrouter/openrouter-chat-completions__mainnet/response.json"));
      }
      if (req.method === "POST" && url.pathname === "/api/alpha/decisions") {
        return json(200, await loadBody("fixtures/openrouter/openrouter-decisions__mainnet/response.json"));
      }
      if (req.method === "POST") {
        const payload = await req.json().catch(() => null);
        const method = payload && payload.method;
        const id = payload && payload.id;
        if (method === "isBlockhashValid") {
          const blockhash = payload.params && payload.params[0];
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
      return json(500, { error: error instanceof Error ? error.message : "mock failed", recordings });
    }
  },
});

console.log(`airwave e2e mock http://127.0.0.1:${port}`);
console.log(`recordings ${recordings}`);
console.log(`mock blockhash ${MOCK_BLOCKHASH}`);
