# 0.42.0 HANDOFF — 聚合錢包帳戶送出代幣

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/send-combined-how.md](./docs/send-combined-how.md)
3. [0.12.0 send-token-how.md](../0.12.0/docs/send-token-how.md)（單一路徑）
4. [DOMAIN.md](../../DOMAIN.md)

## 產品摘要

聚合帳戶在目前錢包（`mainPubkey`）可簽時，復用 0.12.0 送出 UI 與 `walletSend` 流程；可動用餘額僅目前這一條；`signAccountId` 凍結開始時的簽名列 id。

## Track 順序

1. **入口與餘額** — popup `canSend`、詳情數量、`send-logic` 用成員列。
2. **SW beginSend** — `send-command.ts`：`signGateError`、`signAccountId`、單 owner 查列。

## 禁區

不新畫面、不歸集、不改 storage 形狀、不新 pending kind。

## 錨點

- `wallet/src/shared/wallet-send-eligibility.ts`
- `wallet/src/popup/send/send-logic.ts`
- `wallet/src/background/wallet/commands/send-command.ts`
- `wallet/src/background/session/sign-gates.ts`

## 完成檢查

- INDEX 驗收全勾
- `cd wallet && npm run typecheck`
- 手驗兩條（可簽送出、超額拒絕）

## Paste-ready starter

```text
實作 dev-docs/roadmap/0.42.0：先讀 INDEX、HANDOFF、docs/send-combined-how.md。依 Track 1→2 改 popup 與 send-command；跑 typecheck；勾驗收。勿 commit除非使用者要求。
```
