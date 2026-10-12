/**
 * In-memory pending request registry and popout window bindings for approval flows.
 * Refuses to replace an id that is already pending. Does not persist pending state or finish bridge responses.
 */
import type { PendingRecord } from "../../shared/commands";
import { discardTxAi } from "../tx-ai/runtime";
import { clearSignTxState } from "./sign-tx-pending-state";

export const pendingRequests = new Map<string, PendingRecord>();

/** Page-supplied ids longer than this are rejected so one key cannot pin the map. */
const PENDING_ID_MAX = 80;

let pendingAdded: (id: string) => void = () => {};

export function setPendingAddedHook(listener: (id: string) => void): void {
  pendingAdded = listener;
}

function acceptablePendingId(id: string): boolean {
  return typeof id === "string" && id.length > 0 && id.length <= PENDING_ID_MAX;
}

/** Insert only. Returns false when the id is invalid or already in flight. */
export function addPending(id: string, record: PendingRecord): boolean {
  if (!acceptablePendingId(id) || pendingRequests.has(id)) return false;
  pendingRequests.set(id, record);
  pendingAdded(id);
  return true;
}

/** Why a failed insert was refused. Call only after addPending returned false. */
export function pendingInsertError(id: string): "INVALID_REQUEST_ID" | "REQUEST_ID_IN_USE" {
  return acceptablePendingId(id) ? "REQUEST_ID_IN_USE" : "INVALID_REQUEST_ID";
}

/** Move an in-flight approval between sidebar and popout without touching its payload. */
export function setPendingUiHost(id: string, uiHost: PendingRecord["uiHost"]): void {
  const existing = pendingRequests.get(id);
  if (!existing) return;
  existing.uiHost = uiHost;
}

export function takePending(id: string): PendingRecord | undefined {
  const r = pendingRequests.get(id);
  pendingRequests.delete(id);
  if (r) clearSignTxState(id);
  discardTxAi(id);
  return r;
}

export function getPending(id: string): PendingRecord | undefined {
  return pendingRequests.get(id);
}

export function removePending(id: string): void {
  pendingRequests.delete(id);
  clearSignTxState(id);
  discardTxAi(id);
}

/** popout windowId → requestId (memory only). */
export const pendingByWindow = new Map<number, string>();

export function bindPopoutWindow(windowId: number, requestId: string): void {
  pendingByWindow.set(windowId, requestId);
}

export function unbindPopoutWindow(windowId: number): string | undefined {
  const id = pendingByWindow.get(windowId);
  pendingByWindow.delete(windowId);
  return id;
}

export function unbindPopoutByRequest(requestId: string): void {
  for (const [windowId, id] of pendingByWindow) {
    if (id === requestId) {
      pendingByWindow.delete(windowId);
      return;
    }
  }
}

export async function closePopoutForRequest(requestId: string): Promise<void> {
  for (const [windowId, id] of pendingByWindow) {
    if (id === requestId) {
      pendingByWindow.delete(windowId);
      try {
        await chrome.windows.remove(windowId);
      } catch {
        /* already closed */
      }
      return;
    }
  }
}
