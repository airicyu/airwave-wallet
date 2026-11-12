/**
 * Private Send form. It shows the private balance, the recipient, and the UTXO selection.
 * Auto-select uses note-cover. Turning auto-select off lets the user pick notes.
 * Confirm asks the service worker to build the transfer and open approval.
 * The address book and the approval shell are separate screens. This form keeps its draft while those screens are open.
 *
 * Confirm currently sends the mint, the amount, and the recipient. It does not send the selected note ids, so the service worker chooses notes again while it builds the proof.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { NATIVE_SOL_ID } from "../../shared/home";
import { SOL_MINT } from "@heliuslabs/spr/transaction";
import { parsePublicKeyBase58 } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { amountUiToRaw, formatRawToAmountUi } from "../../shared/send";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { useT } from "../state/useT";
import { syncWalletSendAbortId } from "../approval/ApprovalHost";
import { markPrivateSendApproval, markPrivateSendPick, readPrivateSendDraft, writePrivateSendDraft } from "./private-send-draft";
import { PrivacySkeleton } from "./PrivacySkeleton";
import { UtxoReceipt } from "./UtxoReceipt";
import { IconBook, IconX } from "../components/StrokeIcon";
import { shortAddr } from "../lib/format";
import { coverAmount, notesByAmountDesc, type SpendNote } from "./note-cover";
import { loadPrivacyStatus, privacyRowForMint } from "./privacy-status";

export function PrivateSendForm(): JSX.Element {
  const draft = readPrivateSendDraft();
  const { detailTokenId, homeTokenRows, setActiveWalletSendRequestId, navigateTo, setTitleOverride } = usePopupContext();
  const { t, locale } = useT();
  const [amount, setAmount] = useState(draft.amount);
  const [recipient, setRecipient] = useState(draft.recipient);
  const [pickedLabel, setPickedLabel] = useState(draft.label);
  const [auto, setAuto] = useState(draft.auto);
  const [open, setOpen] = useState(draft.open);
  const [selected, setSelected] = useState<string[]>(draft.selected);
  const [notes, setNotes] = useState<SpendNote[]>([]);
  const [balance, setBalance] = useState("—");
  const [decimals, setDecimals] = useState(9);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [formError, setFormError] = useState("");
  const [ready, setReady] = useState(false);
  const [building, setBuilding] = useState(false);
  const buildingRef = useRef(false);

  const mint = detailTokenId ?? "";
  const publicId = mint === SOL_MINT ? NATIVE_SOL_ID : mint;
  const row = homeTokenRows.find((item) => item.id === publicId);
  const order = useMemo(() => notesByAmountDesc(notes), [notes]);

  useEffect(() => {
    setTitleOverride(row ? `${t("privacy.privateSend")} (${row.symbol})` : t("privacy.privateSend"));
    return () => setTitleOverride(null);
  }, [row, setTitleOverride, t]);

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

  useEffect(() => {
    if (!parsePublicKeyBase58(recipient.trim())) {
      setRegistered(null);
      return;
    }
    let cancelled = false;
    void sendExtensionRequest("wallet.privacyRecipient", { address: recipient.trim() }).then((res) => {
      if (cancelled || !res.ok) return;
      setRegistered((res.result as { registered?: boolean }).registered === true);
    });
    return () => {
      cancelled = true;
    };
  }, [recipient]);

  const target = amountUiToRaw(amount.trim(), row?.decimals ?? decimals) ?? 0n;
  const picked = auto ? coverAmount(order, target) : selected;
  const pickedSum = picked.reduce((sum, id) => {
    const note = order.find((item) => item.id === id);
    return sum + (note ? BigInt(note.amountRaw) : 0n);
  }, 0n);
  const overLimit = picked.length > 40;
  const short = target > 0n && pickedSum < target;
  const unregistered = registered === false;

  useEffect(() => {
    if (auto) {
      setSelected(picked);
      writePrivateSendDraft({ selected: picked });
    }
  }, [auto, amount, notes]);

  const onPrimary = useCallback(async () => {
    if (buildingRef.current) return;
    buildingRef.current = true;
    setBuilding(true);
    setFormError("");
    const res = await sendExtensionRequest("wallet.beginPrivateSend", {
      mint,
      amountUi: amount.trim(),
      recipient: recipient.trim(),
    });
    if (!res.ok) {
      buildingRef.current = false;
      setBuilding(false);
      setFormError(apiErrorMessage(locale, res.error, "error.sendBuildFailed"));
      return;
    }
    const { requestId } = res.result as { requestId: string };
    markPrivateSendApproval();
    setActiveWalletSendRequestId(requestId);
    syncWalletSendAbortId(requestId);
    navigateTo("send-approval");
  }, [amount, locale, mint, navigateTo, recipient, setActiveWalletSendRequestId]);

  useRegisterDock({
    label: t("send.confirm"),
    disabled: target <= 0n || !parsePublicKeyBase58(recipient.trim()) || overLimit || short || unregistered,
    busy: building,
    onPrimary,
  });

  if (!ready) return <PrivacySkeleton variant="form" />;

  return (
    <div className="token-send-form private-send-form">
      <p className="token-send-balance">
        <span className="token-send-balance-label">{t("send.balance")}</span>
        <span>{balance}{row ? ` ${row.symbol}` : ""}</span>
      </p>
      <hr className="token-send-rule" />
      <div className="token-send-fields">
      <div className="token-send-row">
        <label className="token-send-qty-label" htmlFor="private-send-amount">{t("send.amount")}</label>
        <input
          id="private-send-amount"
          className="token-send-input"
          inputMode="decimal"
          value={amount}
          onChange={(event) => {
            setAmount(event.target.value);
            writePrivateSendDraft({ amount: event.target.value });
          }}
        />
        <button type="button" className="send-max-btn" onClick={() => {
          const raw = amountUiToRaw(balance, row?.decimals ?? decimals);
          if (raw == null) return;
          const next = formatRawToAmountUi(raw / 2n, row?.decimals ?? decimals);
          setAmount(next);
          writePrivateSendDraft({ amount: next });
        }}>50%</button>
        <button type="button" className="send-max-btn" onClick={() => {
          setAmount(balance);
          writePrivateSendDraft({ amount: balance });
        }}>{t("send.max")}</button>
      </div>
      <div className="token-send-recipient">
        <label className="field-label" htmlFor="private-send-recipient">{t("send.recipient")}</label>
        {pickedLabel ? (
          <div className="send-picked">
            <strong>{pickedLabel}</strong>
            <span className="mono">{shortAddr(recipient)}</span>
            <button
              type="button"
              className="icon-btn ghost-inline"
              title={t("addressCards.clear")}
              aria-label={t("addressCards.clear")}
              onClick={() => {
                setRecipient("");
                setPickedLabel("");
                writePrivateSendDraft({ recipient: "", label: "" });
              }}
            >
              <IconX />
            </button>
          </div>
        ) : (
          <div className="send-recipient-line">
            <input
              id="private-send-recipient"
              className="token-send-input mono"
              autoComplete="off"
              spellCheck={false}
              placeholder={t("send.recipientPlaceholder")}
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value);
                setPickedLabel("");
                writePrivateSendDraft({ recipient: event.target.value, label: "" });
              }}
            />
            <button
              type="button"
              className="icon-btn"
              title={t("addressCards.open")}
              aria-label={t("addressCards.open")}
              onClick={() => {
                markPrivateSendPick();
                navigateTo("send-pick");
              }}
            >
              <IconBook />
            </button>
          </div>
        )}
      </div>
      </div>
      <hr className="token-send-rule" />
      <div className="utxo-head">
        <button
          type="button"
          className="utxo-disc"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            writePrivateSendDraft({ open: !open });
          }}
        >
          <span className={open ? "disc open" : "disc"}>▸</span>
          {t("privacy.utxoSelection")}
        </button>
        <div className="utxo-auto">
          <span>{t("privacy.autoSelect")}</span>
          <button
            type="button"
            className="tx-ai-switch"
            role="switch"
            aria-checked={auto}
            aria-label={t("privacy.autoSelect")}
            onClick={() => {
              const next = !auto;
              setAuto(next);
              writePrivateSendDraft({ auto: next });
              if (!next) {
                setOpen(true);
                writePrivateSendDraft({ open: true });
              }
            }}
          />
        </div>
      </div>
      {open ? (
        <div className="privacy-notes privacy-notes-scroll">
          {order.map((note) => {
            const on = picked.includes(note.id);
            return (
              <div
                key={note.id}
                className="privacy-note"
                role="button"
                aria-disabled={auto}
                onClick={() => {
                  if (auto) return;
                  const next = on ? selected.filter((id) => id !== note.id) : [...selected, note.id];
                  setSelected(next);
                  writePrivateSendDraft({ selected: next });
                }}
              >
                <span className={on ? "privacy-check on" : "privacy-check"} />
                <UtxoReceipt id={note.id} amount={note.amount} unit={row?.symbol ?? ""} />
              </div>
            );
          })}
        </div>
      ) : null}
      {short ? <p>{t("privacy.insufficient")}</p> : null}
      {overLimit ? <p>{t("privacy.over40")}</p> : null}
      {unregistered ? <p>{t("privacy.unregisteredRecipient")}</p> : null}
      {formError ? <p className="form-error">{formError}</p> : null}
    </div>
  );
}
