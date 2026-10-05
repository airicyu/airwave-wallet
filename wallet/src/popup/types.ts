import type { AccountMeta, Settings } from "../shared/storage-keys";

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
  settings: Settings;
  connections: ConnectionSummary[];
};

export type View =
  | "home-token"
  | "home-activity"
  | "token-detail"
  | "token-send"
  | "send-approval"
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
  | "account-reveal-key"
  | "settings"
  | "settings-network"
  | "settings-rpc"
  | "settings-keys"
  | "settings-cu-price"
  | "settings-password"
  | "about"
  | "about-disclaimer"
  | "about-terms"
  | "connected-sites";

export const SUBPAGE_TITLES: Record<Exclude<View, "home-token" | "home-activity">, string> = {
  accounts: "Accounts",
  "add-account": "新增帳戶",
  "add-generate": "Burner 錢包",
  "add-generate-seed": "助記詞錢包",
  "add-import": "匯入錢包",
  "add-import-secret": "密鑰",
  "add-import-seed": "助記詞",
  "add-watch": "觀察帳戶",
  "add-combined": "New combined",
  "account-rename": "Rename",
  "account-manage": "Manage",
  "account-reveal-key": "Reveal key",
  settings: "Settings",
  "settings-network": "網路",
  "settings-rpc": "RPC",
  "settings-keys": "API keys",
  "settings-cu-price": "Default CU price",
  "settings-password": "錢包密碼",
  about: "About this app",
  "about-disclaimer": "免責聲明",
  "about-terms": "使用條款",
  "connected-sites": "Connected sites",
  "token-detail": "代幣詳情",
  "token-send": "送出",
  "send-approval": "確認送出",
};

export type CombinedCreateState = {
  draftChips: string[];
  pickedPks: Set<string>;
  currentMain: string;
};

export type SecretDetect = { kind: "empty" | "bytes" | "base58"; ok: boolean };
