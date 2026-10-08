/**
 * Home shell toggle: toolbar action popup vs Chrome side panel.
 * Does not open dApp approval popouts or call chrome.windows.create for the wallet shell.
 */
import { WALLET_PAGE_PATH, walletShellSurfaceFromHref } from "../../shared/shell-constants";
import { sendExtensionRequest } from "../../shared/ext-api";
import { getLastNormalWindowId } from "./shell-bridge";

export function isSidePanelSurface(): boolean {
  return walletShellSurfaceFromHref(window.location.href) === "sidebar";
}

/** 工具列 action popup（`popup/index.html`），不是審批 `popout` 獨立窗 */
export function isWalletWindowSurface(): boolean {
  return walletShellSurfaceFromHref(window.location.href) === "window";
}

async function refreshLastNormalWindowIdFromSw(): Promise<number | null> {
  const res = await sendExtensionRequest("shell.getLastNormalWindowId");
  if (!res.ok || !res.result || typeof res.result !== "object") return getLastNormalWindowId();
  const wid = (res.result as { windowId?: number | null }).windowId;
  return typeof wid === "number" ? wid : null;
}

async function resolveBrowserWindowId(): Promise<number | null> {
  const tab = await chrome.tabs.getCurrent();
  if (tab?.windowId != null) return tab.windowId;
  const cached = getLastNormalWindowId();
  if (cached != null) return cached;
  return refreshLastNormalWindowIdFromSw();
}

/** 工具列 popup → 側欄：點擊同步 `sidePanel.open`（見 HOW），成功後才寫 `shell` 並關 popup。 */
export function switchToSidebar(): void {
  const windowId = getLastNormalWindowId();
  if (windowId == null) return;

  void chrome.sidePanel.open({ windowId }).then(async () => {
    const res = await sendExtensionRequest("storage.patchSettings", { shell: "sidebar" });
    if (!res.ok) return;
    window.close();
  });
}

/**
 * 側欄 → 工具列 popup：
 * 1. 先 await setPopup（sidebar 模式 popup 為空，未完成前 openPopup 不會出現錢包）
 * 2. openPopup({ windowId }) 成功後才由 SW 關側欄並寫 shell
 */
export function switchToWindow(): void {
  void (async () => {
    const browserWindowId = getLastNormalWindowId() ?? (await resolveBrowserWindowId());
    if (browserWindowId == null) return;

    try {
      await chrome.action.setPopup({ popup: WALLET_PAGE_PATH });
      await chrome.action.openPopup({ windowId: browserWindowId });
    } catch {
      return;
    }
    await sendExtensionRequest("shell.switchToWindow", { browserWindowId });
  })();
}
