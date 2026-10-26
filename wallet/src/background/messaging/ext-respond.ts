/**
 * This file returns an extension response unchanged. Handlers use it so a reply is typed as the response the service worker sends back to the caller.
 */
import type { ExtensionResponse } from "../../shared/protocol";

export function respond(res: ExtensionResponse): ExtensionResponse {
  return res;
}
