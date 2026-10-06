# Design review — 0.18.0 Airwave Wallet

- 日期：2026-10-07（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（初審同日；累加於本檔）
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收（狀態現為 `planned`）；[`home-activity-how.md`](./home-activity-how.md)、[`reasoning.md`](./reasoning.md)、[`../HANDOFF.md`](../HANDOFF.md)
- 上游：[`../../0.17.0/INDEX.md`](../../0.17.0/INDEX.md)（本版不改簽核／送出／底欄殼）；殼語意另見 [`../../0.3.0/docs/popup-shell-how.md`](../../0.3.0/docs/popup-shell-how.md)（底欄只在 Home、返回不記住 Activity）
- 構想（非本版契約）：[`../../backlog/home-activity.md`](../../backlog/home-activity.md)
- 畫面：[`../../../design-demos/home-activity-ux.html`](../../../design-demos/home-activity-ux.html)（INDEX 點名；與已定案衝突時以 INDEX／HOW 為準）
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`wallet/src/shared/home-activity.ts`、`wallet/src/background/home-activity/`、`wallet/src/popup/components/HomeActivityList.tsx`、`wallet/src/shared/commands.ts`（現碼未實作本版 ≠ 設計 HIGH；僅標與提案互斥的現行行為）
- **總評：** 無未關閉 HIGH。初審應修 MEDIUM M1–M6 均已寫進 INDEX／HOW／HANDOFF 並關閉；同意的 MEDIUM 無仍開項。提案仍可行：查詢只在 SW、不進 storage、不進 inject 白名單、金額顯示用 BigInt／UI number 只轉字串、不碰 pending／custody／Wallet Standard 宣告，與架構禁區可調和；待拍板為空。本輪無新增 HIGH／應修 MEDIUM。**設計門檻通過**——規劃可改 INDEX 狀態為 `in progress` 並依 HANDOFF 開工。不是整份不可行。本檔不是已定案。

## Findings（累加；穩定 ID 勿重編）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉或缺口；非阻擋＝記錄即可。

### HIGH

（無）

未發現：pending 改走 storage hydrate、結果預設全 tab 廣播、手寫 rehydrate 當主同步、活動歷史進持久 store、硬編碼密碼、inject 持長期私鑰、宣告未實作的 Wallet Standard 方法，或 INDEX↔HOW 互斥到主路徑（mainnet＋key 解析列／其餘簽名粗列）不可實作。

### MEDIUM

#### M1 — HOW 未寫「地址無法解析 → unavailable」— **關閉**（第 2 輪）

複審：HOW「誰被查」已寫：有 active 但 `getExposedPublicKey` 無法建成合法 `PublicKey` → `{ rows: [], error: "unavailable" }`，畫面「活動暫時無法載入」，與無 active →「尚無交易」分開。INDEX「失敗」一致。

#### M2 — 切換後過期回應是否忽略未寫死 — **關閉**（第 2 輪）

複審：HOW「畫面」已寫：每次查詢須可取消或帶世代；只套用仍有效的那次結果，過期／已取消回應不得改 phase 或 rows。與驗收「切帳戶或 cluster 後列表跟著變」可對齊。

#### M3 — 出貨驗收未覆蓋「Helius 失敗不退回簽名粗列」— **關閉**（第 2 輪）

複審：INDEX 驗收已加手驗句：mainnet 且已設可解析 Helius key，人為使 enhanced transactions 失敗 →「活動暫時無法載入」，不要出現成功／失敗簽名粗列。HOW「不要退回簽名列表」、reasoning 否決列仍在。

#### M4 — INDEX 已定案缺版本號對齊句 — **關閉**（第 2 輪）

複審：INDEX「已定案」已有「版本號」列：`package.json`／`manifest.config.ts`／`version.md`／`changelog.md` 對齊 `0.18.0`；`shipped` 須使用者同意。與 HANDOFF 完成檢查一致。

#### M5 — HANDOFF starter 低於工作流門檻 — **關閉**（第 2 輪）

複審：HANDOFF paste-ready 已含跟 Track 1→2、禁非目標（見 INDEX）、INDEX 沉默才提問、沉默時仍守 GUIDELINES 架構禁區；禁區節亦列非目標摘要。符合 `agent-workflow.md` starter 最低要素。

#### M6 — 文件狀態已 `in progress` 但設計審查尚未收斂 — **關閉**（第 2 輪）

複審：INDEX 狀態現為 `planned`，並註「設計審查未關前勿當契約已凍結；閘門通過後才改 `in progress`」。HANDOFF 禁區同向。流程分叉已消。本輪門檻通過後，由規劃改狀態即可開工。

### LOW

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| L1 | **關閉**（第 2 輪） | INDEX「構想來源」與 HOW「列」已寫：金額符號／文案以已定案為準，不以概念稿示範列（如 JUP）為準。 |
| L2 | **關閉**（第 2 輪） | HOW「畫面」已重申列尾圖示熱區 **32×32**；INDEX「Solscan」亦有 32px。 |
| L3 | **非阻擋** | 概念稿外層 caption「尚無紀錄」與畫面內文「尚無交易」不一；產品字以 INDEX「尚無交易」為準，可不改 demo。 |

本輪無新增 LOW／MEDIUM／HIGH。

## 驗收對照（第 2 輪）

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| Activity 有資料時一列一筆，種類為送出／收到／互換／交易 | 是 | 種類規則在 INDEX／HOW；多腿同向 TRANSFER 取哪一腿明細仍未寫死（非主路徑，非阻擋） |
| 只有列尾圖示開 Solscan 新分頁；devnet URL 含 `cluster=devnet` | 是 | HOW 有 32×32、`chrome.tabs.create`、URL 前綴 |
| 載入中、尚無交易、活動暫時無法載入三態一致，且失敗不留上一份列表 | 是 | HOW 先清列＋忽略過期回應（原 M2 已關） |
| 聚合只查主地址；切帳戶或 cluster 後列表跟著變 | 是 | 查誰＋畫面世代／取消已定 |
| 歷史不進 `chrome.storage`；未加套件 | 是 | INDEX／HOW／非目標一致 |
| `cd wallet && npm run typecheck` 與 `npm run build` 通過 | 是 | 可執行 |
| 手驗：mainnet＋Helius 解析列；devnet 或無 key 見粗列 | 是 | — |
| 手驗：mainnet＋可解析 key 但 Helius 失敗 → unavailable，非粗列 | 是 | 原 M3 已關 |
| 文件與程式無真實密碼／助記詞／私鑰 | 是 | HOW 另禁 API key 進錯誤字串 |

## 與現碼抽樣（第 2 輪）

現碼未做本版 ≠ 設計 HIGH。抽樣觀察（供規劃對照；**不**把現碼當已定案）：

| 錨點 | 與提案關係 |
|------|------------|
| `wallet/src/shared/commands.ts` | 已有 `"wallet.getHomeActivity"`。`wallet/src/content/index.ts` 的 `PAGE_COMMANDS` **未**含此字串 → 與「不進 content／inject 白名單」**不互斥**。 |
| `wallet/src/shared/home-activity.ts` | 已有 kind／lead／Solscan／`rowFromEnhanced`／`rowFromSignature`／BigInt 格式化／UI number 只轉字串 → 與已定案**同向**，非互斥。 |
| `wallet/src/background/home-activity/` | SW 內查詢：mainnet＋`extractHeliusApiKey` 打 Helius enhanced；否則 `getSignaturesForAddress`；失敗／公鑰無效 → `unavailable`；無寫活動歷史進 storage → **不互斥**（與 HOW「誰被查」已對齊）。 |
| `wallet/src/popup/components/HomeActivityList.tsx` | 僅 `sendExtensionRequest("wallet.getHomeActivity")`；三安靜態文案與 INDEX 一致；Solscan 經 `chrome.tabs.create`；effect 有 `cancelled` → 與 HOW 過期回應規則**同向**。 |
| `wallet/manifest.config.ts` | 版本對齊屬出貨項（已定案「版本號」）；`host_permissions`／`tabs` 與 Helius／RPC／`tabs.create` **不互斥**。 |

未把 `brainstorm/` 或 `../solibra-wallet` 當現行程式。架構禁區：本版無新 pending；設定仍走既有 `chrome.storage`；活動列僅 popup 記憶體 state。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | **關閉** | HOW「誰被查」：公鑰無法解析 → `unavailable` |
| M2 | MEDIUM | **關閉** | HOW「畫面」：可取消／世代；忽略過期回應 |
| M3 | MEDIUM | **關閉** | INDEX「驗收」：Helius 失敗不退回粗列手驗 |
| M4 | MEDIUM | **關閉** | INDEX「已定案」：版本號對齊 |
| M5 | MEDIUM | **關閉** | HANDOFF paste-ready＋禁區：Track／非目標／架構禁區 |
| M6 | MEDIUM | **關閉** | INDEX 狀態 `planned`＋設計閘門註；HANDOFF 禁區同句 |
| L1 | LOW | **關閉** | INDEX「構想來源」；HOW「列」不以 demo JUP 為準 |
| L2 | LOW | **關閉** | HOW「畫面」：圖示 32×32 |
| L3 | LOW | **非阻擋** | demo caption「尚無紀錄」；產品「尚無交易」 |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 初審 | 2026-10-07 | 無 HIGH，提案可行；應修 MEDIUM M1–M6 仍開 → **設計門檻未通過**。不是不可行。 |
| 第 2 輪複審 | 2026-10-07 | 對照現 INDEX／HOW／HANDOFF：M1–M6、L1–L2 已關閉；L3 非阻擋；無新增應修項；無未關閉 HIGH → **設計門檻通過**。不是不可行。 |
