import { createSolanaRpc } from "@solana/kit";

let cachedUrl: string | null = null;
let cachedRpc: ReturnType<typeof createSolanaRpc> | null = null;

export function solanaRpcForUrl(rpcUrl: string): ReturnType<typeof createSolanaRpc> {
  if (!rpcUrl.trim()) {
    throw new Error("JSON-RPC URL required");
  }
  if (cachedRpc && cachedUrl === rpcUrl) return cachedRpc;
  cachedUrl = rpcUrl;
  cachedRpc = createSolanaRpc(rpcUrl);
  return cachedRpc;
}
