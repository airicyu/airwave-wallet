# Design review — 0.38.0 Airwave Wallet

- 日期：2026-10-13（Asia/Hong_Kong）
- 輪次：**第 3 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/popup/components/HomeTokenList.tsx`、`wallet/src/popup/style.css`、`wallet/src/approval/sign-tx-body.ts`、`wallet/src/popout/style.css`、`wallet/src/background/simulate/delta-display-enrich.ts`、`wallet/src/background/home-tokens/home-tokens-service.ts`、`wallet/src/shared/simulate-pending-tx-types.ts`、`wallet/src/popup/main.tsx`、`wallet/src/shared/home-tokens.ts`
- **總評：** 審查門檻通過（無未關閉 HIGH）。提案可行。M1–M5 均已寫進 INDEX／HOW（M1–M4 第 2 輪已關；本輪關閉 M5）。無仍開 MEDIUM。可開實作 agent。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

backlog [`token-trust-icon-score.md`](../../backlog/token-trust-icon-score.md) 構想第 4 點曾寫「未驗證列若分數 > 0 仍畫分」。**本版 INDEX／HOW 已推翻為未驗證永不畫分。** 不以 backlog 為契約。

### HIGH

（無）

本版不改 pending、訊息回傳、`chrome.storage` 主同步、custody、Wallet Standard 能力表。INDEX 非目標已排除把信任／分數寫進 storage、改 custody／pending。抽樣未見與禁區互斥的主路徑設計。

### MEDIUM

| ID | 標題 | 本輪狀態 | 依據 |
|----|------|----------|------|
| M1 | 原生 SOL 分數：Home 與審批 HOW 不一致 | **關閉** | INDEX「Native SOL」：**兩屏都不畫分**（忽略 Home 列上可能從 wrapped SOL 抄來的 `organicScore`）；審批 native display 不設 `scoreLabel`。HOW `enrichSimulateDeltas` native 不設欄；Home `id === native-sol` 一律盾、永不畫分。reasoning 決策 5。對齊初審方案 **(A)**。 |
| M2 | HOW「Home 只用 popup/style.css」與 INDEX／現碼不符 | **關閉** | HOW「Home 持倉列」：`.delta-trust*` 只寫 popout 表（popup／sidepanel 已 import）；Home `.token-trust*` 寫 popup 表；禁止兩表重複定義 `.delta-trust`。INDEX Track 2 已寫同一 import。現碼 `popup/main.tsx` 仍 import popout 表，與契約一致。 |
| M3 | 聚合可展開列與信任格的排版未寫 | **關閉** | HOW：`TokenRow` 維持 **flex** `.token-card`：信任格 → `TokenIcon`（40px）→ 名稱／數量 → USD →（可選）展開鈕；展開鈕仍最後、`stopPropagation` 不變。成員面板仍不插格。INDEX 驗收「聚合成員列無信任標」仍只管成員面板。 |
| M4 | 分數晶片溢出與 `.delta-trust` 現況 | **關閉** | HOW 差額列 DOM：`.delta-trust` `position: relative`、26×26、`overflow: visible`；`.delta-row` 與 Home `.token-card` 不得 `overflow: hidden` 裁晶片；`.token-block` 若有 hidden，信任格仍須 visible。現碼 `.token-block { overflow: hidden }` 仍在，屬實作須改，不再是契約缺口。 |
| M5 | 既有 `organicScoreLabel` 與共用格式化未互斥 | **關閉** | INDEX「無障礙」：晶片文字**只**用共用 `format(organicScore)`；**禁止**把 Jupiter `organicScoreLabel`（如 High／Medium）當晶片或 title。HOW「分數格式」：禁止該欄當晶片／`title`／`aria-label`；列上欄位可留在 Home 資料，本版 UI 不讀。native 不畫分見 M1。 |

### LOW

| ID | 標題 | 本輪狀態 | 依據 |
|----|------|----------|------|
| L1 | 勿復用 `.token-score` | 記錄 | HOW Home 已寫「新 overlay 不要復用 `.token-score`」；可刪未使用的 `.token-verified`。現碼 `.token-score` 仍在 CSS、列上未用。 |
| L2 | 概念稿與 HOW 晶片底色 | 記錄 | 概念稿 `.score` 用 `--bg` 底＋`--text`；HOW 寫 `--ok` 淡底與描邊。INDEX 以 HOW 為準。 |
| L3 | 格式化可用 `node --test` | 記錄 | HOW 測試節已允許 `node --test` 窄測；禁止假設 `bun test`。 |
| L4 | `Math.round` 與數字禁區 | 記錄 | organicScore 為 Jupiter 顯示分，非 lamport。INDEX／HOW 已寫死四捨五入。 |
| L6 | Home `.token-card` 欄距與概念稿／差額列不同 | 記錄 | 現碼 flex `gap: 12px`；差額 HOW／概念稿為 `8px`。INDEX 未寫死 Home gap；對齊概念稿或維持 12px 皆可，實作擇一即可，勿另發明第三套。 |

（無 L5：第 2 輪新增項用 M5。）

## 驗收對照

| INDEX 驗收句（摘要） | 設計層是否可測 | 缺口 |
|--------------------|----------------|------|
| Home：已驗證綠盾在圖前；名稱旁無 `✓`；未驗證空格無分 | 是 | M3 已關；native 不畫分見 M1 |
| 預期變動列同一規則；verified 且 score>0 有整數分 | 是 | fingerprint 含 `scoreLabel` 已在 INDEX／HOW |
| 已驗證且分數 ≤0／缺欄：盾上無數字 | 是 | 格式化函式規則完整 |
| 未驗證即使有分數：空格無數字 | 是 | 與 backlog 構想第 4 點不同；以 INDEX 為準 |
| Devnet SPL：空格無分 | 是 | 沿用 0.33.0 不打 Jupiter |
| 聚合成員列無信任標 | 是 | HOW 不插格＋展開鈕排版已寫 |
| 代幣詳情不加盾 | 是 | HOW：`TokenIcon` 只圓圖；信任格只在 `TokenRow` |
| `npm run typecheck`／`build` | 是 | 出貨手驗＋指令；非設計洞 |

## 與現碼抽樣

現碼未做本版 ≠ 設計 HIGH。

| 現況 | 與 0.38.0 提案關係 |
|------|-------------------|
| Home 名稱旁 Unicode `✓`（`.token-verified`） | 本版刪除；非互斥 |
| 審批未驗證畫空心盾 SVG（`--unverified`） | 本版改空格、類名 `--empty`；INDEX 明文推翻 0.33.0 |
| `deltaDisplayPaintFingerprint` 含 trust／label／icon，**尚無** `scoreLabel` | 預期擴充；與 0.33.0 已定刷新模型一致 |
| `MintDisplayMeta`／`lookupJupiterMintMetadata` 無 `organicScore` | Track 1 擴充；skip 規則 HOW 已對齊現碼 |
| Home `applyJupiterTokensV2` 已把 `organicScore` 與 `organicScoreLabel` 寫入列（含 native←wSOL） | Track 1「不改 Home 解析語意」成立；畫分須忽略 native（M1）；UI 不讀 `organicScoreLabel`（M5 已關） |
| `enrichSimulateDeltas` native 無分數欄 | 與 HOW／INDEX 兩屏 native 不畫分一致 |
| `popup/main.tsx` import popout CSS | 與 HOW CSS 職責（M2 已關）一致 |
| `.token-block { overflow: hidden }` | HOW 已要求信任格／卡片可見（M4 已關）；實作時改 |
| `TokenDetailView` hero 僅 `TokenIcon`＋名稱，無盾 | 與非目標一致 |
| 成員面板無 mint 圖、無勾 | 與「成員不加盾」一致 |

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|-----|------|------------------------------|
| M1 | MEDIUM | **關閉** | INDEX「Native SOL」；HOW `SimulateTxDeltaDisplay`／Home `id === native-sol`；reasoning 決策 5 |
| M2 | MEDIUM | **關閉** | HOW「Home 持倉列」CSS 職責；INDEX Track 2 |
| M3 | MEDIUM | **關閉** | HOW「Home 持倉列」flex 順序與展開鈕 |
| M4 | MEDIUM | **關閉** | HOW 差額列 DOM：`overflow: visible`／父層不裁切 |
| M5 | MEDIUM | **關閉** | INDEX「無障礙」；HOW「分數格式」禁止 `organicScoreLabel` 當晶片／title／aria |
| L1–L4、L6 | LOW | 記錄 | 實作注意即可 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-13 | 無未關閉 HIGH；門檻通過。應修 M1–M4。提案可行。 |
| 第 2 輪複審 | 2026-10-13 | 無未關閉 HIGH；門檻通過。M1–M4 已關。應修 M5。提案可行。 |
| 第 3 輪複審 | 2026-10-13 | 無未關閉 HIGH；門檻通過。M1–M5 已關。無仍開 MEDIUM。提案可行。 |
