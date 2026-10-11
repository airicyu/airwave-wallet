# Handoff：bubble-harness 要修什麼（給實作 agent）

日期：2026-10-10  
背景：Airwave `test-web/sign-risk.html` 已用 vendored `bubble-harness` 跑多輪 tool loop（見 [`bubble-harness-runtime.md`](./bubble-harness-runtime.md)）。POC 在 host 端做了若干 workaround；**下列項目應修回 bubble-harness 本體**，修完後再 `bun run build` 並 copy 進 `airwave-wallet/test-web/vendor/`。

倉庫：[`airicyu/bubble-harness`](https://github.com/airicyu/bubble-harness)（本機通常並排於 `../bubble-harness`）。

---

## 職責分界（先讀這個）

| 層 | 負責 | 不負責 |
|----|------|--------|
| **bubble-harness** | tool loop、OpenRouter／provider 適配、可見 `content` 正規化、結束條件語意清楚 | 產品報告格式（繁中四段、等級用詞）、Solana decode／RPC、domain prompt |
| **host（sign-risk／之後錢包）** | host tools、system prompt、報告格式、是否 nudge rewrite | 重寫 OpenRouter raw 解析（應吃 harness 修好的 `CallModelFn`） |

**不要**在 harness 裡硬編碼「等級：低|留意|高」或繁中報告模板。  
**要**在 harness 保證：loop 結束時宿主能拿到「最後一則無 tool_calls 的可見文字」，且 provider 怪癖不讓 `completed` 變成空白。

---

## 已觀測的失敗模式（POC 實測）

### A. `stopReason=completed` 但最終 `content` 空白

- 模型：OpenRouter `~deepseek/deepseek-pro-latest`（及其他 reasoning 路線）
- 現象：多輪 tool 後最後一輪無 `tool_calls` → harness 標 `completed`，但 `message.content` 為 `null` / `""`
- 常見根因：可見文字在 `reasoning_content`（或 content-part 陣列），vendor `createOpenRouterCallModel` **只讀** `raw.content`（見目前 `test-web/vendor/bubble-harness.js` 的 openrouter 段）
- POC workaround：`test-web/src/sign-risk-harness.ts` 的 `createOpenRouterCallModelCompat`（應 upstream 後刪掉）

### B. 最後一則「無 tool_calls」的 content 其實是英文思考過程

- 現象：content 很長、英文 CoT（Hmm / Wait / Anyway…），寫到一半被 `max_tokens` 截斷；**不是**宿主要的最終報告
- 這是**模型＋prompt**問題，**不是** harness 必修項
- Host 可自行 nudge／格式檢查；harness **可選**只提供 hook（見下方「可選 API」），不要在 harness 做語言／格式裁判

### C. Host 取最終文字取錯

- 錯誤：`messages` 從後往前找「有 content 的 assistant」→ 會拿到**帶 tool_calls** 那輪的 `"I'll start by decoding…"`
- 正確：只取 **沒有 `tool_calls`** 的最後一則 assistant content
- POC 已在 host 修正；harness 若提供 `result.finalText` helper 更佳（見下方）

### D. DeepSeek／OpenRouter reasoning 重放（相關、若碰到再修）

- 工具輪後再請求時，部分路線要求保留／禁止空的 `reasoning_content`
- 參考社群：空字串 `reasoning_content: ""` 重放可能 400／500；有內容時 tool 輪可能必須回傳
- 若本倉庫的 OpenRouter adapter 會原樣重送 messages，請一併做 sanitize／preserve 策略（與 A 分開測）

---

## 請在 bubble-harness 做的事（必做）

### 1. OpenRouter `CallModelFn`：可見 content 正規化

在 `createOpenRouterCallModel`（或同等 adapter）解析 `choices[0].message` 時：

1. 若 `content` 為 string 且 trim 非空 → 用它  
2. 若 `content` 為 content-part 陣列 → 拼接 text／content 欄位  
3. 若仍空 → fallback：`reasoning_content`、`reasoning`（同樣 coerce）  
4. 回傳給 loop 的 `AssistantMessage.content` 必須是「宿主可顯示的字串或 null」，不要默默丟掉 reasoning 裡唯一的可見文字

單元測試建議：

- `content: null` + `reasoning_content: "hello"` → message.content === `"hello"`
- `content: [{ type: "text", text: "a" }, …]` → 拼接
- `content: "  "` + 無 reasoning → null／空，由 loop 政策處理

### 2. Loop 結束語意：空白 final

當某一輪 **沒有** `tool_calls`：

- 若正規化後 content **非空** → `stopReason: "completed"`（現況）
- 若 content **空** → 不要假裝成功結束。擇一（建議都支援，預設保守）：

**建議 API（擇一或組合）：**

```ts
type RunAgentLoopOptions = {
  // ...
  /** 無 tool_calls 且 content 空時：再呼叫一次模型（tools 可清空或保留），並附一段固定 user nudge（由宿主傳）。預設 false。 */
  retryEmptyFinal?: boolean;
  /** retry 時附加的 user 訊息；僅 host 提供文案 */
  emptyFinalUserMessage?: string;
  /** 不 retry 時的 stopReason，避免與真正完成混淆 */
  // stopReason: "completed" | "max_steps" | "empty_final"
};
```

驗收：

- DeepSeek 若把答案只放在 reasoning：經 (1) 正規化後應直接 `completed` + 有 finalText，不必靠 retry  
- 若兩邊都空：`stopReason === "empty_final"`（或 retry 一次後仍空）

### 3. 結果方便宿主取用

`RunAgentLoopResult` 建議增加：

```ts
{
  messages: ChatMessage[];
  steps: number;
  stopReason: "completed" | "max_steps" | "empty_final";
  /** 最後一則「無 tool_calls」的 assistant content（已 trim）；沒有則 "" */
  finalText: string;
}
```

`finalText` 規則與 POC `lastAssistantText` 相同：跳過有 `tool_calls` 的 assistant。

### 4.（可選）Event

- `done` 事件帶上 `finalText` / `stopReason`  
- 若有 empty-final retry，可 emit 額外 `step` 或 `nudge` 事件，方便 POC 軌跡顯示

---

## 不要在 bubble-harness 做的事

- 繁中報告格式檢查、`等級：…` 正則、禁止 Hmm／Wait  
- Solana／decode／RPC／LABELED DEX  
- 自動 rewrite 成產品文案（那是 host nudge + prompt）

Host 側 POC 已有／可保留：

- `CONTEXT` 與 user hint（報告格式）  
- `looksLikeFinalReport` + 不合格時再催一輪（產品層）  
- host tools：`decode_message` / `get_accounts` / `simulate` / `rpc_get_*`

---

## POC 對照（修完後應刪掉的 workaround）

檔案：`airwave-wallet/test-web/src/sign-risk-harness.ts`

| POC 現況 | Upstream 後 |
|----------|-------------|
| `createOpenRouterCallModelCompat` | 改回用 harness 的 `createOpenRouterCallModel` |
| 自行算 `finalText` / empty nudge | 改用 `result.finalText` + `retryEmptyFinal`／`empty_final` |
| `looksLikeFinalReport` rewrite | **保留在 host**（產品格式） |

更新 vendor：

```bash
cd ../bubble-harness
bun run build
# copy dist/bubble-harness.js (+ .d.ts 若有) → airwave-wallet/test-web/vendor/
```

說明見 `airwave-wallet/test-web/vendor/README.md`。

---

## 建議驗收（在 bubble-harness 倉庫）

1. Unit：OpenRouter parser 對 reasoning／content-parts 的 normalize  
2. Unit：`finalText` 忽略帶 `tool_calls` 的 assistant content  
3. Unit／integration：無 tool_calls + 空 content → `empty_final` 或 retry 行為符合選項  
4. 手動：用 Airwave sign-risk + DeepSeek Pro 跑一筆本地樣本與一筆 mainnet signature；`completed` 時 UI「模型回覆」不應再出現「無最終報告」純空白（格式跑題仍由 host 管）

---

## 相關路徑

| 路徑 | 用途 |
|------|------|
| `bubble-harness`（外部倉）| 本次修改目標 |
| `airwave-wallet/test-web/vendor/bubble-harness.js` | vendored 產物 |
| `airwave-wallet/test-web/src/sign-risk-harness.ts` | POC host loop／workaround |
| `airwave-wallet/test-web/src/sign-risk-decode.ts` | CONTEXT／flags（host） |
| `airwave-wallet/roadmap/backlog/bubble-harness-runtime.md` | 產品構想（非契約） |
