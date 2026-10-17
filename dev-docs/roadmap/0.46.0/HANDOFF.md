# 0.46.0 HANDOFF

## 讀檔順序

1. `dev-docs/roadmap/0.46.0/INDEX.md`
2. `dev-docs/roadmap/0.46.0/docs/how.md`
3. `dev-docs/roadmap/0.46.0/docs/reasoning.md`
4. `dev-docs/design-principles.md` 第 2 節表格與第 8 節 API keys（本版推翻失焦寫入；出貨時改這兩處）

## 產品摘要

Helius、Jupiter、OpenRouter 三列平時只有顯示與鉛筆。點鉛筆才編輯，並出現確認與捨棄。確認才 persist，捨棄與失焦與離開頁面都不寫。

## Track

只有 Track 1（見 INDEX）。做完跑 `cd wallet && npm run typecheck`，並在未封裝擴充走兩頁手驗。

## 禁區

不改 schema、不改 `persist*Field` 的 trim 與相同值略過、不改 RPC／地址簿／CU／密碼、不改交易 AI 開關與模型。

## 錨點

見 INDEX 錨點表。

## Paste-ready

```text
實作 Airwave Wallet 0.46.0。工作目錄是 airwave-wallet 倉庫根。
先讀 dev-docs/roadmap/0.46.0/INDEX.md、docs/how.md、docs/reasoning.md、HANDOFF.md。
只做 Track 1。不要發明 INDEX 沒有的語意。不要 commit。
做完跑 cd wallet && npm run typecheck。手驗若當下載不了未封裝擴充，在回覆寫明哪幾條沒走完。
```
