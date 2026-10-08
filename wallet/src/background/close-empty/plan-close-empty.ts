/**
 * Builds unsigned close-empty transactions from the in-memory list selection and stores a plan.
 * Does not sign, broadcast, or rescan the closable list from cache alone.
 */
import { estimateResourceLimitsFactory } from "@solana/kit";
import { randomUUID } from "../../shared/uuid";
import type { ClosableEntry, CloseEmptyPlanResult } from "../../shared/close-empty-types";
import { computeCloseEmptyUnitLimit } from "../../shared/close-empty-compute-units";
import {
  lamportsDecimalString,
  priorityFeeLamportsFromCu,
  signatureFeeLamports,
  sumLamportStrings,
} from "../../shared/close-empty-fees";
import { getClosableOwnerTargets } from "../../shared/close-empty-owners";
import { packCloseEmptyAccounts } from "../../shared/close-empty-pack";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import * as session from "../session";
import { readAccounts, readSettings } from "../storage";
import { getActiveAccountMeta } from "../session";
import {
  buildCloseTransactionMessage,
  buildUnsignedCloseTx,
  measureCloseTxWireBytes,
} from "./build-close-txs";
import { getLastListClosableEntries } from "./list-closable";
import { putClosePlan, type StoredClosePlan } from "./plan-store";

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
    return { ok: false, code: "INVALID_PAYLOAD", message: "INVALID_PAYLOAD" };
  }
  const unique = new Set(tokenAccounts);
  if (unique.size !== tokenAccounts.length) {
    return { ok: false, code: "INVALID_PAYLOAD", message: "INVALID_PAYLOAD" };
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

  const listMap = new Map(getLastListClosableEntries().map((e) => [e.tokenAccount, e]));
  const selected: ClosableEntry[] = [];
  for (const ta of tokenAccounts) {
    const row = listMap.get(ta);
    if (!row) {
      return { ok: false, code: "INVALID_PAYLOAD", message: "INVALID_PAYLOAD" };
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
    return { ok: false, code: "CU_ESTIMATE_FAILED", message: "CLOSE_EMPTY_CU_FAILED" };
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
