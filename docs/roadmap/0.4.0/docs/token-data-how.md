# HOW — Token 資料源（0.4.0）

`HomeTokenRow` 欄位繼承 [0.3.0 popup-shell-how](../../0.3.0/docs/popup-shell-how.md)。本版持倉／名稱／icon／Helius 底價由 DAS（或 RPC）組裝；Jupiter 只覆寫 USD 與認證欄。增量：

```ts
type HomeTokenRow = {
  id: string;
  name: string;
  symbol: string;
  uiAmount: number;
  uiAmountLabel: string;
  usdLabel: string;
  usdTotal?: number;
  iconLetter: string;
  iconUrl?: string;
  isVerified?: boolean;
  organicScore?: number;
  organicScoreLabel?: string;
};
```

顯示規則不重寫：0 SPL 不畫；SOL 0 仍第一列；沒價 → `usdLabel === "—"`。

**排序（組列完成、Jupiter 覆寫 USD 之後、交貨前）：** 見 INDEX。`sortHomeTokenRows`：`native-sol` 抽出置頂；其餘比較 `usdTotal`（有限數字高→低）；缺 `usdTotal` 視為無有效 USD，排在有 USD 的 SPL 後面；最後 `symbol.localeCompare(..., { sensitivity: "base" })`。勿從 `usdLabel` 字串回推為主路徑。

## Settings 增量

```ts
type Settings = {
  cluster: "devnet" | "mainnet";
  rpcUrl: string;
  heliusApiUrl: string; // 預設 ""
  jupiterApiKey: string; // 預設 ""
};
```

`storage.patchSettings` 可部分更新；缺欄讀取時當 `""`。Jupiter key 在表單用 password 型輸入；storage 仍明文。空 key **仍**在 mainnet 打 Tokens v2（不帶 header）。

## Command

名稱鎖定為 **`wallet.getHomeTokens`**（加入 `commands.ts` 聯集）。

- 僅 popup → SW。content **不**轉發。SW 對非擴充 origin 回 `FORBIDDEN`。
- Payload：可空；SW 用 **active** 公鑰 + 目前 settings。無 active → `{ rows: [], error?: string }`，不打 DAS／Jupiter。
- 回傳：`{ rows: HomeTokenRow[], error?: string, fromCache?: boolean }`。
- 0.3.0 鎖定只見 `#locked`：popup **不應**在鎖定態呼叫本 command。SW 不因本 command 解鎖 vault；持倉查詢不需私鑰。

內部 **`owners: string[]` 本版長度必須為 1**（`[activePubkey]`）。長度不是 1 → **不打網**，回 `{ rows: [], error: "..." }`（避免誤打多地址）。DAS／RPC 對該單一 owner 走同一 pipe。**禁止**多地址加總。

Popup：開 Home／切帳／點刷新 → 去抖後呼叫。已有上一輪成功列時，loading **不得**先把列表清成空白；僅從未成功過才可只顯示 loading。強制刷新：payload `{ force: true }`（略過 TTL）。

TTL 命中：本次回 `{ rows: 快取, fromCache: true }`。SW **可以**在記憶體背景 refresh，**本 command 不再第二次送結果**（下次呼叫才看到新列）。禁止把列寫進 `chrome.storage` 或廣播各 tab。

## SW 單佇列

```text
若已有 in-flight 且指紋相同 → 可合併等待同一 Promise
若指紋不同（換帳戶／換 URL／換 key）→ abort 舊的，開新的
```

指紋與快取鍵（記憶體，勿 log key）：`ownersJoin|cluster|heliusApiUrl|rpcUrl|jupiterApiKey`（**含 key 本體**，換 key 立即失效舊價；本版 `ownersJoin` 即單一公鑰）。

TTL 建議 45s。強制刷新略過 TTL，仍走佇列與 429。Track 2 分頁可用 stub／假第二頁證明串行，不必真 1000 資產。

## DAS

`POST heliusApiUrl` JSON-RPC：

```json
{
  "jsonrpc": "2.0",
  "id": "airwave-das",
  "method": "getAssetsByOwner",
  "params": {
    "ownerAddress": "<active pubkey>",
    "page": 1,
    "limit": 1000,
    "displayOptions": {
      "showFungible": true,
      "showNativeBalance": true
    }
  }
}
```

（若 Helius 欄位路徑調整，行為仍須：fungible + native SOL、能分頁。）

**native SOL：** 讀各頁（或首頁）結果上的 **`nativeBalance`**（或當時文件等價：lamports）。**不要**只靠 `items` 裡碰巧出現的 SOL。lamports 缺省當 0，仍產出第一列。

合併各頁 `items`：留下 fungible（interface／`token_info` 等）；**排除** compressed NFT 與普通 NFT。amount／uiAmount 為 0 的 **非 SOL** 丟掉。

正規化後與 0.3.0 相同：`id`＝`"native-sol"` 或 mint；**同 mint 一列**（加總最小單位再格式化；DAS 已唯一則一列）。SOL 列固定第一。缺 symbol → mint 縮寫。

`usdLabel`：先填 Helius `token_info.price_info`（SOL 用 native 價若有）。finite 數字 → 格式 `"$12.34"`（兩位小數、前綴 `$`）。否則 `"—"`。

HTTP 429：該頁最多再試 **2** 次（含第一次共最多 **3** 次 HTTP）。用 `Retry-After` 秒數，否則指數退避（如 500ms、1s）。**任一頁**在用盡該頁重試後仍 429／網路失敗 → **停止後續頁**，回快取（若有）+ `error`。整輪 **不另開** 第三次從頭分頁；成功頁已合併進記憶體者可進快取。非 429 的 4xx／無法解析 JSON：該頁不重試，整輪停、回快取 + `error`。

## RPC fallback

`heliusApiUrl.trim() === ""`：SW 用 `rpcUrl` 做 0.3.0 相同 `getBalance` + `getParsedTokenAccountsByOwner`（legacy Token program），再套同一正規化（含同 mint 加總）。此路徑 **沒有** Helius 價。

## Jupiter Tokens v2（覆寫 先前 Price v3 方案）

僅當 `cluster === "mainnet"`。**禁止**本輪再打 `/price/v3`。**禁止**把產品 Jupiter key 寫進原始碼或 git。

`GET https://api.jup.ag/tokens/v2/search?query=`  
`query`＝當輪持倉 mint（已濾 0 SPL），逗號拼接，每批 ≤**100**。native SOL 列改送 wrapped mint。文件：[Token Information](https://developers.jup.ag/docs/tokens/token-information)。

回應為 **陣列**；以物件 `id` 對 mint。本版**只讀**：`usdPrice`、`isVerified`、`organicScore`、`organicScoreLabel`。忽略 name／symbol／icon。

**Header：** `jupiterApiKey.trim()` 非空才設 `x-api-key`。空＝完全不帶此 header（**keyless：0.5 rps**／30 次／分）。有 key＝`x-api-key`（官方 **Free 1 rps**／60 次／分起；Developer 10、Launch 50、Pro 150——本版一律按 **1 rps** 間隔，不猜方案）。

**批間隔：** 無 key ≥**2000ms**；有 key ≥**1000ms**。第一批不等待。429 與 DAS 同級有限次退避。401／403：該輪 Jupiter 略過，列維持 DAS／RPC，回 `error` 字串。

**合併（對到的 mint）：**

- **不要**寫入 Jupiter `name`／`symbol`／`icon`。
- finite `usdPrice` → `usdLabel` 與 `usdTotal = usdPrice * uiAmount`；否則不動既有 Helius／「—」。
- `isVerified === true` → `isVerified: true`；否則不畫勾。
- finite `organicScore` → 寫入；UI 四捨五入整數。可存 `organicScoreLabel` 當 title。無此欄不畫分。

Jupiter 整輪失敗（網路／用盡 429）：與 0.4.0 其他路徑相同，保留快取或本輪已組好的持倉列 + error。

Popup：名稱列為「name +（勾）+（分數）」；icon 規則同前（https img、error 回退字母）。

## 格式化

有價一律 `"$"` + 至少兩位小數（例 `$12.34`、`$0.00`）。禁止 `NaN`。沒報價只能 `"—"`，不可把沒報價畫成 `$0`。
