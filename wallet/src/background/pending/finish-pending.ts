/**
 * Completes connect, signMessage, and signTransaction pendings with signing and tab bridge responses.
 * Does not schedule timeouts or store pendings in chrome.storage.
 */
import nacl from "tweetnacl";
import type {
  SignInPayload,
  SignMessagePayload,
  SignOffchainMessagePayload,
  SignTransactionPayload,
} from "../../shared/protocol";
import { encodeOffchainMessageV1 } from "../../shared/tx";
import { messageLooksLikeTransactionMessage } from "../../shared/tx";
import { getActivePublicKey, readActiveAccountId, readSettings } from "../storage";
import { getPending, takePending } from "./pending";
import { getWorkingTx } from "./sign-tx-pending-state";
import { sendBridgeResult, rememberConnectedTab, tabOriginStill } from "../messaging";
import { loadedAccountForAccountId, signingErrorForAccountId } from "../session";
import { partiallySignWireTransaction } from "../../shared/tx";
import * as session from "../session";

export async function finishConnect(
  requestId: string,
  tabId: number,
  origin: string,
  approved: boolean,
): Promise<void> {
  const pending = takePending(requestId);
  if (!pending) return;
  const reply = (msg: Parameters<typeof sendBridgeResult>[1]) =>
    sendBridgeResult(tabId, msg, pending.frameId);

  if (!approved) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected connection" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await reply({
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
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_ACCOUNT", message: "No active account" },
    });
    return;
  }

  const still = await tabOriginStill(pending.tabId, pending.origin);
  if (still !== "ok") {
    if (still === "changed") {
      await reply({
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "ORIGIN_CHANGED", message: "Tab origin changed" },
      });
    }
    return;
  }

  await rememberConnectedTab(origin, tabId, activeId);
  const settings = await readSettings();

  await reply({
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
  const reply = (msg: Parameters<typeof sendBridgeResult>[1]) =>
    sendBridgeResult(tabId, msg, pending.frameId);

  const { message } = pending.payload as SignMessagePayload;
  const msgBytes = Uint8Array.from(message);
  const looksLikeTx = messageLooksLikeTransactionMessage(msgBytes);

  if (looksLikeTx) {
    await reply({
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
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
    return;
  }

  const signAccountId = pending.signAccountId;
  if (!signAccountId) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const accountErr = await signingErrorForAccountId(signAccountId);
  if (accountErr) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: accountErr,
    });
    return;
  }

  const loaded = await loadedAccountForAccountId(signAccountId);
  if (!loaded) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const still = await tabOriginStill(pending.tabId, pending.origin);
  if (still !== "ok") {
    if (still === "changed") {
      await reply({
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "ORIGIN_CHANGED", message: "Tab origin changed" },
      });
    }
    return;
  }

  const signature = nacl.sign.detached(msgBytes, loaded.secretKeyBytes);

  await reply({
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { signature: Array.from(signature) },
  });
}

async function finishPreparedBytes(
  requestId: string,
  tabId: number,
  approved: boolean,
  build: (publicKey: Uint8Array) => Uint8Array,
  resultFor: (bytes: Uint8Array, signature: Uint8Array) => Record<string, unknown>,
): Promise<void> {
  const pending = takePending(requestId);
  if (!pending) return;
  const reply = (msg: Parameters<typeof sendBridgeResult>[1]) =>
    sendBridgeResult(tabId, msg, pending.frameId);
  if (!approved) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected" },
    });
    return;
  }
  if (!session.isUnlocked()) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
    return;
  }
  const signAccountId = pending.signAccountId;
  if (!signAccountId) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }
  const accountErr = await signingErrorForAccountId(signAccountId);
  if (accountErr) {
    await reply({ type: "airwave-bridge-result", requestId, ok: false, error: accountErr });
    return;
  }
  const loaded = await loadedAccountForAccountId(signAccountId);
  if (!loaded) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }
  const still = await tabOriginStill(pending.tabId, pending.origin);
  if (still !== "ok") {
    if (still === "changed") {
      await reply({
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "ORIGIN_CHANGED", message: "Tab origin changed" },
      });
    }
    return;
  }
  const publicKey = loaded.secretKeyBytes.subarray(32, 64);
  const bytes = build(publicKey);
  const signature = nacl.sign.detached(bytes, loaded.secretKeyBytes);
  await reply({
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: resultFor(bytes, signature),
  });
}

export async function finishSignOffchainMessage(
  requestId: string,
  tabId: number,
  approved: boolean,
): Promise<void> {
  const peeked = getPending(requestId);
  const payload = peeked?.payload as SignOffchainMessagePayload | undefined;
  const signers = (payload?.requiredSigners ?? []).map((item) => Uint8Array.from(item));
  const message = payload?.message ?? "";
  await finishPreparedBytes(
    requestId,
    tabId,
    approved,
    () => encodeOffchainMessageV1(signers, message),
    (bytes, signature) => ({
      signedOffchainMessage: Array.from(bytes),
      signature: Array.from(signature),
      signatureType: "ed25519",
    }),
  );
}

export async function finishSignIn(
  requestId: string,
  tabId: number,
  approved: boolean,
): Promise<void> {
  const peeked = getPending(requestId);
  const payload = peeked?.payload as SignInPayload | undefined;
  const statementText = payload?.statementText ?? "";
  const offchain = payload?.offchain === true;
  await finishPreparedBytes(
    requestId,
    tabId,
    approved,
    (publicKey) =>
      offchain
        ? encodeOffchainMessageV1([publicKey], statementText)
        : new TextEncoder().encode(statementText),
    (bytes, signature) => ({
      signedMessage: Array.from(bytes),
      signature: Array.from(signature),
      signatureType: "ed25519",
      ...(offchain ? { signedMessageFormat: { kind: "offchainMessage", messageVersion: 1 } } : {}),
    }),
  );
}

export async function finishSignTransaction(
  requestId: string,
  tabId: number,
  approved: boolean,
): Promise<void> {
  const workingBytes = getWorkingTx(requestId);
  const pending = takePending(requestId);
  if (!pending) return;
  const reply = (msg: Parameters<typeof sendBridgeResult>[1]) =>
    sendBridgeResult(tabId, msg, pending.frameId);

  if (!approved) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "USER_REJECTED", message: "User rejected" },
    });
    return;
  }

  if (!session.isUnlocked()) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" },
    });
    return;
  }

  const signAccountId = pending.signAccountId;
  if (!signAccountId) {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const accountErr = await signingErrorForAccountId(signAccountId);
  if (accountErr) {
    await reply({
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
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "NO_KEY", message: "Missing key" },
    });
    return;
  }

  const still = await tabOriginStill(pending.tabId, pending.origin);
  if (still !== "ok") {
    if (still === "changed") {
      await reply({
        type: "airwave-bridge-result",
        requestId,
        ok: false,
        error: { code: "ORIGIN_CHANGED", message: "Tab origin changed" },
      });
    }
    return;
  }

  let signedBytes: Uint8Array;
  try {
    signedBytes = await partiallySignWireTransaction(txBytes, loaded.signer);
  } catch {
    await reply({
      type: "airwave-bridge-result",
      requestId,
      ok: false,
      error: { code: "INVALID_TRANSACTION", message: "Invalid transaction" },
    });
    return;
  }

  await reply({
    type: "airwave-bridge-result",
    requestId,
    ok: true,
    result: { signedTransaction: Array.from(signedBytes) },
  });
}
