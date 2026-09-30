import { Connection, PublicKey } from "@solana/web3.js";
import { sendExtensionRequest } from "../shared/ext-api";
import { accountKind, type AccountMeta, type Settings } from "../shared/storage-keys";
import { DEFAULT_SETTINGS } from "../shared/storage-keys";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);

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

const el = {
  setup: document.getElementById("setup")!,
  locked: document.getElementById("locked")!,
  createVaultBanner: document.getElementById("create-vault-banner")!,
  home: document.getElementById("home")!,
  accountsPanel: document.getElementById("accounts-panel")!,
  connectedPanel: document.getElementById("connected-panel")!,
  settingsPanel: document.getElementById("settings-panel")!,
  error: document.getElementById("error")!,
  accountSelect: document.getElementById("account-select") as HTMLSelectElement,
  clusterSelect: document.getElementById("cluster-select") as HTMLSelectElement,
  rpcUrl: document.getElementById("rpc-url") as HTMLInputElement,
  homeActiveLabel: document.getElementById("home-active-label")!,
  homeSol: document.getElementById("home-sol")!,
  homeTokens: document.getElementById("home-tokens")!,
  homeAssetsError: document.getElementById("home-assets-error")!,
  connectedList: document.getElementById("connected-list")!,
  renameLabel: document.getElementById("rename-label") as HTMLInputElement,
};

function showError(msg: string): void {
  el.error.hidden = false;
  el.error.textContent = msg;
}

function clearError(): void {
  el.error.hidden = true;
  el.error.textContent = "";
}

function shortMint(mint: string): string {
  return `${mint.slice(0, 4)}…${mint.slice(-4)}`;
}

async function refreshHomeAssets(state: State): Promise<void> {
  const active = state.accounts.find((a) => a.id === state.activeAccountId);
  el.homeAssetsError.hidden = true;
  el.homeAssetsError.textContent = "";
  el.homeTokens.innerHTML = "";

  if (!active) {
    el.homeActiveLabel.textContent = "無 active 帳戶";
    el.homeSol.textContent = "—";
    return;
  }

  const kindTag = accountKind(active) === "readOnly" ? "（觀察）" : "";
  el.homeActiveLabel.textContent = `${active.label}${kindTag} · ${active.publicKeyBase58.slice(0, 8)}…`;
  el.homeSol.textContent = "載入中…";

  try {
    const conn = new Connection(state.settings.rpcUrl, "confirmed");
    const pk = new PublicKey(active.publicKeyBase58);
    const lamports = await conn.getBalance(pk);
    el.homeSol.textContent = `SOL：${(lamports / 1e9).toLocaleString(undefined, { maximumFractionDigits: 9 })}`;

    const tokenAccounts = await conn.getParsedTokenAccountsByOwner(pk, {
      programId: TOKEN_PROGRAM_ID,
    });

    if (tokenAccounts.value.length === 0) {
      const li = document.createElement("li");
      li.textContent = "（無 legacy SPL token 帳戶）";
      el.homeTokens.append(li);
    } else {
      for (const { account } of tokenAccounts.value) {
        const parsed = account.data.parsed;
        if (parsed?.type !== "account") continue;
        const info = parsed.info;
        const mint = info.mint as string;
        const tokenAmount = info.tokenAmount as {
          uiAmount: number | null;
          amount: string;
          decimals: number;
        };
        const li = document.createElement("li");
        const display =
          tokenAmount.uiAmount != null
            ? String(tokenAmount.uiAmount)
            : `${tokenAmount.amount} (${tokenAmount.decimals} dec)`;
        li.textContent = `${shortMint(mint)}：${display}`;
        el.homeTokens.append(li);
      }
    }
  } catch (e) {
    el.homeSol.textContent = "—";
    el.homeAssetsError.hidden = false;
    el.homeAssetsError.textContent =
      e instanceof Error ? e.message : "無法讀取 RPC";
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
    btn.textContent = "斷開";
    btn.dataset.origin = c.origin;
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

function render(state: State): void {
  const hasAccounts = state.accounts.length > 0;
  const showMain = hasAccounts || state.vaultExists;

  el.setup.hidden = state.vaultExists || hasAccounts;
  el.createVaultBanner.hidden = state.vaultExists || !hasAccounts;
  el.locked.hidden = !state.vaultExists || state.unlocked;
  el.settingsPanel.hidden = !hasAccounts && !state.vaultExists;
  (document.getElementById("btn-lock") as HTMLButtonElement).hidden = !state.vaultExists;
  el.home.hidden = !hasAccounts || !state.activeAccountId;
  el.accountsPanel.hidden = !hasAccounts;
  el.connectedPanel.hidden = !showMain;

  if (hasAccounts) {
    el.accountSelect.innerHTML = "";
    for (const a of state.accounts) {
      const opt = document.createElement("option");
      opt.value = a.id;
      const ro = accountKind(a) === "readOnly" ? " [觀察]" : "";
      opt.textContent = `${a.label}${ro} (${a.publicKeyBase58.slice(0, 6)}…)`;
      if (a.id === state.activeAccountId) opt.selected = true;
      el.accountSelect.append(opt);
    }
    const active = state.accounts.find((a) => a.id === state.activeAccountId);
    if (active) el.renameLabel.value = active.label;
  }

  if (state.vaultExists) {
    el.clusterSelect.value = state.settings.cluster;
    el.rpcUrl.value = state.settings.rpcUrl;
  }

  renderConnections(state);
  void refreshHomeAssets(state);
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
  else await refresh();
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

document.getElementById("btn-add-watch-setup")!.addEventListener("click", async () => {
  clearError();
  const publicKeyBase58 = (document.getElementById("setup-watch-pk") as HTMLInputElement).value;
  const label = (document.getElementById("setup-watch-label") as HTMLInputElement).value;
  await addWatchAccount(publicKeyBase58, label);
});

document.getElementById("btn-create-late")!.addEventListener("click", async () => {
  clearError();
  const password = (document.getElementById("late-setup-password") as HTMLInputElement).value;
  const label = (document.getElementById("late-setup-label") as HTMLInputElement).value;
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

document.getElementById("btn-rename")!.addEventListener("click", async () => {
  clearError();
  const accountId = el.accountSelect.value;
  const label = el.renameLabel.value;
  const res = await sendExtensionRequest("wallet.renameAccount", { accountId, label });
  if (!res.ok) showError(res.error?.message ?? "重新命名失敗");
  else await refresh();
});

document.getElementById("btn-delete")!.addEventListener("click", async () => {
  clearError();
  const accountId = el.accountSelect.value;
  if (!confirm("確定刪除此帳戶？")) return;
  const res = await sendExtensionRequest("wallet.deleteAccount", { accountId });
  if (!res.ok) showError(res.error?.message ?? "刪除失敗");
  else await refresh();
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

document.getElementById("btn-add-watch")!.addEventListener("click", async () => {
  clearError();
  const publicKeyBase58 = (document.getElementById("watch-pk") as HTMLInputElement).value;
  const label = (document.getElementById("watch-label") as HTMLInputElement).value;
  await addWatchAccount(publicKeyBase58, label);
});

document.getElementById("btn-save-settings")!.addEventListener("click", async () => {
  clearError();
  const cluster = el.clusterSelect.value as Settings["cluster"];
  const rpcUrl = el.rpcUrl.value.trim();
  const res = await sendExtensionRequest("storage.patchSettings", { cluster, rpcUrl });
  if (!res.ok) showError(res.error?.message ?? "儲存失敗");
  else await refresh();
});

document.getElementById("btn-refresh-assets")!.addEventListener("click", async () => {
  const state = await refresh();
  await refreshHomeAssets(state);
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

void refresh().catch((e) => showError(String(e)));

el.clusterSelect.addEventListener("change", () => {
  if (el.clusterSelect.value === "mainnet") {
    el.rpcUrl.value = "https://api.mainnet-beta.solana.com";
  } else {
    el.rpcUrl.value = DEFAULT_SETTINGS.rpcUrl;
  }
});
