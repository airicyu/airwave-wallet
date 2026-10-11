# Implementation review — 0.30.0 Airwave Wallet

- 日期：2026-10-11（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**（同一份報告累加；ID 不重編）
- 角色：實作審查（不改程式、不加功能、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 抽樣：`assess.ts`、`host-tools.ts`、`rpc-read.ts`、`runtime.ts`、`bridge.ts`、`openrouter.ts`、`local-flags.ts`、`offscreen/main.ts`、`sandbox/main.ts`、`agent-harness/loop.ts`、`tx-ai-widget.ts`、`ui-handlers.ts`、`dapp-handlers.ts`、`pending.ts`、`wallet-finish-send.ts`、`storage-keys.ts`、`session-state.ts`、`manifest.config.ts`；建置產物 `wallet/dist` 的 sandbox HTML、manifest CSP、含 OpenRouter URL 的 chunk
- **總評：** 第 3 輪依現碼關閉 **M5**：`rpcRead`／`enrichFlags` 聽 session abort，定級前的 `getMultipleAccounts` 不會在 90 秒之後再把 `running` 留滿 15 秒。H1、M1、M2、M3、M4、L4 抽樣仍關。未關閉 **H2**（沒有未封裝擴充走查，也沒有 OpenRouter／Decisions 網路證據）。未關閉 MEDIUM：無。**不可出貨。**

## Findings

關閉＝現碼對上 INDEX／HOW。追蹤表裡的「已修，待複審」本輪不採信，只看現碼。仍開＝契約或驗收未滿足。

### HIGH

#### H1 — RPC 未就緒或帳戶讀取失敗時，assess 仍可定成 low，並丟掉 `owner_mismatch` — **關閉**

第 1 輪：空 `rpcUrl` 或 `getMultipleAccounts` 沒有 `result` 時仍呼叫 Decisions，回 `low` 就顯示 low；`owner_mismatch` 不會出現。

第 2 輪：`enrichFlags` 回 `chainRead`。空 `rpcUrl`（mainnet 未就緒時 `effectiveRpcUrl` 就是空字串，與 `jsonRpcMissing` 同一條件）或 `chainRead === "failed"`（沒有 `result`，或 `result.value` 不是陣列）時，`runSession` 不呼叫 `gradeReport`，改走 `assessLevelWithoutChain`。`decisionsLevel` 固定 `unknown`，顯示等級再套下限。沒有會抬級的位元組旗標時，顯示就是 unknown。`owner_mismatch` 仍只在鏈上 owner 讀得到且與指令 owner 不同時寫入；讀取失敗不會憑空加這面旗標，所以不會被抬成 high。這符合 HOW：Decisions 之前當 unknown，下限只作用在已經算出的旗標上。核准按鈕仍不看等級。

`result.value` 裡個別帳戶是 null、或解析不出 owner 時，`chainRead` 仍是 `ok`，仍會打 Decisions。這不在第 1 輪點名的「沒有 result／空 URL」路徑裡，本輪不另開 ID。

第 3 輪抽樣：空 `rpcUrl` 在 `enrichFlags` 直接 `chainRead: "skipped"`、不打 RPC；`runSession` 仍用 `!settings.rpcUrl.trim()` 擋住 Decisions。沒有 `result` 仍是 `failed`。abort 後的 `{ ok: false, error: "aborted" }` 沒有 `result`，同樣不打 Decisions。沒有被這次 timeout 接線打開。

位置：`wallet/src/background/tx-ai/host-tools.ts` `enrichFlags`；`wallet/src/background/tx-ai/assess.ts` `runSession`／`publishWithoutChain`；`wallet/src/shared/tx-ai.ts` `assessLevelWithoutChain`。

#### H2 — INDEX 手驗與未封裝擴充無證據 — **仍開**

INDEX 要求開關 off／無 key 時網路上沒有 OpenRouter，on＋key 時運算中到等級 icon、`en`／`zh-Hans` 報告語系、核准後再開無上筆報告且 offscreen 已關、Decisions 失敗為灰 icon，以及**未封裝擴充走完**（靜態截圖不算）。本輪仍只讀檔、跑 `typecheck`／`build`、以及純函數 `node --test`。沒有未封裝擴充走查，沒有網路攔截紀錄。本環境的瀏覽器不能載入未封裝擴充。靜態讀碼不算手驗通過。

### MEDIUM

#### M1 — offscreen 的 start／abort 閘用 URL 子字串，核准 popout 進得去 — **關閉**

第 2 輪：`fromServiceWorker` 要求同一擴充、沒有 `sender.tab`，而且 URL 為空、或含 `service-worker`、或含 `/background`。核准頁是 `src/popout/index.html`，對不上這組允許字串。建置後的 service worker 是 `service-worker-loader.js`，URL 含 `service-worker`，SW 自己的 `assess.start` 仍進得去。Sandbox 的 `window.message` 仍核對 `event.source === parent`。空 URL 仍放行，這是給 Chrome 有時不給 SW `sender.url` 的口；有文件 URL 的 popup／popout／side panel 不會走這條。

第 3 輪抽樣：`offscreen/main.ts` 的條件沒有放寬。建置後 `dist/manifest.json` 的 service worker 仍是 `service-worker-loader.js`。

位置：`wallet/src/offscreen/main.ts`。

#### M2 — 側欄通知失敗時，同一 `requestId` 可能排隊兩輪 assess — **關閉**

第 2 輪：`presentDappApproval` 仍可能 `addPending` 兩次，每次都會 `maybeStartTxAi`。`startIfConfigured` 在 `await readSettings()` 之前就把 `requestId` 放進 `startClaims`；第二個呼叫在這裡返回。`rememberTxAiSession` 也拒絕已經在 session 或 queue 的 id。同一 id 只會進佇列一次。

`startClaims` 不會在設定關閉、key 空白、或 pending 已消失時刪掉。這保住「恰好一次」，也讓失敗的那次不再重試。`readSettings` 若丟出例外，該 id 不會啟動 assess。本輪不另開 ID。

第 3 輪抽樣：`startClaims.add` 仍在 `await readSettings()` 之前。`rememberTxAiSession` 仍拒絕已在 `sessions` 或 `queue` 的 id。`presentDappApproval` 側欄失敗後仍會再 `addPending` 一次。沒有被打開。

位置：`wallet/src/background/tx-ai/assess.ts`；`wallet/src/background/tx-ai/runtime.ts`；`wallet/src/background/handlers/dapp-handlers.ts`。

#### M3 — 90 秒 wall-clock 只包住 harness loop，不含 Decisions — **關閉**

第 2 輪：`runSession` 一開始就對同一個 `AbortController` 設 90 秒。`waitForLoop` 在 abort 時以 `timeout` 結束，狀態是 `error`。`gradeReport` 的 `fetch` 帶這個 signal；逾時後若 session 還在，改 `publishWithoutChain`（unknown，再套下限），不會停在 `running`。Loop 階段的逾時是 `error`／`timeout`。Decisions 階段的逾時是 unknown 加下限。兩邊的 icon 都是灰 unknown，除非位元組旗標把等級抬上去。這符合 HOW「逾時 → error／UI unknown」以及「unknown 仍可被下限抬高」。

第 3 輪抽樣：`TX_AI_WALL_MS` 仍是 90_000。`gradeReport`／`requestDecisionsLevel` 的 `fetch` 仍帶 `session.abort.signal`。abort 後仍走 `publishWithoutChain`，不留下 `running`。定級前讀取見已關閉的 **M5**。

位置：`wallet/src/background/tx-ai/assess.ts`；`wallet/src/background/tx-ai/openrouter.ts`。

#### M4 — `walletSend`／`signAndSendTransaction` 核准後，assess 要等 pending 移除才丟 — **關閉**

第 2 輪：這兩種 kind 的核准在 `void runWalletSendAfterApprove(...)` 之前同步 `discardTxAi`。回應不等 loop、也不等廣播。`discardTxAi` 會 abort、刪 session、並在沒有其他 assess 時關 offscreen。`takePending`／`removePending` 仍會再丟一次。拒絕、逾時、關窗、`ui.abortPending` 仍走 `takePending`。`signTransaction` 仍在 `finishSignTransaction` 開頭 `takePending`。

丟棄發生在解鎖與讀 settings 的 await 之後、廣播之前。廣播與確認期間 loop 不再跑。

第 3 輪抽樣：兩段核准仍在 `void runWalletSendAfterApprove` 之前呼叫 `discardTxAi`，回應不 await assess。`takePending`／`removePending` 仍呼叫 `discardTxAi`。

位置：`wallet/src/background/handlers/ui-handlers.ts`；`wallet/src/background/pending/pending.ts`。

#### M5 — 90 秒逾時沒有打斷定級前的帳戶讀取 — **關閉**

第 2 輪：HOW 規定整體 wall-clock 90 秒，逾時就 abort，UI 為 unknown。當時 `enrichFlags` → `rpcRead` 用自己的 `AbortSignal.timeout(15_000)`，不接 session 的 abort。Loop 若在接近 90 秒時結束，接著的 `getMultipleAccounts` 最多再跑 15 秒；這段時間狀態維持 `running`，`activeId` 仍佔著。

第 3 輪：追蹤表寫「已修，待複審」，不以該句關閉，只看現碼。`runSession` 仍在開頭對同一個 controller 設 90 秒，並把 `session.abort.signal` 傳進 `enrichFlags`。`enrichFlags` 把它傳給 `rpcRead`。`rpcRead` 用 `linkedSignal`：父 signal abort 或 15 秒，都會 abort 同一個 `fetch`。90 秒到時，進行中的定級前讀取會被父 signal 打斷，不會再等到自己的 15 秒上限。返回值沒有 `result`，`chainRead` 為 `failed`；`runSession` 因 aborted 或 failed 走 `publishWithoutChain`，不呼叫 `gradeReport`。狀態離開 `running`（unknown，再套下限）。`finally` 接著 `releaseActiveTxAi`，佇列中的下一筆不用再等那 15 秒。

工具迴圈裡的 `simulate` 仍用 `SimDeadline`（15 秒），不接 session signal。那條不在定級前的 `enrichFlags` 路徑上。`waitForLoop` 在 90 秒 abort 時自己結束，不等 simulate 返回，所以它不會把 `running` 再留 15 秒。本輪不另開 ID。

位置：`wallet/src/background/tx-ai/rpc-read.ts` `linkedSignal`；`wallet/src/background/tx-ai/host-tools.ts` `enrichFlags`；`wallet/src/background/tx-ai/assess.ts` `runSession`。

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | 記錄 | `assess.start` 仍不帶 HOW 寫的 session 位元組與獨立 `locale` 欄。語系在 `buildAssessPrompt`；快照留在 SW。第 3 輪未改。 |
| L2 | 記錄 | `rpc_get_multiple_accounts` 的 schema 寫最多 20 個 pubkey，`executeHostTool` 收到陣列時切到 100。`rpcRead` 的 method 仍由呼叫點傳入字面字串。泛用 `rpc(method, params)` 與 `sendTransaction` 沒有執行路徑。第 3 輪未改。 |
| L3 | 記錄 | 出貨才對齊版本號。`wallet/package.json` 與建置後 `manifest.json` 仍是 `0.29.0`。INDEX 明文出貨時才改 `0.30.0`。 |
| L4 | 關閉 | `ui.getPending` 失敗時把狀態設成 idle、`paint`、並 `stopTimer`。第 3 輪抽樣：這段仍在 `tx-ai-widget.ts`。Pending 已丟時，「運算中」會拿掉，輪詢會停。 |
| L5 | 記錄 | `approval/shell.ts` 仍遠超 400 行。AI 控件在 `tx-ai-widget.ts`。殼仍負責模擬、CU、核准。第 3 輪未改。 |
| L6 | 記錄 | Widget 連續 4 次看到 `idle` 就停計時器；同一個 `requestId` 再 `renderTxAiSlot` 不會重開。Session 要等 `readSettings` 才建立。這段通常遠短於約 4.8 秒。已進佇列的下一筆在 `rememberTxAiSession` 時就是 `running`，不會被這 4 次 idle 漏掉。第 3 輪未改。 |

## 焦點核對（第 2 輪；第 3 輪抽樣仍成立）

| 焦點 | 結論 |
|------|------|
| Sandbox 無 `chrome` | **通過。** Manifest sandbox CSP 為 `sandbox allow-scripts`（無 `allow-same-origin`），並有 `connect-src 'none'`。頁面 meta 同樣 `connect-src 'none'`。`sandbox/main.ts` 只 `postMessage` 給 parent。第 3 輪建置後 sandbox HTML 仍載入 modulepreload polyfill、`tx-ai` 常數、`loop`、protocol、sandbox `main`。OpenRouter URL 只出現在 service worker chunk `index.ts-UacO3QJ-.js`，不在 sandbox 的 `loop`／`main`／protocol，也不在 offscreen chunk。Offscreen chunk 有 `chrome`。 |
| 訊息只經 offscreen；SW 才打 OpenRouter／Decisions／tools／flags | **通過（M1 已關）。** Sandbox 只對 parent postMessage。Offscreen 轉發 JSON，不執行 tool、不持 key、不打 Decisions。Flags 在 `local-flags.ts`，由 SW 的 `enrichFlags` 呼叫。 |
| 不採信 sandbox 回傳 flags | **通過。** `decode_message` 把 flags 放進 tool body 給模型讀。定級用另一次 `enrichFlags(session.snapshot)`。`gradeReport` 只對這份 flags 做 `applyFlagsFloor`。鏈上讀取失敗或 abort 時不打 Decisions。 |
| `getState`／`toPublicSettings` 無明文 key | **通過。** `PublicSettings` omit `openRouterApiKey`，改附 `openRouterConfigured`。`handleGetState` 與 patch settings 走 `toPublicSettings`。`wallet.readIntegrationSecrets` 才回 key，且 `wallet.*` 僅擴充頁。單元測試覆蓋 omit。 |
| Approve 不等 assess；refresh 不重跑 | **通過（M4 已關）。** `ui.resolvePending` 不 await assess。`ui.simulatePendingTx` 不呼叫 `maybeStartTxAi`、不重置 `TxAiAssessState`。CU 變更只更新 `workingTx`，不更新已拍下的 snapshot。`applyApproveFromSimulation` 仍只看模擬是否 unparseable、以及 CU 草稿。 |
| Pending 結束丟 assess；不寫 `chrome.storage` | **通過。** Session 是 SW `Map`。`takePending`／`removePending` 與兩段廣播核准都呼叫 `discardTxAi`。`tx-ai/` 沒有 `chrome.storage` 寫入。 |
| 禁止泛用 RPC／廣播 method | **通過。** Tool 名不在 `HOST_TOOL_NAMES` 即拒絕。RPC method 在 `executeHostTool` 為字面字串。`sendTransaction`／`vault.read`／`signTransaction` 由 `hostToolVerdict` 拒絕。單元測試覆蓋這三類名稱。 |
| 等級不禁用核准 | **通過。** Widget 不碰核准鈕。見上列 `applyApproveFromSimulation`。 |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 第 3 輪 2026-10-11，cwd `wallet`，PowerShell 分開執行，兩者 exit 0 |
| Settings 四欄可持久；未知 Decisions 模型回退 `liquid/d1`；`getState`／`toPublicSettings` 無明文 key；`readIntegrationSecrets` 含 key（僅擴充頁） | **靜態通過；設定頁手驗無** | `normalizeDecisionsModel`／`normalizeSettings`；`toPublicSettings`；`handleReadIntegrationSecrets`；`wallet.*` 僅擴充頁。單元：未知模型回退、公開 settings 不含 key。未走設定 UI |
| 開關 off 或 key 空：三種簽署審批無 AI 控件、網路無 OpenRouter | **靜態通過；網路手驗無** | `startIfConfigured` 在旗標關或 trim 空時 return，不建 session。Widget 對 `idle` 不畫控件。無 DevTools 紀錄。見 **H2** |
| 開關 on＋key：運算中→等級 icon；點開可見報告；`en`／`zh-Hans` 報告語系對應 | **未通過手驗** | `tx-ai-widget.ts`；`buildAssessPrompt` 依 `replyLanguage`。未封裝、未看模型輸出。見 **H2** |
| 分析進行中仍可改 CU、refresh、核准／拒絕；核准不等待 assess | **靜態通過；手驗無** | `simulatePendingTx` 與 `resolvePending` 不 await assess。見焦點表 |
| Refresh 只影響模擬，不重跑 AI、不洗掉已完成報告 | **靜態通過；手驗無** | 同 requestId 的 widget 保留 `latest`；SW 不重入已有 session |
| Approve／reject／abort 後再開新 pending：無上筆報告；offscreen 已關 | **靜態通過；手驗無** | `discardTxAi` 掛在 `takePending`／`removePending`，以及兩段廣播核准回應之前。未看 offscreen 是否關閉。見 **H2** |
| Sandbox 頁腳本不可呼叫 `chrome.storage`／`chrome.runtime.sendMessage` | **靜態通過** | 見焦點表。未在擴充裡對 sandbox 做執行期探測 |
| Host 拒絕假 tool（vault／sign）、`sendTransaction`、未知 tool 名 | **單元通過** | `tx-ai.test.ts`：`vault.read`、`signTransaction`、`chrome.storage`、`sendTransaction` 為 reject；`decode_message` 與 `rpc_get_signatures_for_address` 為 allow。未打真實 RPC |
| Flags 下限：`unlimited_approve` 不得低於 `watch`；`owner_mismatch` 不得低於 `high` | **單元通過** | `applyFlagsFloor` 與 `assessLevelWithoutChain` 測試含這兩條，以及 `unknown_program`／`durable_nonce`／`lookup_account_unchecked` 不抬級。鏈上讀取失敗改走 unknown，見 **H1** |
| Decisions 失敗／逾時 → 灰 unknown；有報告仍可展開 | **靜態通過；未打真 API** | 非 2xx、解析失敗、throw 皆 `unknown`，再套下限。Loop 逾時見 **M3**。定級前讀取逾時見 **M5**（已關）。Widget：`done`／`error` 且有 `reportText` 可展開。無真 API |
| Mainnet RPC 未就緒或空 `rpcUrl`：tool 失敗 → assess error／unknown，不擋核准 | **靜態通過；手驗無** | 空 URL 或 `chainRead === "failed"` 不打 Decisions，顯示 unknown 或下限。見 **H1**。不擋核准：靜態通過 |
| 文件無真實 key、助記詞、密碼 | **通過** | 抽查本版 INDEX／HOW／reasoning／HANDOFF 與本報告。單元只用標成測試的假 key，報告不貼出 |
| 未封裝擴充走完主路徑 | **失敗** | 無走查。見 **H2** |

## 測試結果

- **無整包測試指令**（GUIDELINES 測試表；本版 INDEX 未引入 runner）。禁止假設 `bun test`。
- 已跑（cwd `wallet`，PowerShell 分開執行）：`npm run typecheck` → exit 0；`npm run build` → exit 0（vite 產出 sandbox／offscreen／service worker）。
- 純函數：`esbuild` 將 `wallet/src/shared/tx-ai.test.ts`（`wallet/tsconfig.json` exclude `src/**/*.test.ts`）bundle 成系統暫存 mjs，`node --test` **5 通過、0 失敗**。跑完已刪暫存檔，倉庫源碼樹無該 mjs。
- 手驗：未執行。沒有未封裝擴充、沒有 OpenRouter／Decisions 網路紀錄。本環境瀏覽器不能載入未封裝擴充。
- 建置抽查：sandbox HTML 的 CSP 為 `connect-src 'none'`。`dist/manifest.json` sandbox CSP 同為 `connect-src 'none'`，版本仍 `0.29.0`。OpenRouter 主機字串只在 service worker chunk。
- 架構禁區抽樣：pending 仍是 SW `Map`；assess 不進 storage；`schemaGeneration` 仍 1；未見硬編碼密碼；`wallet/package.json` 無 bubble-harness。未改 `../solibra-wallet`。
- 非目標抽查：無代簽、無以等級禁用核准、無手動再分析、`signMessage` 不在 `TX_AI_KINDS`、報告 prompt 依 `settings.locale`。Harness `maxSteps` 仍用 `TX_AI_MAX_STEPS`（12）。

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置 |
|----|----|------|----------|
| H1 | H | 關閉（第 2 輪；第 3 輪抽樣仍關） | 空 `rpcUrl` 或 `chainRead === "failed"` 不打 Decisions，改 `assessLevelWithoutChain` |
| H2 | H | 仍開 | 未封裝手驗與 OpenRouter 網路證據 |
| M1 | M | 關閉（第 2 輪；第 3 輪抽樣仍關） | offscreen `fromServiceWorker` 只收無 tab、URL 空或含 `service-worker`／`/background` |
| M2 | M | 關閉（第 2 輪；第 3 輪抽樣仍關） | `startClaims` 在 await 前佔用；`rememberTxAiSession` 拒絕重複 id |
| M3 | M | 關閉（第 2 輪；第 3 輪抽樣仍關） | 共用 90 秒 abort 蓋住 loop 與 Decisions |
| M4 | M | 關閉（第 2 輪；第 3 輪抽樣仍關） | 兩段 `runWalletSendAfterApprove` 之前同步 `discardTxAi` |
| M5 | M | 關閉（第 3 輪） | `rpcRead`／`enrichFlags` 接上 session abort；定級前讀取不再在 90 秒後多等 15 秒 |
| L1–L3、L5 | L | 記錄 | start 訊息欄位／RPC 上限／版本號／shell 行數 |
| L4 | L | 關閉（第 2 輪；第 3 輪抽樣仍關） | `getPending` 失敗時 paint idle 並停計時器 |
| L6 | L | 記錄 | 連續 4 次 idle 停輪詢；同一 requestId 不重開計時器 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-11 | 未關閉 HIGH：H1（RPC 失敗仍可定級）、H2（手驗無證據）。`typecheck`／`build` 通過；純函數 4 項通過。隔離、key 省略、不採信 sandbox flags、核准不等待、refresh 不重跑、禁止泛用 RPC、等級不禁用核准，靜態符合。不可出貨。 |
| 複審 | 2026-10-11 | H1、M1、M2、M3、M4、L4 依現碼關閉。未關閉 HIGH：H2。新開 M5（帳戶讀取可拖過 90 秒）、L6（idle 輪詢停掉）。`typecheck`／`build` 通過；純函數 5 項通過。手驗未做。不可出貨。 |
| 複審 | 2026-10-11 | M5 依現碼關閉：定級前讀取聽 session abort，`running` 不會在 90 秒後再留滿 15 秒。H1、M1、M2、M3、M4、L4 抽樣仍關。未關閉 HIGH：H2。未關閉 MEDIUM：無。`typecheck`／`build` 通過；純函數 5 項通過。手驗未做。不可出貨。 |
