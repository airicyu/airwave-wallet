/**
 * Popup import-seed wizard state and actions (mnemonic entry, path preview, account pick via extension requests).
 * Does not derive keys locally without calling background wallet handlers.
 */
import { sendExtensionRequest } from "../../shared/ext-api";
import type { SeedPathKind } from "../../shared/seed-derive";

export type ImportSeedDraft = {
  words: string[];
  step: "words" | "pick";
  kind: SeedPathKind;
  customPath: string;
  pathPreview: string;
  preview: { index: number; publicKeyBase58: string }[];
  selected: number | null;
  busy: boolean;
  previewGen: number;
  err: string;
};

export function emptyImportSeedDraft(): ImportSeedDraft {
  return {
    words: Array(12).fill(""),
    step: "words",
    kind: "phantom",
    customPath: "m/44'/501'/{n}'/0'",
    pathPreview: "",
    preview: [],
    selected: null,
    busy: false,
    previewGen: 0,
    err: "",
  };
}

export function importSeedFilledCount(words: string[]): number {
  return words.filter((w) => w.trim()).length;
}

export function importSeedTargetLength(words: string[]): number {
  return importSeedFilledCount(words) > 12 ? 24 : 12;
}

export function withImportSeedCapacity(words: string[]): string[] {
  const target = importSeedTargetLength(words);
  if (words.length === target) return words;
  const next = Array<string>(target).fill("");
  words.forEach((w, i) => {
    if (i < target) next[i] = w;
  });
  return next;
}

export function mnemonicFromSlots(words: string[]): string {
  return words.map((w) => w.trim().toLowerCase()).filter(Boolean).join(" ");
}

export function importSeedBackToWords(draft: ImportSeedDraft): ImportSeedDraft {
  return {
    ...draft,
    previewGen: draft.previewGen + 1,
    busy: false,
    step: "words",
    preview: [],
    selected: null,
    pathPreview: "",
  };
}

export async function requestSeedPreview(
  draft: ImportSeedDraft,
): Promise<{ gen: number; next: Partial<ImportSeedDraft>; outcome: "ok" | "fail" }> {
  const gen = draft.previewGen + 1;
  const res = await sendExtensionRequest("wallet.previewSeedAccounts", {
    mnemonic: mnemonicFromSlots(draft.words),
    pathKind: draft.kind,
    customPath: draft.kind === "custom" ? draft.customPath : undefined,
  });
  if (!res.ok) {
    return {
      gen,
      outcome: "fail",
      next: {
        previewGen: gen,
        busy: false,
        preview: [],
        pathPreview: "",
        err: res.error?.code ? res.error.code : "error.previewFailed",
      },
    };
  }
  const result = res.result as {
    pathPreview: string;
    accounts: { index: number; publicKeyBase58: string }[];
  };
  return {
    gen,
    outcome: "ok",
    next: {
      previewGen: gen,
      busy: false,
      pathPreview: result.pathPreview,
      preview: result.accounts,
      err: "",
    },
  };
}
