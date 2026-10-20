/**
 * Offscreen document: embeds the sandbox iframe and forwards JSON both ways.
 * Does not execute tools, hold the OpenRouter key, or call Decisions.
 */
import { TX_AI_BRIDGE_KIND, type TxAiBridgeMessage } from "../shared/tx-ai";

const iframe = document.getElementById("sandbox") as HTMLIFrameElement;
const queued: TxAiBridgeMessage[] = [];
let sandboxReady = false;

iframe.src = chrome.runtime.getURL("src/sandbox/index.html");

function sandboxWindow(): Window | null {
  return iframe.contentWindow;
}

function forwardToSandbox(message: TxAiBridgeMessage): void {
  const target = sandboxWindow();
  if (!sandboxReady || !target) {
    queued.push(message);
    return;
  }
  target.postMessage(message, "*");
}

window.addEventListener("message", (event) => {
  if (event.source !== sandboxWindow()) return;
  const message = event.data as TxAiBridgeMessage | undefined;
  if (!message || message.kind !== TX_AI_BRIDGE_KIND) return;
  if (message.op === "sandbox.ready") {
    sandboxReady = true;
    const pending = queued.splice(0);
    for (const item of pending) forwardToSandbox(item);
    return;
  }
  void chrome.runtime.sendMessage(message).then((response: TxAiBridgeMessage) => {
    sandboxWindow()?.postMessage(response, "*");
  });
});

function fromServiceWorker(sender: chrome.runtime.MessageSender): boolean {
  if (sender.id !== chrome.runtime.id || sender.tab) return false;
  const url = sender.url ?? "";
  return url.length === 0 || url.includes("service-worker") || url.includes("/background");
}

chrome.runtime.onMessage.addListener((message: TxAiBridgeMessage, sender, sendResponse) => {
  if (!message || message.kind !== TX_AI_BRIDGE_KIND) return false;
  if (!fromServiceWorker(sender)) return false;
  if (message.op === "assess.start" || message.op === "assess.abort") {
    forwardToSandbox(message);
    sendResponse({ kind: TX_AI_BRIDGE_KIND, op: "tool.result", ok: true });
    return true;
  }
  return false;
});
