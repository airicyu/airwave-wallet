export type SimulateTxDelta = {
  symbol: string;
  amount: string;
  sign: "plus" | "minus";
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
  /** 連續小寫 hex，無 0x；空字串表示無 data */
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
  /** 未簽可改 CU limit／price */
  cuEditable?: boolean;
  /** popout 丟棄過期回包 */
  seq?: number;
};
