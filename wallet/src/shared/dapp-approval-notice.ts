/** 側欄殼內顯示網站審批（connect／sign）；僅 extension 頁監聽，不廣播 content script。 */
export const DAPP_APPROVAL_IN_SHELL_MSG = "airwave-dapp-approval-in-shell";

export type DappApprovalInShellNotice = {
  kind: typeof DAPP_APPROVAL_IN_SHELL_MSG;
  requestId: string;
};
