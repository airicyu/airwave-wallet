# Wallet UI 多語言 — backlog

構想尚未排進某版 INDEX，**不是契約**。排程後以該版 INDEX 為準。

## 產品意向

**Wallet app UI**（popup 與 popout）使用者可見文案只支援三種語言：

| 代碼 | 語言 |
|------|------|
| `zh-Hant` | 繁體中文 |
| `zh-Hans` | 簡體中文 |
| `en` | 英文 |

語言在 **Settings** 切換。切換是互斥選擇（分段或同等一眼可辨的控制），**立刻**寫入設定並重繪目前畫面（對齊 [`design-principles.md`](../../design-principles.md) 第 2、5 節：切換立刻生效，不要整頁 Save）。

專有名詞可維持英文（RPC、Helius、Jupiter、Combined、devnet、mainnet、SOL）。鏈上名稱、symbol、地址、URL、origin、錯誤碼原文不翻譯。

## 版面對齊

三種語文長度差很大（「設定」對 `Settings`、「複製」對 `Copy`）。排程實作時，**所有使用者可見字串的容器**都要在 popup 寬約 **384px** 內對齊，不能只為某一語調寬：

- 按鈕、選單列、區塊標題、空狀態、錯誤短句、分段控制：最長語文仍單行可讀；放不下則 `ellipsis`，完整句放 `title`／`aria-label`（同一句，且跟目前語言走）。
- Icon 按鈕維持圖示；tooltip 與 `aria-label` 走字串表，不再寫死繁中。
- 禁止為了某一語把主列折成兩行、或把頁級主按鈕擠出殼底。
- 數字、公鑰縮寫（前 4…後 4）、mint 縮寫維持現有規則；本構想**不**另做完整數字／日期在地化。

現況文案散落在 `wallet/src/popup/`（及 popout）。排程時收成**一份**字串表（三種語言鍵對齊），畫面只取鍵。缺鍵在開發時要能發現，上線不可空白。

## 持久

語言偏好進既有 settings（`chrome.storage` 為真相，`onChanged` 更新各 UI）。解鎖前後、popup 與 popout 讀同一偏好。不把語言當 session-only。

## 與設計原則

[`design-principles.md`](../../design-principles.md) 第 3 節 tooltip、第 6 節「UI 用繁體中文」是**現況**。本項排進某版並出貨時，該版 INDEX 須明文改這兩節：文案跟使用者語言，原則檔不再假設只有繁中。未排程前不要先改原則檔。

## 開工前仍須拍板（排進 INDEX 時）

- 預設語言：固定 `zh-Hant`，或對映瀏覽器語言（只接受上表三碼，其餘落 `zh-Hant`）。
- 字串表放哪、鍵名風格；是否允許某鍵暫時只填一種語言。
- popout 核准頁與解鎖頁是否與 popup **同一版**做完（意向是同一版，因為都是 wallet UI）。

## 非目標（構想層）

- 第四種語言、RTL、使用者自訂翻譯
- 翻譯代幣名稱、dApp 頁、`test-web/`
- 把操作說明寫回畫面（仍守設計原則第 6 節：少說話）
- Agent／LLM 文案、鏈上資料在地化
