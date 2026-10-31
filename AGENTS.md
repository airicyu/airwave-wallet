# Airwave Wallet — agent guide

This repo is **Airwave**, a Solana Chrome extension wallet. Later it may add a keyless, query-only isolated agent for reading transactions and programs.

Feature ideas: [`dev-docs/roadmap/backlog/INDEX.md`](dev-docs/roadmap/backlog/INDEX.md).

**Replies to the user are Traditional Chinese written prose.** Proper names, paths, APIs, and file names stay in English.

**Documents default to 繁體中文書面語** unless the user says otherwise, or a spec already requires another language. Shipped version docs at or before 0.47.0 stay as they were written. Domain entries keep their Chinese term names.

---

## Repo layout (intent)

| Path | Role |
|------|------|
| [`wallet/`](wallet/) | Chrome extension (the wallet) |
| [`test-web/`](test-web/) | Minimal Solana web3 dApp for connect and sign checks |
| [`docs/`](docs/README.md) | User docs (guide, features, legal) |
| [`dev-docs/`](dev-docs/README.md) | Engineering docs: contracts, screen rules, demos, domain terms, local setup |
| [`changelog.md`](changelog.md) / [`version.md`](version.md) | Ship log and current shipped version |
| Later, optional: `agent-harness/` (or an equivalent package) | Browser-friendly minimal agent harness (roadmap step 2) |

Do **not** edit a parent `docs/agent-roadmap/` if one exists.

---

## What to read first

| Situation | Read |
|-----------|------|
| Implementing a scheduled version | That version's `dev-docs/roadmap/X.Y.Z/INDEX.md` and its links. Follow [`dev-docs/roadmap/GUIDELINES.md`](dev-docs/roadmap/GUIDELINES.md) and [`dev-docs/roadmap/agent-workflow.md`](dev-docs/roadmap/agent-workflow.md). Source shape follows [`dev-docs/code-design-principles.md`](dev-docs/code-design-principles.md). Screen behavior follows [`dev-docs/ui-design-principles.md`](dev-docs/ui-design-principles.md) unless that INDEX says otherwise |
| User names a version or `/version-delivery` | [`.agents/skills/version-delivery/SKILL.md`](.agents/skills/version-delivery/SKILL.md) |
| How to split files and group folders | [`dev-docs/code-design-principles.md`](dev-docs/code-design-principles.md) |
| Consistent popup behavior | [`dev-docs/ui-design-principles.md`](dev-docs/ui-design-principles.md) |
| Account, address, combined wording | [`dev-docs/DOMAIN.md`](dev-docs/DOMAIN.md). If that version's INDEX overrides a term in plain sentences, the INDEX wins and DOMAIN is updated to match |

**Priority:** a version INDEX decision > GUIDELINES architecture bans > [`dev-docs/code-design-principles.md`](dev-docs/code-design-principles.md) (security, then smallest design, then source layout) > [`dev-docs/ui-design-principles.md`](dev-docs/ui-design-principles.md) (screens only).

---

## Architecture rules

Details are in [`dev-docs/roadmap/GUIDELINES.md`](dev-docs/roadmap/GUIDELINES.md). These hold until an INDEX explicitly replaces one:

1. **Pending requests** live in the service worker (or the hub that version names). UI does not hydrate `chrome.storage` hoping to find the package.
2. **Durable state:** `chrome.storage` is the source of truth. `onChanged` updates UI mirrors. Do not invent a hand-written rehydrate bus as the main sync path.
3. **Custody:** a password-boxed vault encrypted with the user's password. No hardcoded password as a security mechanism. Unlock key material is not persisted in plaintext.
4. **Messages:** typed command plus `requestId`. The result returns only to the originating tab. Do not broadcast to every tab by default.
5. Do **not** RSA-encrypt every inject↔extension operation result.
6. **Dependencies:** keep third-party libraries out of the extension unless the reason is necessary and stated.
7. **Numbers:** do not add, subtract, multiply, or divide amounts, balances, fees, or simulated deltas with JavaScript `number`. Chain integer units (lamports, token base units) are `BigInt` built from strings, never via a JSON `number` first. Decimals use `big.js` (not installed yet; add it the first time a decimal calculation is needed). Do not switch to `decimal.js`.
8. **Agent (if built):** runs in a sandbox with no `chrome.*` (or equivalent isolation); query-only; the host calls the LLM or MCP; it never touches the vault and never signs. Correctness must not depend on a long-lived background page.

Even a vertical slice must still match the request lifecycle, durable-state sync, and custody rules above. Do not "get it running" with storage hydrate or a hardcoded password.

---

## Three-step product order (background)

```text
1. Minimal wallet MVP (wallet + test-web)
2. Minimal agent harness library (browser / extension constraints)
3. Isolated in-wallet agent: query-only reading of transactions and programs
```

Steps 2 and 3 are direction only until an INDEX schedules them. Do not start them and expand scope.

---

## Working habits

- **Do not commit unless the user asks.** **Do not push unless the user asks.** The user pushes by hand. Shipping and committing do not include a push.
- Roadmap and review reports must **not** contain real mnemonics, private keys, passwords, or production secrets (see GUIDELINES privacy).
- Implementation stays in this repo. Prefer `test-web/` for tests. Do not assume an external dApp must change.
- Anything discussed in chat but not written into the roadmap or a contract file **does not exist** for the next agent. Decisions go into files.
- Close a leak, a hostile injection, or a sign path another origin can reach before keeping the solution small. Smallest design applies only after that hole is closed. Those rules are sections 1 and 2 of [`dev-docs/code-design-principles.md`](dev-docs/code-design-principles.md).

### Cutting a version

Version status lives in the table in [`dev-docs/roadmap/README.md`](dev-docs/roadmap/README.md). Each INDEX status matches that row. The shipped version number is the root [`version.md`](version.md), and it equals the latest `shipped` row in that table.

When a version ships, `version.md`, `wallet/package.json`, `wallet/manifest.config.ts`, and the root README version sentence all equal that version. Do not leave a hardcoded older version in the manifest.

When a version is opened (a new INDEX, or `/version-delivery` on a version that is not yet `in progress`), remind the user in the same turn, before implementation, of `wallet/src` files that miss the source-file rules in [`dev-docs/code-design-principles.md`](dev-docs/code-design-principles.md). Count code lines only (blanks and full-line comments do not count), as that file defines. List three groups: a `.ts`, `.tsx`, or `.css` file over 400 code lines; a command file directly under `background/wallet/` (not already inside that command's folder) at 150 code lines or more; a `.ts` file with no English responsibility header. Name the path and the code-line count. This reminder does not block the version and does not start a split unless the user puts that split in the INDEX.

A version proceeds by stating the work, writing it into that version's proposal (INDEX), then changing code. While that happens the version is `in progress`. Only after the user explicitly says ship: mark that README row `shipped`, match the INDEX, and check that [`changelog.md`](changelog.md) has a paragraph for that version. Do not mark shipped, and do not open the next version number, unless the user says ship.

If the previous version is not `shipped`, do not open a new version. This is a soft rule: remind the user, do not hard-block. If they still want it opened, open it.

When the latest version is `shipped` and the next version is not opened, new **code** work is unversioned. Record it in [`dev-docs/roadmap/unversioned.md`](dev-docs/roadmap/unversioned.md) and add one sentence under `Next` at the top of the changelog. Both places list the same changes. The user later chooses: fold them into the version just shipped, open the next version for them, or leave them unversioned after shipping. Do not guess before they choose. Docs, privacy policy, and terms are not tracked on the roadmap.

More changes while a version is in progress go into that version's INDEX and under that version's changelog heading. Do not open the next version.

---

## Links

| Doc | Use |
|-----|-----|
| [README.md](README.md) | Project home (for people) |
| [docs/user-guide.md](docs/user-guide.md) | User guide |
| [docs/features.md](docs/features.md) | Current features |
| [dev-docs/README.md](dev-docs/README.md) | Engineering doc map |
| [dev-docs/setup.md](dev-docs/setup.md) | Local build |
| [docs/README.md](docs/README.md) | User doc map |
| [dev-docs/code-design-principles.md](dev-docs/code-design-principles.md) | Security first, then smallest design, file splits, and folder boundaries |
| [dev-docs/ui-design-principles.md](dev-docs/ui-design-principles.md) | Popup and approval screens |
| [dev-docs/design-demos/](dev-docs/design-demos/) | HTML concept demos, one folder per version |
| [dev-docs/roadmap/README.md](dev-docs/roadmap/README.md) | Roadmap entry |
| [dev-docs/DOMAIN.md](dev-docs/DOMAIN.md) | Domain terms (accounts, addresses, combined) |
| [dev-docs/roadmap/GUIDELINES.md](dev-docs/roadmap/GUIDELINES.md) | How to write a self-sufficient version contract |
| [dev-docs/roadmap/agent-workflow.md](dev-docs/roadmap/agent-workflow.md) | Review gates and Track flow |
