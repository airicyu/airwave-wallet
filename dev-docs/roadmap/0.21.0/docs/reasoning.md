# WHY — 0.21.0

## 為何不塞進 `walletSend` 審批殼

`walletSend` 是單筆轉帳、一個 `requestId`、popout 模擬差額主舞台。清空可能是多筆交易、多個簽名帳戶、無 dApp origin，且不需要「預期變動」模擬。塞進同一 pending kind 會分叉 0.11／0.12 契約。本版在 popup 內走完，SW 只做查詢、組 tx、簽名、送出。

## 為何仍要掃鏈上空帳戶

持倉管線為了版面乾淨濾掉 amount 0（0.7.0）。空帳戶仍佔 rent，使用者看不到就無法關。掃描與持倉查詢可共用 RPC 模式，但結果集不同。

## Token-2022 有 extension 就不列

extension 帳戶的 Close 規則與租金回收更複雜；本版寧願不列，也不要假裝能關。無 extension 的 Token-2022 與 legacy 同樣用 CloseAccount。

## CU：Kit 估 limit、我們定 price

關閉筆數變動時，手寫「底＋每戶常數」要反覆量測且易與 p-token 等升級脫節。Kit 對**已組好的 message** 估 resource limit 合理。優先費單價仍用 Settings Default CU price，與簽署審批一致。確認頁先 `plan` 把 limit／price 寫進 message 並算費；送出時 `estimateResourceLimits: false`，避免畫面與鏈上不一致。

## 並發交給 executor 預設

產品只要求「一筆失敗不取消其餘」與 parallel 送出，不要求自訂 5。Kit plugin 預設 `maxConcurrency`（撰寫時 10）足夠；少寫一層池子。

## `planId` 在 SW 記憶體

不用 pending／storage：這不是 dApp 請求，沒有 tab 要回傳。`planId` 短生命週期綁定未簽 bytes 與費用快照，commit 前 stale 檢查即可。

## 聚合按成員拆交易

rent 必須回到各成員 owner，不能為了少筆數做歸集。數字是成員加總，簽名也是各用各的 signer。
