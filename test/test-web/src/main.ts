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
  SolanaSignIn,
  type SolanaSignInFeature,
  SolanaSignMessage,
  type SolanaSignMessageFeature,
  SolanaSignOffchainMessage,
  type SolanaSignOffchainMessageFeature,
  SolanaSignTransaction,
  type SolanaSignTransactionFeature,
} from "@solana/wallet-standard-features";
import type { Wallet } from "@wallet-standard/base";
import bs58 from "bs58";
import {
  address,
  type Address,
  appendTransactionMessageInstruction,
  compileTransaction,
  compileTransactionMessage,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  generateKeyPairSigner,
  getAddressEncoder,
  getAddressFromPublicKey,
  getProgramDerivedAddress,
  getBase64EncodedWireTransaction,
  getCompiledTransactionMessageEncoder,
  getTransactionDecoder,
  getTransactionEncoder,
  lamports,
  partiallySignTransaction,
  pipe,
  setTransactionMessageComputeUnitLimit,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  setTransactionMessageLoadedAccountsDataSizeLimit,
  setTransactionMessagePriorityFeeLamports,
  type Blockhash,
  type Signature,
} from "@solana/kit";
import { createKeyPairFromPrivateKeyBytes } from "@solana/keys";
import {
  getAdvanceNonceAccountInstruction,
  getCreateAccountInstruction,
  getInitializeNonceAccountInstruction,
  getNonceSize,
  getTransferSolInstruction,
  fetchMaybeNonce,
  NonceState,
} from "@solana-program/system";
import { AccountRole, type Instruction } from "@solana/instructions";

const query = new URLSearchParams(location.search);
const DEFAULT_DEVNET_RPC = "https://api.devnet.solana.com";
const DEFAULT_MAINNET_RPC = "https://api.mainnet-beta.solana.com";
const LAMPORTS_PER_SOL = 1_000_000_000n;

type SolanaChain = "solana:devnet" | "solana:mainnet";

const logEl = document.getElementById("log")!;
const statusEl = document.getElementById("status")!;
const clusterEl = document.getElementById("cluster")!;
const rpcDevnetInput = document.getElementById("rpc-devnet") as HTMLInputElement;
const rpcMainnetInput = document.getElementById("rpc-mainnet") as HTMLInputElement;
const RPC_DEVNET_KEY = "airwave-test-web-rpc-devnet";
const RPC_MAINNET_KEY = "airwave-test-web-rpc-mainnet";

function storedRpc(key: string, queryValue: string | null, fallback: string): string {
  const fromQuery = queryValue?.trim();
  if (fromQuery) return fromQuery;
  const saved = sessionStorage.getItem(key)?.trim();
  return saved || fallback;
}

rpcDevnetInput.value = storedRpc(RPC_DEVNET_KEY, query.get("rpc"), DEFAULT_DEVNET_RPC);
rpcMainnetInput.value = storedRpc(RPC_MAINNET_KEY, query.get("otherRpc"), DEFAULT_MAINNET_RPC);

function rememberRpc(): void {
  sessionStorage.setItem(RPC_DEVNET_KEY, rpcDevnetInput.value.trim());
  sessionStorage.setItem(RPC_MAINNET_KEY, rpcMainnetInput.value.trim());
}
let sessionChain: SolanaChain | null = null;
const btnConnect = document.getElementById("connect") as HTMLButtonElement;
const btnDisconnect = document.getElementById("disconnect") as HTMLButtonElement;
const btnSignMsg = document.getElementById("sign-msg") as HTMLButtonElement;
const btnSignMsgBinary = document.getElementById("sign-msg-binary") as HTMLButtonElement;
const btnSignMsgTx = document.getElementById("sign-msg-tx") as HTMLButtonElement;
const btnSignOffchain = document.getElementById("sign-offchain") as HTMLButtonElement;
const btnSignInShort = document.getElementById("sign-in-short") as HTMLButtonElement;
const btnSignInFull = document.getElementById("sign-in-full") as HTMLButtonElement;
const btnSignTx = document.getElementById("sign-tx") as HTMLButtonElement;
const btnSignAndSendTx = document.getElementById("sign-and-send-tx") as HTMLButtonElement;
const btnSignAndSendTxStd = document.getElementById(
  "sign-and-send-tx-std",
) as HTMLButtonElement;
const btnSignAndSendTxStdFail = document.getElementById(
  "sign-and-send-tx-std-fail",
) as HTMLButtonElement;
const btnSignTxFail = document.getElementById("sign-tx-fail") as HTMLButtonElement;
const btnSignTxClusterMismatch = document.getElementById(
  "sign-tx-cluster-mismatch",
) as HTMLButtonElement;
const btnSignTxV1 = document.getElementById("sign-tx-v1") as HTMLButtonElement;
const btnSignTxV1NoFee = document.getElementById("sign-tx-v1-no-fee") as HTMLButtonElement;
const btnSignTxV1ZeroFee = document.getElementById("sign-tx-v1-zero-fee") as HTMLButtonElement;
const btnSignTxV1NoCu = document.getElementById("sign-tx-v1-no-cu") as HTMLButtonElement;
const btnSignTxV1Signed = document.getElementById("sign-tx-v1-signed") as HTMLButtonElement;
const btnSignAndSendTxV1 = document.getElementById("sign-and-send-tx-v1") as HTMLButtonElement;
const btnAirdrop = document.getElementById("airdrop") as HTMLButtonElement;
const btnSignTxSuspicious = document.getElementById("sign-tx-suspicious") as HTMLButtonElement;
const btnSignTxNonce = document.getElementById("sign-tx-nonce") as HTMLButtonElement;
const btnSignTxSteal = document.getElementById("sign-tx-steal") as HTMLButtonElement;

function log(...args: unknown[]): void {
  logEl.textContent += `${args.map(String).join(" ")}\n`;
}

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function chainOf(chains: readonly string[]): SolanaChain {
  return chains[0] === "solana:mainnet" ? "solana:mainnet" : "solana:devnet";
}

function activeChain(): SolanaChain {
  return sessionChain ?? "solana:devnet";
}

function rpcUrlFor(chain: SolanaChain): string {
  const input = chain === "solana:mainnet" ? rpcMainnetInput : rpcDevnetInput;
  const fallback = chain === "solana:mainnet" ? DEFAULT_MAINNET_RPC : DEFAULT_DEVNET_RPC;
  return input.value.trim() || fallback;
}

function rpc() {
  return createSolanaRpc(rpcUrlFor(activeChain()));
}

function showCluster(): void {
  if (!sessionChain) {
    clusterEl.textContent = "尚未連線";
    return;
  }
  const label = sessionChain === "solana:mainnet" ? "Mainnet" : "Devnet";
  clusterEl.textContent = `${label}（${rpcUrlFor(sessionChain)}）`;
}

function onRpcInput(): void {
  rememberRpc();
  showCluster();
}

rpcDevnetInput.addEventListener("input", onRpcInput);
rpcMainnetInput.addEventListener("input", onRpcInput);

function findAirwave(): Wallet | undefined {
  return getWallets()
    .get()
    .find((w) => w.name === "Airwave");
}

function enableSigning(addressStr: string | undefined, chains?: readonly string[]): void {
  sessionChain = addressStr && chains ? chainOf(chains) : addressStr ? sessionChain : null;
  showCluster();
  const ok = Boolean(addressStr);
  const airdropOk = ok && activeChain() === "solana:devnet";
  btnSignMsg.disabled = !ok;
  btnSignMsgBinary.disabled = !ok;
  btnSignMsgTx.disabled = !ok;
  btnSignOffchain.disabled = !ok;
  btnSignInShort.disabled = !ok;
  btnSignInFull.disabled = !ok;
  btnSignTx.disabled = !ok;
  btnSignAndSendTx.disabled = !ok;
  btnSignAndSendTxStd.disabled = !ok;
  btnSignAndSendTxStdFail.disabled = !ok;
  btnSignTxFail.disabled = !ok;
  btnSignTxClusterMismatch.disabled = !ok;
  btnSignTxV1.disabled = !ok;
  btnSignTxV1NoFee.disabled = !ok;
  btnSignTxV1ZeroFee.disabled = !ok;
  btnSignTxV1NoCu.disabled = !ok;
  btnSignTxV1Signed.disabled = !ok;
  btnSignAndSendTxV1.disabled = !ok;
  btnSignTxSuspicious.disabled = !ok;
  btnSignTxNonce.disabled = !ok;
  btnSignTxSteal.disabled = !ok;
  btnAirdrop.disabled = !airdropOk;
  if (addressStr) setStatus(`已連線：${addressStr}`);
}

let changeSubscribed = false;

function subscribeChange(wallet: Wallet): void {
  if (changeSubscribed) return;
  const events = wallet.features[StandardEvents] as
    | StandardEventsFeature[typeof StandardEvents]
    | undefined;
  events?.on("change", (props) => {
    const account = props.accounts?.[0];
    log("account change:", account?.address ?? "(empty)", account?.chains?.[0] ?? "");
    enableSigning(account?.address, account?.chains);
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

async function buildSelfTransferTxWithBlockhashRpc(
  fromAddress: ReturnType<typeof address>,
  lamportsAmount: bigint,
  blockhashRpcUrl: string,
): Promise<Uint8Array> {
  const client = createSolanaRpc(blockhashRpcUrl);
  const latest = await client.getLatestBlockhash({ commitment: "confirmed" }).send();
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

/** v1 self-transfer. Each flag controls one config field or a non-zero signature slot. */
async function buildV1SelfTransferTx(
  fromAddress: ReturnType<typeof address>,
  options: {
    cuLimit?: number;
    dataSize?: number;
    priorityFee?: bigint | null;
    signedSlot?: boolean;
  } = {},
): Promise<Uint8Array> {
  const latest = await rpc().getLatestBlockhash({ commitment: "confirmed" }).send();
  let txMessage = pipe(
    createTransactionMessage({ version: 1 }),
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
          amount: lamports(0n),
        }),
        m,
      ),
  );
  if (options.cuLimit !== undefined) {
    txMessage = setTransactionMessageComputeUnitLimit(options.cuLimit, txMessage);
  }
  if (options.dataSize !== undefined) {
    txMessage = setTransactionMessageLoadedAccountsDataSizeLimit(options.dataSize, txMessage);
  }
  if (options.priorityFee !== undefined && options.priorityFee !== null) {
    txMessage = setTransactionMessagePriorityFeeLamports(options.priorityFee, txMessage);
  }
  let tx = compileTransaction(txMessage);
  if (options.signedSlot) {
    const slot = new Uint8Array(64);
    slot.fill(1);
    tx = { ...tx, signatures: { ...tx.signatures, [fromAddress]: slot as unknown as Signature } };
  }
  const bytes = new Uint8Array(getTransactionEncoder().encode(tx));
  if (bytes[0] !== 0x81) {
    throw new Error(`expected v1 prefix 0x81, got ${bytes[0]}`);
  }
  return bytes;
}

const SYSTEM_PROGRAM = "11111111111111111111111111111111";
const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
/** Fixed public addresses. No secret is stored. Do not broadcast these samples. */
const STRANGER = address("US517G5965aydkZ46HS38QLi7UQiSojurfbQfKCELFx");
const WSOL_MINT = address("So11111111111111111111111111111111111111112");
const TOKEN_ACCOUNT_SPACE = 165;
/** Deployed on every cluster. The wallet labels it Address Lookup Table. */
const LOOKUP_TABLE_PROGRAM = address("AddressLookupTab1e1111111111111111111111111");

function ix(
  program: string,
  accounts: Array<{ pubkey: Address; role: AccountRole }>,
  data: Uint8Array,
): Instruction {
  return {
    programAddress: address(program),
    accounts: accounts.map((item) => ({ address: item.pubkey, role: item.role })),
    data,
  };
}

async function compileDangerTx(
  payer: Address,
  instructions: Instruction[],
  lifetime: { blockhash: Blockhash; lastValidBlockHeight: bigint },
): Promise<Uint8Array> {
  let message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(payer, m),
    (m) => setTransactionMessageLifetimeUsingBlockhash(lifetime, m),
  );
  for (const item of instructions) {
    message = appendTransactionMessageInstruction(item, message as never) as typeof message;
  }
  return new Uint8Array(getTransactionEncoder().encode(compileTransaction(message)));
}

/**
 * CreateLookupTable on the real Address Lookup Table program, then System Assign of the
 * wallet to that program. The program account exists, so simulation can run; the wallet
 * still treats the program as unknown.
 */
async function buildSuspiciousTx(payer: Address): Promise<Uint8Array> {
  const client = rpc();
  const latest = await client.getLatestBlockhash({ commitment: "confirmed" }).send();
  const slot = await client.getSlot({ commitment: "confirmed" }).send();
  const slotBytes = new Uint8Array(8);
  new DataView(slotBytes.buffer).setBigUint64(0, slot, true);
  const [lookupTable, bump] = await getProgramDerivedAddress({
    programAddress: LOOKUP_TABLE_PROGRAM,
    seeds: [getAddressEncoder().encode(payer), slotBytes],
  });
  const createData = new Uint8Array(13);
  const createView = new DataView(createData.buffer);
  createView.setUint32(0, 0, true);
  createView.setBigUint64(4, slot, true);
  createData[12] = bump;
  const assign = new Uint8Array(36);
  new DataView(assign.buffer).setUint32(0, 1, true);
  assign.set(bs58.decode(LOOKUP_TABLE_PROGRAM), 4);
  return compileDangerTx(
    payer,
    [
      ix(
        LOOKUP_TABLE_PROGRAM,
        [
          { pubkey: lookupTable, role: AccountRole.WRITABLE },
          { pubkey: payer, role: AccountRole.READONLY_SIGNER },
          { pubkey: payer, role: AccountRole.WRITABLE_SIGNER },
          { pubkey: address(SYSTEM_PROGRAM), role: AccountRole.READONLY },
        ],
        createData,
      ),
      ix(SYSTEM_PROGRAM, [{ pubkey: payer, role: AccountRole.WRITABLE_SIGNER }], assign),
    ],
    { blockhash: latest.value.blockhash, lastValidBlockHeight: latest.value.lastValidBlockHeight },
  );
}

const NONCE_DRAIN_LAMPORTS = 1_000_000n;

function nonceStorageKey(payer: Address): string {
  return `airwave-test-web-nonce:${payer}`;
}

async function readOwnedNonce(
  payer: Address,
): Promise<{ nonceAccount: Address; nonce: Blockhash } | null> {
  const stored = sessionStorage.getItem(nonceStorageKey(payer));
  if (!stored) return null;
  const found = await fetchMaybeNonce(rpc(), address(stored));
  if (!found.exists || found.data.state !== NonceState.Initialized || found.data.authority !== payer) {
    return null;
  }
  return { nonceAccount: found.address, nonce: found.data.blockhash as unknown as Blockhash };
}

/** AdvanceNonceAccount first, then a small SOL transfer to a stranger. Lifetime is the stored nonce. */
async function buildDurableNonceDrainTx(
  payer: Address,
  nonceAccount: Address,
  nonce: Blockhash,
): Promise<Uint8Array> {
  return compileDangerTx(
    payer,
    [
      getAdvanceNonceAccountInstruction({
        nonceAccount,
        nonceAuthority: createNoopSigner(payer),
      }),
      getTransferSolInstruction({
        source: createNoopSigner(payer),
        destination: STRANGER,
        amount: NONCE_DRAIN_LAMPORTS,
      }),
    ],
    { blockhash: nonce, lastValidBlockHeight: 0n },
  );
}

/** Small SOL transfer, then approve and reassign one new token account and close another to the stranger. */
async function buildStealTx(payer: Address): Promise<Uint8Array> {
  const client = rpc();
  const latest = await client.getLatestBlockhash({ commitment: "confirmed" }).send();
  const rent = await client.getMinimumBalanceForRentExemption(BigInt(TOKEN_ACCOUNT_SPACE)).send();
  const approveAccount = await generateKeyPairSigner();
  const closeAccount = await generateKeyPairSigner();
  const approve = new Uint8Array(9);
  approve[0] = 4;
  new DataView(approve.buffer).setBigUint64(1, 18446744073709551615n, true);
  const setAuthority = new Uint8Array(38);
  setAuthority[0] = 6;
  setAuthority[1] = 2;
  new DataView(setAuthority.buffer).setUint32(2, 1, true);
  setAuthority.set(bs58.decode(STRANGER), 6);
  const init = new Uint8Array(33);
  init[0] = 18;
  init.set(bs58.decode(payer), 1);
  const signer = { pubkey: payer, role: AccountRole.WRITABLE_SIGNER };
  const open = (account: Address) => [
    getCreateAccountInstruction({
      payer: createNoopSigner(payer),
      newAccount: account === approveAccount.address ? approveAccount : closeAccount,
      lamports: rent,
      space: TOKEN_ACCOUNT_SPACE,
      programAddress: address(TOKEN_PROGRAM),
    }),
    ix(
      TOKEN_PROGRAM,
      [
        { pubkey: account, role: AccountRole.WRITABLE },
        { pubkey: WSOL_MINT, role: AccountRole.READONLY },
      ],
      init,
    ),
  ];
  let message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(payer, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        {
          blockhash: latest.value.blockhash,
          lastValidBlockHeight: latest.value.lastValidBlockHeight,
        },
        m,
      ),
  );
  const instructions = [
    getTransferSolInstruction({
      source: createNoopSigner(payer),
      destination: STRANGER,
      amount: NONCE_DRAIN_LAMPORTS,
    }),
    ...open(approveAccount.address),
    ix(
      TOKEN_PROGRAM,
      [
        { pubkey: approveAccount.address, role: AccountRole.WRITABLE },
        { pubkey: STRANGER, role: AccountRole.READONLY },
        signer,
      ],
      approve,
    ),
    ix(TOKEN_PROGRAM, [{ pubkey: approveAccount.address, role: AccountRole.WRITABLE }, signer], setAuthority),
    ...open(closeAccount.address),
    ix(
      TOKEN_PROGRAM,
      [
        { pubkey: closeAccount.address, role: AccountRole.WRITABLE },
        { pubkey: STRANGER, role: AccountRole.WRITABLE },
        signer,
      ],
      new Uint8Array([9]),
    ),
  ];
  for (const item of instructions) {
    message = appendTransactionMessageInstruction(item, message as never) as typeof message;
  }
  const partial = await partiallySignTransaction(
    [approveAccount.keyPair, closeAccount.keyPair],
    compileTransaction(message),
  );
  return new Uint8Array(getTransactionEncoder().encode(partial));
}

async function signDangerSample(
  label: string,
  build: (payer: Address) => Promise<Uint8Array>,
): Promise<void> {
  const proceed = window.confirm(
    `${label}\n\n這是危險樣本。請在錢包裡拒絕，不要核准。這個頁面不會廣播。`,
  );
  if (!proceed) {
    log("已取消：", label);
    return;
  }
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
    sessionChain = chainOf(account.chains);
    log(label, "（只簽名，不廣播）");
    const tx = await build(address(account.address));
    const [out] = await signTx.signTransaction({
      account,
      chain: activeChain(),
      transaction: tx,
    });
    log("已簽名但未廣播:", bs58.encode(out.signedTransaction));
  } catch (e) {
    log("危險樣本簽名錯誤:", e instanceof Error ? e.message : e);
  }
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
    const account = accounts[0];
    log("Connected:", account?.address, account?.chains?.[0] ?? "");
    enableSigning(account?.address, account?.chains);
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

function bytesPreview(bytes: Uint8Array): string {
  const head = Array.from(bytes.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${bytes.length} bytes, first ${head}`;
}

btnSignOffchain.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as StandardConnectFeature[typeof StandardConnect] | undefined;
    const feature = wallet.features[SolanaSignOffchainMessage] as
      | SolanaSignOffchainMessageFeature[typeof SolanaSignOffchainMessage]
      | undefined;
    if (!connect || !feature) return;
    const { accounts } = await connect.connect({ silent: true });
    const account = accounts[0];
    if (!account) throw new Error("no account");
    const [out] = await feature.signOffchainMessage({
      messageVersion: 1,
      account,
      message: "Hello from Airwave off-chain",
      requiredSigners: [account.publicKey],
    });
    log("Off-chain signature base58:", bs58.encode(Uint8Array.from(out.signature)));
    log("Off-chain signed bytes:", bytesPreview(Uint8Array.from(out.signedOffchainMessage)));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("Off-chain error:", err.code ?? "", err.message ?? e);
  }
});

btnSignInShort.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as StandardConnectFeature[typeof StandardConnect] | undefined;
    const feature = wallet.features[SolanaSignIn] as SolanaSignInFeature[typeof SolanaSignIn] | undefined;
    if (!connect || !feature) return;
    const { accounts } = await connect.connect({ silent: true });
    if (!accounts[0]) throw new Error("no account");
    const [out] = await feature.signIn({});
    log("Sign in short signature base58:", bs58.encode(Uint8Array.from(out.signature)));
    log("Sign in short statement:", new TextDecoder().decode(out.signedMessage));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("Sign in short error:", err.code ?? "", err.message ?? e);
  }
});

btnSignInFull.addEventListener("click", async () => {
  try {
    const wallet = await waitForAirwave();
    const connect = wallet.features[StandardConnect] as StandardConnectFeature[typeof StandardConnect] | undefined;
    const feature = wallet.features[SolanaSignIn] as SolanaSignInFeature[typeof SolanaSignIn] | undefined;
    if (!connect || !feature) return;
    const { accounts } = await connect.connect({ silent: true });
    if (!accounts[0]) throw new Error("no account");
    const [out] = await feature.signIn({
      statement: "Sign in to swap.app. This does not send a transaction.",
      uri: "https://swap.app",
      version: "1",
      chainId: activeChain(),
      nonce: "8f3a1c9e",
      issuedAt: "2026-11-05T02:00:00Z",
      expirationTime: "2026-11-05T03:00:00Z",
      notBefore: "2026-11-05T01:00:00Z",
      requestId: "req-1",
      resources: ["https://swap.app/terms", "https://swap.app/order/1"],
    });
    log("Sign in full signature base58:", bs58.encode(Uint8Array.from(out.signature)));
    log("Sign in full statement:", new TextDecoder().decode(out.signedMessage));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("Sign in full error:", err.code ?? "", err.message ?? e);
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
    sessionChain = chainOf(account.chains);
    if (sessionChain !== "solana:devnet") {
      throw new Error("Airdrop 只在 Devnet。錢包目前是 Mainnet。");
    }

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
    sessionChain = chainOf(account.chains);

    const tx = await buildSelfTransferTx(address(account.address), 10n * LAMPORTS_PER_SOL);

    const [out] = await signTx.signTransaction({
      account,
      chain: activeChain(),
      transaction: tx,
    });
    log("Signed fail-case tx base58:", bs58.encode(out.signedTransaction));
  } catch (e) {
    log("Sign fail-case tx error:", e instanceof Error ? e.message : e);
  }
});

btnSignTxV1.addEventListener("click", async () => {
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
    sessionChain = chainOf(account.chains);

    const tx = await buildV1SelfTransferTx(address(account.address), {
      cuLimit: 5000,
      dataSize: 32 * 1024,
      priorityFee: 5000n,
    });
    log("v1 sign: self-transfer 0 SOL, priority fee already 5000.");

    const [out] = await signTx.signTransaction({
      account,
      chain: activeChain(),
      transaction: tx,
    });
    log("v1 signTransaction returned:", bs58.encode(out.signedTransaction));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("v1 sign error:", err.code ?? "", err.message ?? e);
  }
});

async function signPreparedV1(
  label: string,
  build: (from: ReturnType<typeof address>) => Promise<Uint8Array>,
): Promise<void> {
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
    sessionChain = chainOf(account.chains);
    const tx = await build(address(account.address));
    log(label);
    const [out] = await signTx.signTransaction({
      account,
      chain: activeChain(),
      transaction: tx,
    });
    log("v1 signTransaction returned:", bs58.encode(out.signedTransaction));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("v1 sign error:", err.code ?? "", err.message ?? e);
  }
}

btnSignTxV1NoFee.addEventListener("click", () =>
  signPreparedV1("v1 no priority fee", (from) =>
    buildV1SelfTransferTx(from, { cuLimit: 5000, dataSize: 32 * 1024, priorityFee: null }),
  ),
);
btnSignTxV1ZeroFee.addEventListener("click", () =>
  signPreparedV1("v1 priority fee 0", (from) =>
    buildV1SelfTransferTx(from, { cuLimit: 5000, dataSize: 32 * 1024, priorityFee: 0n }),
  ),
);
btnSignTxV1NoCu.addEventListener("click", () =>
  signPreparedV1("v1 no CU limit", (from) =>
    buildV1SelfTransferTx(from, { dataSize: 32 * 1024, priorityFee: 5000n }),
  ),
);
btnSignTxV1Signed.addEventListener("click", () =>
  signPreparedV1("v1 signed slot", (from) =>
    buildV1SelfTransferTx(from, {
      cuLimit: 5000,
      dataSize: 32 * 1024,
      priorityFee: 5000n,
      signedSlot: true,
    }),
  ),
);

btnSignTxClusterMismatch.addEventListener("click", async () => {
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
    sessionChain = chainOf(account.chains);

    const walletChain = account.chains.find((c) => c.startsWith("solana:")) ?? "solana:devnet";
    const blockhashRpc =
      walletChain === "solana:mainnet"
        ? rpcUrlFor("solana:devnet")
        : rpcUrlFor("solana:mainnet");
    log(
      "Cluster mismatch sample: omit chain; blockhash from",
      blockhashRpc,
      "(does not broadcast)",
    );

    const tx = await buildSelfTransferTxWithBlockhashRpc(
      address(account.address),
      0n,
      blockhashRpc,
    );

    await signTx.signTransaction({
      account,
      transaction: tx,
    });
    log("Unexpected: cluster mismatch approval should stay disabled");
  } catch (e) {
    const err = e as Error & { code?: string };
    log("Cluster mismatch sign error:", err.code ?? "", err.message ?? e);
  }
});

btnSignTxSuspicious.addEventListener("click", () =>
  signDangerSample("可疑：未知程式 + System Assign", buildSuspiciousTx),
);
async function signDurableNonceDrain(): Promise<void> {
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
    sessionChain = chainOf(account.chains);
    const payer = address(account.address);
    let nonce = await readOwnedNonce(payer);
    if (!nonce) {
      const create = window.confirm(
        "這個分頁還沒有 nonce 帳戶。下一步只建立 nonce 並支付租金，頁面會廣播這一筆。請在錢包裡核准。",
      );
      if (!create) {
        log("已取消：建立 nonce 帳戶");
        return;
      }
      const nonceSigner = await generateKeyPairSigner();
      const client = rpc();
      const rent = await client.getMinimumBalanceForRentExemption(BigInt(getNonceSize())).send();
      const latest = await client.getLatestBlockhash({ commitment: "confirmed" }).send();
      const message = pipe(
        createTransactionMessage({ version: 0 }),
        (m) => setTransactionMessageFeePayer(payer, m),
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
            getCreateAccountInstruction({
              payer: createNoopSigner(payer),
              newAccount: nonceSigner,
              lamports: rent,
              space: getNonceSize(),
              programAddress: address(SYSTEM_PROGRAM),
            }),
            m,
          ),
        (m) =>
          appendTransactionMessageInstruction(
            getInitializeNonceAccountInstruction({
              nonceAccount: nonceSigner.address,
              nonceAuthority: payer,
            }),
            m,
          ),
      );
      const partial = await partiallySignTransaction([nonceSigner.keyPair], compileTransaction(message));
      const createBytes = new Uint8Array(getTransactionEncoder().encode(partial));
      log("建立 nonce 帳戶（會廣播）", nonceSigner.address);
      const [created] = await signTx.signTransaction({
        account,
        chain: activeChain(),
        transaction: createBytes,
      });
      const wire = getBase64EncodedWireTransaction(getTransactionDecoder().decode(created.signedTransaction));
      const signature = await client
        .sendTransaction(wire, { encoding: "base64", skipPreflight: false, preflightCommitment: "confirmed" })
        .send();
      log("Nonce create signature:", signature);
      await confirmSignature(signature);
      sessionStorage.setItem(nonceStorageKey(payer), nonceSigner.address);
      const stored = await readOwnedNonce(payer);
      if (!stored) throw new Error("nonce account missing after confirm");
      nonce = stored;
    }
    const danger = window.confirm(
      "接下來是 AdvanceNonce 後轉 0.001 SOL 給陌生地址。請在錢包裡拒絕，不要核准。這個頁面不會廣播這一筆。",
    );
    if (!danger) {
      log("已取消：durable nonce 轉出");
      return;
    }
    log("Durable nonce 後轉 0.001 SOL 給陌生地址（只簽名，不廣播）");
    const tx = await buildDurableNonceDrainTx(payer, nonce.nonceAccount, nonce.nonce);
    const [out] = await signTx.signTransaction({
      account,
      chain: activeChain(),
      transaction: tx,
    });
    log("已簽名但未廣播:", bs58.encode(out.signedTransaction));
  } catch (e) {
    log("Durable nonce 樣本錯誤:", e instanceof Error ? e.message : e);
  }
}

btnSignTxNonce.addEventListener("click", () => {
  void signDurableNonceDrain();
});
btnSignTxSteal.addEventListener("click", () =>
  signDangerSample("偷錢：轉 SOL、無限 Approve、SetAuthority、CloseAccount", buildStealTx),
);

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
    sessionChain = chainOf(account.chains);

    const tx = await buildSelfTransferTx(address(account.address), 0n);

    const [out] = await signTx.signTransaction({
      account,
      chain: activeChain(),
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
    sessionChain = chainOf(account.chains);

    const tx = await buildSelfTransferTx(address(account.address), 0n);

    const [out] = await signTx.signTransaction({
      account,
      chain: activeChain(),
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

btnSignAndSendTxV1.addEventListener("click", async () => {
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
    sessionChain = chainOf(account.chains);

    const tx = await buildV1SelfTransferTx(address(account.address), {
      cuLimit: 5000,
      dataSize: 32 * 1024,
      priorityFee: 5000n,
    });
    log("v1 signAndSend: self-transfer 0 SOL, first byte 0x81, priority fee already 5000.");

    const [out] = await signAndSend.signAndSendTransaction({
      account,
      chain: activeChain(),
      transaction: tx,
    });
    log("v1 signAndSendTransaction ok:", bs58.encode(out.signature));
  } catch (e) {
    const err = e as Error & { code?: string };
    log("v1 signAndSendTransaction error:", err.code ?? "", err.message ?? e);
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
    sessionChain = chainOf(account.chains);

    const tx = await buildSelfTransferTx(address(account.address), 0n);

    const [out] = await signAndSend.signAndSendTransaction({
      account,
      chain: activeChain(),
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
    sessionChain = chainOf(account.chains);

    const tx = await buildSelfTransferTx(address(account.address), 10n * LAMPORTS_PER_SOL);
    log("signAndSendTransaction fail-case: 自轉 10 SOL，預期模擬／鏈上失敗");

    const [out] = await signAndSend.signAndSendTransaction({
      account,
      chain: activeChain(),
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
