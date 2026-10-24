# Debug-mode operation and error log — backlog

Not scheduled in any version INDEX. **Not a contract.** After it is scheduled, that version's INDEX wins.

## Current

Wallet actions and failures have no dedicated log the user or a developer can turn on. Diagnosing a failed send, sign, swap, or unlock means reading the service-worker console by hand.

## Intent

A debug mode records wallet operation behavior and errors. While it is on, each wallet operation writes a log entry, and each error writes an error entry. While it is off, those entries are not written.

- The user turns debug mode on and off. Off is the default.
- An operation entry names the command and its outcome (started, succeeded, failed). It does not include a mnemonic, private key, password, or unlock key.
- An error entry names the command and a short reason. It does not include key material or the user's password.
- Entries stay on the device. They are not sent off the machine as part of this item.

## Decide before scheduling

- Where entries live (in-memory ring, `chrome.storage`, or a downloadable export) and how many are kept.
- Which surfaces can show or clear the log.
- Whether an operation entry includes non-secret arguments (addresses, mints, lamport amounts as strings).

## Out of scope

- Remote crash reporting or uploading logs
- Logging vault secrets, passwords, or raw signatures as a debugging aid
- A log of page content from connected sites
