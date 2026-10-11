export type SimulateTxDeltaDisplay = {
  trust: "verified" | "unverified";
  labelPrimary: string;
  labelMintShort?: string;
  amountSuffix: string;
  iconUrl?: string;
  iconLetter: string;
};

export type SimulateTxDelta = {
  symbol: string;
  amount: string;
  sign: "plus" | "minus";
  kind: "native" | "spl";
  mint?: string;
  display?: SimulateTxDeltaDisplay;
};

export type SimulateTxIxAccount = {
  short: string;
  unresolved?: boolean;
};

export type SimulateTxIxField = {
  role: string;
  value: string;
};

export type SimulateTxInstruction = {
  program: string;
  kind?: string;
  decoded?: true;
  fields?: SimulateTxIxField[];
  desc?: string;
  unresolved?: boolean;
  accounts?: SimulateTxIxAccount[];
  /** Lowercase hex with no 0x prefix; empty string means no data. */
  dataHex?: string;
};

export type SimulatePendingTxResult = {
  outcome: "ok" | "fail" | "rpc" | "unparseable";
  reason?: string;
  err?: unknown;
  logs?: string[];
  deltas?: SimulateTxDelta[];
  feePayerShort?: string;
  instructions?: SimulateTxInstruction[];
  inspectorUrl?: string | null;
  sigFeeLamports?: number | null;
  priorityLamports?: number | null;
  totalFeeLamports?: number | null;
  cuLimit?: number | null;
  cuPrice?: number | null;
  cuWriteError?: string;
  /** Unsigned txs may change CU limit/price. */
  cuEditable?: boolean;
  /** Popout discards stale responses. */
  seq?: number;
};
