/**
 * Re-exports the public surface of the wallet-shell background folder: toolbar, sidebar, and last-normal-window commands.
 * Callers outside this folder import this file rather than a module inside it.
 */
export {
  applyToolbarForShell,
  handleShellGetLastNormalWindowId,
  handleShellGetSidebarDappApproval,
  handleShellSidebarOpened,
  handleShellSwitchToWindow,
  initWalletShellOnStartup,
  isSidebarWalletOpen,
  registerWalletShellListeners,
} from "./wallet-shell";
