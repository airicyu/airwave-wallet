# 0.4.0 — Token 資料源（Helius DAS + Jupiter Tokens v2）

- **狀態：** `shipped`
- **上游版本：** [0.3.0](../0.3.0/INDEX.md)（`shipped`）
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **Backlog：** 已出貨（原 UI／資料源構想已落地 0.3.0／0.4.0）

## 產品句

在 **0.3.0 方案 A Token 卡片**上，改為可選 **Helius DAS** 查 **fungible + native SOL**（名稱、icon、Helius 價）。**mainnet** 再打 Jupiter **Tokens v2 search**，**只**補 `isVerified`、organic score／label，以及有限 `usdPrice` 時覆寫 USD。名稱／symbol／icon **不**用 Jupiter 覆寫。無 API key＝**keyless、0.5 rps**；有 portal key（含 Free）＝header、按 1 rps 保守。沒設 Helius 則 RPC 持倉。本版**不**打 Price v3。

## 文件地圖

1. 本檔
2. [docs/token-data-how.md](./docs/token-data-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.3.0 popup-shell-how](../0.3.0/docs/popup-shell-how.md)（`HomeTokenRow`）、[0.2.0 accounts-home-how](../0.2.0/docs/accounts-home-how.md)（RPC fallback）
5. [HANDOFF.md](./HANDOFF.md)

## 已定案

| 題 | 決定 |
|----|------|
| 列表排序 | **原生 SOL 永遠第一列**（即使 USD 為「—」或為 0）。其餘 SPL：有限 **持倉 USD 總額**（`usdTotal`＝單價×數量，不是單價）由高到低；同額（或皆無有效 USD）再依 **symbol** 英文字母（不區分大小寫）。`usdLabel === "—"`／無有限 `usdTotal` 的列排在有 USD 的 SPL **之後**、彼此仍依 symbol |
| `rpcUrl` | **保留**；送交易與 **Helius URL 為空時的持倉 fallback**。**不要**與 Helius URL 合併成一欄 |
| `heliusApiUrl` | 新 settings 字串，預設 `""`。使用者貼 **整條** DAS／RPC URL（官方 query `api-key` 或自建 gateway）。**文件禁止**寫真實 key／個人 gateway |
| `jupiterApiKey` | 選填。空＝**keyless**（不帶 header）。有值＝portal key（Free／Developer／更高），header `x-api-key`。禁止把產品 key 寫進套件。擴充**無法**分辨 Free 或付費 |
| Jupiter base URL | **寫死** `https://api.jup.ag`；本版無 `jupiterApiUrl` |
| 有 Helius URL | 持倉用 DAS `getAssetsByOwner`：`showFungible: true`、`showNativeBalance: true`。UI **只畫 fungible + native SOL**；丟棄 compressed／NFT／非 fungible |
| 分頁 | `limit` ≤ **1000**；`page` 從 1 **串行**直到不足一頁。頁間間隔以對齊 DAS 約 **2 rps**（HOW 寫建議 ≥500ms） |
| 無 Helius URL | 持倉＝0.3.0 RPC 正規化；Helius 價不可用 |
| Jupiter 何時打 | `cluster === "mainnet"` 即打（**不**要求 key）。`GET /tokens/v2/search?query=`，mint 逗號拼接，每批 ≤**100**。SOL 用 wrapped mint。**本輪不打 Price v3**。無 header：批間隔 ≥**2000ms**（keyless **0.5 rps**）。有 key：批間隔 ≥**1000ms**（按官方 **Free＝1 rps** 保守；付費檔實際可更快，本版不探測方案、靠 429 退避）。同一 SW 佇列與 429 重試。401／403：保留本輪 Helius／RPC 列 + error，**不清空** |
| Jupiter 覆寫 | **只用** `usdPrice`、`isVerified`、`organicScore`、`organicScoreLabel`。finite `usdPrice` → 覆寫 `usdLabel`（單價×數量），否則保留 Helius／「—」。`isVerified === true` 才畫勾。有限 score 才畫整數分。**禁止**用 Jupiter 的 name／symbol／icon 改卡片（那是 DAS／RPC 的欄）。twitter／stats／mcap 不進卡片 |
| cluster／devnet | `cluster === "devnet"` 時 **不呼叫 Jupiter**（mainnet 價易誤導）；持倉仍可走 Helius **devnet** URL 或 RPC fallback |
| 誰發請求 | DAS、Jupiter、**以及 RPC fallback** **一律** service worker `fetch`。popup **只**呼叫 `wallet.getHomeTokens` 消費列。**禁止** popup 主路徑直連 Helius／Jupiter／`rpcUrl` 組持倉（關 popup 不重複開火、單一佇列） |
| 節流 | **少打、排隊、可重試**。SW **同時只一輪** in-flight refresh（指紋見 HOW）。開 popup／切帳去抖；新輪次 `AbortController` 取消上一輪。TTL（HOW 建議 45s）。TTL 內：本次 command **只帶回快取列**（`fromCache: true`），**可**在 SW 記憶體背景刷新，**本輪不再第二次交貨**（禁止 persist／全 tab 廣播列）。強制刷新按鈕略過 TTL 但仍走佇列與 429。429：`Retry-After` 或指數退避（有限次）；失敗 **保留快取列** + 錯誤訊息，**不清空**成功過的列表 |
| 快取位置 | **SW 記憶體**（可選）；**不要**把餘額當 `chrome.storage` 真相（關瀏覽器丟快取可接受） |
| Settings UI | Settings 兩欄：Helius API URL、Jupiter API key（遮罩）。空 Jupiter **不是**關閉查詢，只是不帶 header。存檔走 `storage.patchSettings` |
| 依賴 | **不**引入 Helius／Jupiter npm SDK；`fetch` + JSON-RPC／HTTP |
| 隱私 | key 在 `airwave.settings.v1` **明文**（與 `rpcUrl` 同級）；changelog／roadmap **不**抄使用者的 URL／key |
| 測試 | 無整包 CI；允許用虛構 URL 測空／錯誤態；真實 key 只在開發者本機手驗，不寫進 repo |
| Combined | **不做**（→ [0.5.0](../0.5.0/INDEX.md)）。查詢管線內部用 `owners: string[]`（本版長度恆 1），串行走同一 pipe；禁止加總多帳戶或讀 combined meta |
| Command | **`wallet.getHomeTokens`**：僅擴充頁；鎖定時 popup 不呼叫；無 active 則空列。content 白名單不加此 command |

## 非目標

- Combined 聚合帳戶／多地址加總（→ [0.5.0](../0.5.0/INDEX.md)）
- 重做 0.3.0 導航／Accounts／Reveal
- Portfolio API、NFT 畫廊、compressed、Token-2022 專用殼
- 自建後端、共用產品內建 API key
- Home 用 Jupiter 覆寫 token 名稱／symbol／icon（仍以 Helius DAS 為準；無 Helius 則 RPC 縮寫）
- Agent、sidebar、simulation

## 開工前仍須拍板

（空）

## 與上一版對照

| 0.3.0 | 0.4.0 |
|-------|--------|
| popup 直連 RPC 持倉 | SW：有 Helius 則 DAS，否則 RPC fallback |
| USD 恆「—」 | Helius 價；mainnet Tokens v2 有 `usdPrice` 才覆寫 |
| 無新 settings | `heliusApiUrl`、`jupiterApiKey` |

## 實作 Track

### Track 1 — Settings schema + 表單

- **做：** `Settings` 兩欄預設空字串；patch／popup 表單；舊資料缺欄當 `""`。
- **不做：** 實際 DAS。
- **驗收：** 存檔後 `onChanged` 可見；空字串可存。

### Track 2 — SW 佇列、快取、DAS 分頁

- **做：** `wallet.getHomeTokens` 回傳 `{ rows, error?, fromCache? }`；串行分頁；濾 NFT／0 SPL；SOL 第一列。
- **不做：** Jupiter。
- **驗收：** 無 URL → RPC fallback 列；有 URL 但 429 → 錯誤+舊快取；limit 模擬需第二頁時串行（可用測試說明，不必真 1000 資產）。

### Track 3 — Jupiter 覆寫 + Home 接線 + logo 回退

- **做：** mainnet Tokens v2（批 ≤100）；無 key 0.5 rps、有 key 較鬆；popup 畫名稱後方勾與分數；不打 Price v3。
- **驗收：** mainnet 無 key 仍請求 `tokens/v2/search`；devnet 不打；Jupiter 不改 DAS 名稱／icon。

### Track 4 — 拋光

- **做：** version `0.4.0`；錯誤文案；手驗記載於實作摘要。
- **驗收：** build；靜態確認 content 不轉發 refresh／key。

## 驗收（出貨 checklist）

- [x] `cd wallet && npm run build` 成功
- [ ] Settings 可存 Helius URL 與 Jupiter key（空＝仍查 Tokens v2、不帶 header）
- [ ] 無 Helius URL：Token 列表仍可用 `rpcUrl`；Tokens v2 失敗或無 `usdPrice` 則 USD 可為「—」
- [x] 有 Helius：只見 fungible+SOL；無 compressed NFT 列；0 SPL 不出現
- [ ] mainnet：Tokens v2 只補勾／score，並在有 `usdPrice` 時覆寫 USD；名稱／icon 仍為 Helius；無 `usdPrice` 保留 Helius 否則「—」
- [x] devnet：不打 Jupiter
- [x] 快速開關 popup／切帳不平行多輪 DAS（邏輯複核＋手感）
- [x] 429／斷網：列表不清成空白（若曾成功）
- [x] content 白名單無 token refresh command
- [x] 文件與 changelog 無真實 API key
- [ ] Home 排序：SOL 第一；其餘有 USD 總額由高到低，無 USD 在後，同組依 symbol

## 手驗指令（整包）

```text
cd wallet && npm install && npm run build
# Chrome 載入 wallet/dist
# Settings：空 Helius → Home 仍有 SOL／SPL（公開 RPC）
# 本機自備 Helius URL（勿寫進 git）→ 刷新列表／icon
# mainnet：無 Jupiter key 仍應有 tokens/v2/search（DevTools）；有 key 則帶 x-api-key
# 切 devnet 確認無 Jupiter 請求
# 卡片：Helius 名稱／icon；verified 勾；organic 整數分；Jupiter 有價才改 USD
# 排序：SOL 頂；其餘 USD 總額高→低；無 USD 在底；同額依 symbol
```

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/storage-keys.ts` | Settings 兩欄 |
| `wallet/src/background/index.ts` | 佇列、DAS、Jupiter、RPC fallback |
| `wallet/src/popup/main.ts` | 改為要 SW 列，不再主路徑直連 DAS |
| `wallet/src/popup/index.html` | Settings 欄位 |
| `wallet/src/shared/commands.ts` | `wallet.getHomeTokens` |
| `wallet/src/content/index.ts` | **不得**新增此 command 到頁面白名單 |
