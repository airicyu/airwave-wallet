/**
 * The account chip in the popup top bar: kind mark, label, and short address.
 * Tapping it opens the account list. It does not switch the active account by itself.
 */
import type { JSX } from "react";
import { accountVisualKind } from "../../shared/marks";
import { getExposedPublicKey } from "../../shared/accounts";
import { displayAccountName } from "../lib/format";
import { useT } from "../state/useT";
import type { State } from "../types";
import { AccountKindMark } from "./AccountKindMark";

export function WalletWidget({ wallet }: { wallet: State }): JSX.Element {
  const { t } = useT();
  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
  if (!active) {
    return (
      <>
        <span className="avatar" id="widget-avatar" aria-hidden="true">
          ?
        </span>
        <span className="bar-wallet-text">
          <span className="bar-wallet-name" id="widget-label">
            —
          </span>
        </span>
      </>
    );
  }
  const name = displayAccountName(active.label, getExposedPublicKey(active));
  const kind = accountVisualKind(active);
  const kindLabel =
    kind === "combined"
      ? t("accounts.kindCombined")
      : kind === "readOnly"
        ? t("accounts.kindReadOnly")
        : t("accounts.kindSigning");
  return (
    <>
      <span className="avatar kind-mark" id="widget-avatar">
        <AccountKindMark kind={kind} size={16} label={kindLabel} />
      </span>
      <span className="bar-wallet-text">
        <span className="bar-wallet-name" id="widget-label">
          {name}
        </span>
      </span>
    </>
  );
}
