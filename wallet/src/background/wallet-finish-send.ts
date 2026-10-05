import { Connection, Keypair, VersionedTransaction } from "@solana/web3.js";
import type { SignTransactionPayload } from "../shared/commands";
import { getWorkingTx } from "./sign-tx-pending-state";
import { getPending, removePending } from "./pending";
import { clearWalletSendState, getWalletSendState } from "./wallet-send-state";
import { cancelPendingTimeout } from "./pending-timeout";

const CONFIRM_MS = 60_000;

export type WalletSendNotify = {
  progress: (requestId: string, error: string) => void;
  settled: (requestId: string, ok: boolean, errorMessage?: string, signature?: string) => void;
};

export async function runWalletSendAfterApprove(
  requestId: string,
  rpcUrl: string,
  keypair: Keypair,
  notify: WalletSendNotify,
): Promise<void> {
  const pending = getPending(requestId);
  if (!pending || pending.kind !== "walletSend") return;

  const ws = getWalletSendState(requestId);
  cancelPendingTimeout(requestId);

  if (ws.broadcastSig) {
    await waitConfirmOnly(requestId, rpcUrl, ws.broadcastSig, notify);
    return;
  }

  const { transaction } = pending.payload as SignTransactionPayload;
  const txBytes = Uint8Array.from(getWorkingTx(requestId) ?? transaction);
  let tx: VersionedTransaction;
  try {
    tx = VersionedTransaction.deserialize(txBytes);
  } catch {
    notify.progress(requestId, "交易無效");
    return;
  }

  tx.sign([keypair]);
  const raw = tx.serialize();

  const conn = new Connection(rpcUrl, "confirmed");
  try {
    const sig = await conn.sendRawTransaction(raw, { skipPreflight: false });
    ws.broadcastSig = sig;
    await waitConfirmOnly(requestId, rpcUrl, sig, notify);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "送出失敗";
    notify.progress(requestId, msg);
  }
}

async function waitConfirmOnly(
  requestId: string,
  rpcUrl: string,
  signature: string,
  notify: WalletSendNotify,
): Promise<void> {
  const conn = new Connection(rpcUrl, "confirmed");
  const ws = getWalletSendState(requestId);
  try {
    const start = Date.now();
    while (Date.now() - start < CONFIRM_MS) {
      if (!getPending(requestId)) return;
      const st = await conn.getSignatureStatuses([signature]);
      const val = st.value[0];
      if (val?.confirmationStatus === "confirmed" || val?.confirmationStatus === "finalized") {
        if (!getPending(requestId)) return;
        removePending(requestId);
        clearWalletSendState(requestId);
        notify.settled(requestId, true, undefined, signature);
        return;
      }
      if (val?.err) {
        notify.progress(requestId, "鏈上確認失敗");
        return;
      }
      await sleep(1500);
    }
    if (ws.lastValidBlockHeight != null) {
      const slot = await conn.getSlot("confirmed");
      if (slot > ws.lastValidBlockHeight) {
        notify.progress(requestId, "Blockhash 已過期，請拒絕後重試");
        return;
      }
    }
    notify.progress(requestId, "確認逾時，可再按批准重試");
  } catch (e) {
    const msg = e instanceof Error ? e.message : "確認失敗";
    notify.progress(requestId, msg);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
