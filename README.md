# Airwave Wallet

Solana **Chrome Extension** 錢包（重做）。  
吸取舊專案 Solibra 的教訓，先做穩最小可用錢包；中長期在**碰不到私鑰**的隔離環境提供交易／合約**解讀**（query-only agent），不代簽、不持鑰。

| 狀態 | 說明 |
|------|------|
| 目前版本號 | 見 [`version.md`](version.md) |
| Changelog | [`changelog.md`](changelog.md) |
| 方向文件 | [`brainstorm/full-picture.md`](brainstorm/full-picture.md) |
| 版本契約 | [`docs/roadmap/`](docs/roadmap/) |

---

## 倉庫結構

```text
airwave-wallet/
├── wallet/           # Chrome extension 子專案（錢包本體）
├── test-web/         # 最小 Solana web3 dApp，供錢包手測／回歸
├── brainstorm/       # 重做前研究與意向（非某版契約）
├── docs/roadmap/     # 按版本號的實作契約（INDEX / Track / 驗收）
├── AGENTS.md         # 給 coding agent 的倉庫指引
├── version.md
└── changelog.md
```

之後可能新增例如 `agent-harness/`：可在瀏覽器／extension 限制環境執行的 minimal agent library（見 full-picture 三步 roadmap）。

**舊碼對照（唯讀）：** 同層目錄 `../solibra-wallet` 為已失敗專案，本倉庫版本流程預設不修改它。

---

## 產品路線（摘要）

1. **Minimal wallet MVP** — 訊息流、password-boxed vault、帳戶、RPC settings、Wallet Standard、簽消息／批准交易；用 `test-web` 驗證。  
2. **Agent harness library** — 無 local files／shell 的 JS harness（storage blocks、loop、少量 tools、MCP client）。  
3. **Isolated agent in wallet** — sandbox 內跑 harness；只做解讀類 query；不依賴「背景永遠活著」，靠固定 system prompt 重載上下文。

功能意向清單：[`brainstorm/remake-feature-wishlist.md`](brainstorm/remake-feature-wishlist.md)。

---

## 設計原則（摘要）

- Service worker 作為 pending 請求權威；結果只回發起的 tab。  
- `chrome.storage` + `onChanged` 同步持久設定；不用手寫 hydrate 當主同步。  
- 私鑰以使用者密碼加密後再存；真解鎖／鎖定生命週期。  
- 擴充本體壓低第三方依賴。  
- 訊息通道保持簡單——不做 Solibra 那套 per-request RSA 加解密。  
- Agent（若有）永遠不碰 vault。

完整教訓：[`brainstorm/lessons-from-solibra-wallet.md`](brainstorm/lessons-from-solibra-wallet.md)。

---

## 開發

目前版本契約：[docs/roadmap/0.1.0/INDEX.md](docs/roadmap/0.1.0/INDEX.md)。

```bash
cd wallet && npm install && npm run build
# Chrome → 擴充功能 → 開發人員模式 → 載入未封裝 → 選 wallet/dist
# popup：設密碼（至少 8 字）並建立帳戶，保持解鎖

cd test-web && npm install && npm run dev
# 開 http://localhost:5173 → Connect / Sign message / Sign transaction
```

細節見 [`wallet/README.md`](wallet/README.md)、[`test-web/README.md`](test-web/README.md)。

---

## 文件地圖

| 文件 | 給誰 | 內容 |
|------|------|------|
| [AGENTS.md](AGENTS.md) | Coding agents | 語言、路徑、架構禁區、roadmap 技能 |
| [brainstorm/full-picture.md](brainstorm/full-picture.md) | 人／agent | 整盤構想 |
| [brainstorm/remake-feature-wishlist.md](brainstorm/remake-feature-wishlist.md) | 人／agent | 功能 wishlist |
| [brainstorm/solibra-feature-summary.md](brainstorm/solibra-feature-summary.md) | 人／agent | Legacy 做過什麼 |
| [docs/roadmap/README.md](docs/roadmap/README.md) | 人／agent | 版本契約怎麼用 |
| [docs/roadmap/GUIDELINES.md](docs/roadmap/GUIDELINES.md) | 寫 roadmap 的人／agent | 自足契約與禁區 |
| [docs/roadmap/agent-workflow.md](docs/roadmap/agent-workflow.md) | Agent | 設計審查閘門 → Track 實作 |

排程實作某版本時：以該版 `docs/roadmap/X.Y.Z/INDEX.md` 為準，不要只憑 chat 記憶開工。

---

## License

（尚未定案時於此處補上。）
