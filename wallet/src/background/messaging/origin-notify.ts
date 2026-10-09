/**
 * Notifies connected dapp tabs with bridge results, account changes, and disconnect events.
 * Does not accept or enqueue new dapp pending requests.
 */
import type {
  AirwaveBridgeAccountChanged,
  AirwaveBridgeDisconnected,
  AirwaveBridgeResult,
} from "../../shared/bridge";
import { getActivePublicKey, readActiveAccountId, readConnections, readSettings, writeConnections } from "../storage";

export async function sendBridgeResult(
  tabId: number,
  msg: AirwaveBridgeResult,
  frameId?: number,
): Promise<void> {
  try {
    if (frameId != null) await chrome.tabs.sendMessage(tabId, msg, { frameId });
    else await chrome.tabs.sendMessage(tabId, msg);
  } catch {
    /* tab closed */
  }
}

export async function tabOriginStill(
  tabId: number,
  origin: string,
): Promise<"ok" | "closed" | "changed"> {
  let tab: chrome.tabs.Tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return "closed";
  }
  try {
    const parsed = new URL(tab.url ?? "");
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "changed";
    return parsed.origin === origin ? "ok" : "changed";
  } catch {
    return "changed";
  }
}

export async function alignConnectionsToActiveAccount(): Promise<void> {
  const activeId = await readActiveAccountId();
  if (!activeId) return;
  const connections = await readConnections();
  const rows = Object.values(connections);
  if (rows.length === 0 || rows.every((rec) => rec.accountId === activeId)) return;
  for (const rec of rows) rec.accountId = activeId;
  await writeConnections(connections);
  const pubkey = await getActivePublicKey();
  if (pubkey) await notifyAccountChanged(pubkey);
}

export async function notifyAccountChanged(publicKeyBase58: string): Promise<void> {
  const connections = await readConnections();
  const settings = await readSettings();
  const msg: AirwaveBridgeAccountChanged = {
    type: "airwave-bridge-account-changed",
    publicKeyBase58,
    cluster: settings.cluster,
  };
  for (const rec of Object.values(connections)) {
    for (const tabId of rec.tabIds) {
      try {
        await chrome.tabs.sendMessage(tabId, msg);
      } catch {
        /* ignore */
      }
    }
  }
}

export async function notifyAccountChangedForConnectionAccount(
  boundAccountId: string,
  publicKeyBase58: string,
): Promise<void> {
  const connections = await readConnections();
  const settings = await readSettings();
  const msg: AirwaveBridgeAccountChanged = {
    type: "airwave-bridge-account-changed",
    publicKeyBase58,
    cluster: settings.cluster,
  };
  for (const rec of Object.values(connections)) {
    if (rec.accountId !== boundAccountId) continue;
    for (const tabId of rec.tabIds) {
      try {
        await chrome.tabs.sendMessage(tabId, msg);
      } catch {
        /* ignore */
      }
    }
  }
}

export async function rememberConnectedTab(origin: string, tabId: number, accountId: string): Promise<void> {
  const connections = await readConnections();
  const existing = connections[origin] ?? {
    accountId,
    connectedAt: Date.now(),
    tabIds: [],
  };
  existing.accountId = accountId;
  existing.connectedAt = Date.now();
  if (!existing.tabIds.includes(tabId)) existing.tabIds.push(tabId);
  connections[origin] = existing;
  await writeConnections(connections);
}

export async function notifyDisconnected(tabIds: number[], origin: string): Promise<void> {
  const msg: AirwaveBridgeDisconnected = { type: "airwave-bridge-disconnected", origin };
  for (const tabId of tabIds) {
    try {
      await chrome.tabs.sendMessage(tabId, msg);
    } catch {
      /* tab closed */
    }
  }
}

export async function removeConnectionAndNotify(origin: string, extraTabId?: number): Promise<void> {
  const connections = await readConnections();
  const rec = connections[origin];
  if (!rec) {
    if (extraTabId != null) {
      await notifyDisconnected([extraTabId], origin);
    }
    return;
  }
  const tabIds = [...rec.tabIds];
  if (extraTabId != null && !tabIds.includes(extraTabId)) tabIds.push(extraTabId);
  delete connections[origin];
  await writeConnections(connections);
  await notifyDisconnected(tabIds, origin);
}

export async function disconnectAllConnections(): Promise<void> {
  const connections = await readConnections();
  const entries = Object.entries(connections);
  await writeConnections({});
  for (const [origin, rec] of entries) {
    await notifyDisconnected(rec.tabIds, origin);
  }
}
