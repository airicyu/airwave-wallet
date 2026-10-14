# 0.43.0 — Address cards HOW

契約見 [INDEX](../INDEX.md)。本檔只寫路徑與形狀。

## Storage

鍵：`airwave.addressBook.v1`（`chrome.storage.local`）。

值：`AddressCard[]`，順序即顯示順序。

```ts
type AddressCard = {
  id: string;
  name: string;
  address: string;
};
```

缺鍵當空陣列。不讀寫 `airwave.vault.v1` 與其他 `*.v1`。不改 `airwave.schemaGeneration`（維持 1）。

Popup 狀態鏡像這把鍵，更新只靠 `chrome.storage.onChanged`。popup 禁止對此鍵 `set`。

## Commands

經既有 typed command，只回發起端。

| kind | 入 | 成功 | 失敗 |
|------|----|------|------|
| `addressBook.add` | `name`, `address` | 新卡（新 `id`）已附在陣列尾 | `EMPTY_NAME`、`INVALID_ADDRESS`、`DUPLICATE_ADDRESS` |
| `addressBook.rename` | `id`, `name` | 該 `id` 的 `name` 已換，`address` 不變 | `EMPTY_NAME`、`NOT_FOUND` |
| `addressBook.remove` | `id` | 該筆已不在陣列 | `NOT_FOUND` |
| `addressBook.reorder` | `orderedIds` | 陣列改成這個順序 | `INVALID_ORDER`（長度、重複、未知 id） |

`name` 先 `trim`。`address` 先 `trim`，再用 `@solana/kit` `isAddress`。比對重複時用 trim 後字串全等。失敗時 storage 不變。`id` 用 `crypto.randomUUID()`。

## 失敗怎麼出現

- 新增：`INVALID_ADDRESS` 或 `DUPLICATE_ADDRESS` 時不寫入，殼底「加入」停住，對應欄下短句（catalog）。使用者改字後才可再送。
- 改名：空名稱不送 command，輸入回復原名。`NOT_FOUND`：名單不改，該列回復原名，並顯示短句。
- 刪除：`NOT_FOUND`：確認層關掉，名單不改，顯示短句。`EMPTY_NAME` 只可能來自 command 被直接呼叫；畫面不送空名稱。

## 畫面

選單：`PopupMarkup` 的 `MenuItems`，`menu.walletAccounts` 之後、`menu.settings` 之前。下列鍵都進 `ui-messages`，三種 locale 都要有值。`menu.addressCards`、`addressCards.tabCards`、`addressCards.open` 皆為繁中／簡中「地址簿」、英文 `Address book`。其餘：

| 鍵 | zh-Hant | zh-Hans | en |
|----|---------|---------|----|
| `addressCards.empty` | 還沒有地址 | 还没有地址 | No addresses yet |
| `addressCards.add` | 加入 | 加入 | Add |
| `addressCards.name` | 名稱 | 名称 | Name |
| `addressCards.address` | 地址 | 地址 | Address |
| `addressCards.deleteTitle` | 刪除 | 删除 | Delete |
| `addressCards.invalid` | 地址無效 | 地址无效 | Invalid address |
| `addressCards.duplicate` | 這條地址已在 | 这条地址已在 | Address already saved |
| `addressCards.notFound` | 這筆已不在 | 这笔已不在 | No longer in the list |
| `addressCards.tabWallet` | 錢包 | 钱包 | Wallet |
| `addressCards.tabCards` | 地址簿 | 地址簿 | Address book |
| `addressCards.pick` | 選擇地址 | 选择地址 | Choose address |
| `addressCards.open` | 地址簿 | 地址簿 | Address book |

既有 `common.delete`、複製、返回若已有鍵就沿用，不另造。

列表頁標題同這句。列：名稱、其後 `IconRename`；下一行前 4…後 4 與複製（`navigator.clipboard.writeText` 完整 `address`）。垃圾桶開確認，確認才 `addressBook.remove`。

改名：同一列的名稱換成輸入，鉛筆換成勾。勾或輸入失焦：trim 後非空才 `addressBook.rename`；空則回復原名、不送 command。

新增頁：兩個欄位＋殼底「加入」。未按加入就返回：不送 command。

送出：`TokenSendForm` 收款列右側簿圖示，導到全螢幕選擇頁（popup 內一頁，不是 overlay 半屏）。分頁「錢包」「Address cards」。

錢包列來源＝目前 `accounts` 清單，每戶一列：

- 非聚合：`publicKeyBase58`，圖示＝`accountVisualKind`
- 聚合：只放 `mainPubkey`，圖示＝combined

點列：回到送出。`wallet.beginSend` 的 recipient 是該列**完整地址**。名稱＋前 4…後 4 只顯示，不得拿去當 recipient。清除圖示把 recipient 設成空字串，回到手貼。手貼不查名單。顯示名稱用帳戶 `label` 或卡片 `name`。
