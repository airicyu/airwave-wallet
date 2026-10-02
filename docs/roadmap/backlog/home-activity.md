# Home Activity 分頁 — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

## 現況

0.3.0 已有 Home 底欄 **Token／Activity**。Activity（`home-activity`）只顯示 empty state：「尚無交易歷史」。契約明文禁止把 [`wallet-030-ui-concepts.html`](../../design-demos/wallet-030-ui-concepts.html) 的假交易寫進產品。0.4.0–0.7.0 都沒做鏈上歷史。

殼的行為維持 [popup-shell HOW](../0.3.0/docs/popup-shell-how.md)：底欄只在 `home-token`／`home-activity`；從 Settings／Accounts 返回一律回 Token，不記住 Activity。

## 產品意向

把這個分頁做成 **active 帳戶的鏈上活動列表**（查詢，不簽名）。

一列對齊概念稿，在約 384px 內單行可掃：

- 種類（例如送出、收到、App／互換；分不出來就用較粗的「交易」）
- 時間（相對或短日期，放列右）
- 一行明細（金額與符號，或對手／站點）；放不下 `ellipsis`

沒有紀錄才用 empty。查詢中要有 loading。失敗顯示短錯誤，列表不清成假資料。切換 active 帳戶或 cluster 後，列表跟該地址與該網。

資料由 **service worker** 打 RPC 或既有 Helius 設定去查，popup 只渲染。不把歷史寫進 `chrome.storage` 當真相（可有短 TTL 記憶體快取，關瀏覽器可丟）。不需解鎖金庫才能讀鏈上紀錄，但畫面仍走現有「鎖定只見解鎖頁」；本構想不改鎖定殼。

唯讀帳戶一樣可列活動。簽名密鑰不參與這條查詢。

## 開工前仍須拍板（排進 INDEX 時）

- 資料來源：`getSignaturesForAddress`（再決定要不要逐筆 `getTransaction`），或 Helius 交易解析 API。沒有 Helius key、或 devnet，落哪一條。
- 一頁幾筆、要不要「載入更多」。
- 種類分到多細（只分成功／失敗，或送出／收到／互換）。
- Combined：只查主地址，或合併 `owners[]`（合併時怎麼標是哪個成員）。
- 點一列要不要開 explorer；開的話用哪個網址、是否離開擴充。

## 非目標（構想層）

- 把概念稿那三筆假交易寫進產品
- NFT 畫廊、完整交易解碼器、Agent 解讀
- popup 直連 RPC
- 改底欄殼、或讓返回時記住 Activity 分頁（除非該版 INDEX 明文改 shell）
