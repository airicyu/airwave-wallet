import { PublicKey } from "@solana/web3.js";

const SYSTEM_PROGRAM_ID = "11111111111111111111111111111111";
const COMPUTE_BUDGET_PROGRAM_ID = "ComputeBudget111111111111111111111111111111";
const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
const TOKEN_2022_PROGRAM_ID = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
const ATA_PROGRAM_ID = "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export type DecodedIxField = { label: string; value: string };

export type DecodeCompiledIxResult =
  | { decoded: true; name: string; fields: DecodedIxField[] }
  | { decoded: false };

function shortPk(pk: PublicKey): string {
  const s = pk.toBase58();
  if (s.length <= 8) return s;
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

function accountValue(
  accountKeys: (PublicKey | undefined)[],
  accountKeyIndexes: number[],
  index: number,
): string {
  const keyIndex = accountKeyIndexes[index];
  if (keyIndex === undefined) return "未解析";
  const k = accountKeys[keyIndex];
  return k ? shortPk(k) : "未解析";
}

function readU32LE(data: Uint8Array, offset: number): number {
  return new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
}

function readU64LE(data: Uint8Array, offset: number): bigint {
  const view = new DataView(data.buffer, data.byteOffset + offset, 8);
  const lo = BigInt(view.getUint32(0, true));
  const hi = BigInt(view.getUint32(4, true));
  return (hi << 32n) | lo;
}

function extraAccountFields(
  accountKeys: (PublicKey | undefined)[],
  accountKeyIndexes: number[],
  fromIndex: number,
): DecodedIxField[] {
  const out: DecodedIxField[] = [];
  for (let i = fromIndex; i < accountKeyIndexes.length; i++) {
    out.push({ label: "帳戶", value: accountValue(accountKeys, accountKeyIndexes, i) });
  }
  return out;
}

/**
 * 靜態解讀單條 compiled ix（0.19.0 變體表）。不吻合 → `{ decoded: false }`。
 */
export function decodeCompiledIx(
  programId: PublicKey,
  data: Uint8Array,
  accountKeys: (PublicKey | undefined)[],
  accountKeyIndexes: number[],
): DecodeCompiledIxResult {
  const pid = programId.toBase58();

  if (pid === SYSTEM_PROGRAM_ID) {
    if (data.length !== 12) return { decoded: false };
    const disc = readU32LE(data, 0);
    if (disc !== 2) return { decoded: false };
    if (accountKeyIndexes.length < 2) return { decoded: false };
    const lamports = readU64LE(data, 4);
    const fields: DecodedIxField[] = [
      { label: "來源", value: accountValue(accountKeys, accountKeyIndexes, 0) },
      { label: "收款", value: accountValue(accountKeys, accountKeyIndexes, 1) },
      { label: "lamports", value: lamports.toString() },
      ...extraAccountFields(accountKeys, accountKeyIndexes, 2),
    ];
    return { decoded: true, name: "轉移 SOL", fields };
  }

  if (pid === COMPUTE_BUDGET_PROGRAM_ID) {
    if (data.length === 5 && data[0] === 2) {
      const units = readU32LE(data, 1);
      return {
        decoded: true,
        name: "設定計算單位上限",
        fields: [{ label: "單位", value: units.toString() }],
      };
    }
    if (data.length === 9 && data[0] === 3) {
      const price = readU64LE(data, 1);
      return {
        decoded: true,
        name: "設定優先費單價",
        fields: [{ label: "單價", value: price.toString() }],
      };
    }
    return { decoded: false };
  }

  if (pid === TOKEN_PROGRAM_ID || pid === TOKEN_2022_PROGRAM_ID) {
    if (data.length === 9 && data[0] === 3) {
      if (accountKeyIndexes.length < 3) return { decoded: false };
      const amount = readU64LE(data, 1);
      const fields: DecodedIxField[] = [
        { label: "來源", value: accountValue(accountKeys, accountKeyIndexes, 0) },
        { label: "收款", value: accountValue(accountKeys, accountKeyIndexes, 1) },
        { label: "授權", value: accountValue(accountKeys, accountKeyIndexes, 2) },
        { label: "數量", value: amount.toString() },
        ...extraAccountFields(accountKeys, accountKeyIndexes, 3),
      ];
      return { decoded: true, name: "轉移代幣", fields };
    }
    if (data.length === 10 && data[0] === 12) {
      if (accountKeyIndexes.length < 4) return { decoded: false };
      const amount = readU64LE(data, 1);
      const decimals = data[9];
      const fields: DecodedIxField[] = [
        { label: "來源", value: accountValue(accountKeys, accountKeyIndexes, 0) },
        { label: "mint", value: accountValue(accountKeys, accountKeyIndexes, 1) },
        { label: "收款", value: accountValue(accountKeys, accountKeyIndexes, 2) },
        { label: "授權", value: accountValue(accountKeys, accountKeyIndexes, 3) },
        { label: "數量", value: amount.toString() },
        { label: "decimals", value: String(decimals) },
        ...extraAccountFields(accountKeys, accountKeyIndexes, 4),
      ];
      return { decoded: true, name: "轉移代幣", fields };
    }
    return { decoded: false };
  }

  if (pid === ATA_PROGRAM_ID) {
    if (data.length !== 1) return { decoded: false };
    if (data[0] !== 0 && data[0] !== 1) return { decoded: false };
    if (accountKeyIndexes.length < 4) return { decoded: false };
    const fields: DecodedIxField[] = [
      { label: "付款", value: accountValue(accountKeys, accountKeyIndexes, 0) },
      { label: "帳戶", value: accountValue(accountKeys, accountKeyIndexes, 1) },
      { label: "錢包", value: accountValue(accountKeys, accountKeyIndexes, 2) },
      { label: "mint", value: accountValue(accountKeys, accountKeyIndexes, 3) },
      ...extraAccountFields(accountKeys, accountKeyIndexes, 4),
    ];
    return { decoded: true, name: "建立關聯代幣帳戶", fields };
  }

  if (pid === MEMO_PROGRAM_ID) {
    try {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(data);
      return {
        decoded: true,
        name: "Memo",
        fields: [{ label: "內容", value: text }],
      };
    } catch {
      return { decoded: false };
    }
  }

  return { decoded: false };
}
