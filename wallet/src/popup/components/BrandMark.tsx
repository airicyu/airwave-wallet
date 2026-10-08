import type { JSX } from "react";
import { brandIconUrl } from "../../shared/brand-icon";

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
