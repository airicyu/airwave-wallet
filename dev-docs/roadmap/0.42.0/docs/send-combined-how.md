# 0.42.0 — 聚合帳戶送出 HOW（覆寫 0.12.0 之處）

契約以 [INDEX](../INDEX.md) 為準。單一可簽路徑仍見 [0.12.0 send-token-how.md](../../0.12.0/docs/send-token-how.md)。

## 誰可送（popup）

- 作用中帳戶 `kind === "combined"` 且 `wallet.unlocked`。
- `resolvePubkey(accounts, undefined, active.mainPubkey).role === "signing"`（與 `sign-gates` 同構；popup 無 vault secrets 時僅判斷帳戶列上為 signing）。
- 單一 `signing` 帳戶行為不變。

## 餘額來源（詳情與送出表單）

- Home 列仍為成員加總。
- 聚合時，詳情「數量」與 `send-logic` 的 `50%`／`全部`／`INSUFFICIENT_FUNDS` 皆用 `HomeTokenRow.members` 中 `pubkey === active.mainPubkey` 的 `uiAmountLabel`（字串→`BigInt`，勿用 `uiAmount` number 或合併列加總字串）。

## `wallet.beginSend`（SW）

- 閘門：`signGateError()`（已對 `getExposedPublicKey(active)`／`mainPubkey` 解析），勿再要求 `accountKind(active) === "signing"`。
- 持倉列：`getHomeTokensForOwners([getExposedPublicKey(active)], settings)`（僅目前錢包一條）。
- 簽名：`loadedAccountForActiveSigning()`；`signAccountId` = `resolvePubkey(..., mainPubkey_at_begin).accountId`（簽名列 id，**非**聚合 `active.id`）。

## 手驗

1. 聚合、目前錢包可簽：詳情有「送出」；加總大於目前這一條時「全部」不超過這一條。
2. 目前錢包唯讀：無「送出」。
3. 送出審批中切換目前錢包：該筆仍簽開始時凍結的簽名列。
