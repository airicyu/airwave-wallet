# HANDOFF — 0.17.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/sign-and-send-how.md](./docs/sign-and-send-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.16.0](../0.16.0/INDEX.md)（勿在本版重做 popup session 收斂）、[0.13.0](../0.13.0/INDEX.md)、[0.12.0](../0.12.0/docs/send-token-how.md)、[0.11.0](../0.11.0/INDEX.md)、[0.11.0/docs/sign-tx-budget-how.md](../0.11.0/docs/sign-tx-budget-how.md)、[0.10.0](../0.10.0/INDEX.md)

## 產品摘要

宣告並實作 `solana:signAndSendTransaction`。網站仍 popout。批准後錢包廣播並等 confirmed；確認中→已確認 1s→關窗；signature 只回原 tab。`signTransaction` 仍只簽立刻關。`walletSend` 宿主與成功回 Home 不變。

## Track

1 宣告＋enqueue＋鏈檢查 → 2 批准後簽送確認＋dApp result＋onRemoved 分流 → 3 殼 confirming／1s 離開（本 kind 不要立刻 closeHost） → 4 test-web＋typecheck／build＋版本號

## 禁區

GUIDELINES pending／custody／不廣播。禁止只宣告不安裝實作。禁止 `signTransaction` 代廣播。禁止 SW closePopout 搶在 confirmed 頁前。禁止本 kind 落入 shell `closeHost()` 預設支。禁止確認中被 `armExpiry`／`showGone`。禁止批准時 `unbindPopoutByRequest`。禁止拒絕只走 `finishWalletSendUserAbort`。有 `broadcastSig` 時拒絕／關窗同一 `BROADCAST_UNCONFIRMED`。禁止 60s 確認失敗結束 dApp。禁止 skipPreflight 聽 dApp。不加套件。不要改 `../solibra-wallet`。文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/design-principles.md、docs/roadmap/0.17.0/HANDOFF.md、INDEX.md、docs/sign-and-send-how.md、docs/reasoning.md，以及 0.13.0／0.12.0／0.11.0 INDEX 與 0.11.0 sign-tx-budget-how。跟 Track：inject 宣告 solana:signAndSendTransaction；dapp.signAndSendTransaction；content 白名單；pending kind、uiHost popout、鏈必須符合 Settings cluster；bridge-client 僅本命令 timer≥180s；批准 accepted true、cancelPendingTimeout、禁止 unbindPopoutByRequest、共用簽送、60s 只 progress 可再批；confirmed 後 sendBridgeResult signature number[] 再 settled；拒絕無 sig 則 USER_REJECTED、有 sig 則 BROADCAST_UNCONFIRMED；onRemoved 空 pending no-op、有 broadcastSig 則 BROADCAST_UNCONFIRMED；殼三閘含本 kind、禁止 closeHost 預設支、進入確認中清 armExpiry、禁止確認中 showGone；signTransaction 仍立刻關；test-web 改真 feature。不加套件。不要改 ../solibra-wallet。INDEX 已定案不要再問。不要 commit。
```

## 完成檢查

- [x] INDEX 驗收 checklist
- [x] changelog／version／package.json／manifest 對齊 0.17.0
- [x] INDEX 狀態 `shipped`（使用者同意出貨）
- [x] 未 commit，除非使用者要求
