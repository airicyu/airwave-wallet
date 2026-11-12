/**
 * Private token detail: icon, action buttons, amount, mint, and the UTXO list.
 * Does not build Shield, Send, Unshield, or Merge transactions.
 */
import { useEffect, useState, type JSX } from "react";
import { NATIVE_SOL_ID, shortMint, type HomeTokenRow } from "../../shared/home";
import { CopyIconButton } from "../components/CopyPkButton";
import { TokenIcon } from "../home/HomeTokenList";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { clearShieldAmount, setShieldBack } from "./shield-approval";
import { clearUnshieldDraft, setUnshieldBack } from "./unshield-draft";
import { clearPrivateSendDraft } from "./private-send-draft";
import { loadPrivacyStatus, privacyRowForMint, type PrivacyRow } from "./privacy-status";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { IconMerge, IconSend, IconShield, IconUnshield } from "../components/StrokeIcon";
import { UtxoReceipt } from "./UtxoReceipt";

export function PrivateTokenDetail({ mint }: { mint: string }): JSX.Element {
  const { t } = useT();
  const { navigateTo, homeTokenRows } = usePopupContext();
  const [row, setRow] = useState<PrivacyRow | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    let cancelled = false;
    void loadPrivacyStatus().then((body) => {
      if (cancelled) return;
      const found = body.kind === "registered" ? privacyRowForMint(body.rows, mint) ?? null : null;
      setRow(found);
      setPhase(found ? "ready" : "missing");
    });
    return () => {
      cancelled = true;
    };
  }, [mint]);

  if (phase === "loading") return <PrivacySkeleton variant="detail" />;
  if (!row) {
    return (
      <div className="token-detail">
        <p className="muted">{t("privacy.unavailable")}</p>
      </div>
    );
  }

  const publicId = row.mint === "11111111111111111111111111111111" ? NATIVE_SOL_ID : row.mint;
  const known = homeTokenRows.find((item) => item.id === publicId);
  const unit = known?.symbol ?? (publicId === NATIVE_SOL_ID ? "SOL" : "");
  const card: HomeTokenRow = known ?? {
    id: publicId,
    name: publicId === NATIVE_SOL_ID ? "Solana" : row.mint.slice(0, 4),
    symbol: unit,
    uiAmount: 0,
    uiAmountLabel: row.amount,
    usdLabel: "",
    iconLetter: publicId === NATIVE_SOL_ID ? "S" : row.mint.slice(0, 1),
    decimals: publicId === NATIVE_SOL_ID ? 9 : 0,
  };

  return (
    <div className="token-detail">
      <div className="token-detail-hero">
        <TokenIcon row={card} />
        <h3 className="token-detail-name">{card.name || card.symbol}</h3>
        <div className="privacy-actions">
          <button type="button" className="token-detail-action" onClick={() => {
            clearPrivateSendDraft();
            navigateTo("private-send");
          }}>
            <IconSend />
            {t("send.action")}
          </button>
          <button type="button" className="token-detail-action is-shield" onClick={() => {
            clearShieldAmount();
            setShieldBack("private-detail");
            navigateTo("shield");
          }}>
            <IconShield />
            {t("privacy.shield")}
          </button>
          <button type="button" className="token-detail-action is-unshield" onClick={() => {
            clearUnshieldDraft();
            setUnshieldBack("private-detail");
            navigateTo("unshield");
          }}>
            <IconUnshield />
            {t("privacy.unshield")}
          </button>
          <button type="button" className="token-detail-action is-merge" onClick={() => navigateTo("merge")}>
            <IconMerge />
            {t("privacy.merge")}
          </button>
        </div>
      </div>
      <div className="token-detail-meta">
        <div className="token-detail-row">
          <span className="label">{t("send.amount")}</span>
          <span>{row.amount}{unit ? ` ${unit}` : ""}</span>
        </div>
        <div className="token-detail-row">
          <span className="label">{t("token.mint")}</span>
          {publicId === NATIVE_SOL_ID ? (
            <span>{t("token.native")}</span>
          ) : (
            <span className="token-detail-mint">
              <span>{shortMint(row.mint)}</span>
              <CopyIconButton text={row.mint} />
            </span>
          )}
        </div>
      </div>
      <hr className="privacy-rule" />
      <h4 className="privacy-utxo-title">{t("privacy.utxos")}</h4>
      <p className="privacy-utxo-count">{t("privacy.utxoCount", { count: String(row.notes.length) })}</p>
      {row.notes.length >= 40 ? <p className="privacy-utxo-warn">{t("privacy.utxoWarn")}</p> : null}
      <div className="privacy-notes privacy-notes-scroll">
        {row.notes.map((note) => (
          <div key={note.id} className="privacy-note">
            <UtxoReceipt id={note.id} amount={note.amount} unit={unit} />
          </div>
        ))}
      </div>
    </div>
  );
}
