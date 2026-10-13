# 0.39.0 HOW

對照 [INDEX.md](../INDEX.md) 已定案。實作細節；衝突以 INDEX 為準。

## 1. 側欄關閉拒絕待簽

### 1.1 現況（為何要改）

- Popout：`chrome.windows.onRemoved` → `unbindPopoutWindow` → `rejectOrdinaryDappPending` 或 `finishSignAndSendWindowClosed`（`wallet/src/background/index.ts`）。
- 側欄：`SIDEBAR_SURFACE_PORT` `onDisconnect` 僅 `setSidebarSurfaceOpen(false)`（`wallet/src/background/shell/wallet-shell.ts`）。
- `rejectOrdinaryDappPending` 對 `signAndSendTransaction` **直接 return**（`reject-dapp-pending.ts`），不可拿來處理側欄關閉的 sign-and-send。

### 1.2 新行為

在 `port.onDisconnect`（且 `port.name === SIDEBAR_SURFACE_PORT`）內：

0. 若 `sidebarSurfaceOpen !== true`，僅 `setSidebarSurfaceOpen(false)`（若需要）並 return。
1. `const id = findOldestSidebarSignTxPendingId()`（新函式，見下）。
2. 若 `id == null`，不碰 pending。
3. 否則 `const p = getPending(id)`；若已不在 map 則 return。
4. `p.kind === "signTransaction"` → `void rejectOrdinaryDappPending(id, "Approval window closed")`。
5. `p.kind === "signAndSendTransaction"` → `void finishSignAndSendWindowClosed(id)`。
6. 其他 kind 不處理。
7. `void setSidebarSurfaceOpen(false)`（或維持既有順序，但步驟 0–6 須在把旗標改為 false **之前**完成）。

上述步驟對已 `takePending` 的 id 須 no-op（idempotent），避免與極少數重入競態雙送 bridge。

### 1.3 側欄 unload（與 pagehide 競態）

`usePopupAppState.ts` 內 `abortDappApprovalOnSidebarUnload` **刪除**或改為不呼叫 `rejectFlowPending`（關側欄時不再從側欄文件送 `ui.resolvePending`）。

理由：sign-and-send 在 `ui.resolvePending` reject 路徑走 `finishSignAndSendRejected`（訊息 `"User rejected"`），與 popout 關窗／本版驗收的 `"Approval window closed"` 不一致；且 SW port 斷線才是權威。connect／signMessage 亦不在關側欄時由 unload 拒絕（對齊 INDEX 驗收「僅 sign tx 兩種由 SW 拒絕」）。

`abortWalletSendOnPopupUnload` 保留（walletSend 非本版側欄待簽範圍）。

### 1.4 `findOldestSidebarSignTxPendingId`

```text
pendingRequests 中：
  uiHost === "sidebar"
  kind ∈ { signTransaction, signAndSendTransaction }
取 createdAt 最小者的 requestId
```

勿重用 `findSidebarDappApprovalRequestId` 於關閉路徑（該函式含 connect／signMessage，與本版產品範圍不符）。

### 1.5 與 `getContexts` 的關係

`refreshSidebarOpenFromContexts` 仍只更新 toolbar；**權威拒絕**以 port 斷線 + 上述 pending 結束為準。若未來 Chrome 行為導致 port 斷線與 context 不一致，以 port 斷線觸發為本版契約。

### 1.6 手驗（Track 1）

1. 擴充載入；`test-web` 連線；開側欄錢包（[0.25.0](../../0.25.0/INDEX.md) 流程）。
2. 觸發 `signTransaction` 或 `signAndSendTransaction`（側欄審批）。
3. 用 Chrome 關閉側欄（非殼內切回 popup，若可測兩者更好）。
4. 發起頁 console／UI 應在數秒內收到拒絕，而非等滿 pending 逾時。

---

## 2. AI 設定模型選項

### 2.1 固定清單（`wallet/src/shared/tx-ai.ts`）

```text
REPORT_PRESETS = [
  "apodex/apodex-1.1-mini:free",
  "~deepseek/deepseek-flash-latest",
]
DEFAULT_REPORT_MODEL = "apodex/apodex-1.1-mini:free"

DECISIONS_PRESETS 維持 liquid/d1、nace-ai/drex-v1.5
DEFAULT_DECISIONS_MODEL = "liquid/d1"
```

移除舊四選單（Pro、Kimi、GLM）作為 **下拉固定項**；已存於 storage 的舊 id 仍合法（見 normalize）。

### 2.2 合法自訂 id

```ts
function isLegalOpenRouterModelId(raw: string): boolean {
  const id = raw.trim();
  if (!id || id.length > 256) return false;
  if (/[\s\u0000-\u001F\u007F]/.test(id)) return false;
  return true;
}
```

### 2.3 Normalize（讀取與送 API）

- 若 `raw` 等於某 **固定 preset** → 該 preset。
- 否若 `isLegalOpenRouterModelId(raw)` → `raw.trim()`。
- 否 → 該欄 `DEFAULT_*`。

**禁止**在 normalize 把未知字串改寫成 apodex／liquid。

`storage-io.ts` 讀 settings 時仍呼叫 normalize（非法才落預設）；合法自訂 **persist**。

### 2.4 UI 狀態（`TxAiSettingsScreen.tsx`）

每欄（報告／定級）：

- `mode`：`presetId` 或 `"other"`（derived：storage 值是否在 preset 清單）。
- `customDraft`：僅在 `other` 時編輯；初始為 storage 值（自訂時）或 `""`。
- `<select>`：三 option；`onChange` 若選 preset → 立刻 `patchSettingsPartial`；若選 `other` → 只切 UI、**不**寫 `"other"` 進 storage。
- `other` 時渲染 `rpc-edit` 同構：`input` + 確認鈕；`onMouseDown` preventDefault 於鈕（與 keys 列，避免 blur 搶焦）；Enter → 同 confirm。
- confirm：合法則 `patchSettingsPartial({ openRouterModel: id })`（或 decisions 欄）；非法則不 patch。

離開子頁（React unmount 或 navigate back）：不自動 patch draft。

### 2.5 i18n

- 新增 `settings.openRouter.model.other`、`settings.openRouter.decisionsModel.other`（三語）。
- 報告 preset option 文字：**直接顯示 id**（不新增 apodex 專用 label key，除非現有 catalog 已有慣例）。
- 移除或停用不再出現在選單的 `settings.openRouter.model.*` 鍵可保留（舊翻譯無害），但下拉不引用 Pro／Kimi／GLM 鍵。

### 2.6 CSS

在 popup settings 範圍為 `.field select`（或 tx-ai 子頁專用 class）：

- `appearance: none`
- `padding-right: 36px`（約）
- `background-image` SVG chevron，`background-position: right 12px center`

對照概念稿 `tx-ai-model-picker-ux.html`。

### 2.7 測試

更新 `wallet/src/shared/tx-ai.test.ts`：

- 未知但合法 id 保留（例：`custom/vendor-model` → 原樣 trim）。
- 含空白、空字串、超長 → **新預設** `apodex/apodex-1.1-mini:free`（取代現斷言的 `~deepseek/deepseek-flash-latest`）。
- preset 仍通過；合法自訂如 `not-a-model` 原樣；非法如 `bad id` → apodex。

---

## 3. 出貨檢查

- `version.md`、`changelog.md`、`wallet/package.json`、`wallet/manifest.config.ts`、根 `README.md` 版本句 → `0.39.0`。
- 刪 `dev-docs/roadmap/backlog/sign-tx-sidebar-close-reject.md`、`tx-ai-model-picker.md`，並更新 `backlog/INDEX.md`。
