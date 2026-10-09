/**
 * Home shell toggle: toolbar action popup vs Chrome side panel.
 * Does not open dApp approval popouts or call chrome.windows.create for the wallet shell.
 */
import { walletShellSurfaceFromHref } from "../../shared/shell-constants";
import { sendExtensionRequest } from "../../shared/ext-api";
import { getLastNormalWindowId } from "./shell-bridge";

export function isSidePanelSurface(): boolean {
  return walletShellSurfaceFromHref(window.location.href) === "sidebar";
}

/** 工具列 action popup（`popup/index.html`），不是審批 `popout` 獨立窗 */
export function isWalletWindowSurface(): boolean {
  return walletShellSurfaceFromHref(window.location.href) === "window";
}

/** 工具列 popup → 側欄：點擊同步 `sidePanel.open`（見 HOW），成功後通知 SW 並關 popup。 */
export function switchToSidebar(): void {
  const windowId = getLastNormalWindowId();
  if (windowId == null) return;

  void chrome.sidePanel.open({ windowId }).then(() => {
    void sendExtensionRequest("shell.sidebarOpened");
    window.close();
  });
}

/**
 * 側欄 Home：只關側欄。不 openPopup。卸載後 SW 還原工具列 popup 模式，下次點圖示才開錢包。
 */
export function closeSidebar(): void {
  const browserWindowId = getLastNormalWindowId();
  void sendExtensionRequest("shell.switchToWindow", {
    ...(browserWindowId != null ? { browserWindowId } : {}),
  });
}
