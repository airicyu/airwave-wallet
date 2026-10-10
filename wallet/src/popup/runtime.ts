/**
 * Popup navigation helpers: back-stack parents, subpage titles, and home-view detection for the shell.
 * Does not own React wallet state or chrome.storage mirroring.
 */
import { isHomeView } from "./lib/format";
import type { HomeTokenRow } from "./home/home-tokens";
import { t, type UiLocale } from "../shared/ui-i18n";
import { SUBPAGE_TITLE_KEYS, type View } from "./types";

/** Parent view for Back navigation. Special cases (burner success, seed pick, token-detail) skip this map. */
export const BACK_PARENT: Partial<Record<View, View>> = {
  "account-reveal-key": "account-manage",
  "account-rename": "accounts",
  "account-manage": "accounts",
  "add-account": "accounts",
  "add-generate": "add-account",
  "add-generate-seed": "add-account",
  "add-combined": "add-account",
  "add-watch": "add-account",
  "add-import-secret": "add-import",
  "add-import-seed": "add-import",
  "add-import": "add-account",
  "settings-locale": "settings",
  "settings-network": "settings",
  "settings-rpc": "settings",
  "settings-keys": "settings",
  "settings-cu-price": "settings",
  "settings-password": "settings",
  "about-disclaimer": "about",
  "about-terms": "about",
  settings: "home-token",
  "connected-sites": "home-token",
  about: "home-token",
  "rpc-guide": "home-token",
  accounts: "home-token",
  "home-activity": "home-token",
  "send-approval": "token-send",
  "token-send": "token-detail",
  "close-empty-pick": "home-token",
  "close-empty-confirm": "close-empty-pick",
  "close-empty-sending": "close-empty-confirm",
  "close-empty-result": "close-empty-confirm",
};

export const ENTER_RESET_VIEWS = new Set<View>([
  "add-combined",
  "add-generate",
  "add-generate-seed",
  "add-import-secret",
  "add-import-seed",
  "add-watch",
  "account-rename",
]);

export function screenEnterKey(view: View, navSeq: number): string | undefined {
  return ENTER_RESET_VIEWS.has(view) ? `${view}-${navSeq}` : undefined;
}

export function subpageTitle(args: {
  locale: UiLocale;
  currentView: View;
  importSeedStep?: "words" | "pick";
  detailTokenId: string | null;
  homeTokenRows: HomeTokenRow[];
}): string {
  const { locale, currentView, importSeedStep, detailTokenId, homeTokenRows } = args;
  if (currentView === "add-import-seed" && importSeedStep === "pick") {
    return t(locale, "nav.pickAccounts");
  }
  if (currentView === "token-detail" && detailTokenId) {
    const row = homeTokenRows.find((r) => r.id === detailTokenId);
    return row ? row.name || row.symbol : t(locale, "nav.tokenDetail");
  }
  if (currentView === "token-send") {
    const row = detailTokenId ? homeTokenRows.find((r) => r.id === detailTokenId) : undefined;
    return row ? t(locale, "send.titleWithSymbol", { symbol: row.symbol }) : t(locale, "nav.tokenSend");
  }
  if (isHomeView(currentView)) return "";
  const key = SUBPAGE_TITLE_KEYS[currentView as keyof typeof SUBPAGE_TITLE_KEYS];
  return key ? t(locale, key) : "";
}
