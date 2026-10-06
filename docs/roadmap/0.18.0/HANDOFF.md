# HANDOFF — 0.18.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/home-activity-how.md](./docs/home-activity-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 概念稿 [home-activity-ux.html](../../design-demos/home-activity-ux.html)（畫面參考；符號／文案以 INDEX 已定案為準）

## 產品摘要

Activity 列出目前對外地址最近 20 筆交易。mainnet 有 Helius key 才解析成送出／收到／互換／交易；否則成功或失敗加簽名縮寫。列尾圖示開 Solscan 新分頁。

## Track

1 查詢與分類 → 2 概念稿畫面與 Solscan

## 禁區

不把歷史寫進 storage。不把 Helius 失敗偷偷換成簽名列表。不用 description 分類。不用 number 把金額相加。不加套件。禁非目標（載入更多、整列連結、explorer 選擇、聚合合併成員、記住 Activity 分頁等，見 INDEX）。不要改 `../solibra-wallet`。文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/design-principles.md、docs/roadmap/0.18.0/HANDOFF.md、INDEX.md、docs/home-activity-how.md、docs/reasoning.md、docs/design-demos/home-activity-ux.html。跟 Track 1→2。禁非目標（見 INDEX）。INDEX 已定案不要再問；沉默才提問；沉默時仍遵守 GUIDELINES 架構禁區。Home Activity：getExposedPublicKey、最多 20 筆、不進 storage。mainnet 且 Helius key 才打 api.helius.xyz enhanced transactions（token-accounts=balanceChanged）；Helius 失敗回 unavailable，禁止退回簽名粗列；否則 getSignaturesForAddress。公鑰無法解析→unavailable。SWAP→互換，TRANSFER 單向→送出或收到，其餘→交易。畫面忽略過期回應。列尾 32px 圖示 chrome.tabs.create 開 Solscan，devnet 加 cluster=devnet。載入中／尚無交易／活動暫時無法載入。符號只認 SOL／USDC／USDT。不加套件。不要改 ../solibra-wallet。不要 commit。
```

## 完成檢查

- [x] INDEX 驗收 checklist
- [x] changelog／version／package.json／manifest 對齊 0.18.0
- [x] INDEX 狀態 `shipped`（使用者同意出貨）
- [x] 出貨後刪 backlog Home Activity 列與 `home-activity.md`
- [x] 未 commit，除非使用者要求
