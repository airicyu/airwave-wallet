import { createEnglishMnemonic12, keypairFromMnemonic } from "../../shared/seed-derive";
import { session } from "../lib/session";

export function resetGenerateSeedFlow(): void {
  session.generateSeedBusy = false;
  session.generateSeedLabel = "";
  session.generateSeedErr = "";
  try {
    const mnemonic = createEnglishMnemonic12();
    const kp = keypairFromMnemonic(mnemonic, "phantom", 0);
    session.generateSeedWords = mnemonic.split(" ");
    session.generateSeedPk = kp.publicKey.toBase58();
  } catch {
    session.generateSeedWords = null;
    session.generateSeedPk = null;
  }
}
