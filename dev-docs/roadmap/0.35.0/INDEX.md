# 0.35.0 — 視窗標題與 `html lang` 跟 Settings 語言對齊

- **狀態：** `shipped`
- **上游版本：** [0.34.0](../0.34.0/INDEX.md)（簽署 AI preflight；本版不改）；語言表接 [0.23.0](../0.23.0/INDEX.md)；殼（popup／側欄／popout）接 [0.25.0](../0.25.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 出貨後已自清 backlog（審批窗標題 i18n；範圍擴大為所有使用者可見視窗；標題禁止 `Airwave — ` 前綴）
- **秘密欄位：** 無

## 產品句

工具列 popup、Chrome 側欄、網站審批 popout（含連線）的 `document.title` 與 `<html lang>` 都跟 Settings `locale` 同一套 `t(locale, …)`；標題是**單一語文**，沒有品牌英文夾在中文前面。避免 Chrome 因標題／內文語系不一致而跳出翻譯條。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)
5. 審查產物：[docs/design-review.md](./docs/design-review.md)、[docs/implementation-review.md](./docs/implementation-review.md)

## 已定案

| 題 | 決定 |
|----|------|
| 哪些視窗 | **使用者可見**的三個擴充面：① 工具列 popup（`src/popup/index.html`）② Chrome 側欄（`src/sidepanel/index.html`）③ 網站審批 popout（`src/popout/index.html`，含 `connect` 與簽署／送出）。同一 popup／側欄裡嵌的審批**不是**另一個視窗，不改殼標題。 |
| 誰寫 `document.title` | **只**由擁有該 `document` 的殼寫入。popup／側欄的 `App` **只**寫 `window.title.wallet`。審批 popout 才由 boot／`ConnectPage`／approval shell 寫審批窗名。`isInWalletShellHost(host)`（`host` 為 `"window"`／`"sidebar"`／`"popup"`）時，approval shell **禁止**賦 `document.title`（內文標題、按鈕、`html lang` 仍可改）。`ConnectPage` 僅在 popout 文件（`isPopoutApprovalUrl` 或明確 `ownsDocumentTitle` prop）寫 `page.connect`；殼內連線不碰窗名。 |
| 不算視窗 | `src/sandbox/index.html`、`src/offscreen/index.html` **不改**（對使用者不可見；維持現況英文 title／`lang="en"`）。 |
| 標題形狀 | `document.title` **只**等於 `t(locale, key)` 的整句。**禁止**前綴 `Airwave — `、`Airwave - `、`Airwave:` 或任何品牌英文＋譯文拼接。專有名詞 Airwave **不進** `document.title`（半中半英會讓 Chrome 以為頁面混語）。 |
| 錢包殼標題 | popup 與側欄一律 `window.title.wallet`：`zh-Hant`＝`錢包`、`zh-Hans`＝`钱包`、`en`＝`Wallet`。不隨子頁（Home／Settings／殼內審批）改 `document.title`。 |
| 審批 popout 預設／回顧 | 獨立鍵 `window.title.approval`：`zh-Hant`＝`審批`、`zh-Hans`＝`审批`、`en`＝`Approval`。不重用 `approval.review`（其英文是 `Review`，畫面內文可維持，窗名英文用 Approval）。 |
| 審批 popout 狀態標題 | 殼已有的狀態列繼續當窗名、仍無品牌前綴：確認中 `approval.confirming`、簽署交易 `approval.signTx`、簽署訊息 `approval.signMsg`、已確認 `approval.approved`、交易失敗 `approval.sendFailedTitle`、過期 `approval.expired`。連線 popout：`page.connect`（連線／连接／Connect）。 |
| `html lang` | 三面都把 `document.documentElement.lang` 設成與 `UiLocale` 相同的 BCP-47：`zh-Hant`／`zh-Hans`／`en`。與 [0.23.0](../0.23.0/INDEX.md) 一樣只跟 `settings.locale`，不讀 `navigator.language`。 |
| 何時寫入 | locale 從 `airwave.settings.v1` 讀到（或 `onChanged`）就寫 title＋lang。錢包殼在 React 已有 `settings.locale` 時寫，且只重寫 `window.title.wallet`。popout 在 boot 讀到 locale 後立刻寫預設審批窗名＋lang，再交給 ConnectPage 或 approval shell 覆寫狀態標題。popout 記住**現行 title key**（或等價）；`settings` `onChanged` 只對 popout 用該鍵重 `t`，不得一律退回 `window.title.approval`。殼內宿主的 `onChanged` 仍不碰 `document.title`。 |
| 靜態 HTML | `popup`／`sidepanel`／`popout` 的靜態 `<title>` **皆不得含** `Airwave`（含純品牌與 `Airwave — 審批` 混語）。可空；`lang` 靜態可留 `zh-Hant`（預設 locale），腳本覆寫。禁止用 `google notranslate`／`translate="no"` 當本版主路徑（那是關翻譯，不是對齊語系）。 |
| 查表 | 新鍵進既有 `ui-messages` catalog（先改 `wallet/scripts/gen-ui-messages.mjs` 再產生）。不新增 i18n 套件、不新增 command、不新增 storage key。 |
| 版本號 | 出貨時 `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.35.0` |

## 非目標

- 改使用者 Chrome「提供翻譯網頁」全域設定
- 改 dApp／`test-web/` 語系
- 翻譯 sandbox／offscreen 標題
- 第四種語言、RTL、跟瀏覽器 UI 語言
- 改 pending 生命週期、custody、Wallet Standard
- 用 `notranslate` meta 壓翻譯條
- 改畫面內文鍵（例如把 `approval.review` 的英文改成 Approval）— 只改 **窗名**

## 開工前仍須拍板

（無。）

## 與上一版對照

| 現況（0.34.0 碼） | 0.35.0 |
|-------------------|--------|
| popout HTML 標題 `Airwave — 審批`；popup／側欄 `Airwave` | 靜態標題不混語；執行期單一語文 catalog |
| approval shell `document.title = \`Airwave — ${tr(…)}\`` | `document.title = tr(…)`（或 `window.title.approval`） |
| ConnectPage 不設窗名 | 設 `page.connect` |
| popup／側欄不設 `html lang`（HTML 寫死 `zh-Hant`） | 跟 `settings.locale` |
| 審批殼已設 `document.documentElement.lang` | 維持；popout boot／錢包殼補上 |

## 實作軌道

### Track 1 — 共用寫入＋三面接上

- **做：** 共用函式（見 HOW）設 `lang`＋`title`；popup／側欄（同一 `App`）只寫錢包窗名；popout boot；ConnectPage **僅 popout** 寫連線窗名；`approval/shell.ts` 去掉品牌前綴，且殼內宿主不賦 `document.title`；靜態 HTML `<title>`；catalog 兩鍵。
- **不做：** sandbox／offscreen；改內文 catalog 英文；殼內審批／連線改錢包窗名。
- **驗收：** `cd wallet && npm run typecheck`。原始碼無 \`Airwave — \${ 拼窗名。殼內掛載點（ApprovalHost／SignFlowPage／FlowHost）不改錢包 `document.title`。

### Track 2 — 文件與版本

- **做：** `docs/features.md` 一句；`changelog.md`、`version.md`、套件／manifest 版本；INDEX 手驗。
- **不做：** 改 user-guide 長文。

## 驗收

手驗：載入 `wallet/dist`。無整包測試指令。Chrome 翻譯條受使用者瀏覽器設定影響，驗收以**窗名與 lang 是否單一語文且跟 locale**為準，不要求本機一定彈／不彈翻譯條。

- [x] Settings＝`en`：popup／側欄 `document.title`＝`Wallet`，`<html lang="en">`
- [x] Settings＝`zh-Hant`：popup／側欄標題＝`錢包`，`lang="zh-Hant"`
- [x] Settings＝`zh-Hans`：popup／側欄標題＝`钱包`，`lang="zh-Hans"`
- [x] 網站審批 popout（側欄關閉、jup.ag 或 `test-web` 簽交易）：`en` 時回顧態窗名＝`Approval`（或該狀態的全英文 catalog 句）；`zh-Hant`＝`審批`（或該狀態全中文句）；標題**沒有** `Airwave`
- [x] 連線 popout：窗名＝`Connect`／`連線`／`连接`
- [x] 側欄開著走網站連線或簽名、或 popup 內 `walletSend` 確認中：窗名仍為 `Wallet`／`錢包`／`钱包`，不是 `Connect`／`Approval`／`確認中`
- [x] 開著的 popup／側欄／popout，Settings 切語言後 title 與 `lang` 跟著變；popout 維持該狀態的窗名鍵（簽署中仍是簽署句，不退回「審批」）
- [x] `src/sandbox/index.html`、`src/offscreen/index.html` 未改
- [x] `cd wallet && npm run typecheck && npm run build`
- [x] 使用者於 2026-10-12 同意出貨

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/index.html` | 工具列 popup 靜態 title／lang |
| `wallet/src/sidepanel/index.html` | 側欄靜態 title／lang |
| `wallet/src/popout/index.html` | 審批 popout 靜態 title／lang（現況混語） |
| `wallet/src/approval/shell.ts` | 多處 `document.title = \`Airwave — …\`` |
| `wallet/src/popout/main.tsx` | popout boot；讀 locale；Connect vs shell |
| `wallet/src/flow/ConnectPage.tsx` | 連線頁目前不設窗名；殼內與 popout 共用 |
| `wallet/src/flow/FlowHost.tsx` | 殼內掛 Connect／SignFlow |
| `wallet/src/flow/SignFlowPage.tsx` | 側欄／popup 殼內簽名，`host` 為 sidebar／window |
| `wallet/src/popup/components/ApprovalHost.tsx` | popup 內 walletSend，`host` 為錢包殼 |
| `wallet/src/popup/App.tsx`／`usePopupAppState.ts`／`useT.ts` | 錢包殼 locale 來源（popup 與側欄共用 App） |
| `wallet/src/shared/ui-i18n.ts` | `t`／`parseUiLocale` |
| `wallet/scripts/gen-ui-messages.mjs` | 新窗名鍵 |
| `wallet/src/sandbox/index.html`、`wallet/src/offscreen/index.html` | 本版不改 |
