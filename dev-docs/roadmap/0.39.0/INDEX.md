# 0.39.0 — 側欄關閉拒絕待簽；AI 設定模型可選「其他」

- **狀態：** `shipped`
- **上游版本：** [0.38.0](../0.38.0/INDEX.md)
- **Changelog：** [`changelog.md`](../../../changelog.md)（0.39.0）
- **構想來源：** 原 backlog「側欄關閉拒絕待簽」「AI 設定模型可選其他」（出貨已清）
- **畫面：** [`dev-docs/design-principles.md`](../../design-principles.md)。AI 設定概念稿 [`tx-ai-model-picker-ux.html`](../../design-demos/0.39.0/tx-ai-model-picker-ux.html)（使用者已同意方向；衝突以本 INDEX／HOW 為準）
- **秘密欄位：** 無（沿用 Settings OpenRouter key）

## 產品句

側欄正在審批網站 `signTransaction`／`signAndSendTransaction` 時，使用者關掉 Chrome 側欄即視為拒絕並回發起頁，不留到逾時。Settings · 交易 AI 分析改為報告／定級各兩個固定模型加「其他」自填 OpenRouter id（勾確認才存），報告預設改為 `apodex/apodex-1.1-mini:free`。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)（設計閘門通過後補 paste-ready）
5. 概念稿 [`tx-ai-model-picker-ux.html`](../../design-demos/0.39.0/tx-ai-model-picker-ux.html)
6. 上游：[0.25.0](../0.25.0/INDEX.md)（側欄殼）、[0.30.0](../0.30.0/INDEX.md)／[0.34.0](../0.34.0/INDEX.md)（交易 AI）

## 已定案

### A — 側欄關閉＝拒絕待簽

| 題 | 決定 |
|----|------|
| 觸發 | Chrome 側欄表面關閉：`SIDEBAR_SURFACE_PORT` `onDisconnect`。在 `onDisconnect` 內 **先**讀取模組旗標 `sidebarSurfaceOpen === true`（**再**呼叫 `setSidebarSurfaceOpen(false)`）；僅在斷線前表面為 open 時才結束待簽 pending。判定與結束在 **service worker** |
| 側欄 unload | 側欄文件 `pagehide`／`beforeunload` **不再**呼叫 `rejectFlowPending`／`ui.resolvePending` 結束任何 dApp pending（移除 `abortDappApprovalOnSidebarUnload` 對 flow 的 reject）。`walletSend` popup unload 既有 abort **不變** |
| 範圍 | 僅 `uiHost: "sidebar"` 且 kind 為 **`signTransaction`** 或 **`signAndSendTransaction`**。`connect`／`signMessage`／`walletSend` **本版不**因關側欄自動拒絕 |
| 多筆 | 若有多筆符合，結束 **最早建立** 的那一筆（與 `findSidebarDappApprovalRequestId` 的「最舊」規則一致，但 kind 限上述兩種） |
| `signTransaction` | 對齊 popout 關窗：`takePending`、取消逾時、`USER_REJECTED`，訊息 `"Approval window closed"`（與現有 popout 族相同） |
| `signAndSendTransaction` | 對齊 popout 關窗：呼叫既有 `finishSignAndSendWindowClosed(requestId)`（尚未廣播 → `USER_REJECTED`；已有 `broadcastSig` → `BROADCAST_UNCONFIRMED`）。**不**用 `rejectOrdinaryDappPending`（該函式會跳過此 kind） |
| 無待簽 | 關側欄仍只 `setSidebarSurfaceOpen(false)`／工具列回 popup，不拒絕其他 pending |
| 失焦 | 維持 [0.25.0](../0.25.0/INDEX.md)：blur／切視窗 **不**構成拒絕 |
| 殼內「關閉側欄」鈕 | 待簽 flow 仍蓋住 Home 頂欄時按不到；本版主路徑是使用者關 Chrome 側欄。`handleShellSwitchToWindow` 既有 `rejectOrdinaryDappPending` 行為 **不擴**到 `signAndSendTransaction`（非本版目標） |

### B — AI 設定模型選項

| 題 | 決定 |
|----|------|
| 報告模型固定項 | 1) `apodex/apodex-1.1-mini:free` — **新預設**（缺欄、讀取 normalize 失敗、空白提交時的後備） 2) `~deepseek/deepseek-flash-latest` 3) 「其他」 |
| 定級模型固定項 | 1) `liquid/d1`（LiquidAI d1，預設維持） 2) `nace-ai/drex-v1.5`（Nace.AI Drex v1.5） 3) 「其他」 |
| 「其他」UI | 選「其他」才在該欄下拉底下出現一行模型 id（monospace）。未選「其他」不留空輸入列 |
| 自訂 id 提交 | 與 RPC 自訂 URL 列尾相同：`icon-btn ghost-inline` + `IconCheck`，`title`／`aria-label`＝`common.confirm`。**按勾或 Enter** 才寫入 `chrome.storage`；打字與失焦 **不**寫 |
| 自訂 id 合法 | trim 後非空、不含空白字元（含 `\s`）與 C0／DEL 控制字元、長度 ≤ **256**。不合法則本次不寫，維持該欄上一次已存 id（無則該欄預設） |
| 未提交 draft | 改回固定選項、或離開「交易 AI 分析」子頁而未按勾：draft 丟棄，**不**寫 storage |
| 讀取／migrate | storage 字串 **原樣保留**；不在讀取時把舊 Kimi／GLM／Pro 等改寫成 apodex。UI：在固定清單內 → 對應下拉；否則 → 「其他」+ 輸入欄帶出已存 id |
| normalize 行為 | `normalizeReportModel`／`normalizeDecisionsModel`（及讀 settings、OpenRouter 報告步、Decisions 步）改為：**固定清單內**照舊；**其餘合法自訂字串** trim 後原樣使用，**不**改回預設。非法字串 → 該欄預設 |
| 下拉變更 | 固定項：`<select>` `onChange` 立刻 `patchSettingsPartial` 寫入該 id。「其他」本身 **不**寫入 storage |
| 文案 | 三語 `ui-messages`：報告固定項顯示 **模型 id 字串**；定級固定項沿用 LiquidAI d1／Nace.AI Drex v1.5 顯示名；「其他」各語一句。更新 `docs/user-guide.md` 報告預設一句 |
| Select 箭頭 | Settings 兩個 `<select>` 用自訂 caret（`appearance: none` + 右內距），與概念稿一致，避免 macOS 原生箭頭貼右 |
| schema | **不**升 `schemaGeneration`；`openRouterModel`／`openRouterDecisionsModel` 仍為 string |

## 非目標

- 改 popout 關窗、pending 逾時秒數、或新增錯誤碼
- 側欄關閉時拒絕 `connect`／`signMessage`／`walletSend`
- 失焦、再點工具列開側欄即當拒絕
- OpenRouter 模型目錄查詢或存檔前驗證 id 存在
- 改 Decisions 評分標準、preflight、sandbox、tool 清單、步數、temperature
- 改 `test-web/sign-risk.html`
- 第三個報告固定預設
- 簽署審批「Details · instructions」展開箭頭樣式（非本版）

## 開工前仍須拍板

（無。概念稿與對話已收斂。）

## 實作軌道

### Track 1 — 側欄關閉拒絕待簽

**做：** 在 `wallet-shell.ts`（或 pending 模組）於側欄 port 斷線時，若存在符合 A 的 pending，依 kind 呼叫 `rejectOrdinaryDappPending` 或 `finishSignAndSendWindowClosed`。抽 `findOldestSidebarSignTxPendingId()`（與 `findSidebarDappApprovalRequestId` 同檔）。`usePopupAppState.ts` 移除側欄 unload 對 dApp flow 的 `rejectFlowPending`。SW 與 popout 關窗路徑須 **idempotent**（pending 已無則 no-op）。單元或窄測覆蓋 kind 分支（若現有 pending 測試慣例允許）。

**不做：** 改 popout `onRemoved`；改 `rejectOrdinaryDappPending` 對 `signAndSendTransaction` 的 early return 語意（側欄路徑應直接呼叫 finish 函式）。

**驗收：** `test-web` 側欄模式待簽 → 關 Chrome 側欄 → 發起頁收到 `USER_REJECTED`（或已廣播路徑的 `BROADCAST_UNCONFIRMED`），非 `TIMEOUT`。

### Track 2 — AI 設定模型

**做：** `tx-ai.ts` 固定清單與 normalize；`TxAiSettingsScreen` 三選 + 條件自訂列；`storage-io`／`bridge`／`openrouter` 使用新 normalize；`ui-messages`；select caret CSS；`tx-ai.test.ts` 更新。

**不做：** 改審批 AI 流程；改 API key 列行為。

**驗收：** 設定頁可存自訂 id 並在下一筆簽署 AI 請求送到 OpenRouter；舊 id 開啟為「其他」；非法提交不覆寫。

### Track 3 — 文件與版本

**做：** `docs/user-guide.md`、`docs/features.md`（若需一句）；出貨時 `version.md`、`changelog.md`、`wallet/package.json`、`manifest`、根 README；**出貨後**刪 backlog 兩檔與 `backlog/INDEX.md` 對應列。

## 驗收

- [x] 側欄 `signTransaction`：關側欄 → 發起 tab `USER_REJECTED`，pending 已清
- [x] 側欄 `signAndSendTransaction` 未廣播：關側欄 → `USER_REJECTED`（`Approval window closed`）
- [x] 側欄僅 `connect`（或 `signMessage`）在側欄：關 Chrome 側欄 **不**收到 `USER_REJECTED`
- [x] Settings：報告預設 apodex；可選 Flash；「其他」+ 勾存自訂 id；定級同理
- [x] 已存 Kimi／GLM 等：開設定為「其他」+ 原 id，未被改寫
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過
- [x] 手驗：載入未封裝擴充，側欄簽名關閉 + 設定改模型各走一遍

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/shell/wallet-shell.ts` | 側欄 port、`setSidebarSurfaceOpen` |
| `wallet/src/background/pending/reject-dapp-pending.ts` | `rejectOrdinaryDappPending`、`findSidebarDappApprovalRequestId` |
| `wallet/src/background/index.ts` | popout `onRemoved` 對照 |
| `wallet/src/background/send/sign-and-send-finish.ts` | `finishSignAndSendWindowClosed` |
| `wallet/src/shared/tx-ai.ts` | 模型清單與 normalize |
| `wallet/src/popup/settings/TxAiSettingsScreen.tsx` | 設定 UI |
| `wallet/src/background/storage/storage-io.ts` | 讀 settings normalize |
| `wallet/src/background/tx-ai/bridge.ts`、`openrouter.ts` | 送模型 id |
| `wallet/src/shared/ui-messages.ts` | 三語 |
| `wallet/src/popup/style.css` | select caret（若與 keys 同檔） |
| `dev-docs/design-demos/0.39.0/tx-ai-model-picker-ux.html` | 概念對照 |
