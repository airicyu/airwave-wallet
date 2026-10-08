# Wallet UI 多語言 — backlog

已排進 [0.23.0](../0.23.0/INDEX.md)。**契約以該版 INDEX 為準**；本檔只是構想摘要。

概念稿（非正式）：[`design-demos/i18n-type-ux.html`](../../design-demos/i18n-type-ux.html)。

**字體（已選）：** 方案 B。UI 字體 `Segoe UI, "Microsoft JhengHei UI", "PingFang TC", sans-serif`。英文一種、中文一種；繁簡同一套正黑／蘋方，不切雅黑、不打包 webfont。金額與地址維持 `--mono`。中文標題不套 `letter-spacing: 0.02em`。

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

## 查表工具（已選）

**不引入** `i18next`、`react-intl` 或其它翻譯套件。本倉庫寫一個很小的 util（popup／popout／審批殼共用）：

- 一份 typed catalog：每個 key 必須同時有 `zh-Hant`、`zh-Hans`、`en`；TypeScript 對不齊就編不過。
- `t(locale, key)`（或 React hook 包一層）只做查表。需要插入數字／名稱時用佔位（例如 `{amount}`），在 util 內替換；**禁止**畫面用 `if (locale === "en")` 拼句子。
- `locale` 只從 settings 讀。未知碼落預設（提案固定 `zh-Hant`）。
- 語言分支只准出現在：Settings 寫入、查表入口、語言列的 endonym。各畫面不複製三份 markup。

## 持久

語言偏好進既有 settings（`chrome.storage` 為真相，`onChanged` 更新各 UI）。解鎖前後、popup 與 popout 讀同一偏好。不把語言當 session-only。

## 與設計原則

[`design-principles.md`](../../design-principles.md) 第 3 節 tooltip、第 6 節「UI 用繁體中文」是**現況**。本項排進某版並出貨時，該版 INDEX 須明文改這兩節：文案跟使用者語言，原則檔不再假設只有繁中。未排程前不要先改原則檔。

## 開工前仍須拍板（排進 INDEX 時）

- 預設語言：固定 `zh-Hant`，或對映瀏覽器語言（只接受上表三碼，其餘落 `zh-Hant`）。
- 字串表檔案路徑與鍵名風格（不允許某鍵只填一種語言；三語必須齊）。
- popout 核准頁與解鎖頁是否與 popup **同一版**做完（意向是同一版，因為都是 wallet UI）。

## 非目標（構想層）

- 第四種語言、RTL、使用者自訂翻譯
- 翻譯代幣名稱、dApp 頁、`test-web/`
- 把操作說明寫回畫面（仍守設計原則第 6 節：少說話）
- Agent／LLM 文案、鏈上資料在地化
- 第三方 i18n 套件
