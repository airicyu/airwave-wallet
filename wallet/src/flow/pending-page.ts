import type { PendingKind } from "../shared/commands";
import type { FlowPageId } from "./types";

export function flowPageIdFromKind(kind: PendingKind): FlowPageId | null {
  if (kind === "connect") return "connect";
  if (kind === "signMessage") return "sign-message";
  if (kind === "signTransaction" || kind === "signAndSendTransaction") return "sign-transaction";
  return null;
}
