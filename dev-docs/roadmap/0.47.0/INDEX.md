# 0.47.0 — 帳戶列表、聚合管理、地址簿

- **狀態：** `shipped`
- **上游版本：** [0.46.0](../0.46.0/INDEX.md)。聚合列仍是 [0.5.0](../0.5.0/INDEX.md) 的 `subPubkeys`／`mainPubkey`。地址簿儲存沿用 [0.43.0](../0.43.0/INDEX.md)。0.46.0 的密鑰列不在本版
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 規劃對話（2026-10-17）與概念稿 [`dev-docs/design-demos/wallet-account-ui.html`](../../design-demos/wallet-account-ui.html)
- **畫面：** 概念稿三格（帳戶列表、聚合管理、地址簿）。衝突時以本 INDEX 為準。用語見 [`dev-docs/DOMAIN.md`](../../DOMAIN.md) 的主錢包、成員地址

## 產品句

帳戶列表、聚合管理、地址簿的改名都進同一種子畫面。聚合管理只展示主錢包與成員；成員可有選填名稱，對到本機帳戶時改顯示並鎖住該戶名稱；成員可拖曳排序。可簽圖示改銅色、唯讀圖示改藍色。

## 文件地圖

1. 本檔
2. 概念稿：[`dev-docs/design-demos/wallet-account-ui.html`](../../design-demos/wallet-account-ui.html)

## 已定案

| 題 | 決定 |
|----|------|
| 種類色 | `ACCOUNT_KIND_COLOR`：可簽 `#D08B5B`，唯讀 `#6CB4E8`，聚合維持 `#c084fc`。帳戶列表與頂欄 widget 用這組。聚合成員列只在對到可簽單一帳戶時畫銅色鑰匙；對到唯讀本機帳戶不畫眼睛，圖示槽留空但仍佔固定寬。不改成功綠 `--ok` |
| 改名子畫面 | 三種入口同一種畫面。標題用 `common.name`，殼底確認用 `common.confirm`。內容是該地址縮寫加名稱欄。返回只離開這頁，不發命令。不在列上就地改。帳戶列表：名稱 trim 後為空則不發命令、留在這頁、不顯示錯誤。地址簿：trim 後為空仍發 `addressBook.rename`，名稱存成空字串，成功回到列表。成員：trim 後為空則仍發下面的設名稱命令（空字串表示刪鍵）。確認成功（含成員刪鍵成功）後回到進入前的那一頁：帳戶列表、地址簿列表、或聚合管理。命令失敗則留在子畫面，用該頁既有錯誤表面 |
| 帳戶列表 | 鉛筆在列右、三點選單左邊，兩者隔開。聚合列的切換主錢包鈕在鉛筆左邊，同樣隔開。切換進 `account-switch`：版面與管理頁相同，但不顯示改名、刪除、加入成員。三點管理仍進完整管理頁。點鉛筆進既有 `account-rename`，參數是該帳戶 id。確認呼叫既有 `wallet.renameAccount`。拖曳只從最左握把開始。種類圖示、地址後複製、使用中徽章維持既有位置與行為。聚合列右側三鈕（切換、改名、三點）比一般圖示鈕小一號、彼此靠緊 |
| 地址簿 | 鉛筆從名稱旁移到列右、刪除左邊，兩者隔開。刪除改成紅底白 `IconTrash`。拖曳只從最左握把開始，地址後複製、加號維持既有命令。點鉛筆進 `address-card-rename`，參數是卡片 id。確認呼叫既有 `addressBook.rename`，名稱可存空字串。不再就地輸入、不再失焦就改名 |
| 管理頁 | 只兩塊，本機帳戶不出現在這一頁。上面：標籤「主錢包」在小卡外面、小卡上方。小卡只顯示名稱（有則顯示）與縮寫地址，複製緊接地址後面，複製完整 `mainPubkey`。下面：自含成員區塊；標題右上加號，不在清單底。分隔線看得出。每列固定兩行（名稱可空、縮寫地址＋複製）。最左拖曳點，其右圓形勾選鈕（主錢包是高亮完整勾，其餘是淡勾；滑過淡勾時稍亮，仍低於主錢包），再一個固定圖示寬：對到可簽單一帳戶放銅色鑰匙，否則留空。鉛筆僅在沒有對應本機帳戶時出現，在紅底刪除的左邊並隔開。最後一條不可刪。點成員列（握把與右側按鈕除外）或圓形勾，呼叫既有 `wallet.setCombinedMain`。握把只拖曳。右側按鈕只做該按鈕的事。刪除呼叫既有 `wallet.removeCombinedSub`。改主錢包只更新上面的小卡，該地址仍留在成員裡 |
| 成員排序 | 拖曳改 `subPubkeys` 順序，不改 `mainPubkey`。新命令 `wallet.reorderCombinedSubs`：`{ combinedId, subPubkeys }`。每一項先用與 `wallet.addCombinedSub` 相同的公鑰解析正規化；解析失敗即 `INVALID_PUBLIC_KEY`，三個欄位都不改。重複項只留第一次出現的順序。正規化並去重後的集合必須等於目前 `subPubkeys` 的集合，否則 `INVALID_PUBLIC_KEY`，不改 `subPubkeys`、`mainPubkey`、`memberNames`。通過則只改寫 `subPubkeys` 順序 |
| 設成員名稱 | 新命令 `wallet.setCombinedMemberName`：`{ combinedId, publicKeyBase58, name }`。`publicKeyBase58` 同樣先正規化，正規化後的字串必須是該聚合 `subPubkeys` 的一項，否則 `INVALID_PUBLIC_KEY`，不寫入。若有 `signing` 或 `readOnly` 列的地址等於這一項，回 `MEMBER_NAME_LOCKED`，不寫 `memberNames`。`name` trim 後為空：刪掉該鍵。非空：寫入該鍵，長度超過 `ACCOUNT_LABEL_MAX` 則沿用帳戶名稱的無效標籤錯誤，不寫入。刪成員仍只走 `wallet.removeCombinedSub`，同一筆寫入裡刪掉對應的 `memberNames` 鍵。可改名成員的確認鈕呼叫這一條 |
| 加入成員 | 加號進子頁，兩個選項：貼上一條新地址（既有 `wallet.addCombinedSub`），或從本機單一錢包帳戶加入。本機清單只在後者：已在 `subPubkeys` 的只標已加入、不可再加；尚未加入的才可加 |
| 名稱存哪 | `CombinedAccountMeta` 增加 `memberNames?: Record<string, string>`。鍵是成員公鑰，值是 trim 後的名稱。空字串不存。舊列沒有此欄視為都沒有名稱。刪成員時刪掉該鍵 |
| 名稱從哪顯示 | 若有 `signing` 或 `readOnly` 列的地址等於該成員，顯示該列 `label`，聚合管理不可改這個名稱，也不把 `label` 寫進 `memberNames`。本機那戶改名後聚合顯示跟著變。沒有這樣的本機列時才顯示 `memberNames`；沒有鍵就只有地址 |
| 本機帳戶消失或出現 | 刪掉對應單一帳戶後，成員留在 `subPubkeys`，改顯示自己的 `memberNames`（可能沒有）。之後又有單一帳戶用同一地址，顯示再鎖成該戶 `label`；舊的 `memberNames` 留著但不顯示，直到該本機列再次不存在 |
| 長度 | 名稱上限 `ACCOUNT_LABEL_MAX` |
| 主錢包用語 | 繁中「主錢包」、簡中「主钱包」、英文 `Main wallet`。沿用 `common.currentWallet` 等鍵 |

## 非目標

- 0.46.0 的 API key 列
- 改簽名、送出、連線、`mainPubkey` 語意
- 成員名稱出現在 Home、送出或 dApp
- 把本機帳戶的 label 抄進 `memberNames`
- 建立聚合的第一頁
- 地址簿的儲存形狀、送出挑選

## 實作軌道

### Track 1 — 三頁與成員名稱

- **做：** 種類色；三處改名子畫面；地址簿刪除鈕；聚合管理頁、加入子頁、`memberNames`、`wallet.reorderCombinedSubs`
- **不做：** 非目標所列
- **驗收：** 下表；`cd wallet && npm run typecheck`

## 驗收

- [x] 帳戶列表：可簽為銅色鑰匙、唯讀為藍色眼睛；鉛筆在三點左邊；改名是子畫面，返回不寫入，確認成空不寫入
- [x] 地址簿：鉛筆在紅底刪除左邊；改名是子畫面，不是列上輸入框；名稱可存空；拖曳仍改順序
- [x] 管理頁見主錢包小卡與成員區塊；加號在標題右上；本機帳戶不在這一頁；拖曳只改成員順序
- [x] 無本機帳戶的成員可設名稱、可改回空（空名稱刪鍵並回到列表）；有可簽本機帳戶的成員顯示該戶名稱、沒有鉛筆、有銅色鑰匙。有唯讀本機帳戶的成員顯示該戶名稱、沒有鉛筆、圖示槽留空
- [x] `wallet.reorderCombinedSubs` 在集合不符或公鑰無法解析時不改順序、不改主錢包、不改 `memberNames`
- [x] 本機帳戶改名後，聚合該成員顯示新名稱，`memberNames` 不含這條
- [x] 刪掉該本機帳戶後，成員仍在，顯示改回 `memberNames`（沒有則只剩地址）
- [x] 之後單一本機帳戶加入同一地址，顯示改鎖成該戶名稱
- [x] `cd wallet && npm run typecheck`
- [x] 未封裝擴充走帳戶列表改名、地址簿改名、聚合管理（選主錢包、拖曳、加入、改名）各一輪

## 錨點

| 路徑 | 用途 |
|------|------|
| `wallet/src/shared/account-kind-visual.ts` | 種類色 |
| `wallet/src/shared/storage-keys.ts` | `CombinedAccountMeta` |
| `wallet/src/popup/accounts/AccountsScreens.tsx` | 帳戶列表與 `CombinedManagePanel` |
| `wallet/src/popup/address-cards/AddressCardsScreens.tsx` | 地址簿列與改名 |
| `wallet/src/shared/ui-messages.ts` | 主錢包文案 |
| `dev-docs/design-demos/wallet-account-ui.html` | 三頁概念稿 |
| `dev-docs/DOMAIN.md` | 主錢包、成員地址 |

## 開工前仍須拍板

（無）
