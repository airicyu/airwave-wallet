# HANDOFF — 0.2.0（設計閘門通過後使用）

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/accounts-home-how.md](./docs/accounts-home-how.md)
3. [docs/disconnect-how.md](./docs/disconnect-how.md)
4. [docs/reasoning.md](./docs/reasoning.md)
5. 上游（未改行為仍有效）：[0.1.0 message-flow](../0.1.0/docs/message-flow-how.md)、[0.1.0 storage-custody](../0.1.0/docs/storage-custody-how.md)
6. 最新 [docs/design-review.md](./docs/design-review.md)（僅參考已關 findings；**不以本檔當契約**）

## 產品摘要

在 0.1.0 MVP 之上：帳戶 rename／delete／read-only；popup 首頁以目前 RPC 顯示 SOL＋legacy SPL token 帳戶（鎖定亦可看）；Wallet Standard `standard:disconnect`＋popup 已連線站點管理；test-web Disconnect。不做 sidebar、simulation、signAndSend、agent。

## Track 順序（嚴格）

1 → 2 → 3 → 4（見 INDEX）

## 禁區

- GUIDELINES 架構禁區＋ INDEX 非目標
- 勿改 `../solibra-wallet`
- pending 不進 storage；結果／disconnect 不廣播全 tab
- 無 hardcode 密碼；能力表只宣告已實作的 disconnect（外加 0.1.0 已有能力）
- `deleteAccount`：**先檢查後寫入**；signing＋鎖定 → `WALLET_LOCKED` 無副作用
- `createVault` **不得**抹掉既有 read-only accounts

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/storage-keys.ts` | `AccountMeta.kind` |
| `wallet/src/shared/commands.ts` | rename／delete／addReadOnly／disconnect* |
| `wallet/src/shared/bridge.ts` | `airwave-bridge-disconnected` |
| `wallet/src/background/index.ts` | 帳戶／拒簽優先序／createVault merge／disconnect |
| `wallet/src/inject/bridge-client.ts` | `event:"disconnected"` |
| `wallet/src/inject/wallet.ts` | `StandardDisconnect` |
| `wallet/src/content/index.ts` | 白名單＋轉發 disconnected |
| `wallet/src/popup/main.ts` | 帳戶 UI、Home、Connected sites |
| `test-web/` | Disconnect 按鈕＋README |

## 完成檢查

- [x] INDEX 驗收全勾（或 implementation-review 逐條通過）
- [x] 手驗指令跑過（含未封裝擴充 UI）
- [x] design-review 無未關 HIGH
- [x] changelog／package version 於 shipped 時對齊 `0.2.0`
- [ ] **Do not commit unless the user asks**

---

## Paste-ready starter prompt

```text
你是 Airwave Wallet 實作 agent。工作目錄：airwave-wallet 倉庫根。對使用者用繁體中文書面語。

只認檔案，不認 chat history。先讀：
- AGENTS.md
- docs/roadmap/GUIDELINES.md
- docs/roadmap/0.2.0/HANDOFF.md
- docs/roadmap/0.2.0/INDEX.md（已定案、Track、驗收）
- docs/roadmap/0.2.0/docs/accounts-home-how.md
- docs/roadmap/0.2.0/docs/disconnect-how.md
- docs/roadmap/0.2.0/docs/reasoning.md
- 需要時對照 docs/roadmap/0.1.0/docs/message-flow-how.md 與 storage-custody-how.md

把 INDEX 狀態改為 in progress。嚴格依 Track 1→4 實作。
禁非目標（sidebar、simulation、signAndSend、agent、助記詞等）。
遵守：pending 僅 SW；結果／disconnect 只回原 tab；storage+onChanged；password vault；delete 先檢查後寫入；createVault 保留 read-only；拒簽先 ACCOUNT_READ_ONLY 再 WALLET_LOCKED；disconnect 與 account-changed 同一兩段式接線。
每 Track 結束對照該 Track 驗收。全部完成後跑 INDEX 手驗指令。
不要 commit，除非使用者要求。不要改 ../solibra-wallet。
INDEX 已定案不要再問；沉默時仍遵守 GUIDELINES 架構禁區。
```
