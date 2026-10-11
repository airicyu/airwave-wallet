# 0.18.0 — 為何 Activity 長這樣

## 問題

Home 從 0.3.0 就有 Activity 分頁，但只顯示空狀態。使用者要看到這個帳戶最近的交易，並能到鏈上瀏覽器核對那一筆。

## 否決

| 方案 | 為何否 |
|------|--------|
| 每一列都用 `getTransaction` 自己分類 | 20 筆就是 20 次 RPC，而且互換要自己認程式。mainnet 已有 Helius 解析 |
| Helius 失敗時改顯示簽名粗列 | 同一網路下列的粗細會偷偷變，使用者無法分辨是沒有解析還是壞了 |
| 整列可點開 Solscan | 容易誤觸離開錢包。概念稿把連結收成列尾圖示 |
| Orb 或官方 Explorer 當預設 | 日常打開一筆交易，Solscan 仍是最普遍的站。Orb 單筆說明較清楚，但不是這顆連結的對象 |
| 用英文 `description` 決定送出／互換 | 句子格式會變，而且介面是繁中 |
| 聚合合併所有成員 | 畫面餘額已是加總，活動再混地址會對不上「目前這個地址」 |

## 選定

- 概念稿 [`home-activity-ux.html`](../../../design-demos/home-activity-ux.html)：一列一筆、圖示開新分頁、三個安靜態。
- Solscan。devnet 用 `?cluster=devnet`。
- mainnet＋Helius key 才分類互換／送出／收到；其餘一律「交易」加成功或失敗。
- 20 筆、不翻頁、不進 storage。
