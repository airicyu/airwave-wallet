---
name: roadmap-version
description: >-
  Runs an Airwave Wallet roadmap version through design-review rounds then
  Track-based implementation. Spawns a fresh design reviewer, merges findings
  into INDEX/docs/HANDOFF, repeats until the design gate passes, or stops if
  the proposal is not feasible. Then implements Track by Track using the test
  or manual checks named in that version. Use when the user names a version
  (e.g. 0.1.0), asks to execute docs/roadmap/X.Y.Z, invokes /roadmap-version,
  or asks to follow agent-workflow for a version.
disable-model-invocation: true
---

# Roadmap version（設計審查閘門 → Track 實作）

本技能執行一份 **Airwave Wallet roadmap 版本**。規範來源：[`docs/roadmap/agent-workflow.md`](../../../docs/roadmap/agent-workflow.md)、[`docs/roadmap/GUIDELINES.md`](../../../docs/roadmap/GUIDELINES.md)、倉庫根 `AGENTS.md`。

對使用者：**繁體中文書面語**。**Do not commit unless the user asks.**

貼用 prompt 與報告骨架見同目錄：[prompts.md](prompts.md)、[review-template.md](review-template.md)。

工作目錄是 **airwave-wallet 倉庫根**。不要改 `../solibra-wallet`，不要改上層 `docs/agent-roadmap/`。

## 觸發與版本

使用者須給出版本（`0.1.0`）或目錄（`docs/roadmap/0.1.0/`）。未給則問一次，勿猜。

工作目錄：`docs/roadmap/<VER>/`。必讀：`INDEX.md`；有則讀 `docs/*`、`HANDOFF.md`。對照上一版 INDEX、相關 `backlog/*.md`（構想，**不得覆寫本版已定案**）。`docs/brainstorm/` 只是背景，不是本版契約。

## 角色分工（強制）

| 角色 | 誰 | 可改什麼 | 禁止 |
|------|----|----------|------|
| **設計審查** | **每次新 spawn** 的 Task subagent（`generalPurpose`；**禁止** `resume`） | 只寫／更新 **同一份** `docs/design-review.md` | 改 INDEX／HOW／reasoning／HANDOFF／程式；把本檔當已定案；commit |
| **規劃收斂** | **本 session**（呼叫本技能的 agent） | INDEX、HOW、reasoning、HANDOFF | 在閘門通過前寫產品碼；口頭「之後注意」卻不寫檔 |
| **實作** | 閘門通過後 **本 session** | 本倉庫程式＋測試；INDEX 狀態 `in progress` | 發明 INDEX 未寫的語意；做非目標；改舊錢包倉庫 |
| **實作審查** | 碼大致完成後 **新 spawn**（禁止 resume 實作脈絡） | 只寫／更新 **同一份** `docs/implementation-review.md` | 改程式、加功能、commit |

同一長對話不得既當審查又自審。審查必須是 **無本場討論殘留** 的新 subagent。

## 總流程

```
0  預檢 INDEX 自足
1  迴圈：spawn 設計審查 → 本 agent 收斂提案
    直到設計閘門通過，或判定提案不可行則停止
2  補齊／更新 HANDOFF（含 paste-ready）
3  依 Track 實作＋該 Track 驗收；全部結束跑該版約定的測試或手驗
4  spawn 實作審查 → 修洞 → 必要時複審
5  出貨文件；不 commit，除非使用者要求
```

小改：使用者明確說跳過設計審查時，可略過步驟 1；仍須自足 INDEX，並走 Track 驗收。**預設不跳過。**

---

## 0. 預檢

讀 `INDEX.md` 與連結 docs，以及 `docs/roadmap/GUIDELINES.md` 的架構禁區。對照 GUIDELINES 自足檢查。

若 **開工前仍須拍板** 非空（且不是已標成非目標）：**停止**。告訴使用者先拍板，勿開審查迴圈當拍板。

若 INDEX 過短、已定案不是完整句子、驗收無法客觀判斷：本 agent **先補文件到可審**，再進步驟 1。補的是把已寫意圖寫清楚，不是發明新品語意。需要產品抉擇則問使用者。

預檢禁區：

- 勿把定案只留在 chat
- 勿把助記詞、私鑰、密碼、個人地址、生產 RPC 秘密寫進 INDEX／docs／reasoning／HANDOFF／審查報告
- 勿把 `docs/brainstorm/` 或 Solibra 原始碼當成已定案。INDEX 與 `docs/brainstorm/` 衝突時以 INDEX 為準
- 主路徑不得用：operation store hydrate 找請求、預設廣播全 tab、手寫 rehydrate 當主同步、硬編碼或明文持久密碼、inject 持有長期私鑰、宣告未實作的 Wallet Standard 方法
- 倉庫尚無整包測試指令。該版 INDEX 必須寫明手驗或測試指令；**禁止**假設 `bun test`
- 實作範圍限本倉庫

---

## 1. 設計審查迴圈

同一檔：`docs/roadmap/<VER>/docs/design-review.md`。**勿為每輪另開新檔**；累加輪次、穩定 ID（`H1`、`M3`…），修復輪 **勿重編號**。

### 1a. Spawn 審查

用 Task：`subagent_type=generalPurpose`，**不要** `resume`。`run_in_background=false`。prompt 用 [prompts.md](prompts.md)「設計審查」整段，填入 `<VER>` 與錨點路徑。

要求 subagent 回傳：總評一句、未關閉 HIGH 列表、建議修的 MEDIUM、**是否判定不可行**、報告檔路徑。

若 Task 失敗：重試一次新 spawn；仍失敗則停，向使用者說明。

### 1b. 讀報告並分流

讀 `design-review.md`（以檔案為準，不認 subagent 閒聊）。

**停止（提案不可行）** — 出現任一即停，**不要**為過關而扭曲產品句：

- 審查寫明本版與非目標／架構禁區／既有契約不可調和，且無「只改文件、不改產品意圖」的修法
- 主路徑必須把 pending 做成持久 Zustand、廣播全 tab、或硬編碼密碼才能工作
- 主路徑必須依賴 INDEX 禁止的能力（含未宣告卻要靠的 Wallet Standard 方法）
- 待拍板無法從已定案推出，繼續改文件只是猜
- 連續多輪同一 HIGH 無進展，本質是產品未決

停止時：用繁中書面語說明理由、引用 finding ID、列出若要繼續需使用者拍板的題。**不要**開始實作。

**收斂（可行）** — 本 agent：

1. 同意的 HIGH／應修 MEDIUM → 寫進 INDEX 已定案與對應 HOW／reasoning／HANDOFF（完整句子，GUIDELINES 自足）
2. 不同意的 MEDIUM／LOW → 在 INDEX 或 reasoning 寫清否決理由，或在報告標 **非阻擋**（須真的不擋主路徑／驗收）
3. 不以 review 檔當契約；契約只在 INDEX＋docs
4. 改定案若改變產品句／非目標／架構禁區：先問使用者；小實作細節可自決

然後 **再 1a**（新 spawn，禁止 resume）。告知審查者：對照**現** INDEX；核對舊 ID 狀態；可新增 ID，勿重編舊號。

建議上限 **8** 輪。達上限仍有未關 HIGH：停、彙報，勿 silently 實作。

### 設計閘門（通過才能進實作）

- [ ] 無未關閉 **HIGH**
- [ ] 同意的 **MEDIUM** 已寫進檔案，或標非阻擋
- [ ] INDEX 待拍板為空（或僅非目標）
- [ ] `HANDOFF.md` 存在且含 paste-ready starter prompt
- [ ] 非目標寫清
- [ ] 最新一輪審查總評寫明門檻通過（本 agent 須自己核對檔案，不盲信一句話）

---

## 2. HANDOFF

閘門通過後確認 `HANDOFF.md`：讀檔順序、產品摘要、**Track 順序**、禁區、錨點、完成檢查、paste-ready。

實作開始時：INDEX 狀態 → `in progress`。

---

## 3. Track 節奏與測試

嚴格跟 INDEX／HANDOFF 的 Track 順序。禁非目標。INDEX 已定案不要再問；**沉默才提問**。沉默時仍遵守 GUIDELINES 架構禁區。

測試以 **該版 INDEX** 寫明的指令或手驗為準。倉庫尚無預設整包指令；有整包指令後以 `docs/roadmap/GUIDELINES.md`「出貨檔案」表為準。

| 時機 | 測試期望 |
|------|----------|
| **每個 Track 結束** | 該 Track 相關 unit／手驗；對應驗收句成立再進下一 Track |
| **全部 Track 結束** | 必跑該版約定的整包測試；尚無指令則逐條完成 INDEX 手驗並留下結果 |
| **實作審查前後** | 再跑同一組；寫入 implementation-review |

Popup、popout、注入頁有行為改動：用未封裝擴充把該流程走一遍（該版驗收點：連接、拒絕、簽名、鎖屏等）。不要只看靜態截圖。若當下沒有瀏覽器可載入擴充，寫明哪幾條驗收未在瀏覽器走完。

引入測試 runner、changelog、或全域契約檔時，回寫 GUIDELINES「出貨檔案」表，並讓 `CHANGELOG.md`（倉庫根）與版本號一致。

---

## 4. 實作審查迴圈（中改以上預設做）

檔案：`docs/roadmap/<VER>/docs/implementation-review.md`（同一檔累加輪次）。

Spawn 新 Task（禁止 resume 實作對話）。prompt 用 [prompts.md](prompts.md)「實作審查」。

| 輪 | 誰 | 做什麼 |
|----|-----|--------|
| 初審 | 新 subagent | 只讀 INDEX＋docs＋diff；開 findings；跑該版測試或手驗並記錄 |
| 修復 | 本實作 session | 只修追蹤項；更新同一份報告狀態欄 |
| 複審 | 再開新 subagent（建議）或本 agent 自核後再獨立 spawn | 核對已關項；重跑測試；留意迴歸 |
| 獨立核實（中改以上建議） | **新** spawn | 不延續實作對話；對碼＋該版測試再驗 |

Findings 分級與出貨門檻同 agent-workflow：HIGH 必須關；MEDIUM 預設修或標非阻擋；LOW 可不擋。審查 agent **不改程式**。

若實作審查發現 **設計契約** 仍分叉：回到步驟 1 的規劃收斂改文件，必要時再設計複審；不要用程式「發明」INDEX 沒有的語意。

---

## 5. 出貨前（本技能預設停在「可出貨、待使用者同意 commit」）

- [ ] 無未關閉 HIGH
- [ ] 同意的 MEDIUM 已修或標非阻擋
- [ ] INDEX **驗收**全勾（或 implementation-review 逐條通過）
- [ ] 該版約定的測試或手驗已通過，且 UI 流程已在擴充裡走完（或報告寫明無法走完的原因）
- [ ] 倉庫根 `CHANGELOG.md` 已記本版；若已有 `package.json`，`version` 與 `X.Y.Z` 一致
- [ ] 本版新增或改動的訊息／storage／custody／能力表路徑已寫進 INDEX
- [ ] 該構想已出貨則從 `docs/roadmap/backlog/` **刪列＋刪獨立檔**
- [ ] INDEX 狀態 `shipped` **僅在**驗收與測試通過且使用者同意出貨時改；否則維持 `in progress`

**不要 git commit**，除非使用者明確要求。

---

## 對使用者的進度（精簡）

每階段結束用短段說明：現在輪次、未關 HIGH、下一步（再審／收斂／實作 Track X／停止）。不要把 subagent 全文貼進對話。
