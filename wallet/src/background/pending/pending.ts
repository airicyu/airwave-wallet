import type { PendingRecord } from "../../shared/commands";
import { clearSignTxState } from "./sign-tx-pending-state";

export const pendingRequests = new Map<string, PendingRecord>();

export function addPending(id: string, record: PendingRecord): void {
  pendingRequests.set(id, record);
}

export function takePending(id: string): PendingRecord | undefined {
  const r = pendingRequests.get(id);
  pendingRequests.delete(id);
  if (r) clearSignTxState(id);
  return r;
}

export function getPending(id: string): PendingRecord | undefined {
  return pendingRequests.get(id);
}

export function removePending(id: string): void {
  pendingRequests.delete(id);
  clearSignTxState(id);
}

/** popout windowId → requestId（僅記憶體） */
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
