/**
 * The message that asks the wallet shell to show a dApp connect or sign approval.
 * Extension pages listen for it. It is not broadcast to content scripts, so a page cannot see another origin's approval.
 */
export const DAPP_APPROVAL_IN_SHELL_MSG = "airwave-dapp-approval-in-shell";

export type DappApprovalInShellNotice = {
  kind: typeof DAPP_APPROVAL_IN_SHELL_MSG;
  requestId: string;
};
