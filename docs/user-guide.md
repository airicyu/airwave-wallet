# User guide

For people who want to **start using Airwave**. Build steps: [dev-docs/setup.md](../dev-docs/setup.md). Feature list: [features.md](./features.md).

Airwave is a developer preview: build from this repo and load it as an unpacked Chrome extension. It is not a Chrome Web Store listing.

In-product disclaimer, terms, and privacy policy: [legal/disclaimer.md](./legal/disclaimer.md), [legal/terms-of-use.md](./legal/terms-of-use.md), [legal/privacy-policy.md](./legal/privacy-policy.md).

**Do not** paste seed phrases, private keys, the wallet password, or any API key into chat, issues, or this repository.

---

## 1. Load it into Chrome

1. Build `wallet/dist` using [dev-docs/setup.md](../dev-docs/setup.md).
2. Chrome → **Extensions** → turn on **Developer mode** → **Load unpacked** → choose `wallet/dist`.
3. Pin Airwave on the toolbar and open the popup.

You can switch to the Chrome **side panel** from the Home chrome. While the side panel is open, site approvals stay inside the wallet shell instead of opening a separate window.

---

## 2. First launch

The order is fixed:

1. **Choose a language** (繁體中文 / 简体中文 / English).
2. **Set a wallet password** (at least 8 characters). This only locks the local vault. It is not an on-chain password. If you forget it, you cannot decrypt existing accounts.
3. **Mainnet RPC guide** (if Mainnet is not ready): Mainnet requires your own JSON-RPC. The wallet will not fall back to the public official endpoint. You can skip and use Devnet first; after skip, Home on Mainnet stays blocked until you set Settings → RPC.
4. **Create or import an account**: generate a 12-word wallet, import a seed (standard or CLI / Ledger), or add a watch-only address. Signing needs a signing account and an unlocked session.

The seed phrase is shown once. Write it down offline. Do not screenshot it into cloud storage.

---

## 3. Get a Helius API key and put it in the wallet

[Helius](https://www.helius.dev/) offers a free API key. The same key is used in **two different fields** in Airwave. They are not interchangeable.

### 3.1 Mainnet RPC (balances, simulation, send — required)

Without your own Mainnet RPC, Home will not load balances and you cannot send.

1. Sign up at [Helius](https://www.helius.dev/) and create an API key in the dashboard.
2. Copy the dashboard **RPC URL** (shaped like `https://mainnet.helius-rpc.com/?api-key=…`). This is **not** the Settings **Helius API URL** field.
3. In the wallet, open **Settings → RPC** (or **Set RPC** on the first-run guide): add that URL and select it as the current Mainnet RPC.

Devnet does not need a custom RPC; the built-in public endpoint is enough.

### 3.2 Helius API URL (token names / Activity — optional)

Settings → **API keys** → **Helius API URL**.

You can paste:

- the dashboard API URL (`https://…` with `api-key`), or
- the key alone (official Helius keys that start with `77` are accepted).

This field powers **DAS holdings** (names, icons) and parsed Mainnet **Activity**. It is **not** JSON-RPC and is not a fallback for 3.1. The Jupiter API key is on the same page, also optional, and overrides token names.

A stored value shows as `••••••`; Reveal shows the full string. It writes on blur or the row confirm control. There is no page-level Save.

---

## 4. (Optional) Turn on transaction AI analysis

When you sign a transaction, the wallet can run a read-only analysis in an isolated sandbox and show a risk index plus a report on the approval page. It is off by default. Both of these must be true:

- Settings → **AI settings** → **On**
- **OpenRouter API key** filled on the same screen

Steps:

1. Sign up at [OpenRouter](https://openrouter.ai/) and create an API key (dashboard → Keys).
2. Wallet **Settings → AI settings**: paste the key (`••••••` / Reveal, same as other secrets).
3. Turn **On**.
4. (Optional) Under **Report model** and **Grading model**, choose **Default** (built-in ordered chain for this wallet version; shown read-only) or **Custom** (up to five OpenRouter model ids in fallback order). Leaving the AI settings screen saves a custom chain when at least one id is valid.

Then `signTransaction`, `signAndSendTransaction`, or an in-wallet send shows an **AI analysis** row under the approval title. Analysis never blocks approve or reject. `signMessage` is not analyzed.

The key lives in local settings, not the vault. The report is not persisted; it is discarded when that pending request ends.

---

## 5. Everyday use

| You want to… | Do this |
|--------------|---------|
| Unlock / lock | Open the wallet and enter the password; lock from the menu |
| See holdings and activity | Home Tokens / Activity (Mainnet needs RPC; Activity is richer with Helius) |
| Send a token | Home → that token → send; confirm in the current popup or side panel |
| Reclaim rent from empty accounts | Home Tokens: scan and close zero-balance token accounts |
| Connect a site | The site calls Wallet Standard → approve connect. That origin can then request signatures |
| Sign a message / transaction | Approval window or side-panel overlay. Transactions show expected changes, fees, and editable CU. An expired blockhash fails simulation; you can still approve (the chain may reject it the same way) |
| Switch account | Accounts; connected sites get account change — no need to Connect again |
| Change network | Settings → Network. Home blocks on Mainnet until RPC is set |

Watch-only accounts can connect; they cannot sign.
