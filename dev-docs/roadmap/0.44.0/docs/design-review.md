# Design review — 0.44.0 Airwave Wallet

- 日期：2026-10-15（Asia/Hong_Kong）
- 輪次：**初審** → **第 2 輪**（本檔最新結論見下方「第 2 輪」）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 概念稿：[`../../../design-demos/tx-ai-model-chain-ux.html`](../../../design-demos/tx-ai-model-chain-ux.html)（衝突以 INDEX 為準）
- 現行程式抽樣（第 2 輪）：同上＋`wallet/src/popup/settings/settings-logic.ts`（hub 摘要現況）、`wallet/src/background/tx-ai/assess.ts`（discard／session 生命週期）
- **總評（第 2 輪）：** 初審 HIGH／MEDIUM 已關（含 M8 規劃收斂）；契約可支撐 Track 實作。**設計審查門檻通過**；未關 HIGH：**無**。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — HANDOFF Track 2「還原預設」與已定案衝突 — **仍開**

[`../HANDOFF.md`](../HANDOFF.md) Track 2 寫「storage 五欄設定 + **還原預設**」，paste-ready starter 亦寫「還原預設」。INDEX 已定案、[`reasoning.md`](./reasoning.md) 否決項、[`how.md`](./how.md) §6 均明寫：**不要**「還原預設」按鈕把常數寫進 storage；切回預設僅靠 mode 分段選 **預設** 並清 `*Chain`。

**為何 HIGH：** 實作 agent 以 HANDOFF 為 Track 清單時，可能實作被否決的 UX 或把 `DEFAULT_*_CHAIN` 複製進 storage，直接違反 INDEX「切回預設 → 寫 `default`、清 chain」「禁止把常數寫入 storage」。

**建議寫進 HANDOFF（完整句）：** Track 2 改為「`*Mode`／`*Chain` storage + migrate；Settings **預設｜自訂**分段（無獨立還原預設按鈕）」；starter 刪除「還原預設」字樣。

#### H2 — 0.39→0.44 報告模型 migrate：`reasoning` 與 HOW 表矛盾 — **仍開**

[`how.md`](./how.md) §2 Migrate：若僅有 0.39 的 `openRouterModel`／`openRouterDecisionsModel`，合法 id **且不等於該欄舊版預設單一 preset** → `custom` + `*Chain = [舊 id]`；**否則兩欄皆 `default`**。0.39 報告預設為 `apodex/apodex-1.1-mini:free`，故 storage 仍為該值時應 **`default`**（runtime 走新 `DEFAULT_REPORT_MODEL_CHAIN`）。

[`reasoning.md`](./reasoning.md) 卻寫：「已用 apodex 的舊使用者若 storage 仍為單一自訂 id → migrate 為 **custom** `[apodex/...]`」。

**為何 HIGH：** 同一升級路徑兩種結論（`default` 跟新鏈 vs `custom` 鎖在 apodex），實作與手驗無法對照 INDEX 驗收「預設時 runtime 用程式常數」。

**建議寫進 INDEX 已定案（完整句）：** 「Migrate 時：若 `openRouterModel` trim 後等於 0.39 該欄程式預設 id（報告 `apodex/apodex-1.1-mini:free`、定級 `liquid/d1`）→ `openRouterReportModelMode`／`openRouterDecisionsModelMode` 為 `default` 且不寫 `*Chain`；僅當為其他合法單一 id → `custom` + `*Chain = [該 id]`。」並讓 reasoning 與 HOW 表與此句一致。

### MEDIUM

| ID | 狀態 | 說明 |
|----|------|------|
| M1 | 仍開 | Hub 摘要：[`how.md`](./how.md) §2 寫 default 時「預設」**或**鏡射 `DEFAULT_*_CHAIN[0]`「擇一寫死」；概念稿與 demo aside 已定 **「預設」**。應在 INDEX 或 HOW 寫死一種，避免 hub 與設定頁語意不一致。 |
| M2 | 仍開 | `ui.discardTxAi`：INDEX 已定命令名，HOW §5 僅一句「見 INDEX」。缺 typed 命令欄位（`requestId`）、成功／失敗（無 pending、已結束）、是否回傳新 `TxAiAssessState`；現碼僅 SW 內 `discardTxAi`（核准路徑亦呼叫），**尚無** UI 可觸發的擴充頁命令。Track 3 前應補 HOW 或 INDEX 訊息表。 |
| M3 | 仍開 | 停止分析後 UI 態：HOW §5「**建議** state → `idle` 隱藏 AI 列」未進 INDEX；驗收只寫「不結束 pending」。應定案停止後是 `idle`、保留 `error` 短標，或 `running` 終止樣式，否則實作審查無客觀標準。 |
| M4 | 仍開 | `reportModelUsed` 呈現：INDEX 要求審批「狀態短標」monospace 實際 id；未指定 i18n key、與現有 `approval.txAi.*` 列結構（`tx-ai-widget` 內嵌列）如何並排、是否在 `running` 與 `done` 皆顯示。建議 HOW §4／§6 或 INDEX 透明條各補一句。 |
| M5 | 仍開 | HTTP「其他」失敗：HOW §3 鏈式規則含「其他 → throw」；INDEX 已定案只列 400／401／402／403、404／502／503、429。應把 500、網路錯誤、空 body 等是否 **不換模型、本輪失敗** 寫進已定案，與單測 `classifyOpenRouterFailure` 對齊。 |
| M6 | 仍開 | 自訂五行 **何時寫 storage**：0.39「其他」為 Enter／勾確認才寫；新概念稿為連續輸入、無確認鍵。HOW 寫「至少 1 合法 id 才允許存」但未寫觸發（每欄 blur、離子頁、分段切換）。應定案以免與 design-principles／0.39 習慣衝突。 |
| M7 | 仍開 | 驗收缺口：INDEX checklist 未含 **migrate**（apodex／自訂 id／早 adopters `*Chain`）、**hub 摘要**、**定級鏈**獨立備援手驗、Settings 自訂儲存規則。建議補 2–3 條可勾項或寫入 HOW §8 手驗清單並在 INDEX 引用。 |

### LOW

| ID | 狀態 | 說明 |
|----|------|------|
| L1 | 仍開 | HANDOFF「五欄設定」：實為 2×mode + 2×chain（key 層級），用詞易數錯。 |
| L2 | 仍開 | 概念稿僅 Settings；審批停止＋`reportModelUsed` 無視覺稿，依 INDEX 文字實作可接受，實作前可選補小稿或 HOW 一句。 |
| L3 | 仍開 | 0.39 要求更新 `docs/user-guide.md` 報告預設；0.44 改預設鏈與 Settings UX，INDEX 未列 user-guide，出貨時可能漏文。 |

## 驗收對照

| INDEX 驗收句 | 設計層是否可測 | 缺口 |
|--------------|----------------|------|
| 報告／定級預設或自訂；預設 Settings disabled 列、storage 無 `*Chain`；runtime 常數 | 可測（Settings＋storage） | H2 migrate；M6 儲存觸發 |
| 自訂 1–5 id、順序備援；切回預設清 chain | 可測 | M6 |
| 404／502／503 換模型；末個仍失敗 → error | 可測（需 M5 邊界） | M5 |
| 401／402／403／400 不換模型 | 可測 | M5 |
| 429 等 1s 重試一次 | 可測 | — |
| 審批可停止分析且不結束 pending | 部分可測 | M2 命令契約；M3 終態 |
| running／done 可見 `reportModelUsed` | 部分可測 | M4 呈現契約 |
| `cd wallet && npm run typecheck && npm run build` | 可測 | 實作階段 |

## 與現碼抽樣

| 區域 | 現況 | 與 0.44 提案 |
|------|------|----------------|
| `tx-ai.ts` | 單一 `DEFAULT_REPORT_MODEL`、preset 下拉模型；`TxAiAssessState` 無 `reportModelUsed` | 預期 Track 1–3 改動；**不互斥** |
| `storage-keys.ts` | `openRouterModel`／`openRouterDecisionsModel` 字串；無 `*Mode`／`*Chain` | 預期 Track 2；**不互斥** |
| `openrouter.ts` | 單次 `fetch`；錯誤為 `chat_http_${status}` throw | 需 `callWithModelChain`；**不互斥** |
| `bridge.ts` | `llm.chat` 用 `normalizeReportModel(settings.openRouterModel)` 單模型 | 需 session 鏈與鎖定 `reportModelUsed`；**不互斥** |
| `TxAiSettingsScreen.tsx` | 0.39 下拉 +「其他」 | 需改為概念稿分段；**不互斥** |
| `tx-ai-widget.ts` | 輪詢 `getPending`；無停止按鈕、無模型 id 短標 | Track 3；**不互斥** |
| `runtime.ts`／`ui-handlers.ts` | `discardTxAi` 存在；核准時呼叫；**無** `ui.discardTxAi` 使用者命令 | 與 INDEX 停止分析一致方向；缺 UI 線（M2） |

未發現提案要求 storage hydrate pending、全 tab 廣播、硬編碼密碼或 sandbox 內 OpenRouter 等架構禁區違反。

## 第 2 輪（2026-10-15）

- 對照基準：規劃收斂後 [`../INDEX.md`](../INDEX.md)、[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)（**未**改程式）
- **總評：** 初審 2 HIGH、7 MEDIUM 契約缺口已併入檔案；M8 已收斂；**無未關 HIGH**；提案可行，可進 HANDOFF 實作。

### 初審項核對（保留 ID）

| ID | 第 2 輪 | 關閉依據 |
|----|---------|----------|
| H1 | **已關** | [`HANDOFF.md`](../HANDOFF.md) Track 2／禁區／starter 已改「無還原預設按鈕」；與 INDEX 切回預設一致 |
| H2 | **已關** | INDEX「Migrate」列；[`how.md`](./how.md) §2 表；[`reasoning.md`](./reasoning.md) §報告預設鏈 均為 apodex／d1 → `default`，其他單 id → `custom` |
| M1 | **已關** | INDEX「Hub 摘要」+ how.md §2 `settings.txAiAnalysis.defaultSummary`；概念稿 aside 一致 |
| M2 | **已關** | how.md §5：`ui.discardTxAi` payload、`NOT_FOUND`、`{ ok: true }`、widget 觸發 |
| M3 | **已關** | INDEX「停止分析」+ 驗收「停止後 `txAi` 為 `idle`」；how.md §5 定 idle |
| M4 | **已關** | INDEX「透明」+ how.md §7 狀態行尾 monospace；`running`／`done` |
| M5 | **已關** | INDEX「其他失敗」+ how.md §3 500／網路／JSON |
| M6 | **已關** | INDEX「自訂儲存觸發」+ how.md §6 離子頁提交 |
| M7 | **已關** | INDEX 驗收已含 migrate、hub、定級備援、idle；how.md §9 手驗對齊 |
| L1 | **已關** | HANDOFF 已改 `*Mode`／`*Chain` 敘述，無「五欄」 |
| L2 | 仍開 | 審批停止＋`reportModelUsed` 仍無概念稿；INDEX＋HOW §7 文字足夠開工 |
| L3 | **已關** | INDEX「出貨文件」列 [`docs/user-guide.md`](../../../docs/user-guide.md) 交易 AI 一節 |

### 第 2 輪新 findings

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| M8 | MEDIUM | **已關**（規劃收斂） | 定案 **(b)**：handler 僅 `discardTxAi`；`getPending` 合成 idle。`txAiUserDiscarded` + `maybeStartTxAi` early return — 見 INDEX「停止分析」、how.md §5。 |

### 驗收對照（第 2 輪）

| INDEX 驗收句 | 設計層是否可測 | 缺口 |
|--------------|----------------|------|
| 報告／定級預設或自訂；disabled 列；runtime 常數 | 可測 | — |
| 自訂 1–5、切回預設清 chain | 可測 | — |
| HTTP 備援／429 | 可測 | — |
| 停止分析、idle、pending 仍在 | 可測 | — |
| `reportModelUsed` | 可測 | — |
| migrate／hub／定級手驗 | 可測 | — |
| typecheck／build | 實作階段 | — |

### 與現碼抽樣（第 2 輪）

| 區域 | 現況 | 與 0.44 契約 |
|------|------|----------------|
| `discardTxAi` | 刪 session + abort；核准路徑亦呼叫 | 與 stop 方向一致；缺 `ui.discardTxAi` 與 M8 明文化 |
| `tx-ai-widget.ts` | `idle` → 不畫列 | 符合 INDEX 停止後隱藏 |
| `settings-logic.ts` | hub 仍用單一 `openRouterModel` 摘要 | Track 2 預期改為 mode／`defaultSummary` |
| `tx-ai.ts`／`openrouter.ts` | 0.39 單模型 | Track 1 預期；**不互斥** |

未發現 0.44 提案違反 GUIDELINES 架構禁區。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（建議） |
|----|----|------|------------------|
| H1 | HIGH | **已關** | HANDOFF Track 2＋starter（第 2 輪核對） |
| H2 | HIGH | **已關** | INDEX migrate；reasoning；how.md §2（第 2 輪核對） |
| M1 | MEDIUM | **已關** | INDEX Hub 摘要；how.md §2 |
| M2 | MEDIUM | **已關** | how.md §5 |
| M3 | MEDIUM | **已關** | INDEX 停止分析；how.md §5 |
| M4 | MEDIUM | **已關** | INDEX 透明；how.md §7 |
| M5 | MEDIUM | **已關** | INDEX 其他失敗；how.md §3 |
| M6 | MEDIUM | **已關** | INDEX 自訂儲存；how.md §6 |
| M7 | MEDIUM | **已關** | INDEX 驗收；how.md §9 |
| M8 | MEDIUM | **已關** | INDEX 停止分析；how.md §5 |
| L1 | LOW | **已關** | HANDOFF 用詞 |
| L2 | LOW | 仍開 | 可選補審批小稿 |
| L3 | LOW | **已關** | INDEX 出貨文件 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-15 | 2 項 HIGH 仍開；門檻未通過；提案整體可行 |
| 第 2 輪 | 2026-10-15 | H1–H2、M1–M8 已關；**門檻通過**；L2 可選 |
