# HANDOFF — 0.10.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/sign-transaction-how.md](./docs/sign-transaction-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 [0.9.0 INDEX／HOW](../0.9.0/INDEX.md)（鎖定殼、凍結帳戶、類 B）、[0.1.0 message-flow-how](../0.1.0/docs/message-flow-how.md)
6. 畫面：[design-principles.md](../../design-principles.md)；概念稿非正式

## 產品摘要

`signTransaction` 專用 popout：主舞台是 SW 模擬的簽署帳戶 SOL／代幣變動；失敗 notice 在其上方（詳情同卡收合）；交易明細預設收合。鎖定同窗解鎖。批准只簽名、不廣播。pending 仍只在 SW。

## Track

1 SW 鎖定開窗／凍結帳戶／`ui.simulatePendingTx` → 2 popout UI → 3 test-web 失敗向量

## 禁區

GUIDELINES pending／custody／不廣播；不改 `../solibra-wallet`；不做 signAndSend、priority fee、Agent；不改 signMessage／connect 契約；文件不寫真實秘密；不以概念稿覆寫錯誤碼。解鎖鈕不可 `flex:1` 拉滿。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.10.0/HANDOFF.md、INDEX.md 與其連結的 HOW 與 reasoning。跟 Track：SW 讓 dapp.signTransaction 鎖定仍 pending＋popout、enqueue signAccountId、finishSignTransaction 只簽該 id、新增 ui.simulatePendingTx → signTransaction popout（預期變動主舞台、失敗 notice 同卡詳情、明細預設收合）→ test-web 加一條會模擬失敗的簽交易。禁非目標。不要改 ../solibra-wallet。INDEX 已定案不要再問；沉默才提問，沉默時仍守 GUIDELINES 架構禁區。

dapp.signTransaction 不要因 WALLET_LOCKED 立刻對 dApp 失敗。模擬：JSON-RPC simulateTransaction、sigVerify false、replaceRecentBlockhash true；用 value 的 pre／post balances 與 tokenBalances 對凍結公鑰算差，不要 getMultipleAccounts、不要 accounts.addresses。缺欄當 rpc。popout 不自己打 RPC、不自己 deserialize 畫指令列。無法 deserialize 的 approve → INVALID_TRANSACTION。kind 不符 simulate → NOT_FOUND。模擬 15s 逾時當 rpc。成功不要「會成功」徽章。value.err 時 notice「預計交易失敗」，失敗詳情在同一張卡預設收合，不自動拒絕。無法 deserialize 才把批准 disabled。批准不 sendTransaction、不改 instruction。signMessage 維持 0.9.0，connect 維持 0.8.0 JSON。解鎖屏按鈕 flex none。不要 commit。
```

## 完成檢查

- [x] INDEX 狀態 `shipped`（使用者手驗通過後定案）
- [x] changelog／version／package.json 對齊 0.10.1（模擬改 pre／post 餘額）
- [x] 已刪 backlog「簽署交易頁 UI／UX」與「simulation 結果」列與檔
