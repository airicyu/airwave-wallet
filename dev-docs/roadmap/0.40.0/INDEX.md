# 0.40.0 — 網站連線確認畫面

- **狀態：** `shipped`
- **上游版本：** [0.39.0](../0.39.0/INDEX.md)
- **Changelog：** [`changelog.md`](../../../changelog.md)（0.40.0）
- **概念稿：** [`connect-consent-ux.html`](../../design-demos/0.40.0/connect-consent-ux.html)（使用者已同意提案；衝突以本 INDEX 為準）
- **畫面：** [`dev-docs/design-principles.md`](../../design-principles.md)

## 產品句

審批 popout／側欄內的 **connect** 同意頁改為置中「站點 ↔ 帳戶」身分卡：站名為主角、完整 origin 單行省略、露出目前 active 帳戶名與公鑰前 4…後 4；拿掉說明句；底欄主按鈕文案改「連線」。行為與 pending／解鎖／自動批准（reconnectWhileLocked）不變。

## 文件地圖

1. 本檔
2. [docs/how.md](./docs/how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [HANDOFF.md](./HANDOFF.md)
5. [docs/design-review.md](./docs/design-review.md)（使用者跳過審查迴圈；記錄同意概念稿）

## 已定案

| 題 | 決定 |
|----|------|
| 範圍 | 僅 `ConnectPage`（popout connect、`FlowHost` 側欄 connect）。**不**改 signMessage／signTransaction 審批殼 |
| 頂欄 | 維持 Back＋標題 `page.connect`；Back＝拒絕 |
| 內容 | 垂直置中：`connect-site-mark`（hostname 首字大寫，不抓 favicon）→ `connect-host`（hostname，去 `www.`）→ `connect-origin`（完整 origin，mono、ellipsis、`title` 全文）→ 垂直連接線 → 帳戶 avatar 字（帳戶顯示名首字）→ 名稱（`displayAccountName`）→ `shortAddr` 公鑰 |
| 文案 | **不**顯示 `approval.connectLead`。底欄主按鈕：`approval.connect`；忙碌 `approval.connecting`。拒絕仍 `approval.reject` |
| 帳戶資料 | `wallet.getState` 的 `accounts`＋`activeAccountId`；公鑰用 `getExposedPublicKey` |
| 頁殼 | `flow-page`／`flow-page-body`／`approval-dock` 既有 flex 規則；內容區 `min-height: 0`、可捲動 |
| CSS | 新 class 加在 `wallet/src/popup/style.css` 與 `wallet/src/popout/style.css`（connect 區塊兩邊同步） |
| i18n | 三語 `ui-messages` 新增 `approval.connect`、`approval.connecting` |

## 非目標

- connect 時切帳、站點複製鈕、favicon、簽署審批 site-row 改版
- 改 connect pending 語意、storage、`onlyIfTrusted`、自動批准條件
- 改 `approval.approve` 用於其他審批種類

## 開工前仍須拍板

（無。概念稿已同意。）

## 實作軌道

### Track 1 — ConnectPage＋樣式＋i18n

**做：** `ConnectPage.tsx` markup／state；CSS；catalog 鍵。

**不做：** 簽署殼、background connect handler。

**驗收：** `npm run typecheck`＋`npm run build`（`wallet/`）。手驗：`test-web` 觸發 connect → popout 見新版面、主按鈕「連線」、無說明句、帳戶與站名正確；長 origin 省略；批准／拒絕仍正常。

## 驗收（出貨）

- [x] `npm run typecheck`／`npm run build`（wallet）
- [x] `test-web` connect 手驗（popout 或側欄）
- [x] `version.md`／`changelog.md`／`dev-docs/roadmap/README.md`／`wallet/package.json` 已更新
- [x] 概念稿保留對照；產品已對齊提案欄

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/flow/ConnectPage.tsx` | connect UI |
| `wallet/src/popup/style.css`、`wallet/src/popout/style.css` | connect 樣式 |
| `wallet/src/shared/ui-messages.ts` | 文案 |
| `wallet/src/popup/lib/format.ts` | `shortAddr`、`avatarLetter` |
| `wallet/src/shared/accounts.ts` | `getExposedPublicKey` |
| `dev-docs/design-demos/0.40.0/connect-consent-ux.html` | 視覺參考 |

## 測試

`cd wallet && npm run typecheck && npm run build`。手驗見 Track 1。
