import type { CloseEmptyFeeBreakdown } from "../../shared/close-empty-types";

import type { TokenProgramKind } from "../../shared/home-tokens";

export type StoredClosePlanTx = {
  ownerAccountId: string;
  owner: string;
  tokenProgram: TokenProgramKind;
  unsignedBytes: Uint8Array;
  lastValidBlockHeight: bigint;
  cuLimit: number;
  cuPrice: number;
  tokenAccounts: string[];
  accounts: Array<{ tokenAccount: string; symbol: string; rentLamports: string }>;
  signatureLamports: string;
  priorityLamports: string;
  totalLamports: string;
};

export type StoredClosePlan = {
  planId: string;
  createdAt: number;
  feeSnapshot: CloseEmptyFeeBreakdown;
  reclaimLamports: string;
  accountCount: number;
  txs: StoredClosePlanTx[];
};

const TTL_MS = 15 * 60 * 1000;
const plans = new Map<string, StoredClosePlan>();

export function putClosePlan(plan: StoredClosePlan): void {
  plans.set(plan.planId, plan);
}

export function getClosePlan(planId: string): StoredClosePlan | null {
  const p = plans.get(planId);
  if (!p) return null;
  if (Date.now() - p.createdAt > TTL_MS) {
    plans.delete(planId);
    return null;
  }
  return p;
}

export function deleteClosePlan(planId: string): void {
  plans.delete(planId);
}
