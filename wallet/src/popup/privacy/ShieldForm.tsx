/**
 * Shield amount form. Balance is the public balance of the signing address.
 * Does not build the deposit; confirm asks the service worker to open approval.
 */
import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { NATIVE_SOL_ID } from "../../shared/home";
import { sendExtensionRequest } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { halfSendAmount, maxSendAmount } from "../send/send-logic";
import { homeTokenRowForSendBalance } from "../../shared/send";
import { syncWalletSendAbortId } from "../approval/ApprovalHost";
import { RegisterWait } from "./RegisterWait";
import { markRegisterFrom } from "./register-return";
import { loadPrivacyStatus, SOL_MINT } from "./privacy-status";
import { markShieldApproval, readShieldAmount, readShieldBack, writeShieldAmount } from "./shield-approval";

export function ShieldForm(): JSX.Element {
  const { detailTokenId, homeTokenRows, wallet, setActiveWalletSendRequestId, navigateTo, setTitleOverride, setBackOverride, showToast } = usePopupContext();
  const { t, locale } = useT();
  const [amount, setAmount] = useState(readShieldAmount);
  const [registered, setRegistered] = useState<boolean | null>(null);
  const [canPayFee, setCanPayFee] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [formError, setFormError] = useState("");
  const [building, setBuilding] = useState(false);
  const buildingRef = useRef(false);

  const mint = detailTokenId ?? "";
  const publicId = mint === SOL_MINT ? NATIVE_SOL_ID : mint;
  const rawRow = homeTokenRows.find((row) => row.id === publicId);
  const active = wallet?.accounts.find((account) => account.id === wallet.activeAccountId);
  const row = rawRow && active && wallet ? homeTokenRowForSendBalance(rawRow, active) : rawRow;

  useEffect(() => {
    if (row) setTitleOverride(`${t("privacy.shield")} ${row.symbol}`);
    setBackOverride(() => {
      navigateTo(readShieldBack());
      return true;
    });
    return () => {
      setTitleOverride(null);
      setBackOverride(null);
    };
  }, [navigateTo, row, setBackOverride, setTitleOverride, t]);

  const load = useCallback(async () => {
    const body = await loadPrivacyStatus();
    setRegistered(body.kind === "registered");
    setCanPayFee(body.kind === "unregistered" && body.canPayFee);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onPrimary = useCallback(async () => {
    if (!wallet || !mint || !amount.trim() || buildingRef.current) return;
    buildingRef.current = true;
    setBuilding(true);
    setFormError("");
    const res = await sendExtensionRequest("wallet.beginShield", { mint, amountUi: amount.trim() });
    if (!res.ok) {
      buildingRef.current = false;
      setBuilding(false);
      setFormError(apiErrorMessage(locale, res.error, "error.sendBuildFailed"));
      return;
    }
    const { requestId } = res.result as { requestId: string };
    markShieldApproval();
    setActiveWalletSendRequestId(requestId);
    syncWalletSendAbortId(requestId);
    navigateTo("send-approval");
  }, [amount, locale, mint, navigateTo, setActiveWalletSendRequestId, wallet]);

  useRegisterDock(
    registered === true
      ? {
          label: t("send.confirm"),
          disabled: !amount.trim() || !row,
          busy: building,
          onPrimary,
        }
      : null,
  );

  if (!wallet) return <></>;
  if (busy) {
    return (
      <RegisterWait />
    );
  }
  if (registered === false) {
    return (
      <div className="privacy-gate">
        <p>{t("privacy.registerConsent")}</p>
        {failed ? <p>{failed}</p> : null}
        <button
          className="primary-btn"
          type="button"
          disabled={busy || !canPayFee}
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
              markRegisterFrom("shield");
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

  const balance = row ? `${row.uiAmountLabel} ${row.symbol}` : "—";
  return (
    <div className="token-send-form">
      <div className="token-send-info">
        <p className="token-send-balance">
          <span className="token-send-balance-label">{t("send.balance")}</span>
          <span>{balance}</span>
        </p>
      </div>
      <hr className="token-send-rule" />
      <div className="token-send-fields">
        <div className="token-send-row">
          <label className="token-send-qty-label" htmlFor="shield-amount">{t("send.amount")}</label>
          <input
            id="shield-amount"
            className="token-send-input"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={amount}
            onChange={(event) => {
              setAmount(event.target.value);
              writeShieldAmount(event.target.value);
            }}
          />
          <button
            type="button"
            className="send-max-btn"
            disabled={!row}
            onClick={() => {
              if (!row) return;
              const next = halfSendAmount(row);
              if (next != null) {
                setAmount(next);
                writeShieldAmount(next);
              }
            }}
          >
            50%
          </button>
          <button
            type="button"
            className="send-max-btn"
            disabled={!row || !wallet}
            onClick={() => {
              if (!row || !wallet) return;
              const next = maxSendAmount(row, wallet);
              if (next != null) {
                setAmount(next);
                writeShieldAmount(next);
              }
            }}
          >
            {t("send.max")}
          </button>
        </div>
        {formError ? <p className="form-error">{formError}</p> : null}
      </div>
    </div>
  );
}
