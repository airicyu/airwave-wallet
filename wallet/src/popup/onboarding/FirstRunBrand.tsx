/**
 * The large brand block on the first-run setup and the RPC guide.
 * It wraps BrandMark. It does not collect the password or the RPC URL.
 */
import type { JSX } from "react";
import { BrandMark } from "../components/BrandMark";

export function FirstRunBrand(): JSX.Element {
  return (
    <header className="first-run-brand">
      <BrandMark />
      <h1 className="first-run-name">Airwave Wallet</h1>
    </header>
  );
}
