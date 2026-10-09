/**
 * Stroke kind mark for signing / read-only / combined wallet accounts.
 * Does not replace Manage-page text badges or member-row icons.
 */
import type { JSX } from "react";
import type { AccountVisualKind } from "../../shared/account-kind-visual";
import { ACCOUNT_KIND_COLOR } from "../../shared/account-kind-visual";
import { IconEye, IconKey, IconLayers } from "./StrokeIcon";

export function AccountKindMark({
  kind,
  size = 16,
  label,
}: {
  kind: AccountVisualKind;
  size?: number;
  label: string;
}): JSX.Element {
  const icon =
    kind === "combined" ? (
      <IconLayers size={size} />
    ) : kind === "readOnly" ? (
      <IconEye size={size} />
    ) : (
      <IconKey size={size} />
    );
  return (
    <span className={`kind-mark kind-${kind}`} title={label} aria-label={label} style={{ color: ACCOUNT_KIND_COLOR[kind] }}>
      {icon}
    </span>
  );
}
