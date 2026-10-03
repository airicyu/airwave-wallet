# 簽署訊息頁 UI／UX — backlog

構想。**已排程 [0.9.0](../0.9.0/INDEX.md)**；衝突以該 INDEX 為準。

## 現況

dApp 的 `signMessage` 走 popout 審批（[`wallet/src/popout/`](../../../wallet/src/popout/)）。`connect`、`signMessage`、`signTransaction` 共用同一張頁：來源 origin、一句種類、`<pre>` 印出 pending payload 的 JSON，以及拒絕／批准。簽署訊息時使用者看到的是序列化內容，不是可讀的訊息本文。

簽名主路徑已在 0.1.0 出貨：批准後由 service worker 簽、結果只回發起 tab。本構想只改**這一頁怎麼呈現與操作**，不改請求生命週期。

## 產品意向

`signMessage` 用自己的審批頁，讓人在批准前讀得懂要簽什麼。

頁上要能掃到：

- 哪個站點在請求（origin）
- 將用哪個帳戶簽（名稱與縮寫地址；跟該筆 pending 的簽名帳戶一致）
- 訊息本文：合法 UTF-8 且少控制字元 → 文字卡（標 Message payload，約 6 行後卡內捲）；其下 Raw binary payload 預設收合。否則主體只有 Raw binary payload 一般卡。
- 若 bytes 可被 `@solana/web3.js` parse 成 legacy／versioned **message**（整段吃完）：**禁止**當成 `signMessage` 批准。畫面短句：「不能把交易當成訊息簽署。」不要寫有害網站、偷錢、誘騙。dApp 錯誤碼對齊 `SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION`。殼底與一般審批相同：**拒絕可按**（等於拒絕該請求），**批准 disabled**。
- 一般訊息：拒絕與批准；主行動是批准。載入失敗顯示「請求已不在」。批准中不可連點。

`connect` 與 `signTransaction` 仍走各自版面；本項不順手改它們。

- 鎖定時 popout **整頁**為與 popup 相同的一般解鎖（Airwave、錢包已鎖定、密碼欄）。**「解鎖」在內容區、緊接密碼欄下方**，此時**不畫**殼底拒絕／批准。解鎖成功才進入簽署頁並出現殼底。批准在解鎖後至少約 700ms 內 disabled（防連點打到同一位置）。關窗仍拒絕該 pending。密碼欄類 B。

## 非目標（構想層）

- 改 `signMessage` 的 command、pending、或回傳格式
- Sign-in with Solana、鏈下授權的專用文案
- 交易 simulation、代廣播
