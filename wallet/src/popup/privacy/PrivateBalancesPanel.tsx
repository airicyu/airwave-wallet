/**
 * Private Balances tab: unavailable, register consent, or mint rows with UTXO expand.
 * Does not derive keys. Register is sent by the service worker without the approval screen.
 */
import { useCallback, useEffect, useState, type JSX } from "react";
import { NATIVE_SOL_ID, type HomeTokenRow } from "../../shared/home";
import { sendExtensionRequest } from "../../shared/protocol";
import { IconChevronDown, IconShield, IconUnshield } from "../components/StrokeIcon";
import { TokenIcon, TokenTrust } from "../components/HomeTokenList";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { RegisterWait } from "./RegisterWait";
import { UtxoReceipt } from "./UtxoReceipt";

const SOL_MINT = "11111111111111111111111111111111";

type Note = { id: string; amount: string };
type Row = { mint: string; amount: string; notes: Note[]; usdLabel?: string };
type Status =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "unregistered"; canPayFee: boolean }
  | { kind: "registered"; rows: Row[] }
  | { kind: "error" };

export function PrivateBalancesPanel(): JSX.Element {
  const { t } = useT();
  const { navigateTo, setDetailTokenId, homeTokenRows, showToast } = usePopupContext();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [openMint, setOpenMint] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await sendExtensionRequest("wallet.privacyStatus", {});
    if (!res.ok) {
      setStatus({ kind: "error" });
      return;
    }
    const body = res.result as Status;
    if (body && (body.kind === "unavailable" || body.kind === "unregistered" || body.kind === "registered")) {
      setStatus(body);
      return;
    }
    setStatus({ kind: "error" });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (status.kind === "loading") return <PrivacySkeleton variant="cards" />;
  if (busy) {
    return (
      <RegisterWait />
    );
  }
  if (status.kind === "unavailable" || status.kind === "error") {
    return (
      <div className="privacy-gate">
        <p>{t("privacy.unavailable")}</p>
      </div>
    );
  }
  if (status.kind === "registered") {
    return (
      <div className="privacy-registered">
        <div className="privacy-actions">
          <button type="button" className="token-detail-action is-shield" onClick={() => navigateTo("shield-pick")}>
            <IconShield />
            {t("privacy.shield")}
          </button>
          <button type="button" className="token-detail-action is-unshield" onClick={() => navigateTo("unshield-pick")}>
            <IconUnshield />
            {t("privacy.unshield")}
          </button>
        </div>
        <ul className="token-list">
        {status.rows.map((row) => {
          const open = openMint === row.mint && row.notes.length > 0;
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
          const notes = [...row.notes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
          return (
            <li key={row.mint} className={`token-block${open ? " is-expanded" : ""}`}>
              <div
                className="token-card"
                role="button"
                tabIndex={0}
                onClick={() => {
                  setDetailTokenId(row.mint);
                  navigateTo("private-detail");
                }}
              >
                <TokenTrust row={card} />
                <TokenIcon row={card} />
                <div className="token-main">
                  <div className="token-sym">{card.name || card.symbol}</div>
                  <div className="token-qty">{card.uiAmountLabel} {card.symbol}</div>
                </div>
                <div className="token-usd">{card.usdLabel}</div>
                {row.notes.length > 0 ? (
                  <button
                    type="button"
                    className="row-expand-btn"
                    aria-expanded={open}
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMint(open ? null : row.mint);
                    }}
                  >
                    <IconChevronDown size={16} />
                  </button>
                ) : null}
              </div>
              {open ? (
                <div className="privacy-notes">
                  <p className="privacy-utxo-list-label">{t("privacy.utxoList")}</p>
                  {notes.map((note) => (
                    <div key={note.id} className="privacy-note">
                      <UtxoReceipt id={note.id} amount={note.amount} unit={card.symbol} />
                    </div>
                  ))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      </div>
    );
  }
  return (
    <div className="privacy-gate">
      <p>{t("privacy.registerConsent")}</p>
      {failed ? <p>{failed}</p> : null}
      <button
        className="primary-btn"
        type="button"
        disabled={!status.canPayFee}
        onClick={() => {
          setBusy(true);
          setFailed("");
          void sendExtensionRequest("wallet.privacyRegister", {}).then((res) => {
            if (!res.ok) {
              setBusy(false);
              setFailed(res.error?.message || t("privacy.registerFailed"));
              return;
            }
            showToast(t("privacy.registered"), "ok");
            void load().finally(() => setBusy(false));
          });
        }}
      >
        {t("privacy.register")}
      </button>
    </div>
  );
}
