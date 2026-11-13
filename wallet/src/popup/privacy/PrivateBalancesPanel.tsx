/**
 * Private Balances tab: unavailable, register consent, or mint rows with UTXO expand.
 * Combined accounts show the aggregated member panel from the design demo.
 * A combined account is read-only here: no Register, Shield, or Unshield.
 * refreshKey bumps when the home refresh control asks this panel to reload.
 */
import { useCallback, useEffect, useState, type JSX } from "react";
import { isCombinedAccount } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { loadPrivacyStatus, type PrivacyMember, type PrivacyRow } from "./privacy-status";
import { privacyTokenCard } from "./privacy-token-card";
import { markRegisterFrom } from "./register-return";
import { IconChevronDown, IconShield, IconUnshield } from "../components/StrokeIcon";
import { TokenIcon, TokenTrust } from "../home/HomeTokenList";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { RegisterWait } from "./RegisterWait";
import { UtxoReceipt } from "./UtxoReceipt";

type Status =
  | { kind: "loading" }
  | { kind: "unavailable" }
  | { kind: "unregistered"; canPayFee: boolean }
  | { kind: "registered"; rows: PrivacyRow[] }
  | { kind: "error" };

export function PrivateBalancesPanel({ refreshKey = 0 }: { refreshKey?: number }): JSX.Element {
  const { t } = useT();
  const { navigateTo, setDetailTokenId, homeTokenRows, setActiveWalletSendRequestId, wallet } = usePopupContext();
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [openMint, setOpenMint] = useState<string | null>(null);
  const [openMember, setOpenMember] = useState<string | null>(null);
  const active = wallet?.accounts.find((account) => account.id === wallet.activeAccountId);
  const combined = active != null && isCombinedAccount(active);
  const activeId = wallet?.activeAccountId ?? null;

  const load = useCallback(async () => {
    setStatus({ kind: "loading" });
    setOpenMint(null);
    setOpenMember(null);
    const body = await loadPrivacyStatus();
    if (body.kind === "error") {
      setStatus({ kind: "error" });
      return;
    }
    setStatus(body);
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey, activeId]);

  if (status.kind === "loading") return <PrivacySkeleton variant="cards" />;
  if (busy && !combined) {
    return <RegisterWait />;
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
        {!combined ? (
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
        ) : null}
        <ul className="token-list">
          {status.rows.map((row) => (
            <PrivateBalanceRow
              key={row.mint}
              row={row}
              combined={combined}
              open={openMint === row.mint}
              openMemberKey={openMint === row.mint ? openMember : null}
              onOpenDetail={() => {
                setDetailTokenId(row.mint);
                navigateTo("private-detail");
              }}
              onToggleMint={() => {
                setOpenMint((current) => (current === row.mint ? null : row.mint));
                setOpenMember(null);
              }}
              onToggleMember={(pubkey) => {
                const key = `${row.mint}:${pubkey}`;
                setOpenMember((current) => (current === key ? null : key));
              }}
            />
          ))}
        </ul>
      </div>
    );
  }
  if (combined) {
    return (
      <div className="privacy-gate">
        <p>{t("privacy.unavailable")}</p>
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
            const { requestId } = res.result as { requestId: string };
            markRegisterFrom("tab");
            setActiveWalletSendRequestId(requestId);
            setBusy(false);
            navigateTo("send-approval");
          });
        }}
      >
        {t("privacy.register")}
      </button>
    </div>
  );
}

function PrivateBalanceRow({
  row,
  combined,
  open,
  openMemberKey,
  onOpenDetail,
  onToggleMint,
  onToggleMember,
}: {
  row: PrivacyRow;
  combined: boolean;
  open: boolean;
  openMemberKey: string | null;
  onOpenDetail: () => void;
  onToggleMint: () => void;
  onToggleMember: (pubkey: string) => void;
}): JSX.Element {
  const { t } = useT();
  const { homeTokenRows } = usePopupContext();
  const card = privacyTokenCard(row.mint, row.amount, row.usdLabel, homeTokenRows);
  const members = row.members ?? [];
  const canExpand = combined ? members.length > 0 : row.notes.length > 0;
  const notes = [...row.notes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return (
    <li className={`token-block${open ? " is-expanded" : ""}`}>
      <div
        className="token-card"
        role="button"
        tabIndex={0}
        onClick={onOpenDetail}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetail();
          }
        }}
      >
        <TokenTrust row={card} />
        <TokenIcon row={card} />
        <div className="token-main">
          <div className="token-sym">{card.name || card.symbol}</div>
          <div className="token-qty">
            {card.uiAmountLabel} {card.symbol}
          </div>
        </div>
        <div className="token-usd">{card.usdLabel}</div>
        {canExpand ? (
          <button
            type="button"
            className="row-expand-btn"
            aria-expanded={open}
            onClick={(event) => {
              event.stopPropagation();
              onToggleMint();
            }}
          >
            <IconChevronDown size={16} />
          </button>
        ) : null}
      </div>
      {open && combined ? (
        <div className="token-member-panel">
          {members.map((member) => (
            <CombinedPrivateMember
              key={member.pubkey}
              member={member}
              unit={card.symbol}
              open={openMemberKey === `${row.mint}:${member.pubkey}`}
              onToggle={() => onToggleMember(member.pubkey)}
            />
          ))}
        </div>
      ) : null}
      {open && !combined ? (
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
}

function CombinedPrivateMember({
  member,
  unit,
  open,
  onToggle,
}: {
  member: PrivacyMember;
  unit: string;
  open: boolean;
  onToggle: () => void;
}): JSX.Element {
  const pct = Math.round(member.percent);
  const bar = Math.min(100, Math.max(0, member.percent));
  const canExpand = member.notes.length > 0;
  return (
    <div className={`token-member${open ? " is-expanded" : ""}`}>
      <div className="token-member-head">
        <div className="token-member-grow">
          <div className="token-member-top">
            <span className="token-member-addr">{shortAddr(member.pubkey)}</span>
            <span className="token-member-pct">{`${pct}%`}</span>
          </div>
          <div className="token-member-amt">
            {member.amount} {unit}
          </div>
          <div className="token-member-bar" aria-hidden="true">
            <i style={{ width: `${bar}%` }} />
          </div>
        </div>
        {canExpand ? (
          <button type="button" className="row-expand-btn" aria-expanded={open} onClick={onToggle}>
            <IconChevronDown size={16} />
          </button>
        ) : null}
      </div>
      {open ? (
        <div className="privacy-notes">
          {member.notes.map((note) => (
            <div key={note.id} className="privacy-note">
              <UtxoReceipt id={note.id} amount={note.amount} unit={unit} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
