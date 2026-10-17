# Version upgrades and storage migration — backlog

[0.26.0](../0.26.0/INDEX.md) shipped the skeleton: `airwave.schemaGeneration` is 1, and `*.v1` shapes are unchanged. A later shape change is its own version contract. This file is still an idea, not a contract.

## Current

Durable data is in `chrome.storage.local`. Keys carry a suffix: `airwave.settings.v1`, `airwave.accounts.v1`, `airwave.activeAccountId.v1`, `airwave.connections.v1`, `airwave.vault.v1`. The vault blob also has `version: 1`.

The extension version (`0.x.y`) does **not** map to those suffixes. There is no central migration step on upgrade. Compatibility is hole-filling on read, for example:

- Missing settings fields get defaults from `normalizeSettings`. An old single `rpcUrl` is folded into `rpcByCluster`.
- An account missing `kind` is treated as `"signing"`.

The unlock session (`chrome.storage.session`) disappears when the browser closes. It is not a migration target.

## Intent

Define **how data moves on upgrade** so an installed wallet still opens after an extension update, and accounts, the vault, connections, and settings are not dropped.

1. **Separate version numbers.** The extension version the user sees is not the storage schema. Separately record which generation this local data was written as.
2. **Run only when the service worker starts**, and finish before handling commands. The popup does not rewrite old keys itself.
3. **One step per generation, re-entrant.** Migration is an ordered function (generation n → n+1). Running it again yields the same result. "Guess when a field is missing" is not the only path. Hole-filling on read can stay as a guard, but a shape change needs a named step.
4. **Plaintext and the vault stay apart.** Settings, accounts, the active id, and connections do not need the password and can be written back at startup. If the vault ciphertext changes KDF or blob shape, re-encrypt **only** after the next successful unlock. On failure, **do not overwrite** the old blob.
5. **Failure does not destroy data.** If any write fails, stop and leave the pre-upgrade keys. Do not delete the old key before writing the new one. Do not create an empty vault because migration failed.
6. Tests use fictional accounts and a fictional vault. Do not write a real mnemonic, secret, or password into the repo.

The `*.v1` keys already on user machines are generation 1. This method must move forward from that generation. It does not require a reinstall.

## Decide before scheduling

- Whether the schema generation is a new key, or the key suffix itself (`v1` → `v2`).
- Whether the first shipped step only records the current shape as generation 1, with no transform.
- When the vault format changes, what the lock screen says (one short error, no tutorial).

## Out of scope

- Cloud backup, or exporting the whole storage blob to another computer
- Importing from another wallet product
- Running migration from the UI every time the popup opens
- Changing cryptography for the sake of migration, or writing secrets into plaintext keys
