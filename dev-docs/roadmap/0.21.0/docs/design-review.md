# Design review — 0.21.0 清理空 token account

- 日期：2026-10-08（Asia/Hong_Kong）
- 輪次：**第 1 輪初審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`close-empty-how.md`](./close-empty-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)；上游 [`../../0.20.0/INDEX.md`](../../0.20.0/INDEX.md)、構想 [`../../backlog/close-empty-token-accounts.md`](../../backlog/close-empty-token-accounts.md)（非本版契約）；畫面 [`../../../design-principles.md`](../../../design-principles.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/commands.ts`、`wallet/src/popup/PopupMarkup.tsx`、`wallet/src/shared/home-tokens.ts`、`wallet/src/background/handlers/wallet-dispatch.ts`、`wallet/src/background/send/wallet-begin-send.ts`、`wallet/src/background/send/wallet-finish-send.ts`、`wallet/package.json`、`wallet/src/shared/ext-api.ts`、`wallet/src/background/home-tokens/get-home-tokens-command.ts`
- **總評（最新＝第 2 輪）：** **設計閘門通過**——無未關閉 **HIGH**；第 1 輪 **H1**、**M1–M7** 均已寫進 INDEX／HOW。架構與 GUIDELINES 一致；待拍板為空；HANDOFF 存在。提案**可行**；可將 INDEX 狀態改 `in progress` 並開實作 agent。

---

## 第 2 輪複審

- 日期：2026-10-08（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（只讀檔案；未改 INDEX／HOW／HANDOFF／程式）
- 對照基準：同第 1 輪；以第 1 輪後的 [`../INDEX.md`](../INDEX.md)、[`close-empty-how.md`](./close-empty-how.md) 為收斂結果
- **設計閘門：** **通過**（無未關閉 HIGH）
- **總評：** 規劃收斂完整，契約自足可開工；本輪僅新增 **LOW**（錨點表筆誤），不阻擋實作

### 第 1 輪 findings 狀態（核對 INDEX／HOW）

| ID | 第 2 輪狀態 | 收斂依據（摘要） |
|----|-------------|------------------|
| H1 | **關閉** | INDEX「鎖定」「命令」：`list`／`plan` 不回 `WALLET_LOCKED`；HOW 命令表同步「鎖定仍允許」 |
| M1 | **關閉** | INDEX「入口」：全失敗 `RPC_ERROR` 不畫；部分 owner 失敗仍顯示已掃筆數 |
| M2 | **關閉** | INDEX「命令」＋ HOW `list` payload：`{ force?: boolean }`；持倉刷新帶 `force: true` |
| M3 | **關閉** | INDEX「費用」＋ HOW 優先費：與 0.11 同句（`> 0` 且 `< 1` lamport → `1`） |
| M4 | **關閉** | INDEX「勾選頁殼」：Back＋「收回租金」＋Menu |
| M5 | **關閉** | INDEX「鎖定」：確認頁「確認」鎖定時 **disabled** |
| M6 | **關閉** | INDEX「命令」＋ HOW `commit`：handler 單一 async 鏈 await 至整波結果齊備 |
| M7 | **關閉** | HOW `txs[].cuLimit`／`cuPrice` 註明僅展示與 CB ix、不做 lamports 加減 |

### 第 2 輪新 findings

| ID | 級 | 狀態 | 標題 | 說明 |
|----|----|------|------|------|
| L5 | LOW | 非阻擋 | 錨點表 `commands.ts` 寫「新增兩條」 | INDEX「已定案／命令」為 **三** 條（`list`／`plan`／`commit`）；錨點檔案表仍寫「兩條」。實作以已定案為準；出貨前順手改錨點一句即可。 |

### 第 2 輪驗收對照（設計層）

第 1 輪驗收表所列缺口（M1、M3、M4、M6）已收斂；設計層均可對照 INDEX／HOW 手驗。出貨項（typecheck／build／devnet）仍屬實作階段。

### 第 2 輪現碼抽樣

與第 1 輪相同：`commands.ts` 仍無三條新 command；`PopupMarkup.tsx` 仍無回收與 `close-empty-*` views；`get-home-tokens-command.ts` 鎖定不阻查詢——與收斂後契約一致，**非**設計 HIGH。

---

## Findings（累加）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約分叉或本輪新缺口。

### HIGH

#### H1 — `list`／`plan` 的 `WALLET_LOCKED` 與 INDEX「鎖定」行衝突 — **關閉**（第 2 輪）

- **第 1 輪：** HOW 列 `WALLET_LOCKED`、INDEX 只卡「確認」送出 → 分叉。
- **收斂：** INDEX「鎖定」「命令」採 (A)：`list`／`plan` 允許鎖定；僅 `commitCloseEmpty` 回 `WALLET_LOCKED`；確認鈕鎖定 disabled。HOW 三命令表已刪 `list`／`plan` 的 `WALLET_LOCKED`、改「鎖定仍允許」。

### MEDIUM

| ID | 狀態 | 標題 | 依據與建議 |
|----|------|------|------------|
| M1 | **關閉** | 部分 owner 掃描失敗時入口行為未寫進 INDEX | INDEX「入口」已區分全失敗不畫／部分失敗仍顯示筆數；與 HOW `RPC_ERROR`／`partialScan` 一致。 |
| M2 | **關閉** | `list` 的 `force` 未契約化 | INDEX「命令」與 HOW payload、`getHomeTokens` 刷新帶 `force: true` 已對齊。 |
| M3 | **關閉** | 優先費「不足 1 lamport 為 1」未沿用 0.11 | INDEX「費用」與 HOW 優先費段落已與 0.11 同句。 |
| M4 | **關閉** | 勾選頁頂欄標題未在 INDEX 定義 | INDEX「勾選頁殼」：「收回租金」＋Menu。 |
| M5 | **關閉** | 鎖定時確認鈕 UI 未寫 | INDEX「鎖定」：確認頁「確認」鎖定時 disabled。 |
| M6 | **關閉** | `commitCloseEmpty` 長時間 handler 與 SW 生命週期 | INDEX「命令」與 HOW `commit` § 禁止 fire-and-forget、須 await 整段 1–8。 |
| M7 | **關閉** | `planCloseEmpty` 回傳 `cuLimit`／`cuPrice` 為 JSON number | HOW 已註明僅展示與 CB ix、不做 lamports 加減。 |

### LOW

| ID | 狀態 | 標題 | 依據 |
|----|------|------|------|
| L1 | 非阻擋 | Tokens 重新整理鈕文案為英文 | 現碼 `PopupMarkup`：`title`／`aria-label` 為 "Refresh balances"；本版回收鈕 INDEX 要求繁中「收回租金」。建議實作時回收鈕用繁中；是否順便統一刷新鈕可另議。 |
| L2 | 非阻擋 | 命令命名 `list*` vs 既有 `getHomeTokens` | 風格不一致；INDEX 已定 `wallet.listClosableTokenAccounts`，僅記錄。 |
| L3 | 非阻擋 | backlog 檔首段「尚未排進 INDEX」與連結 0.21.0 並存 | [`close-empty-token-accounts.md`](../../backlog/close-empty-token-accounts.md) 構想層；出貨時刪 backlog。不阻擋開工。 |
| L4 | 非阻擋 | 概念稿寫「每筆最多 8 個」僅示意 | demo 註解已說 N 以封包為準；INDEX／HOW 已禁止寫死 8。 |
| L5 | 非阻擋 | 錨點表 `commands.ts` 寫「新增兩條 command」 | 已定案為三條；見第 2 輪新 findings。 |

## 驗收對照

| INDEX 驗收句（摘要） | 設計層是否可測 | 缺口 |
|----------------------|----------------|------|
| Tokens 標題列回收圖示三態＋僅 Tokens | 可測 | （第 2 輪）M1／M4 已收斂 |
| 勾選／全選／殼底 `m` 與打包函式一致 | 可測 | shared 打包 HOW 已寫 |
| 確認頁費用、Kit limit、Default price、估失敗 disabled | 可測 | （第 2 輪）M3 已收斂 |
| 先簽後送、executor 預設並發、passthrough、三類結果 | 可測 | （第 2 輪）M6 已收斂 |
| `STALE_LIST` 整波不送 | 可測 | HOW stale 已寫 |
| Token-2022 extension／wSOL／聚合 rent | 可測 | reasoning 已支撐 |
| 無 popout／pending／storage／新 WS 方法 | 可測 | 與 GUIDELINES 一致 |
| typecheck／build | 出貨測 | Track 4 |
| devnet 手驗全流程 | 出貨測 | 無設計洞 |
| 無真實秘密 | 文件已守 | 本報告未貼 |

**開工前仍須拍板（INDEX）：** 空。

**架構禁區抽查：** 本版明確「沒有新的 pending kind、不開 popout、URL 不帶 `requestId`」；`planId` 僅 SW 記憶體 TTL——**不**等同 dApp pending，與 GUIDELINES「UI 不向 storage hydrate 找包裹」**不衝突**。結果經 popup 發起的 typed command 回傳，**非**全 tab 廣播。不新增 storage key。不宣告 Wallet Standard 新方法。依賴 `@solana/kit-plugin-rpc` INDEX 已允許。

## 與現碼抽樣

現碼**尚未實作**本版命令與畫面 ≠ 設計 HIGH。

| 錨點 | 現況 | 與 0.21.0 契約 |
|------|------|----------------|
| `shared/commands.ts` | 無 `listClosableTokenAccounts`／`planCloseEmpty`／`commitCloseEmpty`；`PendingKind` 仍五種 | Track 1 起新增 command 與 dispatch |
| `PopupMarkup.tsx` | `home-token` 僅 Tokens 標題＋刷新；無回收圖示、無 `close-empty-*` views | Track 1–2 UI |
| `wallet-dispatch.ts` | 現有 `wallet.getHomeTokens` 等 | 平行挂三 handler |
| `home-tokens.ts` | `WRAPPED_SOL_MINT`、持倉濾 0 | 掃描另走 list；持倉行為不變 |
| `wallet-begin-send.ts`／`wallet-finish-send.ts` | 單筆 `walletSend`；HTTP `getSignatureStatuses` 輪詢 60s | 本版後備確認**對齊** finish-send；**不改**單筆語意 |
| `package.json` | `0.20.0`；無 `@solana/kit-plugin-rpc` | Track 3–4 加依賴與版本號 |
| `ext-api.ts` | `sendMessage` 無 client timeout | 利於長 `commit`；須 SW handler 不中途釋放（M6） |
| `get-home-tokens-command.ts` | 鎖定仍可查 | 支持 H1 建議 (A) |

## 修復追蹤

| ID | 建議負責 | 動作 | 第 2 輪 |
|----|----------|------|---------|
| H1 | 規劃 | INDEX「鎖定」與 HOW `list`／`plan` 失敗碼對齊 | **已完成** |
| M1 | 規劃 | INDEX 補部分掃描失敗行為 | **已完成** |
| M2 | 規劃 | HOW `list` payload 或刪 `force` | **已完成** |
| M3 | 規劃 | 費用公式與 0.11 對齊 | **已完成** |
| M4–M5 | 規劃 | INDEX／HOW 補 pick 標題與鎖定時確認 UX | **已完成** |
| M6–M7 | 規劃／實作 | HOW 補 commit await；M7 註記 | **已完成** |
| L1–L4 | 實作／出貨 | 順手或忽略 | 仍非阻擋 |
| L5 | 規劃／出貨 | 錨點表改「三條 command」 | 可選 |

**出貨門檻（設計）：** **已滿足**——無未關閉 HIGH；HANDOFF「設計審查無未關 HIGH」可勾。未關閉 **MEDIUM** 無；**LOW**（L1–L5）不擋開工。

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 1 | 2026-10-08 | 架構與範圍可實作；**H1** HOW／INDEX 鎖定分叉阻擋「無 HIGH 開工」；M1–M7 建議收斂；L 非阻擋。 |
| 2 | 2026-10-08 | **設計閘門通過**；H1、M1–M7 關閉；新增 L5（錨點筆誤）；可 `in progress` 實作。 |
