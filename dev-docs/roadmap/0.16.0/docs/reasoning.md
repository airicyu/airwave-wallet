# 0.16.0 — 為何收斂 popup state，而不是上狀態庫或改審批殼

## 問題

0.15.0 把畫面遷成 React，但為了趕遷移，多數草稿仍寫在模組級 `session`，再 `bumpUi()` 讓整棵 popup `tick`。這等於命令式總線換皮：輸入成本是全樹 reconcile，`bindPopupShell` 讓任意檔呼叫「還沒 mount 就可能炸掉」的全域 `navigateTo`。

## 否決

| 方案 | 為何否 |
|------|--------|
| Zustand／Redux | 0.15.0 已禁；也容易把 pending 塞進客戶端 store。本版用 React context＋`useState` 就夠 |
| React Router | `View` 聯集已是契約；hash／history 對 extension popup 無益 |
| 審批殼改 React | 0.15.0 非目標仍有效；橋接已能 dispose／abort。與「清 popup 過渡層」混在一版會讓回歸面加倍 |
| 拒絕審批後保留送出草稿 | 今日 `performNavigate` **進入** `token-send` 就清空。本版產品句是行為不變，不順便改這條 |

## 選定

- App 層放鏡像與卸載子頁會丟、但別頁還要讀的欄：view、detailTokenId、送出 requestId、持倉快取、`focusAccountId`、Home 展開列、`homeAssetsForce`、toast。
- 送出草稿放 `TokenSendForm` 本地；進入 `token-send` 即清空，對齊 0.15.0、**覆蓋** 0.13.0「拒絕後欄位保留」。
- 其餘草稿跟畫面走；離開規則抄 0.15.0 表。
- Back／dock 寫成表。

## 失敗模式

若把送出草稿只放在 `TokenSendForm`、又在 `send-approval` 卸載它，且**沒有**執行「進入 token-send 即清空」，拒絕回來會出現空白或過期數字，和 0.15.0 不一致。HOW 表要求進入即清空，因此本地 state 卸載是可接受的。
