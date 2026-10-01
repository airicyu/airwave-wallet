# Reasoning — 0.4.0

## 為何改打 Tokens v2、且不再打 Price v3

名稱、icon、底價走 Helius DAS（`content.metadata`／`token_info`）。Jupiter 才有 `isVerified` 與 `organicScore`；同一支 Tokens v2 也帶 `usdPrice`，故用來覆寫 USD，不必再打 Price v3（keyless 0.5 rps 打兩次會撞牆）。

## 為何空 Settings key 仍打 Jupiter

無 key 即官方 **keyless 0.5 rps**。Free 方案要註冊並拿 API key，額度是 **1 rps**，與 keyless 不同。Settings 有字就帶 header；本版對「有 key」一律按 Free 的 1 rps 節流（無法從 key 字串判斷 Developer／Launch／Pro）。生產建議貼 portal key。產品 **不**內建共用 key。若回 401／403，持倉列仍在。

## 為何 Helius 是 URL、Jupiter 是 key

Helius 慣例把 key 放在 RPC URL query。Jupiter 官方是固定 `api.jup.ag` + 可選 `x-api-key`。

## 為何 Jupiter 缺價時保留 Helius

Tokens v2 可能省略流動性差的 mint。缺 `usdPrice` 就把 DAS 價改成「—」會無故空白。

## 為何改 SW 代打

popup 直連 `api.jup.ag` 可能 CORS 失敗；多開 popup 會打爆 2 rps。單一 in-flight 佇列與 429 退避放 SW，符合「少打、排隊、可重試」。餘額仍不寫 `chrome.storage`，避免把鏈上快照當持久真相。TTL 命中只交貨一次，避免第二條 runtime 推送列。

## 為何空 Helius 要 RPC fallback

未申請 Helius 的開發者仍應看到 0.3.0 級持倉，而不是空白 Home。

## 為何 devnet 關掉 Jupiter

Price API 是 mainnet 流動性；devnet mint 對上主網價會錯。

## 為何列表按 USD 總額而非單價

使用者問的是「這袋幣值多少錢」，不是「一顆多少錢」。無報價的列無法比較金額，放最後避免假 $0。SOL 仍固定第一，與 0.3.0 殼一致。

## 否決

| 方案 | 決定 |
|------|------|
| 只用 Jupiter Portfolio `/positions` | 否；DeFi portfolio，不是 SPL 清單真相 |
| 合併 rpcUrl 與 heliusApiUrl | 否；送交易與 DAS／gateway 常不同 |
| 產品內建共用 API key | 否；額度與洩漏 |
| 空 key 不打 Jupiter | 否；keyless 0.5 rps；有 key 至少當 Free 1 rps |
| 有 key 就當 5 rps（200ms） | 否；Free 只有 1 rps，會 429 |
| 同一輪 Price v3 + Tokens v2 | 否；keyless 0.5 rps 會立刻 429 |
| Jupiter 缺價改成「—」即使 Helius 有價 | 否；見上 |
