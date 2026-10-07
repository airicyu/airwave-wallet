# 0.19.0 — 為何靜態解讀加 Inspector，不做 IDL

## 問題

簽署殼的交易明細自 0.11.0 起只有帳戶縮寫與 data hex。使用者無法在 384px 裡判斷「這是轉 SOL 還是未知程式」。動態 Anchor IDL 欄位樹會再佔一層空間，且要查鏈、快取、處理沒有 IDL 的閉源程式。

## 否決

| 方案 | 為何否 |
|------|--------|
| 本版就做 IDL | 使用者已定：暫時不攪 Anchor。彈窗不夠展開帳戶樹 |
| 用解讀取代模擬差額 | 差額仍是簽核主舞台；parser 會錯、IDL 會缺，不能當批准依據 |
| 解析失敗就禁用批准 | 等於把未知 dApp 交易全部擋住；與 0.10.0「可審批、模擬可失敗仍能簽」衝突 |
| Inspector 傳 `customUrl`＝使用者 RPC | Settings 裡的 Helius URL 常帶 api-key，會漏到 explorer.solana.com |
| 傳整筆帶簽名的 tx、或把 base64 畫在畫面上 | Explorer 的契約參數是 `message`；畫面不需要再攤 bytes |
| 整張預期變動卡可點 | 與 Activity「整列不可點、只圖示外連」同一理由：易誤觸離開錢包 |
| 引入 `@solana/spl-token` 只為 decode | 本版變體少，手寫長度檢查更可控，且 INDEX 依賴哲學是壓低套件 |

## 選定

- 靜態表：System Transfer、兩條 Compute Budget、Token／Token-2022 的 Transfer／TransferChecked、ATA Create／CreateIdempotent、Memo UTF-8。其餘 hex。
- 解讀在 SW，UI 只渲染。
- Explorer Inspector 用 message base64 放 query；cluster 對應 settings，不帶自訂 RPC。
- 重試與 Explorer 做成有底有框的 34px 鈕，Explorer 用 accent，避免透明 icon 看不見。
- hex 路徑禁止沿用舊的寬鬆 `desc`（只看 disc 首 byte），否則長度不對仍會出現「轉移 SOL」加 hex，變成半套解讀。
- CU dirty 時 Explorer 仍開上次模擬的 message：與「尚未套用 CU、批准 disabled」一致，避免使用者以為 Inspector 已含草稿。
