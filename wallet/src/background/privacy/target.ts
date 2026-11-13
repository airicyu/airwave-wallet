/**
 * Resolves the signing account and Helius RPC used by private-balance commands.
 * Does not derive keys or submit transactions.
 */
import { isSigningOrWatch, parsePublicKeyBase58 } from "../../shared/accounts";
import { heliusApiKeyFromStored, heliusRpcUrl } from "../../shared/rpc";
import { accountKind, type AccountMeta, type Settings } from "../../shared/protocol";

export type SigningTarget = { accountId: string; address: string };

function samePubkey(left: string, right: string): boolean {
  const a = parsePublicKeyBase58(left) ?? left;
  const b = parsePublicKeyBase58(right) ?? right;
  return a === b;
}

export function signingTarget(accounts: AccountMeta[], activeId: string | null): SigningTarget | "watch" | "missing" {
  const meta = accounts.find((account) => account.id === activeId);
  if (!meta || !activeId) return "missing";
  if (accountKind(meta) === "readOnly") return "watch";
  if (meta.kind === "combined") {
    const main = accounts.find(
      (account) =>
        isSigningOrWatch(account) &&
        accountKind(account) === "signing" &&
        samePubkey(account.publicKeyBase58, meta.mainPubkey),
    );
    if (!main || !isSigningOrWatch(main)) return "watch";
    return { accountId: main.id, address: main.publicKeyBase58 };
  }
  return { accountId: meta.id, address: meta.publicKeyBase58 };
}

export function privacyRpcUrl(settings: Settings): string | null {
  const apiKey = heliusApiKeyFromStored(settings.heliusApiUrl);
  if (!apiKey) return null;
  return heliusRpcUrl(settings.cluster, apiKey);
}
