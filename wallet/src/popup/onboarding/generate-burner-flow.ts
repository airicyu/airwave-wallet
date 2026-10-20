/**
 * Builds an in-memory burner keypair for the add-account preview.
 * Does not persist the secret or call the service worker.
 */
import { generateRandomLoadedAccount, storedSecretFromBytes } from "../../shared/vault";

export type BurnerDraft = {
  secretKeyBase58: string | null;
  pk: string | null;
  err: string;
};

export async function createBurnerDraft(): Promise<BurnerDraft> {
  try {
    const kp = await generateRandomLoadedAccount();
    return {
      secretKeyBase58: storedSecretFromBytes(kp.secretKeyBytes),
      pk: kp.address,
      err: "",
    };
  } catch {
    return { secretKeyBase58: null, pk: null, err: "" };
  }
}

export async function rollBurnerDraft(): Promise<BurnerDraft> {
  return createBurnerDraft();
}
