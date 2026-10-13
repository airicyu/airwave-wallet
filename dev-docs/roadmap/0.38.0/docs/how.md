# 0.38.0 — HOW

契約在 [INDEX](../INDEX.md)。概念稿僅對位置。

## 分數格式（共用純函式）

放在 `wallet/src/shared/` 一個小模組（例如 `organic-score-label.ts`），Home 與 enrichment 都呼叫。

輸入：`organicScore` 未知（`number | undefined | null`）。

- 非有限或 **≤ 0** → `undefined`（不畫）。
- 否則 `Math.round`。若整數 **≥ 1000** → `"99+"`；否則 `String(n)`（`100` 照印）。

**畫分前提：** 該列已是 verified。未驗證呼叫端直接不傳、不畫，即使函式對 raw > 0 會產出字串。

**禁止**使用 Jupiter `organicScoreLabel`（字串等級）當晶片文字、`title` 或 `aria-label`。列上 `organicScoreLabel` 可繼續存在於 Home 資料，本版 UI 不讀。

## `MintDisplayMeta`

`lookupJupiterMintMetadata` 在既有 `symbol`／`iconUrl`／`isVerified` 外增加：

```ts
organicScore?: number; // 僅有限數字才寫入
```

來源：既有 `parseJupiterSearchArray` 的 `organicScore`。不改 URL／批次／429。若 hit 只有 score 而無 symbol／icon／verified，仍可不寫入 map（與現行 skip 規則一致）；沒有 map 條目＝未驗證、無分。

## `SimulateTxDeltaDisplay`

在 0.33.0 形狀上增加可選：

```ts
scoreLabel?: string; // 僅 verified 且格式化成功時出現
```

`enrichSimulateDeltas`：

- native：不設 `scoreLabel`（無 Jupiter；**不**用 wrapped SOL 的 score）。
- spl verified：`scoreLabel`＝對 `hit.organicScore` 跑格式化；失敗則省略欄。
- spl unverified：不設 `scoreLabel`。

## 差額列 DOM（`paintDeltaInner`）

grid：`26px 28px minmax(0,1fr) auto`，gap `8px`（信任格由 22px 改 26px）。

1. `span.delta-trust`
   - verified：`delta-trust--verified`；內嵌 0.33.0 已驗證 SVG（可改 16×16 視口置中）；若有 `scoreLabel`，再加 `span.delta-trust-score` 文字節點。`title`／`aria-label`＝`token.verified`。
   - unverified：`delta-trust--empty`；**無** children、無 SVG。`title`／`aria-label`＝`token.notVerified`。
2–4. 代幣圖、名稱、差額：維持 0.33.0 規則（未驗證主標 mint 縮寫等）。

刪除未驗證空心盾 SVG 的使用。

`.delta-trust`：`position: relative; width/height: 26px; overflow: visible;`。verified 維持淡 `--ok` 底。empty：**透明、無 inset 邊框**。`.delta-row` 與 Home `.token-card` **不得** `overflow: hidden` 裁掉外伸 2px 的分數晶片（`.token-block` 若有 hidden，信任格仍須 visible，必要時卡片本身 visible）。

`.delta-trust-score`：`position: absolute; right: -2px; bottom: -2px;`；高約 11px；`font-size: 8px`；`font-weight: 700`；`tabular-nums`；`--ok` 淡底與描邊（HOW 可對概念稿）。`pointer-events: none`。

## Paint fingerprint

`deltaDisplayPaintFingerprint` 每列 display 摘要加 `scoreLabel ?? ""`。

## Home 持倉列

差額列 `.delta-trust*` 只寫在 `wallet/src/popout/style.css`（popup／sidepanel 已 import 該表）。Home 專用 `.token-trust*` 寫在 `wallet/src/popup/style.css`，視覺對齊差額列（26px、晶片 -2px、`--ok` 淡底），**不要**假設 Home 載不到 popout 表、也不要在兩張表重複定義 `.delta-trust`。

`TokenRow` 維持 **flex** `.token-card`：子項順序為信任格 → `TokenIcon`（40px）→ 名稱／數量 → USD →（可選）既有展開鈕。展開鈕仍最後、`stopPropagation` 不變。不要改成四欄 grid 把展開鈕擠掉。

- `id === native-sol`：**一律已驗證盾、永不畫分**（忽略列上 `organicScore`）。
- 其餘 `row.isVerified`：綠盾＋`format(row.organicScore)` 有值才晶片。
- 否則空格。未驗證列不畫分。
- 名稱列不再渲染 `✓`。新 overlay 不要復用 `.token-score`。可刪未使用的 `.token-verified`。

`TokenIcon` 仍只負責圓圖。詳情頁繼續只用 `TokenIcon`，不加信任格。

成員面板維持現況，不插信任格。

## 測試

無整包 `bun test`。可對格式化函式寫窄測（`node --test`）若該目錄已有慣例；否則以 INDEX 手驗＋ `npm run typecheck`／`build` 為準。禁止假設 `bun test`。
