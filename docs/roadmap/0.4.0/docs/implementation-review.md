# Implementation review — 0.4.0 Airwave Wallet

- **日期：** R1 2026-10-01；**R2 2026-10-01**（Asia/Hong_Kong）
- **輪次：** R2（複審；本檔累加，穩定 ID 未重編號）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`token-data-how.md`](./token-data-how.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **上游契約（行為仍有效）：** [0.3.0 popup-shell-how](../../0.3.0/docs/popup-shell-how.md)、[0.2.0 accounts-home-how](../../0.2.0/docs/accounts-home-how.md)
- **現行程式：** working tree（未 commit）＋錨點檔；不以 chat history 為準

---

## 總評

**無未關閉 HIGH。** 主路徑與 INDEX／HOW 對齊。**INDEX 已 `shipped`、驗收已勾。** `cd wallet && npm run typecheck` 與 `npm run build` 通過。

---

## Findings

### HIGH

（R1–R2 無 HIGH。）

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | Helius `price_info` 可能雙重計價 | **關閉**（R1） | `heliusUsdLabel` 區分 `total_price` 與 `price_per_token` | — |
| M2 | DAS 多頁失敗未合併「已成功頁」進快取 | **關閉**（R1） | `pageError` + 已成功頁 `mergeDasItems` 寫入 `memoryCache` | — |
| M3 | 根目錄 `version.md` 未升至 0.4.0 | **關閉**（R1） | [`version.md`](../../../version.md) 為 `0.4.0` | — |
| M4 | changelog 早於 INDEX shipped | **關閉** | INDEX `shipped`、驗收已勾 |
| M5 | Jupiter 覆寫從 `uiAmountLabel` 字串回推數量 | **關閉**（R2 修復） | `HomeTokenRow.uiAmount` 數值；`applyJupiterPrices` 用 `row.uiAmount` | — |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | TTL 背景 refresh 未實作 | **關閉**（R2 修復） | TTL 命中 `scheduleBackgroundRefresh` 背景 `runRefresh`，本 command 仍只交貨一次 | |
| L2 | 上游 0.3.0 仍 `in progress` | **關閉** | 0.3.0 INDEX 已 `shipped` |
| L3 | `heliusApiUrl` 表單為 `type=url` | **關閉**（R2 修復） | 改 `type="text"`，自建 gateway 可貼 | |
| L4 | `owners.length !== 1` 為恆假分支 | **關閉**（R2 修復） | 移除死碼；本版 API 僅 active 單址 | |
| L5 | RPC fallback 的 `Connection` 未接 `AbortSignal` | **關閉**（R2 修復） | `withAbort` 包住 RPC promise；abort 後丟棄結果（web3 請求本身不可硬取消） | |

---

## R2 重點對照（INDEX／HOW）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| Pending 僅 SW | **符合** | 未改 pending 模型 |
| `heliusApiUrl`／`jupiterApiKey` settings | **符合** | [`storage-keys.ts`](../../../wallet/src/shared/storage-keys.ts) 預設 `""`；[`storage-io.ts`](../../../wallet/src/background/storage-io.ts) 缺欄當 `""`；popup Settings 兩欄 |
| 持倉不寫 `chrome.storage` | **符合** | 僅 [`home-tokens-service.ts`](../../../wallet/src/background/home-tokens-service.ts) `memoryCache` |
| `wallet.getHomeTokens` 非擴充頁 `FORBIDDEN` | **符合** | [`index.ts`](../../../wallet/src/background/index.ts) `wallet.*` + `isExtensionPage` |
| content 不轉發 | **符合** | [`content/index.ts`](../../../wallet/src/content/index.ts) `PAGE_COMMANDS` 無本 command |
| popup 不主路徑直連 RPC／Helius／Jupiter | **符合** | 僅 `sendExtensionRequest("wallet.getHomeTokens")`；無 `Connection` |
| 鎖定不呼叫、不為持倉解鎖 | **符合** | popup `isLocked` early return；SW 不讀 session／不 `unlock` |
| 指紋含 key | **符合** | `owner\|cluster\|heliusApiUrl\|rpcUrl\|jupiterApiKey` |
| TTL 45s、只交貨一次、`force` 略過 | **符合** | 命中直接 `fromCache: true`，不開第二輪 `runRefresh` |
| 無 Helius → RPC fallback | **符合** | `helius.trim()` 空 → `fetchRpcHomeTokenRows` |
| Jupiter 空 key／devnet 不打 | **符合** | `jupKey && cluster === "mainnet"`；base 寫死 `https://api.jup.ag`；`usdPrice` finite 才覆寫 |
| DAS 分頁 limit 1000、頁間 500ms、濾 NFT／0 SPL、SOL 第一列 | **符合** | `PAGE_LIMIT`／`PAGE_DELAY_MS`／`isFungibleItem`／`NATIVE_SOL_ID` |
| 無 Helius／Jupiter npm SDK | **符合** | [`package.json`](../../../wallet/package.json) 無對應依賴；`fetch` + JSON |
| 429 有限重試、失敗保留快取 | **符合** | `fetchWith429Retry` max 3；有 `cached` 則回舊列 + `error` |
| `owners` 長度 1 | **符合（語意）** | 僅 `[activePubkey]`；守衛見 L4 |
| 無整包 CI | **符合 GUIDELINES** | 無 `bun test`／整包測試指令 |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**。**Chrome 未封裝擴充本審查未載入**。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| `cd wallet && npm run build` 成功 | **通過** | R2：`tsc --noEmit && vite build` exit 0（另跑 `npm run typecheck` 通過） |
| Settings 可存 Helius URL 與 Jupiter key（空＝關） | **靜態通過**／**無手驗** | `index.html` + `storage.patchSettings` |
| 無 Helius URL：Token 列表仍可用 `rpcUrl`；無 Jupiter 則 USD「—」 | **靜態通過**／**無手驗** | SW 分支 + RPC `buildHomeTokenRows` 無價 |
| 有 Helius：只見 fungible+SOL；無 compressed NFT；0 SPL 不出現 | **靜態通過**／**無手驗** | `isFungibleItem`、零餘額過濾 |
| 有 Jupiter key（mainnet）：有價覆寫；省略保留 Helius 否則「—」 | **靜態通過**（locale 見 M5）／**無手驗** | `applyJupiterPrices` 僅 finite `usdPrice` 覆寫 |
| devnet：不打 Jupiter | **靜態通過**／**無手驗** | `cluster === "mainnet"` 門檻 |
| 快速開關 popup／切帳不平行多輪 DAS | **靜態通過**／**無手驗** | 300ms 去抖、`homeAssetsRequestGen`、SW `inFlight` |
| 429／斷網：列表不清成空白（若曾成功） | **靜態通過**／**無手驗** | popup `hadRows`；SW `cached` |
| content 白名單無 token refresh command | **靜態通過** | `PAGE_COMMANDS` |
| 文件與 changelog 無真實 API key | **靜態通過** | 抽樣無密鑰字面 |

### Track 對照（靜態）

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 Settings schema + 表單 | **是** | |
| 2 SW 佇列、快取、DAS | **是** | |
| 3 Jupiter + Home + logo | **是** | M5 為 locale 邊界 |
| 4 拋光 | **部分** | `package.json`／`version.md` 0.4.0；changelog 已寫但 INDEX 未 shipped（M4） |

---

## 測試結果

**無整包測試指令**（GUIDELINES：尚無整包 CI；禁止假設 `bun test`）。本版 INDEX 指定 `cd wallet && npm run build`（內含 typecheck）。

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | **通過** |
| R2 | `npm run typecheck` | `wallet/` | **通過**（`tsc --noEmit`） |
| R2 | `npm run build` | `wallet/` | **通過**（vite ~1.50s，exit 0） |
| R1–R2 | Chrome 載入 `wallet/dist`、INDEX 手驗清單 | — | **未執行**（審查環境無法載入擴充） |
| R1–R2 | DevTools 確認無 key 時無 `api.jup.ag` | — | **未執行** |
| R1–R2 | 本機 Helius URL／Jupiter key 手驗 | — | **未執行** |

未在瀏覽器走完的 INDEX 手驗：Settings 存檔、空／有 Helius、有／無 Jupiter、devnet 無 Jupiter 請求、快速開關 popup／切帳手感、429／斷網列表保留、icon 載入失敗回退。

隱私：本報告未寫入助記詞、私鑰、密碼、真實 API key／個人 gateway。

---

## 修復追蹤

| ID | 級 | 狀態 | 關閉依據 |
|----|----|------|----------|
| M1 | MEDIUM | **關閉** | `heliusUsdLabel` |
| M2 | MEDIUM | **關閉** | 多頁部分合併 + `pageError` |
| M3 | MEDIUM | **關閉** | `version.md` 0.4.0 |
| M4 | MEDIUM | **關閉** | INDEX shipped |
| M5 | MEDIUM | **關閉** | `uiAmount` + Jupiter 乘數 |
| L1 | LOW | **關閉** | `scheduleBackgroundRefresh` |
| L2 | LOW | **關閉** | 0.3.0 shipped |
| L3 | LOW | **關閉** | Helius `type=text` |
| L4 | LOW | **關閉** | 移除 owners 死碼 |
| L5 | LOW | **關閉** | `withAbort` on RPC |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| R1 | 2026-10-01 | 無 HIGH；build 通過；M1–M3 關閉；手驗未做 |
| R2 | 2026-10-01 | 無 HIGH；typecheck+build 通過；新增 M5（Jupiter locale 解析）、L4／L5；手驗仍未做 |

---

## 給父 agent（R2 摘要）

- **總評：** 0.4.0 主契約路徑到位，無未關 HIGH；build／typecheck 通過；Chrome 手驗未做，不宜 shipped。
- **未關閉 HIGH：** 無。
- **應修 MEDIUM：** 僅 M4 待手驗後 shipped（非碼缺陷）；M5 已關。
- **測試：** `cd wallet && npm run build` **通過**；無整包測試指令；INDEX Chrome 手驗 **未走完**。
- **報告：** [`docs/roadmap/0.4.0/docs/implementation-review.md`](./implementation-review.md)
