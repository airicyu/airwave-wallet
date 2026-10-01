import { getWallets } from "@wallet-standard/app";
import {
  StandardConnect,
  StandardDisconnect,
  StandardEvents,
  type StandardConnectFeature,
  type StandardDisconnectFeature,
  type StandardEventsFeature,
} from "@wallet-standard/features";
import {
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import type { Wallet } from "@wallet-standard/base";
import bs58 from "bs58";
import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

const logEl = document.getElementById("log")!;
const statusEl = document.getElementById("status")!;
const btnConnect = document.getElementById("connect") as HTMLButtonElement;
const btnDisconnect = document.getElementById("disconnect") as HTMLButtonElement;
const btnSignMsg = document.getElementById("sign-msg") as HTMLButtonElement;
const btnSignTx = document.getElementById("sign-tx") as HTMLButtonElement;

function log(...args: unknown[]): void {
  logEl.textContent += `${args.map(String).join(" ")}\n`;
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function findAirwave(): Wallet | undefined {
  return getWallets()
    .get()
    .find((w) => w.name === "Airwave");
}

function enableSigning(address: string | undefined): void {
  const ok = Boolean(address);
  btnSignMsg.disabled = !ok;
  btnSignTx.disabled = !ok;
  if (address) setStatus(`已連線：${address}`);
}

let changeSubscribed = false;

function subscribeChange(wallet: Wallet): void {
  if (changeSubscribed) return;
  const events = wallet.features[StandardEvents] as
    | StandardEventsFeature[typeof StandardEvents]
    | undefined;
  events?.on("change", (props) => {
    const address = props.accounts?.[0]?.address;
    log("account change:", address ?? "(empty)");
    enableSigning(address);
  });
  changeSubscribed = true;
}

function waitForAirwave(timeoutMs = 5000): Promise<Wallet> {
  const existing = findAirwave();
  if (existing) return Promise.resolve(existing);
  return new Promise((resolve, reject) => {
    const api = getWallets();
    const timer = setTimeout(() => {
      off();
      reject(new Error("逾時：找不到 Airwave（請確認已載入未封裝擴充）"));
    }, timeoutMs);
    const off = api.on("register", () => {
      const w = findAirwave();
      if (w) {
        clearTimeout(timer);
        off();
        resolve(w);
      }
    });
  });
}

btnDisconnect.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const disconnect = wallet.features[StandardDisconnect] as
      | StandardDisconnectFeature[typeof StandardDisconnect]
      | undefined;
    if (!disconnect) {
      log("wallet 無 disconnect feature");
      return;
    }
    await disconnect.disconnect();
    log("Disconnected");
    enableSigning(undefined);
    setStatus("已斷開連線");
  } catch (e) {
    log("Disconnect error:", e instanceof Error ? e.message : e);
  }
});

btnConnect.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    subscribeChange(wallet);
    const connect = wallet.features[StandardConnect] as
      | StandardConnectFeature[typeof StandardConnect]
      | undefined;
    if (!connect) {
      log("wallet 無 connect feature");
      return;
    }
    const { accounts } = await connect.connect();
    const address = accounts[0]?.address;
    log("Connected:", address);
    enableSigning(address);
  } catch (e) {
    log("Connect error:", e instanceof Error ? e.message : e);
  }
});

btnSignMsg.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as
      | StandardConnectFeature[typeof StandardConnect]
      | undefined;
    const signMessage = wallet.features[SolanaSignMessage] as
      | SolanaSignMessageFeature[typeof SolanaSignMessage]
      | undefined;
    if (!connect || !signMessage) return;
    const { accounts } = await connect.connect({ silent: true });
    const account = accounts[0];
    if (!account) throw new Error("no account");
    const message = new TextEncoder().encode("Hello from Airwave test-web");
    const [out] = await signMessage.signMessage({ account, message });
    log("Signature base58:", bs58.encode(out.signature));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("Sign message error:", err.code ?? "", err.message ?? e);
  }
});

btnSignTx.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as
      | StandardConnectFeature[typeof StandardConnect]
      | undefined;
    const signTx = wallet.features[SolanaSignTransaction] as
      | SolanaSignTransactionFeature[typeof SolanaSignTransaction]
      | undefined;
    if (!connect || !signTx) return;

    const { accounts } = await connect.connect({ silent: true });
    const account = accounts[0];
    if (!account) throw new Error("no account");

    const connection = new Connection("https://api.devnet.solana.com");
    const from = new PublicKey(account.address);
    const { blockhash } = await connection.getLatestBlockhash();
    const msg = new TransactionMessage({
      payerKey: from,
      recentBlockhash: blockhash,
      instructions: [
        SystemProgram.transfer({
          fromPubkey: from,
          toPubkey: from,
          lamports: 0,
        }),
      ],
    }).compileToV0Message();
    const tx = new VersionedTransaction(msg);

    const [out] = await signTx.signTransaction({
      account,
      transaction: tx.serialize(),
    });
    log("Signed tx base58:", bs58.encode(out.signedTransaction));
  } catch (e) {
    log("Sign tx error:", e instanceof Error ? e.message : e);
  }
});

void waitForAirwave()
  .then((w) => {
    subscribeChange(w);
    setStatus("偵測到 Airwave，可按 Connect");
    log("Wallet ready:", w.name);
  })
  .catch((e) => {
    setStatus("尚未偵測到 Airwave");
    log(e instanceof Error ? e.message : String(e));
  });
