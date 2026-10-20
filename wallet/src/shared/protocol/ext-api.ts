import type { ExtensionRequest, ExtensionResponse } from "./commands";

export function sendExtensionRequest(
  command: ExtensionRequest["command"],
  payload?: unknown,
): Promise<ExtensionResponse> {
  const requestId = crypto.randomUUID();
  const msg: ExtensionRequest = {
    kind: "airwave-ext-req",
    requestId,
    command,
    payload,
  };
  return chrome.runtime.sendMessage(msg) as Promise<ExtensionResponse>;
}
