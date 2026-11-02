/**
 * Flattened allowlisted Solana JSON-RPC host tools for sign-risk harness.
 * One tool per method so the model gets a clear parameter schema (no free-form params[]).
 */
import type { HostToolDefinition } from "../vendor/bubble-harness.js";
import { rpcRead } from "./sign-risk-rpc";

function requireRpcUrl(rpcUrl: string): string | { ok: false; error: string } {
  if (!rpcUrl) return { ok: false, error: "RPC URL not set in the page" };
  return rpcUrl;
}

function asPubkey(args: Record<string, unknown>, field = "pubkey"): string | { ok: false; error: string } {
  const value = args[field];
  if (typeof value !== "string" || !value) {
    return { ok: false, error: `${field} must be a base58 pubkey string` };
  }
  return value;
}

/** Build per-method RPC tools bound to the page RPC URL. */
export function buildFlattenedRpcTools(rpcUrl: string): HostToolDefinition[] {
  return [
    {
      name: "rpc_get_balance",
      description: "Solana getBalance. Returns lamports for a pubkey.",
      parameters: {
        type: "object",
        properties: {
          pubkey: { type: "string", description: "Base58 account pubkey" },
        },
        required: ["pubkey"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const url = requireRpcUrl(rpcUrl);
        if (typeof url !== "string") return url;
        const pubkey = asPubkey(args);
        if (typeof pubkey !== "string") return pubkey;
        return rpcRead(url, "getBalance", [pubkey]);
      },
    },
    {
      name: "rpc_get_account_info",
      description: "Solana getAccountInfo. Prefer encoding jsonParsed for token accounts when you need mint/owner/amount.",
      parameters: {
        type: "object",
        properties: {
          pubkey: { type: "string", description: "Base58 account pubkey" },
          encoding: {
            type: "string",
            description: 'Optional: "base64" (default) or "jsonParsed"',
          },
        },
        required: ["pubkey"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const url = requireRpcUrl(rpcUrl);
        if (typeof url !== "string") return url;
        const pubkey = asPubkey(args);
        if (typeof pubkey !== "string") return pubkey;
        const encoding = typeof args.encoding === "string" ? args.encoding : "base64";
        return rpcRead(url, "getAccountInfo", [pubkey, { encoding }]);
      },
    },
    {
      name: "rpc_get_multiple_accounts",
      description:
        "Solana getMultipleAccounts (raw RPC). For session tx keys with parsed token fields, prefer get_accounts instead.",
      parameters: {
        type: "object",
        properties: {
          pubkeys: {
            type: "array",
            items: { type: "string" },
            description: "Base58 pubkeys; max 100",
          },
          encoding: {
            type: "string",
            description: 'Optional: "base64" (default) or "jsonParsed"',
          },
        },
        required: ["pubkeys"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const url = requireRpcUrl(rpcUrl);
        if (typeof url !== "string") return url;
        if (!Array.isArray(args.pubkeys) || !args.pubkeys.every((k) => typeof k === "string")) {
          return { ok: false, error: "pubkeys must be string[]" };
        }
        const encoding = typeof args.encoding === "string" ? args.encoding : "base64";
        return rpcRead(url, "getMultipleAccounts", [args.pubkeys, { encoding }]);
      },
    },
    {
      name: "rpc_get_token_accounts_by_owner",
      description:
        "Solana getTokenAccountsByOwner. Provide mint OR programId in the filter (SPL Token or Token-2022 program id).",
      parameters: {
        type: "object",
        properties: {
          owner: { type: "string", description: "Wallet pubkey that owns token accounts" },
          mint: { type: "string", description: "Optional mint filter" },
          programId: {
            type: "string",
            description:
              "Optional token program filter, e.g. TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
          },
        },
        required: ["owner"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const url = requireRpcUrl(rpcUrl);
        if (typeof url !== "string") return url;
        const owner = asPubkey(args, "owner");
        if (typeof owner !== "string") return owner;
        const filter: Record<string, string> = {};
        if (typeof args.mint === "string" && args.mint) filter.mint = args.mint;
        if (typeof args.programId === "string" && args.programId) filter.programId = args.programId;
        if (!filter.mint && !filter.programId) {
          filter.programId = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
        }
        return rpcRead(url, "getTokenAccountsByOwner", [owner, filter, { encoding: "jsonParsed" }]);
      },
    },
    {
      name: "rpc_get_signatures_for_address",
      description: "Solana getSignaturesForAddress. limit defaults to 10, max 25.",
      parameters: {
        type: "object",
        properties: {
          pubkey: { type: "string" },
          limit: { type: "number", description: "1–25, default 10" },
        },
        required: ["pubkey"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const url = requireRpcUrl(rpcUrl);
        if (typeof url !== "string") return url;
        const pubkey = asPubkey(args);
        if (typeof pubkey !== "string") return pubkey;
        const limit = typeof args.limit === "number" ? args.limit : 10;
        return rpcRead(url, "getSignaturesForAddress", [pubkey, { limit }]);
      },
    },
    {
      name: "rpc_get_transaction",
      description: "Solana getTransaction by signature (json encoding). Large fields are truncated.",
      parameters: {
        type: "object",
        properties: {
          signature: { type: "string", description: "Base58 transaction signature" },
        },
        required: ["signature"],
        additionalProperties: false,
      },
      execute: async (args) => {
        const url = requireRpcUrl(rpcUrl);
        if (typeof url !== "string") return url;
        if (typeof args.signature !== "string" || !args.signature) {
          return { ok: false, error: "signature must be a string" };
        }
        return rpcRead(url, "getTransaction", [
          args.signature,
          { encoding: "json", maxSupportedTransactionVersion: 1 },
        ]);
      },
    },
    {
      name: "rpc_get_latest_blockhash",
      description: "Solana getLatestBlockhash for the configured RPC cluster.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
      execute: async () => {
        const url = requireRpcUrl(rpcUrl);
        if (typeof url !== "string") return url;
        return rpcRead(url, "getLatestBlockhash", []);
      },
    },
  ];
}
