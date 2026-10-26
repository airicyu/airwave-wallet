/**
 * This file re-exports the public surface of the wallet-shell background folder: toolbar, sidebar, and last-normal-window commands.
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
