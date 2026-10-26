/**
 * This file maps a pending kind to the flow page that should show it. Connect, sign-message, and the two transaction sign kinds have pages. Other kinds do not.
 */
import type { PendingKind } from "../shared/protocol";
import type { FlowPageId } from "./types";

export function flowPageIdFromKind(kind: PendingKind): FlowPageId | null {
  if (kind === "connect") return "connect";
  if (kind === "signMessage") return "sign-message";
  if (kind === "signTransaction" || kind === "signAndSendTransaction") return "sign-transaction";
  return null;
}
