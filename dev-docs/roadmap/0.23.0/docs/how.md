# HOW — 0.23.0

實作路徑。契約以 [INDEX](../INDEX.md) 為準。

## Storage

`Settings` 增加：

```ts
export type UiLocale = "zh-Hant" | "zh-Hans" | "en";

export type Settings = {
  // …既有欄
  locale: UiLocale;
};
```

`DEFAULT_SETTINGS.locale = "zh-Hant"`。

`normalizeSettings`：

- `raw.locale` 是三碼之一 → 用該值
- 缺欄、`""`、其它字串 → `"zh-Hant"`
- **不要**讀 `navigator.language`

仍只寫 `airwave.settings.v1`。`handlePatchSettings` 已 `{ ...settings, ...patch }` 再 normalize，不必新 command。UI 用既有 `patchSettingsPartial({ locale })`。

鎖定頁讀 settings 走既有 `chrome.storage` 鏡像，不需解鎖 vault。

## Util

`wallet/src/shared/ui-i18n.ts`：

- `UI_LOCALES`、`DEFAULT_UI_LOCALE`、`parseUiLocale(v: unknown): UiLocale`
- `t(locale, key, vars?)`：`catalog[key][parseUiLocale(locale)]`，再把 `{ident}` 換成 `vars[ident]`；缺 vars 時保留佔位符（不要改用另一語填）。未知 `MessageKey`：typecheck 過不了；若執行期仍碰到，開發 throw，正式建置不得 fallback 到另一語或空字串。
- 語言頁用 endonym 常數與 `locale === row` 選中，**不是**用 `if` 拼「設定／Settings」這種句子。

`wallet/src/shared/ui-messages.ts`：單一 `const messages = { ... } as const satisfies Record<string, Record<UiLocale, string>>`（三語 key 齊）。**禁止**任何語文為 `""`（註解約定＋窄測：每個 key 三語 `trim().length > 0`）。導出 `type MessageKey = keyof typeof messages`。

React：小 hook（例如 `useT()`）從 `usePopupAppState`／context 的 `settings.locale` 閉包 `t`。禁止每個元件自己訂 locale 預設。

Vanilla（`approval/shell.ts`、popout）：繪製函式參數帶 `locale`，從當下 settings 讀，`onChanged` 後重繪。

## Settings 語言頁

- view id：`settings-locale`
- 樞紐插入**第一** `<li>`，在「網路」之上
- 子頁三列：值 `zh-Hant`／`zh-Hans`／`en`；可見文字固定 endonym；`checked` 比 `settings.locale`
- `runtime.ts` 父層 `"settings"`（Back 回樞紐）
- 頂欄標題 `t(locale, "settings.locale.title")`

## 收字串

掃使用者可見字面值：TSX 文字節點、`title`／`aria-label`、`SUBPAGE_TITLES`、`popup/runtime.ts` 的 `subpageTitle`、menu、空狀態、主按鈕、toast、解鎖、onboarding、`settings-logic.ts`、`copy-pk-feedback.ts`、送出／收回租金狀態句、簽署殼按鈕、`approval/cards/`。

**留下字面值：** catalog 檔、測試、註解、法律 markdown、console、錯誤碼識別字串、專有名詞、symbol／label。

`token-send` 頂欄：`t(locale, "send.titleWithSymbol", { symbol })`。

## 錯誤碼（SW 不譯）

`friendlyErrorMessage` **移出 SW**（或 SW 停用它）。只在 UI 用 `locale` 把 code／raw 變成短句。持倉列、模擬卡、toast **存 code 或 raw**，render 時 `t(settings.locale, …)`。`onChanged` 換 locale 時不必重打 RPC，只要重繪。

涵蓋規則：任何會出現在錢包 chrome 的 SW／popout 字面中文（進度、command `message`、模擬 ix 標題與欄位 label、缺 `requestId`），本版都改 code／kind＋UI `t`。下表是已知最低集合，掃到同等句一併改，不必再擴 INDEX。

command 回應若同時有 `code` 與中文 `message`：UI 只 map `code`。

本版至少這些穩定 code（字串枚舉即可，不必新 command）：

| 現況（約） | code |
|------------|------|
| 無法載入持倉 | `HOLDINGS_LOAD_FAILED` |
| Jupiter 資料更新失敗 | `JUPITER_REFRESH_FAILED` |
| 無法解析交易 | `TX_UNPARSEABLE` |
| 逾時（模擬） | `SIM_TIMEOUT` |
| RPC 錯誤（模擬） | `SIM_RPC` |
| 無法載入 address lookup table | `ALT_LOAD_FAILED` |
| 無法載入帳戶（審批殼） | `ACCOUNTS_LOAD_FAILED` |
| 送出進度：交易無效 | `SEND_TX_INVALID` |
| 送出進度：確認逾時… | `SEND_CONFIRM_TIMEOUT` |
| 收回租金：掃描失敗 | `CLOSE_EMPTY_SCAN_FAILED` |
| 收回租金：無法估算 CU | `CLOSE_EMPTY_CU_FAILED` |
| popout 缺少 requestId | `MISSING_REQUEST_ID`（此句在 popout 啟動，可直接 `t`，無須 SW） |

模擬 ix 解讀（`decode-compiled-ix.ts`）：payload 帶穩定 `kind`（例如 `system.transfer`）與角色 id（`from`／`to`），**不要**帶「轉移 SOL」「來源」「收款」譯文。UI 用 `t("ix.system.transfer")` 等。金額與公鑰仍不譯。

既有 `INVALID_PASSWORD`、`WALLET_LOCKED`、`WEAK_PASSWORD` 等維持。UI 對未知 code：顯示 code 原文，不發明句子。限流：UI 偵測 raw 後 `t(..., "error.rpcRateLimit")`；偵測維持認 `429`／`rate limit`／`8100002`／「速率限制」。送出進度「確認逾時…」若出現在錢包 chrome，同樣改 code＋catalog，不把譯文從 SW 推到 UI。

## 字體

popup 與 popout `body`：

```css
font-family: "Segoe UI", "Microsoft JhengHei UI", "PingFang TC", sans-serif;
```

刪 `.unlock-screen h1` 與送出／收回租金狀態標題的 `letter-spacing: 0.02em`。徽章、kicker 的較大 letter-spacing（英文 Devnet）可留。

## 產品圖

`wallet/src/shared/brand-icon.ts` 的 `brandIconUrl()`＝`chrome.runtime.getURL("public/icon128.png")`。React 用 `BrandMark`（`lg` 64px、`sm` 40px）。靜態 popout 用 `img.brand-mark[data-brand-mark]`，`popout/main.ts` 在 `boot` 寫 `src`。審批宿主 HTML 字串在組字時寫入同一個 URL。類名 `.brand-mark`／`.brand-mark-sm` 在 popup 與 popout CSS。不要把圖放進 `ui-messages`。

## 設計原則（Track 3 才改產品檔）

第 1 節：解鎖／確認中標題字距 0；「錢包已鎖定」「確認中」「等待鏈上確認」改寫成走 catalog，不要當唯一語文。同節寫產品圖：解鎖與首次建立密碼 64px、關於 40px、Home 與簽署主畫面不放。寬度「約 384」可留歷史句，驗收仍以 `--popup-w` 422px。  
第 3 節：tooltip 跟目前語言的 catalog。  
第 6 節：UI 文案跟 `settings.locale`；限流 toast 指向 catalog 鍵，可附三語之一當例子。  
第 8 節：樞紐第一列語言，再網路／RPC／API keys／Default CU price／錢包密碼。
