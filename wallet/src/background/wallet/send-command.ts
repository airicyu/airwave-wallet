import type { BeginSendPayload, ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { getExposedPublicKey } from "../../shared/accounts";
import { accountKind } from "../../shared/storage-keys";
import { getHomeTokensForOwners } from "../home-tokens";
import { respond } from "../messaging";
import { addPending, schedulePendingTimeout } from "../pending";
import {
  buildWalletSendTransaction,
  pendingTimeoutHandlers,
  resolveHomeTokenRowForSend,
} from "../send";
import { getActiveAccountMeta, keypairForAccountId } from "../session";
import * as session from "../session";
import { readSettings } from "../storage";

export async function handleBeginSend(req: ExtensionRequest): Promise<ExtensionResponse> {
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
  if (accountKind(active) !== "signing") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "ACCOUNT_READ_ONLY", message: "Read-only account cannot send" },
    });
  }
  const payload = req.payload as BeginSendPayload;
  const settings = await readSettings();
  const owner = getExposedPublicKey(active);
  const { rows } = await getHomeTokensForOwners([owner], settings);
  const row = await resolveHomeTokenRowForSend(rows, payload.tokenId);
  if (!row) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PAYLOAD", message: "Unknown token" },
    });
  }
  const kp = await keypairForAccountId(active.id);
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
  addPending(requestId, {
    kind: "walletSend",
    tabId: 0,
    frameId: 0,
    origin: "airwave:wallet",
    payload: { transaction: Array.from(built.txBytes) },
    createdAt: Date.now(),
    signAccountId: active.id,
    uiHost: "popup",
  });
  schedulePendingTimeout(requestId, pendingTimeoutHandlers);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { requestId },
  });
}

