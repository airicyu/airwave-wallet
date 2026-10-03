# HANDOFF — 0.9.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/sign-message-how.md](./docs/sign-message-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.1.0 message-flow-how](../0.1.0/docs/message-flow-how.md)
6. 畫面：[design-principles.md](../../design-principles.md)；概念稿非正式

## 產品摘要

`signMessage` 專用 popout：帳戶 widget、站點、UTF-8 或 hex；SDK 判定的交易 message 不能批准；鎖定在同一窗解鎖；焦點用 accent。pending 仍只在 SW。

## Track

1 SW 解析／鎖定開窗／禁止代簽 → 2 popout UI → 3 popup 解鎖＋焦點 → 4 test-web 向量

## 禁區

GUIDELINES pending／custody／不廣播；不改 `../solibra-wallet`；不做 signTx 摘要；文件不寫真實秘密；不以概念稿覆寫錯誤碼。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.9.0/HANDOFF.md、INDEX.md 與其連結的 HOW 與 reasoning。跟 Track：SW 交易 message 判定與鎖定仍開窗 → signMessage popout → popup 解鎖與焦點 CSS → test-web 三個簽訊息入口。禁非目標。不要改 ../solibra-wallet。INDEX 已定案不要再問；沉默才提問，沉默時仍守 GUIDELINES 架構禁區。

dapp.signMessage 不要因 WALLET_LOCKED 或「像交易」立刻對 dApp 失敗；要 pending＋popout。enqueue 寫 signAccountId 與 messageLooksLikeTx（僅記憶體）。判定用同一 shared 函式：web3.js Message.from／VersionedMessage.deserialize 後 serialize().byteLength === 原長度。交易 message：UI 只信旗標畫短句「不能把交易當成訊息簽署。」批准 disabled；拒絕／關窗／誤 approve 皆 SIGN_MESSAGE_LOOKS_LIKE_TRANSACTION，禁止 nacl.sign。一般拒絕仍 USER_REJECTED。逾時仍 TIMEOUT。finishSignMessage 只簽 signAccountId，禁止改簽別戶。鎖定 popout 整頁解鎖、類 B、無殼底；本窗解鎖後 700ms 批准 disabled；popup 先解鎖則 popout 經 onChanged／getState 進簽署殼且不必 hold。connect／signTransaction 版面維持 0.8.0。不要 commit。
```

## 完成檢查

- [ ] INDEX 狀態出貨時才 `shipped`（須使用者同意）
- [ ] changelog／version／package.json 對齊 0.9.0
- [ ] 已刪 backlog「簽署訊息頁 UI／UX」列與檔
