# 0.15.0 — Popup 改 Vite React（行為不變）

- **狀態：** `shipped`
- **上游版本：** [0.14.0](../0.14.0/INDEX.md)（目錄化已落地；本版只改 **popup 渲染技術**，不改訊息／storage／pending／審批殼產品語意）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃訪談（2026-10-06）；構想檔已於出貨時自 backlog 刪除
- **畫面：** 使用者可見行為與 0.14.0 相同。視覺沿用 [`docs/design-principles.md`](../../design-principles.md) 與現有 `popup/style.css` class；**禁止**本版重畫主題
- **秘密欄位：** 無新密碼欄。既有類 B（`type="text"` + `wallet-pwd-masked`／同等遮罩）維持；禁止改回 `type="password"` 或 `autocomplete="current-password"`／`new-password`

## 產品句

把 **popup** 從命令式 DOM 改成 Vite + React functional component，讓畫面成為 `wallet.getState` 鏡像與 `View` 的函數。Service worker、content、inject、popout、共用審批殼仍用現有 TypeScript／vanilla。使用者可見行為、命令字串、storage key、pending 生命週期與 0.14.0／0.13.0 相同。

## 文件地圖

1. 本檔
2. [docs/popup-react-how.md](./docs/popup-react-how.md)（依賴、掛載、state、審批橋接、檔案樹）
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.14.0](../0.14.0/INDEX.md)、[0.13.0](../0.13.0/INDEX.md)（審批宿主語意）
5. [HANDOFF.md](./HANDOFF.md)
6. 構想檔已於出貨時自 backlog 刪除

## 已定案

| 題 | 決定 |
|----|------|
| 與上一版 | 0.13.0／0.14.0 的宿主矩陣、`uiHost`、`ui.abortPending`、`walletSend` 成功時序、網站請求仍 popout、pending 只在 SW `Map`、不進 `chrome.storage`、結果不廣播全 tab、命令字串、storage key：**全部不變**。本版只改 popup 怎麼畫 |
| 範圍 | **產品畫面碼只遷 `wallet/src/popup/`。** 允許且必須改建置三檔：`wallet/package.json`、`wallet/vite.config.ts`、`wallet/tsconfig.json`（僅為本版約定依賴與 jsx）。`background/`、`shared/`、`content/`、`inject/`、`approval/`、`popout/` **不**改成 React。`approval/shell.ts` 的 `mountApprovalShell`／`disposeApprovalShell` 函式名與行為不變。`popout/main.ts` 維持薄宿主掛同一審批殼；`popout/index.html` 骨架本版不遷 |
| 依賴 | 在 `wallet/` 新增且**僅**允許：`react`、`react-dom`（`dependencies`）；`@vitejs/plugin-react`（`devDependencies`）。**例外（typecheck 證明）：** 本倉庫所用 React 19.3 套件**沒有**內建 TypeScript 宣告，`tsc` 會報 `TS7016`（找不到 `react`／`react/jsx-runtime` 宣告）。因此允許 `devDependencies` 再加 `@types/react`、`@types/react-dom`（僅型別，非 runtime、非 UI 框架）。禁止 React Router、Zustand、Redux、Jotai、或任何會把 pending／vault 放進客戶端持久 store 的套件。禁止本版為 UI 再引入其它 UI 框架 |
| 建置 | 現有 Vite 6 + `@crxjs/vite-plugin` 保留。`vite.config.ts` 加入 `@vitejs/plugin-react`。`tsconfig.json` 加 `"jsx": "react-jsx"`。manifest／Vite 的 popup HTML 路徑仍是 `src/popup/index.html` |
| 掛載 | `popup/index.html` 改為薄殼：載入既有 `style.css`（及今日 `main.ts` 已 import 的 `../popout/style.css` 若仍需要），`<body>` 內只留一個 React root（建議 `id="root"`）。**刪除**目前 HTML 裡大段靜態 `<section>`／表單 markup；同等結構改由 React 元件輸出。元件繼續使用現有 CSS class 名（`shell`、`top-bar`、`primary-btn`、`wallet-pwd-masked` 等），禁止本版重寫 `style.css` 主題 |
| 元件風格 | 畫面一律 **functional component**。禁止 class component。可用 hooks：`useState`、`useEffect`、`useRef`、`useReducer`（僅限畫面本地）、以及 React 官方穩定 API。禁止自造第二套命令式 DOM 渲染總線與 React 並存當主路徑 |
| 導航 | 保留今日 `View` 聯集與 `SUBPAGE_TITLES` 語意（見 `popup/types.ts`）。用 React state 持有 `currentView`（及今日 `session` 裡同等的畫面暫存：`detailTokenId`、`activeWalletSendRequestId`、表單草稿等）。**不上** React Router。`navigateTo` 語意（含離 `send-approval` 時 abort pending）必須與 0.13.0／現行相同 |
| 錢包 state | Popup 用 React state（或單一 `useReducer`）持有與今日 `State` 同形的鏡像：`vaultExists`、`unlocked`、`accounts`、`activeAccountId`、`settings`、`connections`。來源仍是 `wallet.getState`。`chrome.storage.onChanged` 僅在 `area === "local"` 且變更鍵為下列**四個**之一時觸發重新 `getState`：`airwave.accounts.v1`、`airwave.activeAccountId.v1`、`airwave.settings.v1`、`airwave.connections.v1`（與今日 `main.ts` 相同；禁止漏聽或多聽其它 key 當主路徑）。**禁止**把 pending 請求寫進 React state 當權威；審批 payload 仍向 SW 取 |
| 審批橋接 | `View === "send-approval"` 時，React 必須先輸出與今日 `popup/index.html` 內 `#approval-root` **同等的 `appr-*` DOM 骨架**（完整 id 清單見 HOW；對照 `approval/shell.ts` 的 `mountApprovalShell` 內 `q(root, …)`）。`mountApprovalShell` **不**建立 markup，缺節點會 throw——禁止只掛空 `<div id="approval-root" />`。以 `useRef` 取得該 root，呼叫既有 `mountApprovalShell`（`host: "popup"`、`elementIdPrefix: "appr-"`）。**自 mount 成功起至 dispose 為止，該子樹由 `approval/shell.ts` 擁有**：React 不得再 reconcile／覆寫其 `hidden`、文字或子節點（實作可用：effect 內 mount、cleanup dispose；骨架用 `dangerouslySetInnerHTML` 一次寫入後不再受控；或把 host 包成 `memo`／`key={requestId}` 且父層 refresh 不傳會改骨架的 props——擇一寫進 HOW 並遵守）。離開該 view、卸載、`pagehide`／`beforeunload`：呼叫 `disposeApprovalShell`／今日 `abortWalletSendOnPopupUnload` 語意。連續兩次送出：第二次 mount 前必須先 dispose（現碼 `mountApprovalShell` 開頭已 dispose，橋接不可繞過）。禁止本版把 `approval/shell.ts` 重寫成 React |
| 事件 | `ui.walletSendSettled`／progress 仍聽 `chrome.runtime.onMessage`（擴充頁）。關 popup／離審批 view → `ui.abortPending`。行為對齊 0.13.0 HOW |
| 密碼／秘密 | 建庫、解鎖、Reveal、改密、助記詞欄：維持類 B 遮罩與「離開畫面清明文」的現行語意。React 受控 input 不得改成瀏覽器密碼管理員友善的 `type="password"` |
| 數字 | 金額／餘額顯示與加減規則不變。本版不引入 `big.js`，不改用 `number` 做鏈上整數運算 |
| 舊檔 | 出貨時 popup 主路徑不得再依賴被取代的命令式 `render*`／**模組頂層** `getElementById` 總表（今日 `popup/lib/dom.ts` 的 `el`／`elApprovalRoot` 等）作為畫面權威。改由 React 樹、ref、或元件掛載後查詢。允許短暫過渡（Track 內）雙軌，但 Track 結束前須刪除或清空已遷移模組，避免兩套 UI 並存 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts` 的 `version`、倉庫根 `version.md`、`changelog.md` 對齊 `0.15.0`。狀態改 `shipped` 仍須使用者同意出貨 |

## 非目標

- 把 `approval/shell.ts` 改成 React（下一版構想；本版只橋接）
- Popout、service worker、content、inject 上 React
- React Router、Zustand／Redux／其它客戶端狀態庫
- 重寫 `style.css` 主題、或為 React 另開一套 class
- 改 custody、pending 形狀、訊息名、storage key、Wallet Standard 能力表
- Sidebar、聚合送出、地址簿、Agent、i18n 產品本體
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.14.0 | 0.15.0 |
|--------|--------|
| Popup 已按資料夾分檔，仍是 vanilla DOM | Popup 改 React functional component |
| 無 React 依賴 | 僅 `react`／`react-dom`／`@vitejs/plugin-react` |
| `index.html` 含大段靜態 markup | HTML 薄 root；markup 進元件 |
| 審批殼已抽出純函式，本體仍 vanilla | **維持** vanilla；popup 用 ref 容器掛載 |
| 行為即契約 | **行為不變** |

## 實作 Track

### Track 1 — 工具鏈

- **做：** 安裝允許的三個套件；`vite.config.ts` 加 React plugin；`tsconfig` 開 `jsx`；確認 `cd wallet && npm run typecheck` 在尚未改畫面時仍過（可先加空 `.tsx` 煙測檔再刪，或直接進 Track 2）。
- **不做：** 加其它依賴；改 background。
- **驗收：** `package.json` 僅多出約定三套件，以及已定案允許的 `@types/react`／`@types/react-dom`；`npm run typecheck` 通過。

### Track 2 — App 殼與 state 鏡像

- **做：** `main.tsx`（或同等）`createRoot` 掛 `#root`。實作與今日同等的：初始 `wallet.getState`、`storage.onChanged` → refresh、鎖定／未建庫／殼三態切換、頂欄／底欄 Home 結構、`View` 導航狀態。先讓「空殼＋鎖定／Home 佔位」能開 popup。
- **不做：** 一次搬完所有子頁業務；改審批殼。
- **驗收：** typecheck；未封裝擴充能打開 popup 見鎖定或 Home 殼（若無 vault 則建庫流至少有佔位或已遷入）。

### Track 3 — 遷移各畫面

- **做：** 依 `home`／`accounts`／`settings`／`onboarding`／`send`（表單，不含審批殼內核）把現行畫面改為 functional component。對齊 design-principles 頁殼（頂欄釘住、中間捲、殼底主行動）。行為與命令呼叫與遷移前相同。
- **不做：** 改文案產品語意；重寫 CSS 主題。
- **驗收：** typecheck；靜態：無新增 Router／Zustand。

### Track 4 — 審批橋接與卸載

- **做：** `send-approval` view 掛 `mountApprovalShell`；`pagehide`／`beforeunload`／離 view → abort／dispose 對齊現行 `approval-host.ts`。`walletSendSettled` 失敗回送出頁。
- **不做：** React 重寫 `approval/shell.ts`。
- **驗收：** typecheck；連續兩次送出路徑在程式上仍先 dispose 再 mount（讀碼可證）。

### Track 5 — 清理與 build

- **做：** 移除已無引用的 vanilla popup 渲染模組／巨大靜態 HTML 殘留；`npm run typecheck` 與 `npm run build`。版本號對齊文件於出貨時（實作中可先改 version 欄，shipped 仍待同意）。
- **不做：** 新依賴。

## 驗收（出貨 checklist）

- [x] Popup 主路徑為 React（`createRoot`／functional components）；無第二套命令式全頁 render 主路徑
- [x] `package.json` 僅新增 `react`、`react-dom`、`@vitejs/plugin-react`，以及已定案允許的 `@types/react`／`@types/react-dom`；無 Router／Zustand／Redux
- [x] `background`／`approval`／`popout`／`content`／`inject` 未改為 React
- [x] 命令字串與 storage key 與 0.14.0 相同
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 手驗（未封裝擴充）：建庫或解鎖；Home 持倉可見；Settings 可開；新增／匯入帳戶流可走完主路徑；代幣送出進 popup 審批且不另開 popout；連續兩次送出都能進審批；拒絕與批准底欄可見；**關 popup 或 Back／導離 `send-approval`（未 settled、無 broadcastSig）後該 pending 結束，且可再走送出**；網站 connect 或 sign 仍開 **popout**。若環境無法載入擴充，實作審查逐條寫「未在瀏覽器走完」
- [x] 類 B 密碼欄未改回 `type="password"`
- [x] 文件與程式無真實密碼／助記詞／私鑰

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/main.tsx` | React 入口（`createRoot`） |
| `wallet/src/popup/index.html` | 改薄 root；路徑不搬 |
| `wallet/src/popup/style.css` | class 名沿用；本版不重寫主題 |
| `wallet/src/popup/types.ts` | `State`／`View` 契約 |
| `wallet/src/popup/send/approval-host.ts` | 審批掛載語意；遷入 React 橋接 |
| `wallet/src/approval/shell.ts` | 維持 mount／dispose；本版不重寫 |
| `wallet/vite.config.ts`、`wallet/tsconfig.json`、`wallet/package.json` | React plugin／jsx／依賴 |
| `wallet/manifest.config.ts` | popup HTML 路徑不可改 |
| `docs/roadmap/0.13.0/INDEX.md` | 審批宿主語意不可推翻 |
