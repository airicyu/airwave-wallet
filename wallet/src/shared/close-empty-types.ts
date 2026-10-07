import type { TokenProgramKind } from "./home-tokens";

export type ClosableEntry = {
  tokenAccount: string;
  owner: string;
  ownerAccountId: string;
  ownerLabel: string;
  mint: string;
  symbol: string;
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
