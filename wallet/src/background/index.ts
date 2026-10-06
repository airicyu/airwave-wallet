import type { ExtensionRequest, ExtensionResponse, SignMessagePayload } from "../shared/commands";
import { messageLooksLikeTransactionMessage } from "../shared/sign-message-tx";
import { handleDappCommand, handleUiCommand, handleWalletCommand } from "./handlers";
import { respond, sendBridgeResult } from "./messaging";
import {
  finishWalletSendWindowClosed,
  getPending,
  takePending,
  unbindPopoutWindow,
} from "./pending";
import { finishSignAndSendWindowClosed } from "./send";
import { pendingTimeoutHandlers } from "./send";
import * as session from "./session";

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
    req.command === "storage.patchSettings";
  if (isUiOrWallet && !isExtensionPage(sender)) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "FORBIDDEN", message: "Command not allowed from this sender" },
    });
  }
  await session.ensureHydrated();
  if (req.command.startsWith("dapp.") || req.command === "debug.ping") {
    return handleDappCommand(req);
  }
  if (req.command.startsWith("ui.")) {
    return handleUiCommand(req);
  }
  return handleWalletCommand(req);
}

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

  takePending(requestId);

  let error: { code: string; message: string } = {
    code: "USER_REJECTED",
    message: "Approval window closed",
  };
  if (p.kind === "signMessage") {
    const { message } = p.payload as SignMessagePayload;
    const msgBytes = Uint8Array.from(message);
    if (messageLooksLikeTransactionMessage(msgBytes)) {
      error = {
        code: "SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION",
        message: "Message looks like a transaction",
      };
    }
  }

  void sendBridgeResult(p.tabId, {
    type: "airwave-bridge-result",
    requestId,
    ok: false,
    error,
  });
});
