# Implementation review — 0.18.0 Home Activity

- 日期：2026-10-07（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：實作審查（不改程式、不改 INDEX／HOW、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收
- HOW／WHY／HANDOFF：[`home-activity-how.md`](./home-activity-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游：[`../../0.17.0/INDEX.md`](../../0.17.0/INDEX.md)（本版不改簽核／送出／底欄殼）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 對照範圍：**未提交** working tree（`git status`／`git diff`；含 `docs/roadmap/0.18.0/`、`docs/design-demos/home-activity-ux.html`、Home Activity 程式與相關 roadmap 索引更新）
- 現行程式抽樣（磁碟）：`wallet/src/shared/home-activity.ts`、`wallet/src/background/home-activity/`、`wallet/src/background/handlers/wallet-dispatch.ts`、`wallet/src/popup/components/HomeActivityList.tsx`、`wallet/src/popup/PopupMarkup.tsx`、`wallet/src/popup/style.css`、`wallet/src/shared/commands.ts`、`wallet/src/content/index.ts`
- **總評：** 無未關閉 HIGH。靜態對照 INDEX／HOW 主路徑成立；`typecheck`／`build` 通過。出貨時使用者同意 `shipped`（2026-10-07）；瀏覽器手驗以使用者同意收斂（原 M1）。

## Findings（本輪）

關閉＝對照 INDEX／磁碟已滿足；仍開＝實作相對契約仍缺或未驗。穩定 ID 本檔內不重編號。

### HIGH

（無）

未發現：popup 直連 RPC、活動歷史寫入 `chrome.storage`、mainnet＋Helius key 失敗時改走簽名粗列、用 `description` 分類、`wallet.getHomeActivity` 進 content／inject `PAGE_COMMANDS`、pending 改 storage hydrate、結果預設全 tab 廣播、金額以 `number` 做加減乘除、新增 npm 依賴。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉**（出貨） | 使用者同意 `shipped`；靜態路徑已核對。瀏覽器手驗未在審查環境執行，以出貨同意收斂。 |
| M2 | **關閉**（出貨） | 靜態已對 HOW；與 M1 一併由出貨同意收斂。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉**（出貨） | `package.json`／manifest／`version.md`／`changelog.md` 已對齊 `0.18.0`。 |
| L2 | **非阻擋** | 送出明細使用 Unicode 減號 `−`；不擋出貨。 |
| L3 | **非阻擋** | 無 classification 單元測試；INDEX 未要求。 |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| Activity 有資料時一列一筆，種類為送出／收到／互換／交易 | **通過**（靜態）／**手驗未做** | `rowFromEnhanced`：`SWAP`→`swap`；`TRANSFER`＋單向腿→`send`／`receive`；其餘→`tx`。`rowFromSignature` 粗列一律 `tx`。UI `kindLabel`。 |
| 只有列尾圖示開 Solscan 新分頁；devnet URL 含 `cluster=devnet` | **通過**（靜態）／**手驗未做** | `solscanTxUrl`；`openSolscan`＋`isSolscanTxUrl`＋`chrome.tabs.create`；`.activity-ext` 32×32；`title`／`aria-label`「在 Solscan 開啟」；列無整列 `onClick`。 |
| 載入中、尚無交易、活動暫時無法載入三態；失敗不留上一份列表 | **通過**（靜態） | `HomeActivityList` phase：`loading`／`empty`／`error`／`list`；文案對 INDEX。`useEffect` 起始 `setRows([])`；error 分支 `setRows([])`。 |
| 聚合只查主地址；切帳戶或 cluster 後列表跟著變 | **通過**（靜態）／**手驗未做** | `handleGetHomeActivity`→`getExposedPublicKey(active)`（聚合 `mainPubkey`）。deps 見 M2。 |
| 歷史不進 `chrome.storage`；未加套件 | **通過**（靜態） | SW 查詢後直接回傳；`storage-keys` 無 activity key；`package.json` dependencies 未增。 |
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 見「測試結果」。 |
| 手驗：mainnet＋Helius key 見解析列；devnet 或無 key 見成功／失敗粗列 | **未驗** | 見 M1。 |
| 手驗：mainnet＋可解析 key 但 enhanced 失敗 → unavailable，非粗列 | **通過**（靜態）／**手驗未做** | `getHomeActivity`：`mainnet && apiKey` 僅 `fetchEnhanced`；catch 回 `{ rows: [], error: "unavailable" }`，無 fallback `fetchSignatures`。 |
| 文件與程式無真實密碼／助記詞／私鑰 | **通過**（抽樣） | 已讀契約與 activity 相關程式；錯誤路徑未拼接 API key。本報告未貼真實秘密。 |

## 測試結果

指令（INDEX）：`cd wallet && npm run typecheck`、`npm run build`（審查於 `wallet/` 目錄執行）。

| 指令 | 結果 |
|------|------|
| `npm run typecheck` | 通過（`tsc --noEmit`，exit 0） |
| `npm run build` | 通過（`tsc --noEmit && vite build`，Vite 6.4.3，239 modules，約 1.83s，exit 0） |

瀏覽器手驗：未執行（無法在本 agent 環境載入 Chrome 擴充並操作 mainnet／devnet）。

## 重點核對（對照 INDEX／HOW）

| 項 | 結論 |
|----|------|
| `wallet.getHomeActivity` 無 payload；SW 處理 | `handleGetHomeActivity`；`wallet-dispatch` 分派。 |
| 無 active → `{ rows: [] }`（尚無交易） | command handler 早退。 |
| 地址無法解析 → `unavailable` | `getHomeActivity` 內 `PublicKey` 驗證失敗。 |
| Helius URL／query 參數 | `limit=20`、`token-accounts=balanceChanged`、`sort-order=desc`、`commitment=confirmed`、`api-key`；20s abort。 |
| devnet 即使有 key 走簽名粗列 | `cluster === "mainnet" && apiKey` 才 enhanced。 |
| 符號 SOL／USDC／USDT；其餘 mint 縮寫 | `MINT_SYMBOL`＋`symbolForMint`。 |
| 鏈上失敗：種類不變；第二行「失敗」 | `lead: fail`；粗列 `lead: ok`＋「成功 · 縮寫」。 |
| 不進 inject 白名單 | `PAGE_COMMANDS` 無 `wallet.getHomeActivity`。 |
| Track 2：頂欄／底欄不隨列表捲走 | `#app` 欄式布局；`top-bar`／`tab-bar` 在 `screen-body` 外；列表於可捲動 `main.screen-body` 內（靜態）。 |
| 從 Settings／Accounts 返回不記 Activity | 既有 `BACK_PARENT`／`runtime.ts`（`home-activity`→`home-token`）；本 diff 未改該語意。 |
| 移除假交易 placeholder | 原 `PopupMarkup` 空態 placeholder 已改為 `HomeActivityList`。 |

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置／下一步 |
|----|----|------|------------------|
| M1 | M | **關閉** | 出貨同意；靜態路徑已核 |
| M2 | M | **關閉** | 靜態已對 HOW；出貨同意 |
| L1 | L | **關閉** | version／manifest／changelog 已 `0.18.0` |
| L2 | L | 非阻擋 | 可選：統一減號字元 |
| L3 | L | 非阻擋 | 可選：補 classification 單測 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-07 | 無 HIGH；typecheck／build 通過；靜態主路徑對 INDEX／HOW；瀏覽器手驗未做（M1） |
| 出貨收斂 | 2026-10-07 | 使用者同意 `shipped`；M1／M2／L1 關閉；L2／L3 非阻擋 |
