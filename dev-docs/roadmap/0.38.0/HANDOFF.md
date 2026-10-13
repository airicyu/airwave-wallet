# 0.38.0 HANDOFF

**狀態：** `shipped`。設計閘門已通過（design-review 第 3 輪）；實作與 typecheck／build／窄測完成（見 implementation-review 複審）。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [docs/design-review.md](./docs/design-review.md)（若已有）
5. 概念稿 [`token-trust-score-ux.html`](../../design-demos/token-trust-score-ux.html)
6. 上游 [0.33.0](../0.33.0/INDEX.md) HOW

## 產品摘要

Home 與預期變動列：26px 最左格 → 圓圖 → 名稱 → 量。已驗證綠盾，分數 > 0 掛盾右下。未驗證空格、無分。

## Track 順序

1. `organicScore` 進 `MintDisplayMeta`／delta `scoreLabel`＋格式化函式＋fingerprint
2. Home 列＋差額列 UI／CSS
3. 版本號與 `docs/features.md` 一句

## 禁區

- 未驗證畫盾／三角／分數
- 詳情加盾
- popup 直連 Jupiter
- 重建審批卡殼
- pending 持久化、全 tab 廣播、硬編碼密碼

## 待拍板

無。

## Paste-ready starter（設計閘門通過後）

```text
讀 AGENTS.md、dev-docs/roadmap/GUIDELINES.md、dev-docs/design-principles.md、dev-docs/roadmap/0.38.0/INDEX.md、docs/how.md、HANDOFF.md。
依 Track 1→3 實作。Home 與預期變動：已驗證綠盾在代幣圖前，organicScore>0 掛盾右下；未驗證 26px 留空且不畫分。lookupJupiterMintMetadata 帶 organicScore。不要 commit。
```
