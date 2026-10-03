import { sendExtensionRequest } from "../shared/ext-api";
import {
  getExposedPublicKey,
  isCombinedAccount,
  isSigningOrWatch,
  parsePublicKeyBase58,
} from "../shared/accounts";
import {
  accountKind,
  customRpcForCluster,
  PUBLIC_RPC_BY_CLUSTER,
  type AccountMeta,
  type Cluster,
  type ClusterRpcConfig,
  type Settings,
} from "../shared/storage-keys";
import { type HomeTokenRow } from "./home-tokens";
import {
  createEnglishMnemonic12,
  keypairFromMnemonic,
  type SeedPathKind,
} from "../shared/seed-derive";

type ConnectionSummary = {
  origin: string;
  accountId: string;
  connectedAt: number;
};

type State = {
  vaultExists: boolean;
  unlocked: boolean;
  accounts: AccountMeta[];
  activeAccountId: string | null;
  settings: Settings;
  connections: ConnectionSummary[];
};

type View =
  | "home-token"
  | "home-activity"
  | "accounts"
  | "add-account"
  | "add-generate"
  | "add-generate-seed"
  | "add-import"
  | "add-import-secret"
  | "add-import-seed"
  | "add-watch"
  | "add-combined"
  | "account-rename"
  | "account-manage"
  | "account-reveal-key"
  | "settings"
  | "settings-network"
  | "settings-rpc"
  | "settings-keys"
  | "settings-password"
  | "connected-sites";

const SUBPAGE_TITLES: Record<Exclude<View, "home-token" | "home-activity">, string> = {
  accounts: "Accounts",
  "add-account": "新增帳戶",
  "add-generate": "Burner 錢包",
  "add-generate-seed": "助記詞錢包",
  "add-import": "匯入錢包",
  "add-import-secret": "密鑰",
  "add-import-seed": "助記詞",
  "add-watch": "觀察帳戶",
  "add-combined": "New combined",
  "account-rename": "Rename",
  "account-manage": "Manage",
  "account-reveal-key": "Reveal key",
  settings: "Settings",
  "settings-network": "網路",
  "settings-rpc": "RPC",
  "settings-keys": "API keys",
  "settings-password": "錢包密碼",
  "connected-sites": "Connected sites",
};

let currentView: View = "home-token";
let focusAccountId: string | null = null;
let menuOpen = false;
let revealedSecretInMemory: string | null = null;
let lastActiveAccountId: string | null = null;
let lastSettingsRpc = "";
let lastSettingsFingerprint = "";
let lastState: State | null = null;
let lastSuccessfulTokenRows: HomeTokenRow[] = [];
let homeAssetsRefreshTimer: ReturnType<typeof setTimeout> | null = null;
let homeAssetsRequestGen = 0;
const expandedTokenRowIds = new Set<string>();

let generateSuccessPk: string | null = null;
let generateSeedWords: string[] | null = null;
let generateSeedPk: string | null = null;
let generateSeedBusy = false;
let importSeedWords: string[] = Array(12).fill("");
let importSeedStep: "words" | "pick" = "words";
let importSeedKind: SeedPathKind = "phantom";
let importSeedCustomPath = "m/44'/501'/{n}'/0'";
let importSeedPathPreview = "";
let importSeedPreview: { index: number; publicKeyBase58: string }[] = [];
let importSeedSelected: number | null = null;
let importSeedBusy = false;
let importSeedPreviewGen = 0;

type CombinedCreateState = {
  draftChips: string[];
  pickedPks: Set<string>;
  currentMain: string;
};

let combinedCreate: CombinedCreateState = {
  draftChips: [],
  pickedPks: new Set(),
  currentMain: "",
};

const elDock = document.getElementById("shell-dock")!;
const elDockPrimary = document.getElementById("dock-primary") as HTMLButtonElement;
const elBtnBack = document.getElementById("btn-back") as HTMLButtonElement;
const elGenerateForm = document.getElementById("generate-form")!;
const elGenerateSuccess = document.getElementById("generate-success")!;
const elGenerateSuccessPk = document.getElementById("generate-success-pk")!;
const elImportSecretFmt = document.getElementById("import-secret-fmt")!;
const elImportSecretFmtText = document.getElementById("import-secret-fmt-text")!;
const elImportSeedRoot = document.getElementById("import-seed-root")!;

const el = {
  setup: document.getElementById("setup")!,
  locked: document.getElementById("locked")!,
  shell: document.getElementById("shell")!,
  barHome: document.getElementById("bar-home")!,
  barSubpage: document.getElementById("bar-subpage")!,
  subpageTitle: document.getElementById("subpage-title")!,
  menuOverlay: document.getElementById("menu-overlay")!,
  menuDropdown: document.getElementById("menu-dropdown")!,
  homeTabBar: document.getElementById("home-tab-bar")!,
  widgetLabel: document.getElementById("widget-label")!,
  widgetAddr: document.getElementById("widget-addr")!,
  widgetAvatar: document.getElementById("widget-avatar")!,
  homeTokens: document.getElementById("home-tokens")!,
  homeAssetsError: document.getElementById("home-assets-error")!,
  accountsList: document.getElementById("accounts-list")!,
  renameAddrHint: document.getElementById("rename-addr-hint")!,
  renameLabel: document.getElementById("rename-label") as HTMLInputElement,
  manageName: document.getElementById("manage-name")!,
  manageAddr: document.getElementById("manage-addr")!,
  manageReadonlyBadge: document.getElementById("manage-readonly-badge")!,
  btnGoReveal: document.getElementById("btn-go-reveal")!,
  revealHint: document.getElementById("reveal-hint")!,
  revealMaskBlock: document.getElementById("reveal-mask-block")!,
  revealSecretBlock: document.getElementById("reveal-secret-block")!,
  revealPassword: document.getElementById("reveal-password") as HTMLInputElement,
  revealSecretText: document.getElementById("reveal-secret-text")!,
  connectedList: document.getElementById("connected-list")!,
  hubSummaryNetwork: document.getElementById("hub-summary-network")!,
  hubSummaryRpc: document.getElementById("hub-summary-rpc")!,
  hubSummaryKeys: document.getElementById("hub-summary-keys")!,
  heliusApiUrl: document.getElementById("helius-api-url") as HTMLInputElement,
  jupiterApiKey: document.getElementById("jupiter-api-key") as HTMLInputElement,
  changePwdCurrent: document.getElementById("change-pwd-current") as HTMLInputElement,
  changePwdNew: document.getElementById("change-pwd-new") as HTMLInputElement,
  changePwdConfirm: document.getElementById("change-pwd-confirm") as HTMLInputElement,
  changePwdErr: document.getElementById("change-pwd-err")!,
  error: document.getElementById("error")!,
};

const screens: Record<View, HTMLElement> = {
  "home-token": document.getElementById("screen-home-token")!,
  "home-activity": document.getElementById("screen-home-activity")!,
  accounts: document.getElementById("screen-accounts")!,
  "add-account": document.getElementById("screen-add-account")!,
  "add-generate": document.getElementById("screen-add-generate")!,
  "add-generate-seed": document.getElementById("screen-add-generate-seed")!,
  "add-import": document.getElementById("screen-add-import")!,
  "add-import-secret": document.getElementById("screen-add-import-secret")!,
  "add-import-seed": document.getElementById("screen-add-import-seed")!,
  "add-watch": document.getElementById("screen-add-watch")!,
  "add-combined": document.getElementById("screen-add-combined")!,
  "account-rename": document.getElementById("screen-account-rename")!,
  "account-manage": document.getElementById("screen-account-manage")!,
  "account-reveal-key": document.getElementById("screen-account-reveal-key")!,
  settings: document.getElementById("screen-settings")!,
  "settings-network": document.getElementById("screen-settings-network")!,
  "settings-rpc": document.getElementById("screen-settings-rpc")!,
  "settings-keys": document.getElementById("screen-settings-keys")!,
  "settings-password": document.getElementById("screen-settings-password")!,
  "connected-sites": document.getElementById("screen-connected-sites")!,
};

let errorHideTimer: number | null = null;

function showError(msg: string): void {
  if (errorHideTimer != null) {
    window.clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
  el.error.hidden = false;
  el.error.textContent = msg;
  errorHideTimer = window.setTimeout(() => {
    clearError();
  }, 4000);
}

function clearError(): void {
  if (errorHideTimer != null) {
    window.clearTimeout(errorHideTimer);
    errorHideTimer = null;
  }
  el.error.hidden = true;
  el.error.textContent = "";
}

function shortAddr(pk: string): string {
  if (pk.length <= 8) return pk;
  return `${pk.slice(0, 4)}…${pk.slice(-4)}`;
}

/** 錢包密碼欄：類 B 遮罩 text，不進密碼管理器。 */
function hardenWalletPasswordInput(inp: HTMLInputElement): void {
  inp.type = "text";
  inp.classList.add("wallet-pwd-masked");
  inp.removeAttribute("name");
  hardenSensitiveTextInput(inp);
}

/** 降低瀏覽器／密碼管理器把助記詞或私鑰當成可儲存表單欄位的機率（無法 100% 保證）。 */
function hardenSensitiveTextInput(el: HTMLInputElement | HTMLTextAreaElement): void {
  el.autocomplete = "off";
  el.setAttribute("autocapitalize", "off");
  el.setAttribute("autocorrect", "off");
  el.setAttribute("spellcheck", "false");
  el.setAttribute("aria-autocomplete", "none");
  el.setAttribute("data-lpignore", "true");
  el.setAttribute("data-1p-ignore", "");
  el.setAttribute("data-form-type", "other");
  el.readOnly = true;
  el.addEventListener("focus", () => {
    el.readOnly = false;
  });
}

type SecretDetect = { kind: "empty" | "bytes" | "base58"; ok: boolean };

function detectSecret(raw: string): SecretDetect {
  const t = raw.trim();
  if (!t) return { kind: "empty", ok: false };
  if (t.startsWith("[")) {
    try {
      const arr = JSON.parse(t) as unknown;
      const ok =
        Array.isArray(arr) &&
        arr.length >= 32 &&
        arr.every((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 255);
      return { kind: "bytes", ok };
    } catch {
      return { kind: "bytes", ok: false };
    }
  }
  const b58 = /^[1-9A-HJ-NP-Za-km-z]+$/.test(t) && t.length >= 64 && t.length <= 128;
  return { kind: "base58", ok: b58 };
}

function syncImportSecretFmt(): void {
  const raw = (document.getElementById("import-secret") as HTMLTextAreaElement).value;
  const d = detectSecret(raw);
  elImportSecretFmt.classList.remove("ok", "bad");
  if (d.kind === "empty") {
    elImportSecretFmtText.textContent = "base58 或 [bytes]";
  } else if (d.ok) {
    elImportSecretFmt.classList.add("ok");
    elImportSecretFmtText.textContent = d.kind === "bytes" ? "位元組陣列" : "base58";
  } else {
    elImportSecretFmt.classList.add("bad");
    elImportSecretFmtText.textContent = "無法辨識";
  }
}

function importSeedFilledCount(): number {
  return importSeedWords.filter((w) => w.trim()).length;
}

function resetCombinedCreate(): void {
  combinedCreate = { draftChips: [], pickedPks: new Set(), currentMain: "" };
  const draft = document.getElementById("combined-draft") as HTMLInputElement | null;
  const label = document.getElementById("combined-label") as HTMLInputElement | null;
  if (draft) draft.value = "";
  if (label) label.value = "";
  const err = document.getElementById("combined-err");
  if (err) err.textContent = "";
}

function combinedMemberPubkeys(): string[] {
  const fromPick: string[] = [];
  if (lastState) {
    for (const a of lastState.accounts) {
      if (!isSigningOrWatch(a)) continue;
      if (combinedCreate.pickedPks.has(a.publicKeyBase58)) fromPick.push(a.publicKeyBase58);
    }
  }
  const ordered: string[] = [];
  for (const x of [...combinedCreate.draftChips, ...fromPick]) {
    if (!ordered.includes(x)) ordered.push(x);
  }
  return ordered;
}

function validCombinedMembers(): string[] {
  return combinedMemberPubkeys().filter((pk) => parsePublicKeyBase58(pk) != null);
}

function syncShellDock(): void {
  elDock.hidden = true;
  elDockPrimary.disabled = true;
  elDockPrimary.textContent = "";

  if (currentView === "add-generate") {
    elDock.hidden = false;
    if (generateSuccessPk) {
      elDockPrimary.textContent = "完成";
      elDockPrimary.disabled = false;
      return;
    }
    elDockPrimary.textContent = "產生";
    elDockPrimary.disabled = false;
    return;
  }

  if (currentView === "add-generate-seed") {
    elDock.hidden = false;
    elDockPrimary.textContent = "建立";
    elDockPrimary.disabled = generateSeedBusy || generateSeedWords == null;
    return;
  }

  if (currentView === "add-import-secret") {
    elDock.hidden = false;
    elDockPrimary.textContent = "匯入";
    const d = detectSecret((document.getElementById("import-secret") as HTMLTextAreaElement).value);
    elDockPrimary.disabled = !d.ok;
    return;
  }

  if (currentView === "add-import-seed") {
    elDock.hidden = false;
    if (importSeedStep === "pick") {
      elDockPrimary.textContent = "匯入";
      elDockPrimary.disabled = importSeedBusy || importSeedSelected == null;
    } else {
      elDockPrimary.textContent = "下一步";
      const n = importSeedFilledCount();
      elDockPrimary.disabled = importSeedBusy || !(n === 12 || n === 24);
    }
    return;
  }

  if (currentView === "add-watch") {
    elDock.hidden = false;
    elDockPrimary.textContent = "建立";
    const pk = (document.getElementById("watch-pk") as HTMLInputElement).value;
    elDockPrimary.disabled = parsePublicKeyBase58(pk) == null;
    return;
  }

  if (currentView === "add-combined") {
    elDock.hidden = false;
    elDockPrimary.textContent = "建立 Combined";
    elDockPrimary.disabled = validCombinedMembers().length < 1;
    return;
  }

  if (currentView === "settings-password") {
    elDock.hidden = false;
    elDockPrimary.textContent = "變更密碼";
    elDockPrimary.disabled = !changePasswordCanSubmit();
    return;
  }
}

function clearChangePasswordFieldValues(): void {
  el.changePwdCurrent.value = "";
  el.changePwdNew.value = "";
  el.changePwdConfirm.value = "";
}

function clearChangePasswordFields(): void {
  clearChangePasswordFieldValues();
  el.changePwdErr.textContent = "";
}

function changePasswordCanSubmit(): boolean {
  const newPwd = el.changePwdNew.value;
  const confirm = el.changePwdConfirm.value;
  if (newPwd.length < 8) return false;
  if (newPwd !== confirm) return false;
  if (!el.changePwdCurrent.value) return false;
  return true;
}

function renderGenerateChrome(): void {
  const done = generateSuccessPk != null;
  elGenerateForm.hidden = done;
  elGenerateSuccess.hidden = !done;
  if (done) elGenerateSuccessPk.textContent = shortAddr(generateSuccessPk!);
}

const SVG_COPY =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';

function resetGenerateSeedFlow(): void {
  generateSeedBusy = false;
  const label = document.getElementById("generate-seed-label") as HTMLInputElement | null;
  const err = document.getElementById("generate-seed-err");
  if (label) label.value = "";
  if (err) err.textContent = "";
  try {
    const mnemonic = createEnglishMnemonic12();
    const kp = keypairFromMnemonic(mnemonic, "phantom", 0);
    generateSeedWords = mnemonic.split(" ");
    generateSeedPk = kp.publicKey.toBase58();
  } catch {
    generateSeedWords = null;
    generateSeedPk = null;
  }
}

function renderGenerateSeedChrome(): void {
  const grid = document.getElementById("generate-seed-grid");
  const pkEl = document.getElementById("generate-seed-pk");
  if (!grid || !pkEl) return;
  if (!generateSeedWords || !generateSeedPk) {
    grid.innerHTML = "";
    pkEl.textContent = "";
    pkEl.removeAttribute("title");
    return;
  }
  grid.innerHTML = generateSeedWords
    .map(
      (w, i) =>
        `<div class="word-ro"><span class="word-ro-n">${i + 1}</span><span class="word-ro-w">${w}</span></div>`,
    )
    .join("");
  pkEl.textContent = shortAddr(generateSeedPk);
  pkEl.title = generateSeedPk;
}

function importSeedTargetLength(): number {
  const n = importSeedFilledCount();
  return n > 12 ? 24 : 12;
}

function resetImportSeedFlow(): void {
  importSeedPreviewGen++;
  importSeedWords = Array(12).fill("");
  importSeedStep = "words";
  importSeedKind = "phantom";
  importSeedCustomPath = "m/44'/501'/{n}'/0'";
  importSeedPathPreview = "";
  importSeedPreview = [];
  importSeedSelected = null;
  importSeedBusy = false;
}

function mnemonicFromSlots(): string {
  return importSeedWords.map((w) => w.trim().toLowerCase()).filter(Boolean).join(" ");
}

function ensureImportSeedWordCapacity(): void {
  const target = importSeedTargetLength();
  if (importSeedWords.length === target) return;
  const next = Array<string>(target).fill("");
  importSeedWords.forEach((w, i) => {
    if (i < target) next[i] = w;
  });
  importSeedWords = next;
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
  grid.innerHTML = importSeedWords
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
        `<button type="button" class="scheme-btn${importSeedKind === s.id ? " on" : ""}" data-scheme="${s.id}">${s.label}</button>`,
    )
    .join("");
  const custom =
    importSeedKind === "custom"
      ? `<div class="field"><label>路徑</label><input id="import-seed-custom" type="text" spellcheck="false" autocomplete="off" value="${importSeedCustomPath.replace(/"/g, "&quot;")}" /></div>`
      : "";
  const rows = importSeedPreview
    .map((a) => {
      const on = importSeedSelected === a.index ? " on" : "";
      return `<button type="button" class="seed-acct${on}" data-seed-idx="${a.index}">
        <span class="seed-acct-idx">#${a.index}</span>
        <span class="seed-acct-pk">${shortAddr(a.publicKeyBase58)}</span>
      </button>`;
    })
    .join("");
  elImportSeedRoot.innerHTML = `
    <div class="scheme-grid">${schemeBtns}</div>
    ${custom}
    <p class="path-line" title="${importSeedPathPreview.replace(/"/g, "&quot;")}">${importSeedPathPreview}</p>
    <div class="seed-acct-list">${rows || (importSeedBusy ? "<p class='muted small'>讀取中</p>" : "")}</div>
    <p class="inline-err" id="import-seed-err"></p>
  `;
}

function renderImportSeedScreen(): void {
  if (importSeedStep === "pick") mountImportSeedPick();
  else mountImportSeedWords();
  applyViewChrome();
  syncShellDock();
}

function bindImportSeedUi(): void {
  if (elImportSeedRoot.dataset.bound === "1") return;
  elImportSeedRoot.dataset.bound = "1";

  elImportSeedRoot.addEventListener("input", (e) => {
    const t = e.target;
    if (!(t instanceof HTMLInputElement)) return;
    if (t.id === "import-seed-custom") {
      importSeedCustomPath = t.value;
      return;
    }
    if (!t.matches(".word-slot input")) return;
    const i = Number(t.dataset.wordI);
    importSeedWords[i] = t.value.replace(/\s+/g, "");
    const slotCount = elImportSeedRoot.querySelectorAll(".word-slot input").length;
    ensureImportSeedWordCapacity();
    if (importSeedWords.length !== slotCount) rebuildImportSeedWordGrid(i);
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
      importSeedWords = Array(tlen).fill("").map((_, i) => (parts[i] ?? "").toLowerCase());
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
    if (i === 11 && importSeedFilledCount() >= 12 && importSeedWords.length === 12) {
      importSeedWords = [...importSeedWords, ...Array(12).fill("")];
      rebuildImportSeedWordGrid(12);
    }
  });

  elImportSeedRoot.addEventListener("mousedown", (e) => {
    const scheme = (e.target as HTMLElement).closest<HTMLElement>("[data-scheme]");
    if (!scheme?.dataset.scheme) return;
    importSeedKind = scheme.dataset.scheme as SeedPathKind;
    importSeedSelected = null;
    mountImportSeedPick();
    syncShellDock();
    void runSeedPreview();
  });

  elImportSeedRoot.addEventListener("click", (e) => {
    const row = (e.target as HTMLElement).closest<HTMLElement>("[data-seed-idx]");
    if (row?.dataset.seedIdx != null) {
      importSeedSelected = Number(row.dataset.seedIdx);
      mountImportSeedPick();
      syncShellDock();
    }
  });

  elImportSeedRoot.addEventListener("focusout", (e) => {
    if ((e.target as HTMLElement).id === "import-seed-custom" && importSeedKind === "custom") {
      void runSeedPreview();
    }
  });
}
bindImportSeedUi();

async function requestSeedPreview(): Promise<"ok" | "fail" | "stale"> {
  const gen = ++importSeedPreviewGen;
  importSeedBusy = true;
  syncShellDock();

  const res = await sendExtensionRequest("wallet.previewSeedAccounts", {
    mnemonic: mnemonicFromSlots(),
    pathKind: importSeedKind,
    customPath: importSeedKind === "custom" ? importSeedCustomPath : undefined,
  });

  if (gen !== importSeedPreviewGen) return "stale";

  importSeedBusy = false;
  const errEl = () => document.getElementById("import-seed-err");

  if (!res.ok) {
    importSeedPreview = [];
    importSeedPathPreview = "";
    if (importSeedStep === "pick") mountImportSeedPick();
    const el = errEl();
    if (el) el.textContent = res.error?.message ?? "預覽失敗";
    syncShellDock();
    return "fail";
  }

  const result = res.result as {
    pathPreview: string;
    accounts: { index: number; publicKeyBase58: string }[];
  };
  importSeedPathPreview = result.pathPreview;
  importSeedPreview = result.accounts;
  if (importSeedStep === "pick") mountImportSeedPick();
  syncShellDock();
  return "ok";
}

async function runSeedPreview(): Promise<void> {
  const outcome = await requestSeedPreview();
  if (outcome === "stale") return;
  applyViewChrome();
  syncShellDock();
}

function renderCombinedCreateScreen(state: State): void {
  const mem = combinedMemberPubkeys();
  const valid = validCombinedMembers();
  if (!combinedCreate.currentMain || !valid.includes(combinedCreate.currentMain)) {
    combinedCreate.currentMain = valid[0] ?? "";
  }

  const chipList = document.getElementById("combined-chip-list")!;
  chipList.innerHTML = "";
  combinedCreate.draftChips.forEach((pk, i) => {
    const chip = document.createElement("span");
    chip.className = `addr-chip${pk === combinedCreate.currentMain ? " main" : ""}`;
    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "chip-pick";
    pick.title = pk;
    pick.textContent = shortAddr(pk);
    pick.addEventListener("click", () => {
      if (parsePublicKeyBase58(pk)) combinedCreate.currentMain = pk;
      renderCombinedCreateScreen(state);
      syncShellDock();
    });
    chip.append(pick);
    if (pk === combinedCreate.currentMain) {
      const tag = document.createElement("span");
      tag.className = "addr-tag";
      tag.textContent = "目前";
      chip.append(tag);
    }
    const del = document.createElement("button");
    del.type = "button";
    del.className = "icon-btn sm-inline ghost-inline";
    del.title = "刪除";
    del.setAttribute("aria-label", "刪除");
    del.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 7l10 10M17 7 7 17"/></svg>`;
    del.addEventListener("click", () => {
      combinedCreate.draftChips.splice(i, 1);
      renderCombinedCreateScreen(state);
      syncShellDock();
    });
    chip.append(del);
    chipList.append(chip);
  });

  const pickList = document.getElementById("combined-pick-list")!;
  pickList.innerHTML = "";
  for (const a of state.accounts) {
    if (!isSigningOrWatch(a)) continue;
    const row = document.createElement("label");
    row.className = "combined-pick-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = combinedCreate.pickedPks.has(a.publicKeyBase58);
    cb.addEventListener("change", () => {
      if (cb.checked) combinedCreate.pickedPks.add(a.publicKeyBase58);
      else combinedCreate.pickedPks.delete(a.publicKeyBase58);
      renderCombinedCreateScreen(state);
      syncShellDock();
    });
    const mid = document.createElement("span");
    mid.className = "pick-name";
    mid.textContent = a.label;
    const end = document.createElement("span");
    end.className = "pick-addr";
    end.textContent = shortAddr(a.publicKeyBase58);
    row.append(cb, mid, end);
    pickList.append(row);
  }

  const rowsEl = document.getElementById("combined-member-rows")!;
  rowsEl.innerHTML = "";
  for (const pk of valid) {
    const row = document.createElement("div");
    row.className = "combined-member-row";
    const mono = document.createElement("span");
    mono.className = "mono";
    mono.textContent = shortAddr(pk);
    row.append(mono);
    if (pk === combinedCreate.currentMain) {
      const tag = document.createElement("span");
      tag.className = "addr-tag";
      tag.textContent = "目前錢包";
      row.append(tag);
    }
    rowsEl.append(row);
  }

  syncShellDock();
}

function avatarLetter(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  return t.slice(0, 1).toUpperCase();
}

function isHomeView(view: View): boolean {
  return view === "home-token" || view === "home-activity";
}

function clearRevealSecret(): void {
  revealedSecretInMemory = null;
  el.revealPassword.value = "";
  el.revealSecretText.textContent = "";
  el.revealMaskBlock.hidden = false;
  el.revealSecretBlock.hidden = true;
}

function setMenuOpen(open: boolean): void {
  menuOpen = open;
  el.menuOverlay.hidden = !open;
  el.menuOverlay.setAttribute("aria-hidden", open ? "false" : "true");
  document.querySelectorAll(".menu-dropdown").forEach((dd) => {
    const node = dd as HTMLElement;
    if (!open) {
      node.hidden = true;
      return;
    }
    const bar = node.closest(".bar-home, .bar-subpage") as HTMLElement | null;
    node.hidden = !bar || bar.hidden;
  });
  document.querySelectorAll("#btn-menu, .btn-menu-sub").forEach((btn) => {
    btn.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

function navigateTo(view: View, accountId?: string): void {
  clearError();
  if (currentView === "add-import-seed" && view !== "add-import-seed") {
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
  }
  if (currentView === "add-generate-seed" && view !== "add-generate-seed") {
    resetGenerateSeedFlow();
  }
  if (currentView === "add-import-secret" && view !== "add-import-secret") {
    const importSecret = document.getElementById("import-secret") as HTMLTextAreaElement | null;
    if (importSecret) importSecret.value = "";
  }
  if (currentView === "account-reveal-key" && view !== "account-reveal-key") {
    clearRevealSecret();
  }
  if (view === "settings-password" && currentView !== "settings-password") {
    clearChangePasswordFields();
  }
  if (view.startsWith("settings") && currentView.startsWith("settings") && view !== currentView) {
    if (currentView === "settings-password") clearChangePasswordFields();
    if (currentView === "settings-keys") {
      keysHeliusRevealed = false;
      keysJupiterRevealed = false;
    }
  }
  if (view === "settings" || view.startsWith("settings-")) {
    rpcEditKey = null;
  }
  if (accountId !== undefined) focusAccountId = accountId;
  currentView = view;
  setMenuOpen(false);
  applyViewChrome();
  if (lastState && view === "home-token") {
    scheduleRefreshHomeAssets(lastState);
  }
  if (view === "add-combined") {
    resetCombinedCreate();
    if (lastState) renderCombinedCreateScreen(lastState);
  }
  if (view === "add-generate") {
    generateSuccessPk = null;
    renderGenerateChrome();
    const genLabel = document.getElementById("generate-label") as HTMLInputElement;
    const genErr = document.getElementById("generate-err");
    if (genLabel) genLabel.value = "";
    if (genErr) genErr.textContent = "";
  }
  if (view === "add-generate-seed") {
    resetGenerateSeedFlow();
    renderGenerateSeedChrome();
  }
  if (view === "add-import-secret") {
    const importLabel = document.getElementById("import-label") as HTMLInputElement;
    const importSecret = document.getElementById("import-secret") as HTMLTextAreaElement;
    const importErr = document.getElementById("import-secret-err");
    if (importLabel) importLabel.value = "";
    if (importSecret) {
      importSecret.value = "";
      hardenSensitiveTextInput(importSecret);
    }
    if (importErr) importErr.textContent = "";
    syncImportSecretFmt();
  }
  if (view === "add-import-seed") {
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
    renderImportSeedScreen();
  }
  if (view === "add-watch") {
    const wName = document.getElementById("watch-label") as HTMLInputElement;
    const wPk = document.getElementById("watch-pk") as HTMLInputElement;
    const wErr = document.getElementById("watch-err");
    if (wName) wName.value = "";
    if (wPk) wPk.value = "";
    if (wErr) wErr.textContent = "";
  }
  syncShellDock();
  if (lastState) {
    if (currentView === "account-manage") renderManageScreen(lastState);
    if (currentView === "account-reveal-key") renderRevealScreen(lastState);
    if (currentView === "account-rename") {
      const acc = lastState.accounts.find((a) => a.id === focusAccountId);
      if (acc) {
        el.renameLabel.value = acc.label;
        el.renameAddrHint.textContent = shortAddr(getExposedPublicKey(acc));
      }
    }
  }
}

function applyViewChrome(): void {
  const home = isHomeView(currentView);
  el.barHome.hidden = !home;
  el.barSubpage.hidden = home;
  el.homeTabBar.hidden = !home;

  if (!home) {
    if (currentView === "add-import-seed" && importSeedStep === "pick") {
      el.subpageTitle.textContent = "選帳戶";
    } else {
      el.subpageTitle.textContent = SUBPAGE_TITLES[currentView as keyof typeof SUBPAGE_TITLES] ?? "";
    }
  }

  for (const [name, section] of Object.entries(screens)) {
    section.hidden = name !== currentView;
  }

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    const tab = (btn as HTMLElement).dataset.homeTab;
    btn.classList.toggle("active", tab === currentView);
  });

  if (currentView === "add-generate") renderGenerateChrome();
  if (currentView === "add-generate-seed") renderGenerateSeedChrome();
  elBtnBack.hidden = false;
  syncShellDock();
}

function renderTokenCards(rows: HomeTokenRow[], activeIsCombined: boolean): void {
  el.homeTokens.innerHTML = "";
  for (const row of rows) {
    const li = document.createElement("li");
    li.className = "token-card";
    const canExpand =
      activeIsCombined && row.members != null && row.members.length >= 1;
    const expanded = canExpand && expandedTokenRowIds.has(row.id);

    const iconEl = document.createElement("div");
    iconEl.className = "token-icon";
    iconEl.setAttribute("aria-hidden", "true");
    if (row.iconUrl) {
      const img = document.createElement("img");
      img.src = row.iconUrl;
      img.alt = "";
      img.addEventListener("error", () => {
        iconEl.textContent = row.iconLetter;
      });
      iconEl.append(img);
    } else {
      iconEl.textContent = row.iconLetter;
    }
    const main = document.createElement("div");
    main.className = "token-main";
    const nameRow = document.createElement("div");
    nameRow.className = "token-name-row";
    const nameEl = document.createElement("div");
    nameEl.className = "token-sym";
    nameEl.textContent = row.name || row.symbol;
    nameRow.append(nameEl);
    if (row.isVerified) {
      const tick = document.createElement("span");
      tick.className = "token-verified";
      tick.title = "Jupiter verified";
      tick.setAttribute("aria-label", "verified");
      tick.textContent = "✓";
      nameRow.append(tick);
    }
    if (row.organicScore != null && Number.isFinite(row.organicScore)) {
      const score = document.createElement("span");
      score.className = "token-score";
      const n = Math.round(row.organicScore);
      score.textContent = String(n);
      score.title = row.organicScoreLabel
        ? `organic ${n} (${row.organicScoreLabel})`
        : `organic ${n}`;
      nameRow.append(score);
    }
    const qtyEl = document.createElement("div");
    qtyEl.className = "token-qty";
    qtyEl.textContent = `${row.uiAmountLabel} ${row.symbol}`;
    main.append(nameRow, qtyEl);

    const rightCol = document.createElement("div");
    rightCol.className = "token-right";
    const usd = document.createElement("div");
    usd.className = "token-usd";
    usd.textContent = row.usdLabel;
    rightCol.append(usd);

    if (canExpand) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "token-expand-btn";
      toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
      toggle.setAttribute("aria-label", expanded ? "收合成員" : "展開成員");
      toggle.textContent = expanded ? "▾" : "▸";
      toggle.addEventListener("click", () => {
        if (expandedTokenRowIds.has(row.id)) expandedTokenRowIds.delete(row.id);
        else expandedTokenRowIds.add(row.id);
        renderTokenCards(lastSuccessfulTokenRows, activeIsCombined);
      });
      rightCol.append(toggle);
    }

    li.append(iconEl, main, rightCol);
    el.homeTokens.append(li);

    if (canExpand && expanded && row.members) {
      const detailLi = document.createElement("li");
      detailLi.className = "token-members";
      const ul = document.createElement("ul");
      for (const m of row.members) {
        const mli = document.createElement("li");
        mli.className = "token-member-row";
        const pct = Math.round(m.percent);
        mli.textContent = `${shortAddr(m.pubkey)} · ${m.uiAmountLabel} ${row.symbol} · ${pct}%`;
        ul.append(mli);
      }
      detailLi.append(ul);
      el.homeTokens.append(detailLi);
    }
  }
}

function rpcFingerprint(settings: Settings): string {
  const pack = (c: Cluster): string => {
    const cfg = settings.rpcByCluster[c];
    return `${cfg.active}\u001e${cfg.urls.join("\u001f")}`;
  };
  return `${pack("devnet")}|${pack("mainnet")}`;
}

function settingsFingerprint(settings: Settings): string {
  return `${settings.cluster}|${rpcFingerprint(settings)}|${settings.heliusApiUrl}|${settings.jupiterApiKey}`;
}

function cloneRpcByCluster(
  raw: Record<Cluster, ClusterRpcConfig> | undefined,
): Record<Cluster, ClusterRpcConfig> {
  const src = raw ?? {
    devnet: { urls: [], active: "" },
    mainnet: { urls: [], active: "" },
  };
  return {
    devnet: { urls: [...src.devnet.urls], active: src.devnet.active },
    mainnet: { urls: [...src.mainnet.urls], active: src.mainnet.active },
  };
}

async function patchRpcByCluster(next: Record<Cluster, ClusterRpcConfig>): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", { rpcByCluster: next });
  if (!res.ok) showError(res.error?.message ?? "儲存 RPC 失敗");
  else await refresh();
}

async function patchSettingsPartial(patch: Partial<Settings>): Promise<void> {
  const res = await sendExtensionRequest("storage.patchSettings", patch);
  if (!res.ok) showError(res.error?.message ?? "儲存設定失敗");
  else await refresh();
}

function looksHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s);
}

function rpcIconButton(title: string, svgInner: string, extraClass = ""): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = `icon-btn ghost-inline rpc-icon-btn${extraClass ? ` ${extraClass}` : ""}`;
  btn.title = title;
  btn.setAttribute("aria-label", title);
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${svgInner}</svg>`;
  return btn;
}

const SVG_PLUS = '<path d="M12 5v14M5 12h14"/>';
const SVG_TRASH =
  '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/>';
const SVG_CHECK = '<path d="M5 12.5l4.2 4.2L19 7"/>';

let rpcEditKey: string | null = null;
let keysHeliusRevealed = false;
let keysJupiterRevealed = false;

const MASKED_SECRET_DISPLAY = "••••••";

function rpcOptionKey(cluster: Cluster, isPublic: boolean, url: string): string {
  return isPublic ? `${cluster}:public` : `${cluster}:${url}`;
}

function apiKeysHubSummary(settings: Settings): string {
  const h = settings.heliusApiUrl.trim().length > 0;
  const j = settings.jupiterApiKey.trim().length > 0;
  if (h && j) return "已設定";
  if (h || j) return "部分設定";
  return "未設定";
}

function renderSettingsHub(settings: Settings): void {
  el.hubSummaryNetwork.textContent = settings.cluster === "mainnet" ? "Mainnet" : "Devnet";
  el.hubSummaryRpc.textContent = settings.rpcUrl;
  el.hubSummaryKeys.textContent = apiKeysHubSummary(settings);
}

function syncNetworkRadios(settings: Settings): void {
  document.querySelectorAll<HTMLInputElement>('input[name="settings-cluster"]').forEach((radio) => {
    radio.checked = radio.value === settings.cluster;
  });
}

function renderSettingsKeysFields(settings: Settings): void {
  const heliusFocused = document.activeElement === el.heliusApiUrl;
  const jupiterFocused = document.activeElement === el.jupiterApiKey;
  if (!heliusFocused) {
    if (!keysHeliusRevealed && settings.heliusApiUrl) {
      el.heliusApiUrl.value = MASKED_SECRET_DISPLAY;
      el.heliusApiUrl.readOnly = true;
    } else if (keysHeliusRevealed) {
      el.heliusApiUrl.readOnly = false;
      el.heliusApiUrl.value = settings.heliusApiUrl;
    } else {
      el.heliusApiUrl.readOnly = false;
      el.heliusApiUrl.value = "";
    }
  }
  if (!jupiterFocused) {
    if (!keysJupiterRevealed && settings.jupiterApiKey) {
      el.jupiterApiKey.value = MASKED_SECRET_DISPLAY;
      el.jupiterApiKey.readOnly = true;
    } else if (keysJupiterRevealed) {
      el.jupiterApiKey.readOnly = false;
      el.jupiterApiKey.value = settings.jupiterApiKey;
    } else {
      el.jupiterApiKey.readOnly = false;
      el.jupiterApiKey.value = "";
    }
  }
}

function renderSettingsPanel(settings: Settings): void {
  renderSettingsHub(settings);
  syncNetworkRadios(settings);
  const badgeDev = document.getElementById("rpc-badge-devnet");
  const badgeMain = document.getElementById("rpc-badge-mainnet");
  if (badgeDev) badgeDev.hidden = settings.cluster !== "devnet";
  if (badgeMain) badgeMain.hidden = settings.cluster !== "mainnet";
  renderRpcByCluster(settings, "devnet");
  renderRpcByCluster(settings, "mainnet");
  renderSettingsKeysFields(settings);
}

function renderRpcByCluster(settings: Settings, cluster: Cluster): void {
  const host = document.querySelector<HTMLElement>(`[data-rpc-list="${cluster}"]`);
  if (!host) return;
  host.replaceChildren();
  const cfg = settings.rpcByCluster[cluster];

  const addRow = (url: string, isPublic: boolean): void => {
    const key = rpcOptionKey(cluster, isPublic, url);
    const wrap = document.createElement("div");
    const row = document.createElement("div");
    const selected = isPublic ? cfg.active === "" : cfg.active === url;
    row.className = selected ? "rpc-row selected" : "rpc-row";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = `rpc-active-${cluster}`;
    radio.checked = selected;
    radio.addEventListener("change", () => {
      if (!radio.checked) return;
      const next = cloneRpcByCluster(settings.rpcByCluster);
      next[cluster] = { ...next[cluster], active: isPublic ? "" : url };
      void patchRpcByCluster(next);
    });
    const text = document.createElement("button");
    text.type = "button";
    text.className = "rpc-url-text";
    text.textContent = url;
    text.addEventListener("click", () => {
      rpcEditKey = rpcEditKey === key ? null : key;
      renderRpcByCluster(settings, cluster);
    });
    row.append(radio, text);
    if (isPublic) {
      const badge = document.createElement("span");
      badge.className = "rpc-badge";
      badge.textContent = "內建";
      row.append(badge);
    } else {
      const del = rpcIconButton("刪除", SVG_TRASH, "danger");
      del.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const next = cloneRpcByCluster(settings.rpcByCluster);
        const urls = next[cluster].urls.filter((u) => u !== url);
        const active = next[cluster].active === url ? "" : next[cluster].active;
        next[cluster] = { urls, active };
        if (rpcEditKey === key) rpcEditKey = null;
        void patchRpcByCluster(next);
      });
      row.append(del);
    }
    wrap.append(row);
    if (rpcEditKey === key) {
      wrap.append(buildRpcEditor(settings, cluster, url, isPublic, false));
    }
    host.append(wrap);
  };

  addRow(PUBLIC_RPC_BY_CLUSTER[cluster], true);
  for (const u of cfg.urls) addRow(u, false);
  if (rpcEditKey === `${cluster}:new`) {
    host.append(buildRpcEditor(settings, cluster, "", false, true));
  }
}

function buildRpcEditor(
  settings: Settings,
  cluster: Cluster,
  url: string,
  isPublic: boolean,
  isNew: boolean,
): HTMLElement {
  const edit = document.createElement("div");
  edit.className = "rpc-edit";
  const input = document.createElement("input");
  input.type = "text";
  input.value = url;
  input.readOnly = isPublic;
  input.autocomplete = "off";
  input.placeholder = "https://";
  edit.append(input);
  if (!isPublic) {
    const ok = rpcIconButton("確認", SVG_CHECK);
    ok.addEventListener("click", () => {
      clearError();
      const nextUrl = customRpcForCluster(input.value, cluster);
      if (!looksHttpUrl(input.value.trim()) || !nextUrl) {
        showError("請輸入有效的 https RPC URL");
        return;
      }
      const next = cloneRpcByCluster(settings.rpcByCluster);
      if (isNew) {
        if (!next[cluster].urls.includes(nextUrl)) {
          next[cluster].urls = [...next[cluster].urls, nextUrl];
        }
        next[cluster].active = nextUrl;
        rpcEditKey = rpcOptionKey(cluster, false, nextUrl);
      } else {
        const urls = next[cluster].urls.map((u) => (u === url ? nextUrl : u));
        next[cluster].urls = [...new Set(urls)];
        if (next[cluster].active === url) next[cluster].active = nextUrl;
        rpcEditKey = rpcOptionKey(cluster, false, nextUrl);
      }
      void patchRpcByCluster(next);
    });
    edit.append(ok);
    input.addEventListener("keydown", (ev) => {
      if (ev.key === "Enter") {
        ev.preventDefault();
        ok.click();
      }
      if (ev.key === "Escape") {
        rpcEditKey = null;
        renderRpcByCluster(settings, cluster);
      }
    });
  }
  queueMicrotask(() => {
    if (!isPublic) input.focus();
  });
  return edit;
}

function scheduleRefreshHomeAssets(state: State, force = false): void {
  if (homeAssetsRefreshTimer) clearTimeout(homeAssetsRefreshTimer);
  homeAssetsRefreshTimer = setTimeout(() => {
    homeAssetsRefreshTimer = null;
    void refreshHomeAssets(state, force);
  }, 300);
}

async function refreshHomeAssets(state: State, force = false): Promise<void> {
  const gen = ++homeAssetsRequestGen;
  el.homeAssetsError.hidden = true;
  el.homeAssetsError.textContent = "";

  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  if (!active || currentView !== "home-token") return;

  const hadRows = lastSuccessfulTokenRows.length > 0;
  if (!hadRows) {
    el.homeTokens.innerHTML = "";
    const loadingLi = document.createElement("li");
    loadingLi.className = "muted";
    loadingLi.textContent = "載入中…";
    el.homeTokens.append(loadingLi);
  }

  try {
    const res = await sendExtensionRequest("wallet.getHomeTokens", force ? { force: true } : {});
    if (gen !== homeAssetsRequestGen || currentView !== "home-token") return;
    if (!res.ok) {
      if (hadRows) {
        el.homeAssetsError.hidden = false;
        el.homeAssetsError.textContent = res.error?.message ?? "無法載入持倉";
        return;
      }
      el.homeTokens.innerHTML = "";
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent = res.error?.message ?? "無法載入持倉";
      return;
    }
    const payload = res.result as {
      rows?: HomeTokenRow[];
      error?: string;
      fromCache?: boolean;
    };
    const rows = payload.rows ?? [];
    lastSuccessfulTokenRows = rows;
    const active = state.accounts.find((a) => a.id === state.activeAccountId);
    renderTokenCards(rows, active != null && isCombinedAccount(active));
    if (payload.error) {
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent = payload.error;
    }
  } catch (e) {
    if (gen !== homeAssetsRequestGen || currentView !== "home-token") return;
    if (hadRows) {
      el.homeAssetsError.hidden = false;
      el.homeAssetsError.textContent =
        e instanceof Error ? e.message : "無法載入持倉";
      return;
    }
    el.homeTokens.innerHTML = "";
    el.homeAssetsError.hidden = false;
    el.homeAssetsError.textContent =
      e instanceof Error ? e.message : "無法載入持倉";
  }
}

function renderConnections(state: State): void {
  el.connectedList.innerHTML = "";
  for (const c of state.connections) {
    const li = document.createElement("li");
    li.className = "connected-row";
    const span = document.createElement("span");
    span.textContent = c.origin;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn";
    btn.title = "Disconnect";
    btn.setAttribute("aria-label", "Disconnect");
    btn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>';
    btn.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.disconnectOrigin", {
        origin: c.origin,
      });
      if (!res.ok) showError(res.error?.message ?? "斷開失敗");
      else await refresh();
    });
    li.append(span, btn);
    el.connectedList.append(li);
  }
}

function renderAccountsList(state: State): void {
  el.accountsList.innerHTML = "";
  for (const a of state.accounts) {
    const card = document.createElement("div");
    card.className = "account-card";
    if (a.id === state.activeAccountId) card.classList.add("active");

    const main = document.createElement("div");
    main.className = "account-card-main";
    main.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.setActiveAccount", { accountId: a.id });
      if (!res.ok) showError(res.error?.message ?? "切換失敗");
      else {
        await refresh();
        navigateTo("home-token");
      }
    });

    const titleRow = document.createElement("div");
    titleRow.className = "account-title-row";
    const nameSpan = document.createElement("span");
    nameSpan.className = "account-name";
    nameSpan.textContent = a.label;

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "icon-btn ghost-inline";
    renameBtn.title = "Rename account";
    renameBtn.setAttribute("aria-label", "Rename account");
    renameBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>';
    renameBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      navigateTo("account-rename", a.id);
      el.renameLabel.value = a.label;
      el.renameAddrHint.textContent = shortAddr(getExposedPublicKey(a));
    });

    titleRow.append(nameSpan, renameBtn);
    if (a.id === state.activeAccountId) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.style.borderColor = "var(--accent)";
      badge.style.color = "var(--accent)";
      badge.textContent = "Active";
      titleRow.append(badge);
    }
    if (isCombinedAccount(a)) {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Combined";
      titleRow.append(badge);
    }
    if (accountKind(a) === "readOnly") {
      const badge = document.createElement("span");
      badge.className = "badge";
      badge.textContent = "Read-only";
      titleRow.append(badge);
    }

    const addrRow = document.createElement("div");
    addrRow.className = "account-addr-row";
    const addr = document.createElement("span");
    addr.className = "addr";
    addr.textContent = shortAddr(getExposedPublicKey(a));
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-btn ghost-inline";
    copyBtn.title = "Copy address";
    copyBtn.setAttribute("aria-label", "Copy address");
    copyBtn.innerHTML =
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", (ev) => {
      ev.stopPropagation();
      void navigator.clipboard.writeText(getExposedPublicKey(a));
    });
    addrRow.append(addr, copyBtn);
    main.append(titleRow, addrRow);

    const kebab = document.createElement("button");
    kebab.type = "button";
    kebab.className = "icon-btn";
    kebab.title = "Manage account";
    kebab.setAttribute("aria-label", "Manage account");
    kebab.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>';
    kebab.addEventListener("click", () => {
      navigateTo("account-manage", a.id);
      renderManageScreen(state);
    });

    card.append(main, kebab);
    el.accountsList.append(card);
  }
}

function renderManageScreen(state: State): void {
  const acc = state.accounts.find((a) => a.id === focusAccountId);
  if (!acc) return;
  el.manageName.textContent = acc.label;
  const combined = isCombinedAccount(acc);
  const manageCombinedPanel = document.getElementById("manage-combined-panel")!;
  const manageCombinedBadge = document.getElementById("manage-combined-badge")!;
  manageCombinedPanel.hidden = !combined;
  manageCombinedBadge.hidden = !combined;
  if (combined) {
    el.manageAddr.textContent = `${acc.subPubkeys.length} 個成員地址`;
    el.manageReadonlyBadge.hidden = true;
    el.btnGoReveal.hidden = true;
    renderCombinedManageSubs(acc, state);
    return;
  }
  el.manageAddr.textContent = isSigningOrWatch(acc) ? acc.publicKeyBase58 : "";
  const ro = accountKind(acc) === "readOnly";
  el.manageReadonlyBadge.hidden = !ro;
  el.btnGoReveal.hidden = ro || !state.unlocked;
}

function renderCombinedManageSubs(
  acc: AccountMeta & { kind: "combined"; subPubkeys: string[]; mainPubkey: string },
  state: State,
): void {
  const mainEl = document.getElementById("manage-combined-main")!;
  const listEl = document.getElementById("manage-combined-subs")!;
  const pickList = document.getElementById("manage-combined-pick-list")!;
  mainEl.textContent = shortAddr(acc.mainPubkey);
  listEl.innerHTML = "";
  for (const pk of acc.subPubkeys) {
    const li = document.createElement("li");
    li.className = "combined-sub-row";
    const isMain = pk === acc.mainPubkey;
    li.textContent = `${shortAddr(pk)}${isMain ? " · 目前錢包" : ""}`;
    const actions = document.createElement("div");
    actions.className = "combined-sub-actions";
    if (!isMain) {
      const setMainBtn = document.createElement("button");
      setMainBtn.type = "button";
      setMainBtn.className = "link-btn";
      setMainBtn.textContent = "設為目前錢包";
      setMainBtn.addEventListener("click", async () => {
        clearError();
        const res = await sendExtensionRequest("wallet.setCombinedMain", {
          combinedId: acc.id,
          mainPubkey: pk,
        });
        if (!res.ok) showError(res.error?.message ?? "切換失敗");
        else await refresh();
      });
      actions.append(setMainBtn);
    }
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "icon-btn sm-inline ghost-inline";
    removeBtn.title = "刪除";
    removeBtn.setAttribute("aria-label", "刪除");
    removeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_TRASH}</svg>`;
    removeBtn.disabled = acc.subPubkeys.length <= 1;
    removeBtn.addEventListener("click", async () => {
      clearError();
      const res = await sendExtensionRequest("wallet.removeCombinedSub", {
        combinedId: acc.id,
        publicKeyBase58: pk,
      });
      if (!res.ok) showError(res.error?.message ?? "移除失敗");
      else await refresh();
    });
    actions.append(removeBtn);
    li.append(actions);
    listEl.append(li);
  }

  pickList.innerHTML = "";
  const inCombined = new Set(
    acc.subPubkeys.map((pk) => parsePublicKeyBase58(pk) ?? pk),
  );
  for (const a of state.accounts) {
    if (!isSigningOrWatch(a)) continue;
    const pk = parsePublicKeyBase58(a.publicKeyBase58) ?? a.publicKeyBase58;
    const already = inCombined.has(pk);
    const row = document.createElement("label");
    row.className = "combined-pick-row";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = already;
    cb.disabled = already && acc.subPubkeys.length <= 1;
    cb.addEventListener("change", async () => {
      cb.disabled = true;
      clearError();
      const res = cb.checked
        ? await sendExtensionRequest("wallet.addCombinedSub", {
            combinedId: acc.id,
            publicKeyBase58: a.publicKeyBase58,
          })
        : await sendExtensionRequest("wallet.removeCombinedSub", {
            combinedId: acc.id,
            publicKeyBase58: a.publicKeyBase58,
          });
      if (!res.ok) {
        cb.checked = already;
        cb.disabled = already && acc.subPubkeys.length <= 1;
        showError(res.error?.message ?? (cb.checked ? "加入失敗" : "移除失敗"));
        return;
      }
      await refresh();
    });
    const mid = document.createElement("span");
    mid.className = "pick-name";
    mid.textContent = a.label;
    const end = document.createElement("span");
    end.className = "pick-addr";
    end.textContent = shortAddr(a.publicKeyBase58);
    row.append(cb, mid, end);
    pickList.append(row);
  }
}

function addCombinedDraftParts(text: string): void {
  const parts = text.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    if (!combinedCreate.draftChips.includes(p)) combinedCreate.draftChips.push(p);
  }
  const draft = document.getElementById("combined-draft") as HTMLInputElement;
  draft.value = "";
  const err = document.getElementById("combined-err");
  if (err) err.textContent = "";
  if (lastState) renderCombinedCreateScreen(lastState);
}

function renderRevealScreen(state: State): void {
  const acc = state.accounts.find((a) => a.id === focusAccountId);
  if (!acc) {
    navigateTo("accounts");
    return;
  }
  if (accountKind(acc) !== "signing" || !state.unlocked) {
    navigateTo("account-manage");
    return;
  }
  el.revealHint.textContent = `${acc.label} · ${shortAddr(isSigningOrWatch(acc) ? acc.publicKeyBase58 : "")}`;
  if (!revealedSecretInMemory) {
    clearRevealSecret();
  }
}

function renderWidget(state: State): void {
  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  if (!active) {
    el.widgetLabel.textContent = "—";
    el.widgetAddr.textContent = "";
    el.widgetAvatar.textContent = "?";
    return;
  }
  el.widgetLabel.textContent = active.label;
  el.widgetAddr.textContent = shortAddr(getExposedPublicKey(active));
  el.widgetAvatar.textContent = avatarLetter(active.label);
  document.getElementById("btn-widget-accounts")?.setAttribute(
    "title",
    `${active.label} · ${getExposedPublicKey(active)}`,
  );
}

function render(state: State): void {
  lastState = state;
  const isLocked = state.vaultExists && !state.unlocked;

  el.setup.hidden = state.vaultExists;
  el.locked.hidden = !isLocked;
  el.shell.hidden = !state.vaultExists || isLocked;

  if (isLocked) {
    setMenuOpen(false);
    return;
  }

  if (!state.vaultExists) return;

  if (state.activeAccountId !== lastActiveAccountId) {
    lastActiveAccountId = state.activeAccountId;
    lastSuccessfulTokenRows = [];
    expandedTokenRowIds.clear();
  }

  renderWidget(state);
  applyViewChrome();

  renderSettingsPanel(state.settings);

  const settingsFp = settingsFingerprint(state.settings);
  const settingsChanged = settingsFp !== lastSettingsFingerprint;
  lastSettingsFingerprint = settingsFp;
  const rpcChanged = state.settings.rpcUrl !== lastSettingsRpc;
  lastSettingsRpc = state.settings.rpcUrl;

  renderConnections(state);
  renderAccountsList(state);

  if (currentView === "account-manage") renderManageScreen(state);
  if (currentView === "account-rename") {
    const acc = state.accounts.find((a) => a.id === focusAccountId);
    if (acc) {
      el.renameLabel.value = acc.label;
      el.renameAddrHint.textContent = shortAddr(getExposedPublicKey(acc));
    }
  }
  if (currentView === "account-reveal-key") renderRevealScreen(state);
  if (currentView === "add-combined") renderCombinedCreateScreen(state);

  if (currentView === "home-token" && state.activeAccountId) {
    scheduleRefreshHomeAssets(state);
  } else if ((rpcChanged || settingsChanged) && currentView === "home-token") {
    scheduleRefreshHomeAssets(state);
  }
}

async function refresh(): Promise<State> {
  const res = await sendExtensionRequest("wallet.getState");
  if (!res.ok) throw new Error(res.error?.message ?? "getState failed");
  const state = res.result as State;
  if (!state.connections) state.connections = [];
  render(state);
  return state;
}

async function addWatchAccount(publicKeyBase58: string, label?: string): Promise<void> {
  const res = await sendExtensionRequest("wallet.addReadOnlyAccount", {
    publicKeyBase58,
    label,
  });
  if (!res.ok) showError(res.error?.message ?? "新增失敗");
  else {
    await refresh();
    navigateTo("accounts");
  }
}

function handleBack(): void {
  if (currentView === "account-reveal-key") {
    navigateTo("account-manage");
    return;
  }
  if (currentView === "account-rename" || currentView === "account-manage" || currentView === "add-account") {
    navigateTo("accounts");
    return;
  }
  if (currentView === "add-generate") {
    if (generateSuccessPk) {
      generateSuccessPk = null;
      renderGenerateChrome();
      syncShellDock();
      return;
    }
    navigateTo("add-account");
    return;
  }
  if (currentView === "add-generate-seed") {
    navigateTo("add-account");
    return;
  }
  if (currentView === "add-import-seed") {
    if (importSeedStep === "pick") {
      importSeedPreviewGen++;
      importSeedBusy = false;
      importSeedStep = "words";
      importSeedPreview = [];
      importSeedSelected = null;
      importSeedPathPreview = "";
      renderImportSeedScreen();
      return;
    }
    navigateTo("add-import");
    return;
  }
  if (currentView === "add-import-secret") {
    navigateTo("add-import");
    return;
  }
  if (currentView === "add-import") {
    navigateTo("add-account");
    return;
  }
  if (currentView === "add-combined" || currentView === "add-watch") {
    navigateTo("add-account");
    return;
  }
  if (
    currentView === "settings-network" ||
    currentView === "settings-rpc" ||
    currentView === "settings-keys" ||
    currentView === "settings-password"
  ) {
    navigateTo("settings");
    return;
  }
  if (currentView === "settings" || currentView === "connected-sites") {
    navigateTo("home-token");
    return;
  }
  navigateTo("home-token");
}

async function handleDockPrimary(): Promise<void> {
  if (currentView === "add-generate") {
    if (generateSuccessPk) {
      generateSuccessPk = null;
      navigateTo("add-account");
      return;
    }
    clearError();
    const label = (document.getElementById("generate-label") as HTMLInputElement).value.trim();
    const res = await sendExtensionRequest("wallet.generateAccount", {
      label: label || undefined,
    });
    if (!res.ok) {
      const errEl = document.getElementById("generate-err");
      if (errEl) errEl.textContent = res.error?.message ?? "失敗";
      return;
    }
    const { account } = res.result as { account: AccountMeta };
    const pk = isSigningOrWatch(account) ? account.publicKeyBase58 : getExposedPublicKey(account);
    generateSuccessPk = pk;
    renderGenerateChrome();
    syncShellDock();
    await refresh();
    return;
  }

  if (currentView === "add-generate-seed") {
    if (!generateSeedWords) return;
    clearError();
    generateSeedBusy = true;
    syncShellDock();
    const label = (document.getElementById("generate-seed-label") as HTMLInputElement).value.trim();
    const fallbackLabel = lastState ? `Account ${lastState.accounts.length + 1}` : undefined;
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: generateSeedWords.join(" "),
      pathKind: "phantom",
      index: 0,
      label: label || fallbackLabel,
    });
    generateSeedBusy = false;
    if (!res.ok) {
      const errEl = document.getElementById("generate-seed-err");
      if (errEl) errEl.textContent = res.error?.message ?? "失敗";
      syncShellDock();
      return;
    }
    await refresh();
    navigateTo("add-account");
    return;
  }

  if (currentView === "add-import-secret") {
    clearError();
    const raw = (document.getElementById("import-secret") as HTMLTextAreaElement).value;
    const d = detectSecret(raw);
    if (!d.ok) {
      const errEl = document.getElementById("import-secret-err");
      if (errEl) errEl.textContent = "無法辨識";
      return;
    }
    const label = (document.getElementById("import-label") as HTMLInputElement).value.trim();
    const res = await sendExtensionRequest("wallet.importAccount", {
      secret: raw.trim(),
      label: label || undefined,
    });
    if (!res.ok) {
      const errEl = document.getElementById("import-secret-err");
      if (errEl) errEl.textContent = res.error?.message ?? "匯入失敗";
      return;
    }
    (document.getElementById("import-secret") as HTMLTextAreaElement).value = "";
    (document.getElementById("import-label") as HTMLInputElement).value = "";
    syncImportSecretFmt();
    await refresh();
    navigateTo("accounts");
    return;
  }

  if (currentView === "add-import-seed") {
    clearError();
    if (importSeedStep === "words") {
      const outcome = await requestSeedPreview();
      if (outcome !== "ok") return;
      importSeedSelected = null;
      importSeedStep = "pick";
      renderImportSeedScreen();
      return;
    }
    if (importSeedSelected == null) return;
    importSeedBusy = true;
    syncShellDock();
    const res = await sendExtensionRequest("wallet.importSeedAccount", {
      mnemonic: mnemonicFromSlots(),
      pathKind: importSeedKind,
      customPath: importSeedKind === "custom" ? importSeedCustomPath : undefined,
      index: importSeedSelected,
    });
    importSeedBusy = false;
    if (!res.ok) {
      const err = document.getElementById("import-seed-err");
      if (err) err.textContent = res.error?.message ?? "匯入失敗";
      syncShellDock();
      return;
    }
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
    await refresh();
    navigateTo("accounts");
    return;
  }

  if (currentView === "add-watch") {
    clearError();
    const publicKeyBase58 = (document.getElementById("watch-pk") as HTMLInputElement).value.trim();
    const label = (document.getElementById("watch-label") as HTMLInputElement).value.trim();
    if (!parsePublicKeyBase58(publicKeyBase58)) {
      const errEl = document.getElementById("watch-err");
      if (errEl) errEl.textContent = "地址無效";
      syncShellDock();
      return;
    }
    await addWatchAccount(publicKeyBase58, label || undefined);
    return;
  }

  if (currentView === "add-combined") {
    clearError();
    const label = (document.getElementById("combined-label") as HTMLInputElement).value.trim();
    const subPubkeys = validCombinedMembers();
    if (subPubkeys.length === 0) {
      const errEl = document.getElementById("combined-err");
      if (errEl) errEl.textContent = "至少一個有效地址";
      syncShellDock();
      return;
    }
    const res = await sendExtensionRequest("wallet.createCombinedAccount", {
      label: label || undefined,
      subPubkeys,
      mainPubkey: combinedCreate.currentMain || subPubkeys[0],
    });
    if (!res.ok) {
      const errEl = document.getElementById("combined-err");
      if (errEl) errEl.textContent = res.error?.message ?? "建立失敗";
      return;
    }
    resetCombinedCreate();
    await refresh();
    navigateTo("accounts");
    return;
  }

  if (currentView === "settings-password") {
    await submitChangePassword();
  }
}

async function submitChangePassword(): Promise<void> {
  clearError();
  el.changePwdErr.textContent = "";
  const currentPassword = el.changePwdCurrent.value;
  const newPassword = el.changePwdNew.value;
  const confirm = el.changePwdConfirm.value;
  if (newPassword.length < 8) {
    clearChangePasswordFieldValues();
    el.changePwdErr.textContent = "新密碼過短";
    syncShellDock();
    return;
  }
  if (newPassword !== confirm) {
    clearChangePasswordFieldValues();
    el.changePwdErr.textContent = "新密碼不一致";
    syncShellDock();
    return;
  }
  const res = await sendExtensionRequest("wallet.changeVaultPassword", {
    currentPassword,
    newPassword,
  });
  clearChangePasswordFieldValues();
  syncShellDock();
  if (!res.ok) {
    const code = res.error?.code;
    if (code === "INVALID_PASSWORD") el.changePwdErr.textContent = "密碼錯誤";
    else if (code === "WEAK_PASSWORD") el.changePwdErr.textContent = "新密碼過短";
    else showError(res.error?.message ?? "變更失敗");
    return;
  }
  await refresh();
  navigateTo("settings");
}

function hardenApiKeyInput(inp: HTMLInputElement): void {
  inp.type = "text";
  inp.autocomplete = "off";
  inp.setAttribute("autocapitalize", "off");
  inp.setAttribute("autocorrect", "off");
  inp.setAttribute("spellcheck", "false");
  inp.setAttribute("aria-autocomplete", "none");
  inp.setAttribute("data-lpignore", "true");
  inp.setAttribute("data-1p-ignore", "");
  inp.setAttribute("data-form-type", "other");
}

document.getElementById("btn-create")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("setup-password") as HTMLInputElement).value;
  const password2 = (document.getElementById("setup-password-2") as HTMLInputElement).value;
  if (!password || password.length < 8) {
    showError("密碼至少 8 字");
    return;
  }
  if (password !== password2) {
    showError("密碼不一致");
    return;
  }
  const res = await sendExtensionRequest("wallet.createVault", { password, empty: true });
  if (!res.ok) showError(res.error?.message ?? "建立失敗");
  else {
    await refresh();
    navigateTo("add-account");
  }
});

document.getElementById("btn-unlock")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("unlock-password") as HTMLInputElement).value;
  const res = await sendExtensionRequest("wallet.unlock", { password });
  if (!res.ok) showError(res.error?.message ?? "解鎖失敗");
  else await refresh();
});

document.getElementById("btn-lock-home")!.addEventListener("click", async () => {
  await sendExtensionRequest("wallet.lock");
  await refresh();
});

document.getElementById("btn-menu")!.addEventListener("click", () => {
  setMenuOpen(!menuOpen);
});

document.querySelectorAll(".btn-menu-sub").forEach((btn) => {
  btn.addEventListener("click", () => setMenuOpen(!menuOpen));
});

el.menuOverlay.addEventListener("click", () => setMenuOpen(false));

document.querySelectorAll(".menu-item").forEach((item) => {
  item.addEventListener("click", () => {
    const nav = (item as HTMLElement).dataset.nav as View;
    if (nav === "accounts" || nav === "settings" || nav === "connected-sites") {
      navigateTo(nav);
    }
  });
});

document.querySelectorAll("[data-settings-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.settingsNav as View;
    if (target) navigateTo(target);
  });
});

document.getElementById("btn-widget-accounts")!.addEventListener("click", () => {
  navigateTo("accounts");
});

document.getElementById("btn-widget-copy")!.addEventListener("click", () => {
  const active = lastState?.accounts.find((a) => a.id === lastState?.activeAccountId);
  if (active) void navigator.clipboard.writeText(getExposedPublicKey(active));
});

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const tab = (btn as HTMLElement).dataset.homeTab as View;
    if (tab) navigateTo(tab);
  });
});

document.getElementById("btn-back")!.addEventListener("click", () => handleBack());

document.getElementById("btn-go-add-account")!.addEventListener("click", () => {
  navigateTo("add-account");
});

document.querySelectorAll("[data-nav-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = (btn as HTMLElement).dataset.navAdd as View;
    if (target) navigateTo(target);
  });
});

elDockPrimary.addEventListener("click", () => {
  void handleDockPrimary();
});

const btnCopySeedWords = document.getElementById("btn-copy-seed-words")!;
const btnCopySeedPk = document.getElementById("btn-copy-seed-pk")!;
btnCopySeedWords.innerHTML = SVG_COPY;
btnCopySeedPk.innerHTML = SVG_COPY;
btnCopySeedWords.addEventListener("click", () => {
  if (generateSeedWords) void navigator.clipboard.writeText(generateSeedWords.join(" "));
});
btnCopySeedPk.addEventListener("click", () => {
  if (generateSeedPk) void navigator.clipboard.writeText(generateSeedPk);
});

const btnCombinedAddChip = document.getElementById("btn-combined-add-chip")!;
btnCombinedAddChip.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_PLUS}</svg>`;
btnCombinedAddChip.addEventListener("click", () => {
  const draft = document.getElementById("combined-draft") as HTMLInputElement;
  addCombinedDraftParts(draft.value);
});

const combinedDraftInput = document.getElementById("combined-draft") as HTMLInputElement;
combinedDraftInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addCombinedDraftParts(combinedDraftInput.value);
  }
});
combinedDraftInput.addEventListener("paste", (e) => {
  const text = e.clipboardData?.getData("text") ?? "";
  if (/[\n,]/.test(text)) {
    e.preventDefault();
    addCombinedDraftParts(text);
  }
});

const importSecretInput = document.getElementById("import-secret") as HTMLTextAreaElement;
importSecretInput.addEventListener("input", () => {
  syncImportSecretFmt();
  const errEl = document.getElementById("import-secret-err");
  if (errEl) errEl.textContent = "";
  syncShellDock();
});

const watchPkInput = document.getElementById("watch-pk") as HTMLInputElement;
watchPkInput.addEventListener("input", () => {
  const errEl = document.getElementById("watch-err");
  if (errEl) errEl.textContent = "";
  syncShellDock();
});

async function submitManageCombinedPaste(): Promise<void> {
  clearError();
  if (!focusAccountId) return;
  const input = document.getElementById("manage-add-sub-pk") as HTMLInputElement;
  const publicKeyBase58 = input.value.trim();
  if (!publicKeyBase58) return;
  const res = await sendExtensionRequest("wallet.addCombinedSub", {
    combinedId: focusAccountId,
    publicKeyBase58,
  });
  if (!res.ok) showError(res.error?.message ?? "加入失敗");
  else {
    input.value = "";
    await refresh();
  }
}

const btnCombinedAddSub = document.getElementById("btn-combined-add-sub")!;
btnCombinedAddSub.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_PLUS}</svg>`;
btnCombinedAddSub.addEventListener("click", () => {
  void submitManageCombinedPaste();
});
const manageAddSubPk = document.getElementById("manage-add-sub-pk") as HTMLInputElement;
manageAddSubPk.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    void submitManageCombinedPaste();
  }
});

document.getElementById("btn-rename")!.addEventListener("click", async () => {
  clearError();
  if (!focusAccountId) return;
  const label = el.renameLabel.value;
  const res = await sendExtensionRequest("wallet.renameAccount", { accountId: focusAccountId, label });
  if (!res.ok) showError(res.error?.message ?? "重新命名失敗");
  else {
    await refresh();
    navigateTo("accounts");
  }
});

document.getElementById("btn-delete")!.addEventListener("click", async () => {
  clearError();
  if (!focusAccountId) return;
  if (!confirm("確定移除此錢包帳戶？")) return;
  const res = await sendExtensionRequest("wallet.deleteAccount", { accountId: focusAccountId });
  if (!res.ok) showError(res.error?.message ?? "刪除失敗");
  else {
    focusAccountId = null;
    await refresh();
    navigateTo("accounts");
  }
});

el.btnGoReveal.addEventListener("click", () => {
  navigateTo("account-reveal-key");
});

document.getElementById("btn-reveal-submit")!.addEventListener("click", async () => {
  clearError();
  if (!focusAccountId) return;
  const password = el.revealPassword.value;
  const res = await sendExtensionRequest("wallet.exportAccountSecret", {
    accountId: focusAccountId,
    password,
  });
  if (!res.ok) {
    showError(res.error?.message ?? "無法匯出");
    return;
  }
  const { secretBase58 } = res.result as { secretBase58: string };
  revealedSecretInMemory = secretBase58;
  el.revealSecretText.textContent = secretBase58;
  el.revealMaskBlock.hidden = true;
  el.revealSecretBlock.hidden = false;
  el.revealPassword.value = "";
});

document.getElementById("btn-copy-secret")!.addEventListener("click", async () => {
  if (revealedSecretInMemory) {
    await navigator.clipboard.writeText(revealedSecretInMemory);
  }
});

document.querySelectorAll<HTMLInputElement>('input[name="settings-cluster"]').forEach((radio) => {
  radio.addEventListener("change", () => {
    if (!radio.checked || !lastState) return;
    const cluster = radio.value as Cluster;
    if (cluster === lastState.settings.cluster) return;
    void patchSettingsPartial({ cluster });
  });
});

const SVG_EYE =
  '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>';

document.querySelectorAll(".btn-rpc-add").forEach((btn) => {
  btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_PLUS}</svg>`;
  btn.addEventListener("click", () => {
    const cluster = (btn as HTMLElement).dataset.rpcCluster as Cluster;
    if (!lastState || !cluster) return;
    rpcEditKey = `${cluster}:new`;
    renderRpcByCluster(lastState.settings, cluster);
  });
});

async function persistHeliusField(): Promise<void> {
  if (!lastState) return;
  if (!keysHeliusRevealed && lastState.settings.heliusApiUrl) return;
  let heliusApiUrl = el.heliusApiUrl.value.trim();
  if (heliusApiUrl === MASKED_SECRET_DISPLAY) heliusApiUrl = lastState.settings.heliusApiUrl;
  if (heliusApiUrl === lastState.settings.heliusApiUrl) return;
  keysHeliusRevealed = false;
  await patchSettingsPartial({ heliusApiUrl });
}

async function persistJupiterField(): Promise<void> {
  if (!lastState) return;
  if (!keysJupiterRevealed && lastState.settings.jupiterApiKey) return;
  let jupiterApiKey = el.jupiterApiKey.value.trim();
  if (jupiterApiKey === MASKED_SECRET_DISPLAY) jupiterApiKey = lastState.settings.jupiterApiKey;
  if (jupiterApiKey === lastState.settings.jupiterApiKey) return;
  keysJupiterRevealed = false;
  await patchSettingsPartial({ jupiterApiKey });
}

const btnHeliusReveal = document.getElementById("btn-helius-reveal")!;
const btnHeliusConfirm = document.getElementById("btn-helius-confirm")!;
const btnJupiterReveal = document.getElementById("btn-jupiter-reveal")!;
const btnJupiterConfirm = document.getElementById("btn-jupiter-confirm")!;
btnHeliusReveal.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_EYE}</svg>`;
btnJupiterReveal.innerHTML = btnHeliusReveal.innerHTML;
btnHeliusConfirm.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${SVG_CHECK}</svg>`;
btnJupiterConfirm.innerHTML = btnHeliusConfirm.innerHTML;

btnHeliusReveal.addEventListener("click", () => {
  if (!lastState) return;
  keysHeliusRevealed = !keysHeliusRevealed;
  renderSettingsKeysFields(lastState.settings);
  if (keysHeliusRevealed) {
    el.heliusApiUrl.readOnly = false;
    el.heliusApiUrl.focus();
  }
});
btnJupiterReveal.addEventListener("click", () => {
  if (!lastState) return;
  keysJupiterRevealed = !keysJupiterRevealed;
  renderSettingsKeysFields(lastState.settings);
  if (keysJupiterRevealed) {
    el.jupiterApiKey.readOnly = false;
    el.jupiterApiKey.focus();
  }
});
btnHeliusConfirm.addEventListener("click", () => void persistHeliusField());
btnJupiterConfirm.addEventListener("click", () => void persistJupiterField());
el.heliusApiUrl.addEventListener("blur", () => void persistHeliusField());
el.jupiterApiKey.addEventListener("blur", () => void persistJupiterField());
el.heliusApiUrl.addEventListener("input", () => {
  if (el.heliusApiUrl.value === "") void persistHeliusField();
});
el.jupiterApiKey.addEventListener("input", () => {
  if (el.jupiterApiKey.value === "") void persistJupiterField();
});

for (const inp of [el.changePwdCurrent, el.changePwdNew, el.changePwdConfirm]) {
  inp.addEventListener("input", () => {
    el.changePwdErr.textContent = "";
    syncShellDock();
  });
}

document.getElementById("btn-refresh-assets")!.addEventListener("click", async () => {
  const state = await refresh();
  if (currentView === "home-token") await refreshHomeAssets(state, true);
});

document.getElementById("btn-disconnect-all")!.addEventListener("click", async () => {
  clearError();
  const res = await sendExtensionRequest("wallet.disconnectAllOrigins");
  if (!res.ok) showError(res.error?.message ?? "斷開失敗");
  else await refresh();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    changes["airwave.accounts.v1"] ||
    changes["airwave.activeAccountId.v1"] ||
    changes["airwave.settings.v1"] ||
    changes["airwave.connections.v1"]
  ) {
    void refresh();
  }
});

window.addEventListener("pagehide", () => {
  clearRevealSecret();
  clearChangePasswordFields();
  if (currentView === "add-import-seed") {
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
  }
});

for (const id of [
  "setup-password",
  "setup-password-2",
  "unlock-password",
  "reveal-password",
  "change-pwd-current",
  "change-pwd-new",
  "change-pwd-confirm",
]) {
  const node = document.getElementById(id);
  if (node instanceof HTMLInputElement) hardenWalletPasswordInput(node);
}
hardenApiKeyInput(el.heliusApiUrl);
hardenApiKeyInput(el.jupiterApiKey);

el.error.addEventListener("click", () => {
  clearError();
});

void refresh().catch((e) => showError(String(e)));
