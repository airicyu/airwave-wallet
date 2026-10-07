import {
  estimateResourceLimitsFactory,
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
import { randomUUID } from "../../shared/uuid";
import type { ClosableEntry, CloseEmptyCommitResult, CloseEmptyPlanResult } from "../../shared/close-empty-types";
import { computeCloseEmptyUnitLimit } from "../../shared/close-empty-compute-units";
import {
  lamportsDecimalString,
  priorityFeeLamportsFromCu,
  signatureFeeLamports,
  sumLamportStrings,
} from "../../shared/close-empty-fees";
import { getClosableOwnerTargets } from "../../shared/close-empty-owners";
import { packCloseEmptyAccounts } from "../../shared/close-empty-pack";
import type { ParsedOwnerTokenAccount } from "../../shared/parsed-token-accounts";
import { rpcUrlToWebSocket } from "../../shared/rpc-ws-url";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { partiallySignWireTransaction, decodeWireTransaction } from "../../shared/tx-wire";
import type { Settings } from "../../shared/storage-keys";
import type { AccountMeta } from "../../shared/storage-keys";
import {
  getHomeTokensForOwners,
  homeTokensCacheFingerprint,
} from "../home-tokens/home-tokens-service";
import { getOwnerParsedTokenAccounts } from "../home-tokens/owner-parsed-token-cache";
import { isCombinedAccount } from "../../shared/accounts";
import { getHomeTokenOwners } from "../../shared/accounts";
import * as session from "../session";
import { readAccounts, readSettings } from "../storage";
import { getActiveAccountMeta } from "../session";
import {
  buildCloseTransactionMessage,
  buildUnsignedCloseTx,
  measureCloseTxWireBytes,
  packAndBuildCloseTxGroups,
} from "./build-close-txs";
import { closableCacheKey, getClosableCache, setClosableCache } from "./closable-cache";
import { enrichClosableEntries } from "./closable-enrich";
import {
  readTokenAccountClosableState,
  scanClosableForOwners,
  scanClosableFromCachedParsed,
} from "./closable-scan";
import { deleteClosePlan, getClosePlan, putClosePlan, type StoredClosePlan } from "./plan-store";
import { waitForSignatureConfirmed } from "./wait-signature-confirmed";

let lastListEntries: ClosableEntry[] = [];

export function getLastListClosableEntries(): ClosableEntry[] {
  return lastListEntries;
}

export async function listClosableTokenAccounts(options?: {
  force?: boolean;
}): Promise<
  | { ok: true; entries: ClosableEntry[]; partialScan?: boolean }
  | { ok: false; code: "NO_ACCOUNT" | "ACCOUNT_READ_ONLY" | "RPC_ERROR"; message: string }
> {
  const active = await getActiveAccountMeta();
  if (!active) {
    return { ok: false, code: "NO_ACCOUNT", message: "No active account" };
  }
  const accounts = await readAccounts();
  const secrets = session.getVaultSecrets()?.secrets;
  const targets = getClosableOwnerTargets(active, accounts, secrets);
  if (targets.length === 0) {
    return { ok: false, code: "ACCOUNT_READ_ONLY", message: "No signing owner" };
  }

  const settings = await readSettings();
  const cacheKey = closableCacheKey(active.id, settings.cluster, settings.rpcUrl);
  const owners = getHomeTokenOwners(active);
  const home = await getHomeTokensForOwners(owners, settings, {
    withMembers: isCombinedAccount(active),
  });

  if (options?.force !== true) {
    const cached = getClosableCache(cacheKey);
    if (cached) {
      const entries = await enrichClosableEntries(cached.entries, home.rows, settings);
      lastListEntries = entries;
      return {
        ok: true,
        entries,
        partialScan: cached.partialScan ? true : undefined,
      };
    }
  }
  const tokenFp = homeTokensCacheFingerprint(owners, settings);
  const parsedByOwner = new Map<string, ParsedOwnerTokenAccount[]>();
  let cacheComplete = true;
  for (const target of targets) {
    const cached = getOwnerParsedTokenAccounts(tokenFp, target.owner);
    if (!cached) {
      cacheComplete = false;
      break;
    }
    parsedByOwner.set(target.owner, cached);
  }

  let entries: ClosableEntry[];
  let ownerFailures: number;
  if (cacheComplete) {
    entries = scanClosableFromCachedParsed(targets, home.rows, parsedByOwner);
    ownerFailures = 0;
  } else {
    const scanned = await scanClosableForOwners(settings.rpcUrl, targets, home.rows);
    entries = scanned.entries;
    ownerFailures = scanned.ownerFailures;
  }

  if (ownerFailures === targets.length) {
    return { ok: false, code: "RPC_ERROR", message: "掃描失敗" };
  }

  entries = await enrichClosableEntries(entries, home.rows, settings);
  lastListEntries = entries;
  setClosableCache(cacheKey, entries, ownerFailures > 0);
  return {
    ok: true,
    entries,
    partialScan: ownerFailures > 0 ? true : undefined,
  };
}

export async function planCloseEmpty(
  tokenAccounts: string[],
): Promise<
  | { ok: true; result: CloseEmptyPlanResult }
  | {
      ok: false;
      code:
        | "INVALID_PAYLOAD"
        | "NO_ACCOUNT"
        | "ACCOUNT_READ_ONLY"
        | "CU_ESTIMATE_FAILED";
      message: string;
    }
> {
  if (!Array.isArray(tokenAccounts) || tokenAccounts.length === 0) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "空清單" };
  }
  const unique = new Set(tokenAccounts);
  if (unique.size !== tokenAccounts.length) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "重複地址" };
  }

  const active = await getActiveAccountMeta();
  if (!active) {
    return { ok: false, code: "NO_ACCOUNT", message: "No active account" };
  }
  const accounts = await readAccounts();
  const secrets = session.getVaultSecrets()?.secrets;
  if (getClosableOwnerTargets(active, accounts, secrets).length === 0) {
    return { ok: false, code: "ACCOUNT_READ_ONLY", message: "Read-only" };
  }

  const listMap = new Map(lastListEntries.map((e) => [e.tokenAccount, e]));
  const selected: ClosableEntry[] = [];
  for (const ta of tokenAccounts) {
    const row = listMap.get(ta);
    if (!row) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "地址不在清單" };
    }
    selected.push(row);
  }

  const settings = await readSettings();
  const rpc = solanaRpcForUrl(settings.rpcUrl);
  const latest = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const blockhash = latest.value.blockhash as import("@solana/kit").Blockhash;
  const lastValidBlockHeight = latest.value.lastValidBlockHeight;
  const cuPrice = settings.defaultCuPrice;

  const measure = (accounts: string[], owner: string, program: ClosableEntry["tokenProgram"]) =>
    measureCloseTxWireBytes(
      accounts,
      owner,
      program,
      blockhash,
      lastValidBlockHeight,
      200_000,
      cuPrice,
      selected.filter((e) => e.owner === owner && e.tokenProgram === program),
    );

  const packItems = selected.map((e) => ({
    tokenAccount: e.tokenAccount,
    owner: e.owner,
    tokenProgram: e.tokenProgram,
  }));
  const groups = packCloseEmptyAccounts(packItems, measure);

  const estimateResourceLimits = estimateResourceLimitsFactory({ rpc });
  const builtTxs: ReturnType<typeof buildUnsignedCloseTx>[] = [];

  try {
    for (const group of groups) {
      const estimateMsg = buildCloseTransactionMessage(
        selected,
        group,
        blockhash,
        lastValidBlockHeight,
        null,
        null,
      );
      const { computeUnitLimit: simulatedUnits } = await estimateResourceLimits(estimateMsg, {
        commitment: "confirmed",
      });
      const computeUnitLimit = computeCloseEmptyUnitLimit(simulatedUnits);
      builtTxs.push(
        buildUnsignedCloseTx(
          selected,
          group,
          blockhash,
          lastValidBlockHeight,
          computeUnitLimit,
          cuPrice,
        ),
      );
    }
  } catch {
    return { ok: false, code: "CU_ESTIMATE_FAILED", message: "無法估算 CU" };
  }

  const planId = randomUUID();
  let reclaim = 0n;
  const planTxs: StoredClosePlan["txs"] = [];
  const feeSigParts: string[] = [];
  const feePriParts: string[] = [];

  for (const tx of builtTxs) {
    for (const a of tx.accounts) reclaim += BigInt(a.rentLamports);
    const sig = signatureFeeLamports(1);
    const pri = priorityFeeLamportsFromCu(tx.cuLimit, tx.cuPrice);
    const total = sig + pri;
    feeSigParts.push(lamportsDecimalString(sig));
    feePriParts.push(lamportsDecimalString(pri));
    planTxs.push({
      ownerAccountId: tx.ownerAccountId,
      owner: tx.owner,
      tokenProgram: tx.tokenProgram,
      unsignedBytes: tx.unsignedBytes,
      lastValidBlockHeight: tx.lastValidBlockHeight,
      cuLimit: tx.cuLimit,
      cuPrice: tx.cuPrice,
      tokenAccounts: tx.tokenAccounts,
      accounts: tx.accounts,
      signatureLamports: lamportsDecimalString(sig),
      priorityLamports: lamportsDecimalString(pri),
      totalLamports: lamportsDecimalString(total),
    });
  }

  const feeSnapshot = {
    signatureLamports: lamportsDecimalString(sumLamportStrings(feeSigParts)),
    priorityLamports: lamportsDecimalString(sumLamportStrings(feePriParts)),
    totalLamports: lamportsDecimalString(
      sumLamportStrings(feeSigParts) + sumLamportStrings(feePriParts),
    ),
  };

  putClosePlan({
    planId,
    createdAt: Date.now(),
    feeSnapshot,
    reclaimLamports: reclaim.toString(10),
    accountCount: selected.length,
    txs: planTxs,
  });

  const result: CloseEmptyPlanResult = {
    planId,
    accountCount: selected.length,
    txCount: planTxs.length,
    reclaimLamports: reclaim.toString(10),
    fee: feeSnapshot,
    txs: planTxs.map((t) => ({
      ownerAccountId: t.ownerAccountId,
      owner: t.owner,
      cuLimit: t.cuLimit,
      cuPrice: t.cuPrice,
      signatureLamports: t.signatureLamports,
      priorityLamports: t.priorityLamports,
      totalLamports: t.totalLamports,
      accounts: t.accounts,
    })),
  };

  return { ok: true, result };
}

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
    return { ok: false, code: "STALE_LIST", message: "清單已過期" };
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
