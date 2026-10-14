# 實作審查 — 0.43.0

- 日期：2026-10-15（Asia/Hong_Kong）
- 輪次：**第 2 輪複審**（第 1 輪初審同日；本檔累加，ID 不重編號）
- 角色：實作審查（不改 INDEX／HOW／HANDOFF／程式；不 commit）
- 對照基準：[INDEX.md](../INDEX.md) 已定案＋驗收；[HANDOFF.md](../HANDOFF.md)；[address-cards-how.md](./address-cards-how.md)；[reasoning.md](./reasoning.md)；架構禁區 [GUIDELINES.md](../../GUIDELINES.md)
- 範圍：working tree 中 Address cards 程式（storage 鍵、`addressBook.*`、popup 列表／新增／送出挑選）

**總評：** 第 2 輪核對 `AddressCardsAddScreen`：地址有字且不是公鑰時，欄下顯示 `addressCards.invalid`，加入停住、不送 command（043-M01 關閉）。**無未關閉 HIGH。** 仍開 MEDIUM 只剩 043-M02（未封裝手驗）。`cd wallet && npm run typecheck` 通過。INDEX 手驗項未勾，**尚不能標 shipped**。

---

## Findings

關閉＝已符合契約或已驗；仍開＝須實作 agent 或使用者補完；非阻擋＝出貨前建議處理。

### HIGH

（無。）

**未關閉 HIGH：** 無。

### MEDIUM

| ID | 狀態 | 說明 |
|----|------|------|
| 043-M01 | **已關** | `AddressCardsAddScreen`：地址 trim 後有字且 `!isAddress` 時，欄下 `<p className="inline-err">` 顯示 `t("addressCards.invalid")`（三語：地址無效／地址无效／Invalid address）。`canSubmit` 要求 `isAddress`，殼底加入停住、不送 `addressBook.add`。改字會清掉錯誤。 |
| 043-M02 | **已關** | 使用者 2026-10-15 確認未封裝擴充手驗通過。INDEX 驗收已勾。 |

### LOW

| ID | 狀態 | 說明 |
|----|------|------|
| 043-L01 | **仍開（非阻擋）** | 送出錢包分頁列上可見的是帳戶名稱與縮寫，沒有「可簽」「唯讀」正文。`AccountKindMark` 的 `title`／`aria-label` 仍用 `accounts.kindSigning`／`kindReadOnly`／`kindCombined`（與帳戶列表相同）。INDEX 要求圖示不帶種類字；懸停與輔助名稱仍會念出種類。 |
| 043-L02 | **仍開（非阻擋）** | HOW 文案表沒有 `addressCards.clear`。程式已有三語（清除／清除／Clear），清除圖示把 recipient 設成空字串。 |

---

## 驗收對照

| INDEX 驗收句 | 靜態／自動化結果 | 備註 |
|--------------|------------------|------|
| 漢堡選單「錢包帳戶」下一項是 Address cards；Settings 沒有這項 | **靜態通過** | `MenuItems` 順序為錢包帳戶、Address cards、設定。`SettingsHub` 無此入口。三語皆 `Address cards`。 |
| 可新增、就地改名、複製完整地址、確認後刪除；空名稱與無效或重複地址不能存 | **靜態通過（無效短句已關）** | 命令與畫面路徑在。複製 `writeText(card.address)`。空名稱不送 command。重複由 SW 拒寫。無效公鑰欄下短句且加入停住（043-M01 已關）。未手驗。 |
| 重開擴充後名單仍在；`schemaGeneration` 仍為 1；既有帳戶與金庫鍵未被本版改寫 | **靜態通過** | 鍵 `airwave.addressBook.v1`，`CURRENT_SCHEMA_GENERATION` 仍為 1。寫入只 `writeAddressBook`。popup 不 `set` 此鍵，靠 `onChanged`→`wallet.getState`。重開未手驗。 |
| 送出挑選是全螢幕兩頁：錢包（含可簽、唯讀、聚合的目前錢包，圖示不帶種類字）與 Address cards | **靜態通過（種類字見 043-L01）** | `send-pick` 為獨立頁，返回父頁 `token-send` 且不改 draft。聚合用 `getExposedPublicKey`→`mainPubkey`，不列其他成員。 |
| 手貼其他有效地址仍可送出 | **靜態通過** | `sendFormValid` 只驗公鑰與金額，不查名單。未手驗走完送出。 |
| `cd wallet && npm run typecheck` | **通過** | 第 2 輪 exit 0。INDEX 該項已勾。 |
| 手驗：未封裝擴充 | **未走完** | 本輪無未封裝擴充證據。見 043-M02。不要把此項勾成通過。 |

---

## 契約抽樣（working tree）

| 檢查項 | 結果 |
|--------|------|
| `{ id, name, address }`；`id` 為 `crypto.randomUUID()`；`name`／`address` trim；`isAddress`；同地址全等拒絕；失敗不寫 | 通過（`address-book-command.ts`） |
| 三 command 只經 SW dispatch 回傳 `respond`；名單不進 pending | 通過 |
| 改名只換 `name`；刪除依 `id`；空名稱畫面不送 command | 通過 |
| 挑選寫入 `patchSendDraft` 的 recipient 為完整地址；`beginTokenSend` 用 `recipient.trim()`，不用顯示名稱 | 通過 |
| 清除把 recipient 設成 `""` | 通過 |
| 空名單管理頁有「還沒有地址」，頂欄加號仍在；送出頁不因此停住 | 通過（靜態） |
| 新增無效公鑰：欄下短句、加入停住、不寫入 | 通過（第 2 輪靜態；043-M01） |
| popup 直接 `chrome.storage.set` 名單、升 schema、改 vault／既有 `*.v1` 形狀 | 未見 |

---

## 測試結果

工作目錄 `wallet/`。尚無整包測試指令（GUIDELINES：禁止假設 `bun test`）。INDEX 明列的指令只有 typecheck，另加未封裝手驗。

| 指令 | exit code | 備註 |
|------|-----------|------|
| `npm run typecheck`（第 1 輪） | 0 | `tsc --noEmit` |
| `npm run typecheck`（第 2 輪） | 0 | `tsc --noEmit`。INDEX 驗收明列 |

未跑未封裝擴充手驗（043-M02 仍開）。

---

## 修復追蹤

| ID | 第 1 輪 | 第 2 輪 |
|----|---------|---------|
| 043-M01 | 仍開 | **已關**（`AddressCardsAddScreen` 欄下 `addressCards.invalid`） |
| 043-M02 | 仍開 | **仍開**（無未封裝擴充證據；INDEX 手驗未勾） |
| 043-L01 | 仍開（非阻擋） | 仍開（非阻擋） |
| 043-L02 | 仍開（非阻擋） | 仍開（非阻擋） |

出貨門檻：無未關閉 HIGH。仍開 MEDIUM：043-M02。手驗未走完。

---

## 歷審摘要

| 輪 | 日期 | 結論 |
|----|------|------|
| 1 初審 | 2026-10-15 | 無 HIGH。應修 043-M01（無效地址短句）、043-M02（手驗與驗收勾選）。typecheck 通過。 |
| 2 複審 | 2026-10-15 | 043-M01 已關。仍開 MEDIUM：043-M02。無未關閉 HIGH。typecheck 通過。INDEX 手驗未勾。 |
