# WHY — 0.9.0 簽署訊息頁

## 為何不繼續用 JSON `<pre>`

`signMessage` 的 payload 是 byte 陣列。JSON 主畫面強迫使用者讀數字陣列，無法判斷這是登入字串還是交易 message。可讀頁是風險控制，不是裝飾。

## 為何交易偽裝改為「開窗但不能批」而不是立刻失敗

0.8.0 啟發式在 SW 早退：dApp 立刻拿到錯誤，使用者**看不見**被擋的是什麼。開窗讓人讀到短句並按拒絕；錯誤碼仍告訴 dApp 這不是一般 `USER_REJECTED`。批准必須在 SW 再擋一次，避免只靠 disabled 按鈕。

## 為何用 SDK 整段解析而不是 `0x80`／長度

首字節啟發式會漏 legacy message，也會誤傷以 `0x80` 開頭的短／巧合金鑰材料。`Message.from`／`VersionedMessage.deserialize` 且佔滿 buffer，才能對齊「這就是一筆可廣播交易的 message」。佔滿避免「前面碰巧像 message、後面是使用者文字」被整段當交易，或前綴交易被當普通訊息。

## 為何凍結簽名帳戶

widget 若跟「當下 active」、簽名卻用批准當下另一戶，等於審批頁說謊。enqueue 寫入 `signAccountId`，批准只簽該戶。popup 切帳戶不應偷偷改這筆 dApp 請求的簽名者。

## 為何 getPending 帶 `messageLooksLikeTx`

畫面短句與批准 disabled 必須與 SW 同一答案。popout 再 parse 可能與 web3 版本／錯誤處理分叉。旗標只活在記憶體 pending，不是 storage。

## 為何鎖定改為 popout 內解鎖

現行 `WALLET_LOCKED` 早退會逼使用者先開 popup 再重簽，dApp 請求已失敗。審批窗是當下任務；解鎖是該任務的前置，不是另一個產品面。解鎖鈕與批准若佔同一殼底熱區，解鎖成功後同一座標會變成批准——故解鎖在內容區、本窗解鎖後批准 700ms hold。popup 先解鎖則 popout 跟著進簽署殼、不必 hold。

## 為何關窗對交易 message 不用 `USER_REJECTED`

若關窗與按拒絕碼不同，dApp 可把「使用者關掉交易偽裝提示」當成普通拒絕並改走別的 UX。同一判定同一碼。逾時仍 `TIMEOUT`：那是時限，不是使用者看過提示後的決定。

## 為何 connect／signTx 不一起改

交易摘要與 simulation 是另一 backlog。本版若改共用殼易把 JSON 交易頁半改壞。焦點 CSS 可共用。

## 為何 UTF-8 要 C0／NUL 過濾

`fatal: true` 只保證合法 UTF-8，不保證可讀。嵌入 NUL 或其它控制字元的「文字」不該當 Message payload 主卡。

## 為何焦點要用 accent 而不是系統 outline

Windows／Chrome 預設 focus ring 常為橙／金色，與 `--accent` `#3d9cf0` 無關，看起來像未完成主題。文字欄已有 stroke，focus 改邊框即可；radio 若套寬 outline／`width:100%` 會壓扁 Settings 網路列。

## 否決

| 方案 | 為何否 |
|------|--------|
| 交易偽裝立刻 fail、不開窗 | 使用者無可見原因 |
| UI 寫「有害／偷錢／誘騙」 | 誤判時變成指控；產品只要拒絕當訊息簽 |
| 只信 popout 的 disabled 批准 | 可被改 DOM／直接 `ui.resolvePending` |
| popout 用 storage 找 pending | GUIDELINES 禁區 |
| 解鎖欄 `type=password` | 0.8.0 類 B；進 Google 密碼管理器 |
| 鎖定仍早退 `WALLET_LOCKED` | 與「同一窗解鎖再簽」衝突 |
| 本版順便做交易模擬 | 非目標；拉長審批與 custody 面 |
