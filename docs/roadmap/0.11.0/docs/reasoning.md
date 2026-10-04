# WHY — 0.11.0 交易費與 CU

## 為何未簽要改 bytes

Wallet Standard `signTransaction` 回的是簽名後的 message。若永遠不寫 Compute Budget，使用者無法在錢包裡調優先級；dApp 的 price 也可能是 0。未簽改 message 不會作廢他人簽名。已簽則改了會使既有簽失效，故只讀。

## 為何兩次模擬

Phase 1 把 limit 拉滿、price 0，是為了量 `unitsConsumed` 不被預設 20 萬／ix 截斷，且不讓巨大 limit×高價扭曲 lamports 差。主舞台必須是 **即將簽名的那份**（真實 price）。

成功時 `max(usage×110%, 原始 limit)`：避免比 dApp 已留的 buffer 更緊。

## 為何總費＝簽名費＋優先費，且優先費唯讀

使用者要看「這筆大概要付多少手續費」。協議優先費是 limit×price，不是用量。簽名費固定按簽名數。讓人改 SOL 總額會倒推 price，和「只改 CU」的進階模型打架；cap 欄也已放棄。總費大數字、細節收合，小屏才掃得完。

## 為何 Default CU price 不分 cluster

出廠 25000 對 devnet 幾乎無成本；少一個會改錯網的設定。

## 為何 phase 1.5 前批准簽原樣

0.10.0 模擬中可批准。若還沒有建議 CU 就先改寫，會簽進 140 萬 limit×0 price 的量測副本。原樣較誠實。

## 為何 CU 用確認圖示

逐鍵 debounce 會把半成品寫進交易並重畫輸入框。失焦提交會跟「批准」搶同一下點擊。兩欄右側一顆確認＝提交點；dirty 時批准不可按，避免簽到舊 budget。

## 否決

| 方案 | 為何否 |
|------|--------|
| 已簽仍改 CU | 既有簽失效 |
| 沿用 dApp price 當初始 | 與「錢包預設單價」產品句相反 |
| 交易明細當費用主路徑 | 和指令列搶掃描 |
| 可編輯 cap | 與「優先費＝乘積」重複且連動複雜 |
| 按鍵或失焦自動寫 CU | 半成品模擬；批准與 blur 競態 |
