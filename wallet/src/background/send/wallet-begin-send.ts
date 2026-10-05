import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  NATIVE_SOL_ID,
  type HomeTokenRow,
  type TokenProgramKind,
} from "../../shared/home-tokens";
import { parseAmountUiToRaw, solReserveLamports } from "../../shared/wallet-send-amount";
import type { Settings } from "../../shared/storage-keys";
import { getWalletSendState } from "./wallet-send-state";

const TOKEN_PROGRAM_ID = new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA");
const TOKEN_2022_PROGRAM_ID = new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb");
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);
const SYSVAR_RENT_PUBKEY = new PublicKey("SysvarRent111111111111111111111111111111111");

export type BeginSendPayload = {
  tokenId: string;
  amountUi: string;
  recipient: string;
};

export type BeginSendErrorCode =
  | "NO_ACCOUNT"
  | "ACCOUNT_READ_ONLY"
  | "WALLET_LOCKED"
  | "INVALID_PAYLOAD"
  | "INSUFFICIENT_FUNDS"
  | "INVALID_ADDRESS";

function tokenProgramId(kind: TokenProgramKind): PublicKey {
  return kind === "token-2022" ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
}

function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  tokenProgram: PublicKey,
): PublicKey {
  const [addr] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgram.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
  return addr;
}

function readTokenAccountAmount(data: Uint8Array): bigint | null {
  if (data.length < 72) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getBigUint64(64, true);
}

async function tokenAccountRentLamports(
  conn: Connection,
  mint: PublicKey,
  tokenProgram: PublicKey,
): Promise<bigint | null> {
  let accountDataLen = 165;
  if (tokenProgram.equals(TOKEN_2022_PROGRAM_ID)) {
    const mintInfo = await conn.getAccountInfo(mint);
    if (!mintInfo) return null;
    accountDataLen = 165;
  }
  const rent = await conn.getMinimumBalanceForRentExemption(accountDataLen);
  return BigInt(rent);
}

function createAssociatedTokenAccountIdempotent(
  payer: PublicKey,
  associatedToken: PublicKey,
  owner: PublicKey,
  mint: PublicKey,
  tokenProgram: PublicKey,
): TransactionInstruction {
  return {
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: tokenProgram, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Uint8Array.from([1]),
  } as TransactionInstruction;
}

function transferCheckedIx(
  source: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
  owner: PublicKey,
  amount: bigint,
  decimals: number,
  tokenProgram: PublicKey,
): TransactionInstruction {
  const data = new Uint8Array(10);
  data[0] = 12;
  const view = new DataView(data.buffer);
  view.setBigUint64(1, amount, true);
  data[9] = decimals;
  return {
    programId: tokenProgram,
    keys: [
      { pubkey: source, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: destination, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: false },
    ],
    data,
  } as TransactionInstruction;
}

function findTokenRow(rows: HomeTokenRow[], tokenId: string): HomeTokenRow | undefined {
  return rows.find((r) => r.id === tokenId);
}

export async function buildWalletSendTransaction(
  settings: Settings,
  signer: Keypair,
  row: HomeTokenRow,
  amountUi: string,
  recipientBase58: string,
  requestId: string,
): Promise<{ txBytes: Uint8Array } | { code: BeginSendErrorCode }> {
  let recipientPk: PublicKey;
  try {
    recipientPk = new PublicKey(recipientBase58);
  } catch {
    return { code: "INVALID_ADDRESS" };
  }
  if (recipientPk.toBytes().length !== 32) {
    return { code: "INVALID_ADDRESS" };
  }

  if (row.decimals == null || !Number.isInteger(row.decimals)) {
    return { code: "INVALID_PAYLOAD" };
  }
  const amountRaw = parseAmountUiToRaw(amountUi, row.decimals);
  if (amountRaw == null) return { code: "INVALID_PAYLOAD" };

  const conn = new Connection(settings.rpcUrl, "confirmed");
  const fromPk = signer.publicKey;
  const reserve = solReserveLamports(settings.defaultCuPrice);
  const instructions: TransactionInstruction[] = [];

  if (row.id === NATIVE_SOL_ID) {
    const balance = BigInt(await conn.getBalance(fromPk));
    if (amountRaw + reserve > balance) return { code: "INSUFFICIENT_FUNDS" };
    instructions.push(
      SystemProgram.transfer({
        fromPubkey: fromPk,
        toPubkey: recipientPk,
        lamports: amountRaw,
      }),
    );
  } else {
    if (!row.tokenProgram) return { code: "INVALID_PAYLOAD" };
    const mint = new PublicKey(row.id);
    const programId = tokenProgramId(row.tokenProgram);
    const sourceAta = getAssociatedTokenAddress(mint, fromPk, programId);
    const sourceInfo = await conn.getAccountInfo(sourceAta);
    if (!sourceInfo || !sourceInfo.owner.equals(programId)) {
      return { code: "INSUFFICIENT_FUNDS" };
    }
    const onChain = readTokenAccountAmount(sourceInfo.data);
    if (onChain == null || amountRaw > onChain) return { code: "INSUFFICIENT_FUNDS" };

    const destAta = getAssociatedTokenAddress(mint, recipientPk, programId);
    const destInfo = await conn.getAccountInfo(destAta);
    let extraRent = 0n;
    if (!destInfo) {
      const rent = await tokenAccountRentLamports(conn, mint, programId);
      if (rent == null) return { code: "INSUFFICIENT_FUNDS" };
      extraRent = rent;
      instructions.push(
        createAssociatedTokenAccountIdempotent(fromPk, destAta, recipientPk, mint, programId),
      );
    }

    const solBalance = BigInt(await conn.getBalance(fromPk));
    if (solBalance < reserve + extraRent) return { code: "INSUFFICIENT_FUNDS" };

    instructions.push(
      transferCheckedIx(
        sourceAta,
        mint,
        destAta,
        fromPk,
        amountRaw,
        row.decimals,
        programId,
      ),
    );
  }

  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  const ws = getWalletSendState(requestId);
  ws.lastValidBlockHeight = lastValidBlockHeight;

  const message = new TransactionMessage({
    payerKey: fromPk,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();

  const tx = new VersionedTransaction(message);
  return { txBytes: tx.serialize() };
}

export async function resolveHomeTokenRowForSend(
  rows: HomeTokenRow[],
  tokenId: string,
): Promise<HomeTokenRow | null> {
  const row = findTokenRow(rows, tokenId);
  if (!row) return null;
  return row;
}
