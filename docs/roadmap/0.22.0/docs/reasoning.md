# WHY — 0.22.0

## 為何 Mainnet 不標、只標 Devnet

日常主網不需要一直提醒「你在 Mainnet」。測試網才容易誤當成正式網。只在 Devnet 出橙黃徽章，比兩個狀態都貼標更安靜，也推翻 backlog「兩個都要標」的構想。

## 為何 cluster 在 pill 外

pill 是帳戶切換與複製；網路不是帳戶屬性。放進去會讓人以為點徽章會切網或進 Accounts。

## 為何 pill 內不顯示地址縮寫

名稱＋頭像前兩字已夠辨識；完整公鑰用複製。兩行（名稱＋`前4…後4`）讓 pill 變高、複製位置難垂直置中。無名稱時用地址前 4 字當**顯示名稱**，仍不是 `前4…後4` 那一列。

## 為何頭像兩字不是四字

36px 圓放四字會過小。兩字可讀；無名稱時頭像是地址前 2、名稱列仍是前 4，兩者不完全重複。

## 為何確認中不走審批殼

收回租金沒有 pending／`requestId`／popout。共用的是 **dash-ring 視覺**，不是 `enterWalletSendConfirming` 生命週期。結束是三數結果頁，不能套 1s 勾離開。

## 為何等待文案改「等待鏈上確認」

與簽署送出同一句，使用者不必學「這一波」產品詞。批次仍在 SW 等齊，只是畫面不解釋。

## 為何 Activity 改 Orb、簽署 Inspector 不改

0.18 選 Solscan 是因為普遍；Orb（Helius）單筆說明較清楚，且本錢包 mainnet 歷史已走 Helius。Activity 是**已上鏈 signature**。簽署 Inspector 是**未上鏈 message**，仍用官方 `explorer.solana.com/tx/inspector`。兩條 URL 形狀不同，本版不做選擇器。

## 為何 phase 1 仍做 1.4M／price 0 探針再交給 factory

0.11 要在「limit 夠跑完」的條件下量消耗。原文可能已有過低 limit。factory 回傳的 `computeUnitLimit` 當從前的 `unitsConsumed`，再乘 1.1，才能維持 `suggestedLimitFromPhase1`。`estimateAndSetResourceLimitsFactory` 會把未乘 1.1 的值寫回 message，與公式衝突。收回租金已有自己的 margin，本版不混用。
