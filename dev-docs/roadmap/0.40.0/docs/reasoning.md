# 0.40.0 — reasoning

## 為何拿掉說明句

連線意圖已由站名、帳戶與主按鈕「連線」表達；`approval.connectLead` 是 NPC 旁白（見 design-principles §6）。

## 為何主按鈕不叫「批准」

connect 是建立信任關係，不是簽署單筆 payload；與 sign 審批區分語意。

## 為何不用 favicon

避免額外網路請求與 CSP；字母標記與概念稿一致，實作成本低。

## 設計審查

使用者明確接受概念稿並指示 `/roadmap-version` 實作，跳過 subagent 設計迴圈；見 [design-review.md](./design-review.md)。
