# HANDOFF — 0.6.0

## 讀檔順序

1. 倉庫根 `AGENTS.md`
2. [`docs/roadmap/GUIDELINES.md`](../GUIDELINES.md)
3. 本檔
4. [INDEX.md](./INDEX.md) 與其所連 [docs/seed-import-how.md](./docs/seed-import-how.md)、[docs/reasoning.md](./docs/reasoning.md)
5. 上游摘要：INDEX 已連的 0.1.0 custody、0.2.0 `importAccount`
6. 畫面：[`docs/design-principles.md`](../../design-principles.md)（INDEX 沉默時）
7. 概念稿 `docs/design-demos/add-account-ux.html` **非正式契約**；與 INDEX／HOW 衝突時以 INDEX／HOW 為準（自訂 path 必須含字面 `{n}`，不得改用僅 `n'` 佔位）

## 產品摘要

英文 12／24 助記詞匯入；產生 12 詞新錢包一次備份；Burner 隨機密鑰。不存助記詞、不 log。省略 label；不改 active。

## Track

1. SW 衍生與 commands（預覽僅衍生、無 RPC）
2. Popup 兩屏（詞格規則、三鈕標籤、錯誤／忙碌／過期預覽、殼底主鈕）

## 禁區

GUIDELINES custody／pending／廣播。本版非目標：產生 24 詞、quiz、多詞表、passphrase、一次多 index、餘額預覽、0.7.0 持倉、Combined 助記詞路徑。不改 `../solibra-wallet`。INDEX 沉默仍守 GUIDELINES。只認檔案、不認 chat。

## 完成檢查

INDEX 驗收 checklist；`cd wallet && npm run build`。

## Paste-ready starter prompt

```text
你只認檔案、不認 chat history。工作目錄 airwave-wallet 倉庫根。繁體中文書面語對使用者。不要 git commit。不要改 ../solibra-wallet。

先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.6.0/HANDOFF.md、docs/roadmap/0.6.0/INDEX.md 及其連結 HOW／reasoning。跟 INDEX Track 順序。禁非目標。INDEX 已定案不要再問；沉默時仍遵守 GUIDELINES 架構禁區。概念稿不是契約。

實作 wallet.previewSeedAccounts、wallet.importSeedAccount、wallet.generateSeedAccount，以及 popup 助記詞匯入兩屏與 Add「新錢包／Burner」。主按鈕 flex 貼殼底。助記詞不進 storage、不進 log、不進文件與 commit 訊息。
```
