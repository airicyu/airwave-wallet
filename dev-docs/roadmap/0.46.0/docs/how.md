# 0.46.0 — HOW

## 列狀態

每列本地狀態：`idle` 或 `editing`。草稿只在 `editing` 存在。頁面上最多一列 `editing`。

`idle` 且已設定：`readOnly`，值為 `••••••`。`idle` 且未設定：`readOnly`，值空，placeholder 仍是 `common.optional`。

`editing`：`readOnly` 拿掉，值是草稿。點鉛筆後先停在唯讀、不畫確認與捨棄，直到該欄明文已放進草稿。讀取失敗回到 `idle`，草稿保持未建立，不呼叫 `persist*`。

## 按鈕

| 狀態 | 從左到右 |
|------|----------|
| idle | 顯示（`common.show`）、鉛筆（`IconRename`，`common.edit`） |
| editing | 顯示、確認（`common.confirm` + `IconCheck`）、捨棄（`common.discard` + `IconX`） |

`common.edit` 與 `common.discard` 都進 `ui-messages.ts`（此檔目前由手寫表維護，沒有獨立 catalog 來源）。

顯示在兩態都可點。`editing` 時只切換草稿的遮罩與否，不退出編輯、不寫入。遮罩時輸入框仍是那份草稿，只是顯示 `••••••`；再點顯示還原草稿全文。

## 寫入

確認：`onMouseDown` 不要讓輸入框先失焦而把草稿丟掉。按下確認或捨棄造成的 blur 不觸發「失焦即離開 editing」。按下態 class 約 140ms 後呼叫對應 `persist*Field`。函式回傳後（含「與已存相同」的 `false`）離開 `editing` 並遮罩。拋錯則留在 `editing`。

捨棄與「被另一列搶走編輯權」與卸載：不呼叫 `persist*`。

禁止在 `onChange` 遇到空字串時寫入。`onBlur` 不寫入，並且離開 `editing`、丟草稿、回到遮罩。這是相對現碼的行為刪除。

## 樣式

按下態加在確認與捨棄按鈕：`transform: scale(0.86)`，確認偏 `--ok` 底、捨棄偏 `--danger` 底。不新增畫面說明文字。
