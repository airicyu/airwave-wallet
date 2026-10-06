# 0.17.0 — 為何現在宣告 `signAndSendTransaction`

## 問題

0.13.0 把「確認中 → 已確認」只給錢包內 `walletSend`，並明文不宣告 Standard `signAndSendTransaction`。dApp 常見路徑卻是錢包代送；test-web 用 `signTransaction` 再自己廣播時，popout 一批准就關，使用者會以為確認畫面壞了。

## 否決

| 方案 | 為何否 |
|------|--------|
| 讓 `signTransaction` 也等 confirmed | Standard 語意是只簽；dApp 可能不送。空等會卡住網站 |
| 只改 test-web、錢包仍不宣告 | 無法測真 feature；與「要做支援」不符 |
| 批准當下就回 signature、背景再送 | dApp 以為已上鏈；失敗難對帳。本產品 walletSend 已選等 `confirmed` |
| 網站 signAndSend 改走已開 popup | 推翻 0.13.0 宿主矩陣；sidebar 未出貨 |
| 讓 60s 確認失敗也對 dApp `BROADCAST_UNCONFIRMED` | 與「可再批准」互斥 |
| 批准後仍靠 120s pending timer 結束 dApp | 與 walletSend `cancelPendingTimeout` 分叉；思考中的 dApp 會被誤殺 |
| 拒絕只走 `finishWalletSendUserAbort` | 不 `sendBridgeResult`，網站 Promise 掛到逾時 |
| inject 全命令維持 120s | 批准晚＋confirmed 60s 會先 timeout |
| 確認中仍跑殼 `armExpiry`（enqueue＋120s `showGone`） | 思考偏長會把確認中打成過期頁，關窗誤殺 dApp |
| 批准時 `unbindPopoutByRequest` | `onRemoved` 對不到 requestId，pending 孤兒 |

## 選定

- 新 pending kind，審批殼與模擬／CU 與簽交易共用，**離開呈現**與 `walletSend` 共用。
- 等 `confirmed` 才回 dApp，與錢包送出同一信賴水準。
- 已廣播未確認：關窗、abort、或還原審批後點拒絕，一律對 dApp `BROADCAST_UNCONFIRMED`；60s 確認輪詢失敗只 progress、可再批。
- 點拒絕：無 sig → bridge `USER_REJECTED`；有 sig → `BROADCAST_UNCONFIRMED`（與關窗同一碼）。
- inject 僅本命令等待 `PENDING_TIMEOUT_MS + 60s`。
- 確認中禁止殼 `armExpiry` `showGone`。
- 批准禁止 `unbindPopoutByRequest`。
- 確認頁 hold **1s**。
