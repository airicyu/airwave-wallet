# 清理空 token account — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

## 現況

主畫面 Home 在看某一戶錢包帳戶時，只列出該戶在目前 cluster 上的代幣持倉。餘額為 0 的 token account 依持倉契約丟棄，畫面上看不到，也沒有入口把它們關掉。

SPL token account 即使數量為 0 仍佔 rent。關掉後，這筆 rent 會以 SOL 回到帳戶 owner。本擴充今天沒有「錢包自己組交易並送出」的路徑：dApp 的 `signTransaction` 是簽完交回 dApp，由對方廣播。

## 產品意向

在主畫面看**這一戶錢包帳戶**時，能清理它名下的空 token account，把 rent 收回成 SOL。

空＝該 token account 的數量為 0，帳戶仍在鏈上。有餘額的不關。native SOL 主帳戶不關。

使用者從這一戶進入清理：先看到可關幾筆、預估可收回多少 SOL、手續費（查不到就寫未知，不顯示 0）。確認後，錢包**自己組**關閉這些帳戶的交易（rent 收款人是 owner）、用這一戶能簽的密鑰簽名並送出。送出前必須已解鎖。成功或失敗都給短結果；成功後持倉與 SOL 餘額會再查一次。

唯讀、或這一戶簽不了的地址，不提供可執行的清理（可說明這戶簽不了）。聚合錢包帳戶只處理**目前能簽的那條地址**上的空 token account，不一次掃完全部成員。

查詢與組交易、送出都在 service worker，打目前 cluster 的 RPC。popup 只渲染與確認。不把待清清單寫進 `chrome.storage` 當真相。

這是錢包自己的動作，不是對 dApp 開放 `signAndSendTransaction`。

## 開工前仍須拍板（排進 INDEX 時）

- 入口放在 Home 代幣區，或這一戶的帳戶頁。沒有可清帳戶時，入口隱藏還是顯示「沒有可收回的」。
- 一筆交易最多關幾個；超過時分批，每批都要再確認。
- Token 與 Token-2022 是否都關；Token-2022 有擴充、或關不掉時怎麼列出來跳過。
- 數量為 0 的 wSOL 算空、可關；有餘額的 wSOL 留在持倉。
- 確認頁是主畫面內一頁，或沿用日後的簽署交易頁。
- 送出用目前 `rpcUrl` 的 `sendTransaction`；確認要等 `confirmed` 還是送出即結束。

## 非目標（構想層）

- 關掉仍有餘額的 token account，或幫使用者燒代幣
- 關閉 native SOL 主帳戶
- 對 dApp 宣告或實作 Wallet Standard `signAndSendTransaction`
- 代清別人的帳戶、或清不屬於這一戶 owner 的 token account
- Agent 決定哪些該關
