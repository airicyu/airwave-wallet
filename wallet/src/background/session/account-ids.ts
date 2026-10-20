import type { LoadedAccountKeys } from "../../shared/vault";
import { storedSecretFromBytes } from "../../shared/vault";

export function newAccountId(): string {
  return crypto.randomUUID();
}

export function secretToStored(loaded: LoadedAccountKeys): string {
  return storedSecretFromBytes(loaded.secretKeyBytes);
}
