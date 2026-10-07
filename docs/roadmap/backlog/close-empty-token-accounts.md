# 清理空 token account — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

畫面概念稿（非正式）：[`docs/design-demos/close-empty-token-accounts-ux.html`](../../design-demos/close-empty-token-accounts-ux.html)。尚未排進 INDEX。先不實作。Solana 客戶端遷 Kit 見 [0.20.0](../0.20.0/INDEX.md)（行為不變，不含本功能）。

## 現況

主畫面 Home 在看某一戶錢包帳戶時，只列出該戶在目前 cluster 上的代幣持倉。餘額為 0 的 token account 依持倉契約丟棄，畫面上看不到，也沒有入口把它們關掉。

SPL token account 即使數量為 0 仍佔 rent。關掉後，這筆 rent 會以 SOL 回到帳戶 owner。本擴充今天沒有「錢包自己組交易並送出」的路徑：dApp 的 `signTransaction` 是簽完交回 dApp，由對方廣播。

## 產品意向

在主畫面看**這一戶錢包帳戶**時，能清理它名下的空 token account，把 rent 收回成 SOL。

空＝該 token account 的數量為 0，帳戶仍在鏈上。有餘額的不關。native SOL 主帳戶不關。

使用者從這一戶進入清理：勾選要關的空 token account，可全選。超過單筆交易能放下的數量就拆成多筆，每筆只關同一個 owner 的帳戶，rent 回到該 owner。確認後一次簽名，再以同時最多 5 筆在飛的方式送出。某一筆失敗或過期不取消其餘。全部變成已確認或已過期之後才顯示結果。送出前必須已解鎖。成功後持倉與 SOL 餘額會再查一次。

數字為 0、但仍有至少一個可簽地址時，回收圖示變暗、不顯示 0、不能點。這一戶完全沒有可簽地址（單一唯讀，或聚合裡沒有可簽成員）時，不畫回收圖示。

聚合錢包帳戶的數字是**所有可簽成員**的可關空帳戶加總，不是只算目前那一條。勾選清單依錢包分組，列出各錢包的空 token account。交易仍按錢包拆開，各自收回到該錢包，不做歸集。然後一次幫這些錢包簽名並送出。

關不掉的 Token-2022 不計入數字，也不出現在清單。數量為 0 的 wSOL 可關（收回的是 rent；有餘額的 wSOL 留著）。native SOL 主帳戶不關。

CU limit 用一次量出來的常數：`ceil((底 + 每關一戶 × 筆數) × 1.1)`，再clamp 到協議上限。優先費單價用 Settings 的 Default CU price。費用在簽名前就算死。

查詢與組交易、送出都在 service worker，打目前 cluster 的 RPC。popup 只渲染與確認。不把待清清單寫進 `chrome.storage` 當真相。

這是錢包自己的動作，不是對 dApp 開放新的 Wallet Standard 方法。

## 已拍板（尚未寫進 INDEX）

- 入口在 Home Tokens 標題列，跟重新整理並排。綠色回收標，數字在右下。頂欄不放這顆鈕。
- 沒有可關帳戶但有可簽地址：變暗、不顯示 0。沒有可簽地址：不畫。
- 可勾選、可全選。超過單筆上限則分批，不限制使用者只能選 N 個。N 以交易塞得進大小上限為準。
- 聚合：數字為可簽成員加總；清單按錢包分；每筆交易只關一個錢包並收回到該錢包。
- 送出同時最多 5 筆。失敗不停。等全部已確認或已過期。結果分開：已確認成功、鏈上失敗、已過期。
- 關不掉的不計入、不列出。數量 0 的 wSOL 可關。

## 開工前仍須拍板（排進 INDEX 時）

- CU 公式裡的「底」與「每關一戶」兩個常數，等量過 CloseAccount 再寫死。先不實作。

## 非目標（構想層）

- 關掉仍有餘額的 token account，或幫使用者燒代幣
- 關閉 native SOL 主帳戶
- 對 dApp 宣告或實作 Wallet Standard `signAndSendTransaction`
- 代清別人的帳戶、或清不屬於這一戶 owner 的 token account
- Agent 決定哪些該關
