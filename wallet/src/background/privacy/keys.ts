/**
 * Holds derived shielded keys in service-worker memory for the unlocked session.
 * Does not write them to storage, logs, or the screen.
 */
import nacl from "tweetnacl";
import bs58 from "bs58";
import { address } from "@solana/kit";
import { LocalKeys, type ProofService } from "@heliuslabs/spr/client";
import { ed25519DerivationMessage, type Bytes32 } from "@heliuslabs/spr/keypair";
import { initializePoseidon, LocalShieldedKeys } from "@heliuslabs/spr/wallet";
import { getLoadedAccount } from "../session";
import { clearMergeBatches } from "./merge-batch";

const keysByAccountId = new Map<string, LocalShieldedKeys>();
let hasherReady: Promise<void> | undefined;

function ensurePrivacyHasher(): Promise<void> {
  hasherReady ??= initializePoseidon().catch((error: unknown) => {
    hasherReady = undefined;
    throw error;
  });
  return hasherReady;
}

export function clearPrivacyKeys(): void {
  for (const keys of keysByAccountId.values()) keys.destroy();
  keysByAccountId.clear();
  clearMergeBatches();
}

export async function shieldedKeysFor(accountId: string): Promise<LocalShieldedKeys> {
  await ensurePrivacyHasher();
  const cached = keysByAccountId.get(accountId);
  if (cached) return cached;
  const loaded = getLoadedAccount(accountId);
  if (!loaded) throw new Error("WALLET_LOCKED");
  const publicKey = bs58.decode(loaded.address) as Bytes32;
  const message = ed25519DerivationMessage(publicKey);
  const derivationSeed = nacl.sign.detached(message, loaded.secretKeyBytes);
  const keys = LocalShieldedKeys.fromDerivationSeed({
    solanaPublicKey: address(loaded.address),
    derivationSeed,
  });
  keysByAccountId.set(accountId, keys);
  return keys;
}

export async function walletKeysFor(accountId: string, proofs: ProofService): Promise<LocalKeys> {
  await ensurePrivacyHasher();
  const loaded = getLoadedAccount(accountId);
  if (!loaded) throw new Error("WALLET_LOCKED");
  const publicKey = bs58.decode(loaded.address) as Bytes32;
  const derivationSeed = nacl.sign.detached(ed25519DerivationMessage(publicKey), loaded.secretKeyBytes);
  return LocalKeys.fromDerivationSeed({
    solanaPublicKey: address(loaded.address),
    derivationSeed,
  }, proofs);
}
