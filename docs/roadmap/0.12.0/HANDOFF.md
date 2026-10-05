# HANDOFF — 0.12.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/send-token-how.md](./docs/send-token-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.11.0](../0.11.0/INDEX.md)、[0.10.0](../0.10.0/INDEX.md)
6. 概念稿非正式：`docs/design-demos/send-token-ux.html`

## 產品摘要

持倉列進詳情。單一可簽可送出。確認後 `walletSend` pending＋既有簽署 popout。批准後錢包送出並等 confirmed。dApp 簽交易仍不廣播。

## Track

1 列欄位＋詳情 → 2 SW 組交易／walletSend → 3 送出頁接審批 → 4 build

## 禁區

GUIDELINES pending／custody／不廣播內容 tab；不改 `../solibra-wallet`；不做 signAndSend、聚合送出、地址簿、Agent；不改 dApp 只簽不廣播；文件不寫真實秘密。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.12.0/HANDOFF.md、INDEX.md 與 send-token-how／reasoning。跟 Track：HomeTokenRow 加 decimals 與 SPL tokenProgram → popup 詳情與送出鈕（僅 signing）→ wallet.beginSend（字串移小數點再 BigInt；缺欄 INVALID_PAYLOAD；getLatestBlockhash；未簽不帶 CB；TransferChecked；ATA＋租金檢查）→ pending walletSend、origin airwave:wallet → 禁止 sendBridgeResult／finishSignTransaction → simulate 接受 walletSend → resolve 立刻 accepted、背景 send、broadcastSig 後不再二次 send → confirmed≤60s＋500ms 關窗 → ui.walletSendSettled 只 runtime → npm run build。禁非目標。不要改 ../solibra-wallet。INDEX 已定案不要再問。dApp signTransaction 仍不 send。不要 commit。
```

## 完成檢查

- [x] INDEX 狀態 `shipped`（使用者同意出貨後）
- [x] changelog／version／package.json 對齊 0.12.0
- [x] 已刪 backlog「從持倉送出代幣」列與檔（combined／地址簿保留）
