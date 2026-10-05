import type {
  ConnectPayload,
  ExtensionRequest,
  ExtensionResponse,
  SignMessagePayload,
  SignTransactionPayload,
} from "../../shared/commands";
import { messageLooksLikeTransactionMessage } from "../../shared/sign-message-tx";
import { getActivePublicKey, readActiveAccountId, readConnections, readSettings } from "../storage";
import { addPending } from "../pending";
import { schedulePendingTimeout } from "../pending";
import { respond } from "../messaging";
import { rememberConnectedTab, removeConnectionAndNotify } from "../messaging";
import { openPopout } from "../messaging";
import { pendingTimeoutHandlers } from "../send";
import { signMessageEnqueueGateError } from "../session";

export async function handleDappCommand(req: ExtensionRequest): Promise<ExtensionResponse> {
  const tabId = req.tabId;
  const origin = req.origin;
  if (tabId == null || !origin) {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "BAD_CONTEXT", message: "Missing tab or origin" },
    });
  }

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
    if (trusted) {
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
        error: { code: "NOT_CONNECTED", message: "Origin is not connected" },
      });
    }

    const requestId = req.requestId;
    addPending(requestId, {
      kind: "connect",
      tabId,
      frameId: req.frameId ?? 0,
      origin,
      payload,
      createdAt: Date.now(),
      uiHost: "popout",
    });
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    await openPopout(requestId);
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
    addPending(requestId, {
      kind: "signMessage",
      tabId,
      frameId: req.frameId ?? 0,
      origin,
      payload,
      createdAt: Date.now(),
      signAccountId: activeId,
      messageLooksLikeTx,
      uiHost: "popout",
    });
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    await openPopout(requestId);
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { pending: true },
    });
  }

  if (req.command === "dapp.signTransaction") {
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
    addPending(requestId, {
      kind: "signTransaction",
      tabId,
      frameId: req.frameId ?? 0,
      origin,
      payload: req.payload as SignTransactionPayload,
      createdAt: Date.now(),
      signAccountId: activeId,
      uiHost: "popout",
    });
    schedulePendingTimeout(requestId, pendingTimeoutHandlers);
    await openPopout(requestId);
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
