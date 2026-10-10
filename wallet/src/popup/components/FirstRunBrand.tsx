import type { JSX } from "react";
import { BrandMark } from "./BrandMark";

export function FirstRunBrand(): JSX.Element {
  return (
    <header className="first-run-brand">
      <BrandMark />
      <h1 className="first-run-name">Airwave Wallet</h1>
    </header>
  );
}
