/**
 * Allowlisted JSON-RPC reads for transaction AI tools.
 * Does not sign, broadcast, or accept a caller-supplied method name.
 */
const READ_TIMEOUT_MS = 15_000;

function linkedSignal(parent: AbortSignal | undefined, ms: number): { signal: AbortSignal; cancel: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  const onParent = (): void => controller.abort();
  const cancel = (): void => {
    clearTimeout(timer);
    parent?.removeEventListener("abort", onParent);
  };
  if (parent?.aborted) controller.abort();
  else parent?.addEventListener("abort", onParent, { once: true });
  controller.signal.addEventListener("abort", cancel, { once: true });
  return { signal: controller.signal, cancel };
}

export async function rpcRead(
  rpcUrl: string,
  method: string,
  params: unknown[],
  signal?: AbortSignal,
): Promise<unknown> {
  if (!rpcUrl.trim()) return { ok: false, error: "MAINNET_RPC_UNSET" };
  if (signal?.aborted) return { ok: false, error: "aborted" };
  const link = linkedSignal(signal, READ_TIMEOUT_MS);
  try {
    const response = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: link.signal,
    });
    if (!response.ok) return { ok: false, error: `RPC_HTTP_${response.status}` };
    const json = (await response.json()) as { error?: { message?: string }; result?: unknown };
    if (json.error) return { ok: false, error: json.error.message || "RPC_ERROR" };
    return { ok: true, result: json.result };
  } catch {
    return { ok: false, error: signal?.aborted ? "aborted" : "RPC_FAILED" };
  } finally {
    link.cancel();
  }
}

export function tokenOwnerFromParsedAccount(account: unknown): string | null {
  if (!account || typeof account !== "object") return null;
  const data = (account as { data?: unknown }).data;
  if (!data || typeof data !== "object") return null;
  const parsed = (data as { parsed?: { info?: { owner?: unknown } } }).parsed;
  const owner = parsed?.info?.owner;
  return typeof owner === "string" ? owner : null;
}
