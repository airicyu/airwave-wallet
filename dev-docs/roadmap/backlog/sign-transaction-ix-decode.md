# 簽署交易：Anchor IDL 指令解析 — backlog

構想，**不是契約**。**靜態 common parser** 與 **Explorer Inspector** 已於 [0.19.0](../0.19.0/INDEX.md) 出貨（契約見該版 INDEX／HOW）。本檔只追 **Anchor IDL**（及之後 metadata／ELF）層，仍未排程。

與簽署審批「交易明細」相關。現況（0.19.0）：已知變體解欄位；其餘仍帳戶縮寫＋ hex。見 [0.19.0 INDEX](../0.19.0/INDEX.md)。

## 產品意向

解讀仍分層，**只用於明細輔助**，不是簽核主舞台。UI **只信** SW 回的 `instructions[]`。解析失敗＝該條 hex。IDL **不擋批准**。

1. **已知 common program（靜態）** — **已出貨**（0.19.0）。  
2. **鏈上／可取得的 Anchor IDL**（IDL 帳戶、之後可加 metadata／ELF；`programId` 快取；同一筆交易同一 program 只查一次，宜 `getMultipleAccounts`）→ discriminator＋Borsh 解 instruction 名、args、帳戶名。沒有 IDL → 第 3 層。  
3. **否則** accounts 縮寫＋ data hex。

不要掃 GitHub 當 IDL 來源。v0 lookup 未解析的帳戶標未解析，不要錯配。CPI inner ix 不畫。

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
