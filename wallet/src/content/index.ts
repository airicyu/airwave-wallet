import type {
  AirwaveBridgeAccountChanged,
  AirwaveBridgeDisconnected,
  AirwaveBridgeResult,
} from "../shared/bridge";
import type { AirwaveContentIn, AirwaveInjectOut } from "../shared/bridge";
import type { ExtensionRequest, ExtensionResponse } from "../shared/commands";

const pageOrigin = location.origin;

function forwardToPage(data: AirwaveContentIn): void {
  window.postMessage(data, window.location.origin);
}

const PAGE_COMMANDS = new Set([
  "debug.ping",
  "dapp.connect",
  "dapp.disconnect",
  "dapp.signMessage",
  "dapp.signTransaction",
]);

window.addEventListener("message", (event) => {
  if (event.source !== window || event.origin !== pageOrigin) return;
  const data = event.data as AirwaveInjectOut | undefined;
  if (!data || data.source !== "airwave-inject") return;
  if (typeof data.command !== "string" || !PAGE_COMMANDS.has(data.command)) return;

  const extReq: ExtensionRequest = {
    kind: "airwave-ext-req",
    requestId: data.requestId,
    command: data.command as ExtensionRequest["command"],
    payload: data.payload,
    origin: pageOrigin,
    tabId: undefined,
    frameId: 0,
  };

  chrome.runtime.sendMessage(extReq, (res: ExtensionResponse | undefined) => {
    if (chrome.runtime.lastError || !res) {
      forwardToPage({
        source: "airwave-content",
        requestId: data.requestId,
        ok: false,
        error: {
          code: "EXTENSION_ERROR",
          message: chrome.runtime.lastError?.message ?? "No response",
        },
      });
      return;
    }

    const pending =
      res.ok &&
      res.result &&
      typeof res.result === "object" &&
      (res.result as { pending?: boolean }).pending === true;

    if (pending) {
      return;
    }

    forwardToPage({
      source: "airwave-content",
      requestId: data.requestId,
      ok: res.ok,
      result: res.result,
      error: res.error,
    });
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (!message || typeof message !== "object") return;
  const m = message as AirwaveBridgeResult | AirwaveBridgeAccountChanged | AirwaveBridgeDisconnected;
  if (m.type === "airwave-bridge-result") {
    const br = m as AirwaveBridgeResult;
    forwardToPage({
      source: "airwave-content",
      requestId: br.requestId,
      ok: br.ok,
      result: br.result,
      error: br.error,
    });
  } else if (m.type === "airwave-bridge-account-changed") {
    const ac = m as AirwaveBridgeAccountChanged;
    window.postMessage(
      {
        source: "airwave-content",
        event: "account-changed",
        publicKeyBase58: ac.publicKeyBase58,
        cluster: ac.cluster,
      },
      pageOrigin,
    );
  } else if (m.type === "airwave-bridge-disconnected") {
    const dc = m as AirwaveBridgeDisconnected;
    window.postMessage(
      {
        source: "airwave-content",
        event: "disconnected",
        origin: dc.origin,
      },
      pageOrigin,
    );
  }
});

import injectUrl from "../inject/index.ts?script&module";

const script = document.createElement("script");
script.type = "module";
const injectPath = injectUrl.startsWith("/") ? injectUrl.slice(1) : injectUrl;
script.src = chrome.runtime.getURL(injectPath);
(document.head || document.documentElement).appendChild(script);
