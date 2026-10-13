# Implementation review — 0.38.0 Airwave Wallet

- **日期：** 2026-10-13（Asia/Hong_Kong）
- **輪次：** **第 2 輪複審**（穩定 ID 未重編號；初審段落保留）
- **角色：** 實作審查（不改程式、不加功能、不 commit）。只認檔案與 working tree，不認 chat history，不 resume 實作對話。
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree。INDEX 狀態為 `shipped`。使用者表示 implementation done。本環境未載入未封裝擴充。
- **總評：** **無未關閉 HIGH。** `npm run typecheck`、`npm run build` 通過；`formatOrganicScoreLabel` 窄測 2 項通過。靜態對照符合 INDEX。畫面 checklist **仍無瀏覽器手驗證據**（M1 仍開）。新模組與 `0.38.0/` 仍 untracked（M2 仍開）。程式門檻通過；手驗未通過。

關閉＝現碼符合已定案。仍開＝現碼或驗收仍未蓋住。非阻擋＝不擋本輪程式門檻。

## Findings（初審，2026-10-13）

### HIGH

（初審無 HIGH。未見未驗證畫盾／三角／分數、分數寫入 aria／`organicScoreLabel` 當晶片、native SOL 兩屏畫分、popup 直連 Jupiter、devnet 打 Jupiter、詳情加盾、pending 進 storage、全 tab 廣播、硬編碼密碼。）

### MEDIUM

| ID | 標題 | 狀態 | 依據 |
|----|------|------|------|
| M1 | INDEX 畫面驗收未手驗 | **仍開**（出貨阻擋；非程式門檻） | Home 列、預期變動列、≤0／缺欄、未驗證有分、Devnet SPL、聚合成員、代幣詳情，本環境未載入未封裝擴充。靜態讀碼不算手驗通過。 |
| M2 | 新模組與 0.38.0 目錄尚未入版控 | **仍開**（出貨時 `git add`） | `organic-score-label.ts`／`.test.ts` 與 `dev-docs/roadmap/0.38.0/` 為 untracked。clone 只取已 commit 樹會缺格式化函式。 |

### LOW

| ID | 標題 | 狀態 | 依據 |
|----|------|------|------|
| L1 | `.token-block` 仍 `overflow: hidden` | **仍開**（非阻擋） | HOW：卡片不得裁掉外伸 2px 晶片；block 若 hidden，信任格須 visible。`.token-card`／`.token-trust` 為 `visible`；卡片 `padding: 14px`，靜態判斷 2px 晶片仍在卡片內。未手驗裁切。 |
| L2 | 未使用的 `.token-score` 仍在 popup CSS | **仍開**（非阻擋） | HOW：新 overlay 不要復用該 class。列上未套用；可刪可留。`.token-verified` 已無用法。 |
| L3 | `sign-tx-body.ts` 超過 400 行且本版有改 | **仍開**（非阻擋） | AGENTS：同一輪碰到逾 400 行須 review 要不要拆。本審查不改程式。 |
| L4 | backlog 列仍寫 0.38.0 `planned` | **仍開**（非阻擋） | [`../../backlog/INDEX.md`](../../backlog/INDEX.md) 該列括號為 planned；INDEX／roadmap README 為 `in progress`。出貨時清 backlog。 |

## 驗收對照（初審）

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| Home 持倉列：已驗證綠盾在代幣圖前；名稱旁無 `✓`；未驗證最左格留空、無分 | **靜態通過**／**未手驗** | `TokenRow`：`TokenTrust` → `TokenIcon` → 名稱。`TokenTrust` 僅 `isVerified`／native 畫盾＋可選晶片；否則空 `span.token-trust--empty`、無 children。名稱列無 `✓`。 |
| 預期變動列：同樣規則；已驗證且 `organicScore > 0` 時盾右下有整數分 | **靜態通過**／**未手驗** | `appendDeltaRow`：verified 才內嵌 SVG；`disp.scoreLabel` 才加 `.delta-trust-score`。grid `26px 28px minmax(0,1fr) auto`。`enrich` 僅 verified 寫 `scoreLabel`。 |
| 已驗證但分數 ≤ 0 或缺欄：盾上無數字 | **靜態通過**／**未手驗** | `formatOrganicScoreLabel`：非有限或 ≤ 0 → `undefined`；round 後 ≤ 0 亦不畫。enrich 失敗則省略欄。 |
| 未驗證即使 Jupiter 有分數：空格、無數字 | **靜態通過**／**未手驗** | `splFromHit` 非 verified 走 `splUnverified`（無 `scoreLabel`）。Home 未驗證分支不呼叫格式化結果上畫面。 |
| Devnet SPL：空格、無分 | **靜態通過**／**未手驗** | `enrichSimulateDeltas` 僅 `cluster === "mainnet"` 打 Jupiter；否則 hit 空 → unverified。 |
| 聚合成員列無信任標 | **靜態通過**／**未手驗** | `token-member` 僅地址／％／量／bar。 |
| 代幣詳情文字列／hero 未加盾 | **靜態通過**／**未手驗** | `TokenDetailView` 只用 `TokenIcon`。 |
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 本輪兩者 exit 0。 |

Track 1 補充（INDEX 軌道，非 checklist 列）：mainnet verified delta `display` 在分數 > 0 時有 `scoreLabel`；unverified 無該欄。靜態符合；無模擬回傳手驗。

## 測試結果（初審）

cwd：`wallet/`。未使用 `bun test`。PowerShell 以分號串接。跑完已刪暫存 `.mjs`（工作區無該檔）。

```text
npx esbuild src/shared/organic-score-label.test.ts --bundle --platform=node --format=esm --outfile=organic-score-label.test.mjs
node --test organic-score-label.test.mjs
```

結果：2 tests，2 pass，0 fail。exit 0。涵蓋非有限／≤0、`0.6`→`1`、`100`、`1000`→`99+`。

接著 `npm run typecheck`（`tsc --noEmit`）exit 0；`npm run build`（`tsc --noEmit` ＋ vite build）exit 0。

**手驗：** 本環境通常無法載入未封裝擴充。未開 popup Home、未開簽署預期變動、未切 Devnet、未開聚合展開或代幣詳情。畫面 checklist 全部僅靜態對照。

隱私：本檔未寫助記詞、私鑰、密碼或個人地址。

## 現碼抽樣（初審）

| 錨點 | 與已定案 |
|------|----------|
| `shared/organic-score-label.ts` | 共用純函式；不判斷 verified。呼叫端跳過未驗證與 native。禁止讀 `organicScoreLabel`。 |
| `MintDisplayMeta`／`lookupJupiterMintMetadata` | 有限數字才帶 `organicScore`。skip 規則未改（僅 score 且無 symbol／icon／verified 可不入 map）。無新 HTTP。 |
| `delta-display-enrich.ts` | native 不設 `scoreLabel`。spl verified 才格式化。devnet 不 fetch。 |
| `simulate-pending-tx-types.ts` | 可選 `scoreLabel`。 |
| `deltaDisplayPaintFingerprint` | 每列含 `scoreLabel ?? ""`。 |
| `sign-tx-body.ts` | unverified：`--empty`、無 SVG。verified：16×16 盾；可選晶片。`title`／`aria-label`＝`token.verified`／`token.notVerified`。分數不進 aria。 |
| `popout/style.css` | `.delta-trust` 26px、`overflow: visible`；empty 透明無 inset；晶片 `-2px`、`8px`、`tabular-nums`、`pointer-events: none`。`.delta-row` `overflow: visible`。 |
| `HomeTokenList.tsx` | flex 順序不變；展開鈕仍最後。`id === native-sol` 永盾無分。 |
| `popup/style.css` | `.token-trust*` 對齊差額列；未重複定義 `.delta-trust`。popup `main.tsx` 仍 import popout 表。 |
| `docs/features.md` | Home／簽署一句：已驗證盾可掛分、未驗證留空。 |
| 版本 | `wallet/package.json`、`manifest.config.ts`、`version.md`、`changelog.md`、根 README 版本句均為 `0.38.0`。 |

架構禁區抽樣：本版未改 pending／storage 真相／custody／訊息廣播。分數不進 `chrome.storage`。

## Findings（第 2 輪複審，2026-10-13）

獨立重讀 INDEX／HOW／錨點檔與 `git status`。檔內先前「實作者自核」不當作手驗或關閉 M1 的依據。INDEX 已勾 checklist、狀態 `shipped` 只代表文件自稱出貨，**不**等於瀏覽器目視通過。

### HIGH

（仍無。複審抽樣與初審一致：未驗證不畫盾／三角／分；native 兩屏不設分；Home UI 不讀 `organicScoreLabel`；詳情無盾；enrich 僅 mainnet 打 Jupiter；無新 HTTP；分數不進 storage／aria。）

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **仍開**（非程式門檻；畫面驗收無瀏覽器證據） | 本輪仍無法載入未封裝擴充。未目視 Home、簽署預期變動、Devnet SPL、聚合展開、代幣詳情、已驗證 ≤0／缺欄、未驗證但 API 有分。INDEX 勾選與「建議載入擴充再目視」**不能**改寫為手驗通過。 |
| M2 | **仍開** | `git status`：`?? wallet/src/shared/organic-score-label.ts`、`?? …organic-score-label.test.ts`、`?? dev-docs/roadmap/0.38.0/`。`git ls-files` 不識格式化模組。出貨 commit 仍須 `git add`。 |

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **仍開**（非阻擋） | `.token-block` 仍 `overflow: hidden`（約 `popup/style.css` 3069）。`.token-card`／`.token-trust` 為 `visible`；padding 14px。仍無手驗裁切。 |
| L2 | **關閉** | 全倉已無 `.token-score`／`.token-verified` 選擇器或用法。HOW「可刪」已發生。 |
| L3 | **仍開**（非阻擋） | `sign-tx-body.ts` 428 行；本版仍改 fingerprint／`appendDeltaRow`。本審查不拆檔。 |
| L4 | **關閉** | `backlog/INDEX.md` 未排程表已無 token-trust／0.38.0 列。`token-trust-icon-score.md` 已不在工作區。 |
| L5 | **仍開**（本輪新增；非阻擋） | INDEX「構想來源」仍連 [`../backlog/token-trust-icon-score.md`](../../backlog/token-trust-icon-score.md)，檔已刪。契約不因此分叉；出貨文件死連。 |

## 驗收對照（第 2 輪）

| INDEX 驗收句 | 結果 | 證據 |
|--------------|------|------|
| Home 持倉列：已驗證綠盾在代幣圖前；名稱旁無 `✓`；未驗證最左格留空、無分 | **靜態通過**／**未手驗** | `TokenTrust` → `TokenIcon`；未驗證空 span、無 children；名稱列無勾。 |
| 預期變動列：同樣規則；已驗證且 `organicScore > 0` 時盾右下有整數分 | **靜態通過**／**未手驗** | `appendDeltaRow` 僅 verified 內嵌 SVG；`scoreLabel` 才加晶片。`splFromHit` 僅 verified 寫欄。 |
| 已驗證但分數 ≤ 0 或缺欄：盾上無數字 | **靜態通過**／**未手驗** | 格式化函式＋enrich 省略欄。無模擬回傳樣本。 |
| 未驗證即使 Jupiter 有分數：空格、無數字 | **靜態通過**／**未手驗** | 未驗證走 `splUnverified`；Home 未驗證早 return。 |
| Devnet SPL：空格、無分 | **靜態通過**／**未手驗** | `cluster === "mainnet"` 才 fetch。未切 Devnet UI。 |
| 聚合成員列無信任標 | **靜態通過**／**未手驗** | `token-member` 仍無信任格。未展開聚合。 |
| 代幣詳情文字列／hero 未加盾 | **靜態通過**／**未手驗** | `TokenDetailView` 僅 `TokenIcon`。未開詳情頁。 |
| `cd wallet && npm run typecheck` 與 `npm run build` | **通過** | 複審重跑皆 exit 0。 |

無瀏覽器證據的畫面：Home 持倉、簽署成功路徑預期變動、Devnet SPL、聚合成員、代幣詳情、分數 ≤0／缺欄與未驗證有分的對照。**不要當成手驗通過。**

## 測試結果（第 2 輪）

cwd：`wallet/`。未使用 `bun test`。窄測後已刪 `organic-score-label.test.mjs`。

```text
npx esbuild src/shared/organic-score-label.test.ts --bundle --platform=node --format=esm --outfile=organic-score-label.test.mjs
node --test organic-score-label.test.mjs
```

2 tests，2 pass，0 fail。`npm run typecheck` exit 0。`npm run build`（`tsc --noEmit` ＋ vite build）exit 0。

隱私：本檔未寫助記詞、私鑰、密碼或個人地址。

## 修復追蹤

| ID | 級 | 狀態 | 關閉位置 |
|----|----|------|----------|
| M1 | MEDIUM | 仍開 | 未封裝擴充手驗 INDEX 畫面 checklist |
| M2 | MEDIUM | 仍開 | 出貨 commit 納入 untracked 模組與 `0.38.0/` |
| L1 | LOW | 仍開 | `.token-block` overflow／手驗晶片裁切 |
| L2 | LOW | **關閉**（第 2 輪） | `.token-score`／`.token-verified` 已不存在 |
| L3 | LOW | 仍開 | — |
| L4 | LOW | **關閉**（第 2 輪） | backlog 已清該列與構想檔 |
| L5 | LOW | 仍開 | INDEX 構想來源死連 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-13 | 程式審查門檻通過。無未關閉 HIGH。typecheck／build／窄測通過。畫面手驗無證據。M1、M2 仍開。 |
| 第 2 輪複審 | 2026-10-13 | 獨立靜態複審仍符合 INDEX。無未關閉 HIGH。測試重跑通過。手驗仍無證據（M1 仍開）。M2 仍 untracked。L2、L4 關閉。新增 L5（INDEX 死連 backlog 檔）。 |
