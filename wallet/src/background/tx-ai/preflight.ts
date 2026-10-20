/**
 * Runs decode, token-account reads, and one approval-style simulate before the sandbox loop.
 * Does not call OpenRouter or paint approval UI.
 */
import { decodeWireTransaction } from "../../shared/tx";
import { simulateTransactionRpc } from "../simulate/simulate-rpc";
import { SimDeadline } from "../simulate/sim-deadline";
import type { TxAiDecode } from "./local-flags";
import { enrichFlags, type ChainRead, type PreflightAccountsBlock } from "./host-tools";
import type { TxAiFlag } from "../../shared/tx-ai";

const PREFLIGHT_JSON_MAX = 8_000;

export type TxAiPreflightAccounts = PreflightAccountsBlock;

export type TxAiPreflightEnriched = {
  decode: TxAiDecode;
  flags: TxAiFlag[];
  chainRead: ChainRead;
  accountsRead?: TxAiPreflightAccounts;
};

export type TxAiPreflightSimulate = {
  err: unknown;
  unitsConsumed: number | null;
  logs: string[];
};

export type TxAiPreflight = {
  enriched: TxAiPreflightEnriched;
  simulate: TxAiPreflightSimulate | { error: string };
};

function clipJson(value: unknown): string {
  const raw = JSON.stringify(value);
  return raw.length > PREFLIGHT_JSON_MAX ? `${raw.slice(0, PREFLIGHT_JSON_MAX)}…` : raw;
}

/** Default pubkeys for get_accounts when omitted — matches decode_message tool body scan. */
export function pubkeysFromTxAiDecode(decode: TxAiDecode): string[] {
  const keys = new Set<string>();
  for (const ix of decode.instructions) {
    for (const account of ix.accounts) {
      if (account.pubkey !== "unresolved") keys.add(account.pubkey);
    }
  }
  return [...keys].slice(0, 20);
}

export async function runTxAiPreflight(
  snapshot: Uint8Array,
  rpcUrl: string,
  signal?: AbortSignal,
): Promise<TxAiPreflight> {
  const enriched = await enrichFlags(snapshot, rpcUrl, signal);
  let simulate: TxAiPreflight["simulate"];
  if (!rpcUrl.trim()) {
    simulate = { error: "MAINNET_RPC_UNSET" };
  } else {
    try {
      const tx = decodeWireTransaction(snapshot);
      const value = await simulateTransactionRpc(rpcUrl, tx, new SimDeadline(), {
        replaceRecentBlockhash: false,
      });
      simulate = {
        err: value.err ?? null,
        unitsConsumed: value.unitsConsumed ?? null,
        logs: (value.logs ?? []).slice(-40),
      };
    } catch (error) {
      simulate = { error: error instanceof Error ? error.message : "simulate failed" };
    }
  }
  return { enriched, simulate };
}

export function formatTxAiPreflightForPrompt(preflight: TxAiPreflight): string {
  const { enriched, simulate } = preflight;
  const decodeBlock = {
    feePayer: enriched.decode.feePayer,
    instructions: enriched.decode.instructions,
    flags: enriched.flags,
    chainRead: enriched.chainRead,
  };
  const accountsBlock = enriched.accountsRead
    ? {
        preflightPubkeys: enriched.accountsRead.preflightPubkeys,
        feePayerBalanceLamports: enriched.accountsRead.feePayerBalanceLamports,
        pubkeys: enriched.accountsRead.pubkeys,
        accounts: enriched.accountsRead.accounts,
      }
    : ({ note: enriched.chainRead === "skipped" ? "no resolved pubkeys to prefetch" : "accounts read unavailable" } as const);
  return [
    "## Preflight decode (host)",
    clipJson(decodeBlock),
    "## Preflight simulate (this tx blockhash, no sigVerify)",
    clipJson(simulate),
    "## Preflight accounts (host getMultipleAccounts batches + fee payer balance)",
    clipJson(accountsBlock),
    "Do not call get_accounts or rpc_get_multiple_accounts for pubkeys listed in preflightPubkeys.",
  ].join("\n\n");
}
