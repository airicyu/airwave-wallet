import { createEnglishMnemonic12, keypairFromMnemonic } from "../../shared/seed-derive";

export type GenerateSeedDraft = {
  words: string[] | null;
  pk: string | null;
  busy: boolean;
  label: string;
  err: string;
};

export function createGenerateSeedDraft(): GenerateSeedDraft {
  try {
    const mnemonic = createEnglishMnemonic12();
    const kp = keypairFromMnemonic(mnemonic, "phantom", 0);
    return {
      words: mnemonic.split(" "),
      pk: kp.publicKey.toBase58(),
      busy: false,
      label: "",
      err: "",
    };
  } catch {
    return { words: null, pk: null, busy: false, label: "", err: "" };
  }
}
