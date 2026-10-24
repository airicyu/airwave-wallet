# 0.43.0 — Address cards

- **狀態：** `shipped`
- **上游版本：** [0.42.0](../0.42.0/INDEX.md)（聚合送出已出貨）。送出本體：[0.12.0](../0.12.0/INDEX.md)
- **Changelog：** 出貨時寫入 [`changelog.md`](../../../changelog.md)
- **構想來源：** 原 `backlog/address-book.md`（出貨後已刪）
- **畫面：** [`design-demos/0.43.0/address-book-ux.html`](../../design-demos/0.43.0/address-book-ux.html)（非正式；衝突時以本 INDEX 為準）。原則見 [`dev-docs/design-principles.md`](../../design-principles.md)
- **閱讀順序：** 本檔 → [docs/address-cards-how.md](./docs/address-cards-how.md) → [docs/reasoning.md](./docs/reasoning.md)

## 產品句

使用者在 Home 漢堡選單維護一份 **Address cards**（名稱＋一條 Solana 地址）。送出代幣時可開全螢幕，從錢包帳戶或 Address cards 挑收款地址；仍可手貼。白名單不擋其他地址。

## 已定案

| 題 | 決定 |
|----|------|
| 順序 | 顯示順序就是陣列順序。列表可拖曳改序，手勢與帳戶列表相同（移動超過數像素才算拖）。放開後 `addressBook.reorder` 寫回。點按鈕不算拖 |
| 一筆是什麼 | `{ id, name, address }`。`address` 是有效 Solana 公鑰（`@solana/kit` `isAddress`）。`name` 去首尾空白後不可空。不具備註、不依 cluster 拆兩份。同一 `address` 只存一筆；名稱不強制唯一。`id` 由 service worker 產生，不是公鑰 |
| 持久 | 新鍵 `airwave.addressBook.v1`（`chrome.storage.local`，陣列，插入順序）。不是金庫、不含密鑰。不改既有 `*.v1` 形狀，不升 `schemaGeneration`。重新開啟後還在。popup 不直接 `chrome.storage.set`；寫入只經 SW command，列表靠既有 `onChanged` 鏡像 |
| 管理入口 | Home 漢堡選單，「錢包帳戶」下一項。文案：繁中／簡中「地址簿」，英文 `Address book`。Settings 不放入口 |
| 卡片 | 名稱後是帳戶列表同一支改名鉛筆（`IconRename`）。點了只把該名稱換成同一行輸入，鉛筆換成勾；勾或失焦且名稱非空才提交。空名稱不寫、留原名。地址不可就地改。縮寫前 4…後 4，其後複製圖示複製**完整**地址。列尾垃圾桶；確認後才刪。刪除只移出名單 |
| 新增 | 頂欄加號進「新增」頁。名稱、地址都要有。殼底「加入」才送 command。返回放棄未送出草稿。無效公鑰或地址已在名單：底欄停住，欄下短句，不寫入 |
| 空名單 | 管理頁一句「還沒有地址」，加號仍在。送出頁不因此停住 |
| 送出挑選 | 收款欄右側簿圖示開**全螢幕**（不是半屏）。頂欄返回回到送出且不改收款欄。兩個分頁：「錢包」與地址簿（英文 `Address book`）。點一列回到送出：`wallet.beginSend` 的 recipient 是該列完整地址；名稱＋縮寫只顯示。叉掉把 recipient 清成空字串，回到可手貼。手貼仍可送任何有效地址。可見字串走 `ui-messages` 三語，鍵見 HOW |
| 錢包分頁 | 一戶一列，沿用帳戶列表圖示（鑰匙／眼睛／層疊）與顏色，不寫「可簽」「唯讀」。單一帳戶用該列地址。聚合帳戶只用**目前錢包** `mainPubkey` 那一條，不列出其他成員。選到的地址就是 recipient，簽名帳戶仍是送出當下既有規則（0.12.0／0.42.0），不因為收款人是自己的帳戶而改簽名者 |
| 命令 | `addressBook.add`、`addressBook.rename`、`addressBook.remove`、`addressBook.reorder`。結果只回發起端。失敗碼見 HOW。名單不進 pending |

## 非目標

- 只允許轉給白名單、擋下手貼或其他地址
- 備註、搜尋、從帳戶列表「加入 Address cards」（挑選頁已能選錢包帳戶，不複製進名單）
- 匯入聯絡人、鏈上 `.sol` 解析（仍見 [backlog/sns-name.md](../backlog/sns-name.md)）
- 替名單地址代簽，或把密鑰存進名單
- 依 cluster 各存一份
- 改 `schemaGeneration` 或既有 `*.v1` 形狀
- 新的 Wallet Standard 方法

## 開工前仍須拍板

（無）

## 實作軌道

### Track 1 — 儲存與命令

**做：** `airwave.addressBook.v1` 與三個 command。新增驗公鑰與去重；改名只改 `name`；刪除依 `id`。

**不要做：** 改金庫、升 schema 世代、popup 直接寫 storage、把名單放進 pending。

**驗收：** 重開擴充後名單還在。重複地址與空名稱被拒且名單不變。`cd wallet && npm run typecheck` 通過。

### Track 2 — Address cards 畫面

**做：** 選單項、列表、就地改名、複製、刪除確認、新增頁。文案走 `ui-messages`。

**不要做：** Settings 入口、備註、搜尋。

**驗收：** 選單順序為錢包帳戶、Address cards、設定。改名不另開一塊表單。複製的是完整地址。

### Track 3 — 送出全螢幕挑選

**做：** 收款欄簿圖示進全螢幕兩頁。錢包頁一戶一列（聚合＝目前錢包）。點列填入收款地址後回到送出。手貼仍可用。

**不要做：** 半屏抽屜、列出聚合的全部成員、用白名單拒絕手貼。

**驗收：** 兩頁都能填入收款欄並走完既有送出。Address cards 為空時送出仍可手貼或選錢包帳戶。

## 驗收

- [x] 漢堡選單「錢包帳戶」下一項是地址簿（英文 Address book）；Settings 沒有這項
- [x] 可新增、就地改名、複製完整地址、確認後刪除、拖曳排序；空名稱與無效或重複地址不能存
- [x] 重開擴充後名單仍在；`schemaGeneration` 仍為 1；既有帳戶與金庫鍵未被本版改寫
- [x] 送出挑選是全螢幕兩頁：錢包（含可簽、唯讀、聚合的目前錢包，圖示不帶種類字）與地址簿
- [x] 手貼其他有效地址仍可送出
- [x] `cd wallet && npm run typecheck` 通過
- [x] 手驗：未封裝擴充裡新增、改名、複製、刪除、排序；兩個分頁選收款人，並手貼名單外地址（使用者 2026-10-15 確認）

## 錨點

| 路徑 | 用途 |
|------|------|
| [docs/address-cards-how.md](./docs/address-cards-how.md) | 鍵、命令、畫面 |
| [docs/reasoning.md](./docs/reasoning.md) | 為何全螢幕兩頁、為何不升世代 |
| `wallet/src/popup/PopupMarkup.tsx` | 漢堡選單項順序 |
| `wallet/src/popup/components/AccountKindMark.tsx` | 錢包分頁圖示 |
| `wallet/src/popup/send/TokenSendForm.tsx` | 收款欄 |
| `wallet/src/shared/storage-keys.ts` | 既有 storage 鍵；本版加一鍵 |
| `wallet/src/shared/accounts.ts` | `isAddress` 用法 |
| [0.12.0](../0.12.0/INDEX.md)、[0.42.0](../0.42.0/INDEX.md) | 送出與簽名者規則不改 |
| [DOMAIN.md](../../DOMAIN.md) | 目前錢包＝聚合列的 `mainPubkey` |
