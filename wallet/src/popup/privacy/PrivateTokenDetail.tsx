/**
 * Private token detail: icon, action buttons, amount, mint, and the UTXO list.
 * Does not build Shield, Send, Unshield, or Merge transactions.
 * A combined account shows the main wallet balance only and hides the action row.
 */
import { useEffect, useState, type JSX } from "react";
import { isCombinedAccount } from "../../shared/accounts";
import { NATIVE_SOL_ID, shortMint } from "../../shared/home";
import { CopyIconButton } from "../components/CopyPkButton";
import { TokenIcon } from "../home/HomeTokenList";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { clearShieldAmount, setShieldBack } from "./shield-approval";
import { clearUnshieldDraft, setUnshieldBack } from "./unshield-draft";
import { clearPrivateSendDraft } from "./private-send-draft";
import {
  loadPrivacyStatus,
  privacyMainDetailRow,
  privacyRowForMint,
  type PrivacyRow,
} from "./privacy-status";
import { privacyTokenCard } from "./privacy-token-card";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { IconMerge, IconSend, IconShield, IconUnshield } from "../components/StrokeIcon";
import { UtxoReceipt } from "./UtxoReceipt";

export function PrivateTokenDetail({ mint }: { mint: string }): JSX.Element {
  const { t } = useT();
  const { navigateTo, homeTokenRows, wallet } = usePopupContext();
  const [row, setRow] = useState<PrivacyRow | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "missing">("loading");
  const active = wallet?.accounts.find((account) => account.id === wallet.activeAccountId);
  const combined = active != null && isCombinedAccount(active);
  const mainPubkey = combined ? active.mainPubkey : null;

  useEffect(() => {
    let cancelled = false;
    void loadPrivacyStatus().then((body) => {
      if (cancelled) return;
      const found = body.kind === "registered" ? privacyRowForMint(body.rows, mint) ?? null : null;
      if (!found) {
        setRow(null);
        setPhase("missing");
        return;
      }
      setRow(mainPubkey ? privacyMainDetailRow(found, mainPubkey) : found);
      setPhase("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [mint, mainPubkey]);

  if (phase === "loading") return <PrivacySkeleton variant="detail" />;
  if (!row) {
    return (
      <div className="token-detail">
        <p className="muted">{t("privacy.unavailable")}</p>
      </div>
    );
  }

  const card = privacyTokenCard(row.mint, row.amount, row.usdLabel, homeTokenRows);
  const unit = card.symbol;

  return (
    <div className="token-detail">
      <div className="token-detail-hero">
        <TokenIcon row={card} />
        <h3 className="token-detail-name">{card.name || card.symbol}</h3>
        {!combined ? (
          <div className="privacy-actions">
            <button type="button" className="token-detail-action" onClick={() => {
              clearPrivateSendDraft();
              navigateTo("private-send");
            }}>
              <IconSend />
              {t("send.action")}
            </button>
            <button type="button" className="token-detail-action" onClick={() => {
              clearShieldAmount();
              setShieldBack("private-detail");
              navigateTo("shield");
            }}>
              <IconShield />
              {t("privacy.shield")}
            </button>
            <button type="button" className="token-detail-action" onClick={() => {
              clearUnshieldDraft();
              setUnshieldBack("private-detail");
              navigateTo("unshield");
            }}>
              <IconUnshield />
              {t("privacy.unshield")}
            </button>
            <button type="button" className="token-detail-action" onClick={() => navigateTo("merge")}>
              <IconMerge />
              {t("privacy.merge")}
            </button>
          </div>
        ) : null}
      </div>
      <div className="token-detail-meta">
        <div className="token-detail-row">
          <span className="label">{t("send.amount")}</span>
          <span>{row.amount}{unit ? ` ${unit}` : ""}</span>
        </div>
        <div className="token-detail-row">
          <span className="label">{t("token.mint")}</span>
          {card.id === NATIVE_SOL_ID ? (
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
      {!combined && row.notes.length >= 40 ? <p className="privacy-utxo-warn">{t("privacy.utxoWarn")}</p> : null}
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
