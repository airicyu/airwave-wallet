/**
 * Posts simulateTransaction JSON-RPC for a wire-encoded transaction.
 * Does not compute phase-2 balance deltas or decode instruction lists.
 */
import type { Transaction } from "@solana/kit";
import { encodeWireTransaction } from "../../shared/tx-wire";
import { SimDeadline } from "./sim-deadline";
import { bytesToBase64 } from "./tx-base64";

export type RpcTokenAmount = {
  amount?: string;
  decimals?: number;
};

export type RpcTokenBalance = {
  accountIndex?: number;
  mint?: string;
  owner?: string;
  uiTokenAmount?: RpcTokenAmount;
};

export type RpcLoadedAddresses = {
  writable?: string[];
  readonly?: string[];
};

export type RpcSimulateValue = {
  err?: unknown;
  logs?: string[] | null;
  unitsConsumed?: number;
  fee?: number;
  preBalances?: number[];
  postBalances?: number[];
  preTokenBalances?: RpcTokenBalance[] | null;
  postTokenBalances?: RpcTokenBalance[] | null;
  loadedAddresses?: RpcLoadedAddresses | null;
};

export async function simulateTransactionRpc(
  rpcUrl: string,
  tx: Transaction,
  deadline: SimDeadline,
): Promise<RpcSimulateValue> {
  if (!rpcUrl.trim()) {
    throw new Error("JSON-RPC URL required");
  }
  const encoded = bytesToBase64(encodeWireTransaction(tx));
  const payload = {
    jsonrpc: "2.0",
    id: 1,
    method: "simulateTransaction",
    params: [
      encoded,
      {
        encoding: "base64",
        sigVerify: false,
        replaceRecentBlockhash: true,
        commitment: "confirmed",
      },
    ],
  };
  const json = (await deadline.run(async () => {
    const res = await fetch(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("RPC_HTTP");
    return res.json() as Promise<{
      error?: { message?: string };
      result?: { value?: RpcSimulateValue };
    }>;
  })) as {
    error?: { message?: string };
    result?: { value?: RpcSimulateValue };
  };
  if (json.error) {
    throw new Error(json.error.message || "RPC_ERROR");
  }
  const value = json.result?.value;
  if (!value) throw new Error("RPC_EMPTY");
  return value;
}
