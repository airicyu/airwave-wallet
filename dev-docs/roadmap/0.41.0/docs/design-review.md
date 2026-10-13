# Design review — 0.41.0 Airwave Wallet

- 日期：2026-10-14（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**。第 1 輪為初審；更早是待審草稿，沒有 finding ID。
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；[HOW](./how.md)、[reasoning](./reasoning.md)、[HANDOFF](../HANDOFF.md)
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：`OnboardingScreens.tsx`、`generate-seed-flow.ts`、`secret-key-accounts.ts`、`keypair-bytes.ts`；概念稿 [`create-wallet-draft-ux.html`](../../../design-demos/create-wallet-draft-ux.html)
- **總評：** 無未關閉 HIGH。提案可行。設計審查門檻通過：第 1 輪同意的 M1–M3 已寫進 INDEX／HOW／驗收手驗句並關閉。本輪新開 M4（HANDOFF paste-ready 缺開工最低要素），標非阻擋，不擋開工。使用者 2026-10-14 書面同意概念稿，不因此開 HIGH。

## 2026-10-14 — 待審草稿（無 finding ID）

概念稿已出時的占位總評曾寫「設計閘門尚未通過」。該句已被 INDEX「開工前仍須拍板：（無）」與 Track 1 驗收註記取代。本輪不沿用該結論。

## Findings（第 2 輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。第 1 輪題旨見下方「第 1 輪題旨」。

### HIGH

（無。第 1 輪亦無。）

### MEDIUM

| ID | 本輪狀態 | 依據 |
|----|----------|------|
| M1 | **關閉** | HOW「UI 結構」已改為兩頁都顯示 `onboarding.solanaPubkey`，與 INDEX「文案」「助記詞間距」及概念稿 `#phone-seed` 一致。 |
| M2 | **關閉** | INDEX「入庫」與 HOW「SW `handleGenerateAccount`」已寫死：該欄存在但解碼失敗（空字串、壞 base58、長度不對）→ `BAD_SECRET`（或同等既有碼），不得改走 `generateRandomLoadedAccount`。INDEX「測試」手驗句含壞 `secretKeyBase58`。 |
| M3 | **關閉** | INDEX「殼底」、HOW 兩段重骰、reasoning「為何重骰未完成不可建立」已寫：重骰尚未把新 draft 寫進畫面時 disable 骰子與主按鈕；送出的 mnemonic／`secretKeyBase58` 必須與當時畫面公鑰同一組。手驗句含「重骰未完成時不可建立」。 |
| M4 | **仍開**（非阻擋） | [`HANDOFF.md`](../HANDOFF.md) 已有 paste-ready，但未含 agent-workflow 開工最低要素：只認檔案、先讀 `AGENTS.md` 與 GUIDELINES、禁非目標。INDEX 文件地圖仍寫「設計閘門通過後補 paste-ready」。不與已定案產品語意矛盾，不擋本輪門檻。 |

### 第 1 輪題旨（保留）

| ID | 第 1 輪依據（摘要） |
|----|---------------------|
| M1 | HOW 曾寫助記詞頁可省略公鑰標籤，與 INDEX 已定案及概念稿不一致。 |
| M2 | 未寫 `secretKeyBase58` 解碼失敗時必須拒絕、不得改走隨機產生。 |
| M3 | 未寫重骰未完成時不可建立，以及送出內容須與畫面公鑰同一組。 |

### LOW

| ID | 狀態 | 依據 |
|----|------|------|
| L1 | **仍開** | HOW 助記詞重骰寫 `err` 清空；拋棄式 `rollBurnerDraft` 只寫更新 `pk`。建議補同一句：重骰清空該頁 inline 錯誤。 |
| L2 | **仍開** | HOW cleanup 寫「zeroize draft secret reference」。JavaScript 字串無法保證記憶體清零。建議改成：卸載時丟掉 draft 參考、不寫 `chrome.storage`。 |
| L3 | **仍開** | 新欄名 `secretKeyBase58` 與現有 `handleImportAccount` 的 `secret`／`secretBase58`（含 JSON 位元組陣列）不同。INDEX 已限定 base58。建議 HOW 加一句：本欄只接受 base58，不接受 import 那條 JSON 陣列形狀。 |

## 驗收對照

| 驗收句 | 設計層是否可測 | 缺口 |
|--------|----------------|------|
| Track 1 使用者同意概念稿 | 可。INDEX 與「開工前仍須拍板」已寫 2026-10-14 同意 | 無 |
| Track 2–3 手驗與建置 | 手驗句可測：重骰、無助記詞整組 copy、建立後帳戶、進頁見地址、產生入庫；指令 `cd wallet && npm run typecheck && npm run build` | 第 2 輪：INDEX「測試」已補「重骰未完成時不可建立」與「壞 `secretKeyBase58` 拒絕且不產生新隨機帳戶」。M2、M3 缺口關閉 |
| backlog 兩項刪列；changelog／版本號 | 出貨檢查，非本輪設計缺口 | 構想檔仍在；出貨時刪列。本輪不把 backlog 當契約 |
| 狀態 `shipped` | 出貨時 | 現為 `planned` |

## 與現碼抽樣

現碼未做本版，不記設計 HIGH。

| 錨點 | 現況 | 與提案 |
|------|------|--------|
| `GenerateSeedScreen` | 進頁 `createGenerateSeedDraft()` 一次；有 `btn-copy-seed-words`；公鑰列已有 `shortAddr`＋複製；無公鑰標籤、無骰子 | 提案要改的行為，不互斥 |
| `handleImportSeedAccount` | 建立時一次送 mnemonic | 與「僅按建立時送 draft」一致 |
| `GenerateBurnerScreen` | 按產生才 `wallet.generateAccount`（無 secret）；成功後才顯示公鑰 | 提案改為進頁 draft，不互斥 |
| `handleGenerateAccount` | 忽略 payload secret，一律 `generateRandomLoadedAccount` 再入庫 | 提案加可選欄；省略時須保持此行為 |
| `vault-password.ts` | 首次建庫另呼叫 `generateRandomLoadedAccount` | INDEX 非目標不改首次 onboarding；無衝突 |
| 訊息 | popup `sendExtensionRequest` 對 SW；結果帶 `requestId` | 與 pending／廣播禁區無新路徑。Draft 明文不進 storage，與禁區一致。簽名仍在擴充，不經 inject |

架構禁區 1–7：本版不改 pending、不廣播、不把 draft 寫進持久 Zustand、不硬編碼密碼、不新增 Wallet Standard 方法宣告。`secretKeyBase58` 與既有 mnemonic payload 同為擴充 UI → SW 的當次 custody 材料。

## 修復追蹤表

| ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節） |
|----|----|------|------------------------------|
| M1 | MEDIUM | 關閉（第 2 輪） | HOW「UI 結構」標籤句；INDEX「文案」 |
| M2 | MEDIUM | 關閉（第 2 輪） | INDEX「入庫」；HOW「SW `handleGenerateAccount`」；INDEX「測試」 |
| M3 | MEDIUM | 關閉（第 2 輪） | INDEX「殼底」；HOW 重骰兩節；reasoning 同題；INDEX「測試」 |
| M4 | MEDIUM | 仍開（非阻擋） | HANDOFF paste-ready 對齊 agent-workflow 最低要素 |
| L1 | LOW | 仍開 | HOW「Burner draft」仍只寫更新 `pk`；助記詞節有 `err` 清空，拋棄式未寫 |
| L2 | LOW | 仍開 | HOW cleanup 仍寫「zeroize draft secret reference」 |
| L3 | LOW | 仍開 | HOW 寫「與既有 import 路徑同形」，未寫本欄只接受 base58、不接受 import 的 JSON 陣列。INDEX 已把解碼失敗定成拒絕，不升 HIGH |

## 歷審摘要

| 輪次 | 日期 | 結論 |
|------|------|------|
| 待審草稿（無 ID） | 2026-10-14 | 占位：當時寫閘門未過。已被同意紀錄取代 |
| 第 1 輪 | 2026-10-14 | 無 HIGH；門檻通過、可開工；M1–M3 仍開 |
| 第 2 輪 | 2026-10-14 | 無 HIGH；M1–M3 關閉；M4 新開且非阻擋；門檻通過、可行 |
