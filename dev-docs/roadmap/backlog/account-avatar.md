# Wallet-account avatar — backlog

Not scheduled in any version INDEX. **Not a contract.** After it is scheduled, that version's INDEX wins.

The subject is a **錢包帳戶** (wallet account) in [DOMAIN](../../DOMAIN.md): one list row, single or combined. Not an address-book recipient, and not one image per combined member address.

## Current

A wallet account has a name and an address. The list and Home have no user-chosen avatar. Recognition uses the name and the short address.

## Intent

Each wallet account can have an avatar icon. Where that account appears, the image is used instead of text alone. An account with no avatar stays as it is. An image is not required for every account.

- The user can set, replace, and clear it. Clearing returns to no avatar.
- The avatar belongs to that wallet account and lives in `chrome.storage` (user data, not a vault secret). It is still there after restart. It is not part of a mnemonic export and it is not on-chain.
- A combined wallet account has one image for the whole account. Switching the main wallet does not change the avatar.
- Reads and writes go through a service-worker command. The popup only renders.

## Decide before scheduling

- Where the image comes from: a built-in set, a user upload, or both.
- Upload format, size, and the storage cap.
- Which surfaces show it (account list, Home, the account pill on an approval).

## Out of scope

- Automatically fetching an on-chain avatar, NFT, or SNS avatar from an address
- One avatar per address-book recipient
- One avatar per combined member address
