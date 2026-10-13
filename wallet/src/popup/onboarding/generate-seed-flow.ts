/**
 * Builds a local 12-word seed draft and its Phantom index-0 public key.
 * Does not write the vault or copy the mnemonic.
 */
import { createEnglishMnemonic12, keypairFromMnemonic } from "../../shared/seed-derive";

export type GenerateSeedDraft = {
  words: string[] | null;
  pk: string | null;
  busy: boolean;
  label: string;
  err: string;
};

async function freshSeedFields(): Promise<Pick<GenerateSeedDraft, "words" | "pk" | "err">> {
  const mnemonic = createEnglishMnemonic12();
  const kp = await keypairFromMnemonic(mnemonic, "phantom", 0);
  return { words: mnemonic.split(" "), pk: kp.address, err: "" };
}

export async function createGenerateSeedDraft(): Promise<GenerateSeedDraft> {
  try {
    const fields = await freshSeedFields();
    return { ...fields, busy: false, label: "" };
  } catch {
    return { words: null, pk: null, busy: false, label: "", err: "" };
  }
}

export async function rollGenerateSeedDraft(prev: GenerateSeedDraft): Promise<GenerateSeedDraft> {
  try {
    const fields = await freshSeedFields();
    return { ...prev, ...fields, busy: false };
  } catch {
    return { ...prev, busy: false, err: "" };
  }
}
