import { sendExtensionRequest } from "../shared/ext-api";
import { type SeedPathKind } from "../shared/seed-derive";
import { elImportSeedRoot } from "./dom";
import { shortAddr } from "./format";
import { hardenSensitiveTextInput } from "./password-input";
import { applyViewChrome, session, syncShellDock } from "./session";

function importSeedFilledCount(): number {
  return session.importSeedWords.filter((w) => w.trim()).length;
}

export function importSeedDockReady(): { step: "words" | "pick"; busy: boolean; selected: number | null; filled: number } {
  return {
    step: session.importSeedStep,
    busy: session.importSeedBusy,
    selected: session.importSeedSelected,
    filled: importSeedFilledCount(),
  };
}

function importSeedTargetLength(): number {
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
}

function mnemonicFromSlots(): string {
  return session.importSeedWords.map((w) => w.trim().toLowerCase()).filter(Boolean).join(" ");
}

function ensureImportSeedWordCapacity(): void {
  const target = importSeedTargetLength();
  if (session.importSeedWords.length === target) return;
  const next = Array<string>(target).fill("");
  session.importSeedWords.forEach((w, i) => {
    if (i < target) next[i] = w;
  });
  session.importSeedWords = next;
}

function syncImportSeedToolbar(): void {
  const n = importSeedFilledCount();
  const target = importSeedTargetLength();
  const pill = elImportSeedRoot.querySelector<HTMLElement>(".count-pill");
  if (!pill) return;
  const complete = n === 12 || n === 24;
  pill.className = `count-pill${complete ? " ok" : n === 0 ? "" : " bad"}`;
  pill.textContent = `${n}／${target === 24 || n > 12 ? 24 : 12}`;
  syncShellDock();
}

function rebuildImportSeedWordGrid(focusIndex?: number): void {
  ensureImportSeedWordCapacity();
  const grid = elImportSeedRoot.querySelector(".word-grid");
  if (!grid) return;
  grid.innerHTML = session.importSeedWords
    .map(
      (w, i) => `
    <label class="word-slot">
      <n>${i + 1}</n>
      <input data-word-i="${i}" type="text" autocomplete="off" spellcheck="false" placeholder="word" value="${w.replace(/"/g, "&quot;")}" />
    </label>`,
    )
    .join("");
  syncImportSeedToolbar();
  grid.querySelectorAll<HTMLInputElement>(".word-slot input").forEach(hardenSensitiveTextInput);
  if (focusIndex != null) {
    const focused = grid.querySelector<HTMLInputElement>(`input[data-word-i="${focusIndex}"]`);
    focused?.focus();
    if (focused) focused.readOnly = false;
  }
}

function mountImportSeedWords(): void {
  elImportSeedRoot.innerHTML = `
    <form class="seed-entry-form" autocomplete="off" novalidate>
      <div class="word-toolbar">
        <span class="count-pill"></span>
      </div>
      <div class="word-grid"></div>
      <p class="inline-err" id="import-seed-err"></p>
    </form>
  `;
  elImportSeedRoot.querySelector("form")?.addEventListener("submit", (e) => e.preventDefault());
  rebuildImportSeedWordGrid();
}

function mountImportSeedPick(): void {
  const schemes: { id: SeedPathKind; label: string }[] = [
    { id: "phantom", label: "標準" },
    { id: "cli", label: "CLI／Ledger" },
    { id: "custom", label: "自訂" },
  ];
  const schemeBtns = schemes
    .map(
      (s) =>
        `<button type="button" class="scheme-btn${session.importSeedKind === s.id ? " on" : ""}" data-scheme="${s.id}">${s.label}</button>`,
    )
    .join("");
  const custom =
    session.importSeedKind === "custom"
      ? `<div class="field"><label>路徑</label><input id="import-seed-custom" type="text" spellcheck="false" autocomplete="off" value="${session.importSeedCustomPath.replace(/"/g, "&quot;")}" /></div>`
      : "";
  const rows = session.importSeedPreview
    .map((a) => {
      const on = session.importSeedSelected === a.index ? " on" : "";
      return `<button type="button" class="seed-acct${on}" data-seed-idx="${a.index}">
        <span class="seed-acct-idx">#${a.index}</span>
        <span class="seed-acct-pk">${shortAddr(a.publicKeyBase58)}</span>
      </button>`;
    })
    .join("");
  elImportSeedRoot.innerHTML = `
    <div class="scheme-grid">${schemeBtns}</div>
    ${custom}
    <p class="path-line" title="${session.importSeedPathPreview.replace(/"/g, "&quot;")}">${session.importSeedPathPreview}</p>
    <div class="seed-acct-list">${rows || (session.importSeedBusy ? "<p class='muted small'>讀取中</p>" : "")}</div>
    <p class="inline-err" id="import-seed-err"></p>
  `;
}

export function renderImportSeedScreen(): void {
  if (session.importSeedStep === "pick") mountImportSeedPick();
  else mountImportSeedWords();
  applyViewChrome();
  syncShellDock();
}

export async function requestSeedPreview(): Promise<"ok" | "fail" | "stale"> {
  const gen = ++session.importSeedPreviewGen;
  session.importSeedBusy = true;
  syncShellDock();

  const res = await sendExtensionRequest("wallet.previewSeedAccounts", {
    mnemonic: mnemonicFromSlots(),
    pathKind: session.importSeedKind,
    customPath: session.importSeedKind === "custom" ? session.importSeedCustomPath : undefined,
  });

  if (gen !== session.importSeedPreviewGen) return "stale";

  session.importSeedBusy = false;
  const errEl = () => document.getElementById("import-seed-err");

  if (!res.ok) {
    session.importSeedPreview = [];
    session.importSeedPathPreview = "";
    if (session.importSeedStep === "pick") mountImportSeedPick();
    const node = errEl();
    if (node) node.textContent = res.error?.message ?? "預覽失敗";
    syncShellDock();
    return "fail";
  }

  const result = res.result as {
    pathPreview: string;
    accounts: { index: number; publicKeyBase58: string }[];
  };
  session.importSeedPathPreview = result.pathPreview;
  session.importSeedPreview = result.accounts;
  if (session.importSeedStep === "pick") mountImportSeedPick();
  syncShellDock();
  return "ok";
}

async function runSeedPreview(): Promise<void> {
  const outcome = await requestSeedPreview();
  if (outcome === "stale") return;
  applyViewChrome();
  syncShellDock();
}

export { mnemonicFromSlots };

export function bindImportSeedUi(): void {
  if (elImportSeedRoot.dataset.bound === "1") return;
  elImportSeedRoot.dataset.bound = "1";

  elImportSeedRoot.addEventListener("input", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.id === "import-seed-custom") {
      session.importSeedCustomPath = t.value;
      return;
    }
    if (!t.matches(".word-slot input")) return;
    const i = Number(t.dataset.wordI);
    session.importSeedWords[i] = t.value.replace(/\s+/g, "");
    const slotCount = elImportSeedRoot.querySelectorAll(".word-slot input").length;
    ensureImportSeedWordCapacity();
    if (session.importSeedWords.length !== slotCount) rebuildImportSeedWordGrid(i);
    else syncImportSeedToolbar();
  });

  elImportSeedRoot.addEventListener("paste", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !t.matches(".word-slot input")) return;
    const text = (e as ClipboardEvent).clipboardData?.getData("text") ?? "";
    const parts = text.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 12) {
      e.preventDefault();
      const tlen = parts.length >= 24 ? 24 : 12;
      session.importSeedWords = Array(tlen).fill("").map((_, i) => (parts[i] ?? "").toLowerCase());
      rebuildImportSeedWordGrid();
    }
  });

  elImportSeedRoot.addEventListener("keydown", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement) || !t.matches(".word-slot input")) return;
    const keyEv = e as KeyboardEvent;
    if (keyEv.key !== " " && keyEv.key !== "Enter") return;
    keyEv.preventDefault();
    const i = Number(t.dataset.wordI);
    const next = elImportSeedRoot.querySelector<HTMLInputElement>(`.word-slot input[data-word-i="${i + 1}"]`);
    if (next) {
      next.focus();
      return;
    }
    if (i === 11 && importSeedFilledCount() >= 12 && session.importSeedWords.length === 12) {
      session.importSeedWords = [...session.importSeedWords, ...Array(12).fill("")];
      rebuildImportSeedWordGrid(12);
    }
  });

  elImportSeedRoot.addEventListener("mousedown", (e) => {
    const scheme = (e.target as HTMLElement).closest<HTMLElement>("[data-scheme]");
    if (!scheme?.dataset.scheme) return;
    session.importSeedKind = scheme.dataset.scheme as SeedPathKind;
    session.importSeedSelected = null;
    mountImportSeedPick();
    syncShellDock();
    void runSeedPreview();
  });

  elImportSeedRoot.addEventListener("click", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-seed-idx]");
    if (row?.dataset.seedIdx != null) {
      session.importSeedSelected = Number(row.dataset.seedIdx);
      mountImportSeedPick();
      syncShellDock();
    }
  });

  elImportSeedRoot.addEventListener("focusout", (e) => {
    if ((e.target as HTMLElement).id === "import-seed-custom" && session.importSeedKind === "custom") {
      void runSeedPreview();
    }
  });
}
