/**
 * This file returns a Solana RPC client for a URL and reuses the client when the URL has not changed. Callers pass the URL from settings. This file does not choose the cluster.
 */
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
