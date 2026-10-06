# Design review — 0.14.0 Airwave Wallet

- 日期：2026-10-06（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（累加；初審同日）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`folder-plan.md`](./folder-plan.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游行為契約：[`../../0.13.0/INDEX.md`](../../0.13.0/INDEX.md)、[`../../0.13.0/docs/refactor-plan.md`](../../0.13.0/docs/refactor-plan.md)（本版不推翻）
- 構想（非契約；已出貨）：[`../../0.15.0/INDEX.md`](../../0.15.0/INDEX.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/background/index.ts`、`wallet/src/background/wallet-handlers.ts` 命令分支、`wallet/src/approval/shell.ts` 的 export 與模組級狀態、`wallet/manifest.config.ts`、`wallet/vite.config.ts`；並核對 `background/`、`popup/` 檔案是否都在搬家表內
- **總評：** 提案可行。初審 M1、L1、L2、L3 均已寫進 INDEX 或 folder-plan，**無未關閉 HIGH、無仍開的應修 MEDIUM**。待拍板為空；HANDOFF 含 paste-ready starter prompt；非目標寫清。**設計審查門檻通過。非不可行。**

## Findings

關閉＝已寫進 INDEX／folder-plan／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

無。初審與本輪皆無 HIGH。

### MEDIUM

#### M1 — Popup 各 `index.ts` 若只 re-export `main.ts` 今日的 import，跨資料夾符號會斷 — **關閉**

**問題（初審題旨，保留）：** INDEX 目錄契約規定新子資料夾之間只 import 對方的 `index.ts`，且 index 只 re-export 該資料夾**對外**函式。初審時 folder-plan 把這句收成「re-export `main.ts` 今日用到的函式」。兩句並列時，實作 agent 可能只照 `main.ts` 的 import 清單做 barrel。

今日 `main.ts` **沒有** import、但其他 popup 檔有 import 的符號至少包括：

| 符號 | 定義檔（搬移後資料夾） | 誰在用（不經 `main.ts`） |
|------|------------------------|--------------------------|
| `SVG_PLUS`、`SVG_TRASH`、`SVG_CHECK`、`SVG_EYE`、`SVG_COPY` | `icons.ts` → `lib/` | `accounts-ui`、`combined-ui`、`settings-ui`、`generate-seed-flow` |
| `navigateTo`、`syncShellDock`、`refresh`、`clearError`、`showError`、`applyViewChrome` | `session.ts` → `lib/` | 各畫面檔；`main.ts` 只 import `bindPopupShell` 與 `session` |
| `hardenApiKeyInput` | `password-input.ts` → `lib/` | `settings-ui` |
| `avatarLetter` | `format.ts` → `lib/` | `accounts-ui` |
| `NATIVE_SOL_ID`（及型別 `HomeTokenRow`） | `home-tokens.ts` → `home/` | `send-flow` 值引用；`tokens-ui` 值引用；`session.ts` 為 `import type` |
| `findTokenRowById` | `send-flow.ts` → `send/` | `tokens-ui` |
| `refreshHomeAssets` | `tokens-ui.ts` → `home/` | `approval-host`（`main.ts` 亦 import，這一個有進清單） |

`home/` 與 `send/` 之間已是值引用循環（`tokens-ui` ↔ `send-flow`，以及 `approval-host` → `tokens-ui`、`send-flow` → `home-tokens`）。

**關閉位置：** INDEX「Popup」列寫明各 `index.ts` re-export **其他資料夾今日會用到的符號**，不是只抄 `main.ts` 的 import。folder-plan popup 段寫「必須 re-export 任何其他 popup 資料夾今日會 import 的符號」，並用上表當最低集合；`main.ts` 今日已 import 的函式也要匯出。本輪抽樣：上表符號與現碼 import 一致；同句還蓋住表外、但仍跨資料夾的符號（例如 `hardenSensitiveTextInput`、各 `el*`）。契約不再分叉。

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **關閉** | folder-plan「Track 4 審批抽出」已寫死：`renderSimulationNotice` 搬到 `approval/cards/simulation-notice.ts`；`renderDeltaCard`、`renderFeeCard`、`renderTxDetails` 留在 `shell.ts`。本輪再讀函式本體：notice 只吃 `sim`；delta 讀 `simulating`／`cuDirty`／`txCuEditable` 並呼叫 `runSimulation`；fee 讀寫 CU 草稿、`feeDetailsOpen`、`lastSim`、`requestId`；tx details 讀模組級 `txRawHex`。與表一致。 |
| L2 | **關閉** | folder-plan 跨畫面循環例句已改成 `home` ↔ `send`（`tokens-ui` ↔ `send-flow`，以及 `approval-host` → `tokens-ui`、`send-flow` → `home-tokens`）。現碼 `accounts` 與 `onboarding` 仍不互引。 |
| L3 | **關閉** | folder-plan 已寫 `pending/` 與 `send/` 經雙方 `index.ts` 互引並維持路徑；禁止搬回 `background/index.ts`。INDEX「循環」列同一條。本輪抽樣：`pending-timeout.ts` 值引用 `wallet-send-state.ts`；`wallet-send-abort.ts`、`wallet-finish-send.ts` 值引用 `pending.ts`／`pending-timeout.ts`。與契約一致。 |

### 本輪（第 2 輪）新增

無新 HIGH、MEDIUM、LOW。

另核過、不另開 ID：

- `background/` 與 `popup/` 今日檔名都在搬家表內，或標成留在原位的入口。`shared/`、`inject/`、`content/`、`popout/`、`approval/shell.ts` 不拆目錄。
- `wallet-handlers.ts` 的 24 個 `req.command` 與 folder-plan 分組表、`shared/commands.ts` 的 `wallet.*` 加 `storage.patchSettings` 聯集一致。未知命令仍是 `{ code: "UNKNOWN", message: "Unknown wallet command" }`。
- 下層另有 `storage` → `simulate`（`storage-io` 用 `compute-budget-tx`）→ `pending`（`sign-tx-simulate` 用 `sign-tx-pending-state`；`finish-pending` 用 `storage-io`）的 index 循環。INDEX 已規定循環時共用葉留下層、禁止搬回 `background/index.ts`。與 L3 同一條規則，不構成新分叉。
- `lib/session.ts` 對 `HomeTokenRow` 是 `import type`。folder-plan 已要求該型別從 `home/` 的 index 匯出；維持 `import type` 經 index 即可，不必改導航。

待拍板表為空。未把 `brainstorm/`、`../solibra-wallet` 或 backlog React 稿當成已定案。

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| folder-plan 目標樹存在；舊平鋪路徑（除保留入口）不再有那些檔 | 可 | `background/` 與 `popup/` 今日檔名都在搬家表內；入口留在原位。見抽樣 |
| `wallet-handlers.ts` 已不存在；`wallet-dispatch.ts` 只分派命令 | 可 | 命令字串與 `shared/commands.ts` 聯集一致（24 條）；未知命令錯誤形狀已寫「原樣留在 dispatch」 |
| 命令字串與 `chrome.storage` key 字串與 0.13.0 相同 | 可 | 本版明文不改名。現碼 key 在 `storage-io`／`session`，搬家不改字串即可對 |
| 四個 CSS／HTML 無內容修改 | 可 | 已定案不拆、不重排；Track 3 用內容差分驗 popup HTML／CSS，出貨清單含 popout 兩個檔 |
| 無新 npm 依賴（僅 `version` 可改 `0.14.0`） | 可 | 與「不上 React」一致；React 構想後於 0.15.0 出貨 |
| `cd wallet && npm run typecheck` 與 `npm run build` | 可 | 指令與 cwd 已寫。M1 已關，Track 3 的 barrel 範圍有完整句子可對 |
| 手驗：網站 connect／sign 仍 popout；代幣送出在 popup 殼內；連續兩次送出；拒絕與批准底欄 | 可 | 行為凍結 0.13.0。環境不能載入擴充時，驗收已要求實作審查逐條寫「未在瀏覽器走完」 |
| 文件與程式無真實密碼／助記詞／私鑰 | 可 | 本版提案抽樣無上述內容 |

## 與現碼抽樣

現碼未做本版目錄化 ≠ 設計 HIGH。下列用來確認提案沒有要求一條與現碼或禁區互斥、又無法只靠搬家完成的主路徑。

- **入口：** `manifest.config.ts` 的 service worker 為 `src/background/index.ts`，popup 為 `src/popup/index.html`，content／inject 為 `src/content/index.ts`、`src/inject/index.ts`。`vite.config.ts` 的 HTML 入口為 `src/popup/index.html`、`src/popout/index.html`。與「禁止搬移這些路徑」一致。今日 `version` 仍是 `0.13.0`，出貨才改，與已定案一致。
- **`background/index.ts`：** 監聽 `onMessage`、依 `dapp.`／`ui.`／其餘（含 `wallet.*` 與 `storage.patchSettings`）分派，並在 `windows.onRemoved` 對該 popout 綁定的 pending 收尾。不 re-export 子系統。本版只改 import、不把命令本體塞回此檔：與現況及「入口不當 barrel」一致。`ensureHydrated` 在 `dispatch` 裡經 `session` 呼叫，不在本檔另寫一條 rehydrate 總線。
- **命令：** `wallet-handlers.ts` 的 24 個 `req.command` 與 folder-plan 分組表、`shared/commands.ts` 聯集一致。檔尾未知命令為 `{ code: "UNKNOWN", message: "Unknown wallet command" }`。`wallet.beginSend` 呼叫既有 `buildWalletSendTransaction`（`wallet-begin-send.ts`），enqueue 時 `uiHost: "popup"`，不在此函式 `openPopout`。拆到 `wallet/send-command.ts` 並繼續呼叫 `send/wallet-begin-send.ts`，與「組交易正文不抄第二份」一致。`getHomeTokenOwners` 在 `shared/accounts.ts`，getHomeTokens 命令搬到 `home-tokens/` 不必回頭 import `wallet/`。
- **Pending／結果：** `pending.ts` 為記憶體 `Map`。`origin-notify.ts` 的 `sendBridgeResult` 以發起 `tabId` 呼叫 `tabs.sendMessage`，不是對全部 tab 廣播。`wallet-send-broadcast.ts` 用 `chrome.runtime.sendMessage` 通知擴充頁（0.13.0 已定案的 settled／progress）。本版整檔保留檔名與行為，不把這條改成全 tab 廣播，也不把 pending 寫進 `chrome.storage`。`origin-notify` 未帶 `frameId` 是已出貨路徑；本版凍結它，不在目錄化裡補 frame。
- **Custody：** 本版無新密碼欄、不改 vault。抽樣未見提案要求硬編碼密碼或把明文密碼寫進持久欄。inject 樹標成不動。解鎖金鑰仍在 `session` 記憶體 `Map`，不因搬家改 persist。
- **審批殼：** `shell.ts` export `mountApprovalShell`、`disposeApprovalShell`（另有型別 export）。`popout/main.ts` 自 `../approval/shell` import `mountApprovalShell`；popout 目錄不新建子資料夾，此路徑可維持。`popup/approval-host.ts` 今日也是 `../approval/shell`；該檔將進 `popup/send/`，相對路徑必須變深。folder-plan 已允許「路徑深度依檔案位置能編過即可」，函式名不變。純函式判定見 L1。格式化所用的 `PendingRecord`、模擬結果型別在 `shared/`，抽出檔不必 import `shell.ts`。
- **Popup 檔案清單：** `popup/` 除 `main.ts`、`types.ts`、`index.html`、`style.css` 外，其餘檔都在搬家表。`main.ts` 另 import `../popout/style.css` 與法律文件 raw；本版不改 CSS／HTML 內容，這兩條 import 留在 `main.ts` 即可。`navigateTo` 的實作仍在 `main.ts`，`session.ts` 只是綁定後的轉呼；搬家不重寫該函式，與已定案一致。
- **Wallet Standard：** 本版不改 `inject/`、不改能力表。與「未實作的方法不要宣告」一致；沒有新方法要宣告。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉條件 |
|----|----|------|----------|
| M1 | MEDIUM | **關閉** | INDEX「Popup」列＋ folder-plan popup 段：re-export 其他資料夾今日會 import 的符號，不是只抄 `main.ts` |
| L1 | LOW | **關閉** | folder-plan Track 4 表：四個 `render*` 的抽／留已寫死 |
| L2 | LOW | **關閉** | folder-plan 跨畫面例句已是 `home` ↔ `send` |
| L3 | LOW | **關閉** | folder-plan「依賴方向」＋ INDEX「循環」：`pending` ↔ `send` 經 index，不搬回 SW 入口 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-06 | 可行，無 HIGH。閘門未過：應修 M1。非不可行。L1–L3 不擋。 |
| 第 2 輪複審 | 2026-10-06 | M1、L1、L2、L3 皆關閉。無新 finding。待拍板空，HANDOFF 含 paste-ready，非目標寫清。**門檻通過。非不可行。** |
