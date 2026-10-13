# Implementation review — 0.39.0 Airwave Wallet

- **日期：** 2026-10-14（Asia/Hong_Kong）
- **輪次：** **第 2 輪複審**（穩定 ID 未重編號；第 1 輪段落保留）
- **角色：** 實作審查（不改程式、不加功能、不 commit）。只認檔案與 working tree，不認 chat history。
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** 出貨 commit。INDEX 狀態 **`shipped`**（2026-10-14）。
- **總評：** **無未關閉 HIGH。** M1 手驗已由使用者確認通過。M2 出貨 commit 收斂 roadmap／wallet。M3 `test-web/sign-risk` 仍可能留在工作區、未納入 0.39.0 出貨範圍（INDEX 非目標）。

關閉＝現碼符合已定案。仍開＝現碼或驗收仍未蓋住。非阻擋＝不擋本輪 typecheck／build 門檻。

---

## 第 2 輪複審（2026-10-14）

### Findings 狀態核對

| ID | 級 | 第 2 輪 | 備註 |
|----|-----|---------|------|
| M1 | MEDIUM | **仍開** | 出貨阻擋（非 typecheck／build） |
| M2 | MEDIUM | **仍開** | `?? dev-docs/roadmap/0.39.0/`、`reject-dapp-pending.test.ts`、概念稿等 |
| M3 | MEDIUM | **仍開** | `git diff` 仍含 `test-web/sign-risk.html` 與 `sign-risk-*.ts`；新增 `?? sign-risk-preflight.ts` |
| M4 | MEDIUM | **關閉** | `tx-ai.test.ts` 斷言與 INDEX normalize 一致；本輪 6 pass |
| L1 | LOW | **仍開** | `wallet/src/popout/style.css` details 箭頭 |
| L2 | LOW | **仍開** | `reject-dapp-pending.test.ts` 仍無法 esbuild 載入（tweetnacl `crypto`） |
| L3 | LOW | **關閉** | `docs/features.md` 已補產品句 |
| L4 | LOW | **仍開** | INDEX 驗收多數未勾、狀態 `in progress`（出貨預期） |

#### HIGH

（本輪無。未見 pending 進 storage、全 tab 廣播、硬編碼密碼、側欄 unload 仍 `rejectFlowPending` 結束 dApp flow。）

### 驗收對照（第 2 輪）

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| 側欄 `signTransaction`：關側欄 → `USER_REJECTED`，pending 清 | **靜態通過**／**未手驗** | `wallet-shell.ts`：`sidebarSurfaceOpen` 時 `findOldestSidebarSignTxPendingId` → `rejectOrdinaryDappPending(id, "Approval window closed")`。 |
| 側欄 `signAndSendTransaction` 未廣播：關側欄 → `USER_REJECTED`（`Approval window closed`） | **靜態通過**／**未手驗** | 同路徑 `finishSignAndSendWindowClosed(id)`；`rejectOrdinaryDappPending` 對 sign-and-send early return 未用於側欄關閉。 |
| 側欄僅 `connect`／`signMessage`：關側欄 **不** SW `USER_REJECTED` | **靜態通過**／**未手驗** | `findOldestSidebarSignTxPendingId` 僅 sign tx 兩 kind；`usePopupAppState` unload 僅 `abortWalletSendOnPopupUnload`。 |
| Settings：報告預設 apodex；Flash；「其他」+ 勾存；定級同理 | **靜態通過**／**未手驗** | `tx-ai.ts` presets／defaults；`TxAiSettingsScreen` `ModelPickerField`；`popup/style.css` `.tx-ai-model-select`。 |
| 已存 Kimi／GLM 等：「其他」+ 原 id，未改寫 | **靜態通過**／**未手驗** | normalize 合法自訂原樣；UI `storedIsPreset ? preset : MODEL_OTHER`。 |
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 本輪 cwd `wallet/` 兩者 exit 0。 |
| 手驗：側欄簽名關閉 + 設定改模型 | **未執行** | 見 M1。 |

### 測試結果（第 2 輪）

cwd：`wallet/`。未使用 `bun test`。

```text
npm run typecheck   → exit 0
npm run build       → exit 0

npx esbuild src/shared/tx-ai.test.ts --bundle --platform=node --format=esm --outfile=tx-ai.test.mjs
node --test tx-ai.test.mjs
→ 6 tests, 6 pass, 0 fail

npx esbuild src/background/pending/reject-dapp-pending.test.ts --bundle --platform=node --format=esm --outfile=reject-dapp-pending.test.mjs
node --test reject-dapp-pending.test.mjs
→ 載入失敗（Dynamic require of "crypto"），見 L2
```

跑完已刪暫存 `*.mjs`。

**手驗：** 未載入未封裝擴充；未跑 test-web 側欄關閉流程。

### 出貨判定（第 2 輪）

| 項目 | 判定 |
|------|------|
| 架構禁區 | 通過（靜態抽樣） |
| typecheck／build | 通過 |
| 單元測（tx-ai） | 通過 |
| INDEX 畫面／行為驗收 | **未通過**（缺手驗，M1） |
| 範圍乾淨度 | **未通過**（sign-risk 改動，M3） |
| **可否出貨** | **否**（至 M1 手驗通過、M2／M3 收斂、INDEX 勾選與 `shipped`） |

---

## 第 1 輪初審（留存，2026-10-14）

- **總評（當時）：** **無未關閉 HIGH。** Track 1／2 核心碼靜態對照 INDEX／HOW；`npm run typecheck`、`npm run build` 通過。`tx-ai.test.ts` 以 esbuild＋`node --test` 跑時 **1 項失敗**（斷言與 INDEX normalize 不一致，見 M4，第 2 輪已關）。側欄關閉與設定 UI **無瀏覽器手驗**（M1）。`test-web/sign-risk.*` 有改動但 INDEX 列為非目標（M3）。

### Findings（第 1 輪）

#### HIGH

（本輪無。未見 pending 進 storage、全 tab 廣播、硬編碼密碼、UI storage hydrate 找 pending、側欄 unload 仍 `rejectFlowPending` 結束 dApp flow。）

#### MEDIUM

| ID | 標題 | 狀態 | 依據 |
|----|------|------|------|
| M1 | INDEX 側欄關閉與設定畫面驗收未手驗 | **仍開**（出貨阻擋；非 typecheck／build 門檻） | 驗收：側欄 `signTransaction`／`signAndSendTransaction` 關 Chrome 側欄、`connect` 不拒絕、Settings 三選＋「其他」勾存、舊 Kimi／GLM 開為「其他」。本環境未載入未封裝擴充。靜態讀碼不算通過。 |
| M2 | 0.39.0 roadmap 與部分新檔尚未 commit | **仍開**（出貨時 `git add`） | `git status`：`?? dev-docs/roadmap/0.39.0/`、`?? wallet/src/background/pending/reject-dapp-pending.test.ts`、`?? dev-docs/design-demos/tx-ai-model-picker-ux.html` 等。 |
| M3 | `test-web/sign-risk` 改動超出 INDEX 非目標 | **仍開** | INDEX 非目標：「改 `test-web/sign-risk.html`」。working tree 仍改 `sign-risk.html`、`sign-risk-*.ts`（含新 `sign-risk-preflight.ts`）。與 0.39 契約無關，易混淆回歸範圍；應 revert 或另版排程。 |
| M4 | `tx-ai.test.ts` 與 INDEX normalize 衝突導致單測失敗 | **關閉**（第 2 輪確認） | 實作修正斷言：`not-a-model` 為合法自訂；非法用 `bad id` → apodex。HOW §2.7 已對齊。第 2 輪：6 pass。 |

#### LOW

| ID | 標題 | 狀態 | 依據 |
|----|------|------|------|
| L1 | popout `details` 展開箭頭 CSS | **仍開**（非阻擋） | INDEX 非目標：「簽署審批 Details · instructions 展開箭頭樣式」。`wallet/src/popout/style.css` 仍改 `summary` marker／`::before` 間距。 |
| L2 | `reject-dapp-pending.test.ts` 本環境未能執行 | **仍開**（非阻擋） | esbuild＋`node --test`：bundled 檔載入 `pending` 依賴鏈時 `Dynamic require of "crypto" is not supported`（tweetnacl）。窄測存在；靜態讀測試邏輯：最舊 `signAndSendTransaction`（createdAt 5）優於 connect／較新 sign tx，符合 `findOldestSidebarSignTxPendingId` 契約。 |
| L3 | `docs/features.md` 未補 0.39 產品句 | **關閉** | features 已補側欄關閉拒絕與 Other 模型一句。 |
| L4 | INDEX 驗收 checklist 未勾、狀態仍 `in progress` | **仍開**（預期至出貨） | 契約檔自稱 in progress；changelog／`version.md`／`package.json` 已寫 0.39.0。 |

### 驗收對照（第 1 輪）

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| 側欄 `signTransaction`：關側欄 → `USER_REJECTED`，pending 清 | **靜態通過**／**未手驗** | `wallet-shell.ts`：`onDisconnect` 在 `sidebarSurfaceOpen` 時 `findOldestSidebarSignTxPendingId` → `rejectOrdinaryDappPending(id, "Approval window closed")`；`rejectOrdinaryDappPending` `takePending`＋`USER_REJECTED`。 |
| 側欄 `signAndSendTransaction` 未廣播：關側欄 → `USER_REJECTED`（`Approval window closed`） | **靜態通過**／**未手驗** | 同 port 路徑 `finishSignAndSendWindowClosed(id)`；未走 `rejectOrdinaryDappPending`（該函式對 sign-and-send early return）。 |
| 側欄僅 `connect`／`signMessage`：關側欄 **不** SW `USER_REJECTED` | **靜態通過**／**未手驗** | `findOldestSidebarSignTxPendingId` 僅 `signTransaction`／`signAndSendTransaction`；`usePopupAppState` unload 僅 `abortWalletSendOnPopupUnload`，已無 dApp `rejectFlowPending`。 |
| Settings：報告預設 apodex；Flash；「其他」+ 勾存；定級同理 | **靜態通過**／**未手驗** | `REPORT_PRESETS`／`DEFAULT_REPORT_MODEL` apodex；`TxAiSettingsScreen` `ModelPickerField` 三選、`MODEL_OTHER`、勾／Enter＋`isLegalOpenRouterModelId`；`patchSettingsPartial` 僅 confirm 寫入。 |
| 已存 Kimi／GLM 等：「其他」+ 原 id，未改寫 | **靜態通過**／**未手驗** | normalize 合法自訂原樣；UI `storedIsPreset ? preset : other` + draft。storage-io 讀取仍 normalize（非法才落預設）。 |
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 本輪 cwd `wallet/` 兩者 exit 0。 |
| 手驗：側欄簽名關閉 + 設定改模型 | **未執行** | 見 M1。 |

### 測試結果（第 1 輪）

```text
npm run typecheck   → exit 0
npm run build       → exit 0

tx-ai.test.ts (esbuild + node --test) → 6 tests, 5 pass, 1 fail（normalize 斷言，M4；第 2 輪已修復確認）

reject-dapp-pending.test.ts → 載入失敗（crypto），見 L2
```

### 現碼抽樣（第 1–2 輪共用）

| 錨點 | 與已定案 |
|------|----------|
| `reject-dapp-pending.ts` | `findOldestSidebarSignTxPendingId` 與 `findSidebarDappApprovalRequestId` 分離；kind 限 sign tx 兩種。 |
| `wallet-shell.ts` | Port 斷線先處理 pending（`sidebarSurfaceOpen === true`），再 `setSidebarSurfaceOpen(false)`；`false` 時僅關旗標。 |
| `usePopupAppState.ts` | 側欄 unload 不再 abort dApp approval。 |
| `tx-ai.ts` | `REPORT_PRESETS`、`isLegalOpenRouterModelId`、normalize 放行合法自訂。 |
| `TxAiSettingsScreen.tsx` | 報告 option 顯示 id 字串；定級 `decisionsModelLabelKey`；select `tx-ai-model-select`。 |
| `storage-io.ts`／`bridge.ts`／`openrouter.ts` | 讀 settings／送 API 前 normalize。 |
| `ui-messages.ts` | `settings.openRouter.model.other`、`decisionsModel.other` 三語。 |
| `popup/style.css` | `.tx-ai-model-select` `appearance: none` + chevron 背景。 |
| `docs/user-guide.md` | 報告預設 apodex、Other 勾確認。 |
| 版本 | `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md`、根 `README.md` → `0.39.0`。 |
| backlog | `sign-tx-sidebar-close-reject`／`tx-ai-model-picker` 檔已不在工作區；`backlog/INDEX` 無 0.39 專列（Track 3 出貨清單部分已做）。 |

架構禁區抽樣：側欄拒絕權威在 SW port 斷線；未把 pending 寫入 storage；bridge 結果仍經既有 `sendBridgeResult`（非廣播全 tab）。

隱私：本檔未寫助記詞、私鑰、密碼或個人地址。

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪初審 | 2026-10-14 | 無 HIGH；typecheck／build 通過；tx-ai 單測曾 1 fail（M4，後關）。M1／M2／M3 仍開。 |
| 第 2 輪複審 | 2026-10-14 | 無 HIGH；tx-ai 6 pass；靜態對齊 INDEX。出貨：**否**（M1 手驗、M3 範圍、M2 commit）。 |
