/**
 * Unshield token picker. Lists private balances above zero.
 * Choosing a row opens the Unshield amount page for that mint.
 */
import { useEffect, useState, type JSX } from "react";
import { TokenIcon, TokenTrust } from "../home/HomeTokenList";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { loadPrivacyStatus, type PrivacyRow } from "./privacy-status";
import { privacyTokenCard } from "./privacy-token-card";
import { clearUnshieldDraft, setUnshieldBack } from "./unshield-draft";

type Row = Pick<PrivacyRow, "mint" | "amount" | "usdLabel">;

export function UnshieldPick(): JSX.Element {
  const { t } = useT();
  const { homeTokenRows, navigateTo, setDetailTokenId } = usePopupContext();
  const [rows, setRows] = useState<Row[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadPrivacyStatus().then((body) => {
      if (cancelled) return;
      setReady(true);
      if (body.kind === "registered") setRows(body.rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return <PrivacySkeleton variant="cards" />;

  return (
    <div className="shield-pick">
      <p className="shield-pick-lead">{t("privacy.selectUnshieldToken")}</p>
      <ul className="token-list">
        {rows.map((row) => {
          const card = privacyTokenCard(row.mint, row.amount, row.usdLabel, homeTokenRows);
          return (
            <li key={row.mint}>
              <div
                className="token-card"
                role="button"
                tabIndex={0}
                onClick={() => {
                  clearUnshieldDraft();
                  setUnshieldBack("unshield-pick");
                  setDetailTokenId(row.mint);
                  navigateTo("unshield");
                }}
              >
                <TokenTrust row={card} />
                <TokenIcon row={card} />
                <div className="token-main">
                  <div className="token-sym">{card.name || card.symbol}</div>
                  <div className="token-qty">{card.uiAmountLabel} {card.symbol}</div>
                </div>
                <div className="token-usd">{card.usdLabel}</div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
