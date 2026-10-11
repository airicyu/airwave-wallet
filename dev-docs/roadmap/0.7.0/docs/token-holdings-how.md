# HOW — 0.7.0 持倉資料源

繼承 0.4.0 的 `wallet.getHomeTokens`、SW 單佇列、TTL 45s、指紋、429、Jupiter 批 ≤100 與間隔。繼承 0.5.0 `owners[]` **串行**、失敗整輪停、`members` 合併。跨 owner 同一 `id`：數量仍照 0.5.0 加總；有限 `usdTotal` **加總**；該 id 完全沒有有限 `usdTotal` 時，才用合併後 UI 數量 × 有限單價。算出有限總額之後，用與單 owner 相同規則重寫該列 `usdLabel`；沒有有限總額則 `usdLabel` 為「—」。Jupiter finite `usdPrice` 在這次合併之後覆寫整列（`usdPrice` × 合併後 UI 數量）。`members` 仍只含該 owner 該 id 數量 > 0 的列。本檔只寫**推翻 DAS** 的增量。

## 解析 Helius key

`heliusApiUrl` 仍是使用者貼的整條 URL。用 `URL` 讀 query。同時有兩者時，非空 `api-key` 優先，否則非空 `apiKey`。解析失敗、不是可解析 URL、或 key 空 → **不當**已設定 Helius，走 `rpcUrl`。

**不要**把整段 URL 拿去 POST JSON-RPC 當本版持倉主路徑。

Wallet 僅 mainnet：

```
GET https://api.helius.xyz/v1/wallet/{owner}/balances
  ?api-key=<key>&page=<n>&limit=100&showNfts=false&showZeroBalance=false&showNative=true
Header: X-Api-Key: <key>
```

`pagination.hasMore === true` 才 `page+1`。缺 `pagination` 或 `hasMore` 不是 `true` 則停止翻頁。合併各頁 `balances[]`。忽略 `nfts`（不應出現）。

頁級 JSON 無法解析、根不是物件、或缺 `balances` 陣列 → **該 owner 失敗**（不把本輪已拉到的部分頁當成功交貨；整輪對齊 0.5.0：舊快取＋error）。單筆缺 `mint`、或 `balance`／`decimals` 不是有限數 → **略過該筆**。429：該頁最多再試 2 次（含第一次共最多 3 次 HTTP）；`Retry-After` 或指數退避。用盡仍失敗則停止後續頁，回快取＋error。

`balance` 是 **UI 數量**（不是 raw）。Wallet `balances[]` 裡 mint 為 `WRAPPED_SOL_MINT` 的列 **丟掉**（含 `showNative` 那筆）。native 與 wSOL 由 `rpcUrl` 補上：`getBalance` + `getParsedTokenAccountsByOwner({ mint: WRAPPED_SOL_MINT })`（不必掃整份 Token-2022）。同一 owner、同一 mint：`balance` 加總；有限 `usdValue` **加總**為 `usdTotal` 並格式化 `usdLabel`；該 mint 完全沒有有限 `usdValue` 時，才用加總後的 UI 數量 × 有限 `pricePerToken`。沒有有限總額則 `usdLabel` 為「—」，禁止畫成 `$0`。`decimals === 0` 與 0 餘額丟棄。

## RPC

```
getBalance
getParsedTokenAccountsByOwner(TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
getParsedTokenAccountsByOwner(TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb)
```

`getBalance` 或任一次 token program 失敗 → 該 owner 失敗，禁止只合併成功的那一個 program。帳戶陣列串接後 `buildHomeTokenRows`。跳過非 native 的 `decimals === 0`。**總是**一列 `native-sol`（lamports 可為 0；`Solana`／`SOL`）。wrapped mint 數量 > 0 才另列：名稱 `Wrapped SOL`、symbol `wSOL`。排序：native 第一，wSOL 第二。mainnet Jupiter 可覆寫兩列的 https icon，**不**改這兩列的 name／symbol。

## Jupiter 合併（mainnet）

對到 mint（native 與 wSOL 列都用 wrapped mint 查價／勾／icon）：

| 欄 | 行為 |
|----|------|
| `usdPrice` | 有限 → 覆寫 `usdLabel`／`usdTotal` |
| `isVerified` | true 才寫 |
| `organicScore`／label | 有限／非空才寫 |
| `name`／`symbol` | 非空 → 覆寫，但 **native-sol** 與 **wSOL 列**不改（native＝Solana／SOL；wSOL＝Wrapped SOL／wSOL）。其它 mint 的 symbol 有覆寫時重算 `iconLetter` |
| `icon` | `https:` → `iconUrl`（含 native 與 wSOL） |

devnet 不打 Jupiter。
