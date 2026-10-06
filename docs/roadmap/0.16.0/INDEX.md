# 0.16.0 — Popup React 收斂（清技術債，行為不變）

- **狀態：** `shipped`
- **上游版本：** [0.15.0](../0.15.0/INDEX.md)（popup 已是 Vite React；本版只收斂內部 state／導航層，不改產品語意）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃訪談（2026-10-06）；0.15.0 落地後的過渡層（模組級 `session`＋全樹 `bumpUi`、`bindPopupShell`、遷移腳本）
- **畫面：** 使用者可見行為與 0.15.0／0.14.0 相同。視覺沿用 [`docs/design-principles.md`](../../design-principles.md) 與現有 `popup/style.css` class；**禁止**本版重畫主題
- **秘密欄位：** 無新密碼欄。類 B（`type="text"` + `wallet-pwd-masked`）維持；禁止改回 `type="password"` 或 `autocomplete="current-password"`／`new-password`

## 產品句

把 0.15.0 popup 裡「可變 `session` 當第二套 store、每次按鍵 `bump` 整棵樹」的過渡收掉：畫面暫存改由 React state／context 持有，導航與殼層收成可讀的對照表，刪已無主路徑的死碼。Service worker、content、inject、popout、審批殼仍 vanilla。使用者可見行為、命令字串、storage key、pending 生命週期與 0.15.0 相同。

## 文件地圖

1. 本檔
2. [docs/popup-react-cleanup-how.md](./docs/popup-react-cleanup-how.md)（state 分層、跨畫面草稿、Back／dock 表、刪檔）
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.15.0](../0.15.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)（審批宿主語意）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 與上一版 | 0.13.0／0.15.0 的宿主矩陣、`uiHost`、`ui.abortPending`、`walletSend` 成功時序、網站請求仍 popout、pending 只在 SW `Map`、不進 `chrome.storage`、結果不廣播全 tab、命令字串、storage key、`View` 聯集與 `SUBPAGE_TITLES`、類 B 密碼欄、金額規則：**全部不變**。本版只改 popup **怎麼持有暫存與怎麼組件分層** |
| 範圍 | **產品碼只改 `wallet/src/popup/`**，以及刪除本版點名或「無主路徑引用的 popup vanilla 殘留」檔（見 HOW）。允許出貨時改版本號檔：`wallet/package.json`、`wallet/manifest.config.ts`、倉庫根 `version.md`、`changelog.md`。允許為了斷死碼而改 `popup/lib/index.ts` 的 re-export。`background/`、`shared/`、`content/`、`inject/`、`approval/`、`popout/` **不**改產品語意、**不**改成 React。`mountApprovalShell`／`disposeApprovalShell` 函式名與行為不變。`ApprovalHost` 仍用完整 `appr-*` 骨架＋effect mount；mount 後 React 不覆寫該子樹 |
| 依賴 | **不加** npm 套件。維持 0.15.0 已允許的 `react`、`react-dom`、`@vitejs/plugin-react`、`@types/react`、`@types/react-dom`。禁止 React Router、Zustand、Redux、Jotai、或任何把 pending／vault 放進客戶端持久 store 的套件 |
| 廢止 `session` 主路徑 | 出貨時 popup **不得**再以模組級可變物件 `lib/session.ts` 的 `session.*` 作為畫面權威，也不得用 `bindPopupShell` 把 `navigateTo`／`refresh`／`showError`／`bump` 掛成全域函式指標。出貨時刪除或清空 `bindPopupShell` 與已無引用的 `session` 匯出。允許 Track 內短暫雙軌 |
| 廢止全樹 tick | 禁止再用「改草稿 → `bumpUi()`／`dispatch({type:"tick"})`」當**表單輸入**的主更新路徑。各畫面輸入用該畫面（或明確的跨畫面 provider）的 React state，讓輸入只重繪該子樹 |
| 錢包鏡像 | 維持單一 `useReducer`（或同等單一 React store）持有與今日 `State` 同形的鏡像。來源仍 `wallet.getState`。`chrome.storage.onChanged` 僅 `area === "local"` 且四 key：`airwave.accounts.v1`、`airwave.activeAccountId.v1`、`airwave.settings.v1`、`airwave.connections.v1`。禁止 pending 進此 store 當權威 |
| 跨畫面必須存活的暫存 | 下列欄位在對應導航期間**不得**因畫面卸載而丟失，須放在 **App 層**（reducer 或 App 不卸載的 context）：① `currentView`；② `detailTokenId`（token-detail ↔ token-send ↔ send-approval，直到 Back 出詳情才清）；③ `activeWalletSendRequestId`（僅 UI 導航記憶，權威仍是 SW Map）；④ Home 成功載入過的持倉列快取（詳情／送出頁讀同一批列，不因離開 `home-token` 卸載列表而清空，**僅**在 `activeAccountId` 變更時清——語意同今日 `lastSuccessfulTokenRows`；**鎖定不解鎖時不清此快取**）；⑤ `focusAccountId`：每次 `navigateTo(view, accountId?)` 有傳第二參時寫入（**含 `currentView === next` 的呼叫**），未傳時保留既有值；Manage／Reveal／Rename／刪除／combined 子操作讀此欄，不得只放會隨帳戶列表卸載的 `useState`（今日 Manage→Reveal 不帶 id）；⑥ Home 代幣列展開集合（今日 `expandedTokenRowIds`；**僅**切帳戶時清，鎖定不清）；⑦ 下次進 Home 是否 `force` 重抓持倉（今日 `homeAssetsForce`：錢包送出成功回 Home 時設真）。**送出表單** amount／recipient／錯誤放在 `TokenSendForm` **本地** `useState`（不放 App 層）。離開 `token-send` 且目標不是 `send-approval` 時清空；**進入** `token-send` 且來源不是 `token-send` 時亦清空（含從 `send-approval` 回來）。此清空規則以 **0.15.0 `performNavigate` 為準，明確覆蓋 0.13.0「點拒絕：popup 留在 token-send（欄位保留）」**——本版不恢復 0.13.0 的保留草稿。其餘表單草稿（建庫／解鎖密碼、產生／匯入／觀察／combined 建立、rename、reveal 明文、改密、RPC 編輯、API key 顯示態、選單開合）**預設為畫面本地**；離開／進入該 view 的清除規則必須與 HOW 表相同 |
| 導航 API | `navigateTo`／`handleBack`／殼底主行動仍存在，語意同 0.15.0（離 `send-approval` 且未 settled → `ui.abortPending`）。實作改由 React context（或 App 傳下的函式）提供，**不上** Router。Back 與 dock 的 view→行為用 **對照表** 寫在 HOW 並實作，禁止再維持與表不一致的超長 if 鏈當唯一真相 |
| 錯誤 toast | 仍約 4 秒消失、可點關閉、換頁即清。實作可放 App 層 state，不經 `session.errorMessage`＋bump |
| 審批 | 與 0.15.0 相同：完整 `appr-*`、`host: "popup"`、`elementIdPrefix: "appr-"`、連續兩次送出先 dispose 再 mount、`pagehide`／`beforeunload` abort。本版**不**把 `approval/shell.ts` 改成 React |
| 密碼／數字 | 類 B 不變。金額規則不變；不引入 `big.js` |
| 死碼 | 出貨前刪除已無主路徑引用者，至少包括：`wallet/src/popup/lib/icons.ts`；`wallet/scripts/html-body-to-jsx.mjs`、`wallet/scripts/fix-popup-markup-visibility.mjs`；以及若仍存在且未被 React 主路徑 import 的 vanilla 殘留：`popup/main.ts`、`popup/lib/dom.ts`、`accounts/accounts-ui.ts`、`accounts/combined-ui.ts`、`home/tokens-ui.ts`、`send/send-flow.ts`、`settings/settings-ui.ts`。凡仍含 `bindPopupShell` 或把 `session.*` 當畫面權威、且無主路徑引用的 popup 檔一律刪。畫面條件渲染優先於為舊 DOM 保留的 `hidden={true}` 雙塊（Burner 成功態、Reveal 遮罩／明文等），**外觀與文案不變** |
| 殼檔分層 | 允許把今日 `PopupMarkup.tsx` 拆成「頂欄／底欄／選單殼」與「依 View 選畫面」兩個（或同等）檔；禁止為拆檔改 class 名或文案 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.16.0`。狀態改 `shipped` 仍須使用者同意 |

## 非目標

- 把 `approval/shell.ts` 改成 React
- Popout、service worker、content、inject 上 React
- React Router、Zustand／Redux／其它客戶端狀態庫
- 重寫 `style.css` 主題、或為 React 另開一套 class
- 改 custody、pending 形狀、訊息名、storage key、Wallet Standard 能力表
- Sidebar、聚合送出、地址簿、Agent、i18n、Home Activity 產品本體
- 為拆檔而重寫 accounts／settings 業務命令
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.15.0 | 0.16.0 |
|--------|--------|
| Popup 已是 React；`session`＋`bumpUi` 仍驅動多數表單 | 表單 React state；廢止 `session`／`bindPopupShell` 主路徑 |
| `runtime.ts` 超長 if 導航 | Back／離開清除／dock 以 HOW 表為準 |
| 遷移腳本與 `lib/icons.ts` 殘留 | 刪除無引用者 |
| 行為即契約 | **行為不變** |

## 實作 Track

### Track 1 — App 層 state 與導航 context

- **做：** 把 `currentView`、錢包鏡像、錯誤 toast、以及已定案①–⑦跨畫面暫存（含 `focusAccountId`、持倉快取、展開列、`homeAssetsForce`）放進 App 層。提供 context：`navigateTo`、`refresh`、`showError`、`clearError`（不再 `bindPopupShell`；**禁止**每 render 再 bind 一份 runtime）。`onChanged` 四 key 不變。將 `usePopupController` 的 settled／pagehide／初始 refresh 收進 App（或單一 lifecycle hook）。
- **不做：** 一次改完所有子頁表單；改審批殼；加依賴。
- **驗收：** typecheck；鎖定／建庫／Home 仍能靠 App 層 state 切換（可暫留部分子頁讀舊 `session`，但新導航必須走 context）。

### Track 2 — 各畫面改本地 state；對齊離開清除表

- **做：** 依 HOW 的清除表，把僅屬該 view 的草稿改為元件 `useState`（或該領域小 provider）。**送出表單**用 `TokenSendForm` 本地 state。Home 持倉快取／展開／force 讀 App 層。離開 view 的副作用（abort、清 reveal、reset import seed 等）只走 `navigateTo` 實作，與 HOW 表一致。
- **不做：** 改命令字串；改文案。
- **驗收：** typecheck；靜態：子頁輸入不再呼叫 `bumpUi`。進入 `token-send` 且來源不是該 view 則清空草稿（含從審批回來）。

### Track 3 — Back／dock 表與殼拆檔

- **做：** `handleBack` 與殼底主行動改為 HOW 的對照表（或由該表生成的結構）。可拆 `PopupMarkup` 為殼＋畫面路由。Burner／Reveal 等改條件渲染。
- **不做：** 改 Back 產品語意（表必須複製今日行為）。
- **驗收：** typecheck；讀碼：每個 `View` 的 Back 目標與 HOW 表一致。

### Track 4 — 刪死碼與 build

- **做：** 刪 `session`／`bindPopupShell` 主路徑與 HOW 點名的 icons／scripts；`npm run typecheck` 與 `npm run build`。
- **不做：** 新依賴。
- **驗收：** 全倉 popup 無 `bindPopupShell`、無作為畫面權威的 `session.` 賦值（測試／註解除外）；typecheck／build 通過。

## 驗收（出貨 checklist）

- [x] 無模組級 `session`／`bindPopupShell` 畫面主路徑；表單輸入不以全樹 `tick` 為主更新
- [x] 無新增 npm 依賴；無 Router／Zustand／Redux
- [x] `background`／`approval`／`popout`／`content`／`inject` 未改為 React；審批橋接語意與 0.15.0 相同
- [x] 命令字串與 storage key 與 0.15.0 相同
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 手驗（未封裝擴充）：建庫或解鎖；Home 持倉；Settings；新增／匯入帳戶主路徑；送出進 popup 審批不開 popout；審批拒絕或 Back 回送出後可再送（草稿清空規則與 0.15.0 相同）；連續兩次送出；離審批 pending 結束可再送；網站 connect／sign 仍 **popout**。若環境無法載入擴充，實作審查逐條寫「未在瀏覽器走完」
- [x] 類 B 密碼欄未改回 `type="password"`
- [x] HOW 點名的死碼檔已刪或證明仍被主路徑需要而 INDEX 改口留下
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/lib/session.ts` | 本版要廢止的模組級暫存與 `bindPopupShell` |
| `wallet/src/popup/runtime.ts` | 今日 navigate／Back／dock／離開清除；收斂成表＋context |
| `wallet/src/popup/App.tsx`、`state/usePopupAppState.ts`、`usePopupController.ts` | 殼層合併 |
| `wallet/src/popup/PopupMarkup.tsx` | 可拆殼／畫面 |
| `wallet/src/popup/components/ApprovalHost.tsx` | 審批橋接維持 |
| `wallet/src/approval/shell.ts` | 本版不重寫 |
| `wallet/src/popup/lib/icons.ts` | 預期刪除 |
| `wallet/scripts/html-body-to-jsx.mjs`、`wallet/scripts/fix-popup-markup-visibility.mjs` | 預期刪除 |
| `docs/roadmap/0.15.0/INDEX.md`、`docs/roadmap/0.13.0/INDEX.md` | 行為與審批宿主不可推翻 |
