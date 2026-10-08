/**
 * Signs and submits close-empty plans, classifying confirmed, failed, and expired outcomes.
 * Does not rescan the closable token account list.
 */
import {
  getSignatureFromTransaction,
  sendAndConfirmTransactionFactory,
  type Signature,
} from "@solana/kit";
import type { RpcSendContext } from "@solana/kit-plugin-rpc";
import {
  createTransactionPlanExecutor,
  parallelTransactionPlan,
  passthroughFailedTransactionPlanExecution,
  singleTransactionPlan,
  type TransactionPlanResult,
} from "@solana/instruction-plans";
import { createSolanaRpcSubscriptions } from "@solana/rpc-subscriptions";
import { rpcTransactionPlanExecutor } from "@solana/kit-plugin-rpc";
import type { KeyPairSigner } from "@solana/signers";
import type { ClosableEntry, CloseEmptyCommitResult } from "../../shared/close-empty-types";
import {
  lamportsDecimalString,
  priorityFeeLamportsFromCu,
  signatureFeeLamports,
} from "../../shared/close-empty-fees";
import { rpcUrlToWebSocket } from "../../shared/rpc-ws-url";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { partiallySignWireTransaction, decodeWireTransaction } from "../../shared/tx-wire";
import type { Settings } from "../../shared/storage-keys";
import * as session from "../session";
import { readSettings } from "../storage";
import {
  buildCloseTransactionMessage,
  buildUnsignedCloseTx,
} from "./build-close-txs";
import { readTokenAccountClosableState } from "./closable-scan";
import { deleteClosePlan, getClosePlan, type StoredClosePlan } from "./plan-store";
import { waitForSignatureConfirmed } from "./wait-signature-confirmed";

function feeTotalForPlan(settings: Settings, plan: StoredClosePlan): string {
  let sig = 0n;
  let pri = 0n;
  for (const tx of plan.txs) {
    sig += signatureFeeLamports(1);
    pri += priorityFeeLamportsFromCu(tx.cuLimit, settings.defaultCuPrice);
  }
  return lamportsDecimalString(sig + pri);
}

async function assertPlanNotStale(plan: StoredClosePlan, settings: Settings): Promise<boolean> {
  if (feeTotalForPlan(settings, plan) !== plan.feeSnapshot.totalLamports) {
    return false;
  }
  for (const tx of plan.txs) {
    for (const ta of tx.tokenAccounts) {
      const st = await readTokenAccountClosableState(settings.rpcUrl, ta, tx.owner);
      if (!st.ok) return false;
      if (st.amount !== "0" || st.frozen || st.hasExtensions) return false;
    }
  }
  return true;
}

function classifyPlanResult(
  plan: StoredClosePlan,
  planResult: TransactionPlanResult,
): CloseEmptyCommitResult {
  let confirmedCount = 0;
  let failedCount = 0;
  let expiredCount = 0;
  let reclaimed = 0n;
  const signatures: string[] = [];

  const leaves = flattenResults(planResult);
  for (let i = 0; i < leaves.length; i++) {
    const leaf = leaves[i];
    const txMeta = plan.txs[i];
    if (!txMeta) continue;
    if (leaf.status === "successful") {
      confirmedCount += txMeta.tokenAccounts.length;
      for (const a of txMeta.accounts) reclaimed += BigInt(a.rentLamports);
      if (leaf.signature) signatures.push(leaf.signature);
    } else if (leaf.status === "failed") {
      failedCount += txMeta.tokenAccounts.length;
    } else {
      expiredCount += txMeta.tokenAccounts.length;
    }
  }

  return {
    confirmedCount,
    failedCount,
    expiredCount,
    reclaimedLamports: reclaimed.toString(10),
    signatures: signatures.length > 0 ? signatures : undefined,
  };
}

type LeafStatus = { status: "successful" | "failed" | "canceled"; signature?: string };

function flattenResults(result: TransactionPlanResult): LeafStatus[] {
  const out: LeafStatus[] = [];
  walk(result, out);
  return out;
}

function walk(node: TransactionPlanResult, out: LeafStatus[]): void {
  if (node.kind === "single") {
    if (node.status === "successful") {
      const sig =
        node.context && typeof node.context === "object" && "signature" in node.context
          ? String((node.context as { signature?: string }).signature ?? "")
          : undefined;
      out.push({ status: "successful", signature: sig || undefined });
      return;
    }
    if (node.status === "failed") {
      out.push({ status: "failed" });
      return;
    }
    out.push({ status: "canceled" });
    return;
  }
  if (node.kind === "parallel" || node.kind === "sequential") {
    for (const child of node.plans) walk(child, out);
  }
}

export async function commitCloseEmpty(planId: string): Promise<
  | { ok: true; result: CloseEmptyCommitResult }
  | {
      ok: false;
      code: "WALLET_LOCKED" | "INVALID_PAYLOAD" | "STALE_LIST";
      message: string;
    }
> {
  if (!session.isUnlocked()) {
    return { ok: false, code: "WALLET_LOCKED", message: "Wallet locked" };
  }
  const plan = getClosePlan(planId);
  if (!plan) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "Plan expired" };
  }

  const settings = await readSettings();
  if (!(await assertPlanNotStale(plan, settings))) {
    return { ok: false, code: "STALE_LIST", message: "CLOSE_EMPTY_STALE_LIST" };
  }

  const rpc = solanaRpcForUrl(settings.rpcUrl);
  const rpcSubscriptions = createSolanaRpcSubscriptions(rpcUrlToWebSocket(settings.rpcUrl));
  const pluginClient = rpcTransactionPlanExecutor({
    estimateResourceLimits: false,
    skipPreflight: false,
  })({ rpc, rpcSubscriptions });

  const latest = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const blockhash = latest.value.blockhash as import("@solana/kit").Blockhash;
  const lastValidBlockHeight = latest.value.lastValidBlockHeight;

  const signedTxs: ReturnType<typeof decodeWireTransaction>[] = [];
  const planMessages = [];
  for (const tx of plan.txs) {
    const entries: ClosableEntry[] = tx.accounts.map((a) => ({
      tokenAccount: a.tokenAccount,
      owner: tx.owner,
      ownerAccountId: tx.ownerAccountId,
      ownerLabel: "",
      mint: "",
      symbol: a.symbol,
      tokenProgram: tx.tokenProgram,
      rentLamports: a.rentLamports,
    }));
    const rebuilt = buildUnsignedCloseTx(
      entries,
      tx.tokenAccounts,
      blockhash,
      lastValidBlockHeight,
      tx.cuLimit,
      settings.defaultCuPrice,
    );
    planMessages.push(
      buildCloseTransactionMessage(
        entries,
        tx.tokenAccounts,
        blockhash,
        lastValidBlockHeight,
        tx.cuLimit,
        settings.defaultCuPrice,
      ),
    );
    const loaded = session.getLoadedAccount(tx.ownerAccountId);
    if (!loaded) {
      return { ok: false, code: "WALLET_LOCKED", message: "Missing signer" };
    }
    const signedBytes = await partiallySignWireTransaction(
      rebuilt.unsignedBytes,
      loaded.signer as KeyPairSigner,
    );
    signedTxs.push(decodeWireTransaction(signedBytes));
  }

  const sendAndConfirm = sendAndConfirmTransactionFactory({
    rpc: rpc as Parameters<typeof sendAndConfirmTransactionFactory>[0]["rpc"],
    rpcSubscriptions,
  });
  let sendIndex = 0;
  const sendExecutor = createTransactionPlanExecutor<RpcSendContext>({
    executeTransactionMessage: async (context, message, config) => {
      const signed = signedTxs[sendIndex++]!;
      const signature = getSignatureFromTransaction(signed) as Signature;
      try {
        await sendAndConfirm(
          signed as Parameters<ReturnType<typeof sendAndConfirmTransactionFactory>>[0],
          {
            commitment: "confirmed",
            skipPreflight: false,
            ...config,
          },
        );
      } catch {
        const onChain = await waitForSignatureConfirmed(settings.rpcUrl, signature, "confirmed");
        if (!onChain) throw new Error("send failed");
      }
      return {
        signature,
        message,
        transaction: signed,
      } as RpcSendContext;
    },
  });

  void pluginClient;
  const parallelPlan = parallelTransactionPlan(planMessages.map((m) => singleTransactionPlan(m)));

  let planResult: TransactionPlanResult;
  try {
    planResult = await passthroughFailedTransactionPlanExecution(sendExecutor(parallelPlan));
  } finally {
    deleteClosePlan(planId);
  }

  const summary = classifyPlanResult(plan, planResult);
  return { ok: true, result: summary };
}
