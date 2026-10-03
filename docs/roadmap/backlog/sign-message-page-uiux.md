# 簽署訊息頁 UI／UX — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

## 現況

dApp 的 `signMessage` 走 popout 審批（[`wallet/src/popout/`](../../../wallet/src/popout/)）。`connect`、`signMessage`、`signTransaction` 共用同一張頁：來源 origin、一句種類、`<pre>` 印出 pending payload 的 JSON，以及拒絕／批准。簽署訊息時使用者看到的是序列化內容，不是可讀的訊息本文。

簽名主路徑已在 0.1.0 出貨：批准後由 service worker 簽、結果只回發起 tab。本構想只改**這一頁怎麼呈現與操作**，不改請求生命週期。

## 產品意向

`signMessage` 用自己的審批頁，讓人在批准前讀得懂要簽什麼。

頁上要能掃到：

- 哪個站點在請求（origin）
- 將用哪個帳戶簽（名稱與縮寫地址；跟該筆 pending 的簽名帳戶一致）
- 訊息本文：能當文字讀就顯示文字；不能就給短的編碼預覽，並能展開全文
- 拒絕與批准；主行動是批准，拒絕在次要位置

原始 payload 可以收在「詳細」裡，不當主畫面。載入失敗、請求已不在，顯示短錯誤，不要用空白 JSON 充數。批准中按鈕不可連點。

`connect` 與 `signTransaction` 仍走各自版面；本項不順手改它們。

## 開工前仍須拍板（排進 INDEX 時）

- 訊息很長時：頁內捲動、截斷加展開，或兩者。
- 非 UTF-8 bytes 的預覽格式（hex 或 base58）與截斷長度。
- 鎖定中開啟此頁時，是先解鎖再看到本文，或解鎖與審批同一頁。

## 非目標（構想層）

- 改 `signMessage` 的 command、pending、或回傳格式
- Sign-in with Solana、鏈下授權的專用文案
- 交易 simulation、代廣播
