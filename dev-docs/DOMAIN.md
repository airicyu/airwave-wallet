# Airwave domain language

Shared across versions. INDEX, HOW, comments, and UI copy follow this file.
When a version's INDEX **explicitly overrides** a term, that version wins, and this file is updated to match.

Each entry has a **Chinese name** (normative), an **English name** (normative), and a **definition**.
**Aliases** (including short forms) are allowed but should be avoided. New docs use the full normative name. After the first mention, an alias listed on that entry may be used.

---

## Entry shape

```text
Chinese: …
English: …
Definition: …
Code: …            (storage, type, or field, when there is one)
Alias: …           (optional; short form or UI wording)
Do not use: …      (easy to confuse, or retired)
```

---

## Product and tree

### Airwave

- **Chinese:** Airwave
- **English:** Airwave
- **Definition:** This product: the Solana Chrome extension (wallet app). What the list switches is a **錢包帳戶** (wallet account).
- **Alias:** 錢包產品, wallet app
- **Do not use:** "wallet" alone for an address, or "wallet" alone for a combined wallet account (that is a wallet account)

### Extension package

- **Chinese:** 擴充原始碼目錄
- **English:** extension package
- **Definition:** The `wallet/` directory. It is the Airwave implementation, not a domain account.
- **Code:** `wallet/`

---

## Understanding terms vs the real model

**The only persistable domain object (stored, connected, switched) is the wallet account (錢包帳戶).**
Wallet, signing wallet, and watch-only wallet are **understanding concepts**. They explain "one account, one address, with or without a key." There is **no** separate wallets table.

```text
Understanding:                         Real model (one accounts table):
  wallet                                 錢包帳戶 wallet account
    ├─ signing wallet                      ├─ 單一錢包帳戶  → one keypair or one public key
    └─ watch-only wallet                   └─ 聚合錢包帳戶  → N addresses + which one is current
```

### Address

- **Chinese:** 地址
- **English:** address
- **Definition:** A Solana **public key**, base58. The industry terms **wallet address** and **錢包地址** mean this.
- **Code:** `publicKeyBase58`; pubkey
- **Alias:** pubkey, 公鑰, 錢包地址, wallet address
- **Do not use:** as a wallet-account row

---

## Understanding concepts (not stored on their own)

### Wallet

- **Chinese:** 錢包
- **English:** wallet
- **Definition:** Understanding only: one account, one address, whether or not it has a secret. It can hold assets and can sign a message or a transaction (without a key, signing fails at runtime). **Not** a storage row.
- **Code:** none. See 單一錢包帳戶.
- **Do not use:** interchangeably with 錢包帳戶, Airwave, or 錢包地址

### Signing wallet

- **Chinese:** 簽名錢包
- **English:** signing wallet
- **Definition:** Understanding only: a wallet with a keypair. In the real model that is a single wallet account whose vault has a secret for that id.
- **Alias:** signing account (older INDEX files)
- **Do not use:** real; signable (as a kind); a row in a second table

### Watch-only wallet

- **Chinese:** 唯讀錢包
- **English:** watch-only wallet
- **Definition:** Understanding only: a wallet that is only a public key. That is a single wallet account with no vault secret, or a combined member address that has no signing row in the list. The sign API still exists. Runtime error: `ACCOUNT_READ_ONLY`.
- **Do not use:** watch wallet (without -only)

---

## Real model: wallet account

### Wallet account

- **Chinese:** 錢包帳戶
- **English:** wallet account
- **Definition:** The bottom-level domain entity: one row in the app list, in connect, and on Home. Two kinds: single and combined.
- **Code:** one element of `airwave.accounts.v1`; `AccountMeta`
- **Alias:** account (in a list); 儲存帳戶 (older technical name)

### Single wallet account

- **Chinese:** 單一錢包帳戶
- **English:** single wallet account
- **Definition:** A wallet account that wraps **one** understood wallet. The row embeds **one address**. If there is a keypair, the ciphertext is `secrets[same id]` in the vault. Otherwise it is watch-only. Holdings and signing use that one address (without a key, signing fails at runtime).
- **Code:** `kind: "signing"` or `"readOnly"`

### Combined wallet account

- **Chinese:** 聚合錢包帳戶
- **English:** combined wallet account
- **Definition:** A wallet account that wraps a **member-address list** (N≥1) and one **主錢包** (one of those addresses). Holdings are the sum of the addresses. sign message and sign transaction use the main wallet's address: if the list also has a single signing row and the vault can sign, it signs; otherwise it fails at runtime. A combined account cannot wrap another combined account. See [0.5.0](./roadmap/0.5.0/INDEX.md).
- **Code:** `kind: "combined"`
- **Alias:** combined; 聚合帳戶 (older name)

### Main wallet

- **Chinese:** 主錢包
- **English:** main wallet
- **Definition:** Understanding: the member address a combined wallet account currently exposes and tries to sign with. Switching it emits `account-changed`. The connection stays bound to the combined wallet account `id`.
- **Code:** the main-wallet field on the combined row (for example `mainPubkey`)
- **Alias:** 目前錢包 (older name)
- **Do not use:** interchangeably with 目前錢包帳戶; 主操作錢包

### Active wallet account

- **Chinese:** 目前錢包帳戶
- **English:** active wallet account
- **Definition:** The wallet account the user has selected (single or combined).
- **Code:** `activeAccountId`

## Stored shape (one table)

**One** `airwave.accounts.v1` array. Each element is a wallet account:

| Kind | Embedded on the row | Secret |
|------|---------------------|--------|
| **單一錢包帳戶** | one public key, `label`, `id` | With a key: vault `secrets[same id]` (understood as a signing wallet). Without: none (understood as a watch-only wallet) |
| **聚合錢包帳戶** | `label`, `id`, **member-address list**, **主錢包** (one of those addresses) | None. Signing looks up whether that address has a single signing row and a vault secret |

Do not add a second wallets table. Deleting a single signing row deletes the row and that vault id. The address can remain on a combined row and is then understood as a watch-only wallet.

---

## Other address terms

### Member address

- **Chinese:** 成員地址
- **English:** member address
- **Definition:** **One wallet address** (public key) embedded on a combined wallet account. Every entry in that list is a member address. A matching single wallet account is not required. Without a signing row or a vault secret it is understood as a watch-only wallet, and signing fails at runtime. An optional name: if the list has a single wallet account for the same address, the UI shows that account's name and locks it, and does not use the member's own name. Otherwise the member name is used, and it may be empty. Renaming the local account updates the label immediately. After that local account is deleted, the member's own name returns (it may still be empty). If a local account for the same address appears again, the name locks to that account again. See [0.47.0](./roadmap/0.47.0/INDEX.md).
- **Code:** an element of `subPubkeys[]` (the field may later be renamed `memberAddresses`); optional names are 0.47.0 `memberNames`
- **Alias:** 成員錢包地址, member wallet address
- **Do not use:** 子地址 (older; sounds like a nested account); member wallet / 成員錢包 (an understanding concept, not a row type); sub account

### Mainnet RPC unset

- **Chinese:** Mainnet RPC 未設定
- **English:** Mainnet RPC unset
- **Definition:** The current network is Mainnet and there is no legal user-owned JSON-RPC (`rpcByCluster.mainnet.active` is empty, equals the public `https://api.mainnet-beta.solana.com`, or is not in the custom `urls`). The official public node is not called. JSON-RPC commands fail with `MAINNET_RPC_UNSET`.
- **Code:** `isMainnetRpcReady`, `effectiveRpcUrl("mainnet") === ""`, `settings.rpcGuideDismissed`
- **Do not use:** calling the Settings Helius API URL "RPC", or treating it as a JSON-RPC fallback

### Query owner

- **Chinese:** 查詢地址
- **English:** query owner
- **Definition:** The owner public key for DAS or RPC. A single active wallet account has length 1. A combined account uses each **成員地址**, in series.
- **Code:** pipe parameter `owners: string[]`
- **Alias:** owner (in a HOW technical section)
- **Do not use:** mixed up with the wallet-account `id`

---

## Resolved capability (runtime)

### Signable

- **Chinese:** 可簽
- **English:** signable
- **Definition:** For an address: signing is possible **right now**. A matching **簽名錢包** must exist, and the vault must be unlocked so the secret can be read. This is not a stored kind (a locked signing wallet is not signable).

### Watch-only capability

- **Chinese:** 僅可查看
- **English:** watch-only (capability)
- **Definition:** For an address: signing is not possible. Includes (1) a matching watch-only wallet, and (2) an address that is not in the list (never added, or its signing or watch-only wallet was deleted). A combined account may still keep that member address and count it in holdings. The sign error remains `ACCOUNT_READ_ONLY`.
- **Alias:** 當唯讀 (HOW verb phrase)

---

## Vault and connections

### Vault

- **Chinese:** 金庫
- **English:** vault
- **Definition:** The structure that stores each **簽名錢包** secret, encrypted with the wallet password. After unlock, plaintext exists only in service-worker memory.
- **Code:** `airwave.vault.v1`. The session keeps only `saltB64` and `keyRawB64`. Plaintext secrets stay in service-worker memory.

### Wallet password

- **Chinese:** 錢包密碼
- **English:** wallet password
- **Definition:** The password that unlocks the vault, and that is asked again when revealing a **簽名錢包** secret. It does not belong to one stored account.
- **Do not use:** account password

### Connected site

- **Chinese:** 已連線站點
- **English:** connected site
- **Definition:** An origin that has approved a Wallet Standard connect, bound to one **錢包帳戶** `id` (which may be a combined wallet account).
- **Code:** `connections[origin].accountId`
- **Alias:** connection (technical sections)

### Pending request

- **Chinese:** 待審批
- **English:** pending request
- **Definition:** A connect or sign request the user has not approved or rejected. It lives only in service-worker memory.
- **Code:** `pending` Map
- **Do not use:** operation store

### Wallet Standard account

- **Chinese:** WS 帳戶
- **English:** Wallet Standard account
- **Definition:** The object injected for a dApp. It means **one wallet address**. For a single active wallet account, that wallet's address. For a combined account, the main wallet's address.

---

## Asset display

### Token row

- **Chinese:** Token 列
- **English:** token row
- **Definition:** One holdings card on Home (native SOL or one mint).
- **Code:** `HomeTokenRow`
- **Alias:** 卡片列 (UI)

### Native SOL row

- **Chinese:** 原生 SOL 列
- **English:** native SOL row
- **Definition:** The token row for native SOL in the query scope. The id is fixed. A zero amount is still shown, and the row stays first.
- **Code:** `id: "native-sol"`

### Balance

- **Chinese:** 持倉
- **English:** balance
- **Definition:** The amount on that token row. A single wallet account uses that wallet. A combined wallet account sums every member wallet (the default display is the sum only).

### Member breakdown

- **Chinese:** 成員明細
- **English:** member breakdown
- **Definition:** Combined wallet accounts only. After the user expands a token row, list the **member addresses that hold that token with amount > 0**, each amount, and its share of the row total. Members with none of that token, or a zero balance, are omitted. This does not change the main wallet.

### Quote

- **Chinese:** 報價
- **English:** quote; USD value
- **Definition:** The fiat display for that token row. When there is no reliable price, show "—". That mark is not a zero balance.
- **Alias:** USD (right side of the row)

---

## Signing

### Sign-risk check

- **Chinese:** 簽署安全評估
- **English:** sign-risk check
- **Definition:** An unscheduled helper on the transaction approval. The idea lives in the backlog note "簽署交易 AI 安全評估" and in bubble-harness. It does not sign, and model output is not a chain fact.
- **Code:** not in the extension. The POC is `test-web/sign-risk.html`
- **Alias:** 安全評估
- **Do not use:** calling this card an AI chat; assuming 0.28.0 shipped it

---

## Relations (not entries)

```text
Understanding: wallet → signing / watch-only
Real: 錢包帳戶 → 單一 (embedded address ± vault secret) / 聚合 (address list + 主錢包)
```

- Switching the **目前錢包帳戶** switches one accounts row.
- Switching the **主錢包** changes which member address is main inside the same combined row. That emits `account-changed`. The connection stays on that row's id.
- Deleting a single signing row leaves the address on a combined row, understood as a watch-only wallet.
- A combined account always has at least one member address. The last one cannot be removed. Dissolving the account deletes that wallet-account row.

---

## Historical aliases

The left column is not a new normative name unless it is already listed as an alias.

| Old | Read as |
|-----|---------|
| 單地址帳戶 | 單一錢包帳戶 (or the understood wallet) |
| Older draft "錢包 = a storage row" | 錢包 is only an understanding concept; the row is a 錢包帳戶 |
| Older draft "錢包帳戶 excludes combined" | 錢包帳戶 includes single and combined |
| signing account / 簽名帳戶 | 簽名錢包 |
| real wallet account | 簽名錢包 |
| signable wallet account (as a kind) | 簽名錢包 or 可簽 |
| watch wallet (without -only) | 唯讀錢包 |
| 聚合帳戶 / combined account (older "not a wallet account") | **聚合錢包帳戶** (it is a kind of wallet account) |
| 主地址 / active main / 目前錢包 / active wallet | **主錢包** (or its address) |
| 子地址 / sub-address / sub account | **成員地址** |
