# Reasoning — 0.5.0

## 為何獨立成 0.5.0

方案 A 與 DAS 已夠一版。Combined 改的是帳戶模型與 dApp 公鑰語意，應在 0.4.0 pipe（`owners[]`）落地後再做。

## 為何刪 storage 真實帳戶不踢出 combined

Subs 是地址集合，不是外鍵。刪 vault 只是「這台機器不再持鑰」；聚合檢視仍要算那條鏈上地址。Runtime 當 read-only 與「從未入隊的地址」同一條路，實作單純。Main 不自動跳開，避免 silently 改使用者以為在簽的地址；dApp 仍見同一 main 公鑰，只是改為拒簽。

## 為何最後一個 sub 不能移除

Combined 沒有空集合語意（沒有可暴露的 main、沒有 owners）。保底一個 sub；要解散就 **刪 combined 本體**。

## 為何成員餘額用展開列而不是 hover

Popup 約 384px，hover 容易滑出即關，成員一多塞不進穩定 tooltip，也無法停下來對數字。加總仍是預設；展開是明示手勢，對齊「先看合計、再拆地址」。% 以該 Token 列加總為分母，因為使用者問的是「這顆 token 誰持有多少」，不是全組合約 USD。展開不改 main，避免把「看持倉」與「改付款公鑰」混成同一點擊。

## 切目前錢包用 account-changed 而非 disconnect

網站已信任的是這個錢包 session；換的是同一 combined 下的付款公鑰，應對齊 0.2.0 切真實帳戶，而不是逼重走 connect。`setCombinedMain` 只通知綁該 combined id 的 origin；`setActiveAccount` 仍走 0.2.0 對既有連線推新暴露公鑰、不改 `connections.accountId`。

## 為何 combined 沒有 `publicKeyBase58`、且不佔 `ACCOUNT_EXISTS`

若把目前錢包抄進 `publicKeyBase58`，0.2.0 整表唯一性會擋住「把既有簽名列納入聚合」。Combined 是帳戶列不是地址列；暴露公鑰永遠從 `mainPubkey` 讀。唯一性只約束「這台機器對同一公鑰只能有一條 signing 或一條 watch」。

## 為何鎖定 combined 仍是 `WALLET_LOCKED`

`resolvePubkey` 看的是 storage 是否有 signing secret，不是 session 是否解鎖。否則鎖定會被誤報成 `ACCOUNT_READ_ONLY`，dApp 以為永遠不能簽。取鑰鍵必須是 signing 列 id，因為 vault 從不為 combined id 存密鑰。

## 為何單 owner 失敗就整輪失敗

部分加總會讓 % 與合計看起來像完整資料。對齊 0.4.0：失敗保留舊快取＋error。
