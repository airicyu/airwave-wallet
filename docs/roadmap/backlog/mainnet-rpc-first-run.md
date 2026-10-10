# Mainnet RPC 未設定＋首次帳戶後短引導 — backlog

已排進 [0.29.0](../0.29.0/INDEX.md)。本檔只留構想；契約以該版 INDEX 為準。不要塞進 [0.28.0](../0.28.0/INDEX.md)（Activity 翻頁，別人在做）。Chrome 商店公開列出前應先出貨 0.29.0。

> 2026-10-10：Chrome 商店使用者建完錢包後不知道要自備 Mainnet RPC。官方 `api.mainnet-beta.solana.com` 對不少方法拒絕／限流，當預設等於假裝已設定。

## 通道（硬邊界）

兩條路**不要互相當後備**：

| 用途 | 設定欄 | 例子 |
|------|--------|------|
| 一般 JSON-RPC（`getBalance`、模擬、送出等） | 該 cluster 的 **RPC**（`rpcByCluster`／`rpcUrl`） | 自訂節點、或使用者自己的 Helius **RPC** URL（若他們選用） |
| Helius enhanced（Activity 等） | **Helius API URL** | `api.helius.xyz`／enhanced REST |

禁止：有 Helius API 就拿去打 `getBalance`；RPC 打不通就改打 Helius API。

必填／選填：

- **Mainnet RPC：必填。** 沒有自訂 RPC 就不能在 Mainnet 查餘額、模擬、送出。
- **Helius API URL：選填。** 只影響 enhanced（Activity 等）。沒填不擋 Mainnet；有填也不能代替 RPC。
- **Jupiter API key：選填。** 名稱／報價，與 RPC 無關。

使用者可以 RPC 用自己的商、Helius 留空。

## 現況

- Devnet 無自訂 RPC 時 `effectiveRpcUrl` 回 `https://api.devnet.solana.com`（仍可用）。
- Mainnet 無自訂 RPC 時回 `https://api.mainnet-beta.solana.com`，錢包仍發一般 RPC，常見 403，Home 像壞掉。
- Settings 網路列把官方 Mainnet URL 顯示成摘要，像正在用且能用。
- `heliusApiUrl` 只給 enhanced（見 `helius-api-target.ts`：不當 JSON-RPC）。

## 產品意向

**Devnet：** 繼續預設公用 RPC，行為不變。

**Mainnet：** 該 cluster **沒有自訂 RPC**（`rpcByCluster.mainnet` 無有效 active URL）＝ **RPC 未設定**。不要回退官方公用節點，不要默默 `fetch` 它。Home（餘額／持倉／需一般 RPC 的路徑）停住，引導去 Settings → RPC 填一條。在填好之前 Mainnet 不能當已就緒。Helius 有沒有填**不**改變這件事。

**首次引導：** 建好或匯入**第一個**帳戶之後一屏短文（不要輪播）：Mainnet **必須**自備 RPC；Helius API 與 Jupiter 都是選填。主行動進 RPC 設定。可以暫時略過引導屏，但略過後若人在 Mainnet 且 RPC 未設定，Home 仍停住、同一句去填 RPC，不要只顯示 HTTP 403。

之後切到 Mainnet 而 RPC 仍未設定：同一種停住，不必再出一次「首次」全屏。

## 開工前仍須拍板（排進 INDEX 時）

- `effectiveRpcUrl` 在 Mainnet 未設定時回傳什麼（空字串 vs 哨兵）以及 SW 哪些命令直接拒絕、不打網路。
- 已安裝使用者目前 `rpcUrl` 已是官方 Mainnet 公用 URL：要不要當成未設定（建議要）。
- 引導文案三語與是否連到 Helius 申請頁（外連）。
- 概念稿是否先走 `docs/design-demos/`（新全屏引導頁須符合 design-principles 頁殼）。

## 非目標（構想層）

- 把 Helius API URL 自動寫進 RPC 清單
- 內建 Airwave 代付的 Mainnet RPC
- 改 Activity 的 Helius enhanced 契約
- 導覽輪播、獨立 Help 站
