# 0.7.0 — Home 持倉改 Wallet Balances／RPC + Jupiter 名稱

- **狀態：** `shipped`
- **上游版本：** [0.6.0](../0.6.0/INDEX.md)（助記詞匯入；持倉行為仍疊加 [0.5.0](../0.5.0/INDEX.md) `owners[]`）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **Backlog：** 原為 0.6.0 持倉契約，改號本版；無獨立 backlog 檔

## 產品句

Home Token **不再**用 Helius DAS `getAssetsByOwner`。有可解析的 Helius `api-key` 且 `cluster === "mainnet"` 時，SPL 走 Helius **Wallet API** `GET /v1/wallet/{wallet}/balances`（預設不要 NFT）；native SOL 與 wSOL **一律**用 `rpcUrl` 拆開。否則整表用 `rpcUrl`：`getBalance` + **Token 與 Token-2022** 的 `getParsedTokenAccountsByOwner`。mainnet 仍打 Jupiter Tokens v2；native／wSOL 名稱寫死，其它 mint 有回傳的 `name`／`symbol`／`icon` 則覆寫。隱藏 compressed 與 **decimals === 0** 的 SPL（當 NFT）。

## 文件地圖

1. 本檔
2. [docs/token-holdings-how.md](./docs/token-holdings-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.5.0 combined-how](../0.5.0/docs/combined-how.md)（`owners[]` 串行加總）、[0.4.0 token-data-how](../0.4.0/docs/token-data-how.md)（佇列／TTL／Jupiter 批大小；**本版推翻** DAS 與「禁止 Jupiter 改名稱」）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| Settings | **不**新增欄位。仍用 `heliusApiUrl`、`jupiterApiKey`、`rpcUrl`、`cluster` |
| 何時 Wallet API | `heliusApiUrl.trim()` 非空，且能從 URL query 解析 `api-key`（或 `apiKey`），且 **`cluster === "mainnet"`**。同一 URL 同時有兩者時，**非空 `api-key` 優先**，否則用非空 `apiKey`。Host 寫死 `https://api.helius.xyz`。認證：query `api-key` 與 header `X-Api-Key` 同值。**禁止**把使用者 key 寫進 repo |
| 何時 RPC | 無 URL、解析不到 key、或 **devnet**（Wallet API 為主網產品；devnet 即使貼了 Helius URL 也走 `rpcUrl`，避免主網餘額畫到 devnet） |
| Wallet 請求 | `GET /v1/wallet/<owner>/balances`：`page` 從 1、`limit` ≤ **100**、`showNfts=false`、`showZeroBalance=false`、`showNative=true`。`pagination.hasMore` 為真則串行下一頁；頁間 ≥500ms。每 owner 走 0.5.0 串行，不平行多 owner |
| Wallet → 列 | Wallet API 的 `So1111…12` **丟棄**（Helius 常把 native 標成同一 mint，拆不開）。native／wSOL 改由 `rpcUrl`：`getBalance`＋該 mint 的 token account（見 RPC）。其餘 mint：`id`＝mint；`balance` 是 **UI 數量**。同一 owner、同一 mint：`balance` 加總；有限 `usdValue` **加總**為持倉 `usdTotal` 並格式化 `usdLabel`；該 mint 完全沒有有限 `usdValue` 時，才用加總後的 UI 數量 × 有限 `pricePerToken`。沒有有限總額則 `usdLabel` 為「—」，禁止把沒報價畫成 `$0`。`decimals === 0` 與 0 餘額丟棄。`logoUri` 僅 https |
| RPC | `getBalance` + `getParsedTokenAccountsByOwner` **兩次**（legacy Token `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA` 與 Token-2022 `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`）。任一失敗則該 owner 整輪失敗，禁止只合併成功的那一個 program。合併後同 mint 加總。`raw===0`／`uiAmount===0`／**`decimals===0`** 的非 native SOL 不列。**總是**產出 `id: native-sol`（lamports 可為 0；名稱 `Solana`、symbol `SOL`）。wrapped mint `So11111111111111111111111111111111111111112` 數量 > 0 時**另列** `id`＝該 mint，名稱寫死 `Wrapped SOL`、symbol 寫死 `wSOL`（Jupiter 該 mint 的 symbol 是 `SOL`，不可覆寫）。無名稱的其它 mint 用縮寫，等 Jupiter 覆寫 |
| 排序 | `native-sol` 永遠第一。有 wSOL 列則**第二**。其餘仍依 0.4.0：有限 `usdTotal` 高→低，無 USD 在後，同額依 symbol |
| 跨 owner | 數量與 `members` 仍照 0.5.0。同一 `id`：有限 `usdTotal` **加總**；該 id 完全沒有有限 `usdTotal` 時，才用合併後 UI 數量 × 有限單價。算出有限總額之後，用與單 owner 相同規則重寫該列 `usdLabel`；沒有有限總額則 `usdLabel` 為「—」。兩個成員同一 mint、兩邊都有有限美元時，卡片金額須是合計。Jupiter 的 finite `usdPrice` 在合併之後覆寫整列（`usdPrice` × 合併後 UI 數量）。`members` 仍只含該 owner 該 id 數量 > 0 的列 |
| 失敗 | Wallet／RPC 該 owner 失敗 → 對齊 0.5.0：整輪失敗、快取＋error，**不**把本輪已拉到的部分頁當成功交貨。頁級 JSON 無法解析、根不是物件、或缺 `balances` 陣列 → 該 owner 失敗。`pagination.hasMore !== true`（含缺 `pagination`）則停止翻頁。單筆缺 `mint`、或 `balance`／`decimals` 不是有限數 → **略過該筆**。RPC：`getBalance` 或任一次 token program 失敗 → 該 owner 失敗。Wallet 路徑還必須成功打 `rpcUrl` 才能拆 native／wSOL；這段 RPC 失敗＝該 owner 失敗。Wallet 429：該頁最多再試 2 次（含第一次共最多 3 次 HTTP），用 `Retry-After` 或指數退避；用盡仍失敗則整輪停、回快取＋error |
| Jupiter | 推翻 0.4.0「禁止改 name／symbol／icon」。mainnet 打 `/tokens/v2/search`；空 key 不帶 header；有 key 帶 `x-api-key`。對到 mint：finite `usdPrice` 覆寫 USD；`isVerified`／organic 同 0.4.0。https `icon` 可覆寫（native 與 wSOL 都用 wrapped mint 那筆）。**native-sol** 名稱／symbol 寫死 `Solana`／`SOL`。**wSOL 列**名稱／symbol 寫死 `Wrapped SOL`／`wSOL`（Jupiter `name` 是 Wrapped SOL，但 `symbol` 是 `SOL`，不可拿來當卡片 symbol）。其它 mint：非空 `name`／`symbol` 覆寫，symbol 有覆寫時重算 `iconLetter` |
| 非目標延續 | 不引入 Helius／Jupiter SDK；不 persist 持倉；popup 不直連；不畫 NFT 畫廊 |

## 非目標

- 重做 0.5.0 combined CRUD／連線
- DAS `getAssetsByOwner`、Portfolio 其它 Wallet API
- 新 settings 欄、自建 Wallet API host
- Price v3
- Send／wrap／unwrap（Home 已分列；本版仍不實作轉帳）

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.4.0／0.5.0／0.6.0 | 0.7.0 |
|--------------|--------|
| 有 Helius → DAS `getAssetsByOwner` | 有可解析 key 且 mainnet → Wallet Balances |
| RPC 只 legacy Token | RPC Token + Token-2022 |
| Jupiter 不改名稱 | Jupiter 覆寫其它 mint 的 name／symbol；native＝Solana／SOL；wSOL 列＝Wrapped SOL／wSOL；icon 可覆寫 |
| 客戶端濾 NFT interface | `showNfts=false` + `decimals===0` 丟棄 |
| native 與 wSOL 合成一列（曾寫進本版初稿） | 分列：native 第一、wSOL 第二 |

## 實作 Track

### Track 1 — RPC Token-2022 + 濾 NFT decimals

- **做：** `fetchRpcHomeTokenRows` 兩 program；`decimals===0` 不列。
- **驗收：** typecheck；無 Helius 時路徑可編譯。

### Track 2 — Wallet Balances 取代 DAS

- **做：** 解析 `api-key`；mainnet 打 Wallet API 分頁；刪／停用 `getAssetsByOwner` 主路徑。
- **驗收：** 無 key → RPC；有 URL 無 query key → RPC（不當 Wallet）；typecheck。

### Track 3 — Jupiter 名稱／icon

- **做：** `applyJupiterTokensV2` 合併 name／symbol／icon。
- **驗收：** typecheck；SOL 列名稱仍為 Solana；有 wSOL 時第二列名稱為 Wrapped SOL、symbol 為 wSOL。

## 驗收（出貨 checklist）

- [x] 未設 Helius → RPC（兩 token program）+ mainnet Jupiter 名稱
- [x] 設了含 `api-key` 的 Helius URL 且 mainnet → Wallet Balances，不打 `getAssetsByOwner`
- [x] `showNfts` 不開；decimals 0 SPL 不畫
- [x] Jupiter 空 key 仍打、不帶 header
- [x] `heliusApiUrl` 非空但解析不到 `api-key`／`apiKey`，或字串不是可解析 URL → RPC（Token + Token-2022），不打 Wallet API、不打 `getAssetsByOwner`
- [x] `cluster === "devnet"` 即使 URL 含 key → 走 `rpcUrl`，且不打 Jupiter
- [x] mainnet Jupiter 覆寫其它 mint 的 name／symbol，以及 **含 native／wSOL** 的 https icon；`native-sol` 維持 Solana／SOL；wSOL 列維持 Wrapped SOL／wSOL
- [x] native SOL 永遠第一列；有 wSOL 持倉則第二列，不與 native 加總
- [x] combined 兩個成員同一 mint、兩邊都有有限美元時，卡片 `usdLabel` 是合計
- [x] `wallet/` `npm run build` 通過

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/home-tokens.ts` | RPC 持倉列（`fetchRpcHomeTokenRows`） |
| `wallet/src/background/home-tokens-service.ts` | SW 持倉：佇列、Wallet／RPC、Jupiter 合併 |
| `wallet/src/background/index.ts` | `wallet.getHomeTokens` 只在 SW 處理 |
| `wallet/src/shared/commands.ts` | `wallet.getHomeTokens` |
| `wallet/src/shared/storage-keys.ts` | `heliusApiUrl`、`jupiterApiKey`、`rpcUrl`、`cluster` |
| `wallet/src/popup/main.ts` | popup 只消費 SW 列，不直連 Helius／Jupiter／RPC |
