import type { Signature } from "@solana/keys";
import type { Commitment } from "@solana/rpc-types";
import { solanaRpcForUrl } from "../../shared/solana-rpc";

const POLL_MS = 1500;
const DEFAULT_TIMEOUT_MS = 60_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function meetsCommitment(status: string | null | undefined, commitment: Commitment): boolean {
  if (!status) return false;
  if (commitment === "finalized") return status === "finalized";
  return status === "confirmed" || status === "finalized";
}

/** HTTP fallback when Kit WS confirmation fails but the tx may already be on-chain. */
export async function waitForSignatureConfirmed(
  rpcUrl: string,
  signature: Signature,
  commitment: Commitment = "confirmed",
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<boolean> {
  const rpc = solanaRpcForUrl(rpcUrl);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const st = await rpc
      .getSignatureStatuses([signature], { searchTransactionHistory: true })
      .send();
    const val = st.value[0];
    if (val?.err) return false;
    if (meetsCommitment(val?.confirmationStatus ?? null, commitment)) return true;
    await sleep(POLL_MS);
  }
  return false;
}
