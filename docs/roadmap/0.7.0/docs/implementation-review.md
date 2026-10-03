# Implementation review — 0.7.0 Airwave Wallet

- **日期：** R1 2026-10-03（Asia/Hong_Kong）
- **輪次：** R1（初審）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`token-holdings-how.md`](./token-holdings-how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；錨點見 INDEX；不以 chat history 為準

---

## 總評

0.7.0 持倉主路徑（Wallet Balances／RPC 雙 program／Jupiter 覆寫非 SOL 元資料）與 INDEX／HOW **靜態對齊良好**；倉庫內已無 `getAssetsByOwner`；popup 僅經 `wallet.getHomeTokens` 消費 SW。**`cd wallet && npm run build` 通過**。本輪 working tree diff 補齊 wrapped SOL 併入 `native-sol`、缺 `balances` 失敗、跨 owner `usdLabel` 加總、Helius `api-key` 優先於 `apiKey` 等契約缺口。**無未關閉 HIGH**。INDEX 驗收多項需 **Chrome／網路手驗**；本輪未載入擴充做端對端。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| — | （無） | — | R1 靜態＋建置未發現違反已定案或架構禁區之阻擋項 | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | 版本號早於 0.7.0 出貨 | **關閉** | 2026-10-03 出貨：INDEX `shipped`、驗收已勾；changelog／version／`package.json` → `0.7.0`。 | — |
| M2 | 路由與第三方 API 行為未做瀏覽器手驗 | **開啟** | Helius Wallet、RPC 雙 program、devnet 不打 Jupiter、Network 面板確認不打 DAS 等，僅能由靜態碼推斷；本輪未執行。 | 出貨前依下方手驗清單在 Chrome 走一遍並在複審更新證據欄。 |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | 無針對 0.7.0 的窄測／單元測 | **開啟** | `extractHeliusApiKey`、`mergeWalletBalances`、`mergedUsdFields` 等僅靠 typecheck；INDEX Track 驗收亦只寫 typecheck。非契約硬需求。 | 可選：日後在 INDEX 寫明測試指令後再補。 |
| L2 | 同批 diff 含 roadmap 契約檔 | **開啟** | `INDEX.md`、`token-holdings-how.md`、`HANDOFF.md` 與程式同 tree 變更；審查以 INDEX 正文為準，與程式一致。 | 出貨時一併 commit 文件＋碼。 |

---

## R1 重點對照（INDEX／HOW／禁區）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| 有可解析 key 且 `cluster === "mainnet"` → Wallet API | **符合** | `fetchSingleOwnerRows`：`extractHeliusApiKey` + `mainnet` → `fetchWalletApiHomeTokenRows`；host `https://api.helius.xyz`（`WALLET_API_ORIGIN`） |
| 否則 → `rpcUrl`（含 devnet、無 key、壞 URL） | **符合** | key 空或 `cluster !== "mainnet"` → `fetchRpcHomeTokenRows` |
| 無 `getAssetsByOwner` | **符合** | `wallet/` 全庫 grep 無匹配 |
| RPC：`getBalance` + legacy + Token-2022 | **符合** | [`home-tokens.ts`](../../../../wallet/src/shared/home-tokens.ts) `fetchRpcHomeTokenRows`；`Promise.all` 任一 reject 則整 owner 失敗 |
| RPC：wrapped mint 併入 `native-sol` | **符合** | `buildHomeTokenRows` 累加 `WRAPPED_SOL_MINT` raw 至 SOL 列（本輪 diff） |
| Wallet：query `api-key`＋`X-Api-Key`、分頁參數 | **符合** | `fetchWalletBalancesPage`：`limit=100`、`showNfts=false`、`showZeroBalance=false`、`showNative=true`；`hasMore === true` 才翻頁；`PAGE_DELAY_MS=500` |
| Wallet：缺 `balances` 陣列 → owner 失敗 | **符合** | 本輪 diff：非陣列 throw（不再當 `[]` 成功） |
| Wallet：總是 `native-sol` 列（可為 0） | **符合** | `mergeWalletBalances` 固定先建 `NATIVE_SOL_ID` 列 |
| `decimals === 0` 非 SOL 不列 | **符合** | RPC `buildHomeTokenRows`；Wallet `mergeWalletBalances` |
| owners 串行、不平行多 owner | **符合** | `runRefresh` `for (const owner of owners)` |
| mainnet Jupiter：`/tokens/v2/search`；空 key 不帶 header | **符合** | `applyJupiterTokensV2`：`if (key) headers["x-api-key"]` |
| Jupiter 覆寫非 SOL name／symbol／icon；SOL 不改名 | **符合** | `row.id !== NATIVE_SOL_ID` 才 patch name／symbol／icon |
| devnet 不打 Jupiter | **符合** | `if (settings.cluster === "mainnet")` 才 `applyJupiterTokensV2` |
| 跨 owner 有限 `usdTotal` 加總並重寫 `usdLabel` | **符合** | `mergedUsdFields` + `mergeMultiOwnerRows`（本輪 diff） |
| Jupiter 在合併後覆寫整列 USD | **符合** | `runRefresh` 先 `mergeMultiOwnerRows` 再 `applyJupiterTokensV2` |
| 持倉不 persist；popup 不直連 Helius／Jupiter／RPC | **符合** | SW `memoryCache`；popup `sendExtensionRequest("wallet.getHomeTokens")` |
| typed command `wallet.getHomeTokens` 僅 SW | **符合** | [`background/index.ts`](../../../../wallet/src/background/index.ts) |
| Pending／custody／廣播禁區 | **符合** | 本版未改 pending 主模型；無持倉寫入 `chrome.storage` |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**；標 **需手驗** 者本審查未在 Chrome 執行。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| 未設 Helius → RPC（兩 token program）+ mainnet Jupiter 名稱 | **靜態通過**／**需手驗** | `extractHeliusApiKey` 空 → RPC；mainnet 仍跑 Jupiter |
| 含 `api-key` 的 Helius URL 且 mainnet → Wallet Balances，不打 `getAssetsByOwner` | **靜態通過**／**需手驗** | `fetchWalletApiHomeTokenRows`；無 DAS |
| `showNfts` 不開；decimals 0 SPL 不畫 | **靜態通過**／**需手驗** | query `showNfts=false`；濾 `decimals===0` |
| Jupiter 空 key 仍打、不帶 header | **靜態通過**／**需手驗** | 空 `jupiterApiKey` 仍 fetch；headers 無 `x-api-key` |
| URL 無 key／壞 URL → RPC，不打 Wallet、不打 DAS | **靜態通過**／**需手驗** | `extractHeliusApiKey` → null → RPC |
| `cluster === "devnet"` 即使有 key → `rpcUrl`，不打 Jupiter | **靜態通過**／**需手驗** | `mainnet` 門檻於 Wallet 與 Jupiter |
| mainnet Jupiter 覆寫非 SOL name／symbol／icon；`native-sol` 維持 Solana／SOL | **靜態通過**／**需手驗** | `applyJupiterTokensV2` 分支 |
| RPC 與 Wallet 都把 wrapped SOL 併進 `native-sol` | **靜態通過**／**需手驗** | `buildHomeTokenRows` + `mergeWalletBalances` |
| combined 兩成員同 mint、兩邊有限美元 → `usdLabel` 合計 | **靜態通過**／**需手驗** | `mergedUsdFields` 加總 `usdTotal` |
| `cd wallet && npm run build` | **通過** | 見測試記錄 |

### Track 對照（靜態）

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 RPC Token-2022 + 濾 NFT decimals | **是** | 雙 program；`decimals===0` |
| 2 Wallet Balances 取代 DAS | **是** | 分頁、key 解析、無 DAS |
| 3 Jupiter 名稱／icon | **是** | SOL 列名稱不覆寫 |

---

## 測試記錄

**無整包測試指令**（GUIDELINES；INDEX 僅指定 `npm run build` ＋手驗段落）。**未假設 `bun test`。**

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | **通過**（`tsc --noEmit && vite build`，exit 0，~1.4s） |
| R1 | Chrome 載入 `wallet/dist`、INDEX 手驗句 | — | **未執行** |

### 需瀏覽器手驗（對 INDEX 驗收）

1. Settings 清空 Helius URL、mainnet：DevTools Network 應見 RPC `getBalance` + 兩次 `getParsedTokenAccountsByOwner`（legacy + Token-2022），無 `getAssetsByOwner`、無 `api.helius.xyz/v1/wallet`。
2. 貼含非空 `api-key` 的 Helius URL（勿把真 key 寫進報告）、mainnet：應見 `GET https://api.helius.xyz/v1/wallet/.../balances`，無 DAS。
3. 同 URL 但 `cluster=devnet`：僅 RPC，無 Wallet、無 `api.jup.ag`。
4. `heliusApiUrl` 非空但無 query key（或不可解析 URL）：RPC 路徑。
5. Home：確認無 `decimals===0` SPL 卡片；SOL 列在零餘額時仍存在。
6. mainnet、空 Jupiter key：仍請求 Jupiter search，Request headers 無 `x-api-key`；非 SOL 代幣名稱可被 Jupiter 覆寫，SOL 仍顯示 Solana／SOL。
7. combined 兩帳戶同 mint 且兩邊皆有美元：卡片 `usdLabel` 為兩邊合計（可與單帳相加對照）。
8. wrapped SOL 持倉時僅一張 SOL 卡，無第二張 wrapped mint 卡。

隱私：本報告未寫入助記詞、私鑰、密碼、真實地址或 API key。

---

## 修復追蹤

| ID | R1 後動作 |
|----|-----------|
| HIGH | — |
| M1 | **關閉**（shipped 2026-10-03） |
| M2 | 待 Chrome 手驗後複審關閉或留證 |
| L1–L2 | 記錄即可 |

---

## 歷審摘要

| 輪次 | 日期 | 摘要 |
|------|------|------|
| R1 | 2026-10-03 | 初審：靜態＋build 通過；無 HIGH；M1 版本／M2 手驗待辦 |

---

## 現碼抽樣（本輪 diff 相關）

### Helius key 優先序（Track 2）

```138:149:wallet/src/background/home-tokens-service.ts
export function extractHeliusApiKey(heliusApiUrl: string): string | null {
  const t = heliusApiUrl.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    const fromApiKey = u.searchParams.get("api-key")?.trim();
    if (fromApiKey) return fromApiKey;
    const fromApiKeyAlt = u.searchParams.get("apiKey")?.trim();
    return fromApiKeyAlt || null;
  } catch {
    return null;
  }
}
```

### RPC wrapped SOL 併列（Track 1）

```119:144:wallet/src/shared/home-tokens.ts
    if (mint === WRAPPED_SOL_MINT) {
      wrappedSolRaw += raw;
      wrappedSolDecimals = tokenAmount.decimals;
      continue;
    }
    // ...
  if (wrappedSolRaw > 0n) {
    const wrappedUi =
      wrappedSolDecimals > 0
        ? Number(wrappedSolRaw) / 10 ** wrappedSolDecimals
        : Number(wrappedSolRaw);
    rows[0] = {
      ...rows[0],
      uiAmount: rows[0].uiAmount + wrappedUi,
      // ...
    };
  }
```

### 跨 owner USD 合計（INDEX 驗收）

```482:507:wallet/src/background/home-tokens-service.ts
function mergedUsdFields(
  perOwner: Map<string, HomeTokenRow>,
  totalUi: number,
): { usdLabel: string; usdTotal?: number } {
  let sum = 0;
  let hasSum = false;
  for (const row of perOwner.values()) {
    if (row.usdTotal != null && Number.isFinite(row.usdTotal)) {
      sum += row.usdTotal;
      hasSum = true;
    }
  }
  if (hasSum) {
    return { usdLabel: formatUsdLabel(sum), usdTotal: sum };
  }
  // ...
}
```
