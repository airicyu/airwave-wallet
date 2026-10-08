/**
 * Builds Solana Explorer transaction inspector URLs from compiled message bytes.
 * Does not simulate transactions or decode instructions.
 */
import type { Cluster } from "../../shared/storage-keys";
import { bytesToBase64 } from "./tx-base64";

export function buildInspectorUrl(messageBytes: Uint8Array, cluster: Cluster): string {
  const clusterParam = cluster === "devnet" ? "devnet" : "mainnet-beta";
  const b64 = bytesToBase64(messageBytes);
  return `https://explorer.solana.com/tx/inspector?cluster=${clusterParam}&message=${encodeURIComponent(b64)}`;
}
