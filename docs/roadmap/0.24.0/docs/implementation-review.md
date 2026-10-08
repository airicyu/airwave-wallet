# 實作審查 — 0.24.0

- 日期：2026-10-09（Asia/Hong_Kong）
- 輪次：第 2 輪為最新（獨立核實）。第 1 輪原文保留於文末，ID 不重編。
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收（設計審查 [`design-review.md`](./design-review.md) 只當背景，不以該檔當已定案）
- 角色：實作審查。本輪不改程式、不加功能、不 commit，不改 INDEX／HOW／reasoning／HANDOFF。

## 第 2 輪（2026-10-09）— 獨立核實

- 角色：新實作審查 agent。只讀檔與 working tree／未提交 diff，不 resume 舊對話。
- 對照基準：INDEX 已定案＋驗收；路徑與 export 名對 [`how.md`](./how.md)；架構禁區對 [`../../GUIDELINES.md`](../../GUIDELINES.md)。
- 範圍：`git status` 所示 0.24.0 程式刪改與 untracked 新檔（不含 `wallet/node_modules`）。HEAD 仍是拆檔前的命令／模擬／收回租金單檔；工作樹已刪舊路徑。
- **總評：** Track 1–4 與 INDEX／HOW 一致，主路徑可用，架構禁區未見新的主路徑違反。`npm run typecheck` 與 `npm run build` 的 exit code 皆為 0。**無未關閉 HIGH。** 仍開的只有 024-L03（工作樹另含 0.23.0 與 backlog 文件 diff），不阻擋本版重構正確性。INDEX 狀態仍是 `in progress`；標 `shipped` 須使用者同意。

### Findings

穩定 ID 沿用第 1 輪。本輪無新 ID。

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| 024-L01 | LOW | 關閉 | 版本檔與 changelog 已對齊 `0.24.0`。第 2 輪複核 `version.md`、`wallet/package.json`、`wallet/manifest.config.ts`、`changelog.md` 皆為該版；`package.json` 依賴清單無新增。 |
| 024-L02 | LOW | 關閉 | INDEX 驗收 checklist 已勾。第 2 輪逐條對照現碼，見下表，與勾選一致。 |
| 024-L03 | LOW | 開（非阻擋） | 同一 working tree 仍有與本版產品句無直接關係的文件 diff：`docs/roadmap/0.23.0/`（INDEX、HANDOFF、implementation-review）、`docs/roadmap/README.md`、`docs/roadmap/backlog/INDEX.md`、`sign-tx-durable-nonce-alert.md`，以及刪除 `docs/roadmap/backlog/wallet-ui-i18n.md`。不改變 0.24.0 命令樹、模擬或收回租金。出貨 commit 宜與這些文件分開，或在訊息裡說明為何一併提交。 |

**未關閉 HIGH：** 無。

本輪抽樣、不另開 ID：`simulate-rpc.ts` 將原 `simulate-pending-tx.ts` 檔內私有的 `RpcTokenAmount`、`RpcTokenBalance`、`RpcLoadedAddresses`、`RpcSimulateValue` 改為 `export type`，供同層 `phase2-deltas.ts` import。`simulate/index.ts` 未把這些名字，以及 `bytesToBase64`、`keysFromLoaded`、`v0LookupCount`、`expandV0AccountKeys`、`resolveAccountKeysFromTables` 轉成資料夾公開 export。HOW 鎖的是 index 上的公開名字；同層 import 需要檔級 export。此點非阻擋，不要求再改碼。

### 驗收對照

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| `AGENTS.md` 有「原始檔職責註解」，數字與 HOW 一致（100 words、400 行、150 行且不遞迴） | 通過 | `AGENTS.md`「原始檔職責註解」與 HOW「永久規則」門檻相同。該節沒有「本版只拆哪些檔」。 |
| HOW 命令樹、模擬表、收回租金表的路徑存在；點名要刪的舊檔不存在 | 通過 | 工作樹有 `commands/`（connection／send／settings 單檔，以及 `account/`、`combined/`、`session/`）、`simulate/` 同層六個新檔、`list-closable.ts`、`plan-close-empty.ts`、`commit-close-empty.ts`。`Test-Path` 為否：`account-commands.ts`、`combined-commands.ts`、`session-commands.ts`、搬走前的 `connection-commands.ts`／`send-command.ts`／`settings-command.ts`、`simulate-pending-tx.ts`、`close-empty-service.ts`。無 `simulate/pending/`。git 對這些舊路徑為刪除，無同名 shim。 |
| `wallet/index.ts` 的 `handle*` export 名與 HOW 命令表一致 | 通過 | 該檔只 `from "./commands"`。`handle*` 集合與 HEAD `wallet/index.ts` 相同，無增刪。`commands/index.ts` re-export 三個單檔與三個資料夾的 `index.ts`。`invalidLabel` 不在 `wallet/index.ts` 或 `commands/account/index.ts`。 |
| `simulate/index.ts` 仍 export HOW 模擬表的公開名字 | 通過 | 具名 export：`SimDeadline`、`buildInspectorUrl`、`simulateTransactionRpc`、`runPhase2Simulation`、`Phase2SimContext`。另保留 HEAD 已有的 `export *`：`sign-tx-simulate`、`compute-budget-tx`。 |
| 本版新建或實質修改的 `.ts` 檔首有英文註解，且不超過 100 words | 通過 | 29 個有改或新建的 `.ts` 皆有檔首英文區塊註解。計詞最高約 25（`plan-close-empty.ts`）。未見 `related logic`、`etc.`、`and so on`。本版 diff 無 `.tsx`。未改檔不在此條。 |
| 沒改到的超過 400 行檔仍在原路徑 | 通過 | 仍在原路徑且本版 diff 未動：`approval/shell.ts`、`popup/style.css`、`popout/style.css`、`shared/ui-messages.ts`、`home-tokens/home-tokens-service.ts`、`AccountsScreens.tsx`、`OnboardingScreens.tsx`、`SettingsScreens.tsx`、`PopupMarkup.tsx`。入口 `background/index.ts`、popup／popout `index.html`、`content/index.ts`、`inject/index.ts` 仍在。新建檔行數皆低於 400（最長 `phase2-deltas.ts` 352 行）。 |
| 命令字串、storage key、Wallet Standard 能力表與 0.23.0 相同 | 通過 | `wallet-dispatch.ts`、`shared/commands.ts`、`shared/ui-messages.ts`、popup／popout／approval／inject／content 無 diff。`wallet-dispatch.ts` 仍 `from "../wallet"`。抽樣命令字串仍為 `wallet.disconnectOrigin`、`wallet.disconnectAllOrigins`、`wallet.beginSend`、`wallet.listClosableTokenAccounts`、`wallet.planCloseEmpty`、`wallet.commitCloseEmpty`。`INVALID_LABEL` 的 message 仍是空標籤 `"Label cannot be empty"`、否則 `"名稱最多 15 字"`。 |
| `cd wallet && npm run typecheck` 與 `npm run build` 通過 | 通過 | 本輪 exit code 皆為 0。見測試結果。 |
| 無畫面行為改動，不要求未封裝擴充手驗 | 通過 | 畫面、CSS、`ui-messages` 無 diff。命令／模擬／收回租金函式本體與 HEAD 正規化比對後，實質差異只有搬家造成的相對 import 深度，以及 `planCloseEmpty` 改經 `getLastListClosableEntries()` 讀同一份記憶體清單（長度差正好等於該呼叫替換）。未跑未封裝擴充。 |
| 文件與程式無真實密碼／助記詞／私鑰 | 通過 | 本輪報告與抽樣 diff 未記入這類秘密。審查未把 vault 明文寫入文件。 |
| 版本號檔對齊 `0.24.0`；狀態 `shipped` 須使用者同意 | 通過 | 四個版本位置皆為 `0.24.0`。INDEX 狀態維持 `in progress`，尚未標 `shipped`。 |

### 契約抽樣（本輪）

| 檢查項 | 結果 |
|--------|------|
| `commands/` 樹與 HOW 一致；低於 150 行的 connection（37 行）／send（106 行）／settings（29 行）整檔搬、未再拆 | 通過 |
| 資料夾內模組可超過 150 行且低於 400：`account-records` 191、`secret-key-accounts` 221、`seed-accounts` 199、`vault-password` 233、`combined-members` 157。`create-combined.ts` 只有 `handleCreateCombinedAccount` | 通過 |
| `sign-tx-simulate.ts` import `./sim-deadline`、`./phase2-deltas`、`./simulate-rpc`，不經 `./index`。diff 僅檔首註解與這三條 import | 通過 |
| `bytesToBase64` 定義在 `tx-base64.ts`；`inspector-url.ts` 與 `simulate-rpc.ts` 呼叫它。`buildInstructions`、`shortPk`、`PROGRAM_NAMES` 在 `phase2-deltas.ts`。`v0LookupCount` 在 `resolve-account-keys.ts` | 通過 |
| `plan-close-empty.ts` 只經 `getLastListClosableEntries`；不 import `closable-cache`。選中帳戶不在清單仍回 `INVALID_PAYLOAD` | 通過 |
| `getLastListClosableEntries` 不在 `close-empty/index.ts`。該 index 仍只 export `handleListClosableTokenAccounts`、`handlePlanCloseEmpty`、`handleCommitCloseEmpty` | 通過 |
| `commit-close-empty.ts` 含 `feeTotalForPlan`、`assertPlanNotStale`、`classifyPlanResult`、`flattenResults` | 通過 |
| `list-closable.ts` 對 home-tokens 只 `from "../home-tokens"`。`getOwnerParsedTokenAccounts` 已在 `home-tokens/index.ts` re-export。`owner-parsed-token-cache.ts` 本體無 diff | 通過 |
| `closable-enrich.ts` 無 diff，仍深層 import `home-tokens-service` | 通過 |
| `plan-store.ts` 計畫在模組內 `Map`，無 diff，未寫入 `chrome.storage` | 通過 |
| 命令檔 import `session`／`storage`／`messaging`／`pending`／`home-tokens` 的資料夾入口，未 import `handlers/`。`simulate/` 與 `close-empty/` 未 import `wallet/` 或 `handlers/` | 通過 |
| pending 仍經既有 `../pending`；本版未改 `pending/`、`messaging/`、`session/`、`storage/`。inject 樹無 diff | 通過 |

### 測試結果

工作目錄 `wallet/`。本輪實跑。INDEX 寫明不要求未封裝擴充手驗。未假設 `bun test`。

| 指令 | exit code |
|------|-----------|
| `npm run typecheck`（`tsc --noEmit`） | 0 |
| `npm run build`（`tsc --noEmit && vite build`） | 0 |

### 修復追蹤

| ID | 狀態 | 追蹤 |
|----|------|------|
| 024-L01 | 關閉 | 第 1 輪關閉。第 2 輪複核版本字串仍為 `0.24.0`。 |
| 024-L02 | 關閉 | 第 1 輪關閉。第 2 輪驗收表與現碼一致。 |
| 024-L03 | 開、非阻擋 | 第 2 輪工作樹仍含 0.23.0 與 backlog 文件 diff。不修程式。出貨時由提交者決定是否分 commit。 |

## 歷審摘要

| 輪 | 日期 | 誰 | 結論 |
|----|------|----|------|
| 1 | 2026-10-09 | 實作審查 | 初審認為 Track 1–4 對齊，typecheck／build 通過（該輪未記 exit code）。開 024-L01、024-L02、024-L03。隨後 L01、L02 在同一輪標關閉（版本與 checklist 已齊）。無 HIGH。 |
| 2 | 2026-10-09 | 新實作審查（獨立核實） | 不沿用聊天結論，重讀 INDEX／HOW 並對 working tree。函式本體、export、舊檔刪除、檔首註解、禁區抽樣與驗收句一致。typecheck 與 build exit code 皆 0。無新 finding。無未關閉 HIGH。024-L03 仍開且非阻擋。 |

## 第 1 輪原文（2026-10-09）

- 角色：實作審查（不改程式／INDEX／HOW／commit）
- 對照：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`../HANDOFF.md`](../HANDOFF.md)；[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 範圍：**working tree**（含 untracked `wallet/src/background/wallet/commands/`、`docs/roadmap/0.24.0/` 與 Track 1–4 相關刪改）。不 resume 舊對話。
- **總評：** Track 1–4 主體已對齊 INDEX／HOW（`AGENTS.md` 註解規則、命令進 `commands/`、模擬／收回租金三拆、舊檔刪除無 shim）。`wallet/index.ts` 的 `handle*` export 集合與 refactor 前相同；`simulate/index.ts` 公開名與 HOW 模擬表一致；架構禁區（pending／custody／不廣播）未見新違規。`npm run typecheck` 與 `npm run build` 通過。**無未關閉 HIGH**；出貨前仍須版本對齊與 INDEX checklist（見 LOW）。

### 測試

| 項目 | 結果 |
|------|------|
| `cd wallet && npm run typecheck` | pass |
| `cd wallet && npm run build` | pass |
| 擴充手驗 | 不要求（INDEX 驗收：行為不變、無畫面改動） |

### 契約抽查（本輪）

| 檢查項 | 結果 |
|--------|------|
| `AGENTS.md`「原始檔職責註解」：100 words、400 行、150 行且不遞迴；未抄「本版只拆哪些檔」 | pass |
| HOW 點名舊檔不存在：`account-commands.ts`、`combined-commands.ts`、`session-commands.ts`、舊路徑 `connection-commands`／`send-command`／`settings-command`、`simulate-pending-tx.ts`、`close-empty-service.ts` | pass |
| `commands/index.ts` + `wallet/index.ts` 只 `from "./commands"` re-export；`invalidLabel` 未公開 export | pass |
| HOW 命令樹路徑（account／combined／session 分檔、`invalid-label.ts`） | pass |
| `simulate/index.ts`：`SimDeadline`、`buildInspectorUrl`、`simulateTransactionRpc`、`runPhase2Simulation`、`Phase2SimContext` + 既有 `export *` | pass |
| 全倉庫無 import `./simulate-pending-tx`；`bytesToBase64` 僅 `tx-base64.ts` | pass |
| `sign-tx-simulate.ts` 同層 import，不經 `./index` | pass |
| 收回租金：`list-closable`／`plan-close-empty`／`commit-close-empty`；`plan` 經 `getLastListClosableEntries`、不讀 `closable-cache` 代替；getter 未進 `close-empty/index.ts` | pass |
| `list-closable` 對 `home-tokens` 只 `from "../home-tokens"`；`getOwnerParsedTokenAccounts` 已 re-export | pass |
| `close-empty/index.ts` 仍只 export 三個 `handle*` | pass |
| `wallet-dispatch.ts` 仍 `from "../wallet"`；命令字串檔未改 | pass（抽樣） |
| 本版新建／實質修改 `.ts` 檔首英文註解；未改 `compute-budget-tx.ts`／`decode-compiled-ix.ts` 不強求補註解 | pass（抽樣 15+ 檔） |
| 未拆 INDEX 點名保留的大檔（shell、CSS、ui-messages、home-tokens-service、popup 畫面） | pass（未出現在 diff 刪改） |
| 無新 npm 依賴 | pass |
| GUIDELINES 架構禁區 | pass（未見 pending 持久化、storage hydrate 找請求、全 tab 廣播等新增） |
| `version.md`／`wallet/package.json` 對齊 `0.24.0` | pass（出貨步驟已對齊） |

### Findings（第 1 輪當時）

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| 024-L01 | LOW | 關閉 | 版本檔與 changelog 已對齊 `0.24.0`。 |
| 024-L02 | LOW | 關閉 | INDEX 驗收 checklist 已勾。 |
| 024-L03 | LOW | 開 | 同一 working tree 另含 `docs/roadmap/0.23.0/*`、`docs/roadmap/backlog/*` 等與 0.24.0 產品 scope 無直接關係的 staged 外修改。不影響本版 refactor 正確性，但出貨 commit 宜與 0.24 變更分離或一併說明。 |

**未關閉 HIGH：** 無

### 已對齊片段（供後續輪次免重複）

- Track 1：`AGENTS.md` 第 86–97 行與 HOW「永久規則」門檻一致。
- Track 2：`commands/` 15 檔；`account`／`combined`／`session` 結構與 HOW 表一致；舊 `wallet/*.ts` 命令檔已刪。
- Track 3：`sim-deadline`、`tx-base64`、`inspector-url`、`resolve-account-keys`、`simulate-rpc`、`phase2-deltas`；`phase2-deltas` import `keysFromLoaded`／`v0LookupCount` 自 `resolve-account-keys`。
- Track 4：`commit-close-empty.ts` 含 `feeTotalForPlan`、`assertPlanNotStale`、`classifyPlanResult`、`flattenResults`；`commands.ts` 僅改 import 與檔首註解。

### 建議（非契約，第 1 輪）

1. 出貨前：版本檔＋changelog、INDEX checklist 勾選、使用者同意 `shipped`（024-L01、024-L02）。
2. Commit 前釐清 0.23 文件／backlog diff 是否 intentional（024-L03）。
