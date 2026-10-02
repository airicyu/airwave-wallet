# 秘密欄位與瀏覽器自動填入

給改 popup／popout **匯入助記詞、匯入私鑰、Reveal** 的人。這不是某版契約。錢包密碼欄位的產品取捨見 backlog [變更錢包密碼](../roadmap/backlog/change-wallet-password.md)。

**禁止**在本檔、roadmap、commit、截圖或 log 寫入真實助記詞、私鑰、密碼、keystore 密文。說明格式時用「12 個單字」「base58」「位元組陣列」這類說法，不要放半截範例位元組。

## 風險從哪來

擴充 popup **不是**一般網站表單。助記詞不會被送去 Google 表單或網站表單同步。

會發生的是瀏覽器與密碼管理器把欄位當成「可記住的資料」：

| 來源 | 是否常見 | 說明 |
|------|----------|------|
| Google 表單／網站表單同步 | 否 | popup 不是網頁表單，不會被送到 Google Forms |
| Chrome 自動填入、地址／搜尋建議 | 有可能 | 多個文字框時，heuristic 可能當成可記住的欄位 |
| 1Password、LastPass 等 | 有可能 | 若辨識成登入或密碼欄位，可能提示儲存 |
| 擴充自己的 `chrome.storage` | 否（目前） | 助記詞只留在 popup 記憶體，匯入後不寫入 storage；金庫裡是加密後的簽名密鑰 |

`autocomplete="off"` 單獨使用時，瀏覽器常會忽略。

## 目前防護（程式）

`wallet/src/popup/main.ts` 的 `hardenSensitiveTextInput`，用在助記詞格子與私鑰 textarea：

- `autocomplete="off"`、`aria-autocomplete="none"`
- 關閉拼字、自動大寫、自動修正
- `data-lpignore`、`data-1p-ignore`、`data-form-type="other"`，讓常見密碼管理器略過
- 先 `readOnly`，focus 才改回可編輯（降低一開頁就被 autofill 填上）
- 助記詞外層 `<form autocomplete="off" novalidate>`

離開助記詞頁、私鑰頁、Reveal 頁時清空 DOM 與對應 state，縮短秘密留在畫面上的時間。

## 做不到的事

HTML 屬性無法保證秘密不外洩。惡意軟體、螢幕錄影、剪貼簿、鍵盤側錄仍可能取得內容；瀏覽器改版也可能忽略這些屬性。使用習慣仍是：只在可信環境匯入、匯入後關閉 popup、不要在共用電腦依賴自動填入。

## 之後改 UI 時

- 助記詞與私鑰維持 secret 文字欄，**不要**改成 `type="password"` 來「順便」擋住顯示——那樣更容易被密碼管理器當成登入密碼。
- 新增同類輸入時沿用 `hardenSensitiveTextInput`（或同等屬性），離開該頁就清空。
- 錢包密碼（建立、解鎖、Reveal 再確認、日後改密碼）是另一類：本來就是 `type="password"`。不要把助記詞的 ignore 屬性，和「密碼管理器能不能記住錢包密碼」混成同一題。
- 測試與文件只用虛構、明顯無效的佔位，不要從瀏覽器 profile 或截圖抄秘密進來。
