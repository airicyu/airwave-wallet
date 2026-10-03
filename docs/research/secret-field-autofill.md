# 秘密欄位與瀏覽器自動填入

給改 popup／popout **匯入助記詞、匯入私鑰、Reveal、錢包密碼、API key 遮罩欄** 的人。這不是某版契約。錢包密碼已出貨見 [0.8.0](../roadmap/0.8.0/INDEX.md)；概念稿 [`docs/design-demos/change-wallet-password-ux.html`](../design-demos/change-wallet-password-ux.html)。

**禁止**在本檔、roadmap、commit、截圖或 log 寫入真實助記詞、私鑰、密碼、keystore 密文、生產 API key。

有兩類欄，**不可共用同一套防護**：

| 類 | 欄 | 目標 |
|----|----|------|
| A 金鑰材料 | 助記詞格、私鑰 textarea、Reveal 出來的密鑰字串 | **不要**被密碼管理器當成可記住的登入資料 |
| B 錢包密碼 | 建庫、解鎖、Reveal 再確認、日後「變更密碼」 | **不得**進 Google 密碼管理器；畫面仍打碼。解鎖不能依賴 Google 一鍵填入 |
| C 遮罩用 `type=password` | Settings Jupiter API key | **不是**錢包密碼；用 password 只為打碼。不應被存成「Airwave 登入密碼」 |

---

## 類 A：助記詞／私鑰

擴充 popup **不是**一般網站表單。助記詞不會被送去 Google 表單。

| 來源 | 是否常見 | 說明 |
|------|----------|------|
| Google 表單／網站表單同步 | 否 | popup 不是網頁表單 |
| Chrome 自動填入、地址／搜尋建議 | 有可能 | 多個 `type=text` 時 heuristic 可能當成可記住欄位 |
| 1Password、LastPass 等 | 有可能 | 若誤判成登入或密碼欄 |
| 擴充 `chrome.storage` | 否（目前） | 助記詞只留 popup 記憶體；金庫裡是加密後的簽名密鑰 |

`autocomplete="off"` 單獨使用時瀏覽器常忽略。

### 目前防護（程式）

`wallet/src/popup/main.ts` 的 `hardenSensitiveTextInput`：助記詞格與私鑰 textarea。

離開助記詞頁、私鑰頁、Reveal 頁時清空 DOM 與對應 state。

---

## 類 B：錢包密碼（含新加「變更密碼」）

產品要求：**錢包密碼絕不進 Google 密碼管理器**（含 Chrome 同步）。這做不到「Chrome 保證永遠不問」，但可以拿掉 Chrome 用來辨識「這是登入密碼欄」的訊號，把機率壓到實務上接近零。

**做不到的：** 擴充沒有 API 能關掉使用者的 Google 密碼管理器。`autocomplete="off"` 或 `"new-password"` 對 `type="password"` **幾乎無效**，反而邀請「儲存／更新密碼」。

**要做的（建庫、解鎖、Reveal 再確認、變更密碼同一套）：**

1. **不要用 `type="password"`。** Chrome 主要靠這個型別決定要不要存。改用 `type="text"`，CSS `-webkit-text-security: disc` 打碼（本產品只跑 Chrome，前綴可用）。
2. **禁止** `autocomplete="current-password"`／`"new-password"`。用 `off`，欄位不要叫 `name="password"`／`username`。
3. **沿用類 A 的抗管理器屬性：** `data-lpignore`、`data-1p-ignore`、`data-form-type="other"`、`aria-autocomplete="none"`、focus 前 `readOnly`。可抽 `hardenWalletPasswordInput`（與助記詞同一函式或同等屬性）。
4. **不要包在帶 submit 的 `<form>`。** 用 button click 送 command。
5. 成功、失敗、Back、關 popup：**立刻清空** value。建庫／解鎖現況沒清，要一齊改，否則安裝當下仍會被 Google 問。
6. 不要眼睛圖示把字變回可見長駐。

代價：解鎖／改密 **不能** 靠 Google 一鍵填錢包密碼。這就是這條產品要求的含義。1Password 若忽略 `data-1p-ignore` 仍可能問；屬性只能降低，不是合約。

現況欄位（皆 `type="password"`，**尚未**符合本要求）：

| UI | 現況 `autocomplete` | 離開／成功後清空 DOM |
|----|----------------|----------------------|
| 安裝建庫兩欄 | `new-password` | **未**見成功後清空 |
| 鎖定解鎖 | `current-password` | **未**見成功後清空 |
| Reveal 再確認 | `current-password` | 提交後與離開頁有清 |
| 變更密碼（尚未實作） | 概念稿改為與上列同一套遮罩 text | 須成功或 Back 清空 |

密碼進 SW 只在該次 command payload。`chrome.storage.local` 的 vault 是密文。解鎖後 `chrome.storage.session` 鏡的是**工作金鑰材料**，**不是**密碼明文。

其它路徑（實作禁區）：不得把密碼寫進 `chrome.storage` 明文、log、changelog。惡意擴充／錄屏／keylog 仍屬環境。

不要把 Jupiter key 與錢包密碼放進同一 `<form>`。

---

## 類 C：Jupiter API key（Settings）

現況產品碼仍是 `type="password"`。概念稿改為 `type="text"`、有值時兩欄皆 `••••••`、Reveal 圖示切換，見 [`docs/design-demos/settings-hub-ux.html`](../design-demos/settings-hub-ux.html)。不要 `current-password`。Helius 標成 API URL；遮罩不要露出 `?api-key=`。

---

## 做不到的事

沒有 API 能禁止使用者手動把密碼貼進 Google。惡意軟體、螢幕錄影、剪貼簿、鍵盤側錄仍可能取得內容。HTML 只能拿掉「儲存密碼」提示的主要觸發條件。

## 之後改 UI 時

- 類 A 維持文字欄 + `hardenSensitiveTextInput`，**不要**改成 `type=password`。
- 類 B **也不要用** `type=password`；用遮罩 text + 抗管理器屬性。建庫／解鎖／Reveal／改密同一套。
- 類 C 不要 `current-password`；若要與「不進 Google」對齊，同樣不要 `type=password`。
- 測試與文件只用虛構佔位。
