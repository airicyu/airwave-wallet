/**
 * This file sends one typed extension request to the service worker and returns that call's response. The command names and payloads live in the command types.
 */
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
