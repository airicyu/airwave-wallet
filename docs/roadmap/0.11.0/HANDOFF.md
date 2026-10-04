# HANDOFF — 0.11.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/sign-tx-budget-how.md](./docs/sign-tx-budget-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.10.0](../0.10.0/INDEX.md) 差額 HOW、[0.8.0](../0.8.0/INDEX.md) Settings 樞紐
6. 概念稿非正式：`docs/design-demos/sign-transaction-cu-budget-ux.html`

## 產品摘要

未簽 signTransaction：phase 1 估 CU → Default CU price → 寫入 limit／price → phase 2 畫預期變動。交易費卡總費＝簽名費＋優先費。已簽不改 CU。批准只簽名。

## Track

1 Settings `defaultCuPrice` → 2 SW 寫入 CU＋simulate payload → 3 popout 交易費卡 → 4 build

## 禁區

GUIDELINES pending／custody／不廣播；不改 `../solibra-wallet`；不做 signAndSend、已簽改 budget、Agent；不改 signMessage／connect；文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.11.0/HANDOFF.md、INDEX.md 與其 HOW／reasoning。跟 Track：Settings defaultCuPrice（出廠 25000、列名 Default CU price）→ 擴 ui.simulatePendingTx（未簽 phase1／1.5／2 或帶齊 cuLimit+cuPrice；已簽忽略 cu；workingTx 僅 SW 記憶體）→ popout 交易費卡與較緊字級、交易明細不再列費 → npm run build。禁非目標。不要改 ../solibra-wallet。INDEX 已定案不要再問；沉默才提問，沉默時仍守 GUIDELINES 架構禁區。

已簽＝任一 signature 槽非全 0。CB 每變體最多一條，取代不 append。差額仍 0.10.0 pre／post。phase 1 不 parse deltas。Approve 看 SW：無 workingTx 簽原始；有則簽該份。phase 1 副本不得進 workingTx。省略 cu 只在尚無 workingTx 時跑 phase 1。已簽不寫 workingTx。fail 公式：ceil(sum×1.25) 再 clamp。SW writeSeq 較舊不得覆寫較新 workingTx。每條 ix 列帳戶縮寫與 data hex。common／IDL 解欄位不在本版。不要 commit。
```

## 完成檢查

- [x] INDEX 狀態 `shipped`（使用者同意出貨後）
- [x] changelog／version／package.json 對齊 0.11.0
- [x] 已刪 backlog「簽署交易自訂 Compute Budget」列與檔
