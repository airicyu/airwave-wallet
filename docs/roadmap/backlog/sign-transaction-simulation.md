# 簽署交易頁的 simulation 結果 — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

依賴頁面骨架：[sign-transaction-page-uiux.md](./sign-transaction-page-uiux.md)。該頁未做時，本項仍是「結果長什麼樣」，排程時可與該頁同一版或跟在後面。

## 現況

0.1.0 起明文不做交易 simulation。簽署交易頁沒有「這筆若送出會怎樣」。批准只表示同意簽名，不表示鏈上會成功。

## 產品意向

在簽署交易頁、使用者按下批准之前，顯示這筆**未簽**交易的 simulation 結果。查詢由 **service worker** 打目前 cluster 的 RPC（`simulateTransaction` 一類），popout 只渲染。不寫進 `chrome.storage`。不送出交易、不代簽。

結果要讓人分得清三種狀態：

- **進行中：** 摘要先出來，simulation 區顯示查詢中；此期間批准是否可按，排進 INDEX 時定。
- **成功：** 短結論（會成功），加上餘額變化（查得到的 native／代幣增減）與錯誤為空。日誌預設收合。
- **失敗或查不到：** 短結論與鏈上／RPC 錯誤原文的一行摘要。失敗**不是**空白，也**不是**假裝成功。

Simulation 失敗不自動拒絕請求。使用者仍可依該版契約選擇拒絕，或在看過失敗後仍批准簽名（簽名成功不代表鏈上成功，頁上要能看出這個差別）。

RPC 不可用、交易缺 blockhash、或帳戶在別的 cluster 時，結果區顯示做不到 simulation 的原因，頁面其餘審批資訊仍在。

## 開工前仍須拍板（排進 INDEX 時）

- 未簽交易的 simulation 參數：`sigVerify`、`replaceRecentBlockhash`、要不要帶 `accounts` 來算餘額差。
- 失敗時能否仍按批准。
- 餘額差涵蓋 SOL only，或含 SPL；代幣符號從哪裡來。
- 日誌顯示幾行、要不要連結 explorer（本構想預設不離開擴充）。

## 非目標（構想層）

- 錢包代為 `sendTransaction`／`signAndSendTransaction`
- 用 simulation 取代使用者批准
- 對任意歷史交易做模擬器或除錯器
- Agent 解讀 simulation 日誌
