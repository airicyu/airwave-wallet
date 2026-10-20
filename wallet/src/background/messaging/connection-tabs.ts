/**
 * Classifies a tab URL and copies connection rows without that tab id.
 * Does not read Chrome tabs or write storage.
 */
import type { ConnectionsMap } from "../../shared/protocol";

export type TabUrlClass =
  | { kind: "unknown" }
  | { kind: "left-web" }
  | { kind: "http"; origin: string };

export function classifyTabUrl(url: string | undefined): TabUrlClass {
  if (!url) return { kind: "unknown" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { kind: "unknown" };
  }
  if (parsed.protocol === "about:") return { kind: "unknown" };
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return { kind: "left-web" };
  return { kind: "http", origin: parsed.origin };
}

function copyMap(connections: ConnectionsMap): ConnectionsMap {
  const next: ConnectionsMap = {};
  for (const [origin, rec] of Object.entries(connections)) {
    next[origin] = { ...rec, tabIds: [...rec.tabIds] };
  }
  return next;
}

export function pruneTabId(
  connections: ConnectionsMap,
  tabId: number,
  klass: TabUrlClass,
): { next: ConnectionsMap; changed: boolean } {
  if (klass.kind === "unknown") return { next: connections, changed: false };
  const next = copyMap(connections);
  let changed = false;
  for (const [origin, rec] of Object.entries(next)) {
    if (klass.kind === "http" && origin === klass.origin) continue;
    if (!rec.tabIds.includes(tabId)) continue;
    rec.tabIds = rec.tabIds.filter((id) => id !== tabId);
    changed = true;
  }
  return changed ? { next, changed } : { next: connections, changed: false };
}

/** Notify path: the tab left this origin. Drop it from this row only. */
export function dropTabFromOrigin(
  connections: ConnectionsMap,
  origin: string,
  tabId: number,
): { next: ConnectionsMap; changed: boolean } {
  const rec = connections[origin];
  if (!rec?.tabIds.includes(tabId)) return { next: connections, changed: false };
  const next = copyMap(connections);
  next[origin].tabIds = next[origin].tabIds.filter((id) => id !== tabId);
  return { next, changed: true };
}

/** Tab closed or left the web: drop the id from every origin row. */
export function forgetTab(
  connections: ConnectionsMap,
  tabId: number,
): { next: ConnectionsMap; changed: boolean } {
  return pruneTabId(connections, tabId, { kind: "left-web" });
}
