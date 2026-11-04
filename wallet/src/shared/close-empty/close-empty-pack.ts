/**
 * Greedy packing of close-account instructions into Solana transactions under a byte-size budget.
 * Does not scan for closable token accounts or assemble full wire transactions in the service worker.
 */
import type { TokenProgramKind } from "../home";

export const CLOSE_EMPTY_MAX_TX_BYTES = 1232;

export type PackableCloseItem = {
  tokenAccount: string;
  owner: string;
  tokenProgram: TokenProgramKind;
};

export type MeasureCloseTxGroupBytes = (tokenAccounts: string[], owner: string, program: TokenProgramKind) => number;

/** Conservative popup estimate; same greedy packing as the service worker's real wire length. */
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
 * Pack only the same owner and token program into one tx; start a new tx when measure exceeds the byte cap.
 */
export function packCloseEmptyAccounts(
  items: PackableCloseItem[],
  measure: MeasureCloseTxGroupBytes,
  maxBytes = CLOSE_EMPTY_MAX_TX_BYTES,
  maxAddresses?: number,
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
      const overBytes = measure(trial, owner, program) > maxBytes;
      const overAddresses = maxAddresses != null && 2 + trial.length > maxAddresses;
      if (current.length > 0 && (overBytes || overAddresses)) {
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

export function countCloseEmptyTransactions(
  items: PackableCloseItem[],
  measure: MeasureCloseTxGroupBytes,
  maxBytes = CLOSE_EMPTY_MAX_TX_BYTES,
  maxAddresses?: number,
): number {
  return packCloseEmptyAccounts(items, measure, maxBytes, maxAddresses).length;
}
