# WHY — 0.10.0 簽署交易頁

## 為何主舞台是模擬餘額差而不是 instruction 列表

一筆 Solana 交易是 N 條 compiled instruction，各走不同 program，還有 CPI。用「主程式」或只列外層 ix 當主內容會說謊。使用者要決定的是：**我的 SOL／代幣會怎麼變**。那只有 `simulateTransaction` 的帳戶差（含 CPI 效果）能接近。instruction／program 是輔助，所以預設收合。

## 為何成功不標「會成功」

模擬過了，數字自己會說話。徽章是空保證，也佔主舞台注意力。失敗才需要打斷：notice 在預期變動**上方**。

## 為何失敗詳情在 notice 同一張卡

獨立第二張卡把「預計失敗」拆成兩次掃描。一句原因給大多數人；logs／err 給要核對的人，預設收合。

## 為何模擬失敗仍可批准

批准語意從 0.1.0 就是「同意簽名」，不是「保證鏈上成功」。dApp 可能在別的 cluster、或使用者知情仍要簽。自動拒絕會變成錢包替 dApp 決策。無法 deserialize 除外：那時簽名路徑必炸，按鈕應 disabled。

## 為何進行中也可批准

RPC 慢不應卡死簽署。模擬是諮詢。700ms hold 只防解鎖熱區誤觸，與模擬無關。

## 為何 deltas 必須是 pre／post 差

主舞台諮詢的是增減，不是存量。現行 Agave／Helius 的 `simulateTransaction` 已回 `preBalances`／`postBalances`／`preTokenBalances`／`postTokenBalances`（與 `getTransaction.meta` 同形），SW 直接相減即可，不必再 pre-fetch 帳戶。產品不兼容缺這些欄的舊 RPC：缺欄當 `rpc`，不要猜存量。v0 帳戶序用 `loadedAddresses`，與 balance 陣列 index 對齊。

## 為何 SW 打 RPC、只加一個 UI command

popout 自己 fetch 會把 cluster URL、錯誤處理、sigVerify 參數複製一份，且不好測。pending 權威在 SW，模擬綁 `requestId`。結果不進 `chrome.storage`，避免把未簽交易／logs 當持久狀態。

`sigVerify: false`＋`replaceRecentBlockhash: true`：未簽交易常不能過 sigVerify；過期 blockhash 不應讓整頁只顯示 RPC 錯而看不到差額。

## 為何凍結 `signAccountId` 且鎖定仍開窗

與 0.9.0 同一失敗模式：widget 顯示 A、卻簽 B；或鎖定早退逼使用者先開 popup、dApp 請求已死。signTransaction 不該比 signMessage 更差。

## 為何解鎖鈕必須 `flex: none`

殼底批准 `.primary { flex: 1 }` 若沿用到直向解鎖屏，按鈕會拉滿剩餘高度（概念稿已踩過）。產品鎖定頁是短欄＋一條按鈕，與 popup `#locked` 相同。

## 為何熟名表很小、不准猜 Jupiter

錯誤品牌名比縮寫公鑰更糟。DEX program id 會換。對不出就前 4…後 4。

## 為何本版不做 priority fee／代廣播

改 instruction 再簽名是另一個 custody 面；`sendTransaction` 是另一個產品句。本版只讓人看懂再簽回 dApp。

## 否決

| 方案 | 為何否 |
|------|--------|
| 摘要只秀一個 program | 交易模型不是 1 tx = 1 program |
| 主舞台 instruction 列表、模擬另項半成品 | 已拍板的資訊架構相反 |
| 成功徽章「會成功」 | 空保證 |
| 失敗自動拒絕 | 偷改 0.1.0 批准語意 |
| popout 直打 RPC | 參數與 pending 分叉 |
| 模擬寫入 chrome.storage | pending／未簽 tx 變成持久 |
| 鎖定仍 `WALLET_LOCKED` 早退 | 與 0.9.0 簽署流程不一致 |
| 批准時改用當下 active | 審批頁說謊 |
| 只讀 `accounts` post 存量、或只帶 signer | 主舞台會漏 SPL 或把存量當增減 |
| 為算差再 `getMultipleAccounts` | 新 RPC 已給 pre／post；多一輪且漏新建 ATA |
