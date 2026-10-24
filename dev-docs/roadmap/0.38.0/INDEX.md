# 0.38.0 — 持倉與審批統一信任盾，盾上疊 organic score

- **狀態：** `shipped`
- **上游版本：** [0.37.0](../0.37.0/INDEX.md)；畫面語意接 [0.33.0](../0.33.0/INDEX.md) 預期變動信任欄、[0.4.0](../0.4.0/INDEX.md)／[0.12.0](../0.12.0/INDEX.md) Home 持倉
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** [backlog/token-trust-icon-score.md](../backlog/token-trust-icon-score.md)
- **畫面：** [`dev-docs/design-principles.md`](../../design-principles.md)。概念稿 [`dev-docs/design-demos/0.38.0/token-trust-score-ux.html`](../../design-demos/0.38.0/token-trust-score-ux.html)（使用者已同意本版方向；衝突以本 INDEX 與 HOW 為準）
- **秘密欄位：** 無（沿用 Settings `jupiterApiKey`）

## 產品句

Home 持倉列與簽署「預期變動」差額列同一閱讀順序：最左一格對齊後接圓形代幣圖。**僅已驗證**畫綠盾；`organicScore > 0` 時整數分疊在盾右下。**未驗證該格留空**，不畫盾／三角／分數。不另打 API。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)（設計閘門通過後）
5. 概念稿 [`token-trust-score-ux.html`](../../design-demos/0.38.0/token-trust-score-ux.html)
6. 上游：[0.33.0](../0.33.0/INDEX.md)、[0.4.0](../0.4.0/INDEX.md)

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | 只改 **Home 持倉列**（`HomeTokenList` 卡片列）與審批 **預期變動成功路徑差額列**（含拿掉 0.33.0 未驗證灰盾）。聚合展開**成員列**不加信任標。**代幣詳情** hero／meta **不改**（`TokenDetailView` 不加盾） |
| 列順序 | 最左信任格 → 圓形代幣圖 → 名稱區 → 數量／差額。Home 拿掉名稱旁 Unicode `✓`（刪 `.token-verified` 用法） |
| 信任標兩態 | 最左格**永遠佔 26×26px**，代幣圖對齊。禁止 emoji／字元勾當信任標；禁止疊在代幣圖上。**已驗證**（Jupiter `isVerified === true`，含原生 SOL）：`--ok` 填色盾＋深色內勾（沿用 0.33.0 SVG 語意）。**未驗證**（缺欄、`false`、symbol 清洗後降級、Jupiter 失敗、devnet SPL）：格子**留空**——無 SVG、無底、無內框。本版**推翻** 0.33.0「未驗證也畫空心盾」 |
| 分數來源 | 同一支既有 Jupiter Tokens v2 `search` 的 **`organicScore`**。不新增 HTTP。`lookupJupiterMintMetadata` 回傳該欄；差額 `display` 可帶畫面上用的分數字串 |
| 何時畫分 | **僅已驗證**且分數為有限數字 **> 0**：四捨五入為整數後畫在盾右下（獨立小晶片，`right`／`bottom: -2px`，不進盾心）。≤ 0、缺欄、非有限：不畫。**未驗證永不畫分**（即使 API 回 > 0） |
| 分數字串 | 四捨五入後若 **≥ 1000** 顯示 `99+`；否則顯示該整數（含 `100`）。`font-size: 8px`、`tabular-nums` |
| Native SOL | 已驗證盾。**兩屏都不畫分**（忽略 Home 列上可能從 wrapped SOL 抄來的 `organicScore`）。審批 native display 不設 `scoreLabel` |
| Devnet | 不打 Jupiter；SPL 未驗證、空格、無分 |
| Jupiter 失敗 | 該 mint 未驗證、空格、無分；不擋模擬成功、不擋 Home 列 |
| 反詐騙 | 維持 0.33.0：未驗證 SPL 不以對方 symbol 當主標；symbol 清洗勾字元；禁止在代幣圖上疊勾或分數 |
| 無障礙 | 已驗證盾：`title`／`aria-label`＝既有 `token.verified`。未驗證空格：同一屬性＝既有 `token.notVerified`（列旁不加說明句）。**不**把分數寫進 aria／不新增 catalog 鍵。晶片文字**只**用共用 `format(organicScore)`；**禁止**把 Jupiter `organicScoreLabel`（如 High／Medium）當晶片或 title |
| 成員列 | Home 聚合展開成員不加盾、不加分、不佔額外信任語意 |
| 詳情 | 本版不改 `TokenDetailView` |
| 刷新 | 維持 0.32.0／0.33.0：`deltaDisplayPaintFingerprint` 須含會畫出的分數字串（或空），以免分數晚到不重画 |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md`、根 README 版本句對齊 `0.38.0` |

## 非目標

- 改 Jupiter 端點、批次、速率、API key
- 用分數或 verified 禁用批准
- Devnet 打 Jupiter
- 改 fail／rpc／空狀態預期變動
- 未驗證列畫警告三角、空心盾或 organic score
- 把信任或分數寫進 `chrome.storage`
- 改 phase-2 差額算法、custody、pending
- 代幣詳情 hero／meta 改版
- 升依賴
- 新增 i18n 鍵（沿用 `token.verified`／`token.notVerified`）

## 開工前仍須拍板

（無。概念稿已同意。）

## 實作軌道

### Track 1 — 資料

**做：** `MintDisplayMeta` 與 `lookupJupiterMintMetadata` 帶 `organicScore`；`enrichSimulateDeltas` 在 **verified** display 寫入畫面上用的分數字串（HOW 的格式化）；未驗證 display **不**帶分數。共用純函式格式化（HOW）。Paint fingerprint 含該字串。

**不做：** 新 HTTP；改 Home 持倉 Jupiter 解析語意（Home 列已有 `organicScore`，只改誰拿來畫）。

**驗收：** mainnet 模擬回傳的 verified delta `display` 在分數 > 0 時有分數字串；unverified 無該欄或空。

### Track 2 — UI

**做：** Home 列與 `paintDeltaInner` 對齊概念稿：26px 格、已驗證盾＋可選分數晶片、未驗證空格。CSS 在 `popup/style.css`（Home）與 `popout/style.css`（差額列；popup／sidepanel 已 import popout 表）。拿掉 Home 名稱旁 `✓`。

**不做：** 改詳情；改 fail／empty 區塊；重建審批卡殼。

**驗收：** 見下方 checklist。

### Track 3 — 版本與用家一句

**做：** 版本號對齊；`docs/features.md` 預期變動句改為未驗證留空、已驗證可掛分。

## 驗收

- [x] Home 持倉列：已驗證綠盾在代幣圖前；名稱旁無 `✓`；未驗證最左格留空、無分（靜態對照＋implementation-review；建議載入擴充再目視）
- [x] 預期變動列：同樣規則；已驗證且 `organicScore > 0` 時盾右下有整數分
- [x] 已驗證但分數 ≤ 0 或缺欄：盾上無數字
- [x] 未驗證即使 Jupiter 有分數：空格、無數字
- [x] Devnet SPL：空格、無分
- [x] 聚合成員列無信任標
- [x] 代幣詳情文字列／hero 未加盾
- [x] `cd wallet && npm run typecheck` 與 `npm run build` 通過

## 錨點檔案

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/components/HomeTokenList.tsx` | Home 列 |
| `wallet/src/popup/style.css` | `.token-card`／信任格 |
| `wallet/src/approval/sign-tx-body.ts` | 差額列 DOM |
| `wallet/src/popout/style.css` | `.delta-row`／`.delta-trust` |
| `wallet/src/background/simulate/delta-display-enrich.ts` | 差額 display |
| `wallet/src/background/home-tokens/home-tokens-service.ts` | Jupiter `organicScore`／`lookupJupiterMintMetadata` |
| `wallet/src/shared/simulate-pending-tx-types.ts` | delta display 型別 |
| `docs/features.md` | 用家一句 |
