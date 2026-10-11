# Airwave Wallet

**Airwave** is a non-custodial Solana Chrome extension wallet.

Private keys stay on this machine: they are encrypted with your wallet password and written to extension storage. Sites and the isolated analysis environment never see the vault. The longer-term direction is **keyless, query-only** interpretation of transactions and contracts — analysis, never signing on your behalf.

This is a developer preview. Build from this repo and load it into Chrome. It is not on the Chrome Web Store.

| | |
|---|---|
| Version | [`version.md`](version.md) (currently 0.32.0) |
| Changelog | [`changelog.md`](changelog.md) |
| Disclaimer / terms | [`docs/legal/`](docs/legal/) |

---

## Start here

| If you want to… | Read |
|-----------------|------|
| Use the wallet | [docs/user-guide.md](docs/user-guide.md) (Helius RPC / API, optional OpenRouter transaction AI) |
| See what it can do | [docs/features.md](docs/features.md) |
| Build or change the code | [dev-docs/setup.md](dev-docs/setup.md) |

Rules and architecture constraints for coding agents live in [AGENTS.md](AGENTS.md), not on this page.

---

## This repository

```text
airwave-wallet/
├── wallet/          Chrome extension
├── test-web/        Minimal dApp for connect / sign tests
├── docs/            User guides and legal
├── dev-docs/        Roadmap, design, domain, research, setup
├── AGENTS.md
├── version.md
└── changelog.md
```

Product docs: [docs/README.md](docs/README.md).  
Engineering process: [dev-docs/README.md](dev-docs/README.md).

---

## License

Code is licensed under the [Apache License 2.0](LICENSE) (Copyright 2026 Airic Yu).
