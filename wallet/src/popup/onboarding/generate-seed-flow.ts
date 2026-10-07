import { createEnglishMnemonic12, keypairFromMnemonic } from "../../shared/seed-derive";

export type GenerateSeedDraft = {
  words: string[] | null;
  pk: string | null;
  busy: boolean;
  label: string;
  err: string;
};

export async function createGenerateSeedDraft(): Promise<GenerateSeedDraft> {
  try {
    const mnemonic = createEnglishMnemonic12();
    const kp = await keypairFromMnemonic(mnemonic, "phantom", 0);
    return {
      words: mnemonic.split(" "),
      pk: kp.address,
      busy: false,
      label: "",
      err: "",
    };
  } catch {
    return { words: null, pk: null, busy: false, label: "", err: "" };
  }
}
