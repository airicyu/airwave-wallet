# 0.42.0 — 聚合錢包帳戶送出代幣

- **狀態：** `shipped`
- **上游版本：** [0.41.0](../0.41.0/INDEX.md)。送出本體：[0.12.0](../0.12.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 `backlog/send-token-combined.md`（出貨後已刪）
- **畫面：** 不開新畫面。復用 0.12.0 送出 UI。原則見 [`dev-docs/design-principles.md`](../../design-principles.md)

## 產品句

聚合錢包帳戶在目前錢包可簽時，從持倉詳情走**已出貨的送出**。可送出數量是目前這一條地址的餘額，不是 Home 加總。其他成員不能併進同一筆。不做歸集。

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | 只打開聚合帳戶的送出入口，並把可動用改成目前錢包那一條。數量、收款、確認、`wallet.beginSend`、`walletSend` 審批與送到 `confirmed` 都沿用 [0.12.0](../0.12.0/INDEX.md)。不新增畫面、命令 kind、storage 鍵 |
| 誰可送 | 作用中帳戶 `kind === "combined"`，且**目前錢包**那條地址在清單裡有可簽的單一帳戶、金庫已解鎖。目前錢包僅可查看、或對不上簽名列：跟觀察帳戶一樣**不畫**「送出」。單一 `signing` 行為不變 |
| 餘額 | 詳情與送出頁頂的「餘額」、`50%`、`全部`、`INSUFFICIENT_FUNDS` 都只用目前錢包這一條的該資產數量（來源：`HomeTokenRow.members` 中 `pubkey === mainPubkey` 的 `uiAmountLabel`→`BigInt`，不用合併列加總字串或 `uiAmount` number）。Home 列上的加總仍是加總，不拿來當可送出。其他成員餘額留在鏈上 |
| 簽名 | `signAccountId` 凍結**開始這筆時** `resolvePubkey(..., mainPubkey).accountId`（簽名列 id），不是聚合列 `activeAccountId`。送出進行中改目前錢包或改作用中帳戶：這筆仍簽凍結的那一條；下一筆才用新的目前錢包 |
| 畫面 | 不另做聚合送出頁，不在送出頁列出其他成員，不加「從目前地址送出」副標。入口與單一可簽同一顆「送出」 |
| Storage | 不改 `*.v1` 形狀，不升 `schemaGeneration` |

## 非目標

- 歸集，或多簽把多名成員湊成一筆
- 可動用等於 Home 加總
- 地址簿（已於 [0.43.0](../0.43.0/INDEX.md) 出貨）
- 新的 Wallet Standard 方法
- storage 遷移步驟（骨架已在 [0.26.0](../0.26.0/INDEX.md)；本版不改資料形狀）

## 開工前仍須拍板

（無）

## 實作軌道

### Track 1 — 入口與餘額

**做：** 聚合且目前錢包可簽時，詳情出現與單一帳戶相同的「送出」。填寫頁餘額與上限來自這一條。不可簽則不畫按鈕。

**不要做：** 新頁、歸集、地址簿、改 Home 加總演算法。

**驗收：** 加總大於目前這一條時，「全部」與確認不能送出加總；超過這一條得到既有資金不足。目前錢包不可簽時沒有「送出」。單一可簽送出與 0.12.0 出貨行為相同。

### Track 2 — SW `wallet.beginSend`

**做：** 聚合可簽時放行 `wallet.beginSend`；持倉列只查 `mainPubkey`；`signAccountId` 為開始時簽名列 id（見 HOW）。

**不要做：** 新 pending kind、改 storage、用 `active.id` 當聚合的 `signAccountId`。

**驗收：** 聚合可簽能走完審批到 `confirmed`；`signAccountId` 在 pending 期不隨切換 `mainPubkey` 改變簽名帳戶。

## 驗收

- [x] 聚合、目前錢包可簽：詳情有「送出」，流程與單一帳戶同一套畫面
- [x] 可送出上限＝目前這一條餘額，不是成員加總
- [x] 其他成員餘額不能在同一筆裡一起送出
- [x] 目前錢包不可簽：無「送出」
- [x] 送出進行中切換目前錢包：該筆仍簽開始時凍結的簽名列
- [x] `cd wallet && npm run typecheck` 通過
- [x] 手驗：未封裝擴充裡走一筆可簽聚合送出（數量不超過這一條），以及一筆超過這一條被拒（使用者 2026-10-14 確認）

## 錨點

| 路徑 | 用途 |
|------|------|
| [0.12.0 INDEX](../0.12.0/INDEX.md) | 已出貨送出契約；本版只放寬「聚合不送」 |
| `wallet/src` 送出填寫與 `wallet.beginSend` | 餘額來源與 `signAccountId` |
| `wallet/src/shared/wallet-send-eligibility.ts` | popup 可送判斷與成員餘額列 |
| `wallet/src/background/session/sign-gates.ts` | `resolvePubkey`／`signGateError` |
| [docs/send-combined-how.md](./docs/send-combined-how.md) | 聚合覆寫 0.12.0 |
| [DOMAIN.md](../../DOMAIN.md) | 目前錢包、成員地址、加總 |
