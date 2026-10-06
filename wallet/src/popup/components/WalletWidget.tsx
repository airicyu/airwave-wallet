import type { JSX } from "react";
import { getExposedPublicKey } from "../../shared/accounts";
import { avatarLetter, shortAddr } from "../lib/format";
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
          <span className="bar-wallet-addr" id="widget-addr" />
        </span>
      </>
    );
  }
  return (
    <>
      <span className="avatar" id="widget-avatar" aria-hidden="true">
        {avatarLetter(active.label)}
      </span>
      <span className="bar-wallet-text">
        <span className="bar-wallet-name" id="widget-label">
          {active.label}
        </span>
        <span className="bar-wallet-addr" id="widget-addr">
          {shortAddr(getExposedPublicKey(active))}
        </span>
      </span>
    </>
  );
}
