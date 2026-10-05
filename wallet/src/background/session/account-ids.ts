import bs58 from "bs58";
import type { Keypair } from "@solana/web3.js";

export function newAccountId(): string {
  return crypto.randomUUID();
}

export function secretToStored(kp: Keypair): string {
  return bs58.encode(kp.secretKey);
}
