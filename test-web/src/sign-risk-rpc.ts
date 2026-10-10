/**
 * test-web sign-risk POC: JSON-RPC via Vite proxy, plus token-account layout.
 * Does not call OpenRouter.
 */
import bs58 from "bs58";
import { TOKEN, TOKEN_2022 } from "./sign-risk-decode";

export type ChainAccount = {
  pubkey: string;
  found: boolean;
  lamports?: string;
  ownerProgram?: string;
  token?: {
    mint: string;
    owner: string;
    amount: string;
    delegate: string | null;
    delegatedAmount: string;
  };
};

function u64(data: Uint8Array, offset: number): string {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true).toString();
}

function u32(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
}

function parseTokenAccount(ownerProgram: string, raw: Uint8Array): ChainAccount["token"] | undefined {
  if (ownerProgram !== TOKEN && ownerProgram !== TOKEN_2022) return undefined;
  if (raw.length < 165) return undefined;
  const mint = bs58.encode(raw.subarray(0, 32));
  const owner = bs58.encode(raw.subarray(32, 64));
  const amount = u64(raw, 64);
  const hasDelegate = u32(raw, 72) === 1;
  const delegate = hasDelegate ? bs58.encode(raw.subarray(76, 108)) : null;
  const delegatedAmount = u64(raw, 121);
  return { mint, owner, amount, delegate, delegatedAmount };
}

export async function solanaRpc<T>(rpcUrl: string, method: string, params: unknown[]): Promise<T> {
  const response = await fetch("/solana-rpc", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Solana-Rpc": rpcUrl,
    },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await response.json()) as { error?: { message?: string }; result?: T };
  if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
  if (json.error) throw new Error(json.error.message ?? "RPC error");
  return json.result as T;
}

export type FetchedTx = {
  wire: Uint8Array;
  loaded?: { writable: string[]; readonly: string[] };
};

export async function fetchTransaction(rpcUrl: string, signature: string): Promise<FetchedTx> {
  const result = await solanaRpc<{
    transaction: [string, string];
    meta?: { loadedAddresses?: { writable?: string[]; readonly?: string[] } };
  } | null>(rpcUrl, "getTransaction", [
    signature,
    { encoding: "base64", maxSupportedTransactionVersion: 0, commitment: "confirmed" },
  ]);
  if (!result) throw new Error("找不到這筆交易（cluster 或 commitment 不對）");
  const [b64] = result.transaction;
  const binary = atob(b64);
  const wire = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) wire[i] = binary.charCodeAt(i);
  const writable = result.meta?.loadedAddresses?.writable ?? [];
  const readonly = result.meta?.loadedAddresses?.readonly ?? [];
  const loaded = writable.length + readonly.length > 0 ? { writable, readonly } : undefined;
  return { wire, loaded };
}

export async function fetchChainAccounts(rpcUrl: string, pubkeys: string[]): Promise<ChainAccount[]> {
  const unique = [...new Set(pubkeys)].slice(0, 100);
  if (unique.length === 0) return [];
  const result = await solanaRpc<Array<{
    lamports: number;
    owner: string;
    data: [string, string];
  } | null>>(rpcUrl, "getMultipleAccounts", [unique, { encoding: "base64" }]);
  return unique.map((pubkey, i) => {
    const item = result[i];
    if (!item) return { pubkey, found: false };
    const rawB64 = item.data[0];
    const binary = atob(rawB64);
    const raw = new Uint8Array(binary.length);
    for (let j = 0; j < binary.length; j += 1) raw[j] = binary.charCodeAt(j);
    return {
      pubkey,
      found: true,
      lamports: String(item.lamports),
      ownerProgram: item.owner,
      token: parseTokenAccount(item.owner, raw),
    };
  });
}
