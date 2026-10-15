# 0.44.0 — 交易 AI 模型備援與設定

- **狀態：** `shipped`
- **上游版本：** [0.43.0](../0.43.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 [`backlog/tx-ai-model-fallback.md`](../backlog/tx-ai-model-fallback.md)（排程後刪 backlog 列）
- **畫面：** [`dev-docs/design-principles.md`](../../design-principles.md)。概念稿 [`tx-ai-model-chain-ux.html`](../../design-demos/tx-ai-model-chain-ux.html)（預設／自訂；衝突以本 INDEX 為準）。舊稿 [`tx-ai-model-picker-ux.html`](../../design-demos/tx-ai-model-picker-ux.html) 為 0.39，非本版
- **閱讀順序：** 本檔 → [docs/how.md](./docs/how.md) → [docs/reasoning.md](./docs/reasoning.md) → [HANDOFF.md](./HANDOFF.md)
- **實作順序：** **先**設計審查閘門（見 [HANDOFF.md](./HANDOFF.md)）→ **再**改 `wallet/`。`test-web/sign-risk*` 可與提案並行調整，規則以本 INDEX 為準，POC 非契約

## 文件地圖

1. 本檔（已定案／驗收）
2. [docs/how.md](./docs/how.md)（storage、HTTP、命令、UI）
3. [docs/reasoning.md](./docs/reasoning.md)（取捨與否決）
4. [HANDOFF.md](./HANDOFF.md)（Track、禁區、paste-ready）
5. [docs/design-review.md](./docs/design-review.md)（審查後建立）

## 產品句

簽署審批的 AI **報告**與 **Decisions 定級**各選 **預設** 或 **自訂**。預設時 storage 只記 `default`，實際鏈由程式常數提供（下版改常數即自動套用）。自訂時使用者填最多 5 個有序 id 並 persist。每次 completion 依鏈 **1→2→…** 嘗試：**404／502／503** 換下一個；**400／401／402／403** 失敗；**429** 等 1s 重試一次。不做事前探測。**簽署審批 AI 列**維持 0.43 版面（不顯示模型 id、不加停止）。test-web sign-risk 僅並行 A/B + 停止，無備援。

## 已定案

| 題 | 決定 |
|----|------|
| 探測 | **不做**事前 Models API／endpoints 探測；只在實際 completion 失敗時換模型 |
| 報告模式 | `openRouterReportModelMode`: `default` \| `custom`。`default` **不** persist 模型 id 陣列 |
| 報告預設鏈（程式常數） | ① `inclusionai/ling-3.0-flash` ② `nvidia/nemotron-3.5-lightning` ③ `~deepseek/deepseek-flash-latest` |
| 報告自訂 | `custom` + `openRouterReportModelChain`（≤5，normalize 去重）。空鏈 fallback 程式預設鏈 |
| 定級模式 | `openRouterDecisionsModelMode`: `default` \| `custom`（規則同報告） |
| 定級預設鏈（程式常數） | ① `liquid/d1` ② `nace-ai/drex-v1.5` |
| 定級自訂 | `custom` + `openRouterDecisionsModelChain`（≤5） |
| 備援 HTTP | 報告 chat 與 Decisions 共用規則；鏈用盡仍 404／502／503 → 本輪失敗 |
| 429 | 同一模型、同一請求 body：**sleep 1s 再送一次**；仍 429 → 視為失敗（**不**沿鏈換模型） |
| 致命 HTTP | 400、401、402、403：**不**換下一個模型，本輪失敗 |
| 可換模型 HTTP | 404、502、503：換鏈中下一個 id；最後一個仍屬此類 → 失敗 |
| 其他失敗 | 未列於上之 HTTP status、網路錯誤、無法解析回應：**不**換下一模型；本輪分析 `error` |
| 切回預設 | UI 選 **預設** → 寫 `default`；**保留**已存 `*Chain`（再切自訂時欄位不丟）。runtime `default` 仍只用程式常數。**不**把常數複製進 storage |
| Session 鎖定 | SW session 內鎖定實際承接的報告模型 id（`reportModelUsed`），供同一輪 `llm.chat` 備援；**不**改審批 widget 版面 |
| Hub 摘要 | `txAiAnalysis` 關 → 關閉文案；開 + 兩欄皆 `default` → i18n **「預設」**（不顯示鏈首 id）；任一侧 `custom` → 顯示該側 `chain[0]`，兩側皆 custom 時報告鏈首優先 |
| Migrate | 無 `*Mode` 時：報告 `openRouterModel` trim 後等於 0.39 預設 `apodex/apodex-1.1-mini:free` → `openRouterReportModelMode: default`（不寫 chain）；定級等於 `liquid/d1` → `default`；**其他**合法單一 id → 該側 `custom` + `*Chain = [id]`。早 adopters 已有非空 `*Chain` → `custom` |
| 自訂儲存觸發 | 選 **預設** → 立即寫 `default` 並清 `*Chain`。選 **自訂** → 單欄失焦 **不**寫；**離開「交易 AI 分析」子頁**（返回 Settings hub）時 normalize，至少 1 合法 id 才寫 `custom`+chain，否則欄下短句、維持上一版已存。無獨立「還原預設」按鈕 |
| storage | `*Mode` + 僅 `custom` 時的 `*Chain`。migrate 見 HOW；禁止把 `DEFAULT_*_CHAIN` 寫入 storage |
| OpenRouter 層 | `wallet/src/background/tx-ai/openrouter.ts`：`openRouterChat`／`requestDecisionsLevel` 共用 `callWithModelChain`；`bridge.ts` 每輪 `llm.chat` 用 session 鏈與 `reportModelUsed` |
| test-web POC | sign-risk：**A／B 並行**、**停止分析**、sessionStorage 記 RPC／key；**無**模型鏈備援（備援僅錢包） |
| Settings 畫面 | 報告／定級各 **預設｜自訂** 分段。選預設：下方列出 `DEFAULT_*_CHAIN` 每一項，**disabled**（值每輪自常數，不寫 storage）。選自訂：5 行可編輯。概念稿已同意：[`tx-ai-model-chain-ux.html`](../../design-demos/tx-ai-model-chain-ux.html) |

## 非目標

- 並行打多模型投票、依難度自動選模型
- 401／402 時換 API key 或供應商
- 金鑰缺失靠換模型掩蓋
- dApp（test-web 連線頁）從網頁直接 stop AI（無 requestId 通道）
- **簽署審批** `tx-ai-widget` 變更（列尾模型 id、`ui.discardTxAi` 停止鈕等）；審批列與 0.43 一致

## 出貨文件（本版範圍）

- 更新 [`docs/user-guide.md`](../../../docs/user-guide.md) 交易 AI 一節：預設／自訂、預設鏈由版本決定（不列舊 apodex 為唯一預設）

## 開工前仍須拍板

（無）

## 實作軌道

### Track 1 — 共用鏈與 OpenRouter

**做：** `wallet/src/shared/tx-ai.ts` 預設鏈常數、`normalizeModelChain`；`openrouter.ts` 鏈式 completion；單元測 HTTP 分類（純函式）。

**不要做：** sandbox 內打 OpenRouter。

### Track 2 — Settings UI

**做：** 報告／定級各 **預設｜自訂**；預設時列出內建鏈 **disabled**；自訂 ≤5 可編輯欄；`storage-io` migrate；hub 摘要。

### Track 3 — Bridge session（無審批 UI）

**做：** `bridge.ts`／`runtime` session 鏈與鎖定承接模型（備援用）。

**不要做：** 改 `tx-ai-widget`、新增審批停止命令。

**驗收：** sign tx 時 default／custom 鏈備援仍可用；審批 AI 列外觀與 0.43 相同。

## 驗收

- [x] 報告／定級可選預設或自訂；預設時 Settings 列出內建鏈且 disabled、storage 無 `*Chain`；runtime 用程式常數（自動化＋靜態審查）
- [x] 自訂可存 1–5 個合法 id，順序即備援順序；切回預設清 chain（044-H01 修復後離頁提交）
- [x] 404／502／503 換下一模型；最後一個仍失敗 → 分析 error（靜態）
- [x] 401／402／403／400 不換模型（單測）
- [x] 429 等 1s 重試一次（靜態）
- [x] 審批 AI 列無 0.44 新增元素（無列尾模型 id、無停止鈕；對照 0.43）
- [x] `cd wallet && npm run typecheck && npm run build`
- [x] Migrate：storage 仍為 0.39 apodex／d1 → 兩側 `default`；自訂 Kimi 等 → `custom` 單元素 chain（靜態）
- [x] Hub：兩側 default 顯示「預設」；custom 顯示鏈首 id（靜態）
- [x] 定級鏈備援手驗（與報告相同 HTTP 規則）

## 錨點

| 路徑 | 用途 |
|------|------|
| [docs/how.md](./docs/how.md) | 欄位、命令、錯誤表 |
| `wallet/src/shared/tx-ai.ts` | 鏈 normalize／預設 |
| `wallet/src/background/tx-ai/openrouter.ts` | 鏈式 HTTP |
| `wallet/src/background/tx-ai/bridge.ts`、`assess.ts` | session 模型 |
| `wallet/src/popup/settings/TxAiSettingsScreen.tsx` | 預設／自訂 UI |
| `wallet/src/approval/tx-ai-widget.ts` | **本版不修改** |
