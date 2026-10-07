# Design review — 0.22.0 Airwave Wallet

- 日期：2026-10-08（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`WalletWidget.tsx`、`PopupMarkup.tsx`、`format.ts`、`HomeActivityList.tsx`、`home-activity.ts`、`CloseEmptyFeature.tsx`、`shell.ts`、`sign-tx-simulate.ts`、`compute-budget-tx.ts`、`close-empty-service.ts`、`account-commands.ts`、`ApprovalHost.tsx`
- **總評：** 無未關閉 HIGH。M1–M6、L1–L3 均已寫進 INDEX／HOW（待拍板仍空）。無應修仍開的 MEDIUM。**設計審查門檻通過。**

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。本輪未新開 ID。

### HIGH

（無）

複審仍未見：pending 改持久、新 storage key、新 Wallet Standard 方法、收回租金走審批殼／`openPopout`、cluster 另存、刷新冷卻進 storage、探針寫入 `workingTx`、`estimateAndSetResourceLimitsFactory`。現碼未做本版 UI／Orb／factory 替換，不記設計 HIGH。

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| **M1** — 驗收「無 `solscan.io`」範圍過寬 | **關閉** | INDEX Track 1 與出貨驗收：`wallet/src` 內 Activity 路徑（`home-activity.ts`、`HomeActivityList.tsx`）無 `solscan.io`；changelog 與已 shipped 版文件不在掃描。 |
| **M2** — phase 1 探針如何交給 factory | **關閉** | HOW Kit phase 1：仍 `writeCuToTransactionBytes(CU_LIMIT_MAX, 0)`；factory message 取自該探針解編（含 lookup tables）；禁止另組 close 式 message。 |
| **M3** — popup 簽署複製鈕 id | **關閉** | INDEX 已定案列 `#btn-widget-copy`／`#btn-copy-pk`／`#appr-btn-copy-pk`；HOW 簽署複製同一套計時與文案。 |
| **M4** — factory 15s 逾時包法 | **關閉** | HOW 第 4 步：呼叫包進既有 `SIM_TIMEOUT_MS`／`SimDeadline`；逾時 fallback。 |
| **M5** — 「可用 CU 整數」判準 | **關閉** | HOW 第 5 步：有限、非負整數才當消耗；NaN／非有限／缺欄 fallback；不送進 `suggestedLimitFromPhase1`。 |
| **M6** — factory 回傳欄未寫死 | **關閉** | INDEX「Kit 估 CU」、Track 3、HOW 第 5 步、HANDOFF starter、reasoning：讀 factory 的 **`computeUnitLimit`**（與 0.21 `close-empty-service.ts` 同一欄）；通過 M5 判準後當從前的消耗。**不要**讀 `unitsConsumed`（0.11 `simulateTransaction` 欄；factory 無此欄）。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | HOW：`displayAccountName` 兩者皆空名稱列 `—`，頭像仍 `?`。INDEX：連公鑰都沒有才頭像 `?`。 |
| L2 | **關閉** | INDEX 上游改為接 0.21.0 契約＋其後 0.21.1 修補，並註 **無**獨立 `docs/roadmap/0.21.1/`。 |
| L3 | **關閉** | HOW 刷新冷卻：disabled 時弧仍須可見，禁止整顆 opacity 低到看不出弧。非阻擋已收斂。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 僅 Devnet 時 pill 外側右方橙黃 `Devnet`；Mainnet 無標；Home 不能切網路 | 可 | 無 |
| pill 不撐滿、不顯示 `前4…後4`；單列頭像｜名稱｜複製；無名稱前 4；頭像約 36px 前 2 字；寫入最多 15 | 可 | L1 已關 |
| 複製成功勾＋「已複製」1.6s；簽署頂欄同等；失敗無成功態 | 可 | M3 已關（三顆 id 已寫死） |
| 刷新 3s 內不可再按；切帳戶或離開 Tokens 可立刻再按 | 可 | L3 已關 |
| Activity Orb URL＋文案；`wallet/src` Activity 無 `solscan.io` | 可 | M1 已關 |
| 收回租金等待：無頂欄、dash-ring、「確認中」；結束三數頁非 1s 勾 | 可 | 現碼未實作，非設計缺口 |
| phase 1 Kit factory；公式仍 `max(ceil(消耗×1.1), 原 limit)` clamp；失敗 0.11 fallback | 可 | M2／M4／M5／**M6** 已關 |
| 無新 command、無新 storage key、無新 Wallet Standard 方法 | 可 | 無 |
| typecheck／build | 實作後測 | 本輪不跑 |
| 手驗未封裝擴充 | 實作後測 | 無 |
| 文件與程式無真實秘密 | 本輪抽樣未見 | 維持 |
| 版本號 0.22.0；shipped 須使用者同意；出貨後清 backlog | 出貨程序 | 無 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。與提案互斥、實作時應改掉：

- Home pill：`WalletWidget` 仍兩行名稱＋`shortAddr`，複製在 pill 外；`avatarLetter` 單字＋`toUpperCase`。
- 複製／刷新：`title`／`aria-label` 仍英文；無勾回饋、無 3s 冷卻。`.icon-btn` 無整顆 disabled opacity 規則；L3 已由 HOW 約束實作。
- Activity：`solscanUrl`／`solscanTxUrl`／`https://solscan.io/tx/` 仍在 `wallet/src/shared/home-activity.ts` 與 `HomeActivityList.tsx`（即 M1 掃描範圍）。
- 收回租金 sending：兩行字、頂欄仍在。`openPopout` 僅 dapp pending；`SEND_STATUS_AURORA_SVG` 在 `shell.ts`。
- phase 1：`simulatePhase1ForLimit` 仍 `simulateTransactionRpc`＋`unitsConsumed`。`writeCuToTransactionBytes` 已走 `decompileTransactionMessageFetchingLookupTables`。factory 先例在 `close-empty-service.ts` 取 **`computeUnitLimit`**（契約已對齊，實作須跟此欄、勿讀 `unitsConsumed`）。
- `handleRenameAccount` 只拒空 label，未拒 `> 15`。契約已寫 SW `INVALID_LABEL`。
- 未發現提案要求 storage hydrate pending／全 tab 廣播／硬編碼密碼／宣告未做的 Standard 方法。

backlog 構想已被 INDEX 推翻或寫死；不以 backlog 為契約。未把 `brainstorm/` 或 `../solibra-wallet` 當已定案。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | M | 關閉 | INDEX Track 1 驗收；出貨驗收 Activity 條 |
| M2 | M | 關閉 | HOW「Kit phase 1」步驟 1–3 |
| M3 | M | 關閉 | INDEX「地址複製回饋」；HOW「Home 頂欄 pill」 |
| M4 | M | 關閉 | HOW「Kit phase 1」步驟 4 |
| M5 | M | 關閉 | HOW「Kit phase 1」步驟 5 |
| M6 | M | 關閉 | INDEX「Kit 估 CU」、Track 3；HOW「Kit phase 1」步驟 5；HANDOFF starter |
| L1 | L | 關閉 | HOW「顯示名稱與頭像」 |
| L2 | L | 關閉 | INDEX 文首「上游版本」 |
| L3 | L | 關閉 | HOW「刷新冷卻」 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-08 | 無 HIGH；提案可行。五則 MEDIUM 應收斂進 INDEX／HOW。門檻通過。 |
| 第 2 輪複審 | 2026-10-08 | M1–M5、L1–L3 關閉。新開 M6（factory 欄 `computeUnitLimit`）。無 HIGH。門檻通過。 |
| 第 3 輪複審 | 2026-10-08 | M6 關閉。M1–M6、L1–L3 全關。無 HIGH、無應修仍開 MEDIUM。門檻通過。 |
