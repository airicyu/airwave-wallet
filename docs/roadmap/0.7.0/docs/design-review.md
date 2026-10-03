# Design review — 0.7.0 Airwave Wallet

- 日期：2026-10-03（Asia/Hong_Kong）
- 輪次：**第 4 輪複審**（初審、第 2、第 3 輪同日，見歷審摘要）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`token-holdings-how.md`](./token-holdings-how.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游（行為仍有效；本版明文推翻者除外）：[`../../0.6.0/INDEX.md`](../../0.6.0/INDEX.md)（持倉不在該版）、[`../../0.5.0/INDEX.md`](../../0.5.0/INDEX.md) 與 [`../../0.5.0/docs/combined-how.md`](../../0.5.0/docs/combined-how.md)（`owners[]` 串行、`members`、任一 owner 失敗整輪停）、[`../../0.4.0/INDEX.md`](../../0.4.0/INDEX.md) 與 [`../../0.4.0/docs/token-data-how.md`](../../0.4.0/docs/token-data-how.md)（佇列／TTL／429／Jupiter 批大小；**DAS 與「禁止 Jupiter 改名稱」作廢**）、[`../../0.3.0/docs/popup-shell-how.md`](../../0.3.0/docs/popup-shell-how.md)（SOL 列即使數量為 0 也留下）
- 相關 backlog：本版 INDEX 寫「無獨立 backlog 檔」，**未**點名 `docs/roadmap/backlog/`。該目錄僅構想，不當 0.7.0 契約。
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/home-tokens.ts`、`wallet/src/background/home-tokens-service.ts`、`wallet/src/background/index.ts`、`wallet/src/shared/commands.ts`、`wallet/src/shared/storage-keys.ts`、`wallet/src/popup/main.ts`（現碼與已定案不一致 ≠ 設計 HIGH；現碼未寫死的分支 ≠ 設計 HIGH）
- **總評：** 無未關閉 HIGH，無仍開的應修 MEDIUM。提案可行：Wallet Balances／RPC Token-2022／Jupiter 覆寫名稱可與既有 SW 單佇列、`owners[]` 串行、不 persist 持倉、popup 不直連並存，待拍板為空。第 3 輪的 **M8 已寫進 INDEX「跨 owner」與 HOW 開頭，並進入驗收，本輪關閉**。**設計門檻通過**（通過＝無未關 HIGH，且應修 MEDIUM 已落檔或標非阻擋）。不是整份不可行。本檔不是已定案。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉或缺口；非阻擋＝記錄即可。穩定 ID 勿重編。

0.4.0 HOW 仍寫「不要寫入 Jupiter name／symbol／icon」、DAS `getAssetsByOwner`、以及「成功頁已合併進記憶體者可進快取」。0.7.0 INDEX／HOW／HANDOFF 已明文推翻 DAS 與「禁止改名稱」；失敗條已寫「不把本輪已拉到的部分頁當成功交貨、回舊快取＋error」，覆寫該段「成功頁可進快取」。屬上游歷史契約被本版點名推翻，不另開 ID。

Helius Wallet Balances 公開說明：`showNative=true` 時原生 SOL 以 mint `So11111111111111111111111111111111111111112` 出現在 `balances[]`；`balance` 為已除 decimals 的 UI 數量；`pagination.hasMore` 表示還有下一頁。與本版「該 mint 併入 `native-sol`、`balance` 是 UI 數量、`hasMore === true` 才翻頁」同向，不另開 ID。

### HIGH

（無）

未發現：pending 改走 storage hydrate、結果預設廣播、手寫 rehydrate 當主同步、持倉寫進持久 store、硬編碼密碼、inject 持長期私鑰、宣告未實作的 Wallet Standard 方法，或 INDEX↔HOW 互斥到單 owner 有餘額主路徑不可實作。

### MEDIUM

#### M1 — 零餘額 `native-sol` 列未寫死 — **關閉**

初審題旨：Wallet「0 餘額丟棄」若未限定非 SOL，會與 RPC／0.3.0「零 lamports 仍留 SOL 列」分叉；`showZeroBalance=false` 時 API 可能不回零餘額 SOL。

關閉位置：INDEX「Wallet → 列」寫 Wallet 與 RPC **都總是產出** `id: native-sol`（數量可為 0；名稱 `Solana`、symbol `SOL`），API 未回傳原生 SOL（含 `showZeroBalance=false`）仍補 0；`decimals === 0` 與 0 餘額 **只丟非 SOL**。HOW「解析 Helius key」末段與「RPC」同句。

#### M2 — 跨頁同 mint 的數量與 USD 未寫死 — **關閉**

初審題旨：同一 owner、同一 mint 跨頁時 `balance` 與 `usdValue` 如何併，以及 `balance` 是 UI 數量還是 raw。

關閉位置：INDEX「Wallet → 列」與 HOW「解析 Helius key」：`balance` 是 **UI 數量**；同一 owner、同一 mint：`balance` 加總；有限 `usdValue` **加總**為 `usdTotal` 並格式化 `usdLabel`；該 mint 完全沒有有限 `usdValue` 時，才用加總後的 UI 數量 × 有限 `pricePerToken`；沒有有限總額則 `usdLabel` 為「—」，禁止畫成 `$0`。跨 **owner** 的顯示字串見已關閉的 M8。

#### M3 — 出貨驗收未覆蓋已定案分支 — **關閉**

初審題旨：出貨清單缺「有 URL 無 key／壞 URL → RPC」、「devnet 即使有 key → RPC 且不打 Jupiter」、以及 Jupiter 不改 SOL 的 symbol／icon。

關閉位置：INDEX「驗收」三條（無 key 或壞 URL → RPC、不打 Wallet、不打 `getAssetsByOwner`；`cluster === "devnet"` → `rpcUrl` 且不打 Jupiter；mainnet Jupiter 覆寫非 SOL 的 name／symbol／icon，`native-sol` 維持 Solana／SOL、icon 不採用 Jupiter、可留 Wallet https `logoUri`）。

#### M4 — HANDOFF starter 低於工作流門檻 — **關閉**

初審題旨：paste-ready 缺「只認檔案、先讀 AGENTS／GUIDELINES／HANDOFF／INDEX＋連結、跟 Track、禁非目標、不改 `../solibra-wallet`、沉默仍守架構禁區」，也未寫無 key 或 devnet → RPC。

關閉位置：HANDOFF「讀檔順序」含 AGENTS、GUIDELINES、INDEX、HOW、0.5.0／0.4.0。Paste-ready 含上述工作流句，並寫明可解析 key **且** mainnet 才打 `https://api.helius.xyz` Wallet Balances；否則（無 URL、解析不到 key、壞 URL、或 devnet）走 `rpcUrl` 的兩 token program；不要 `getAssetsByOwner`；不要 commit。

#### M5 — Wallet／RPC 失敗與壞 payload 未寫到可實作 — **關閉**

初審題旨：壞 JSON、缺 `balances`、缺 `pagination`、單筆缺欄、RPC 只成功一個 program、429 預算未寫死。

關閉位置：INDEX「失敗」與 HOW「解析 Helius key」／「RPC」：頁級 JSON 無法解析、根不是物件、或缺 `balances` 陣列 → 該 owner 失敗，不把本輪已拉到的部分頁當成功交貨（舊快取＋error）。`pagination.hasMore !== true`（含缺 `pagination`）則停止翻頁。單筆缺 `mint`、或 `balance`／`decimals` 不是有限數 → 略過該筆。`getBalance` 或任一次 token program 失敗 → 該 owner 失敗，禁止只合併成功的那一個 program。429：該頁最多再試 2 次（含第一次共最多 3 次 HTTP），`Retry-After` 或指數退避；用盡則整輪停、回快取＋error。

#### M6 — Wallet 把 wrapped SOL 併進 `native-sol`，RPC 仍會另列 — **關閉**

第 2 輪題旨：有 key 且 mainnet 時 SOL 與 wrapped SOL 合成一列；無 key、壞 URL 或 devnet 時 RPC 會再多一張 wrapped mint 卡片。

關閉位置：INDEX「RPC」、HOW「RPC」、INDEX「驗收」：RPC 與 Wallet 都把 wrapped mint `So11111111111111111111111111111111111111112` 的 token account **併入** `native-sol`，不要另成一列；數量＝`getBalance` 的 UI SOL ＋該 mint 的 UI 數量。

#### M7 — 跨 owner 的 `usdTotal` 仍只繼承「加總數量」 — **關閉**

第 2 輪題旨：0.5.0 只寫依 `id` 加總數量；0.7.0 的 `usdValue` 加總句當時限定同一 owner。Jupiter 缺價時合計可能只剩一個成員的美元。

關閉位置：INDEX「跨 owner」與 HOW 開頭：同一 `id` 有限 `usdTotal` **加總**；該 id 完全沒有有限 `usdTotal` 時，才用合併後 UI 數量 × 有限單價；Jupiter finite `usdPrice` 在合併之後覆寫整列（`usdPrice` × 合併後 UI 數量）；`members` 仍只含該 owner 該 id 數量 > 0 的列。畫面字串 `usdLabel` 見已關閉的 M8。

#### M8 — 跨 owner 加總後未要求重寫 `usdLabel` — **關閉**

第 3 輪題旨：跨 owner 已寫有限 `usdTotal` 加總，但沒有像單 owner 那樣要求格式化 `usdLabel`。Jupiter 查無或本輪失敗時，畫面可能仍留第一個 owner 的金額。

關閉位置：INDEX「跨 owner」與 HOW 開頭：算出有限總額之後，用與單 owner 相同規則重寫該列 `usdLabel`；沒有有限總額則 `usdLabel` 為「—」。INDEX 同格並寫：兩個成員同一 mint、兩邊都有有限美元時，卡片金額須是合計。INDEX「驗收」有對應一條。同一格其後仍是 Jupiter finite `usdPrice` 覆寫整列（單價 × 合併後 UI 數量）；主網有報價時終值是這次覆寫，合計字串是覆寫前的合併結果。順序已在同一已定案格寫明，不另開 ID。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉** | INDEX「Wallet → 列」已改為 `usdTotal`／`usdLabel`，不再把 Helius 金額叫做「底價」。HOW 同段。 |
| L2 | **關閉** | INDEX「何時 Wallet API」與 HOW「解析 Helius key」：同一 URL 同時有兩者時，非空 `api-key` 優先，否則非空 `apiKey`。 |
| L3 | **關閉** | INDEX「RPC」與 HOW「RPC」寫出完整 program id：`TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`、`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`。 |
| L4 | **關閉** | INDEX「Jupiter」與 HOW Jupiter 表：symbol 有覆寫時用既有 `iconLetterForSymbol` 重算 `iconLetter`。`home-tokens.ts` 已有此函式名，契約與錨點一致。 |
| L5 | **關閉** | 驗收已改成「icon 不採用 Jupiter（可保留 Wallet 的 https `logoUri`）」。HOW「RPC」同句。不再讀成該列禁止任何 `iconUrl`。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| 未設 Helius → RPC（兩 token program）+ mainnet Jupiter 名稱 | 是 | 無。wrapped SOL 併列見已關閉的 M6 |
| 設了含 `api-key` 的 Helius URL 且 mainnet → Wallet Balances，不打 `getAssetsByOwner` | 是 | 無。Host、分頁、`showNfts=false` 已在已定案 |
| `showNfts` 不開；decimals 0 SPL 不畫 | 是 | 零 SOL 列已由 M1 關閉句寫死 |
| Jupiter 空 key 仍打、不帶 header | 是 | 批間隔繼承 0.4.0，HOW 有寫繼承 |
| `heliusApiUrl` 非空但解析不到 key，或不是可解析 URL → RPC，不打 Wallet、不打 `getAssetsByOwner` | 是 | M3 已關 |
| `cluster === "devnet"` 即使 URL 含 key → `rpcUrl`，且不打 Jupiter | 是 | M3 已關。此路徑的 wrapped SOL 併列見已關閉的 M6 |
| mainnet Jupiter 覆寫非 SOL 的 name／symbol／icon；`native-sol` 維持 Solana／SOL，icon 不採用 Jupiter（可留 Wallet https `logoUri`） | 是 | L5 已關 |
| RPC 與 Wallet 都把 wrapped SOL mint 併進 `native-sol`，不另成一列 | 是 | M6 已關 |
| `wallet/` `npm run build` 通過 | 是 | `wallet/package.json` 的 `build` 含 `tsc --noEmit`。Track 1–3 寫「typecheck」但未寫指令；出貨條已可執行，不另開 ID |
| combined 兩個成員同一 mint、兩邊都有有限美元時，卡片 `usdLabel` 是合計 | 是 | M8 已關。合併先重寫合計字串；同一「跨 owner」格寫明其後 Jupiter finite `usdPrice` 覆寫整列。主網有報價時，手驗終值是單價 × 合併後 UI 數量 |

## 與現碼抽樣

現碼已有與提案同向的切片（可解析 key 且 `cluster === "mainnet"` 才 `GET https://api.helius.xyz/v1/wallet/{owner}/balances`，否則 `fetchRpcHomeTokenRows`；Token 與 Token-2022；`decimals === 0` 的非 SOL 跳過；Jupiter 可改非 SOL 的 name／symbol／icon；倉庫內無 `getAssetsByOwner`）。**同向不是設計通過。** 下表「與已定案不一致」是實作落差，留給實作階段，不升成設計 HIGH。

| 錨點 | 與提案 | 說明 |
|------|--------|------|
| `home-tokens.ts` | 實作落差（M6 契約已關） | `buildHomeTokenRows`：lamports → `native-sol`（可為 0）；token account 同 mint 加總 raw；非 SOL 的 raw／uiAmount／decimals 為 0 不列。尚未把 wrapped mint 併進 `native-sol`。兩 program 為 `Promise.all`，提案未禁止同一 owner 內並行。 |
| `home-tokens-service.ts` | 實作落差（對已關閉句子） | 缺 `balances` 陣列時現碼當成空陣列成功，INDEX／HOW 要求該 owner 失敗。同一 owner 的 SOL `usdTotal` 現碼是後筆蓋前筆，已定案要求有限 `usdValue` 加總。`extractHeliusApiKey` 在 `api-key` 存在但空白時不會改讀 `apiKey`，已定案是「非空 `api-key` 優先，否則非空 `apiKey`」。`mergeMultiOwnerRows` 只加 `uiAmount`，不加上 `usdTotal`、不重寫 `usdLabel`（M7、M8 契約已關）。 |
| `background/index.ts` | 不互斥 | `wallet.getHomeTokens` 在 SW 處理，結果經該次 `sendResponse` 回發起端。不是把持倉列廣播到全部 tab。 |
| `commands.ts` | 不互斥 | 已有 `wallet.getHomeTokens`。本版不新增 command，也不新增 Wallet Standard 方法。 |
| `storage-keys.ts` | 不互斥 | 已有 `heliusApiUrl`、`jupiterApiKey`、`rpcUrl`、`cluster`。`cluster` 只有 `mainnet`｜`devnet`。提案不新增 Settings 欄。持倉列不在 storage 鍵裡。 |
| `popup/main.ts` | 不互斥 | Home 只 `sendExtensionRequest("wallet.getHomeTokens")`，不直連 Helius／Jupiter／RPC 組持倉。卡片金額寫入 `row.usdLabel`（M8 要求 SW 在交貨前重寫該欄；popup 不另算合計）。 |

指紋現碼比 0.4.0 HOW 多了 `rpcByCluster` 成分，同時仍含 `rpcUrl`。本版寫繼承指紋，且 fallback 用 `rpcUrl`。多出來的成分不使本版主路徑互斥。`docs/roadmap/backlog/` 不是本版契約，不另開 ID。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | **關閉** | INDEX「Wallet → 列」；HOW「解析 Helius key」末段、「RPC」 |
| M2 | MEDIUM | **關閉** | INDEX「Wallet → 列」；HOW「解析 Helius key」（同一 owner）。跨 owner 顯示字串見已關閉的 M8 |
| M3 | MEDIUM | **關閉** | INDEX「驗收」無 key／壞 URL、devnet、Jupiter 不改 SOL symbol／icon |
| M4 | MEDIUM | **關閉** | HANDOFF「讀檔順序」與 paste-ready |
| M5 | MEDIUM | **關閉** | INDEX「失敗」；HOW「解析 Helius key」、HOW「RPC」 |
| M6 | MEDIUM | **關閉** | INDEX「RPC」；HOW「RPC」；INDEX「驗收」wrapped SOL 併入 `native-sol` |
| M7 | MEDIUM | **關閉** | INDEX「跨 owner」；HOW 開頭（`usdTotal` 加總）。`usdLabel` 見已關閉的 M8 |
| M8 | MEDIUM | **關閉** | INDEX「跨 owner」；HOW 開頭；INDEX「驗收」combined 卡片 `usdLabel` 是合計 |
| L1 | LOW | **關閉** | INDEX「Wallet → 列」用 `usdTotal`／`usdLabel`，不再寫「底價」 |
| L2 | LOW | **關閉** | INDEX「何時 Wallet API」；HOW「解析 Helius key」 |
| L3 | LOW | **關閉** | INDEX「RPC」；HOW「RPC」完整 program id |
| L4 | LOW | **關閉** | INDEX「Jupiter」；HOW Jupiter 表 `iconLetterForSymbol` |
| L5 | LOW | **關閉** | INDEX「驗收」；HOW「RPC」：不採用 Jupiter icon，可留 Wallet https `logoUri` |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-03 | 無 HIGH；提案可行；M1–M5 仍開，設計門檻尚未通過 |
| 第 2 輪複審 | 2026-10-03 | 無 HIGH；M1–M5、L1–L4 已落檔並關閉；M6、M7 仍開，設計門檻尚未通過；不是整份不可行 |
| 第 3 輪複審 | 2026-10-03 | 無 HIGH；M6、M7、L5 已落檔並關閉；M8 仍開，設計門檻尚未通過；不是整份不可行 |
| 第 4 輪複審 | 2026-10-03 | 無 HIGH；M8 已落檔並關閉；無新開應修 MEDIUM；設計門檻通過；不是整份不可行 |
