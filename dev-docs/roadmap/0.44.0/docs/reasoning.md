# 0.44.0 reasoning

## 為何 completion 時才換模型

見前版；test-web 不做備援，錢包在 `openrouter.ts` 實作。

## default vs custom（報告與定級各一）

**問題：** 若把預設三／兩個 model id 寫進 storage，下版改產品預設時，舊使用者仍跑過期 id。

**做法：** storage 只記 `default` | `custom`。`default` 時 runtime 讀 `tx-ai.ts` 的 `DEFAULT_*_CHAIN`；出貨新版本改常數即可讓「跟預設」的使用者自動跟上。

**custom：** 最多 5 個有序 id 存 `*Chain`；備援順序即使用者填寫順序。custom 鏈 normalize 後為空 → fallback 到程式預設鏈（避免空自訂卡死）。

## 報告預設鏈（0.44.0 常數）

1. `inclusionai/ling-3.0-flash`
2. `nvidia/nemotron-3.5-lightning`
3. `~deepseek/deepseek-flash-latest`

取代 0.39 報告預設 `apodex/...` 作為 **default 模式** 的 runtime 來源。Migrate：storage **仍等於** 0.39 程式預設（報告 apodex、定級 d1）→ `default`，下版自動跟新 `DEFAULT_*_CHAIN`；**僅**其他已存合法單一 id → `custom` + `[id]`，避免把「跟舊預設字面相同」誤當自訂。

## 定級預設鏈

`liquid/d1` → `nace-ai/drex-v1.5`（與 0.39 定級 preset 一致），同樣只活在程式常數，default 模式不 persist。

## session 鎖定 `reportModelUsed`

同前 HOW；避免每 step 從鏈頭重掃。

## 停止分析

`ui.discardTxAi` + 審批 UI；test-web 僅 Abort harness。

## 否決

- 在 storage 存一份「當時的 default 鏈」快照
- 「還原預設」按鈕寫死 id 進 storage（與 default 模式重複且會過期）
- 預設模式下讓使用者改 disabled 列的值並寫入 storage（預設列必須唯讀，值只來自常數）

## test-web 與 wallet 順序

錢包依本版 INDEX／HOW；test-web 不套用 default／custom UX。
