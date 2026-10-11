# Design review — 0.33.0 Airwave Wallet

- 日期：2026-10-12（Asia/Hong_Kong）
- 輪次：**初審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`how.md`](./how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/approval/sign-tx-body.ts`（`deltaDisplayFingerprint`、`paintDeltaInner`）、`wallet/src/approval/shell.ts`（`paintDeltaOnly`）、`wallet/src/background/simulate/phase2-deltas.ts`（`buildDeltas`）、`wallet/src/background/home-tokens/home-tokens-service.ts`（`lookupJupiterMintMetadata`、`parseJupiterSearchArray`）、`wallet/src/shared/simulate-pending-tx-types.ts`
- **總評：** 有未關閉 HIGH。產品方向與 anti-spoof 規則自足、可實作；須先收斂「Jupiter 顯示更新 vs fingerprint 短路」與 HOW 快取／fingerprint 契約後再開實作 agent。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH

#### H1 — Jupiter 顯示更新與 `deltaDisplayFingerprint` 短路衝突 — **仍開**

**問題：** INDEX 已定案 `deltaDisplayFingerprint` **只**依 `kind`／`mint`／`sign`／`amount`，**不含** Jupiter／`display`；並允許 Jupiter 資料晚到時**只重画** `deltaInner`（不重建卡殼）。現碼 `shell.ts` 的 `paintDeltaOnly` 在 `deltaDisplayFingerprint(sim)` 與上一拍相同且 `deltaInner` 已有子節點時**直接 return**，不呼叫 `paintDeltaInner`。

**為何是 HIGH：** 典型情境：第一拍模擬 Jupiter 逾時或尚未命中快取 → 列為未驗證；數秒後週期重模擬（或快取補齊）回傳**相同**差額但 `display` 已含 verified／icon／symbol。fingerprint 不變 → UI 永遠停在第一拍的未驗證呈現，違反 INDEX 刷新意圖與驗收「USDC 已驗證盾＋圖＋symbol」；亦使「fingerprint 刻意排除 Jupiter」失去意義。

**建議寫進 HOW（或 INDEX「刷新行為」一條完整句）：** 每次 `simulatePendingTx` 成功回傳且 `outcome === "ok"` 時，若任一 delta 的 `display` 序列化摘要（建議：`trust`＋`labelPrimary`＋`amountSuffix`＋`iconUrl` 或等價）與上次绘制不同，**必須**呼叫 `paintDeltaInner`，即使 `deltaDisplayFingerprint` 未變；禁止僅依 fingerprint 短路跳過重画。可選：在 `shell.ts` 維護 `lastDeltaDisplayFingerprint` 與 `lastDeltaFingerprint` 雙軌比對。

---

### MEDIUM

| ID | 標題 | 本輪狀態 | 依據 |
|----|------|----------|------|
| M1 | HOW 未寫死 Jupiter mint 記憶體快取 | 仍開 | INDEX 已定案「全域 mint 快取、無 TTL」與 key 變更失效，並要求「须在 HOW 寫死」；`how.md` 僅描述 enrichment 步驟，未寫快取模組位置、`jupiterApiKey`／settings 指紋對齊 `homeTokensCacheFingerprint` 是否復用、與 Home 快取是否分離 |
| M2 | `deltaDisplayFingerprint` 字串格式未入 HOW | 仍開 | INDEX 已定案欄位為 `kind`／`mint`／`sign`／`amount`；HOW「Fingerprint」節未給拼接規則；現碼為 `symbol:sign:amount`（`sign-tx-body.ts`），實作易與 INDEX 分叉 |
| M3 | INDEX「Jupiter 晚到」與 HOW「預設同步 enrichment」語意並存 | 仍開 | HOW 寫 2s 上限後同步回傳，並留「日後非同步」；INDEX 刷新行為表達為可晚到重画。建議 HOW 明寫 **0.33 僅同步 enrichment**（在 SW 內 await，含逾時），非同步補全列非目標或移 backlog；若保留非同步，須與 H1 解法一併寫死 |
| M4 | `lookupJupiterMintMetadata` 略過無 symbol 且無 icon 的 hit | 仍開 | 現碼在兩者皆缺時 `continue`，不寫入 map（`home-tokens-service.ts`）。擴充 `isVerified` 後，若 Jupiter 只回 `isVerified` 而無 symbol／icon，enrichment 無法標 verified；建議 HOW 寫：仍視 unverified，或改 parser 保留 `isVerified`-only 條目 |
| M5 | 破圖／非 https icon 的列級 fallback | 仍開 | HOW 規定 `iconUrl` 僅 https；未寫 `<img>` onerror 是否回退 `iconLetter`（Home 列有類似模式可對照）。影響手驗穩定性，建議一句寫進 HOW「列 DOM」 |

### LOW

| ID | 標題 | 本輪狀態 | 依據 |
|----|------|----------|------|
| L1 | `sanitizeSymbol` 放置路徑 | 記錄 | HOW 有規則；未指定 `shared/` 模組名，實作可自決 |
| L2 | 信任盾 SVG 是否抽共用 | 記錄 | INDEX 要求 inline SVG；是否與其他畫面共用未寫，不阻擋 |
| L3 | 是否復用 `peekCachedMintDisplay` | 記錄 | 非目標外優化；INDEX 已允許 SW 記憶體快取，不必強制讀 Home cache |

## 驗收對照

| INDEX 驗收句（摘要） | 設計層是否可測 | 缺口 |
|--------------------|----------------|------|
| 成功列四欄＋每列信任盾 | 是 | HOW DOM／CSS 已對齊概念稿 grid |
| SOL 列規則 | 是 | native `display` 分支清楚 |
| USDC 等 verified 列 | 是 | 受 **H1** 影響：週期重模擬＋快取命中時可能不更新 UI |
| 未驗證 SPL anti-spoof | 是 | reasoning＋主標規則一致 |
| SVG 盾、無 Unicode 勾 | 是 | |
| mainnet Jupiter／devnet 不打 | 是 | 與 0.4.0 復用路徑明確 |
| 3 秒僅 `deltaInner`、不重建殼 | 部分 | 殼層行為繼承 0.32.0；**H1** 關乎 inner 是否真會更新 |
| Jupiter 失敗仍 ok | 是 | |
| `walletSend` 同規則 | 是 | INDEX 有寫；HOW 可選加一句走路徑相同 |

## 與現碼抽樣

| 現況 | 與 0.33.0 提案關係 |
|------|-------------------|
| `SimulateTxDelta` 僅 `symbol`／`amount`／`sign` | 預期擴充；非設計缺陷 |
| `buildDeltas` SPL `symbol`＝`shortPk(mint)` | 與 HOW phase-2 一致 |
| `paintDeltaInner` 兩欄 symbol＋amount | 將改四欄；非互斥 |
| `deltaDisplayFingerprint` 用 `symbol` 非 `kind`／`mint` | 實作時須跟 INDEX／HOW（**M2**） |
| `parseJupiterSearchArray` 已解析 `isVerified`；`lookupJupiterMintMetadata` 未回傳 | 與 Track 1 擴充方向一致（**M4**） |
| `paintDeltaOnly` fingerprint 相同則跳過 inner | 與 INDEX 刷新＋Jupiter 欄位排除策略**互斥**（**H1**） |

現碼未做本版 ≠ 設計 HIGH（上表最後一項為**契約與現有 shell 行為對 INDEX 的衝突**，須在文件收斂，非要求先改碼）。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（建議） |
|----|-----|------|------------------|
| H1 | HIGH | 仍開 | HOW「Fingerprint 與 Jupiter 時序」＋必要時 INDEX「刷新行為」一句 |
| M1 | MEDIUM | 仍開 | HOW 新節「Jupiter mint 快取」 |
| M2 | MEDIUM | 仍開 | HOW「Fingerprint」拼接範例 |
| M3 | MEDIUM | 仍開 | HOW 同步範圍宣告，或 INDEX 非目標 |
| M4 | MEDIUM | 仍開 | HOW enrichment 步驟 3／parser 行為 |
| M5 | MEDIUM | 仍開 | HOW「列 DOM」img fallback |
| L1–L3 | LOW | 記錄 | — |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-12 | 1 項 HIGH（Jupiter 顯示更新 vs fingerprint 短路）；5 項 MEDIUM 建議併入 HOW；提案可行 |
