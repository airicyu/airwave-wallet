import { sendExtensionRequest } from "../../shared/ext-api";
import { bumpUi, session } from "../lib/session";

function importSeedFilledCount(): number {
  return session.importSeedWords.filter((w) => w.trim()).length;
}

export function importSeedDockReady(): {
  step: "words" | "pick";
  busy: boolean;
  selected: number | null;
  filled: number;
} {
  return {
    step: session.importSeedStep,
    busy: session.importSeedBusy,
    selected: session.importSeedSelected,
    filled: importSeedFilledCount(),
  };
}

export function importSeedTargetLength(): number {
  const n = importSeedFilledCount();
  return n > 12 ? 24 : 12;
}

export function resetImportSeedFlow(): void {
  session.importSeedPreviewGen++;
  session.importSeedWords = Array(12).fill("");
  session.importSeedStep = "words";
  session.importSeedKind = "phantom";
  session.importSeedCustomPath = "m/44'/501'/{n}'/0'";
  session.importSeedPathPreview = "";
  session.importSeedPreview = [];
  session.importSeedSelected = null;
  session.importSeedBusy = false;
  session.importSeedErr = "";
}

export function mnemonicFromSlots(): string {
  return session.importSeedWords.map((w) => w.trim().toLowerCase()).filter(Boolean).join(" ");
}

export function ensureImportSeedWordCapacity(): void {
  const target = importSeedTargetLength();
  if (session.importSeedWords.length === target) return;
  const next = Array<string>(target).fill("");
  session.importSeedWords.forEach((w, i) => {
    if (i < target) next[i] = w;
  });
  session.importSeedWords = next;
}

export async function requestSeedPreview(): Promise<"ok" | "fail" | "stale"> {
  const gen = ++session.importSeedPreviewGen;
  session.importSeedBusy = true;
  session.importSeedErr = "";
  bumpUi();

  const res = await sendExtensionRequest("wallet.previewSeedAccounts", {
    mnemonic: mnemonicFromSlots(),
    pathKind: session.importSeedKind,
    customPath: session.importSeedKind === "custom" ? session.importSeedCustomPath : undefined,
  });

  if (gen !== session.importSeedPreviewGen) return "stale";

  session.importSeedBusy = false;

  if (!res.ok) {
    session.importSeedPreview = [];
    session.importSeedPathPreview = "";
    session.importSeedErr = res.error?.message ?? "預覽失敗";
    bumpUi();
    return "fail";
  }

  const result = res.result as {
    pathPreview: string;
    accounts: { index: number; publicKeyBase58: string }[];
  };
  session.importSeedPathPreview = result.pathPreview;
  session.importSeedPreview = result.accounts;
  session.importSeedErr = "";
  bumpUi();
  return "ok";
}
