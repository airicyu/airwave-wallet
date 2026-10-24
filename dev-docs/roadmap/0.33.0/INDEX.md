# 0.33.0 — 簽署預期變動：Jupiter 代幣圖示與信任欄

- **狀態：** `shipped`
- **上游版本：** [0.32.0](../0.32.0/INDEX.md)。預期變動卡殼、每 3 秒只刷新內容區、交易費脫離模擬，均維持 0.32.0
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 2026-10-12 簽署審批手測（Jupiter swap 差額列只顯示 mint 縮寫）；使用者已定案「最左信任欄永遠佔位」與 anti-spoof 規則
- **畫面：** [`dev-docs/design-principles.md`](../../design-principles.md)。概念稿 [`dev-docs/design-demos/0.33.0/sign-tx-token-trust-ux.html`](../../design-demos/0.33.0/sign-tx-token-trust-ux.html)（使用者已同意方向；衝突時以本 INDEX 與 HOW 為準）
- **秘密欄位：** 無（仍用 Settings 既有 `jupiterApiKey`；`getState` 不回明文）

## 產品句

簽署交易（含 dApp 與 `walletSend`）的**預期變動**每一列改為：最左**永遠可見**的信任盾（已驗證／未驗證）、圓形代幣圖、名稱區、差額。SPL mint 在 **mainnet** 由 Jupiter Tokens v2 `search` 補 symbol／icon／`isVerified`；未驗證列不以對方 symbol 當主標，避免假圖、假勾、假 emoji 冒充。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)（設計閘門通過後用於實作）
5. 上游：[0.10.0](../0.10.0/INDEX.md) 差額來源、[0.4.0](../0.4.0/INDEX.md) Jupiter 端點與速率、[0.32.0](../0.32.0/INDEX.md) 預期變動卡生命週期

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | 只改**預期變動卡內容區**成功路徑的差額列（`outcome === "ok"` 且有 `deltas`）。`fail`／`rpc`／`unparseable`／「無變動」文案與結構維持 0.32.0。`signMessage` 無預期變動 |
| 列版面 | 固定四欄 grid：`22px` 信任盾 ＋ `28px` 圓形代幣圖 ＋ `minmax(0,1fr)` 名稱 ＋ 靠右差額。欄距 `8px`。列間分隔線沿用現有 `--stroke-soft` |
| 信任欄 | **每一列都有**，含原生 SOL 與未驗證 SPL。兩態皆為錢包 **SVG 盾形**（圓角方底 `6px`），**禁止** Unicode `✓`／emoji 當信任標。已驗證：填色盾＋內勾（色 `--ok` 淡底）。未驗證：空心盾＋橫線（`--fill` 底、`--stroke` 內框）。`title`／`aria-label` 走 catalog：`token.verified`、新增 `token.notVerified`（三語）。列上**不**另寫「已驗證」句子 |
| 代幣圖 | 圓形、`overflow: hidden`、與信任盾間留縫（不疊在圖上）。有 `https:` icon URL 用 `<img>`；否則圓內單字 fallback（與 Home 持倉 `iconLetter` 規則一致）。**禁止**在代幣圖上疊第二層勾 |
| 原生 SOL | 不查 Jupiter。信任欄＝已驗證盾。主標 `SOL`；**不**顯示 mint 次行。圖示用與 Home 原生 SOL 相同來源（現有 bundled／常數 URL，不新增網路依賴）。差額尾綴 `SOL` |
| SPL 資料來源 | **僅** `settings.cluster === "mainnet"` 時對該次差額中的 mint 呼叫 Jupiter `https://api.jup.ag/tokens/v2/search`（與 [0.4.0](../0.4.0/INDEX.md) 相同 base、批次 ≤100、`x-api-key` 規則、429 重試策略**沿用** `lookupJupiterMintMetadata` 實作）。**Devnet 不打 Jupiter** |
| `isVerified` | 只當 Jupiter 回傳 `isVerified === true` 為已驗證；缺欄或 `false` 皆未驗證 |
| 主標規則 | **已驗證：** 清洗後的 Jupiter `symbol`（見 HOW）；可選次行 mint 前 4…後 4（`shortPk`）。**未驗證：** 主標＝mint 前 4…後 4；**不**把 Jupiter／模擬帶來的 symbol 當主標。次行可不顯示或僅在已驗證時顯示 mint（與概念稿一致：已驗證有 mint 次行） |
| 差額欄 symbol | 與主標同一套顯示用 symbol：已驗證用清洗後 symbol；未驗證用 mint 縮寫。數字 `amount` 字串仍來自 phase-2 模擬（本版不改 lamport／最小單位算法） |
| Symbol 清洗 | 渲染前從 Jupiter symbol 移除常見勾字元（`✓` `✔` `✅` 及 NFKC 變體）；trim 後空則視同無 symbol |
| 模擬 delta 型別 | `SimulateTxDelta` 增加 `kind: "native" \| "spl"`；SPL 必帶 `mint`（完整 base58）。原生 `kind: "native"`，無 `mint`。`symbol`／`amount`／`sign` 欄位保留（SW 內部與 fingerprint 用）；UI **不得**在未驗證時直接顯示 SPL 的 `d.symbol` |
|  enrichment 時機 | 在 SW `ui.simulatePendingTx` 路徑、phase-2 算出 `deltas` 之後、回 UI 之前，於 **mainnet** 合併 Jupiter 顯示欄（`displaySymbol`／`iconUrl`／`trust: verified \| unverified`）。可擴充 `SimulateTxDelta` 或平行 `display?: {…}` 物件，但 UI 只讀 enrichment 結果 |
| Jupiter 快取 | SW **記憶體** `Map<mint, …>`，不寫 `chrome.storage`。同一審批請求內每 3 秒重模擬時，**已快取 mint 不重打 HTTP**；出現新 mint 才補批。請求結束（resolve／reject／逾時）可清該 `requestId` 相關快取或沿用全域 mint 快取（實作擇一，须在 HOW 寫死；預設：**全域 mint 快取、無 TTL**，與 Home 類似，換 `jupiterApiKey` 時沿用現有 settings 指紋失效策略若已有則對齊，否則 key 變更後清快取） |
| Jupiter 失敗 | 單批失敗不擋模擬成功：該 mint 視未驗證、無 icon、主標 mint 縮寫。不升級為 `outcome: rpc` |
| 刷新行為 | 維持 0.32.0：卡殼不重建。`deltaDisplayFingerprint` **只**依 `kind`／`mint`／`sign`／`amount`（見 HOW）。另用 `deltaDisplayPaintFingerprint` 含每列 `display` 摘要；`shell` 的 `paintDeltaOnly` **兩者任一變**即重画 `deltaInner`，禁止僅比對前者而跳過 Jupiter 顯示更新 |
| Jupiter 時序 | **0.33 僅同步** enrichment：SW 在回傳 `simulatePendingTx` 前 await Jupiter（單次等待上限 2s）；不做非同步晚到補画 |
| Jupiter 快取（HOW 寫死） | SW 模組 `delta-display-enrich.ts` 內全域 `Map<mint, …>`，無 TTL；與 Home 持倉快取**分離**。`jupiterApiKey.trim()` 變更時清空該 Map |
| Home 持倉列 | **不改** [0.12.0](../0.12.0/INDEX.md) 列上綠色 `✓` 版面（本版非目標） |
| 版本號 | 出貨時 `wallet/package.json`、`wallet/manifest.config.ts`、`version.md`、`changelog.md` 對齊 `0.33.0` |

## 非目標

- 改 phase-2 差額算法（仍用 pre／post；native 仍現行格式化）
- 在預期變動列顯示 Jupiter organic score／USD
- Devnet 上呼叫 Jupiter
- 改 Home／Activity／代幣詳情的 verified 呈現
- 新增 content 腳本或頁面可打的 Jupiter 命令
- 用模擬或 verified 狀態禁用核准
- 升依賴、改 Vite 設定
- 把信任狀態寫進 `chrome.storage`

## 開工前仍須拍板

（無。設計閘門通過後即可實作。）

## 與上一版對照

| 舊（0.32.0） | 0.33.0 |
|--------------|--------|
| 差額列：左 symbol（SPL 為 mint 縮寫）、右 ±amount symbol | 四欄：信任盾、圓圖、名稱、差額 |
| 無代幣圖、無 verified | mainnet 用 Jupiter icon／`isVerified`；信任欄永遠佔位 |
| `SimulateTxDelta` 只有 symbol／amount／sign | 加 `kind`／`mint` 與 display enrichment |

## 實作軌道

### Track 1 — 差額資料與 Jupiter enrichment（SW）

- **做：** 擴充 `SimulateTxDelta`；`phase2-deltas` 寫入 `kind`／`mint`；`sign-tx-simulate`（或專用小模組）在 mainnet 呼叫／擴充 `lookupJupiterMintMetadata` 回傳 `isVerified`；合併 display 欄；mint 記憶體快取
- **不做：** 改 `replaceRecentBlockhash`；改 AI tool；把 Jupiter 放到 popup 直連
- **驗收：** DevTools 可見 mainnet 審批模擬後 `simulatePendingTx` 回傳含 `mint` 與 display 欄；devnet 無 `api.jup.ag` 請求

### Track 2 — 預期變動列 UI（approval）

- **做：** `paintDeltaInner`（或拆 `approval/delta-row.ts`）依 HOW 畫四欄；CSS；symbol 清洗；三語 `token.notVerified`
- **不做：** 重建預期變動卡殼；改 fail／empty 區塊
- **驗收：** Jupiter swap 測試：USDC 列主標 `USDC`、有圖、已驗證盾；已知 scam mint（或未驗證）主標為 mint 縮寫、未驗證盾

### Track 3 — 手驗與文件

- **做：** 更新 `docs/features.md` 一句（若該檔描述簽署審批）；跑 INDEX 手驗清單
- **不做：** 改 user-guide 長文，除非 features 已列而缺一句

## 驗收

手驗：未封裝載入 `wallet/dist`；`test-web` 或 `https://jup.ag` 發一筆會動到 SOL＋USDC 的簽署交易。Settings 為 **mainnet**。無整包測試指令。

- [ ] 預期變動成功列為四欄；每列最左皆有信任盾（含 SOL）
- [ ] SOL 列：已驗證盾、圓圖、主標 `SOL`、無 mint 次行；差額以 `SOL` 結尾
- [ ] USDC（或任一 Jupiter `isVerified` mint）：已驗證盾、圖示、主標為清洗後 symbol、次行 mint 縮寫；差額用 symbol
- [ ] 未驗證 SPL：未驗證盾、主標為 mint 縮寫；差額尾綴為 mint 縮寫，**不是**假 symbol
- [ ] 信任標為 SVG 盾，列上無 `✓` 字元當驗證標
- [ ] 代幣圖為圓形裁切；圖內假勾不取代左側盾
- [ ] mainnet：模擬路徑有 Jupiter `tokens/v2/search`；空 key 仍不帶 `x-api-key`（與 0.4.0 一致）
- [ ] devnet：無 Jupiter 請求；SPL 列仍有四欄與未驗證盾
- [ ] 開著審批超過 3 秒：僅 `deltaInner` 更新；重新整理／Inspector 節點未重建
- [ ] Jupiter 單批失敗：模擬仍 `ok`，該列退回未驗證＋mint 主標
- [ ] `walletSend` 預期變動列與 dApp 簽署相同規則

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/background/simulate/phase2-deltas.ts` | `buildDeltas`；現 SPL `symbol` 為 `shortPk(mint)` |
| `wallet/src/shared/simulate-pending-tx-types.ts` | `SimulateTxDelta` 型別 |
| `wallet/src/background/simulate/sign-tx-simulate.ts` | 審批模擬編排；插入 enrichment |
| `wallet/src/background/home-tokens/home-tokens-service.ts` | `lookupJupiterMintMetadata`、`parseJupiterSearchArray` |
| `wallet/src/approval/sign-tx-body.ts` | `paintDeltaInner`、`deltaDisplayFingerprint` |
| `wallet/src/popup/style.css` | `.delta-row` 等 |
| `wallet/src/shared/ui-messages.ts` | `token.verified`、新增 `token.notVerified` |
| `dev-docs/design-demos/0.33.0/sign-tx-token-trust-ux.html` | 已同意方向稿 |
