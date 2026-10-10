# 0.28.0 — HOW（Activity 分頁載入）

本檔是 **HOW**。產品句與已定案以 [INDEX](../INDEX.md) 為準。

## 命令

`handleGetHomeActivity` 仍讀 active、`getExposedPublicKey`、`readSettings()`。沒有 active：`{ rows: [] }`（第一頁畫面「尚無交易」）。

從 `req.payload` 讀 `before`：

- 不是物件、沒有 `before`、或 `typeof before !== "string"`：當沒有游標。
- 字串 trim 後為空：當沒有游標。
- 其餘：該字串當游標，原樣傳給查詢（不要再 decode）。

`getHomeActivity(owner, settings, before?: string)`。

## 兩條查詢（相對 0.18.0）

條件與 0.27.0 現碼相同：`settings.cluster === "mainnet"` 且 `resolveHeliusApiTarget` 非 null → enhanced；否則 Kit RPC `getSignaturesForAddress`。

| | 無 `before` | 有 `before` |
|--|-------------|-------------|
| Helius | 現有 query：`limit=20`、`token-accounts=balanceChanged`、`sort-order=desc`、`commitment=confirmed`、可選 `api-key` | 同上，加 `before=<signature>` |
| 簽名 | `{ limit: 20 }` | `{ limit: 20, before: signature }` |

Helius 失敗規則不變。`rowsFromEnhanced`／`rowFromSignature` 仍每頁最多 20。

## Popup

`HomeActivityList`：

第一頁與下一頁**共用**同一個遞增世代（effect cleanup 把世代作廢，等同現碼 `cancelled`）。世代失效後，該次回應不得改 `phase`、不得 `append`、不得改 `hasMore`、不得改底欄。重抓第一頁時必須先作廢進行中的下一頁（in-flight 結束也不得套用）。

1. 第一頁：`currentView === "home-activity"` 且依賴（active、cluster、rpc、`heliusConfigured`）變化時，遞增世代、`phase=loading`、清 `rows`、清底欄錯誤、`hasMore=false`，發 **沒有** `before` 的 `wallet.getHomeActivity`。只套用仍有效世代。空列且信封 `ok` 且無 `error` → `empty`；信封 `ok !== true`、result 有 `error`、或拋錯 → 整頁 `error`；有列 → `list`，`hasMore = rows.length === 20`。
2. 下一頁：僅 `phase === "list"` 且 `hasMore` 且沒有 in-flight 下一頁且沒有「sentinel 仍可見而未曾離開」的鎖定。sentinel 用 `IntersectionObserver`，`root`＝最近的 `.screen-body`（沒有則不觀察，禁止用 viewport 當根）。相交且通過門檻：in-flight＝true，底欄＝loading widget，發 `{ before: rows[rows.length-1].signature }`（該 `signature` 取觸發當下畫面最舊列）。
3. 下一頁成功（仍有效世代、信封 `ok`、無 `error`）：附加去重後的列；`hasMore = 本頁 result.rows.length === 20`（`rows` 缺失當 0）；若長度 20 但去重後 0 筆，`hasMore=false`；拿掉 widget。
4. 下一頁失敗（仍有效世代，且信封 `ok !== true`、或 result 有 `error`、或請求拋錯）：`phase` 保持 `list`、列不變、`hasMore` 仍 true，底欄＝`error.activityOlderLoad`。設「須先離開底部」：observer 在 sentinel `isIntersecting === false` 之後才允許下一次觸發。
5. 進行中：sentinel 持續相交也不得再發。

Loading widget：列表 `<ul>` 之後、sentinel **旁邊**的底欄 `div`（CSS 轉圈即可，約一列高度），`aria-busy="true"`，`aria-label={t("activity.loadingOlder")}`。不要可見文字節點。錯誤短句也在這個底欄槽，**不是** observer 目標。

sentinel 為穩定空節點：放在列表與底欄槽之後，`phase === "list"` 期間一直存在、不要卸載。`IntersectionObserver` **只**觀察這個節點。widget／短句卸載或輪替不得拆掉 sentinel。

## Token icon

`rowFromEnhanced` 寫 `mints`（最多 2、去重保序）。native 腿 mint＝wrapped SOL。`rowFromSignature` 的 `mints`／`icons` 為 `[]`。

`getHomeActivity` 在 enhanced 列回給 UI 前：對本頁所有 mint `peekCachedMintDisplay`；缺 icon 或 symbol、且 `cluster === "mainnet"` 才 `lookupJupiterMintMetadata`。https icon 寫進 `icons`。非空 symbol 經 `activityDetailWithSymbols` 把明細裡該 mint 縮寫換成代號。Jupiter 拋錯當沒圖／沒代號，**不要**讓整頁變 `unavailable`。

popup 列左側畫 `icons`；`onError` 卸圖。零顆則不留空圓。

## 時間列

`activityWhen(timestampSec)`：用 `new Date(sec * 1000)` 的 **local** `getFullYear`／`getMonth`／`getDate`／`getHours`／`getMinutes`／`getSeconds`，補成 `YYYY-MM-DD HH:MM:SS`。不依 UI locale 改格式，不走 catalog。`HomeActivityList` 有 timestamp 才畫 `.activity-when`。

## 樣式

不要讓 `#screen-home-activity` 自己再開一個與 `.screen-body` 打架的捲軸。Sentinel 必須是 `.screen-body` 的子孫且在列的下面，使用者捲列表時才能相交。
