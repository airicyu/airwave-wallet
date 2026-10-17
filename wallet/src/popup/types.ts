/**
 * Shared TypeScript types for popup wallet mirror state, connection summaries, and navigable view names.
 * Contains no runtime logic or UI rendering.
 */
import type { AccountMeta, AddressCard, PublicSettings } from "../shared/storage-keys";
import type { MessageKey } from "../shared/ui-messages";

export type ConnectionSummary = {
  origin: string;
  accountId: string;
  connectedAt: number;
};

export type State = {
  vaultExists: boolean;
  unlocked: boolean;
  accounts: AccountMeta[];
  activeAccountId: string | null;
  settings: PublicSettings;
  connections: ConnectionSummary[];
  addressBook: AddressCard[];
};

export type View =
  | "home-token"
  | "home-activity"
  | "rpc-guide"
  | "token-detail"
  | "token-send"
  | "send-pick"
  | "address-cards"
  | "address-cards-add"
  | "send-approval"
  | "close-empty-pick"
  | "close-empty-confirm"
  | "close-empty-sending"
  | "close-empty-result"
  | "accounts"
  | "add-account"
  | "add-generate"
  | "add-generate-seed"
  | "add-import"
  | "add-import-secret"
  | "add-import-seed"
  | "add-watch"
  | "add-combined"
  | "account-rename"
  | "account-manage"
  | "account-switch"
  | "account-manage-add"
  | "account-manage-paste"
  | "account-manage-local"
  | "account-member-rename"
  | "address-card-rename"
  | "account-reveal-key"
  | "settings"
  | "settings-locale"
  | "settings-network"
  | "settings-rpc"
  | "settings-keys"
  | "settings-tx-ai"
  | "settings-cu-price"
  | "settings-password"
  | "about"
  | "about-disclaimer"
  | "about-terms"
  | "about-privacy"
  | "connected-sites";

export const SUBPAGE_TITLE_KEYS: Record<Exclude<View, "home-token" | "home-activity" | "rpc-guide">, MessageKey> = {
  accounts: "nav.accounts",
  "add-account": "nav.addAccount",
  "add-generate": "nav.addGenerate",
  "add-generate-seed": "nav.addGenerateSeed",
  "add-import": "nav.addImport",
  "add-import-secret": "nav.addImportSecret",
  "add-import-seed": "nav.addImportSeed",
  "add-watch": "nav.addWatch",
  "add-combined": "nav.addCombined",
  "account-rename": "common.name",
  "account-manage": "nav.accountManage",
  "account-switch": "accounts.changeCurrentWallet",
  "account-manage-add": "common.add",
  "account-manage-paste": "common.address",
  "account-manage-local": "common.localAccounts",
  "account-member-rename": "common.name",
  "account-reveal-key": "nav.accountRevealKey",
  settings: "nav.settings",
  "settings-locale": "settings.locale.title",
  "settings-network": "nav.settingsNetwork",
  "settings-rpc": "nav.settingsRpc",
  "settings-keys": "nav.settingsKeys",
  "settings-tx-ai": "nav.settingsTxAi",
  "settings-cu-price": "nav.settingsCuPrice",
  "settings-password": "nav.settingsPassword",
  about: "nav.about",
  "about-disclaimer": "nav.aboutDisclaimer",
  "about-terms": "nav.aboutTerms",
  "about-privacy": "nav.aboutPrivacy",
  "connected-sites": "nav.connectedSites",
  "token-detail": "nav.tokenDetail",
  "token-send": "nav.tokenSend",
  "send-pick": "addressCards.pick",
  "address-cards": "menu.addressCards",
  "address-cards-add": "addressCards.add",
  "address-card-rename": "common.name",
  "send-approval": "nav.sendApproval",
  "close-empty-pick": "nav.closeEmptyPick",
  "close-empty-confirm": "nav.closeEmptyConfirm",
  "close-empty-sending": "nav.closeEmptySending",
  "close-empty-result": "nav.closeEmptyResult",
};

export type CombinedCreateState = {
  draftChips: string[];
  pickedPks: Set<string>;
  currentMain: string;
};

export type SecretDetect = { kind: "empty" | "bytes" | "base58"; ok: boolean };
