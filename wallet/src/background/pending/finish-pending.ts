/**
 * Completes connect, signMessage, and signTransaction pendings with signing and tab bridge responses.
 * Does not schedule timeouts or store pendings in chrome.storage.
 */
import nacl from "tweetnacl";
import type { SignMessagePayload, SignTransactionPayload } from "../../shared/commands";
import { messageLooksLikeTransactionMessage } from "../../shared/sign-message-tx";
import { getActivePublicKey, readActiveAccountId, readSettings } from "../storage";
import { takePending } from "./pending";
import { getWorkingTx } from "./sign-tx-pending-state";
import { sendBridgeResult, rememberConnectedTab } from "../messaging";
import { loadedAccountForAccountId, signingErrorForAccountId } from "../session";
import { partiallySignWireTransaction } from "../../shared/tx-wire";
import * as session from "../session";

export async function finishConnect(
  requestId: string,
  tabId: number,
  origin: string,
  approved: boolean,
): Promise<void> {
  const pending = takePending(requestId);
  if (!pending) return;

  if (!approved) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected connection" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
    return;
  }

  const activeId = await readActiveAccountId();
  const pubkey = await getActivePublicKey();
  if (!activeId || !pubkey) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_ACCOUNT", message: "No active account" },
    });
    return;
  }

  await rememberConnectedTab(origin, tabId, activeId);
  const settings = await readSettings();

  await sendBridgeResult(tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { publicKey: pubkey, cluster: settings.cluster },
  });
}

export async function finishSignMessage(
  requestId: string,
  tabId: number,
  approved: boolean,
): Promise<void> {
  const pending = takePending(requestId);
  if (!pending) return;

  const { message } = pending.payload as SignMessagePayload;
  const msgBytes = Uint8Array.from(message);
  const looksLikeTx = messageLooksLikeTransactionMessage(msgBytes);

  if (looksLikeTx) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: {
        code: "SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION",
        message: "Message looks like a transaction",
      },
    });
    return;
  }

  if (!approved) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
    return;
  }

  const signAccountId = pending.signAccountId;
  if (!signAccountId) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const accountErr = await signingErrorForAccountId(signAccountId);
  if (accountErr) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: accountErr,
    });
    return;
  }

  const loaded = await loadedAccountForAccountId(signAccountId);
  if (!loaded) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const signature = nacl.sign.detached(msgBytes, loaded.secretKeyBytes);

  await sendBridgeResult(tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { signature: Array.from(signature) },
  });
}

export async function finishSignTransaction(
  requestId: string,
  tabId: number,
  approved: boolean,
): Promise<void> {
  const workingBytes = getWorkingTx(requestId);
  const pending = takePending(requestId);
  if (!pending) return;

  if (!approved) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
    return;
  }

  const signAccountId = pending.signAccountId;
  if (!signAccountId) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const accountErr = await signingErrorForAccountId(signAccountId);
  if (accountErr) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: accountErr,
    });
    return;
  }

  const { transaction } = pending.payload as SignTransactionPayload;
  const txBytes = Uint8Array.from(workingBytes ?? transaction);

  const loaded = await loadedAccountForAccountId(signAccountId);
  if (!loaded) {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  let signedBytes: Uint8Array;
  try {
    signedBytes = await partiallySignWireTransaction(txBytes, loaded.signer);
  } catch {
    await sendBridgeResult(tabId, {
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "INVALID_TRANSACTION", message: "Invalid transaction" },
    });
    return;
  }

  await sendBridgeResult(tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { signedTransaction: Array.from(signedBytes) },
  });
}
