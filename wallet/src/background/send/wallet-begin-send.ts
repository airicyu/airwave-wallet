import { fetchEncodedAccount } from "@solana/accounts";
import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
} from "@solana/kit";
import { getTransferSolInstruction } from "@solana-program/system";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstructionAsync,
  getTransferCheckedInstruction,
  TOKEN_PROGRAM_ADDRESS,
} from "@solana-program/token";
import {
  getCreateAssociatedTokenIdempotentInstructionAsync as getCreateAssociatedTokenIdempotentInstructionAsync2022,
  getTransferCheckedInstruction as getTransferCheckedInstruction2022,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import type { Instruction } from "@solana/instructions";
import { parsePublicKeyBase58 } from "../../shared/accounts";
import type { LoadedAccountKeys } from "../../shared/keypair-bytes";
import {
  NATIVE_SOL_ID,
  type HomeTokenRow,
  type TokenProgramKind,
} from "../../shared/home-tokens";
import { parseAmountUiToRaw, solReserveLamports } from "../../shared/wallet-send-amount";
import type { Settings } from "../../shared/storage-keys";
import { solanaRpcForUrl } from "../../shared/solana-rpc";
import { encodeWireTransaction } from "../../shared/tx-wire";
import { getWalletSendState } from "./wallet-send-state";

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

function tokenProgramAddress(kind: TokenProgramKind): typeof TOKEN_PROGRAM_ADDRESS | typeof TOKEN_2022_PROGRAM_ADDRESS {
  return kind === "token-2022" ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS;
}

function readTokenAccountAmount(data: Uint8Array): bigint | null {
  if (data.length < 72) return null;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return view.getBigUint64(64, true);
}

async function tokenAccountRentLamports(
  rpc: ReturnType<typeof solanaRpcForUrl>,
  tokenProgram: typeof TOKEN_PROGRAM_ADDRESS | typeof TOKEN_2022_PROGRAM_ADDRESS,
): Promise<bigint | null> {
  const accountDataLen = 165;
  if (tokenProgram === TOKEN_2022_PROGRAM_ADDRESS) {
    /* mint fetch not required for rent size — same 165-byte layout for standard token account */
  }
  const rent = await rpc.getMinimumBalanceForRentExemption(BigInt(accountDataLen)).send();
  return rent;
}

function findTokenRow(rows: HomeTokenRow[], tokenId: string): HomeTokenRow | undefined {
  return rows.find((r) => r.id === tokenId);
}

export async function buildWalletSendTransaction(
  settings: Settings,
  signer: LoadedAccountKeys,
  row: HomeTokenRow,
  amountUi: string,
  recipientBase58: string,
  requestId: string,
): Promise<{ txBytes: Uint8Array } | { code: BeginSendErrorCode }> {
  const recipientParsed = parsePublicKeyBase58(recipientBase58);
  if (!recipientParsed) {
    return { code: "INVALID_ADDRESS" };
  }
  const recipient = address(recipientParsed);

  if (row.decimals == null || !Number.isInteger(row.decimals)) {
    return { code: "INVALID_PAYLOAD" };
  }
  const amountRaw = parseAmountUiToRaw(amountUi, row.decimals);
  if (amountRaw == null) return { code: "INVALID_PAYLOAD" };

  const rpc = solanaRpcForUrl(settings.rpcUrl);
  const fromAddress = address(signer.address);
  const reserve = solReserveLamports(settings.defaultCuPrice);
  const instructions: Instruction[] = [];

  if (row.id === NATIVE_SOL_ID) {
    const balance = BigInt((await rpc.getBalance(fromAddress, { commitment: "confirmed" }).send()).value);
    if (amountRaw + reserve > balance) return { code: "INSUFFICIENT_FUNDS" };
    instructions.push(
      getTransferSolInstruction({
        source: signer.signer,
        destination: recipient,
        amount: amountRaw,
      }),
    );
  } else {
    if (!row.tokenProgram) return { code: "INVALID_PAYLOAD" };
    const mint = address(row.id);
    const programId = tokenProgramAddress(row.tokenProgram);
    const [sourceAta] = await findAssociatedTokenPda({
      owner: fromAddress,
      mint,
      tokenProgram: programId,
    });
    const sourceInfo = await fetchEncodedAccount(rpc, sourceAta, { commitment: "confirmed" });
    if (!sourceInfo.exists || sourceInfo.programAddress !== programId) {
      return { code: "INSUFFICIENT_FUNDS" };
    }
    const onChain = readTokenAccountAmount(sourceInfo.data);
    if (onChain == null || amountRaw > onChain) return { code: "INSUFFICIENT_FUNDS" };

    const [destAta] = await findAssociatedTokenPda({
      owner: recipient,
      mint,
      tokenProgram: programId,
    });
    const destInfo = await fetchEncodedAccount(rpc, destAta, { commitment: "confirmed" });
    let extraRent = 0n;
    if (!destInfo.exists) {
      const rent = await tokenAccountRentLamports(rpc, programId);
      if (rent == null) return { code: "INSUFFICIENT_FUNDS" };
      extraRent = rent;
      const createAta =
        row.tokenProgram === "token-2022"
          ? await getCreateAssociatedTokenIdempotentInstructionAsync2022({
              payer: signer.signer,
              owner: recipient,
              mint,
              tokenProgram: programId,
            })
          : await getCreateAssociatedTokenIdempotentInstructionAsync({
              payer: signer.signer,
              owner: recipient,
              mint,
              tokenProgram: programId,
            });
      instructions.push(createAta);
    }

    const solBalance = BigInt((await rpc.getBalance(fromAddress, { commitment: "confirmed" }).send()).value);
    if (solBalance < reserve + extraRent) return { code: "INSUFFICIENT_FUNDS" };

    const transferIx =
      row.tokenProgram === "token-2022"
        ? getTransferCheckedInstruction2022({
            source: sourceAta,
            mint,
            destination: destAta,
            authority: signer.signer,
            amount: amountRaw,
            decimals: row.decimals,
          })
        : getTransferCheckedInstruction({
            source: sourceAta,
            mint,
            destination: destAta,
            authority: signer.signer,
            amount: amountRaw,
            decimals: row.decimals,
          });
    instructions.push(transferIx);
  }

  const latest = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const ws = getWalletSendState(requestId);
  ws.lastValidBlockHeight = Number(latest.value.lastValidBlockHeight);

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
    (m) => appendTransactionMessageInstructions(instructions, m),
  );

  const tx = compileTransaction(txMessage);
  return { txBytes: encodeWireTransaction(tx) };
}

export async function resolveHomeTokenRowForSend(
  rows: HomeTokenRow[],
  tokenId: string,
): Promise<HomeTokenRow | null> {
  const row = findTokenRow(rows, tokenId);
  if (!row) return null;
  return row;
}
