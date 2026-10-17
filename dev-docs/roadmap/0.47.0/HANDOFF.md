# 0.47.0 HANDOFF

## 讀檔順序

1. `dev-docs/roadmap/0.47.0/INDEX.md`
2. `dev-docs/design-demos/wallet-account-ui.html`（三格概念稿；與 INDEX 衝突時以 INDEX 為準）
3. `dev-docs/DOMAIN.md` 的主錢包、成員地址

## 產品摘要

帳戶列表、地址簿、聚合可改名成員都進同一種改名子畫面：地址、名稱欄、底欄確認才寫入，返回不寫入。確認成功回到進來前的頁；失敗留在子畫面。帳戶與地址簿確認成空則不發命令並留在子畫面。成員空名稱會刪 `memberNames` 鍵。

聚合管理只留主錢包小卡與成員列表。加號進「新地址／本機帳戶」。成員可拖曳排序。對到本機帳戶的名稱鎖住。可簽銅色、唯讀藍色；成員列不畫唯讀眼睛。

## Track

只有 Track 1（見 INDEX）。做完跑 `cd wallet && npm run typecheck`，並在未封裝擴充走帳戶列表改名、地址簿改名、聚合管理各一輪。

## 禁區

不改 0.46.0 密鑰列。不改簽名、送出、連線、`mainPubkey` 語意。不把成員名稱顯示到 Home、送出、dApp。不把本機 label 抄進 `memberNames`。不改建立聚合第一頁。不改地址簿儲存形狀與送出挑選。

## 錨點

見 INDEX 錨點表。新命令：`wallet.reorderCombinedSubs`、`wallet.setCombinedMemberName`（`MEMBER_NAME_LOCKED`）。

## Paste-ready

```text
實作 Airwave Wallet 0.47.0。工作目錄是 airwave-wallet 倉庫根。
先讀 dev-docs/roadmap/0.47.0/INDEX.md 與 HANDOFF.md，以及概念稿 dev-docs/design-demos/wallet-account-ui.html。
只做 Track 1。不要發明 INDEX 沒有的語意。不要 commit。
做完跑 cd wallet && npm run typecheck。手驗若當下載不了未封裝擴充，在回覆寫明哪幾條沒走完。
```
