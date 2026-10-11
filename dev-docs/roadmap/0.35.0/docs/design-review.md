# Design review — 0.35.0 Airwave Wallet

- 日期：第 2 輪複審 2026-10-12（Asia/Hong_Kong）；第 1 輪初審 2026-10-12（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) **現**已定案＋驗收；[how.md](./how.md)、[reasoning.md](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 上游：語言表 [0.23.0](../../0.23.0/INDEX.md)；殼 [0.25.0](../../0.25.0/INDEX.md)；行為上游 [0.34.0](../../0.34.0/INDEX.md)（本版不改）。構想 [backlog/approval-window-title-i18n.md](../../backlog/approval-window-title-i18n.md) **不是**本版契約（INDEX 已擴大為三面窗、並否決 `Airwave — ` 前綴）
- 現行程式抽樣：見「與現碼抽樣」。本版尚未實作；**現碼仍拼 `Airwave —` ≠ 設計 HIGH**
- **總評：** 提案**可行**，**不是不可行**。**無未關閉 HIGH**（H1 已寫進 INDEX／HOW／HANDOFF）。應修 **M4**。**L2、L3** 非阻擋。待拍板表為空。HANDOFF 已存在且含 paste-ready。**審查門檻通過**，可開工；M4 預設應先併入 HOW 再實作，以免連線 popout 切語言做成窗名／內文分語。

## Findings（第 2 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。上輪標關閉的項，本輪核對檔案後才改狀態。

### HIGH

#### H1 — 殼內審批／連線仍會寫 `document.title`，與「錢包窗名不隨子頁改」矛盾 — **關閉**

第 1 輪仍開。本輪核對：已寫進 INDEX 已定案「誰寫 `document.title`」、驗收「側欄開著／popup 內 walletSend 窗名仍為錢包」、HOW Approval shell／ConnectPage／Track 1、HANDOFF paste-ready。契約不再分叉。現碼 8 處仍賦 `Airwave —`＝未實作，≠ 重開。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | INDEX「何時寫入」已寫 popout 記住現行 title key、`onChanged` 不得一律退回 `window.title.approval`；HOW Approval shell 寫 `shellTitleKey`；驗收「簽署中仍是簽署句」；HANDOFF 同句。 |
| M2 | **關閉** | INDEX 驗收已加殼內連線／簽名／walletSend 窗名仍為 `Wallet`／`錢包`／`钱包`；Track 1 點名 ApprovalHost／SignFlowPage／FlowHost 不改錢包 `document.title`。 |
| M3 | **關閉** | INDEX 錨點已列 `FlowHost.tsx`、`SignFlowPage.tsx`、`ApprovalHost.tsx`；HOW ConnectPage 寫 `isPopoutApprovalUrl` 或 `ownsDocumentTitle`。 |
| M4 | **仍開**（預設應修）（本輪新增） | **ConnectPage 的 `settings` `onChanged` 未寫死要更新 `locale` state。** HOW 只寫掛載與 `onChanged` 時 `applyWindowChrome(locale, t(locale, "page.connect"))`。現碼 `ConnectPage` 的 locale 只 `storage.local.get` 一次；既有 `onChanged` 只聽 `session` 解鎖，不聽 `airwave.settings.v1`。照現 HOW：若用過期 React `locale` 閉包去 `t`，連線 popout 切語言窗名不變（驗收「開著的 popout 切語言」失敗）；若從 event 取新 locale 只改 title／lang、不 `setLocale`，窗名已是 `Connect`、內文仍繁中——與本版要修的「標題／內文語系不一致」同一失敗模式。審批殼路徑有 `applyShellLocaleToStaticChrome` 連內文一起換；連線頁沒有對等句。另：勿在 `popout/main.tsx` 另掛一律重設 `window.title.approval` 的 listener（會蓋掉 `page.connect`）。建議 HOW ConnectPage 寫死：`settings` `onChanged` 先 `parseUiLocale(newValue.locale)` 更新本頁 locale，popout 才 `applyWindowChrome`；殼內只改畫面、不碰 title；boot 不要第二條退回「審批」的 `onChanged`。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | HOW 表括號已改為 `showUnlockScreen`、`showLegacyConnect`。 |
| L2 | **仍開**（非阻擋） | 工具列 `manifest.config.ts` `default_title: "Airwave"` 不在本版三面 `document.title` 範圍，預期不改。勿在實作時順便 i18n 工具列 tooltip。 |
| L3 | **仍開**（非阻擋）（本輪新增） | INDEX 靜態 HTML 列明文禁的是 `Airwave — 審批` 這類混語，並說 `<title>` 可空；popup／側欄現況是 `<title>Airwave</title>`（單一英文品牌，不是混語句）。HOW 已寫三面「不含 `Airwave`」。實作讀 HOW 不會留；INDEX 該列可加半句「三面靜態 `<title>` 皆不得含 `Airwave`」以免只掃混語而留下品牌窗名第一幀。 |

架構禁區核對（INDEX 未推翻；非目標已寫不改 pending／custody／Wallet Standard）：

- Pending 仍只活在 SW；`openPopout` URL 只帶 `requestId`；UI `ui.getPending`。讀 `airwave.settings.v1` 的 `locale` 是持久**配置**，不是用 storage hydrate 找 pending。
- 不改結果回傳／廣播。
- 持久 locale 仍 `chrome.storage` + `onChanged`；錢包殼既有 `usePopupAppState` 鏡像 refresh，不需新 rehydrate 總線。
- 不把 pending 寫進持久 Zustand。
- 不硬編碼密碼、不改 vault／inject 持鑰；解鎖畫面 h1 仍可顯示產品名 Airwave（reasoning：只是不進 `document.title`）。
- 不宣告新 Wallet Standard 方法。
- 不用 `notranslate` 當主路徑。
- 不讀 `navigator.language`／`localeFromChromeUi` 設窗名（HOW 已禁）。

## 驗收對照

| 驗收句（INDEX） | 設計層是否可測 | 缺口 |
|----------------|----------------|------|
| Settings＝`en`：popup／側欄 title＝`Wallet`，`lang="en"` | 可測 | 殼內審批進行中仍為 `Wallet`（H1 已關） |
| Settings＝`zh-Hant`：title＝`錢包`，`lang="zh-Hant"` | 可測 | 同上 |
| Settings＝`zh-Hans`：title＝`钱包`，`lang="zh-Hans"` | 可測 | 同上 |
| 網站審批 popout：`en` 回顧＝`Approval`（或該狀態全英文 catalog 句）；`zh-Hant`＝`審批`（或該狀態全中文句）；標題無 `Airwave` | 可測 | M1 已關：切語言維持該狀態鍵 |
| 連線 popout：`Connect`／`連線`／`连接` | 可測 | **M4**：開著切語言時須用新 locale 寫窗名，且內文 `t()` 同步，避免只改 title |
| 側欄開著走網站連線或簽名、或 popup 內 `walletSend` 確認中：窗名仍為 `Wallet`／`錢包`／`钱包` | 可測 | H1／M2 已關 |
| 開著的 popup／側欄／popout，Settings 切語言後 title 與 `lang` 跟著變；popout 維持該狀態鍵 | 可測 | 錢包殼走 App `applyWindowChrome`＋既有 `onChanged` 鏡像；popout 審批走 `shellTitleKey`；**連線 popout 見 M4** |
| `sandbox`／`offscreen` HTML 未改 | 可測 | 與非目標一致 |
| `cd wallet && npm run typecheck && npm run build` | 可測 | Track 1 另 grep 無 \`Airwave — \${ 拼窗名 |

無整包測試指令，與 GUIDELINES 一致；手驗為準。INDEX 已寫：不要求本機一定彈／不彈 Chrome 翻譯條。未把 backlog「驗不再跳翻譯條」當本版驗收。

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列是錨點與**現** INDEX／HOW 的關係。

| 錨點 | 抽樣 |
|------|------|
| `wallet/src/popup/index.html` | `<title>Airwave</title>`、`lang="zh-Hant"`。HOW：靜態 title 可空、不含 `Airwave`。未改 ≠ HIGH；INDEX 靜態列未點名此字 → **L3** |
| `wallet/src/sidepanel/index.html` | 同 popup。`main.tsx` 與 popup 共用 `<App />`。提案「同一 App 跟 locale」與現碼結構一致 |
| `wallet/src/popout/index.html` | `<title>Airwave — 審批</title>`。提案刪混語。**未改 ≠ HIGH** |
| `wallet/src/sandbox/index.html`、`offscreen/index.html` | `lang="en"`、title 含 Airwave sandbox／offscreen。非目標維持 |
| `wallet/src/approval/shell.ts` | 8 處 `` document.title = `Airwave — ${…}` ``。`applyShellLocaleToStaticChrome` 設 `lang` 與靜態內文、不設 title；`onChanged` 重跑該函。`host` 已在 config；`isInWalletShellHost` 已存在。提案加守衛＋`shellTitleKey`。未改 ≠ HIGH |
| `wallet/src/popout/main.tsx` | URL 只 `requestId`；`ui.getPending`。讀 settings locale 後，缺 `requestId` 只換 innerHTML、未設 lang／title；connect → `ConnectPage`（無 `ownsDocumentTitle`），其餘 `host: "popout"`。與架構禁區一致。HOW 要求讀到 locale 後、分支前 `applyWindowChrome` |
| `wallet/src/flow/ConnectPage.tsx` | 畫面用 `page.connect`；**不**設 `document.title`。locale 只 get 一次；`onChanged` 只聽 session 解鎖。同元件亦由 `FlowHost` 殼內掛載。H1 守衛已寫進 HOW；切語言同步 locale **未**寫死 → **M4** |
| `wallet/src/flow/FlowHost.tsx`、`SignFlowPage.tsx`、`popup/components/ApprovalHost.tsx` | 殼內掛 Connect／shell；`host` 為 sidebar／window（href）。錨點已列。`SignFlowPage`／`ApprovalHost` 於 locale 變更會重掛 shell；H1 後殼內不賦 title，錢包窗名由 App 負責 |
| `wallet/src/popup/App.tsx`／`usePopupAppState.ts`／`useT.ts` | 無 `document.title`／`documentElement.lang`。locale 來自 `wallet.settings`；`onChanged` 已 refresh 鏡像。提案在已有 locale 處 `applyWindowChrome` 可行，不需新 storage key／command |
| `wallet/src/shared/ui-i18n.ts` | `parseUiLocale`／`DEFAULT_UI_LOCALE`／`t`；`localeFromChromeUi` 存在但 HOW 禁用於本版窗名 |
| `wallet/scripts/gen-ui-messages.mjs` | 無 `window.title.wallet`／`window.title.approval`。`page.connect`＝連線／连接／Connect；`approval.review` 英文仍 `Review`；狀態鍵已是單一語文 |
| `wallet/src/shared/commands.ts` | `isInWalletShellHost` 含 `"popup"`／`"window"`／`"sidebar"`，與 INDEX 一致 |
| `wallet/src/shared/shell-constants.ts` | `isPopoutApprovalUrl` 認 `src/popout/index.html`。HOW 允許用此分辨 Connect 宿主 |
| `wallet/src/background/messaging/open-popout.ts` | 只把 `requestId` 放進 popout URL。與禁區 1 一致 |
| `wallet/manifest.config.ts` | `default_title: "Airwave"` → **L2** |

`applyWindowChrome` 現不存在（建議新檔）。現碼未做 ≠ HIGH。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| H1 | HIGH | 關閉 | INDEX 已定案「誰寫 `document.title`」＋驗收殼內不改窗名；HOW Track 1／Approval shell／ConnectPage；HANDOFF paste-ready |
| M1 | MEDIUM | 關閉 | INDEX「何時寫入」；HOW Approval shell `shellTitleKey`；驗收切語言維持狀態鍵；HANDOFF |
| M2 | MEDIUM | 關閉 | INDEX 驗收殼內 walletSend／側欄網站審批 |
| M3 | MEDIUM | 關閉 | INDEX 錨點三檔；HOW ConnectPage 宿主分辨 |
| M4 | MEDIUM | 仍開 | （待規劃）HOW ConnectPage：`settings` `onChanged` 更新 locale 再寫窗名；boot 不另掛退回 approval 的 listener |
| L1 | LOW | 關閉 | HOW Approval shell 表括號 |
| L2 | LOW | 仍開 | 無須關；實作勿膨脹 `default_title` |
| L3 | LOW | 仍開 | （可選）INDEX 靜態 HTML 加「三面不得含 `Airwave`」；HOW 已有 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪初審 | 2026-10-12 | 提案可行，不是不可行。未關閉 **H1**；應修 **M1–M3**。審查門檻**未通過**，不可開工。 |
| 第 2 輪複審 | 2026-10-12 | H1、M1–M3、L1 已寫進 INDEX／HOW／HANDOFF，關閉。新開 **M4**（ConnectPage 切語言）。無未關閉 HIGH。提案可行。**門檻通過**；M4 預設應修。 |

---

## 第 1 輪題旨（保留）

下列為 2026-10-12 初審原文摘要，ID 不重編。關閉與否以第 2 輪狀態為準。

### H1（初審仍開 → 第 2 輪關閉）

INDEX 當時已定「popup 與側欄一律 `window.title.wallet`、不隨殼內審批改 `document.title`」，但 HOW Track 1／Approval shell 寫「每一處 `document.title` 改成只賦 catalog 句」、ConnectPage 無宿主參數也寫窗名。0.25.0 側欄活著時網站審批進同一殼、`walletSend` 留在當下殼，是主路徑。只去 `Airwave —` 前綴會讓開著的 popup／側欄窗名變成「確認中／連線／Approval」。建議寫死：`document.title` 只由擁有該 document 的殼寫；`isInWalletShellHost` 時 approval shell 禁止賦 title；ConnectPage 僅 popout 寫 `page.connect`。

### M1–M3（初審仍開 → 第 2 輪關閉）

- M1：popout `onChanged` 如何選狀態窗名鍵未寫死。
- M2：驗收未覆蓋「殼內審批不得改錢包窗名」。
- M3：錨點漏 `FlowHost`／`SignFlowPage`／`ApprovalHost`。

### L1–L2（初審）

- L1：HOW 表 `approval.review` 括號與現碼函式名不齊（`showUnlockScreen`／`showLegacyConnect`）。
- L2：manifest `default_title` 不在範圍。
