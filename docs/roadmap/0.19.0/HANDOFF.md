# HANDOFF — 0.19.0

## 讀檔順序

1. 倉庫根 [AGENTS.md](../../../AGENTS.md)、[docs/roadmap/GUIDELINES.md](../GUIDELINES.md)、[docs/design-principles.md](../../design-principles.md)
2. [INDEX.md](./INDEX.md)
3. [docs/ix-decode-how.md](./docs/ix-decode-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 概念稿 [sign-transaction-ix-decode-ux.html](../../design-demos/sign-transaction-ix-decode-ux.html)（畫面；URL／變體以 INDEX 為準）

## 產品摘要

簽署明細對固定常見 program 解欄位；其餘 hex。預期變動列 Explorer 鈕打開 Solana Explorer Inspector（message 在 query）。不做 IDL。

## Track

1 SW 解讀＋`inspectorUrl` → 2 共用殼畫面 → 3 typecheck／build

## 禁區

不查 IDL。不解讀當主舞台。失敗不擋批准（`unparseable` 除外）。不把 RPC／API key 塞進 Inspector URL。UI 不自己 serialize message。不加套件。禁非目標。不要改 `../solibra-wallet`。文件不寫真實秘密。不要 commit。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/design-principles.md、docs/roadmap/0.19.0/HANDOFF.md、INDEX.md、docs/ix-decode-how.md、docs/reasoning.md、docs/design-demos/sign-transaction-ix-decode-ux.html。跟 Track 1→2→3。禁非目標（見 INDEX）。INDEX 已定案不要再問；沉默才提問；沉默時仍遵守 GUIDELINES 架構禁區。靜態解讀只在 SW；UI 只信 simulate 回的 instructions 與 inspectorUrl。workingTx ?? 原始。System Transfer／CB 2 與 3／Token 與 Token-2022 的 Transfer 與 TransferChecked／ATA 0 與 1／Memo UTF-8；精確長度才 decoded；hex 路徑禁止 name／desc；已解省略 dataHex 與 accounts。fail／rpc 只要能 serialize message 仍附 inspectorUrl。CU dirty 仍開上次 URL。數字用 BigInt 或無號整數再 toString。Inspector：message.serialize base64、cluster devnet 或 mainnet-beta、禁止 customUrl。chrome.tabs.create 且 URL 必須是 https://explorer.solana.com/tx/inspector。預期變動列 34px 有底有框；Explorer accent。unparseable 不畫 Explorer。不加套件。不要改 ../solibra-wallet。不要 commit。
```

## 完成檢查

- [x] INDEX 驗收 checklist
- [x] changelog／version／package.json／manifest 對齊 0.19.0
- [x] INDEX 狀態 `shipped`（使用者同意出貨）
- [x] 出貨後：backlog 靜態層已標出貨；IDL 仍留 `sign-transaction-ix-decode.md`
- [x] 已 commit（使用者要求出貨）
