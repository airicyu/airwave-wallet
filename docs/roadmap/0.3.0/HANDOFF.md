# HANDOFF — 0.3.0

設計審查通過前亦可當規劃稿；**實作前**應跑 `.agents/skills/roadmap-version` 設計閘門（除非使用者明示跳過）。

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/popup-shell-how.md](./docs/popup-shell-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. 上游：[0.2.0 accounts-home-how](../0.2.0/docs/accounts-home-how.md)、[0.2.0 disconnect-how](../0.2.0/docs/disconnect-how.md)
5. 原型（僅視覺）：`docs/design-demos/wallet-030-ui-concepts.html` 方案 A
6. 有則讀 [docs/design-review.md](./docs/design-review.md)（不以審查檔當契約）

## 產品摘要

Popup 換成方案 A；持倉仍 0.2.0 RPC；USD「—」；鎖定只見 `#locked`；Reveal 僅解鎖後可達、command `wallet.exportAccountSecret`、須再送密碼；Helius／Jupiter 不做。

## Track 順序（嚴格）

1 → 2 → 3 → 4（見 INDEX）

## 禁區

- GUIDELINES 架構禁區 + INDEX 非目標
- 勿改 `../solibra-wallet`
- 勿把 mock USD／demo 私鑰字串當產品資料
- Reveal 不進 storage、不經 content
- 勿新增 Helius／Jupiter settings

## 錨點

見 INDEX「錨點檔案」。

## 完成檢查

- [ ] INDEX 驗收全勾
- [ ] 未封裝擴充走過導航／Token／Reveal／設定／disconnect 迴歸
- [ ] design-review 無未關 HIGH（若有跑）
- [ ] changelog／`wallet/package.json` version 於 shipped 時為 `0.3.0`
- [ ] **Do not commit unless the user asks**
- [ ] 0.3.0 shipped 後：從 backlog **刪** UI 已出貨敘述（資料源列留給 0.4.0）

---

## Paste-ready starter prompt

```text
你是 Airwave Wallet 實作 agent。工作目錄：airwave-wallet 倉庫根。對使用者用繁體中文書面語。

只認檔案，不認 chat history。先讀：
- AGENTS.md
- docs/roadmap/GUIDELINES.md
- docs/roadmap/0.3.0/HANDOFF.md
- docs/roadmap/0.3.0/INDEX.md
- docs/roadmap/0.3.0/docs/popup-shell-how.md
- docs/roadmap/0.3.0/docs/reasoning.md
- docs/roadmap/0.2.0/docs/accounts-home-how.md
- docs/roadmap/0.2.0/docs/disconnect-how.md

把 INDEX 狀態改為 in progress。嚴格依 Track 1→4 實作。
禁非目標：Helius、Jupiter、sidebar、助記詞、Activity 假資料、改 ../solibra-wallet。
Token：RPC 與 0.2.0 相同；同 mint 加總一列；濾 0 SPL；SOL 0 仍第一列；usdLabel 恆 "—"。
鎖定後只見 #locked。Reveal：僅已解鎖可達；popup→SW `wallet.exportAccountSecret`；payload 含 password；session 鎖定則 SW 回 WALLET_LOCKED 即使密碼正確；secret 不進 storage；成功不改 session。
每 Track 對照驗收。全部完成後跑 INDEX 手驗。
不要 commit，除非使用者要求。
INDEX 已定案不要再問；沉默時仍遵守 GUIDELINES 架構禁區。
```
