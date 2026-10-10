export const WALLET_PAGE_PATH = "src/popup/index.html";
export const SIDEPANEL_PAGE_PATH = "src/sidepanel/index.html";
/** dApp approval only; not the wallet shell. Do not recover or focus this as a wallet window. */
export const POPOUT_PAGE_PATH = "src/popout/index.html";
export const SHELL_LAST_NORMAL_WINDOW_MSG = "airwave-shell-last-normal-window";
/** Side panel document holds this port so the SW knows the wallet sidebar is alive. */
export const SIDEBAR_SURFACE_PORT = "airwave-sidebar-surface";

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
