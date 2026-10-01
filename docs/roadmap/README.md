# Airwave Wallet roadmap

本目錄是 **airwave-wallet** 的版本契約。另一個沒有對話紀錄的 agent 只靠這裡開工。

| 檔 | 回答 |
|----|------|
| [GUIDELINES.md](./GUIDELINES.md) | Roadmap 怎麼寫才自足；本專案路徑、架構禁區、隱私 |
| [DOMAIN.md](./DOMAIN.md) | 領域用語：儲存帳戶／簽名／觀察／聚合／地址／主地址 |
| [agent-workflow.md](./agent-workflow.md) | 誰審查、何時 HANDOFF、Track 之間測什麼 |
| `.agents/skills/roadmap-version/` | 使用者點名某版時，設計審查閘門 → Track 實作的執行技能 |

| 版本 | 狀態 | 說明 |
|------|------|------|
| [0.1.0](./0.1.0/INDEX.md) | shipped | Minimal wallet MVP + test-web |
| [0.2.0](./0.2.0/INDEX.md) | shipped | 帳戶生命週期 + 首頁資產 + disconnect |
| [0.3.0](./0.3.0/INDEX.md) | shipped | Popup 方案 A（UI）；持倉仍 RPC；USD「—」 |
| [0.4.0](./0.4.0/INDEX.md) | shipped | Helius DAS 持倉（名稱／icon／底價）+ Tokens v2 勾／score／覆寫 USD |
| [0.5.0](./0.5.0/INDEX.md) | planned | Combined wallet account（依賴 0.3.0＋0.4.0 shipped） |

**版本號：** `x.y.z` 的 **patch**（例如 **0.3.1**）留給該 minor 的 **bugfix**，不排新功能。新功能走下一個 **minor**（0.3.0 → 0.4.0 → 0.5.0）。

構想放 `backlog/`，排進某版後與該版 INDEX 雙向連結。

| Backlog | 說明 |
|---------|------|
| [Combined wallet account](./backlog/combined-wallet-account.md) | 已排進 [0.5.0](./0.5.0/INDEX.md) |

`brainstorm/` 是重做前的背景（Solibra 做過什麼、不該繼承什麼），**不是**某版契約。版本已定案與 brainstorm 衝突時，以該版 `INDEX.md` 為準；INDEX 沉默時，遵守 [GUIDELINES.md](./GUIDELINES.md) 的架構禁區，不要回頭抄 `../solibra-wallet`。
