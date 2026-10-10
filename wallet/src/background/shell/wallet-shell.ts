/**
 * Wallet shell: toolbar popup vs side panel, and last normal browser window id for sidePanel.open.
 * Does not open approval popouts or chrome.windows.create wallet shells.
 */
import type { ExtensionRequest, ExtensionResponse } from "../../shared/commands";
import {
  isWalletSidePanelUrl,
  SHELL_LAST_NORMAL_WINDOW_MSG,
  SIDEPANEL_PAGE_PATH,
  SIDEBAR_SURFACE_PORT,
  WALLET_PAGE_PATH,
} from "../../shared/shell-constants";
import type { ShellMode } from "../../shared/storage-keys";
import { findSidebarDappApprovalRequestId, rejectOrdinaryDappPending } from "../pending";
import { respond } from "../messaging";

let lastNormalWindowId: number | undefined;
let sidebarSurfaceOpen = false;

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

/** If the remembered window id is gone, pick an existing normal window and push the shell. */
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

async function setSidebarSurfaceOpen(open: boolean): Promise<void> {
  if (sidebarSurfaceOpen === open) return;
  sidebarSurfaceOpen = open;
  await applyToolbarForShell(open ? "sidebar" : "window");
}

async function refreshSidebarOpenFromContexts(): Promise<void> {
  if (typeof chrome.runtime.getContexts !== "function") return;
  try {
    const ctxs = await chrome.runtime.getContexts({
      contextTypes: [chrome.runtime.ContextType.SIDE_PANEL],
    });
    const open = ctxs.some((c) => isWalletSidePanelUrl(c.documentUrl));
    await setSidebarSurfaceOpen(open);
  } catch {
    /* API missing or denied */
  }
}

export async function isSidebarWalletOpen(): Promise<boolean> {
  await refreshSidebarOpenFromContexts();
  return sidebarSurfaceOpen;
}

export async function initWalletShellOnStartup(): Promise<void> {
  await pickInitialNormalWindowId();
  broadcastLastNormalWindowId();
  await applyToolbarForShell("window");
  await refreshSidebarOpenFromContexts();
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

export async function handleShellSidebarOpened(req: ExtensionRequest): Promise<ExtensionResponse> {
  await setSidebarSurfaceOpen(true);
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { open: true },
  });
}

/**
 * Close the side panel. Do not openPopup. After the port disconnects, restore the toolbar popup so the next icon click opens the wallet.
 */
export async function handleShellSwitchToWindow(req: ExtensionRequest): Promise<ExtensionResponse> {
  const { browserWindowId } = (req.payload ?? {}) as { browserWindowId?: number };
  const sidebarDappId = findSidebarDappApprovalRequestId();
  if (sidebarDappId) {
    await rejectOrdinaryDappPending(sidebarDappId, "Wallet shell switched");
  }

  try {
    if (typeof browserWindowId === "number") {
      await closeSidePanelForBrowserWindow(browserWindowId);
    } else {
      await closeSidePanelGlobal();
    }
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
  return respond({
    kind: "airwave-ext-res",
    requestId: req.requestId,
    ok: true,
    result: { open: false },
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

  chrome.runtime.onConnect.addListener((port) => {
    if (port.name !== SIDEBAR_SURFACE_PORT) return;
    void setSidebarSurfaceOpen(true);
    port.onDisconnect.addListener(() => {
      void setSidebarSurfaceOpen(false);
    });
  });
}
