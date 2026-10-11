/**
 * Deterministic risk flags from a wire transaction, computed on the service worker.
 * Does not trust sandbox output and does not call OpenRouter.
 */
import { getCompiledTransactionMessageDecoder, type CompiledTransactionMessage } from "@solana/kit";
import { compiledAddressTableLookups, messageBytesToUint8Array, normalizedCompiledInstructions } from "../../shared/compiled-message";
import type { TxAiFlag } from "../../shared/tx-ai";
import { decodeWireTransaction as decodeWire } from "../../shared/tx-wire";

const SYSTEM = "11111111111111111111111111111111";
const TOKEN = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022 = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const U64_MAX = 18446744073709551615n;

const KNOWN: Record<string, string> = {
  [SYSTEM]: "System",
  [TOKEN]: "Token",
  [TOKEN_2022]: "Token-2022",
  ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL: "ATA",
  ComputeBudget111111111111111111111111111111: "ComputeBudget",
  MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr: "Memo",
  Memo1UhkJRfHyvLMcVucJyeXtyXNSDyzPVsqVQ5m5: "Memo v1",
};

const LABELED: Record<string, string> = {
  JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4: "Jupiter v6",
  whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc: "Orca Whirlpool",
  CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK: "Raydium CLMM",
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8": "Raydium AMM v4",
  LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo: "Meteora DLMM",
  cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG: "Meteora DAMM v2",
  "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P": "Pump.fun",
};

const AUTH_TYPE = ["MintTokens", "FreezeAccount", "AccountOwner", "CloseAccount"];

export type DecodedIx = {
  index: number;
  programId: string;
  program: string;
  name: string;
  accounts: { pubkey: string; signer: boolean; writable: boolean; ixRole?: string }[];
};

export type TxAiDecode = {
  feePayer: string;
  instructions: DecodedIx[];
  flags: TxAiFlag[];
  tokenSources: { source: string; owner: string }[];
};

function u32(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
}

function u64(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  return (BigInt(view.getUint32(4, true)) << 32n) | BigInt(view.getUint32(0, true));
}

function accountKeys(message: CompiledTransactionMessage): string[] {
  if (message.version === 1) return [];
  return message.staticAccounts.map((account) => String(account));
}

function signerCount(message: CompiledTransactionMessage): number {
  if (message.version === 1) return 0;
  return message.header.numSignerAccounts;
}

function writableAccount(message: CompiledTransactionMessage, index: number, length: number): boolean {
  if (message.version === 1 || index < 0 || index >= length) return false;
  const { numSignerAccounts, numReadonlySignerAccounts, numReadonlyNonSignerAccounts } = message.header;
  if (index < numSignerAccounts) return index < numSignerAccounts - numReadonlySignerAccounts;
  return index < length - numReadonlyNonSignerAccounts;
}

function ixName(programId: string, data: Uint8Array): { name: string; roles?: string[] } {
  if (programId === SYSTEM && data.length >= 4) {
    const disc = u32(data, 0);
    if (disc === 1) return { name: "Assign", roles: ["account"] };
    if (disc === 2) return { name: "Transfer", roles: ["from", "to"] };
    if (disc === 3) return { name: "CreateAccountWithSeed" };
    if (disc === 4) return { name: "AdvanceNonceAccount", roles: ["nonce", "recentBlockhashes", "nonceAuthority"] };
    if (disc === 10) return { name: "AssignWithSeed", roles: ["account"] };
    return { name: `System:${disc}` };
  }
  if ((programId === TOKEN || programId === TOKEN_2022) && data.length > 0) {
    const disc = data[0] ?? 0;
    if (disc === 3) return { name: "Transfer", roles: ["source", "destination", "owner"] };
    if (disc === 4) return { name: "Approve", roles: ["source", "delegate", "owner"] };
    if (disc === 6) return { name: "SetAuthority", roles: ["account", "currentAuthority"] };
    if (disc === 9) return { name: "CloseAccount", roles: ["account", "destination", "owner"] };
    if (disc === 12) return { name: "TransferChecked", roles: ["source", "mint", "destination", "owner"] };
    if (disc === 13) return { name: "ApproveChecked", roles: ["source", "mint", "delegate", "owner"] };
    return { name: `Token:${disc}` };
  }
  return { name: "unknown" };
}

export function decodeWireTransaction(bytes: Uint8Array): TxAiDecode {
  const tx = decodeWire(bytes);
  const message = getCompiledTransactionMessageDecoder().decode(messageBytesToUint8Array(tx.messageBytes));
  return decodeCompiledMessage(message);
}

export function decodeCompiledMessage(message: CompiledTransactionMessage): TxAiDecode {
  const keys = accountKeys(message);
  const signers = new Set(keys.slice(0, signerCount(message)));
  const flags: TxAiFlag[] = [];
  const seen = new Set<string>();
  const push = (id: string, detail?: string): void => {
    const key = `${id}:${detail ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    flags.push(detail ? { id, detail } : { id });
  };
  const lookups = compiledAddressTableLookups(message);
  const instructions = normalizedCompiledInstructions(message).map((ix, index) => {
    const unresolved =
      ix.programAddressIndex >= keys.length || ix.accountIndices.some((accountIndex) => accountIndex >= keys.length);
    if (unresolved || (lookups.length > 0 && unresolved)) push("lookup_account_unchecked");
    const programId = keys[ix.programAddressIndex] ?? "unresolved";
    const known = KNOWN[programId];
    const labeled = LABELED[programId];
    if (!known && !labeled && programId !== "unresolved") push("unknown_program", programId);
    const data = ix.data;
    if (index === 0 && programId === SYSTEM && data.length >= 4 && u32(data, 0) === 4) push("durable_nonce");
    if (programId === SYSTEM && data.length >= 4 && (u32(data, 0) === 1 || u32(data, 0) === 10)) {
      push("system_assign", u32(data, 0) === 10 ? "AssignWithSeed" : "Assign");
    }
    if ((programId === TOKEN || programId === TOKEN_2022) && data.length > 0) {
      const disc = data[0] ?? 0;
      if ((disc === 4 && data.length >= 9) || (disc === 13 && data.length >= 10)) {
        push("authority_change", disc === 4 ? "Approve" : "ApproveChecked");
        if (u64(data, 1) === U64_MAX) push("unlimited_approve", "u64 max");
      }
      if (disc === 6 && data.length >= 38 && data[2] === 1) {
        push("authority_change", AUTH_TYPE[data[1] ?? 255] ?? "SetAuthority");
      }
      if (disc === 9 && data.length >= 1) {
        const dest = keys[ix.accountIndices[1] ?? -1];
        if (dest && !signers.has(dest)) {
          push("authority_change", "CloseAccount");
          push("close_account_external", dest);
        }
      }
    }
    const meta = ixName(programId, data);
    return {
      index,
      programId,
      program: known ?? labeled ?? "unknown",
      name: meta.name,
      accounts: ix.accountIndices.map((accountIndex, accountPos) => ({
        pubkey: keys[accountIndex] ?? "unresolved",
        signer: signers.has(keys[accountIndex] ?? ""),
        writable: writableAccount(message, accountIndex, keys.length),
        ...(meta.roles?.[accountPos] ? { ixRole: meta.roles[accountPos] } : {}),
      })),
    };
  });
  if (lookups.length > 0 && instructions.some((ix) => ix.accounts.some((account) => account.pubkey === "unresolved"))) {
    push("lookup_account_unchecked", "address lookup not loaded");
  }
  const tokenSources: { source: string; owner: string }[] = [];
  for (const ix of instructions) {
    if (ix.program !== "Token" && ix.program !== "Token-2022") continue;
    const source = ix.accounts.find((account) => account.ixRole === "source")?.pubkey;
    const owner = ix.accounts.find((account) => account.ixRole === "owner" || account.ixRole === "currentAuthority")?.pubkey;
    if (source && owner && source !== "unresolved" && owner !== "unresolved") tokenSources.push({ source, owner });
  }
  return { feePayer: keys[0] ?? "", instructions, flags, tokenSources };
}

const PREFETCH_SKIP_PUBKEYS = new Set<string>([
  SYSTEM,
  TOKEN,
  TOKEN_2022,
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  "ComputeBudget111111111111111111111111111111",
  ...Object.keys(LABELED),
]);

/** Ordered pubkeys for host preflight getMultipleAccounts (signers and writables first). */
export function resolvedAccountPubkeysForPrefetch(decode: TxAiDecode, cap = 60): string[] {
  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (pubkey: string | undefined): void => {
    if (!pubkey || pubkey === "unresolved" || PREFETCH_SKIP_PUBKEYS.has(pubkey) || seen.has(pubkey)) return;
    seen.add(pubkey);
    ordered.push(pubkey);
  };
  for (const row of decode.tokenSources) {
    add(row.source);
    add(row.owner);
  }
  add(decode.feePayer);
  for (const ix of decode.instructions) {
    for (const account of ix.accounts) {
      if (account.signer) add(account.pubkey);
    }
  }
  for (const ix of decode.instructions) {
    for (const account of ix.accounts) {
      if (account.writable) add(account.pubkey);
    }
  }
  for (const ix of decode.instructions) {
    for (const account of ix.accounts) add(account.pubkey);
  }
  return ordered.slice(0, cap);
}

export function applyOwnerMismatch(decode: TxAiDecode, ownerBySource: ReadonlyMap<string, string>): TxAiFlag[] {
  const flags = [...decode.flags];
  if (flags.some((flag) => flag.id === "owner_mismatch")) return flags;
  for (const row of decode.tokenSources) {
    const chainOwner = ownerBySource.get(row.source);
    if (chainOwner && chainOwner !== row.owner) {
      flags.push({ id: "owner_mismatch", detail: row.source });
      break;
    }
  }
  return flags;
}
