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
  SolanaSignAndSendTransaction,
  type SolanaSignAndSendTransactionFeature,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import type { Wallet } from "@wallet-standard/base";
import bs58 from "bs58";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransaction,
  compileTransactionMessage,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getAddressFromPublicKey,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageEncoder,
  getTransactionDecoder,
  getTransactionEncoder,
  lamports,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Blockhash,
  type Signature,
} from "@solana/kit";
import { createKeyPairFromPrivateKeyBytes } from "@solana/keys";
import { getTransferSolInstruction } from "@solana-program/system";

const DEVNET_RPC = "https://api.devnet.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000n;

const logEl = document.getElementById("log")!;
const statusEl = document.getElementById("status")!;
const btnConnect = document.getElementById("connect") as HTMLButtonElement;
const btnDisconnect = document.getElementById("disconnect") as HTMLButtonElement;
const btnSignMsg = document.getElementById("sign-msg") as HTMLButtonElement;
const btnSignMsgBinary = document.getElementById("sign-msg-binary") as HTMLButtonElement;
const btnSignMsgTx = document.getElementById("sign-msg-tx") as HTMLButtonElement;
const btnSignTx = document.getElementById("sign-tx") as HTMLButtonElement;
const btnSignAndSendTx = document.getElementById("sign-and-send-tx") as HTMLButtonElement;
const btnSignAndSendTxStd = document.getElementById(
  "sign-and-send-tx-std",
) as HTMLButtonElement;
const btnSignAndSendTxStdFail = document.getElementById(
  "sign-and-send-tx-std-fail",
) as HTMLButtonElement;
const btnSignTxFail = document.getElementById("sign-tx-fail") as HTMLButtonElement;
const btnAirdrop = document.getElementById("airdrop") as HTMLButtonElement;

function log(...args: unknown[]): void {
  logEl.textContent += `${args.map(String).join(" ")}\n`;
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function rpc() {
  return createSolanaRpc(DEVNET_RPC);
}

function findAirwave(): Wallet | undefined {
  return getWallets()
    .get()
    .find((w) => w.name === "Airwave");
}

function enableSigning(addressStr: string | undefined): void {
  const ok = Boolean(addressStr);
  btnSignMsg.disabled = !ok;
  btnSignMsgBinary.disabled = !ok;
  btnSignMsgTx.disabled = !ok;
  btnSignTx.disabled = !ok;
  btnSignAndSendTx.disabled = !ok;
  btnSignAndSendTxStd.disabled = !ok;
  btnSignAndSendTxStdFail.disabled = !ok;
  btnSignTxFail.disabled = !ok;
  btnAirdrop.disabled = !ok;
  if (addressStr) setStatus(`已連線：${addressStr}`);
}

let changeSubscribed = false;

function subscribeChange(wallet: Wallet): void {
  if (changeSubscribed) return;
  const events = wallet.features[StandardEvents] as
    | StandardEventsFeature[typeof StandardEvents]
    | undefined;
  events?.on("change", (props) => {
    const addr = props.accounts?.[0]?.address;
    log("account change:", addr ?? "(empty)");
    enableSigning(addr);
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

async function randomAddress(): Promise<ReturnType<typeof address>> {
  const seed = crypto.getRandomValues(new Uint8Array(32));
  const keyPair = await createKeyPairFromPrivateKeyBytes(seed, true);
  return address(await getAddressFromPublicKey(keyPair.publicKey));
}

async function buildSelfTransferTx(
  fromAddress: ReturnType<typeof address>,
  lamportsAmount: bigint,
): Promise<Uint8Array> {
  const latest = await rpc().getLatestBlockhash({ commitment: "confirmed" }).send();
  const txMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(fromAddress, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: latest.value.blockhash,
          lastValidBlockHeight: latest.value.lastValidBlockHeight,
        },
        m,
      ),
    (m) =>
      appendTransactionMessageInstruction(
        getTransferSolInstruction({
          source: createNoopSigner(fromAddress),
          destination: fromAddress,
          amount: lamportsAmount,
        }),
        m,
      ),
  );
  const tx = compileTransaction(txMessage);
  return new Uint8Array(getTransactionEncoder().encode(tx));
}

async function syntheticTxMessageBytes(): Promise<Uint8Array> {
  const payer = await randomAddress();
  const compiled = compileTransactionMessage(
    pipe(
      createTransactionMessage({ version: 0 }),
      (m) => setTransactionMessageFeePayer(payer, m),
      (m) =>
        setTransactionMessageLifetimeUsingBlockhash(
          {
            blockhash: "11111111111111111111111111111111" as Blockhash,
            lastValidBlockHeight: 0n,
          },
          m,
        ),
      (m) =>
        appendTransactionMessageInstruction(
          getTransferSolInstruction({
            source: createNoopSigner(payer),
            destination: payer,
            amount: 0n,
          }),
          m,
        ),
    ),
  );
  return new Uint8Array(getCompiledTransactionMessageEncoder().encode(compiled));
}

async function confirmSignature(signature: string): Promise<void> {
  const client = rpc();
  const start = Date.now();
  while (Date.now() - start < 60_000) {
    const st = await client
      .getSignatureStatuses([signature as Signature], { searchTransactionHistory: true })
      .send();
    const val = st.value[0];
    if (val?.confirmationStatus === "confirmed" || val?.confirmationStatus === "finalized") return;
    if (val?.err) throw new Error("confirmation failed");
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("confirmation timeout");
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
    const addr = accounts[0]?.address;
    log("Connected:", addr);
    enableSigning(addr);
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

btnSignMsgBinary.addEventListener("click", async () => {
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
    const message = new Uint8Array([0xff, 0x00, 0xab, 0xcd, 0x01]);
    const [out] = await signMessage.signMessage({ account, message });
    log("Binary sign signature base58:", bs58.encode(out.signature));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("Sign binary error:", err.code ?? "", err.message ?? e);
  }
});

btnSignMsgTx.addEventListener("click", async () => {
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
    const message = await syntheticTxMessageBytes();
    await signMessage.signMessage({ account, message });
    log("Unexpected: tx-as-message should not succeed");
  } catch (e) {
    const err = e as Error & { code?: string };
    log("Sign tx-as-message error:", err.code ?? "", err.message ?? e);
  }
});

btnAirdrop.addEventListener("click", async () => {
  let connectedAddress: string | undefined;
  btnAirdrop.disabled = true;
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as
      | StandardConnectFeature[typeof StandardConnect]
      | undefined;
    if (!connect) return;
    const { accounts } = await connect.connect({ silent: true });
    const account = accounts[0];
    if (!account) throw new Error("no account");
    connectedAddress = account.address;

    const client = rpc();
    const owner = address(account.address);
    const before = await client.getBalance(owner, { commitment: "confirmed" }).send();
    log("Requesting devnet airdrop (1 SOL) to", account.address);
    const signature = await client.requestAirdrop(owner, lamports(LAMPORTS_PER_SOL)).send();
    log("Airdrop signature:", signature);
    await confirmSignature(signature);
    const after = await client.getBalance(owner, { commitment: "confirmed" }).send();
    log(
      "Balance:",
      `${Number(before.value) / Number(LAMPORTS_PER_SOL)} → ${Number(after.value) / Number(LAMPORTS_PER_SOL)} SOL`,
    );
  } catch (e) {
    log(
      "Airdrop error:",
      e instanceof Error ? e.message : e,
      "(devnet 有速率限制，稍後再試)",
    );
  } finally {
    enableSigning(connectedAddress);
  }
});

btnSignTxFail.addEventListener("click", async () => {
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

    const tx = await buildSelfTransferTx(address(account.address), 10n * LAMPORTS_PER_SOL);

    const [out] = await signTx.signTransaction({
      account,
      transaction: tx,
    });
    log("Signed fail-case tx base58:", bs58.encode(out.signedTransaction));
  } catch (e) {
    log("Sign fail-case tx error:", e instanceof Error ? e.message : e);
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

    const tx = await buildSelfTransferTx(address(account.address), 0n);

    const [out] = await signTx.signTransaction({
      account,
      transaction: tx,
    });
    log("Signed tx base58:", bs58.encode(out.signedTransaction));
  } catch (e) {
    log("Sign tx error:", e instanceof Error ? e.message : e);
  }
});

btnSignAndSendTx.addEventListener("click", async () => {
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

    const tx = await buildSelfTransferTx(address(account.address), 0n);

    const [out] = await signTx.signTransaction({
      account,
      transaction: tx,
    });
    log("Signed for send, broadcasting…");
    const client = rpc();
    const wire = getBase64EncodedWireTransaction(
      getTransactionDecoder().decode(out.signedTransaction),
    );
    const signature = await client
      .sendTransaction(wire, {
        encoding: "base64",
        skipPreflight: false,
        preflightCommitment: "confirmed",
      })
      .send();
    log("Broadcast signature:", signature);
    await confirmSignature(signature);
    log("Confirmed:", signature);
  } catch (e) {
    log("Sign and send error:", e instanceof Error ? e.message : e);
  }
});

btnSignAndSendTxStd.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as
      | StandardConnectFeature[typeof StandardConnect]
      | undefined;
    const signAndSend = wallet.features[SolanaSignAndSendTransaction] as
      | SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction]
      | undefined;
    if (!connect) return;
    if (!signAndSend) {
      throw new Error(`wallet 無 ${SolanaSignAndSendTransaction} feature`);
    }

    const { accounts } = await connect.connect({ silent: true });
    const account = accounts[0];
    if (!account) throw new Error("no account");
    if (account.chains[0] !== "solana:devnet") {
      throw new Error("test-web 只測 Devnet。請在錢包 Settings 把網路改成 Devnet 再按代送。");
    }

    const tx = await buildSelfTransferTx(address(account.address), 0n);

    const [out] = await signAndSend.signAndSendTransaction({
      account,
      chain: "solana:devnet",
      transaction: tx,
    });
    log("signAndSendTransaction ok:", bs58.encode(out.signature));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("signAndSendTransaction error:", err.code ?? "", err.message ?? e);
  }
});

btnSignAndSendTxStdFail.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as
      | StandardConnectFeature[typeof StandardConnect]
      | undefined;
    const signAndSend = wallet.features[SolanaSignAndSendTransaction] as
      | SolanaSignAndSendTransactionFeature[typeof SolanaSignAndSendTransaction]
      | undefined;
    if (!connect) return;
    if (!signAndSend) {
      throw new Error(`wallet 無 ${SolanaSignAndSendTransaction} feature`);
    }

    const { accounts } = await connect.connect({ silent: true });
    const account = accounts[0];
    if (!account) throw new Error("no account");
    if (account.chains[0] !== "solana:devnet") {
      throw new Error("test-web 只測 Devnet。請在錢包 Settings 把網路改成 Devnet 再按代送。");
    }

    const tx = await buildSelfTransferTx(address(account.address), 10n * LAMPORTS_PER_SOL);
    log("signAndSendTransaction fail-case: 自轉 10 SOL，預期模擬／鏈上失敗");

    const [out] = await signAndSend.signAndSendTransaction({
      account,
      chain: "solana:devnet",
      transaction: tx,
    });
    log("Unexpected: fail-case signAndSendTransaction succeeded:", bs58.encode(out.signature));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("signAndSendTransaction fail-case:", err.code ?? "", err.message ?? e);
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
