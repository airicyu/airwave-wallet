import type { TokenProgramKind } from "./home-tokens";

export const CLOSE_EMPTY_MAX_TX_BYTES = 1232;

export type PackableCloseItem = {
  tokenAccount: string;
  owner: string;
  tokenProgram: TokenProgramKind;
};

export type MeasureCloseTxGroupBytes = (tokenAccounts: string[], owner: string, program: TokenProgramKind) => number;

/** Popup 殼底估算：保守常數，與 SW 真實 wire 長度同用 greedy 演算法 */
export function estimateCloseEmptyTxBytes(
  tokenAccounts: string[],
  _owner: string,
  _program: TokenProgramKind,
): number {
  const base = 280;
  const perClose = 42;
  return base + tokenAccounts.length * perClose;
}

function groupKey(owner: string, program: TokenProgramKind): string {
  return `${owner}\u001f${program}`;
}

/**
 * 同一 owner、同一 token program 才可同一筆；超過 measure 回傳的 byte 上限則開新筆。
 */
export function packCloseEmptyAccounts(
  items: PackableCloseItem[],
  measure: MeasureCloseTxGroupBytes,
  maxBytes = CLOSE_EMPTY_MAX_TX_BYTES,
): string[][] {
  const byGroup = new Map<string, PackableCloseItem[]>();
  for (const item of items) {
    const k = groupKey(item.owner, item.tokenProgram);
    const bucket = byGroup.get(k) ?? [];
    bucket.push(item);
    byGroup.set(k, bucket);
  }

  const txGroups: string[][] = [];
  for (const [, groupItems] of byGroup) {
    const owner = groupItems[0]!.owner;
    const program = groupItems[0]!.tokenProgram;
    let current: string[] = [];
    for (const { tokenAccount } of groupItems) {
      const trial = [...current, tokenAccount];
      if (current.length > 0 && measure(trial, owner, program) > maxBytes) {
        txGroups.push(current);
        current = [tokenAccount];
      } else {
        current = trial;
      }
    }
    if (current.length > 0) txGroups.push(current);
  }
  return txGroups;
}

export function countCloseEmptyTransactions(items: PackableCloseItem[], measure: MeasureCloseTxGroupBytes): number {
  return packCloseEmptyAccounts(items, measure).length;
}
