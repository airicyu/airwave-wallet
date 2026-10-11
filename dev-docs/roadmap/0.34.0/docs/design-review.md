# Design review — 0.34.0 Airwave Wallet

- 日期：2026-10-12（Asia/Hong_Kong）
- 輪次：**第 1 輪初審**（第 2 輪複審見同檔下方章節）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[how.md](./how.md)、[reasoning.md](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 上游與推翻句：[0.33.0](../../0.33.0/INDEX.md)（預期變動 UI；本版非目標）、[0.32.0](../../0.32.0/INDEX.md)（審批模擬 blockhash；AI 單列卡）、[0.30.0](../../0.30.0/INDEX.md)（sandbox／Decisions；**推翻** loop 內主路徑 `decode_message`／`simulate`／`get_accounts`）。Backlog 未當契約
- 現行程式抽樣：見「與現碼抽樣」。工作區可見部分 Track 1–2 已落地、Track 3 仍缺；**未實作 ≠ 設計 HIGH**
- **總評（第 1 輪）：** 提案**可行**，**不是不可行**。**無未關閉 HIGH**。應修 **M1、M2**（契約自足／錨點一致；HOW 已涵蓋多數細節，併入 INDEX 或 HOW 一句即可）。**L1–L3** 非阻擋。待拍板表為空。HANDOFF 已存在，paste-ready 標「設計閘門通過後」——本輪通過後可開實作。**審查門檻通過**，可開工。

## Findings（第 1 輪）

關閉＝已寫進 INDEX／HOW；仍開＝建議規劃併入；非阻擋＝記錄即可。

### HIGH

（本輪無開立 HIGH。）

架構禁區核對：本版不改 pending 權威（assess 仍掛 SW pending 記憶體）、不 persist preflight／report（非目標明文）、不廣播、不把 pending 寫進持久 Zustand、OpenRouter key 仍只在 SW settings、sandbox 仍 query-only。與 GUIDELINES 一致。

### MEDIUM

| ID | 狀態 | 標題／依據 |
|----|------|------------|
| M1 | **仍開**（建議併入 INDEX 或 HOW） | **`blockhash_expired` 與 `runSession` 收尾** — HOW「Blockhash 失效同步」已寫：`cancelTxAiForExpiredBlockhash` 先 `setTxAiState(… message: "blockhash_expired")` 再 `abort`；「若已是 terminal error 則 `runSession` 的 catch 不覆寫」。INDEX 已定案「Blockhash 失效」只寫中止與列文案，**未**點名 catch／finally 不得把 `blockhash_expired` 改成 `timeout`／`assess_failed`。只讀 INDEX 的實作 agent 可能照現有 `assess.ts` catch（`aborted → timeout`）覆寫。建議在 INDEX「Blockhash 失效」加一句與 HOW 同義，或 HOW 加粗為實作必讀。 |
| M2 | **仍開**（建議併入 HOW 錨點） | **Track 3 模組落點** — `syncTxAiWithApprovalSim`、`cancelTxAiForExpiredBlockhash` 只在 HOW 偽碼出現；INDEX 錨點只有 `ui-handlers.ts`、`simulate-blockhash.ts`、`tx-ai-widget.ts`。實作可猜 `assess.ts`／`runtime.ts`，但自足契約宜寫死匯出檔（建議：`wallet/src/background/tx-ai/assess.ts` 或同目錄小模組 + `ui-handlers` 只 import）。 |
| M3 | **仍開**（建議併入 INDEX Track 1） | **Track 1 函式名** — INDEX Track 1 寫 `simulateSnapshotPreflight`；HOW／錨點為 `runTxAiPreflight`（內含 simulate）。易誤以為要第三個公開函式。建議 Track 1 與錨點統一為 `runTxAiPreflight` + 內部 simulate 步。 |

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **仍開**（非阻擋） | **略過僅綁審批模擬** — 中止 AI 的觸發是 `ui.simulatePendingTx` 回傳後 `approvalSimBlockhashExpired`，不是 preflight 段 JSON 已含 `BlockhashNotFound`。首屏審批模擬尚未回來前，AI 可能仍顯示「分析中」；與 reasoning「審批判定失效後停」一致，窗口通常 ≤ 首輪模擬。若要零窗口，需另定案「preflight simulate 已 BlockhashNotFound 即略過」——本版未寫，不判 HIGH。 |
| L2 | **仍開**（非阻擋） | **`blockhash_expired` 型別** — error `message` 字串在 HOW／widget 表寫死，未要求擴充 `TxAiAssessState` 共用型別 union。實作慣例即可。 |
| L3 | **仍開**（非阻擋） | **INDEX 狀態仍 `planned`** — HANDOFF 寫閘門通過後改 `in progress`。出貨前由實作／規劃更新，非設計缺口。 |

## 驗收對照

| 驗收句（INDEX） | 設計層是否可測 | 缺口 |
|----------------|----------------|------|
| AI running；第一輪 user content 含 preflight 三節 | 可測 | HOW `buildAssessPrompt` + `formatTxAiPreflightForPrompt` 三標題已寫死 |
| 典型 swap 0～1 輪 tool | 可測 | 行為假設；手驗為準 |
| OpenRouter tools 不含四個 preflight 名 | 可測 | HOW `PREFLIGHT_HOST_TOOLS` 與 bridge 過濾 |
| preflight simulate 無 `replaceRecentBlockhash: true` | 可測 | 已定案 + HOW；bytes 為 assess 快照（非 workingTx），已定案「多打一次」與 CU 差異已接受 |
| 審批 blockhash 失效後 AI 列略過／Skipped | 可測 | M1：需實作遵守 catch 不覆寫；widget `rowSkippedBlockhash`（HOW i18n） |
| AI 失敗或略過不禁用核准 | 可測 | 沿用 0.30／0.32 |
| `signMessage` 無 AI | 可測 | 已定案範圍 |
| Track 4：`npm run build` + 手驗清單 | 可測 | 無整包測試指令，與 GUIDELINES 一致 |

## 與現碼抽樣

對照 INDEX 錨點與提案；**現碼與本版不一致處＝實作／WIP 差距，不是設計 HIGH**（除非契約自相矛盾——本輪未見）。

| 錨點 | 抽樣 |
|------|------|
| `wallet/src/background/tx-ai/preflight.ts` | 已有 `runTxAiPreflight`、`formatTxAiPreflightForPrompt`；`replaceRecentBlockhash: false`；`enrichFlags` + 一次 simulate；8000 clip。與 HOW 一致 |
| `wallet/src/background/tx-ai/assess.ts` | `runSession` 先 preflight 再 `assess.start`；定級用 `session.preflightEnriched`；loop 後無第二次 `enrichFlags`。與 HOW 一致。**Track 3 未見**：無 `syncTxAi`／blockhash cancel 匯出 |
| `wallet/src/background/tx-ai/bridge.ts` | `PREFLIGHT_HOST_TOOLS` 四項過濾。與 HOW 一致 |
| `wallet/src/shared/tx-ai-prompt.ts` | `buildAssessPrompt` 三語 lead + system 禁止四 tool。與 HOW 一致 |
| `wallet/src/shared/tx-ai.ts` | `TX_AI_MAX_STEPS = 8`。與 INDEX／HOW 一致 |
| `wallet/src/background/tx-ai/host-tools.ts` | `enrichFlags` 回傳 `accountsRead`；`simulate` tool 仍 `replaceRecentBlockhash: true`（模型預設拿不到，防呆保留）。與 0.32＋0.34 已定案一致 |
| `wallet/src/agent-harness/loop.ts` | 仍用全表 `SANDBOX_TOOL_SCHEMAS`；過濾在 bridge。與 INDEX 一致 |
| `wallet/src/shared/simulate-blockhash.ts` | `approvalSimBlockhashExpired` 已存在。HOW 偵測規則一致 |
| `wallet/src/background/handlers/ui-handlers.ts` | `ui.simulatePendingTx` 成功回傳後**尚未**呼叫 `syncTxAiWithApprovalSim`。Track 3 待做 |
| `wallet/src/approval/tx-ai-widget.ts` | `rowResultKey` 對非 timeout 的 `error` 仍走 `approval.txAi.failed`；**無** `blockhash_expired` → `approval.txAi.rowSkippedBlockhash`。Track 3 + HOW i18n 待做 |
| `wallet/src/shared/ui-messages.ts` | 未搜到 `approval.txAi.rowSkippedBlockhash`。HOW 表已列三語，實作待加 |

審批模擬路徑（`sign-tx-simulate.ts`／`phase2-deltas.ts`）已 `replaceRecentBlockhash: false`（0.32 已出貨）。本版 preflight 直接 `simulateTransactionRpc`，旗標與 phase-2 相同，**不**要求共用 `sign-tx-simulate` 整條編排——與 INDEX「同參數、允許多打一次」一致。

## HANDOFF

[`../HANDOFF.md`](../HANDOFF.md) 存在：讀檔順序、產品摘要、Track 1→4、禁區、待拍板（無）、paste-ready（閘門通過後）。Track 順序與 INDEX 四軌一致；禁區不與架構禁區衝突。本輪通過後，規劃側可將 HANDOFF 狀態改 `in progress` 並交付 starter。

## 第 2 輪複審

- 日期：2026-10-12（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（只認檔案；對照 INDEX／HOW 是否已收斂第 1 輪 M1–M3）
- **總評（第 2 輪）：** 提案**仍可行**，**不是不可行**。**無未關閉 HIGH**。**M1–M3 已關閉**（規劃已併入 INDEX／HOW，見下）。**仍開 MEDIUM：無**。**L1–L3** 仍開、非阻擋。待拍板表仍為空。**審查門檻通過**，可開工；規劃側可依 HANDOFF 將狀態改 `in progress`（本輪不改 HANDOFF／INDEX）。

### M1–M3 關閉核對

| ID | 第 2 輪狀態 | 依據（檔案） |
|----|-------------|--------------|
| M1 | **關閉** | INDEX「已定案」「Blockhash 失效」已明文：`runSession` 的 `catch`／收尾若該 `requestId` 已是 `error` 且 `message === "blockhash_expired"`，**不得**改寫為 `timeout` 或 `assess_failed`；與 HOW「Blockhash 失效同步」同義。 |
| M2 | **關閉** | INDEX 錨點表已寫 `wallet/src/background/tx-ai/blockhash-sync.ts`（`syncTxAiWithApprovalSim`、`cancelTxAiForExpiredBlockhash`；允許與 `assess.ts` 同檔但錨點須寫死其一）。Track 3「做」亦點名同路徑。HOW 偽碼與匯出檔一致。 |
| M3 | **關閉** | INDEX Track 1 與錨點 `preflight.ts` 已統一為 `runTxAiPreflight`（內含 enrich + 一次 simulate）；倉庫內 INDEX 已無 `simulateSnapshotPreflight`。 |

### Findings（第 2 輪增量）

- **HIGH：** 無新增；架構禁區複核結論與第 1 輪相同。
- **MEDIUM：** M1–M3 關閉；**無仍開 MEDIUM**。
- **LOW：** L1–L3 狀態未變（非阻擋）；L3 仍為 INDEX `planned`／HANDOFF 待第 2 輪後改 `in progress`——屬生命周期，非契約缺口。

### 驗收對照（第 2 輪）

「審批 blockhash 失效後 AI 列略過」一項：設計層契約已自足（INDEX + HOW + widget i18n 表）；**實作**仍須遵守 catch 不覆寫與 Track 3 接線（第 1 輪現碼抽樣差距，非設計 HIGH）。

## 修復追蹤表（累計）

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| M1 | MEDIUM | **關閉**（第 2 輪） | INDEX「Blockhash 失效」已含 catch 不覆寫 |
| M2 | MEDIUM | **關閉**（第 2 輪） | INDEX 錨點／Track 3：`blockhash-sync.ts` |
| M3 | MEDIUM | **關閉**（第 2 輪） | Track 1／錨點統一 `runTxAiPreflight` |
| L1 | LOW | 仍開（非阻擋） | 略過僅綁審批模擬路徑；首屏模擬前窗口 |
| L2 | LOW | 仍開（非阻擋） | `blockhash_expired` message 字串；型別 union 未強制 |
| L3 | LOW | 仍開（非阻擋） | INDEX `planned`；HANDOFF 待改 `in progress` |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪初審 | 2026-10-12 | 可行，不是不可行。無 HIGH。應修 M1–M3（建議併入檔案後可關）。L1–L3 非阻擋。門檻**通過**，可開工。 |
| 第 2 輪複審 | 2026-10-12 | 可行，不是不可行。無 HIGH。M1–M3 **已關閉**；無仍開 MEDIUM。L1–L3 非阻擋。門檻**通過**，可開工。 |
