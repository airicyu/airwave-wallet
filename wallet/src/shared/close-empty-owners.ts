import {
  getExposedPublicKey,
  isCombinedAccount,
  isSigningOrWatch,
  resolvePubkey,
} from "./accounts";
import type { AccountMeta } from "./storage-keys";

export type ClosableOwnerTarget = {
  ownerAccountId: string;
  owner: string;
  ownerLabel: string;
};

export function getClosableOwnerTargets(
  active: AccountMeta,
  accounts: AccountMeta[],
  secrets: Record<string, string> | undefined,
): ClosableOwnerTarget[] {
  if (isCombinedAccount(active)) {
    const out: ClosableOwnerTarget[] = [];
    for (const pk of active.subPubkeys) {
      const resolved = resolvePubkey(accounts, secrets, pk);
      if (resolved.role !== "signing") continue;
      const signingMeta = accounts.find((a) => a.id === resolved.accountId);
      const label =
        signingMeta && isSigningOrWatch(signingMeta) ? signingMeta.label : pk.slice(0, 4);
      out.push({ ownerAccountId: resolved.accountId, owner: pk, ownerLabel: label });
    }
    return out;
  }
  const pk = getExposedPublicKey(active);
  const resolved = resolvePubkey(accounts, secrets, pk);
  if (resolved.role !== "signing") return [];
  return [{ ownerAccountId: resolved.accountId, owner: pk, ownerLabel: active.label }];
}
