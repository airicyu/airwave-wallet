/** Show dApp approval (connect/sign) in the shell; extension pages listen; do not broadcast to content scripts. */
export const DAPP_APPROVAL_IN_SHELL_MSG = "airwave-dapp-approval-in-shell";

export type DappApprovalInShellNotice = {
  kind: typeof DAPP_APPROVAL_IN_SHELL_MSG;
  requestId: string;
};
