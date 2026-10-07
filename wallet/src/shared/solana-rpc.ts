import { createSolanaRpc } from "@solana/kit";

let cachedUrl: string | null = null;
let cachedRpc: ReturnType<typeof createSolanaRpc> | null = null;

export function solanaRpcForUrl(rpcUrl: string): ReturnType<typeof createSolanaRpc> {
  if (cachedRpc && cachedUrl === rpcUrl) return cachedRpc;
  cachedUrl = rpcUrl;
  cachedRpc = createSolanaRpc(rpcUrl);
  return cachedRpc;
}
