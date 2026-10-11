# 0.30.0 — HOW

契約細節；與 INDEX 衝突時以 INDEX 為準。

## Settings 欄位

| 欄 | 型別 | 預設 | 公開 getState |
|----|------|------|----------------|
| `openRouterApiKey` | string | `""` | 否 → `openRouterConfigured` |
| `openRouterModel` | string | `"~deepseek/deepseek-flash-latest"` | 可帶（非秘密） |
| `openRouterDecisionsModel` | string | `"liquid/d1"` | 可帶（非秘密） |
| `txAiAnalysisEnabled` | boolean | `false` | 可帶 |

`normalizeSettings`：缺欄用上表預設；未知 `openRouterModel`／`openRouterDecisionsModel` 各自回退預設。

`toPublicSettings`／`getState`：**omit** `openRouterApiKey`；附 `openRouterConfigured: boolean`（trim 非空）。型別上 `PublicSettings` 不得含明文 OpenRouter key（對齊 0.27 Jupiter／Helius）。

報告／tool loop 模型允許集合（設定 UI 只列這些）：

- `~deepseek/deepseek-flash-latest`
- `~deepseek/deepseek-pro-latest`
- `moonshotai/kimi-k2-0905`
- `z-ai/glm-5.3-flash`

Decisions 定級模型允許集合（設定 UI 只列這些）：

- `liquid/d1`（預設；UI 標籤可用「LiquidAI d1」）
- `nace-ai/drex-v1.5`（UI 標籤可用「Nace.AI Drex v1.5」）

Secrets：`wallet.readIntegrationSecrets` 回傳**增加** `openRouterApiKey`；sender 限制與既有 `wallet.*` 相同＝**僅擴充頁**可呼。

**OpenRouter API key 設定列 UX：** 與 Settings「API keys」裡 **Helius API URL／Jupiter API key** 同一套路（見 [`docs/design-principles.md`](../../../design-principles.md) §8、[`settings-hub-ux.html`](../../../design-demos/settings-hub-ux.html)）：`type="text"`（禁止 `password`）；有值顯示 `••••••`；Reveal 才全文（單行 ellipsis、勿要錢包密碼）；編輯／清除圖示；空列可貼上＋列內確認圖示提交；失焦或確認才寫入；禁止整頁 Save；不要寫「已設定」、不要露後 4。概念稿：[`tx-ai-analysis-ux.html`](../../../design-demos/tx-ai-analysis-ux.html)。

## Assess 生命週期

1. 三種 kind pending **成功 enqueue** 後，SW 讀 settings：若 `txAiAnalysisEnabled` 且 `openRouterApiKey` trim 非空 → 對該 `requestId` **自動** `assess.start` **恰好一次**（狀態已是 `running`／`done`／`error` 則不重入）。
2. Start 當下快照交易位元組：`workingTx ??` enqueue 原文，**SW 立即複製並將所有簽名槽清為 null（wire 上為 64 個 0）**；此副本只供 AI assess／host tools，**不**改 pending 上待簽原文。之後 CU 變更不重跑、不更新快照。
3. SW 確保 offscreen 存在 → 對 sandbox 發 `assess.start`（含 locale、prompt、session 位元組／metadata；**不含** API key）。
4. Sandbox 多輪 `tool`／`llm.chat` → 結束 `assess.done{ reportText }` 或 `assess.fail`。
5. SW 用**本地** flags ＋報告打 Decisions → 套下限 → `TxAiAssessState = done | error`。
6. 逾時：整體 wall-clock **90s**（可實作常數）；harness `maxSteps` **12**（與 POC 對齊）。逾時 → abort → `error`／UI unknown。
7. Pending 結束路徑（皆須清理）：`ui.resolvePending`、`takePending`、逾時清條目、關窗／`ui.abortPending`、以及與 `clearSignTxState` 同級者 → abort loop、關 offscreen、丟棄 assess 狀態。`ui.resolvePending` **不得**等待 assess。
8. 同時最多一筆 assess。第二筆在第一筆結束（或被丟棄）前排隊，結束後自動開跑；排隊中若該 pending 已結束則丟棄、不啟動。不把第二筆直接標成 `error`。

Mainnet RPC 未就緒（0.29 `MAINNET_RPC_UNSET`／空可用 `rpcUrl`）：需 RPC 的 tool 失敗 → assess 可進 `error` 或 Decisions 前即當 unknown；**仍不擋**核准／拒絕／既有模擬 outcome。

## Pending 記憶體：AI assess 狀態

只掛在 SW pending 條目上，不進 storage。

```ts
type TxAiLevel = "low" | "watch" | "high" | "unknown";

type TxAiAssessState =
  | { status: "idle" }
  | { status: "running"; startedAt: number }
  | {
      status: "done";
      level: TxAiLevel;       // 已套 flags 下限
      decisionsLevel: TxAiLevel;
      reportText: string;
      flags: Array<{ id: string; detail?: string }>; // 僅 SW 本地計算
    }
  | { status: "error"; message: string; reportText?: string };
```

審批 UI：`ui.getPending` 回傳含上述欄；殼可短輪詢（既有 popout 節奏）或收 SW→擴充頁事件。**禁止**為同步 assess 寫 `chrome.storage`。控件掛在**簽署殼**（`view-sign`），與模擬卡片重繪平行、不是 `renderSignTransactionBody` 的下游；不插入交易明細捲軸當滿寬列，也不做頁內展開。

## Offscreen 承載（寫死）

- Manifest：`offscreen` 權限；`manifest.sandbox.pages` 含 sandbox HTML
- Service worker **不**直接掛 sandbox iframe。開／關 `chrome.offscreen` document；該 document embed sandbox iframe
- Offscreen **只**承載 DOM、embed sandbox、轉發 JSON；**不**執行 tool、**不**持 OpenRouter key、**不**打 Decisions、**不**讀 `airwave.settings.v1` 秘密欄
- OpenRouter chat／Decisions／allowlisted tools／確定性 flags 計算：**僅** service worker
- Assess 結束或 pending 結束：abort sandbox loop，關閉 offscreen（或等同丟棄）；禁止靠常駐 offscreen 當正確性前提

## Sandbox CSP

Sandbox 頁（或同等）須限制出網，至少：`connect-src 'none'`（或文件證明同等：腳本無法對非 host 通道 fetch／XHR／WebSocket）。LLM／RPC 出網只經 SW 代打。

## 訊息橋信任根

- Offscreen 只接受**自家** sandbox iframe 的 `MessageEvent.source`（或同等嚴格綁定）；拒絕頁面／content／未知 frame
- SW 只接受自家 offscreen／擴充頁 sender（對齊既有 `isExtensionPage`／offscreen 來源檢查）；拒絕網頁偽造的 assess／tool／llm 封包
- 信任根**不是** postMessage 自報 `from` 字串（GUIDELINES）

## Sandbox ↔ Host 協議

訊息皆 JSON、帶 `requestId`／`correlationId`。Sandbox → Host（經 offscreen 轉發至 **SW**）僅允許：

| op | 意義 |
|----|------|
| `tool` | `{ name, args }` allowlist 執行（見下表） |
| `llm.chat` | 請 SW 用 settings key／`openRouterModel` 打 OpenRouter chat completions |
| `assess.done` | `{ reportText }` loop 正常結束 |
| `assess.fail` | `{ message }` |

Host（SW）→ Sandbox：

| op | 意義 |
|----|------|
| `assess.start` | `{ locale, systemMessage, userMessage, session }`（session 含快照位元組／wireForm 等；**無** key） |
| `tool.result` | `{ correlationId, ok, body }` |
| `llm.result` | `{ correlationId, message }` |
| `assess.abort` | pending 結束時 |

Host 拒絕未知 `tool.name`。允許表內的名稱可執行，包含 `rpc_get_signatures_for_address`（名稱裡的 signatures 不是簽名請求）。表外且名稱含 vault／sign／storage 的請求拒絕。拒絕非 allowlist RPC。

### Host tool 允許表（寫死）

名稱與 POC 對齊但**以本表為準**；`test-web` 變更不自動改契約。**禁止**泛用 `rpc(method, params)`。

| tool.name | 作用 |
|-----------|------|
| `decode_message` | 解碼 session 快照；回 instructions 等。**回傳 flags 僅供模型閱讀；SW 下限／Decisions 不用此 flags** |
| `get_accounts` | 唯讀多帳戶（parsed token 欄位） |
| `simulate` | `simulateTransaction`（replaceRecentBlockhash、無 sigVerify） |
| `rpc_get_balance` | `getBalance` |
| `rpc_get_account_info` | `getAccountInfo` |
| `rpc_get_multiple_accounts` | `getMultipleAccounts` |
| `rpc_get_token_accounts_by_owner` | `getTokenAccountsByOwner` |
| `rpc_get_signatures_for_address` | `getSignaturesForAddress` |
| `rpc_get_transaction` | `getTransaction` |
| `rpc_get_latest_blockhash` | `getLatestBlockhash` |

對應 JSON-RPC method 允許集合（僅上表映射者）：

`getBalance`、`getMultipleAccounts`、`getAccountInfo`、`getTokenAccountsByOwner`、`getSignaturesForAddress`、`getTransaction`、`simulateTransaction`、`getLatestBlockhash`。

**禁止**（含但不限）：`sendTransaction`、`sendRawTransaction`、`requestAirdrop`、及任何廣播／改鏈狀態 method。

本版**不**開放 sandbox 指定任意 URL 的 token meta fetch；若日後需要，須另開契約寫死固定 URL 形狀。

## 確定性 flags（僅 SW）

對 assess 快照位元組，在 SW（或 SW 同特權、非 sandbox／offscreen 模組）本地計算 flags。寫入 `TxAiAssessState.flags`、Decisions `state.flags`、flags 下限 **一律只用此結果**。Sandbox／模型／tool 回傳 flags 或「等級：」字串一律忽略。

## Decisions

- URL：`https://openrouter.ai/api/alpha/decisions`（經擴充代理規則；key 同 chat）。路徑若變更須改本契約再出貨
- **僅 SW** `POST`；不經 sandbox／offscreen／harness
- `questions.level.type = "choice"`
- criteria 鍵：`low`、`watch`、`high`、`unknown`（說明字串寫清：權限外送／無限 approve→high 或 watch 等；缺資料→unknown；常見 swap 無危險 flags→low／watch）
- `state`：`{ reportText, flags, kind, locale }`（flags＝SW 本地；可加 feePayer／program 摘要；**禁止** secret）
- 解析失敗 → `unknown`
- 模型：讀 `settings.openRouterDecisionsModel`（允許集合見上；預設 `liquid/d1`）
  - 2026-10-10 HK POC：`typesafe/jev-1.13` → 403 geo，**不**進選單；`liquid/d1` 對 plain SOL transfer 回 `low`（confidence ≈ 0.98）
  - `nace-ai/drex-v1.5` 為第二可選；產品不預設

## Flags 下限（顯示等級）

在 Decisions 的 `level` 上只升不降（順序 `low < watch < high`；`unknown` 不參與「升」的比較——若 Decisions 為 unknown，下限仍可把顯示抬成 watch／high）。輸入 flags **僅** SW 本地表：

| 若 flags 含 | 顯示等級至少 |
|-------------|--------------|
| `unlimited_approve` | `watch` |
| `authority_change` | `watch` |
| `close_account_external` | `watch` |
| `system_assign` | `watch` |
| `owner_mismatch` | `high` |
| （其餘 id 本版不抬級） | — |

`unknown_program`、`durable_nonce`、`lookup_account_unchecked`：**不**因單獨出現而抬級。

實作可把順序編成數字再 `max`。

## 報告 prompt

- System／user 模板依 `locale` 三套或一套模板＋「Reply in …」約束
- 要求短文 **Markdown**（標題、列表、粗體、段落）。不准寫成「安全」、不准叫使用者必須核准／拒絕、不准輸出原始 HTML／圖片／連結
- Overlay 用本倉允許清單解析後 `createElement` 組 DOM；文字一律 `textContent`。**禁止**把 `reportText` 當 HTML `innerHTML`。未列語法當普通文字。不引入 Markdown 套件
- **等級以 Decisions＋下限為準**；可要求模型不要輸出機器用等級行（避免與 icon 分叉）；若仍輸出，UI 可忽略

## UI catalog 鍵

- `settings.openRouter.*`、`settings.openRouter.decisionsModel.*`、`settings.txAiAnalysis.*`
- `approval.txAi.running`、`approval.txAi.level.*`、`approval.txAi.openReport`、`approval.txAi.closeReport`、`approval.txAi.failed`

跑 `wallet/scripts/gen-ui-messages.mjs`。

## 與 refresh／模擬

既有 refresh 命令路徑不呼叫 assess start；不重置 `TxAiAssessState`（除非 pending 已無）。
