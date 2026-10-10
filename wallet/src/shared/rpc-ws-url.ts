/** Derive wss/ws from Settings rpcUrl for rpcSubscriptions. */
export function rpcUrlToWebSocket(rpcUrl: string): string {
  const t = rpcUrl.trim();
  if (!t) throw new Error("JSON-RPC URL required");
  if (t.startsWith("https://")) return `wss://${t.slice("https://".length)}`;
  if (t.startsWith("http://")) return `ws://${t.slice("http://".length)}`;
  if (t.startsWith("wss://") || t.startsWith("ws://")) return t;
  return `wss://${t}`;
}
