/**
 * Resolves the signing account and Helius RPC used by private-balance commands.
 * Does not derive keys or submit transactions.
 */
import { heliusApiKeyFromStored, heliusRpcUrl } from "../../shared/rpc";
import { accountKind, type AccountMeta, type Settings } from "../../shared/protocol";

export type SigningTarget = { accountId: string; address: string };

export function signingTarget(accounts: AccountMeta[], activeId: string | null): SigningTarget | "watch" | "missing" {
  const meta = accounts.find((account) => account.id === activeId);
  if (!meta || !activeId) return "missing";
  if (accountKind(meta) === "readOnly") return "watch";
  if (meta.kind === "combined") {
    const main = accounts.find(
      (account): account is Extract<AccountMeta, { publicKeyBase58: string }> =>
        account.kind !== "combined" && account.kind !== "readOnly" && account.publicKeyBase58 === meta.mainPubkey,
    );
    if (!main) return "watch";
    return { accountId: main.id, address: main.publicKeyBase58 };
  }
  return { accountId: meta.id, address: meta.publicKeyBase58 };
}

export function privacyRpcUrl(settings: Settings): string | null {
  const apiKey = heliusApiKeyFromStored(settings.heliusApiUrl);
  if (!apiKey) return null;
  return heliusRpcUrl(settings.cluster, apiKey);
}
