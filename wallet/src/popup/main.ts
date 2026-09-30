import { sendExtensionRequest } from "../shared/ext-api";
import type { AccountMeta, Settings } from "../shared/storage-keys";
import { DEFAULT_SETTINGS } from "../shared/storage-keys";

type State = {
  vaultExists: boolean;
  unlocked: boolean;
  accounts: AccountMeta[];
  activeAccountId: string | null;
  settings: Settings;
};

const el = {
  setup: document.getElementById("setup")!,
  locked: document.getElementById("locked")!,
  unlocked: document.getElementById("unlocked")!,
  error: document.getElementById("error")!,
  statusLine: document.getElementById("status-line")!,
  accountSelect: document.getElementById("account-select") as HTMLSelectElement,
  clusterSelect: document.getElementById("cluster-select") as HTMLSelectElement,
  rpcUrl: document.getElementById("rpc-url") as HTMLInputElement,
};

function showError(msg: string): void {
  el.error.hidden = false;
  el.error.textContent = msg;
}

function clearError(): void {
  el.error.hidden = true;
  el.error.textContent = "";
}

function render(state: State): void {
  el.setup.hidden = state.vaultExists;
  el.locked.hidden = !state.vaultExists || state.unlocked;
  el.unlocked.hidden = !state.vaultExists || !state.unlocked;

  if (state.unlocked) {
    const active = state.accounts.find((a) => a.id === state.activeAccountId);
    el.statusLine.textContent = active
      ? `${active.label} · ${active.publicKeyBase58.slice(0, 8)}…`
      : "無 active 帳戶";
    el.accountSelect.innerHTML = "";
    for (const a of state.accounts) {
      const opt = document.createElement("option");
      opt.value = a.id;
      opt.textContent = `${a.label} (${a.publicKeyBase58.slice(0, 6)}…)`;
      if (a.id === state.activeAccountId) opt.selected = true;
      el.accountSelect.append(opt);
    }
    el.clusterSelect.value = state.settings.cluster;
    el.rpcUrl.value = state.settings.rpcUrl;
  }
}

async function refresh(): Promise<State> {
  const res = await sendExtensionRequest("wallet.getState");
  if (!res.ok) throw new Error(res.error?.message ?? "getState failed");
  const state = res.result as State;
  render(state);
  return state;
}

document.getElementById("btn-create")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("setup-password") as HTMLInputElement).value;
  const label = (document.getElementById("setup-label") as HTMLInputElement).value;
  if (!password || password.length < 8) {
    showError("密碼至少 8 字");
    return;
  }
  const res = await sendExtensionRequest("wallet.createVault", { password, label });
  if (!res.ok) showError(res.error?.message ?? "建立失敗");
  else await refresh();
});

document.getElementById("btn-unlock")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("unlock-password") as HTMLInputElement).value;
  const res = await sendExtensionRequest("wallet.unlock", { password });
  if (!res.ok) showError(res.error?.message ?? "解鎖失敗");
  else await refresh();
});

document.getElementById("btn-lock")!.addEventListener("click", async () => {
  await sendExtensionRequest("wallet.lock");
  await refresh();
});

el.accountSelect.addEventListener("change", async () => {
  await sendExtensionRequest("wallet.setActiveAccount", {
    accountId: el.accountSelect.value,
  });
  await refresh();
});

document.getElementById("btn-generate")!.addEventListener("click", async () => {
  clearError();
  const res = await sendExtensionRequest("wallet.generateAccount", {});
  if (!res.ok) showError(res.error?.message ?? "失敗");
  else await refresh();
});

document.getElementById("btn-import")!.addEventListener("click", async () => {
  clearError();
  const secretBase58 = (document.getElementById("import-secret") as HTMLInputElement).value;
  const res = await sendExtensionRequest("wallet.importAccount", { secretBase58 });
  if (!res.ok) showError(res.error?.message ?? "匯入失敗");
  else await refresh();
});

document.getElementById("btn-save-settings")!.addEventListener("click", async () => {
  clearError();
  const cluster = el.clusterSelect.value as Settings["cluster"];
  const rpcUrl = el.rpcUrl.value.trim();
  const res = await sendExtensionRequest("storage.patchSettings", { cluster, rpcUrl });
  if (!res.ok) showError(res.error?.message ?? "儲存失敗");
  else await refresh();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (
    changes["airwave.accounts.v1"] ||
    changes["airwave.activeAccountId.v1"] ||
    changes["airwave.settings.v1"]
  ) {
    void refresh();
  }
});

void refresh().catch((e) => showError(String(e)));

// default RPC hint when switching cluster in UI only
el.clusterSelect.addEventListener("change", () => {
  if (el.clusterSelect.value === "mainnet") {
    el.rpcUrl.value = "https://api.mainnet-beta.solana.com";
  } else {
    el.rpcUrl.value = DEFAULT_SETTINGS.rpcUrl;
  }
});
