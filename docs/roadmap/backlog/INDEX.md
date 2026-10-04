# Backlog 目錄

這裡是構想清單，**不是契約**。排進某版之後以該版 `INDEX.md` 為準。出貨後刪該列與對應 `.md`。

新項目：在本目錄加一列，並寫 `backlog/<名稱>.md`。

## 未排程

| 項目 | 說明 |
|------|------|
| [Wallet UI 多語言](./wallet-ui-i18n.md) | Settings 切換繁中／簡中／英文；各畫面對齊三種語文長度 |
| [Home Activity](./home-activity.md) | Activity 分頁改列 active 帳戶的鏈上活動 |
| [Sidebar 模式](./sidebar-mode.md) | Settings 改在 Chrome 側欄顯示錢包殼，取代 popup |
| [帳戶卡片拖曳排序](./account-card-drag-order.md) | 卡片主區懸停出陰影與虛點，游標改為可拖曳，用來拉次序 |
| [版本升級與 storage 遷移](./storage-migration.md) | 擴充更新時依 schema 世代搬 local 資料；金庫改格式須等解鎖 |
| [清理空 token account](./close-empty-token-accounts.md) | 主畫面看某一戶時，組交易關掉數量為 0 的 token account，收回 rent SOL |
| [簽署交易指令解析](./sign-transaction-ix-decode.md) | 明細：common parser → Anchor IDL → hex；現況僅 hex |
