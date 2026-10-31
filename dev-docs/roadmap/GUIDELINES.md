# Roadmap guidelines

How to write a version contract and the standing architecture rules. Read this before opening `dev-docs/roadmap/X.Y.Z/`.

---

## 1. A version contract is self-sufficient

Each version is a directory. **`INDEX.md` is the entry** and links to the other files in that directory.

```text
dev-docs/roadmap/X.Y.Z/
  INDEX.md
  docs/
    reasoning.md
    how.md
    design-review.md
    implementation-review.md
  HANDOFF.md
```

| File | Role |
|------|------|
| `INDEX.md` | Entry: status, read order, acceptance, out of scope, dependencies, hand-test |
| `docs/reasoning.md` | What ships, why, what was dropped |
| `docs/how.md` | Steps, commands, types, acceptance checks |
| `docs/design-review.md` | Written by `/version-delivery` before implementation. Not a feature list |
| `docs/implementation-review.md` | After all Tracks. Findings and what was fixed or accepted |
| `HANDOFF.md` | One file. "Done this session" plus "Next session" for the next agent |

**Read order:** `INDEX.md` → `docs/reasoning.md` → `docs/how.md` → code. Do not start from `HANDOFF.md`.

A contract is complete only when an agent with no chat can answer:

1. What is in, what is out
2. Which commands, types, and storage keys
3. What the acceptance checks are
4. What the next session should change first

If any answer depends on "we said so in chat," it is not written yet.

---

## 2. Language

**Reply to the user in Traditional Chinese.** **Docs default to 繁體中文書面語**, unless the user or a spec says otherwise.

- `INDEX.md`, `reasoning.md`, `how.md`, `HANDOFF.md`, and other roadmap prose: **繁體中文書面語**.
- Identifiers, paths, commands, JSON keys, enums: **English**.
- **Versions at or before 0.53.0** keep their original wording. Do not rewrite them for this rule.
- Domain term **names** stay 繁體中文書面語. See [DOMAIN.md](../DOMAIN.md).
- UI strings live in the message catalog (`ui-messages` and locale files). Traditional Chinese, Simplified Chinese, and English are three catalogs. Do not hard-code a single language into the contract.

---

## 3. Paths

* `wallet/` is the extension. `test-web/` is the manual dApp. `docs/` is user-facing. `dev-docs/` is for engineers.
* The roadmap directory is **`dev-docs/roadmap/`**.
* Do not put contracts in `docs/` or `wallet/`.
* Code references in `how.md` use repo-root paths, for example `wallet/src/background/handlers/wallet-dispatch.ts`.

---

## 4. Architecture (standing)

These apply until a version's `INDEX.md` explicitly overrides one. Do not break them with "temporary" storage hydration or a hard-coded password.

1. **Pending requests** live in the service worker (or the hub that version names). The UI does not scan `chrome.storage` hoping to find the payload.
2. **Durable state:** `chrome.storage` is the source of truth. `onChanged` updates each UI mirror. Do not hand-roll a rehydrate bus as the main path.
3. **Custody:** a password-boxed vault. No hard-coded password as a security mechanism. Unlock keys are not stored in plaintext for long.
4. **Messages:** typed command plus `requestId`. The result returns only to the originating tab. No broadcast to every tab by default.
5. **Do not** RSA-encrypt every inject↔extension operation result.
6. **Dependencies:** keep the extension's third-party surface small. Adding one needs a reason.
7. **Numbers:** do not use JavaScript `number` for amounts, balances, fees, or simulation deltas. Chain integer units (`lamports`, token base units) are `BigInt` built from strings, never via a JSON `number`. Decimals use `big.js` (not installed yet; add it on first use). Do not switch to `decimal.js`.
8. **Agent (when built):** runs in a sandbox with no `chrome.*` (or an equivalent isolation). Query-only. The host calls the LLM and MCP. The agent never touches the vault and never signs. Correctness does not depend on a long-lived background page.

---

## 5. Acceptance checks

Each version's `INDEX.md` must list **hand-test** steps that a human can run. "Works in dev" is not a check.

At least:

* Which `test-web` buttons to press
* What the extension UI should show
* What must still be true (for example, a reload does not resurrect a pending request)

---

## 6. Out of scope and backlog

Each `INDEX.md` has an **Out of scope** section: what this version does not do, and where it went (another version's `INDEX`, or `backlog/`).

Backlog ideas live in [`backlog/INDEX.md`](backlog/INDEX.md). When an idea is scheduled, link it both ways. Do not leave the idea described only in the backlog.

---

## 7. Status

Each `INDEX.md` starts with:

```text
Status: draft | in progress | done | shipped
```

| Status | Meaning |
|--------|---------|
| `draft` | The contract is still being written. Do not implement. |
| `in progress` | Someone is writing code. |
| `done` | Acceptance is met and the version is not installed yet. |
| `shipped` | The user has taken this version. |

The status table in [`README.md`](README.md) is the **source of truth**. Each version's `INDEX.md` status must match that row.

**Shipping.** The user decides when a version ships. On ship, in the same change: set that row and the `INDEX` to `shipped`, and set the shipped version in `version.md`, `wallet/package.json`, `wallet/manifest.config.ts`, and the version sentence in the repo-root `README.md`.

**Do not open the next version on your own.** While the previous version is not `shipped`, do not start a new version directory. If the user asks for one anyway, remind them and let them decide.

**Code changes while the latest version is `shipped` and the next is not opened.** Append the same batch to [`unversioned.md`](unversioned.md) and to the `Next` section of [`changelog.md`](../../changelog.md). Do not invent the next number. The user later folds them into the shipped version, opens the next version, or ships while leaving them unversioned. Docs, privacy policy, and terms are not tracked on the roadmap.

**More changes while a version is `in progress`.** Append that version's `INDEX` and its changelog heading. Do not open another version.

**Push.** The user pushes by hand. Shipping, editing, and committing do not include `git push`. Do not push unless the user asks.

Update [`README.md`](README.md) when a version is added or its status changes. [`changelog.md`](../../changelog.md) records what shipped. It does not replace `INDEX.md`.

---

## 8. Privacy

**Do not write real mnemonics, private keys, passwords, or production secrets** into any tracked file. That includes:

* `how.md` steps and example commands
* `HANDOFF.md` and session notes
* Test fixtures committed to the repo (`test-web/`, `wallet/`, JSON, env samples)
* Screenshots or logs pasted into a contract

Examples use placeholders: `test-password`, `word1 word2 … word12`, `REPLACE_WITH_TEST_PUBKEY`.

Real secrets belong only in local Chrome storage or a password manager, never in git.

---

## 9. HANDOFF

Each version has **one** `HANDOFF.md`:

* **Done this session** — files and decisions written
* **Next session** — the first thing to do, and what not to redo

When the version is `done` or `shipped`, `HANDOFF.md` may shrink to a pointer at `INDEX.md`. Do not leave a second handoff.

---

## 10. Review

How to review, who writes it, and how Tracks run: [`agent-workflow.md`](agent-workflow.md).

---

## 11. What not to write into a contract

* Chat logs ("the user said…")
* A second copy of another version's `how.md` (link it)
* Secrets (see Privacy)
* A line-by-line code review (that belongs in `implementation-review.md`, and only for the current version)

---

## 12. Three day-one rules

1. **Pending does not live in `chrome.storage`.**
2. **Durable state syncs through `chrome.storage.onChanged`.**
3. **Vault keys are not a hard-coded password, and they are not stored in plaintext for long.**
