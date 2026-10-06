import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { NATIVE_SOL_ID } from "../home/home-tokens";
import { usePopupContext } from "../state/PopupContext";
import { useRegisterDock } from "../state/dock";
import { solReserveLamports } from "../../shared/wallet-send-amount";
import type { State } from "../types";
import { beginTokenSend, findTokenRowById, halfSendAmount, maxSendAmount, sendFormValid, tokenBalanceRaw } from "./send-logic";
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
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!pendingSendFormError) return;
    setFormError(pendingSendFormError);
    consumePendingSendFormError();
  }, [pendingSendFormError, consumePendingSendFormError]);

  const row = detailTokenId ? findTokenRowById(homeTokenRows, detailTokenId) : undefined;
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
    });
    if (!res.ok) {
      setFormError(res.error);
      return;
    }
    setActiveWalletSendRequestId(res.requestId);
    syncWalletSendAbortId(res.requestId);
    navigateTo("send-approval");
  }, [amount, recipient, detailTokenId, homeTokenRows, wallet, setActiveWalletSendRequestId, navigateTo]);

  useRegisterDock({
    label: "確認",
    disabled: !wallet || !valid,
    onPrimary,
  });

  return (
    <div className="token-send-form">
      <div className="token-send-info">
        <p id="send-balance" className="token-send-balance">
          <span className="token-send-balance-label">餘額:</span>
          <span id="send-balance-value">{balance}</span>
        </p>
      </div>
      <hr className="token-send-rule" />
      <div className="token-send-fields">
        <div className="token-send-row">
          <label className="token-send-qty-label" htmlFor="send-amount">
            數量
          </label>
          <input
            type="text"
            id="send-amount"
            className="token-send-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button
            type="button"
            id="send-half"
            className="send-max-btn"
            disabled={halfDisabled}
            onClick={() => {
              if (!row) return;
              const next = halfSendAmount(row);
              if (next != null) setAmount(next);
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
              if (next != null) setAmount(next);
            }}
          >
            全部
          </button>
        </div>
        <div className="token-send-recipient">
          <label className="field-label" htmlFor="send-recipient">
            收款地址
          </label>
          <input
            type="text"
            id="send-recipient"
            className="token-send-input mono"
            autoComplete="off"
            spellCheck={false}
            placeholder="Base58 地址"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
          />
        </div>
        <p id="send-form-error" className="error" hidden={!formError}>
          {formError}
        </p>
      </div>
    </div>
  );
}
