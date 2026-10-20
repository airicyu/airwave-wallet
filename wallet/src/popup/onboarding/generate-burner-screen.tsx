/**
 * Popup burner account generation: draft keypair, import, and inline success state.
 * Does not create seed wallets or manage combined accounts.
 */
import type { JSX } from "react";
import { useCallback, useEffect, useState } from "react";
import { ACCOUNT_LABEL_MAX } from "../../shared/accounts";
import { getExposedPublicKey, isSigningOrWatch } from "../../shared/accounts";
import { sendExtensionRequest } from "../../shared/protocol";
import type { AccountMeta } from "../../shared/protocol";
import { apiErrorMessage } from "../../shared/i18n";
import { CopyIconButton } from "../components/CopyPkButton";
import { DiceRerollButton } from "../components/DiceRerollButton";
import { shortAddr } from "../lib/format";
import { usePopupContext } from "../state/PopupContext";
import { useT } from "../state/useT";
import { useRegisterDock } from "../state/dock";
import { viewAfterAccountCreated } from "../lib/rpc-guide";
import { createBurnerDraft, rollBurnerDraft, type BurnerDraft } from "./generate-burner-flow";

export function GenerateBurnerScreen(): JSX.Element {
  const { clearError, refresh, navigateTo, setBackOverride, wallet } = usePopupContext();
  const { t, locale } = useT();
  const [label, setLabel] = useState("");
  const [err, setErr] = useState("");
  const [draft, setDraft] = useState<BurnerDraft | null>(null);
  const [rolling, setRolling] = useState(true);
  const [busy, setBusy] = useState(false);
  const [successPk, setSuccessPk] = useState<string | null>(null);
  const done = successPk != null;

  useEffect(() => {
    let cancel = false;
    void createBurnerDraft().then((next) => {
      if (cancel) return;
      setDraft(next);
      setRolling(false);
    });
    return () => {
      cancel = true;
      setDraft(null);
    };
  }, []);

  useEffect(() => {
    const handler = () => {
      if (!successPk) return false;
      setSuccessPk(null);
      return true;
    };
    setBackOverride(handler);
    return () => setBackOverride(null);
  }, [successPk, setBackOverride]);

  const onReroll = useCallback(() => {
    if (busy || rolling) return;
    setRolling(true);
    setErr("");
    void rollBurnerDraft().then((next) => {
      setDraft(next);
      setRolling(false);
    });
  }, [busy, rolling]);

  const onPrimary = useCallback(async () => {
    if (successPk) {
      setSuccessPk(null);
      navigateTo("add-account");
      return;
    }
    if (!draft?.secretKeyBase58 || !draft.pk || rolling || busy) return;
    const secretKeyBase58 = draft.secretKeyBase58;
    clearError();
    setBusy(true);
    const prevCount = wallet?.accounts.length ?? 0;
    const res = await sendExtensionRequest("wallet.generateAccount", {
      label: label.trim() || undefined,
      secretKeyBase58,
    });
    if (!res.ok) {
      setBusy(false);
      setErr(apiErrorMessage(locale, res.error, "error.genericFailed"));
      return;
    }
    const { account } = res.result as { account: AccountMeta };
    const pk = isSigningOrWatch(account) ? account.publicKeyBase58 : getExposedPublicKey(account);
    const state = await refresh();
    if (viewAfterAccountCreated(prevCount, state, "add-generate") === "rpc-guide") {
      navigateTo("rpc-guide");
      return;
    }
    setBusy(false);
    setSuccessPk(pk);
  }, [successPk, draft, rolling, busy, label, clearError, navigateTo, refresh, locale, wallet]);

  useRegisterDock({
    label: done ? t("common.done") : t("onboarding.generate"),
    disabled: !done && (busy || rolling || draft?.secretKeyBase58 == null || draft?.pk == null),
    onPrimary,
  });

  if (done) {
    return (
      <div id="generate-success" className="add-success">
        <div className="add-success-mark" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M6 12.5 10 16.5 18 8" />
          </svg>
        </div>
        <p id="generate-success-pk" className="add-success-pk">
          {successPk ? shortAddr(successPk) : ""}
        </p>
      </div>
    );
  }

  return (
    <div id="generate-form" className="generate-burner-form">
      <div className="field">
        <label htmlFor="generate-label">{t("common.name")}</label>
        <input
          id="generate-label"
          type="text"
          maxLength={ACCOUNT_LABEL_MAX}
          placeholder={t("common.optional")}
          autoComplete="off"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
      <div className="draft-toolbar">
        <DiceRerollButton label={t("onboarding.regenerateDraft")} disabled={busy || rolling} onClick={onReroll} />
      </div>
      <p className="pk-label">{t("onboarding.solanaPubkey")}</p>
      <div className="addr-row">
        <span id="generate-pk" className="addr-row-pk" title={draft?.pk ?? ""}>
          {draft?.pk ? shortAddr(draft.pk) : ""}
        </span>
        <CopyIconButton className="icon-btn sm-inline" text={draft?.pk ?? ""} />
      </div>
      <p id="generate-err" className="inline-err" aria-live="polite">
        {err}
      </p>
    </div>
  );
}
