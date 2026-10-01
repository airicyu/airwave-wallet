# Jupiter 認證勾與 Organic Score — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

## 產品意向

Home Token 卡片 **token name 後方**顯示：

1. **認證勾：** Jupiter `isVerified === true` 才畫（未驗證不畫叉，避免誤以為「已掃描安全」）。
2. **Token score：** Jupiter `organicScore`（0–100 數值）。可選同時顯示 `organicScoreLabel`（`high`／`medium`／`low`），但契約應以**數值**為準。

沒有 Jupiter API key、devnet、或該 mint 查無資料 → **不畫勾、不畫分數**（不要假裝 0 分）。

## 資料來源（可行）

| 來源 | 有沒有認證勾／organic score |
|------|------------------------------|
| **Jupiter Tokens API v2** | **有。** `GET https://api.jup.ag/tokens/v2/search?query=` 可查 symbol／name／**mint**。多 mint 用逗號串接，**最多 100**。需 header `x-api-key`（與現有 `jupiterApiKey` 同級）。回傳含 `isVerified`、`organicScore`、`organicScoreLabel`、`tags`（如 `verified`）。文件：[Tokens](https://developers.jup.ag/docs/tokens)、[search](https://developers.jup.ag/docs/api-reference/tokens/search) |
| **Helius DAS** | **沒有** Jupiter 那套 verified tick／organic score。`getAssetsByOwner` 有 name／symbol／`token_info.price_info`；NFT 的 `creators[].verified` **不是** Jupiter 認證。 |

本功能應走 **Jupiter Tokens v2**，**不要**指望 Helius 補這兩欄。Price v3 **也沒有**這兩欄。

0.4.0 INDEX **非目標**曾寫「Jupiter Tokens v2 搜 metadata」；本構想是**另開功能**（認證＋score），排進未來版本時須在 INDEX **明示推翻／增量**該非目標。

## 實作約束（排程時寫進 INDEX）

- 既有 `jupiterApiKey`；空＝不呼叫 Tokens v2（與 Price 相同：禁止 keyless）。
- `cluster === "devnet"` 不打（mainnet 認證／分數易誤導）。
- **一律 SW `fetch`**，進現有少打／排隊／429 規則；popup 只渲染列上的欄位。
- 查詢 mint 列表＝當輪已畫出的持倉（SOL 用 wrapped mint）；批大小 ≤100。
- **快取（意向）：** `isVerified`／`organicScore` **很少變**，TTL **至少 1 小時**，可更長（排程時可定 6h／24h）。與持倉 45s TTL **分開**。鍵：mint（+ cluster）。SW 記憶體即可；關瀏覽器丟快取可接受。TTL 內同一 mint **不要**再打 Tokens v2。餘額仍不寫 `chrome.storage` 當真相；認證快取若要跨重啟，須 INDEX 另寫（預設不做）。
- 不引入 Jupiter npm SDK。

## 開工前仍須拍板（排進 INDEX 時）

- score 顯示整數還是一位小數；無分數時完全空白還是「—」。
- 僅 `isVerified` 畫勾，或 `tags` 含 `verified`／`strict` 也算。
- 是否順便用 Tokens v2 的 `name`／`icon` 補 Helius／RPC 缺口（會擴大 scope）。
- 認證／score 快取要 1h、6h 還是 24h；要不要 persist。

## 非目標（構想層）

- Combined（仍歸 [0.5.0](../0.5.0/INDEX.md)）
- 用 Helius 發明假認證
- Token-2022 專用殼、NFT
