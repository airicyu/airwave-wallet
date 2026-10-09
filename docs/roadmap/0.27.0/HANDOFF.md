# HANDOFF — 0.27.0

## 讀檔順序

1. [AGENTS.md](../../../AGENTS.md)、[GUIDELINES.md](../GUIDELINES.md)
2. [INDEX.md](./INDEX.md)
3. [docs/how.md](./docs/how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游 CU：[0.11.0 INDEX](../0.11.0/INDEX.md)、估 CU：[0.22.0 INDEX](../0.22.0/INDEX.md)

## 產品摘要

Content script 讀不到解鎖 session；session 只有 vault key。待簽交易的 CU 只在本地改。dApp 簽名要先連線、chain 要對、核准前分頁 origin 不能變。新 vault 用 PBKDF2 600000 次，舊的 310000 在下次解鎖成功時重加密。

## Track

1 Session 與公鑰綁定 → 2 本地 CU → 3 Origin／chain／連線／signMessage → 4 KDF、RPC、設定 key、剪貼簿

## 禁區

不要升 `schemaGeneration`，不要改 `*.v1` 鍵名。不要讓 SW 重啟就上鎖。模擬 `fail`／`rpc` 不要禁用核准。不要把 Jupiter／Helius 放進 vault。不要宣告新 Wallet Standard 方法。`workingTx` 禁止來自 lookup table 的 RPC 重編。不要 commit，除非使用者要求。不要改 `../solibra-wallet`。

## Paste-ready starter prompt

```text
只認檔案。讀 docs/roadmap/0.27.0/HANDOFF.md、INDEX.md、docs/how.md、docs/reasoning.md。依 Track 1→4 實作。session blob version 2 只有 salt 與 key，啟動時 setAccessLevel TRUSTED_CONTEXTS。workingTx 只做本地 Compute Budget 修補：尚未含 CB program 時，若任一 index 指向 address lookup 則不寫 workingTx、簽原文；否則附加在 static accounts 最末，既有 index 不變。已有 program 但缺 disc 時只插入缺的指令。setActiveAccount 與 SW 啟動（已有 active id）都把每筆 connection.accountId 對齊 active id，且在 NOT_CONNECTED 判斷之前。dapp origin 只用 sender.tab.url，完成前再 tabs.get，sendMessage 有 frameId 就帶上。signTransaction 必須帶 chain，仍只簽不廣播。未連線不能簽。setActiveAccount 推翻 0.5.0：每筆 connection.accountId 改成新 active id。signMessage 在 compiled-message decode 成功時拒絕。新 PBKDF2 迭代 600000，解密只接受 310000 或 600000，解鎖成功才重加密舊 blob，寫入失敗不覆蓋。getState 不含 jupiterApiKey 與 heliusApiUrl；設定頁用 wallet.readIntegrationSecrets。不要 commit。
```

## 完成檢查

- [x] Track 1 session v2、公鑰綁定、建立密碼 ≥ 8
- [x] Track 2 本地 CU，探針不寫 workingTx
- [x] Track 3 origin、chain、連線、signMessage、test-web chain
- [x] Track 4 KDF、RPC、readIntegrationSecrets、剪貼簿
- [x] `cd wallet && npm run typecheck`
