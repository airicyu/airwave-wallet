/**
 * test-web only: build unsigned demo transactions and ask OpenRouter for a
 * security read from decoded flags. Not the wallet approval path.
 */
import { createKeyPairFromPrivateKeyBytes } from "@solana/keys";
import { AccountRole, type Instruction } from "@solana/instructions";
import {
  address,
  appendTransactionMessageInstruction,
  compileTransactionMessage,
  createTransactionMessage,
  getAddressFromPublicKey,
  getCompiledTransactionMessageEncoder,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Blockhash,
} from "@solana/kit";
import bs58 from "bs58";
import {
  applyOwnerMismatch,
  CONTEXT,
  messageBytesFromWire,
  parseV0Message,
  staticFlagsFromMessage,
  SYSTEM,
  TOKEN,
  type Flag,
  type LoadedAddresses,
  type StaticFlags,
} from "./sign-risk-decode";
import { fetchChainAccounts, fetchTransaction, type ChainAccount } from "./sign-risk-rpc";

const BLOCKHASH = "11111111111111111111111111111111" as Blockhash;
const RECENT_BLOCKHASHES = "SysvarRecentB1ockHashes11111111111111111111";
const U64_MAX = 18446744073709551615n;

type ScenarioId =
  | "sol-transfer"
  | "durable-nonce"
  | "unknown-program"
  | "set-authority"
  | "approve"
  | "unlimited-approve"
  | "close-account"
  | "system-assign";
type WireForm = "message" | "masked-wire";

type Built = {
  wireForm: WireForm | "rpc-wire";
  transactionBase64: string;
  staticFlags: StaticFlags;
  loaded?: LoadedAddresses;
  chainAccounts?: ChainAccount[];
};

type DemoKeys = {
  payer: Address;
  other: Address;
  nonce: Address;
  unknownProgram: Address;
};

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

function bytesBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function instruction(program: string, accounts: Array<{ pubkey: Address; role: AccountRole }>, data?: Uint8Array): Instruction {
  return {
    programAddress: address(program),
    accounts: accounts.map((item) => ({ address: item.pubkey, role: item.role })),
    ...(data ? { data } : null),
  };
}

function compileMessage(payer: Address, instructions: Instruction[]): Uint8Array {
  let message = pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(payer, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash: BLOCKHASH, lastValidBlockHeight: 0n },
        m,
      ),
  );
  for (const item of instructions) {
    message = appendTransactionMessageInstruction(item, message as never) as typeof message;
  }
  const compiled = compileTransactionMessage(message);
  return new Uint8Array(getCompiledTransactionMessageEncoder().encode(compiled));
}

function maskedWire(message: Uint8Array, numSigners: number): Uint8Array {
  const out = new Uint8Array(1 + numSigners * 64 + message.length);
  out[0] = numSigners;
  out.set(message, 1 + numSigners * 64);
  return out;
}

async function demoKeys(): Promise<DemoKeys> {
  async function fromFill(n: number): Promise<Address> {
    const seed = new Uint8Array(32);
    seed[0] = n;
    const pair = await createKeyPairFromPrivateKeyBytes(seed, true);
    return address(await getAddressFromPublicKey(pair.publicKey));
  }
  const [payer, other, nonce, unknownProgram] = await Promise.all([
    fromFill(1),
    fromFill(2),
    fromFill(3),
    fromFill(9),
  ]);
  return { payer, other, nonce, unknownProgram };
}

function transferData(lamports: bigint): Uint8Array {
  const data = new Uint8Array(12);
  const view = new DataView(data.buffer);
  view.setUint32(0, 2, true);
  view.setBigUint64(4, lamports, true);
  return data;
}

function approveData(amount: bigint): Uint8Array {
  const data = new Uint8Array(9);
  data[0] = 4;
  new DataView(data.buffer).setBigUint64(1, amount, true);
  return data;
}

function buildInstructions(id: ScenarioId, keys: DemoKeys): Instruction[] {
  const payer = { pubkey: keys.payer, role: AccountRole.WRITABLE_SIGNER };
  if (id === "sol-transfer") {
    return [instruction(SYSTEM, [payer, { pubkey: keys.other, role: AccountRole.WRITABLE }], transferData(1_000_000n))];
  }
  if (id === "durable-nonce") {
    const nonceData = new Uint8Array(4);
    new DataView(nonceData.buffer).setUint32(0, 4, true);
    return [
      instruction(
        SYSTEM,
        [
          { pubkey: keys.nonce, role: AccountRole.WRITABLE },
          { pubkey: address(RECENT_BLOCKHASHES), role: AccountRole.READONLY },
          payer,
        ],
        nonceData,
      ),
      instruction(SYSTEM, [payer, { pubkey: keys.other, role: AccountRole.WRITABLE }], transferData(5_000n)),
    ];
  }
  if (id === "unknown-program") {
    return [instruction(keys.unknownProgram, [payer, { pubkey: keys.other, role: AccountRole.WRITABLE }], new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))];
  }
  if (id === "set-authority") {
    const data = new Uint8Array(38);
    data[0] = 6;
    data[1] = 2;
    new DataView(data.buffer).setUint32(2, 1, true);
    data.set(bs58.decode(keys.other), 6);
    return [instruction(TOKEN, [{ pubkey: keys.nonce, role: AccountRole.WRITABLE }, payer], data)];
  }
  if (id === "unlimited-approve") {
    return [
      instruction(TOKEN, [
        { pubkey: keys.nonce, role: AccountRole.WRITABLE },
        { pubkey: keys.other, role: AccountRole.READONLY },
        payer,
      ], approveData(U64_MAX)),
    ];
  }
  if (id === "close-account") {
    return [
      instruction(TOKEN, [
        { pubkey: keys.nonce, role: AccountRole.WRITABLE },
        { pubkey: keys.other, role: AccountRole.WRITABLE },
        payer,
      ], new Uint8Array([9])),
    ];
  }
  if (id === "system-assign") {
    const data = new Uint8Array(36);
    new DataView(data.buffer).setUint32(0, 1, true);
    data.set(bs58.decode(keys.other), 4);
    return [instruction(SYSTEM, [{ pubkey: keys.nonce, role: AccountRole.WRITABLE }, payer], data)];
  }
  return [
    instruction(TOKEN, [
      { pubkey: keys.nonce, role: AccountRole.WRITABLE },
      { pubkey: keys.other, role: AccountRole.READONLY },
      payer,
    ], approveData(1n)),
  ];
}

function modelInput(built: Built): {
  feePayer: string;
  instructions: StaticFlags["instructions"];
  flags: Flag[];
  chainAccounts?: ChainAccount[];
} {
  return {
    feePayer: built.staticFlags.feePayer,
    instructions: built.staticFlags.instructions,
    flags: built.staticFlags.flags,
    ...(built.chainAccounts ? { chainAccounts: built.chainAccounts } : {}),
  };
}

function collectPubkeys(summary: StaticFlags): string[] {
  const keys = [summary.feePayer];
  for (const ix of summary.instructions) {
    keys.push(ix.programId);
    for (const account of ix.accounts) keys.push(account.pubkey);
  }
  return keys.filter((k) => k && k !== "未解析");
}

async function attachChain(built: Built, rpcUrl: string): Promise<Built> {
  const chainAccounts = await fetchChainAccounts(rpcUrl, collectPubkeys(built.staticFlags));
  const tokenOwner = new Map<string, string>();
  for (const item of chainAccounts) {
    if (item.token) tokenOwner.set(item.pubkey, item.token.owner);
  }
  applyOwnerMismatch(built.staticFlags, tokenOwner);
  return { ...built, chainAccounts };
}

function buildPayload(id: ScenarioId, wireForm: WireForm, keys: DemoKeys): Built {
  const message = compileMessage(keys.payer, buildInstructions(id, keys));
  const flags = staticFlagsFromMessage(message);
  const numSigners = parseV0Message(message).numSignerAccounts;
  const body = wireForm === "message" ? message : maskedWire(message, numSigners);
  if (wireForm === "masked-wire") {
    const stripped = body.subarray(1 + numSigners * 64);
    const again = staticFlagsFromMessage(stripped);
    if (JSON.stringify(again.flags) !== JSON.stringify(flags.flags)) {
      throw new Error("遮罩 wire 解回的旗標與 message 不一致");
    }
  }
  return {
    wireForm,
    transactionBase64: bytesBase64(body),
    staticFlags: flags,
  };
}

function readScenario(): ScenarioId {
  const value = el<HTMLSelectElement>("risk-scenario").value;
  if (
    value === "sol-transfer" ||
    value === "durable-nonce" ||
    value === "unknown-program" ||
    value === "set-authority" ||
    value === "approve" ||
    value === "unlimited-approve" ||
    value === "close-account" ||
    value === "system-assign"
  ) {
    return value;
  }
  return "sol-transfer";
}

function readWire(): WireForm {
  return el<HTMLSelectElement>("risk-wire").value === "masked-wire" ? "masked-wire" : "message";
}

export function mountSignRiskPoc(): void {
  const context = el<HTMLTextAreaElement>("risk-context");
  const flagsOut = el<HTMLPreElement>("risk-flags");
  const answer = el<HTMLPreElement>("risk-answer");
  const status = el<HTMLParagraphElement>("risk-status");
  const ask = el<HTMLButtonElement>("risk-ask");
  context.value = CONTEXT;

  const keysPromise = demoKeys();
  let latest: Built | null = null;

  function show(): void {
    if (!latest) return;
    flagsOut.textContent = JSON.stringify(modelInput(latest), null, 2);
  }

  async function refresh(): Promise<void> {
    try {
      const keys = await keysPromise;
      latest = buildPayload(readScenario(), readWire(), keys);
      show();
      status.textContent = `組好樣本 ${latest.wireForm}（尚未查 RPC）`;
    } catch (error) {
      latest = null;
      flagsOut.textContent = error instanceof Error ? error.message : String(error);
      status.textContent = "組交易失敗";
    }
  }

  el<HTMLSelectElement>("risk-scenario").addEventListener("change", () => void refresh());
  el<HTMLSelectElement>("risk-wire").addEventListener("change", () => void refresh());
  void refresh();

  el<HTMLButtonElement>("risk-load-tx").addEventListener("click", async () => {
    const rpcUrl = el<HTMLInputElement>("risk-rpc").value.trim();
    const signature = el<HTMLInputElement>("risk-sig").value.trim();
    if (!rpcUrl) {
      status.textContent = "先填 RPC URL";
      return;
    }
    if (!signature) {
      status.textContent = "先填交易雜湊";
      return;
    }
    status.textContent = "載入交易…";
    try {
      const { wire, loaded } = await fetchTransaction(rpcUrl, signature);
      const message = messageBytesFromWire(wire);
      const staticFlags = staticFlagsFromMessage(message, loaded);
      latest = {
        wireForm: "rpc-wire",
        transactionBase64: bytesBase64(wire),
        staticFlags,
        loaded,
      };
      latest = await attachChain(latest, rpcUrl);
      show();
      status.textContent = `已載入鏈上交易（${latest.chainAccounts?.length ?? 0} 個帳戶）`;
    } catch (error) {
      status.textContent = "載入交易失敗";
      answer.textContent = error instanceof Error ? error.message : String(error);
    }
  });

  el<HTMLButtonElement>("risk-fetch-accounts").addEventListener("click", async () => {
    const rpcUrl = el<HTMLInputElement>("risk-rpc").value.trim();
    if (!rpcUrl) {
      status.textContent = "先填 RPC URL";
      return;
    }
    if (!latest) {
      status.textContent = "沒有可查的交易";
      return;
    }
    status.textContent = "查帳戶…";
    try {
      latest = await attachChain(latest, rpcUrl);
      show();
      status.textContent = `已查 ${latest.chainAccounts?.length ?? 0} 個帳戶`;
    } catch (error) {
      status.textContent = "查帳戶失敗";
      answer.textContent = error instanceof Error ? error.message : String(error);
    }
  });

  ask.addEventListener("click", async () => {
    answer.textContent = "";
    const key = el<HTMLInputElement>("risk-key").value.trim();
    if (!key) {
      status.textContent = "先填 OpenRouter API key";
      return;
    }
    if (!latest) {
      status.textContent = "沒有可送出的交易";
      return;
    }
    const model = el<HTMLSelectElement>("risk-model").value;
    const rpcUrl = el<HTMLInputElement>("risk-rpc").value.trim();
    ask.disabled = true;
    status.textContent = `呼叫 ${model}…`;
    try {
      if (rpcUrl && !latest.chainAccounts) {
        status.textContent = "先查帳戶…";
        latest = await attachChain(latest, rpcUrl);
        show();
      }
      status.textContent = `呼叫 ${model}…`;
      const response = await fetch("/openrouter/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": location.origin,
          "X-Title": "Airwave sign-risk poc",
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          max_tokens: 900,
          messages: [
            { role: "system", content: context.value },
            { role: "user", content: JSON.stringify(modelInput(latest)) },
          ],
        }),
      });
      const raw = await response.text();
      const shown = raw.replaceAll(key, "[redacted]");
      if (!response.ok) {
        status.textContent = `OpenRouter HTTP ${response.status}`;
        answer.textContent = shown.slice(0, 2000);
        return;
      }
      const json = JSON.parse(shown) as {
        model?: string;
        choices?: Array<{ message?: { content?: string } }>;
      };
      const message = json.choices?.[0]?.message;
      const text = (message?.content ?? "").trim();
      status.textContent = json.model ? `回覆模型 ${json.model}` : "已回覆";
      answer.textContent = text || shown.slice(0, 2000);
    } catch (error) {
      status.textContent = "呼叫失敗";
      answer.textContent = error instanceof Error ? error.message : String(error);
    } finally {
      ask.disabled = false;
    }
  });
}
