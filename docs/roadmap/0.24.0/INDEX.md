# 0.24.0 — 原始檔職責分檔（行為不變）

- **狀態：** `in progress`
- **上游版本：** [0.23.0](../0.23.0/INDEX.md)（三語 catalog、方案 B 字體、產品圖位置不變）。目錄規則沿用 [0.14.0](../0.14.0/INDEX.md)：資料夾之間只 import 對方的 `index.ts`；同一資料夾內部可互引
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃對話（2026-10-09）。沒有獨立 backlog 檔
- **畫面：** 不改。沿用 [`docs/design-principles.md`](../../design-principles.md) 與 0.23.0 已出貨畫面
- **秘密欄位：** 無新密碼欄；vault blob 不改 schema

## 產品句

使用者可見行為、命令字串、storage key、pending 生命週期與 0.23.0 相同。本版只做三件事：在 `AGENTS.md` 寫下原始檔職責註解與行數門檻；把過長的 wallet 命令、簽署模擬、收回租金 service 依「會一起改的一塊」拆開；這些新建或實質修改的檔加上英文檔首註解。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)（檔要搬到哪、哪些 export 名字不能改、註解規則全文）
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.23.0](../0.23.0/INDEX.md)、目錄契約 [0.14.0](../0.14.0/INDEX.md)
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 行為 | 重構前後使用者可見行為相同。禁止借搬家改文案、DOM、命令字串、回應 `result` 形狀、storage key、逾時、CU、模擬或送出規則 |
| 註解規則放哪 | 寫進倉庫根 [`AGENTS.md`](../../../AGENTS.md) 的「工作習慣」之後、獨立小節「原始檔職責註解」。照抄 [how.md](./docs/how.md)「永久規則」的句子，不要改門檻數字。「本版只拆 HOW 點名的檔」只留在本版 INDEX／HOW，不寫進 `AGENTS.md` |
| 誰要有註解 | `wallet/src/**/*.ts`：**少於 50 行**可不寫；**50 行以上**檔案最頂必須有英文職責註解（含 `index.ts`）。改到已達 50 行卻無註解的檔，同一輪補上。本版 Track 5 補齊全 tree 缺漏；`ui-messages.ts` 仍由產生器日後輸出註解，本版不手改該檔 |
| 註解形式 | 檔案最頂英文區塊註解，最多 **100 words**。平常一兩句：這個檔負責什麼，以及它不做的相鄰那一步。一句寫不下第二件不同的事就分檔，不要把註解寫長。禁止 `related logic`、`etc.`、`and so on` 帶過第二個職責。`index.ts` 只寫它 re-export 哪一個資料夾的對外介面。純資料表只寫這是哪一張表 |
| 產生器 | `wallet/scripts/gen-ui-messages.mjs` 寫出 `wallet/src/shared/ui-messages.ts`。本版**不**改字串表、**不**跑這個產生器、**不**手改 `ui-messages.ts` 補註解。產生器下次改 catalog 時應輸出檔首註解 |
| 400 行 | 同一輪改動若碰到超過 400 行的 `.ts`／`.tsx`／`.css`，必須 review 要不要拆。本版只拆 HOW 點名的檔。其餘超過 400 行的檔（含 `approval/shell.ts`、`popup/style.css`、`popout/style.css`、`shared/ui-messages.ts`、`home-tokens-service.ts`、popup 畫面檔）留到碰到它們的版本 |
| 150 行 | 只適用於 `background/wallet/` 這一層的命令檔：低於 150 行維持**一個** `.ts`；達到或超過 150 行放進 `commands/<組>/`，裡頭依會一起改的模組分檔。150 **不遞迴**：資料夾內一個模組可以超過 150 行，只要職責註解仍是一件事，且該檔不超過 400 行。禁止把**同一職責**切成一命令一檔。一個職責只對應一個 `handle*` 時，該檔可以只有這一個命令（`create-combined.ts` 就是這樣） |
| 命令出口 | 新增 `wallet/src/background/wallet/commands/index.ts`，re-export `connection-commands.ts`、`send-command.ts`、`settings-command.ts`，以及 `account/`、`combined/`、`session/` 的 `index.ts`。`wallet/index.ts` **只**從 `./commands` re-export，函式名與本版開始前相同（見 HOW 命令表），不 import `./commands/` 底下的其他檔。`wallet-dispatch.ts` 仍只從 `../wallet` import，命令字串不變。刪除舊路徑，不留轉發用的 shim |
| 模擬 | 不新建 `simulate/pending/`。拆掉 `simulate-pending-tx.ts` 後，新檔與 `sign-tx-simulate.ts`、`compute-budget-tx.ts`、`decode-compiled-ix.ts` 同層。`simulate/index.ts` 繼續 export 現有公開名字（HOW 模擬表）。`sign-tx-simulate.ts` 可 import 同資料夾的新檔 |
| 收回租金 | 刪除 `close-empty-service.ts`。列出、計畫、送出各一檔。`commands.ts` 仍是 `wallet.listClosableTokenAccounts`／`planCloseEmpty`／`commitCloseEmpty` 的薄包裝，函式名不變。`planCloseEmpty` 只經 `getLastListClosableEntries` 讀本次清單記憶體；不改讀 `closable-cache`；該 getter 不進 `close-empty/index.ts`。選中帳戶不在上次清單仍是 `INVALID_PAYLOAD`。列出檔對 `home-tokens` 只 import `../home-tokens`；`getOwnerParsedTokenAccounts` 補進 `home-tokens/index.ts` 的 re-export，行為不變。本版不改 `closable-enrich.ts` 既有的深層 import。不把三步搬回一個 service |
| 目錄契約 | 沿用 0.14.0：新子資料夾有 `index.ts`，只 re-export 對外符號。`commands/account` 等不可 import `handlers/`。下層 `storage`、`messaging`、`session`、`pending`、`simulate`、`send`、`home-tokens` 不可 import `wallet/` 或 `handlers/`。出現循環時把共用葉留在下層，禁止把邏輯搬回 `background/index.ts` |
| 入口路徑 | 禁止搬移：`wallet/src/background/index.ts`、`wallet/src/popup/index.html`、`wallet/src/popout/index.html`、`wallet/src/content/index.ts`、`wallet/src/inject/index.ts` |
| 依賴 | 不加 npm 依賴 |
| 數字 | 不改金額運算。本版不引入 `big.js` |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.24.0`。狀態改 `shipped` 須使用者同意 |

## 非目標

- 拆 `approval/shell.ts`、`popup/style.css`、`popout/style.css`、popup 畫面大檔、`home-tokens-service.ts`、`ui-messages.ts`
- 把同一職責切成一命令一檔，或依 150 行再把資料夾裡的模組套成下一層資料夾
- 新建 `simulate/pending/`
- 改命令字串、storage key、pending 形狀、`uiHost`、Wallet Standard 能力表、vault schema
- 改 custody、改三語 catalog 內容、改畫面文案或 CSS
- Sidebar、地址簿、聚合送出、Agent
- 改 `../solibra-wallet`

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.23.0 結束時 | 0.24.0 |
|---------------|--------|
| `AGENTS.md` 沒有檔首註解與行數門檻 | 「原始檔職責註解」小節寫明英文、100 words、400 行 review、命令檔 150 行 |
| `background/wallet/*.ts` 平鋪；`account-commands.ts` 約 582 行 | 命令進 `wallet/commands/`；帳戶／聚合／session 分資料夾 |
| `simulate-pending-tx.ts` 同時做金鑰展開、模擬 RPC、差額與 Inspector URL | 三塊拆成 `simulate/` 同層檔；公開 export 名不變 |
| `close-empty/` 已有掃描與 plan 零件，`close-empty-service.ts` 仍擁有列出、計畫、送出 | 三步各自成檔，刪除 service 檔 |
| 行為即契約 | **行為不變** |

## 實作 Track

### Track 1 — 把註解規則寫進 AGENTS.md

- **做：** 在 `AGENTS.md` 加入 HOW「註解規則」那一節的句子。不改產品碼。
- **不做：** 批量改 `wallet/src`。
- **驗收：** `AGENTS.md` 含 50 行門檻（`.ts` ≥50 必須檔首英文註解、&lt;50 可省略）、最多 100 words、超過 400 行要 review、wallet 命令檔 150 行門檻且不遞迴。

### Track 2 — wallet 命令進 `commands/`

- **做：** 依 HOW 命令樹搬家並分檔。新增 `commands/index.ts`。`wallet/index.ts` 只從 `./commands` re-export，export 名不變。每個文字有改動的 `.ts` 加檔首註解，包含只改 import 的檔。刪除舊的 `account-commands.ts`、`combined-commands.ts`、`session-commands.ts` 以及搬進 `commands/` 後的舊單檔路徑。`invalidLabel` 留在 `commands/account/invalid-label.ts`，不從 `wallet/index.ts` export；`INVALID_LABEL` 與現有 message 字串不變。
- **不做：** 改 `wallet-dispatch.ts` 的命令字串；把低於 150 行的 connection／send／settings 再拆開。
- **驗收：** `cd wallet && npm run typecheck` 通過。HOW 命令表的每個 `handle*` 仍由 `wallet/index.ts` export。

### Track 3 — 拆 `simulate-pending-tx.ts`

- **做：** 依 HOW 模擬表拆成同層檔，刪除 `simulate-pending-tx.ts`。`simulate/index.ts` 改 re-export。`sign-tx-simulate.ts` 改 import 到同層新檔，不經 `./index` 轉一圈，並補檔首註解。新檔加檔首註解。
- **不做：** 改 `SimDeadline`、`buildInspectorUrl`、`simulateTransactionRpc`、`runPhase2Simulation`、`Phase2SimContext` 的名字或呼叫語意；新建子資料夾。
- **驗收：** `cd wallet && npm run typecheck` 通過。全倉庫不再 import `./simulate-pending-tx` 或 `simulate-pending-tx.ts`。

### Track 4 — 拆 `close-empty-service.ts`

- **做：** 依 HOW 收回租金表拆成三檔，刪除 `close-empty-service.ts`。`commands.ts` 改 import。只被一步使用的私有函式跟那一步走；兩步以上共用的函式放進既有的 `plan-store.ts`、`closable-cache.ts`、`build-close-txs.ts` 或 `closable-scan.ts` 其中一個已有職責的檔，不新建 grab-bag。新檔與被改到的既有檔加或更新檔首註解。
- **不做：** 改三個 `wallet.*` 命令字串或回應形狀；改掃描、打包、估 CU 的規則。
- **驗收：** `cd wallet && npm run typecheck` 與 `npm run build` 通過。全倉庫不再有 `close-empty-service`。`close-empty/index.ts` 仍只 export 三個 `handle*`。

### Track 5 — 補齊 ≥50 行 `.ts` 檔首註解

- **做：** 掃 `wallet/src/**/*.ts`（不含 `ui-messages.ts`）；總行數 ≥50 且檔首無英文區塊註解者補上，遵守 HOW「永久規則」與 100 words 上限。只加註解，不改行為。
- **不做：** 手改 `ui-messages.ts`；改 `.tsx`（本版規範僅約束 `.ts`）。
- **驗收：** 腳本或人工抽查：除 `ui-messages.ts` 外，所有 ≥50 行的 `.ts` 皆以 `/**` 或 `/*` 開頭；`typecheck` 仍通過。

## 驗收（出貨 checklist）

- [x] `AGENTS.md` 有「原始檔職責註解」，數字與 HOW 一致（50 行門檻、100 words、400 行、150 行且不遞迴）
- [x] HOW 命令樹、模擬表、收回租金表的路徑存在；點名要刪的舊檔不存在
- [x] `wallet/index.ts` 的 `handle*` export 名與 HOW 命令表一致
- [x] `simulate/index.ts` 仍 export HOW 模擬表的公開名字
- [x] `wallet/src` 內除 `shared/ui-messages.ts` 外，所有 **≥50 行**的 `.ts` 檔首有英文職責註解（≤100 words）；**&lt;50 行**可無
- [x] 沒改到的超過 400 行檔仍在原路徑：`approval/shell.ts`、`popup/style.css`、`popout/style.css`、`shared/ui-messages.ts`、`background/home-tokens/home-tokens-service.ts`、`popup/accounts/AccountsScreens.tsx`、`popup/onboarding/OnboardingScreens.tsx`、`popup/settings/SettingsScreens.tsx`、`popup/PopupMarkup.tsx`
- [x] 命令字串、storage key、Wallet Standard 能力表與 0.23.0 相同
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 無畫面行為改動，不要求未封裝擴充手驗
- [x] 文件與程式無真實密碼／助記詞／私鑰
- [x] 版本號檔對齊 `0.24.0`；狀態 `shipped` 須使用者同意

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `AGENTS.md` | Track 1 寫入註解規則 |
| `wallet/src/background/wallet/index.ts` | 命令對外 re-export；函式名不變 |
| `wallet/src/background/handlers/wallet-dispatch.ts` | 命令字串與 `../wallet` import 不變 |
| `wallet/src/background/wallet/account-commands.ts` | Track 2 刪除前的帳戶命令集 |
| `wallet/src/background/simulate/simulate-pending-tx.ts` | Track 3 刪除前的模擬實作 |
| `wallet/src/background/simulate/index.ts` | 模擬公開 export |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | 只改 import，不改 CU／模擬步驟 |
| `wallet/src/background/close-empty/close-empty-service.ts` | Track 4 刪除前的列出／計畫／送出 |
| `wallet/src/background/close-empty/commands.ts` | 三個 close-empty 命令的薄包裝 |
| `wallet/src/background/close-empty/plan-store.ts` | 計畫仍只活在記憶體 |
| `wallet/scripts/gen-ui-messages.mjs` | 本版不跑、不改 |
