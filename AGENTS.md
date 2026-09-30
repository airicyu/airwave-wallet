**無論使用者用什麼語言說話，agent 一律以繁體中文書面語回應。**  
用書面語；專有名詞、路徑、API、檔名可留英文。

---

# Airwave Wallet — Agent 指引

本倉庫是 **Airwave**：Solana Chrome Extension 錢包重做（吸取 `../solibra-wallet` 教訓），中長期會加 **無鑰、query-only** 的隔離 agent 解讀能力。

整盤構想：[`brainstorm/full-picture.md`](brainstorm/full-picture.md)。  
功能意向：[`brainstorm/remake-feature-wishlist.md`](brainstorm/remake-feature-wishlist.md)。

---

## 倉庫結構（意向）

| 路徑 | 角色 |
|------|------|
| [`wallet/`](wallet/) | Chrome extension 子專案（錢包本體） |
| [`test-web/`](test-web/) | 最小 Solana web3 dApp，專供連線／簽名手測與回歸 |
| [`brainstorm/`](brainstorm/) | 重做前背景與方向；**不是**某版契約 |
| [`docs/roadmap/`](docs/roadmap/) | 版本契約（INDEX／Track／驗收）；跨 agent 開工以這裡為準 |
| [`changelog.md`](changelog.md)／[`version.md`](version.md) | 出貨紀錄與目前版本號 |
| 之後可選：`agent-harness/`（或同等 package） | 瀏覽器友善的 minimal agent harness library（roadmap ②） |

**不要改** `../solibra-wallet`（另一個 git 倉庫），除非某版 `docs/roadmap/X.Y.Z/INDEX.md` 明文要求讀特定檔當對照。  
**不要改** 上層 `docs/agent-roadmap/`（若存在）。

---

## 開工前讀什麼

| 情境 | 必讀 |
|------|------|
| 實作某個已排程版本 | 該版 `docs/roadmap/X.Y.Z/INDEX.md` 及其連結；遵守 [`docs/roadmap/GUIDELINES.md`](docs/roadmap/GUIDELINES.md)、[`docs/roadmap/agent-workflow.md`](docs/roadmap/agent-workflow.md) |
| 使用者點名版本／`/roadmap-version` | 技能 [`.agents/skills/roadmap-version/SKILL.md`](.agents/skills/roadmap-version/SKILL.md) |
| 方向／為何這樣設計 | `brainstorm/full-picture.md`、`lessons-from-solibra-wallet.md` |
| 舊產品做過什麼 | `brainstorm/solibra-feature-summary.md` |

**優先級：** 某版 INDEX 已定案 ＞ GUIDELINES 架構禁區 ＞ brainstorm。  
`brainstorm/` 與 INDEX 衝突時，以 **INDEX** 為準。

---

## 架構硬規則（INDEX 未明文推翻前一律有效）

細節與寫作規範見 [`docs/roadmap/GUIDELINES.md`](docs/roadmap/GUIDELINES.md)。摘要：

1. **Pending 請求**只活在 service worker（或該版契約指定的 hub）；UI 不靠 `chrome.storage` hydrate「碰運氣找包裹」。
2. **持久 state：** `chrome.storage` 為真相，`onChanged` 更新各 UI 鏡像；禁止手寫 rehydrate 同步總線當主路徑。
3. **Custody：** 使用者密碼加密的 password-boxed vault；禁止硬編碼密碼當安全機制；解鎖金鑰不長期明文 persist。
4. **訊息：** typed command + `requestId`；結果只回發起 tab；禁止預設全 tab 廣播。
5. **不要**對 inject↔extension 每筆 operation result 做 Solibra 式 RSA encrypt/decrypt 劇場。
6. **依賴：** 擴充本體壓低 3rd-party；引入依賴須能說明必要理由。
7. **Agent（若實作）：** 跑在無 `chrome.*` 的 sandbox（或同等隔離）；query-only；host 代打 LLM/MCP；永遠不碰 vault／不代簽。不依賴 long-living 背景當正確性前提。

就算本版只做垂直切片，**請求生命週期、持久 state 同步、custody** 仍須符合上列，不可用 Solibra 壞套路「先跑起來」。

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

- **繁體中文**回覆使用者（見文首）。
- **Do not commit unless the user asks.**
- Roadmap／審查報告**禁止**寫入真實助記詞、私鑰、密碼、生產秘密（見 GUIDELINES 隱私節）。
- 實作範圍只在本倉庫；測試優先用 `test-web/`，勿假設必須改外部 dApp。
- 對話裡談過但沒寫進 roadmap／契約檔的內容，對下一個 agent **等於不存在**——定案要落檔。

---

## 快速連結

| 文件 | 用途 |
|------|------|
| [README.md](README.md) | 給人看的專案說明 |
| [brainstorm/full-picture.md](brainstorm/full-picture.md) | 整盤構想 |
| [docs/roadmap/README.md](docs/roadmap/README.md) | Roadmap 入口 |
| [docs/roadmap/GUIDELINES.md](docs/roadmap/GUIDELINES.md) | 怎麼寫自足版本契約 |
| [docs/roadmap/agent-workflow.md](docs/roadmap/agent-workflow.md) | 審查閘門與 Track 流程 |
