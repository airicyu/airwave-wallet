/**
 * This file holds the shell page paths, the port names, and the message name the wallet shell and the service worker share. It also says whether a URL is the approval popout, which is not treated as a wallet window.
 */
export const WALLET_PAGE_PATH = "src/popup/index.html";
export const SIDEPANEL_PAGE_PATH = "src/sidepanel/index.html";
/** dApp approval only; not the wallet shell. Do not recover or focus this as a wallet window. */
export const POPOUT_PAGE_PATH = "src/popout/index.html";
export const SHELL_LAST_NORMAL_WINDOW_MSG = "airwave-shell-last-normal-window";
/** Side panel document holds this port so the SW knows the wallet sidebar is alive. */
export const SIDEBAR_SURFACE_PORT = "airwave-sidebar-surface";
/** Wallet shell documents hold this port so the SW knows a popup, side panel, or popout is open. */
export const IDLE_SURFACE_PORT = "airwave-idle-surface";

export function isPopoutApprovalUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes(POPOUT_PAGE_PATH);
}

/** Toolbar action popup (`popup/index.html`); `shell.window` mode, not the approval popout. */
export function isWalletShellWindowUrl(url: string | undefined): boolean {
  if (!url) return false;
  if (isPopoutApprovalUrl(url)) return false;
  return url.includes(WALLET_PAGE_PATH);
}

export function isWalletSidePanelUrl(url: string | undefined): boolean {
  if (!url) return false;
  return url.includes(SIDEPANEL_PAGE_PATH);
}

export function walletShellSurfaceFromHref(href: string): "window" | "sidebar" | null {
  if (isWalletSidePanelUrl(href)) return "sidebar";
  if (isWalletShellWindowUrl(href)) return "window";
  return null;
}
