# Roadmap 開發節奏（Airwave Wallet）

← [GUIDELINES.md](./GUIDELINES.md)（**寫什麼／如何自足／架構禁區**）

[`GUIDELINES.md`](./GUIDELINES.md) 管 roadmap **文件寫作**；本檔管 **誰開新 session、何時審查、何時 HANDOFF、何時測**。

執行某一版（設計審查迴圈 → Track 實作）時，用倉庫內技能 `.agents/skills/roadmap-version`。本檔是該技能的規範來源，不另認上層目錄的通用模板。

---

## 為何要「新 agent 審查 → 回原 agent 收斂」

| 做法 | 用意 |
|------|------|
| **新 agent 做 review** | 無實作／討論殘留，只對 INDEX＋docs（或 diff）找洞 |
| **回原 agent（或規劃 agent）處理 review** | 有產品脈絡，負責拍板、併入已定案、改文件 |
| **另開實作 agent＋HANDOFF** | 實作 context 乾淨；只認檔案、不認聊天 |

不要讓同一個長對話既腦暴、又實作、又自審。

---

## 建議生命周期（中改以上）

```text
構想／backlog
    → 排程 INDEX（planned；可 rough）
    → 規劃對話：談清 scope → 寫滿已定案／docs／reasoning
    → 【可選】新 agent：design-review → 寫 docs/design-review.md
    → 回規劃 agent：覆核 findings → 併入 INDEX 已定案
    → 寫／更新 HANDOFF.md（含 paste-ready starter prompt）
    → 新 agent：依 HANDOFF 實作（in progress）
    → 【建議】新 agent：implementation-review → 寫 docs/implementation-review.md
    → 回實作／規劃 agent：修洞 → 複審通過
    → shipped：changelog；勾驗收；清 backlog
```

小改可縮成：自足 INDEX → 直接實作 → 對照驗收勾一次。使用者明確要求時才跳過設計審查。

---

## 角色與產物

| 角色 | 典型 session | 產物 | 不要做 |
|------|----------------|------|--------|
| **規劃** | 與使用者談產品 | INDEX、docs、reasoning、清空待拍板 | 大範圍實作（除非使用者明確要求） |
| **設計審查** | **新** agent | `docs/design-review.md` | 直接改程式；擅自把提議當已定案 |
| **規劃收斂** | 回原規劃 agent | 將同意項併入已定案；更新 HANDOFF | 口頭「之後注意」卻不寫檔 |
| **實作** | **新** agent＋HANDOFF | 程式＋測試；INDEX → `in progress` | 發明 INDEX 未寫的語意；做非目標；改 `../solibra-wallet` |
| **實作審查** | **新** agent | `docs/implementation-review.md` | 順便加功能 |
| **實作收斂** | 回實作 agent | 修 HIGH／同意的 MEDIUM；複審 | 未關閉 HIGH 就宣稱 shipped |

審查報告應標：**對照基準＝本版 INDEX**（已定案＋驗收）。架構禁區以 [GUIDELINES.md](./GUIDELINES.md) 為準；INDEX 沉默時禁區仍有效。

---

## Implementation review

中改以上碼大致完成後，用 **新 agent** 寫 `docs/roadmap/X.Y.Z/docs/implementation-review.md`，再回實作 agent 修洞。

### 輪次

| 輪 | 誰 | 做什麼 |
|----|-----|--------|
| **初審** | **新** agent | 只讀 INDEX＋docs＋diff；開 findings；跑該版約定的測試並記錄 |
| **修復** | 回 **實作** agent | 只修追蹤項；更新同一份報告狀態欄 |
| **複審** | 實作自核或再開 **新** agent | 核對已關項；重跑該版測試；留意迴歸 |
| **獨立核實**（中改以上建議） | **新** agent | 不延續實作對話；再驗一輪 |

勿為每輪另開新檔——**同一 `implementation-review.md` 累加輪次**。  
審查 agent **不改程式**。**Do not commit unless the user asks**。

### Findings 分級

| 級 | 含義 | 出貨 |
|----|------|------|
| **HIGH** | 違反已定案／驗收、契約錯誤、主路徑不可用、違反架構禁區 | **必須關閉** |
| **MEDIUM** | 文件／測試漏網、次要路徑不一致 | **預設修**；可標非阻擋 |
| **LOW** | 字串、命名、文件一句 | 記錄即可；可不擋 shipped |

每項穩定 ID（`H1`、`M3`…）；修復輪勿重編號。

### 報告最低章節

- 各輪日期、對照基準、一兩句可否出貨  
- 總評 → Findings（H／M／L）→ 驗收對照 → 測試結果 → 修復追蹤 → 歷審摘要  

### 出貨門檻

- [ ] 無未關閉 **HIGH**  
- [ ] 同意的 **MEDIUM** 已修或標非阻擋  
- [ ] INDEX **驗收** 全勾（或報告逐條通過）  
- [ ] 該版約定的測試已跑且通過（見文末；尚無整包指令時，以 INDEX 手驗為準並在報告寫明）  
- [ ] backlog 該列已清（若該構想來自 backlog）  
- [ ] 使用者同意後再 **git commit**  

### 審查 agent 貼用 prompt（可選）

技能 `.agents/skills/roadmap-version/prompts.md` 有完整貼用稿。臨時手貼時至少包含：

```text
你是 Airwave Wallet 實作審查 agent。只認檔案，不認 chat history。
先讀 AGENTS.md → docs/roadmap/GUIDELINES.md → docs/roadmap/X.Y.Z/INDEX.md（已定案＋驗收）→ HANDOFF → 相關 docs。
對照 working tree／diff 寫 docs/implementation-review.md（分 H/M/L、穩定 ID、含該版測試或手驗結果）。
不要改程式、不要加功能、不要 commit。
對照基準＝INDEX。架構禁區見 GUIDELINES。不要把助記詞、私鑰、密碼寫進報告。
```

---

## HANDOFF

中改以上 **實作前應有** `docs/roadmap/X.Y.Z/HANDOFF.md`：

- 讀檔順序、產品摘要、Track 順序、禁區、錨點、完成檢查清單  
- 文末 **Paste-ready starter prompt**  
- **Do not commit unless the user asks**  
- 對使用者語言：繁體中文書面語（見倉庫根 `AGENTS.md`）  

Starter prompt 最低要素：

1. 只認檔案、不認 chat history  
2. 先讀 `AGENTS.md`、`docs/roadmap/GUIDELINES.md`、HANDOFF、INDEX＋連結  
3. 跟 Track 順序；禁非目標；不改 `../solibra-wallet`  
4. INDEX 沉默才提問，否則跟已定案；沉默時仍遵守 GUIDELINES 架構禁區  

---

## Track 節奏與測試

| 時機 | 測試期望 |
|------|----------|
| **每個 Track 結束** | 該 Track 相關 unit／窄測／手驗；驗收句成立再進下一 Track |
| **全部 Track 結束** | 必跑 **該版約定的整包測試**；尚無指令時，把 INDEX 每一條驗收的手驗結果寫進實作摘要 |
| **實作審查前後** | 再跑同一組；報告記錄結果 |

不要只在最後才第一次跑測。Popup／popout／注入頁有改動時，用未封裝擴充走該流程，不要只看靜態截圖。

---

## 與 GUIDELINES 的分工

| 檔 | 回答 |
|----|------|
| **GUIDELINES.md** | Roadmap 怎麼寫才自足？INDEX 要有哪些欄？架構禁區是什麼？ |
| **本檔** | 哪個 agent 做審查／實作？HANDOFF 何時寫？Track 之間測什麼？ |

---

## 簡表：你現在卡在哪

| 狀態 | 下一步 |
|------|--------|
| 還在談產品 | 規劃 agent；更新 INDEX，勿開實作 |
| INDEX 自足但怕有洞 | **新** agent → design-review → 回規劃併入 |
| 待拍板已空 | 寫 HANDOFF → **新** agent 實作 |
| 碼大致完成 | **新** agent → implementation-review → 回實作修 |
| 驗收全勾、測試過、無未關 HIGH | shipped；使用者同意再 commit |

---

## 檢查清單（開實作 agent 前）

- [ ] INDEX 已定案完整；待拍板為空（或僅非目標）  
- [ ] design-review 同意項已併入檔案（若有做）  
- [ ] `HANDOFF.md` 存在且含 paste-ready prompt  
- [ ] 非目標寫清  
- [ ] 使用者知悉：用 **新** chat／session 實作  

---

## 本專案補充

- **整包測試指令：** 尚無。禁止假設 `bun test`。第一個引入測試的版本必須在該版已定案寫明指令與 cwd，並回寫 [GUIDELINES.md](./GUIDELINES.md)「出貨檔案」表。在那之前，Track 與出貨以該版 INDEX 的手驗／窄測為準。  
- **version／changelog：** 倉庫根 `CHANGELOG.md`（第一個 shipped 版建立）。日後若有 `package.json`，`version` 與目錄 `X.Y.Z` 對齊。  
- **契約／AGENTS：** 倉庫根 `AGENTS.md`（只規定回應語言）。架構禁區在 `docs/roadmap/GUIDELINES.md`。訊息、storage、custody、Wallet Standard 能力表尚無全域契約檔，由引入的版本建立並在 INDEX 掛路徑。  
- **其他禁區：** 不改 `../solibra-wallet`；不把 `brainstorm/` 當已定案；roadmap 與審查報告不寫助記詞、私鑰、密碼、個人地址、生產 RPC 秘密。工作目錄是 **airwave-wallet 倉庫根**。  
