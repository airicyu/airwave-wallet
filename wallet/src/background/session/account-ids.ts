import type { LoadedAccountKeys } from "../../shared/keypair-bytes";
import { storedSecretFromBytes } from "../../shared/keypair-bytes";

export function newAccountId(): string {
  return crypto.randomUUID();
}

export function secretToStored(loaded: LoadedAccountKeys): string {
  return storedSecretFromBytes(loaded.secretKeyBytes);
}
