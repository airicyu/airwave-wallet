# Airwave — Full Picture（產品與架構總覽）

> 把目前已對齊的「整盤想法」寫在同一處，方便之後切 roadmap／版本時對照。  
> 這是 **方向文件**，不是實作規格定稿。  
>
> 相關：
> - [../README.md](../README.md) / [../AGENTS.md](../AGENTS.md) — 倉庫說明與 agent 指引  
> - [remake-feature-wishlist.md](./remake-feature-wishlist.md) — 錢包功能意向清單  
> - [lessons-from-solibra-wallet.md](./lessons-from-solibra-wallet.md) — Solibra 教訓  
> - [solibra-feature-summary.md](./solibra-feature-summary.md) — Legacy 功能梳理  
> - [research/extension-message-flow.html](./research/extension-message-flow.html) — 多 runtime 訊息流  

---

## 0. 倉庫結構（意向）

```text
airwave-wallet/
├── wallet/        # Chrome extension（錢包本體）
├── test-web/      # 最小 Solana dApp，測連線／簽名
├── brainstorm/    # 本檔等方向文件（非版本契約）
└── docs/roadmap/  # 按 X.Y.Z 的實作契約
```

之後可選：`agent-harness/`（roadmap ② 的 JS library）。  
舊專案對照：`../solibra-wallet`（唯讀，預設不改）。

---

## 1. 我們在做什麼

**Airwave Wallet**：Solana Chrome Extension 錢包（重做，吸取 Solibra 教訓）。

中長期差異點不只是「又能簽交易」，而是：

> 在**碰不到私鑰**的隔離環境裡，跑一層 **minimal agent harness**（可接 OpenRouter、Solana 相關 MCP），  
> 只對錢包提供 **query 服務**——例如交易解讀、smart contract／程式說明——**不持鑰、不代簽、不碰 vault**。

錢包本體先做穩；agent 是旁路能力，不是第一天阻塞 MVP 的依賴。

---

## 2. 三步 Roadmap（順序固定）

```text
① Minimal wallet MVP extension
        ↓
② Minimal agent harness（JS library，能在 extension 限制環境跑）
        ↓
③ 錢包內掛上 isolated agent runtime（query-only → 解讀類能力）
```

### ① Minimal wallet MVP

先做出「能用的最小錢包」，對齊 wishlist 的核心垂直切片，例如：

- 多 runtime **message flow**（SW = pending hub；訊息簡單，**不做** Solibra 式 RSA 結果加密）
- **Secure storage + settings** 層
- **Password-boxed** 私鑰 vault（真密碼解鎖；禁止 hardcode 當安全）
- 帳戶：生成／匯入私鑰／read-only／切換／重新命名／刪除（可分期）
- Cluster & RPC settings（且真正驅動 Connection）
- Popup（+ 之後 Sidebar）
- Wallet Standard 註冊
- Sign message / Approve transaction

細節與約束見 [remake-feature-wishlist.md](./remake-feature-wishlist.md)。

**原則：** 擴充本體壓低 3rd-party；信任靠分層與協定，不靠訊息層加解密劇場。

### ② Minimal agent harness（獨立 JS library）

目標環境：**Chrome extension / 瀏覽器 JS**，不是桌面 Agent。

| 沒有 | 用什麼代替 |
|------|------------|
| 任意 local files / shell / child_process | 不提供這類 tool |
| 桌面 MCP stdio（`npx …`） | MCP **HTTP／SSE／gateway**（遠端或自建） |
| 長駐 OS 進程 | 按次啟動；context 靠應用層重載（見 §5） |

Library 能力意向：

- **Agent harness loop**（組 prompt → call model → tool → 再 loop）
- **Named storage blocks**：在無 filesystem 下模擬可讀寫的具名資料塊（底層可接 host 注入的 storage API，而非 sandbox 直摸 `chrome.storage`）
- **Minimal tools 示例：** web search、read/write block、grep/search block content
- **可 call MCP**（client 介面；傳輸適合瀏覽器）
- Wrap **OpenRouter**（或同等 HTTP chat API）當 model backend

定位：瘦、可嵌入 sandbox；**不是**把 Cursor／Claude Code 整包搬进 SW。

### ③ Wallet 內的 isolated agent（query-only）

在 Airwave extension 裡放一個**架構上隔離**的 runtime：

- 跑 ② 的 harness
- Wrap OpenRouter agent
- 可經 host 允許的通道 call Solana 相關 MCP／RPC 工具
- 對錢包只提供例如：
  - Transaction 解讀
  - Smart contract／program 說明
- **Query service only：零 vault、零私鑰、零代簽**

與 MVP 錢包的關係：UI／審批流可「呼叫解讀」；解讀結果僅供展示，**批准簽名仍只走錢包 core**。

---

## 3. 安全與隔離模型（Full Picture）

### 3.1 同擴充內的真相

同一 Chrome extension **不是** OS 級進程隔離。  
若 agent 腳本也能呼叫 `chrome.storage`，供應鏈下毒時仍可能摸 vault。

因此「完全碰不到 private keys」必須做成 **API 面就不存在**，不是靠約定「別讀那個 key」。

### 3.2 目標分層

```text
[ dApp 頁面 ]
     ↕ Wallet Standard / 簡單訊息
[ inject / content ]
     ↕
[ background.js = Wallet Core ]
     │  • password-boxed vault（chrome.storage）
     │  • pending sign/connect hub
     │  • 唯一可觸發簽名的路徑
     │
     ├─► popup / side panel（錢包 UI）
     │
     └─►（可選）offscreen.html 當宿主
              └─► sandbox.html（manifest sandbox）
                       • 無 chrome.* 
                       • 跑 agent harness
                       • 只能窄 RPC
```

| 區塊 | 職責 | 可否碰私鑰 |
|------|------|------------|
| Wallet Core（SW） | 託管、簽名、pending、settings 真相 | ✅ 唯一 |
| Popup / Sidebar | 帳戶 UI、審批 UI、觸發「請解讀」 | ❌ 解鎖後簽名仍經 core |
| Sandbox agent | harness + 解讀推理 | ❌ 永遠不行 |
| Bridge（offscreen 或 core 內代理） | 驗訊息、代打 LLM/MCP、實作 allowlisted tools | ❌ 不讀 vault；可讀公開／agent 命名空間 |

### 3.3 窄 RPC（不要通用 `storage.get(key)`）

允許的形態示例：

- `analyzeTransaction({ txBytes, cluster })`
- `explainProgram({ programId })`
- `agentBlock.read/write/grep(name, …)` — 僅 `agent.*` 資料，由 **host** 執行
- `llm.chat(messages)` / `mcp.call(server, tool, args)` — 由 **host 代打**，API key 不進 sandbox

禁止的形態：

- sandbox 直接 `chrome.storage`
- `fetchAllowedData('vault' | lockKey | …)` 這類「按 key 名讀私貨」的 API
- 訊息層對每筆結果再搞 RSA 加解密（Solibra 教訓）

### 3.4 Sandbox 仍可能有 `fetch`

隔離的是 **extension 特權與 vault**，不是「資料絕不會出網」。  
送進 sandbox 的 tx／對話若被惡意 bundle 外傳，仍屬威脅。緩解：

- LLM／MCP **host 代打**；key 留在 core／受控 bridge  
- 進 sandbox 的 payload 最小化  
- 產品文案與權限：解讀服務會把交易內容送去模型供應商（使用者知情）

---

## 4. Offscreen + Sandbox：要不要 Long-living？

### 4.1 可採用的骨架

Manifest V3 可用：

- `offscreen` 文件承載 DOM + 嵌入 `sandbox.html`
- `manifest.sandbox.pages` 讓 agent 頁面 **沒有** `chrome.*`

這適合當 **隔離殼**，不必綁死「永遠常駐」。

### 4.2 決策：不依賴 Long-living lifecycle

**可以不要 long-living。** 對解讀型、query-only agent：

- 用戶觸發（或審批頁打開）→ 建立／喚醒 runtime → 跑完 → 可拆掉  
- SW 被殺、offscreen 被回收都可接受  

Chrome 也不保證 offscreen 永生；用假 reason 硬撐常駐還可能審核踩雷。  
**不把產品正確性建立在「背景永遠活著」。**

### 4.3 改靠應用層 Context（與模型側 cache）

| 層 | 做法 |
|----|------|
| **應用層** | 固定 **base / system prompt**（角色、安全規則、輸出格式、Solana 約定）；每次啟動或每次解讀任務重新 load 同一套 |
| **Session（可選）** | 同一筆 tx 的短多輪對話存 `agent` storage block，下次拼在變動段 |
| **Model／供應商** | 前綴定死，利於 provider **prompt／KV cache**（OpenRouter 背後視模型而定） |

注意：

- Extension 重開後 **本機沒有**上一次 KV；cache 在 **模型服務端**（若該模型支援）  
- 前綴盡量少改（空白、改版文案都會影響命中）  
- Cache 是延遲／成本優化，**不是**正確性前提  

結論：

> **進程可以短命；上下文連續靠固定 system prompt + 按需 load 的 session／任務資料。**

---

## 5. 端到端故事（用戶視角）

1. 安裝 Airwave，設密碼，生成／匯入帳戶，選 RPC。  
2. dApp 經 Wallet Standard 連接；簽消息／簽交易走 popout／sidebar 審批（core 持鑰）。  
3. 審批 UI（或首頁工具）可點「解讀這筆交易」：  
   - Core 把 **tx bytes 等公開資料** 交給 agent 橋  
   - Sandbox 跑 harness（固定 system prompt + 本輪 tx）  
   - Host 代打 OpenRouter／允許的 MCP  
   - 回傳解讀文字／結構給 UI  
4. 使用者仍自己按批准／拒絕；agent **不能**替用户簽名。

---

## 6. 依賴與程式邊界（意向）

| 套件／模組 | 放哪 | 備註 |
|------------|------|------|
| 錢包 core + UI | `airwave-wallet` extension | 少依賴 |
| Agent harness | **獨立 JS library**（可 monorepo package） | 先在普通頁／sandbox 驗證再嵌入 |
| Solana web3／Wallet Standard | 錢包（與必要的解碼側） | 官方／準官方優先 |
| OpenRouter SDK／fetch 薄封裝 | Host bridge；sandbox 只發 tool 請求 | Key 不進 sandbox |
| 大型 agent 框架／桌面 MCP runtime | ❌ 預設不進擴充 | |

---

## 7. 刻意不做／延後（避免 scope 爆炸）

- 第一天就上完整通用 Agent 聊天產品  
- 桌面級 filesystem／shell tools  
- Agent 代管私鑰或 auto-approve 交易  
- 依賴 Offscreen 永不死當架構前提  
- 訊息通道 RSA 加密封裝（Solibra）  
- 助記詞 HD、硬體錢包、法幣、內建 Swap（等錢包 MVP 穩了再議）  

---

## 8. 成功標準（對齊「整盤是否跑通」）

**Phase ① 成功：**  
手動能：建帳戶（密碼盒）→ 連 dApp → 簽消息／批准交易；storage／訊息流不靠 hydrate 碰運氣。

**Phase ② 成功：**  
同一套 harness 在「無 filesystem」的 JS 環境跑通 loop + storage blocks + 至少一個外部 tool + 可選 MCP client。

**Phase ③ 成功：**  
在擴充內：sandbox 內 agent **證實無法**讀 vault；對一筆真實 tx 回傳可用解讀；簽名路徑仍僅 core。

---

## 9. 一句話全集

> **先做一個夠瘦、夠安全的 Solana 擴充錢包；再做能在瀏覽器限制裡跑的 agent harness；最後把 agent 關在無 `chrome.*` 的 sandbox，只做解讀類 query——context 靠固定 prompt 重載，不靠背景長生，更不靠碰私鑰。**

切版本時：從本檔抽 Phase，功能細節對 wishlist，坑對 lessons，訊息形狀對 message-flow research。
