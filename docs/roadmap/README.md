# Airwave Wallet roadmap

本目錄是 **airwave-wallet** 的版本契約。另一個沒有對話紀錄的 agent 只靠這裡開工。

| 檔 | 回答 |
|----|------|
| [GUIDELINES.md](./GUIDELINES.md) | Roadmap 怎麼寫才自足；本專案路徑、架構禁區、隱私 |
| [agent-workflow.md](./agent-workflow.md) | 誰審查、何時 HANDOFF、Track 之間測什麼 |
| `.agents/skills/roadmap-version/` | 使用者點名某版時，設計審查閘門 → Track 實作的執行技能 |

| 版本 | 狀態 | 說明 |
|------|------|------|
| [0.1.0](./0.1.0/INDEX.md) | shipped | Minimal wallet MVP + test-web |

構想放 `backlog/`，排進某版後與該版 INDEX 雙向連結。

`brainstorm/` 是重做前的背景（Solibra 做過什麼、不該繼承什麼），**不是**某版契約。版本已定案與 brainstorm 衝突時，以該版 `INDEX.md` 為準；INDEX 沉默時，遵守 [GUIDELINES.md](./GUIDELINES.md) 的架構禁區，不要回頭抄 `../solibra-wallet`。
