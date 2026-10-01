# Reasoning — 0.3.0

## 為何本版只做 UI、把 Helius／Jupiter 留給 0.4.0

方案 A 的 chrome（Menu、整頁 Accounts、Reveal）與 DAS 限流、API key、分頁是不同風險。卡片只要先綁 `HomeTokenRow`（symbol／數量／`usdLabel`），0.4.0 只換資料來源，不必重做版面。

若本版接 Helius，審查與手驗會被 RPC 額度、CORS、空 URL 卡住，殼出不了貨。

## 為何 Combined 不進 0.3.0／0.4.0

完整聚合帳戶是另一種帳戶模型，會拖垮方案 A 與 DAS 兩刀。那兩版只做兼容；功能在 [0.5.0](../0.5.0/INDEX.md)。

## 為何 USD 一律「—」而不是 mock 數字

原型用假報價示範排版。產品若寫死 `$2,841` 使用者會當真。無報價契約已定為「—」。

## 為何濾掉 0 SPL、保留 0 SOL

空 token account 常見且無資產意義。SOL 列代表「這個錢包的原生餘額」，零也說明狀態。

## 為何鎖定不再顯示 Home Token

0.2.0 為了少擋餘額查詢，鎖定仍畫 Home。本版 Lock 在方案 A 頂欄，語意是「收起錢包殼」。鎖定與 Home 卡片並存會讓 Menu／Accounts／Reveal 入口與 `#locked` 互斥規則說不清。本版覆寫為：鎖定＝整頁 Unlock。

## 為何 Reveal 必須先解鎖、匯出仍再送密碼

鎖定整頁後無法同時「不經 Unlock 就開 Reveal」。導航要求先解鎖；command 仍帶 password，避免已解鎖 popup 被借走一鍵匯出。揭示成功不另開 session、密碼錯不 lock。

## 為何同 mint 加總成一列

legacy 可對同一 mint 開多個 token account。`HomeTokenRow.id` 用 mint 是為 0.5.0 加總預留；本版若逐帳戶一列會 id 重複。按 mint 合併後再套「0 不畫」。

## 否決

| 方案 | 決定 |
|------|------|
| 本版同時做 DAS | 否；0.4.0 |
| Activity 先畫假時間軸 | 否；empty state |
| Add account 含助記詞 | 否；custody 另版 |
| 點 Menu「Connected sites」卻只捲到 Settings 底部 | 否；獨立子頁，較少迷路 |
| Reveal 走 content／inject | 否；擴大攻擊面 |
| 鎖定仍畫 Home Token（沿用 0.2.0） | 否；與方案 A Lock／`#locked` 互斥 |
| Reveal 覆蓋 `#locked`、未 Unlock 可匯出 | 否；與鎖定整頁同一模型 |

## 與架構禁區

不改 pending 模型、不廣播、不加硬編碼密碼。Reveal 結果不是 pending、不進 storage。
