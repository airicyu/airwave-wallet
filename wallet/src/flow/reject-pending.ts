import { sendExtensionRequest } from "../shared/protocol";

export function rejectFlowPending(requestId: string | null): void {
  if (!requestId) return;
  void sendExtensionRequest("ui.resolvePending", { requestId, decision: "reject" });
}
