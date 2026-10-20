/**
 * Whether the active wallet can use in-wallet send, and which home-token row reflects sendable balance.
 * Does not call RPC or begin pending walletSend requests.
 */
import { isCombinedAccount, resolvePubkey } from "../accounts";
import type { HomeTokenRow } from "../home";
import { accountKind, type AccountMeta } from "../protocol";

export function canWalletSendFromActiveAccount(
  accounts: AccountMeta[],
  active: AccountMeta | undefined,
  unlocked: boolean,
): boolean {
  if (!active || !unlocked) return false;
  if (!isCombinedAccount(active)) {
    return accountKind(active) === "signing";
  }
  const resolved = resolvePubkey(accounts, undefined, active.mainPubkey);
  return resolved.role === "signing";
}

/** For combined accounts, use the current-wallet member slice; otherwise the row as loaded for home. */
export function homeTokenRowForSendBalance(row: HomeTokenRow, active: AccountMeta): HomeTokenRow {
  if (!isCombinedAccount(active)) return row;
  const member = row.members?.find((m) => m.pubkey === active.mainPubkey);
  if (!member) {
    return { ...row, uiAmount: 0, uiAmountLabel: "0" };
  }
  return {
    ...row,
    uiAmount: member.uiAmount,
    uiAmountLabel: member.uiAmountLabel,
    members: undefined,
  };
}
