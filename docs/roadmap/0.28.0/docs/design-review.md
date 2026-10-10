# Design review — 0.28.0 Airwave Wallet

- 日期：2026-10-10（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 上游（行為，非本版契約）：[`../../0.18.0/INDEX.md`](../../0.18.0/INDEX.md)、[`../../0.18.0/docs/home-activity-how.md`](../../0.18.0/docs/home-activity-how.md)；構想：[`../../backlog/activity-infinite-scroll.md`](../../backlog/activity-infinite-scroll.md)
- 現行程式抽樣：`wallet/src/shared/home-activity.ts`、`wallet/src/background/home-activity/home-activity-service.ts`、`wallet/src/background/home-activity/get-home-activity-command.ts`、`wallet/src/popup/components/HomeActivityList.tsx`、`wallet/src/popup/PopupMarkup.tsx`、`wallet/src/popup/style.css`（`.screen-body`）、`wallet/src/shared/commands.ts`、`wallet/src/content/index.ts`、`wallet/src/shared/ui-messages.ts`
- **總評：** 無未關閉 HIGH。初審 M1–M3／L1–L3 均已寫進 INDEX／HOW／HANDOFF，本輪關閉。提案可行；設計審查門檻**通過**。餘 M4 為 HOW 節點分工建議，預設應修、不擋開工。本版不碰 pending／custody／Wallet Standard／inject 白名單；歷史仍不進 `chrome.storage`。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。  
初審未把任何 ID 標成關閉；本輪依**現**契約核對後關閉，並新增 M4、L4。舊號不重編。

### HIGH

（無）

### MEDIUM

#### M1 — HOW 未把下一頁請求納入「有效世代」— **關閉**

已寫入 HOW Popup 開篇：第一頁與下一頁共用遞增世代；失效後不得改 `phase`／append／`hasMore`／底欄；重抓第一頁須先作廢進行中的下一頁。INDEX「重抓第一頁」列與 HANDOFF starter 同步。

#### M2 — 下一頁失敗集合未對齊信封 `ok`— **關閉**

INDEX「下一頁失敗」列與查詢列已寫：失敗＝擴充信封 `ok !== true`，或 result 有 `error`，或拋錯；`phase` 保持 `list`；信封 `ok` 不是 result 欄位。HOW 第 4 步與 HANDOFF starter 同句。

#### M3 — Track 1「請求含 before」無可客觀手驗步驟— **關閉**

INDEX 驗收已有「before 手驗」條；Track 1 驗收指向該句。禁止把真實地址或 API key 寫進文件。

#### M4 — HOW 未把 sentinel 與底欄 widget／短句分成穩定節點 — **仍開**

INDEX 捲動觸發：列表最底放 sentinel，進入 `.screen-body` 可見區底部才發下一頁。下一頁畫面／失敗：同一底欄位置輪替 loading widget 與 `error.activityOlderLoad`。HOW 寫 widget 在 `<ul>` 之後，sentinel 是 `.screen-body` 子孫且在列下面，**沒有**寫死 observer 目標是否可與 widget／短句共用一個 DOM 節點。

實作若把 `IntersectionObserver` 掛在會被卸載的 widget 上，失敗換成短句或成功拿掉 widget 時目標消失，可能漏接「先 `isIntersecting === false` 再重試」，或在節點重建後誤觸。與驗收「停在底部不連打；捲離再到底會再試」相關，屬文件漏網，不是架構禁區。

**建議寫進 HOW Popup 一旬：** sentinel 為穩定空節點（列表與底欄之後一直存在，不要卸載）；loading widget 與錯誤短句是 sentinel **旁邊**的底欄，不是 observer 目標。Observer 只觀察該穩定節點。

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **關閉** | HANDOFF starter 已列切帳戶／cluster／rpc／`heliusConfigured`、離開 Activity 再進入，並作廢進行中下一頁。 |
| L2 | **關閉** | INDEX 錨點已列 `wallet/scripts/gen-ui-messages.mjs`。 |
| L3 | **關閉** | 隨 M2：INDEX 不再用易與 result 混淆的「`ok: false`」當失敗定義。 |
| L4 | **仍開**／非阻擋 | 驗收勾選仍寫「切帳戶或 cluster」；已定案與 HANDOFF 還有 `rpcUrl`、`heliusConfigured`、離開 Activity。實作跟已定案即可；若要手驗與已定案同寬，可把驗收那句補全。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| `cd wallet && npm run typecheck` | 是 | 無 |
| **before 手驗：** payload.`before`＝觸發當下最舊列 `signature`；Helius query 或 Kit 選項含同一值 | 是 | 初審 M3 已關 |
| 進入 Activity：仍先最多 20 筆；不足 20 或 0 筆時捲到底不再發下一頁 | 是 | 無 |
| 滿 20 且還有更舊：捲 `.screen-body` 到底出現底欄 widget，列接上，widget 消失；可再載 | 是 | M4：sentinel 與 widget 節點分工未寫死 |
| 下一頁失敗：列仍在，底欄 `error.activityOlderLoad`；停底不連打；捲離再到底再試 | 是 | M2 已關；重試觀測穩定性見 M4 |
| 切帳戶或 cluster：列表從頭、整頁載入中 | 是 | L4：手驗句窄於已定案 |
| 第一頁失敗仍整頁 `error.activityLoad`；mainnet Helius 失敗不出現簽名粗列 | 是 | 無 |
| 未封裝擴充走完 Activity（popup 或側欄） | 是 | 現碼 `HomeActivityList` 只掛 `PopupMarkup`；側欄若共用同一殼則一處即可 |
| 無真實助記詞、私鑰、密碼、個人地址寫入本版文件 | 是 | 抽樣 INDEX／HOW／reasoning／HANDOFF／backlog：無 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。下列僅標與提案的關係。

| 錨點 | 現況 | 與 0.28.0 提案 |
|------|------|----------------|
| `get-home-activity-command.ts` | 不讀 payload；`getHomeActivity(owner, settings)` | 須加可選 `before`；**未做，非互斥** |
| `home-activity-service.ts` | Helius URL 無 `before`；`getSignaturesForAddress` 僅 `{ limit }`；失敗 `unavailable`、不退回簽名粗列 | 與「失敗退回不變」**同向** |
| `home-activity.ts` | `ACTIVITY_LIMIT = 20` | 與每頁 20、`hasMore` 看 SW `rows.length` **同向** |
| `HomeActivityList.tsx` | 無游標、無 sentinel；`!res.ok`／`error` → 整頁錯誤；effect `cancelled` 只護第一頁 | 須擴成共用世代（M1 契約已寫）；下一頁不得走整頁錯誤 |
| `PopupMarkup.tsx` | `currentView === "home-activity"` 才掛列表；捲動根 `.screen-body` | 離開 Activity＝卸載元件，與「離開再進入重抓」**同向** |
| `style.css` `.screen-body` | `overflow-y: auto`；`min-height: 0` | 與捲動根契約**同向** |
| `commands.ts` | 已有 `wallet.getHomeActivity`；`payload?: unknown` | 不必新命令 |
| `content/index.ts` `PAGE_COMMANDS` | 不含 `wallet.getHomeActivity` | 與非目標**不互斥** |
| `ui-messages.ts` | 尚無 `error.activityOlderLoad`、`activity.loadingOlder` | **未做，非互斥** |

未把 `docs/brainstorm/` 或 `../solibra-wallet` 當現行程式。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | **關閉** | HOW Popup 開篇世代；INDEX 重抓第一頁；HANDOFF starter |
| M2 | MEDIUM | **關閉** | INDEX 下一頁失敗＋查詢列；HOW 第 4 步；HANDOFF starter |
| M3 | MEDIUM | **關閉** | INDEX 驗收「before 手驗」；Track 1 指向該句 |
| M4 | MEDIUM | **仍開** | （待規劃：HOW Popup 穩定 sentinel 與底欄分工） |
| L1 | LOW | **關閉** | HANDOFF starter |
| L2 | LOW | **關閉** | INDEX 錨點 `gen-ui-messages.mjs` |
| L3 | LOW | **關閉** | INDEX 查詢／下一頁失敗（隨 M2） |
| L4 | LOW | **仍開**／非阻擋 | （可選：INDEX 驗收「切帳戶或 cluster」補 rpc／helius／離開 Activity） |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-10 | 可行；無 HIGH；M1–M3 仍開，預設應修文件後再實作 |
| 第 2 輪複審 | 2026-10-10 | 初審項均已落檔並關閉；無 HIGH；新增 M4（HOW sentinel 節點）預設應修、不擋門檻；可行；門檻通過 |
