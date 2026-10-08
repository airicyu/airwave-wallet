/**
 * Converts stored secret encodings into Solana signers and standard 64-byte ed25519 keypair layouts.
 * Does not encrypt secrets for vault storage or enforce signing policy gates.
 */
import { getAddressFromPublicKey } from "@solana/addresses";
import { createKeyPairFromBytes, createKeyPairFromPrivateKeyBytes } from "@solana/keys";
import { createKeyPairSignerFromBytes, type KeyPairSigner } from "@solana/signers";
import bs58 from "bs58";

export type LoadedAccountKeys = {
  address: string;
  secretKeyBytes: Uint8Array;
  signer: KeyPairSigner;
};

export function storedSecretFromBytes(secretKeyBytes: Uint8Array): string {
  return bs58.encode(secretKeyBytes);
}

async function solanaKeypairBytesFromCryptoKeyPair(keyPair: CryptoKeyPair): Promise<Uint8Array> {
  const [privateKeyPkcs8, publicKeyRaw] = await Promise.all([
    crypto.subtle.exportKey("pkcs8", keyPair.privateKey),
    crypto.subtle.exportKey("raw", keyPair.publicKey),
  ]);
  const privateKeyBytes = new Uint8Array(privateKeyPkcs8).slice(16);
  const publicKeyBytes = new Uint8Array(publicKeyRaw);
  const bytes = new Uint8Array(64);
  bytes.set(privateKeyBytes, 0);
  bytes.set(publicKeyBytes, 32);
  return bytes;
}

export async function loadedAccountFromStoredSecret(stored: string): Promise<LoadedAccountKeys> {
  const secretKeyBytes = bs58.decode(stored);
  const signer = await createKeyPairSignerFromBytes(secretKeyBytes);
  return { address: signer.address, secretKeyBytes, signer };
}

export async function loadedAccountFromSecretBytes(secretKeyBytes: Uint8Array): Promise<LoadedAccountKeys> {
  await createKeyPairFromBytes(secretKeyBytes);
  const signer = await createKeyPairSignerFromBytes(secretKeyBytes);
  return { address: signer.address, secretKeyBytes, signer };
}

export async function loadedAccountFromPrivateSeed(seed32: Uint8Array): Promise<LoadedAccountKeys> {
  const keyPair = await createKeyPairFromPrivateKeyBytes(seed32, true);
  const secretKeyBytes = await solanaKeypairBytesFromCryptoKeyPair(keyPair);
  const signer = await createKeyPairSignerFromBytes(secretKeyBytes);
  return { address: signer.address, secretKeyBytes, signer };
}

export async function generateRandomLoadedAccount(): Promise<LoadedAccountKeys> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  return loadedAccountFromPrivateSeed(seed);
}

export async function addressFromStoredSecret(stored: string): Promise<string> {
  const bytes = bs58.decode(stored);
  const keyPair = await createKeyPairFromBytes(bytes);
  return await getAddressFromPublicKey(keyPair.publicKey);
}
