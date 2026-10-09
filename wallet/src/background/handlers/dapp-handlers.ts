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
} from "../../shared/commands";
import { messageLooksLikeTransactionMessage } from "../../shared/sign-message-tx";
import { getActivePublicKey, readActiveAccountId, readConnections, readSettings } from "../storage";
import { addPending } from "../pending";
import { schedulePendingTimeout } from "../pending";
import { respond } from "../messaging";
import { rememberConnectedTab, removeConnectionAndNotify, tabOriginStill } from "../messaging";
import { notifySidebarDappApproval } from "../messaging/open-dapp-in-shell";
import { openPopout } from "../messaging";
import { isSidebarWalletOpen } from "../shell";
import { pendingTimeoutHandlers } from "../send";
import { signMessageEnqueueGateError } from "../session";
import * as session from "../session";

const ACCEPTED_CHAIN_IDS = new Set(["solana:devnet", "solana:mainnet"]);

function settingsChainId(cluster: "devnet" | "mainnet"): string {
  return cluster === "mainnet" ? "solana:mainnet" : "solana:devnet";
}

async function presentDappApproval(
  requestId: string,
  _tabId: number,
  record: Omit<PendingRecord, "uiHost">,
): Promise<void> {
  let uiHost: PendingRecord["uiHost"] = "popout";
  if (await isSidebarWalletOpen()) {
    addPending(requestId, { ...record, uiHost: "sidebar" });
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    if (await notifySidebarDappApproval(requestId)) return;
  }
  uiHost = "popout";
  addPending(requestId, { ...record, uiHost });
  schedulePendingTimeout(requestId, pendingTimeoutHandlers);
  await openPopout(requestId);
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
    await presentDappApproval(requestId, tabId, {
      kind: "connect",
      tabId,
      frameId,
      origin,
      payload,
      createdAt: Date.now(),
      reconnectWhileLocked: Boolean(trusted),
    });
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
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
    await presentDappApproval(requestId, tabId, {
      kind: "signMessage",
      tabId,
      frameId,
      origin,
      payload,
      createdAt: Date.now(),
      signAccountId: activeId,
      messageLooksLikeTx,
    });
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
    });
  }

  if (req.command === "dapp.signTransaction") {
    const payload = req.payload as SignTransactionPayload | undefined;
    const chain = payload?.chain;
    if (!chain || typeof chain !== "string" || !ACCEPTED_CHAIN_IDS.has(chain)) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "INVALID_CHAIN", message: "Unsupported chain" },
      });
    }
    const settings = await readSettings();
    if (settingsChainId(settings.cluster) !== chain) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: {
          code: "CHAIN_MISMATCH",
          message: "Wallet cluster does not match request chain",
        },
      });
    }
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
    await presentDappApproval(requestId, tabId, {
      kind: "signTransaction",
      tabId,
      frameId,
      origin,
      payload: req.payload as SignTransactionPayload,
      createdAt: Date.now(),
      signAccountId: activeId,
    });
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
    });
  }

  if (req.command === "dapp.signAndSendTransaction") {
    const payload = req.payload as SignAndSendTransactionPayload | undefined;
    const chain = payload?.chain;
    if (!chain || typeof chain !== "string" || !ACCEPTED_CHAIN_IDS.has(chain)) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "INVALID_CHAIN", message: "Unsupported chain" },
      });
    }
    const settings = await readSettings();
    if (settingsChainId(settings.cluster) !== chain) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: {
          code: "CHAIN_MISMATCH",
          message: "Wallet cluster does not match request chain",
        },
      });
    }
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
    await presentDappApproval(requestId, tabId, {
      kind: "signAndSendTransaction",
      tabId,
      frameId,
      origin,
      payload: payload as SignAndSendTransactionPayload,
      createdAt: Date.now(),
      signAccountId: activeId,
    });
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
    });
  }

  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: false,
    error: { code: "UNKNOWN", message: "Unknown dapp command" },
  });
}
