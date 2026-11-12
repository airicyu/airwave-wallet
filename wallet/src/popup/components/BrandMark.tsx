/**
 * The Airwave mark used on first-run, unlock, and about.
 * Size is only lg or sm. It does not choose the surrounding layout.
 */
import type { JSX } from "react";
import { brandIconUrl } from "../../shared/marks";

export function BrandMark({ size = "lg" }: { size?: "lg" | "sm" }): JSX.Element {
  const px = size === "sm" ? 40 : 64;
  return (
    <img
      className={size === "sm" ? "brand-mark brand-mark-sm" : "brand-mark"}
      src={brandIconUrl()}
      width={px}
      height={px}
      alt=""
      aria-hidden="true"
    />
  );
}
