import { encryptVaultWithKey } from "../shared/crypto-vault";
import { readVaultBlob, writeVaultBlob } from "./storage-io";
import * as session from "./session";
import { runVaultWrite } from "./vault-write-queue";

export async function persistVaultFromSession(): Promise<void> {
  return runVaultWrite(async () => {
    const cryptoState = session.getVaultCrypto();
    const secrets = session.getVaultSecrets();
    if (!cryptoState || !secrets) throw new Error("NOT_UNLOCKED");
    const existing = await readVaultBlob();
    if (existing && existing.kdfParams.salt !== cryptoState.saltB64) {
      await session.lock();
      throw new Error("SESSION_SALT_MISMATCH");
    }
    const blob = await encryptVaultWithKey(cryptoState.key, cryptoState.saltB64, secrets);
    await writeVaultBlob(blob);
    await session.persistUnlockedSession();
  });
}
