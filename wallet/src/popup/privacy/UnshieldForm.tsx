/**
 * Unshield form. The amount returns to the signing address. There is no recipient field.
 * Auto-select uses the same note order as Private Send. Confirm asks the service worker to build the withdrawal and open approval.
 * Back returns to the screen that opened this form, which is either the private token or the Unshield picker.
 *
 * Confirm currently sends the mint and the amount. It does not send the selected note ids, so the service worker chooses notes again while it builds the proof.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { NATIVE_SOL_ID } from "../../shared/home";
import { SOL_MINT } from "@heliuslabs/spr/transaction";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { amountUiToRaw, formatRawToAmountUi } from "../../shared/send";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import { syncWalletSendAbortId } from "../approval/ApprovalHost";
import { clearUnshieldDraft, markUnshieldApproval, readUnshieldBack, readUnshieldDraft, setUnshieldBack, writeUnshieldDraft } from "./unshield-draft";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { UtxoReceipt } from "./UtxoReceipt";
import { coverAmount, notesByAmountDesc, type SpendNote } from "./note-cover";
import { loadPrivacyStatus, privacyRowForMint } from "./privacy-status";

export function UnshieldForm(): JSX.Element {
  const draft = readUnshieldDraft();
  const { detailTokenId, homeTokenRows, setActiveWalletSendRequestId, navigateTo, setTitleOverride, setBackOverride } = usePopupContext();
  const { t, locale } = useT();
  const [amount, setAmount] = useState(draft.amount);
  const [auto, setAuto] = useState(draft.auto);
  const [open, setOpen] = useState(draft.open);
  const [selected, setSelected] = useState<string[]>(draft.selected);
  const [notes, setNotes] = useState<SpendNote[]>([]);
  const [balance, setBalance] = useState("—");
  const [formError, setFormError] = useState("");
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);
  const buildingRef = useRef(false);
  const mint = detailTokenId ?? "";
  const publicId = mint === SOL_MINT ? NATIVE_SOL_ID : mint;
  const row = homeTokenRows.find((item) => item.id === publicId);
  const decimals = row?.decimals ?? 9;
  const order = useMemo(() => notesByAmountDesc(notes), [notes]);

  useEffect(() => {
    setTitleOverride(row ? `${t("privacy.unshield")} ${row.symbol}` : t("privacy.unshield"));
    setBackOverride(() => {
      navigateTo(readUnshieldBack());
      return true;
    });
    return () => {
      setTitleOverride(null);
      setBackOverride(null);
    };
  }, [navigateTo, row, setBackOverride, setTitleOverride, t]);

  useEffect(() => {
    let cancelled = false;
    void loadPrivacyStatus().then((body) => {
      if (cancelled) return;
      setReady(true);
      if (body.kind !== "registered") return;
      const found = privacyRowForMint(body.rows, mint);
      if (!found) return;
      setNotes(found.notes);
      setBalance(found.amount);
    });
    return () => {
      cancelled = true;
    };
  }, [mint]);

  const target = amountUiToRaw(amount.trim(), decimals) ?? 0n;
  const picked = auto ? coverAmount(order, target) : selected;
  const pickedSum = picked.reduce((sum, id) => sum + BigInt(order.find((item) => item.id === id)?.amountRaw ?? "0"), 0n);
  const overLimit = picked.length > 40;
  const short = target > 0n && pickedSum < target;

  useEffect(() => {
    if (!auto) return;
    setSelected(picked);
    writeUnshieldDraft({ selected: picked });
  }, [auto, amount, notes]);

  const onPrimary = useCallback(async () => {
    if (buildingRef.current) return;
    buildingRef.current = true;
    setBuilding(true);
    setFormError("");
    const res = await sendExtensionRequest("wallet.beginUnshield", { mint, amountUi: amount.trim() });
    if (!res.ok) {
      buildingRef.current = false;
      setBuilding(false);
      setFormError(apiErrorMessage(locale, res.error, "error.sendBuildFailed"));
      return;
    }
    const { requestId } = res.result as { requestId: string };
    markUnshieldApproval();
    setActiveWalletSendRequestId(requestId);
    syncWalletSendAbortId(requestId);
    navigateTo("send-approval");
  }, [amount, locale, mint, navigateTo, setActiveWalletSendRequestId]);

  useRegisterDock({
    label: t("send.confirm"),
    disabled: target <= 0n || overLimit || short,
    busy: building,
    onPrimary,
  });

  if (!ready) return <PrivacySkeleton variant="form" />;

  return (
    <div className="token-send-form">
      <p className="token-send-balance">
        <span className="token-send-balance-label">{t("privacy.privateBalance")}</span>
        <span>{balance}{row ? ` ${row.symbol}` : ""}</span>
      </p>
      <hr className="token-send-rule" />
      <div className="token-send-row">
        <label className="token-send-qty-label" htmlFor="unshield-amount">{t("send.amount")}</label>
        <input
          id="unshield-amount"
          className="token-send-input"
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            writeUnshieldDraft({ amount: event.target.value });
          }}
        />
        <button type="button" className="send-max-btn" onClick={() => {
          const raw = amountUiToRaw(balance, decimals);
          if (raw == null) return;
          const next = formatRawToAmountUi(raw / 2n, decimals);
          setAmount(next);
          writeUnshieldDraft({ amount: next });
        }}>50%</button>
        <button type="button" className="send-max-btn" onClick={() => {
          setAmount(balance);
          writeUnshieldDraft({ amount: balance });
        }}>{t("send.max")}</button>
      </div>
      <hr className="token-send-rule" />
      <div className="utxo-head">
        <button type="button" className="utxo-disc" aria-expanded={open} onClick={() => {
          setOpen(!open);
          writeUnshieldDraft({ open: !open });
        }}>
          <span className={open ? "disc open" : "disc"}>▸</span>
          {t("privacy.utxoSelection")}
        </button>
        <div className="utxo-auto">
          <span>{t("privacy.autoSelect")}</span>
          <button type="button" className="tx-ai-switch" role="switch" aria-checked={auto} aria-label={t("privacy.autoSelect")} onClick={() => {
            const next = !auto;
            setAuto(next);
            writeUnshieldDraft({ auto: next });
            if (!next) {
              setOpen(true);
              writeUnshieldDraft({ open: true });
            }
          }} />
        </div>
      </div>
      {open ? (
        <div className="privacy-notes privacy-notes-scroll">
          {order.map((note) => {
            const on = picked.includes(note.id);
            return (
              <div key={note.id} className="privacy-note" role="button" aria-disabled={auto} onClick={() => {
                if (auto) return;
                const next = on ? selected.filter((id) => id !== note.id) : [...selected, note.id];
                setSelected(next);
                writeUnshieldDraft({ selected: next });
              }}>
                <span className={on ? "privacy-check on" : "privacy-check"} />
                <UtxoReceipt id={note.id} amount={note.amount} unit={row?.symbol ?? ""} />
              </div>
            );
          })}
        </div>
      ) : null}
      {short ? <p>{t("privacy.insufficient")}</p> : null}
      {overLimit ? <p>{t("privacy.over40")}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}
    </div>
  );
}
