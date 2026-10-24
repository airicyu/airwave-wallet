# 0.33.0 HANDOFF

**狀態：** `in progress`（程式已實作；INDEX 手驗待未封裝擴充走完後改 `shipped`）。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [docs/design-review.md](./docs/design-review.md)（審查迴圈產物）
5. 上游：[0.32.0](../0.32.0/INDEX.md) 預期變動卡生命週期
6. 方向稿：[`dev-docs/design-demos/0.33.0/sign-tx-token-trust-ux.html`](../../design-demos/0.33.0/sign-tx-token-trust-ux.html)

## 產品摘要

簽署預期變動每一列：固定信任盾、圓形代幣圖、名稱、差額。mainnet 用 Jupiter 補 icon／symbol／`isVerified`；未驗證不以 symbol 當主標。0.32.0 的 3 秒刷新仍只換 `deltaInner`。

## Track 順序

1. `SimulateTxDelta` + phase-2 `kind`／`mint` + SW Jupiter enrichment（擴 `lookupJupiterMintMetadata`）
2. `paintDeltaInner` 四欄 UI + CSS + `token.notVerified`
3. 手驗與 `docs/features.md` 一句（若需要）

## 禁區

- 改 Home 持倉 verified `✓` 版面
- popup／popout 直連 Jupiter
- 重建預期變動卡殼或 0.32.0 禁止重建的節點
- devnet 打 Jupiter
- pending 持久化、全 tab 廣播、硬編碼密碼

## 待拍板

無（見 INDEX）。

## Paste-ready starter（設計閘門通過後）

```text
讀 dev-docs/roadmap/0.33.0/INDEX.md、docs/how.md、HANDOFF.md、AGENTS.md、dev-docs/roadmap/GUIDELINES.md、dev-docs/design-principles.md。
依 Track 1→3 實作。mainnet 審批模擬後 enrichment Jupiter；預期變動四欄信任盾+圓圖+名稱+差額；未驗證主標為 mint 縮寫。
維持 0.32.0：每 3 秒只 paint deltaInner；不重建重新整理/Inspector/AI/費用/明細。
不要 commit。
```
