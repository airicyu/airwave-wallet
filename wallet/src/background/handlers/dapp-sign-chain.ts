/**
 * Resolves the Solana chain id on a dApp sign request.
 * A missing chain becomes the wallet's selected cluster. A present chain must match that cluster.
 */

export const ACCEPTED_CHAIN_IDS = new Set(["solana:devnet", "solana:mainnet"]);

export function settingsChainId(cluster: "devnet" | "mainnet"): "solana:devnet" | "solana:mainnet" {
  return cluster === "mainnet" ? "solana:mainnet" : "solana:devnet";
}

export type DappSignChainResult =
  | { ok: true; chain: "solana:devnet" | "solana:mainnet" }
  | { ok: false; code: "INVALID_CHAIN" | "CHAIN_MISMATCH"; message: string };

/** Blank or omitted `chain` uses the selected cluster. Any other value must be that same id. */
export function resolveDappSignChain(raw: unknown, cluster: "devnet" | "mainnet"): DappSignChainResult {
  const selected = settingsChainId(cluster);
  const missing = raw == null || (typeof raw === "string" && raw.trim() === "");
  const chain = missing ? selected : raw;
  if (chain !== "solana:devnet" && chain !== "solana:mainnet") {
    return { ok: false, code: "INVALID_CHAIN", message: "Unsupported chain" };
  }
  if (chain !== selected) {
    return {
      ok: false,
      code: "CHAIN_MISMATCH",
      message: "Wallet cluster does not match request chain",
    };
  }
  return { ok: true, chain };
}
