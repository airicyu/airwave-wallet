# Design review — 0.39.0 Airwave Wallet

- 日期：2026-10-14（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（累加第 1 輪；見文末歷審）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)、[`../../../AGENTS.md`](../../../AGENTS.md) 架構摘要
- 構想參考（非契約）：[`../../backlog/sign-tx-sidebar-close-reject.md`](../../backlog/sign-tx-sidebar-close-reject.md)、[`../../backlog/tx-ai-model-picker.md`](../../backlog/tx-ai-model-picker.md)
- 現行程式抽樣（第 1 輪）：`wallet/src/background/shell/wallet-shell.ts`、`wallet/src/background/pending/reject-dapp-pending.ts`、`wallet/src/background/index.ts`、`wallet/src/background/send/sign-and-send-finish.ts`、`wallet/src/shared/tx-ai.ts`、`wallet/src/shared/tx-ai.test.ts`、`wallet/src/popup/settings/TxAiSettingsScreen.tsx`、`wallet/src/popup/settings/SettingsScreens.tsx`（`rpc-edit` 對照）、`wallet/src/popup/state/usePopupAppState.ts`、`docs/user-guide.md`
- **總評：** 無未關閉 **HIGH**、無未關閉 **MEDIUM**。第 1 輪 **M1–M3** 已在 INDEX／HOW 關閉；契約自洽、可開實作。設計門檻**通過**。

---

## 第 2 輪複審

### 規劃收斂核對（M1–M3）

| ID | 第 1 輪缺口 | 第 2 輪檔案核對 | 狀態 |
|----|-------------|-----------------|------|
| M1 | HOW §1.2 缺 `sidebarSurfaceOpen` 觸發與順序 | INDEX A 表觸發行：斷線前讀 `sidebarSurfaceOpen === true`，再 `setSidebarSurfaceOpen(false)`；僅 open 時結束 pending。HOW §1.2 步驟 **0** 在旗標非 true 時 return；步驟 1–6 在步驟 7 `setSidebarSurfaceOpen(false)` **之前**完成。 | **關閉** |
| M2 | 側欄 unload `rejectFlowPending` 與 SW 競態、sign-and-send 訊息 | HOW §1.3：`abortDappApprovalOnSidebarUnload` 刪除或不再呼叫 `rejectFlowPending`；理由含 sign-and-send `"User rejected"` 與 popout／驗收不一致、SW port 斷線為權威。HOW §1.2：已 `takePending` 須 idempotent。HOW §1.5：權威拒絕以 port 斷線為準。INDEX A 側欄 unload 行與一致。 | **關閉** |
| M3 | 預設 apodex 與單測未在 HOW 對齊 | HOW §2.7：非法字串落新預設 `apodex/apodex-1.1-mini:free`；取代現斷言的 `~deepseek/deepseek-flash-latest`；`normalizeReportModel("not-a-model")` 改斷言 apodex。與 INDEX／HOW §2.1 `DEFAULT_REPORT_MODEL` 一致。 | **關閉** |

### Findings（第 2 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

#### HIGH

（無）

#### MEDIUM

（無；M1–M3 已關閉，見上表。）

#### LOW

| ID | 標題 | 本輪狀態 | 依據 |
|----|------|----------|------|
| L1 | HANDOFF paste-ready | **關閉** | [`HANDOFF.md`](../HANDOFF.md) 已含 Track 順序、禁區與 paste-ready starter；狀態仍寫「設計閘門通過後 in progress」，與本輪門檻通過一致。 |
| L2 | `findOldestSidebarSignTxPendingId` 模組位置 | 記錄 | INDEX Track 1 仍允許 `wallet-shell.ts` 或 pending 模組；HOW §1.4 只定義行為。實作擇一。 |
| L3 | `docs/user-guide.md` 仍寫 DeepSeek Flash 預設 | 記錄 | INDEX Track 3 要求更新；現碼未改≠設計阻擋。 |

### 驗收對照（第 2 輪）

| INDEX 驗收句（摘要） | 設計層是否可測 | 缺口 |
|--------------------|----------------|------|
| 側欄 `signTransaction` 關側欄 → `USER_REJECTED`、pending 清 | 是 | — |
| 側欄 `signAndSendTransaction` 未廣播關閉 → `USER_REJECTED`（`Approval window closed`） | 是 | —（unload 不再走 `User rejected` 次要路徑） |
| 無待簽或僅 `connect`：關側欄不拒 connect | 是 | — |
| Settings：apodex 預設、Flash、其他＋勾存；定級同理 | 是 | — |
| 已存 Kimi／GLM 等 →「其他」+ 原 id、不 migrate | 是 | — |
| `npm run typecheck`／`build` | 是 | 出貨指令 |
| 手驗：側欄簽名關閉 + 設定改模型 | 是 | — |

### 修復追蹤表（累計）

| ID | 級 | 狀態 | 關閉／備註 |
|----|-----|------|------------|
| M1 | MEDIUM | **關閉** | 第 2 輪：INDEX A 觸發 + HOW §1.2 步驟 0、7 |
| M2 | MEDIUM | **關閉** | 第 2 輪：HOW §1.3、§1.2 idempotent、§1.5 |
| M3 | MEDIUM | **關閉** | 第 2 輪：HOW §2.7 |
| L1 | LOW | **關閉** | 第 2 輪：HANDOFF paste-ready |
| L2 | LOW | 記錄 | 實作擇一 |
| L3 | LOW | 記錄 | Track 3 |

---

## 第 1 輪初審（留存）

- 日期：2026-10-14（Asia/Hong_Kong）
- **總評（當時）：** 無未關閉 **HIGH**；提案**可行**。設計門檻**有條件通過**——應修 **M1–M3** 後再由規劃 agent 收斂並補 HANDOFF paste-ready。

### Findings（第 1 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

backlog 兩檔已排進 INDEX；INDEX「開工前仍須拍板」為空。不以 backlog 剩餘「開工前仍須拍板」段落覆蓋本版已定案。

#### HIGH

（無）

本版 pending 結束留在 service worker（port 斷線 + 既有 `rejectOrdinaryDappPending`／`finishSignAndSendWindowClosed`），不寫入 `chrome.storage`、不廣播全 tab。AI 設定仍走 `chrome.storage` + `patchSettingsPartial`／`storage-io` normalize，與 GUIDELINES 一致。未宣告新 Wallet Standard 方法。

#### MEDIUM

| ID | 標題 | 本輪狀態 | 依據 |
|----|------|----------|------|
| M1 | HOW §1.2 缺 `sidebarSurfaceOpen` 觸發條與順序 | **仍開**（第 2 輪已關） | INDEX 已定案 A 表：觸發須為 `SIDEBAR_SURFACE_PORT` `onDisconnect`，且**關閉前** `sidebarSurfaceOpen === true`。HOW §1.2 只寫在 `setSidebarSurfaceOpen(false)` 前後執行 pending 結束，**未**要求先讀取／快照 `sidebarSurfaceOpen`（或等價：在 `setSidebarSurfaceOpen(false)` **之前**完成判定與拒絕）。實作若先 `setSidebarSurfaceOpen(false)` 再依「仍為 open」判斷，會與 INDEX 分叉。建議 HOW §1.2 增步驟 0：僅在斷線前表面為 open 時進入 §1.2 步驟 1–5。 |
| M2 | 側欄 `pagehide` 與 SW port 斷線競態（sign-and-send 訊息） | **仍開**（第 2 輪已關） | reasoning 已說明 pagehide 不可靠，權威為 SW；但現碼 `usePopupAppState` 在側欄 `pagehide`／`beforeunload` 仍呼叫 `rejectFlowPending` → `ui.resolvePending` reject。`signAndSendTransaction` 該路徑為 `finishSignAndSendRejected`（預設訊息 `"User rejected"`），與 INDEX／驗收「未廣播關閉 → `USER_REJECTED`（`Approval window closed`）」及 popout `finishSignAndSendWindowClosed` **不一致**。若 pagehide 先於 port 斷線送達，手驗可能通過 code 但**不通過**訊息句，或與「對齊 popout 關窗」產品句衝突。建議 HOW §1 增一小節：實作須保證關 Chrome 側欄時對外結果與 popout 關窗一致（例如收窄側欄 unload abort 的 kind 範圍、或 port 斷線優先且 idempotent、或 unload 改走與 window-close 相同 finish 路徑）——**至少**寫清驗收以哪條路徑為準。 |
| M3 | 預設改 apodex 與現有單測斷言未在 HOW 對齊 | **仍開**（第 2 輪已關） | INDEX／HOW §2.1 已改 `DEFAULT_REPORT_MODEL` 為 `apodex/apodex-1.1-mini:free`。現碼 `tx-ai.test.ts` 仍斷言 `normalizeReportModel("not-a-model")` → `~deepseek/deepseek-flash-latest`。HOW §2.7 列了測試主題但未寫「非法字串落新預設 apodex」與更新該斷言，實作 agent 可能漏改測試或與 INDEX 預設不一致。 |

#### LOW

| ID | 標題 | 本輪狀態 | 依據 |
|----|------|----------|------|
| L1 | HANDOFF paste-ready 尚空 | 記錄（第 2 輪已關） | [`HANDOFF.md`](../HANDOFF.md) 明文待設計閘門通過後填入；符合 workflow，非契約矛盾。閘門收斂 M1–M3 後由規劃 agent 補。 |
| L2 | `findOldestSidebarSignTxPendingId` 模組位置 | 記錄 | INDEX Track 1 允許 `wallet-shell.ts` 或 pending 模組；HOW §1.3 只定義行為。實作擇一即可，建議與 `findSidebarDappApprovalRequestId` 同檔以利測試。 |
| L3 | `docs/user-guide.md` 仍寫 DeepSeek Flash 預設 | 記錄 | INDEX Track 3／已定案文案已要求更新；現碼未改≠設計 HIGH。 |

### 驗收對照（第 1 輪）

| INDEX 驗收句（摘要） | 設計層是否可測 | 缺口 |
|--------------------|----------------|------|
| 側欄 `signTransaction` 關側欄 → `USER_REJECTED`、pending 清 | 是 | M2 次要路徑訊息／競態；M1 觸發條 |
| 側欄 `signAndSendTransaction` 未廣播關閉 → `USER_REJECTED`（`Approval window closed`） | 是 | **M2**（pagehide 路徑訊息） |
| 無待簽或僅 `connect`：關側欄不拒 connect | 是 | HOW §1.3 kind 篩選與 INDEX 一致 |
| Settings：apodex 預設、Flash、其他＋勾存；定級同理 | 是 | HOW §2.4–2.5 完整 |
| 已存 Kimi／GLM 等 →「其他」+ 原 id、不 migrate | 是 | normalize §2.3 與 INDEX 讀取／migrate 一致 |
| `npm run typecheck`／`build` | 是 | 出貨指令；非設計洞 |
| 手驗：側欄簽名關閉 + 設定改模型 | 是 | 依 INDEX 手驗；M2 影響 sign-and-send 訊息判定 |

### 與現碼抽樣（第 1 輪）

現碼未做本版 ≠ 設計 HIGH。

| 現況 | 與 0.39.0 提案關係 |
|------|-------------------|
| `wallet-shell.ts` `onDisconnect` 僅 `setSidebarSurfaceOpen(false)` | Track 1 要加 pending 結束；與 INDEX 對齊 popout，**非互斥** |
| `rejectOrdinaryDappPending` 對 `signAndSendTransaction` early return | INDEX／HOW 已要求側欄路徑直接 `finishSignAndSendWindowClosed`；**一致** |
| `index.ts` popout `onRemoved` 已分支 sign-and-send／其餘 | 側欄應鏡像 finish／reject 選擇；HOW §1.2 已寫 |
| `findSidebarDappApprovalRequestId` 含 connect／signMessage | 關閉路徑**不得**重用；HOW §1.3 新函式；**一致** |
| `handleShellSwitchToWindow` 用 `findSidebarDappApprovalRequestId` + `rejectOrdinaryDappPending` | INDEX 非目標：不擴到 sign-and-send；待簽 flow 按不到鈕；**不衝突** |
| `tx-ai.ts` 四選報告模型 + allowlist normalize | Track 2 改清單與放行合法自訂；**預期差異** |
| `TxAiSettingsScreen` 純 `<select>` 四項、即時 patch | Track 2 改三選 + other 列；**預期差異** |
| `SettingsScreens.tsx` `rpc-edit` + `IconCheck` | HOW §2.4 對照路徑存在；**可複用** |
| `usePopupAppState` 側欄 unload → `rejectFlowPending` | 與新 SW 路徑並存；見 **M2**（第 2 輪契約已要求移除） |
| `docs/user-guide.md` DeepSeek 預設句 | Track 3；見 L3 |

### 修復追蹤表（第 1 輪當時）

| ID | 級 | 狀態 | 建議關閉位置 |
|----|-----|------|----------------|
| M1 | MEDIUM | **仍開** | INDEX A 觸發表 + HOW §1.2 步驟順序 |
| M2 | MEDIUM | **仍開** | HOW §1（競態／訊息與 popout 一致）+ 必要時 INDEX 驗收補「以 SW 斷線結果為準」一句 |
| M3 | MEDIUM | **仍開** | HOW §2.7 明寫 apodex 預設與 `tx-ai.test.ts` 斷言更新 |
| L1–L3 | LOW | 記錄 | HANDOFF／實作擇一／Track 3 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪初審 | 2026-10-14 | 無 HIGH；提案可行。門檻有條件通過；仍開 M1–M3。HANDOFF paste-ready 待規劃收斂後補。 |
| 第 2 輪複審 | 2026-10-14 | 無 HIGH、無未關 MEDIUM。M1–M3、L1 關閉。設計門檻**通過**；可開實作 agent。 |
