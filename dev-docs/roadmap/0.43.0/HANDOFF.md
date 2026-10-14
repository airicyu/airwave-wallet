# 0.43.0 HANDOFF — Address cards

## 讀檔順序

1. [INDEX.md](./INDEX.md)
2. [docs/address-cards-how.md](./docs/address-cards-how.md)
3. [docs/reasoning.md](./docs/reasoning.md)
4. [0.12.0](../0.12.0/INDEX.md) 與 [0.42.0](../0.42.0/INDEX.md) 的送出規則（本版不改簽名者）

## 產品摘要

Home 漢堡選單「錢包帳戶」下一項維護 Address cards（名稱＋地址，鍵 `airwave.addressBook.v1`）。送出時全螢幕兩頁挑選：錢包帳戶（聚合只列目前錢包）或卡片。recipient 永遠是完整地址。仍可手貼。

## Track 順序

1. **儲存與命令** — 新鍵與 `addressBook.add`／`rename`／`remove`。不升 `schemaGeneration`。
2. **Address cards 畫面** — 選單、列表、就地改名、複製、刪除確認、新增。
3. **送出全螢幕挑選** — 兩分頁；填入完整地址後走既有 `wallet.beginSend`。

## 禁區

不把名單當白名單擋手貼。不進 pending。popup 不直接寫 storage。不改既有 `*.v1` 與金庫。不列聚合的其他成員。不升 schema 世代。

## 錨點

- `wallet/src/shared/storage-keys.ts`
- `wallet/src/popup/PopupMarkup.tsx`
- `wallet/src/popup/components/AccountKindMark.tsx`
- `wallet/src/popup/send/TokenSendForm.tsx`
- `wallet/src/shared/ui-messages.ts`

## 完成檢查

- INDEX 驗收全勾
- `cd wallet && npm run typecheck`
- 手驗：新增、改名、複製、刪除；兩個分頁各選一次；手貼一條名單外地址

## Paste-ready starter

```text
實作 dev-docs/roadmap/0.43.0。先讀 INDEX.md、HANDOFF.md、docs/address-cards-how.md。狀態改 in progress。依 Track 1→2→3。跑 cd wallet && npm run typecheck。勿 commit，除非使用者要求。
```
