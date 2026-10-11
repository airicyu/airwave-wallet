/**
 * test-web sign-risk POC: parse legacy or v0 compiled messages and emit static flags.
 * Does not call RPC or OpenRouter.
 */
import bs58 from "bs58";

export const SYSTEM = "11111111111111111111111111111111";
export const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

/** Fully decoded common system programs (instruction parsers below). */
const KNOWN: Record<string, string> = {
  [SYSTEM]: "System",
  [TOKEN]: "Token",
  [TOKEN_2022]: "Token-2022",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "ATA",
  ComputeBudget111111111111111111111111111111: "ComputeBudget",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo",
  Memo1UhkJRfHyvLMcVucJyeXtyXNSDyzPVsqVQ5m5: "Memo v1",
};

/**
 * Label-only: common mainnet DEX／router programs. Named in decode output but
 * ix args are not parsed; does NOT emit unknown_program (not the same as malware).
 */
const LABELED: Record<string, string> = {
  cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG: "Meteora DAMM v2",
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "Meteora DLMM",
  Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB: "Meteora DAMM v1",
  dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN: "Meteora DBC",
  pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA: "Pump.fun AMM",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun",
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  DF1ow4tspfHX9JwWJsAb9epbkA8hmpSEAtxXy1V27QBH: "DFlow Aggregator v4",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca Whirlpool",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium CLMM",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM v4",
};

const AUTH_TYPE = ["MintTokens", "FreezeAccount", "AccountOwner", "CloseAccount"] as const;
const U64_MAX = "18446744073709551615";

export const CONTEXT = `你在看一筆 Solana 交易，做安全性說明。本頁經 bubble-harness 提供唯讀 tools；請用 tools 查事實，不要臆造鏈上資料。

可用 host tools：
- decode_message：解交易位元組 → feePayer、instructions、確定性 flags（必先呼叫）
- get_accounts：RPC 查帳戶並解析 token 布局（可省略 pubkeys，改用上次 decode 的 keys）
- simulate：對 session wire 做 simulateTransaction（僅參考，不是安全證明）
- rpc_get_balance / rpc_get_account_info / rpc_get_multiple_accounts / rpc_get_token_accounts_by_owner / rpc_get_signatures_for_address / rpc_get_transaction / rpc_get_latest_blockhash：各一 tool、參數 schema 已固定（不要自造 JSON-RPC params 陣列）

關於 simulate：本頁常載入**已上鏈／過期**的 mainnet wire。對現況重播失敗（blockhash、帳戶已關、池子流動性變了、ProgramFailedToComplete 等）**很常見**，多半不是「這筆本來就危險」。不要只因 simulate err 就抬高等級；用它輔助看 logs／未知 program，安全判斷仍以 decode flags 與帳戶權限為主。

本地樣本會借用 mainnet 公開地址方便 RPC 查到帳戶；**其餘額／歷史交易是環境噪音，不是這筆草稿的劇情**。不要為了查「這是誰的錢包」去追 getSignatures／getTransaction；以 decode flags 與本筆帳戶角色為主。

不要重解 hex、不要改 flags。數字與帳戶欄位只信 tool 回傳。

帳戶的 ixRole（source、delegate、owner 等）是依已知指令帳戶順序標的。

Token SetAuthority 的 authorityType 名稱已寫在 decoded：MintTokens、FreezeAccount、AccountOwner、CloseAccount。

旗標意義：
- unknown_program：program **不在本頁白名單／標籤表**（僅代表解碼器不認得，不是「惡意」）。Jupiter／Meteora／Raydium／Orca／Pump 等常見 DEX 若已標名則**不會**出此旗標；未標名的常見協議也可能出現。**不要只因 unknown_program 就抬高等級**（產品意向：info）。
- durable_nonce：第一條是 System AdvanceNonceAccount。
- lookup_account_unchecked：有帳戶 index 超出已展開的 keys。
- system_assign：System Assign／AssignWithSeed。
- create_account_with_seed：System CreateAccountWithSeed。
- authority_change：Approve／ApproveChecked、把新權限交給公鑰的 SetAuthority，或 CloseAccount 收款人不是 signer。
- unlimited_approve：Approve 金額為 u64 最大值。
- close_account_external：CloseAccount destination 不是 signer。
- owner_mismatch：鏈上 token account owner 與指令上的 owner／authority 不一致。

缺資料就寫未知。不要寫成安全。不要叫使用者核准或拒絕。不要寫思考過程（禁止 Hmm／Wait／Anyway／So the… 等英文自言自語）。

結束 tool 後，最後一則回覆必須**只**是繁體中文報告（不要英文開場、不要 I'll start／Let me…）。200 字以內。四段：這筆在做什麼；點出 flags；缺什麼資料；最後一行只寫等級：低、留意、高、未知。`;

export type Flag = { id: string; detail?: string };

export type IxAccount = {
  pubkey: string;
  signer: boolean;
  writable: boolean;
  ixRole?: string;
};

export type StaticFlags = {
  feePayer: string;
  instructions: Array<{
    index: number;
    programId: string;
    program: string;
    name: string;
    decoded: Record<string, string>;
    accounts: IxAccount[];
  }>;
  flags: Flag[];
};

export type LoadedAddresses = { writable: string[]; readonly: string[] };

function u32(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(offset, true);
}

function u64(data: Uint8Array, offset: number): string {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getBigUint64(offset, true).toString();
}

function compactU16(bytes: Uint8Array, offset: number): { value: number; next: number } {
  const b0 = bytes[offset] ?? 0;
  if (b0 < 0x80) return { value: b0, next: offset + 1 };
  const b1 = bytes[offset + 1] ?? 0;
  if (b1 < 0x80) return { value: (b0 & 0x7f) + (b1 << 7), next: offset + 2 };
  const b2 = bytes[offset + 2] ?? 0;
  return { value: (b0 & 0x7f) + ((b1 & 0x7f) << 7) + (b2 << 14), next: offset + 3 };
}

type ParsedIx = {
  programIndex: number;
  accountIndices: number[];
  data: Uint8Array;
};

export type ParsedMessage = {
  version: "legacy" | 0 | 1;
  numSignerAccounts: number;
  numReadonlySignerAccounts: number;
  numReadonlyNonSignerAccounts: number;
  staticKeyCount: number;
  loadedWritableCount: number;
  hasAddressLookups: boolean;
  accounts: string[];
  instructions: ParsedIx[];
};

/**
 * Strip the signature prefix from a serialized transaction, or return the
 * bytes as-is when they already look like a versioned message.
 *
 * Full wire: compact-u16 sig count (almost always &lt; 0x80) + 64×n sigs + message.
 * Versioned message: first byte 0x80|version (e.g. 0x80 v0, 0x81 v1). Some RPC
 * payloads / encodings effectively start at the message; treating 0x81 as a
 * shortvec sig-count peels tens of KB and yields an empty decode.
 */
export function messageBytesFromWire(wire: Uint8Array): Uint8Array {
  if (wire.length === 0) return wire;
  if ((wire[0] ?? 0) >= 0x80) {
    return wire;
  }
  const n = compactU16(wire, 0);
  const messageStart = n.next + n.value * 64;
  if (messageStart > wire.length) {
    throw new Error("transaction wire shorter than signature region");
  }
  return wire.subarray(messageStart);
}

function readKeysAndIxs(bytes: Uint8Array, o: number): {
  next: number;
  accounts: string[];
  instructions: ParsedIx[];
} {
  const keys = compactU16(bytes, o);
  o = keys.next;
  const accounts: string[] = [];
  for (let i = 0; i < keys.value; i += 1) {
    accounts.push(bs58.encode(bytes.subarray(o, o + 32)));
    o += 32;
  }
  o += 32;
  const ixHead = compactU16(bytes, o);
  o = ixHead.next;
  const instructions: ParsedIx[] = [];
  for (let i = 0; i < ixHead.value; i += 1) {
    const programIndex = bytes[o++] ?? 0;
    const nAcc = compactU16(bytes, o);
    o = nAcc.next;
    const accountIndices = [...bytes.subarray(o, o + nAcc.value)];
    o += nAcc.value;
    const nData = compactU16(bytes, o);
    o = nData.next;
    const data = bytes.subarray(o, o + nData.value);
    o += nData.value;
    instructions.push({ programIndex, accountIndices, data });
  }
  return { next: o, accounts, instructions };
}

export function parseCompiledMessage(bytes: Uint8Array, loaded?: LoadedAddresses): ParsedMessage {
  const prefix = bytes[0] ?? 0;
  const versioned = prefix >= 0x80;
  const txVersion = versioned ? (prefix & 0x7f) : null;
  // RPC may return v0 or v1; layout after the version byte matches v0 for our purposes.
  if (versioned && txVersion !== 0 && txVersion !== 1) {
    throw new Error(`只解析 legacy／version 0／1 message（收到 version ${txVersion}）`);
  }
  let o = versioned ? 1 : 0;
  const numSignerAccounts = bytes[o++] ?? 0;
  const numReadonlySignerAccounts = bytes[o++] ?? 0;
  const numReadonlyNonSignerAccounts = bytes[o++] ?? 0;
  const body = readKeysAndIxs(bytes, o);
  o = body.next;
  let hasAddressLookups = false;
  if (versioned) {
    const tables = compactU16(bytes, o);
    hasAddressLookups = tables.value > 0;
  }
  const loadedWritable = loaded?.writable ?? [];
  const loadedReadonly = loaded?.readonly ?? [];
  const accounts = hasAddressLookups
    ? [...body.accounts, ...loadedWritable, ...loadedReadonly]
    : body.accounts;
  return {
    version: versioned ? (txVersion as 0 | 1) : "legacy",
    numSignerAccounts,
    numReadonlySignerAccounts,
    numReadonlyNonSignerAccounts,
    staticKeyCount: body.accounts.length,
    loadedWritableCount: loadedWritable.length,
    hasAddressLookups,
    accounts,
    instructions: body.instructions,
  };
}

export function parseV0Message(bytes: Uint8Array): ParsedMessage {
  const parsed = parseCompiledMessage(bytes);
  if (parsed.version !== 0) throw new Error("只解析 version 0 message");
  return parsed;
}

function headerRole(
  index: number,
  parsed: ParsedMessage,
): { signer: boolean; writable: boolean } {
  if (index >= parsed.staticKeyCount) {
    const loadedIndex = index - parsed.staticKeyCount;
    return { signer: false, writable: loadedIndex < parsed.loadedWritableCount };
  }
  const writableSigners = parsed.numSignerAccounts - parsed.numReadonlySignerAccounts;
  const signer = index < parsed.numSignerAccounts;
  const writable =
    index < writableSigners ||
    (index >= parsed.numSignerAccounts &&
      index < parsed.staticKeyCount - parsed.numReadonlyNonSignerAccounts);
  return { signer, writable };
}

function authorityTypeName(code: number): string {
  return AUTH_TYPE[code] ?? `unknown:${code}`;
}

function instructionMeta(
  programId: string,
  data: Uint8Array,
): { name: string; decoded: Record<string, string> } {
  if (programId === SYSTEM && data.length >= 4) {
    const disc = u32(data, 0);
    if (disc === 1 && data.length === 36) {
      return { name: "Assign", decoded: { newOwner: bs58.encode(data.subarray(4, 36)) } };
    }
    if (disc === 2 && data.length === 12) return { name: "Transfer", decoded: { lamports: u64(data, 4) } };
    if (disc === 3) return { name: "CreateAccountWithSeed", decoded: {} };
    if (disc === 4 && data.length === 4) return { name: "AdvanceNonceAccount", decoded: {} };
    if (disc === 10) return { name: "AssignWithSeed", decoded: {} };
    return { name: `System:${disc}`, decoded: {} };
  }
  if ((programId === TOKEN || programId === TOKEN_2022) && data.length > 0) {
    const disc = data[0];
    if (disc === 3 && data.length === 9) return { name: "Transfer", decoded: { amount: u64(data, 1) } };
    if (disc === 4 && data.length === 9) return { name: "Approve", decoded: { amount: u64(data, 1) } };
    if (disc === 6 && data.length === 38) {
      return {
        name: "SetAuthority",
        decoded: {
          authorityType: authorityTypeName(data[1] ?? 255),
          newAuthority: bs58.encode(data.subarray(6, 38)),
        },
      };
    }
    if (disc === 6 && data.length === 6) {
      return { name: "SetAuthority", decoded: { authorityType: authorityTypeName(data[1] ?? 255), newAuthority: "" } };
    }
    if (disc === 9 && data.length === 1) return { name: "CloseAccount", decoded: {} };
    if (disc === 12 && data.length === 10) return { name: "TransferChecked", decoded: { amount: u64(data, 1) } };
    if (disc === 13 && data.length === 10) return { name: "ApproveChecked", decoded: { amount: u64(data, 1) } };
    return { name: `Token:${disc}`, decoded: {} };
  }
  return { name: "unknown", decoded: {} };
}

function ixRoles(programId: string, name: string): string[] | undefined {
  if (programId === SYSTEM) {
    if (name === "Transfer") return ["from", "to"];
    if (name === "AdvanceNonceAccount") return ["nonce", "recentBlockhashes", "nonceAuthority"];
    if (name === "Assign" || name === "AssignWithSeed") return ["account"];
  }
  if (programId === TOKEN || programId === TOKEN_2022) {
    if (name === "Transfer") return ["source", "destination", "owner"];
    if (name === "TransferChecked") return ["source", "mint", "destination", "owner"];
    if (name === "Approve") return ["source", "delegate", "owner"];
    if (name === "ApproveChecked") return ["source", "mint", "delegate", "owner"];
    if (name === "SetAuthority") return ["account", "currentAuthority"];
    if (name === "CloseAccount") return ["account", "destination", "owner"];
  }
  return undefined;
}

function staticFlagsFromParsed(parsed: ParsedMessage): StaticFlags {
  const flags: Flag[] = [];
  const seen = new Set<string>();
  const push = (id: string, detail?: string): void => {
    const key = `${id}:${detail ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    flags.push(detail ? { id, detail } : { id });
  };

  const signerKeys = new Set(parsed.accounts.slice(0, parsed.numSignerAccounts));
  if (parsed.hasAddressLookups && parsed.accounts.length === parsed.staticKeyCount) {
    push("lookup_account_unchecked", "loadedAddresses missing");
  }

  const instructions = parsed.instructions.map((ix, index) => {
    if (ix.programIndex >= parsed.accounts.length || ix.accountIndices.some((i) => i >= parsed.accounts.length)) {
      push("lookup_account_unchecked");
    }
    const programId = parsed.accounts[ix.programIndex] ?? "未解析";
    const known = KNOWN[programId];
    const labeled = LABELED[programId];
    if (!known && !labeled) push("unknown_program", programId);
    const data = ix.data;
    if (index === 0 && programId === SYSTEM && data.length === 4 && u32(data, 0) === 4) {
      push("durable_nonce");
    }
    if (programId === SYSTEM && data.length === 36 && u32(data, 0) === 1) {
      push("system_assign", bs58.encode(data.subarray(4, 36)));
    }
    if (programId === SYSTEM && data.length >= 4 && u32(data, 0) === 10) push("system_assign", "AssignWithSeed");
    if (programId === SYSTEM && data.length >= 4 && u32(data, 0) === 3) push("create_account_with_seed");
    if ((programId === TOKEN || programId === TOKEN_2022) && data.length > 0) {
      const disc = data[0];
      if ((disc === 4 && data.length === 9) || (disc === 13 && data.length === 10)) {
        const amount = u64(data, 1);
        const kind = disc === 4 ? "Approve" : "ApproveChecked";
        push("authority_change", kind);
        if (amount === U64_MAX) push("unlimited_approve", amount);
      }
      if (disc === 6 && data.length === 38 && u32(data, 2) === 1) {
        push("authority_change", authorityTypeName(data[1] ?? 255));
      }
      if (disc === 9 && data.length === 1) {
        const dest = parsed.accounts[ix.accountIndices[1] ?? -1];
        if (dest && !signerKeys.has(dest)) {
          push("authority_change", "CloseAccount");
          push("close_account_external", dest);
        }
      }
    }
    const meta = instructionMeta(programId, data);
    const roles = ixRoles(programId, meta.name);
    return {
      index,
      programId,
      program: known ?? labeled ?? "unknown",
      name: meta.name,
      decoded: meta.decoded,
      accounts: ix.accountIndices.map((accountIndex, i) => {
        const role = headerRole(accountIndex, parsed);
        const ixRole = roles?.[i];
        return {
          pubkey: parsed.accounts[accountIndex] ?? "未解析",
          signer: role.signer,
          writable: role.writable,
          ...(ixRole ? { ixRole } : {}),
        };
      }),
    };
  });

  return {
    feePayer: parsed.accounts[0] ?? "",
    instructions,
    flags,
  };
}

export function staticFlagsFromMessage(message: Uint8Array, loaded?: LoadedAddresses): StaticFlags {
  return staticFlagsFromParsed(parseCompiledMessage(message, loaded));
}

/** RPC `encoding=json` message (v0／v1). Prefer this over binary peel for chain loads. */
export type RpcJsonMessage = {
  accountKeys: Array<string | { pubkey: string }>;
  header: {
    numRequiredSignatures: number;
    numReadonlySignedAccounts: number;
    numReadonlyUnsignedAccounts: number;
  };
  instructions: Array<{
    programIdIndex: number;
    accounts: number[];
    data: string;
  }>;
};

export function staticFlagsFromRpcJsonMessage(
  message: RpcJsonMessage,
  loaded?: LoadedAddresses,
): StaticFlags {
  const staticKeys = message.accountKeys.map((k) => (typeof k === "string" ? k : k.pubkey));
  const loadedWritable = loaded?.writable ?? [];
  const loadedReadonly = loaded?.readonly ?? [];
  const parsed: ParsedMessage = {
    version: 0,
    numSignerAccounts: message.header.numRequiredSignatures,
    numReadonlySignerAccounts: message.header.numReadonlySignedAccounts,
    numReadonlyNonSignerAccounts: message.header.numReadonlyUnsignedAccounts,
    staticKeyCount: staticKeys.length,
    loadedWritableCount: loadedWritable.length,
    hasAddressLookups: loadedWritable.length + loadedReadonly.length > 0,
    accounts: [...staticKeys, ...loadedWritable, ...loadedReadonly],
    instructions: message.instructions.map((ix) => ({
      programIndex: ix.programIdIndex,
      accountIndices: ix.accounts,
      data: bs58.decode(ix.data),
    })),
  };
  return staticFlagsFromParsed(parsed);
}

export function applyOwnerMismatch(summary: StaticFlags, tokenOwnerByAccount: Map<string, string>): void {
  const seen = new Set(summary.flags.map((f) => f.id));
  for (const ix of summary.instructions) {
    if (ix.program !== "Token" && ix.program !== "Token-2022") continue;
    const source = ix.accounts.find((a) => a.ixRole === "source")?.pubkey;
    const owner = ix.accounts.find((a) => a.ixRole === "owner" || a.ixRole === "currentAuthority")?.pubkey;
    if (!source || !owner) continue;
    const chainOwner = tokenOwnerByAccount.get(source);
    if (chainOwner && chainOwner !== owner && !seen.has("owner_mismatch")) {
      summary.flags.push({ id: "owner_mismatch", detail: source });
      seen.add("owner_mismatch");
    }
  }
}
