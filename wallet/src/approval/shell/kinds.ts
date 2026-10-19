import type { PendingRecord } from "../../shared/commands";
import type { AccountMeta } from "../../shared/storage-keys";

export function isSignTxKind(kind: PendingRecord["kind"]): boolean {
  return kind === "signTransaction" || kind === "walletSend" || kind === "signAndSendTransaction";
}

export function isBroadcastAfterApproveKind(kind: PendingRecord["kind"]): boolean {
  return kind === "walletSend" || kind === "signAndSendTransaction";
}

export function accountMetaForPending(
  accounts: AccountMeta[],
  signAccountId: string | undefined,
): AccountMeta | undefined {
  if (!signAccountId) return undefined;
  return accounts.find((a) => a.id === signAccountId);
}

export function exposedPk(meta: AccountMeta): string {
  if (meta.kind === "combined") return meta.mainPubkey;
  return meta.publicKeyBase58;
}
