/**
 * Shield token picker. Lists public balances above zero on the signing address.
 * Choosing a row opens the Shield amount page.
 */
import type { JSX } from "react";
import { homeTokenRowForSendBalance } from "../../shared/send";
import { TokenIcon, TokenTrust } from "../components/HomeTokenList";
import { tokenBalanceRaw } from "../send/send-logic";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { clearShieldAmount, setShieldBack } from "./shield-approval";

export function ShieldPick(): JSX.Element {
  const { t } = useT();
  const { wallet, homeTokenRows, navigateTo, setDetailTokenId } = usePopupContext();
  const active = wallet?.accounts.find((account) => account.id === wallet.activeAccountId);
  const rows = homeTokenRows.filter((row) => {
    const scoped = active && wallet ? homeTokenRowForSendBalance(row, active) : row;
    const raw = tokenBalanceRaw(scoped);
    return raw != null && raw > 0n;
  });
  return (
    <div className="shield-pick">
      <p className="shield-pick-lead">{t("privacy.selectToken")}</p>
      <ul className="token-list">
        {rows.map((row) => {
          const scoped = active && wallet ? homeTokenRowForSendBalance(row, active) : row;
          return (
            <li key={row.id}>
              <div
                className="token-card"
                role="button"
                tabIndex={0}
                onClick={() => {
                  clearShieldAmount();
                  setShieldBack("shield-pick");
                  setDetailTokenId(row.id);
                  navigateTo("shield");
                }}
              >
                <TokenTrust row={row} />
                <TokenIcon row={row} />
                <div className="token-main">
                  <div className="token-sym">{row.name || row.symbol}</div>
                  <div className="token-qty">{scoped.uiAmountLabel} {row.symbol}</div>
                </div>
                <div className="token-usd">{row.usdLabel}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
