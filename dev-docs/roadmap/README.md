# Airwave Wallet roadmap

本目錄是 **airwave-wallet** 的版本契約。另一個沒有對話紀錄的 agent 只靠這裡開工。

| 檔 | 回答 |
|----|------|
| [GUIDELINES.md](./GUIDELINES.md) | Roadmap 怎麼寫才自足；本專案路徑、架構禁區、隱私 |
| [../DOMAIN.md](../DOMAIN.md) | 領域用語：儲存帳戶／簽名／觀察／聚合／地址／主地址 |
| [../design-principles.md](../design-principles.md) | Popup UI／UX 原則（寫入時機、icon 按鈕、長字串）；INDEX 沉默時依此 |
| [../design-demos/](../design-demos/) | 非正式 HTML 概念稿；衝突時以某版 INDEX 為準 |
| [agent-workflow.md](./agent-workflow.md) | 誰審查、何時 HANDOFF、Track 之間測什麼 |
| `.agents/skills/roadmap-version/` | 使用者點名某版時，設計審查閘門 → Track 實作的執行技能 |

| 版本 | 狀態 | 說明 |
|------|------|------|
| [0.1.0](./0.1.0/INDEX.md) | shipped | Minimal wallet MVP + test-web |
| [0.2.0](./0.2.0/INDEX.md) | shipped | 帳戶生命週期 + 首頁資產 + disconnect |
| [0.3.0](./0.3.0/INDEX.md) | shipped | Popup 方案 A（UI）；持倉仍 RPC；USD「—」 |
| [0.4.0](./0.4.0/INDEX.md) | shipped | Helius DAS 持倉（名稱／icon／底價）+ Tokens v2 勾／score／覆寫 USD |
| [0.5.0](./0.5.0/INDEX.md) | shipped | Combined wallet account |
| [0.6.0](./0.6.0/INDEX.md) | shipped | 助記詞匯入；產生 12 詞新錢包／Burner |
| [0.7.0](./0.7.0/INDEX.md) | shipped | Home：Wallet Balances／RPC+Token-2022；Jupiter 覆寫名稱 |
| [0.8.0](./0.8.0/INDEX.md) | shipped | 變更錢包密碼；Settings 樞紐；類 B 密碼欄 |
| [0.9.0](./0.9.0/INDEX.md) | shipped | `signMessage` 可讀審批頁；鎖定於 popout 解鎖；文字欄 accent focus |
| [0.10.0](./0.10.0/INDEX.md) | shipped | `signTransaction` 審批：模擬預期變動主舞台＋收合交易明細（0.10.1：sim 改用 pre／post 餘額，無 pre-fetch） |
| [0.11.0](./0.11.0/INDEX.md) | shipped | 未簽可寫 CU；交易費卡；Default CU price；明細 accounts／data hex |
| [0.12.0](./0.12.0/INDEX.md) | shipped | 代幣詳情；單一可簽送出；既有審批後錢包送到 confirmed |
| [0.13.0](./0.13.0/INDEX.md) | shipped | 共用審批殼；walletSend→popup 內；pending confirm→confirmed；網站仍 popout |
| [0.14.0](./0.14.0/INDEX.md) | shipped | 原始碼目錄化；wallet-handlers 與審批純函式分檔；行為與 0.13.0 相同 |
| [0.15.0](./0.15.0/INDEX.md) | shipped | Popup 改 Vite React；審批殼仍 vanilla 橋接；行為與 0.14.0 相同 |
| [0.16.0](./0.16.0/INDEX.md) | shipped | Popup React 收斂：廢止 session／全樹 tick；行為與 0.15.0 相同 |
| [0.17.0](./0.17.0/INDEX.md) | shipped | Wallet Standard `solana:signAndSendTransaction`；popout 確認中→已確認 1s |
| [0.18.0](./0.18.0/INDEX.md) | shipped | Home Activity：最近 20 筆；列尾開 Solscan |
| [0.19.0](./0.19.0/INDEX.md) | shipped | 簽署明細靜態解讀；預期變動開 Explorer Inspector |
| [0.20.0](./0.20.0/INDEX.md) | shipped | 全轉 `@solana/kit`；行為與 0.19.0 相同 |
| [0.21.0](./0.21.0/INDEX.md) | shipped | 清理空 token account，收回 rent SOL |
| [0.22.0](./0.22.0/INDEX.md) | shipped | Home pill／Devnet 徽章／複製回饋／刷新冷卻／Activity Orb／收回租金確認中／Kit 估 CU |
| [0.23.0](./0.23.0/INDEX.md) | shipped | Wallet UI 多語言（繁中／簡中／英文）＋系統雙字體（方案 B） |
| [0.24.0](./0.24.0/INDEX.md) | in progress | 原始檔職責分檔（命令／模擬／收回租金）；行為與 0.23.0 相同 |
| [0.25.0](./0.25.0/INDEX.md) | shipped | 工具列 popup 與 Chrome 側欄互切；側欄活著則網站審批進殼內 |
| [0.26.0](./0.26.0/INDEX.md) | shipped | 小修：匯入預覽、Combined 展開、解鎖聚焦、類型圖示、卡片拖曳、schema 世代骨架 |
| [0.27.0](./0.27.0/INDEX.md) | shipped | 保管與簽名邊界：session 不含明文 secret、本地 CU、dApp origin／chain／連線 |
| [0.28.0](./0.28.0/INDEX.md) | shipped | Home Activity：捲到底載入更舊紀錄、本地時間、token icon／symbol |
| [0.29.0](./0.29.0/INDEX.md) | shipped | Mainnet RPC 必填；官方公用節點不當後備；首次語言／密碼／RPC 引導 |
| [0.30.0](./0.30.0/INDEX.md) | planned | 簽署 AI 分析：sandbox harness、Decisions 等級、Settings OpenRouter |
| [0.31.0](./0.31.0/INDEX.md) | shipped | Vite 8／plugin-react 5／TypeScript 7；service worker 監聽不在擴充頁執行 |
| [0.32.0](./0.32.0/INDEX.md) | shipped | 審批模擬用交易 blockhash；每 3 秒只更新預期變動；交易費本地計算；站點置中可複製；AI 單列卡與逾時 UX |
| [0.33.0](./0.33.0/INDEX.md) | shipped | 預期變動列：Jupiter 圖示／symbol；固定信任盾欄；anti-spoof 主標規則 |
| [0.34.0](./0.34.0/INDEX.md) | shipped | 簽署 AI：preflight 進 prompt；OpenRouter 僅移除 decode／simulate；保留 get_accounts 等；AI 不理會審批 blockhash 失效 |
| [0.35.0](./0.35.0/INDEX.md) | shipped | 視窗標題與 `html lang` 跟 Settings 語言對齊；標題單一語文、無 `Airwave — ` 前綴 |
| [0.36.0](./0.36.0/INDEX.md) | shipped | 簽署 CU：dApp 已設 limit／price 不自動改寫；套用 CU 才送 simulate payload |
| [0.37.0](./0.37.0/INDEX.md) | shipped | 安全修復：在途 requestId 不可換包；離開 origin 的分頁不再收公鑰 |

**版本號：** `x.y.z` 的 **patch**（例如 **0.3.1**）留給該 minor 的 **bugfix**，不排新功能。新功能走下一個 **minor**（0.3.0 → 0.4.0 → 0.5.0）。

構想清單見 [backlog/INDEX.md](./backlog/INDEX.md)。排進某版後與該版 INDEX 雙向連結。INDEX 沉默時，遵守 [GUIDELINES.md](./GUIDELINES.md) 的架構禁區。
