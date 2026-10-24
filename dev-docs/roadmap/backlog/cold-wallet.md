# Cold-wallet support — backlog

Not scheduled in any version INDEX. **Not a contract.** After it is scheduled, that version's INDEX wins.

This item is research. It does not pick a product or a protocol.

## Current

Every wallet account in Airwave is a hot account: the secret lives in the password-boxed vault, and the extension signs. There is no path where the secret stays on another device and this extension only prepares the payload and shows the result.

## Intent

Find out what it would take for Airwave to work with a cold wallet: the user approves on a device that holds the key, and this extension never receives that key.

The write-up should name:

- Which kinds of cold wallet are in range (hardware wallet over USB or HID, QR or air-gap, or both) and which are out.
- What the extension would still do: build the unsigned transaction or message, show it, send it to the cold device, and attach the returned signature.
- What must stay true: the cold secret is not imported into the vault, not written to `chrome.storage`, and not logged.
- What changes for a connected site: the account can still connect and request a signature, and the approval UI waits on the cold device instead of the password unlock.
- Open choices that a later version would have to settle before any code.

## Decide before scheduling

- The first cold-wallet kind to research against (one hardware line, or QR only).
- Whether a cold account is a separate 錢包帳戶 or a signing mode on an existing one.
- Whether watch-only (address with no local key and no cold signer) is part of the same item.

## Out of scope

- Implementing a signer, a USB stack, or a QR codec in this item
- Moving existing hot-wallet keys onto a cold device
- Custody of a cold-wallet secret inside the Airwave vault
