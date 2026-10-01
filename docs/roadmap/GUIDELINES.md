# Roadmap 寫作指南（Airwave Wallet）

← [AGENTS.md](../../AGENTS.md) · **開發節奏：** [agent-workflow.md](./agent-workflow.md)

本檔規範如何寫 `docs/roadmap/`，讓 **另一個沒有對話紀錄的 agent** 也能正確開工。  
寫 roadmap 的 agent 與實作的 agent 常常不是同一個；**對話裡談過但沒寫進檔案的內容，對實作 agent 等於不存在。**

**怎麼開新 agent、何時 design-review／implementation-review、HANDOFF、Track 間自測** → 見 [agent-workflow.md](./agent-workflow.md)。本檔專注 **文件自足、INDEX 結構、本專案禁區**。

---

## 核心原則：Self-sufficient（強制）

Roadmap 是 **跨 agent 交接文件**，不是當下對話的備忘草稿。

| 要求 | 說明 |
|------|------|
| **自足** | 只靠本版 `INDEX`＋其連結的 `docs/`，新 agent 就能知道要做什麼、不要做什麼、怎麼驗收 |
| **禁止腦內省略** | 寫的人「知道那是什麼」不夠；讀的人必須不靠猜測也懂 |
| **禁止過短條目** | 不可只有幾個關鍵字（如「改 path」「加 API」）；每條須寫清 **改什麼、做成什麼樣子、邊界在哪** |
| **相關脈絡一併寫清** | 依賴的舊行為、要推翻的舊語意、對照的訊息／storage 欄位，都寫在檔內或明確連結並摘要，勿假設讀者讀過某次 chat |
| **隱私** | **不要把真實的敏感資料寫入 roadmap**（見下節）；例證用虛構 origin 與標明的測試向量 |

### 自檢（寫完／開工前）

> **若一個新 agent 只讀這些檔、完全沒有我們的對話，會不會誤解或亂猜？**

若答案不是「幾乎不可能誤解」，就還沒寫夠——補句子，不要補暗示。

### 壞例子 → 好例子

| 壞（靠對話腦補） | 好（自足） |
|------------------|------------|
| Track：pending 改記憶體 | pending 只活在 service worker 的 `Map<requestId, { tabId, frameId, origin, payload }>`；popout URL 只帶 `requestId`；UI 向 SW 取 payload，不從 `chrome.storage` hydrate 找包裹 |
| 加 disconnect | `disconnect` 清掉該 origin 的已連線紀錄、對該頁發出帳戶清空，並讓後續 `onlyIfTrusted` connect 必須再審批 |
| 不要廣播 | 審批結果只 `tabs.sendMessage` 回發起的 `tabId`（及該 `frameId`）；預設禁止對所有 tab broadcast |

---

## 典型工作流

```
A. 先談再寫
   與 agent 討論 scope → 寫入／更新 roadmap →（可）detail briefing → 開新 agent 實作

B. 先記再談
   先寫 rough INDEX → 再談 detail → 更新 roadmap → 開新 agent 實作
```

**無論哪種：實作前檔案必須已自足。**  
開新 agent 做 changes 是預期行為；**不能把定案留在舊 conversation。**

---

## 隱私（強制）

`docs/roadmap/` 會進 git，**不是**鑰匙庫或瀏覽器 profile。

| 可以寫 | 不可以寫 |
|--------|----------|
| 訊息欄位名、storage key 名、runtime 職責 | 助記詞、私鑰、keystore 密文、使用者密碼 |
| 虛構 origin（`https://app.example.test`） | 從真實瀏覽器 profile、extension storage、截圖抄出的地址或餘額 |
| 明確標成測試向量的公鑰／簽名 | 生產 RPC URL 上的 API key、工作者網址裡的秘密 |
| 產品詞與契約 | 把 Solibra 硬編碼密碼或個人 proxy 當「範例設定」抄進來 |

說明失敗模式時，另造虛構站點與帳戶。審查報告同樣禁止貼上列內容。

---

## 生命周期

| 階段 | 產物 | 門檻 |
|------|------|------|
| 構想 | `backlog/*.md`（可較短，但仍須讓人看懂題目） | 非承諾 |
| 排程 | `docs/roadmap/X.Y.Z/INDEX.md`（可先 rough） | 有版本號與產品句 |
| Briefing | 更新 INDEX：已定案、非目標、驗收；需要時加 `docs/`、`reasoning.md` | **待拍板清空或標成非目標** |
| 開工 | — | **「讀完本版 roadmap 即可開工」** |
| 出貨 | 勾驗收；版本／changelog 同步；**清 backlog** | 狀態 → `shipped` |

Rough INDEX 允許暫時簡短，但 **進入實作前必須升格為自足稿**。

版本號用 `X.Y.Z`（例 `0.1.0`）。目錄名與 INDEX 標題一致。**Patch**（`Z`，例如 `0.3.1`）只給該 minor 的 bugfix，**不**排新功能；新功能開下一個 **minor** 目錄。

---

## INDEX 最低必要欄位

每版 `INDEX.md` 至少包含：

1. **標題**、上游版本、changelog 連結、**狀態**（`planned`／`in progress`／`shipped`）
2. **產品句**（一句：誰得到什麼、本版邊界）
3. **已定案**（題 → 決定；給實作 agent「勿再問、勿擅自改語意」）
4. **非目標**（防膨脹；可鏈 backlog）
5. **驗收**（可勾 checklist；寫清通過長什麼樣，含該版測試或手驗步驟）
6. **錨點檔案**（改前必讀的程式／文件路徑 + 一句用途）

強烈建議（中型以上）：

- **文件地圖／閱讀順序**
- **實作軌道**（Track）：每軌寫 **做什麼／不要做什麼／驗收**
- **與上一版對照**
- 未收斂題目用 **「開工前仍須拍板」** 表，**不要**與已定案混寫

狀態用語：`planned` → `in progress` → `shipped`。

---

## 文件分工

| 檔 | 職責 |
|----|------|
| **INDEX.md** | 做什麼、不做什麼、軌道、驗收（**WHAT**） |
| **DOMAIN.md** | 跨版領域用語；與 INDEX 衝突時以 **該版 INDEX** 為準並應回寫 DOMAIN |
| **docs/\*.md** | 路徑、訊息表、storage schema、UI 契約（**HOW**） |
| **docs/reasoning.md** | 為何這樣定、反例、否決過的方案（**WHY**） |

---

## 何時需要 `reasoning.md`

Detail briefing 之後，若定案對後續判斷有影響，**應寫 reasoning**。

### 應該寫

- 否決或推翻舊文件／舊語意（含相對 Solibra 的取捨）
- 討論過 ≥2 個方案並選定
- 定案靠 **反例／失敗模式** 撐住
- 擔心日後有人「好心改契約」卻不懂在防什麼

### 可以不寫

僅當內容 **trivial**，且寫 INDEX 的人有把握：新開 agent 只讀 INDEX 也幾乎不可能誤解。  
不確定時：**寫。**

---

## 依複雜度選厚度

| 類型 | 最低文件 |
|------|----------|
| 小改 | 自足的 INDEX 即可；可不寫 reasoning |
| 中改 | INDEX + 1–2 份 docs |
| 大改（訊息、custody、storage 契約） | INDEX + docs + **reasoning** + 分 Track |

**厚度可省，自足不可省。**

---

## Backlog

- `backlog/`＝**尚未出貨**的構想，不是承諾範圍
- 排進某版後：INDEX ↔ backlog **雙向連結**
- **已經出貨的不該再佔 backlog**：該版 `shipped` 後立刻刪 backlog 列與對應 `.md`；真相只留在 `docs/roadmap/X.Y.Z/`

---

## 寫作 agent 檢查清單

- [ ] 不讀聊天紀錄也能執行本版
- [ ] 已定案每條都是完整句子／完整決定
- [ ] 非目標與範圍膨脹項已寫出或鏈到 backlog
- [ ] 驗收可客觀判斷（含該版測試或手驗）
- [ ] 錨點路徑正確，且都在 **本倉庫**
- [ ] 非顯設計取捨 → 已有 reasoning（或 INDEX 內等長 WHY）
- [ ] 無「待拍板」殘留（否則仍為 planned）
- [ ] **無真實助記詞、私鑰、密碼、個人地址**
- [ ] 沒有把 `brainstorm/` 或 Solibra 原始碼當成已定案

---

## 實作完成時

- 勾驗收；狀態改 `shipped`（僅在驗收與該版測試通過、且使用者同意出貨時）
- 更新文末約定的 version／changelog
- **清 backlog**
- 若改了訊息、storage、custody、Wallet Standard 能力表：同步該版 INDEX 點名的契約檔；契約檔尚不存在時，由該版建立並在 INDEX 寫路徑

---

## 本專案補充

Airwave Wallet 是重做中的 **Solana Chrome 擴充錢包**。倉庫目前幾乎只有 brainstorm 與本 roadmap；**沒有**可執行的擴充、**沒有**已選定的測試指令、**沒有** `package.json`。

### 背景，不是契約

| 路徑 | 角色 |
|------|------|
| `wallet/` | Chrome extension 子專案（產品碼主戰場） |
| `test-web/` | 最小測試用 Solana dApp |
| `brainstorm/full-picture.md` | 整盤構想與三步 roadmap。寫版本時可引用，不可代替 INDEX |
| `brainstorm/lessons-from-solibra-wallet.md` | 架構教訓與 Do / Don't。寫版本時可引用，不可代替 INDEX |
| `brainstorm/solibra-feature-summary.md` | 舊產品做了什麼。用來決定繼承意圖或明確不做 |
| `brainstorm/remake-feature-wishlist.md` | 功能意向。排進某版後以該版 INDEX 為準 |
| `brainstorm/research/extension-message-flow.html` | 多 runtime 訊息流圖 |
| `../solibra-wallet` | 已失敗的舊碼，**另一個 git 倉庫**。本專案版本不得改它，除非該版 INDEX 寫明要讀哪幾個檔當對照 |

### 架構禁區（INDEX 未明確推翻前一律有效）

違反下列而當主路徑，設計審查記 **HIGH**：

1. **Pending 權威是 service worker。** UI 不從持久 store hydrate 來「找自己的請求」。Popout 只帶 `requestId`，向 SW 取 payload、回 approve／reject。
2. **結果只回發起的 tab／frame。** 預設禁止廣播全部 tab。
3. **持久配置的真相是 `chrome.storage`。** 各 runtime 的 Zustand 只是本地鏡像，靠 `chrome.storage.onChanged` 更新。禁止把 `syncStoreAcrossRuntime`／手寫 `rehydrate` 當主同步。
4. **Pending 不是持久 shared store。** 不要把待審批請求寫進會跨 runtime persist 的 Zustand。
5. **Custody：** 不硬編碼密碼；不明文密碼當長期 persist 欄位；解鎖後的金鑰材料只活在記憶體或嚴格的 session；inject **不**持有或解密長期私鑰。簽名發生在擴充 UI，不在 page script。
6. **能力表與實作一致。** 做不到的 Wallet Standard 方法不要宣告支援。
7. **信任根不是 `postMessage` 的 `from` 欄。** Content 要核對 origin。

INDEX 可以收窄範圍（例如本版不做簽名），不可以悄悄改用 Solibra 的 storage hydrate、全 tab 廣播、或硬編碼密碼來「先跑起來」。要推翻某條禁區，必須寫進該版已定案並說明取代模型。

### 出貨檔案

| 項目 | 約定 |
|------|------|
| Changelog | 倉庫根 `CHANGELOG.md`（尚不存在；第一個 `shipped` 版建立） |
| 版本號 | 與該版目錄 `X.Y.Z` 一致。擴充 `package.json` 出現後，`version` 欄與 changelog 對齊 |
| 契約 | 尚無全域 `docs/api.md`。訊息表、storage schema、custody、Wallet Standard 能力表由**引入它們的那一版**放在該版 `docs/` 或 INDEX 指定的倉庫路徑。之後的版本必須連結並摘要，不可假設讀者讀過舊 chat |
| 測試 | **尚無整包指令。** 某版引入測試 runner 時，在該版已定案寫明指令（含 cwd），並回寫本表。在那之前，每個 Track 的驗收以該版 INDEX 的手驗／窄測為準，禁止假設 `bun test` 或 Engram 的 phase 測試 |
| 實作範圍 | 只改 `airwave-wallet` 倉庫。不要改 `../solibra-wallet`、不要改上層 `docs/agent-roadmap/` |
| UI 驗收 | Popup、popout、注入頁有行為改動時，用未封裝擴充把該版驗收點走一遍。靜態截圖不算通過 |

### 第一天就要對、不能「之後再補」的三件事

就算某版只做垂直切片（例如只做 connect），仍須讓 **請求生命週期、持久 state 同步、custody** 符合上面的禁區。可以不做助記詞、首頁資產、simulation、legacy `window.solana`；不可以先用硬編碼密碼或 operation store hydrate 充當骨架。
