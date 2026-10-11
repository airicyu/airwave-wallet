# Implementation review — 0.33.0 Airwave Wallet

- **日期：** R1 2026-10-12（Asia/Hong_Kong）
- **輪次：** R1（初審；穩定 ID 未重編號）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；[`design-review.md`](./design-review.md)；[`../HANDOFF.md`](../HANDOFF.md)；[`AGENTS.md`](../../../../AGENTS.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（`main` ahead of `origin/main` 1 commit ＋未 staged 變更）；含 **untracked** `wallet/src/background/simulate/delta-display-enrich.ts`、`wallet/src/shared/sanitize-symbol.ts`、整包 `dev-docs/roadmap/0.33.0/`。不以 chat history 為準

---

## 總評

**無未關閉 HIGH。** 靜態對照顯示 Track 1–2 主路徑已落在 INDEX／HOW 錨點：`SimulateTxDelta` 擴充 `kind`／`mint`／`display`；phase-2 寫入 `kind`／`mint`；`sign-tx-simulate` 在 mainnet await `enrichSimulateDeltas`（2s 上限）；`lookupJupiterMintMetadata` 回傳 `isVerified`；審批 UI 四欄 grid、SVG 盾、`token.notVerified` 三語；`shell.ts` 以 `deltaDisplayPaintFingerprint` 與 `deltaDisplayFingerprint` 雙軌短路，對齊 HOW「Jupiter 顯示更新」契約（設計審查 H1 已收斂）。**`cd wallet && npm run build` 通過。** INDEX 驗收 checklist **均未在瀏覽器未封裝載入 `wallet/dist` 手驗**（見下表）。版本號與 changelog 已在 working tree 升至 `0.33.0`，但手驗未完成前**不宜視為可出貨**（見 033-M2）。

---

## 測試與建置

| 指令 | 結果 | 備註 |
|------|------|------|
| `cd wallet && npm run build`（`tsc --noEmit && vite build`） | **通過** | R1 執行 exit 0 |
| INDEX 手驗（mainnet Jupiter swap／devnet／3 秒 DOM） | **未執行** | 本審查環境未載入 Chrome 未封裝擴充 |

---

## Findings

### HIGH

（R1 無 HIGH。未見 popup 直連 Jupiter、devnet 打 Jupiter、pending storage hydrate、或未驗證列直接顯示 `d.symbol` 等契約違反。）

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| 033-M1 | 核心新檔與 roadmap 目錄未入版控 | **仍開** | `delta-display-enrich.ts`、`sanitize-symbol.ts` 及 `dev-docs/roadmap/0.33.0/` 在 `git status` 為 untracked；`sign-tx-simulate.ts` 已 import 前者。他人 clone／CI 若只取已 commit 樹會缺檔。 | 出貨 commit 時 `git add` 上述路徑 |
| 033-M2 | INDEX 手驗未做、checklist 全未勾 | **仍開** | [`../INDEX.md`](../INDEX.md) 狀態 `in progress`，驗收 11 條仍全 `[ ]`。本審查僅靜態＋建置。 | 未封裝載入 `wallet/dist`、mainnet Settings 走 Jupiter／test-web 或 jup.ag；通過後勾選 checklist |
| 033-M3 | roadmap README 與 INDEX 狀態不一致 | **仍開** | [`../../README.md`](../../README.md) 表列 0.33.0 為 `planned`；INDEX 為 `in progress`。 | 出貨前對齊其一 |
| 033-M4 | `iconUrl` 未強制 `https:` | **仍開** | HOW／INDEX 寫僅 `https:` 才用 `<img>`；`delta-display-enrich` 與 `appendDeltaRow` 未過濾非 https。依賴 Jupiter 回傳品質；與 Home 持倉路徑同級風險。 | 合併前在 enrichment 或 paint 層只接受 `iconUrl?.startsWith("https:")` |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| 033-L1 | HANDOFF 仍寫 `planned` | **仍開**（非阻擋） | [`../HANDOFF.md`](../HANDOFF.md) 與 INDEX `in progress` 不一致。 |
| 033-L2 | 原生 SOL 圖示僅 letter fallback | **仍開**（非阻擋） | INDEX 提及 bundled URL；現 Home 原生 SOL 亦無 `iconUrl`，實作與 Home 一致（`iconLetter`）。 |
| 033-L3 | 無 `sanitizeSymbol` unit | **仍開**（非阻擋） | HOW 標可選 1–2 個 unit；未加。 |
| 033-L4 | HOW 錨點寫 `popup/style.css` | **仍開**（非阻擋） | 差額列樣式實際改在 `popout/style.css`；approval 經 `main.tsx` import popout 表，行為正確。 |

---

## R1 重點對照（INDEX／HOW）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| `SimulateTxDelta` 含 `kind`／`mint`／`display` | **符合** | [`simulate-pending-tx-types.ts`](../../../../wallet/src/shared/simulate-pending-tx-types.ts) |
| phase-2 寫 `kind: "native"`／`kind: "spl"` + `mint` | **符合** | [`phase2-deltas.ts`](../../../../wallet/src/background/simulate/phase2-deltas.ts) `buildDeltas` |
| mainnet enrichment、devnet 不打 Jupiter | **符合** | [`delta-display-enrich.ts`](../../../../wallet/src/background/simulate/delta-display-enrich.ts) `cluster === "mainnet"` |
| await Jupiter ≤2s、同步不回補畫 | **符合** | `JUPITER_ENRICH_TIMEOUT_MS = 2000`；無 UI 側晚到 fetch |
| mint 記憶體快取、key 變更清空 | **符合** | `mintDisplayCache`；`resetCacheIfKeyChanged` |
| `isVerified === true` 才 verified；symbol 清洗後空則降級 | **符合** | `splFromHit` + [`sanitize-symbol.ts`](../../../../wallet/src/shared/sanitize-symbol.ts) |
| `lookupJupiterMintMetadata` 擴充 `isVerified` | **符合** | [`home-tokens-service.ts`](../../../../wallet/src/background/home-tokens/home-tokens-service.ts) |
| UI 四欄、SVG 盾、不用 Unicode 勾 | **符合** | [`sign-tx-body.ts`](../../../../wallet/src/approval/sign-tx-body.ts) `appendDeltaRow` |
| `token.notVerified` 三語 | **符合** | [`ui-messages.ts`](../../../../wallet/src/shared/ui-messages.ts) |
| fingerprint 不含 display；paint fingerprint 含 display | **符合** | `deltaDisplayFingerprint`／`deltaDisplayPaintFingerprint`；[`shell.ts`](../../../../wallet/src/approval/shell.ts) `paintDeltaOnly` |
| popup 不直連 Jupiter | **符合** | 僅 SW `ui-handlers` → `simulateSignTransaction` 傳 `jupiterApiKey` |
| `docs/features.md` 一句 | **符合** | working tree 已更新 Expected changes 段 |
| 版本 0.33.0 | **符合（WT）** | `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md` |

---

## 驗收對照（INDEX checklist）

證據欄：**靜態**＝讀碼；**建置**＝`npm run build`；**手驗**＝未執行。

| # | 驗收句（摘要） | 結果 |
|---|----------------|------|
| 1 | 成功列四欄；每列有信任盾 | **靜態通過**／**未手驗** |
| 2 | SOL：已驗證盾、圓圖、主標 SOL、無 mint 次行、差額 SOL | **靜態通過**（letter 圖）／**未手驗** |
| 3 | USDC 等 verified：盾、圖、symbol、次行 mint、差額 symbol | **靜態通過**／**未手驗** |
| 4 | 未驗證 SPL：未驗證盾、主標 mint 縮寫、差額非假 symbol | **靜態通過**／**未手驗** |
| 5 | 信任標 SVG；列上無 ✓ 字元 | **靜態通過**／**未手驗** |
| 6 | 圓形代幣圖；假勾不取代左盾 | **靜態通過**／**未手驗** |
| 7 | mainnet 模擬有 Jupiter search；空 key 不帶 x-api-key | **靜態通過**（復用 lookup）／**未手驗 Network** |
| 8 | devnet 無 Jupiter；SPL 仍四欄＋未驗證盾 | **靜態通過**／**未手驗** |
| 9 | 開審批 >3s 只更新 deltaInner、節點未重建 | **靜態通過**（雙 fingerprint）／**未手驗 DOM** |
| 10 | Jupiter 單批失敗：模擬仍 ok、列退回未驗證 | **靜態通過**／**未手驗** |
| 11 | `walletSend` 與 dApp 簽署同規則 | **靜態通過**（同 approval 路徑）／**未手驗** |

---

## 修復追蹤表

| ID | 級 | 狀態 | 關閉條件 |
|----|----|------|----------|
| 033-M1 | MEDIUM | 仍開 | 新檔與 0.33.0 roadmap 進入 commit |
| 033-M2 | MEDIUM | 仍開 | INDEX 手驗勾選＋狀態與事實一致 |
| 033-M3 | MEDIUM | 仍開 | roadmap README 與 INDEX 狀態對齊 |
| 033-M4 | MEDIUM | 仍開 | https icon 過濾（建議出貨前） |
| 033-L1 | LOW | 仍開 | HANDOFF 同步（可非本版） |
| 033-L2 | LOW | 仍開 | 記錄即可 |
| 033-L3 | LOW | 仍開 | 可選 unit |
| 033-L4 | LOW | 仍開 | 可選更新 HOW 錨點 |

---

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| R1 | 2026-10-12 | 無 HIGH；靜態主路徑對齊 INDEX／HOW；建置通過。手驗未做。033-M1～M4 仍開。 |
