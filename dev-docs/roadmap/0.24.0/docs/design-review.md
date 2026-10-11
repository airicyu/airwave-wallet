# Design review — 0.24.0 原始檔職責分檔

- 日期：2026-10-09（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（初審同日；本檔累加，ID 不重編）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游：[`../../0.23.0/INDEX.md`](../../0.23.0/INDEX.md)（行為不變的對照；狀態 `shipped`）。目錄契約：[`../../0.14.0/INDEX.md`](../../0.14.0/INDEX.md)
- 構想來源：INDEX 寫規劃對話，沒有本版 backlog 檔
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)（INDEX 未推翻；本版寫明行為、命令字串、storage key、pending、vault 維持 0.23.0）
- 現行程式抽樣：`wallet/src/background/simulate/simulate-pending-tx.ts`、`close-empty/close-empty-service.ts`、`home-tokens/index.ts`，以及命令出口 `wallet/index.ts`、`simulate/index.ts`、`sign-tx-simulate.ts`、`close-empty/index.ts`、`close-empty/commands.ts`（現碼未實作本版 ≠ 設計 HIGH）
- **總評（第 2 輪）：** **無未關閉 HIGH。設計審查門檻通過，可以開工。** 初審 H1、M1–M6、L1–L4 都已寫進 INDEX／HOW／reasoning／HANDOFF。本輪新增 L5，非阻擋。提案可行，不是整份不可行。待拍板仍空。HANDOFF 仍有 paste-ready。本檔不是已定案。

## Findings

關閉＝已寫進 INDEX／HOW／reasoning／HANDOFF。仍開＝契約仍分叉。穩定 ID 不重編號。初審原文保留，第 2 輪只加狀態與核對。

### HIGH

#### H1 — `commands/` 沒有 `index.ts`，與本版重申的目錄契約不能同時成立 — **關閉**（第 2 輪）

已定案「目錄契約」沿用 0.14.0：新子資料夾有 `index.ts`，只 re-export 對外符號；資料夾之間只 import 對方的 `index.ts`。HOW 命令樹把 `connection-commands.ts`、`send-command.ts`、`settings-command.ts` 放在 `wallet/commands/` 底下，沒有 `commands/index.ts`。`account/`、`combined/`、`session/` 各自有 `index.ts`。

`wallet/index.ts` 要繼續 export 那些 `handle*`，就必須 import `./commands/connection-commands` 這類非入口檔。那一步同時違反「新子資料夾有 index」與「資料夾之間只 import index」。

建議寫死：新增 `wallet/src/background/wallet/commands/index.ts`，re-export 三個未分組命令檔，以及 `account/`、`combined/`、`session/` 的 `index.ts`。`wallet/index.ts` 只從 `./commands` re-export，函式名仍與 HOW 命令表相同。HANDOFF paste-ready 補同一句。不要留舊路徑 shim。

第 2 輪：INDEX 已定案「命令出口」、HOW 命令樹、reasoning、HANDOFF paste-ready 都寫了這句。`wallet/index.ts` 不 import `commands/` 底下的其他檔。關閉。

### MEDIUM

#### M1 — 模擬私有函式的歸檔句子與現碼呼叫對不上 — **關閉**（第 2 輪）

HOW 寫 `inspector-url.ts` 帶走「只被 `buildInspectorUrl` 使用的 base64」。現碼 `bytesToBase64` 也被 `simulateTransactionRpc` 用來組 `simulateTransaction` 的 base64 請求體（`simulate-pending-tx.ts` 約第 149–161、277 行）。

`buildInstructions` 只被 `runPhase2Simulation` 呼叫，不在 `simulateTransactionRpc` 裡。`shortPk` 同時被指令列表與 phase 2 差額／fee payer 短地址使用。HOW 又寫「只被一個新檔使用的私有函式跟那個檔走」，以及 `simulate-rpc.ts`「組指令列表所需的帳戶金鑰」。`simulateTransactionRpc` 本身只打 RPC，不組指令列表。兩句一起讀，指令列表會被放進 `phase2-deltas.ts`，也會被放進 `simulate-rpc.ts`。

公開名字（`SimDeadline`、`buildInspectorUrl`、`simulateTransactionRpc`、`Phase2SimContext`、`runPhase2Simulation`，以及今日 `sign-tx-simulate.ts`／`compute-budget-tx.ts` 經 `simulate/index.ts` 的 `export *`）與「不開 `simulate/pending/`」可對上，這部分不是 HIGH。

建議在模擬表點名：

- `bytesToBase64` 為 `inspector-url.ts` 與 `simulate-rpc.ts` 共用（同資料夾 import，維持同一實作）
- `buildInstructions` 與其專用的 `PROGRAM_NAMES`、`programLabel`、`ixAccounts`、`bytesToHex` 放在哪一檔（建議跟唯一呼叫端 `phase2-deltas.ts`，或另點名同層檔；`simulate-rpc.ts` 的職責句改成只打 RPC）
- `shortPk` 放在指令列表與差額都能 import 的那一檔
- `v0LookupCount` 跟 `resolve-account-keys.ts`（現由 `runPhase2Simulation` 與金鑰展開共用）

`sign-tx-simulate.ts` 今日從 `./simulate-pending-tx` 引入 `runPhase2Simulation`、`SimDeadline`、`simulateTransactionRpc`、`Phase2SimContext`。改 import 到同層新檔，不要改從 `./index` 轉一圈。

第 2 輪：HOW 模擬表已改成 `tx-base64.ts` 持有 `bytesToBase64` 的唯一實作，`inspector-url.ts` 與 `simulate-rpc.ts` 都呼叫它；`simulate-rpc.ts` 寫明不算差額、不組指令列表；`buildInstructions`、`PROGRAM_NAMES`、`programLabel`、`ixAccounts`、`bytesToHex`、`shortPk` 跟 `phase2-deltas.ts`；`v0LookupCount` 與 `keysFromLoaded` 跟 `resolve-account-keys.ts`。HANDOFF paste-ready 有同一組歸檔。`sign-tx-simulate.ts` 改同層 import、不經 `./index` 已寫明。

現碼再核：`bytesToBase64` 只有上述兩個呼叫端；`buildInstructions` 只在 `runPhase2Simulation`；`shortPk` 的呼叫端都在指令列表與差額這條 phase 2 路徑（`programLabel`、`ixAccounts`、`buildDeltas`、fee payer）。`keysFromLoaded` 與 `v0LookupCount` 的唯一呼叫端也是 `runPhase2Simulation`，不是金鑰展開函式內部；表上仍把它們放進 `resolve-account-keys.ts`，phase 2 再從該同層檔 import。這是點名後的歸檔，不再和「其餘跟唯一呼叫端走」搶未點名的函式。關閉。

#### M2 — `invalidLabel` 被三個帳戶命令檔共用，命令樹沒有歸宿 — **關閉**（第 2 輪）

`account-commands.ts` 的 `invalidLabel` 被助記詞產生／匯入、密鑰產生／匯入、改名、新增觀察帳戶呼叫。`loadedFromSecretRaw` 只被 `handleImportAccount` 使用，跟 HOW 放進 `secret-key-accounts.ts` 一致。

三檔拆開後，`invalidLabel` 不能放進只 re-export 的 `commands/account/index.ts`。複製三份會讓錯誤碼 `INVALID_LABEL` 與 message 字串分叉。

建議寫死：留在 `commands/account/` 內一個非命令模組（同資料夾互引），或明定三檔各保留字面相同的實作。錯誤碼與 message 維持現碼。不要把它升成 `wallet/index.ts` 的公開 export。

第 2 輪：HOW 命令樹有 `invalid-label.ts`，同資料夾可 import，`index.ts` 不 export `invalidLabel`，`INVALID_LABEL` 與現有 message 不變。INDEX Track 2 與 HANDOFF paste-ready 同句。現碼該函式只活在 `account-commands.ts`，沒有第二份實作要合併。關閉。

#### M3 — `planCloseEmpty` 讀的是清單記憶體，不是 closable cache — **關閉**（第 2 輪）

`lastListEntries` 在 `listClosableTokenAccounts` 成功路徑寫入（含 cache 命中後再 enrich 的那份）。`planCloseEmpty` 用這份清單組 `listMap`；選中的 token account 不在清單內就 `INVALID_PAYLOAD`。`getLastListClosableEntries` 現無其他呼叫端。`setClosableCache` 只在掃描路徑寫入，cache 命中路徑不回寫 enrich 後的清單。因此計畫不能改讀 `closable-cache` 來代替。

HOW 只說 getter 跟清單檔走、不要另做公開桶，沒寫 `planCloseEmpty` 必須透過這個 getter 讀同一份記憶體。拆檔後變數不再自然可見，實作若改掃描或改讀 cache，收回租金的計畫主路徑會變。

建議寫死：`plan-close-empty.ts` 只經 `getLastListClosableEntries` 取本次清單；不在 `close-empty/index.ts` 加 export；不改「不在上次清單 → `INVALID_PAYLOAD`」。

第 2 輪：INDEX 已定案「收回租金」、HOW 收回租金表、HANDOFF paste-ready 都寫了這三句。現碼 `planCloseEmpty` 仍直接讀 `lastListEntries`（約第 172 行）；cache 命中只寫 `lastListEntries`、不呼叫 `setClosableCache`。getter 今日沒有其他呼叫端，與「不進 `close-empty/index.ts`」一致。關閉。

#### M4 — 列出步驟的 `home-tokens` import 與目錄契約怎麼收，沒寫 — **關閉**（第 2 輪）

`close-empty-service.ts` 現從 `../home-tokens/home-tokens-service` 與 `../home-tokens/owner-parsed-token-cache` 深層 import。`getHomeTokensForOwners`、`homeTokensCacheFingerprint` 已由 `home-tokens/index.ts` 的 `export *` 露出。`getOwnerParsedTokenAccounts` 不在該入口。`closable-enrich.ts` 也深層 import `home-tokens-service`；本版未要求改它。

Track 4 把列出函式搬進新檔時會帶走這兩個 import。已定案又要求資料夾之間只 import `index.ts`。維持深層 import，或改經入口（後者要先讓 `getOwnerParsedTokenAccounts` 出現在 `home-tokens/index.ts`），契約沒有選。

建議擇一寫死：

- **A（建議）：** 已在 `home-tokens/index.ts` re-export 的符號改經 `../home-tokens`。`getOwnerParsedTokenAccounts` 補進該 `index.ts` 再經入口 import。行為與回傳不變。被改到的 `index.ts` 加檔首註解。
- **B：** 已定案寫明這兩條深層 import 本版原樣保留，不當成目錄契約要在本版修的項。`closable-enrich.ts` 維持不動。

第 2 輪：採 A，已寫進 INDEX 已定案、HOW、HANDOFF。`home-tokens/index.ts` 今日仍是 `export *` from `home-tokens-service` 再加 `handleGetHomeTokens`；`getOwnerParsedTokenAccounts` 只在 `owner-parsed-token-cache.ts`。`closable-enrich.ts` 的深層 import 明文留到下次碰到該檔。`home-tokens` 不 import `close-empty`，補 re-export 不造成循環。關閉。

#### M5 — 「禁止一命令一檔」與 `create-combined.ts` 字面衝突 — **關閉**（第 2 輪）

已定案與非目標寫「禁止一命令一檔」。HOW 的 `create-combined.ts` 只放 `handleCreateCombinedAccount`。reasoning 的用意是不要把會一起改的一塊切成十個命令檔，並且建立聚合與增刪成員是兩件職責。

只讀已定案的人會把 `create-combined.ts` 併回 `combined-members.ts`，檔首註解就必須同時寫「建立」與「改成員」。

建議在已定案加一句：禁止的是按命令切碎同一職責；一個職責只對應一個 `handle*` 時，該檔可以只有一個命令。`create-combined.ts` 維持 HOW 那一列。

第 2 輪：INDEX 已定案「150 行」、HOW 永久規則、reasoning 都寫了這個例外，並點名 `create-combined.ts`。關閉。

#### M6 — 要照抄進 `AGENTS.md` 的註解規則含本版範圍句 — **關閉**（第 2 輪）

HOW「註解規則」有一句「0.24.0 只拆本 HOW 點名的檔」，Track 1 要求照抄進 `AGENTS.md`，且不可改適用範圍。該小節是給之後每個 agent 的永久規則。照抄之後，「碰到超過 400 行必須 review」會和「只拆 0.24.0 HOW 點名的檔」綁在同一段永久文字裡。INDEX 非目標已經把審批殼、兩份 CSS、畫面檔、`home-tokens-service.ts`、`ui-messages.ts` 留到之後碰到再處理。

建議：`AGENTS.md` 只留永久門檻（英文、最多 100 words、400 行要 review、`background/wallet/` 命令檔 150 行且不遞迴、改到無註解的檔要補、本規則生效前已存在且本輪未改的檔不批量補）。「0.24.0 只拆 HOW 點名的檔」留在本版 INDEX／HOW，不寫進永久小節。

第 2 輪：HOW 分成「永久規則」與「本版範圍」。永久規則寫明不要把「0.24.0 只拆哪些檔」抄進 `AGENTS.md`。INDEX 已定案「註解規則放哪」與 HANDOFF paste-ready 同句。Track 1 驗收要的「不批量補既有檔」留在永久規則（尚未改到的檔不批量補），不是把本版拆檔清單寫進 `AGENTS.md`。關閉。

### LOW

#### L1 — 驗收「三個畫面檔」沒有路徑 — **關閉**（第 2 輪，非阻擋）

依現碼行數，超過 400 行、本版又說留在原路徑的畫面檔是 `popup/accounts/AccountsScreens.tsx`、`popup/onboarding/OnboardingScreens.tsx`、`popup/settings/SettingsScreens.tsx`。驗收句未寫這三個路徑。

第 2 輪：出貨驗收已列出這三個路徑，以及 `popup/PopupMarkup.tsx`。關閉。

#### L2 — 收回租金「若跨檔」的例句，現碼並未跨檔 — **關閉**（第 2 輪，非阻擋）

`feeTotalForPlan`、`assertPlanNotStale`、`classifyPlanResult`（含 `flattenResults`）只被 `commitCloseEmpty` 使用。HOW 已寫「若跨檔」才放進既有共用檔。留一句「這三個現況跟 commit 檔走」可避免為了例句搬進 `plan-store.ts`。

第 2 輪：HOW 把這四個函式點名跟 `commit-close-empty.ts`。現碼 `feeTotalForPlan` 只被 `assertPlanNotStale` 使用，後者與 `classifyPlanResult` 只被 `commitCloseEmpty` 使用；`flattenResults` 只被 `classifyPlanResult` 使用。未點名的 `walk` 只被 `flattenResults` 使用，依「只被一步使用的私有函式跟那一步走」留在 commit 檔。關閉。

#### L3 — 「實質修改」沒寫只改 import 算不算 — **關閉**（第 2 輪，非阻擋）

INDEX 要求新建或實質修改的 `.ts` 有檔首註解。Track 3 寫 `sign-tx-simulate.ts` 只改 import、新檔才加註解。Track 4 寫被改到的既有檔要加或更新註解。`commands.ts`、`wallet/index.ts`、`simulate/index.ts` 落在哪一側，兩句不完全同一套。

第 2 輪：已定案「誰要有註解」寫明文字有改動的 `.ts`／`.tsx` 都要有檔首註解，包含只改 import 的檔與 `index.ts`。HOW 永久規則與 Track 3 對 `sign-tx-simulate.ts` 同句。關閉。

#### L4 — `index.ts` 註解句用「哪一個資料夾」單數 — **關閉**（第 2 輪，非阻擋）

`wallet/index.ts` 與建議中的 `commands/index.ts` 會 re-export 多於一個子資料夾。一句「re-export 本資料夾的錢包命令入口」仍是一件事。

第 2 輪：HOW 永久規則改為「re-export 這個資料夾的對外介面（可以含多個子資料夾）」。這段是 Track 1 要抄進 `AGENTS.md` 的文字。INDEX 已定案仍寫「哪一個資料夾」，指的是這個 `index.ts` 所屬資料夾的對外介面，不是只准點一個子資料夾。與 HOW 主句一致。關閉。

#### L5 — 模擬 `index.ts` 若沿用 `export *`，同層 helper 會變成新的公開名字 — **仍開／非阻擋**（第 2 輪）

今日 `simulate/index.ts` 是三行 `export *`。`bytesToBase64` 不是 export。拆檔後 `inspector-url.ts` 與 `simulate-rpc.ts` 要從 `tx-base64.ts` import，該函式必須 `export`。`phase2-deltas.ts` 也要從 `resolve-account-keys.ts` import `keysFromLoaded`、`v0LookupCount`、`resolveAccountKeysFromTables`。若 `index.ts` 對這些新檔繼續 `export *`，上述 helper 會變成 `simulate` 的新公開名字。今日對外只有 HOW 點名的那組，加上 `sign-tx-simulate.ts`、`compute-budget-tx.ts` 已 export 的名字。

`withInspector` 只被 `runPhase2Simulation` 使用，會留在 `phase2-deltas.ts`，並呼叫 `buildInspectorUrl`。這一檔應 import `./inspector-url`。若改經 `./index`，而 index 又 re-export phase 2，會在同層形成循環。`sign-tx-simulate.ts` 已禁止走 `./index`；新檔之間這一句還沒寫。

不擋開工：使用者可見行為、命令字串與公開名字清單已經寫死；多出來的 export 不是 Wallet Standard，也不是 pending／custody。建議實作時 `simulate/index.ts` 只轉出 HOW 點名的公開名字，同層互引直接指向檔案。

## 驗收對照

| 驗收句 | 設計層是否可測 | 第 2 輪 |
|--------|----------------|---------|
| `AGENTS.md` 有「原始檔職責註解」，數字與 HOW 一致（100 words、400 行、150 行且不遞迴） | 可對文字 | **M6 關閉**。永久規則與「本版只拆點名檔」已分開 |
| HOW 命令樹、模擬表、收回租金表的路徑存在；點名要刪的舊檔不存在 | 可 | **H1 關閉**。命令樹含 `commands/index.ts` |
| `wallet/index.ts` 的 `handle*` 與 HOW 命令表一致 | 可；現碼出口已與命令表同名 | 無另缺名字 |
| `simulate/index.ts` 仍 export HOW 模擬表的公開名字 | 可 | **M1 關閉**。私有歸檔已點名。**L5**：不要把 helper 再 `export *` 出去 |
| 新建或實質修改的 `.ts` 檔首英文註解 ≤ 100 words | 可數 words | **L3 關閉**。只改 import 也要註解 |
| 未改的超過 400 行檔仍在原路徑 | 可 | **L1 關閉**。三個畫面檔與 `PopupMarkup.tsx` 已寫路徑 |
| 命令字串、storage key、Wallet Standard 能力表與 0.23.0 相同 | 可對 `wallet-dispatch.ts` 字串與能力表 diff | 契約已禁止改；無新方法要宣告 |
| `cd wallet && npm run typecheck` 與 `npm run build` | 實作後測 | 本輪不跑。清單記憶體已由 **M3** 寫死，不能只靠 typecheck |
| 無畫面行為改動，不要求未封裝擴充手驗 | 與「行為不變」一致；本版非目標含畫面／CSS | 手驗豁免寫明了 |
| 文件與程式無真實密碼／助記詞／私鑰 | 本輪提案與抽樣未見 | 維持 |
| 版本號檔對齊 `0.24.0`；`shipped` 須使用者同意 | 出貨程序 | 無 |

Track 2 驗收只寫 typecheck；出貨清單另有 build。以出貨清單為準即可，不另開 finding。

## 與現碼抽樣

行數為初審所計的檔案實體行。第 2 輪未改產品碼；150／400 的分組仍與現碼相符：

| 檔 | 行數 | 提案 |
|----|------|------|
| `account-commands.ts` | 582 | `commands/account/` 三模組。超過 150，應進資料夾 |
| `combined-commands.ts` | 219 | `commands/combined/`。超過 150 |
| `session-commands.ts` | 266 | `commands/session/`。超過 150 |
| `connection-commands.ts`、`send-command.ts`、`settings-command.ts` | 皆 &lt; 150 | 整檔搬進 `commands/`、不拆。與門檻相符 |
| `simulate-pending-tx.ts` | 522 | 同層檔，刪原檔。公開五個名字不變 |
| `close-empty-service.ts` | 512 | 列出／計畫／送出三檔，刪原檔 |
| `sign-tx-simulate.ts` | 317 | 只改 import，並補檔首註解。低於 400，本版不拆 |
| `compute-budget-tx.ts` | 232、`decode-compiled-ix.ts` | 159 | 低於 400。契約不拆。相符 |

`wallet/index.ts` 現 export 的 `handle*` 與 HOW 命令表同名、無多無少。`wallet-dispatch.ts` 從 `../wallet` 取這些 handle，從 `../close-empty` 取三個 close-empty handle。提案不改這個分派檔。

`simulate/index.ts` 為三行 `export *`。`simulate-pending-tx.ts` 的公開符號就是 HOW 點名的五個。`sign-tx-simulate.ts` 從 `./simulate-pending-tx` 引入 `runPhase2Simulation`、`SimDeadline`、`simulateTransactionRpc`、`Phase2SimContext`。見 **L5**。

`close-empty/index.ts` 只從 `./commands` export 三個 `handle*`。`commands.ts` 是薄包裝。`plan-store.ts` 用模組內 `Map`，無 `chrome.storage`。與「計畫只活在記憶體」一致。

`session-commands.ts` 從請求 payload 取密碼，呼叫既有 `decryptVault`／`encryptVault` 與 `../session`。未見把密碼寫進持久欄位。提案要求命令檔繼續只呼叫 `background/session` 的公開入口，且禁止把 vault 明文狀態搬進命令檔。與禁區同向。

超過 400 行、本版留在原路徑的還有：`approval/shell.ts`、`popup/style.css`、`popout/style.css`、`shared/ui-messages.ts`、`home-tokens/home-tokens-service.ts`、`PopupMarkup.tsx`，以及驗收已點名的三個畫面檔。

未見本版提案改 pending 權威、結果廣播、手寫 rehydrate、或未實作的 Wallet Standard 宣告。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉條件 |
|----|----|------|----------|
| H1 | HIGH | 關閉（第 2 輪） | HOW／INDEX／HANDOFF 已寫明 `commands/index.ts`，且 `wallet/index.ts` 只從該入口 re-export |
| M1 | MEDIUM | 關閉（第 2 輪） | 模擬表已寫死 `bytesToBase64`、`buildInstructions`、`shortPk`、`v0LookupCount` 的檔 |
| M2 | MEDIUM | 關閉（第 2 輪） | `invalidLabel` 的檔與「不改錯誤碼／message」已寫進 HOW |
| M3 | MEDIUM | 關閉（第 2 輪） | `planCloseEmpty` 必須讀清單檔記憶體（經 getter），不改讀 cache |
| M4 | MEDIUM | 關閉（第 2 輪） | 已採 A：列出檔經 `../home-tokens`；getter 補進該 `index.ts` |
| M5 | MEDIUM | 關閉（第 2 輪） | 「禁止一命令一檔」已加上單職責例外，保住 `create-combined.ts` |
| M6 | MEDIUM | 關閉（第 2 輪） | 永久註解規則與「本版只拆點名檔」已分開 |
| L1 | LOW | 關閉（第 2 輪）／非阻擋 | 驗收已補三個畫面檔路徑 |
| L2 | LOW | 關閉（第 2 輪）／非阻擋 | commit 檔已點名那四個私有函式 |
| L3 | LOW | 關閉（第 2 輪）／非阻擋 | 只改 import 也要檔首註解 |
| L4 | LOW | 關閉（第 2 輪）／非阻擋 | HOW 已允許 `index.ts` 註解含多個子資料夾 |
| L5 | LOW | 仍開／非阻擋 | 可寫明 `simulate/index.ts` 只轉出既有公開名字；同層互引不經 `./index` |

## 歷審摘要

| 輪 | 日期 | 結論 |
|----|------|------|
| 初審 | 2026-10-09 | H1 仍開，門檻未通過。M1–M6 應修。L1–L4 非阻擋。提案可行，不是整份不可行。無前輪可關項。 |
| 第 2 輪複審 | 2026-10-09 | H1、M1–M6、L1–L4 關閉。無未關閉 HIGH，無應修 MEDIUM。L5 非阻擋。門檻通過。提案可行。 |
