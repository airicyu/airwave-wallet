/**
 * Delivers connection events only to tabs still on that origin, and drops tab ids that have left.
 * Does not enqueue dapp approval requests or replace an origin's trusted connection.
 */
import type {
  AirwaveBridgeAccountChanged,
  AirwaveBridgeDisconnected,
  AirwaveBridgeResult,
} from "../../shared/bridge";
import type { ConnectionsMap } from "../../shared/storage-keys";
import { getActivePublicKey, readActiveAccountId, readConnections, readSettings, writeConnections } from "../storage";
import {
  classifyTabUrl,
  dropTabFromOrigin,
  forgetTab,
  pruneTabId,
  type TabUrlClass,
} from "./connection-tabs";
import { runConnectionWrite } from "./connection-write";

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

type LiveTab = { kind: "closed" } | TabUrlClass;

async function liveTab(tabId: number): Promise<LiveTab> {
  try {
    const tab = await chrome.tabs.get(tabId);
    return classifyTabUrl(tab.url);
  } catch {
    return { kind: "closed" };
  }
}

function applyLiveTab(
  connections: ConnectionsMap,
  tabId: number,
  origin: string,
  live: LiveTab,
): { next: ConnectionsMap; changed: boolean } {
  if (live.kind === "unknown") return { next: connections, changed: false };
  if (live.kind === "closed") return forgetTab(connections, tabId);
  return dropTabFromOrigin(connections, origin, tabId);
}

async function sendToLiveTabs(
  tabIds: number[],
  origin: string,
  send: (tabId: number) => Promise<void>,
): Promise<void> {
  let connections = await readConnections();
  let changed = false;
  for (const tabId of tabIds) {
    const live = await liveTab(tabId);
    if (live.kind === "http" && live.origin === origin) {
      await send(tabId);
      continue;
    }
    const pruned = applyLiveTab(connections, tabId, origin, live);
    connections = pruned.next;
    changed = changed || pruned.changed;
  }
  if (changed) await writeConnections(connections);
}

async function deliverAccountChanged(publicKeyBase58: string, onlyAccountId?: string): Promise<void> {
  const connections = await readConnections();
  const settings = await readSettings();
  const msg: AirwaveBridgeAccountChanged = {
    type: "airwave-bridge-account-changed",
    publicKeyBase58,
    cluster: settings.cluster,
  };
  const jobs: { origin: string; tabIds: number[] }[] = [];
  for (const [origin, rec] of Object.entries(connections)) {
    if (onlyAccountId != null && rec.accountId !== onlyAccountId) continue;
    jobs.push({ origin, tabIds: [...rec.tabIds] });
  }
  for (const job of jobs) {
    await sendToLiveTabs(job.tabIds, job.origin, async (tabId) => {
      try {
        await chrome.tabs.sendMessage(tabId, msg);
      } catch {
        /* ignore */
      }
    });
  }
}

async function deliverDisconnected(tabIds: number[], origin: string): Promise<void> {
  const msg: AirwaveBridgeDisconnected = { type: "airwave-bridge-disconnected", origin };
  await sendToLiveTabs(tabIds, origin, async (tabId) => {
    try {
      await chrome.tabs.sendMessage(tabId, msg);
    } catch {
      /* tab closed */
    }
  });
}

export async function alignConnectionsToActiveAccount(): Promise<void> {
  await runConnectionWrite(async () => {
    const activeId = await readActiveAccountId();
    if (!activeId) return;
    const connections = await readConnections();
    const rows = Object.values(connections);
    if (rows.length === 0 || rows.every((rec) => rec.accountId === activeId)) return;
    for (const rec of rows) rec.accountId = activeId;
    await writeConnections(connections);
    const pubkey = await getActivePublicKey();
    if (pubkey) await deliverAccountChanged(pubkey);
  });
}

export async function notifyAccountChanged(publicKeyBase58: string): Promise<void> {
  await runConnectionWrite(() => deliverAccountChanged(publicKeyBase58));
}

export async function notifyAccountChangedForConnectionAccount(
  boundAccountId: string,
  publicKeyBase58: string,
): Promise<void> {
  await runConnectionWrite(() => deliverAccountChanged(publicKeyBase58, boundAccountId));
}

export async function rememberConnectedTab(origin: string, tabId: number, accountId: string): Promise<void> {
  await runConnectionWrite(async () => {
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
  });
}

export async function notifyDisconnected(tabIds: number[], origin: string): Promise<void> {
  await runConnectionWrite(() => deliverDisconnected(tabIds, origin));
}

export async function removeConnectionAndNotify(origin: string, extraTabId?: number): Promise<void> {
  await runConnectionWrite(async () => {
    const connections = await readConnections();
    const rec = connections[origin];
    if (!rec) {
      if (extraTabId != null) await deliverDisconnected([extraTabId], origin);
      return;
    }
    const tabIds = [...rec.tabIds];
    if (extraTabId != null && !tabIds.includes(extraTabId)) tabIds.push(extraTabId);
    delete connections[origin];
    await writeConnections(connections);
    await deliverDisconnected(tabIds, origin);
  });
}

export async function disconnectAllConnections(): Promise<void> {
  await runConnectionWrite(async () => {
    const connections = await readConnections();
    const entries = Object.entries(connections);
    await writeConnections({});
    for (const [origin, rec] of entries) {
      await deliverDisconnected(rec.tabIds, origin);
    }
  });
}

/** Switch the bound account on every origin without editing tab ids, then notify. */
export async function rebindConnectionsToAccount(accountId: string, publicKeyBase58: string): Promise<void> {
  await runConnectionWrite(async () => {
    const connections = await readConnections();
    for (const rec of Object.values(connections)) rec.accountId = accountId;
    await writeConnections(connections);
    await deliverAccountChanged(publicKeyBase58);
  });
}

/** Remove origins bound to this account and tell tabs that are still there. */
export async function disconnectOriginsForAccount(accountId: string): Promise<void> {
  await runConnectionWrite(async () => {
    const connections = await readConnections();
    const pairs: { origin: string; tabIds: number[] }[] = [];
    for (const [origin, rec] of Object.entries(connections)) {
      if (rec.accountId !== accountId) continue;
      pairs.push({ origin, tabIds: [...rec.tabIds] });
      delete connections[origin];
    }
    await writeConnections(connections);
    for (const pair of pairs) await deliverDisconnected(pair.tabIds, pair.origin);
  });
}

async function pruneStoredTab(tabId: number, klass: TabUrlClass): Promise<void> {
  await runConnectionWrite(async () => {
    const connections = await readConnections();
    const pruned = pruneTabId(connections, tabId, klass);
    if (pruned.changed) await writeConnections(pruned.next);
  });
}

export function installConnectionTabWatch(): void {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url == null && changeInfo.status !== "complete") return;
    void pruneStoredTab(tabId, classifyTabUrl(changeInfo.url ?? tab.url));
  });
  chrome.tabs.onRemoved.addListener((tabId) => {
    void pruneStoredTab(tabId, { kind: "left-web" });
  });
}
