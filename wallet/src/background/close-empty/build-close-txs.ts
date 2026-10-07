import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createTransactionMessage,
  pipe,
  setTransactionMessageFeePayer,
  setTransactionMessageLifetimeUsingBlockhash,
  type Blockhash,
} from "@solana/kit";
import {
  getSetComputeUnitLimitInstruction,
  getSetComputeUnitPriceInstruction,
} from "@solana-program/compute-budget";
import { getCloseAccountInstruction, TOKEN_PROGRAM_ADDRESS } from "@solana-program/token";
import {
  getCloseAccountInstruction as getCloseAccountInstruction2022,
  TOKEN_2022_PROGRAM_ADDRESS,
} from "@solana-program/token-2022";
import type { Instruction } from "@solana/instructions";
import type { ClosableEntry } from "../../shared/close-empty-types";
import { packCloseEmptyAccounts, type MeasureCloseTxGroupBytes } from "../../shared/close-empty-pack";
import { encodeWireTransaction } from "../../shared/tx-wire";
import type { TokenProgramKind } from "../../shared/home-tokens";

export type BuiltCloseTx = {
  ownerAccountId: string;
  owner: string;
  tokenProgram: TokenProgramKind;
  tokenAccounts: string[];
  accounts: Array<{ tokenAccount: string; symbol: string; rentLamports: string }>;
  unsignedBytes: Uint8Array;
  lastValidBlockHeight: bigint;
  cuLimit: number;
  cuPrice: number;
};

function programAddress(kind: TokenProgramKind) {
  return kind === "token-2022" ? TOKEN_2022_PROGRAM_ADDRESS : TOKEN_PROGRAM_ADDRESS;
}

function closeIxsForAccounts(
  owner: ReturnType<typeof address>,
  ownerSigner: ReturnType<typeof address>,
  program: TokenProgramKind,
  tokenAccounts: string[],
): Instruction[] {
  const programId = programAddress(program);
  const out: Instruction[] = [];
  for (const ta of tokenAccounts) {
    const account = address(ta);
    if (program === "token-2022") {
      out.push(
        getCloseAccountInstruction2022({
          account,
          destination: owner,
          owner: ownerSigner,
        }),
      );
    } else {
      out.push(
        getCloseAccountInstruction({
          account,
          destination: owner,
          owner: ownerSigner,
        }),
      );
    }
  }
  return out;
}

export function measureCloseTxWireBytes(
  tokenAccounts: string[],
  owner: string,
  program: TokenProgramKind,
  blockhash: Blockhash,
  lastValidBlockHeight: bigint,
  cuLimit: number,
  cuPrice: number,
  entriesForOwner: ClosableEntry[],
): number {
  const txMessage = buildCloseTransactionMessage(
    entriesForOwner.length > 0
      ? entriesForOwner
      : tokenAccounts.map((ta) => ({
          tokenAccount: ta,
          owner,
          ownerAccountId: "",
          ownerLabel: "",
          mint: "",
          symbol: "",
          tokenProgram: program,
          rentLamports: "0",
        })),
    tokenAccounts,
    blockhash,
    lastValidBlockHeight,
    cuLimit,
    cuPrice,
  );
  const tx = compileTransaction(txMessage);
  return encodeWireTransaction(tx).length;
}

export function buildCloseTransactionMessage(
  entries: ClosableEntry[],
  tokenAccounts: string[],
  blockhash: Blockhash,
  lastValidBlockHeight: bigint,
  cuLimit: number | null,
  cuPrice: number | null,
) {
  const first = entries.find((e) => tokenAccounts.includes(e.tokenAccount))!;
  const owner = first.owner;
  const program = first.tokenProgram;
  const ownerAddr = address(owner);
  const closeIxs = closeIxsForAccounts(ownerAddr, ownerAddr, program, tokenAccounts);
  const budgetIxs: Instruction[] = [];
  if (cuLimit != null) {
    budgetIxs.push(getSetComputeUnitLimitInstruction({ units: cuLimit }));
  }
  if (cuPrice != null) {
    budgetIxs.push(getSetComputeUnitPriceInstruction({ microLamports: cuPrice }));
  }
  return pipe(
    createTransactionMessage({ version: 0 }),
    (m) => setTransactionMessageFeePayer(ownerAddr, m),
    (m) =>
      setTransactionMessageLifetimeUsingBlockhash(
        { blockhash, lastValidBlockHeight },
        m,
      ),
    (m) => appendTransactionMessageInstructions([...budgetIxs, ...closeIxs], m),
  );
}

export function buildUnsignedCloseTx(
  entries: ClosableEntry[],
  tokenAccounts: string[],
  blockhash: Blockhash,
  lastValidBlockHeight: bigint,
  cuLimit: number,
  cuPrice: number,
): BuiltCloseTx {
  const first = entries.find((e) => tokenAccounts.includes(e.tokenAccount))!;
  const owner = first.owner;
  const ownerAccountId = first.ownerAccountId;
  const txMessage = buildCloseTransactionMessage(
    entries,
    tokenAccounts,
    blockhash,
    lastValidBlockHeight,
    cuLimit,
    cuPrice,
  );
  const tx = compileTransaction(txMessage);
  const accounts = tokenAccounts.map((ta) => {
    const row = entries.find((e) => e.tokenAccount === ta)!;
    return { tokenAccount: ta, symbol: row.symbol, rentLamports: row.rentLamports };
  });
  return {
    ownerAccountId,
    owner,
    tokenProgram: first.tokenProgram,
    tokenAccounts,
    accounts,
    unsignedBytes: encodeWireTransaction(tx),
    lastValidBlockHeight,
    cuLimit,
    cuPrice,
  };
}

export function packAndBuildCloseTxGroups(
  entries: ClosableEntry[],
  measure: MeasureCloseTxGroupBytes,
  blockhash: Blockhash,
  lastValidBlockHeight: bigint,
  cuLimit: number,
  cuPrice: number,
): BuiltCloseTx[] {
  const packItems = entries.map((e) => ({
    tokenAccount: e.tokenAccount,
    owner: e.owner,
    tokenProgram: e.tokenProgram,
  }));
  const groups = packCloseEmptyAccounts(packItems, measure);
  return groups.map((tokenAccounts) =>
    buildUnsignedCloseTx(entries, tokenAccounts, blockhash, lastValidBlockHeight, cuLimit, cuPrice),
  );
}
