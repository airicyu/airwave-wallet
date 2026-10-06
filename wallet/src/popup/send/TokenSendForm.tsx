import type { JSX } from "react";
import { NATIVE_SOL_ID } from "../home/home-tokens";
import { bumpUi, session } from "../lib/session";
import { solReserveLamports } from "../../shared/wallet-send-amount";
import type { State } from "../types";
import { applyHalfSendAmount, applyMaxSendAmount, findTokenRowById, tokenBalanceRaw } from "./send-logic";

export function TokenSendForm({ wallet }: { wallet: State }): JSX.Element {
  const row = session.detailTokenId ? findTokenRowById(session.detailTokenId) : undefined;
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
            value={session.sendAmount}
            onChange={(e) => {
              session.sendAmount = e.target.value;
              bumpUi();
            }}
          />
          <button
            type="button"
            id="send-half"
            className="send-max-btn"
            disabled={halfDisabled}
            onClick={() => applyHalfSendAmount()}
          >
            50%
          </button>
          <button
            type="button"
            id="send-max"
            className="send-max-btn"
            disabled={maxDisabled}
            onClick={() => applyMaxSendAmount(wallet)}
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
            value={session.sendRecipient}
            onChange={(e) => {
              session.sendRecipient = e.target.value;
              bumpUi();
            }}
          />
        </div>
        <p id="send-form-error" className="error" hidden={!session.sendFormError}>
          {session.sendFormError}
        </p>
      </div>
    </div>
  );
}
