/**
 * Builds one Shield deposit and opens the existing wallet approval pending.
 * Does not request a proof or sign the transaction.
 */
import { address } from "@solana/kit";
import { findAssociatedTokenPda, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import { privacyClient } from "./client";
import { SOL_MINT } from "@heliuslabs/spr/transaction";
import { buildDepositTransaction, isWalletRegistered } from "@heliuslabs/spr/wallet";
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
import { shieldedKeysFor } from "./keys";
import { privacyRpcUrl, signingTarget } from "./target";

function fail(req: ExtensionRequest, code: string): ExtensionResponse {
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code, message: code },
  });
}

export async function handleBeginShield(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const body = req.payload as { mint?: string; amountUi?: string };
  const mint = body.mint?.trim() ?? "";
  const amountUi = body.amountUi?.trim() ?? "";
  if (!mint || !amountUi) return fail(req, "INVALID_PAYLOAD");
  const settings = await readSettings();
  const rpcUrl = privacyRpcUrl(settings);
  const accounts = await readAccounts();
  const target = signingTarget(accounts, await readActiveAccountId());
  if (!rpcUrl || target === "watch" || target === "missing") return fail(req, "PRIVACY_UNAVAILABLE");
  const loaded = getLoadedAccount(target.accountId);
  if (!isUnlocked() || !loaded) return fail(req, "WALLET_LOCKED");
  const asset = mint === NATIVE_SOL_ID || mint === SOL_MINT ? SOL_MINT : mint;
  const { rows } = await getHomeTokensForOwners([target.address], settings);
  const row = rows.find((item) => item.id === (asset === SOL_MINT ? NATIVE_SOL_ID : asset));
  if (!row) return fail(req, "INVALID_PAYLOAD");
  const amount = parseAmountUiToRaw(amountUi, row.decimals);
  if (amount == null || amount <= 0n) return fail(req, "INVALID_PAYLOAD");
  try {
    const client = privacyClient(rpcUrl, settings.cluster);
    const owner = address(target.address);
    if (!(await isWalletRegistered({ rpc: client, owner }))) return fail(req, "NOT_REGISTERED");
    const keys = await shieldedKeysFor(target.accountId);
    const spl = asset === SOL_MINT ? null : await findAssociatedTokenPda({ mint: address(asset), owner, tokenProgram: TOKEN_PROGRAM_ADDRESS });
    const tx = await buildDepositTransaction({
      client,
      feePayer: owner,
      depositor: owner,
      recipient: keys.address(),
      asset: address(asset),
      amount,
      splTokenAccount: spl?.[0],
      splTokenProgram: spl ? TOKEN_PROGRAM_ADDRESS : undefined,
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
    return fail(req, "PRIVACY_SHIELD_FAILED");
  }
}
