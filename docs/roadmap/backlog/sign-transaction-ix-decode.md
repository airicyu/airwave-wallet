# 簽署交易：指令解析（common／Anchor IDL）— backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

與簽署 popout「交易明細」相關。現況（0.11.0）：每條頂層 compiled ix 列 program 熟名或縮寫、可選固定 desc、**帳戶縮寫清單**、**data 小寫 hex**。不解欄位語意。

## 產品意向

解讀分三層，**只用於明細輔助**，不是簽核主舞台（餘額差仍靠 `simulateTransaction` pre／post）。popout **只信** SW 回的 `instructions[]`，不要自己對表。解析失敗＝該條退回 hex，不要半套欄位。IDL／parser **不擋批准**。

1. **已知 common program**（靜態 program id 表）→ 預寫 parser 解 accounts 角色＋ data 欄位，列在該 ix 下。  
2. 否則 **鏈上／可取得的 Anchor IDL**（IDL 帳戶、之後可加 metadata／ELF；`programId` 快取；同一筆交易同一 program 只查一次，宜 `getMultipleAccounts`）→ 用 discriminator＋Borsh 解 instruction 名、args、帳戶名。沒有 IDL → 第 3 層。  
3. **否則** accounts 縮寫＋ data hex（即現況）。

Common parser 的 layout **以官方源碼 enum 為準**，不是 web3 總解碼器：

| program | 來源 |
|---------|------|
| System | Agave `system_instruction` |
| Compute Budget | `compute_budget_instruction` |
| SPL Token | `spl-token` `instruction.rs` 或 `@solana/spl-token` decode |
| Token-2022 | `spl-token-2022` |
| ATA | `spl-associated-token-account` |
| Memo | `spl-memo`（data＝UTF-8） |

引入 `@solana/spl-token` 須在該版 INDEX 說明理由。不要掃 GitHub 當 IDL 來源。v0 lookup 未解析的帳戶標未解析，不要錯配。CPI inner ix 不畫。

## 開工前仍須拍板（排進 INDEX 時）

- 第一批 common 名單（最少：System、CB、Token、Token-2022、ATA；Memo／ALT／Stake 是否同版）。
- Token 用手寫 parser 還是 `@solana/spl-token`。
- IDL 只查舊 Anchor IDL 帳戶，還是含 Program Metadata／ELF。
- 明細展開密度：短標預設、帳戶與欄位要不要再收合一層。

## 非目標（構想層）

- 用解析結果取代模擬差額當主舞台
- 為等 IDL 而禁用批准
- 通用解任意閉源 program
- 宣告未實作的 Wallet Standard 方法
