/**
 * Starts an in-wallet send by building an unsigned transaction and registering popup pending state.
 * Does not sign, broadcast, or handle dApp-originated sign requests.
 */
import type { BeginSendPayload, ExtensionRequest, ExtensionResponse } from "../../../shared/protocol";
import { getExposedPublicKey, resolvePubkey } from "../../../shared/accounts";
import { jsonRpcMissing } from "../../../shared/protocol";
import { getHomeTokensForOwners } from "../../home-tokens";
import { respond } from "../../messaging";
import { addPending, pendingInsertError, schedulePendingTimeout } from "../../pending";
import {
  buildWalletSendTransaction,
  pendingTimeoutHandlers,
  resolveHomeTokenRowForSend,
} from "../../send";
import {
  getActiveAccountMeta,
  loadedAccountForAccountId,
  signGateError,
} from "../../session";
import * as session from "../../session";
import { readAccounts, readSettings } from "../../storage";

import { walletShellSurfaceFromHref } from "../../../shared/shell";

function uiHostFromSender(sender: chrome.runtime.MessageSender): "window" | "sidebar" {
  const url = sender.url ?? sender.tab?.url ?? "";
  const surface = walletShellSurfaceFromHref(url);
  return surface === "sidebar" ? "sidebar" : "window";
}

export async function handleBeginSend(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  if (!session.isUnlocked()) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
  }
  const active = await getActiveAccountMeta();
  if (!active) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "NO_ACCOUNT", message: "No active account" },
    });
  }
  const gateErr = await signGateError();
  if (gateErr) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: gateErr.code, message: gateErr.message },
    });
  }
  const accounts = await readAccounts();
  const secrets = session.getVaultSecrets()?.secrets;
  const gatePubkey = getExposedPublicKey(active);
  const resolved = resolvePubkey(accounts, secrets, gatePubkey);
  if (resolved.role !== "signing") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_READ_ONLY", message: "Read-only account cannot send" },
    });
  }
  const signAccountId = resolved.accountId;
  const payload = req.payload as BeginSendPayload;
  const settings = await readSettings();
  if (jsonRpcMissing(settings)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "MAINNET_RPC_UNSET", message: "Mainnet RPC is not set" },
    });
  }
  const { rows } = await getHomeTokensForOwners([gatePubkey], settings);
  const row = await resolveHomeTokenRowForSend(rows, payload.tokenId);
  if (!row) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PAYLOAD", message: "Unknown token" },
    });
  }
  const kp = await loadedAccountForAccountId(signAccountId);
  if (!kp) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
  }
  const requestId = crypto.randomUUID();
  const built = await buildWalletSendTransaction(
    settings,
    kp,
    row,
    payload.amountUi,
    payload.recipient,
    requestId,
  );
  if ("code" in built) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: {
        code: built.code,
        message: built.code,
      },
    });
  }
  const reserved = addPending(requestId, {
    kind: "walletSend",
    tabId: 0,
    frameId: 0,
    origin: "airwave:wallet",
    payload: { transaction: Array.from(built.txBytes) },
    createdAt: Date.now(),
    signAccountId,
    uiHost: uiHostFromSender(sender),
  });
  if (!reserved) {
    const code = pendingInsertError(requestId);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: {
        code,
        message: code === "REQUEST_ID_IN_USE" ? "Request id is already pending" : "Request id is invalid",
      },
    });
  }
  schedulePendingTimeout(requestId, pendingTimeoutHandlers);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { requestId },
  });
}
