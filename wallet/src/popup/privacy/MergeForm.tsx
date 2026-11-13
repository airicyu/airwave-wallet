/**
 * Merge UTXO page. Select all and Clear all apply only to notes that can be merged.
 * Fifty-two notes or fewer open one approval. More than 52 notes show one confirm screen for the transactions already built. Reject leaves the selection unchanged.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { NATIVE_SOL_ID } from "../../shared/home";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import { syncWalletSendAbortId } from "../approval/ApprovalHost";
import { markMergeApproval } from "./merge-draft";
import { loadPrivacyStatus, privacyRowForMint, SOL_MINT } from "./privacy-status";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { UtxoReceipt } from "./UtxoReceipt";

type Note = { id: string; amount: string; amountRaw: string; mergeable?: boolean };

function sorted(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => {
    const amount = BigInt(a.amountRaw) - BigInt(b.amountRaw);
    if (amount !== 0n) return amount > 0n ? 1 : -1;
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });
}

export function MergeForm(): JSX.Element {
  const { detailTokenId, homeTokenRows, setActiveWalletSendRequestId, navigateTo, setTitleOverride, setDetailTokenId, setHomeAssetsForce } = usePopupContext();
  const { t, locale } = useT();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [formError, setFormError] = useState("");
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);
  const buildingRef = useRef(false);
  const [batch, setBatch] = useState<{ id: string; groups: string[][] } | null>(null);
  const mint = detailTokenId ?? "";
  const publicId = mint === SOL_MINT ? NATIVE_SOL_ID : mint;
  const row = homeTokenRows.find((item) => item.id === publicId);
  const order = useMemo(() => sorted(notes), [notes]);
  const mergeable = order.filter((note) => note.mergeable !== false);

  useEffect(() => {
    setTitleOverride(row ? `${t("privacy.mergeTitle")} (${row.symbol})` : t("privacy.mergeTitle"));
    return () => setTitleOverride(null);
  }, [row, setTitleOverride, t]);

  useEffect(() => {
    let cancelled = false;
    void loadPrivacyStatus().then((body) => {
      if (cancelled) return;
      setReady(true);
      if (body.kind !== "registered") return;
      const found = privacyRowForMint(body.rows, mint);
      if (found) setNotes(found.notes);
    });
    return () => {
      cancelled = true;
    };
  }, [mint]);

  const onPrimary = useCallback(async () => {
    if (buildingRef.current) return;
    buildingRef.current = true;
    setBuilding(true);
    setFormError("");
    const res = await sendExtensionRequest("wallet.beginMerge", { mint, ids: selected });
    if (!res.ok) {
      buildingRef.current = false;
      setBuilding(false);
      setFormError(apiErrorMessage(locale, res.error, "error.sendBuildFailed"));
      return;
    }
    const result = res.result as { requestId?: string; batchId?: string; groups?: string[][] };
    if (result.batchId && result.groups) {
      buildingRef.current = false;
      setBuilding(false);
      setBatch({ id: result.batchId, groups: result.groups });
      return;
    }
    const requestId = result.requestId ?? "";
    markMergeApproval(requestId);
    setActiveWalletSendRequestId(requestId);
    syncWalletSendAbortId(requestId);
    navigateTo("send-approval");
  }, [locale, mint, navigateTo, selected, setActiveWalletSendRequestId]);

  const confirmBatch = useCallback(async () => {
    if (!batch || buildingRef.current) return;
    buildingRef.current = true;
    setBuilding(true);
    const res = await sendExtensionRequest("wallet.finishMergeBatch", { requestId: batch.id });
    buildingRef.current = false;
    setBuilding(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(locale, res.error, "error.sendBuildFailed"));
      return;
    }
    setDetailTokenId(null);
    setHomeAssetsForce(true);
    navigateTo("home-token");
  }, [batch, locale, navigateTo, setDetailTokenId, setHomeAssetsForce]);

  useRegisterDock(
    batch
      ? {
          label: t("send.confirm"),
          disabled: false,
          busy: building,
          onPrimary: confirmBatch,
          secondaryLabel: t("approval.reject"),
          onSecondary: () => {
            void sendExtensionRequest("wallet.cancelMergeBatch", { requestId: batch.id });
            setBatch(null);
          },
        }
      : {
          label: t("send.confirm"),
          disabled: selected.length < 2,
          busy: building,
          onPrimary,
        },
  );

  if (batch) {
    return (
      <div className="token-send-form">
        <p>{t("privacy.mergeGroups", { count: String(batch.groups.length) })}</p>
        <ol className="merge-groups">
          {batch.groups.map((group, index) => (
            <li key={index}>
              {t("privacy.utxoCount", { count: String(group.length) })}
              {" "}
              {group.map((id) => `${id.slice(0, 4)}…${id.slice(-4)}`).join(", ")}
            </li>
          ))}
        </ol>
        {formError ? <p className="form-error">{formError}</p> : null}
      </div>
    );
  }

  if (!ready) return <PrivacySkeleton variant="form" />;

  return (
    <div className="token-send-form">
      <p>{t("privacy.utxoCount", { count: String(order.length) })}</p>
      <div className="merge-actions">
        <button type="button" className="token-detail-send-btn" onClick={() => setSelected(mergeable.map((note) => note.id))}>
          {t("privacy.selectAll")}
        </button>
        <button type="button" className="token-detail-send-btn" onClick={() => setSelected([])}>
          {t("privacy.clearAll")}
        </button>
      </div>
      <div className="privacy-notes privacy-notes-scroll">
        {order.map((note) => {
          const on = selected.includes(note.id);
          return (
            <div
              key={note.id}
              className="privacy-note"
              role="button"
              aria-disabled={note.mergeable === false}
              onClick={() => {
                if (note.mergeable === false) return;
                setSelected(on ? selected.filter((id) => id !== note.id) : [...selected, note.id]);
              }}
            >
              <span className={on ? "privacy-check on" : "privacy-check"} />
              <UtxoReceipt id={note.id} amount={note.amount} unit={row?.symbol ?? ""} />
            </div>
          );
        })}
      </div>
      {formError ? <p className="form-error">{formError}</p> : null}
    </div>
  );
}
