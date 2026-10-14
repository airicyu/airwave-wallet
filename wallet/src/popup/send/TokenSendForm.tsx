/**
 * In-popup token send form: amount, recipient, and review.
 * Does not build or sign the transaction.
 */
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { NATIVE_SOL_ID } from "../home/home-tokens";
import { messageForErrorCode } from "../../shared/ui-i18n";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { solReserveLamports } from "../../shared/wallet-send-amount";
import type { State } from "../types";
import { homeTokenRowForSendBalance } from "../../shared/wallet-send-eligibility";
import { beginTokenSend, findTokenRowById, halfSendAmount, maxSendAmount, sendFormValid, tokenBalanceRaw } from "./send-logic";
import { patchSendDraft, readSendDraft } from "./send-draft";
import { IconBook, IconX } from "../components/StrokeIcon";
import { shortAddr } from "../lib/format";
import { syncWalletSendAbortId } from "../components/ApprovalHost";

export function TokenSendForm({ wallet }: { wallet: State }): JSX.Element {
  const {
    detailTokenId,
    homeTokenRows,
    pendingSendFormError,
    consumePendingSendFormError,
    setActiveWalletSendRequestId,
    navigateTo,
  } = usePopupContext();
  const { t, locale } = useT();
  const initial = readSendDraft();
  const [amount, setAmount] = useState(initial.amount);
  const [recipient, setRecipient] = useState(initial.recipient);
  const [pickedLabel, setPickedLabel] = useState(initial.label);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!pendingSendFormError) return;
    setFormError(messageForErrorCode(locale, pendingSendFormError) || pendingSendFormError);
    consumePendingSendFormError();
  }, [pendingSendFormError, consumePendingSendFormError, locale]);

  const rawRow = detailTokenId ? findTokenRowById(homeTokenRows, detailTokenId) : undefined;
  const active = wallet.accounts.find((a) => a.id === wallet.activeAccountId);
  const row =
    rawRow && active ? homeTokenRowForSendBalance(rawRow, active) : rawRow;
  let balance = "—";
  let halfDisabled = true;
  let maxDisabled = true;
  if (row && wallet.unlocked) {
    balance = `${row.uiAmountLabel} ${row.symbol}`;
    const raw = tokenBalanceRaw(row);
    if (raw != null && raw !== 0n) {
      halfDisabled = raw / 2n === 0n;
      if (row.id === NATIVE_SOL_ID) {
        const reserve = solReserveLamports(wallet.settings.defaultCuPrice);
        maxDisabled = raw <= reserve;
      } else {
        maxDisabled = false;
      }
    }
  }

  const valid = sendFormValid({
    state: wallet,
    rows: homeTokenRows,
    detailTokenId,
    amount,
    recipient,
  });

  const onPrimary = useCallback(async () => {
    if (!detailTokenId) return;
    setFormError("");
    if (
      !sendFormValid({
        state: wallet,
        rows: homeTokenRows,
        detailTokenId,
        amount,
        recipient,
      })
    ) {
      return;
    }
    const res = await beginTokenSend({
      tokenId: detailTokenId,
      amountUi: amount.trim(),
      recipient: recipient.trim(),
      locale,
    });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setActiveWalletSendRequestId(res.requestId);
    syncWalletSendAbortId(res.requestId);
    navigateTo("send-approval");
  }, [amount, recipient, detailTokenId, homeTokenRows, wallet, locale, setActiveWalletSendRequestId, navigateTo]);

  useRegisterDock({
    label: t("send.confirm"),
    disabled: !wallet || !valid,
    onPrimary,
  });

  return (
    <div className="token-send-form">
      <div className="token-send-info">
        <p id="send-balance" className="token-send-balance">
          <span className="token-send-balance-label">{t("send.balance")}</span>
          <span id="send-balance-value">{balance}</span>
        </p>
      </div>
      <hr className="token-send-rule" />
      <div className="token-send-fields">
        <div className="token-send-row">
          <label className="token-send-qty-label" htmlFor="send-amount">
            {t("send.amount")}
          </label>
          <input
            type="text"
            id="send-amount"
            className="token-send-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              patchSendDraft({ amount: e.target.value });
            }}
          />
          <button
            type="button"
            id="send-half"
            className="send-max-btn"
            disabled={halfDisabled}
            onClick={() => {
              if (!row) return;
              const next = halfSendAmount(row);
              if (next != null) {
                setAmount(next);
                patchSendDraft({ amount: next });
              }
            }}
          >
            50%
          </button>
          <button
            type="button"
            id="send-max"
            className="send-max-btn"
            disabled={maxDisabled}
            onClick={() => {
              if (!row) return;
              const next = maxSendAmount(row, wallet);
              if (next != null) {
                setAmount(next);
                patchSendDraft({ amount: next });
              }
            }}
          >
            {t("send.max")}
          </button>
        </div>
        <div className="token-send-recipient">
          <label className="field-label" htmlFor="send-recipient">
            {t("send.recipient")}
          </label>
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
                  patchSendDraft({ recipient: "", label: "" });
                }}
              >
                <IconX />
              </button>
            </div>
          ) : (
            <div className="send-recipient-line">
              <input
                type="text"
                id="send-recipient"
                className="token-send-input mono"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("send.recipientPlaceholder")}
                value={recipient}
                onChange={(e) => {
                  setRecipient(e.target.value);
                  setPickedLabel("");
                  patchSendDraft({ recipient: e.target.value, label: "" });
                }}
              />
              <button
                type="button"
                className="icon-btn"
                title={t("addressCards.open")}
                aria-label={t("addressCards.open")}
                onClick={() => navigateTo("send-pick")}
              >
                <IconBook />
              </button>
            </div>
          )}
        </div>
        <p id="send-form-error" className="error" hidden={!formError}>
          {formError}
        </p>
      </div>
    </div>
  );
}
