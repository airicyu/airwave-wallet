/**
 * Signs approved wallet sends, broadcasts wire transactions, confirms, and notifies popup and dapp listeners.
 * Does not construct transfer instruction messages from user form fields.
 */
import bs58 from "bs58";
import { getBase64EncodedWireTransaction } from "@solana/kit";
import type { Signature } from "@solana/keys";
import type { KeyPairSigner } from "@solana/signers";
import type { SignTransactionPayload } from "../../shared/commands";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { decodeWireTransaction, partiallySignWireTransaction } from "../../shared/tx-wire";
import type { LoadedAccountKeys } from "../../shared/keypair-bytes";
import { getWorkingTx } from "../pending";
import { getPending, removePending } from "../pending";
import { clearWalletSendState, getWalletSendState } from "./wallet-send-state";
import { cancelPendingTimeout } from "../pending";
import { sendBridgeResult } from "../messaging";

const CONFIRM_MS = 60_000;

export type WalletSendNotify = {
  progress: (requestId: string, error: string) => void;
  settled: (requestId: string, ok: boolean, errorMessage?: string, signature?: string) => void;
};

export async function runWalletSendAfterApprove(
  requestId: string,
  rpcUrl: string,
  loaded: LoadedAccountKeys,
  notify: WalletSendNotify,
): Promise<void> {
  const pending = getPending(requestId);
  if (!pending || (pending.kind !== "walletSend" && pending.kind !== "signAndSendTransaction")) {
    return;
  }

  const ws = getWalletSendState(requestId);
  cancelPendingTimeout(requestId);

  if (ws.broadcastSig) {
    await waitConfirmOnly(requestId, rpcUrl, ws.broadcastSig, notify);
    return;
  }

  const { transaction } = pending.payload as SignTransactionPayload;
  const txBytes = Uint8Array.from(getWorkingTx(requestId) ?? transaction);
  try {
    decodeWireTransaction(txBytes);
  } catch {
    notify.progress(requestId, "SEND_TX_INVALID");
    return;
  }

  let signedBytes: Uint8Array;
  try {
    signedBytes = await partiallySignWireTransaction(txBytes, loaded.signer as KeyPairSigner);
  } catch {
    notify.progress(requestId, "SEND_TX_INVALID");
    return;
  }

  const rpc = solanaRpcForUrl(rpcUrl);
  const wire = getBase64EncodedWireTransaction(decodeWireTransaction(signedBytes));

  try {
    const sig = await rpc
      .sendTransaction(wire, {
        encoding: "base64",
        skipPreflight: false,
        preflightCommitment: "confirmed",
      })
      .send();
    ws.broadcastSig = sig;
    await waitConfirmOnly(requestId, rpcUrl, sig, notify);
  } catch (e) {
    notify.progress(requestId, rpcUserCode(e, "SEND_BROADCAST_FAILED"));
  }
}

async function waitConfirmOnly(
  requestId: string,
  rpcUrl: string,
  signature: string,
  notify: WalletSendNotify,
): Promise<void> {
  const rpc = solanaRpcForUrl(rpcUrl);
  const ws = getWalletSendState(requestId);
  try {
    const start = Date.now();
    while (Date.now() - start < CONFIRM_MS) {
      if (!getPending(requestId)) return;
      const st = await rpc
        .getSignatureStatuses([signature as Signature], { searchTransactionHistory: true })
        .send();
      const val = st.value[0];
      if (val?.confirmationStatus === "confirmed" || val?.confirmationStatus === "finalized") {
        const p = getPending(requestId);
        if (!p) return;
        if (p.kind === "signAndSendTransaction") {
          const sigBytes = Array.from(bs58.decode(signature));
          await sendBridgeResult(p.tabId, {
            type: "airwave-bridge-result",
            requestId,
            ok: true,
            result: { signature: sigBytes },
          });
        }
        removePending(requestId);
        clearWalletSendState(requestId);
        notify.settled(requestId, true, undefined, signature);
        return;
      }
      if (val?.err) {
        notify.progress(requestId, "SEND_CHAIN_FAILED");
        return;
      }
      await sleep(1500);
    }
    if (ws.lastValidBlockHeight != null) {
      const slot = await rpc.getSlot({ commitment: "confirmed" }).send();
      if (Number(slot) > ws.lastValidBlockHeight) {
        notify.progress(requestId, "SEND_BLOCKHASH_EXPIRED");
        return;
      }
    }
    notify.progress(requestId, "SEND_CONFIRM_TIMEOUT");
  } catch (e) {
    notify.progress(requestId, rpcUserCode(e, "SEND_CONFIRM_FAILED"));
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function rpcUserCode(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : "";
  if (!msg || msg.includes("npx @solana/errors") || msg.startsWith("Solana error #")) {
    return fallback;
  }
  return msg;
}
