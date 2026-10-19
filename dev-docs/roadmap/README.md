# Airwave Wallet roadmap

This directory is the version contract for **airwave-wallet**. An agent with no chat history starts from here.

| File | Answers |
|------|---------|
| [GUIDELINES.md](./GUIDELINES.md) | How to write a self-sufficient roadmap; paths, architecture bans, privacy |
| [../DOMAIN.md](../DOMAIN.md) | Domain terms: stored account, signing, watch, combined, address, main address |
| [../design-principles.md](../design-principles.md) | Popup UI rules (when to write, icon buttons, long strings). Used when an INDEX is silent |
| [../design-demos/](../design-demos/) | Informal HTML concept demos. On conflict, that version's INDEX wins |
| [agent-workflow.md](./agent-workflow.md) | Who reviews, when to write HANDOFF, what to test between Tracks |
| [unversioned.md](./unversioned.md) | Code changes after the latest version shipped and before the next version is opened. Docs, policy, and terms are not listed. Status in the table below is the source of truth |
| `.agents/skills/version-delivery/` | Deliver one version: design-review gate, Track implementation, ship checklist |

| Version | Status | Summary |
|---------|--------|---------|
| [0.1.0](./0.1.0/INDEX.md) | shipped | Minimal wallet MVP + test-web |
| [0.2.0](./0.2.0/INDEX.md) | shipped | Account lifecycle, home assets, disconnect |
| [0.3.0](./0.3.0/INDEX.md) | shipped | Popup plan A. Holdings still RPC. USD is "—" |
| [0.4.0](./0.4.0/INDEX.md) | shipped | Helius DAS holdings (name, icon, floor) plus Tokens v2 check, score, and USD override |
| [0.5.0](./0.5.0/INDEX.md) | shipped | Combined wallet account |
| [0.6.0](./0.6.0/INDEX.md) | shipped | Mnemonic import. Generate a 12-word wallet or a burner |
| [0.7.0](./0.7.0/INDEX.md) | shipped | Home balances via RPC and Token-2022. Jupiter overrides names |
| [0.8.0](./0.8.0/INDEX.md) | shipped | Change wallet password. Settings hub. Class-B password field |
| [0.9.0](./0.9.0/INDEX.md) | shipped | Readable `signMessage` approval. Unlock inside the popout. Accent focus on text fields |
| [0.10.0](./0.10.0/INDEX.md) | shipped | `signTransaction` approval: simulated deltas on stage, details collapsed. 0.10.1 uses pre/post balances, no pre-fetch |
| [0.11.0](./0.11.0/INDEX.md) | shipped | Editable CU on an unsigned tx. Fee card. Default CU price. Account and data hex in details |
| [0.12.0](./0.12.0/INDEX.md) | shipped | Token detail. Single-signer send. After the existing approval the wallet waits for confirmed |
| [0.13.0](./0.13.0/INDEX.md) | shipped | Shared approval shell. walletSend inside the popup. Pending confirm then confirmed. Sites still use a popout |
| [0.14.0](./0.14.0/INDEX.md) | shipped | Source directories. wallet-handlers and approval pure functions split. Behavior matches 0.13.0 |
| [0.15.0](./0.15.0/INDEX.md) | shipped | Popup is Vite React. Approval shell still a vanilla bridge. Behavior matches 0.14.0 |
| [0.16.0](./0.16.0/INDEX.md) | shipped | Popup React cleanup. Drop session and full-tree ticks. Behavior matches 0.15.0 |
| [0.17.0](./0.17.0/INDEX.md) | shipped | Wallet Standard `solana:signAndSendTransaction`. Popout confirming then confirmed for 1s |
| [0.18.0](./0.18.0/INDEX.md) | shipped | Home Activity: latest 20. Row end opens Solscan |
| [0.19.0](./0.19.0/INDEX.md) | shipped | Static decode of sign details. Expected delta opens Explorer Inspector |
| [0.20.0](./0.20.0/INDEX.md) | shipped | Full move to `@solana/kit`. Behavior matches 0.19.0 |
| [0.21.0](./0.21.0/INDEX.md) | shipped | Close empty token accounts and reclaim rent SOL |
| [0.22.0](./0.22.0/INDEX.md) | shipped | Home pill, Devnet badge, copy feedback, refresh cooldown, Activity Orb, close-empty confirming, Kit CU estimate |
| [0.23.0](./0.23.0/INDEX.md) | shipped | Wallet UI languages (Traditional Chinese, Simplified Chinese, English) and system dual fonts (plan B) |
| [0.24.0](./0.24.0/INDEX.md) | shipped | Source-file responsibility splits (commands, simulate, close-empty). Behavior matches 0.23.0 |
| [0.25.0](./0.25.0/INDEX.md) | shipped | Toolbar popup and Chrome side panel switch. While the side panel is alive, site approval stays in the shell |
| [0.26.0](./0.26.0/INDEX.md) | shipped | Import preview, combined expand, unlock focus, kind icons, card drag, schema-generation skeleton |
| [0.27.0](./0.27.0/INDEX.md) | shipped | Custody and sign boundary: session has no plaintext secret, local CU, dApp origin / chain / connection |
| [0.28.0](./0.28.0/INDEX.md) | shipped | Home Activity: load older rows at the bottom, local time, token icon and symbol |
| [0.29.0](./0.29.0/INDEX.md) | shipped | Mainnet RPC required. Official public node is not a fallback. First-run language, password, and RPC guide |
| [0.30.0](./0.30.0/INDEX.md) | shipped | Sign AI: sandbox harness, Decisions levels, Settings OpenRouter |
| [0.31.0](./0.31.0/INDEX.md) | shipped | Vite 8, plugin-react 5, TypeScript 7. Service-worker listeners do not run on extension pages |
| [0.32.0](./0.32.0/INDEX.md) | shipped | Approval simulate uses the transaction blockhash. Expected changes refresh every 3 seconds. Fee computed locally. Site centered and copyable. AI single card and timeout |
| [0.33.0](./0.33.0/INDEX.md) | shipped | Expected-delta rows: Jupiter icon and symbol. Fixed trust-shield column. Anti-spoof primary label |
| [0.34.0](./0.34.0/INDEX.md) | shipped | Sign AI preflight in the prompt. OpenRouter drops only decode and simulate. AI ignores an expired approval blockhash |
| [0.35.0](./0.35.0/INDEX.md) | shipped | Window title and `html lang` follow Settings. One language, no `Airwave —` prefix |
| [0.36.0](./0.36.0/INDEX.md) | shipped | Sign CU: do not rewrite a limit or price the dApp already set. Apply CU is what sends the simulate payload |
| [0.37.0](./0.37.0/INDEX.md) | shipped | Security: an in-flight requestId cannot be swapped. A tab that left the origin no longer receives the public key |
| [0.38.0](./0.38.0/INDEX.md) | shipped | Home and approval delta rows share the trust shield. `organicScore` > 0 sits on the shield's lower right |
| [0.39.0](./0.39.0/INDEX.md) | shipped | Closing the side panel rejects a pending sign. AI settings report and grade can choose Other |
| [0.40.0](./0.40.0/INDEX.md) | shipped | Site connect consent (site and account, primary button Connect) |
| [0.41.0](./0.41.0/INDEX.md) | shipped | Generate mnemonic or burner: draft public key, dice reroll, no mnemonic copy |
| [0.42.0](./0.42.0/INDEX.md) | shipped | Combined send reuses the existing send. Spendable amount is the current wallet balance |
| [0.43.0](./0.43.0/INDEX.md) | shipped | Address book: name plus address, drag to reorder. Send can pick wallet or address book full-screen, or paste |
| [0.44.0](./0.44.0/INDEX.md) | shipped | Tx AI: report and grade can use the default chain or a custom one. OpenRouter completion fallback |
| [0.45.0](./0.45.0/INDEX.md) | shipped | Wallet Standard `icon` embeds `public/icon128.png`. The dApp connect picker no longer shows a red square |
| [0.46.0](./0.46.0/INDEX.md) | shipped | Secret rows use a pencil until edit. Network is in the hamburger menu |
| [0.47.0](./0.47.0/INDEX.md) | shipped | Account list, combined manage, and address book: rename sub-screen, member names and order, kind colors |
| [0.47.1](./0.47.1/INDEX.md) | shipped | dApp sign without `chain` uses the wallet's selected cluster |
| [0.48.0](./0.48.0/INDEX.md) | shipped | Idle auto-lock, wallet lock settings UI, API key edit actions, Network picker |

**Version numbers:** a **patch** on `x.y.z` (for example **0.3.1**) is only a bugfix for that minor. It does not schedule a new feature. A new feature is the next **minor** (0.3.0 → 0.4.0 → 0.5.0).

Ideas live in [backlog/INDEX.md](./backlog/INDEX.md). After one is scheduled, link it both ways with that version's INDEX. When an INDEX is silent, follow the architecture bans in [GUIDELINES.md](./GUIDELINES.md).
