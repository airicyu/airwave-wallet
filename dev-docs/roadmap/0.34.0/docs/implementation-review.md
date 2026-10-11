# 實作審查 — 0.34.0

- 日期：2026-10-12（Asia/Hong_Kong）
- 輪次：**第 1 輪初審**
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`../HANDOFF.md`](../HANDOFF.md)；[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 角色：實作審查。本輪**不改程式、不 commit**。
- 範圍：**working tree**（`git diff` 已追蹤變更 ＋ untracked：`preflight.ts`、`blockhash-sync.ts`、`simulate-blockhash.ts`）。HEAD 仍為 0.33.0 程式基線；本版邏輯在未提交工作樹。

## 第 1 輪（2026-10-12）— 初審

- **總評：** Track 1–3 核心契約在 working tree **已對齊** INDEX／HOW：SW 在 `assess.start` 前 `runTxAiPreflight`、三節寫入 `buildAssessPrompt`；`bridge` 僅濾 `decode_message`／`simulate`；定級用 `session.preflightEnriched`；`TX_AI_MAX_STEPS = 8`；審批 simulate 後 `syncTxAiWithApprovalSim`；`blockhash_expired` 收尾不覆寫為 `timeout`／`assess_failed`；widget 三語「略過」。版本與 changelog 已 bump `0.34.0`。**無未關閉 HIGH。** INDEX 驗收 checklist **尚未勾、瀏覽器手驗未做**（見下表）。出貨前須提交三個 untracked 錨點檔並完成手驗。

### Findings

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| 034-M1 | MEDIUM | **關閉**（修復） | **`noteDecodedPubkeys` 與舊 `decode_message` 路徑略不一致** — 已統一 `pubkeysFromTxAiDecode`；bridge 共用。 — INDEX 已定案「與舊 `decode_message` tool 相同來源」。現 `preflight` 用 `pubkeysFromTxAiDecode`（含 `feePayer`、不過濾 `unresolved`、硬 cap 20）。`bridge.ts` 的 `pubkeysFromDecode` 仍只掃 instruction accounts、排除 `unresolved`、無 fee payer。模型若依預設 pubkey 呼叫 `get_accounts`，預檢後與歷史 decode tool 後行為可能不同。建議統一 helper 或於 HOW 一句澄清；預設不阻擋出貨。 |
| 034-M2 | MEDIUM | **關閉**（出貨時 add） | **核心新檔仍 untracked** — `wallet/src/background/tx-ai/preflight.ts`、`blockhash-sync.ts`、`wallet/src/shared/simulate-blockhash.ts` 未在 `git diff` 追蹤內。僅提交已追蹤檔會缺模組、build 失敗。出貨 commit 須與 `assess.ts` 等一併 `git add`。 |
| 034-M3 | MEDIUM | 開 | **INDEX 驗收／手驗未執行** — 本環境未載入未封裝擴充；DevTools 第一輪 user content、OpenRouter tools 列表、Jupiter 0～1 輪 tool、blockhash 失效略過等 INDEX checklist 七條皆**未勾、未手驗**。靜態對照通過不等於驗收通過。 |
| 034-L1 | LOW | **關閉** | **HANDOFF 狀態仍 `planned`** — INDEX 已 `in progress`；HANDOFF 未同步（設計閘門文案）。 |
| 034-L2 | LOW | 開（非阻擋） | **略過僅綁審批 simulate** — 與 design-review L1 相同：preflight 段已含 simulate 但 `blockhash_expired` 只由 `ui.simulatePendingTx` 觸發；審批模擬未回前 AI 仍可能顯示分析中。符合 INDEX／reasoning，非契約缺口。 |
| 034-L3 | LOW | 開（非阻擋） | **`loop.ts` tool schema 文案仍寫 `replaceRecentBlockhash`** — 僅 sandbox 全表描述；實際 OpenRouter 已不暴露 `simulate`。可選更新描述，不影響 bridge 過濾。 |

**未關閉 HIGH：** 無。

### 契約抽樣（靜態）

| 檢查項 | 結果 |
|--------|------|
| `runTxAiPreflight` 在 `ensureOffscreen`／`assess.start` 之前；`session.preflightEnriched` 寫入後再送 prompt | 通過（`assess.ts` `runSession`） |
| Preflight simulate：`replaceRecentBlockhash: false`；`simulateTransactionRpc` 固定 `sigVerify: false` | 通過（`preflight.ts` → `simulate-rpc.ts`） |
| `formatTxAiPreflightForPrompt` 三節標題與 8000 字元 clip | 通過（`preflight.ts`） |
| `buildAssessPrompt(locale, kind, preflightContext)`；system 禁止重複 decode／simulate；user 三語 lead + context | 通過（`tx-ai-prompt.ts`） |
| `PREFLIGHT_HOST_TOOLS = decode_message, simulate`；`get_accounts`、`rpc_get_multiple_accounts` 仍在 `SANDBOX_TOOL_SCHEMAS` 且未被 filter | 通過（`bridge.ts`、`loop.ts`） |
| Loop 後定級：`gradeReport` 的 `flags` 來自 `session.preflightEnriched`，無第二次 `enrichFlags(snapshot)` | 通過（`assess.ts`） |
| `TX_AI_MAX_STEPS = 8`；harness `loop.ts` import 共用常數 | 通過（`shared/tx-ai.ts`） |
| `approvalSimBlockhashExpired`；`syncTxAiWithApprovalSim` 於 `simulateSignTransaction` **ok** 後呼叫（含 `outcome === "fail"` 的 result） | 通過（`ui-handlers.ts`、`simulate-blockhash.ts`） |
| `cancelTxAiForExpiredBlockhash` 先 `setTxAiState(blockhash_expired)` 再 `abort`；`runSession` loop／catch 見 `txAiIsBlockhashExpired` 則 return | 通過（`blockhash-sync.ts`、`assess.ts`） |
| Widget：`approval.txAi.rowSkippedBlockhash`；略過不當 failed、無 report 鈕（error 無 report body） | 通過（`tx-ai-widget.ts`、`ui-messages.ts`） |
| `enrichFlags` 回傳 `accountsRead` | 通過（`host-tools.ts`） |
| 架構禁區：未 persist preflight；pending／sandbox／訊息模型未見本版新違規 | 通過（抽樣） |
| 版本 `0.34.0`：`version.md`、`wallet/package.json`、`manifest.config.ts`、`changelog.md` | 通過 |

### 驗收對照（INDEX checklist）

| INDEX 驗收句 | 靜態／執行 | 結果 |
|--------------|------------|------|
| 第一輪 user content 含 preflight 三節 | 僅靜態（prompt 組裝鏈完整） | **未手驗** |
| Jupiter swap 多數 0～1 輪 tool | — | **未做** |
| OpenRouter tools 無 decode／simulate；仍有 get_accounts、rpc_get_multiple_accounts | 靜態 bridge filter | **未手驗請求體** |
| preflight simulate 無 `replaceRecentBlockhash: true` | 靜態 | 通過 |
| blockhash 失效後 AI 列略過 | 靜態 wiring | **未手驗** |
| AI 失敗／略過不禁用核准 | 本版未改核准 gate | 通過（抽樣；未手驗） |
| `signMessage` 無 AI | 未改 `maybeStartTxAi` 範圍 | 通過（抽樣） |

### 測試結果

工作目錄 `wallet/`。INDEX 註明尚無整包測試指令；以 build 為準。

| 指令 | exit code |
|------|-----------|
| `npm run build`（`tsc --noEmit && vite build`） | **0** |
| 未封裝擴充瀏覽器手驗 | **未執行**（審查環境無法載入 `wallet/dist`） |
| 單元測試（`approvalSimBlockhashExpired`、`formatTxAiPreflightForPrompt` clip） | **未要求、未跑**（HOW 可選） |

### 修復追蹤

| ID | 建議 |
|----|------|
| 034-M1 | 統一 `pubkeysFromTxAiDecode` 與 `pubkeysFromDecode` 規則，或更新 INDEX／HOW 若刻意擴充 fee payer |
| 034-M2 | 出貨 commit 含三個 untracked 錨點檔 |
| 034-M3 | 依 INDEX 手驗清單在瀏覽器跑一輪後勾 INDEX 或於複審關閉 |
| 034-L1–L3 | 文件／文案；非阻擋 |

### 可否出貨

- 程式契約（working tree 全量）：**可進複審**，無 HIGH。
- 標 `shipped`：**尚不宜** — INDEX 驗收未勾、手驗未完成、M2 未提交完整檔案集；須使用者同意與 commit。

## 歷審摘要

| 輪 | 日期 | 誰 | 結論 |
|----|------|----|------|
| 1 | 2026-10-12 | 實作審查（初審） | 靜態契約對齊；build 通過；無 HIGH；手驗與 INDEX checklist 未做；開 M1–M3、L1–L3 |
| — | 2026-10-12 | 出貨 | INDEX `shipped`、驗收已勾。定案為 **AI 與審批 blockhash 解耦**（無 `blockhash-sync`／略過列）。初審文中 blockhash 同步句已過時。 |

## 出貨備註（2026-10-12）

契約以 INDEX／HOW「無耦合」為準；`preflight.ts`、`prefetch-accounts.ts` 已入庫。`npm run build` 通過。
