# 0.46.0 — 密鑰列：平時鉛筆，編輯才確認

- **狀態：** `shipped`
- **上游版本：** [0.45.0](../0.45.0/INDEX.md)。秘密列形狀沿用 [0.8.0](../0.8.0/INDEX.md) 的 Helius／Jupiter 與 [0.30.0](../0.30.0/INDEX.md) 的 OpenRouter；本版只改這三列的操作，不改存放
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃對話（2026-10-16）與概念稿 [`dev-docs/design-demos/api-keys-edit-ux.html`](../../design-demos/api-keys-edit-ux.html)。沒有獨立 backlog 檔
- **畫面：** 推翻 [`dev-docs/design-principles.md`](../../design-principles.md) 第 8 節「API keys」裡「空值用確認圖示提交、清除圖示立刻寫空、失焦或確認才寫入」這三句，僅對本版三列。其餘 Settings 原則不變。出貨時把該節改成與本 INDEX 一致
- **秘密欄位：** 不新增欄位。文件、概念稿、審查報告禁止寫真實 key 或含使用者 token 的 gateway URL

## 產品句

Settings 的 Helius API URL、Jupiter API key、OpenRouter API key 平時是遮罩列加顯示與鉛筆；點鉛筆才就地編輯，並出現確認與捨棄。確認才寫入，捨棄還原，失焦不寫入。網路不在設定樞紐，改在漢堡選單、地址簿與設定之間；返回回主畫面。頁面仍是既有 Devnet／Mainnet 單選，立刻寫入。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)
5. 概念稿：[`dev-docs/design-demos/api-keys-edit-ux.html`](../../design-demos/api-keys-edit-ux.html)（衝突時以本 INDEX 為準）

## 已定案

| 題 | 決定 |
|----|------|
| 哪些列 | 只這三列：API keys 頁的 Helius API URL、Jupiter API key；交易 AI 設定頁的 OpenRouter API key。三列同一套操作。元件可共用，禁止留下「眼睛旁常駐勾」的舊列 |
| 平時 | 有已存值時輸入框唯讀，顯示 `••••••`。空值顯示既有 placeholder（`common.optional`），仍唯讀。右側兩個 icon：顯示（`common.show`）、編輯（鉛筆，沿用 `IconRename`；`title`／`aria-label` 為新 catalog `common.edit`：繁中「編輯」、簡中「编辑」、英文 `Edit`）。**沒有**確認、**沒有**捨棄 |
| 顯示 | 平時點顯示：載入既有明文（沿用 `wallet.readIntegrationSecrets`），在唯讀框給全文；再點回到遮罩。不進入編輯、不寫入。進入編輯時一律先載入明文並顯示全文，讓使用者改得見字 |
| 進入編輯 | 點鉛筆後先保持唯讀，確認鈕不出現，直到 `wallet.readIntegrationSecrets` 成功並把該欄明文放進草稿（未設定則草稿為 `""`）。成功後才變成可編輯並顯示確認與捨棄。讀取失敗：回到 idle，不進入可寫入編輯，不呼叫 `persist*`。讀取未完成時使用者無法確認。同一時間只許一列在編輯；再開另一列時，前一列依「捨棄」規則退出，不寫入 |
| 確認 | 點確認才呼叫既有 `persistHeliusField`／`persistJupiterField`／`persistOpenRouterField`（仍 trim；與已存值相同則不發 patch）。按下確認造成的失焦不算放棄草稿。成功或無變更：離開編輯並回到遮罩。寫入失敗：留在編輯，沿用設定頁既有錯誤表面，不另寫文案 |
| 捨棄 | 點捨棄：丟掉草稿，不呼叫 persist，離開編輯，回到遮罩與進入編輯前的已存值。按下捨棄造成的失焦走捨棄，不先被「失焦即放棄」吃掉 |
| 失焦與離開 | 編輯中輸入框失焦：丟掉草稿，不寫入，該列回到 idle 遮罩。切到別的設定頁或元件卸載亦然。未確認的草稿消失 |
| 按下回饋 | 確認與捨棄在 click 當下先進入按下態（縮小，約 140ms 可見），然後才執行確認或捨棄。顯示與鉛筆維持既有 icon button 的 hover／active，不另做這段延遲 |
| 存放與命令 | `airwave.settings.v1` 的 key 欄位、`openRouterConfigured` 等公開旗標、`wallet.readIntegrationSecrets` 的回傳形狀都不改。不改 vault |
| 文案 | 三語 catalog 新增 `common.edit` 與 `common.discard`（繁中「編輯」「捨棄」、簡中「编辑」「舍弃」、英文 `Edit`、`Discard`）。`title` 與 `aria-label` 用同一句。畫面不新增說明句 |
| 網路入口 | 漢堡選單順序：錢包帳戶、地址簿、網路、設定、已連線網站、關於此應用、鎖定錢包。網路進既有 `settings-network`。設定樞紐不再列網路。返回父頁是主畫面，不是設定。不改 cluster 寫入、不改 RPC 頁 |
| 原則檔 | 出貨時改 `dev-docs/design-principles.md`：第 8 節 API keys 改成平時鉛筆、編輯才確認／捨棄、失焦不寫入，並刪掉「清除圖示立刻寫空」與「失焦即寫入」；OpenRouter 列與這兩列相同。第 2 節表格「單行文字設定」列改為：Helius API URL、Jupiter API key、OpenRouter API key 只在列內確認圖示寫入，失焦與捨棄不寫入；RPC 自訂 URL 仍是失焦或短 debounce 寫入。第 8 節樞紐列表拿掉網路，改寫漢堡選單進入 |
| 版本號 | 出貨時 `version.md`、`changelog.md`、`wallet/package.json`、`wallet/manifest.config.ts`、根 `README.md` 版本句對齊 **0.46.0** |

## 非目標

- 自訂 RPC 的展開編輯、地址簿改名、Default CU price、變更密碼頁
- 改秘密的存放、加密、公開 settings 是否含明文
- 改交易 AI 的開關、模型鏈、審批分析
- 樞紐上「已設定／部分設定／未設定」的摘要規則
- 新增整頁 Save

## 實作軌道

### Track 1 — 三列操作

- **做：** 依已定案改 `KeysField` 與 OpenRouter 列（或抽成共用列）。按下態樣式。catalog `common.edit`、`common.discard`。`design-principles.md` 第 2 節表格與第 8 節 API keys 對齊已定案
- **不做：** RPC、地址簿、CU、密碼、settings schema、persist 函式的 trim／相同值略過規則
- **驗收：** 手驗表三列皆符合；`cd wallet && npm run typecheck`

## 驗收

- [x] 三列平時只有顯示與鉛筆；有值時為 `••••••`，看不到確認或捨棄
- [x] 點鉛筆後，明文尚未放進草稿前沒有確認鈕；讀取失敗回到遮罩且已存值不變。讀取成功後可改字，並出現確認與捨棄；確認與捨棄按下時有縮小回饋
- [x] 確認後值寫入，離開編輯並回到遮罩；再點顯示看到的是剛確認的字（trim 後）
- [x] 改字後點捨棄、編輯中讓輸入框失焦、或直接離開該頁：已存值不變，列回到遮罩
- [x] 一列編輯中去編另一列：前一列不寫入
- [x] `cd wallet && npm run typecheck`
- [x] 未封裝擴充走 API keys 頁與交易 AI 設定頁各一輪（靜態截圖不算）
- [x] 漢堡選單有網路，在地址簿與設定之間；設定樞紐沒有網路列；返回回主畫面

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/popup/settings/SettingsScreens.tsx` | `KeysField`：Helius、Jupiter |
| `wallet/src/popup/settings/TxAiSettingsScreen.tsx` | OpenRouter 列 |
| `wallet/src/popup/settings/settings-logic.ts` | 既有 persist；本版不改語意 |
| `wallet/src/shared/ui-messages.ts` | `common.discard` |
| `wallet/src/popup/components/StrokeIcon.tsx` | `IconRename`、`IconCheck`、捨棄用既有 `IconX` |
| `dev-docs/design-principles.md` | 第 8 節 API keys，出貨時改寫 |
| `dev-docs/design-demos/api-keys-edit-ux.html` | 概念稿 |

## 開工前仍須拍板

（無）
