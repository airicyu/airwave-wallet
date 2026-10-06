# Implementation review — 0.16.0 Airwave Wallet

- 日期：2026-10-07（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改程式、不改 INDEX／HOW、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收
- HOW／WHY／HANDOFF：[`popup-react-cleanup-how.md`](./popup-react-cleanup-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游：[`../../0.15.0/INDEX.md`](../../0.15.0/INDEX.md)、[`../../0.13.0/INDEX.md`](../../0.13.0/INDEX.md)（審批宿主／`uiHost`／pending；送出草稿以 0.16.0 已定案之 0.15.0 `performNavigate` 為準）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣（磁碟）：`wallet/src/popup/App.tsx`、`state/usePopupAppState.ts`、`state/PopupContext.tsx`、`runtime.ts`、`state/dock.tsx`、`PopupMarkup.tsx`、`send/TokenSendForm.tsx`、`components/ApprovalHost.tsx`、`accounts/AccountsScreens.tsx`、`onboarding/OnboardingScreens.tsx`、`settings/SettingsScreens.tsx`、`components/WalletPasswordInput.tsx`、`index.html`、`main.tsx`
- **總評：** 無未關閉 HIGH。`typecheck`／`build` 通過。使用者已手驗；INDEX `shipped`（與 0.17.0 一併出貨）。

## Findings（本輪）

關閉＝對照 INDEX／磁碟已滿足；仍開＝實作相對契約仍缺或未驗。穩定 ID 本檔內不重編號。

### HIGH

（無）

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | 使用者於未封裝擴充手驗通過，與 0.17.0 一併出貨。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **仍開**（非阻擋） | HOW／INDEX 要求 Back／dock 以對照表為真相、禁止超長 if 鏈當唯一真相。Back 已落在 `runtime.ts` 的 `BACK_PARENT`＋`handleBack` 特殊列。殼底 dock **未**集中成同等 lookup 表，改由各畫面 `useRegisterDock` 註冊。抽樣標籤／disabled（產生／完成、建立、匯入、下一步、建立 Combined、變更密碼、確認；`send-approval` 不註冊故 footer `hidden`）與 HOW 表一致。 |
| L2 | **仍開**（非阻擋） | HOW 離開／進入清除表多數動作（匯入／產生流 reset、reveal 清記憶體、改密三欄、RPC 編輯關閉、keys unreveal）由 **條件渲染卸載** 與 `screenEnterKey(view, navSeq)` 重掛達成，而非全部寫進 `navigateTo` 函式本體。`navigateTo` 本體處理：每次寫 focus（若有第二參，含同 view）、關選單、清 toast、`navSeq++`；`current !== next` 時離 `send-approval` 則 `ui.abortPending`、進出 `token-send` 清 `pendingSendFormError`。與 HANDOFF「離開副作用僅 current!==next；進入重置含同 view 再進」（`ENTER_RESET_VIEWS`＋`navSeq`）同向。 |
| L3 | **關閉** | `PopupMarkup` 的 `ApprovalHost` 已加 `key={activeWalletSendRequestId}`，連續兩次送出必卸載再 mount。 |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| 無模組級 `session`／`bindPopupShell` 畫面主路徑；表單輸入不以全樹 `tick` 為主更新 | **通過**（靜態） | 磁碟 `Get-ChildItem wallet/src/popup`：無 `lib/session.ts`。入口 `index.html` → `main.tsx` → `App`／`usePopupAppState`。磁碟 `rg`：popup 內無 `bindPopupShell`／`bumpUi`。錢包鏡像僅 `dispatch({ type: "setWallet" })`。`TokenSendForm` 輸入走本地 `useState`。 |
| 無新增 npm 依賴；無 Router／Zustand／Redux | **通過**（靜態） | `wallet/package.json` dependencies／devDependencies 仍為 0.15.0 已允許之 `react`、`react-dom`、`@vitejs/plugin-react`、`@types/react`、`@types/react-dom`；popup 無 react-router／zustand／redux／jotai 引用。 |
| `background`／`approval`／`popout`／`content`／`inject` 未改為 React；審批橋接語意與 0.15.0 相同 | **通過**（靜態） | 上述目錄無 `from "react"`／`createRoot`。`ApprovalHost`：`APPROVAL_ROOT_HTML` 含 `appr-*`；`mountApprovalShell({ host: "popup", elementIdPrefix: "appr-" })`；effect cleanup dispose；`pagehide`／`beforeunload` → `abortWalletSendOnPopupUnload`（唯一實作，`send/approval-host.ts` 僅 re-export）。拒絕／關閉：`navigateTo("token-send")` 不另寫表單錯誤。失敗 settled：先 `navigateTo("token-send")` 再 `setPendingSendFormError(notice.error ?? "已取消")`。Popout 仍 vanilla `mountApprovalShell({ host: "popout" })`。 |
| 命令字串與 storage key 與 0.15.0 相同 | **通過**（靜態抽樣） | `AirwaveCommand` 仍含 `ui.abortPending`、`wallet.beginSend`、`wallet.getState` 等既有名。onChanged 僅 local 四 key：`airwave.accounts.v1`、`airwave.activeAccountId.v1`、`airwave.settings.v1`、`airwave.connections.v1`。`STORAGE` 同形。dApp enqueue 仍 `uiHost: "popout"`＋`openPopout`；`walletSend` 仍 `uiHost: "popup"`。本輪未對 0.15.0 git blob 做逐字 diff。 |
| `cd wallet && npm run typecheck` 與 `npm run build` 通過 | **通過** | 見「測試結果」。無整包單元測試指令；未跑、未假設 `bun test`。 |
| 手驗（未封裝擴充）各條 | **通過** | 使用者 2026-10-07 確認。 |
| 類 B 密碼欄未改回 `type="password"` | **通過**（靜態） | `WalletPasswordInput`／`hardenWalletPasswordInput`：`type="text"`＋`wallet-pwd-masked`、`autoComplete="off"`。審批 HTML `#appr-unlock-password` 同。未見 `autocomplete="current-password"`／`new-password`。 |
| HOW 點名的死碼檔已刪或 INDEX 改口留下 | **通過**（磁碟清單） | **不以過時索引為準。** 磁碟不存在：`lib/session.ts`、`lib/icons.ts`、`lib/dom.ts`、`popup/main.ts`、`accounts/accounts-ui.ts`、`accounts/combined-ui.ts`、`home/tokens-ui.ts`、`send/send-flow.ts`、`settings/settings-ui.ts`、`wallet/scripts/html-body-to-jsx.mjs`、`wallet/scripts/fix-popup-markup-visibility.mjs`。`usePopupController.ts` 亦不存在（lifecycle 收進 `usePopupAppState`）。Burner 成功態／Reveal 遮罩改條件渲染，非雙塊 `hidden={true}`。 |
| 文件與程式無真實密碼／助記詞／私鑰 | **通過**（抽樣） | 本輪報告與已讀 0.16.0 契約檔未見真實秘密。`createGenerateSeedDraft` 執行期產生助記詞，未寫死向量。 |

## 測試結果

指令（INDEX／HOW）：`cd wallet && npm run typecheck`、`npm run build`。無整包單元測試指令。

| 指令 | 結果 |
|------|------|
| `npm run typecheck`（cwd `wallet/`） | 通過（`tsc --noEmit`，exit 0） |
| `npm run build`（cwd `wallet/`） | 通過（`tsc --noEmit && vite build`，Vite 6.4.3，233 modules，約 2.23s，exit 0） |

禁止寫入助記詞、私鑰、密碼。未載入未封裝擴充；手驗見 M1。

## 重點核對（對照 INDEX）

| 項 | 結論 |
|----|------|
| popup 不得再有模組級 `session.ts`／`bindPopupShell` 當畫面權威；輸入不得 `bumpUi` | 磁碟已刪 `session.ts`；無 `bindPopupShell`／`bumpUi`。導航經 `PopupContext`。 |
| HOW Back 表 | `BACK_PARENT` 與 HOW parent 表一致（含 settings／about／accounts／home-activity → `home-token`，`send-approval` → `token-send`，`token-send` → `token-detail`）。特殊列：Burner 已有 `successPk` 不離頁；助記詞 pick 回 words（`previewGen++`、busy=false、清 preview／selected／pathPreview）；`token-detail` 清 `detailTokenId` 去 Home。未列 → `home-token`。 |
| 離開／進入清除、dock、`focusAccountId`、送出本地 state、失敗 settled 先 navigate 再寫錯誤 | 見 L1／L2 與 `usePopupAppState`／`TokenSendForm` 抽樣。鎖定：關選單、清 `detailTokenId`、清送出 pending 錯誤；**不清**持倉快取與展開列。`activeAccountId` 變更才清持倉／展開／`detailTokenId`／送出錯誤，並自 `token-send`／`token-detail` 導回 Home。 |
| 審批 `ApprovalHost`、類 B、命令字串、storage key | 見驗收表。 |
| background／approval／popout／content／inject 未改成 React | 靜態通過。 |
| 版本號檔 0.16.0 | `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 皆為 `0.16.0`。INDEX 狀態仍為 `in progress`（出貨改 `shipped` 須使用者同意）。 |

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置／下一步 |
|----|----|------|------------------|
| M1 | M | 關閉 | 使用者手驗通過 |
| L1 | L | 仍開 | 可選：把 dock 標籤／disabled 收成與 HOW 同形的表（非出貨阻擋） |
| L2 | L | 仍開 | 可選：在 `navigateTo` 顯式對照 HOW 表註解／呼叫（行為已靠卸載對齊） |
| L3 | L | 關閉 | `PopupMarkup`：`key={activeWalletSendRequestId}` |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-07 | 無 HIGH；typecheck／build 通過；手驗未在瀏覽器走完（M1）；死碼以磁碟清單確認已刪 |
| 第 2 輪 | 2026-10-07 | 使用者手驗通過；M1 關閉；INDEX `shipped` |
