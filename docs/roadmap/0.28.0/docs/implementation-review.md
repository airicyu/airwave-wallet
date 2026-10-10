# Implementation review — 0.28.0 Airwave Wallet

- 日期：2026-10-10（Asia/Hong_Kong）
- 輪次：**複審（第 2 輪）**
- 角色：實作審查（不改程式、不加功能、不 commit）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；HOW／HANDOFF；架構禁區 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- 抽樣：`get-home-activity-command.ts`、`home-activity-service.ts`、`home-activity.ts`、`HomeActivityList.tsx`、`style.css`、`ui-messages.ts`、`gen-ui-messages.mjs`、`PopupMarkup.tsx`、`content/index.ts` `PAGE_COMMANDS`、`wallet/package.json`
- **總評：** 有未關閉 HIGH（H1）。相對初審已關 M1；`npm run typecheck` 通過。INDEX 手驗與未封裝擴充本輪仍無證據，不可出貨。

## Findings（本輪）

### HIGH

#### H1 — INDEX 手驗與未封裝擴充無證據 — **仍開**

INDEX 驗收要求：before 手驗（payload／Helius query 或 Kit 選項）、滿 20 捲到底接頁、下一頁失敗留列＋底欄短句與重試、切帳戶或 cluster 重抓、第一頁失敗整頁錯誤、**未封裝擴充走完 Activity**。本輪仍僅靜態閱讀與 typecheck；工作樹無手驗紀錄、無擴充日誌摘錄、無瀏覽器走查。GUIDELINES：靜態截圖不算通過。違反出貨門檻。

建議：用未封裝擴充（popup 或側欄）逐條走 INDEX 手驗，把通過／失敗寫回本檔驗收表；禁止把真實地址、API key、助記詞寫進報告。

### MEDIUM

#### M1 — 底欄輪替會重建 IntersectionObserver — **已關**

初審：observer effect 依賴 `moreBar`、`rows.length`，底欄輪替會 disconnect 再 `observe`，失敗插入短句時新 observer 可能立刻 `isIntersecting === false` 清掉 `needLeaveRef`。

複審碼：`HomeActivityList` observer 僅 `[phase, loadOlder]`；sentinel 在 `phase === "list"` 常駐於列表與底欄之後。`needLeaveRef` 只在既有 observer 回報 `isIntersecting === false` 時解除。符合 HOW「observer 只觀察 sentinel、widget／短句卸載不得拆掉 sentinel」。

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **仍開**／非阻擋 | HOW 底欄 widget「約一列高度」。`.activity-more-spin` 仍為 16px 圓；`margin` 現為 `16px auto`（初審為 10px），總高仍矮於 `.activity-row`。 |
| L2 | **仍開**／非阻擋 | HOW：非空 `before`「原樣傳給查詢」。`payloadBefore` 仍傳 `trim()` 後字串。UI 游標來自列上 `signature`，實務無空格；與 INDEX「trim 後空當無游標」相容。 |
| L3 | **仍開**／非阻擋 | 第一頁 effect 依 `activeId`、`cluster`、`rpcUrl`、`heliusConfigured` 重抓；離開 Activity 由 `PopupMarkup` 卸載列表。INDEX 手驗句仍只寫「切帳戶或 cluster」。 |

## 驗收對照

| INDEX 驗收句 | 通過／失敗 | 證據 |
|--------------|------------|------|
| `cd wallet && npm run typecheck` | **通過** | 複審 2026-10-10，cwd `wallet`，exit 0 |
| **before 手驗：** payload.`before`＝畫面上最舊列 `signature`；Helius 或 Kit 含同一值 | **失敗** | 靜態：`loadOlder` 以 `rows[length-1].signature` 發請求；`fetchEnhanced`／`getSignaturesForAddress` 有 `before`。運行時攔截／SW 日誌：**無** |
| 進入 Activity：先最多 20；不足 20 或 0 筆捲到底不再發下一頁 | **失敗**（碼看似符合，手驗無） | `ACTIVITY_LIMIT`／`homeActivityLimit()`＝20；`hasMore = rows.length === 20`。手驗無 |
| 滿 20 且有更舊：捲 `.screen-body` 到底出現底欄 widget，列接上，可再載 | **失敗**（碼看似符合，手驗無） | sentinel＋`closest(".screen-body")`；成功 append 去重；成功後 microtask 若仍相交可再載。手驗無 |
| 下一頁失敗：列仍在，底欄 `error.activityOlderLoad`；停底不連打；捲離再到底再試 | **失敗**（碼看似符合） | `!res.ok`／`result.error`／`catch`：`phase` 不變、`needLeaveRef`。手驗無 |
| 切帳戶或 cluster：列表從頭、整頁載入中 | **失敗**（碼看似符合，手驗無） | effect 清列、`phase=loading`、無 `before`。手驗無 |
| 第一頁失敗仍整頁 `error.activityLoad`；mainnet Helius 失敗不出現簽名粗列 | **失敗**（碼看似符合，手驗無） | 第一頁 `error`→整頁該鍵；`getHomeActivity` catch 回 `unavailable`、不改走簽名列。手驗無 |
| 未封裝擴充走完 Activity（popup 或側欄） | **失敗** | 無手驗。側欄與 popup 同殼，靜態可共用，**不能**代替走查 |
| 無真實助記詞、私鑰、密碼、個人地址寫入本版文件 | **通過** | 抽樣本版 INDEX／HOW／HANDOFF／本報告：無 |

## 測試結果

- **無整包測試指令**（GUIDELINES 測試表；本版 INDEX 未引入 runner）。禁止假設 `bun test`。
- 已跑：`cd wallet && npm run typecheck`（實際 cwd：`wallet`）→ **通過**（exit 0）。`wallet/package.json` `version` 仍為 `0.27.0`（INDEX：出貨時才對齊，不列缺陷）。
- 手驗：未執行、無日誌證據。
- 架構禁區抽樣：活動查詢不寫 `chrome.storage`；未新宣告 Wallet Standard；`PAGE_COMMANDS` 不含 `wallet.getHomeActivity`；未改 `../solibra-wallet`。
- 工作樹另有非本版檔（例如 `test-web/sign-risk*`、其他 backlog）；不納入 0.28.0 通過條件。

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置 |
|----|----|------|----------|
| H1 | H | 仍開 | 未封裝手驗寫回本檔驗收表 |
| M1 | M | **已關** | observer 僅依 `phase`／`loadOlder`，不隨底欄重建 |
| L1 | L | 仍開 | widget 高度 |
| L2 | L | 仍開 | `before` trim 與否 |
| L3 | L | 仍開 | 手驗句寬度（契約／報告即可） |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-10 | 有未關閉 HIGH（H1 手驗無證據）。typecheck 通過。不可出貨。 |
| 複審 | 2026-10-10 | 關 M1。H1 仍開。typecheck 通過。不可出貨。 |
