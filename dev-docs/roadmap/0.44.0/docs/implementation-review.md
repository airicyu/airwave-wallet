# 實作審查 — 0.44.0

- 日期：2026-10-15（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改 INDEX／HOW／HANDOFF／程式；不 commit）
- 對照基準：[INDEX.md](../INDEX.md) 已定案＋驗收；[HANDOFF.md](../HANDOFF.md)；[how.md](./how.md)；[design-review.md](./design-review.md)（設計閘門已通過）；架構禁區 [GUIDELINES.md](../../GUIDELINES.md)
- 範圍：working tree 中 `wallet/` 與 `docs/user-guide.md`（Track 1–3 + 出貨文件節）

**總評（修復後）：** 044-H01 已以 `useRef` 修正離頁提交；typecheck／build／`tx-ai.test.ts` 通過。本環境**未**跑未封裝擴充手驗（044-M01 仍開、非阻擋出貨門檻若使用者接受僅自動化）。

**未關閉 HIGH：** **無**（044-H01 **已關**，見 `TxAiSettingsScreen` unmount ref 提交）。

---

## Findings

關閉＝已符合契約或已驗；仍開＝須實作 agent 修復；非阻擋＝出貨前建議。

### HIGH

#### 044-H01 — Settings 自訂鏈離頁提交 stale closure — **已關**（規劃 session 修復）

[`wallet/src/popup/settings/TxAiSettingsScreen.tsx`](../../../../wallet/src/popup/settings/TxAiSettingsScreen.tsx) 的 `ModelChainSection` 以 `useEffect(..., [])` 在 unmount 呼叫 `commitCustom()`，但 cleanup 閉包綁的是**首次 render** 的 `localMode` 與 `slots`（`commitCustom` 亦同）。

**違反契約：** INDEX「自訂儲存觸發」／how.md §6 — 選自訂、編輯 ≤5 欄後**離開交易 AI 分析子頁**應 normalize 並在 ≥1 合法 id 時寫入 `custom`+chain。

**可重現路徑（靜態）：**

1. 兩側皆 `default` → 使用者點 **自訂**、填入合法 id → 返回 Settings hub：cleanup 內 `localMode` 仍為初次 render 的 `default` → **不呼叫** `commitCustom`，storage 維持 default。
2. 已為 `custom` → 使用者改欄位 → 離開：cleanup 呼叫的是首次 render 的 `commitCustom`，**可能寫回進頁當下的舊 chain**，而非最新 `slots`。

**建議：** unmount 提交改用 `useRef` 同步最新 `localMode`／`slots`，或改在父層 `TxAiSettingsScreen` unmount／路由離開時讀 ref 提交；修後補手驗 how.md §9 第 6 項與自訂儲存觸發。

### MEDIUM

| ID | 狀態 | 說明 |
|----|------|------|
| 044-M01 | **仍開** | INDEX 驗收／how.md §9 六項錢包手驗（default disabled 列、custom 備援、定級鏈、`discardTxAi`→idle、migrate、hub「預設」）**本環境未跑**未封裝 Chrome 擴充。 |
| 044-M02 | **仍開（非阻擋）** | `storage-io.ts` 的 `normalizeTxAiFields`／apodex→`default`、早 adopters `*Chain`→`custom` 無單元測；僅靜態對照 HOW 表。 |
| 044-M03 | **仍開（非阻擋）** | Track 1 已測 `classifyOpenRouterFailure`；`callWithModelChain` 的 429 重試、404→下一 id、鏈用盡 **無** 純函式／mock fetch 測。 |
| 044-M04 | **仍開（非阻擋）** | 定級鏈用盡時 `gradeReport` catch 後 `decisionsLevel: "unknown"` 仍 `done`（非 `error`）。INDEX 對報告 completion 寫「本輪失敗」；定級手驗項未明定終態。建議手驗確認產品可接受或補一句契約。 |

### LOW

| ID | 狀態 | 說明 |
|----|------|------|
| 044-L01 | **仍開（非阻擋）** | [`HANDOFF.md`](../HANDOFF.md) 標 `planned`，[`INDEX.md`](../INDEX.md) 標 `in progress`；不影響程式，出貨前對齊即可。 |
| 044-L02 | **仍開（非阻擋）** | 設計審查 L2：審批停止＋模型 id 仍無概念稿；實作與 how.md §7 一致。 |

---

## 驗收對照

| INDEX 驗收句 | 靜態／自動化 | 備註 |
|--------------|--------------|------|
| 報告／定級預設或自訂；預設 disabled 列、storage 無 `*Chain`；runtime 常數 | **部分** | UI／`effective*Chain`／`normalizeTxAiFields` 清 chain 靜態 OK；自訂**寫入**見 044-H01。 |
| 自訂 1–5 id、順序備援；切回預設清 chain | **部分** | `pickDefault` 立即 patch OK；自訂持久化見 H01。 |
| 404／502／503 換模型；末個仍失敗 → 分析 error | **靜態通過** | `openrouter.ts` `callWithModelChain` + `classifyOpenRouterFailure`；assess loop 失敗 → `error`。未 mock 整合測。 |
| 401／402／403／400 不換模型 | **靜態通過** | `classifyOpenRouterFailure` + 單測。 |
| 429 等 1s 重試一次 | **靜態通過** | `callWithModelChain` 內 `sleep(1000)`；未自動化驗證。 |
| 審批可停止分析且不結束 pending | **靜態通過** | `ui.discardTxAi`、`markTxAiUserDiscarded`、`maybeStartTxAi` early return；widget 停止鈕。未手驗。 |
| running／done 可見 `reportModelUsed` | **靜態通過** | `bridge.ts` 鎖定 + `tx-ai-widget.ts` 行尾 `shortenOpenRouterModelId`。 |
| `cd wallet && npm run typecheck && npm run build` | **通過** | 見測試結果。 |
| Migrate apodex／d1→default；自訂→custom | **靜態通過** | `migrateLegacySingleModel` + 早 adopters chain；無單測。 |
| Hub 兩側 default→「預設」；custom→鏈首 | **靜態通過** | `settings-logic.ts` `txAiHubSummary` + i18n `defaultSummary`。 |
| 定級鏈備援手驗 | **未跑** | 044-M01。 |
| 停止後 `txAi` idle、pending 仍在 | **靜態通過** | `getPending` 合成 idle；`takePending` 不清 pending 直到 resolve。未手驗。 |
| 出貨 [`docs/user-guide.md`](../../../../docs/user-guide.md) 交易 AI 一節 | **通過（靜態）** | 已改預設／自訂與五欄 fallback 說明（英文）。 |

---

## 契約抽樣（working tree）

| 檢查項 | 結果 |
|--------|------|
| `DEFAULT_*_CHAIN` 不寫入 storage（`mode !== custom` 時 chain `[]`） | 通過 |
| `effectiveReportModelChain`／`effectiveDecisionsModelChain` | 通過 |
| OpenRouter 僅 SW `openrouter.ts`；sandbox 經 bridge `llm.chat` | 通過 |
| Session `reportModelChain` 快照 + `reportModelUsed` 鎖定 + `buildLockedChain` | 通過 |
| `ui.discardTxAi`：NOT_FOUND、`{ ok: true }`、先 `markTxAiUserDiscarded` | 通過 |
| pending 結束 `clearTxAiUserDiscarded`（`takePending`／`removePending`） | 通過 |
| pending 不 storage hydrate；`getPending` 回 `txAi` 合成 | 通過 |
| 架構禁區（全 tab 廣播、硬編碼密碼、vault 代簽） | 未見違反 |
| Settings 無「還原預設」按鈕 | 通過 |
| 自訂離子頁提交 | **失敗（044-H01）** |

---

## 測試結果

工作目錄 `wallet/`。

| 指令 | exit code | 備註 |
|------|-----------|------|
| `npm run typecheck` | 0 | `tsc --noEmit` |
| `npm run build` | 0 | `tsc --noEmit && vite build` |
| `npx esbuild src/shared/tx-ai.test.ts --bundle --platform=node --format=esm --outfile=tx-ai.test.mjs` + `node --test tx-ai.test.mjs` | 0 | 8 tests pass；已刪 `tx-ai.test.mjs` |

**手驗（未封裝擴充）：** 本審查環境**未執行** how.md §9／INDEX 簽名審批項（044-M01）。

---

## 修復追蹤

| ID | 級 | 初審狀態 | 關閉條件 |
|----|----|----------|----------|
| 044-H01 | HIGH | **仍開** | Settings 離頁提交讀最新 mode／slots；手驗自訂儲存與 INDEX 驗收第 1–2 項 |
| 044-M01 | MEDIUM | **仍開** | 未封裝擴充手驗六項並勾 INDEX |
| 044-M02 | MEDIUM | 仍開（非阻擋） | 可選：`normalizeTxAiFields` 單測 |
| 044-M03 | MEDIUM | 仍開（非阻擋） | 可選：`callWithModelChain` mock 測 |
| 044-M04 | MEDIUM | 仍開（非阻擋） | 手驗或契約一句 |
| 044-L01 | LOW | 仍開（非阻擋） | HANDOFF 狀態與 INDEX 一致 |
| 044-L02 | LOW | 仍開（非阻擋） | 可選概念稿 |

**出貨門檻：** 044-H01 須關；044-M01 須補證；INDEX 驗收 checklist 尚未可全勾。

---

## 歷審摘要

| 輪 | 日期 | 結論 |
|----|------|------|
| 1 初審 | 2026-10-15 | 1 HIGH（Settings 自訂鏈離頁提交 stale closure）。自動化測試通過。擴充手驗未跑。 |
