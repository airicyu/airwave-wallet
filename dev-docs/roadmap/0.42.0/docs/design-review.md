# Design review — 0.42.0 Airwave Wallet

- 日期：2026-10-14（Asia/Hong_Kong）
- 輪次：**第 1 輪初審**
- 角色：設計審查（不改 INDEX／HOW／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；上游 [0.12.0](../0.12.0/INDEX.md) 送出契約
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 領域用語：[`../../../DOMAIN.md`](../../../DOMAIN.md)（目前錢包、`mainPubkey`）
- 現行程式抽樣：`wallet/src/popup/components/HomeTokenList.tsx`（`TokenDetailView`／`canSend`）、`wallet/src/background/wallet/commands/send-command.ts`、`wallet/src/background/session/sign-gates.ts`、`wallet/src/shared/accounts.ts`（`resolvePubkey`、`getExposedPublicKey`）；概念稿 [`send-token-combined-ux.html`](../../../design-demos/send-token-combined-ux.html)（DRAFT，非正式）
- **總評（第 1 輪）：** 產品定案與 0.12.0 復用邊界清楚，無架構禁區衝突，**提案可行**；但 INDEX  alone 對 SW／`signAccountId`／詳情餘額欄位與 0.12.0 HOW 的聚合覆寫仍不足，且缺 HOW／HANDOFF 與完整 Track，**設計閘門尚未通過**（須關閉下列 MEDIUM 後再開實作）。

---

- 日期：2026-10-14（第 2 輪複審）
- 對照基準：收斂後 [INDEX](../INDEX.md)、[send-combined-how.md](./send-combined-how.md)、[HANDOFF.md](../HANDOFF.md)
- **總評：** M1–M6 已寫入 INDEX／HOW／HANDOFF；無未關 HIGH；**設計閘門通過**，可實作。

## Findings（第 1 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉或實作 agent 易誤解；非阻擋＝記錄即可。

### HIGH

（無。已定案未推翻 pending／storage／custody 禁區；主路徑語意在 INDEX 表格內可讀，缺口主要在文件厚度與軌道覆蓋，見 MEDIUM。）

### MEDIUM

| ID | 狀態 | 依據 |
|----|------|------|
| M1 | **已關** | INDEX 餘額句＋HOW；實作 `wallet-send-eligibility.ts` |
| M2 | **已關** | INDEX Track 2＋HOW；實作 `send-command.ts` |
| M3 | **已關** | INDEX 簽名句＋HOW；實作 `signAccountId` |
| M4 | **已關** | `HANDOFF.md` |
| M5 | **已關** | `send-combined-how.md` |
| M6 | **已關** | INDEX Track 1 驗收改 0.12.0 |
| M7 | **已關** | INDEX 錨點表 |

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **仍開** | 概念稿 `send-token-combined-ux.html` 與 backlog 一致，INDEX 未掛文件地圖；衝突以 INDEX 為準即可。 |
| L2 | **仍開** | Popup `canSend` 今日僅 `accountKind(active) === "signing"`。聚合可簽條件應與 INDEX「誰可送」同構（`combined`＋`mainPubkey` 可解析為 signing＋`wallet.unlocked`）；實作時宜抽共用判斷或與 SW 對齊，INDEX 可不寫到函式名。 |
| L3 | **仍開** | `HomeTokenMemberShare` 仍帶 `uiAmount: number`（展示管線既有）；送出數字轉換須繼續走 0.12.0 字串→`BigInt` 路徑，勿用 `uiAmount` 做可送上限演算。INDEX 可一句提醒。 |

## 驗收對照

| 驗收句（INDEX） | 設計層是否可測 | 缺口 |
|-----------------|----------------|------|
| 聚合、目前錢包可簽：詳情有「送出」，流程同單一 | 可；已定案＋0.12.0 | M1／M2／L2：入口與詳情餘額欄位未寫死 |
| 可送出上限＝目前這一條餘額 | 可 | M1：`send-logic` 與 SW 單 owner 列需對齊 |
| 其他成員不能同一筆送出 | 可；非目標歸集 | 無 |
| 目前錢包不可簽：無「送出」 | 可 | L2：popup 判斷規則未寫進契約檔 |
| 送出進行中切換目前錢包：仍簽凍結簽名列 | 可；已定案「簽名」 | M3：`signAccountId` 填入規則需寫入 HOW／INDEX 錨點 |
| `cd wallet && npm run typecheck` | 可 | 無 |
| 手驗：可簽聚合送出與超額拒絕 | 可 | M2／M5：SW 軌道與 HOW 手驗句可複製 0.12.0 並加聚合前置 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列為**若只改局部會與已定案互斥**（實作須依 INDEX 分叉）：

| 錨點 | 現況 | 與 0.42.0 已定案 |
|------|------|------------------|
| `TokenDetailView` `canSend` | 僅 `accountKind === "signing"` | 聚合可簽時應顯示「送出」 |
| 詳情數量 | `row.uiAmountLabel`（合併加總） | 應為目前錢包成員那一筆（M1） |
| `send-logic` | `tokenBalanceRaw(row)` 用合併列字串 | 聚合應用目前錢包成員餘額（M1） |
| `handleBeginSend` | 拒絕非 `signing` 作用中帳戶；`signAccountId: active.id` | 放行 combined＋可簽 main；`signAccountId` 為簽名列 id（M2／M3） |
| `getExposedPublicKey` | combined → `mainPubkey` | 與 SW 單 owner 查詢一致；**不可**在 pending 期用 combined id 當 `signAccountId` 卻依 `mainPubkey` 解析簽名（M3） |
| `sign-gates` / `resolvePubkey` | dApp 簽名閘門已用 pubkey 解析 | 錢包送出應重用同一解析模型，非新 pending／storage 路徑 |

架構禁區 1–7：本版不新增 pending kind、不把 pending 寫入 storage、不廣播、不硬編碼密碼、不宣告新 Wallet Standard 方法。`walletSend` 仍只活在 SW `Map`（與 0.12.0 一致）。

## 修復追蹤表

| ID | 級 | 狀態 | 建議關閉位置 |
|----|----|------|----------------|
| M1 | MEDIUM | 仍開 | INDEX「餘額」或 `docs/*-how.md`：詳情／`send-logic` 欄位來源 |
| M2 | MEDIUM | 仍開 | INDEX 增 Track 2（SW `beginSend`）或 HOW SW 小節 |
| M3 | MEDIUM | 仍開 | INDEX「簽名」或 HOW：`signAccountId` 聚合填入規則 |
| M4 | MEDIUM | 仍開 | `HANDOFF.md` |
| M5 | MEDIUM | 仍開 | `docs/*-how.md`（短） |
| M6 | MEDIUM | 仍開 | INDEX Track 1 驗收筆誤 |
| M7 | MEDIUM | 非阻擋 | INDEX 錨點表 |
| L1–L3 | LOW | 仍開 | 可選補句 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 第 1 輪 | 2026-10-14 | 無 HIGH；M1–M6 仍開（M7 非阻擋）；可行但未過設計閘門 |
