/**
 * Service worker entry: validates senders, hydrates session, routes commands to dapp/UI/wallet handlers, cleans up pendings on window close.
 * Does not embed individual feature handler implementations.
 */
import type { ExtensionRequest, ExtensionResponse } from "../shared/commands";
import { handleDappCommand, handleUiCommand, handleWalletCommand } from "./handlers";
import { alignConnectionsToActiveAccount, respond } from "./messaging";
import {
  finishWalletSendWindowClosed,
  getPending,
  rejectOrdinaryDappPending,
  unbindPopoutWindow,
} from "./pending";
import { finishSignAndSendWindowClosed } from "./send";
import { pendingTimeoutHandlers } from "./send";
import { registerWalletShellListeners } from "./shell";
import * as session from "./session";
import { ensureLocalMigrated } from "./storage";
import { installTxAiAssess, maybeStartTxAi } from "./tx-ai/assess";
import { handleTxAiBridge, isTxAiOffscreenSender } from "./tx-ai/bridge";
import { setPendingAddedHook } from "./pending";
import { TX_AI_BRIDGE_KIND, type TxAiBridgeMessage } from "../shared/tx-ai-protocol";

// Rolldown shares this entry with extension pages. Listeners belong only to the service worker.
const workerScope = (globalThis as { ServiceWorkerGlobalScope?: new () => object }).ServiceWorkerGlobalScope;
const inServiceWorker = typeof workerScope === "function" && globalThis instanceof workerScope;

if (inServiceWorker) bootServiceWorker();

function bootServiceWorker(): void {
  registerWalletShellListeners();
  installTxAiAssess();
  setPendingAddedHook((id) => {
    maybeStartTxAi(id);
  });
  void chrome.storage.session.setAccessLevel({ accessLevel: "TRUSTED_CONTEXTS" }).catch(() => {});
  void ensureLocalMigrated();

  function isExtensionPage(sender: chrome.runtime.MessageSender): boolean {
    const url = sender.url ?? "";
    return url.startsWith(chrome.runtime.getURL(""));
  }

  async function dispatch(
    req: ExtensionRequest,
    sender: chrome.runtime.MessageSender,
  ): Promise<ExtensionResponse> {
    const isUiOrWallet =
      req.command.startsWith("ui.") ||
      req.command.startsWith("wallet.") ||
      req.command.startsWith("shell.") ||
      req.command === "storage.patchSettings";
    if (isUiOrWallet && !isExtensionPage(sender)) {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "FORBIDDEN", message: "Command not allowed from this sender" },
      });
    }
    try {
      await ensureLocalMigrated();
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "STORAGE_MIGRATION_FAILED", message: "Storage migration failed" },
      });
    }
    await session.ensureHydrated();
    await alignConnectionsToActiveAccount();
    if (req.command.startsWith("dapp.") || req.command === "debug.ping") {
      return handleDappCommand(req, sender);
    }
    if (req.command.startsWith("ui.")) {
      return handleUiCommand(req);
    }
    return handleWalletCommand(req, sender);
  }

  chrome.runtime.onMessage.addListener((message: TxAiBridgeMessage, sender, sendResponse) => {
    if (message?.kind !== TX_AI_BRIDGE_KIND) return false;
    if (!isTxAiOffscreenSender(sender)) {
      sendResponse({ kind: TX_AI_BRIDGE_KIND, op: "assess.fail", message: "rejected" });
      return true;
    }
    void handleTxAiBridge(message)
      .then(sendResponse)
      .catch(() => {
        sendResponse({ kind: TX_AI_BRIDGE_KIND, op: "assess.fail", message: "rejected" });
      });
    return true;
  });

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.kind !== "airwave-ext-req") return false;
    const req = message as ExtensionRequest;
    if (req.tabId == null && sender.tab?.id != null) req.tabId = sender.tab.id;
    dispatch(req, sender)
      .then(sendResponse)
      .catch((e: unknown) => {
        const req = message as ExtensionRequest;
        sendResponse(
          respond({
            kind: "airwave-ext-res",
            requestId: req.requestId,
            ok: false,
            error: {
              code: "INTERNAL",
              message: e instanceof Error ? e.message : "Internal error",
            },
          }),
        );
      });
    return true;
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    const requestId = unbindPopoutWindow(windowId);
    if (!requestId) return;
    const p = getPending(requestId);
    if (!p) return;

    if (p.kind === "walletSend") {
      void finishWalletSendWindowClosed(requestId, p, pendingTimeoutHandlers);
      return;
    }

    if (p.kind === "signAndSendTransaction") {
      void finishSignAndSendWindowClosed(requestId);
      return;
    }

    void rejectOrdinaryDappPending(requestId);
  });
}
