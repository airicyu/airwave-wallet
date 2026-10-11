# HOW — 0.35.0

實作路徑。契約以 [INDEX](../INDEX.md) 為準。

## Catalog

`ui-messages.ts` 是現況 catalog。`gen-ui-messages.mjs` **尚未含齊**全部鍵，**禁止**跑產生器覆寫 catalog。兩檔都手動加上：

| key | zh-Hant | zh-Hans | en |
|-----|---------|---------|-----|
| `window.title.wallet` | 錢包 | 钱包 | Wallet |
| `window.title.approval` | 審批 | 审批 | Approval |

其餘窗名重用已有鍵，不改其譯文：`page.connect`、`approval.confirming`、`approval.signTx`、`approval.signMsg`、`approval.approved`、`approval.sendFailedTitle`、`approval.expired`。

**不要**改 `approval.review` 的英文 `Review`（那是畫面內文）。

## 共用寫入

新增小函式（建議 `wallet/src/shared/window-chrome.ts`，或與 `ui-i18n.ts` 同檔若仍是一件事）：

```ts
function applyWindowChrome(locale: UiLocale, title: string): void {
  document.documentElement.lang = parseUiLocale(locale);
  document.title = title;
}
```

`title` 必須已經是 `t(locale, key)` 的回傳值，呼叫端**禁止**再拼 `Airwave — `。`lang` 字面就是 `zh-Hant`／`zh-Hans`／`en`。

錢包殼與 popout 都走這條，避免三處各寫 `document.title`／`lang` 只改一半。

## 靜態 HTML

`wallet/src/popup/index.html`、`sidepanel/index.html`、`popout/index.html`：

- `<title></title>`（空）或同等不含 `Airwave`、不含漢字夾 Latin 品牌的字。
- `<html lang="zh-Hant">` 可留（DEFAULT_UI_LOCALE）；腳本覆寫。
- popout **刪掉** `Airwave — 審批`。

`sandbox/index.html`、`offscreen/index.html` 不動。

## 錢包殼（popup＋側欄）

兩者都 `createRoot(…).render(<App />)`。在已能讀到 `settings.locale` 之處（例如 `App` 或 `usePopupAppState` 於 `wallet` 更新時）呼叫：

`applyWindowChrome(locale, t(locale, "window.title.wallet"))`

`locale` 缺省與 0.23.0 相同：`parseUiLocale`／`DEFAULT_UI_LOCALE`（`zh-Hant`）。`chrome.storage.onChanged` 已更新鏡像時必須重跑（切語言開著的殼要變，且**只**重寫 `window.title.wallet`）。殼內審批、連線、Settings 子頁**不要**改 `document.title`。`FlowHost`／`SignFlowPage`／`ApprovalHost` 只負責掛載，不另設窗名。

## Popout boot

`wallet/src/popout/main.tsx` 在讀到 `locale` 之後、分支 Connect／shell **之前**：

`applyWindowChrome(locale, t(locale, "window.title.approval"))`

缺 `requestId` 的錯誤頁也先寫 lang（標題可維持 approval 或該錯誤句；不要留 HTML 混語）。

## ConnectPage

同一元件掛在 `popout/main.tsx` 與 `FlowHost`。**僅** popout 文件寫窗名：用 `isPopoutApprovalUrl(location.href)`（或明確 `ownsDocumentTitle` prop，popout 傳 true、FlowHost 不傳）。

`settings` `onChanged` **先** `parseUiLocale(newValue.locale)` 更新本頁 `locale` state（畫面 `t()` 才會跟），**然後** popout 才 `applyWindowChrome(locale, t(locale, "page.connect"))`。不要用過期閉包的舊 locale 只改 title。殼內連線只改畫面、不碰 `document.title`。

`popout/main.tsx` **不要**另掛一條一律重設 `window.title.approval` 的 `onChanged`（會蓋掉連線窗名）。

## Approval shell

現有 `document.title =` 改走共用函式，且**先**判斷宿主：`if (isInWalletShellHost(host))` 則**不**賦 `document.title`（內文 `signPageTitle`、按鈕、`html lang` 仍改）。不要寫成「每一處仍賦 catalog 句」。

僅 `host === "popout"` 時賦窗名，並記住現行 title **key**（例如模組變數 `shellTitleKey`）：

| 現況前綴句 | popout 窗名 key |
|------------|-----------------|
| `` `Airwave — ${tr("approval.confirming")}` `` | `approval.confirming` |
| `` `Airwave — ${tr("approval.signTx")}` `` | `approval.signTx` |
| `` `Airwave — ${tr("approval.sendFailedTitle")}` `` | `approval.sendFailedTitle` |
| `` `Airwave — ${tr("approval.approved")}` `` | `approval.approved` |
| `` `Airwave — ${tr("approval.expired")}` `` | `approval.expired` |
| `` `Airwave — ${tr("approval.review")}` ``（`showUnlockScreen`、`showLegacyConnect`） | `window.title.approval` |
| `` `Airwave — ${pageTitle}` ``（signTx／signMsg） | 該次的 `approval.signTx` 或 `approval.signMsg` |

`applyShellLocaleToStaticChrome` 已設 `lang` 與靜態內文、**不**設 title。`onChanged` 換 locale：殼內只改 lang／內文；popout 用記住的 key `t` 後寫入，不得一律退回 `window.title.approval`。`lang` 三面都可改，與「殼內不改窗名」不衝突。

## 不要做

- `<meta name="google" content="notranslate">`、`html translate="no"`
- `chrome.i18n.getUILanguage` 當窗名來源（`localeFromChromeUi` 本版不拿來設 title／lang）
- 新 command、新 storage key
- 殼內 `ApprovalHost`／`SignFlowPage`／`FlowHost` 另設 `document.title`
