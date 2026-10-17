# 0.47.0 設計審查

本檔是審查紀錄，不是已定案。拍板以 [INDEX.md](../INDEX.md) 為準。

## 輪次

| 輪 | 日期 | 角色 |
|----|------|------|
| 初審 | 2026-10-17 | 設計審查（新 agent，只認檔案） |
| 二審 | 2026-10-17 | 設計審查（新 agent，只認檔案；對照更新後的 INDEX） |
| 三審 | 2026-10-17 | 設計審查（新 agent，只認檔案；對照更新後的 INDEX） |

## 對照基準

- [0.47.0 INDEX](../INDEX.md) 已定案與驗收（狀態 `planned`；本輪以檔案現文為準）
- [GUIDELINES.md](../../GUIDELINES.md) 隱私與架構禁區（INDEX 未推翻）。中改建議另寫 docs；自足已由 INDEX 已定案補上，不另要求 HOW
- [agent-workflow.md](../../agent-workflow.md) 設計審查角色
- 上游 [0.46.0 INDEX](../../0.46.0/INDEX.md)：密鑰列，本版非目標，不併入契約
- 領域用語 [DOMAIN.md](../../../DOMAIN.md)「主錢包」「成員地址」（已指向本版 `memberNames`）
- 概念稿 [`dev-docs/design-demos/wallet-account-ui.html`](../../../design-demos/wallet-account-ui.html)：只作對照；與 INDEX 衝突時以 INDEX 為準
- 本版無 `docs/how.md`、`docs/reasoning.md`、`HANDOFF.md`
- backlog（`sns-name`、`account-avatar`）是構想，不是本版契約

## 總評

方向與架構禁區相容，整份提案可行。待拍板表仍是空的。設計門檻通過：沒有未關閉 HIGH；應修 MEDIUM（M1–M5）都已寫進現在的 INDEX。未關的只有 L3，屬 LOW，不擋開工。可寫 HANDOFF。本輪無須宣告不可行。

## Findings

### H1 — 成員名稱沒有寫入命令

- **級別：** HIGH
- **狀態：** 已關閉（二審）
- **依據：** 已定案「設成員名稱」：`wallet.setCombinedMemberName`，payload `{ combinedId, publicKeyBase58, name }`；trim 後空字串刪鍵；有 `signing` 或 `readOnly` 同地址則 `MEMBER_NAME_LOCKED`、不寫 `memberNames`；刪成員仍只走 `wallet.removeCombinedSub`，同一筆寫入刪對應鍵。可改名成員的確認鈕呼叫這一條。
- **問題：** 初審時沒有命令名與 payload。
- **期望：** 已由該列滿足。

### M1 — `reorderCombinedSubs` 的集合比對未寫正規化

- **級別：** MEDIUM
- **狀態：** 已關閉（二審）
- **依據：** 已定案「成員排序」：與 `wallet.addCombinedSub` 相同的公鑰解析正規化；解析失敗即 `INVALID_PUBLIC_KEY` 且三欄都不改；重複項只留第一次；正規化去重後集合必須等於目前 `subPubkeys`，否則同樣不改 `subPubkeys`、`mainPubkey`、`memberNames`。
- **問題：** 初審時未寫正規化與重複項。
- **期望：** 已由該列滿足。

### M2 — 確認成空時畫面停在哪

- **級別：** MEDIUM
- **狀態：** 已關閉（二審）
- **依據：** 已定案「改名子畫面」：帳戶列表與地址簿 trim 後為空則不發命令、留在這頁、不顯示錯誤。成員 trim 後為空仍發設名稱命令，成功後回到成員列表。
- **問題：** 初審時「不寫入」沒有停留與錯誤句。
- **期望：** 已由該列滿足。非空成功後的去向見 M5。

### M3 — 三處改名子畫面的導航目標未寫

- **級別：** MEDIUM
- **狀態：** 已關閉（二審）
- **依據：** 已定案「帳戶列表」：`account-rename`，參數帳戶 id，確認 `wallet.renameAccount`。「地址簿」：`address-card-rename`，參數卡片 id，確認 `addressBook.rename`。「改名子畫面」：返回只離開、不發命令。「設成員名稱」：可改名成員的確認呼叫 `wallet.setCombinedMemberName`。
- **問題：** 初審時沒有 route、參數與命令。
- **期望：** 已由上列滿足。

### M4 — 中改缺少 HOW，驗收沒蓋到排序失敗

- **級別：** MEDIUM
- **狀態：** 已關閉（二審）
- **依據：** 已定案「成員排序」「設成員名稱」已寫 payload 與拒絕時不改哪些欄。驗收列有：集合不符或公鑰無法解析時不改順序、主錢包、`memberNames`；唯讀本機成員顯示該戶名稱、沒有鉛筆、圖示槽留空。HOW 仍無；GUIDELINES 允許以自足 INDEX 代替加厚 docs。
- **問題：** 初審時命令與兩條手驗只存在審查期望。
- **期望：** 已由 INDEX 滿足，不另開 HOW。

### L1 — 「名稱」「確認」未對到 catalog 鍵

- **級別：** LOW
- **狀態：** 已關閉（二審）
- **依據：** 已定案「改名子畫面」：標題 `common.name`，殼底確認 `common.confirm`。現碼這兩鍵已是「名稱／确认／Name」與「確認／确认／Confirm」。
- **問題：** 初審時沒有點名 catalog 鍵。
- **期望：** 沿用既有鍵即可，不必在 INDEX 再抄三語句子。

### L2 — 「聚合成員列的鑰匙都用這組」易讀成唯讀也要畫眼睛

- **級別：** LOW
- **狀態：** 已關閉（二審）
- **依據：** 已定案「種類色」：對到唯讀本機帳戶不畫眼睛，圖示槽留空但仍佔固定寬。管理頁列規則仍是只對可簽單一帳戶放銅色鑰匙。
- **問題：** 初審時種類色與列規則並讀會畫出藍眼。
- **期望：** 已由該列滿足。

### M5 — 非空名稱確認成功後回到哪一頁

- **級別：** MEDIUM
- **狀態：** 已關閉（三審）
- **依據：** 已定案「改名子畫面」：確認成功（含成員刪鍵成功）後回到進入前的那一頁——帳戶列表、地址簿列表、或聚合管理。命令失敗則留在子畫面，用該頁既有錯誤表面。三種入口共用這一句，成功去向與失敗停留都已寫明。
- **問題：** 二審時非空確認成功後的頁面未寫。
- **期望：** 已由該列滿足。

### L3 — 從本機帳戶加入沒有寫命令名

- **級別：** LOW
- **狀態：** 未關閉
- **依據：** 已定案「加入成員」：貼上新地址寫明既有 `wallet.addCombinedSub`；從本機單一錢包帳戶加入只寫已加入不可再加、尚未加入才可加。
- **問題：** 第二個選項沒有寫也送 `wallet.addCombinedSub`（`publicKeyBase58` 為該戶地址）。現碼該命令已是這份 payload，實作沿用即可，不擋開工。
- **期望：** 該列補半句：本機清單的加入同樣呼叫 `wallet.addCombinedSub`。

## 驗收對照

| 驗收句 | 初審 | 二審 | 三審 |
|--------|------|------|------|
| 帳戶列表銅色鑰匙、藍色眼睛、鉛筆在三點左、改名子畫面、返回不寫入、確認成空不寫入 | 空確認見 M2 | M2 已關。非空成功後的頁面見 M5 | M5 已關。成功回帳戶列表 |
| 地址簿鉛筆在紅底刪除左、子畫面改名、拖曳仍改順序 | 導航見 M3 | M3 已關。成功後頁面見 M5 | M5 已關。成功回地址簿列表 |
| 管理頁主錢包小卡、成員區塊、加號在標題右、本機帳戶不在此頁、拖曳只改順序 | 排序失敗見 M1、M4 | M1、M4 已關 | 仍關。成員改名成功回聚合管理 |
| 無本機帳戶可設名稱、可改回空；有本機帳戶顯示該戶名稱且無鉛筆；唯讀圖示槽留空 | 寫入見 H1 | H1、L2 已關。空名稱成功回列表已寫 | 空名稱與非空成功都回進入前的頁 |
| `wallet.reorderCombinedSubs` 集合不符或無法解析時不改順序、主錢包、`memberNames` | （初審時無此句） | 已寫入驗收，對上「成員排序」 | 仍對上 |
| 本機改名後聚合成員顯示新名稱，且 `memberNames` 不含該鍵 | 已定案足夠 | 仍足夠 | 仍足夠 |
| 刪掉本機帳戶後成員仍在，改回 `memberNames` 或只剩地址 | 已定案足夠 | 仍足夠 | 仍足夠 |
| 之後同一地址再出現單一帳戶，顯示鎖回該戶名稱 | 已定案足夠 | 仍足夠 | 仍足夠 |
| `cd wallet && npm run typecheck` | 指令與 cwd 明確 | 仍明確 | 仍明確 |
| 未封裝擴充四條手驗 | 缺排序拒絕與唯讀圖示 | 排序拒絕與唯讀圖示已有專條。四條手驗仍沒寫改名成功後停在哪，見 M5 | 成功回進入前的頁已寫進「改名子畫面」，手驗可對這句 |

## 現碼抽樣

抽樣只看錨點是否與提案衝突。尚未實作本版不算設計 HIGH。

| 錨點 | 觀察 |
|------|------|
| `account-kind-visual.ts` | `ACCOUNT_KIND_COLOR` 已是可簽 `#D08B5B`、唯讀 `#6CB4E8`、聚合 `#c084fc`。與已定案色值一致 |
| `storage-keys.ts` `CombinedAccountMeta` | 尚無 `memberNames`。可選欄與「舊列沒有此欄」相容 |
| `AccountsScreens.tsx` `RenameScreen` | 確認成功後 `navigateTo("accounts")`。與「改名子畫面」帳戶列表入口成功後回到進入前的頁一致。地址簿與聚合管理尚無對應子畫面，屬待做 |
| `account-records.ts` `handleRenameAccount` | 空白名稱回無效標籤。本版改由畫面在 trim 後為空時不發命令，與 M2 關閉後的已定案一致 |
| `combined-members.ts` | `addCombinedSub`／`removeCombinedSub` 的 payload 已是 `{ combinedId, publicKeyBase58 }`，公鑰走 `parsePublicKeyBase58`。reorder 與設名稱寫「相同正規化」有現碼可對。本機清單加入見 L3 |
| `account-label.ts` | `ACCOUNT_LABEL_MAX` 為 15 |
| `ui-messages.ts` | `common.name`、`common.confirm`、`common.currentWallet` 三語已在。L1 關閉 |
| `AddressCardsScreens.tsx` | 改名仍是列上輸入框。本版要改成 `address-card-rename`，屬待做 |
| 單一帳戶公鑰 | 建立時 `pubkeyExists` 拒絕重複。同一地址不會有兩列本機名稱 |
| 0.46.0 | 密鑰列在 Settings，與本版三頁無共用寫入路徑 |

架構禁區：本版不碰 pending、廣播、inject 私鑰、Wallet Standard 能力表。帳戶列仍走既有 extension command 與帳戶儲存。無 HIGH。

概念稿筆記寫「單選在最左」。INDEX 寫最左是拖曳點、其右才是單選。以 INDEX 為準，不另開 finding。

## 修復追蹤

| ID | 狀態 | 備註 |
|----|------|------|
| H1 | 已關閉 | 「設成員名稱」 |
| M1 | 已關閉 | 「成員排序」 |
| M2 | 已關閉 | 「改名子畫面」空名稱 |
| M3 | 已關閉 | 帳戶列表、地址簿、設成員名稱 |
| M4 | 已關閉 | 已定案 payload 與驗收兩條；不另要求 HOW |
| L1 | 已關閉 | `common.name`、`common.confirm` |
| L2 | 已關閉 | 「種類色」不畫唯讀眼睛 |
| M5 | 已關閉 | 「改名子畫面」成功回進入前的頁；失敗留在子畫面 |
| L3 | 未關閉 | 本機加入沿用 `addCombinedSub` |

尚無 HANDOFF。

## 歷審摘要

- **2026-10-17 初審：** 提案可行。未關 HIGH：H1。應修 MEDIUM：M1、M2、M3、M4。LOW：L1、L2。
- **2026-10-17 二審：** H1、M1、M2、M3、M4、L1、L2 已關閉，依據是現在的 INDEX 對應列。未關 HIGH：無。應修 MEDIUM：M5。LOW：L3。門檻未過。可行，不必退回重寫整份契約。
- **2026-10-17 三審：** M5 已關閉。「改名子畫面」寫明確認成功（含成員刪鍵成功）後回到進入前的那一頁（帳戶列表、地址簿列表、或聚合管理）；命令失敗留在子畫面並用既有錯誤表面。未關 HIGH：無。未關 MEDIUM：無。LOW：L3。設計門檻通過。可行。
