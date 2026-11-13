/**
 * Spr client for the saved Helius RPC.
 * A remote prover call uses that cluster's signed TEE policy. This file does not build transactions.
 */
import { SignedTeePolicy, SprClient } from "@heliuslabs/spr/client";

export function privacyClient(rpcUrl: string, cluster: string): SprClient {
  const network = cluster === "devnet" ? "devnet" : "mainnet";
  return new SprClient({
    solanaRpcUrl: rpcUrl,
    proverTee: SignedTeePolicy.forNetwork(network),
  });
}
