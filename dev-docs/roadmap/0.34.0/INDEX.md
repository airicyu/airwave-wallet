# 0.34.0 — 簽署 AI：SW preflight 進 prompt、精簡 OpenRouter tools

- **狀態：** `shipped`
- **上游版本：** [0.33.0](../0.33.0/INDEX.md)（預期變動 UI；本版非目標）、[0.32.0](../0.32.0/INDEX.md)（審批模擬 blockhash、AI 單列卡與 60s／55s 文案）、[0.30.0](../0.30.0/INDEX.md)（sandbox harness、Decisions、assess 生命週期；**推翻** loop 內主路徑依賴 `decode_message`／`simulate` 與 loop 後第二次 `enrichFlags` 定級）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 0.30 loop 首輪過慢與重複 RPC；審批 blockhash 與 AI tool simulate 參數不一致（見 [reasoning.md](./docs/reasoning.md)）
- **秘密欄位：** 無（OpenRouter key 規則仍同 0.30.0）

## 產品句

簽署 AI 在 sandbox 多輪查詢**之前**，service worker 先 decode、用**與審批相同參數** simulate（交易自己的 blockhash）、分批讀已解析帳戶，寫進第一則 user message。OpenRouter **只**拿掉 `decode_message`、`simulate`；`get_accounts`、`rpc_get_multiple_accounts` 與其他唯讀 `rpc_*` **保留**供延伸查帳。定級重用 preflight flags。審批預期變動 `BlockhashNotFound` **不**中止、不略過 AI——使用者可先讀報告，再由 dApp 重送新交易。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)
5. 審查產物：[docs/design-review.md](./docs/design-review.md)、[docs/implementation-review.md](./docs/implementation-review.md)（部分條目若仍寫 blockhash 同步，以本 INDEX／HOW「無耦合」為準）

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 kind | 仍只 `signTransaction`、`signAndSendTransaction`、`walletSend`；`signMessage` 無 AI |
| Preflight 時機 | `assess.runSession` 內、送 `assess.start` **之前**一次 `runTxAiPreflight`（含 `enrichFlags` 分批帳戶 + 一次 `simulateTransactionRpc`） |
| Preflight simulate | `replaceRecentBlockhash: false`、`sigVerify: false`（與審批 phase-2 一致）。bytes 為 assess 快照（wire 簽名槽已清），**允許**與審批多打一次 simulate |
| Prompt | `formatTxAiPreflightForPrompt` 三節 JSON（decode／simulate／accounts）；`buildAssessPrompt` 三語 lead「主機已預檢」+ 全文 context |
| OpenRouter tools | `bridge.ts` 的 `PREFLIGHT_HOST_TOOLS` **僅** `decode_message`、`simulate`；其餘 host tool schema 仍進 sandbox |
| Loop 後定級 | **不再** `enrichFlags(snapshot)`；用 `session.preflightEnriched.flags` + Decisions（鏈讀失敗規則仍同 0.30） |
| `TX_AI_MAX_STEPS` | **8** |
| AI 逾時（UI 文案） | 與 0.32.0：`timeout`／`bridge_timeout` →「分析逾時」；整段 **60s**、單次 LLM／tool **55s** |
| AI 逾時（實作牆鐘） | `TX_AI_WALL_MS` **只**包住 sandbox loop（`assess.start` 前啟動、`waitForLoop` 結束清 timer）；**不含** SW preflight、**不含** Decisions。`TX_AI_LLM_BRIDGE_MS` = 55s |
| 審批 blockhash 失效 | **無耦合**。`ui.simulatePendingTx` 的 `BlockhashNotFound` 只影畫預期變動卡；**不** `abort` assess、**不** `blockhash_expired`、**不**「略過」AI 列。否決：審批失效時中止或覆寫 AI 等級 |
| AI tool `simulate`（若模型仍呼叫） | host 仍可 `replaceRecentBlockhash: true`（防呆）；正常路徑不應再 call，因已從 tool 列表移除 |
| 版本號 | 出貨時 `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.34.0` |

## 非目標

- 改 [0.33.0](../0.33.0/INDEX.md) 預期變動列 UI
- persist preflight 或 report
- 審批 simulate 改回 `replaceRecentBlockhash: true`
- 從 OpenRouter **移除** `get_accounts`／`rpc_get_multiple_accounts`（避免分析只能照抄預檢）
- blockhash 失效時同步中止 AI 或專用「略過」文案（早期草案已否決）
- pending storage hydrate、全 tab 廣播、代簽、自動核准

## 開工前仍須拍板

（無。）

## 實作軌道

### Track 1 — Preflight 模組

- **做：** `wallet/src/background/tx-ai/preflight.ts`（`runTxAiPreflight`、`formatTxAiPreflightForPrompt`）；`prefetch-accounts.ts`；`host-tools.ts` 的 `accountsRead`／manifest 短路
- **不做：** 共用審批 `sign-tx-simulate` 整條編排當唯一 simulate 來源
- **驗收：** preflight simulate 旗標為 `false`／`false`；prompt 三節存在

### Track 2 — Prompt、bridge、assess

- **做：** `tx-ai-prompt.ts`；`bridge.ts` 過濾兩 tool；`assess.ts` preflight → wall → loop → 定級用 `preflightEnriched`；`local-flags.ts` pubkey 優先序
- **不做：** loop 後第二次 enrich
- **驗收：** 典型 swap 常 0～1 輪 tool；OpenRouter tools 不含 `decode_message`／`simulate`

### Track 3 — 文件與版本

- **做：** `docs/features.md`、`changelog.md`、`version.md`、套件版本；INDEX 手驗
- **不做：** 改 user-guide 長文，除非 features 已列而缺一句

## 驗收

手驗：載入 `wallet/dist`；Settings 開 AI + OpenRouter key；`test-web` 或 Jupiter 發簽署交易。無整包測試指令。

- [x] AI running 時，sandbox 第一輪 user content 含 preflight 三節標題
- [x] 典型 swap：多數 0～1 輪 host tool（非 decode／simulate）
- [x] OpenRouter 請求 tools 列表無 `decode_message`、`simulate`
- [x] preflight JSON 的 simulate 路徑不帶「換 blockhash」成功假象（與審批同參數）
- [x] 審批預期變動 `BlockhashNotFound` 時，AI 仍可完成或逾時／失敗，**不**出現「略過」專用列；核准仍可按
- [x] `signMessage` 無 AI 列
- [x] `cd wallet && npm run build`

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/tx-ai/preflight.ts` | `runTxAiPreflight`、`formatTxAiPreflightForPrompt` |
| `wallet/src/background/tx-ai/prefetch-accounts.ts` | 分批 `getMultipleAccounts` |
| `wallet/src/background/tx-ai/assess.ts` | `runSession`、牆鐘、定級 |
| `wallet/src/background/tx-ai/bridge.ts` | `PREFLIGHT_HOST_TOOLS` |
| `wallet/src/background/tx-ai/host-tools.ts` | enrich、tool 執行、manifest 去重 |
| `wallet/src/shared/tx-ai-prompt.ts` | `buildAssessPrompt` |
| `wallet/src/shared/tx-ai.ts` | `TX_AI_WALL_MS`、`TX_AI_LLM_BRIDGE_MS`、`TX_AI_MAX_STEPS` |
| `wallet/src/agent-harness/loop.ts` | 多輪步數上限 |
