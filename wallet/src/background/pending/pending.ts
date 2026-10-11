/**
 * In-memory pending request registry and popout window bindings for approval flows.
 * Does not persist pending state to chrome.storage or finish bridge responses.
 */
import type { PendingRecord } from "../../shared/commands";
import { discardTxAi } from "../tx-ai/runtime";
import { clearSignTxState } from "./sign-tx-pending-state";

export const pendingRequests = new Map<string, PendingRecord>();

let pendingAdded: (id: string) => void = () => {};

export function setPendingAddedHook(listener: (id: string) => void): void {
  pendingAdded = listener;
}

export function addPending(id: string, record: PendingRecord): void {
  pendingRequests.set(id, record);
  pendingAdded(id);
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
