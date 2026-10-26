/**
 * This file mints a new account id and turns loaded key bytes into the stored secret string the vault persist path expects. It does not encrypt the vault.
 */
import type { LoadedAccountKeys } from "../../shared/vault";
import { storedSecretFromBytes } from "../../shared/vault";

export function newAccountId(): string {
  return crypto.randomUUID();
}

export function secretToStored(loaded: LoadedAccountKeys): string {
  return storedSecretFromBytes(loaded.secretKeyBytes);
}
