# Airwave Wallet — Agent 指引

本倉庫是 **Airwave**：Solana Chrome Extension 錢包，中長期會加 **無鑰、query-only** 的隔離 agent 解讀能力。

功能意向：[`dev-docs/roadmap/backlog/INDEX.md`](dev-docs/roadmap/backlog/INDEX.md)。

---

## 倉庫結構（意向）

| 路徑 | 角色 |
|------|------|
| [`wallet/`](wallet/) | Chrome extension 子專案（錢包本體） |
| [`test-web/`](test-web/) | 最小 Solana web3 dApp，專供連線／簽名手測與回歸 |
| [`docs/`](docs/README.md) | 用家文件（指南、功能、法律） |
| [`dev-docs/`](dev-docs/README.md) | 工程文件：契約、畫面原則、概念稿、領域用語、本機建置 |
| [`changelog.md`](changelog.md)／[`version.md`](version.md) | 出貨紀錄與目前版本號 |
| 之後可選：`agent-harness/`（或同等 package） | 瀏覽器友善的 minimal agent harness library（roadmap ②） |

**不要改** 上層 `docs/agent-roadmap/`（若存在）。

---

## 開工前讀什麼

| 情境 | 必讀 |
|------|------|
| 實作某個已排程版本 | 該版 `dev-docs/roadmap/X.Y.Z/INDEX.md` 及其連結；遵守 [`dev-docs/roadmap/GUIDELINES.md`](dev-docs/roadmap/GUIDELINES.md)、[`dev-docs/roadmap/agent-workflow.md`](dev-docs/roadmap/agent-workflow.md)；畫面互動另守 [`dev-docs/design-principles.md`](dev-docs/design-principles.md)（INDEX 有明文則以 INDEX 為準） |
| 使用者點名版本／`/roadmap-version` | 技能 [`.agents/skills/roadmap-version/SKILL.md`](.agents/skills/roadmap-version/SKILL.md) |
| Popup 怎麼操作才一致 | [`dev-docs/design-principles.md`](dev-docs/design-principles.md) |
| 帳戶、地址、聚合等用詞 | [`dev-docs/DOMAIN.md`](dev-docs/DOMAIN.md)（該版 INDEX 明文覆寫時以 INDEX 為準，並回寫 DOMAIN） |

**優先級：** 某版 INDEX 已定案 ＞ GUIDELINES 架構禁區 ＞ [`dev-docs/design-principles.md`](dev-docs/design-principles.md)（僅畫面）。

---

## 架構硬規則（INDEX 未明文推翻前一律有效）

細節與寫作規範見 [`dev-docs/roadmap/GUIDELINES.md`](dev-docs/roadmap/GUIDELINES.md)。摘要：

1. **Pending 請求**只活在 service worker（或該版契約指定的 hub）；UI 不靠 `chrome.storage` hydrate「碰運氣找包裹」。
2. **持久 state：** `chrome.storage` 為真相，`onChanged` 更新各 UI 鏡像；禁止手寫 rehydrate 同步總線當主路徑。
3. **Custody：** 使用者密碼加密的 password-boxed vault；禁止硬編碼密碼當安全機制；解鎖金鑰不長期明文 persist。
4. **訊息：** typed command + `requestId`；結果只回發起 tab；禁止預設全 tab 廣播。
5. **不要**對 inject↔extension 每筆 operation result 做 RSA encrypt/decrypt 劇場。
6. **依賴：** 擴充本體壓低 3rd-party；引入依賴須能說明必要理由。
7. **數字：** 金額、餘額、手續費、模擬差額禁止用 JavaScript `number` 做加減乘除。鏈上整數單位（lamport、代幣最小單位）用 `BigInt`，並從字串建成，不可先經 JSON `number`。需要小數時用 `big.js`（尚未安裝；第一次做小數運算再加入），不要改用 `decimal.js`。
8. **Agent（若實作）：** 跑在無 `chrome.*` 的 sandbox（或同等隔離）；query-only；host 代打 LLM/MCP；永遠不碰 vault／不代簽。不依賴 long-living 背景當正確性前提。

就算本版只做垂直切片，**請求生命週期、持久 state 同步、custody** 仍須符合上列，不可用 storage hydrate 或硬編碼密碼「先跑起來」。

---

## 三步產品順序（背景）

```text
① Minimal wallet MVP（wallet + test-web）
② Minimal agent harness library（瀏覽器／extension 限制環境）
③ 錢包內 isolated agent：交易／合約解讀等 query-only
```

未排進某版 INDEX 前，②③ 只是方向，不要擅自開做膨脹 scope。

---

## 工作習慣

- **Do not commit unless the user asks.**
- Roadmap／審查報告**禁止**寫入真實助記詞、私鑰、密碼、生產秘密（見 GUIDELINES 隱私節）。
- 實作範圍只在本倉庫；測試優先用 `test-web/`，勿假設必須改外部 dApp。
- 對話裡談過但沒寫進 roadmap／契約檔的內容，對下一個 agent **等於不存在**——定案要落檔。

---

## 原始檔職責註解

`wallet/src` 底下的 `.ts`：

- **少於 50 行**（以檔案總行數計，含空行）：可以不寫檔首註解。
- **50 行以上**：檔案最頂必須有英文區塊註解（職責說明），最多 **100 words**。
- 之後改到一個已達 50 行、卻還沒有註解的 `.ts`（含只改 import），同一輪必須補上。
- 平常一兩句，寫這個檔負責什麼，以及它不做的相鄰那一步。
- 註解需要描述第二件不同的事時，分檔，不要把註解寫長。
- 禁止用 `related logic`、`etc.`、`and so on` 帶過第二個職責。
- `index.ts` 寫它 re-export 這個資料夾的對外介面（可以含多個子資料夾）。
- 純資料表只寫這是哪一張表。
- 同一輪改動若碰到超過 400 行的 `.ts`、`.tsx` 或 `.css`，必須 review 要不要拆。
- `background/wallet/` 的命令檔：低於 150 行維持一個檔；達到或超過 150 行放進該組資料夾，裡頭把會一起改的函式放在同一個模組。150 行不遞迴。資料夾內模組可以超過 150 行，只要註解仍是一件事且檔案不超過 400 行。禁止把同一職責切成一命令一檔。一個職責只有一個 `handle*` 時，該檔可以只有這一個命令。

---

## 快速連結

| 文件 | 用途 |
|------|------|
| [README.md](README.md) | 專案首頁（給人看） |
| [docs/user-guide.md](docs/user-guide.md) | 用家上手 |
| [docs/features.md](docs/features.md) | 現況功能 |
| [dev-docs/README.md](dev-docs/README.md) | 工程文件地圖 |
| [dev-docs/setup.md](dev-docs/setup.md) | 本機建置 |
| [docs/README.md](docs/README.md) | 用家文件地圖 |
| [dev-docs/design-principles.md](dev-docs/design-principles.md) | Popup／審批畫面 |
| [dev-docs/design-demos/](dev-docs/design-demos/) | HTML 概念稿 |
| [dev-docs/roadmap/README.md](dev-docs/roadmap/README.md) | Roadmap 入口 |
| [dev-docs/DOMAIN.md](dev-docs/DOMAIN.md) | 領域用語（帳戶／地址／聚合） |
| [dev-docs/roadmap/GUIDELINES.md](dev-docs/roadmap/GUIDELINES.md) | 怎麼寫自足版本契約 |
| [dev-docs/roadmap/agent-workflow.md](dev-docs/roadmap/agent-workflow.md) | 審查閘門與 Track 流程 |
