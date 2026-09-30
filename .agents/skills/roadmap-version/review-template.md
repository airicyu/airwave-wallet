# 審查報告骨架

審查 subagent 寫入 `docs/roadmap/<VER>/docs/` 時用此結構。同一檔累加輪次。

## design-review.md

```markdown
# Design review — <VER> Airwave Wallet

- 日期：（Asia/Hong_Kong）
- 輪次：**初審**／**第 N 輪複審**
- 角色：設計審查（不改 INDEX／HOW／reasoning／HANDOFF／程式；不以本檔當已定案）
- 對照基準：[`../INDEX.md`](../INDEX.md) 已定案＋驗收；HOW／WHY／HANDOFF 連結
- 架構禁區：[`../../GUIDELINES.md`](../../GUIDELINES.md)
- 現行程式抽樣：（錨點檔；倉庫尚無程式時寫「無」）
- **總評：**（無未關閉 HIGH／有未關閉 HIGH／提案不可行）。審查門檻通過與否。

## Findings（本輪）

關閉＝已寫進 INDEX／HOW／HANDOFF；仍開＝契約仍分叉；非阻擋＝記錄即可。

### HIGH
#### H1 — 標題 — **仍開／關閉／不可行**
問題、為何是 HIGH、建議寫進已定案的完整句子（擇一須寫死）。

### MEDIUM
表格或分節：ID、本輪狀態、依據。

### LOW
表格即可。

## 驗收對照
驗收句 | 設計層是否可測 | 缺口

## 與現碼抽樣
現碼未做本版 ≠ 設計 HIGH。標出與提案互斥的現行行為。不要把 brainstorm 或 Solibra 原始碼當成現行程式。

## 修復追蹤表
ID | 級 | 狀態 | 關閉位置（INDEX 條／HOW 節）

## 歷審摘要
輪次 | 日期 | 結論
```

## implementation-review.md

```markdown
# Implementation review — <VER> Airwave Wallet

- 日期、輪次、對照基準＝INDEX
- 角色：實作審查（不改程式）
- **總評：** 可否出貨（無未關 HIGH／該版測試或手驗是否通過）

## Findings
H／M／L，穩定 ID

## 驗收對照
INDEX 驗收句 | 通過／失敗 | 證據（測／檔／未封裝擴充手驗）

## 測試結果
指令：該版 INDEX 或 GUIDELINES 寫明者；尚無則寫「無整包測試指令」並列手驗結果。
禁止寫入助記詞、私鑰、密碼。

## 修復追蹤
## 歷審摘要
```
