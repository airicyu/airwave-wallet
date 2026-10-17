# SNS `.sol` name resolution — backlog

Not scheduled in any version INDEX. **Not a contract.** After it is scheduled, that version's INDEX wins.

**Do not start.** SNS is moving existing SPL Name Service domains from `.sol` to `.sns`. The official SDK pauses `.sol` resolution after slot 452,825,395. The new SRS `.sol` returns only late in the migration, and it is a different domain from `.sns`. Schedule this after SNS settles the `.sol` / `.sns` resolution contract. Until then, do not implement it and do not put it in a version INDEX.

Separate from the address book: the address book stores a name plus a base58 address and does not resolve domains. This item resolves an [SNS](https://sns.id) name such as `XXX.sol` into one Solana address when the user sends.

## Current

The send recipient accepts only a base58 public key. Pasting `alice.sol` is not treated as an address. The wallet does not query SNS and does not cache a resolution.

## Intent

When the user types a name ending in `.sol` in the send recipient field, the wallet asks SNS for the Solana address. On success, that address is the recipient. The screen still shows the name the user typed and the resolved address, so a send is not made from the name alone.

- Only `.sol` names. Other-chain names (for example `.eth`) are out of this item.
- If resolution fails, the name is not registered, or the result is not a valid Solana address, the user cannot send. The error is one short sentence. An unresolved string is not a recipient.
- Resolution is a query. It does not write to the chain, sign, or touch the vault.
- The resolved address does not have to exist in the address book. The address book stays a separate list. This item does not auto-save each resolution into the address book.

## Decide before scheduling

- Which SNS resolution endpoint, and whether mainnet and devnet share it.
- Whether to resolve again before send, so a name that changed owner between typing and sending is not used stale.
- Whether the user can manually add a result to the address book (default: no automatic write).

## Out of scope

- Registering, renewing, or transferring a `.sol` name
- Using the name as the address-book primary key instead of base58
- Reverse resolution: showing the counterparty's `.sol` name from an address
- `.eth` or other non-SNS domains
