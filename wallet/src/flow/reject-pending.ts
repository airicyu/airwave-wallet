import { sendExtensionRequest } from "../shared/ext-api";

export function rejectFlowPending(requestId: string | null): void {
  if (!requestId) return;
  void sendExtensionRequest("ui.resolvePending", { requestId, decision: "reject" });
}
