/** 由 Settings rpcUrl 推導 wss／ws，供 rpcSubscriptions */
export function rpcUrlToWebSocket(rpcUrl: string): string {
  const t = rpcUrl.trim();
  if (t.startsWith("https://")) return `wss://${t.slice("https://".length)}`;
  if (t.startsWith("http://")) return `ws://${t.slice("http://".length)}`;
  if (t.startsWith("wss://") || t.startsWith("ws://")) return t;
  return `wss://${t}`;
}
