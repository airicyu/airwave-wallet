/**
 * This file sends ui.resolvePending with a reject decision for the request on the current flow page. It does not pop the flow stack.
 */
import { sendExtensionRequest } from "../shared/protocol";

export function rejectFlowPending(requestId: string | null): void {
  if (!requestId) return;
  void sendExtensionRequest("ui.resolvePending", { requestId, decision: "reject" });
}
