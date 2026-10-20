/**
 * Handles dApp connect, disconnect, and sign requests from a page.
 * Does not render the approval window or hold vault keys.
 */

import type {
  ConnectPayload,
  ExtensionRequest,
  ExtensionResponse,
  PendingRecord,
  SignAndSendTransactionPayload,
  SignMessagePayload,
  SignTransactionPayload,
} from "../../shared/protocol";
import { messageLooksLikeTransactionMessage } from "../../shared/tx";
import { getActivePublicKey, readActiveAccountId, readConnections, readSettings } from "../storage";
import { addPending, pendingInsertError, setPendingUiHost } from "../pending";
import { schedulePendingTimeout } from "../pending";
import { respond } from "../messaging";
import { rememberConnectedTab, removeConnectionAndNotify, tabOriginStill } from "../messaging";
import { notifySidebarDappApproval } from "../messaging/open-dapp-in-shell";
import { openPopout } from "../messaging";
import { isSidebarWalletOpen } from "../shell";
import { pendingTimeoutHandlers } from "../send";
import { signMessageEnqueueGateError } from "../session";
import * as session from "../session";
import { resolveDappSignChain } from "./dapp-sign-chain";

function pendingInsertRefusal(requestId: string): ExtensionResponse {
  const code = pendingInsertError(requestId);
  return respond({
    kind: "airwave-ext-res",
    requestId,
    ok: false,
    error: {
      code,
      message: code === "REQUEST_ID_IN_USE" ? "Request id is already pending" : "Request id is invalid",
    },
  });
}

async function presentDappApproval(
  requestId: string,
  _tabId: number,
  record: Omit<PendingRecord, "uiHost">,
): Promise<ExtensionResponse> {
  if (!addPending(requestId, { ...record, uiHost: "popout" })) {
    return pendingInsertRefusal(requestId);
  }
  schedulePendingTimeout(requestId, pendingTimeoutHandlers);
  if (await isSidebarWalletOpen()) {
    setPendingUiHost(requestId, "sidebar");
    if (await notifySidebarDappApproval(requestId)) {
      return respond({
        kind: "airwave-ext-res",
        requestId,
        ok: true,
        result: { pending: true },
      });
    }
    setPendingUiHost(requestId, "popout");
  }
  await openPopout(requestId);
  return respond({
    kind: "airwave-ext-res",
    requestId,
    ok: true,
    result: { pending: true },
  });
}

function tabContext(
  sender: chrome.runtime.MessageSender,
): { origin: string; tabId: number; frameId: number } | null {
  const tabId = sender.tab?.id;
  const url = sender.tab?.url;
  if (tabId == null || !url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return { origin: parsed.origin, tabId, frameId: sender.frameId ?? 0 };
  } catch {
    return null;
  }
}

export async function handleDappCommand(
  req: ExtensionRequest,
  sender: chrome.runtime.MessageSender,
): Promise<ExtensionResponse> {
  const tab = tabContext(sender);
  if (!tab) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "BAD_CONTEXT", message: "Missing tab or origin" },
    });
  }
  const { origin, tabId, frameId } = tab;

  if (req.command === "debug.ping") {
    const p = req.payload as { text?: string } | undefined;
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pong: true, echo: p?.text },
    });
  }

  if (req.command === "dapp.connect") {
    const pubkey = await getActivePublicKey();
    const activeId = await readActiveAccountId();
    if (!pubkey || !activeId) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NO_ACCOUNT", message: "Create a wallet in the extension popup first" },
      });
    }

    const payload = (req.payload ?? {}) as ConnectPayload;
    const connections = await readConnections();
    const trusted = connections[origin];
    if (trusted && session.isUnlocked()) {
      const still = await tabOriginStill(tabId, origin);
      if (still !== "ok") {
        return respond({
          kind: "airwave-ext-res",
          requestId: req.requestId,
          ok: false,
          error:
            still === "changed"
              ? { code: "ORIGIN_CHANGED", message: "Tab origin changed" }
              : { code: "BAD_CONTEXT", message: "Missing tab or origin" },
        });
      }
      await rememberConnectedTab(origin, tabId, activeId);
      const settings = await readSettings();
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: true,
        result: { publicKey: pubkey, cluster: settings.cluster },
      });
    }
    if (payload.silent) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: trusted
          ? { code: "WALLET_LOCKED", message: "Unlock wallet in extension popup" }
          : { code: "NOT_CONNECTED", message: "Origin is not connected" },
      });
    }

    const requestId = req.requestId;
    return presentDappApproval(requestId, tabId, {
      kind: "connect",
      tabId,
      frameId,
      origin,
      payload,
      createdAt: Date.now(),
      reconnectWhileLocked: Boolean(trusted),
    });
  }

  if (req.command === "dapp.disconnect") {
    await removeConnectionAndNotify(origin, tabId);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { disconnected: true },
    });
  }

  if (req.command === "dapp.signMessage") {
    const activeForConn = await readActiveAccountId();
    const connections = await readConnections();
    if (!activeForConn || connections[origin]?.accountId !== activeForConn) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_CONNECTED", message: "Origin is not connected" },
      });
    }
    const gate = await signMessageEnqueueGateError();
    if (gate) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: gate,
      });
    }
    const activeId = await readActiveAccountId();
    if (!activeId) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NO_ACCOUNT", message: "No active account" },
      });
    }
    const payload = req.payload as SignMessagePayload;
    const msgBytes = Uint8Array.from(payload.message);
    const messageLooksLikeTx = messageLooksLikeTransactionMessage(msgBytes);
    const requestId = req.requestId;
    return presentDappApproval(requestId, tabId, {
      kind: "signMessage",
      tabId,
      frameId,
      origin,
      payload,
      createdAt: Date.now(),
      signAccountId: activeId,
      messageLooksLikeTx,
    });
  }

  if (req.command === "dapp.signTransaction") {
    const payload = req.payload as SignTransactionPayload | undefined;
    const settings = await readSettings();
    const resolved = resolveDappSignChain(payload?.chain, settings.cluster);
    if (!resolved.ok) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: resolved.code, message: resolved.message },
      });
    }
    const chain = resolved.chain;
    const activeForConn = await readActiveAccountId();
    const connections = await readConnections();
    if (!activeForConn || connections[origin]?.accountId !== activeForConn) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_CONNECTED", message: "Origin is not connected" },
      });
    }
    const gate = await signMessageEnqueueGateError();
    if (gate) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: gate,
      });
    }
    const activeId = await readActiveAccountId();
    if (!activeId) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NO_ACCOUNT", message: "No active account" },
      });
    }
    const requestId = req.requestId;
    return presentDappApproval(requestId, tabId, {
      kind: "signTransaction",
      tabId,
      frameId,
      origin,
      payload: { ...(req.payload as SignTransactionPayload), chain },
      signAccountId: activeId,
      createdAt: Date.now(),
    });
  }

  if (req.command === "dapp.signAndSendTransaction") {
    const payload = req.payload as SignAndSendTransactionPayload | undefined;
    const settings = await readSettings();
    const resolved = resolveDappSignChain(payload?.chain, settings.cluster);
    if (!resolved.ok) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: resolved.code, message: resolved.message },
      });
    }
    const chain = resolved.chain;
    const activeForConn = await readActiveAccountId();
    const connections = await readConnections();
    if (!activeForConn || connections[origin]?.accountId !== activeForConn) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NOT_CONNECTED", message: "Origin is not connected" },
      });
    }
    const gate = await signMessageEnqueueGateError();
    if (gate) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: gate,
      });
    }
    const activeId = await readActiveAccountId();
    if (!activeId) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "NO_ACCOUNT", message: "No active account" },
      });
    }
    const requestId = req.requestId;
    return presentDappApproval(requestId, tabId, {
      kind: "signAndSendTransaction",
      tabId,
      frameId,
      origin,
      payload: { ...(payload as SignAndSendTransactionPayload), chain },
      createdAt: Date.now(),
      signAccountId: activeId,
    });
  }

  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "UNKNOWN", message: "Unknown dapp command" },
  });
}
