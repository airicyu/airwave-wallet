/**
 * Builds the public token card used on private lists and detail.
 * Native SOL always gets the official Solana icon even when home holdings have no SOL row yet.
 */
import {
  NATIVE_SOL_ICON_URL,
  NATIVE_SOL_ID,
  type HomeTokenRow,
} from "../../shared/home";
import { SOL_MINT } from "./privacy-status";

export function privacyPublicId(mint: string): string {
  return mint === SOL_MINT ? NATIVE_SOL_ID : mint;
}

export function privacyTokenCard(
  mint: string,
  amount: string,
  usdLabel: string | undefined,
  homeTokenRows: HomeTokenRow[],
): HomeTokenRow {
  const publicId = privacyPublicId(mint);
  const known = homeTokenRows.find((item) => item.id === publicId);
  if (known) {
    return { ...known, uiAmountLabel: amount, usdLabel: usdLabel ?? known.usdLabel ?? "" };
  }
  if (publicId === NATIVE_SOL_ID) {
    return {
      id: NATIVE_SOL_ID,
      name: "Solana",
      symbol: "SOL",
      uiAmount: 0,
      uiAmountLabel: amount,
      usdLabel: usdLabel ?? "",
      iconLetter: "SO",
      iconUrl: NATIVE_SOL_ICON_URL,
      decimals: 9,
    };
  }
  return {
    id: publicId,
    name: mint.slice(0, 4),
    symbol: "",
    uiAmount: 0,
    uiAmountLabel: amount,
    usdLabel: usdLabel ?? "",
    iconLetter: mint.slice(0, 1),
    decimals: 0,
  };
}
