/**
 * Wallet shell: toolbar popup vs side panel, and last normal browser window id for sidePanel.open.
 * Does not open approval popouts or chrome.windows.create wallet shells.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import { SHELL_LAST_NORMAL_WINDOW_MSG, WALLET_PAGE_PATH } from "../../shared/shell-constants";
import { SIDEPANEL_PAGE_PATH } from "../../shared/shell-constants";
import type { ShellMode } from "../../shared/storage-keys";
import { findSidebarDappApprovalRequestId, rejectOrdinaryDappPending } from "../pending";
import { respond } from "../messaging";
import { normalizeSettings, readSettings, writeSettings } from "../storage";

let lastNormalWindowId: number | undefined;

function broadcastLastNormalWindowId(): void {
  const payload = { windowId: lastNormalWindowId ?? null };
  void chrome.runtime
    .sendMessage({ kind: SHELL_LAST_NORMAL_WINDOW_MSG, ...payload })
    .catch(() => {});
}

async function pickInitialNormalWindowId(): Promise<void> {
  const wins = await chrome.windows.getAll({ windowTypes: ["normal"] });
  const focused = wins.find((w) => w.focused && w.id != null);
  if (focused?.id != null) {
    lastNormalWindowId = focused.id;
    return;
  }
  const any = wins.find((w) => w.id != null);
  lastNormalWindowId = any?.id;
}

/** 若記憶體 id 已失效（視窗關了），重選仍存在的 normal 視窗並推送殼。 */
export async function ensureLastNormalWindowId(): Promise<void> {
  if (lastNormalWindowId != null) {
    try {
      const w = await chrome.windows.get(lastNormalWindowId);
      if (w.type === "normal") return;
    } catch {
      /* stale */
    }
  }
  await pickInitialNormalWindowId();
  broadcastLastNormalWindowId();
}

export async function applyToolbarForShell(shell: ShellMode): Promise<void> {
  if (shell === "sidebar") {
    await chrome.action.setPopup({ popup: "" });
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } else {
    await chrome.action.setPopup({ popup: WALLET_PAGE_PATH });
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false });
  }
}

export async function initWalletShellOnStartup(): Promise<void> {
  await pickInitialNormalWindowId();
  broadcastLastNormalWindowId();
  const settings = await readSettings();
  await applyToolbarForShell(settings.shell);
}

export async function onWalletShellFocusChanged(windowId: number): Promise<void> {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  try {
    const win = await chrome.windows.get(windowId);
    if (win.type === "normal" && win.id != null) {
      lastNormalWindowId = win.id;
      broadcastLastNormalWindowId();
    }
  } catch {
    /* gone */
  }
}

export async function onWalletShellWindowRemoved(windowId: number): Promise<void> {
  if (lastNormalWindowId === windowId) {
    await pickInitialNormalWindowId();
    broadcastLastNormalWindowId();
  }
}

export async function handleShellGetSidebarDappApproval(
  req: ExtensionRequest,
): Promise<ExtensionResponse> {
  const requestId = findSidebarDappApprovalRequestId();
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { requestId },
  });
}

export async function handleShellGetLastNormalWindowId(
  req: ExtensionRequest,
): Promise<ExtensionResponse> {
  await ensureLastNormalWindowId();
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { windowId: lastNormalWindowId ?? null },
  });
}

async function closeSidePanelForBrowserWindow(browserWindowId: number): Promise<void> {
  const opts = { windowId: browserWindowId };
  await chrome.sidePanel.setOptions({ ...opts, enabled: false });
  await chrome.sidePanel.setOptions({
    ...opts,
    enabled: true,
    path: SIDEPANEL_PAGE_PATH,
  });
}

async function closeSidePanelGlobal(): Promise<void> {
  await chrome.sidePanel.setOptions({ enabled: false });
  await chrome.sidePanel.setOptions({ enabled: true, path: SIDEPANEL_PAGE_PATH });
}

/**
 * 側欄 → 工具列 popup：在 SW 關側欄並寫入 shell（側欄頁卸載後仍能完成）。
 */
export async function handleShellSwitchToWindow(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { browserWindowId } = (req.payload ?? {}) as { browserWindowId?: number };
  if (typeof browserWindowId !== "number") {
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: false,
      error: { code: "INVALID_PAYLOAD", message: "Missing browserWindowId" },
    });
  }
  const sidebarDappId = findSidebarDappApprovalRequestId();
  if (sidebarDappId) {
    await rejectOrdinaryDappPending(sidebarDappId, "Wallet shell switched");
  }

  try {
    await closeSidePanelForBrowserWindow(browserWindowId);
  } catch {
    try {
      await closeSidePanelGlobal();
    } catch {
      return respond({
        kind: "airwave-ext-res",
        requestId: req.requestId,
        ok: false,
        error: { code: "SIDE_PANEL_CLOSE_FAILED", message: "Could not close side panel" },
      });
    }
  }
  const settings = await readSettings();
  const next = normalizeSettings({ ...settings, shell: "window" });
  await writeSettings(next);
  await applyToolbarForShell("window");
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { settings: next },
  });
}

export function registerWalletShellListeners(): void {
  chrome.runtime.onInstalled.addListener(() => {
    void initWalletShellOnStartup();
  });
  chrome.runtime.onStartup.addListener(() => {
    void initWalletShellOnStartup();
  });
  void initWalletShellOnStartup();

  chrome.windows.onFocusChanged.addListener((windowId) => {
    void onWalletShellFocusChanged(windowId);
  });

  chrome.windows.onRemoved.addListener((windowId) => {
    void onWalletShellWindowRemoved(windowId);
  });
}
