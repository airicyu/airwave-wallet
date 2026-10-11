# 0.33.0 — 預期變動列與 Jupiter enrichment

契約在 [INDEX](../INDEX.md)。概念稿 [`dev-docs/design-demos/sign-tx-token-trust-ux.html`](../../../design-demos/sign-tx-token-trust-ux.html) 只供對位置。

## `SimulateTxDelta` 形狀（SW → UI）

在既有 `symbol`、`amount`、`sign` 之外：

```ts
type SimulateTxDelta = {
  symbol: string; // SW 內部／fingerprint；SPL 仍為 shortPk(mint)
  amount: string;
  sign: "plus" | "minus";
  kind: "native" | "spl";
  mint?: string; // kind === "spl" 時必填完整 base58
  display?: {
    trust: "verified" | "unverified";
    labelPrimary: string; // UI 主標
    labelMintShort?: string; // 已驗證 SPL 次行；原生省略
    amountSuffix: string; // 差額欄尾綴
    iconUrl?: string; // 僅 https
    iconLetter: string; // 無圖時圓內一字
  };
};
```

UI **只**用 `display` 畫列。若缺 `display`：保守畫未驗證盾；`labelPrimary` 為 `shortPk(mint)` 或 `SOL`。

## Phase-2 產出

`buildDeltas`：

- native：`kind: "native"`，無 `mint`；`symbol` 仍為 `"SOL"`。
- SPL：`kind: "spl"`，`mint` 為聚合後的 mint；`symbol` 仍為 `shortPk(mint)`（phase-2 **不**呼叫 Jupiter）。

## Enrichment（僅 mainnet）

1. 收集本趟 `deltas` 中所有 `kind === "spl"` 的 `mint`（去重）。
2. 對每個 mint：若 SW 記憶體快取已有條目，跳過 HTTP。
3. 其餘 mint 呼叫 `lookupJupiterMintMetadata`（本版擴充回傳 `isVerified?: boolean`，與 Home 同一 `parseJupiterSearchArray`）。
4. 對每個 delta 填 `display`：
   - **native：** `trust: "verified"`，`labelPrimary: "SOL"`，`amountSuffix: "SOL"`，`iconUrl`／`iconLetter` 與 Home 原生 SOL 一致。
   - **spl + verified：** `trust: "verified"`，`labelPrimary: sanitizeSymbol(hit.symbol)`，`labelMintShort: shortPk(mint)`，`amountSuffix` 同 `labelPrimary`，`iconUrl`／`iconLetter` 來自 Jupiter。
   - **spl + unverified**（含無 hit、Jupiter 失敗、devnet 未呼叫）：`trust: "unverified"`，`labelPrimary: shortPk(mint)`，**無** mint 次行，`amountSuffix: shortPk(mint)`，icon 僅 letter fallback。

`settings.cluster !== "mainnet"`：跳過 HTTP；所有 SPL 走 unverified 分支。

## `sanitizeSymbol`

- 輸入：Jupiter `symbol` 字串。
- 移除：`✓` `✔` `✅`（及常見全形變體）、首尾空白。
- 輸出為空：視同無 symbol；若 `isVerified` 仍為 true 但 symbol 空，**降級**為 unverified 主標（mint 縮寫）。

## 列 DOM（`paintDeltaInner` 成功路徑）

每行 `div.delta-row`（grid，見 CSS）：

1. `span.delta-trust.delta-trust--verified|unverified` — inline SVG 盾；`title`／`aria-label` 為 `token.verified` 或 `token.notVerified`。
2. `span.delta-token-icon` — 圓形容器；`img` 或 `span.delta-token-letter`。
3. `div.delta-token-label` — `div.delta-token-primary`；可選 `div.delta-token-mint`（muted、mono、單行 ellipsis）。
4. `span.delta-amount.plus|minus` — `±{amount} {amountSuffix}`。

**禁止**在 primary 後加字元勾（不套用 Home `token-verified`）。

## CSS（`wallet/src/popup/style.css`）

```css
.delta-row {
  display: grid;
  grid-template-columns: 22px 28px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}
.delta-trust { width: 22px; height: 22px; border-radius: 6px; … }
.delta-token-icon { width: 28px; height: 28px; border-radius: 50%; overflow: hidden; … }
```

popout 與 popup 共用同一 approval 樣式表。

## Jupiter HTTP

- URL、批次、header、空 key：**復用** `home-tokens-service.ts` 內常數與 `lookupJupiterMintMetadata`。
- 擴充 `MintDisplayMeta`：`isVerified?: boolean`（僅 `true` 算 verified）。
- popup／popout **不** fetch；只在 SW 模擬路徑 enrichment。

## Fingerprint 與 Jupiter 時序

- `deltaDisplayFingerprint`：`ok:` ＋各列 `kind`／`mint`（空字串表 native）／`sign`／`amount`，以 `|` 拼接；**不**含 `display`。
- `deltaDisplayPaintFingerprint`：同上並含每列 `display` 的 `trust`／`labelPrimary`／`amountSuffix`／`iconUrl`／`iconLetter`。`shell.ts` 的 `paintDeltaOnly` 兩者**任一**變更即重画 `deltaInner`。
- **0.33 僅同步** enrichment：SW await Jupiter（上限 **2s**）後一次回傳。

## Jupiter mint 快取

- 模組：`wallet/src/background/simulate/delta-display-enrich.ts`。
- 全域 `Map<mint, MintDisplayMeta>`，無 TTL；與 Home 持倉快取分離。
- `jupiterApiKey.trim()` 變更時清空 Map。

## i18n

| Key | 繁 | 簡 | en |
|-----|----|----|-----|
| `token.notVerified` | 未驗證 | 未验证 | Not verified |

`token.verified` 已存在。列旁不加說明句。

## 測試

無整包 `bun test`。可選：對 `sanitizeSymbol` 寫 1–2 個 unit。以 INDEX 手驗為準。
