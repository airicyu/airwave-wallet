/**
 * Shared gate for private-balance commands. It loads settings, requires a Helius RPC,
 * and requires the active account to be an unlocked signing wallet. It also maps the
 * native SOL id onto the shielded SOL mint. It does not build a transaction.
 */
import { SOL_MINT } from "@heliuslabs/spr/transaction";
import type { ExtensionRequest, ExtensionResponse, Settings } from "../../shared/protocol";
import { NATIVE_SOL_ID } from "../../shared/home";
import { respond } from "../messaging";
import { readAccounts, readActiveAccountId, readSettings } from "../storage";
import { getLoadedAccount, isUnlocked } from "../session";
import { privacyRpcUrl, signingTarget, type SigningTarget } from "./target";

export function privacyFail(req: ExtensionRequest, code: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message: code },
  });
}

export type PrivacySession = {
  settings: Settings;
  rpcUrl: string;
  target: SigningTarget;
};

export async function privacySession(req: ExtensionRequest): Promise<PrivacySession | ExtensionResponse> {
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const target = signingTarget(await readAccounts(), await readActiveAccountId());
  if (!rpcUrl || target === "watch" || target === "missing") return privacyFail(req, "PRIVACY_UNAVAILABLE");
  const loaded = getLoadedAccount(target.accountId);
  if (!isUnlocked() || !loaded) return privacyFail(req, "WALLET_LOCKED");
  return { settings, rpcUrl, target };
}

export function privacyAsset(mint: string): string {
  return mint === NATIVE_SOL_ID || mint === SOL_MINT ? SOL_MINT : mint;
}
