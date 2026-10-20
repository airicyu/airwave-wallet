import assert from "node:assert/strict";
import { test } from "node:test";
import type { HomeTokenRow } from "../home";
import type { AccountMeta, CombinedAccountMeta } from "../protocol";
import { canWalletSendFromActiveAccount, homeTokenRowForSendBalance } from "./wallet-send-eligibility";

const signingMember: AccountMeta = {
  id: "sig-1",
  label: "A",
  kind: "signing",
  publicKeyBase58: "11111111111111111111111111111112",
};

const combined: CombinedAccountMeta = {
  id: "comb-1",
  label: "Combo",
  kind: "combined",
  mainPubkey: "11111111111111111111111111111112",
  subPubkeys: ["11111111111111111111111111111112", "22222222222222222222222222222223"],
};

const mergedRow: HomeTokenRow = {
  id: "native-sol",
  name: "Solana",
  symbol: "SOL",
  uiAmount: 3,
  uiAmountLabel: "3",
  usdLabel: "—",
  iconLetter: "SO",
  decimals: 9,
  members: [
    { pubkey: combined.mainPubkey, uiAmount: 1, uiAmountLabel: "1", percent: 33 },
    { pubkey: "22222222222222222222222222222223", uiAmount: 2, uiAmountLabel: "2", percent: 67 },
  ],
};

test("combined send uses current wallet member balance", () => {
  const slice = homeTokenRowForSendBalance(mergedRow, combined);
  assert.equal(slice.uiAmountLabel, "1");
  assert.equal(slice.members, undefined);
});

test("combined can send when main pubkey resolves to signing account", () => {
  assert.equal(canWalletSendFromActiveAccount([signingMember, combined], combined, true), true);
});
