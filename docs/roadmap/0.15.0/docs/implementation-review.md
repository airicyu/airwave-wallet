# Implementation review — 0.15.0 Airwave Wallet

- **日期：** R1 2026-10-06；R2 2026-10-06（Asia/Hong_Kong）
- **輪次：** R1 初審＋R2 獨立複審（本檔累加；穩定 ID 勿重編號）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`popup-react-how.md`](./popup-react-how.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；不以 chat history 為準

---

## 總評

**R1：出貨門檻未通過。** 工具鏈（React 依賴、`jsx`、薄 `index.html`、`createRoot`）、審批 `appr-*` 骨架、`dom.ts` lazy 查詢、非 popup 子系統未改 React、`typecheck`／`build` 在靜態上達標。但 **Track 2／3 未完成**：wallet 鏡像與 `View` 仍靠模組級 `session`＋命令式 `render*`／`section.hidden`，與 INDEX「React 主路徑、functional component 畫面」已定案不符。手驗 checklist **未在瀏覽器走完**。

**R2（獨立複審）：靜態契約已達標。** H1／H2／M2／M3 **關閉**。Popup 主路徑為 `createRoot` → `App` → `PopupMarkup` 與各畫面 functional component；`useReducer` 持有 wallet 鏡像；`onChanged` 僅四 local key；`ApprovalHost` 以完整 `appr-*` innerHTML 掛 `mountApprovalShell`（`host: "popup"`、`elementIdPrefix: "appr-"`）；vanilla `render*` 模組與 `lib/dom.ts`／`main.ts` 已自 working tree 刪除。無 Router／Zustand。`@types/react`／`@types/react-dom` 已由現行 INDEX 已定案允許。`npm run typecheck` 與 `npm run build` 通過。

**出貨（2026-10-06）：** 使用者確認未封裝擴充錢包基本功能可用；INDEX 改 `shipped`。M1／L1 關閉。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| H1 | 命令式 `render*` 仍為 popup 主路徑 | **關閉（R2）** | R1：`usePopupController` 內 `render(state)`／`applyViewChrome` 與各 `render*` 仍驅動 UI。R2：入口為 `main.tsx` `createRoot`；`PopupMarkup` 依 `currentView` **條件渲染**各 screen FC（accounts／settings／onboarding／send／home）；`applyViewChrome` 僅 `bumpUi()`。working tree 已刪 `main.ts`、`accounts-ui.ts`、`settings-ui.ts`、`tokens-ui.ts`、`send-flow.ts`、`combined-ui.ts`、`lib/dom.ts`。載入圖無第二套全頁 `render*` 總線。 | — |
| H2 | Wallet state 鏡像未用 React state／useReducer | **關閉（R2）** | R1：鏡像在 `session.lastState`。R2：`usePopupAppState` 以單一 `useReducer` 持有 `wallet`／`currentView`／`tick`；`refresh` 呼叫 `wallet.getState` 後 `setWallet`。`session.lastState` 仍作 helper 暫存（INDEX 允許畫面暫存），非畫面權威。 | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | 手驗未在瀏覽器走完 | **關閉（出貨）** | 審查環境未載入擴充。使用者於 2026-10-06 確認未封裝擴充錢包基本功能可用，同意出貨。 | — |
| M2 | 額外 devDependency `@types/react`／`@types/react-dom` | **關閉（R2）** | R1 時 HOW 預設勿加 `@types/*`。現行 INDEX 已定案：「React 19.3 無內建宣告、允許 `devDependencies` 加 `@types/react`／`@types/react-dom`（僅型別）」。HOW 已對齊。套件仍為允許清單內，非 Router／Zustand。 | — |
| M3 | `usePopupController` 實質為舊 `main.ts` 搬入 `useEffect` | **關閉（R2）** | R1 附 H1。R2：該 hook 僅綁 `walletSendSettled`、`beforeunload`／`pagehide` abort、初始 `refresh`；畫面由 React 樹更新。事件／導航邏輯在 `runtime.ts`，非命令式全頁 render 總線。 | — |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | 版本號已對齊、INDEX 仍 `in progress` | **關閉（出貨）** | INDEX 已 `shipped`；`package.json`／manifest／`version.md`／`changelog.md` 對齊 0.15.0。 |
| L2 | 生成器 `wallet/scripts/html-body-to-jsx.mjs` | **開啟** | 仍存在（另有 `fix-popup-markup-visibility.mjs`）。未在 INDEX／HOW 列為交付物。出貨前可文件化或刪除若不再使用。 |
| L3 | `abortWalletSendOnPopupUnload` 雙份定義 | **關閉（出貨）** | `send/approval-host.ts` 改為 re-export `components/ApprovalHost.tsx` 同一函式。 |

---

## 驗收對照

INDEX 出貨 checklist。手驗列一律標 **未在瀏覽器走完**（本審查環境未載入擴充）。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| Popup 主路徑為 React；無第二套命令式全頁 render 主路徑 | **通過（靜態，R2）** | `index.html` 僅 `#root`＋`main.tsx`；`App`／`PopupMarkup`／各 `*Screens.tsx` 為 FC；已刪 vanilla `render*` 模組。 |
| `package.json` 僅新增約定三套件；無 Router／Zustand／Redux | **通過（R2）** | `react`、`react-dom`、`@vitejs/plugin-react`；另 `@types/react`、`@types/react-dom` 已由 INDEX 允許。無 Router／Zustand／Redux／Jotai。 |
| `background`／`approval`／`popout`／`content`／`inject` 未改 React | **通過** | `git diff` 對上述路徑無輸出；`from "react"` 僅 `wallet/src/popup/`。`popout/main.ts` 仍 vanilla `mountApprovalShell`。 |
| 命令字串與 storage key 與 0.14.0 相同 | **通過** | `wallet/src/shared/commands.ts`、`storage-keys.ts` 相對 HEAD 無 diff。 |
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 見測試紀錄（R1＋R2）。 |
| 手驗（建庫／解鎖、Home、Settings、帳戶流、popup 審批、連續兩次送出、拒絕／批准底欄、離開審批 pending 結束、網站 connect／sign 仍 popout） | **通過（使用者 2026-10-06）** | 使用者確認未封裝擴充錢包基本功能可用並同意出貨。 |
| 類 B 密碼欄未改回 `type="password"` | **通過（靜態）** | `WalletPasswordInput` 為 `type="text"`＋`wallet-pwd-masked`；`APPROVAL_ROOT_HTML` 解鎖欄同；`wallet/src` 的 ts／tsx／html 無 `type="password"`、無 `current-password`／`new-password`。 |
| 文件與程式無真實密碼／助記詞／私鑰 | **通過** | 0.15.0 roadmap、本次讀過之 popup 源碼未見真實秘密。 |

### Track 對照（摘要）

| Track | 結果 | 備註 |
|-------|------|------|
| 1 工具鏈 | **通過** | `vite.config.ts` 含 `react()`＋`crx`；`tsconfig` `"jsx": "react-jsx"`。 |
| 2 App 殼與 state 鏡像 | **通過（R2）** | `useReducer`＋四 key `onChanged`；鎖定／未建庫／殼三態由 `PopupMarkup` 分支。 |
| 3 遷移各畫面 | **通過（靜態，R2）** | 各領域 `.tsx` FC；無 Router／Zustand。行為手驗未走。 |
| 4 審批橋接 | **通過（靜態，R2）** | 完整 `appr-*`；`memo`＋`dangerouslySetInnerHTML`；離 view 卸載＋abort。未手驗殼與底欄。 |
| 5 清理與 build | **通過（靜態，R2）** | 約定 vanilla 渲染模組已刪；typecheck／build 過。腳本生成器仍在（L2）。 |

### 架構禁區（GUIDELINES／INDEX）

| 項 | 結論 | 靜態證據 |
|----|------|----------|
| Pending 不進 React 權威 store | **符合** | `session.activeWalletSendRequestId` 為 UI 導航欄；審批仍向 SW 取 payload。reducer 無 pending 權威欄。 |
| `onChanged` 僅四 local key | **符合** | `usePopupAppState.ts` `STORAGE_KEYS` 與 INDEX 列名一致；`area !== "local"` 忽略。 |
| 不把 `approval/shell.ts` 改成 React | **符合** | `approval/` 無 diff；popup 仍 `mountApprovalShell`。 |
| `dom.ts` 頂層 `getElementById` 總表 | **符合（R2）** | `lib/dom.ts` 已刪；index 不再 export 該模式。 |
| React 不得覆寫已 mount 的審批子樹 | **符合（靜態，R2）** | `ApprovalHost` `memo` 且僅 `requestId` prop；骨架一次 innerHTML；離 view 條件卸載。未在瀏覽器驗證 reconcile。 |

---

## 測試紀錄

尚無整包單測指令。未跑 `bun test`。cwd 皆為 `wallet/`。

| 指令 | 結果 | 備註 |
|------|------|------|
| `npm run typecheck` | **通過** | R1；R2 再跑 `tsc --noEmit`，exit 0 |
| `npm run build` | **通過** | R1；R2 再跑 `tsc --noEmit && vite build`，exit 0，vite 6.4.3，約 3.29s |

手驗：**未在瀏覽器走完**（未載入未封裝擴充，未開 test-web）。逐條：

- 建庫或解鎖：**未在瀏覽器走完**
- Home 持倉可見：**未在瀏覽器走完**
- Settings 可開：**未在瀏覽器走完**
- 新增／匯入帳戶流主路徑：**未在瀏覽器走完**
- 代幣送出進 popup 審批且不另開 popout：**未在瀏覽器走完**
- 連續兩次送出都能進審批：**未在瀏覽器走完**
- 拒絕與批准底欄可見：**未在瀏覽器走完**
- 關 popup 或 Back／導離 `send-approval`（未 settled、無 broadcastSig）後 pending 結束且可再送出：**未在瀏覽器走完**
- 網站 connect 或 sign 仍開 popout：**未在瀏覽器走完**

---

## 修復追蹤

| ID | 狀態 | 修復輪 | 備註 |
|----|------|--------|------|
| H1 | **關閉** | R2 核實 | 出貨必關項已關 |
| H2 | **關閉** | R2 核實 | 出貨必關項已關 |
| M1 | 非阻擋 | — | 須本機手驗後方可 shipped |
| M2 | **關閉** | R2 | INDEX 已允許 `@types/*` |
| M3 | **關閉** | R2 核實 | 隨 H1 |
| L1 | 開啟 | — | 出貨時改 INDEX 狀態 |
| L2 | 開啟 | — | 可選 |
| L3 | 開啟 | R2 新 | 可選去重 |

---

## 歷審摘要

| 輪 | 日期 | 結論 |
|----|------|------|
| R1 | 2026-10-06 | 建置與工具鏈通過；H1／H2 未關；手驗未走完；出貨門檻未過 |
| R2 | 2026-10-06 | **獨立複審：** H1／H2／M2／M3 關閉；無剩餘 HIGH；typecheck／build 通過；手驗未走完；在手驗完成前不宜 shipped |

## R2 修復摘要（實作 session）

下列為實作側自述（R1 後寫入），**獨立複審不以該段為準**；R2 以 working tree 核實後覆寫結論（見下節）。

- 新增 `state/usePopupAppState.ts`（wallet 鏡像 + `currentView` + 四 key `onChanged`）、`PopupContext`、`App` 組裝。
- `PopupMarkup` 改 React 控制 setup／locked／shell／各 screen `hidden`；嵌入 `HomeTokenList`、`TokenDetailView`、`WalletWidget`。
- `usePopupController(api)` 改接 `controllerApi.refresh`／`setCurrentView`／`bump`；移除命令式 screen `hidden` 迴圈與 setup 三態 DOM 切換。
- **仍開：** H1 其餘子頁 `render*`（accounts、settings、send 表單、onboarding 等）。M2 `@types/react` 仍保留。

---

## R2 獨立複審（2026-10-06）

對照基準＝現行 `INDEX.md`（含 `@types/react` 例外）＋ HOW＋HANDOFF。不認 chat；不認上列實作自述的「H1 仍開」。

### 核實要點

- **主路徑 React：** `popup/index.html` 薄 `#root`；`main.tsx` `createRoot(<App />)`。`PopupMarkup` 以 `currentView === … ? <Screen/> : null` 分支，非平行 DOM `hidden` 全頁表。無 class component。無 React Router／Zustand／Redux。
- **鏡像：** `usePopupAppState` `useReducer`；`chrome.storage.onChanged` 僅 `airwave.accounts.v1`、`airwave.activeAccountId.v1`、`airwave.settings.v1`、`airwave.connections.v1`。
- **ApprovalHost：** `APPROVAL_ROOT_HTML` 含 HOW／`shell.ts` `q()` 全部 base id（prefix `appr-`）；`mountApprovalShell({ host: "popup", elementIdPrefix: "appr-" }, el)`；effect cleanup＝dispose；`mountApprovalShell` 開頭仍 `disposeApprovalShell()`。導離 `send-approval`：`runtime.performNavigate` 先 `ui.abortPending`，條件渲染卸載宿主。
- **類 B：** 受控密碼為 `type="text"`＋`wallet-pwd-masked`。
- **範圍：** `background`／`approval`／`popout`／`content`／`inject` 無 React。`style.css` 相對 HEAD 僅 `.word-slot .word-n` 一則選擇器，非主題重寫。
- **已刪（working tree）：** `main.ts`、`lib/dom.ts`、`accounts-ui.ts`、`combined-ui.ts`、`settings-ui.ts`、`tokens-ui.ts`、`send-flow.ts`。
- **依賴：** 允許清單＋INDEX 例外之 `@types/react`／`@types/react-dom`。
- **測試：** `cd wallet && npm run typecheck` 通過；`npm run build` 通過（本輪預期且已跑）。

### 狀態變更

關閉 H1、H2、M2、M3。M1 維持非阻擋。新增 L3（可選）。

### 出貨門檻（R2）

- [x] 無未關閉 **HIGH**
- [x] 同意的 **MEDIUM**：M2 已關；M1 標非阻擋
- [ ] INDEX **驗收** 手驗未勾（M1）
- [x] 該版 `typecheck`／`build` 已跑且通過
- [ ] backlog 列是否已清：本審查未改 backlog
- [ ] 使用者同意後再 git commit（未 commit）

---

## R1 審查環境

- OS：win32；PowerShell。cwd：`wallet/`（測試）、倉庫根（git）。
- 對照 HEAD 與 working tree（含 untracked `wallet/src/popup/*.tsx`、`docs/roadmap/0.15.0/`）。未 commit。
- 瀏覽器：未載入未封裝擴充。

## R2 審查環境

- OS：win32；PowerShell。cwd：`wallet/`（typecheck／build）、倉庫根（git／文件）。
- 對照 working tree 現況（含已刪之 vanilla 渲染檔、untracked React 畫面）。未 commit。不以 R1 與實作自述為現況真相。
- 瀏覽器：未載入未封裝擴充。
