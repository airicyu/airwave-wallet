# 0.30.0 — 簽署交易 AI 分析（sandbox harness + Decisions 等級）

- **狀態：** `shipped`
- **上游版本：** [0.29.0](../0.29.0/INDEX.md)（Mainnet RPC 就緒語意）。簽署審批殼與模擬：[0.10.0](../0.10.0/INDEX.md)／[0.11.0](../0.11.0/INDEX.md)／[0.19.0](../0.19.0/INDEX.md)。第三方 key 形狀：[0.27.0](../0.27.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 `backlog/sign-tx-ai-security-eval.md`、`backlog/bubble-harness-runtime.md`、`backlog/bubble-harness-handoff.md`（出貨後已刪）。POC：`test-web/sign-risk.html`
- **畫面：** [`dev-docs/design-principles.md`](../design-principles.md)。Settings · AI 欄位概念稿：[`dev-docs/design-demos/tx-ai-analysis-ux.html`](../design-demos/tx-ai-analysis-ux.html)。審批殼帳戶列與站點列：[`dev-docs/design-demos/approval-account-chrome-ux.html`](../design-demos/approval-account-chrome-ux.html)。AI 懸浮卡＋overlay（**已同意**）：[`dev-docs/design-demos/tx-ai-chip-report-ux.html`](../design-demos/tx-ai-chip-report-ux.html)
- **秘密欄位：** OpenRouter API key 進 settings（同 Jupiter／Helius 模式）。禁止把真實 key、助記詞、密碼寫進本目錄

## 產品句

使用者可在 Settings 開啟「交易 AI 分析」並填 OpenRouter；簽署 `signTransaction`／`signAndSendTransaction`／`walletSend` 時，若已開啟且 key 齊，背景在 **manifest sandbox** 跑唯讀 harness 多輪查詢並產出報告，host 再打 Decisions 得到等級 icon；分析不阻塞模擬、改 CU、核准或拒絕。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)（設計閘門通過後補齊 paste-ready）
5. POC 對照：`test-web/src/sign-risk-*.ts`（行為參考，非產品路徑）

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 kind | 只 `signTransaction`、`signAndSendTransaction`、`walletSend`。`signMessage` 不做 AI 分析 |
| 觸發條件 | Settings「交易 AI 分析」= on **且** OpenRouter API key 非空（trim 後）才啟動。否則審批卡不顯示分析控件、不發 assess。**何時 start：** pending 三種 kind **成功 enqueue 後**，由 **service worker** 在條件滿足時自動 `assess.start` **恰好一次**（同一 `requestId` 不重入第二輪；本版無手動再分析）。審批殼只消費狀態，不發明第二條 start 路徑 |
| Settings | （1）OpenRouter API key 欄——**UX 與 Helius／Jupiter 秘密列相同**（遮罩 `••••••`、Reveal／編輯／清除、空列＋確認；見 HOW）；（2）**報告／tool loop 模型**下拉：`~deepseek/deepseek-flash-latest`（**預設**）、`~deepseek/deepseek-pro-latest`、`moonshotai/kimi-k2-0905`、`z-ai/glm-5.3-flash`；（3）**Decisions 定級模型**下拉：`liquid/d1`（**預設**）、`nace-ai/drex-v1.5`；（4）交易 AI 分析 on／off，預設 **off** |
| Key 存放 | `airwave.settings.v1` 新欄：`openRouterApiKey: string`（預設 `""`）、`openRouterModel`、`openRouterDecisionsModel`、`txAiAnalysisEnabled`。`schemaGeneration` 仍 1。`getState` 的公開 settings **不含**明文 key，改附 `openRouterConfigured: boolean`（trim 非空）；模型 id 與開關可公開帶出。設定頁讀明文走與 Jupiter／Helius 相同的擴充頁 secrets 讀取命令（擴充既有 `wallet.readIntegrationSecrets` 或本版擴充其回傳形狀，見 HOW）。**不**放進 vault |
| 報告語系 | 報告正文語言由宿主依 `settings.locale`（`zh-Hant`／`zh-Hans`／`en`）注入 system／user prompt。**禁止**寫死繁中。等級 enum 與 Decisions criteria 用內部英文碼，UI 文案走 catalog |
| Runtime 隔離 | **必須**用 Chrome extension `manifest.sandbox` 頁跑 harness loop。Sandbox **無** `chrome.*`。Wallet Core（**僅 service worker**）持 pending／vault／簽名，並**僅在 SW** 執行 OpenRouter chat、Decisions、allowlisted tools。**必須**用 **offscreen document** 承載 DOM 並 embed sandbox iframe（SW **不**直接當 sandbox 宿主）。Offscreen **只**轉發 JSON 訊息：不執行 tool、不持 OpenRouter key、不打 Decisions、不讀 settings 秘密欄。Offscreen／sandbox 生命週期綁 assess；pending 結束即關閉／丟棄。同時最多一筆 assess（第二筆等結束或直接 `error`）。**不**把正確性建立在 long-living 背景 |
| Harness 程式來源 | 本版將所需 loop／OpenRouter client **抄入本倉庫**（例如 `wallet/src/agent-harness/` 或同等），打進 sandbox bundle；**不**依賴 npm 上的 bubble-harness 執行時套件。旁倉仍可當上游參考；產品碼以本倉為準 |
| Tool 面 | Sandbox **只能**經 postMessage 請求 **SW** 執行 HOW 寫死的 allowlist tool（名稱表見 HOW；POC 變更不自動改契約）。**禁止**泛用 `rpc(method, params)`；**禁止** `sendTransaction`／`sendRawTransaction`／`requestAirdrop` 及任何廣播／改鏈狀態 method。未知 `tool.name` 或未知 RPC method → 拒絕。**禁止**：vault／session secret／sign／broadcast／`chrome.storage`／sandbox 任意 URL fetch／filesystem／`eval` 模型回傳字串當碼。Host **不得**對模型或 tool 結果做 `eval`／`new Function`／動態 `import()` 未固定 URL。Sandbox 頁 CSP：`connect-src 'none'`（或同等：禁止對非 host 通道出網）；LLM／RPC 出網只經 SW |
| 與模擬並行 | AI assess 與既有 simulate、改 CU limit／price、核准／拒絕 **互不阻塞**。AI 失敗、進行中、或等級為高，**都不禁用**核准 |
| Refresh | 審批卡既有 refresh：**只**重跑模擬（及既有 CU／差額路徑）；**不**重跑 AI assess、不清除已完成的報告／等級（除非該 pending 已結束） |
| 報告生命週期 | 結果只活在該筆 pending 的 **service worker 記憶體**。Pending 結束（`ui.resolvePending` approve／reject、`takePending`、逾時清條目、關窗／`ui.abortPending` 等與 `clearSignTxState` 同級路徑）即 abort loop、關 offscreen、丟棄 `TxAiAssessState`；**不**寫入 `chrome.storage`、不做跨次開啟還原。`ui.resolvePending` **不得**等待 assess 結束 |
| Assess 位元組 | `assess.start` 當下 SW 對 `workingTx ??` enqueue 原文做**快照**，並在進 AI／host tools 前**清掉所有簽名槽**（pending 待簽原文不變）；之後使用者改 CU **不**重跑 AI、**不**更新該快照。報告可能與最終核准簽出 bytes 不一致——本版接受 |
| UI | 條件滿足時，簽署審批（popout、側欄／popup 的 dApp 審批、錢包送出確認）顯示 **右上懸浮 pill 卡**（圖示＋「AI」；卡陰影靜態）：進行中為雷達掃掠；完成後圖示改報告 icon、僅圖示做平滑透明度脈衝，顏色對應等級（低／留意／高／未知；未知＝灰）。卡上緣對齊站點列、捲動內容時卡不跟著走。點擊完成態開 **中層 overlay**（單一捲軸；報告為允許清單 Markdown 格式化顯示，見 HOW；再開不重跑）；overlay 開啟時隱藏懸浮卡，關閉後卡回來。**不做**頁內展開／收合列。無手動「再分析」。帳戶 pill **獨立第一列、hug 寬、靠左**（非滿寬）；站點為標籤＋值 **同一列靠左**。錢包送出確認、側欄 dApp overlay、popout **不**用 Home 頂欄。控件掛在簽署殼，與模擬／核准平行，不由模擬卡片重繪驅動。審批殼經既有 `ui.getPending`（回傳含 `TxAiAssessState`）取態；可短輪詢或 SW→擴充頁事件；**禁止**為同步 assess 寫 `chrome.storage` |
| 等級來源 | **僅 SW** 在 harness 產出報告後 `POST` OpenRouter Decisions API（`/api/alpha/decisions`，不經 sandbox／harness／offscreen），模型用 `settings.openRouterDecisionsModel`。`state.flags` **只**用 SW 本地計算的確定性 flags（見下）。`choice` 四選一：`low`／`watch`／`high`／`unknown`。失敗、逾時、無法解析 → UI **unknown（灰）**，報告區仍可顯示已有正文（若有） |
| Flags 下限 | **僅 SW** 在 Decisions 結果之上套用本地下限（完整表見 HOW）：例如存在 `unlimited_approve` 或 `authority_change` 時，顯示等級不得低於 `watch`；存在 HOW 所列「至少高」旗標時不得低於 `high`。下限只升不降 |
| 確定性 flags | 沿用／收斂 id（至少含 `unknown_program`、`durable_nonce`、`authority_change`、`unlimited_approve`、`close_account_external`、`system_assign`、`owner_mismatch`、`lookup_account_unchecked`）。`unknown_program` 本身為 info、**不**單獨觸發下限抬級。**只**由 service worker（與 SW 同特權、且不在 sandbox／offscreen 的 host 模組）對該筆 pending 未簽交易位元組本地計算；寫入 `TxAiAssessState.flags`、送進 Decisions 的 `state.flags`、以及 flags 下限，**一律只用此結果**。Sandbox／模型／tool 回傳中的 flags 或等級字串一律忽略，不得覆寫 |
| 不擋核准 | 評估失敗、unknown、高，皆不改變核准／拒絕按鈕可用性 |
| 版本號 | 出貨時 `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.30.0` |

## 非目標

- 真·遠端任意碼執行防護以外的「保證模型永不胡說」
- Agent 代簽、auto-approve、以等級禁用核准
- 把報告或等級持久化到 storage／跨 pending 復用
- 本版手動「重新分析」鈕；refresh 重跑 AI
- `signMessage` AI 分析
- 通用錢包內聊天、代操作 swap、掃 GitHub IDL
- 發布 bubble-harness 到 npm 並以 npm 依賴出貨
- 改 custody 主路徑、pending 持久化策略、Wallet Standard 方法表
- Durable nonce 獨立 notice 文案大改（仍可與 flags 並存；見 backlog）
- 升 `schemaGeneration`

## 開工前仍須拍板

（無。已定：Decisions `liquid/d1`／`nace-ai/drex-v1.5`；必須 offscreen 承載 sandbox；審批 AI 視覺見 [`tx-ai-chip-report-ux.html`](../design-demos/tx-ai-chip-report-ux.html)，帳戶／站點列見 [`approval-account-chrome-ux.html`](../design-demos/approval-account-chrome-ux.html)。）

## 與上一版／POC 對照

| 既有 | 0.30.0 |
|------|--------|
| 審批：模擬＋CU＋0.19 decode | 保留；另加並行 AI 控件 |
| POC：test-web 繁中寫死、host 同頁跑 harness | 產品：locale 注入；sandbox 跑 loop；Decisions 定級 |
| 0.28 撤排程的「一次短文卡」 | 不做；改多輪 tool＋sandbox |
| Jupiter／Helius key 形狀 | OpenRouter 同一套 configured／secrets 讀取模式 |

## 實作軌道

### Track 1 — Settings 與 storage

- **做：** `openRouterApiKey`、`openRouterModel`、`openRouterDecisionsModel`、`txAiAnalysisEnabled`；`openRouterConfigured`；設定 UI（含 Decisions 模型下拉）＋三語 catalog；secrets 讀取對齊 0.27
- **不做：** vault；預設 on
- **驗收：** `getState` 無明文 key；設定頁可存／改／清空；typecheck

### Track 2 — Sandbox 殼與訊息橋

- **做：** `sandbox` 頁＋**必備** offscreen 宿主；SW↔offscreen↔sandbox 協議；短命生命週期；抄入本倉的 harness loop 只打進 sandbox bundle
- **不做：** sandbox 內 `chrome.*`；sandbox 直連 OpenRouter／RPC；SW 直接 embed sandbox 當主路徑
- **驗收：** sandbox 執行環境無 `chrome`；assess 經 offscreen；惡意／測試用「假 tool 請求 vault」被 host 拒絕；手驗見下

### Track 3 — Host tools、assess、Decisions、flags 下限

- **做：** allowlisted tools；pending 記憶體狀態機（idle／running／done／error）；Decisions；flags 下限；approve／reject 清理
- **不做：** 持久化報告；refresh 重跑 AI
- **驗收：** 單元或手驗：下限表；Decisions 失敗→unknown；pending 結束後無殘留

### Track 4 — 審批 UI

- **做：** 懸浮 AI 卡（雷達／報告 icon 脈衝）＋overlay；帳戶 pill 第一列 hug 左；站點同列靠左；與模擬並行；refresh 行為
- **不做：** 手動再分析
- **驗收：** 手驗三種 kind；off 或無 key 不出現控件；未封裝擴充走完

## 驗收

- [ ] `cd wallet && npm run typecheck` 與 `npm run build`
- [ ] Settings：key／報告模型／Decisions 模型／開關可持久；未知 Decisions 模型 id 回退 `liquid/d1`；`getState`／`toPublicSettings` 無 `openRouterApiKey` 明文；`wallet.readIntegrationSecrets` 含 `openRouterApiKey`（僅擴充頁）
- [ ] 開關 off 或 key 空：三種簽署審批無 AI 控件、網路無 OpenRouter chat／decisions
- [ ] 開關 on＋key：打開簽署審批後出現懸浮 AI 卡（分析中雷達→完成報告 icon）；點開 overlay 可見報告，關閉後卡回來且不重跑；`locale`＝`en` 或 `zh-Hans` 時報告語系對應（非寫死繁中）
- [ ] 分析進行中仍可改 CU、refresh 模擬、核准／拒絕；核准不等待 assess
- [ ] Refresh 只影響模擬，不重跑 AI、不洗掉已完成報告
- [ ] Approve／reject／abort 後再開新 pending：無上筆報告；offscreen 已關
- [ ] Sandbox 頁腳本不可呼叫 `chrome.storage`／`chrome.runtime.sendMessage` 到擴充特權路徑（以實作審查／手驗記述為準）
- [ ] Host 拒絕：假 tool 名含 vault／sign；`sendTransaction`（或同等寫入 RPC）；未知 tool 名
- [ ] Flags 下限：單元或手驗——`unlimited_approve` 不得顯示低於 `watch`；`owner_mismatch` 不得低於 `high`
- [ ] Decisions 失敗／逾時 → 灰 unknown；有報告正文時 overlay 仍可開啟
- [ ] Mainnet RPC 未就緒（或空 `rpcUrl`）時 tool 失敗 → assess error／unknown，仍不擋核准
- [ ] 文件無真實 key、助記詞、密碼
- [ ] 未封裝擴充走完主路徑（靜態截圖不算）

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/manifest.config.ts` | sandbox／offscreen 權限與頁面 |
| `wallet/src/shared/storage-keys.ts` | Settings 新欄與 PublicSettings |
| `wallet/src/background/pending/` | pending 生命週期；掛 assess 結果 |
| `wallet/src/approval/` 或 popup 審批殼 | AI 控件 UI |
| `wallet/src/agent-harness/`（或同等，本版新建） | 抄入的 loop；只給 sandbox bundle |
| `test-web/src/sign-risk-*.ts` | POC 行為與 tool 形狀參考 |
