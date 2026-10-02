# 0.7.0 — Home 持倉改 Wallet Balances／RPC + Jupiter 名稱

- **狀態：** `planned`
- **上游版本：** [0.6.0](../0.6.0/INDEX.md)（助記詞匯入；持倉行為仍疊加 [0.5.0](../0.5.0/INDEX.md) `owners[]`）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **Backlog：** 原為 0.6.0 持倉契約，改號本版；無獨立 backlog 檔

## 產品句

Home Token **不再**用 Helius DAS `getAssetsByOwner`。有可解析的 Helius `api-key` 且 `cluster === "mainnet"` 時，持倉走 Helius **Wallet API** `GET /v1/wallet/{wallet}/balances`（預設不要 NFT）。否則用 `rpcUrl`：`getBalance` + **Token 與 Token-2022** 的 `getParsedTokenAccountsByOwner`。mainnet 仍打 Jupiter Tokens v2（空 key＝keyless；有 key＝`x-api-key`）；**有回傳的 `name`／`symbol`／`icon` 則覆寫卡片**（native SOL 名稱寫死不覆寫）。隱藏 compressed（RPC／本 Wallet 路徑本來沒有）與 **decimals === 0** 的 SPL（當 NFT）。

## 文件地圖

1. 本檔
2. [docs/token-holdings-how.md](./docs/token-holdings-how.md)
3. 上游：[0.5.0 combined-how](../0.5.0/docs/combined-how.md)（`owners[]` 串行加總）、[0.4.0 token-data-how](../0.4.0/docs/token-data-how.md)（佇列／TTL／Jupiter 批大小；**本版推翻** DAS 與「禁止 Jupiter 改名稱」）
4. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| Settings | **不**新增欄位。仍用 `heliusApiUrl`、`jupiterApiKey`、`rpcUrl`、`cluster` |
| 何時 Wallet API | `heliusApiUrl.trim()` 非空，且能從 URL query 解析 `api-key`（或 `apiKey`），且 **`cluster === "mainnet"`**。Host 寫死 `https://api.helius.xyz`。認證：query `api-key` 與 header `X-Api-Key` 同值。**禁止**把使用者 key 寫進 repo |
| 何時 RPC | 無 URL、解析不到 key、或 **devnet**（Wallet API 為主網產品；devnet 即使貼了 Helius URL 也走 `rpcUrl`，避免主網餘額畫到 devnet） |
| Wallet 請求 | `GET /v1/wallet/<owner>/balances`：`page` 從 1、`limit` ≤ **100**、`showNfts=false`、`showZeroBalance=false`、`showNative=true`。`pagination.hasMore` 為真則串行下一頁；頁間 ≥500ms。每 owner 走 0.5.0 串行，不平行多 owner |
| Wallet → 列 | native：mint `So11111111111111111111111111111111111111112` → `id: native-sol`、名稱 `Solana`／`SOL`。其餘 mint：`id`＝mint；`decimals === 0` **丟棄**。0 餘額丟棄。Helius `usdValue`／`pricePerToken` 可當底價。`logoUri` 僅 https |
| RPC | `getBalance` + `getParsedTokenAccountsByOwner` **兩次**（legacy Token 與 Token-2022）。合併後同 mint 加總。`raw===0`／`uiAmount===0`／**`decimals===0`** 的非 SOL 不列。無名稱時 mint 縮寫，等 Jupiter 覆寫 |
| 失敗 | Wallet／RPC 該 owner 失敗 → 對齊 0.5.0：整輪失敗、快取＋error。Wallet 429 與 0.4.0 同級有限重試 |
| Jupiter | 推翻 0.4.0「禁止改 name／symbol／icon」。mainnet 打 `/tokens/v2/search`；空 key 不帶 header；有 key 帶 `x-api-key`。對到 mint：finite `usdPrice` 覆寫 USD；`isVerified`／organic 同 0.4.0。**另：**非空 `name`／`symbol`／https `icon` 覆寫該列（**native SOL 不改名稱／symbol／icon**）。查無則保留 Helius 或 mint 縮寫 |
| 非目標延續 | 不引入 Helius／Jupiter SDK；不 persist 持倉；popup 不直連；不畫 NFT 畫廊 |

## 非目標

- 重做 0.5.0 combined CRUD／連線
- DAS `getAssetsByOwner`、Portfolio 其它 Wallet API
- 新 settings 欄、自建 Wallet API host
- Price v3

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.4.0／0.5.0／0.6.0 | 0.7.0 |
|--------------|--------|
| 有 Helius → DAS `getAssetsByOwner` | 有可解析 key 且 mainnet → Wallet Balances |
| RPC 只 legacy Token | RPC Token + Token-2022 |
| Jupiter 不改名稱 | Jupiter 覆寫 name／symbol／icon（SOL 除外） |
| 客戶端濾 NFT interface | `showNfts=false` + `decimals===0` 丟棄 |

## 實作 Track

### Track 1 — RPC Token-2022 + 濾 NFT decimals

- **做：** `fetchRpcHomeTokenRows` 兩 program；`decimals===0` 不列。
- **驗收：** typecheck；無 Helius 時路徑可編譯。

### Track 2 — Wallet Balances 取代 DAS

- **做：** 解析 `api-key`；mainnet 打 Wallet API 分頁；刪／停用 `getAssetsByOwner` 主路徑。
- **驗收：** 無 key → RPC；有 URL 無 query key → RPC（不當 Wallet）；typecheck。

### Track 3 — Jupiter 名稱／icon

- **做：** `applyJupiterTokensV2` 合併 name／symbol／icon。
- **驗收：** typecheck；SOL 列名稱仍為 Solana。

## 驗收（出貨 checklist）

- [ ] 未設 Helius → RPC（兩 token program）+ mainnet Jupiter 名稱
- [ ] 設了含 `api-key` 的 Helius URL 且 mainnet → Wallet Balances，不打 `getAssetsByOwner`
- [ ] `showNfts` 不開；decimals 0 SPL 不畫
- [ ] Jupiter 空 key 仍打、不帶 header
- [ ] `wallet/` `npm run build` 通過
