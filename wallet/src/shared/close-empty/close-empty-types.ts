/**
 * This file holds the close-empty data types shared by the service worker and the popup: one closable account, the fee breakdown, and the planned transactions. It does not build or send them.
 */
import type { TokenProgramKind } from "../home";

export type ClosableEntry = {
  tokenAccount: string;
  owner: string;
  ownerAccountId: string;
  ownerLabel: string;
  mint: string;
  symbol: string;
  iconUrl?: string;
  iconLetter?: string;
  tokenProgram: TokenProgramKind;
  rentLamports: string;
};

export type CloseEmptyFeeBreakdown = {
  totalLamports: string;
  signatureLamports: string;
  priorityLamports: string;
};

export type CloseEmptyPlanTx = {
  ownerAccountId: string;
  owner: string;
  cuLimit: number;
  cuPrice: number;
  signatureLamports: string;
  priorityLamports: string;
  totalLamports: string;
  accounts: Array<{ tokenAccount: string; symbol: string; rentLamports: string }>;
};

export type CloseEmptyPlanResult = {
  planId: string;
  accountCount: number;
  txCount: number;
  reclaimLamports: string;
  fee: CloseEmptyFeeBreakdown;
  txs: CloseEmptyPlanTx[];
};

export type CloseEmptyCommitResult = {
  confirmedCount: number;
  failedCount: number;
  expiredCount: number;
  reclaimedLamports: string;
  signatures?: string[];
};
