# HANDOFF — 0.29.0

## 讀檔順序

1. [AGENTS.md](../../../AGENTS.md)、[GUIDELINES.md](../GUIDELINES.md)、[DOMAIN.md](../../DOMAIN.md)、[design-principles.md](../../design-principles.md)
2. 本檔、[INDEX.md](./INDEX.md)、[docs/how.md](./docs/how.md)、[docs/reasoning.md](./docs/reasoning.md)
3. 不要改 [0.28.0](../0.28.0/INDEX.md) 或 Activity 翻頁實作，除非 INDEX 明文（本版沒有）

## 產品摘要

Mainnet 沒有自訂 JSON-RPC 就不打官方公用節點；Home 停住去設定。首次：語言 → 密碼 → RPC 引導 → 新增帳戶。Helius／Jupiter 選填。Devnet 不變。

## Track

1 `effectiveRpcUrl`＋SW 不 fetch → 2 Settings 列表／摘要 → 3 概念稿＋Home 停住＋引導屏

## 禁區

不要把 Helius API 當 RPC 後備。不要改 0.28.0 Activity 契約。不要加外連申請。不要 commit，除非使用者要求。不要改 `../solibra-wallet`。文件不寫真實 key。

## Paste-ready starter prompt

```text
只認檔案，不認 chat history。先讀 AGENTS.md、docs/roadmap/GUIDELINES.md、docs/roadmap/0.29.0/HANDOFF.md、INDEX.md、docs/how.md、docs/reasoning.md。狀態改 in progress 後依 Track 1→3。Track 3 先寫 docs/design-demos/mainnet-rpc-guide.html。Mainnet 未就緒 effectiveRpcUrl 為空，禁止 solanaRpcForUrl 空字串與 fetch 官方節點。rpcGuideDismissed 主按鈕與略過都寫 true。signAndSend 仍開審批、核准後不廣播、MAINNET_RPC_UNSET 只回發起 tab。Helius API 不當 JSON-RPC。不要改 0.28.0 Activity 翻頁。不要 commit。
```

## 完成檢查

- [x] typecheck 與 build
- [x] INDEX 驗收手驗（未封裝擴充）
- [x] 未改 0.28.0 Activity 契約
