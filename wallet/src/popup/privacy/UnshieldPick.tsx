/**
 * Unshield token picker. Lists private balances above zero.
 * Choosing a row opens the Unshield amount page for that mint.
 */
import { useEffect, useState, type JSX } from "react";
import { NATIVE_SOL_ID, type HomeTokenRow } from "../../shared/home";
import { TokenIcon, TokenTrust } from "../home/HomeTokenList";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { loadPrivacyStatus, type PrivacyRow } from "./privacy-status";
import { clearUnshieldDraft, setUnshieldBack } from "./unshield-draft";

const SOL_MINT = "11111111111111111111111111111111";

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
          const publicId = row.mint === SOL_MINT ? NATIVE_SOL_ID : row.mint;
          const known = homeTokenRows.find((item) => item.id === publicId);
          const card: HomeTokenRow = known
            ? { ...known, uiAmountLabel: row.amount, usdLabel: row.usdLabel ?? "" }
            : {
                id: publicId,
                name: row.mint.slice(0, 4),
                symbol: "",
                uiAmount: 0,
                uiAmountLabel: row.amount,
                usdLabel: row.usdLabel ?? "",
                iconLetter: row.mint.slice(0, 1),
                decimals: 0,
              };
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
