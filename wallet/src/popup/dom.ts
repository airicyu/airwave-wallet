import type { View } from "./types";

export const elApprovalRoot = document.getElementById("approval-root")!;

export const elTokenDetailRoot = document.getElementById("token-detail-root")!;
export const elSendAmount = document.getElementById("send-amount") as HTMLInputElement;
export const elSendRecipient = document.getElementById("send-recipient") as HTMLInputElement;
export const elSendFormError = document.getElementById("send-form-error")!;
export const elSendBalanceValue = document.getElementById("send-balance-value")!;
export const elSendHalf = document.getElementById("send-half") as HTMLButtonElement;
export const elSendMax = document.getElementById("send-max") as HTMLButtonElement;

export const elDock = document.getElementById("shell-dock")!;
export const elDockPrimary = document.getElementById("dock-primary") as HTMLButtonElement;
export const elBtnBack = document.getElementById("btn-back") as HTMLButtonElement;
export const elGenerateForm = document.getElementById("generate-form")!;
export const elGenerateSuccess = document.getElementById("generate-success")!;
export const elGenerateSuccessPk = document.getElementById("generate-success-pk")!;
export const elImportSecretFmt = document.getElementById("import-secret-fmt")!;
export const elImportSecretFmtText = document.getElementById("import-secret-fmt-text")!;
export const elImportSeedRoot = document.getElementById("import-seed-root")!;

export const el = {
  setup: document.getElementById("setup")!,
  locked: document.getElementById("locked")!,
  shell: document.getElementById("shell")!,
  barHome: document.getElementById("bar-home")!,
  barSubpage: document.getElementById("bar-subpage")!,
  subpageTitle: document.getElementById("subpage-title")!,
  menuOverlay: document.getElementById("menu-overlay")!,
  menuDropdown: document.getElementById("menu-dropdown")!,
  homeTabBar: document.getElementById("home-tab-bar")!,
  widgetLabel: document.getElementById("widget-label")!,
  widgetAddr: document.getElementById("widget-addr")!,
  widgetAvatar: document.getElementById("widget-avatar")!,
  homeTokens: document.getElementById("home-tokens")!,
  homeAssetsError: document.getElementById("home-assets-error")!,
  accountsList: document.getElementById("accounts-list")!,
  renameAddrHint: document.getElementById("rename-addr-hint")!,
  renameLabel: document.getElementById("rename-label") as HTMLInputElement,
  manageName: document.getElementById("manage-name")!,
  manageAddr: document.getElementById("manage-addr")!,
  manageReadonlyBadge: document.getElementById("manage-readonly-badge")!,
  btnGoReveal: document.getElementById("btn-go-reveal")!,
  revealHint: document.getElementById("reveal-hint")!,
  revealMaskBlock: document.getElementById("reveal-mask-block")!,
  revealSecretBlock: document.getElementById("reveal-secret-block")!,
  revealPassword: document.getElementById("reveal-password") as HTMLInputElement,
  revealSecretText: document.getElementById("reveal-secret-text")!,
  connectedList: document.getElementById("connected-list")!,
  hubSummaryNetwork: document.getElementById("hub-summary-network")!,
  hubSummaryRpc: document.getElementById("hub-summary-rpc")!,
  hubSummaryKeys: document.getElementById("hub-summary-keys")!,
  hubSummaryCuPrice: document.getElementById("hub-summary-cu-price")!,
  defaultCuPriceInput: document.getElementById("settings-default-cu-price") as HTMLInputElement,
  heliusApiUrl: document.getElementById("helius-api-url") as HTMLInputElement,
  jupiterApiKey: document.getElementById("jupiter-api-key") as HTMLInputElement,
  changePwdCurrent: document.getElementById("change-pwd-current") as HTMLInputElement,
  changePwdNew: document.getElementById("change-pwd-new") as HTMLInputElement,
  changePwdConfirm: document.getElementById("change-pwd-confirm") as HTMLInputElement,
  changePwdErr: document.getElementById("change-pwd-err")!,
  error: document.getElementById("error")!,
};

export const screens: Record<View, HTMLElement> = {
  "home-token": document.getElementById("screen-home-token")!,
  "home-activity": document.getElementById("screen-home-activity")!,
  accounts: document.getElementById("screen-accounts")!,
  "add-account": document.getElementById("screen-add-account")!,
  "add-generate": document.getElementById("screen-add-generate")!,
  "add-generate-seed": document.getElementById("screen-add-generate-seed")!,
  "add-import": document.getElementById("screen-add-import")!,
  "add-import-secret": document.getElementById("screen-add-import-secret")!,
  "add-import-seed": document.getElementById("screen-add-import-seed")!,
  "add-watch": document.getElementById("screen-add-watch")!,
  "add-combined": document.getElementById("screen-add-combined")!,
  "account-rename": document.getElementById("screen-account-rename")!,
  "account-manage": document.getElementById("screen-account-manage")!,
  "account-reveal-key": document.getElementById("screen-account-reveal-key")!,
  settings: document.getElementById("screen-settings")!,
  "settings-network": document.getElementById("screen-settings-network")!,
  "settings-rpc": document.getElementById("screen-settings-rpc")!,
  "settings-keys": document.getElementById("screen-settings-keys")!,
  "settings-cu-price": document.getElementById("screen-settings-cu-price")!,
  "settings-password": document.getElementById("screen-settings-password")!,
  about: document.getElementById("screen-about")!,
  "about-disclaimer": document.getElementById("screen-about-disclaimer")!,
  "about-terms": document.getElementById("screen-about-terms")!,
  "connected-sites": document.getElementById("screen-connected-sites")!,
  "token-detail": document.getElementById("screen-token-detail")!,
  "token-send": document.getElementById("screen-token-send")!,
  "send-approval": document.getElementById("screen-send-approval")!,
};
