# HANDOFF — 0.1.0（設計閘門通過後使用）

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/message-flow-how.md](./docs/message-flow-how.md)
3. [docs/storage-custody-how.md](./docs/storage-custody-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 最新 [docs/design-review.md](./docs/design-review.md)（僅參考已關 HIGH）

## 產品摘要

Minimal Solana Chrome 錢包：SW pending hub、password-boxed vault、popout 審批、Wallet Standard connect／signMessage／signTransaction；搭配 `test-web` 手測。

## Track 順序（嚴格）

1 → 2 → 3 → 4 → 5 → 6 → 7（見 INDEX）

## 禁區

GUIDELINES 架構禁區 + INDEX 非目標。勿改 `../solibra-wallet`。

## 錨點

`wallet/src/background/`、`wallet/src/inject/`、`wallet/src/shared/commands.ts`（若建立）

## 完成檢查

INDEX 驗收全勾；手驗指令跑過；`design-review` 無未關 HIGH。

---

## Paste-ready starter prompt

```text
你是 Airwave Wallet 實作 agent。工作目錄：airwave-wallet 倉庫根。

只認檔案：
- docs/roadmap/0.1.0/INDEX.md（已定案、Track、驗收）
- docs/roadmap/0.1.0/docs/message-flow-how.md
- docs/roadmap/0.1.0/docs/storage-custody-how.md
- docs/roadmap/0.1.0/HANDOFF.md

把 INDEX 狀態改為 in progress。依 Track 1→7 實作 wallet/ 與 test-web/。
遵守 pending 在 SW、結果只回原 tab、storage 真相、password vault、無 hardcode 密碼。
每 Track 結束對照該 Track 驗收。全部完成後跑 INDEX 手驗指令。
不要 commit，除非使用者要求。不要改 ../solibra-wallet。
```
