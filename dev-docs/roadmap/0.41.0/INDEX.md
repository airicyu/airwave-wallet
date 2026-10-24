# 0.41.0 — 產生助記詞／拋棄式錢包（draft＋重骰）

- **狀態：** `shipped`
- **上游版本：** [0.40.0](../0.40.0/INDEX.md)
- **Changelog：** [`changelog.md`](../../../changelog.md)（0.41.0，出貨時寫入）
- **構想來源：** [create-mnemonic-wallet.md](../backlog/create-mnemonic-wallet.md)、[create-burner-wallet.md](../backlog/create-burner-wallet.md)
- **概念稿：** [`create-wallet-draft-ux.html`](../../design-demos/0.41.0/create-wallet-draft-ux.html)（使用者已於 2026-10-14 同意；此後才改 `wallet/`）
- **畫面：** [`dev-docs/design-principles.md`](../../design-principles.md)

## 產品句

Add account 的 **助記詞錢包**與**拋棄式錢包**改為「先入庫前 preview」：進頁即有 draft 公鑰；**骰子**可本機重骰直到滿意地址再按殼底建立。助記詞頁**移除整組助記詞複製**；公鑰列保留複製（非秘密）。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)（設計閘門通過後補 paste-ready）
5. [docs/design-review.md](./docs/design-review.md)

## 已定案

### 共通

| 題 | 決定 |
|----|------|
| 範圍 | 僅 `add-generate-seed`、`add-generate`（`GenerateSeedScreen`、`GenerateBurnerScreen`）。**不**改首次 vault 建立、匯入助記詞、Reveal |
| 骰子 | Stroke icon button（概念稿 dice）；`title`／`aria-label`＝catalog `onboarding.regenerateDraft`（三語）。**直接重骰**，無確認對話 |
| 骰子樣式 | `.dice-btn`：**45×45** 圓形、透明底、**2px 紫色描邊**（`#9945ff`）；內嵌等角立體骰 SVG **約 34px**：外框與內部分線各描一次（共用邊不疊線）、邊線 **0.72**、三面淡填（頂 0.10／左 0.16／右 0.26）、點 **r≈0.58**（頂 2、左 1、右 3）。實作可抽 `IconDice3d` |
| 助記詞間距 | 骰子 toolbar 與 12 詞格之間、詞格與 `onboarding.solanaPubkey` 標籤之間 **加大垂直間距**（概念稿 `#phone-seed` 參考值） |
| 骰子位置 | `.draft-toolbar` **靠右**單一骰子（取代原助記詞 copy toolbar） |
| 拋棄式間距 | 名稱欄與骰子之間加垂直間距（概念稿 `#phone-burner .draft-toolbar` `padding-top: 10px`；用 padding 以免與 `.field` 的 12px 下距折疊） |
| 點擊回饋 | 點骰子時 **SVG** 先上跳 **3px** 再左右微晃、落回原位（約 0.21s）；圓框不晃。助記詞與拋棄式相同。動畫未結束再按，**從第一幀重播** |
| Draft | 進頁產生 draft；重骰只更新 UI state；**Back／離開頁**丟棄 draft secret／助記詞（不寫 storage） |
| 公鑰預覽 | `.addr-row`：`shortAddr` 顯示、`title` 全文、右側 **複製公鑰** icon（沿用 `common.copy`） |
| 殼底 | 助記詞：`common.create`；拋棄式：仍 `onboarding.generate`（語意＝確認寫入）。建立請求進行中，或重骰尚未把新 draft 寫進畫面時，disable 骰子與主按鈕。送出的 mnemonic／`secretKeyBase58` 必須與當時畫面上的公鑰同一組 |
| 文案 | 助記詞警示仍 `onboarding.seedBackupWarn`。助記詞頁與拋棄式頁都顯示地址區標籤 `onboarding.solanaPubkey`（不可只靠 `addr-row` 省略標籤） |

### A — 助記詞錢包

| 題 | 決定 |
|----|------|
| 移除 | `btn-copy-seed-words`、`copySeedWords`、整組助記詞複製 |
| 重骰 | 本機 `createEnglishMnemonic12` + `keypairFromMnemonic(phantom, 0)`；更新 12 詞格與公鑰列 |
| 建立 | 仍 `wallet.importSeedAccount`（一次）；僅在按建立時送當前 draft mnemonic |
| 勾選 | **不**加「我已手抄」才可建立 |

### B — 拋棄式錢包

| 題 | 決定 |
|----|------|
| Draft | 進頁 `generateRandomLoadedAccount`（可放在 `generate-burner-flow.ts`）；secret 只留 popup 記憶體 |
| 版面 | 名稱欄 → `draft-toolbar`（骰子）→ 公鑰標籤＋`addr-row`（建立前即顯示，非僅成功屏） |
| 入庫 | 擴充 `wallet.generateAccount`：可選 payload `secretKeyBase58`（當次請求）；SW 驗證解碼後入 vault，**禁止**先建再刪帳戶。未帶該欄時行為與現版相同（向後相容）。該欄存在但解碼失敗（空字串、壞 base58、長度不對）→ 拒絕，沿用現有 import 的 `BAD_SECRET`（或同等既有碼），**不得**改走 `generateRandomLoadedAccount` |
| 成功後 | 現有成功勾、`Done`、rpc-guide 路徑 **不變** |

## 非目標

- Vanity／靚號 grind、鏈外服務
- 助記詞或 secret 複製進剪貼簿（**含**整組 12 詞；公鑰複製除外）
- 改 Combined／觀察／匯入流程
- 首次建立錢包 onboarding 其他步驟

## 開工前仍須拍板

（無。使用者已於 2026-10-14 同意 [`create-wallet-draft-ux.html`](../../design-demos/0.41.0/create-wallet-draft-ux.html)。）

## 實作軌道

### Track 1 — 概念稿對齊（設計閘門）

**做：** 使用者審 [`create-wallet-draft-ux.html`](../../design-demos/0.41.0/create-wallet-draft-ux.html)；必要時修 demo／INDEX。

**驗收：** 使用者書面同意 demo 方向。（2026-10-14 已同意。）

### Track 2 — 助記詞頁

**做：** `generate-seed-flow` 重骰函式；`AddGenerateSeedScreen` UI／CSS；移除 copy；i18n `onboarding.regenerateDraft`。

**驗收：** 手驗重骰、無助記詞 copy、建立後帳戶正確；`typecheck`／`build`。

### Track 3 — 拋棄式頁＋SW

**做：** `generate-burner-flow.ts`；`GenerateBurnerScreen`；`handleGenerateAccount` 可選 `secretKeyBase58`；離頁清 draft。

**驗收：** 手驗進頁見地址、重骰、產生入庫；`typecheck`／`build`。

## 驗收（出貨）

- [x] Track 1 使用者同意概念稿
- [x] Track 2–3 手驗與建置（使用者 2026-10-14 確認畫面）
- [x] backlog 兩項刪列；`changelog`／版本號
- [x] 狀態 `shipped`

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/onboarding/OnboardingScreens.tsx` | 兩個 screen |
| `wallet/src/popup/onboarding/generate-seed-flow.ts` | 助記詞 draft／reroll |
| `wallet/src/popup/onboarding/generate-burner-flow.ts` | Burner draft（新） |
| `wallet/src/background/wallet/commands/account/secret-key-accounts.ts` | `generateAccount` |
| `wallet/src/shared/keypair-bytes.ts` | `generateRandomLoadedAccount` |
| `wallet/src/popup/style.css` | `.draft-toolbar` 等 |

## 測試

`cd wallet && npm run typecheck && npm run build`。手驗 Add account 兩條路徑：重骰未完成時不可建立；帶壞 `secretKeyBase58` 時拒絕且不產生新隨機帳戶。
