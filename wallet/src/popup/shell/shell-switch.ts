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

/** Toolbar action popup (`popup/index.html`), not the approval `popout` window. */
export function isWalletWindowSurface(): boolean {
  return walletShellSurfaceFromHref(window.location.href) === "window";
}

/** Toolbar popup → side panel: open `sidePanel` on click (see HOW), then notify the SW and close the popup. */
export function switchToSidebar(): void {
  const windowId = getLastNormalWindowId();
  if (windowId == null) return;

  void chrome.sidePanel.open({ windowId }).then(() => {
    void sendExtensionRequest("shell.sidebarOpened");
    window.close();
  });
}

/**
 * Side-panel Home: close the panel only. Do not openPopup. After unload the SW restores toolbar popup mode.
 */
export function closeSidebar(): void {
  const browserWindowId = getLastNormalWindowId();
  void sendExtensionRequest("shell.switchToWindow", {
    ...(browserWindowId != null ? { browserWindowId } : {}),
  });
}
