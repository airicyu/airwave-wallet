/**
 * Builds one Unshield withdrawal back to the signing address and opens approval.
 * Does not ask for a recipient.
 */
import { address } from "@solana/kit";
import { TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { privacyClient } from "./client";
import { SOL_MINT, Wallet } from "@heliuslabs/spr/transaction";
import { buildWithdrawalTransaction, syncWallet } from "@heliuslabs/spr/wallet";
import type { ExtensionRequest, ExtensionResponse } from "../../shared/protocol";
import { NATIVE_SOL_ID } from "../../shared/home";
import { parseAmountUiToRaw } from "../../shared/send";
import { encodeWireTransaction } from "../../shared/tx";
import { walletShellSurfaceFromHref } from "../../shared/shell";
import { respond } from "../messaging";
import { addPending, pendingInsertError, schedulePendingTimeout } from "../pending";
import { pendingTimeoutHandlers } from "../send/wallet-send-broadcast";
import { getHomeTokensForOwners } from "../home-tokens";
import { readAccounts, readActiveAccountId, readSettings } from "../storage";
import { getLoadedAccount, isUnlocked } from "../session";
import { walletKeysFor } from "./keys";
import { privacyRpcUrl, signingTarget } from "./target";

function fail(req: ExtensionRequest, code: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message: code },
  });
}

export async function handleBeginUnshield(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const body = req.payload as { mint?: string; amountUi?: string };
  const mint = body.mint?.trim() ?? "";
  const amountUi = body.amountUi?.trim() ?? "";
  if (!mint || !amountUi) return fail(req, "INVALID_PAYLOAD");
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const target = signingTarget(await readAccounts(), await readActiveAccountId());
  if (!rpcUrl || target === "watch" || target === "missing") return fail(req, "PRIVACY_UNAVAILABLE");
  const loaded = getLoadedAccount(target.accountId);
  if (!isUnlocked() || !loaded) return fail(req, "WALLET_LOCKED");
  const asset = mint === NATIVE_SOL_ID || mint === SOL_MINT ? SOL_MINT : mint;
  const { rows } = await getHomeTokensForOwners([target.address], settings);
  const row = rows.find((item) => item.id === (asset === SOL_MINT ? NATIVE_SOL_ID : asset));
  const decimals = asset === SOL_MINT ? 9 : row?.decimals;
  if (decimals == null) return fail(req, "INVALID_PAYLOAD");
  const amount = parseAmountUiToRaw(amountUi, decimals);
  if (amount == null || amount <= 0n) return fail(req, "INVALID_PAYLOAD");
  try {
    const client = privacyClient(rpcUrl, settings.cluster);
    const keys = await walletKeysFor(target.accountId, client.proofService);
    const wallet = new Wallet({ identity: keys.address() });
    await syncWallet({ wallet, keys, client });
    const owner = address(target.address);
    const tx = await buildWithdrawalTransaction({
      client,
      wallet,
      keys,
      feePayer: owner,
      recipient: owner,
      asset: address(asset),
      amount,
      splTokenProgram: asset === SOL_MINT ? undefined : TOKEN_PROGRAM_ADDRESS,
    });
    const requestId = crypto.randomUUID();
    const url = sender.url ?? sender.tab?.url ?? "";
    const reserved = addPending(requestId, {
      kind: "walletSend",
      tabId: 0,
      frameId: 0,
      origin: "airwave:wallet",
      payload: { transaction: Array.from(encodeWireTransaction(tx)) },
      createdAt: Date.now(),
      signAccountId: target.accountId,
      uiHost: walletShellSurfaceFromHref(url) === "sidebar" ? "sidebar" : "window",
    });
    if (!reserved) return fail(req, pendingInsertError(requestId));
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { requestId },
    });
  } catch {
    return fail(req, "PRIVACY_UNSHIELD_FAILED");
  }
}
