# Implementation review — 0.6.0 Airwave Wallet

- **日期：** R1 2026-10-03（Asia/Hong_Kong）
- **輪次：** R1（初審）
- **角色：** 實作審查（不改程式、不加功能、不 commit）
- **對照基準：** [`../INDEX.md`](../INDEX.md) 已定案＋驗收；[`seed-import-how.md`](./seed-import-how.md)；[`reasoning.md`](./reasoning.md)；[`../HANDOFF.md`](../HANDOFF.md)；架構禁區見 [`../../GUIDELINES.md`](../../GUIDELINES.md)
- **現行程式：** working tree（未 commit）；錨點見 INDEX；不以 chat history 為準

---

## 總評

0.6.0 助記詞匯入（SW `previewSeedAccounts`／`importSeedAccount`、`seed-derive`、popup 兩屏）與 INDEX／HOW **靜態對齊良好**；架構禁區（pending 記憶體、vault custody、typed command）未見違反。**`cd wallet && npm run build` 通過**。無未關閉 HIGH。INDEX 驗收 checklist 多項需 **Chrome 手驗**；本輪未載入擴充做端對端。

---

## Findings

### HIGH

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| — | （無） | — | R1 靜態＋建置未發現阻擋出貨之 HIGH | — |

### MEDIUM

| ID | 標題 | 狀態 | 說明 | 建議 |
|----|------|------|------|------|
| M1 | 版本號早於 0.6.0 出貨 | **關閉** | 2026-10-03：INDEX `shipped`、驗收已勾；changelog 已有 0.6.0；`version`／`package.json` 跟隨 0.7.0 出貨。 | — |
| M2 | Working tree 混入非 0.6.0 契約之大改 | **開啟** | 同批 diff 含 [`wallet/src/background/home-tokens-service.ts`](../../../../wallet/src/background/home-tokens-service.ts)、[`wallet/src/shared/home-tokens.ts`](../../../../wallet/src/shared/home-tokens.ts)、[`storage-keys.ts`](../../../../wallet/src/shared/storage-keys.ts) 等（對應未出貨 [`docs/roadmap/0.7.0/`](../../0.7.0/)），非 INDEX 0.6.0 scope。 | 出貨 0.6.0 前釐清是否拆 commit／PR；手驗時一併回歸 Home／持倉以免誤判本版。 |

### LOW

| ID | 標題 | 狀態 | 說明 |
|----|------|------|------|
| L1 | `pagehide` 未顯式清助記詞流程 | **關閉** | R1 後實作：`pagehide` 在 `add-import-seed` 時呼叫 `resetImportSeedFlow()` 並清空 root。 | — |
| L2 | 詞格屏預覽無「讀取中」 | **開啟** | 點「下一步」時 `importSeedBusy` 僅 disabled 殼底鈕；HOW 允許列表「讀取中」，挑帳戶屏有，詞格屏無。非契約硬需求。 | 可選 UX。 |

---

## R1 重點對照（INDEX／HOW／禁區）

| 檢查項 | 結論 | 靜態證據 |
|--------|------|----------|
| 依賴 `@scure/bip39`＋`ed25519-hd-key` | **符合** | [`wallet/package.json`](../../../../wallet/package.json)；[`seed-derive.ts`](../../../../wallet/src/shared/seed-derive.ts) |
| 四 pathKind＋custom 必含 `{n}` | **符合** | `pathTemplate`／`pathForIndex` |
| preview 0–19、並行 4、單列 balance 失敗 `"—"` | **符合** | [`background/index.ts`](../../../../wallet/src/background/index.ts) `mapPool(..., 4)`、`formatSolLabel` |
| `importSeedAccount` 對齊 `importAccount`、不改 active | **符合** | 寫 vault＋`accounts.push`；無 `writeActiveAccountId` |
| `ACCOUNT_EXISTS`＝signing＋read-only | **符合** | `pubkeyExists` → `signingWatchPubkeyExists` |
| 錯誤碼 WALLET_LOCKED／INVALID_*／BAD_INDEX | **符合** | preview／import handlers |
| 助記詞不寫 storage key | **符合** | `storage-keys.ts` 無 mnemonic 欄；僅 command payload |
| 離開流程清 popup 記憶體 | **符合** | `navigateTo` 離開 `add-import-seed` → `resetImportSeedFlow` |
| Back pick→words 保留詞；words→add-import 清詞 | **符合** | `handleBack`＋`navigateTo` |
| 預覽序號防過期回應 | **符合** | `importSeedPreviewGen` |
| typed commands | **符合** | [`commands.ts`](../../../../wallet/src/shared/commands.ts) |
| Pending 僅 SW | **符合** | 本版未改 pending 禁區（仍 `pending.ts` Map） |
| 禁止 Solibra RSA 劇場 | **符合** | 未見 inject result 加密 |

---

## 驗收對照（INDEX 出貨 checklist）

證據：**建置／靜態碼**；標 **需手驗** 者本審查未在 Chrome 執行。

| 驗收項 | 結果 | 證據 |
|--------|------|------|
| 12 或 24 英文有效助記詞可預覽 20 列（公鑰前4…後4） | **靜態通過**／**需手驗** | `SEED_PREVIEW_COUNT=20`；`shortAddr` 前4…後4 |
| 切 phantom／cli／change 列公鑰會變 | **靜態通過**／**需手驗** | 三模板不同；UI 切 scheme 觸發 `runSeedPreview` |
| 自訂無 `{n}` → 短錯誤、不匯入 | **靜態通過**／**需手驗** | `pathTemplate` → `INVALID_PATH`；popup 清列＋`inline-err` |
| 選一列匯入後 Accounts 出現 signing；vault 可簽 | **靜態通過**／**需手驗** | `kind:"signing"`；test-web 簽名未跑 |
| 助記詞不進 storage（除 vault 內該帳 secret） | **靜態通過**／**需手驗** | 靜態無 persist；DevTools 查 `chrome.storage.local` 仍建議手驗 |
| 主按鈕貼殼底 | **靜態通過**／**需手驗** | `.shell` flex column＋`.shell-dock`；`syncShellDock` |
| `cd wallet && npm run build` | **通過** | 見測試記錄 |

### Track 對照（靜態）

| Track | 靜態是否具備 | 備註 |
|-------|----------------|------|
| 1 衍生與 SW commands | **是** | 錨點齊 |
| 2 Popup 兩屏 | **是** | Add→匯入→助記詞／密鑰；M2 同 tree 其他 UI 變更 |

---

## 測試記錄

**無整包測試指令**（GUIDELINES；INDEX 僅指定 `npm run build` ＋手驗段落）。

| 輪次 | 指令 | cwd | 結果 |
|------|------|-----|------|
| R1 | `npm run build` | `wallet/` | **通過**（`tsc --noEmit && vite build`，exit 0，~1.7s） |
| R1 | Chrome 載入 `wallet/dist`、INDEX 手驗句 | — | **未執行** |

### 需瀏覽器手驗（對 INDEX 手驗指令）

1. 清擴充資料 → 設密碼 → Add → 匯入錢包 → 助記詞。
2. 填 **文件外** 12 詞測試向量 → 下一步 → 預覽 20 列與 SOL。
3. 切「標準／CLI／Ledger／Change」確認公鑰列變化。
4. 自訂 path 去掉 `{n}` → 短錯誤、列空、無法匯入。
5. 選有餘額或任意列匯入 → Accounts 新增 signing → test-web 簽名成功；active 不變。
6. DevTools：`chrome.storage.local` 搜尋助記詞字面（應無）；vault blob 僅加密 secret。
7. Back／關 popup 後重開流程，確認詞格狀態符合 HOW。
8. 密鑰匯入（base58／`[bytes]` JSON）仍可用。
9. （建議，M2）Home／持倉若已改動，順便 smoke test。

隱私：本報告未寫入助記詞、私鑰、密碼、真實地址或 API key。

---

## 現碼抽樣

### Path 與衍生（Track 1）

```31:58:wallet/src/shared/seed-derive.ts
export function pathTemplate(kind: SeedPathKind, customPath?: string): string {
  if (kind === "phantom") return "m/44'/501'/{n}'/0'";
  if (kind === "cli") return "m/44'/501'/{n}'";
  if (kind === "change") return "m/44'/501'/0'/{n}'";
  const t = (customPath ?? "").trim();
  if (!t.includes("{n}")) throw new Error("INVALID_PATH");
  return t;
}
// ... keypairFromMnemonic: mnemonicToSeedSync + derivePath + Keypair.fromSeed
```

### Preview 並行與單列失敗（Track 1）

```969:989:wallet/src/background/index.ts
    const settings = await readSettings();
    const conn = new Connection(settings.rpcUrl, "confirmed");
    const indexes = Array.from({ length: SEED_PREVIEW_COUNT }, (_, i) => i);
    const accounts = await mapPool(indexes, 4, async (index) => {
      const kp = keypairFromMnemonic(phrase, kind, index, customPath);
      // ... getBalance catch → solLabel "—"
    });
    return respond({
      // ...
      result: { pathPreview: pathTemplate(kind, customPath), accounts },
    });
```

### Popup：離開清記憶體、預覽世代（Track 2）

```707:712:wallet/src/popup/main.ts
  if (currentView === "add-import-seed" && view !== "add-import-seed") {
    resetImportSeedFlow();
    elImportSeedRoot.innerHTML = "";
  }
```

```536:548:wallet/src/popup/main.ts
async function requestSeedPreview(): Promise<"ok" | "fail" | "stale"> {
  const gen = ++importSeedPreviewGen;
  importSeedBusy = true;
  // ...
  const res = await sendExtensionRequest("wallet.previewSeedAccounts", {
    mnemonic: mnemonicFromSlots(),
    pathKind: importSeedKind,
    customPath: importSeedKind === "custom" ? importSeedCustomPath : undefined,
  });
  if (gen !== importSeedPreviewGen) return "stale";
```

### Import 不改 active（Track 1）

```1045:1063:wallet/src/background/index.ts
    const id = newAccountId();
    // ... persist vault, accounts.push(meta kind signing)
    return respond({
      kind: "airwave-ext-res",
      requestId: req.requestId,
      ok: true,
      result: { account: meta },
    });
  }
  // 下一 command 才是 wallet.setActiveAccount
```

---

## 修復追蹤

| ID | 級 | 狀態 | 關閉依據 |
|----|----|------|----------|
| M1 | MEDIUM | **仍開** | 待 0.6.0 shipped／版本同步 |
| M2 | MEDIUM | **仍開** | 待 scope／PR 拆分或出貨說明 |
| L1 | LOW | **關閉** | `pagehide` 清 seed 流程 |
| L2 | LOW | **仍開** | 可選 UX |

---

## 變更範圍備註（R1 diff 摘要）

0.6.0 錨點：**新增** [`wallet/src/shared/seed-derive.ts`](../../../../wallet/src/shared/seed-derive.ts)；[`commands.ts`](../../../../wallet/src/shared/commands.ts) 兩 command；[`background/index.ts`](../../../../wallet/src/background/index.ts) preview／import；[`popup/`](../../../../wallet/src/popup/) 匯入方法分流、助記詞兩屏、殼底 dock。  
同 tree 另含 0.5.0 延續與 **0.7.0 向** home-tokens 大改（見 M2）。**新增** [`docs/roadmap/0.6.0/`](..) 契約檔（未 commit）。未改 `../solibra-wallet`。
