# Reasoning — 0.7.0

本檔只寫 **WHY**。WHAT 在 INDEX，HOW 在 `token-holdings-how.md`。不把審查檔當契約。

## 為何離開 DAS `getAssetsByOwner`

0.4.0 用 DAS 是因為同一回應帶 fungible、native SOL、名稱與 icon。實務上 DAS 把 NFT／compressed／fungible 混在同一分頁，客戶端再濾 interface，limit 可到 1000，頁間還要對齊約 2 rps。Home 要的是 **錢包餘額清單**，不是資產目錄。Wallet Balances 預設可關 NFT、limit 100、欄位接近卡片（數量、decimals、名稱、logo、usdValue），不必再當 NFT 瀏覽器。

否決：繼續 DAS 再加強濾 NFT。那仍會拉一堆本版不畫的列，且與「不要 NFT 畫廊」衝突。

否決：改打 Helius Portfolio 其它 Wallet API。那是部位／DeFi 聚合，超出本版 SPL＋native 清單。

## 為何 Wallet API 只認可解析 key，且只 mainnet

Settings 仍讓使用者貼 **整條** Helius URL（0.4.0 慣例：key 在 query）。Wallet API 的官方 host 是 `api.helius.xyz`，不是使用者貼的 RPC gateway。若把整段 `heliusApiUrl` 拿去 POST JSON-RPC，會回到 DAS／自建 RPC，等於沒換資料源。故只抽出 `api-key`／`apiKey`，請求寫死官方 host。沒有 query key 的 URL（自建 gateway、貼錯）**不當**已設定 Helius。

Wallet Balances 是主網產品。devnet 若仍打主網 Wallet，會把主網餘額畫到 devnet Home。0.4.0 曾允許 Helius **devnet URL** 當 DAS；本版不再走那條。devnet 一律 `rpcUrl`。

否決：新 settings 欄或自填 Wallet host。多一個秘密面、與「不新增欄位」衝突；也容易把測試 host 寫進文件。

否決：有 URL 就當 Wallet。無 key 的字串無法通過官方認證，會整輪失敗或誤打 JSON-RPC。

## 為何 RPC 要 Token-2022，且兩次都必須成功

主網大量 mint 在 Token-2022。只打 legacy Token 會漏列，使用者以為沒幣。兩次 `getParsedTokenAccountsByOwner` 只成功一次就合併，會把「半份清單」當真相（與 0.5.0「禁止部分 owner 交貨」同一類謊報）。故任一 program 或 `getBalance` 失敗＝該 owner 失敗，回舊快取＋error。

## 為何 native 與 wSOL 分列

之後 Send 要分 System Transfer 與 SPL／unwrap。Home 合成一列會讓使用者以為卡片合計都能當 SOL 送出。Helius Wallet Balances 在 `showNative=true` 時把 native 標成 wrapped mint `So1111…12`，**不能**只靠該 JSON 拆兩袋。故 native／wSOL 一律以 `rpcUrl` 的 `getBalance` 與 token account 為準；Wallet API 同 mint 列丟掉。

native 永遠第一列（數量可為 0）。wSOL 僅在數量 > 0 時出現，且固定第二。名稱／symbol 寫死：`Solana`／`SOL` 與 `Wrapped SOL`／`wSOL`。

## 為何 `decimals === 0` 當 NFT、且不開 `showNfts`

DAS 靠 interface 濾。Wallet 關 `showNfts` 後仍可能出現 0 decimals 的 SPL。RPC 沒有 NFT interface。用 decimals 0 當「不當 Token 卡片」是兩條路徑共用的粗規則，不是畫廊。compressed 在這兩條路徑本來就不會出現。

## 為何 Jupiter 改為覆寫名稱／icon（native 與 wSOL 除外）

0.4.0 禁止 Jupiter 改名稱，是因為 DAS 已有 `content.metadata`。Wallet／RPC 的名稱品質不齊（RPC 常只剩 mint 縮寫）。Tokens v2 已在打，其它 mint 可採用 name／symbol／https icon。

2026-10 查 Tokens v2：wrapped mint 的 `name` 是 **Wrapped SOL**，`symbol` 是 **SOL**。若用 Jupiter symbol，第二列數量會寫成 `SOL`，與第一列無法區分。故 wSOL 列 symbol 寫死 `wSOL`，名稱寫死 `Wrapped SOL`。native 仍寫死 `Solana`／`SOL`。兩列都可用 Jupiter 的 https icon、價、勾、organic。

## 為何 `usdValue` 當持倉總額、跨頁／跨 owner 要加總後重寫 `usdLabel`

卡片讀的是 `usdLabel`（持倉總額字串），`usdTotal` 給排序。Helius `usdValue` 已是該筆總額，不是單價；當 raw 去乘價會差 10^decimals。同一 mint 跨頁只加數量、沿用其中一頁的美元，合計會錯。

0.5.0 合併只寫加總數量。各 owner 列內已有美元時，若合併只改數量、`usdLabel` 留第一個成員，Jupiter 缺價時畫面上仍是其中一人的錢。禁止部分 owner 交貨就是防合計謊報；美元欄必須同一套。Jupiter 有限 `usdPrice` 仍在合併 **之後** 用合併數量覆寫，避免用過期單價加總。

沒有有限總額畫「—」而不是 `$0`：假零會排到有報價列前面或讓人以為沒市值。

## 為何頁失敗不算成功、單筆缺欄才略過

空 `balances` 若當成「成功的空持倉」，會覆寫記憶體快取、把真實餘額畫成空。JSON 壞、根不是物件、沒有 `balances` 陣列＝該 owner 失敗，已拉到的部分頁不當交貨。單筆缺 mint 或數量／decimals 不是有限數，整頁失敗會因一筆髒資料丟整包；故略過該筆。`pagination` 缺席或 `hasMore` 不是 true 則停，避免無限翻頁。

429 預算對齊 0.4.0 頁級（每頁最多 3 次 HTTP），不另發明一套，讓同一 SW 佇列行為可預期。

## 未來 Send（非本版，未定案）

Home 已分列：第一列 native（System Transfer 候選），第二列 wSOL（SPL 或 unwrap 候選）。本版 **不**實作 Send／wrap／unwrap，也不選定送出流程。

## 否決

| 方案 | 決定 |
|------|------|
| 繼續 DAS + 濾 NFT | 否；資料源與產品句不符 |
| Portfolio 其它 Wallet API | 否；超出 SPL＋native |
| 新 settings／自建 Wallet host | 否 |
| 有 Helius URL 就打 Wallet | 否；要可解析 key 且 mainnet |
| RPC 只 legacy Token | 否；漏 Token-2022 |
| 只合併成功的那一個 token program | 否；半份清單 |
| Jupiter 仍禁止改名稱 | 否；Wallet／RPC 名稱不夠 |
| Jupiter 覆寫 native SOL 名稱／symbol | 否；Solana／SOL |
| Jupiter 覆寫 wSOL 列名稱／symbol | 否；寫死 Wrapped SOL／wSOL（Jupiter symbol 是 SOL） |
| Jupiter 覆寫 native／wSOL 的 https icon | 可 |
| Home 把 wSOL 併進 native | 否；之後 Send 分袋 |
| 0 餘額連 SOL 列一起丟 | 否；空錢包沒有第一列 |
| 沒報價畫 `$0` | 否；假零 |
| 部分頁成功就交貨 | 否；會清掉舊快取或少列 |
