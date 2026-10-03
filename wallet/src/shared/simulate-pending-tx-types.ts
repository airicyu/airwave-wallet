export type SimulateTxDelta = {
  symbol: string;
  amount: string;
  sign: "plus" | "minus";
};

export type SimulateTxInstruction = {
  program: string;
  desc?: string;
  unresolved?: boolean;
};

export type SimulatePendingTxResult = {
  outcome: "ok" | "fail" | "rpc" | "unparseable";
  reason?: string;
  err?: unknown;
  logs?: string[];
  deltas?: SimulateTxDelta[];
  feeLamports?: number | null;
  feePayerShort?: string;
  instructions?: SimulateTxInstruction[];
};
