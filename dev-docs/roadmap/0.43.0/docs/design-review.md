# Design review — 0.43.0 Airwave Wallet

- 日期：2026-10-15（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（初審同日，見歷審摘要）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[address-cards-how.md](./address-cards-how.md)、[reasoning.md](./reasoning.md)。`HANDOFF.md` 仍不存在
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`PopupMarkup.tsx`（`MenuItems`）、`AccountKindMark.tsx`、`TokenSendForm.tsx`、`send-logic.ts`（`wallet.beginSend`）、`storage-keys.ts`、`accounts.ts`（`isAddress`）、`ui-messages.ts`（`common.delete`／`common.copy`／`common.confirm`）、`runtime.ts`（`BACK_PARENT`）。本版名單與命令尚未實作
- **總評：** 無未關閉 HIGH。M1、M2、M3 已寫進 INDEX 與 HOW，本輪關閉。仍開的 MEDIUM 沒有。設計審查門檻**通過**。提案可行。待拍板為空。缺 HANDOFF 仍只是 L1，不升 HIGH

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

（無）

### MEDIUM

| ID | 本輪 | 依據 |
|----|------|------|
| M1 | **關閉** | HOW「畫面」已給 `addressCards.*` 鍵與 zh-Hant／zh-Hans／en。INDEX 送出挑選寫明可見字串走 `ui-messages`，鍵見 HOW。`menu.addressCards` 三語仍為 `Address cards` |
| M2 | **關閉** | HOW「失敗怎麼出現」已寫：無效或重複不寫入、殼底「加入」停住、欄下短句；改名空名稱不送 command、回復原名；`NOT_FOUND` 時名單不改並顯示短句。INDEX 新增列已寫底欄停住、欄下短句、不寫入 |
| M3 | **關閉** | INDEX 與 HOW 送出節都寫：`wallet.beginSend` 的 recipient 是該列完整地址；名稱＋縮寫只顯示；清除後 recipient 為空字串，回到手貼。HOW 並寫不得拿顯示字串當 recipient、手貼不查名單 |

### LOW

| ID | 本輪 | 依據 |
|----|------|------|
| L1 | 備註 | `HANDOFF.md` 仍不存在。workflow 開實作 agent 前要有 paste-ready prompt。不擋本輪設計門檻，不升 HIGH |
| L2 | **關閉** | HOW「Commands」已寫 `id` 用 `crypto.randomUUID()`，與 INDEX「由 service worker 產生，不是公鑰」一致 |
| L3 | 記錄即可 | 概念稿錢包列仍帶「可簽」。INDEX 已寫圖示不帶種類字，衝突時以 INDEX 為準 |
| L4 | 記錄即可 | 新增頁返回管理頁、挑選頁返回送出頁，語意已在 HOW。現碼 `BACK_PARENT` 缺項會回 `home-token`，實作要掛上 |
| L5 | 記錄即可 | HOW「列表頁標題同這句」的「這句」沒有先行詞。選單鍵與 `addressCards.open` 都是 `Address cards`，管理頁沿用這句即可，不必另發明標題 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 漢堡選單「錢包帳戶」下一項是 Address cards；Settings 沒有這項 | 可測 | 無。插入點與 `menu.addressCards` 已寫死 |
| 可新增、就地改名、複製完整地址、確認後刪除；空名稱與無效或重複地址不能存 | 可測 | 無。M1、M2 已關閉 |
| 重開擴充後名單仍在；`schemaGeneration` 仍為 1；既有帳戶與金庫鍵未被本版改寫 | 可測 | 無 |
| 送出挑選是全螢幕兩頁：錢包（含可簽、唯讀、聚合的目前錢包，圖示不帶種類字）與 Address cards | 可測 | 無。M3 已關閉；L3 勿照概念稿加種類字 |
| 手貼其他有效地址仍可送出 | 可測 | 無 |
| `cd wallet && npm run typecheck` 通過 | 實作期 | 設計不擋 |
| 手驗：未封裝擴充裡新增、改名、複製、刪除；兩分頁各選一次，並手貼一條名單外地址 | 實作期可走 | 無設計缺口。L1：實作 session 仍待 HANDOFF |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。本輪重抽與第 1 輪結論相同，沒有與提案互斥的現行主路徑。

| 錨點 | 與提案 |
|------|--------|
| `MenuItems` | 現為錢包帳戶、設定、已連網站、關於、鎖定。本版插在錢包帳戶與設定之間 |
| `AccountKindMark` | 鑰匙／眼睛／層疊已在。挑選列用帳戶名稱當 label，種類字不進列文 |
| `TokenSendForm`／`send-logic.ts` | `recipient` 是本地字串，`wallet.beginSend` 送該字串。尚無簿圖示。沿用此欄即可接 M3 |
| `storage-keys.ts` | 尚無 `airwave.addressBook.v1`。`CURRENT_SCHEMA_GENERATION === 1`。加一鍵、不改既有形狀，與現碼不互斥 |
| `accounts.ts` | `isAddress` 來自 `@solana/kit`。聚合的目前錢包是 `mainPubkey` |
| `ui-messages.ts` | 已有 `common.delete`、`common.copy`、`common.confirm`，HOW 要求沿用 |
| 命令／pending | 名單不進 pending；寫入只經 SW command；popup 不 `set` 此鍵，靠 `onChanged`。符合禁區。未宣告新的 Wallet Standard 方法 |

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | 關閉 | HOW「畫面」catalog；INDEX「送出挑選」 |
| M2 | MEDIUM | 關閉 | HOW「失敗怎麼出現」；INDEX「新增」 |
| M3 | MEDIUM | 關閉 | INDEX「送出挑選」；HOW「送出」 |
| L1 | LOW | 備註 | 開工前另寫 `HANDOFF.md`（本審查不代寫） |
| L2 | LOW | 關閉 | HOW「Commands」`crypto.randomUUID()` |
| L3 | LOW | 記錄即可 | INDEX 已覆蓋概念稿 |
| L4 | LOW | 記錄即可 | 實作掛 `BACK_PARENT` |
| L5 | LOW | 記錄即可 | HOW「畫面」「列表頁標題同這句」 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-15 | 無 HIGH。門檻通過。M1–M3 預設應寫進 HOW。缺 HANDOFF 只記 L1 |
| 第 2 輪 | 2026-10-15 | 對照現 INDEX／HOW：M1、M2、M3、L2 關閉。無未關閉 HIGH，無仍開 MEDIUM。門檻通過。L1 仍為備註 |
