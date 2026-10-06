import { isHomeView } from "./lib/format";
import type { HomeTokenRow } from "./home/home-tokens";
import { SUBPAGE_TITLES, type View } from "./types";

/** Back 父畫面對照表。特殊列（Burner 成功、助記詞 pick、token-detail）不走此表。 */
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
  accounts: "home-token",
  "home-activity": "home-token",
  "send-approval": "token-send",
  "token-send": "token-detail",
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
  currentView: View;
  importSeedStep?: "words" | "pick";
  detailTokenId: string | null;
  homeTokenRows: HomeTokenRow[];
}): string {
  const { currentView, importSeedStep, detailTokenId, homeTokenRows } = args;
  if (currentView === "add-import-seed" && importSeedStep === "pick") return "選帳戶";
  if (currentView === "token-detail" && detailTokenId) {
    const row = homeTokenRows.find((r) => r.id === detailTokenId);
    return row ? row.name || row.symbol : SUBPAGE_TITLES["token-detail"];
  }
  if (currentView === "token-send") {
    const row = detailTokenId ? homeTokenRows.find((r) => r.id === detailTokenId) : undefined;
    return row ? `送出 ${row.symbol}` : SUBPAGE_TITLES["token-send"];
  }
  if (isHomeView(currentView)) return "";
  return SUBPAGE_TITLES[currentView as keyof typeof SUBPAGE_TITLES] ?? "";
}
