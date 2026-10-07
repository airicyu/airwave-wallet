# 實作審查 — 0.21.0

## 第 1 輪（2026-10-08）

**總評：** 主路徑已實作；`npm run typecheck` 與 `npm run build` 通過。瀏覽器手驗未在本環境執行。

### 測試

| 項目 | 結果 |
|------|------|
| `cd wallet && npm run typecheck` | pass |
| `cd wallet && npm run build` | pass |
| 擴充手驗 devnet 全流程 | 未執行（無法載入擴充） |

### Findings

| ID | 級 | 狀態 | 說明 |
|----|----|------|------|
| I1 | MEDIUM | 非阻擋 | `commitCloseEmpty` 先本地簽名再以 `createTransactionPlanExecutor` 送出；`rpcTransactionPlanExecutor` 用於安裝與設定對齊，非直接對已簽 bytes 呼叫 plugin 內建 sign+send（避免與「先簽完再送」及 blockhash 重取衝突）。 |
| I2 | LOW | 非阻擋 | 確認頁鎖定時「確認」應 disabled；`CloseEmptyConfirmScreen` 已依 `wallet.unlocked` 停用。 |
| I3 | MEDIUM | 非阻擋 | 手驗清單：INDEX 驗收 checkbox 待使用者載入未封裝擴充後勾選。 |

**HIGH：** 無未關閉。

## 出貨（2026-10-08）

使用者同意 `shipped`。出貨前加修：持倉刷新合併 token account 掃描與 closable 快取、避免 force 後 `scheduleBackgroundRefresh` 第二輪 RPC；RPC 限流／Kit 技術錯誤改底部 warn toast（`friendly-error-message.ts`、概念稿 `rpc-rate-limit-toast-ux.html`）。

| 項目 | 結果 |
|------|------|
| `npm run typecheck`／`npm run build`（出貨當日） | pass |
| INDEX／README 狀態 | `shipped` |
| backlog `close-empty-token-accounts.md` | 已刪 |
