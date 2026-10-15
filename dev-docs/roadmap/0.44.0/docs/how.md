# 0.44.0 HOW — 交易 AI 模型鏈與 completion 備援

## 1. 程式內建預設鏈（`wallet/src/shared/tx-ai.ts`）

**不寫進 `chrome.storage`。** 下版改這份常數，所有 `mode === default` 的使用者自動跟新版本。

```ts
export const DEFAULT_REPORT_MODEL_CHAIN = [
  "inclusionai/ling-3.0-flash",
  "nvidia/nemotron-3.5-lightning",
  "~deepseek/deepseek-flash-latest",
] as const;

export const DEFAULT_DECISIONS_MODEL_CHAIN = [
  "liquid/d1",
  "nace-ai/drex-v1.5",
] as const;

/** 0.39 migrate 對照用；勿寫入 storage */
export const LEGACY_039_DEFAULT_REPORT_MODEL = "apodex/apodex-1.1-mini:free";
export const LEGACY_039_DEFAULT_DECISIONS_MODEL = "liquid/d1";
```

Runtime：

```ts
effectiveReportModelChain(settings): string[]
effectiveDecisionsModelChain(settings): string[]
```

- `mode !== "custom"` → `DEFAULT_*_CHAIN`
- `mode === "custom"` → `normalizeModelChain(settings.*Chain, 5)`；normalize 後若為空 → **fallback** `DEFAULT_*_CHAIN`

## 2. Storage

| 欄位 | 型別 | 缺省 |
|------|------|------|
| `openRouterReportModelMode` | `"default"` \| `"custom"` | `"default"` |
| `openRouterReportModelChain` | `string[]` | 僅 `custom` persist |
| `openRouterDecisionsModelMode` | `"default"` \| `"custom"` | `"default"` |
| `openRouterDecisionsModelChain` | `string[]` | 同上 |

`normalizeModelChain`：trim、合法 id、`isLegalOpenRouterModelId`、去重、≤5。

### Migrate

| 條件 | 報告 | 定級 |
|------|------|------|
| 已有 `openRouterReportModelMode`／`openRouterDecisionsModelMode` | 依 mode；非空 `*Chain` → custom | 同上 |
| 僅 0.39 單鍵 | `openRouterModel` trim === `LEGACY_039_DEFAULT_REPORT_MODEL` → **default** | `openRouterDecisionsModel` trim === `LEGACY_039_DEFAULT_DECISIONS_MODEL` → **default** |
| 僅 0.39 單鍵、其他合法 id | **custom** + `[id]` | **custom** + `[id]` |

禁止 migrate 展開 `DEFAULT_*_CHAIN` 進 storage。

### Public settings

Hub 見 INDEX「Hub 摘要」：`default` → 文案鍵 `settings.txAiAnalysis.defaultSummary`（三語「預設」／`Default`）；`custom` → `chain[0]`。

## 3. HTTP 行為

`callWithModelChain`：

| 結果 | 行為 |
|------|------|
| 成功 | 下一 model 或回傳 |
| 429 | sleep 1s，同 model 再試一次；仍 429 → throw |
| 400、401、402、403 | throw fatal |
| 404、502、503 | 下一 model |
| 其他（含 500、網路、JSON 失敗） | throw；**不**換 model |

鏈用盡且最後為 404／502／503 → `model_chain_exhausted`。

純函式 `classifyOpenRouterFailure(status, err)` 供單測與 `openrouter.ts` 共用。

## 4. Session 與 bridge

- Session 開始：`reportModelChain = effectiveReportModelChain(settings)` 快照
- 鎖定 `reportModelUsed`：第一次成功 `llm.chat`；後續 step 用鎖定 id；鎖定後 404／502／503 從鏈中該 id **之後**再試
- `gradeReport`：`effectiveDecisionsModelChain(settings)` + 同 §3
- **不**改 [`tx-ai-widget.ts`](../../../wallet/src/approval/tx-ai-widget.ts)

## 5. Settings UI

概念稿：[`tx-ai-model-chain-ux.html`](../../../design-demos/tx-ai-model-chain-ux.html)。

- **預設**：分段選預設；下方 `DEFAULT_*_CHAIN` 每行 **disabled**；立即 `patchSettings` → `default`（**保留** `*Chain` 供再切自訂）
- **自訂**：5 行可編輯；失焦不寫；**離開交易 AI 分析子頁**（返回 hub）時提交：normalize 後 ≥1 合法 id → `custom`+chain，否則短句、不寫
- **無**「還原預設」按鈕

## 6. test-web

見 INDEX；非契約。

## 7. 測試與手驗

**單元：** `effective*Chain`、`normalizeModelChain`、`classifyOpenRouterFailure`。

**手驗（錢包，INDEX 驗收對照）：**

1. 兩側 default：Settings disabled 列；storage 無 chain；sign tx 備援走新三節點鏈
2. custom 報告：第一 id 故意無效、第二有效 → 承接第二個
3. custom 定級：同上（Decisions）
4. Migrate：舊 apodex only → default；舊自訂 id → custom 單元素
5. Hub：default →「預設」；custom → 首 id
6. 審批 AI 列與 0.43 相同（無列尾模型、無停止鈕）
