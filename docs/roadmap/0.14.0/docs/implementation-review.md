# Implementation review — 0.14.0 Airwave Wallet

- **日期：** R1 2026-10-06（Asia/Hong_Kong）
- **輪次：** R1 初審（本檔累加；穩定 ID 勿重編號）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`folder-plan.md`](./folder-plan.md)；[`../HANDOFF.md`](../HANDOFF.md)；[`reasoning.md`](./reasoning.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；不以 chat history 為準

---

## 總評

**R1：出貨門檻未通過。** 無未關閉 HIGH。目錄樹、命令分派、命令字串、CSS／HTML、依賴與審批抽出在靜態上對齊 INDEX／folder-plan；`cd wallet && npm run typecheck` 與 `npm run build` 通過。手驗四條（網站 connect／簽、錢包送出、連續兩次送出、拒絕／批准底欄）**未在瀏覽器走完**，INDEX 該項仍未勾，故不可視為可出貨。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| — | （無） | — | R1 未發現違反 INDEX 已定案、folder-plan，或 GUIDELINES 架構禁區之主路徑問題。 | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | 手驗未在瀏覽器走完 | **非阻擋** | 本環境無法載入未封裝 Chrome 擴充。INDEX 出貨 checklist 手驗項維持未勾。靜態與建置不代替這四條。 | 出貨前於本機載入未封裝擴充，逐條走完後再勾 INDEX。 |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | 版本號已對齊、狀態仍 `in progress` | **開啟** | `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 已寫 0.14.0。INDEX 狀態維持 `in progress`，與 HANDOFF「使用者同意出貨才改 `shipped`」一致。 |

---

## 驗收對照

INDEX 出貨 checklist。手驗列一律標 **未在瀏覽器走完**。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| folder-plan 目標樹存在；舊平鋪檔已離開 `background/` 與 `popup/` 根目錄（入口留下） | **通過** | `background/` 根目錄只剩 `index.ts` 與子資料夾 `messaging`、`session`、`storage`、`pending`、`simulate`、`send`、`home-tokens`、`handlers`、`wallet`（各有 `index.ts`）。`popup/` 根目錄只剩 `main.ts`、`types.ts`、`index.html`、`style.css`，以及 `home`、`send`、`accounts`、`settings`、`onboarding`、`lib`。`git status` 對舊平鋪路徑為刪除。`shared/`、`inject/`、`content/`、`popout/` 無新子資料夾、相對 HEAD 無 diff。`background/index.ts`、`popup/main.ts` 的 diff 只有 import 路徑。 |
| `wallet-handlers.ts` 不存在；`wallet-dispatch.ts` 只分派 | **通過** | 倉庫內無 `wallet-handlers.ts`（含 `handlers/`）。[`wallet-dispatch.ts`](../../../../wallet/src/background/handlers/wallet-dispatch.ts) 只依 `req.command` return 對應 handle；未知命令仍是 `{ code: "UNKNOWN", message: "Unknown wallet command" }`，與 HEAD `wallet-handlers.ts` 檔尾相同。 |
| 命令字串與 storage key 與 0.13.0 相同 | **通過** | dispatch 的 24 個 `req.command` 字串與 HEAD `wallet-handlers.ts` 逐條相同，且落在 folder-plan 指定檔：`session-commands`、`account-commands`、`combined-commands`、`connection-commands`、`send-command`（組交易仍 `import { buildWalletSendTransaction } from "../send"`）、`settings-command`（`storage.patchSettings`）、`home-tokens/get-home-tokens-command.ts`（呼叫 `getHomeTokensForOwners`）。`wallet/src/shared/storage-keys.ts`、`commands.ts` 相對 HEAD 無 diff。 |
| 四個 CSS／HTML 無內容修改 | **通過** | `git diff` 對 `popup/style.css`、`popout/style.css`、`popup/index.html`、`popout/index.html` 無輸出。 |
| 無新 npm 依賴；version 可為 0.14.0 | **通過** | `wallet/package.json` 相對 HEAD 只有 `"version": "0.13.0"` → `"0.14.0"`。dependencies／devDependencies 未改。manifest 只改 `version`，入口路徑未改。`vite.config.ts` 無 diff。 |
| `typecheck` 與 `build` | **通過** | 見測試紀錄。 |
| 手驗：網站 connect 或 sign 仍開 popout | **未在瀏覽器走完** | 靜態：`popout/main.ts` 相對 HEAD 無 diff，仍 `mountApprovalShell` 且 `host: "popout"`。未載入擴充，未對 test-web 走 connect／sign。 |
| 手驗：錢包代幣送出仍在 popup 殼內進審批、不另開 popout | **未在瀏覽器走完** | 靜態：`send/approval-host.ts` 在去掉 import 後與 HEAD `popup/approval-host.ts` 本體相同，仍掛 `mountApprovalShell`。未在 popup 送出。 |
| 手驗：連續兩次送出都能進審批（第二次不是 gone 殘留） | **未在瀏覽器走完** | 靜態：`disposeApprovalShell` 仍清掛載旗標與 CU／模擬草稿；`mountApprovalShell` 開頭先 `disposeApprovalShell()`。`approval/cards/simulation-notice.ts` 與 `approval/format.ts` 無模組級 `let`，故未加空 reset。未連續送出兩次。 |
| 手驗：拒絕與批准底欄可見 | **未在瀏覽器走完** | CSS／HTML 無 diff，底欄標記未改。未打開審批殼看底欄。 |
| 文件與程式無真實密碼／助記詞／私鑰 | **通過** | 0.14.0 roadmap、changelog 0.14.0 節、本次讀過的分派與 pending 檔未見助記詞、私鑰或密碼。 |

### 審批抽出（Track 4）

| 函式 | 結果 |
|------|------|
| `renderSimulationNotice` | 在 `approval/cards/simulation-notice.ts`，只吃 `sim`。函式本體與 HEAD `shell.ts` 一致。`cards/index.ts` 只 re-export 它。 |
| 格式化純函式 | `approval/format.ts` 的 `formatSolFromLamports`、`shortPk`、`avatarLetter`、`bytesFromSignMessage`、`bytesFromSignTransaction`、`displayOrigin`、`shortSignature`、`hexGrouped`、`hexCompact`、`isDisplayableUtf8` 與 HEAD `shell.ts` 本體一致。 |
| `renderDeltaCard`、`renderFeeCard`、`renderTxDetails` | 仍在 `shell.ts`。 |
| `mountApprovalShell`、`disposeApprovalShell` | 仍由 `shell.ts` export。popout 仍 `from "../approval/shell"`。popup `approval-host.ts` 因檔案加深一層改為 `from "../../approval/shell"`，函式名未改。 |

`shell.ts` 相對 HEAD：+13 / −115，為改 import 與刪除上列已搬函式。

### 資料夾 import 方向

下層 `storage`、`messaging`、`session`、`pending`、`simulate`、`send`、`home-tokens` 沒有 `from "../handlers"` 或 `from "../wallet"`。跨資料夾 import 走到對方 `index.ts`（或留在原位的 `approval/shell.ts`、`popup/types.ts`、`shared`）。同一資料夾內部檔可互引（例如 `approval-host.ts` → `./send-flow`）。`background/index.ts` 只聽訊息、分派、關窗，沒有變成 re-export 桶。`pending` ↔ `send`、popup `home` ↔ `send` 經雙方 `index.ts` 互引，與 folder-plan 允許的循環一致；執行期 barrel 是否已初始化**未在瀏覽器觀察**。

整檔搬家（上表以外的 background／popup 搬移）在去掉 import／re-export 列之後，與 HEAD 本體一致。唯一殘差是 `pending/pending-timeout.ts` 一處型別查詢路徑 `../shared/bridge` → `../../shared/bridge`，配合目錄加深，不是行為句子。

### 架構禁區（GUIDELINES）

| 項 | 結論 | 靜態證據 |
|----|------|----------|
| Pending 只在 SW 記憶體 | **符合** | [`pending/pending.ts`](../../../../wallet/src/background/pending/pending.ts) `pendingRequests` 與 `pendingByWindow` 皆為 `Map`。`pending/`、`send/` 無 `chrome.storage`。 |
| Pending 不寫進 storage | **符合** | `storage-keys.ts` 無 diff；`storage/storage-io.ts` 本體與 HEAD 相同。 |
| 結果不改成全 tab 廣播 | **符合** | `sendBridgeResult` 仍對指定 `tabId` `tabs.sendMessage`。`origin-notify.ts` 本體與 HEAD 相同（帳戶變更只對已連線紀錄裡的 tabId）。`wallet-send-broadcast.ts` 本體與 HEAD 相同。 |

---

## 測試紀錄

尚無整包單測指令。未跑 `bun test`。cwd 皆為 `wallet/`。

| 指令 | 結果 | 備註 |
|------|------|------|
| `npm run typecheck` | **通過** | R1，`tsc --noEmit`，exit 0 |
| `npm run build` | **通過** | R1，`tsc --noEmit && vite build`，exit 0，vite 6.4.3，約 1.75s |

手驗：**未在瀏覽器走完**（未載入未封裝擴充，未開 test-web，未操作 popup 送出或審批底欄）。

---

## 修復追蹤

| ID | 狀態 | 修復輪 | 備註 |
|----|------|--------|------|
| M1 | 非阻擋 | — | 須本機手驗；本審查不改程式 |
| L1 | 開啟 | — | 出貨時才改 INDEX 狀態；記錄即可 |

---

## 歷審摘要

| 輪 | 日期 | 結論 |
|----|------|------|
| R1 | 2026-10-06 | 靜態目錄化與建置通過；無 HIGH；手驗未走完；出貨門檻未過 |

## R1 審查環境

- OS：win32；PowerShell。cwd：`wallet/`。
- 對照 HEAD（0.13.0 已追蹤樹）與 working tree。未 commit。
- 瀏覽器：未載入未封裝擴充。
