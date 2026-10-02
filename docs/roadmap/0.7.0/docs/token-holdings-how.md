# HOW — 0.7.0 持倉資料源

繼承 0.4.0 的 `wallet.getHomeTokens`、SW 單佇列、TTL 45s、指紋、429、Jupiter 批 ≤100 與間隔。繼承 0.5.0 `owners[]` **串行**、失敗整輪停、`members` 合併。本檔只寫**推翻 DAS** 的增量。

## 解析 Helius key

`heliusApiUrl` 仍是使用者貼的整條 URL。用 `URL` 讀 query `api-key` 或 `apiKey`。解析失敗或空 → **不當**已設定 Helius，走 `rpcUrl`。

**不要**把整段 URL 拿去 POST JSON-RPC 當本版持倉主路徑。

Wallet 僅 mainnet：

```
GET https://api.helius.xyz/v1/wallet/{owner}/balances
  ?api-key=<key>&page=<n>&limit=100&showNfts=false&showZeroBalance=false&showNative=true
Header: X-Api-Key: <key>
```

`hasMore` 則 `page+1`。合併各頁 `balances[]`。忽略 `nfts`（不應出現）。

SOL：`mint === WRAPPED_SOL_MINT` → `native-sol`。同 mint 加總 `balance`。`usdValue` 有限則當 `usdTotal` 底；否則 `pricePerToken * balance`。

## RPC

```
getBalance
getParsedTokenAccountsByOwner(Tokenkeg…)
getParsedTokenAccountsByOwner(TokenzQdBNb…)
```

帳戶陣列串接後 `buildHomeTokenRows`。跳過 `decimals === 0`。

## Jupiter 合併（mainnet）

對到 mint（SOL 用 wrapped 只查價／勾／分，**不**改名稱）：

| 欄 | 行為 |
|----|------|
| `usdPrice` | 有限 → 覆寫 `usdLabel`／`usdTotal` |
| `isVerified` | true 才寫 |
| `organicScore`／label | 有限／非空才寫 |
| `name`／`symbol` | 非空字串 → 覆寫（非 SOL） |
| `icon` | `https:` → `iconUrl`（非 SOL） |

devnet 不打 Jupiter。
