import type { JSX } from "react";
import { getExposedPublicKey } from "../../shared/accounts";
import { avatarPrefix, displayAccountName } from "../lib/format";
import type { State } from "../types";

export function WalletWidget({ wallet }: { wallet: State }): JSX.Element {
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
  return (
    <>
      <span className="avatar" id="widget-avatar" aria-hidden="true">
        {avatarPrefix(name)}
      </span>
      <span className="bar-wallet-text">
        <span className="bar-wallet-name" id="widget-label">
          {name}
        </span>
      </span>
    </>
  );
}
