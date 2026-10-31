/**
 * Dual-cluster isBlockhashValid probe for sign-transaction pending records.
 * Does not simulate, sign, or persist probe results.
 */
import {
  effectiveRpcUrl,
  isMainnetRpcReady,
  type Settings,
} from "../../shared/protocol";
import type { BlockhashProbeResult, BlockhashProbeSide, PendingRecord, SignTransactionPayload } from "../../shared/protocol";
import { mainnetBlockhashProbeUrl } from "../../shared/rpc";
import { recentBlockhashFromWireTx } from "../../shared/tx/blockhash-from-wire";

const PROBE_TIMEOUT_MS = 8_000;

function parseIsBlockhashValidBody(body: unknown): BlockhashProbeSide {
  if (!body || typeof body !== "object") return "unknown";
  const rec = body as { error?: unknown; result?: { value?: unknown } };
  if (rec.error) return "unknown";
  const v = rec.result?.value;
  if (v === true) return "valid";
  if (v === false) return "invalid";
  return "unknown";
}

async function probeSide(rpcUrl: string, blockhash: string): Promise<BlockhashProbeSide> {
  if (!rpcUrl.trim()) return "unknown";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "isBlockhashValid",
        params: [blockhash, { commitment: "confirmed" }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) return "unknown";
    const json: unknown = await res.json();
    return parseIsBlockhashValidBody(json);
  } catch {
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

function isSignTxPending(p: PendingRecord | undefined): p is PendingRecord {
  return (
    p != null &&
    (p.kind === "signTransaction" || p.kind === "signAndSendTransaction" || p.kind === "walletSend")
  );
}

export async function probeSignBlockhashForPending(
  pending: PendingRecord | undefined,
  settings: Settings,
): Promise<BlockhashProbeResult | "NOT_FOUND"> {
  if (!isSignTxPending(pending)) return "NOT_FOUND";
  const { transaction } = pending.payload as SignTransactionPayload;
  if (!Array.isArray(transaction)) return "NOT_FOUND";
  if (transaction.length === 0) {
    return { devnet: "unknown", mainnet: "unknown" };
  }
  const blockhash = recentBlockhashFromWireTx(Uint8Array.from(transaction));
  if (!blockhash) {
    return { devnet: "unknown", mainnet: "unknown" };
  }
  const devnetUrl = effectiveRpcUrl("devnet", settings.rpcByCluster.devnet);
  const mainnetUrl = isMainnetRpcReady(settings.rpcByCluster.mainnet)
    ? settings.rpcByCluster.mainnet.active.trim()
    : mainnetBlockhashProbeUrl(settings);
  const [devnet, mainnet] = await Promise.all([
    probeSide(devnetUrl, blockhash),
    probeSide(mainnetUrl, blockhash),
  ]);
  return { devnet, mainnet };
}
