# 0.30.0 — reasoning

## 為何必須 offscreen 承載 sandbox

MV3 service worker 無穩定 DOM，不適合作 iframe 宿主。Offscreen document 專門承載 DOM＋embed `manifest.sandbox` 頁，讓 harness 與 vault／`chrome.*` 分 realm。否決「SW 直接 embed sandbox」當主路徑。Offscreen 只轉發訊息；tool／LLM／Decisions／flags 只在 SW，避免 offscreen 變第二特權執行點。

## 為何 flags 只信 SW

下限若採信 sandbox decode，被竄改的 harness 可省略高危旗標。確定性 flags 必須與 vault 同特權側本地計算，sandbox 回傳只當模型閱讀材料。

## 為何本版要真 sandbox

威脅不只是「模型用自然語言騙出助記詞」（tool allowlist 已可擋大半），還包括：

1. **供應鏈／被竄改的 harness 程式**與 Wallet Core 同 SW 時，惡意碼可直接呼叫 `chrome.storage` 或讀解鎖後記憶體——靠「約定別讀」不夠。
2. **Bug／過寬 tool**：若 host 誤開寫入或把模型字串當碼執行，等同遠端驅動危險行為。Sandbox 讓 agent 側 **API 面就不存在** `chrome.*`；host 只接受結構化 `tool`／`llm.chat`，且 **禁止** `eval`／`new Function`／動態載入未固定腳本。

Sandbox **不**保證：OpenRouter 看不見 tx 內容；使用者仍可核准惡意交易；host 自己的 bug。它保證的是：**跑 loop 的那包碼摸不到 vault／簽名 API。**

## 否決：只抄 source 進 SW、不做 sandbox

可見性↑、隔離≈0。與 AGENTS／full-picture「agent 無 chrome.*」衝突。使用者已定本版做隔離。

## 否決：用 Decisions／JSON 取代 sandbox

Decisions 解決的是**等級可解析**；不解決 harness 與 vault 同 realm。兩者都做：sandbox 跑查詢＋寫報告，host 打 Decisions。

## 否決：報告寫死繁中

產品有 `settings.locale`；寫死會讓簡中／英文使用者看到錯語系。POC 繁中僅手測。

## 為何等級不靠解析報告最後一行

模型格式會漂。Decisions（Settings：`liquid/d1` 預設／`nace-ai/drex-v1.5`）給 typed `choice`；失敗→unknown。Flags 下限防止模型／Decisions 過樂觀。Jev 在 HK geo 封鎖，故不進選單。

## 為何 approve／reject 即丟、不 persist

分析綁單筆 pending；存 storage 增加秘密鄰接面與過期報告誤導。成本上也不鼓勵「回來再看舊報告」當主路徑。

## 為何報告用允許清單 Markdown，不用 HTML 或完整套件

模型擅長短 Markdown。完整套件再消毒會多依賴，漏了就是 XSS。叫模型寫 HTML 更糟。本倉只認標題、列表、粗體、斜體、行內 code；用 `createElement` 組節點，標籤字元當文字。未列語法不執行。

## 為何報告用 overlay、不用頁內展開

簽署卡已有模擬差額、費用、指令明細。頁內展開會把帳戶／站點／標題往下推，捲軸職責混成兩份。懸浮卡固定在站點列高度、overlay 獨佔中層捲軸，關掉後明細捲動位置仍在。進行中不寫「可不候」一類旁白——核准列自己說明還能按。

## 為何 refresh 不重跑 AI

AI 多輪＋Decisions 成本與延遲高；使用者常只是重看模擬。需要「再分析」列非目標，避免本版 UI 膨脹。

## Harness 抄入本倉、不 npm

減少執行時供應鏈；仍須 sandbox。旁倉 bubble-harness 當參考與 POC vendor 來源。
